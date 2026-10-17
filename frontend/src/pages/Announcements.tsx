import { useMemo, useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Tabs from "../components/Tabs";
import { useApiResource } from "../data/api";
import { categoryLabels, type AnnouncementCategory, type AnnouncementDto } from "../data/announcements";
import "../styles/announcements.css";

const filters = ["All", "New features", "Important", "Platform updates"] as const;
type Filter = typeof filters[number];
const filterCategory: Record<Filter, AnnouncementCategory | null> = {
  All: null, "New features": "feature", Important: "important", "Platform updates": "platform",
};
const RECENT_DAYS = 7;

export default function Announcements() {
  const announcements = useApiResource<{ data: AnnouncementDto[] }>("/v1/announcements");
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const all = announcements.data?.data ?? [];
  const recent = all.filter(item => Date.now() - Date.parse(item.published_at) < RECENT_DAYS * 86_400_000).length;
  const visible = useMemo(() => {
    const category = filterCategory[filter];
    const needle = search.trim().toLowerCase();
    return all.filter(item => (!category || item.category === category)
      && (!needle || item.title.toLowerCase().includes(needle) || item.body.toLowerCase().includes(needle)));
  }, [all, filter, search]);

  return <div className="announcements-page">
    <section className="announcements-hero">
      <div>
        <span className="announcements-chip"><Icon name="bell" />Product updates</span>
        <h1 tabIndex={-1}>Stay informed with every update</h1>
        <p>New models, service status and pricing changes are published here as soon as they happen.</p>
      </div>
      <dl className="announcements-stats">
        <div><dt>Total announcements</dt><dd>{announcements.data ? all.length : "–"}</dd></div>
        <div><dt>Last {RECENT_DAYS} days</dt><dd>{announcements.data ? recent : "–"}</dd></div>
      </dl>
    </section>

    <div className="announcements-toolbar panel">
      <Tabs label="Announcement type" options={filters} value={filter} onChange={setFilter} panelId="announcement-list" />
      <label className="announcements-search">
        <span className="sr-only">Search announcements</span>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search announcements, models or keywords" />
      </label>
    </div>

    <div className="announcements-heading">
      <div><p className="eyebrow">Changelog</p><h2>Update history</h2></div>
      {announcements.data && <span className="small muted" role="status">{visible.length} result{visible.length === 1 ? "" : "s"}</span>}
    </div>

    <div id="announcement-list" role="tabpanel">
      {announcements.error && <section className="notice error" role="alert"><p>{announcements.error}</p><Button className="secondary" onClick={announcements.reload}>Try again</Button></section>}
      {!announcements.data && !announcements.error && <p role="status">Loading announcements…</p>}
      {announcements.data && !visible.length && <p className="announcements-empty">{all.length ? "No announcements match this filter." : "No announcements yet."}</p>}
      <ol className="announcements-timeline">{visible.map(item => <li key={item.id} className={`category-${item.category}`}>
        <span className="announcements-dot" aria-hidden="true"><Icon name={item.category === "important" ? "bell" : "check"} /></span>
        <article>
          <header>
            <span className="announcements-badge">{categoryLabels[item.category]}</span>
            <time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString()}</time>
          </header>
          <h3>{item.title}</h3>
          <p className="announcements-body">{item.body}</p>
        </article>
      </li>)}</ol>
    </div>
  </div>;
}
