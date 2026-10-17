import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ADMIN, ALICE, credit, freshDb, hash, row, rpc, rpcError, type Db } from "./db-helpers.js";
import { describeChanges, displayName, parseUpstreamCatalog, UpstreamCatalogError, type UpstreamCatalog } from "../src/upstream-catalog.js";

// Live GrsAI responses captured on 2026-10-17 (getModelListV2 and getGoodsList).
const listFixture = JSON.parse(readFileSync(new URL("./fixtures/grsai-model-list.json", import.meta.url), "utf8"));
const goodsFixture = JSON.parse(readFileSync(new URL("./fixtures/grsai-goods.json", import.meta.url), "utf8"));
const catalog = (): UpstreamCatalog => parseUpstreamCatalog(structuredClone(listFixture), goodsFixture);
const SYSTEM = "00000000-0000-0000-0000-000000000000";

function withModel(snapshot: UpstreamCatalog, id: string, patch: Partial<UpstreamCatalog["models"][number]>): UpstreamCatalog {
  return { ...snapshot, models: snapshot.models.map((model) => model.id === id ? { ...model, ...patch } : model) };
}

// USD 150 buys 19,980,000 credits: micros = ceil(credits x 15000 x 10000 / 19980000).
const cost = (credits: number) => ((BigInt(credits) * 150_000_000n + 19_979_999n) / 19_980_000n).toString();

async function openForBusiness(db: Db, enable: string[]): Promise<void> {
  await rpc(db, "tw_admin_configure_provider", ADMIN, "test setup", "grsai-default", true, "100000000000", 20000, true, 2);
  for (const id of enable) await rpc(db, "tw_admin_set_model_enabled", ADMIN, "test setup", id, true);
}

const model = (db: Db, id: string) => row<{ enabled: boolean; upstream_closed: boolean; sync_disabled_reason: string | null; current_price_version: number }>(
  db, "select enabled, upstream_closed, sync_disabled_reason, current_price_version from private.models where id = $1", [id]);
const price = (db: Db, id: string) => row<{ version: number; input: string | null; output: string | null; unit: string | null; verified_by: string }>(db, `
  select p.version, p.provider_input_micros_per_million::text as input, p.provider_output_micros_per_million::text as output,
    p.provider_micros_per_unit::text as unit, p.verified_by
  from private.models m join private.model_prices p on p.model_id = m.id and p.version = m.current_price_version where m.id = $1`, [id]);
const pending = (db: Db, id: string) => db.query<{ id: string; kind: string }>(
  "select id::text, kind from private.upstream_changes where model_id = $1 and status = 'pending' order by id", [id]).then((r) => r.rows);

test("the live GrsAI responses parse into text and image models with the USD 150 package", () => {
  const parsed = catalog();
  assert.deepEqual(parsed.package, { amount_minor: 15000, credits: 19980000 });
  assert.equal(parsed.models.length, 31);
  assert.equal(parsed.models.some((m) => m.id === "minimax-h3" || m.id === "agnes-video-2.5"), false);
  const sol = parsed.models.find((m) => m.id === "gpt-6.1-sol")!;
  assert.deepEqual({ ...sol, note: null }, { id: "gpt-6.1-sol", capability: "text", display_name: "GPT 6.1 Sol", closed: false, note: null,
    input_credits: 18000, output_credits: 90000, cache_credits: 1800, unit_credits: null });
  const banana = parsed.models.find((m) => m.id === "nano-banana-pro")!;
  assert.equal(banana.closed, true);
  assert.equal(banana.unit_credits, 1800);
  assert.ok(banana.note);
  assert.equal(displayName("nano-banana-pro-4k-vip"), "Nano Banana Pro 4K VIP");
});

