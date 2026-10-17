import { useState } from "react";
import Button from "./Button";
import Dialog from "./Dialog";
import { formatMinor, formatUsdPrice, useApiResource } from "../data/api";
import { useMutation, type UpstreamChangeDto, type UpstreamCost, type UpstreamSyncDto } from "../data/admin";

const kindLabels: Record<UpstreamChangeDto["kind"], string> = {
  price_increase: "Cost increase", price_decrease: "Cost decrease", suspicious_price: "Implausible price jump",
  new_model: "New model", closed: "Closed by GrsAI", reopened: "Reopened by GrsAI", missing: "Removed by GrsAI",
  capability_changed: "Type changed",
};

function cost(entry: Partial<UpstreamCost> | null): string {
  if (entry?.unit_micros) return `${formatUsdPrice(entry.unit_micros, "nearest")} / request`;
  if (entry?.input_micros && entry.output_micros) return `${formatUsdPrice(entry.input_micros, "nearest")} in · ${formatUsdPrice(entry.output_micros, "nearest")} out / 1M`;
  return "–";
}

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

// The hourly GrsAI price sync: its health, the changes waiting for a decision and the recent history.
export default function AdminUpstream() {
  const sync = useApiResource<UpstreamSyncDto>("/v1/internal/upstream-sync");
  const runNow = useMutation();
  const [resolving, setResolving] = useState<{ change: UpstreamChangeDto; apply: boolean } | null>(null);
  const [acceptShrink, setAcceptShrink] = useState(false);
  if (!sync.data) return sync.error
    ? <section className="notice error" role="alert"><p>{sync.error}</p><Button className="secondary" onClick={sync.reload}>Try again</Button></section>
    : <p role="status">Loading the GrsAI sync…</p>;
  const { state, changes } = sync.data;
  const pending = changes.filter(change => change.status === "pending");
  const history = changes.filter(change => change.status !== "pending");
  return <>
    {state.consecutive_failures > 0 && <section className="notice error" role="alert">
      <h2>The last {state.consecutive_failures === 1 ? "sync" : `${state.consecutive_failures} syncs`} failed</h2>
      <p>Last error: <code>{state.last_error}</code>. Prices stay as they are until a sync succeeds.</p>
      {state.last_error === "catalog_shrunk" && <><p>GrsAI returned less than half of the previous model list. If GrsAI really removed those models, accept the smaller list; every missing model is then disabled.</p>
        <Button className="danger" onClick={() => setAcceptShrink(true)}>Accept smaller list</Button></>}
    </section>}
    <section className="admin-metrics" aria-label="GrsAI sync">
      <div><div className="metric-label">Last successful sync</div><div className="value">{state.last_success_at ? new Date(state.last_success_at).toLocaleTimeString() : "Never"}</div>
        <p>{when(state.last_success_at)} · hourly at :17</p></div>
      <div><div className="metric-label">GrsAI models</div><div className="value">{state.model_count ?? "–"}<span className="unit">text and image</span></div>
        <p>Video stays out of the sync (OD-007).</p></div>
      <div><div className="metric-label">Cost basis</div><div className="value">{state.package_amount_minor ? formatMinor(state.package_amount_minor, "usd") : "–"}</div>
        <p>{state.package_credits ? `${BigInt(state.package_credits).toLocaleString("en-US")} credits per package` : "No package read yet"}</p></div>
    </section>
    <section className="panel admin-requests">
      <div className="table-head"><h2>Waiting for a decision</h2>
        <Button className="secondary" disabled={runNow.pending} onClick={async () => { if (await runNow.run("/v1/internal/upstream-sync", {}, "Sync finished.")) sync.reload(); }}>
          {runNow.pending ? "Syncing…" : "Sync now"}</Button></div>
      {(runNow.error || runNow.done) && <p className="section-note" role={runNow.error ? "alert" : "status"}>{runNow.error || runNow.done}</p>}
      {pending.length === 0 ? <p className="section-note">Nothing is waiting. Cost increases, closures and removals are applied automatically.</p>
        : <ChangeTable changes={pending} onResolve={(change, apply) => setResolving({ change, apply })} />}
    </section>
    <section className="panel admin-requests">
      <div className="table-head"><h2>Recent changes</h2><span className="small muted">Last 30 days</span></div>
      {history.length === 0 ? <p className="section-note">No changes yet.</p> : <ChangeTable changes={history} />}
      <p className="section-note">Customer prices are the GrsAI cost (credits × USD 150 package price ÷ package credits) times the markup. Increases become a new price version at once; decreases, new models and jumps beyond 3× wait here. Running requests keep the price they reserved.</p>
    </section>
    {resolving && <ResolveDialog {...resolving} onClose={() => setResolving(null)} reload={sync.reload} />}
    {acceptShrink && <ShrinkDialog onClose={() => setAcceptShrink(false)} reload={sync.reload} />}
  </>;
}

