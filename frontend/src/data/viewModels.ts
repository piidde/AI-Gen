// Frontend view records built from validated API responses (see data/api.ts).
// Decimal strings have no currency symbols/grouping; never use parseFloat for
// accounting. Amounts in usage records are USD-value credits.
export type Decimal = string;
// ISO 8601 instant with an explicit offset, not a local date.
export type Instant = string;

export type RequestBilling =
  | { status: "pending" | "unknown"; reason: string }
  | { status: "not-charged"; reason: string }
  | { status: "charged"; credits: Decimal; rateVersion: string }
  | { status: "refunded"; chargedCredits: Decimal; refundedCredits: Decimal; rateVersion: string };

export type UsageRequest = {
  id: string;
  startedAt: Instant;
  completedAt: Instant | null;
  // Retain historical names even after a model or key has been retired.
  modelId: string;
  modelName: string;
  keyId: string;
  keyName: string;
  outcome: "pending" | "completed" | "failed" | "unknown";
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  imageCount: number | null;
  billing: RequestBilling;
  // Sanitized customer-safe metadata only; no prompts, outputs or upstream payloads.
  error: { code: string; message: string } | null;
};

export type ApiKey = {
  id: string;
  name: string;
  maskedIdentifier: string;
  status: "active" | "revoked";
  createdAt: Instant;
  lastUsed: { status: "used"; at: Instant } | { status: "never" | "unknown" };
  revokedAt: Instant | null;
  // A creation result's show-once secret must never enter list/view records.
};

export type BillingProfile = {
  kind: "personal" | "business" | null;
  name: string | null;
  company: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  countryCode: string | null;
  vatId: string | null;
};
