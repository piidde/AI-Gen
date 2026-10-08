import { useEffect, useState } from "react";
import AdminControls from "../components/AdminControls";
import AdminModels from "../components/AdminModels";
import AdminOffers from "../components/AdminOffers";
import Button from "../components/Button";
import FilterSelect from "../components/FilterSelect";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import Tabs from "../components/Tabs";
import { formatUsd, useApiResource, type Resource } from "../data/api";
import { usePolling, type AdminRequestDto, type OpsDto } from "../data/admin";
import "../styles/admin.css";

const sections = ["Live", "Controls", "Models", "Offers"] as const;
type Section = typeof sections[number];

export default function Admin() {
  const check = useApiResource<{ authorized: boolean }>("/v1/internal/admin-check");
  if (!check.data) return <div className="admin-page">
    <PageHeading title="Admin" description="Live operations and platform controls." />
    {check.error ? <section className="notice error" role="alert"><p>{check.error}</p><Button className="secondary" onClick={check.reload}>Try again</Button></section>
      : <p role="status">Checking administrator access…</p>}
  </div>;
  if (!check.data.authorized) return <div className="admin-page">
    <PageHeading title="Admin" description="Live operations and platform controls." />
    <section className="notice"><h2>Administrator access required</h2><p>This account is not listed in ADMIN_USER_IDS.</p></section>
  </div>;
  return <AdminConsole />;
}

function AdminConsole() {
  const [section, setSection] = useState<Section>("Live");
  const ops = useApiResource<OpsDto>("/v1/internal/ops");
  return <div className="admin-page">
    <PageHeading title="Admin" description="Live operations and platform controls. Every change is written to the audit log with your reason." />
    <Tabs label="Admin sections" options={sections} value={section} onChange={setSection} panelId="admin-section" className="admin-tabs" />
    <div id="admin-section" role="tabpanel">
      {ops.error && <section className="notice error" role="alert"><p>{ops.error}</p><Button className="secondary" onClick={ops.reload}>Try again</Button></section>}
      {!ops.data ? !ops.error && <p role="status">Loading operations…</p>
        : section === "Live" ? <AdminLive ops={ops} />
        : section === "Controls" ? <AdminControls summary={ops.data.summary} reload={ops.reload} />
        : section === "Models" ? <AdminModels models={ops.data.models} globalMarkupBps={ops.data.summary.markup_bps} reload={ops.reload} />
        : <AdminOffers offers={ops.data.offers} reload={ops.reload} />}
    </div>
  </div>;
}

