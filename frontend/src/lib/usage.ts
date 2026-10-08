import type { UsageRequest } from "../data/viewModels";
import { localDayRange } from "./formatting";

export type UsageFilters = {
  period: "today" | "7d" | "30d" | "6m" | "1y" | "all" | "custom";
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
    period: ["today", "7d", "30d", "6m", "1y", "all", "custom"].includes(period) ? period as UsageFilters["period"] : "30d",
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
  if (filters.period === "1y") {
    const originalDay = start.getDate();
    start.setDate(1);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(Math.min(originalDay, new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()));
  }
  if (filters.period === "6m") {
    const originalDay = start.getDate();
    start.setDate(1);
    start.setMonth(start.getMonth() - 6);
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(originalDay, lastDay));
  }
  return localDayRange(day(start), day(now));
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

// Decimal USD (as carried in view records) to a display amount with at least cents.
export function usd(amount: string): string {
  const negative = amount.startsWith("-");
  const [whole = "0", fraction = ""] = amount.replace(/^-/, "").split(".");
  return `${negative ? "-" : ""}$${BigInt(whole).toLocaleString("en-US")}.${fraction.padEnd(2, "0")}`;
}

export function billingLabel(request: UsageRequest): string {
  const billing = request.billing;
  if (billing.status === "charged") return `Charged ${usd(billing.credits)}`;
  if (billing.status === "refunded") return `Refunded ${usd(billing.refundedCredits)} of ${usd(billing.chargedCredits)}; net ${usd(requestNetCredits(request) ?? "0")}`;
  if (billing.status === "not-charged") return "Not charged";
  return billing.status === "pending" ? "Pending: awaiting confirmation" : "Unknown: awaiting confirmation";
}
