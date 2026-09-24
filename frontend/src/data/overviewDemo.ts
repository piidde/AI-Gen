import type { UsageRequest } from "./viewModels";
import { filterUsage, readUsageFilters, usageDaily, usagePeriod, usageRequests, usageTotals } from "./usageDemo";
import { addAmounts, decimalAmount, formatAmount, type ExactAmount } from "../lib/pricing";

export type OverviewPeriod = "7d" | "30d" | "6m" | "1y" | "all";

export function overviewSummary(requests: UsageRequest[], period: OverviewPeriod, now: Date) {
  const filtered = filterUsage(requests, readUsageFilters(new URLSearchParams({ period })), now);
  const totals = usageTotals(filtered);
  const settledTotal = decimalAmount(totals.credits);
  const models = new Map<string, UsageRequest[]>();
  for (const request of filtered) {
    const rows = models.get(request.modelId) ?? [];
    rows.push(request);
    models.set(request.modelId, rows);
  }
  const topModels: TopModel[] = settledTotal.numerator > 0n ? [...models].map(([modelId, rows]) => ({
    modelId, modelName: rows[0]!.modelName, credits: usageTotals(rows).credits,
  })).filter(model => decimalAmount(model.credits).numerator > 0n).sort((a, b) => {
    const left = decimalAmount(a.credits);
    const right = decimalAmount(b.credits);
    const difference = right.numerator * left.denominator - left.numerator * right.denominator;
    return difference > 0n ? 1 : difference < 0n ? -1 : a.modelId.localeCompare(b.modelId);
  }).slice(0, 4).map(model => {
    const amount = decimalAmount(model.credits);
    const numerator = amount.numerator * settledTotal.denominator * 1000n;
    const denominator = amount.denominator * settledTotal.numerator;
    return { ...model, percent: Number((numerator * 2n + denominator) / (denominator * 2n)) / 10 };
  }) : [];
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthly = period === "6m" || period === "1y" || period === "all";
  let daily: { day: string; credits: string; requests: number }[];
  if (monthly) {
    const groups = new Map<string, UsageRequest[]>();
    for (const request of filtered) {
      const date = new Date(request.startedAt);
      const key = dateKey(new Date(date.getFullYear(), date.getMonth(), 1));
      groups.set(key, [...(groups.get(key) ?? []), request]);
    }
    const range = usagePeriod(readUsageFilters(new URLSearchParams({ period })), now);
    const first = range ? new Date(range.start) : filtered.reduce<Date | null>((oldest, request) => {
      const date = new Date(request.startedAt);
      return oldest === null || date < oldest ? date : oldest;
    }, null) ?? now;
    const months = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1;
    daily = Array.from({ length: months }, (_, index) => {
      const key = dateKey(new Date(first.getFullYear(), first.getMonth() + index, 1));
      const rows = groups.get(key) ?? [];
      return { day: key, requests: rows.length, credits: usageTotals(rows).credits };
    });
  } else {
    const byDay = new Map(usageDaily(filtered).map(row => [row.day, row]));
    const days = period === "7d" ? 7 : 30;
    daily = Array.from({ length: days }, (_, index) => {
      const day = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + index + 1));
      return byDay.get(day) ?? { day, requests: 0, credits: "0" };
    });
  }
  return {
    totals: { ...totals, failed: filtered.filter(row => row.outcome === "failed").length,
      pending: filtered.filter(row => row.outcome === "pending").length, unknown: filtered.filter(row => row.outcome === "unknown").length },
    topModels,
    daily,
    recent: filterUsage(requests, readUsageFilters(new URLSearchParams({ period: "all" })), now).slice(0, 5),
  };
}

export type TopModel = { modelId: string; modelName: string; credits: string; percent: number };

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
  // These historical examples are deliberately fictional. They exercise the
  // comparison contract without asserting current official or selling prices.
  ...usageRequests.filter(request => request.id.startsWith("req_demo_activity_") && request.outcome === "completed" && request.billing.status === "charged" && Number(request.id.slice(-2)) % 4 === 0).map((request): HistoricalComparison => {
    if (request.billing.status !== "charged") throw new Error("Expected fictional charged request");
    return {
      requestId: request.id, modelId: request.modelId, modelName: request.modelName,
      usage: { inputTokens: request.inputTokens, outputTokens: request.outputTokens, cachedInputTokens: request.cachedInputTokens, imageCount: request.imageCount },
      options: request.imageCount === null ? "Fictional historical Standard text usage; no extra components" : "Fictional historical Standard one-image output; no input images or extras",
      chargedCredits: request.billing.credits, takewingRateVersion: request.billing.rateVersion,
      official: { status: "equivalent", version: "fictional-activity-standard-v1", standardUsd: (Number(request.billing.credits) / 40000).toFixed(6) },
      conversion: { version: "fictional-activity-conversion-v1", creditsPerUsd: "66600" },
    };
  }),
];

export function savingsForRequests(requests: UsageRequest[], comparisons: HistoricalComparison[] = demoComparisons): SavingsResult {
  const differences: ExactAmount[] = [];
  const officialAmounts: ExactAmount[] = [];
  const chargeAmounts: ExactAmount[] = [];
  const exclusionReasons: SavingsExclusions = { failed: 0, refunded: 0, unsettled: 0, free: 0, missingUsage: 0, missingHistory: 0, nonEquivalent: 0, comparisonError: 0 };
  const conversionRates = new Set<string>();
  const comparisonByRequest = new Map(comparisons.map(record => [record.requestId, record]));
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
    const record = comparisonByRequest.get(request.id);
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