test("unexpected upstream formats fail instead of producing prices", () => {
  const broken = (mutate: (list: any) => void, goods: unknown = goodsFixture) => {
    const list = structuredClone(listFixture);
    mutate(list);
    return () => parseUpstreamCatalog(list, goods);
  };
  assert.throws(broken((l) => { l.code = -1; }), UpstreamCatalogError);
  assert.throws(broken((l) => { l.data.list.find((m: any) => m.name === "gpt-5.5").costType = 0; }), /unexpected_unit:gpt-5.5/);
  assert.throws(broken((l) => { l.data.list.find((m: any) => m.name === "gpt-image-2").cost = 0; }), /missing_price:gpt-image-2/);
  assert.throws(broken((l) => { l.data.list.push(l.data.list.find((m: any) => m.name === "gpt-5.5")); }), /duplicate_model/);
  assert.throws(broken((l) => { l.data.list[3].cost = "600"; }), /model_entry_invalid/);
  assert.throws(broken(() => undefined, { code: 0, data: { usdList: [{ amount: 500, count: 333000, currency: "usd" }] } }), /acquisition_package_missing/);
  // A closed model may list no price; it is kept for its availability only.
  const closedFree = parseUpstreamCatalog((() => { const l = structuredClone(listFixture); Object.assign(l.data.list.find((m: any) => m.name === "gemini-3-pro"), { inputTokens: 0, outputTokens: 0 }); return l; })(), goodsFixture);
  assert.equal(closedFree.models.find((m) => m.id === "gemini-3-pro")!.input_credits, null);
});

test("a sync reprices at 2x the USD 150 cost, closes, adds and is idempotent", async () => {
  const db = await freshDb();
  await openForBusiness(db, ["gpt-5.5", "gemini-2.5-pro", "nano-banana-pro-cl"]);
  const before = await price(db, "gpt-5.5");
  const result = await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  assert.equal(result.status, "synced");

  // Higher cost than the seeded CNY estimate: applied at once as a new version.
  const gpt = await price(db, "gpt-5.5");
  assert.deepEqual([gpt.input, gpt.output, gpt.unit, gpt.verified_by], [cost(44000), cost(270000), null, "upstream-sync"]);
  assert.equal(gpt.input, "330331");
  assert.equal(gpt.version, before.version + 1);
  assert.equal((await model(db, "gpt-5.5")).enabled, true);
  const listed = (await rpc(db, "tw_list_models")).find((m: { id: string }) => m.id === "gpt-5.5");
  assert.equal(listed.prices.input_micros_per_million, "660662");
  assert.equal((await price(db, "nano-banana-pro-cl")).unit, cost(10000));
  const kinds = (id: string) => result.changes.filter((c: { model: string }) => c.model === id).map((c: { kind: string; status: string }) => `${c.kind}:${c.status}`);
  assert.deepEqual(kinds("gpt-5.5"), ["price_increase:applied"]);

  // GrsAI closed it: disabled, and remembered as disabled by the sync.
  const gemini = await model(db, "gemini-2.5-pro");
  assert.deepEqual([gemini.enabled, gemini.upstream_closed, gemini.sync_disabled_reason], [false, true, "upstream_closed"]);
  assert.deepEqual(await row(db, "select actor::text, reason from private.audit_log where action = 'model_disabled' and subject = 'gemini-2.5-pro'"),
    { actor: SYSTEM, reason: "upstream sync: upstream_closed" });
  // Closed but never enabled: no sync reason, so it is never switched on by the sync.
  assert.equal((await model(db, "gemini-3-pro")).sync_disabled_reason, null);

  // New upstream models arrive disabled with a candidate price, waiting for review.
  assert.deepEqual(kinds("gpt-6.1-sol"), ["new_model:pending"]);
  const sol = await row(db, "select display_name, capability, enabled from private.models where id = 'gpt-6.1-sol'");
  assert.deepEqual(sol, { display_name: "GPT 6.1 Sol", capability: "text", enabled: false });
  assert.equal((await price(db, "gpt-6.1-sol")).input, cost(18000));
  assert.equal(await row(db, "select count(*)::int as n from private.models where id = 'agnes-video-2.5'").then((r: any) => r.n), 0);

  // The same list again changes nothing.
  const versions = await row(db, "select count(*)::int as n from private.model_prices");
  const again = await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  assert.deepEqual(again.changes, []);
  assert.deepEqual(await row(db, "select count(*)::int as n from private.model_prices"), versions);
  const state = await rpc(db, "tw_admin_upstream_sync");
  assert.equal(state.state.model_count, 31);
  assert.equal(state.state.package_credits, "19980000");
  assert.equal(state.state.consecutive_failures, 0);

  // Reopened upstream: the sync re-enables only what it disabled itself.
  await rpc(db, "tw_sync_upstream_catalog", withModel(withModel(catalog(), "gemini-2.5-pro", { closed: false }), "gemini-3-pro", { closed: false }), null, null);
  assert.deepEqual([(await model(db, "gemini-2.5-pro")).enabled, (await model(db, "gemini-2.5-pro")).sync_disabled_reason], [true, null]);
  assert.equal((await model(db, "gemini-3-pro")).enabled, false);
});

