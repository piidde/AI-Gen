import type { ApiKey, UsageRequest } from "./viewModels";

// Pure server DTO shapes, exact money helpers and view mappers (no network or auth imports).
// --- Server DTOs (see src/openapi.ts in the backend) ---

export type Micros = string;
export type SummaryDto = { available_credits_micros: Micros; reserved_credits_micros: Micros; used_credits_micros: Micros; suspended: boolean; request_count: number; completed_count: number; failed_count: number };
export type UsageRecordDto = {
  id: string; model: string; model_name: string; capability: "text" | "image" | "video"; status: string;
  outcome: UsageRequest["outcome"]; created_at: string; completed_at: string | null; credits_micros: Micros | null;
  price_version: number; error: string | null; api_key_id: string | null; api_key_name: string | null;
  input_tokens: number | null; output_tokens: number | null; units: number | null;
};
export type UsagePageDto = { summary: SummaryDto; total: number; limit: number; offset: number; data: UsageRecordDto[] };
export type UsageOverviewDto = {
  from: string | null; timezone: "UTC";
  totals: { requests: number; completed: number; failed: number; pending: number; unknown: number; credits_micros: Micros };
  daily: { day: string; requests: number; completed: number; failed: number; credits_micros: Micros }[];
  models: { model: string; name: string; requests: number; credits_micros: Micros }[];
};
export type SavingsDto = { compared_requests: number; excluded_not_settled: number; excluded_no_reference: number; official_micros: Micros; charged_micros: Micros; saved_micros: Micros };
export type ApiKeyDto = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type CreatedApiKeyDto = { id: string; name: string; prefix: string; created_at: string; secret: string };
export type OfferDto = { id: string; currency: "eur" | "usd"; amount_minor: number; credits_micros: Micros; price_version: number };
export type PaymentDto = { id: string; offer_id: string; currency: "eur" | "usd"; amount_minor: number; credits_micros: Micros; status: string; created_at: string };
export type PreferencesDto = { low_balance_enabled: boolean; threshold_micros: Micros | null; product_updates: boolean; last_alert_at: string | null };
export type BillingProfileDto = { kind: "personal" | "business" | null; name: string | null; company: string | null; address_line1: string | null; address_line2: string | null; city: string | null; postal_code: string | null; region: string | null; country_code: string | null; vat_id: string | null };
export type ModelDto = { id: string; name: string; capability: "text" | "image" | "video"; price_version: number; pricing: { unit: string; input_per_million: string | null; output_per_million: string | null; per_unit: string | null };
  endpoints?: ("chat.completions" | "responses")[]; tool_calling?: boolean; context_window?: number | null; max_output_tokens?: number | null };
export type IncidentDto = { id: string; title: string; impact: string; service: string; model_ids: string[]; timeline: { at: string; message: string }[]; started_at: string; updated_at: string; resolved_at: string | null };
export type StatusDto = { checked_at: string; updated_at: string | null; incidents: IncidentDto[] };

// --- Exact money helpers: micros are integer millionths of USD ---

