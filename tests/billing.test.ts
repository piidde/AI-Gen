import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN, ALICE, BOB, assertLedgerMatchesBalances, freshDb, row, rpc, rpcError, type Db } from "./db-helpers.js";

// EUR 10.00 buys 10 credits (10_000_000 micros).
const AMOUNT = 1000;
const CREDITS = 10_000_000n;

async function shop() {
  const db = await freshDb();
  await rpc(db, "tw_admin_configure_offer", ADMIN, "test offer", "pack-10", "eur", AMOUNT, CREDITS.toString(), true);
  return db;
}

let seq = 0;
async function openCheckout(db: Db, account = ALICE) {
  seq += 1;
  const quote = await rpc(db, "tw_create_checkout_quote", account, "pack-10", "EUR", `checkout-${seq}-abcd`);
  assert.equal(await rpc(db, "tw_attach_checkout_session", account, quote.id, `cs_${seq}`), true);
  return { quoteId: quote.id as string, session: `cs_${seq}`, intent: `pi_${seq}` };
}

const paid = (db: Db, c: { quoteId: string; session: string; intent: string }, event = `evt_paid_${c.quoteId}`, type = "checkout.session.completed") =>
  rpc(db, "tw_fulfill_checkout", event, type, c.session, c.intent, AMOUNT, "EUR", c.quoteId);
const refund = (db: Db, c: { quoteId: string; intent: string }, event: string, cumulative: number) =>
  rpc(db, "tw_reverse_checkout", event, "charge.refunded", c.intent, c.quoteId, cumulative);
const dispute = (db: Db, c: { quoteId: string; intent: string }, event: string) =>
  rpc(db, "tw_reverse_checkout", event, "charge.dispute.created", c.intent, c.quoteId, null);
const resolve = (db: Db, c: { quoteId: string; intent: string }, event: string, status: string) =>
  rpc(db, "tw_resolve_dispute", event, "charge.dispute.closed", c.intent, c.quoteId, status);

const account = (db: Db, id = ALICE) =>
  row<{ a: string; s: boolean }>(db, "select available_credits_micros::text a, suspended s from private.accounts where id=$1", [id]);

test("only an operator-activated offer can be quoted, and quotes are idempotent", async () => {
  const db = await freshDb();
  assert.match(await rpcError(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0001"), /purchase_offer_unavailable/);
  await rpc(db, "tw_admin_configure_offer", ADMIN, "test offer", "pack-10", "eur", AMOUNT, CREDITS.toString(), true);
  const quote = await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "EUR", "checkout-0001");
  const again = await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0001");
  assert.equal(again.id, quote.id);
  assert.match(await rpcError(db, "tw_create_checkout_quote", ALICE, "pack-10", "usd", "checkout-0001"), /idempotency_conflict/);
  assert.match(await rpcError(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "short"), /invalid_idempotency_key/);
  // Repricing an offer after the quote does not change what the quote promises.
  await rpc(db, "tw_admin_configure_offer", ADMIN, "reprice", "pack-10", "eur", 2000, "5000000", true);
  assert.equal((await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0001")).credits_micros, CREDITS.toString());
  await db.exec("update private.stripe_quotes set expires_at=now()-interval '1 second'");
  assert.match(await rpcError(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0001"), /checkout_quote_expired/);
});

test("a Checkout session attaches to one quote once, and only before the quote expires", async () => {
  const db = await shop();
  const quote = await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0001");
  assert.equal(await rpc(db, "tw_attach_checkout_session", BOB, quote.id, "cs_1"), false, "wrong owner");
  assert.equal(await rpc(db, "tw_attach_checkout_session", ALICE, quote.id, "cs_1"), true);
  assert.equal(await rpc(db, "tw_attach_checkout_session", ALICE, quote.id, "cs_1"), true, "retry with the same session");
  assert.equal(await rpc(db, "tw_attach_checkout_session", ALICE, quote.id, "cs_2"), false, "a second session cannot replace the first");
  const late = await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "checkout-0002");
  await db.exec(`update private.stripe_quotes set expires_at=now()-interval '1 second' where id='${late.id}'`);
  assert.equal(await rpc(db, "tw_attach_checkout_session", ALICE, late.id, "cs_3"), false);
});

test("a paid checkout credits the quoted amount exactly once, however many times events arrive", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  assert.equal((await paid(db, c)).duplicate, false);
  assert.equal((await paid(db, c)).duplicate, true, "same event id replayed");
  assert.equal((await paid(db, c, "evt_other", "checkout.session.async_payment_succeeded")).duplicate, false);
  assert.equal((await account(db)).a, CREDITS.toString(), "a second event for the same payment must not credit again");
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='purchase'")).n, 1);
  assert.equal((await row(db, "select state from private.stripe_quotes where id=$1", [c.quoteId])).state, "paid");
  await assertLedgerMatchesBalances(db);
});

test("fulfillment rejects mismatched amount, currency, session, payment intent, quote or event type", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  const call = (overrides: Partial<{ type: string; session: string; intent: string | null; amount: number; currency: string; quote: string }>) =>
    rpcError(db, "tw_fulfill_checkout", "evt_x", overrides.type ?? "checkout.session.completed", overrides.session ?? c.session,
      overrides.intent === undefined ? c.intent : overrides.intent, overrides.amount ?? AMOUNT, overrides.currency ?? "eur", overrides.quote ?? c.quoteId);
  assert.match(await call({ amount: AMOUNT - 1 }), /checkout_quote_mismatch/);
  assert.match(await call({ currency: "usd" }), /checkout_quote_mismatch/);
  assert.match(await call({ session: "cs_forged" }), /checkout_quote_mismatch/);
  assert.match(await call({ intent: null }), /checkout_quote_mismatch/);
  assert.match(await call({ quote: "00000000-0000-4000-8000-0000000000ff" }), /checkout_quote_mismatch/);
  assert.match(await call({ type: "charge.refunded" }), /unsupported_stripe_event/);
  assert.equal((await account(db)).a, "0");
  assert.equal((await row(db, "select count(*)::int n from private.stripe_events")).n, 0, "failed events are not recorded as processed");
  // A different payment intent for an already-paid quote is refused.
  await paid(db, c);
  assert.match(await rpcError(db, "tw_fulfill_checkout", "evt_y", "checkout.session.completed", c.session, "pi_forged", AMOUNT, "eur", c.quoteId), /checkout_quote_mismatch/);
});

test("partial and full refunds claw back proportional credits, never more than were granted", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await refund(db, c, "evt_r1", 250);
  assert.equal((await account(db)).a, "7500000");
  await refund(db, c, "evt_r2", 1000);
  assert.equal((await account(db)).a, "0");
  assert.equal((await row(db, "select state from private.stripe_quotes where id=$1", [c.quoteId])).state, "refunded");
  assert.match(await rpcError(db, "tw_reverse_checkout", "evt_r3", "charge.refunded", c.intent, c.quoteId, AMOUNT + 1), /invalid_refund_amount/);
  assert.equal((await refund(db, c, "evt_r2", 1000)).duplicate, true);
  await assertLedgerMatchesBalances(db);
});

test("a delayed refund event with an older cumulative amount does not undo a newer one", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await refund(db, c, "evt_r2", 600);
  const stale = await refund(db, c, "evt_r1", 300);
  assert.equal(stale.stale, true);
  assert.equal((await account(db)).a, "4000000");
  assert.equal((await row(db, "select refunded_amount_minor::int n from private.stripe_quotes where id=$1", [c.quoteId])).n, 600);
  await assertLedgerMatchesBalances(db);
});

