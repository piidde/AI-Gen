import { test, expect } from "@playwright/test";
import { usageRequests, readUsageFilters, filterUsage, usagePeriod, isUsageRangeValid, requestNetCredits, usageTotals, usageDaily, billingLabel } from "../src/data/usageDemo";
import { usageCsv } from "../src/lib/usageExport";
import { safeRequestError, requestSupportDetails } from "../src/lib/supportDetails";
import type { UsageRequest } from "../src/data/viewModels";

const now = new Date("2026-09-20T12:00:00Z");
const filters = (query: string) => readUsageFilters(new URLSearchParams(query), now);
const row = (billing: UsageRequest["billing"]): UsageRequest => ({ id: "req_test", startedAt: "2026-09-20T10:00:00Z", completedAt: null, modelId: "retired-model", modelName: "Historical model", keyId: "key-revoked", keyName: "Old key", outcome: "failed", durationMs: null, inputTokens: null, outputTokens: null, cachedInputTokens: null, imageCount: null, billing, error: null });

test("filters validate URL state and combine historical identity with local calendar boundaries", () => {
  expect(filters("period=no&page=-2&status=wat")).toMatchObject({ period: "30d", page: 1, status: "all" });
  expect(filters("page=2.5").page).toBe(1);
  expect(usagePeriod(filters("period=all"), now)).toBeNull();
  const f = filters("period=custom&start=2026-09-20&end=2026-09-20&model=retired-model&key=key-revoked&status=failed&search=REQ_TEST");
  const range = usagePeriod(f, now)!;
  const first = { ...row({ status: "not-charged", reason: "No charge" }), startedAt: range.start };
  const next = { ...first, id: "req_test_next", startedAt: range.endExclusive };
  expect(filterUsage([first, next], f, now)).toEqual([first]);
  for (const query of ["period=custom&start=2026-02-30&end=2026-03-01", "period=custom&start=2026-10-01&end=2026-09-01", "period=custom"]) {
    expect(isUsageRangeValid(filters(query))).toBe(false);
    expect(filterUsage([first], filters(query), now)).toEqual([]);
  }
});

test("billing totals preserve exact decimals, charged failures and unresolved amounts", () => {
  const charged = row({ status: "charged", credits: "9007199254740993.123", rateVersion: "demo-v1" });
  const refund = row({ status: "refunded", chargedCredits: "0.3", refundedCredits: "0.2", rateVersion: "demo-v1" });
  const pending = row({ status: "pending", reason: "Pending" });
  expect(requestNetCredits(refund)).toBe("0.1");
  expect(requestNetCredits(pending)).toBeNull();
  expect(usageTotals([charged, refund, pending])).toEqual({ requests: 3, completed: 0, credits: "9007199254740993.223", unsettled: 1 });
  expect(usageDaily([charged, refund, pending])[0]).toMatchObject({ requests: 3, credits: "9007199254740993.223" });
  expect(billingLabel(charged)).toBe("Charged 9007199254740993.123 credits");
  expect(billingLabel(refund)).toBe("Refunded 0.2 of 0.3 credits; net 0.1 credits");
  expect(billingLabel(pending)).toBe("Pending — awaiting confirmation");
  expect(billingLabel(row({ status: "unknown", reason: "Unconfirmed" }))).toBe("Unknown — awaiting confirmation");
});

test("demo contains historical keys, retained identifiers, outcomes and distinct billing states", () => {
  expect(usageRequests.length).toBeGreaterThanOrEqual(30);
  expect(usageRequests.filter(r => r.modelId === "A")).toHaveLength(3);
  expect(usageRequests.find(r => r.id === "req_8f21")?.inputTokens).toBeNull();
  expect(usageRequests.find(r => r.id === "req_8f21")?.modelName).toBe("Sample model A");
  expect(usageRequests.some(r => r.outcome === "failed" && r.billing.status === "charged")).toBe(true);
  expect(usageRequests.some(r => r.billing.status === "refunded" && requestNetCredits(r) === "0")).toBe(true);
  expect(usageRequests.some(r => r.billing.status === "unknown")).toBe(true);
});

test("all-time history includes an older-than-one-year request outside six months", () => {
  const current = new Date();
  const old = usageRequests.find(request => request.id === "req_demo_032")!;
  expect(current.getTime() - Date.parse(old.startedAt)).toBeGreaterThan(365 * 86400000);
  expect(filterUsage(usageRequests, filters("period=all"), current)).toContainEqual(old);
  expect(filterUsage(usageRequests, filters("period=6m"), current)).not.toContainEqual(old);
});

