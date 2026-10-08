import { Link } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import { catalogueNotices } from "../content/serviceStatus";
import { useServiceStatus } from "../data/useServiceStatus";
import { formatLocalTime } from "../lib/formatting";
import "../styles/service-status.css";

export default function Status() {
  const status = useServiceStatus();
  const incidents = status.data?.incidents ?? [];
  const open = incidents.filter(incident => !incident.resolvedAt);
  const state = status.error ? "unavailable" : !status.data ? "loading" : open.length ? "incident" : "clear";
  const title = { unavailable: "Status feed unavailable", loading: "Loading status…", incident: open.length === 1 ? "Active incident" : `${open.length} active incidents`, clear: "No active incidents reported" }[state];
  return <PublicCatalogueShell><div className="service-page">
    <header className="service-page-heading"><p className="eyebrow">Service information</p><h1>Service status</h1><p>Published incidents and dated model notices.</p></header>
    <section className={`panel service-summary state-${state === "clear" ? "resolved" : state}`} aria-label="Overall status" aria-live="polite">
      <span className="service-state">{state === "clear" ? "Operational reports" : state === "incident" ? "Incident" : "Unknown"}</span>
      <h2>{title}</h2>
      <p>{state === "unavailable" ? `${status.error} Current health is unknown.` : state === "clear" ? "No incident is currently published. If something isn’t working, contact support." : state === "incident" ? "See the affected services and the latest updates below." : "Checking the published incident feed."}</p>
      {status.data && <p className="small muted">Checked <time dateTime={status.data.checkedAt}>{formatLocalTime(status.data.checkedAt)}</time>{status.data.updatedAt && <> · last incident update <time dateTime={status.data.updatedAt}>{formatLocalTime(status.data.updatedAt)}</time></>}</p>}
      {status.error && <button className="button secondary" onClick={status.reload}>Try again</button>}
    </section>
    <section className="service-section" aria-labelledby="incidents-heading"><h2 id="incidents-heading">Incident reports</h2>
      {status.data && incidents.length === 0 ? <p>No incidents in the last 7 days.</p> : incidents.map(incident => <article className="panel incident-record" id={incident.id} key={incident.id}>
        <span className="service-state">{incident.resolvedAt ? "Resolved" : "Active"}</span>
        <h3>{incident.title}</h3><p>{incident.impact}</p>
        <dl className="incident-details"><dt>Affected service</dt><dd>{incident.service}</dd>{incident.modelIds.length > 0 && <><dt>Affected models</dt><dd>{incident.modelIds.map(id => <code key={id}>{id}</code>)}</dd></>}
          <dt>Started</dt><dd><time dateTime={incident.startedAt}>{formatLocalTime(incident.startedAt)}</time></dd><dt>Last update</dt><dd><time dateTime={incident.updatedAt}>{formatLocalTime(incident.updatedAt)}</time></dd><dt>Resolution</dt><dd>{incident.resolvedAt ? <time dateTime={incident.resolvedAt}>{formatLocalTime(incident.resolvedAt)}</time> : "Not resolved yet"}</dd></dl>
        <h4>Timeline · local time</h4><ol className="incident-timeline">{incident.timeline.map(entry => <li key={entry.at}><time dateTime={entry.at}>{formatLocalTime(entry.at)}</time><p>{entry.message}</p></li>)}</ol>
      </article>)}
    </section>
    <section className="service-section" aria-labelledby="reference-heading"><h2 id="reference-heading">Model reference notices</h2><p>Dated catalogue notices. They are separate from incidents and do not describe current service health.</p>
      <ul className="service-list" aria-label="Model availability notices">{catalogueNotices.map(notice => <li key={notice.modelId}><strong>{notice.modelId}</strong><span>{notice.label} · checked {notice.checkedOn}</span></li>)}</ul>
      <Link className="text-link" to="/models">Browse models →</Link>
    </section>
    <p>Product announcements are separate from incidents. <Link className="text-link" to="/updates">Read updates →</Link></p>
  </div></PublicCatalogueShell>;
}
