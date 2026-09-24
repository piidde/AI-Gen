// Frontend view records, not API DTOs or database schemas. Live adapters must
// validate and translate server responses before constructing these records.
// Decimal strings have no currency symbols/grouping; never use parseFloat for
// accounting. The server's credit denomination remains undecided.
export type Decimal = string;
// ISO 8601 instant with an explicit offset (fixtures use UTC Z), not a local date.
export type Instant = string;

export type Evidence =
  | { status: "verified"; sources: string[]; checkedAt: Instant }
  | { status: "unverified" | "unavailable"; reason: string };

export type Availability = "available" | "degraded" | "unavailable" | "retired" | "unknown";

export type ModelFamily = {
  id: string;
  name: string;
  provider: string;
  modality: "text" | "image";
  description: string;
  variants: ModelVariant[];
};

export type ModelVariant = {
  id: string;
  name: string;
  availability: Availability;
  // Missing evidence is not a claim of a supported capability or exact API ID.
  evidence: Evidence;
  capabilities: string[];
  limitations: string[];
  rates: ModelRate[];
};

export type ModelRate = {
  id: string;
  version: string;
  component: "input" | "output" | "cached-input" | "image";
  per: number;
  unit: "tokens" | "images";
  // Resolution/quality or other conditions needed for like-for-like comparison.
  conditions: string[];
  credits: Decimal | null;
  standardUsd: Decimal | null;
  officialUsd: Decimal | null;
  evidence: Evidence;
  officialEvidence: Evidence;
};

export type Wallet = {
  availableCredits: Decimal | null;
  asOf: Instant | null;
  expires: false;
};

export type CreditPackage = {
  id: string;
  usd: Decimal;
  baseCredits: Decimal;
  bonusCredits: Decimal;
  totalCredits: Decimal;
  evidence: Evidence;
};

export type BillingDocument =
  | { status: "available"; id: string }
  | { status: "pending" | "unavailable"; reason: string };

export type Order = {
  id: string;
  packageId: string;
  createdAt: Instant;
  updatedAt: Instant;
  usd: Decimal;
  credits: Decimal;
  payment: "pending" | "paid" | "failed" | "cancelled" | "refunded" | "unknown";
  fulfillment: "pending" | "credited" | "unfulfilled" | "unknown";
  refund: "not-required" | "pending" | "refunded" | "unknown";
  receipt: BillingDocument;
  invoice: BillingDocument;
};

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

export type AccountProfile = {
  id: string;
  displayName: string;
  email: string;
  billing: BillingProfile;
};

export type Preferences = {
  displayCurrency: "USD" | "EUR";
  productUpdates: boolean;
  creditAlert: { enabled: false } | { enabled: true; thresholdCredits: Decimal };
};

export type Incident = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  modelIds: string[];
  startedAt: Instant;
  resolvedAt: Instant | null;
  updates: { id: string; at: Instant; message: string }[];
};

export type ServiceStatus = {
  availability: Availability;
  asOf: Instant | null;
  source: "demo" | "connected" | "unavailable";
  incidents: Incident[];
};

export type Announcement = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: Instant;
  category: "model" | "pricing" | "service" | "guide";
  link: { label: string; href: string } | null;
};

export type Overview = {
  period: { start: Instant; endExclusive: Instant };
  asOf: Instant;
  requests: number;
  completed: number;
  failed: number;
  pending: number;
  unknown: number;
  creditsUsed: Decimal | null;
  daily: { start: Instant; endExclusive: Instant; requests: number; creditsUsed: Decimal | null }[];
  recentRequestIds: string[];
  savings:
    | { status: "unavailable"; reason: string }
    | {
        status: "available";
        usd: Decimal;
        asOf: Instant;
        comparedRequests: number;
        excludedRequests: number;
        basis: string;
      };
};

export type DemoSnapshot = {
  families: ModelFamily[];
  wallet: Wallet;
  packages: CreditPackage[];
  orders: Order[];
  requests: UsageRequest[];
  keys: ApiKey[];
  profile: AccountProfile;
  preferences: Preferences;
  service: ServiceStatus;
  announcements: Announcement[];
  overview: Overview;
};
