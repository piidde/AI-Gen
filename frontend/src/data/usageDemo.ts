import type { UsageRequest } from "./viewModels";
import { requests as legacyRequests } from "../demo/fixtures";
import { localDayRange } from "../lib/formatting";

export type UsageFilters = {
  period: "today" | "7d" | "30d" | "6m" | "all" | "custom";
  model: string; key: string; status: string; search: string; page: number; start: string; end: string;
};

function day(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function readUsageFilters(params: URLSearchParams, _now = new Date()): UsageFilters {
  const period = params.get("period") ?? "30d";
  const page = Number(params.get("page") ?? "1");
  const status = params.get("status") ?? "all";
  return {
    period: ["today", "7d", "30d", "6m", "all", "custom"].includes(period) ? period as UsageFilters["period"] : "30d",
    model: params.get("model") || "all", key: params.get("key") || "all",
    status: ["all", "completed", "failed", "pending", "unknown"].includes(status) ? status : "all",
    search: params.get("search") ?? "", page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    start: params.get("start") ?? "", end: params.get("end") ?? "",
  };
}

export function isUsageRangeValid(filters: UsageFilters): boolean {
  return filters.period !== "custom" || localDayRange(filters.start, filters.end) !== null;
}

export function usagePeriod(filters: UsageFilters, now = new Date()): { start: string; endExclusive: string } | null {
  if (filters.period === "all") return null;
  if (filters.period === "custom") return localDayRange(filters.start, filters.end);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filters.period === "7d") start.setDate(start.getDate() - 6);
  if (filters.period === "30d") start.setDate(start.getDate() - 29);
  if (filters.period === "6m") {
    const originalDay = start.getDate();
    start.setDate(1);
    start.setMonth(start.getMonth() - 6);
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(originalDay, lastDay));
  }
  return localDayRange(day(start), day(now));
}

export function filterUsage(requests: UsageRequest[], filters: UsageFilters, now = new Date()): UsageRequest[] {
  if (!isUsageRangeValid(filters)) return [];
  const period = usagePeriod(filters, now);
  const search = filters.search.trim().toLowerCase();
  return requests.filter(request => {
    const time = Date.parse(request.startedAt);
    return (!period || (time >= Date.parse(period.start) && time < Date.parse(period.endExclusive))) &&
      (filters.model === "all" || request.modelId === filters.model) &&
      (filters.key === "all" || request.keyId === filters.key) &&
      (filters.status === "all" || request.outcome === filters.status) && request.id.toLowerCase().includes(search);
  }).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.id.localeCompare(b.id));
}

// Exact decimal display aggregation; this never settles or changes account balances.
function sum(values: string[]): string {
  if (!values.length) return "0";
  for (const value of values) if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("Invalid decimal credits");
  const scale = Math.max(...values.map(value => value.split(".")[1]?.length ?? 0));
  const total = values.reduce((acc, value) => {
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
    return acc + BigInt(`${whole}${fraction.padEnd(scale, "0")}`) * (value.startsWith("-") ? -1n : 1n);
  }, 0n);
  const digits = (total < 0n ? -total : total).toString().padStart(scale + 1, "0");
  const fraction = scale ? digits.slice(-scale).replace(/0+$/, "") : "";
  return `${total < 0n ? "-" : ""}${scale ? digits.slice(0, -scale) : digits}${fraction ? `.${fraction}` : ""}`;
}

export function requestNetCredits(request: UsageRequest): string | null {
  const billing = request.billing;
  if (billing.status === "pending" || billing.status === "unknown") return null;
  if (billing.status === "not-charged") return "0";
  if (billing.status === "charged") return sum([billing.credits]);
  if (billing.status === "refunded") return sum([billing.chargedCredits, billing.refundedCredits.startsWith("-") ? billing.refundedCredits.slice(1) : `-${billing.refundedCredits}`]);
  return null;
}

export function usageTotals(requests: UsageRequest[]): { requests: number; completed: number; credits: string; unsettled: number } {
  const amounts = requests.map(requestNetCredits);
  return { requests: requests.length, completed: requests.filter(r => r.outcome === "completed").length,
    credits: sum(amounts.filter((value): value is string => value !== null)), unsettled: amounts.filter(value => value === null).length };
}

