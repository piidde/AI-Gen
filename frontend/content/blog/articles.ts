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
    title: "How AI text API pricing works: input, output and cached tokens",
    summary: "What input, output and cached-input prices mean, how to estimate the monthly cost of a text workload, and how to compare our prices with the official ones.",
    topic: "Text models",
    author: "Chris",
    publishedOn: "2026-09-20",
    updatedOn: "2026-10-27",
    draft: true,
    reviewStatus: "draft",
    publicationOwner: null,
    hero: { illustration: "token-rate-components", alt: "Diagram showing input, output and cache-read token rate components flowing into one workload estimate" },
    related: ["understanding-image-model-rates"],
    sections: [
      {
        id: "three-components",
        heading: "Three prices per model",
        blocks: [
          { type: "paragraph", text: "Text models are billed per token, and most price lists show three numbers per model: input, output and cached input. Each one is quoted per 1 million tokens. Your bill is the sum of all three, so a model with cheap input can still cost more if your app produces long answers." },
          { type: "table", caption: "What each price covers", columns: ["Price", "What it covers", "Common mistake"], rows: [
            ["Input", "Everything you send: system prompt, chat history, documents", "Forgetting that chat history is sent again with every message"],
            ["Output", "Every token the model writes, including reasoning tokens on models that think", "Estimating from short test answers"],
            ["Cached input", "Repeated input the provider reads from its cache, usually much cheaper", "Assuming all input gets cached"],
          ] },
        ],
      },
      {
        id: "dated-reference",
        heading: "Example: GPT-5.6 Terra",
        blocks: [
          { type: "paragraph", text: "The card below shows our price for GPT-5.6 Terra next to the official OpenAI price. Prices change, so every card shows the date they were last checked." },
          { type: "catalogue", modelIds: ["gpt-5.6-terra"], introduction: "Our price and the official OpenAI price per 1M tokens." },
          { type: "callout", title: "Compare the total, not one number", text: "A lower input price alone does not make a request cheaper. Multiply each price by your own token volumes and add the results." },
        ],
      },
      {
        id: "estimate-checklist",
        heading: "Estimate your monthly cost",
        blocks: [
          { type: "paragraph", text: "Take a week of real traffic, or a realistic test run, and note how many tokens go in and come out. Multiply each volume by its price per 1M tokens and add the results. If you don't know a number yet, leave it blank instead of writing zero." },
          { type: "code", label: "Copy estimate template", code: "Period:\nInput tokens:\nOutput tokens:\nCached input tokens:\nModel ID:\nPrice date:\nEstimated cost (input + output + cached):" },
          { type: "sources", links: [
            { label: "GPT-5.6 prices", href: "/models/gpt-5-6" },
            { label: "All models and prices", href: "/models" },
            { label: "API documentation", href: "/docs" },
          ] },
        ],
      },
    ],
  },
  {
    slug: "understanding-image-model-rates",
    title: "How AI image API pricing works: per request vs per image",
    summary: "Why image APIs charge per request or per image, which settings change the price, and how to compare our request prices with official per-image prices.",
    topic: "Image models",
    author: "Jessica",
    publishedOn: "2026-09-20",
    updatedOn: "2026-10-27",
    draft: true,
    reviewStatus: "draft",
    publicationOwner: null,
    hero: { illustration: "image-request-rate", alt: "Diagram separating an image request rate from resolution, settings and output count" },
    related: ["understanding-text-token-rates"],
    sections: [
      {
        id: "request-not-image",
        heading: "Per request or per image",
        blocks: [
          { type: "paragraph", text: "Our image models have one flat price per request. Official APIs usually price each output image, and some add charges for input images or prompt tokens. Before you compare two prices, check that both describe the same resolution, quality and number of images." },
          { type: "table", caption: "What to check before comparing", columns: ["Check", "Why it matters"], rows: [
            ["Billing unit", "A request price and an image price only match if the request returns one image"],
            ["Resolution", "A 4K image costs more than a 1K image on almost every platform"],
            ["Quality setting", "Official High quality prices are much higher than Low"],
            ["Input images", "Editing an existing image can add input costs on official APIs"],
          ] },
        ],
      },
      {
        id: "catalogue-evidence",
        heading: "Example: GPT Image 2",
        blocks: [
          { type: "paragraph", text: "The card below shows our request price for GPT Image 2 and when it was last checked. The GPT Image 2 model page compares it with the official OpenAI price per image." },
          { type: "catalogue", modelIds: ["gpt-image-2"], introduction: "Our price per request for GPT Image 2." },
          { type: "callout", title: "Check availability before you depend on a model", text: "Our provider sometimes closes a model for maintenance. The status page lists closed models and open incidents." },
        ],
      },
      {
        id: "workflow-checklist",
        heading: "Estimate an image workflow",
        blocks: [
          { type: "paragraph", text: "Decide which model and resolution you need, how many images you generate per month, and whether you edit existing images. Multiply your monthly requests by our price, then compare with the official price at the same settings." },
          { type: "code", label: "Copy estimate template", code: "Model ID:\nResolution:\nQuality:\nRequests per month:\nInput images per request:\nPrice date:\nEstimated cost (requests x price):" },
          { type: "sources", links: [
            { label: "GPT Image 2 prices", href: "/models/gpt-image-2" },
            { label: "Official GPT Image 2 documentation", href: "https://developers.openai.com/api/docs/models/gpt-image-2" },
            { label: "All models and prices", href: "/models" },
            { label: "Service status", href: "/status" },
            { label: "API documentation", href: "/docs" },
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
