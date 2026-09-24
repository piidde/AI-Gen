import type { Decimal, Instant } from "../data/viewModels";

export function formatLocalTime(instant: Instant | null): string {
  if (instant === null) return "Unavailable";
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime()) || !/(Z|[+-]\d{2}:\d{2})$/.test(instant)) {
    throw new Error("Expected an absolute timestamp");
  }
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" });
  return `${formatter.format(date)} · ${formatter.resolvedOptions().timeZone}`;
}

function localDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
}

export function localDayRange(startDay: string, endDay: string): { start: Instant; endExclusive: Instant } | null {
  const start = localDate(startDay);
  const end = localDate(endDay);
  if (!start || !end || start > end) return null;
  // Calendar arithmetic preserves 23/25-hour local days across DST transitions.
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), endExclusive: end.toISOString() };
}

function exactAmount(amount: Decimal): string {
  if (!/^-?\d+(\.\d+)?$/.test(amount)) throw new Error("Expected an unformatted decimal amount");
  const negative = amount.startsWith("-");
  const [whole = "0", fraction = ""] = amount.replace(/^-/, "").split(".");
  // Preserve all supplied precision, including values beyond Number's safe range.
  return `${negative ? "-" : ""}${BigInt(whole).toLocaleString("en-US")}.${fraction.padEnd(2, "0")}`;
}

export type EurEstimate = { amount: Decimal; asOf: Instant; expiresAt: Instant };

export function formatMoney(
  usd: Decimal | null, currency: "USD" | "EUR" = "USD",
  estimate: EurEstimate | null = null, now = Date.now(),
): string {
  if (usd === null) return "Unavailable";
  const dollars = `$${exactAmount(usd)} USD`;
  if (currency === "USD") return dollars;
  if (estimate && Date.parse(estimate.asOf) <= now && now < Date.parse(estimate.expiresAt)) {
    return `≈ €${exactAmount(estimate.amount)} EUR · estimate as of ${formatLocalTime(estimate.asOf)}`;
  }
  return `${dollars} · EUR estimate unavailable`;
}
