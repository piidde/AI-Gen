import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CatalogueReference } from "../content/catalogue";
import { snapshot } from "../content/catalogue";
import { availabilityLabel, familyPages } from "../content/modelFamilies";
import CopyButton from "./CopyButton";
import Dialog from "./Dialog";
import CatalogueRates, { type DisplayCurrency } from "./CatalogueRates";
import ModelPrices from "./ModelPrices";
import { ProviderLogo, ToolLogo } from "./ProviderLogo";
import { catalogueNotices } from "../content/serviceStatus";
import { useServiceStatus } from "../data/useServiceStatus";
import "../styles/service-status.css";
import "../styles/catalogue-status.css";

function modelDisplayName(id: string) {
  return id.split('-').map(word => /^(gpt|vip|cl|\d+k)$/i.test(word)
    ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/^GPT (\d)/, 'GPT-$1');
}

export default function ModelFamily({ family, variants, currency, linkPage = true, overview = false, note, actions }: {
  family: string; variants: CatalogueReference[]; currency: DisplayCurrency; linkPage?: boolean; overview?: boolean;
  note?: string; actions?: ReactNode;
}) {
  const [selected, setSelected] = useState<CatalogueReference | null>(null);
  const status = useServiceStatus();
  const openIncidents = status.data?.incidents.filter(incident => !incident.resolvedAt) ?? [];
  const reserveStatus = overview && variants.some(model => model.availability !== "unknown" || openIncidents.some(incident => incident.modelIds.includes(model.upstreamId)));
  const page = familyPages.find(page => page.family === family);
  const first = variants[0];
  if (!first) return null;
  return <section className={`catalogue-family${overview ? ' catalogue-collection' : ''}${reserveStatus ? ' catalogue-has-status' : ''}`} aria-label={overview ? family : `${family} family`}>
    {overview ? <header className="collection-heading"><h2>{family}</h2><span>{variants.length} models</span><p>{note ?? (first.modality === 'image' ? 'Per-request pricing. Choose your model and resolution.' : 'Input and output pricing, side by side. Per 1M tokens.')}</p></header> : <header className="family-heading">
      <div className="provider-line"><ProviderLogo name={family === "Nano Banana Pro" ? family : first.provider} size={30} /><span>{first.provider}</span><span className="capability">{first.modality === "image" ? "Image" : first.provider === "OpenAI" ? "Coding · tool calling" : "Chat"}</span></div>
      <h2>{family}</h2>
      <p>{page?.description ?? (first.modality === "image" ? "Image request variants. Compare listed options; quality and speed differences remain unverified." : "Text variants with separate input, output and cache-read rates. Integration capabilities remain unverified.")}</p>
      {linkPage && page && <Link className="text-link" to={`/models/${page.slug}`}>Explore {family} →</Link>}
    </header>}
    {actions && <div className="collection-actions">{actions}</div>}
    <div className="model-grid">
      {variants.map(model => <article className="panel model-card reference-card" data-model-id={model.upstreamId} key={model.upstreamId}>
        {overview && <div className="catalogue-card-provider"><ProviderLogo name={model.upstreamId.includes("banana") ? "Nano Banana" : model.provider} /><span>{model.provider}</span></div>}
        <h3>{overview ? modelDisplayName(model.upstreamId) : model.upstreamId}</h3>
        <p className="model-family">{model.modality === "image" ? `Listed resolutions: ${model.listedResolutions.join(" / ") || "not verified"}` : model.provider === "OpenAI" ? "Coding · tool calling · Responses API" : "Chat · chat completions"}</p>
        {model.modality === "text" && model.provider === "OpenAI" && <p className="works-with" aria-label="Works with Codex CLI and Codex for VS Code">
          <span>Works with</span><span className="works-with-tool"><ToolLogo tool="codex" size={16} />Codex</span><span className="works-with-tool"><ToolLogo tool="vscode" size={16} />VS Code</span>
        </p>}
        <ModelPrices model={model} overview={overview} currency={currency} />
        <footer><button className="text-link" aria-label={`View details for ${model.upstreamId}`} onClick={() => setSelected(model)}>View details<span className="sr-only"> for {model.upstreamId}</span> ↗</button>
        <div className="catalogue-status-slot">{model.availability !== "unknown" && <span className={`availability-label ${model.availability === "unavailable-notice" ? "availability-warning" : ""}`}>
          {model.availability === "unavailable-notice" ? "Temporarily unavailable" : availabilityLabel(model)}
          {catalogueNotices.some(notice => notice.modelId === model.upstreamId) && <> · <Link className="text-link" to="/status">Notice · {snapshot.checkedOn}</Link></>}
        </span>}
        {openIncidents.some(incident => incident.modelIds.includes(model.upstreamId)) && <p className="model-status-notice">Active incident affects this model. <Link className="text-link" to="/status">View status</Link></p>}
        </div>
        </footer>
      </article>)}
    </div>
    {selected && <Dialog title={selected.upstreamId} onClose={() => setSelected(null)}>
      <p><strong>{availabilityLabel(selected)}</strong> · checked {snapshot.checkedOn}</p>
      <p>Reference ID: <code>{selected.upstreamId}</code></p>
      <CopyButton text={selected.upstreamId} label="Copy reference ID" />
      <p>Public API ID pending. This reference identifier is not a working AIAPI.deals integration ID.</p>
      <p>{selected.identity.status === "verified" ? "Official identity documented; the served version and AIAPI.deals support remain unverified." : "Exact model or channel identity is awaiting evidence."}</p>
      <ModelPrices model={selected} currency={currency} />
      <CatalogueRates rates={selected.rates} currency={currency} detailed />
      <h3>Limitations</h3>
      <ul>{selected.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
      {selected.gaps.length > 0 && <p>Evidence gaps: {selected.gaps.join(", ")}. Alias mapping, channel behavior or availability needs review before use.</p>}
      <p><Link className="text-link" to="/docs">AIAPI.deals documentation status</Link> · <Link className="text-link" to="/status">Status and notices</Link></p>
    </Dialog>}
  </section>;
}
