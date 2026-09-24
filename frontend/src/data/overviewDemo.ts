import type { UsageRequest } from "./viewModels";
import { filterUsage, readUsageFilters, usageDaily, usageTotals } from "./usageDemo";
import { addAmounts, decimalAmount, formatAmount, type ExactAmount } from "../lib/pricing";

export function overviewSummary(requests: UsageRequest[], period: "7d" | "30d", now: Date) {
  const filtered = filterUsage(requests, readUsageFilters(new URLSearchParams({ period })), now);
  const byDay = new Map(usageDaily(filtered).map(row => [row.day, row]));
  const days = period === "7d" ? 7 : 30;
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + index + 1);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return byDay.get(day) ?? { day, requests: 0, credits: "0" };
  });
  return {
    totals: { ...usageTotals(filtered), failed: filtered.filter(row => row.outcome === "failed").length,
      pending: filtered.filter(row => row.outcome === "pending").length, unknown: filtered.filter(row => row.outcome === "unknown").length },
    daily,
    recent: filterUsage(requests, readUsageFilters(new URLSearchParams({ period: "all" })), now).slice(0, 5),
  };
}

// Fictional historical evidence, not production prices or a management API DTO.
// A live Overview must receive a server-produced summary over complete history.
export type HistoricalComparison = {
  requestId: string;
  modelId: string;
  modelName: string;
  usage: Pick<UsageRequest, "inputTokens" | "outputTokens" | "cachedInputTokens" | "imageCount">;
  options: string;
  chargedCredits: string;
  takewingRateVersion: string;
  official: { status: "equivalent"; version: string; standardUsd: string } | { status: "unavailable"; reason: string };
  conversion: { version: string; creditsPerUsd: string };
};

export type SavingsExclusions = Record<"failed" | "refunded" | "unsettled" | "free" | "missingUsage" | "missingHistory" | "nonEquivalent" | "comparisonError", number>;
type SavingsDetails = {
  totalRequests: number; comparedRequests: number; excludedRequests: number;
  exclusionReasons: SavingsExclusions; basis: string;
  // Rounded mock transport values, not the future exact production money DTO.
  differenceUsd: string | null; officialUsd: string | null; standardChargeUsd: string | null;
  monetaryApproximate: boolean;
};
export type SavingsResult = SavingsDetails & (
  | { status: "empty" | "unavailable" | "error"; reason: string }
  | { status: "available"; usd: string });
export type DemoSavingsSummary = SavingsResult & {
  asOf: string; revision: string; basisVersion: string;
  coverage: { status: "complete" | "partial"; start: string | null };
};

// Mock service boundary: call once when supplying a snapshot, never on paginated
// table rows in a page render. The live service must aggregate authorized history.
export function readDemoSavings(requests: UsageRequest[], asOf: string, comparisons: HistoricalComparison[] = demoComparisons, historyComplete = true, revision = "demo-v1"): DemoSavingsSummary {
  const recorded = requests.filter(request => Date.parse(request.startedAt) <= Date.parse(asOf));
  const start = recorded.reduce<string | null>((earliest, request) => earliest === null || Date.parse(request.startedAt) < Date.parse(earliest) ? request.startedAt : earliest, null);
  const summary = savingsForRequests(recorded, comparisons);
  const coverage = { status: historyComplete ? "complete" as const : "partial" as const, start };
  const historyBasis = historyComplete ? "Fictional all-time demo history" : `Partial fictional demo history since ${start ?? "an unknown start"}`;
  return { ...summary, basis: summary.basis.replace("Fictional all-time demo history", historyBasis),
    asOf, revision, basisVersion: "demo-historical-standard-v1", coverage };
}

export const demoComparisons: HistoricalComparison[] = [
  { requestId: "req_demo_001", modelId: "sample-text", modelName: "Sample text model",
    usage: { inputTokens: 120, outputTokens: 60, cachedInputTokens: 0, imageCount: null },
    options: "Fictional Standard text; input excludes cache; no thinking, tools or extras", chargedCredits: "0.012", takewingRateVersion: "demo-v1",
    official: { status: "equivalent", version: "fictional-text-standard-v1", standardUsd: "0.006" }, conversion: { version: "fictional-conversion-v1", creditsPerUsd: "66600" } },
  { requestId: "req_demo_002", modelId: "sample-image", modelName: "Sample image model",
    usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, imageCount: 1 },
    options: "Fictional Standard 1024-square image; no input images or extras", chargedCredits: "0.024", takewingRateVersion: "demo-v1",
    official: { status: "equivalent", version: "fictional-image-standard-v1", standardUsd: "0.012" }, conversion: { version: "fictional-conversion-v1", creditsPerUsd: "66600" } },
  { requestId: "req_demo_009", modelId: "sample-text", modelName: "Sample text model",
    usage: { inputTokens: 128, outputTokens: 68, cachedInputTokens: 0, imageCount: null },
    options: "Fictional Standard text; input excludes cache; no thinking, tools or extras", chargedCredits: "0.012", takewingRateVersion: "demo-v1",
    official: { status: "equivalent", version: "fictional-text-standard-v1", standardUsd: "0.007" }, conversion: { version: "fictional-conversion-v1", creditsPerUsd: "66600" } },
  { requestId: "req_demo_032", modelId: "sample-image", modelName: "Sample image model",
    usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, imageCount: 1 },
    options: "Fictional historical Standard 1024-square image; no input images or extras", chargedCredits: "0.024", takewingRateVersion: "demo-v1",
    official: { status: "equivalent", version: "fictional-image-standard-v0", standardUsd: "0.010" }, conversion: { version: "fictional-conversion-v0", creditsPerUsd: "66600" } },
];

