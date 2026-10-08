import { useState } from "react";
import Button from "./Button";
import Dialog from "./Dialog";
import { formatUsd, microsToDecimal, usdToMicros } from "../data/api";
import { bpsToMultiplier, multiplierToBps, useMutation, type AdminModelDto } from "../data/admin";

const units = { text: "tokens", image: "request", video: "second" } as const;

// Mirrors the backend: ceil(provider price × markup).
function customerPrice(micros: string | null, bps: number | null): string {
  if (micros === null || bps === null) return "–";
  return formatUsd(((BigInt(micros) * BigInt(bps) + 9_999n) / 10_000n).toString());
}

function priceLines(model: AdminModelDto, bps: number | null): [string, string] {
  if (!model.unit) return ["No price", "–"];
  if (model.capability === "text") {
    return [`${formatUsd(model.input_micros ?? "0")} in · ${formatUsd(model.output_micros ?? "0")} out / 1M`,
      `${customerPrice(model.input_micros, bps)} in · ${customerPrice(model.output_micros, bps)} out / 1M`];
  }
  const per = model.capability === "image" ? "image" : "second";
  return [`${formatUsd(model.unit_micros ?? "0")} / ${per}`, `${customerPrice(model.unit_micros, bps)} / ${per}`];
}

export default function AdminModels({ models, globalMarkupBps, reload }: { models: AdminModelDto[]; globalMarkupBps: number | null; reload: () => void }) {
  const [toggling, setToggling] = useState<AdminModelDto | null>(null);
  const [editing, setEditing] = useState<AdminModelDto | null>(null);
  const [filter, setFilter] = useState("");
  const visible = models.filter(model => `${model.id} ${model.name}`.toLowerCase().includes(filter.trim().toLowerCase()));
  return <section className="panel">
    <div className="table-head"><h2>Models</h2><span className="small muted">{models.filter(model => model.enabled).length} of {models.length} enabled</span></div>
    <div className="filters"><input className="search" type="search" aria-label="Filter models" placeholder="Filter models" value={filter} onChange={event => setFilter(event.target.value)} /></div>
    <div className="table-scroll" role="region" aria-label="Model catalogue" tabIndex={0}>
      <table><thead><tr>{["MODEL", "TYPE", "STATUS", "GRSAI PRICE", "CUSTOMER PRICE", "LIMITS", "VERSION"].map(label => <th scope="col" key={label}>{label}</th>)}
        <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{visible.map(model => {
          const bps = model.markup_bps === null ? globalMarkupBps : Number(model.markup_bps);
          const [provider, customer] = priceLines(model, bps);
          return <tr key={model.id}>
            <td><strong>{model.name}</strong><div className="small muted mono">{model.id}</div></td>
            <td>{model.capability}</td>
            <td><span className={`status badge ${model.enabled ? "" : "revoked"}`}>{model.enabled ? "Enabled" : "Disabled"}</span></td>
            <td>{provider}</td>
            <td>{customer}{model.markup_bps !== null && <div className="small muted">own markup ×{bpsToMultiplier(model.markup_bps)}</div>}</td>
            <td className="small">{model.capability === "text" ? `${model.max_input_tokens ?? "–"} in / ${model.max_output_tokens ?? "–"} out` : `max ${model.max_units ?? "–"}`}</td>
            <td>{model.current_price_version ?? "–"}</td>
            <td><div className="key-actions">
              <Button className="secondary" onClick={() => setEditing(model)}>Edit price</Button>
              <Button className={model.enabled ? "danger" : ""} disabled={!model.enabled && !model.unit} onClick={() => setToggling(model)}>{model.enabled ? "Disable" : "Enable"}</Button>
            </div></td>
          </tr>;
        })}</tbody></table>
    </div>
    <p className="section-note">A model is offered only while it is enabled, has a complete verified price, the provider is enabled with a budget and new requests are accepted. Customer prices use the global markup ×{bpsToMultiplier(globalMarkupBps) || "–"} unless a model sets its own.</p>
    {toggling && <ToggleDialog model={toggling} onClose={() => setToggling(null)} reload={reload} />}
    {editing && <PriceDialog model={editing} onClose={() => setEditing(null)} reload={reload} />}
  </section>;
}

function ToggleDialog({ model, onClose, reload }: { model: AdminModelDto; onClose: () => void; reload: () => void }) {
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  const enable = !model.enabled;
  async function submit() {
    if (await mutation.run(`/v1/internal/models/${encodeURIComponent(model.id)}/enabled`, { reason: reason.trim(), enabled: enable },
      `${model.name} is now ${enable ? "enabled" : "disabled"}.`)) reload();
  }
  return <Dialog title={`${enable ? "Enable" : "Disable"} ${model.name}?`} onClose={onClose}>
    {mutation.done ? <p role="status">{mutation.done}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p>{enable ? `Customers can use it immediately at price version ${model.current_price_version}.` : "New requests for this model are rejected immediately. Running requests finish normally."}</p>
      <div className="field"><label htmlFor="toggle-reason">Reason for the audit log</label>
        <input id="toggle-reason" autoFocus required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
      <Button type="submit" className={enable ? "" : "danger"} disabled={reason.trim().length < 3 || mutation.pending}>{mutation.pending ? "Saving…" : enable ? "Enable model" : "Disable model"}</Button>
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </form>}
  </Dialog>;
}

