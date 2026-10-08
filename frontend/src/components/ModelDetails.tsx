import { snapshot, type CatalogueReference } from "../content/catalogue";
import { availabilityLabel } from "../content/modelFamilies";
import { bestImageSettings, publishedReference } from "../content/publishedPrices";
import CopyButton from "./CopyButton";
import "../styles/model-details.css";

export default function ModelDetails({ model }: { model: CatalogueReference }) {
  const image = model.modality === "image";
  // Capability checks recorded in MODEL_PRICING.md on 2026-10-08; availability is live.
  const coding = ["gpt-6-astra", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.5"].includes(model.upstreamId);
  const rate = model.rates.find(rate => rate.component === (image ? "image-request" : "output"))!;
  const settings = bestImageSettings(model);
  const reference = publishedReference(model, rate, settings);
  const cache = model.rates.find(rate => rate.component === "cached-input");
  // The reference dataset records its context tier in the official conditions.
  const threshold = rate.official[0]?.conditions.match(/input <=([0-9]+) tokens/)?.[1];
  const thinking = rate.official[0]?.conditions.includes("includes thinking");
  const autoQuality = ["gpt-image-2", "gpt-image-2.5"].includes(model.upstreamId);
  let comparison = "No verified official comparison is available for this model.";
  if (reference.status === "available") {
    if (image) {
      comparison = model.upstreamId === "gpt-image-2.5"
        ? "The savings example uses official 1K High output pricing; our quality is automatic. Input costs are excluded."
        : model.provider === "Google"
          ? `This example uses ${reference.basis.replace(" reference · ", " at ")} output pricing. Input and thinking costs are excluded.`
          : `This example uses official ${settings.resolution} ${settings.quality} output pricing. ${autoQuality ? "Our quality is automatic. " : ""}Input costs are excluded.`;
    } else if (threshold) {
      comparison = `The displayed official prices apply to requests with up to ${Number(threshold).toLocaleString("en-US")} input tokens; longer requests use different official rates.`;
    } else {
      comparison = rate.official.length > 0
        ? "The comparison uses the provider's Standard text rates."
        : `The comparison is an example based on the ${reference.basis}. The exact model match is unverified.`;
    }
  }
  return <div className="model-details">
    <p className="model-details-provider">{model.provider} · {image ? "Image" : "Text"}</p>
    <dl className="model-details-notes">
      <div><dt>Billing</dt><dd>{image ? "Priced per request, not per image. The number of returned images and extra input costs are not verified."
        : cache?.credits != null ? "Input, output and cached input are charged separately."
          : "Input and output are charged separately. Cached-input pricing is not available; cached tokens should not be assumed free."}</dd></div>
      {image && <div><dt>Resolution</dt><dd>{model.listedResolutions.join(" / ") || "Not verified"}. Listed options; supported settings still need verification.</dd></div>}
      <div><dt>Comparison basis</dt><dd>{comparison}{thinking && " Official output pricing includes thinking tokens."}</dd></div>
      <div><dt>Support</dt><dd>{coding
        ? "Tool calling and streaming are verified through the Responses API, including Codex. Image and file inputs are not supported. Check the live model list for current availability."
        : image
          ? `${availabilityLabel(model)}. The model match, quality and speed through AIAPI.deals are unverified.`
          : "Chat completions only; tool calling is not supported. Check the live model list for current availability."}{!image && !coding && model.identity.status !== "verified" && " The exact model version is unverified."}</dd></div>
    </dl>
    <div className="model-details-reference">
      <div><span>{coding ? "Model ID" : "Reference ID"}</span><CopyButton text={model.upstreamId} label={coding ? "Copy model ID" : "Copy reference ID"} /></div>
      <code>{model.upstreamId}</code>
      <p>{coding ? "Use with /v1/responses. Availability is listed at /v1/models." : "For reference only; confirm availability and the API ID in /v1/models."}</p>
    </div>
    {reference.status === "available" && <p className="model-details-source"><a className="text-link" href={reference.source}>Official source</a><span>Reference checked {snapshot.checkedOn}</span></p>}
  </div>;
}