test("a refund that arrives before the completion event still credits and then refunds consistently", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await refund(db, c, "evt_r1", 1000);
  assert.equal((await account(db)).a, "0");
  // The late completion event must not grant credits a second time.
  await paid(db, c);
  assert.equal((await account(db)).a, "0");
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='purchase'")).n, 1);
  await assertLedgerMatchesBalances(db);
});

test("refunding spent credits drives the balance negative and suspends the account", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await rpc(db, "tw_admin_adjust_credits", ADMIN, "simulate spend", ALICE, "-9000000", "spend-0001");
  await rpc(db, "tw_admin_suspend_account", ADMIN, "reviewed", ALICE, false);
  await refund(db, c, "evt_r1", 1000);
  assert.deepEqual(await account(db), { a: "-9000000", s: true });
  await assertLedgerMatchesBalances(db);
});

test("a dispute removes the remaining credits and suspends; winning restores credits but not access", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await refund(db, c, "evt_r1", 500);
  await dispute(db, c, "evt_d1");
  await dispute(db, c, "evt_d1b"); // Stripe may deliver a second created event
  assert.deepEqual(await account(db), { a: "0", s: true });
  await resolve(db, c, "evt_d2", "won");
  assert.deepEqual(await account(db), { a: "5000000", s: true }, "only the un-refunded remainder returns; an admin must reinstate access");
  assert.equal((await row(db, "select state from private.stripe_quotes where id=$1", [c.quoteId])).state, "dispute_won");
  assert.equal((await resolve(db, c, "evt_d2", "won")).duplicate, true);
  await assertLedgerMatchesBalances(db);
});

test("a lost dispute keeps credits removed and later refunds do not deduct them twice", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await dispute(db, c, "evt_d1");
  await resolve(db, c, "evt_d2", "lost");
  await refund(db, c, "evt_r1", 1000);
  assert.deepEqual(await account(db), { a: "0", s: true });
  assert.equal((await row(db, "select state from private.stripe_quotes where id=$1", [c.quoteId])).state, "dispute_lost");
  await assertLedgerMatchesBalances(db);
});

test("dispute closed as lost before the created event arrives applies the loss once", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await resolve(db, c, "evt_d2", "lost");
  await dispute(db, c, "evt_d1");
  assert.deepEqual(await account(db), { a: "0", s: true });
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='dispute'")).n, 1);
  await assertLedgerMatchesBalances(db);
});

test("dispute closed as won before the created event leaves credits intact", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  await paid(db, c);
  await resolve(db, c, "evt_d2", "won");
  assert.equal((await account(db)).a, CREDITS.toString());
  assert.match(await rpcError(db, "tw_resolve_dispute", "evt_d3", "charge.dispute.created", c.intent, c.quoteId, "won"), /unsupported_dispute_resolution/);
});

test("concurrent webhook deliveries of one event credit once", async () => {
  const db = await shop();
  const c = await openCheckout(db);
  // PGlite serialises connections, so this checks the idempotent outcome of overlapping calls, not row-lock timing.
  const results = await Promise.all([paid(db, c), paid(db, c), paid(db, c)]);
  assert.equal(results.filter((r) => r.duplicate === false).length, 1);
  assert.equal((await account(db)).a, CREDITS.toString());
});