function ChangeTable({ changes, onResolve }: { changes: UpstreamChangeDto[]; onResolve?: (change: UpstreamChangeDto, apply: boolean) => void }) {
  return <div className="table-scroll" role="region" aria-label={onResolve ? "Pending GrsAI changes" : "Recent GrsAI changes"} tabIndex={0}>
    <table><thead><tr>{["SEEN", "MODEL", "CHANGE", "CURRENT COST", "NEW COST", onResolve ? "" : "STATUS"].map(label => <th scope="col" key={label}>{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
      <tbody>{changes.map(change => <tr key={change.id}>
        <td><time dateTime={change.created_at}>{new Date(change.created_at).toLocaleString()}</time></td>
        <td><strong>{change.name}</strong><div className="small muted mono">{change.model}</div></td>
        <td>{kindLabels[change.kind]}{change.note && <div className="small muted">{change.note}</div>}</td>
        <td>{cost(change.previous)}</td>
        <td>{cost(change.proposed)}</td>
        {onResolve ? <td><div className="key-actions">
          {change.kind !== "capability_changed" && <Button onClick={() => onResolve(change, true)}>{change.kind === "new_model" ? "Acknowledge" : "Apply"}</Button>}
          {change.kind !== "new_model" && <Button className="secondary" onClick={() => onResolve(change, false)}>Dismiss</Button>}
        </div></td> : <td><span className="small">{change.status}</span>{change.resolution_reason && <div className="small muted">{change.resolution_reason}</div>}</td>}
      </tr>)}</tbody></table>
  </div>;
}

const outcomes: Record<UpstreamChangeDto["kind"], [apply: string, dismiss: string]> = {
  price_decrease: ["Saves the lower cost as a new price version, so customers pay less.", "Keeps the current price; the same proposal is not raised again."],
  suspicious_price: ["Saves this cost as a new price version and re-enables the model if the sync disabled it.", "Keeps the current price. The model stays disabled until you enable it under Models."],
  new_model: ["Marks the model as reviewed. Enable it under Models when its limits and price are right.", ""],
  capability_changed: ["", "Closes this notice. Adjust the model manually."],
  price_increase: ["", ""], closed: ["", ""], reopened: ["", ""], missing: ["", ""],
};

function ResolveDialog({ change, apply, onClose, reload }: { change: UpstreamChangeDto; apply: boolean; onClose: () => void; reload: () => void }) {
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  async function submit() {
    if (await mutation.run(`/v1/internal/upstream-changes/${change.id}`, { reason: reason.trim(), apply }, apply ? "Change applied." : "Change dismissed.")) reload();
  }
  return <Dialog title={`${apply ? (change.kind === "new_model" ? "Acknowledge" : "Apply") : "Dismiss"}: ${change.name}`} onClose={onClose}>
    {mutation.done ? <p role="status">{mutation.done}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p>{kindLabels[change.kind]}: {cost(change.previous)} → {cost(change.proposed)}</p>
      <p>{outcomes[change.kind][apply ? 0 : 1]}</p>
      <div className="field"><label htmlFor="upstream-reason">Reason for the audit log (at least 3 characters)</label>
        <input id="upstream-reason" autoFocus required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
      <Button type="submit" disabled={reason.trim().length < 3 || mutation.pending}>{mutation.pending ? "Saving…" : apply ? "Confirm" : "Dismiss change"}</Button>
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </form>}
  </Dialog>;
}

function ShrinkDialog({ onClose, reload }: { onClose: () => void; reload: () => void }) {
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  async function submit() {
    if (await mutation.run("/v1/internal/upstream-sync", { accept_shrink: true, reason: reason.trim() }, "Smaller list accepted and synced.")) reload();
  }
  return <Dialog title="Accept the smaller GrsAI list?" onClose={onClose}>
    {mutation.done ? <p role="status">{mutation.done}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p>Every model missing from the current GrsAI list is disabled. Check grsai.com first: a broken response looks the same.</p>
      <div className="field"><label htmlFor="shrink-reason">Reason for the audit log (at least 3 characters)</label>
        <input id="shrink-reason" autoFocus required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
      <Button type="submit" className="danger" disabled={reason.trim().length < 3 || mutation.pending}>{mutation.pending ? "Syncing…" : "Accept and sync"}</Button>
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </form>}
  </Dialog>;
}