export function usageDaily(requests: UsageRequest[]): { day: string; credits: string; requests: number }[] {
  const groups = new Map<string, UsageRequest[]>();
  for (const request of requests) {
    const key = day(new Date(request.startedAt));
    groups.set(key, [...(groups.get(key) ?? []), request]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([day, rows]) => ({ day, credits: usageTotals(rows).credits, requests: rows.length }));
}

export function billingLabel(request: UsageRequest): string {
  const billing = request.billing;
  if (billing.status === "charged") return `Charged ${billing.credits} credits`;
  if (billing.status === "refunded") return `Refunded ${billing.refundedCredits} of ${billing.chargedCredits} credits; net ${requestNetCredits(request)} credits`;
  if (billing.status === "not-charged") return "Not charged — 0 credits";
  return billing.status === "pending" ? "Pending — awaiting confirmation" : "Unknown — awaiting confirmation";
}

const anchor = new Date();
const generated: UsageRequest[] = Array.from({ length: 32 }, (_, index) => {
  const started = new Date(anchor);
  started.setDate(started.getDate() - (index === 31 ? 400 : index < 24 ? Math.floor(index / 3) : (index - 23) * 18));
  started.setMinutes(started.getMinutes() - index - 1);
  const image = index % 3 === 1;
  const retired = index % 7 === 6;
  const state = index % 8;
  const outcome = state === 2 || state === 3 ? "failed" : state === 4 ? "pending" : state === 5 ? "unknown" : "completed";
  return {
    id: `req_demo_${String(index + 1).padStart(3, "0")}`, startedAt: started.toISOString(),
    completedAt: outcome === "pending" || outcome === "unknown" ? null : new Date(started.getTime() + 1250).toISOString(),
    modelId: retired ? "retired-model" : image ? "sample-image" : "sample-text",
    modelName: retired ? "Retired sample model" : image ? "Sample image model" : "Sample text model",
    keyId: retired ? "key-revoked" : "key-production", keyName: retired ? "Old integration (revoked)" : "Production",
    outcome, durationMs: outcome === "pending" || outcome === "unknown" ? null : 1250,
    inputTokens: image || outcome !== "completed" ? null : 120 + index,
    outputTokens: image || outcome !== "completed" ? null : 60 + index,
    cachedInputTokens: image || outcome !== "completed" ? null : 0,
    imageCount: image && outcome === "completed" ? 1 : null,
    billing: state === 2 ? { status: "charged", credits: "0.012", rateVersion: "demo-v1" }
      : state === 3 ? { status: "refunded", chargedCredits: "0.024", refundedCredits: "0.024", rateVersion: "demo-v1" }
      : state === 4 ? { status: "pending", reason: "Awaiting demo settlement" }
      : state === 5 ? { status: "unknown", reason: "Settlement unavailable" }
      : state === 6 ? { status: "not-charged", reason: "Fictional free request" }
      : { status: "charged", credits: image ? "0.024" : "0.012", rateVersion: "demo-v1" },
    error: state === 2 ? { code: "POLICY_REJECTED", message: "Request rejected by policy." }
      : state === 3 ? { code: "GENERATION_FAILED", message: "Generation failed." } : null,
  };
});

export const usageRequests: UsageRequest[] = [...generated, ...legacyRequests.map((request): UsageRequest => ({
  id: request.id, startedAt: `2026-09-16T${request.time}Z`, completedAt: null,
  modelId: request.model, modelName: `Sample model ${request.model}`, keyId: request.key === "Production" ? "key-production" : "key-internal",
  keyName: request.key, outcome: request.status === "Completed" ? "completed" : "failed", durationMs: null,
  inputTokens: null, outputTokens: null, cachedInputTokens: null, imageCount: null,
  billing: request.status === "Completed" ? { status: "charged", credits: request.credits, rateVersion: "demo-legacy" }
    : { status: "unknown", reason: "Historical settlement unavailable" }, error: null,
}))];
