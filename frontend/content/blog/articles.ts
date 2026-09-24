export type BlogTopic = "Image models" | "Text models";
export type BlogIllustration = "image-request-rate" | "token-rate-components";

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "callout"; title: string; text: string }
  | { type: "image"; illustration: BlogIllustration; alt: string; caption: string }
  | { type: "table"; caption: string; columns: string[]; rows: string[][] }
  | { type: "catalogue"; modelIds: string[]; introduction: string }
  | { type: "code"; label: string; code: string }
  | { type: "sources"; links: { label: string; href: string }[] };

export type BlogSection = {
  id: string;
  heading: string;
  blocks: BlogBlock[];
};

export type BlogArticleRecord = {
  slug: string;
  title: string;
  summary: string;
  topic: BlogTopic;
  reviewer?: string;
  author?: string;
  publishedOn: string;
  updatedOn: string;
  draft: boolean;
  reviewStatus: "technically-reviewed" | "draft";
  publicationOwner: string | null;
  hero: { illustration: BlogIllustration; alt: string };
  sections: BlogSection[];
  related: string[];
};

export const articleRecords: BlogArticleRecord[] = [
  {
    slug: "understanding-text-token-rates",
    title: "Understanding text token rates",
    summary: "A practical guide to reading separate input, output and cache-read rates without turning a component price into an unsupported total-cost claim.",
    topic: "Text models",
    reviewer: "Codex",
    publishedOn: "2026-09-20",
    updatedOn: "2026-09-20",
    draft: false,
    reviewStatus: "technically-reviewed",
    publicationOwner: null,
    hero: { illustration: "token-rate-components", alt: "Diagram showing input, output and cache-read token rate components flowing into one workload estimate" },
    related: ["understanding-image-model-rates"],
    sections: [
      {
        id: "three-components",
        heading: "Three components, one workload",
        blocks: [
          { type: "paragraph", text: "Text references can list input, output and cache-read tariffs separately. A useful estimate starts with the amount of each component in your own workload. A single component rate is not the total request cost." },
          { type: "table", caption: "What each listed component describes", columns: ["Component", "Use in an estimate", "Do not assume"], rows: [
            ["Input", "Tokens supplied to the model", "That output is included"],
            ["Output", "Tokens produced by the model", "That every request produces the same amount"],
            ["Cache read", "Eligible tokens read from a cache", "That storage, writes or uncached input are free"],
          ] },
        ],
      },
      {
        id: "dated-reference",
        heading: "Read the dated reference before comparing",
        blocks: [
          { type: "paragraph", text: "The catalogue below is a dated reference snapshot. Its public API identifiers, served versions, token accounting and production availability still require integration evidence. The displayed rates are useful for understanding units; they do not establish an executable offer." },
          { type: "catalogue", modelIds: ["gpt-5.6-terra"], introduction: "One reviewed text reference illustrates the separate components and the conditions attached to each row." },
          { type: "callout", title: "Why no savings headline appears here", text: "A lower-looking component rate does not prove a lower total. Model identity, settings, context tier, accounting and freshness must match before an equivalent comparison is valid." },
        ],
      },
      {
        id: "estimate-checklist",
        heading: "Build a reviewable estimate",
        blocks: [
          { type: "paragraph", text: "Record your expected input, output and eligible cache-read volumes. Match every volume to its unit and conditions, retain the snapshot date, and mark unknown components as unknown rather than zero." },
          { type: "code", label: "Copy checklist", code: "Workload period:\nExpected input tokens:\nExpected output tokens:\nEligible cache-read tokens:\nModel reference and context tier:\nCatalogue snapshot date:\nUnknown or unverified components:" },
          { type: "sources", links: [
            { label: "GPT-5.6 family reference", href: "/models/gpt-5-6" },
            { label: "Dated model catalogue", href: "/models" },
            { label: "Documentation status", href: "/docs" },
          ] },
        ],
      },
    ],
  },
  {
    slug: "understanding-image-model-rates",
    title: "Understanding image model request rates",
    summary: "A guide to reading per-request image references while keeping resolution, output count, quality settings and availability gaps visible.",
    topic: "Image models",
    reviewer: "Codex",
    publishedOn: "2026-09-20",
    updatedOn: "2026-09-20",
    draft: false,
    reviewStatus: "technically-reviewed",
    publicationOwner: null,
    hero: { illustration: "image-request-rate", alt: "Diagram separating an image request rate from resolution, settings and output count" },
    related: ["understanding-text-token-rates"],
    sections: [
      {
        id: "request-not-image",
        heading: "Per request is not automatically per image",
        blocks: [
          { type: "paragraph", text: "A request tariff describes its stated billing unit. It does not by itself establish the number of outputs, accepted resolution, quality setting or any billable input. Keep those questions beside the rate when evaluating an image workflow." },
          { type: "table", caption: "Evidence to retain with an image request rate", columns: ["Evidence", "Why it matters"], rows: [
            ["Billing unit", "Distinguishes one request from one output image"],
            ["Resolution and settings", "Prevents comparison across unlike configurations"],
            ["Output count", "Prevents a multi-output request from looking like a single-image price"],
            ["Availability date", "Keeps a dated notice separate from live service health"],
          ] },
        ],
      },
      {
        id: "catalogue-evidence",
        heading: "Use the catalogue as a reference boundary",
        blocks: [
          { type: "paragraph", text: "The reviewed inventory records listed request tariffs and known gaps. It does not verify production support, a public API identifier, speed, stability or equivalent official total cost." },
          { type: "catalogue", modelIds: ["gpt-image-2"], introduction: "This image reference has a verified underlying identifier while intermediary routing and production support remain unverified." },
          { type: "callout", title: "Availability is separate evidence", text: "A catalogue row or dated notice is not live monitoring. Check the service-status boundary independently before relying on a model in production." },
        ],
      },
      {
        id: "workflow-checklist",
        heading: "Review an image workflow",
        blocks: [
          { type: "paragraph", text: "Choose the exact model reference and requested settings, record expected outputs per request, then list every unresolved input or routing cost. Compare only configurations with matching units and evidence." },
          { type: "code", label: "Copy checklist", code: "Model reference:\nRequested resolution:\nQuality or other settings:\nExpected outputs per request:\nOther billable inputs:\nCatalogue snapshot date:\nAvailability evidence:\nUnknown or unverified components:" },
          { type: "sources", links: [
            { label: "GPT Image 2 family reference", href: "/models/gpt-image-2" },
            { label: "Official GPT Image 2 model reference", href: "https://developers.openai.com/api/docs/models/gpt-image-2" },
            { label: "Dated model catalogue", href: "/models" },
            { label: "Service status boundary", href: "/status" },
            { label: "Documentation status", href: "/docs" },
          ] },
        ],
      },
    ],
  },
  {
    slug: "editorial-format-preview",
    title: "Editorial format preview",
    summary: "A draft used to verify that unpublished repository content stays outside public routes and indexes.",
    topic: "Text models",
    author: "Frontend team",
    publishedOn: "2026-09-21",
    updatedOn: "2026-09-21",
    draft: true,
    reviewStatus: "draft",
    publicationOwner: null,
    hero: { illustration: "token-rate-components", alt: "Draft editorial format diagram" },
    related: [],
    sections: [{ id: "draft", heading: "Draft", blocks: [{ type: "paragraph", text: "This draft must never render on a public article route." }] }],
  },
];
