import { useBrowserReady } from "../lib/publicHydration";
import { Link, useParams } from "react-router-dom";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import { updates } from "../content/serviceStatus";
import { formatLocalTime } from "../lib/formatting";
import "../styles/service-status.css";

export default function Updates() {
  const ready = useBrowserReady();
  const formatTime = (value: string) => ready ? formatLocalTime(value) : `${value} · UTC`;
  const { slug } = useParams();
  const update = updates.find(item => item.slug === slug);
  return <PublicCatalogueShell><div className="service-page updates-page">
    {slug ? update ? <article>
      <Link className="text-link" to="/updates">← All updates</Link>
      <header className="service-page-heading"><p className="eyebrow">Sample product announcement</p><h1>{update.title}</h1><p>Published <time dateTime={update.publishedAt}>{formatTime(update.publishedAt)}</time> · your local time</p></header>
      <p className="service-preview">Sample content for frontend review. This is not production news.</p>
      {update.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </article> : <section><h1>Update not found</h1><p>This announcement does not exist.</p><Link className="text-link" to="/updates">Back to updates</Link></section> : <>
      <header className="service-page-heading"><p className="eyebrow">Product announcements</p><h1>Updates</h1><p>Recent announcements, newest first. Operational incidents are tracked separately on the <Link className="text-link" to="/status">status page</Link>.</p></header>
      <p className="service-preview">Sample archive only. Every entry below is fictional editorial content, not production news. A publishing source and owner are still required.</p>
      <ol className="updates-list">{updates.map(item => <li key={item.slug}><article><p className="small muted">Sample announcement · <time dateTime={item.publishedAt}>{formatTime(item.publishedAt)}</time></p><h2><Link to={`/updates/${item.slug}`}>{item.title}</Link></h2><p>{item.summary}</p><Link className="text-link" to={`/updates/${item.slug}`}>Read sample update →</Link></article></li>)}</ol>
    </>}
  </div></PublicCatalogueShell>;
}
