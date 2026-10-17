import { useState } from "react";
import Button from "./Button";
import FilterSelect from "./FilterSelect";
import { useApiResource } from "../data/api";
import { useMutation } from "../data/admin";
import { categoryLabels, type AnnouncementCategory, type AnnouncementDto } from "../data/announcements";
import "../styles/announcements.css";

const empty = { id: null as string | null, title: "", body: "", category: "feature" as AnnouncementCategory };
const categoryOptions = (Object.keys(categoryLabels) as AnnouncementCategory[]).map(value => ({ value, label: categoryLabels[value] }));

export default function AdminAnnouncements() {
  const announcements = useApiResource<{ data: AnnouncementDto[] }>("/v1/announcements");
  const [form, setForm] = useState(empty);
  const mutation = useMutation();
  const valid = form.title.trim().length >= 3 && form.title.trim().length <= 160 && form.body.trim().length >= 1 && form.body.length <= 20000;
  function edit(item: AnnouncementDto) {
    mutation.reset();
    setForm({ id: item.id, title: item.title, body: item.body, category: item.category });
  }
  async function submit() {
    if (!valid) return;
    const body = { title: form.title.trim(), body: form.body.trim(), category: form.category };
    const saved = form.id
      ? await mutation.run(`/v1/internal/announcements/${form.id}`, body, "Announcement updated.", "PUT")
      : await mutation.run("/v1/internal/announcements", body, "Announcement published.");
    if (saved) { setForm(empty); announcements.reload(); }
  }
  async function remove(item: AnnouncementDto) {
    if (!window.confirm(`Delete "${item.title}"? Customers will no longer see it.`)) return;
    if (await mutation.run(`/v1/internal/announcements/${item.id}`, undefined, "Announcement deleted.", "DELETE")) {
      if (form.id === item.id) setForm(empty);
      announcements.reload();
    }
  }
  return <div className="admin-grid">
    <section className="panel setting-section">
      <h2>{form.id ? "Edit announcement" : "New announcement"}</h2>
      <p>Paste the text as plain text; line breaks are kept. It appears immediately under Announcements for every signed-in customer.</p>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="field wide"><label htmlFor="announcement-title">Title</label>
          <input id="announcement-title" required minLength={3} maxLength={160} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Model restoration notice" /></div>
        <div className="field"><FilterSelect id="announcement-category" label="Type" value={form.category} options={categoryOptions}
          onChange={value => setForm({ ...form, category: value as AnnouncementCategory })} /></div>
        <div className="field wide"><label htmlFor="announcement-body">Text</label>
          <textarea id="announcement-body" className="admin-announcement-body" required maxLength={20000} value={form.body}
            onChange={event => setForm({ ...form, body: event.target.value })} placeholder={"The following models have been restored and are now available:\n\ngpt-image-2\ngpt-image-2.5"} />
          <p>{form.body.length.toLocaleString()} / 20,000 characters</p></div>
        <div className="form-footer">
          <Button type="submit" disabled={!valid || mutation.pending}>{mutation.pending ? "Saving…" : form.id ? "Update announcement" : "Publish announcement"}</Button>
          {(form.id || form.title || form.body) && <Button className="secondary" onClick={() => { setForm(empty); mutation.reset(); }}>{form.id ? "Cancel edit" : "Clear"}</Button>}
          {mutation.done && <span className="save-status" role="status">{mutation.done}</span>}
          {mutation.error && <span className="save-status error" role="alert">{mutation.error}</span>}
        </div>
      </form>
    </section>
    <section className="panel setting-section">
      <div className="table-head"><h2>Published</h2>{announcements.data && <span className="small muted">{announcements.data.data.length} total</span>}</div>
      {announcements.error && <p className="section-note" role="alert">{announcements.error}</p>}
      {!announcements.data && !announcements.error && <p role="status">Loading announcements…</p>}
      {announcements.data && !announcements.data.data.length && <p className="section-note">Nothing published yet.</p>}
      <ul className="admin-announcement-list">{announcements.data?.data.map(item => <li key={item.id}>
        <div><strong>{item.title}</strong>
          <span className="small muted">{categoryLabels[item.category]} · <time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString()}</time></span></div>
        <div className="key-actions">
          <Button className="secondary" onClick={() => edit(item)}>Edit</Button>
          <Button className="danger" disabled={mutation.pending} onClick={() => void remove(item)}>Delete</Button>
        </div>
      </li>)}</ul>
    </section>
  </div>;
}
