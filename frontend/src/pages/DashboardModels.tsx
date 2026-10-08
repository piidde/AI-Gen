import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import FilterSelect from "../components/FilterSelect";
import PageHeading from "../components/PageHeading";
import CopyButton from "../components/CopyButton";
import { useApiResource, type ModelDto } from "../data/api";

const unitLabels: Record<string, string> = { request: "per image", second: "per second" };

// The live list contains only models the backend has enabled and priced; prices are what requests are charged.
export default function DashboardModels() {
  const models = useApiResource<{ data: ModelDto[] }>("/v1/models");
  const [capability, setCapability] = useState("all");
  const [search, setSearch] = useState("");
  const shown = (models.data?.data ?? []).filter(model =>
    (capability === "all" || model.capability === capability) &&
    `${model.id} ${model.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="dashboard-models">
    <PageHeading title="Models & pricing" description="Models available to your API keys: coding models with tool calling, chat models and image models, with the prices your requests are charged." />
    <div className="catalog-filter">
      <div className="filter-group"><FilterSelect label="Filter capability" value={capability} options={[{ value: "all", label: "All capabilities" }, { value: "text", label: "Text" }, { value: "image", label: "Image" }, { value: "video", label: "Video" }]} onChange={setCapability} /></div>
      <input type="search" className="search" aria-label="Search models" placeholder="Search models…" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    {models.loading && !models.data && <p role="status">Loading models…</p>}
    {models.error && <section className="notice error" role="alert"><h2>Models couldn’t be loaded</h2><p>{models.error}</p><Button className="secondary" onClick={models.reload}>Try again</Button></section>}
    {models.data && (models.data.data.length === 0 ? <section className="empty"><h2>No models are available yet</h2><p>Models appear here once they are enabled for requests. See the <Link className="text-link" to="/models">model catalogue</Link> for what is planned.</p></section>
      : <section className="panel requests">
        <div className="table-head"><h2>Available models</h2><span className="small muted" role="status">{shown.length} of {models.data.data.length} models · USD</span></div>
        <div className="table-scroll" role="region" aria-label="Available models table" tabIndex={0}><table><thead><tr>
          {["MODEL", "API ID", "USE WITH", "INPUT / 1M TOKENS", "OUTPUT / 1M TOKENS", "PER UNIT"].map(label => <th scope="col" key={label}>{label}</th>)}
        </tr></thead><tbody>{shown.map(model => <tr key={model.id}>
          <td>{model.name}</td>
          <td><code>{model.id}</code> <CopyButton text={model.id} label={`Copy ${model.id}`} /></td>
          <td>{model.capability !== "text" ? model.capability.charAt(0).toUpperCase() + model.capability.slice(1)
            : model.endpoints?.includes("responses") ? <>Coding · <Link className="text-link" to="/docs#codex">Responses + tools</Link></> : <>Chat · <Link className="text-link" to="/docs#chat">Chat completions</Link></>}</td>
          <td>{model.pricing.input_per_million ?? "—"}</td>
          <td>{model.pricing.output_per_million ?? "—"}</td>
          <td>{model.pricing.per_unit ? `${model.pricing.per_unit} ${unitLabels[model.pricing.unit] ?? `per ${model.pricing.unit}`}` : "—"}</td>
        </tr>)}{shown.length === 0 && <tr><td colSpan={6}>No models match these filters.</td></tr>}</tbody></table></div>
        <p className="section-note">Requests are charged at the price version current when they start. Unused reserved credits are returned when a request settles.</p>
      </section>)}
  </div>;
}
