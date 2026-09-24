import { catalogue, type CatalogueReference } from "./catalogue.ts";

// Editorial pages describe official model families, not verified Takewing support.
export const familyPages = [
  {
    family: "GPT Image 2", slug: "gpt-image-2", modality: "image",
    description: "Compare GPT Image 2 reference variants, request rates and the settings that still need verification.",
    explanation: "OpenAI documents GPT Image 2 for creating and editing images from text and image inputs. For a visual workflow, check the required output size and input-image behavior before choosing a variant.",
    limitation: "The VIP label does not establish a different official model or better quality. Listed request tariffs cannot be compared with an official output-only image price without matching every billable input and output.",
    source: "https://developers.openai.com/api/docs/models/gpt-image-2",
  },
  {
    family: "Nano Banana Pro", slug: "nano-banana-pro", modality: "image",
    description: "Explore Nano Banana Pro reference variants, listed resolutions and unresolved version differences.",
    explanation: "Google describes Nano Banana Pro as its Gemini 3 Pro Image family for detailed visual work, including brand consistency and precise creative control. Those official capabilities are a starting point for evaluation, not evidence that each listed channel exposes them.",
    limitation: "The served preview or stable version remains unverified. Compare the listed resolutions, but do not infer speed, reliability or policy-refund behavior from CL or VIP names.",
    source: "https://ai.google.dev/gemini-api/docs/image-generation",
  },
  {
    family: "GPT-5.6", slug: "gpt-5-6", modality: "text",
    description: "Inspect GPT-5.6 text reference rates, input and output units, cache pricing and context conditions.",
    explanation: "Terra and Sol have separate identifiers and separately priced input, output and cache-read components. Compare the components your text workflow uses instead of treating a token rate as a flat request price.",
    limitation: "Official context tiers are shown separately. The catalogue does not verify matching token accounting, tools or streaming through Takewing, and a lower component rate alone cannot establish a total saving.",
    source: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  },
  {
    family: "Gemini Flash", slug: "gemini-flash", modality: "text",
    description: "Compare Gemini Flash text reference variants with explicit output, thinking and unknown cache-rate boundaries.",
    explanation: "Gemini Flash spans several named versions. For text workflows, compare a specific version's input and output components and account for thinking tokens where the official rate includes them.",
    limitation: "An unversioned or preview alias is not interchangeable with a verified identifier. Cache tariffs are unknown in this reference inventory, so cached traffic cannot be priced as free or used to claim a saving.",
    source: "https://ai.google.dev/gemini-api/docs/models",
  },
] as const;

export function findFamilyPage(slug: string | undefined) {
  return familyPages.find(page => page.slug === slug);
}

export function activeModels(models: CatalogueReference[] = catalogue) {
  return models.filter(model => model.availability !== "retired");
}

export function groupFamilies(models: CatalogueReference[]) {
  return [...new Set(models.map(model => model.family))].map(family => ({
    family, variants: models.filter(model => model.family === family),
    page: familyPages.find(page => page.family === family),
  }));
}

export function availabilityLabel(model: Pick<CatalogueReference, "availability">) {
  switch (model.availability) {
    case "retired": return "Retired";
    case "unavailable-notice": return "Temporarily unavailable · dated notice";
    case "unknown": return "Availability not verified";
  }
}
