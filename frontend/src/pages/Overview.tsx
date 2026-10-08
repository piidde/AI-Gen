import { Link, useSearchParams } from "react-router-dom";
import FilterSelect from "../components/FilterSelect";
import TopModels, { type TopModel } from "../components/TopModels";
import "../styles/overview.css";
import { MetricIcon } from "../components/Icon";
import UsageChart from "../components/UsageChart";
import { formatUsd, microsToDecimal, useApiResource, type SavingsDto, type SummaryDto, type UsageOverviewDto } from "../data/api";
import { updates } from "../content/serviceStatus";
import { formatLocalTime } from "../lib/formatting";

type OverviewPeriod = "7d" | "30d" | "6m" | "1y" | "all";
type Point = { day: string; requests: number; credits: string };

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

// The server returns only days with activity; fill the gaps (UTC) and bucket long periods by month.
function chartSeries(overview: UsageOverviewDto, period: OverviewPeriod, now: Date): Point[] {
  const monthly = period === "6m" || period === "1y" || period === "all";
  const buckets = new Map<string, { requests: number; micros: bigint }>();
  for (const row of overview.daily) {
    const key = monthly ? `${row.day.slice(0, 7)}-01` : row.day;
    const bucket = buckets.get(key) ?? { requests: 0, micros: 0n };
    bucket.requests += row.requests;
    bucket.micros += BigInt(row.credits_micros);
    buckets.set(key, bucket);
  }
  const first = overview.from ? new Date(overview.from) : overview.daily[0] ? new Date(`${overview.daily[0].day}T00:00:00Z`) : now;
  const keys: string[] = [];
  if (monthly) {
    const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
    while (cursor <= now) { keys.push(utcDay(cursor)); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
  } else {
    const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()));
    while (cursor <= now) { keys.push(utcDay(cursor)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
  }
  return keys.map(day => {
    const bucket = buckets.get(day);
    return { day, requests: bucket?.requests ?? 0, credits: microsToDecimal((bucket?.micros ?? 0n).toString()) };
  });
}

function topModels(overview: UsageOverviewDto): TopModel[] {
  const total = BigInt(overview.totals.credits_micros);
  if (total <= 0n) return [];
  return overview.models.filter(model => BigInt(model.credits_micros) > 0n).slice(0, 4).map(model => ({
    modelId: model.model, modelName: model.name, credits: microsToDecimal(model.credits_micros),
    percent: Number(BigInt(model.credits_micros) * 1000n / total) / 10,
  }));
}

export default function Overview() {
  const [params, setParams] = useSearchParams();
  const selectedPeriod = params.get("period") ?? "7d";
  const period = (["7d", "30d", "6m", "1y", "all"].includes(selectedPeriod) ? selectedPeriod : "7d") as OverviewPeriod;
  const summary = useApiResource<SummaryDto>("/v1/dashboard/summary");
  const overview = useApiResource<UsageOverviewDto>(`/v1/usage/overview?period=${period}`);
  const savings = useApiResource<SavingsDto>("/v1/dashboard/savings?period=all");
  const periodOptions = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "6m", label: "6 months" }, { value: "1y", label: "1 year" }, { value: "all", label: "All time" }];
  const periodLabel = periodOptions.find(option => option.value === period)!.label;
  const totals = overview.data?.totals;
  const unsettled = totals ? totals.pending + totals.unknown : 0;
  const busy = summary.loading || overview.loading;
  const error = summary.error || overview.error;
  const announcements = [...updates].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2);
  const reload = () => { summary.reload(); overview.reload(); savings.reload(); };
  const saved = savings.data;
  const savedMicros = saved ? BigInt(saved.saved_micros) : 0n;

  return <div className="overview-page">
    <header className="overview-heading"><h1 tabIndex={-1}>Overview</h1>
      <FilterSelect label="Overview period" value={period} options={periodOptions} onChange={value => {
        const next = new URLSearchParams(params); next.set("period", value); setParams(next, { preventScrollReset: true });
      }} />
    </header>
    {busy && <p role="status">{totals ? "Refreshing account data; previous figures remain visible." : "Loading account data…"}</p>}
    {error && <div className="notice" role="alert"><p>{error}</p><button className="button secondary" onClick={reload}>Try again</button></div>}
    {summary.data && totals && overview.data && <>
      <section className="overview-metrics" aria-label="Account summary">
        <div><div className="metric-label"><MetricIcon name="wallet" />Account balance <span className="metric-scope">Current</span></div>
          <div className="value balance" data-testid="overview-balance">{formatUsd(summary.data.available_credits_micros)}</div>
          <div className="actions"><Link className="button" to="/dashboard/billing">Add credits +</Link><Link className="text-link" to="/dashboard/billing">Billing history ↗</Link></div>
          <p>Credits never expire.{BigInt(summary.data.reserved_credits_micros) > 0n && ` ${formatUsd(summary.data.reserved_credits_micros)} reserved for running requests.`}</p>
          {summary.data.suspended && <p role="alert">This account is suspended. Contact support.</p>}
        </div>
        <div><div className="metric-label"><MetricIcon name="usage" />Charged <span className="metric-scope">{periodLabel}</span></div><div className="value" data-testid="overview-credits">{formatUsd(totals.credits_micros)}</div>
          <p>Settled charges · {periodLabel}</p>{unsettled > 0 && <p>{unsettled} requests awaiting confirmation; not included yet.</p>}</div>
        <div><div className="metric-label"><MetricIcon name="requests" />Total requests <span className="metric-scope">{periodLabel}</span></div><div className="value" data-testid="overview-requests">{totals.requests}</div>
          <p>{totals.completed} completed · {totals.failed} failed</p><p>{totals.pending} pending · {totals.unknown} unknown</p></div>
      <section className="overview-savings" aria-label="All-time savings">
        <h2 className="metric-label">All-time savings</h2>
        {savings.error ? <p>Savings unavailable. {savings.error}</p>
          : !saved ? <p>Loading savings…</p>
          : saved.compared_requests > 0 ? <><p className="savings-intro">{savedMicros >= 0n ? "You saved" : "Difference"}</p><p className="savings-value" data-testid="overview-savings">{formatUsd(saved.saved_micros)}</p><p>Compared with official list prices for the same usage.</p>
            <p>{saved.compared_requests} requests compared · {saved.excluded_no_reference + saved.excluded_not_settled} excluded{saved.excluded_no_reference > 0 ? ` (${saved.excluded_no_reference} without an official reference price)` : ""}.</p></>
          : <p>{saved.excluded_no_reference + saved.excluded_not_settled === 0 ? "No request history yet. Savings appear once settled usage can be compared." : "No settled requests can be compared with an official reference price yet."}</p>}
      </section>
      </section>
      <div className="overview-split">
        {totals.requests ? <div className="overview-chart-card"><UsageChart daily={chartSeries(overview.data, period, new Date())} totals={{ requests: totals.requests, credits: microsToDecimal(totals.credits_micros) }} granularity={period === "7d" || period === "30d" ? "day" : "month"} timezone="UTC" /><Link className="text-link overview-usage-link" to={`/dashboard/usage?period=${period}`}>View usage details</Link></div>
          : <section className="overview-start"><h2>Make your first API request</h2><p>Add credits, create a key and follow the quickstart from your own application. There is no request history in this period yet.</p><ol><li><Link to="/dashboard/billing">Add credits</Link></li><li><Link to="/dashboard/api-keys">Create an API key</Link></li><li><Link to="/docs">Open the quickstart</Link></li></ol></section>}
        <div className="overview-side"><TopModels models={topModels(overview.data)} /><aside className="news"><h2>Updates & announcements</h2>
          {announcements.length ? announcements.map(update => <article key={update.slug}>
            <span className="tag announcement">Announcement</span><h3>{update.title}</h3><time className="small muted" dateTime={update.publishedAt}>{formatLocalTime(update.publishedAt)}</time><p>{update.summary}</p><Link className="text-link" to={`/updates/${update.slug}`}>Read update ↗</Link>
          </article>) : <p className="muted">No announcements yet.</p>}
          <p><Link className="text-link" to="/updates">All updates</Link></p></aside></div>
      </div>
    </>}
  </div>;
}