test("decreases wait for an admin, suspicious jumps disable until decided, dismissals stand", async () => {
  const db = await freshDb();
  await openForBusiness(db, ["gpt-5.5", "nano-banana-pro-cl"]);
  await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  const current = await price(db, "gpt-5.5");

  const cheaper = withModel(catalog(), "gpt-5.5", { input_credits: 40000 });
  await rpc(db, "tw_sync_upstream_catalog", cheaper, null, null);
  await rpc(db, "tw_sync_upstream_catalog", cheaper, null, null);
  const decrease = await pending(db, "gpt-5.5");
  assert.deepEqual(decrease.map((c) => c.kind), ["price_decrease"]);
  assert.deepEqual(await price(db, "gpt-5.5"), current);
  await rpc(db, "tw_admin_resolve_upstream_change", ADMIN, "accept lower cost", decrease[0]!.id, true);
  const lowered = await price(db, "gpt-5.5");
  assert.deepEqual([lowered.input, lowered.output, lowered.version], [cost(40000), current.output, current.version + 1]);
  assert.match(await rpcError(db, "tw_admin_resolve_upstream_change", ADMIN, "again", decrease[0]!.id, true), /upstream_change_not_pending/);
  assert.equal((await row(db, "select count(*)::int as n from private.audit_log where action = 'upstream_change_applied'")).n, 1);

  // A pending decrease that upstream withdraws is superseded.
  await rpc(db, "tw_sync_upstream_catalog", withModel(cheaper, "gpt-5.5", { input_credits: 39000 }), null, null);
  await rpc(db, "tw_sync_upstream_catalog", cheaper, null, null);
  assert.deepEqual(await pending(db, "gpt-5.5"), []);

  const spike = withModel(catalog(), "nano-banana-pro-cl", { unit_credits: 40000 });
  await rpc(db, "tw_sync_upstream_catalog", spike, null, null);
  await rpc(db, "tw_sync_upstream_catalog", spike, null, null);
  const suspicious = await pending(db, "nano-banana-pro-cl");
  assert.deepEqual(suspicious.map((c) => c.kind), ["suspicious_price"]);
  assert.deepEqual([(await model(db, "nano-banana-pro-cl")).enabled, (await model(db, "nano-banana-pro-cl")).sync_disabled_reason], [false, "suspicious_price"]);
  assert.equal((await price(db, "nano-banana-pro-cl")).unit, cost(10000));
  // Dismissed: the price stays, the model stays off for the admin to decide, and the
  // same proposal is not raised again.
  await rpc(db, "tw_admin_resolve_upstream_change", ADMIN, "looks like an upstream typo", suspicious[0]!.id, false);
  await rpc(db, "tw_sync_upstream_catalog", spike, null, null);
  assert.deepEqual(await pending(db, "nano-banana-pro-cl"), []);
  assert.deepEqual([(await model(db, "nano-banana-pro-cl")).enabled, (await model(db, "nano-banana-pro-cl")).sync_disabled_reason], [false, null]);

  // An applied suspicious price re-enables the model it disabled.
  await rpc(db, "tw_admin_set_model_enabled", ADMIN, "back on", "nano-banana-pro-cl", true);
  const bigger = withModel(catalog(), "nano-banana-pro-cl", { unit_credits: 50000 });
  await rpc(db, "tw_sync_upstream_catalog", bigger, null, null);
  const next = await pending(db, "nano-banana-pro-cl");
  assert.equal((await model(db, "nano-banana-pro-cl")).enabled, false);
  await rpc(db, "tw_admin_resolve_upstream_change", ADMIN, "confirmed with GrsAI", next[0]!.id, true);
  assert.equal((await model(db, "nano-banana-pro-cl")).enabled, true);
  assert.equal((await price(db, "nano-banana-pro-cl")).unit, cost(50000));
});