function PriceDialog({ model, onClose, reload }: { model: AdminModelDto; onClose: () => void; reload: () => void }) {
  const text = model.capability === "text";
  const [input, setInput] = useState(model.input_micros ? microsToDecimal(model.input_micros) : "");
  const [output, setOutput] = useState(model.output_micros ? microsToDecimal(model.output_micros) : "");
  const [unitPrice, setUnitPrice] = useState(model.unit_micros ? microsToDecimal(model.unit_micros) : "");
  const [markup, setMarkup] = useState(bpsToMultiplier(model.markup_bps));
  const [maxInput, setMaxInput] = useState(String(model.max_input_tokens ?? ""));
  const [maxOutput, setMaxOutput] = useState(String(model.max_output_tokens ?? ""));
  const [maxUnits, setMaxUnits] = useState(String(model.max_units ?? ""));
  const [enabled, setEnabled] = useState(model.enabled);
  const [source, setSource] = useState(model.source_note ?? "");
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  const integer = (value: string, max: number) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max ? Number(value) : null;
  const body = {
    reason: reason.trim(), enabled, source_note: source.trim(), unit: units[model.capability],
    input_micros: text ? usdToMicros(input) : null, output_micros: text ? usdToMicros(output) : null,
    unit_micros: text ? null : usdToMicros(unitPrice),
    markup_bps: markup.trim() ? multiplierToBps(markup)?.toString() ?? "invalid" : null,
    max_input_tokens: text ? integer(maxInput, 1_000_000) : null, max_output_tokens: text ? integer(maxOutput, 100_000) : null,
    max_units: text ? null : integer(maxUnits, 120), parameter_schema: model.parameter_schema,
  };
  const valid = body.reason.length >= 3 && body.source_note.length >= 5 && body.markup_bps !== "invalid"
    && (text ? body.input_micros && body.output_micros && body.max_input_tokens && body.max_output_tokens : body.unit_micros && body.max_units);
  async function submit() {
    if (valid && await mutation.run(`/v1/internal/models/${encodeURIComponent(model.id)}`, body, `Saved a new price version for ${model.name}.`)) reload();
  }
  return <Dialog title={`Price for ${model.name}`} onClose={onClose}>
    {mutation.done ? <p role="status">{mutation.done}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <p>Saving creates a new verified price version. Running requests keep the price they were reserved with.</p>
      {text ? <>
        <div className="field"><label htmlFor="price-in">GrsAI input price (USD per 1M tokens)</label><input id="price-in" inputMode="decimal" required value={input} onChange={event => setInput(event.target.value)} /></div>
        <div className="field"><label htmlFor="price-out">GrsAI output price (USD per 1M tokens)</label><input id="price-out" inputMode="decimal" required value={output} onChange={event => setOutput(event.target.value)} /></div>
        <div className="field"><label htmlFor="max-in">Max input tokens</label><input id="max-in" type="number" min={1} max={1_000_000} required value={maxInput} onChange={event => setMaxInput(event.target.value)} /></div>
        <div className="field"><label htmlFor="max-out">Max output tokens</label><input id="max-out" type="number" min={1} max={100_000} required value={maxOutput} onChange={event => setMaxOutput(event.target.value)} />
          <p>Credits are reserved for this maximum before each call.</p></div>
      </> : <>
        <div className="field"><label htmlFor="price-unit">GrsAI price (USD per {model.capability === "image" ? "image" : "second"})</label><input id="price-unit" inputMode="decimal" required value={unitPrice} onChange={event => setUnitPrice(event.target.value)} /></div>
        <div className="field"><label htmlFor="max-units">Max {model.capability === "image" ? "images" : "seconds"} per request</label><input id="max-units" type="number" min={1} max={120} required value={maxUnits} onChange={event => setMaxUnits(event.target.value)} /></div>
      </>}
      <div className="field"><label htmlFor="price-markup">Own markup (multiplier, empty = global)</label><input id="price-markup" inputMode="decimal" value={markup} onChange={event => setMarkup(event.target.value)} /></div>
      <div className="field"><label htmlFor="price-source">Price source</label><input id="price-source" required minLength={5} maxLength={500} value={source} onChange={event => setSource(event.target.value)} placeholder="For example, grsai.com/dashboard/models on 2026-10-08" /></div>
      <label className="admin-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enabled after saving</label>
      <div className="field"><label htmlFor="price-reason">Reason for the audit log</label><input id="price-reason" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
      <Button type="submit" disabled={!valid || mutation.pending}>{mutation.pending ? "Saving…" : "Save price version"}</Button>
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </form>}
  </Dialog>;
}
