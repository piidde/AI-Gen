import { usePublicSearchParams } from "../lib/publicHydration";
import { useState } from "react";
import { Link } from "react-router-dom";

import { queryChoice, updateQuery } from "../lib/queryState";
import { DemoBar, DataState, type DemoState } from "../components/DemoState";
import PageHeading from "../components/PageHeading";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import CatalogueBasis, { useCatalogueCurrency } from "../components/CatalogueBasis";
import ModelFamily from "../components/ModelFamily";
import { activeModels, groupFamilies } from "../content/modelFamilies";
import FilterSelect from "../components/FilterSelect";
import "../styles/catalogue-overview.css";

export default function Models({ publicPage = false }: { publicPage?: boolean }) {
  const [state, setState] = useState<DemoState>("populated");
  const [params, setParams] = usePublicSearchParams();
  // Retain the earlier Gemini filter URL while displaying the provider's name.
  const provider = queryChoice(params, "provider", ["all", "OpenAI", "Google", "Gemini"], "all");
  const capability = queryChoice(params, "capability", ["all", "Text", "Image"], "all");
  const search = params.get("q") ?? "";
  const currency = useCatalogueCurrency();
  const shown = activeModels().filter(model =>
    (provider === "all" || model.provider === (provider === "Gemini" ? "Google" : provider)) &&
    (capability === "all" || model.modality === capability.toLowerCase()) &&
    `${model.upstreamId} ${model.family} ${model.provider} ${model.modality} model ${model.listedResolutions.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const groups = groupFamilies(shown);
  const content = <div className="catalogue-overview">
    {!publicPage && <DemoBar state={state} onChange={setState} />}
    {publicPage ? <header className="catalogue-hero">
      <div><span className="catalogue-eyebrow">THE MODEL COLLECTION</span><h1>Great models.<br /><span>Less overhead.</span></h1><p>Find the right image or text model for your next idea. Compare API prices at a glance, with one shared credit balance.</p></div>
      <div className="catalogue-hero-note"><span>Models &amp; pricing</span><strong>Choose your model.<br />Pay as you go.</strong><p>No subscription. Credits never expire.</p><a href="#model-collection" className="text-link">Explore the collection ↓</a></div>
    </header> : <PageHeading title="Models & pricing" description="Find your model. Compare image and text API prices at a glance." />}
    <CatalogueBasis showExplanation={false} />
    <DataState state={state} title="Models and pricing" emptyTitle="No models to display" onRetry={() => setState("populated")}>
      <div className="catalog-filter" id="model-collection">
        <div className="filter-group">
          <FilterSelect label="Filter provider" value={provider} options={[{ value: 'all', label: 'All providers' }, { value: 'OpenAI', label: 'OpenAI' }, { value: 'Google', label: 'Google' }, ...(provider === 'Gemini' ? [{ value: 'Gemini', label: 'Google (Gemini)' }] : [])]} onChange={value => setParams(updateQuery(params, 'provider', value, 'all'))} />
          <FilterSelect label="Filter capability" value={capability} options={[{ value: 'all', label: 'All capabilities' }, { value: 'Image', label: 'Image' }, { value: 'Text', label: 'Text' }]} onChange={value => setParams(updateQuery(params, 'capability', value, 'all'))} />
        </div>
        <input type="search" className="search" aria-label="Search models" placeholder="Search models, providers or resolutions…" value={search} onChange={event => setParams(updateQuery(params, "q", event.target.value), { replace: true })} />
      </div>
      <div className="catalog-count" role="status">{shown.length} reference variants across {groups.length} families</div>
      {(['image', 'text'] as const).map(modality => {
        const variants = groups.flatMap(group => group.variants).filter(model => model.modality === modality);
        return variants.length > 0 && <ModelFamily key={modality} family={modality === 'image' ? 'Image models' : 'Text models'} variants={variants} currency={currency} overview />;
      })}
      {shown.length === 0 && <section className="empty"><h2>No matching models</h2><p>Try another provider, capability or search.</p></section>}
    </DataState>
    {publicPage && <section className="catalogue-closing"><div><span className="catalogue-eyebrow">YOUR NEXT IDEA STARTS HERE</span><h2>Find your model.<br />Build something great.</h2><p>One account for image and text APIs. Explore Takewing while paid API access is being prepared.</p></div><div className="catalogue-closing-actions"><Link className="button" to="/signup">Get started ↗</Link><Link className="text-link" to="/docs">Explore the documentation</Link></div></section>}
  </div>;
  return publicPage ? <PublicCatalogueShell>{content}</PublicCatalogueShell> : content;
}
