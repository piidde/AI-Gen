import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN, ALICE, BOB, assertLedgerMatchesBalances, configureCatalog, credit, freshDb, hash, reserveImage,
  reserveText, row, rpc, rpcError,
} from "./db-helpers.js";

// Text reservation: 1000 in + 1000 out = (1000*1 + 1000*2) provider micros = 3000; x2 markup = 6000.
const RESERVED_PROVIDER = 3000n;
const RESERVED_CUSTOMER = 6000n;

async function funded(balance = 1_000_000n) {
  const db = await freshDb();
  await configureCatalog(db);
  await credit(db, ALICE, balance);
  return db;
}

test("the service is closed and nothing is listed or sellable until an operator configures it", async () => {
  const db = await freshDb();
  assert.deepEqual(await rpc(db, "tw_list_models"), []);
  assert.deepEqual(await rpc(db, "tw_list_purchase_offers"), []);
  await rpc(db, "tw_ensure_account", ALICE);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1, 1, null, null, "k"), /service_paused/);
});

test("browser roles and the service role cannot touch tables; only service_role can call RPCs", async () => {
  const db = await freshDb();
  for (const role of ["anon", "authenticated", "service_role"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select * from private.accounts"), /permission denied/);
    await db.exec("reset role");
  }
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select public.tw_list_models()"), /permission denied/, role);
    await assert.rejects(db.query("select public.tw_admin_adjust_credits($1,'x y z',$2,100,'abcdefgh')", [ADMIN, ALICE]), /permission denied/, role);
    await db.exec("reset role");
  }
  // The private bind helper is not callable even by the service role.
  await db.exec("set role service_role");
  await assert.rejects(db.query("select private.tw_bind_verified_payment(gen_random_uuid(),'pi_x')"), /permission denied/);
  await db.exec("reset role");
});

test("reservation moves credits to reserved and writes one ledger entry", async () => {
  const db = await funded();
  const reservation = await reserveText(db, ALICE, "idem-0001");
  assert.equal(reservation.reserved_customer_micros, RESERVED_CUSTOMER.toString());
  const account = await row(db, "select available_credits_micros::text a, reserved_credits_micros::text r from private.accounts where id=$1", [ALICE]);
  assert.deepEqual(account, { a: (1_000_000n - RESERVED_CUSTOMER).toString(), r: RESERVED_CUSTOMER.toString() });
  assert.equal((await row(db, "select reserved_micros::text r from private.provider_groups where id='grsai-default'")).r, RESERVED_PROVIDER.toString());
  await assertLedgerMatchesBalances(db);
});

test("reservation is refused for insufficient credits, suspension, unpriced bounds and exhausted budgets", async () => {
  const db = await funded(5_000n);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1000, 1000, null, null, "k"), /insufficient_credits/);
  await credit(db, ALICE, 1_000_000n, "more-credit");
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1000, 9000, null, null, "k"), /request_out_of_model_bounds/);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1000, 0, null, null, "k"), /request_out_of_model_bounds/);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gemini-2.5-pro", null, hash("h"), "text", 1, 1, null, null, "k"), /model_unavailable/);
  await rpc(db, "tw_admin_suspend_account", ADMIN, "abuse review", ALICE, true);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1, 1, null, null, "k"), /account_suspended/);
  await rpc(db, "tw_admin_suspend_account", ADMIN, "review done", ALICE, false);
  // Budget just below one reservation's provider cost.
  await rpc(db, "tw_admin_configure_provider", ADMIN, "tighten", "grsai-default", true, "2999", 20000, true, 2);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", null, hash("h"), "text", 1000, 1000, null, null, "k"), /provider_budget_exhausted/);
  await assertLedgerMatchesBalances(db);
});

test("per-account concurrency limit counts unreleased unknown requests", async () => {
  const db = await funded();
  for (let i = 0; i < 3; i += 1) await reserveText(db, ALICE, `idem-000${i}`, `h${i}`);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", "idem-0009", hash("h9"), "text", 1000, 1000, null, null, "k"), /concurrency_limit/);
  await rpc(db, "tw_fail_generation", (await row(db, "select id from private.generation_requests order by created_at limit 1")).id, "cancelled", false);
  await reserveText(db, ALICE, "idem-0009", "h9"); // frees one slot
});

