import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FilterSelect from "../components/FilterSelect";
import TopModels from "../components/TopModels";
import "../styles/overview.css";
import { MetricIcon } from "../components/Icon";
import UsageChart from "../components/UsageChart";
import { useBillingDemo } from "../data/BillingDemoProvider";
import { usageRequests } from "../data/usageDemo";
import { overviewSummary, readDemoSavings, type DemoSavingsSummary, type OverviewPeriod } from "../data/overviewDemo";
import { waitForDemo } from "../data/demoClient";
import { updates } from "../content/serviceStatus";
import { formatLocalTime } from "../lib/formatting";
import type { UsageRequest } from "../data/viewModels";

type Snapshot = { records: UsageRequest[]; balance: string | null; asOf: string; savings: DemoSavingsSummary };

export default function Overview() {
  const { client } = useBillingDemo();
  const [params, setParams] = useSearchParams();
  const selectedPeriod = params.get("period") ?? "7d";
  const period = (["7d", "30d", "6m", "1y", "all"].includes(selectedPeriod) ? selectedPeriod : "7d") as OverviewPeriod;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);

  async function refresh() {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      await waitForDemo({ scenario: "success", signal: controller.signal, delayMs: 350 });
      if (controller.signal.aborted) return;
      const records = usageRequests;
      const asOf = new Date().toISOString();
      setSnapshot({ records, balance: client.read().balance, asOf, savings: readDemoSavings(records, asOf) });
    } catch {
      if (!controller.signal.aborted) setError("Refresh failed. Any previous snapshot is retained below and may be out of date. Try refreshing again.");
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
  }

  useEffect(() => {
    void refresh();
    return () => operation.current?.abort();
  }, [client]);

  const summary = snapshot ? overviewSummary(snapshot.records, period, new Date(snapshot.asOf)) : null;
  const savings = snapshot?.savings;
  const savingsTitle = savings?.coverage.status === "partial" ? "Savings for available history" : "All-time savings";
  const periodOptions = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "6m", label: "6 months" }, { value: "1y", label: "1 year" }, { value: "all", label: "All time" }];
  const periodLabel = periodOptions.find(option => option.value === period)!.label;

  return <div className="overview-page">
    <header className="overview-heading"><h1 tabIndex={-1}>Overview</h1>
      <FilterSelect label="Overview period" value={period} options={periodOptions} onChange={value => {
        const next = new URLSearchParams(params); next.set("period", value); setParams(next, { preventScrollReset: true });
      }} />
    </header>
    {busy && <p role="status">{snapshot ? "Refreshing account data; previous snapshot remains visible." : "Loading account data…"}</p>}
    {error && <div className="notice" role="alert"><p>{error}</p><button className="button secondary" onClick={() => void refresh()}>Try again</button></div>}
    {snapshot && summary && <>
      <section className="overview-metrics" aria-label="Account summary">
        <div><div className="metric-label"><MetricIcon name="wallet" />Account balance <span className="metric-scope">Current</span></div>
          <div className={`value ${snapshot.balance === null ? "" : "balance"}`} data-testid="overview-balance">{snapshot.balance === null ? "Unavailable" : <>{BigInt(snapshot.balance).toLocaleString("en-US")} <span className="unit">credits</span></>}</div>
          <div className="actions"><Link className="button" to="/dashboard/billing">Add credits +</Link><Link className="text-link" to="/dashboard/billing">Billing history ↗</Link></div>
          <p>Credits never expire.</p>
        </div>
        <div><div className="metric-label"><MetricIcon name="usage" />Credits used <span className="metric-scope">{periodLabel}</span></div><div className="value" data-testid="overview-credits">{summary.totals.credits}</div>
          <p>Net settled credits · {periodLabel}</p>{summary.totals.unsettled > 0 && <p>{summary.totals.unsettled} requests awaiting billing confirmation; excluded from credits used.</p>}</div>
        <div><div className="metric-label"><MetricIcon name="requests" />Total requests <span className="metric-scope">{periodLabel}</span></div><div className="value" data-testid="overview-requests">{summary.totals.requests}</div>
          <p>{summary.totals.completed} completed · {summary.totals.failed} failed</p><p>{summary.totals.pending} pending · {summary.totals.unknown} unknown</p></div>
      <section className="overview-savings" aria-label={savingsTitle}>
        <h2 className="metric-label">{savingsTitle}</h2>
        {savings?.coverage.status === "partial" && <p>History is incomplete. This is not an all-time total. Coverage starts {formatLocalTime(savings.coverage.start)}.</p>}
        {savings?.status === "available" ? <><p className="savings-intro">You saved</p><p className="savings-value">{Number(savings.differenceUsd).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p><p>Compared with official API pricing.</p>
          <p>Fictional USD comparison · {savings.comparedRequests} requests compared · {savings.excludedRequests} excluded. {savings.excludedRequests > 0 ? "Partial comparison coverage." : "Full comparison coverage."}</p>
          </>
          : <p>{savings?.status === "empty" ? "No request history yet. Savings will appear when comparable, settled usage is available." : `Savings unavailable. ${savings?.reason ?? "Historical comparisons could not be loaded."}`}</p>}
      </section>
      </section>
      <div className="overview-split">
        {snapshot.records.length ? <div className="overview-chart-card"><UsageChart daily={summary.daily} totals={summary.totals} granularity={period === "7d" || period === "30d" ? "day" : "month"} /><Link className="text-link overview-usage-link" to={`/dashboard/usage?period=${period}`}>View usage details</Link></div> : <section className="overview-start"><h2>Make your first API request</h2><p>Choose credits, create a key and follow the quickstart from your own application. There is no request history to chart yet.</p><ol><li><Link to="/dashboard/billing">Purchase credits</Link></li><li><Link to="/dashboard/api-keys">Create an API key</Link></li><li><Link to="/docs">Open the quickstart</Link></li></ol><p className="small muted">Account tools are demos; working API instructions await the verified contract.</p></section>}
        <div className="overview-side"><TopModels models={summary.topModels} /><aside className="news"><h2>Updates & announcements</h2>{[...updates].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2).map(update => <article key={update.slug}>
          <span className="tag announcement">Sample announcement</span><h3>{update.title}</h3><time className="small muted" dateTime={update.publishedAt}>{formatLocalTime(update.publishedAt)}</time><p>{update.summary}</p><Link className="text-link" to={`/updates/${update.slug}`}>Read update ↗</Link>
        </article>)}<p><Link className="text-link" to="/updates">All updates</Link></p></aside></div>
      </div>
    </>}
  </div>;
}
