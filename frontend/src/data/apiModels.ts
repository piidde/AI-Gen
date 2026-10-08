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

// "$1,234.50" with at least cents and every significant sub-cent digit.
export function formatUsd(micros: Micros): string {
  const [whole = "0", fraction = ""] = microsToDecimal(micros).replace(/^-/, "").split(".");
  const sign = micros.startsWith("-") ? "-" : "";
  return `${sign}$${BigInt(whole).toLocaleString("en-US")}.${fraction.padEnd(2, "0")}`;
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