test("idempotency: same key and body returns the original, a different body conflicts, nothing is reserved twice", async () => {
  const db = await funded();
  const first = await reserveText(db, ALICE, "idem-0001");
  const again = await reserveText(db, ALICE, "idem-0001");
  assert.equal(again.duplicate, true);
  assert.equal(again.request_id, first.request_id);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", "idem-0001", hash("different"), "text", 1000, 1000, null, null, "k"), /idempotency_conflict/);
  assert.equal((await row(db, "select count(*)::int n from private.generation_requests")).n, 1);
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='reserve'")).n, 1);
  // Another account may reuse the key; another capability may too.
  await credit(db, BOB, 1_000_000n);
  assert.equal((await reserveText(db, BOB, "idem-0001")).duplicate, false);
  await assertLedgerMatchesBalances(db);
});

test("settlement charges actual usage, returns the remainder once, and is idempotent", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  // 400 in + 100 out = 400*1+100*2 = 600 provider; x2 = 1200 customer.
  const settled = await rpc(db, "tw_settle_generation", request_id, 400, 100, null, { kind: "text" }, ["results/x/response.json"]);
  assert.equal(settled.actual_customer_micros, "1200");
  const again = await rpc(db, "tw_settle_generation", request_id, 400, 100, null, { kind: "text" }, []);
  assert.equal(again.state, "succeeded");
  const account = await row(db, "select available_credits_micros::text a, reserved_credits_micros::text r from private.accounts where id=$1", [ALICE]);
  assert.deepEqual(account, { a: "998800", r: "0" });
  const group = await row(db, "select reserved_micros::text r, spent_micros::text s from private.provider_groups where id='grsai-default'");
  assert.deepEqual(group, { r: "0", s: "600" });
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='settlement'")).n, 1);
  await assertLedgerMatchesBalances(db);
});

test("usage above the reservation is rejected and leaves balances untouched", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  assert.match(await rpcError(db, "tw_settle_generation", request_id, 5000, 5000, null, {}, []), /usage_exceeds_reservation/);
  assert.match(await rpcError(db, "tw_settle_generation", request_id, null, null, null, {}, []), /usage_unavailable/);
  await assertLedgerMatchesBalances(db);
  assert.equal((await row(db, "select state from private.generation_requests where id=$1", [request_id])).state, "submitting");
});

test("a definite failure releases the reservation exactly once", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  await rpc(db, "tw_fail_generation", request_id, "provider_rejected", false);
  await rpc(db, "tw_fail_generation", request_id, "provider_rejected", false);
  assert.deepEqual(await row(db, "select available_credits_micros::text a, reserved_credits_micros::text r from private.accounts where id=$1", [ALICE]), { a: "1000000", r: "0" });
  assert.equal((await row(db, "select reserved_micros::text r from private.provider_groups where id='grsai-default'")).r, "0");
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='release'")).n, 1);
  await assertLedgerMatchesBalances(db);
});

test("an ambiguous failure keeps credits reserved; they release after 24 hours and charge the provider budget", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  await rpc(db, "tw_fail_generation", request_id, "provider_acceptance_unknown", true);
  assert.equal((await row(db, "select state from private.generation_requests where id=$1", [request_id])).state, "unknown");
  assert.equal((await row(db, "select reserved_credits_micros::text r from private.accounts where id=$1", [ALICE])).r, RESERVED_CUSTOMER.toString());
  assert.equal((await rpc(db, "tw_recover_expired_reservations")).released, 0);
  await db.exec(`update private.generation_requests set created_at=now()-interval '25 hours'`);
  assert.equal((await rpc(db, "tw_recover_expired_reservations")).released, 1);
  assert.equal((await rpc(db, "tw_recover_expired_reservations")).released, 0);
  const group = await row(db, "select reserved_micros::text r, spent_micros::text s from private.provider_groups where id='grsai-default'");
  assert.deepEqual(group, { r: "0", s: RESERVED_PROVIDER.toString() });
  await assertLedgerMatchesBalances(db);
});

