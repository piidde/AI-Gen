import { test, expect } from "@playwright/test";
import { readUsageFilters, usagePeriod, isUsageRangeValid, requestNetCredits, billingLabel, usd } from "../src/lib/usage";
import { formatUsd, microsToDecimal, toApiKey, toUsageRequest, usdToMicros, type UsageRecordDto } from "../src/data/apiModels";
import { safeRequestError, requestSupportDetails } from "../src/lib/supportDetails";

const now = new Date("2026-09-20T12:00:00Z");
const filters = (query: string) => readUsageFilters(new URLSearchParams(query), now);
const record = (overrides: Partial<UsageRecordDto> = {}): UsageRecordDto => ({
  id: "6f1d3c2a-0000-4000-8000-000000000001", model: "gpt-5.5", model_name: "GPT 5.5", capability: "text", status: "succeeded",
  outcome: "completed", created_at: "2026-09-20T10:00:00Z", completed_at: "2026-09-20T10:00:01.250Z", credits_micros: "1200",
  price_version: 3, error: null, api_key_id: "key-1", api_key_name: "Production", input_tokens: 400, output_tokens: 100, units: null, ...overrides,
});

test("filters validate URL state and reject impossible custom ranges", () => {
  expect(filters("period=no&page=-2&status=wat")).toMatchObject({ period: "30d", page: 1, status: "all" });
  expect(filters("page=2.5").page).toBe(1);
  expect(usagePeriod(filters("period=all"), now)).toBeNull();
  for (const query of ["period=custom&start=2026-02-30&end=2026-03-01", "period=custom&start=2026-10-01&end=2026-09-01", "period=custom"]) {
    expect(isUsageRangeValid(filters(query))).toBe(false);
  }
});

test("presets use inclusive local calendar dates and clamp six-month end dates", () => {
  const date = new Date(2026, 8, 20, 12);
  const expected = (month: number, day: number) => ({ start: new Date(2026, month, day).toISOString(), endExclusive: new Date(2026, 8, 21).toISOString() });
  expect(usagePeriod(filters("period=today"), date)).toEqual(expected(8, 20));
  expect(usagePeriod(filters("period=7d"), date)).toEqual(expected(8, 14));
  expect(usagePeriod(filters("period=30d"), date)).toEqual(expected(7, 22));
  expect(usagePeriod(filters("period=6m"), date)).toEqual(expected(2, 20));
  expect(usagePeriod(filters("period=6m"), new Date(2026, 7, 31, 12))).toEqual({ start: new Date(2026, 1, 28).toISOString(), endExclusive: new Date(2026, 8, 1).toISOString() });
  expect(usagePeriod(filters("period=1y"), new Date(2024, 1, 29, 12))?.start).toBe(new Date(2023, 1, 28).toISOString());
});

test("local-day ranges observe the actual DST day length", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    for (const [date, hours] of [["2026-03-29", 23], ["2026-10-25", 25]] as const) {
      const range = usagePeriod(filters(`period=custom&start=${date}&end=${date}`))!;
      expect((Date.parse(range.endExclusive) - Date.parse(range.start)) / 3600000).toBe(hours);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("micros convert exactly, including amounts beyond Number precision", () => {
  expect(microsToDecimal("1200")).toBe("0.0012");
  expect(microsToDecimal("-2500000")).toBe("-2.5");
  expect(formatUsd("9007199254740993123456")).toBe("$9,007,199,254,740,993.123456");
  expect(formatUsd("5000000")).toBe("$5.00");
  expect(usdToMicros("2.50")).toBe("2500000");
  expect(usdToMicros("$5")).toBe("5000000");
  expect(usdToMicros("0.000001")).toBe("1");
  for (const bad of ["0", "-1", "1.1234567", "abc", "", "1e3"]) expect(usdToMicros(bad)).toBeNull();
});

test("server usage records map to view rows with honest billing states", () => {
  const charged = toUsageRequest(record());
  expect(charged.billing).toEqual({ status: "charged", credits: "0.0012", rateVersion: "v3" });
  expect(charged.durationMs).toBe(1250);
  expect(billingLabel(charged)).toBe("Charged $0.0012");
  expect(requestNetCredits(charged)).toBe("0.0012");
  const failed = toUsageRequest(record({ outcome: "failed", status: "failed", credits_micros: null, error: "provider_rejected" }));
  expect(failed.billing.status).toBe("not-charged");
  expect(safeRequestError(failed)?.message).toContain("rejected");
  const unknown = toUsageRequest(record({ outcome: "unknown", status: "unknown", credits_micros: null, error: "provider_submit_ambiguous", completed_at: null }));
  expect(unknown.billing.status).toBe("unknown");
  expect(unknown.durationMs).toBeNull();
  expect(safeRequestError(unknown)?.advice).toMatch(/Do not resubmit/);
  expect(toUsageRequest(record({ capability: "image", units: 2, input_tokens: null, output_tokens: null })).imageCount).toBe(2);
  expect(usd("0.5")).toBe("$0.50");
});

test("support copies contain only allowlisted metadata", () => {
  const request = { ...toUsageRequest(record({ error: "provider_job_failed", outcome: "failed", credits_micros: null })), prompt: "private input" };
  const details = requestSupportDetails(request);
  expect(details).toContain("Request: 6f1d3c2a");
  expect(details).toContain(Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(details).not.toMatch(/private input/);
});

test("API keys expose only the stored prefix and lifecycle", () => {
  const key = toApiKey({ id: "k1", name: "Production", prefix: "tw_live_abcd1234…", created_at: "2026-09-01T00:00:00Z", last_used_at: null, revoked_at: "2026-09-02T00:00:00Z" });
  expect(key).toMatchObject({ maskedIdentifier: "tw_live_abcd1234…", status: "revoked", lastUsed: { status: "never" } });
});
