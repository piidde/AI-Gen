import type { DemoSnapshot, Evidence } from "./viewModels";

const demoEvidence: Evidence = {
  status: "unverified",
  reason: "Fictional fixture, not a supported model, published rate or purchase offer.",
};

// Explicit sample values, never parsed from the legacy formatted fixtures.
// No network, browser storage, auth session or real credential belongs here.
export const demoSnapshot: DemoSnapshot = {
  families: [{
    id: "demo-text-family", name: "Example text family", provider: "Example provider",
    modality: "text", description: "Fictional text integration example.",
    variants: [{
      id: "demo-text-v1", name: "Example text variant", availability: "unknown",
      evidence: demoEvidence, capabilities: [], limitations: ["Not a callable model."],
      rates: [{
        id: "demo-input", version: "demo-rate-v1", component: "input",
        per: 1_000_000, unit: "tokens", conditions: [], credits: null,
        standardUsd: null, officialUsd: null, evidence: demoEvidence,
        officialEvidence: { status: "unavailable", reason: "No comparable verified rate." },
      }],
    }],
  }],
  wallet: { availableCredits: "842", asOf: "2026-09-20T12:00:00Z", expires: false },
  packages: [{
    id: "demo-package", usd: "5.00", baseCredits: "1000", bonusCredits: "0",
    totalCredits: "1000", evidence: demoEvidence,
  }],
  orders: [{
    id: "demo-order", packageId: "demo-package", createdAt: "2026-09-19T10:00:00Z",
    updatedAt: "2026-09-19T10:01:00Z", usd: "5.00", credits: "1000",
    payment: "unknown", fulfillment: "unknown", refund: "unknown",
    receipt: { status: "unavailable", reason: "No real purchase or document." },
    invoice: { status: "unavailable", reason: "No real purchase or document." },
  }],
  requests: [{
    id: "demo-request-completed", startedAt: "2026-09-20T11:00:00Z",
    completedAt: "2026-09-20T11:00:02Z", modelId: "demo-text-v1",
    modelName: "Example text variant", keyId: "demo-key", keyName: "Example integration",
    outcome: "completed", durationMs: 2000, inputTokens: 100, outputTokens: 50,
    cachedInputTokens: 0, imageCount: null,
    billing: { status: "charged", credits: "8", rateVersion: "demo-rate-v1" },
    error: null,
  }, {
    id: "demo-request-uncertain", startedAt: "2026-09-20T11:30:00Z",
    completedAt: null, modelId: "demo-text-v1", modelName: "Example text variant",
    keyId: "demo-key", keyName: "Example integration", outcome: "unknown",
    durationMs: null, inputTokens: null, outputTokens: null, cachedInputTokens: null,
    imageCount: null, billing: { status: "unknown", reason: "Awaiting reconciliation." },
    error: { code: "outcome_unknown", message: "The request outcome has not been confirmed." },
  }],
  keys: [{
    id: "demo-key", name: "Example integration", maskedIdentifier: "DEMO-ONLY-…0001",
    status: "active", createdAt: "2026-09-19T09:00:00Z",
    lastUsed: { status: "used", at: "2026-09-20T11:30:00Z" }, revokedAt: null,
  }],
  profile: {
    id: "demo-account", displayName: "Sample account", email: "builder@example.com",
    billing: {
      kind: null, name: null, company: null, addressLine1: null, addressLine2: null,
      city: null, postalCode: null, region: null, countryCode: null, vatId: null,
    },
  },
  preferences: {
    displayCurrency: "USD", productUpdates: false, creditAlert: { enabled: false },
  },
  service: {
    availability: "unknown", asOf: null, source: "demo", incidents: [],
  },
  announcements: [{
    id: "demo-announcement", slug: "example-integration", title: "Sample integration guide",
    summary: "Fictional announcement for previewing the layout.",
    publishedAt: "2026-09-19T09:00:00Z", category: "guide",
    link: { label: "Documentation", href: "/docs" },
  }],
  overview: {
    period: { start: "2026-09-14T00:00:00Z", endExclusive: "2026-09-21T00:00:00Z" },
    asOf: "2026-09-20T12:00:00Z", requests: 2, completed: 1, failed: 0,
    pending: 0, unknown: 1, creditsUsed: "8",
    daily: [{
      start: "2026-09-20T00:00:00Z", endExclusive: "2026-09-21T00:00:00Z",
      requests: 2, creditsUsed: "8",
    }],
    recentRequestIds: ["demo-request-uncertain", "demo-request-completed"],
    savings: { status: "unavailable", reason: "Historical comparison rules and rates are unverified." },
  },
};