test("a random sequence of operations never lets balances drift from the ledger", async () => {
  const db = await funded(10_000_000n);
  await credit(db, BOB, 10_000_000n);
  const ids: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const account = i % 2 ? ALICE : BOB;
    try { ids.push((await reserveText(db, account, `idem-${i}-abcd`, `h${i}`, 100 + i, 100 + i)).request_id); } catch { /* concurrency limit */ }
    if (ids.length && i % 3 === 0) {
      const id = ids.shift()!;
      if (i % 2) await rpc(db, "tw_settle_generation", id, 50, 50, null, {}, []);
      else await rpc(db, "tw_fail_generation", id, "x", false);
    }
    await assertLedgerMatchesBalances(db);
  }
});

test("media: image reservation, submission claim, poll lease and settlement", async () => {
  const db = await funded();
  const { request_id, state } = await reserveImage(db, ALICE, "idem-img-1", 2);
  assert.equal(state, "queued");
  const claimed = await rpc(db, "tw_claim_media_submission", request_id);
  assert.equal(claimed.capability, "image");
  assert.equal(await rpc(db, "tw_claim_media_submission", request_id), null, "a second worker cannot also submit");
  assert.equal(await rpc(db, "tw_mark_media_pending", request_id, "prov-1", "other-key"), false);
  assert.equal(await rpc(db, "tw_mark_media_pending", request_id, "prov-1", "key-1"), true);
  assert.equal(await rpc(db, "tw_claim_media_poll", request_id), null, "poll lease starts after submission");
  await db.exec(`update private.generation_requests set poll_after=now()-interval '1 second'`);
  assert.equal((await rpc(db, "tw_claim_media_poll", request_id)).provider_request_id, "prov-1");
  assert.equal(await rpc(db, "tw_claim_media_poll", request_id), null, "a leased poll cannot be claimed twice");
  assert.match(await rpcError(db, "tw_settle_generation", request_id, null, null, 3, {}, []), /usage_unavailable/);
  const settled = await rpc(db, "tw_settle_generation", request_id, null, null, 1, { kind: "media" }, [`results/${request_id}/0`]);
  assert.equal(settled.actual_customer_micros, "80000");
  await assertLedgerMatchesBalances(db);
});

test("result delivery attempts are counted, leased, and only possible for a pending provider job", async () => {
  const db = await funded();
  const { request_id } = await reserveImage(db, ALICE, "idem-img-1", 1);
  assert.equal(await rpc(db, "tw_begin_result_delivery", request_id), null, "not pending yet");
  await rpc(db, "tw_claim_media_submission", request_id);
  await rpc(db, "tw_mark_media_pending", request_id, "prov-1", "key-1");
  assert.equal(await rpc(db, "tw_begin_result_delivery", request_id), 1);
  assert.equal(await rpc(db, "tw_begin_result_delivery", request_id), 2);
  assert.equal(await rpc(db, "tw_extend_result_delivery", request_id), true);
  // Poll lease is held, so the recovery sweep must not hand the job to a second worker.
  assert.deepEqual(await rpc(db, "tw_recover_pending_media_polls"), []);
  await rpc(db, "tw_settle_generation", request_id, null, null, 1, {}, []);
  assert.equal(await rpc(db, "tw_begin_result_delivery", request_id), null, "settled jobs are never redelivered");
  assert.equal(await rpc(db, "tw_extend_result_delivery", request_id), false);
});

test("result retention: expired results stay expired after physical cleanup", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  await rpc(db, "tw_settle_generation", request_id, 10, 10, null, { kind: "text" }, []);
  assert.deepEqual(await rpc(db, "tw_get_result", ALICE, request_id), { kind: "text" });
  assert.match(await rpcError(db, "tw_get_result", BOB, request_id), /request_not_found/, "ownership is enforced");
  await db.exec(`update private.generation_requests set result_expires_at=now()-interval '1 second'`);
  assert.match(await rpcError(db, "tw_get_result", ALICE, request_id), /result_expired/);
  assert.equal(await rpc(db, "tw_mark_result_expired", request_id), true);
  assert.match(await rpcError(db, "tw_get_result", ALICE, request_id), /result_expired/);
  assert.equal((await rpc(db, "tw_get_request", ALICE, request_id)).result_manifest, null);
});

