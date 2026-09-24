import { test, expect } from "@playwright/test";
import { overviewSummary, savingsForRequests, readDemoSavings, demoComparisons, type HistoricalComparison } from "../src/data/overviewDemo";
import { usageRequests } from "../src/data/usageDemo";
import type { UsageRequest } from "../src/data/viewModels";

const row = (id = "test"): UsageRequest => ({ id, startedAt: new Date(2026, 8, 20, 12).toISOString(), completedAt: null, modelId: "retired", modelName: "Retired historical model", keyId: "revoked", keyName: "Revoked key", outcome: "completed", durationMs: null, inputTokens: 10, outputTokens: 5, cachedInputTokens: 0, imageCount: null, billing: { status: "charged", credits: "0.3", rateVersion: "old-rate" }, error: null });
const comparison = (request = row()): HistoricalComparison => ({ requestId: request.id, modelId: request.modelId, modelName: request.modelName, usage: { inputTokens: request.inputTokens, outputTokens: request.outputTokens, cachedInputTokens: request.cachedInputTokens, imageCount: request.imageCount }, options: "Fictional Standard text; no extra components", chargedCredits: "0.3", takewingRateVersion: "old-rate", official: { status: "equivalent", version: "old-official", standardUsd: "0.4" }, conversion: { version: "old-conversion", creditsPerUsd: "3" } });

test("overview uses local days, fills zero days and keeps recent history outside period", () => {
  const now = new Date(2026, 8, 20, 12);
  const first = { ...row("first"), startedAt: new Date(2026, 8, 14).toISOString() };
  const old = { ...row("old"), startedAt: new Date(2025, 0, 1).toISOString() };
  const outside = { ...row("outside"), startedAt: new Date(2026, 8, 21).toISOString() };
  const failed = { ...row("failed"), outcome: "failed" as const };
  const pending = { ...row("pending"), outcome: "pending" as const, billing: { status: "pending" as const, reason: "Waiting" } };
  const unknown = { ...pending, id: "unknown", outcome: "unknown" as const };
  const summary = overviewSummary([old, first, outside, failed, pending, unknown], "7d", now);
  expect(summary.totals).toEqual({ requests: 4, completed: 1, failed: 1, pending: 1, unknown: 1, credits: "0.6", unsettled: 2 });
  expect(summary.daily).toHaveLength(7);
  expect(summary.daily[0]).toEqual({ day: "2026-09-14", requests: 1, credits: "0.3" });
  expect(summary.daily[1]).toEqual({ day: "2026-09-15", requests: 0, credits: "0" });
  expect(overviewSummary([old], "7d", now).recent).toEqual([old]);
  expect(summary.recent).toHaveLength(5);
  expect(overviewSummary([], "30d", now).daily).toHaveLength(30);
});

test("historical savings use exact old conversion and retained retired identity", () => {
  const requests = [row("one"), row("two")];
  const records = requests.map(comparison);
  expect(savingsForRequests(requests, records)).toMatchObject({ status: "available", usd: "0.600000", comparedRequests: 2, excludedRequests: 0 });
  expect(records[0].modelName).toBe("Retired historical model");
});

test("savings exclude failed, refunded, free, uncertain and non-equivalent requests with coverage", () => {
  const base = row();
  const requests: UsageRequest[] = [base, { ...row("failed"), outcome: "failed" }, { ...row("refunded"), billing: { status: "refunded", chargedCredits: "0.3", refundedCredits: "0.1", rateVersion: "old-rate" } }, { ...row("free"), billing: { status: "charged", credits: "0", rateVersion: "old-rate" } }, { ...row("pending"), billing: { status: "pending", reason: "Waiting" } }, { ...row("unknown"), outcome: "unknown" }, row("missing")];
  const result = savingsForRequests(requests, requests.slice(0, -1).map(comparison));
  expect(result).toMatchObject({ status: "available", comparedRequests: 1, excludedRequests: 6 });
  if (result.status === "available") expect(result.basis).toMatch(/partial|excluded/i);
  expect(savingsForRequests([], [])).toMatchObject({ status: "empty" });
  expect(savingsForRequests([row()], [])).toMatchObject({ status: "unavailable" });
});

