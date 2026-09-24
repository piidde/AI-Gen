import { usePublicSearchParams, usePublicSearch } from "../lib/publicHydration";
import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import { catalogueNotices, getServiceStatus, readStatusScenario, statusScenarios } from "../content/serviceStatus";
import { formatLocalTime } from "../lib/formatting";
import "../styles/service-status.css";

export default function Status() {
  const search = usePublicSearch();
  const [params, setParams] = usePublicSearchParams();
  const scenario = readStatusScenario(search);
  const status = getServiceStatus(scenario);
  return <PublicCatalogueShell><div className="service-page">
    <header className="service-page-heading"><p className="eyebrow">Service information</p><h1>Service status</h1><p>Current health, incident details and dated model notices, with their source clearly identified.</p></header>
    <section className="service-preview" aria-label="Status preview controls">
      <label htmlFor="status-preview">Demo status scenario</label>
      <select id="status-preview" value={scenario} onChange={event => { const next = new URLSearchParams(params); next.set("statusPreview", event.target.value); setParams(next); }}>
        {statusScenarios.map(value => <option value={value} key={value}>{({ unavailable: "Source not connected", incident: "Sample incident", resolved: "Sample resolution", stale: "Stale source", loading: "Loading source" })[value]}</option>)}
      </select><p>Preview only. No live monitoring is connected; all incident examples are fictional.</p>
    </section>
    <section className={`panel service-summary state-${scenario}`} aria-label="Overall status" aria-live="polite">
      <span className="service-state">{scenario === "unavailable" ? "Unknown" : "Demo preview"}</span>
      <h2>{status.title}</h2><p>{status.description}</p>
      <p className="small muted">Source: {scenario === "unavailable" ? "not connected" : "local fictional fixture"} · Last source update: {status.sourceUpdatedAt ? <time dateTime={status.sourceUpdatedAt}>{formatLocalTime(status.sourceUpdatedAt)}</time> : "unavailable"}</p>
      <p className="small muted">Timestamps use your local time zone. An absent incident report does not mean that services are operational.</p>
    </section>
    <section className="service-section" aria-labelledby="affected-heading"><h2 id="affected-heading">Services and affected models</h2>
      <ul className="service-list">
        <li><strong>Image generation</strong><span>{scenario === "incident" ? "Sample disruption · gpt-image-2" : scenario === "stale" ? "Unknown · stale sample incident for gpt-image-2" : scenario === "resolved" ? "Sample incident resolved · live health unknown" : "Current health unknown"}</span></li>
        <li><strong>Text generation</strong><span>Current health unknown</span></li>
        <li><strong>Account and billing services</strong><span>Current health unknown</span></li>
      </ul>
    </section>
    <section className="service-section" aria-labelledby="incidents-heading"><h2 id="incidents-heading">{scenario === "resolved" ? "Sample incident history" : "Incident reports"}</h2>
      {status.incidents.length === 0 ? <p>Incident information is {scenario === "loading" ? "pending in this loading preview" : "unavailable because no live source is connected"}. No claim about active incidents can be made.</p> : status.incidents.map(incident => <article className="panel incident-record" id={incident.id} key={incident.id}>
        <span className="service-state">{scenario === "stale" ? "Historical sample · current state unknown" : incident.resolvedAt ? "Resolved sample" : "Active sample"}</span>
        <h3>{incident.title}</h3><p>{incident.impact}</p>
        <dl className="incident-details"><dt>Affected service</dt><dd>{incident.service}</dd><dt>Affected reference model</dt><dd>{incident.modelIds.map(id => <code key={id}>{id}</code>)}</dd>
          <dt>Started</dt><dd><time dateTime={incident.startedAt}>{formatLocalTime(incident.startedAt)}</time></dd><dt>Last update</dt><dd><time dateTime={incident.updatedAt}>{formatLocalTime(incident.updatedAt)}</time></dd><dt>Resolution</dt><dd>{incident.resolvedAt ? <time dateTime={incident.resolvedAt}>{formatLocalTime(incident.resolvedAt)}</time> : "No resolution recorded in this sample"}</dd></dl>
        <h4>Incident timeline · local time</h4><ol className="incident-timeline">{incident.timeline.map(entry => <li key={entry.at}><time dateTime={entry.at}>{formatLocalTime(entry.at)}</time><p>{entry.message}</p></li>)}</ol>
      </article>)}
    </section>
    <section className="service-section" aria-labelledby="reference-heading"><h2 id="reference-heading">Model reference notices</h2><p>These dated catalogue notices are separate from the fictional incidents above. They do not establish current service health. Other model availability is not verified.</p>
      <ul className="service-list" aria-label="Model availability notices">{catalogueNotices.map(notice => <li key={notice.modelId}><strong>{notice.modelId}</strong><span>{notice.label} · checked {notice.checkedOn}</span></li>)}</ul>
      <Link className="text-link" to={scenario === "unavailable" ? "/models" : `/models?statusPreview=${scenario}`}>Browse model references →</Link>
    </section>
    <p>Product announcements are separate from incidents. <Link className="text-link" to="/updates">Read updates →</Link></p>
  </div></PublicCatalogueShell>;
}
