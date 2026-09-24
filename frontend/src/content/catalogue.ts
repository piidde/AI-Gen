// Dated reference content only. No row authorizes an offer or exposes a public API ID.
// Source details, exclusions and owner review: docs/MODEL_PRICING.md.
export type ReviewStatus = { status: "verified" | "unavailable" | "awaiting-evidence"; reason: string };
export type OfficialRate = {
  usd: string;
  unit: "tokens" | "requests";
  per: string;
  conditions: string;
  source: string;
  // A review deadline, not an automatic replacement price.
  recheckOn: string | null;
};
export type ReferenceRate = {
  component: "input" | "output" | "cached-input" | "image-request";
  credits: string | null;
  unit: "tokens" | "requests";
  per: string;
  conditions: string;
  official: OfficialRate[];
  comparison: ReviewStatus;
};
export type CatalogueReference = {
  upstreamId: string;
  publicApiId: null;
  family: string;
  provider: "OpenAI" | "Google";
  modality: "image" | "text";
  listedResolutions: string[];
  identity: ReviewStatus;
  support: ReviewStatus;
  availability: "unknown" | "unavailable-notice" | "retired";
  gaps: string[];
  limitations: string[];
  rates: ReferenceRate[];
};

export const snapshot = {
  version: "grsai-reference-2026-09-20",
  checkedOn: "2026-09-20",
  creditsPerUsd: "66600",
  rateSource: "https://grsai.com/dashboard/models",
  packageSource: "https://eb.grsaiapi.com/client/goods/getGoodsList",
  publication: "reference-only-owner-approved",
} as const;

const support: ReviewStatus = { status: "awaiting-evidence", reason: "B01/B02: Takewing support, public API ID and production price not approved." };
const textLimitations = ["Upstream context limits, token accounting, tools, vision and streaming require integration evidence."];

type ImageRow = [id: string, family: string, provider: "OpenAI" | "Google", resolutions: string[], credits: string, gaps: string[]];
const images: ImageRow[] = [
  ["gpt-image-2.5", "GPT Image 2.5", "OpenAI", ["1K"], "600", ["A1"]],
  ["gpt-image-2.5-sunburst", "GPT Image 2.5", "OpenAI", ["1K", "2K", "4K"], "2400", ["A2"]],
  ["gpt-image-2.5-flare", "GPT Image 2.5", "OpenAI", ["1K", "2K", "4K"], "2000", ["A2", "A3"]],
  ["gpt-image-2-vip", "GPT Image 2", "OpenAI", ["1K", "2K", "4K"], "2000", ["A4"]],
  ["gpt-image-2", "GPT Image 2", "OpenAI", ["1K"], "600", []],
  ["nano-banana-pro", "Nano Banana Pro", "Google", ["1K", "2K", "4K"], "1800", ["A5"]],
  ["nano-banana-2-lite", "Nano Banana 2 Lite", "Google", ["1K"], "440", []],
  ["nano-banana-2", "Nano Banana 2", "Google", ["1K", "2K", "4K"], "1200", ["A5"]],
  ["nano-banana-fast", "Nano Banana 2 Lite", "Google", ["1K"], "440", []],
  ["nano-banana-2-cl", "Nano Banana 2", "Google", ["1K"], "6000", ["A5", "A7"]],
  ["nano-banana-pro-cl", "Nano Banana Pro", "Google", ["1K"], "10000", ["A5", "A7"]],
  ["nano-banana-2-2k-cl", "Nano Banana 2", "Google", ["2K"], "9000", ["A5", "A7"]],
  ["nano-banana-pro-4k-vip", "Nano Banana Pro", "Google", ["4K"], "18000", ["A5", "A7"]],
  ["nano-banana-pro-vip", "Nano Banana Pro", "Google", ["1K", "2K"], "10000", ["A5", "A7"]],
  ["nano-banana-2-4k-cl", "Nano Banana 2", "Google", ["4K"], "13000", ["A5", "A7"]],
];

type TextRow = [id: string, family: string, input: string, output: string, cache: string | null, official: [string, string, string] | null, threshold: string | null];
const texts: TextRow[] = [
  ["gpt-6-astra", "GPT-6", "80000", "400000", "8000", ["10", "50", "1"], "272000"],
  ["gpt-5.6-terra", "GPT-5.6", "18000", "104000", "1800", ["2", "12", "0.20"], "272000"],
  ["gpt-5.6-sol", "GPT-5.6", "44000", "260000", "4500", ["4", "20", "0.40"], "272000"],
  ["gpt-5.5", "GPT-5.5", "44000", "270000", "4500", ["5", "30", "0.50"], "272000"],
  ["gemini-3.5-flash", "Gemini Flash", "24000", "200000", null, ["1.50", "9", "0.15"], null],
  ["gemini-3.1-flash-lite", "Gemini Flash-Lite", "5000", "30000", null, ["0.25", "1.50", "0.025"], null],
  ["gemini-3.5-flash-lite", "Gemini Flash-Lite", "6000", "50000", null, ["0.30", "2.50", "0.03"], null],
  ["gemini-3.7-flash", "Gemini Flash", "12000", "70000", null, ["0.75", "3.75", "0.075"], null],
  ["gemini-3.8-flash", "Gemini Flash", "12000", "70000", null, ["0.75", "3.75", "0.075"], null],
  ["gemini-3.1-pro", "Gemini Pro", "30000", "140000", null, null, null],
  ["gemini-3-flash", "Gemini Flash", "8000", "60000", null, null, null],
  ["gemini-3-pro", "Gemini Pro", "30000", "140000", null, null, null],
  ["gemini-2.5-flash", "Gemini Flash", "6000", "40000", null, ["0.30", "2.50", "0.03"], null],
  ["gemini-2.5-pro", "Gemini Pro", "25000", "125000", null, ["1.25", "10", "0.125"], "200000"],
];

