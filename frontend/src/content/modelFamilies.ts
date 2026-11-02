import { catalogue, type CatalogueReference } from "./catalogue.ts";

// Editorial copy for the model family pages. Capabilities follow the official docs.
export const familyPages = [
  {
    family: "GPT Image 2", slug: "gpt-image-2", modality: "image",
    description: "GPT Image 2 API pricing per request, with the standard and VIP variants side by side and the official OpenAI price for comparison.",
    explanation: "GPT Image 2 is OpenAI's model for creating and editing images from text and image input. Pick a variant by the resolution you need, then call it through the image jobs endpoint.",
    limitation: "VIP runs on a separate channel from our provider. It is not a different official model and is not guaranteed to produce better images. We charge per request, while OpenAI charges per output image, so compare at the same resolution.",
    source: "https://developers.openai.com/api/docs/models/gpt-image-2",
  },
  {
    family: "Nano Banana Pro", slug: "nano-banana-pro", modality: "image",
    description: "Nano Banana Pro API pricing per request at 1K, 2K and 4K, with the CL and VIP channels and the official Google price for comparison.",
    explanation: "Nano Banana Pro is Google's Gemini 3 Pro Image model. It is built for detailed images, readable text inside images and consistent brand visuals.",
    limitation: "Google runs this model as preview and stable versions, and our provider does not say which one answers a request. CL and VIP are separate channels with their own prices. They are not guaranteed to be faster.",
    source: "https://ai.google.dev/gemini-api/docs/image-generation",
  },
  {
    family: "GPT-5.6", slug: "gpt-5-6", modality: "text",
    description: "GPT-5.6 API pricing per 1M tokens for Terra and Sol: input, output and cached input next to the official OpenAI prices.",
    explanation: "Terra and Sol are two GPT-5.6 models with their own IDs and prices. Both support tool calling through the Responses API and work with Codex.",
    limitation: "OpenAI charges more once a request goes above 272K input tokens. The model details list both official tiers. Token counts come from our provider and can differ slightly from the official API.",
    source: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  },
  {
    family: "Gemini Flash", slug: "gemini-flash", modality: "text",
    description: "Gemini Flash API pricing per 1M tokens for each version, with input and output prices next to the official Google rates.",
    explanation: "Gemini Flash is Google's fast, low-cost text model line. Every version has its own ID and price, so pick the exact version you want to call.",
    limitation: "Some names from our provider have no exact match in Google's model list, and those show no official price. Google bills thinking tokens as output, and our comparison includes them. Our provider lists no cache price for these models, so none is shown.",
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
    case "unavailable-notice": return "Temporarily unavailable";
    case "unknown": return "Available at last price check";
  }
}
