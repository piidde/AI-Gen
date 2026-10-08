import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN, ALICE, BOB, configureCatalog, credit, freshDb, reserveImage, reserveText, row, rpc, rpcError } from "./db-helpers.js";

test("the per-account concurrency limit is adjustable, bounded, audited and enforced", async () => {
  const db = await freshDb();
  await configureCatalog(db);
  await credit(db, ALICE, 10_000_000n);
  assert.match(await rpcError(db, "tw_set_operational_controls", ADMIN, "too high", null, null, 101), /invalid_concurrency_limit/);
  assert.match(await rpcError(db, "tw_set_operational_controls", ADMIN, "too low", null, null, 0), /invalid_concurrency_limit/);
  await rpc(db, "tw_set_operational_controls", ADMIN, "tighten for launch", null, null, 1);
  // Omitted values keep their current setting.
  const control = await row(db, "select accepting_requests, result_ttl_hours, max_concurrent_per_account from private.app_control");
  assert.deepEqual(control, { accepting_requests: true, result_ttl_hours: 2, max_concurrent_per_account: 1 });
  assert.equal((await row(db, "select metadata->>'max_concurrent_per_account' as v from private.audit_log where action='operational_controls' order by id desc limit 1")).v, "1");
  await reserveText(db, ALICE, "limit-0001", "l1");
  assert.match(await rpcError(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", "limit-0002", new TextEncoder().encode("l2"), "text", 10, 10, null, null, "key-1"), /concurrency_limit/);
  assert.equal((await rpc(db, "tw_ops_summary")).max_concurrent_per_account, 1);
});

test("the request feed spans accounts, filters by state and exposes no payloads", async () => {
  const db = await freshDb();
  await configureCatalog(db);
  await credit(db, ALICE, 10_000_000n);
  await credit(db, BOB, 10_000_000n);
  const settled = (await reserveText(db, ALICE, "feed-0001", "f1")).request_id as string;
  await rpc(db, "tw_settle_generation", settled, 400, 100, null, { kind: "chat" }, []);
  const pending = (await reserveImage(db, BOB, "feed-0002", 1, "f2")).request_id as string;
  const all = await rpc(db, "tw_admin_recent_requests", null, 50);
  assert.deepEqual(new Set(all.map((r: { id: string }) => r.id)), new Set([settled, pending]));
  const done = all.find((r: { id: string }) => r.id === settled);
  assert.equal(done.charged_micros, "1200");
  assert.equal(done.input_tokens, 400);
  assert.equal(typeof done.duration_ms, "number");
  assert.equal("result_manifest" in done || "payload_object_key" in done || "request_hash" in done, false);
  const active = await rpc(db, "tw_admin_recent_requests", "active", 50);
  assert.deepEqual(active.map((r: { id: string }) => r.id), [pending]);
  assert.equal((await rpc(db, "tw_admin_recent_requests", "succeeded", 1)).length, 1);
  assert.match(await rpcError(db, "tw_admin_recent_requests", "everything", 50), /invalid_usage_filter/);
  assert.match(await rpcError(db, "tw_admin_recent_requests", null, 201), /invalid_usage_filter/);
  const summary = await rpc(db, "tw_ops_summary");
  assert.equal(summary.in_flight_requests, 1);
  assert.equal(summary.requests_1h, 2);
});

test("models enable only on a complete verified price and disable without one", async () => {
  const db = await freshDb();
  await configureCatalog(db);
  const before = await row(db, "select current_price_version from private.models where id='gpt-5.5'");
  await rpc(db, "tw_admin_set_model_enabled", ADMIN, "pause model", "gpt-5.5", false);
  assert.equal((await rpc(db, "tw_list_models")).some((m: { id: string }) => m.id === "gpt-5.5"), false);
  await rpc(db, "tw_admin_set_model_enabled", ADMIN, "resume model", "gpt-5.5", true);
  assert.equal((await rpc(db, "tw_list_models")).some((m: { id: string }) => m.id === "gpt-5.5"), true);
  // Toggling never creates a new price version.
  assert.deepEqual(await row(db, "select current_price_version from private.models where id='gpt-5.5'"), before);
  // A catalogue model without any price stays off.
  const unpriced = await row<{ id: string }>(db, "select id from private.models where current_price_version is null limit 1");
  assert.match(await rpcError(db, "tw_admin_set_model_enabled", ADMIN, "try enable", unpriced.id, true), /pricing_unavailable/);
  assert.match(await rpcError(db, "tw_admin_set_model_enabled", ADMIN, "x", "gpt-5.5", true), /reason_required/);
  assert.match(await rpcError(db, "tw_admin_set_model_enabled", ADMIN, "missing", "no-such-model", false), /model_unavailable/);
  const catalog = await rpc(db, "tw_admin_model_catalog");
  const text = catalog.find((m: { id: string }) => m.id === "gpt-5.5");
  assert.equal(text.input_micros, "1000000");
  assert.equal(text.output_micros, "2000000");
  assert.equal(text.source_note, "test source");
  assert.equal(text.parameter_schema.type, "object");
});

test("admin offers list includes inactive offers", async () => {
  const db = await freshDb();
  await rpc(db, "tw_admin_configure_offer", ADMIN, "launch offer", "starter", "eur", 1000, "10000000", true);
  await rpc(db, "tw_admin_configure_offer", ADMIN, "draft offer", "pro", "eur", 5000, "55000000", false);
  const offers = await rpc(db, "tw_admin_list_offers");
  assert.deepEqual(offers.map((o: { id: string; active: boolean }) => [o.id, o.active]), [["starter", true], ["pro", false]]);
  assert.equal(offers[1].credits_micros, "55000000");
});

test("admin functions are not executable by client roles", async () => {
  const db = await freshDb();
  for (const fn of ["tw_admin_recent_requests(null, 10)", "tw_admin_list_offers()", "tw_ops_summary()"]) {
    await db.exec("set role authenticated");
    try {
      await assert.rejects(db.query(`select public.${fn}`), /permission denied/);
    } finally {
      await db.exec("reset role");
    }
  }
});
