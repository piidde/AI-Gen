import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import PageHeading from "../components/PageHeading";
import CopyButton from "../components/CopyButton";
import Tabs from "../components/Tabs";
import { ProviderLogo } from "../components/ProviderLogo";
import { useApiResource, type ModelDto } from "../data/api";
import Models from "./Models";

const unitLabels: Record<string, string> = { request: "per image", second: "per second" };
const categories = [{ value: "all", label: "All" }, { value: "coding", label: "Coding" }, { value: "chat", label: "Chat" }, { value: "image", label: "Image" }] as const;
type Category = typeof categories[number]["value"];
const views = ["Available to your keys", "Full catalogue"] as const;

// Text models are split by endpoint: Responses (with tools) for coding, chat completions otherwise.
function categoryOf(model: ModelDto): string {
  if (model.capability !== "text") return model.capability;
  return model.endpoints?.includes("responses") ? "coding" : "chat";
}

export default function DashboardModels() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "catalogue" ? views[1] : views[0];
  return <div className="dashboard-models">
    <PageHeading title="Models & pricing" description="The models your API keys can call and the prices requests are charged, plus the full catalogue compared with official list prices." />
    <Tabs label="Model list" options={views} value={view} panelId="models-panel" className="models-view-tabs"
      onChange={value => setParams(value === views[1] ? { view: "catalogue" } : {}, { preventScrollReset: true })} />
    <div id="models-panel" role="tabpanel" aria-label={view}>
      {view === views[0] ? <AvailableModels /> : <>
        <p className="models-catalogue-note">Every model family with official list prices for comparison. Only the models under <Link className="text-link" to="/dashboard/models">Available to your keys</Link> accept requests right now.</p>
        <Models />
      </>}
    </div>
  </div>;
}

// The live list contains only models the backend has enabled and priced; prices are what requests are charged.
function AvailableModels() {
  const models = useApiResource<{ data: ModelDto[] }>("/v1/models");
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const shown = (models.data?.data ?? []).filter(model =>
    (category === "all" || categoryOf(model) === category) &&
    `${model.id} ${model.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <p className="models-usage-hint">Send the API ID as <code>model</code> to <code>https://aiapi.deals/v1</code> with one of your <Link className="text-link" to="/dashboard/api-keys">API keys</Link>. The <Link className="text-link" to="/docs">quickstart</Link> shows complete requests.</p>
    <div className="catalog-filter">
      <div className="capability-filters" role="group" aria-label="Filter capability">
        {categories.map(option => <button type="button" key={option.value} aria-pressed={category === option.value} onClick={() => setCategory(option.value)}>{option.label}</button>)}
      </div>
      <input type="search" className="search" aria-label="Search models" placeholder="Search models…" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    {models.loading && !models.data && <p role="status">Loading models…</p>}
    {models.error && <section className="notice error" role="alert"><h2>Models couldn’t be loaded</h2><p>{models.error}</p><Button className="secondary" onClick={models.reload}>Try again</Button></section>}
    {models.data && (models.data.data.length === 0 ? <section className="empty"><h2>No models are available yet</h2><p>Models appear here once they are enabled for requests. The <Link className="text-link" to="/dashboard/models?view=catalogue">full catalogue</Link> shows what is planned.</p></section>
      : <section className="panel requests">
        <div className="table-head"><h2>Available models</h2><span className="small muted" role="status">{shown.length} of {models.data.data.length} models · USD</span></div>
        <div className="table-scroll" role="region" aria-label="Available models table" tabIndex={0}><table><thead><tr>
          {["MODEL", "API ID", "USE WITH", "INPUT / 1M TOKENS", "OUTPUT / 1M TOKENS", "PER UNIT"].map(label => <th scope="col" key={label}>{label}</th>)}
        </tr></thead><tbody>{shown.map(model => <tr key={model.id}>
          <td><span className="model-name"><ProviderLogo name={`${model.name} ${model.id}`} size={22} />{model.name}</span></td>
          <td><code>{model.id}</code> <CopyButton text={model.id} label={`Copy ${model.id}`} /></td>
          <td>{model.capability !== "text" ? model.capability.charAt(0).toUpperCase() + model.capability.slice(1)
            : model.endpoints?.includes("responses") ? <>Coding · <Link className="text-link" to="/docs#codex">Responses + tools</Link></> : <>Chat · <Link className="text-link" to="/docs#chat">Chat completions</Link></>}</td>
          <td>{model.pricing.input_per_million ?? "—"}</td>
          <td>{model.pricing.output_per_million ?? "—"}</td>
          <td>{model.pricing.per_unit ? `${model.pricing.per_unit} ${unitLabels[model.pricing.unit] ?? `per ${model.pricing.unit}`}` : "—"}</td>
        </tr>)}{shown.length === 0 && <tr><td colSpan={6}>No models match these filters.</td></tr>}</tbody></table></div>
        <p className="section-note">Requests are charged at the price version current when they start. Unused reserved credits are returned when a request settles.</p>
      </section>)}
  </>;
}