export function microsToDecimal(micros: Micros): string {
  const value = BigInt(micros);
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const fraction = (absolute % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${absolute / 1_000_000n}${fraction ? `.${fraction}` : ""}`;
}

// Display rounding only; balances and charges stay exact micros on the server.
// "down" (toward zero) for balances and savings so neither is overstated, "up" for
// prices a customer will be charged so none is understated, "nearest" otherwise.
export type Rounding = "down" | "nearest" | "up";

function roundMicros(absolute: bigint, step: bigint, rounding: Rounding): bigint {
  const rest = absolute % step;
  if (rest === 0n || rounding === "down") return absolute - rest;
  if (rounding === "up" || rest * 2n >= step) return absolute - rest + step;
  return absolute - rest;
}

function dollars(absolute: bigint, places: number): string {
  const scale = 10n ** BigInt(6 - places);
  const units = absolute / scale;
  const cents = 10n ** BigInt(places);
  return `$${(units / cents).toLocaleString("en-US")}${places ? `.${(units % cents).toString().padStart(places, "0")}` : ""}`;
}

// "$1,234.50": always cents. A non-zero amount below one cent reads "<$0.01".
export function formatUsd(micros: Micros, rounding: Rounding = "nearest"): string {
  const value = BigInt(micros);
  const absolute = value < 0n ? -value : value;
  const sign = value < 0n ? "-" : "";
  const rounded = roundMicros(absolute, 10_000n, rounding);
  if (rounded === 0n && absolute > 0n) return `${sign}<$0.01`;
  return `${rounded === 0n ? "" : sign}${dollars(rounded, 2)}`;
}

// Unit prices (per 1M tokens, per image) and single-request amounts: cents from $0.10,
// two significant digits below that ($0.0091, $0.064), so small amounts do not
// collapse to $0.00 or $0.01. Digits past the cents are dropped when zero ($0.08).
export function formatUsdPrice(micros: Micros, rounding: Rounding = "up"): string {
  const absolute = BigInt(micros) < 0n ? -BigInt(micros) : BigInt(micros);
  let places = 2;
  while (places < 6 && absolute > 0n && absolute * 10n ** BigInt(places) < 10n ** 7n) places++;
  const text = dollars(roundMicros(absolute, 10n ** BigInt(6 - places), rounding), places).replace(/(\.\d\d\d*?)0+$/, "$1");
  return `${BigInt(micros) < 0n ? "-" : ""}${text}`;
}

// "$1.201202" (API price strings) to micros, for display formatting.
export function usdStringToMicros(value: string): Micros {
  const match = /^-?\$?(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid USD amount: ${value}`);
  const micros = BigInt(match[1]!) * 1_000_000n + BigInt((match[2] ?? "").padEnd(6, "0"));
  return (value.trim().startsWith("-") ? -micros : micros).toString();
}

// Parses a user-entered USD amount (max 6 decimals) into exact micros, or null.
export function usdToMicros(input: string): Micros | null {
  const match = /^\s*\$?\s*(\d{1,10})(?:[.,](\d{1,6}))?\s*$/.exec(input);
  if (!match) return null;
  const micros = BigInt(match[1]!) * 1_000_000n + BigInt((match[2] ?? "").padEnd(6, "0"));
  return micros > 0n ? micros.toString() : null;
}

export function formatMinor(amountMinor: number, currency: "eur" | "usd"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);
}

// --- Mapping into the existing view records used by tables and dialogs ---

export function toUsageRequest(record: UsageRecordDto): UsageRequest {
  const completed = record.completed_at ? Date.parse(record.completed_at) - Date.parse(record.created_at) : null;
  const billing: UsageRequest["billing"] = record.outcome === "completed" && record.credits_micros !== null
    ? { status: "charged", credits: microsToDecimal(record.credits_micros), rateVersion: `v${record.price_version}` }
    : record.outcome === "failed" ? { status: "not-charged", reason: "Failed requests release their reserved credits." }
    : record.outcome === "pending" ? { status: "pending", reason: "The request is still running." }
    : { status: "unknown", reason: "The provider outcome is unconfirmed; reserved credits stay held until it is resolved." };
  return {
    id: record.id, startedAt: record.created_at, completedAt: record.completed_at, modelId: record.model, modelName: record.model_name,
    keyId: record.api_key_id ?? "", keyName: record.api_key_name ?? "Dashboard", outcome: record.outcome,
    durationMs: completed !== null && Number.isFinite(completed) ? Math.max(0, completed) : null,
    inputTokens: record.input_tokens, outputTokens: record.output_tokens, cachedInputTokens: null,
    imageCount: record.capability === "image" ? record.units : null, billing,
    error: record.error ? { code: record.error, message: record.error.replaceAll("_", " ") } : null,
  };
}

export function toApiKey(key: ApiKeyDto): ApiKey {
  return {
    id: key.id, name: key.name, maskedIdentifier: key.prefix, status: key.revoked_at ? "revoked" : "active",
    createdAt: key.created_at, lastUsed: key.last_used_at ? { status: "used", at: key.last_used_at } : { status: "never" },
    revokedAt: key.revoked_at,
  };
}