const longContext: Record<string, [string, string, string | null]> = {
  "gpt-6-astra": ["20", "75", "2"],
  "gpt-5.6-terra": ["4", "18", "0.40"],
  "gpt-5.6-sol": ["8", "30", "0.80"],
  "gpt-5.5": ["10", "45", null],
  "gemini-2.5-pro": ["2.50", "15", "0.25"],
};

export const catalogue: CatalogueReference[] = [
  ...images.map(([upstreamId, family, provider, listedResolutions, credits, gaps]): CatalogueReference => ({
    upstreamId, publicApiId: null, family, provider, modality: "image", listedResolutions, gaps, support,
    identity: ["nano-banana-fast", "nano-banana-2-lite", "gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(upstreamId)
      ? { status: "verified", reason: "Official identifier documented; intermediary routing unverified." }
      : { status: "awaiting-evidence", reason: `Alias/channel mapping: ${gaps.join(", ")}.` },
    availability: gaps.includes("A2") ? "unavailable-notice" : "unknown",
    limitations: ["Listed resolutions only; per request is not per image. Quality, input costs, output counts and routing require evidence.", "No verified speed or stability comparison."],
    rates: [{ component: "image-request", credits, unit: "requests", per: "1", conditions: "Listed flat request tariff; accepted settings unverified", official: [],
      comparison: { status: "unavailable", reason: "No equivalent official total per request; token/output-only prices cannot substitute." } }],
  })),
  ...texts.map(([upstreamId, family, input, output, cache, official, threshold]): CatalogueReference => {
    const provider = upstreamId.startsWith("gpt-") ? "OpenAI" : "Google";
    const source = provider === "OpenAI" ? `https://developers.openai.com/api/docs/models/${upstreamId}` : "https://ai.google.dev/gemini-api/docs/pricing";
    // All sources must be revalidated before publication; this is only the known promotional deadline.
    const recheckOn = upstreamId === "gpt-5.6-sol" ? "2026-11-21"
      : ["gemini-3.7-flash", "gemini-3.8-flash"].includes(upstreamId) ? "2027-01-01" : null;
    return {
      upstreamId, publicApiId: null, family, provider, modality: "text", listedResolutions: [], support,
      identity: official ? { status: "verified", reason: "Exact official ID documented; intermediary served version unverified." }
        : { status: "awaiting-evidence", reason: "A8: preview alias/version or retirement unresolved." },
      availability: "unknown", gaps: official ? [] : ["A8"], limitations: textLimitations,
      rates: (["input", "output", "cached-input"] as const).map((component, index): ReferenceRate => {
        const references: OfficialRate[] = [];
        const usd = official?.[index];
        const conditions = `Paid Standard text; ${threshold ? `input <=${threshold} tokens` : "ordinary context"}; ${component === "cached-input" ? "cache read only, excludes storage/writes" : component === "output" && provider === "Google" ? "includes thinking" : component}`;
        if (usd !== undefined) references.push({ usd, unit: "tokens", per: "1000000", conditions, source, recheckOn });
        const long = longContext[upstreamId]?.[index];
        if (long != null) references.push({ usd: long, unit: "tokens", per: "1000000", conditions: conditions.replace(`<=${threshold}`, `>${threshold}`), source, recheckOn });
        const credits = [input, output, cache][index]!;
        return { component, credits, unit: "tokens", per: "1000000", conditions: "Directory tariff; upstream context/accounting equivalence unverified", official: references,
          comparison: { status: official && credits !== null ? "awaiting-evidence" : "unavailable",
            reason: !official ? "A8: official model mapping unresolved." : credits === null ? "Upstream cache tariff unknown, not zero." : "Confirm upstream context, token buckets and equivalent Standard settings before comparison." } };
      }),
    };
  }),
];

// Exact reference values, not checkout products. No upstream purchase identifiers.
export const packages = [
  { usd: "5", baseCredits: "333000", bonusCredits: "0", totalCredits: "333000" },
  { usd: "10", baseCredits: "666000", bonusCredits: "66600", totalCredits: "732600" },
  { usd: "30", baseCredits: "1998000", bonusCredits: "599400", totalCredits: "2597400" },
  { usd: "60", baseCredits: "3996000", bonusCredits: "1998000", totalCredits: "5994000" },
  { usd: "100", baseCredits: "6660000", bonusCredits: "4662000", totalCredits: "11322000" },
  { usd: "150", baseCredits: "9990000", bonusCredits: "9990000", totalCredits: "19980000" },
  { usd: "1000", baseCredits: "66600000", bonusCredits: "66600000", totalCredits: "133200000" },
] as const;
