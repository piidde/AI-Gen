import { snapshot } from "../content/catalogue";
import type { ReferenceRate } from "../content/catalogue";
import { formatMoney, type EurEstimate } from "./formatting";

// Ephemeral exact display arithmetic. Never persist BigInt objects as API DTOs,
// use these estimates for settlement, or feed rounded strings back into billing.
export type ExactAmount = { numerator: bigint; denominator: bigint };

export function decimalAmount(value: string): ExactAmount {
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("Invalid exact decimal");
  const [whole, fraction = ""] = value.split(".");
  return { numerator: BigInt(`${whole}${fraction}`), denominator: 10n ** BigInt(fraction.length) };
}

function nonnegative(value: string): ExactAmount {
  const amount = decimalAmount(value);
  if (amount.numerator < 0n) throw new Error("Expected nonnegative amount");
  return amount;
}

export function creditsToUsd(credits: string): ExactAmount {
  const amount = nonnegative(credits);
  return { numerator: amount.numerator, denominator: amount.denominator * BigInt(snapshot.creditsPerUsd) };
}

export function formatReferenceMoney(credits: string | null, currency: "USD" | "EUR", estimate: EurEstimate | null = null, now = Date.now()): string {
  if (credits === null) return "Rate unavailable";
  const usd = formatAmount(creditsToUsd(credits));
  const dollars = `${usd.approximate ? "≈ " : ""}$${usd.decimal} USD`;
  // Each supplied estimate describes this exact rate; no invented FX conversion.
  if (currency === "EUR" && estimate && Date.parse(estimate.asOf) <= now && now < Date.parse(estimate.expiresAt) && !usd.decimal.startsWith("<")) {
    return `${formatMoney(usd.decimal, "EUR", estimate, now)} (${dollars})`;
  }
  return dollars;
}

export function rateCost(rate: Pick<ReferenceRate, "credits" | "per">, quantity: string): ExactAmount {
  if (rate.credits === null) throw new Error("Rate unavailable");
  return quantityCost(creditsToUsd(rate.credits), rate.per, quantity);
}

export function usdRateCost(usd: string, per: string, quantity: string): ExactAmount {
  return quantityCost(nonnegative(usd), per, quantity);
}

function quantityCost(usd: ExactAmount, ratePer: string, quantity: string): ExactAmount {
  const count = nonnegative(quantity);
  const per = nonnegative(ratePer);
  if (per.numerator === 0n) throw new Error("Rate denominator must be positive");
  return { numerator: usd.numerator * count.numerator * per.denominator, denominator: usd.denominator * count.denominator * per.numerator };
}

export function addAmounts(amounts: ExactAmount[]): ExactAmount {
  return amounts.reduce((total, amount) => ({
    numerator: total.numerator * amount.denominator + amount.numerator * total.denominator,
    denominator: total.denominator * amount.denominator,
  }), { numerator: 0n, denominator: 1n });
}

export function formatAmount(amount: ExactAmount, places = 6): { decimal: string; approximate: boolean } {
  if (!Number.isInteger(places) || places < 0 || places > 12 || amount.denominator <= 0n) throw new Error("Invalid display precision or denominator");
  const scale = 10n ** BigInt(places);
  const negative = amount.numerator < 0n;
  const magnitude = negative ? -amount.numerator : amount.numerator;
  const scaled = magnitude * scale;
  const approximate = scaled % amount.denominator !== 0n;
  const rounded = (scaled * 2n + amount.denominator) / (2n * amount.denominator);
  const fixed = (value: bigint) => places === 0 ? value.toString() : `${value / scale}.${(value % scale).toString().padStart(places, "0")}`;
  if (magnitude > 0n && rounded === 0n) return { decimal: `${negative ? ">-" : "<"}${fixed(1n)}`, approximate: true };
  return { decimal: `${negative && rounded !== 0n ? "-" : ""}${fixed(rounded)}`, approximate };
}

export function compareRate(rate: ReferenceRate, officialIndex: number, onDate: string):
  | { status: "available"; percent: string }
  | { status: "error"; reason: string }
  | { status: "unavailable"; reason: string } {
  const unavailable = (reason: string) => ({ status: "unavailable" as const, reason });
  if (rate.comparison.status !== "verified") return unavailable(rate.comparison.reason);
  const official = rate.official[officialIndex];
  if (!official || rate.credits === null) return unavailable("Equivalent price unavailable");
  if (rate.unit !== official.unit || rate.per !== official.per || rate.conditions !== official.conditions) return unavailable("Units or settings differ");
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(onDate) && Number.isFinite(Date.parse(onDate)) && new Date(onDate).toISOString().slice(0, 10) === onDate;
  if (!validDate || official.recheckOn === null || onDate < snapshot.checkedOn || onDate >= official.recheckOn) return unavailable("Reference requires recheck");
  const baseline = nonnegative(official.usd);
  if (baseline.numerator === 0n) return unavailable("Official baseline must be positive");
  const actual = creditsToUsd(rate.credits);
  // Tenths of a percent, truncated toward zero: never round up a claimed saving.
  const difference = baseline.numerator * actual.denominator - actual.numerator * baseline.denominator;
  if (difference < 0n) return { status: "error", reason: "Reference price exceeds the equivalent official price. Reconciliation required." };
  const tenths = difference * 1000n / (baseline.numerator * actual.denominator);
  if (tenths === 0n && difference !== 0n) return { status: "available", percent: difference < 0n ? ">-0.1" : "<0.1" };
  const magnitude = tenths < 0n ? -tenths : tenths;
  return { status: "available", percent: `${tenths < 0n ? "-" : ""}${magnitude / 10n}.${magnitude % 10n}` };
}
