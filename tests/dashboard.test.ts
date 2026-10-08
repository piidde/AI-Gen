import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN, ALICE, BOB, configureCatalog, credit, freshDb, reserveImage, reserveText, row, rpc, rpcError, type Db } from "./db-helpers.js";

async function withHistory(): Promise<{ db: Db; settled: string; failed: string; pending: string }> {
  const db = await freshDb();
  await configureCatalog(db);
  await credit(db, ALICE, 10_000_000n);
  await credit(db, BOB, 10_000_000n);
  const settled = (await reserveText(db, ALICE, "usage-0001", "a1")).request_id as string;
  // 400 input x 1 + 100 output x 2 = 600 provider micros; 2.0x markup charges 1200.
  await rpc(db, "tw_settle_generation", settled, 400, 100, null, { kind: "chat" }, []);
  const failed = (await reserveText(db, ALICE, "usage-0002", "a2")).request_id as string;
  await rpc(db, "tw_fail_generation", failed, "provider_rejected", false);
  const pending = (await reserveImage(db, ALICE, "usage-0003", 1, "a3")).request_id as string;
  await reserveText(db, BOB, "usage-0004", "b1");
  return { db, settled, failed, pending };
}

test("usage pages are account-scoped, filterable and expose settled usage", async () => {
  const { db, settled, failed, pending } = await withHistory();
  const all = await rpc(db, "tw_list_usage_page", ALICE, null, null, null, null, null, null, 25, 0);
  assert.equal(all.total, 3);
  assert.deepEqual(new Set(all.data.map((r: { id: string }) => r.id)), new Set([settled, failed, pending]));
  const done = await rpc(db, "tw_list_usage_page", ALICE, null, null, null, null, "completed", null, 25, 0);
  assert.equal(done.total, 1);
  assert.equal(done.data[0].credits_micros, "1200");
  assert.equal(done.data[0].input_tokens, 400);
  assert.equal(done.data[0].output_tokens, 100);
  assert.equal(done.data[0].model_name, "GPT 5.5");
  assert.equal((await rpc(db, "tw_list_usage_page", ALICE, null, null, null, null, "failed", null, 25, 0)).data[0].id, failed);
  assert.equal((await rpc(db, "tw_list_usage_page", ALICE, null, null, "nano-banana-2", null, null, null, 25, 0)).data[0].id, pending);
  assert.equal((await rpc(db, "tw_list_usage_page", ALICE, null, null, null, null, null, settled.slice(0, 8), 25, 0)).data[0].id, settled);
  const page = await rpc(db, "tw_list_usage_page", ALICE, null, null, null, null, null, null, 2, 2);
  assert.equal(page.total, 3);
  assert.equal(page.data.length, 1);
  assert.equal((await rpc(db, "tw_list_usage_page", ALICE, "2999-01-01T00:00:00Z", null, null, null, null, null, 25, 0)).total, 0);
  assert.match(await rpcError(db, "tw_list_usage_page", ALICE, null, null, null, null, "everything", null, 25, 0), /invalid_usage_filter/);
  // Bob's request never leaks into Alice's history.
  assert.equal((await rpc(db, "tw_list_usage_page", BOB, null, null, null, null, null, null, 25, 0)).total, 1);
});

test("usage overview aggregates totals, days and models on the server", async () => {
  const { db } = await withHistory();
  const overview = await rpc(db, "tw_usage_overview", ALICE, null);
  assert.deepEqual(overview.totals, { requests: 3, completed: 1, failed: 1, pending: 1, unknown: 0, credits_micros: "1200" });
  assert.equal(overview.daily.length, 1);
  assert.equal(overview.daily[0].credits_micros, "1200");
  assert.equal(overview.models[0].model, "gpt-5.5");
  assert.equal(overview.models[0].requests, 2);
});

test("savings compare only settled requests with a complete official reference", async () => {
  const { db } = await withHistory();
  let savings = await rpc(db, "tw_savings_summary", ALICE, null);
  assert.equal(savings.compared_requests, 0);
  assert.equal(savings.excluded_no_reference, 1);
  assert.equal(savings.excluded_not_settled, 2);
  assert.equal(savings.saved_micros, "0");
  assert.match(await rpcError(db, "tw_admin_set_official_prices", ADMIN, "official list", "gpt-5.5", null, null, "5", "vendor price page"), /pricing_unavailable/);
  // Official 5 / 10 per million: 400*5 + 100*10 = 3000 micros versus 1200 charged.
  await rpc(db, "tw_admin_set_official_prices", ADMIN, "official list", "gpt-5.5", "5000000", "10000000", null, "vendor price page");
  savings = await rpc(db, "tw_savings_summary", ALICE, null);
  assert.equal(savings.compared_requests, 1);
  assert.equal(savings.official_micros, "3000");
  assert.equal(savings.charged_micros, "1200");
  assert.equal(savings.saved_micros, "1800");
});