test("missing usage, historical version mismatch and unverified equivalence are excluded", () => {
  const record = comparison();
  expect(savingsForRequests([{ ...row(), inputTokens: null }], [record]).status).toBe("unavailable");
  expect(savingsForRequests([row()], [{ ...record, takewingRateVersion: "current-rate" }]).status).toBe("unavailable");
  expect(savingsForRequests([row()], [{ ...record, official: { status: "unavailable", reason: "Unknown extra" } }]).status).toBe("unavailable");
  const incomplete = { ...row(), outputTokens: null };
  expect(savingsForRequests([incomplete], [comparison(incomplete)]).status).toBe("unavailable");
});

test("savings sum unrounded values before display rounding", () => {
  const requests = [row("one"), row("two")];
  const records = requests.map(request => ({ ...comparison(request), official: { status: "equivalent" as const, version: "tiny", standardUsd: "0.1000004" } }));
  expect(savingsForRequests(requests, records)).toMatchObject({ status: "available", usd: "0.000001", monetaryApproximate: true });
});

test("negative savings below display precision withhold the whole result while parity stays valid", () => {
  const record = comparison();
  expect(savingsForRequests([row()], [{ ...record, official: { status: "equivalent", version: "old", standardUsd: "0.099999999999" } }])).toMatchObject({ status: "error" });
  expect(savingsForRequests([row()], [{ ...record, official: { status: "equivalent", version: "old", standardUsd: "0.1" } }])).toMatchObject({ status: "available", usd: "0.000000" });
});

test("explicit fictional comparisons reconcile to shared all-time usage including old history", () => {
  expect(demoComparisons.every(record => usageRequests.some(request => request.id === record.requestId))).toBe(true);
  expect(demoComparisons.every(record => record.conversion.creditsPerUsd === "66600")).toBe(true);
  const result = savingsForRequests(usageRequests);
  expect(result.status).toBe("available");
  if (result.status === "available") {
    expect(result.comparedRequests + result.excludedRequests).toBe(usageRequests.length);
    expect(result.basis).toContain("66,600 credits/USD");
  }
  expect(demoComparisons.some(record => record.requestId === "req_demo_032")).toBe(true);
});

test("supplied savings summary reconciles reasons and pins explicit coverage and revision", () => {
  const asOf = "2026-09-21T00:00:00Z";
  const paid = row();
  const failed = { ...row("failed"), outcome: "failed" as const };
  const refund = { ...row("refund"), billing: { status: "refunded" as const, chargedCredits: "0.3", refundedCredits: "0.1", rateVersion: "old-rate" } };
  const summary = readDemoSavings([paid, failed, refund], asOf, [comparison()], false, "demo-correction-2");
  expect(summary).toMatchObject({ status: "available", totalRequests: 3, comparedRequests: 1, excludedRequests: 2, asOf, revision: "demo-correction-2", basisVersion: "demo-historical-standard-v1", coverage: { status: "partial", start: paid.startedAt }, exclusionReasons: { failed: 1, refunded: 1 }, officialUsd: "0.400000000000", standardChargeUsd: "0.100000000000", differenceUsd: "0.300000000000" });
  expect(Object.values(summary.exclusionReasons).reduce((sum, count) => sum + count, 0)).toBe(summary.excludedRequests);
  expect(summary.basis).toContain(`since ${paid.startedAt}`);
  expect(summary.basis).not.toContain("all-time");
  expect(readDemoSavings([], asOf, [], false).coverage.status).toBe("partial");
  expect(readDemoSavings([paid], asOf, []).totalRequests).toBe(1);
  const revised = readDemoSavings([refund], asOf, [comparison()], true, "demo-correction-3");
  expect(revised).toMatchObject({ status: "unavailable", revision: "demo-correction-3", comparedRequests: 0, excludedRequests: 1, exclusionReasons: { refunded: 1 } });
  expect(readDemoSavings([paid], "2026-09-19T00:00:00Z", [comparison()]).totalRequests).toBe(0);
  expect(readDemoSavings(usageRequests, new Date().toISOString()).monetaryApproximate).toBe(true);
});