test("admin credit adjustments are audited, idempotent and conflict-checked", async () => {
  const db = await freshDb();
  await rpc(db, "tw_ensure_account", ALICE);
  const first = await rpc(db, "tw_admin_adjust_credits", ADMIN, "goodwill credit", ALICE, "5000", "adjust-0001");
  const second = await rpc(db, "tw_admin_adjust_credits", ADMIN, "goodwill credit", ALICE, "5000", "adjust-0001");
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.match(await rpcError(db, "tw_admin_adjust_credits", ADMIN, "goodwill credit", ALICE, "6000", "adjust-0001"), /idempotency_conflict/);
  assert.match(await rpcError(db, "tw_admin_adjust_credits", ADMIN, "", ALICE, "6000", "adjust-0002"), /reason_required/);
  assert.match(await rpcError(db, "tw_admin_adjust_credits", ADMIN, "zero delta", ALICE, "0", "adjust-0003"), /reason_required/);
  assert.equal((await row(db, "select available_credits_micros::text a from private.accounts where id=$1", [ALICE])).a, "5000");
  assert.equal((await row(db, "select count(*)::int n from private.audit_log where action='credit_adjustment'")).n, 1);
  // Driving a balance negative suspends the account and blocks reactivation.
  const negative = await rpc(db, "tw_admin_adjust_credits", ADMIN, "clawback", ALICE, "-9000", "adjust-0004");
  assert.equal(negative.suspended, true);
  assert.match(await rpcError(db, "tw_admin_suspend_account", ADMIN, "try reactivate", ALICE, false), /account_suspension_blocked/);
  await assertLedgerMatchesBalances(db);
});

test("API keys: authenticate by digest, revoke by owner only, revoked keys cannot reserve", async () => {
  const db = await funded();
  const key = await rpc(db, "tw_create_api_key", ALICE, "ci", "tw_live_abcd", hash("digest-1"));
  assert.equal((await rpc(db, "tw_authenticate_api_key", hash("digest-1"))).account_id, ALICE);
  assert.equal(await rpc(db, "tw_authenticate_api_key", hash("digest-wrong")), null);
  assert.equal(await rpc(db, "tw_revoke_api_key", BOB, key.id), false, "other accounts cannot revoke");
  assert.equal(await rpc(db, "tw_revoke_api_key", ALICE, key.id), true);
  assert.equal(await rpc(db, "tw_authenticate_api_key", hash("digest-1")), null);
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, key.id, "gpt-5.5", null, hash("h"), "text", 1, 1, null, null, "k"), /api_key_revoked/);
  assert.match(await rpcError(db, "tw_create_api_key", ALICE, "   ", "tw_live_abcd", hash("digest-2")), /invalid_key_name/);
});

test("a late definite failure after the 24-hour unknown release does not release credits twice", async () => {
  const db = await funded();
  const { request_id } = await reserveText(db, ALICE, "idem-0001");
  await rpc(db, "tw_fail_generation", request_id, "provider_acceptance_unknown", true);
  await db.exec(`update private.generation_requests set created_at=now()-interval '25 hours'`);
  await rpc(db, "tw_recover_expired_reservations");
  await rpc(db, "tw_fail_generation", request_id, "provider_rejected", false);
  assert.equal((await row(db, "select count(*)::int n from private.credit_ledger where entry_type='release'")).n, 1);
  await assertLedgerMatchesBalances(db);
});

test("payloads of jobs not yet submitted are never offered for cleanup", async () => {
  const db = await funded();
  const { request_id } = await reserveImage(db, ALICE, "idem-img-1", 1);
  await db.exec(`update private.generation_requests set created_at=now()-interval '3 hours'`);
  assert.deepEqual(await rpc(db, "tw_expired_objects"), []);
  await rpc(db, "tw_fail_generation", request_id, "x", false);
  assert.equal((await rpc(db, "tw_expired_objects")).length, 1);
});