test("missing models are disabled, shrunken lists are rejected, failures alert once", async () => {
  const db = await freshDb();
  await openForBusiness(db, ["gpt-5.5", "gpt-image-2"]);
  await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  const withoutImage = { ...catalog(), models: catalog().models.filter((m) => m.id !== "gpt-image-2") };
  const missing = await rpc(db, "tw_sync_upstream_catalog", withoutImage, null, null);
  assert.deepEqual(missing.changes.map((c: { model: string; kind: string }) => `${c.model}:${c.kind}`), ["gpt-image-2:missing"]);
  assert.deepEqual([(await model(db, "gpt-image-2")).enabled, (await model(db, "gpt-image-2")).sync_disabled_reason], [false, "upstream_missing"]);
  assert.match(await rpcError(db, "tw_admin_set_model_enabled", ADMIN, "force on", "gpt-image-2", true), /model_upstream_closed/);
  await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  assert.equal((await model(db, "gpt-image-2")).enabled, true);

  const tiny = { ...catalog(), models: catalog().models.slice(0, 5) };
  const versions = await row(db, "select count(*)::int as n from private.model_prices");
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rpc(db, "tw_sync_upstream_catalog", tiny, null, null));
  assert.deepEqual(results.map((r) => [r.status, r.error, r.alert]), [
    ["failed", "catalog_shrunk", false], ["failed", "catalog_shrunk", false], ["failed", "catalog_shrunk", true], ["failed", "catalog_shrunk", false]]);
  assert.deepEqual(await row(db, "select count(*)::int as n from private.model_prices"), versions);
  assert.equal((await model(db, "gpt-5.5")).enabled, true);
  const fetchFailure = await rpc(db, "tw_record_upstream_sync_failure", "timeout");
  assert.deepEqual([fetchFailure.consecutive_failures, fetchFailure.alert], [5, false]);

  assert.match(await rpcError(db, "tw_sync_upstream_catalog", tiny, ADMIN, "x"), /reason_required/);
  const accepted = await rpc(db, "tw_sync_upstream_catalog", tiny, ADMIN, "GrsAI retired most models");
  assert.equal(accepted.status, "synced");
  assert.equal((await model(db, "gpt-5.5")).enabled, false);
  assert.equal((await row(db, "select count(*)::int as n from private.audit_log where action = 'upstream_shrink_accepted'")).n, 1);
  assert.equal((await rpc(db, "tw_admin_upstream_sync")).state.consecutive_failures, 0);
  assert.match(await rpcError(db, "tw_sync_upstream_catalog", { package: { amount_minor: 0, credits: 1 }, models: [] }, null, null), /invalid_upstream_catalog/);
});

test("a running request keeps the price version it reserved", async () => {
  const db = await freshDb();
  await openForBusiness(db, ["gpt-5.5"]);
  await credit(db, ALICE, 100_000_000n);
  const reserved = await rpc(db, "tw_reserve_generation", ALICE, null, "gpt-5.5", "keep-price-1", hash("k1"), "text", 1000, 1000, null, null, "key-1");
  const before = await row(db, "select price_version from private.generation_requests where id = $1", [reserved.request_id]);
  await rpc(db, "tw_sync_upstream_catalog", catalog(), null, null);
  assert.deepEqual(await row(db, "select price_version from private.generation_requests where id = $1", [reserved.request_id]), before);
  assert.notEqual((await model(db, "gpt-5.5")).current_price_version, before.price_version);
});

test("change summaries name the costs, and sync functions are service-only", async () => {
  const text = describeChanges([{ id: 1, model: "gpt-5.5", kind: "price_increase", status: "applied",
    previous: { input_micros: "308000", output_micros: "1890000", unit_micros: null }, proposed: { input_micros: "330331", output_micros: "2027028", unit_micros: null } }]);
  assert.match(text, /gpt-5.5: price increase \(applied\) cost \$0\.308000 in \/ \$1\.890000 out per 1M tokens -> \$0\.330331 in/);
  const db = await freshDb();
  for (const fn of ["tw_admin_upstream_sync()", "tw_record_upstream_sync_failure('x')", "tw_sync_upstream_catalog('{}'::jsonb, null, null)",
    `tw_admin_resolve_upstream_change('${ADMIN}', 'reason', 1, true)`]) {
    await db.exec("set role authenticated");
    try { await assert.rejects(db.query(`select public.${fn}`), /permission denied/); } finally { await db.exec("reset role"); }
  }
});