export function savingsForRequests(requests: UsageRequest[], comparisons: HistoricalComparison[] = demoComparisons): SavingsResult {
  const differences: ExactAmount[] = [];
  const officialAmounts: ExactAmount[] = [];
  const chargeAmounts: ExactAmount[] = [];
  const exclusionReasons: SavingsExclusions = { failed: 0, refunded: 0, unsettled: 0, free: 0, missingUsage: 0, missingHistory: 0, nonEquivalent: 0, comparisonError: 0 };
  const conversionRates = new Set<string>();
  let error: string | null = null;
  for (const request of requests) {
    // First matching reason wins, so exclusions remain mutually exclusive.
    if (request.billing.status === "refunded") { exclusionReasons.refunded++; continue; }
    if (request.outcome === "failed") { exclusionReasons.failed++; continue; }
    if (request.outcome !== "completed" || request.billing.status === "pending" || request.billing.status === "unknown") { exclusionReasons.unsettled++; continue; }
    if (request.billing.status === "not-charged") { exclusionReasons.free++; continue; }
    if (request.billing.status !== "charged") continue;
    const charged = decimalAmount(request.billing.credits);
    if (charged.numerator < 0n) { exclusionReasons.comparisonError++; error = "Invalid historical charge. Reconciliation required."; continue; }
    if (charged.numerator === 0n) { exclusionReasons.free++; continue; }
    const record = comparisons.find(record => record.requestId === request.id);
    if (!record || !record.conversion.version || record.takewingRateVersion !== request.billing.rateVersion || record.chargedCredits !== request.billing.credits) { exclusionReasons.missingHistory++; continue; }
    if (record.official.status !== "equivalent" || !record.official.version || !record.options || record.modelId !== request.modelId) { exclusionReasons.nonEquivalent++; continue; }
    const fields = ["inputTokens", "outputTokens", "cachedInputTokens", "imageCount"] as const;
    const completeText = request.inputTokens !== null && request.outputTokens !== null && request.cachedInputTokens !== null;
    const completeImage = request.imageCount !== null && request.imageCount > 0;
    if (fields.some(field => request[field] !== record.usage[field]) || (!completeText && !completeImage)) { exclusionReasons.missingUsage++; continue; }
    const conversion = decimalAmount(record.conversion.creditsPerUsd);
    const official = decimalAmount(record.official.standardUsd);
    if (conversion.numerator <= 0n || official.numerator < 0n) { exclusionReasons.comparisonError++; error = "Invalid historical comparison. Reconciliation required."; continue; }
    const actual = { numerator: charged.numerator * conversion.denominator, denominator: charged.denominator * conversion.numerator };
    const difference = addAmounts([official, { ...actual, numerator: -actual.numerator }]);
    if (difference.numerator < 0n) error = "Historical price exceeds its equivalent official price. Savings unavailable until reconciled.";
    differences.push(difference);
    officialAmounts.push(official);
    chargeAmounts.push(actual);
    conversionRates.add(record.conversion.creditsPerUsd === "66600" ? "66,600" : record.conversion.creditsPerUsd);
  }
  const excludedRequests = requests.length - differences.length;
  const difference = formatAmount(addAmounts(differences), 12);
  const displayed = formatAmount(addAmounts(differences));
  const official = formatAmount(addAmounts(officialAmounts), 12);
  const charge = formatAmount(addAmounts(chargeAmounts), 12);
  const decimal = (value: string) => value.startsWith("<") || value.startsWith(">") ? "0.000000000000" : value;
  const details: SavingsDetails = { totalRequests: requests.length, comparedRequests: differences.length, excludedRequests, exclusionReasons,
    differenceUsd: differences.length ? decimal(difference.decimal) : null, officialUsd: differences.length ? decimal(official.decimal) : null,
    standardChargeUsd: differences.length ? decimal(charge.decimal) : null, monetaryApproximate: displayed.approximate || difference.approximate || official.approximate || charge.approximate,
    basis: `Fictional all-time demo history; ${excludedRequests ? "partial comparison coverage" : "all recorded requests compared"}. ${differences.length} compared, ${excludedRequests} excluded. Historical Standard USD equivalents minus final credits at their historical standard conversion (${[...conversionRates].join(" / ")} credits/USD); purchase bonuses, taxes and FX excluded. Failed, refunded, free, unsettled and non-comparable requests are excluded. This is not cash savings or a live account summary.` };
  if (error) return { ...details, status: "error", reason: error };
  if (!requests.length) return { ...details, status: "empty", reason: "No recorded demo requests yet." };
  if (!differences.length) return { ...details, status: "unavailable", reason: "No completed paid requests have a complete equivalent historical comparison." };
  return { ...details, status: "available", usd: displayed.decimal };
}
