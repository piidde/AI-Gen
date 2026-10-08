import { useState } from "react";
import Button from "./Button";
import { microsToDecimal, usdToMicros } from "../data/api";
import { bpsToMultiplier, multiplierToBps, useMutation, type OpsSummaryDto } from "../data/admin";

// Values that live in wrangler.jsonc or a provider dashboard; changing them needs a deploy.
const infrastructure = [
  ["Rate limit per API key or session", "300 requests / minute", "wrangler.jsonc → ratelimits → KEY_RATE_LIMITER"],
  ["Rate limit per IP address", "600 requests / minute", "wrangler.jsonc → ratelimits → IP_RATE_LIMITER"],
  ["Parallel media queue consumers", "4", "wrangler.jsonc → queues.consumers → max_concurrency"],
  ["Request body size", "4 MiB", "wrangler.jsonc → vars → MAX_REQUEST_BYTES"],
  ["Database capacity", "Supabase compute size", "Supabase dashboard → Project settings → Compute"],
] as const;

function budgetMicros(input: string): string | null {
  return /^\s*0+(?:[.,]0*)?\s*$/.test(input) ? "0" : usdToMicros(input);
}

export default function AdminControls({ summary, reload }: { summary: OpsSummaryDto; reload: () => void }) {
  const group = summary.provider_groups[0];
  const [accepting, setAccepting] = useState(summary.accepting_requests);
  const [concurrency, setConcurrency] = useState(String(summary.max_concurrent_per_account));
  const [ttl, setTtl] = useState(String(summary.result_ttl_hours));
  const [controlsReason, setControlsReason] = useState("");
  const [providerEnabled, setProviderEnabled] = useState(group?.enabled ?? false);
  const [budget, setBudget] = useState(group?.budget_limit_micros ? microsToDecimal(group.budget_limit_micros) : "");
  const [markup, setMarkup] = useState(bpsToMultiplier(summary.markup_bps));
  const [providerReason, setProviderReason] = useState("");
  const controls = useMutation();
  const provider = useMutation();
  const concurrencyValue = Number(concurrency);
  const controlsValid = Number.isInteger(concurrencyValue) && concurrencyValue >= 1 && concurrencyValue <= 100
    && Number.isInteger(Number(ttl)) && Number(ttl) >= 1 && Number(ttl) <= 48 && controlsReason.trim().length >= 3;
  const budgetValue = budgetMicros(budget);
  const markupValue = multiplierToBps(markup);
  const providerValid = group && budgetValue !== null && markupValue !== null && providerReason.trim().length >= 3;

  async function saveControls(acceptingRequests: boolean) {
    if (await controls.run("/v1/internal/controls", { reason: controlsReason.trim(), accepting_requests: acceptingRequests,
      result_ttl_hours: Number(ttl), max_concurrent_per_account: concurrencyValue }, "Controls saved.")) {
      setAccepting(acceptingRequests); setControlsReason(""); reload();
    }
  }

  async function saveProvider() {
    if (!providerValid) return;
    if (await provider.run("/v1/internal/provider", { reason: providerReason.trim(), group_id: group.id, enabled: providerEnabled,
      budget_limit_micros: budgetValue, markup_bps: markupValue, accepting_requests: summary.accepting_requests,
      result_ttl_hours: summary.result_ttl_hours }, "Provider settings saved.")) {
      setProviderReason(""); reload();
    }
  }

  return <div className="admin-grid">
    <section className="panel setting-section">
      <h2>Service controls</h2>
      <p>Applies to new requests immediately. Running requests are not interrupted.</p>
      <form onSubmit={event => { event.preventDefault(); void saveControls(accepting); }}>
        <label className="admin-check"><input type="checkbox" checked={accepting} onChange={event => setAccepting(event.target.checked)} /> Accept new generation requests</label>
        <div className="field"><label htmlFor="admin-concurrency">Concurrent requests per account</label>
          <input id="admin-concurrency" type="number" min={1} max={100} required value={concurrency} onChange={event => setConcurrency(event.target.value)} />
          <p>Each running request reserves credits and GrsAI budget. Higher values let one customer use more throughput (1–100).</p></div>
        <div className="field"><label htmlFor="admin-ttl">Result retention (hours)</label>
          <input id="admin-ttl" type="number" min={1} max={48} required value={ttl} onChange={event => setTtl(event.target.value)} />
          <p>How long future results stay downloadable (1–48).</p></div>
        <div className="field"><label htmlFor="admin-controls-reason">Reason for the audit log</label>
          <input id="admin-controls-reason" required minLength={3} maxLength={500} value={controlsReason} onChange={event => setControlsReason(event.target.value)} placeholder="For example, launch: raise limit to 5" /></div>
        <div className="form-footer">
          <Button type="submit" disabled={!controlsValid || controls.pending}>{controls.pending ? "Saving…" : "Save controls"}</Button>
          {summary.accepting_requests && <Button className="danger" disabled={controlsReason.trim().length < 3 || controls.pending}
            onClick={() => void saveControls(false)}>Stop all new requests</Button>}
          {controls.done && <span className="save-status" role="status">{controls.done}</span>}
          {controls.error && <span className="save-status error" role="alert">{controls.error}</span>}
        </div>
      </form>
    </section>
    <section className="panel setting-section">
      <h2>GrsAI provider</h2>
      <p>The budget caps total GrsAI spend, including reservations for running requests. It cannot be set below what is already used.</p>
      {group ? <form onSubmit={event => { event.preventDefault(); void saveProvider(); }}>
        <label className="admin-check"><input type="checkbox" checked={providerEnabled} onChange={event => setProviderEnabled(event.target.checked)} /> Provider enabled</label>
        <div className="field"><label htmlFor="admin-budget">Spending limit (USD)</label>
          <input id="admin-budget" inputMode="decimal" required value={budget} onChange={event => setBudget(event.target.value)} placeholder="500" />
          <p>Used or reserved so far: ${microsToDecimal((BigInt(group.spent_micros) + BigInt(group.reserved_micros)).toString())}</p></div>
        <div className="field"><label htmlFor="admin-markup">Global markup (multiplier)</label>
          <input id="admin-markup" inputMode="decimal" required value={markup} onChange={event => setMarkup(event.target.value)} placeholder="2.0" />
          <p>Customer price = GrsAI price × markup, unless a model has its own markup. 2.0 means +100 %.</p></div>
        <div className="field"><label htmlFor="admin-provider-reason">Reason for the audit log</label>
          <input id="admin-provider-reason" required minLength={3} maxLength={500} value={providerReason} onChange={event => setProviderReason(event.target.value)} placeholder="For example, topped up GrsAI credits" /></div>
        <div className="form-footer">
          <Button type="submit" disabled={!providerValid || provider.pending}>{provider.pending ? "Saving…" : "Save provider"}</Button>
          {provider.done && <span className="save-status" role="status">{provider.done}</span>}
          {provider.error && <span className="save-status error" role="alert">{provider.error}</span>}
        </div>
      </form> : <p role="alert">No provider group is configured.</p>}
    </section>
    <section className="panel setting-section admin-infra">
      <h2>Deploy-time limits</h2>
      <p>These cannot change at runtime. Edit the named setting and deploy.</p>
      <dl>{infrastructure.map(([label, value, where]) => <div key={label}><dt>{label}</dt><dd><strong>{value}</strong><span>{where}</span></dd></div>)}</dl>
    </section>
  </div>;
}