const stateOptions = [{ value: "all", label: "All states" }, { value: "active", label: "Running" }, { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" }, { value: "unknown", label: "Unknown outcome" }, { value: "expired", label: "Expired" }];

function stateClass(state: string): string {
  if (state === "succeeded") return "status";
  if (state === "failed" || state === "unknown") return "status failed";
  if (state === "expired") return "status revoked";
  return "status pending";
}

function usage(request: AdminRequestDto): string {
  if (request.capability === "text") return `${request.input_tokens ?? "–"} in · ${request.output_tokens ?? "–"} out`;
  return request.capability === "image" ? `${request.units} image${request.units === 1 ? "" : "s"}` : `${request.units} s`;
}

function AdminLive({ ops }: { ops: Resource<OpsDto> }) {
  const [state, setState] = useState("all");
  const [paused, setPaused] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const requests = useApiResource<{ data: AdminRequestDto[] }>(`/v1/internal/requests?limit=100${state === "all" ? "" : `&state=${state}`}`);
  usePolling(requests.reload, 5_000, paused);
  usePolling(ops.reload, 15_000, paused);
  useEffect(() => { if (requests.data) setUpdatedAt(new Date()); }, [requests.data]);
  const summary = ops.data!.summary;
  const group = summary.provider_groups[0];
  const margin = BigInt(summary.customer_charge_24h_micros) - BigInt(summary.provider_cost_24h_micros);
  const committed = group ? BigInt(group.spent_micros) + BigInt(group.reserved_micros) : 0n;
  return <>
    {!summary.accepting_requests && <section className="notice error" role="alert"><h2>New requests are paused</h2><p>Generation endpoints reject new requests. Resume them under Controls.</p></section>}
    <section className="admin-metrics" aria-label="Live operations">
      <div><div className="metric-label"><MetricIcon name="requests" />Running now</div><div className="value">{summary.in_flight_requests}</div>
        <p>{summary.queued_requests} queued{summary.queued_requests > 0 && ` · oldest ${summary.oldest_queued_seconds}s`}</p>
        <p>Limit {summary.max_concurrent_per_account} per account</p></div>
      <div><div className="metric-label"><MetricIcon name="usage" />Requests</div><div className="value">{summary.requests_1h}<span className="unit">last hour</span></div>
        <p>{summary.requests_24h} in 24 h · {summary.completed_24h} succeeded · {summary.failed_24h} failed</p></div>
      <div><div className="metric-label"><MetricIcon name="wallet" />Charged 24 h</div><div className="value">{formatUsd(summary.customer_charge_24h_micros)}</div>
        <p>GrsAI cost {formatUsd(summary.provider_cost_24h_micros)} · margin {formatUsd(margin.toString())}</p></div>
      <div><div className="metric-label"><MetricIcon name="billing" />GrsAI budget</div>
        <div className="value">{group?.budget_limit_micros ? formatUsd(committed.toString()) : "Not set"}</div>
        <p>{group?.budget_limit_micros ? `of ${formatUsd(group.budget_limit_micros)} used or reserved` : "Requests are blocked until a budget is set."}{group && !group.enabled && " · provider disabled"}</p></div>
      <div className={summary.unresolved_reservations > 0 ? "attention" : ""}><div className="metric-label"><MetricIcon name="bell" />Unknown outcomes</div><div className="value">{summary.unknown_requests}</div>
        <p>{summary.unresolved_reservations} still hold a reservation (released after 24 h)</p></div>
      <div><div className="metric-label"><MetricIcon name="profile" />Platform</div><div className="value">{summary.models}<span className="unit">models enabled</span></div>
        <p>{summary.active_accounts} accounts · {summary.active_keys} active keys</p></div>
    </section>
    <section className="panel admin-requests">
      <div className="table-head"><h2>Requests</h2>
        <span className="small muted" role="status">{paused ? "Paused" : "Live, every 5 s"}{updatedAt && ` · updated ${updatedAt.toLocaleTimeString()}`}</span></div>
      <div className="filters">
        <FilterSelect id="admin-request-state" label="Request state" value={state} options={stateOptions} onChange={setState} />
        <Button className="secondary" onClick={() => setPaused(value => !value)}>{paused ? "Resume live updates" : "Pause live updates"}</Button>
      </div>
      {requests.error && <p className="section-note" role="alert">{requests.error}</p>}
      <div className="table-scroll" role="region" aria-label="Recent requests across all accounts" tabIndex={0}>
        <table><thead><tr>{["TIME", "STATE", "MODEL", "ACCOUNT", "KEY", "USAGE", "CHARGED", "DURATION", "ERROR"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{requests.data?.data.map(request => <tr key={request.id}>
            <td><time dateTime={request.created_at} title={request.id}>{new Date(request.created_at).toLocaleTimeString()}</time></td>
            <td><span className={stateClass(request.state)}>{request.state.replace("_", " ")}</span></td>
            <td>{request.model}</td>
            <td className="mono" title={request.account_id}>{request.account_id.slice(0, 8)}</td>
            <td className="mono">{request.api_key_prefix ?? "–"}</td>
            <td>{usage(request)}</td>
            <td>{request.charged_micros ? formatUsd(request.charged_micros) : <span className="muted" title="Reserved, not charged yet">{formatUsd(request.reserved_micros)} held</span>}</td>
            <td>{request.duration_ms === null ? "–" : `${(request.duration_ms / 1000).toFixed(1)} s`}</td>
            <td className="muted">{request.error_category ?? ""}</td>
          </tr>)}</tbody></table>
      </div>
      {requests.data && !requests.data.data.length && <p className="section-note">No requests in this view yet.</p>}
      <p className="section-note">Newest 100 requests, metadata only. Prompts and outputs are never stored, so they cannot be shown here.</p>
    </section>
  </>;
}