test("shared preview history spans a year with varied daily volume and catalogue model names", () => {
  const current = new Date();
  const preview = usageRequests.filter(request => request.id.startsWith("req_demo_activity_"));
  const days = new Set(preview.map(request => request.startedAt.slice(0, 10)));
  const dailyCounts = new Map<string, number>();
  for (const request of preview) {
    const date = request.startedAt.slice(0, 10);
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }
  expect(days.size).toBeGreaterThan(365);
  expect(new Set(dailyCounts.values()).size).toBeGreaterThan(5);
  expect(preview.some(request => request.modelId === "gpt-image-2" && request.modelName === "GPT Image 2")).toBe(true);
  expect(preview.some(request => request.modelId === "gpt-5.6-terra" && request.modelName === "GPT-5.6 Terra")).toBe(true);
  for (const [id, name] of [["gpt-6-astra", "GPT-6 Astra"], ["gemini-3.8-flash", "Gemini 3.8 Flash"], ["gpt-image-2.5", "GPT Image 2.5"], ["nano-banana-pro", "Nano Banana Pro"]]) {
    expect(preview.some(request => request.modelId === id && request.modelName === name)).toBe(true);
  }
  expect(preview.filter(request => request.billing.status === "charged").some(request => Number(request.billing.status === "charged" ? request.billing.credits : 0) >= 400)).toBe(true);
  expect(filterUsage(preview, filters("period=1y"), current).length).toBeLessThan(preview.length);
  expect(filterUsage(preview, filters("period=7d"), current).length).toBeGreaterThan(0);
});

test("CSV and support copies use allowlists and normalized errors without raw payloads", () => {
  const request = { ...row({ status: "unknown", reason: "secret billing payload" }), modelName: " \t=HYPERLINK(\"evil\")", error: { code: "unexpected-secret-code", message: "secret upstream prompt" }, prompt: "private input", secret: "credential" };
  const csv = usageCsv([request, ...usageRequests]);
  expect(csv.split("\r\n")).toHaveLength(usageRequests.length + 2);
  expect(csv).toContain("started_at_utc");
  expect(csv).toContain("duration_ms");
  expect(csv).toContain("net_credits");
  expect(csv).toContain("' \t=HYPERLINK");
  expect(csv).not.toMatch(/secret|private input|credential|unexpected-secret-code/);
  expect(requestSupportDetails(request)).not.toMatch(/secret|private input|credential|unexpected-secret-code|retry/i);
  expect(requestSupportDetails(request)).toContain(`Started (local):`);
  expect(requestSupportDetails(request)).toContain(Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(safeRequestError(request)?.code).toBe("UNKNOWN_ERROR");
  expect(safeRequestError({ ...request, error: null })).toBeNull();
  expect(safeRequestError({ ...request, error: { code: "POLICY_REJECTED", message: "raw payload" } })?.message).toContain("policy");
});

test("presets use inclusive local calendar dates and clamp six-month end dates", () => {
  const date = new Date(2026, 8, 20, 12);
  const expected = (month: number, day: number) => ({ start: new Date(2026, month, day).toISOString(), endExclusive: new Date(2026, 8, 21).toISOString() });
  expect(usagePeriod(filters("period=today"), date)).toEqual(expected(8, 20));
  expect(usagePeriod(filters("period=7d"), date)).toEqual(expected(8, 14));
  expect(usagePeriod(filters("period=30d"), date)).toEqual(expected(7, 22));
  expect(usagePeriod(filters("period=6m"), date)).toEqual(expected(2, 20));
  expect(usagePeriod(filters("period=6m"), new Date(2026, 7, 31, 12))).toEqual({ start: new Date(2026, 1, 28).toISOString(), endExclusive: new Date(2026, 8, 1).toISOString() });
  expect(usagePeriod(filters("period=1y"), new Date(2025, 1, 28, 12))).toEqual({ start: new Date(2024, 1, 28).toISOString(), endExclusive: new Date(2025, 2, 1).toISOString() });
  expect(usagePeriod(filters("period=1y"), new Date(2024, 1, 29, 12))?.start).toBe(new Date(2023, 1, 28).toISOString());
});

test("local-day filtering observes the actual DST day length", () => {
  // Windows Node honors TZ at runtime; restoring avoids changing other data tests.
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    for (const [date, hours] of [["2026-03-29", 23], ["2026-10-25", 25]] as const) {
      const f = filters(`period=custom&start=${date}&end=${date}`);
      const range = usagePeriod(f)!;
      expect((Date.parse(range.endExclusive) - Date.parse(range.start)) / 3600000).toBe(hours);
      const first = { ...row({ status: "not-charged", reason: "Free" }), startedAt: range.start };
      const last = { ...first, id: "last", startedAt: new Date(Date.parse(range.endExclusive) - 1).toISOString() };
      const outside = { ...first, id: "outside", startedAt: range.endExclusive };
      expect(filterUsage([first, last, outside], f).map(r => r.id)).toEqual(["last", "req_test"]);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("CSV escapes multiline cells and neutralizes formulas behind control characters", () => {
  const request = row({ status: "unknown", reason: "Unavailable" });
  expect(usageCsv([{ ...request, modelName: '\u007f=1+1', keyName: 'Old, "key"\nrevoked' }])).toContain("'\u007f=1+1");
  expect(usageCsv([{ ...request, keyName: 'Old, "key"\nrevoked' }])).toContain('"Old, ""key""\nrevoked"');
});
