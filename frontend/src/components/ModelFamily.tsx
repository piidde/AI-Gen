import { usePublicSearch } from "../lib/publicHydration";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogueReference } from "../content/catalogue";
import { snapshot } from "../content/catalogue";
import { availabilityLabel, familyPages } from "../content/modelFamilies";
import CopyButton from "./CopyButton";
import Dialog from "./Dialog";
import CatalogueRates, { type DisplayCurrency } from "./CatalogueRates";
import ModelPrices from "./ModelPrices";
import openaiIcon from "../assets/openai.svg";
import geminiIcon from "../assets/gemini.svg";
import { catalogueNotices, getServiceStatus, readStatusScenario, statusHref } from "../content/serviceStatus";
import "../styles/service-status.css";
import "../styles/catalogue-status.css";

function modelDisplayName(id: string) {
  return id.split('-').map(word => /^(gpt|vip|cl|\d+k)$/i.test(word)
    ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/^GPT (\d)/, 'GPT-$1');
}

export default function ModelFamily({ family, variants, currency, linkPage = true, overview = false }: {
  family: string; variants: CatalogueReference[]; currency: DisplayCurrency; linkPage?: boolean; overview?: boolean;
}) {
  const [selected, setSelected] = useState<CatalogueReference | null>(null);
  const search = usePublicSearch();
  const status = getServiceStatus(readStatusScenario(search));
  const reserveStatus = overview && variants.some(model => model.availability !== "unknown" || status.incidents.some(incident => incident.modelIds.includes(model.upstreamId)));
  const page = familyPages.find(page => page.family === family);
  const first = variants[0];
  if (!first) return null;
  return <section className={`catalogue-family${overview ? ' catalogue-collection' : ''}${reserveStatus ? ' catalogue-has-status' : ''}`} aria-label={overview ? family : `${family} family`}>
    {overview ? <header className="collection-heading"><h2>{family}</h2><span>{variants.length} models</span><p>{first.modality === 'image' ? 'Per-request pricing. Choose your model and resolution.' : 'Input and output pricing, side by side. Per 1M tokens.'}</p></header> : <header className="family-heading">
      <div className="provider-line"><img className="provider-icon" src={first.provider === "OpenAI" ? openaiIcon : geminiIcon} alt="" width={30} height={30} /><span>{first.provider}</span><span className="capability">{first.modality === "image" ? "Image" : "Text"}</span></div>
      <h2>{family}</h2>
      <p>{page?.description ?? (first.modality === "image" ? "Image request variants. Compare listed options; quality and speed differences remain unverified." : "Text variants with separate input, output and cache-read rates. Integration capabilities remain unverified.")}</p>
      {linkPage && page && <Link className="text-link" to={`/models/${page.slug}`}>Explore {family} →</Link>}
    </header>}
    <div className="model-grid">
      {variants.map(model => <article className="panel model-card reference-card" data-model-id={model.upstreamId} key={model.upstreamId}>
        {overview && <div className="catalogue-card-provider"><img src={model.provider === 'OpenAI' ? openaiIcon : geminiIcon} alt="" width={18} height={18} /><span>{model.provider}</span></div>}
        <h3>{overview ? modelDisplayName(model.upstreamId) : model.upstreamId}</h3>
        {(!overview || model.modality === 'image') && <p className="model-family">{model.modality === "image" ? `Listed resolutions: ${model.listedResolutions.join(" / ") || "not verified"}` : "Text · separately metered components"}</p>}
        <ModelPrices model={model} overview={overview} />
        <footer><button className="text-link" aria-label={`View details for ${model.upstreamId}`} onClick={() => setSelected(model)}>View details<span className="sr-only"> for {model.upstreamId}</span> ↗</button>
        <div className="catalogue-status-slot">{model.availability !== "unknown" && <span className={`availability-label ${model.availability === "unavailable-notice" ? "availability-warning" : ""}`}>
          {model.availability === "unavailable-notice" ? "Temporarily unavailable" : availabilityLabel(model)}
          {catalogueNotices.some(notice => notice.modelId === model.upstreamId) && <> · <Link className="text-link" to={statusHref(search)}>Notice · {snapshot.checkedOn}</Link></>}
        </span>}
        {status.incidents.some(incident => incident.modelIds.includes(model.upstreamId)) && <p className="model-status-notice">{status.title}. Live health unknown. <Link className="text-link" to={statusHref(search)}>View sample incident</Link></p>}
        </div>
        </footer>
      </article>)}
    </div>
    {selected && <Dialog title={selected.upstreamId} onClose={() => setSelected(null)}>
      <p><strong>{availabilityLabel(selected)}</strong> · checked {snapshot.checkedOn}</p>
      <p>Reference ID: <code>{selected.upstreamId}</code></p>
      <CopyButton text={selected.upstreamId} label="Copy reference ID" />
      <p>Public API ID pending. This reference identifier is not a working Takewing integration ID.</p>
      <p>{selected.identity.status === "verified" ? "Official identity documented; the served version and Takewing support remain unverified." : "Exact model or channel identity is awaiting evidence."}</p>
      <ModelPrices model={selected} />
      <CatalogueRates rates={selected.rates} currency={currency} detailed />
      <h3>Limitations</h3>
      <ul>{selected.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
      {selected.gaps.length > 0 && <p>Evidence gaps: {selected.gaps.join(", ")}. Alias mapping, channel behavior or availability needs review before use.</p>}
      <p><Link className="text-link" to="/docs">Takewing documentation status</Link> · <Link className="text-link" to={statusHref(search)}>Status and notices</Link></p>
    </Dialog>}
  </section>;
}