test("low-balance alerts fire once per crossing, re-arm after recovery and on threshold change", async () => {
  const db = await freshDb();
  await credit(db, ALICE, 5_000_000n);
  assert.equal((await rpc(db, "tw_get_preferences", ALICE)).low_balance_enabled, false);
  assert.match(await rpcError(db, "tw_save_preferences", ALICE, true, null, false), /invalid_preferences/);
  await rpc(db, "tw_save_preferences", ALICE, true, "1000000", true);
  assert.deepEqual(await rpc(db, "tw_claim_low_balance_alerts", 50), []);
  await credit(db, ALICE, -4_500_000n, "spend-down-0001");
  const [first, second] = await Promise.all([rpc(db, "tw_claim_low_balance_alerts", 50), rpc(db, "tw_claim_low_balance_alerts", 50)]);
  assert.equal(first.length + second.length, 1, "one claim across concurrent runs");
  assert.deepEqual(await rpc(db, "tw_claim_low_balance_alerts", 50), []);
  // Failed delivery keeps the alert pending.
  await rpc(db, "tw_rearm_low_balance_alert", ALICE);
  assert.equal((await rpc(db, "tw_claim_low_balance_alerts", 50)).length, 1);
  // Recovery above the threshold re-arms; the next crossing alerts again.
  await credit(db, ALICE, 2_000_000n, "top-up-00001");
  assert.deepEqual(await rpc(db, "tw_claim_low_balance_alerts", 50), []);
  await credit(db, ALICE, -2_000_000n, "spend-again-0001");
  assert.equal((await rpc(db, "tw_claim_low_balance_alerts", 50)).length, 1);
  // Saving the same threshold does not re-alert; a new threshold starts a new cycle.
  await rpc(db, "tw_save_preferences", ALICE, true, "1000000", false);
  assert.deepEqual(await rpc(db, "tw_claim_low_balance_alerts", 50), []);
  await rpc(db, "tw_save_preferences", ALICE, true, "900000", false);
  assert.equal((await rpc(db, "tw_claim_low_balance_alerts", 50)).length, 1);
  await rpc(db, "tw_save_preferences", ALICE, false, "900000", false);
  await rpc(db, "tw_rearm_low_balance_alert", ALICE);
  assert.deepEqual(await rpc(db, "tw_claim_low_balance_alerts", 50), []);
});

test("billing profiles are validated and private to their account", async () => {
  const db = await freshDb();
  const saved = await rpc(db, "tw_save_billing_profile", ALICE, { kind: "business", name: " Ada ", company: "Acme", country_code: "de", vat_id: "DE123" });
  assert.equal(saved.name, "Ada");
  assert.equal(saved.country_code, "DE");
  assert.equal((await rpc(db, "tw_get_billing_profile", BOB)).name, null);
  assert.match(await rpcError(db, "tw_save_billing_profile", ALICE, { kind: "pirate" }), /invalid_billing_profile/);
  assert.match(await rpcError(db, "tw_save_billing_profile", ALICE, { country_code: "Germany" }), /invalid_billing_profile/);
  assert.equal((await rpc(db, "tw_get_billing_profile", ALICE)).company, "Acme");
});

test("payment lookup for receipts is ownership-checked", async () => {
  const db = await freshDb();
  await rpc(db, "tw_admin_configure_offer", ADMIN, "test offer", "pack-10", "eur", 1000, "10000000", true);
  const quote = await rpc(db, "tw_create_checkout_quote", ALICE, "pack-10", "eur", "receipt-0001");
  assert.equal((await rpc(db, "tw_get_payment", ALICE, quote.id)).status, "created");
  assert.match(await rpcError(db, "tw_get_payment", BOB, quote.id), /payment_not_found/);
});

test("the status feed lists published open and recently resolved incidents", async () => {
  const db = await freshDb();
  assert.deepEqual((await rpc(db, "tw_public_status")).incidents, []);
  const id = await rpc(db, "tw_admin_publish_incident", ADMIN, "outage", null, "Image delays", "Image requests are slow.", "Image generation", ["gpt-image-2"], "Investigating.", false);
  let status = await rpc(db, "tw_public_status");
  assert.equal(status.incidents.length, 1);
  assert.equal(status.incidents[0].resolved_at, null);
  await rpc(db, "tw_admin_publish_incident", ADMIN, "recovered", id, null, null, null, null, "Recovered.", true);
  status = await rpc(db, "tw_public_status");
  assert.notEqual(status.incidents[0].resolved_at, null);
  assert.equal(status.incidents[0].timeline.length, 2);
  assert.match(await rpcError(db, "tw_admin_publish_incident", ADMIN, "bad", null, "x", "y", "z", null, "Message.", false), /invalid_incident/);
  const audit = await row<{ n: string }>(db, "select count(*)::text n from private.audit_log where action='incident_published'");
  assert.equal(audit.n, "2");
});
