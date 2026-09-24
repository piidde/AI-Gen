import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeading from "../components/PageHeading";
import { MetricIcon } from "../components/Icon";
import UsageRequestTable from "../components/UsageRequestTable";
import UsageChart from "../components/UsageChart";
import { useBillingDemo } from "../data/BillingDemoProvider";
import { usageRequests } from "../data/usageDemo";
import { overviewSummary, readDemoSavings, type DemoSavingsSummary } from "../data/overviewDemo";
import { waitForDemo } from "../data/demoClient";
import { updates } from "../content/serviceStatus";
import { formatLocalTime } from "../lib/formatting";
import type { UsageRequest } from "../data/viewModels";

type Snapshot = { records: UsageRequest[]; balance: string | null; asOf: string; savings: DemoSavingsSummary };
type Preview = "success" | "empty" | "loading" | "refresh-error" | "wallet-error" | "savings-unavailable" | "partial-history";

export default function Overview() {
  const { client } = useBillingDemo();
  const [params, setParams] = useSearchParams();
  const period = params.get("period") === "30d" ? "30d" : "7d";
  const [preview, setPreview] = useState<Preview>("success");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);

  async function refresh(scenario: Preview) {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      await waitForDemo({ scenario: scenario === "loading" ? "loading" : "success", signal: controller.signal, delayMs: 350 });
      if (controller.signal.aborted) return;
      if (scenario === "refresh-error") throw new Error("Simulated refresh failure");
      const records = scenario === "empty" ? [] : usageRequests;
      const asOf = new Date().toISOString();
      const partialHistory = scenario === "partial-history";
      setSnapshot({ records, balance: scenario === "wallet-error" ? null : client.read().balance, asOf,
        savings: readDemoSavings(partialHistory ? records.slice(0, 24) : records, asOf,
          scenario === "savings-unavailable" ? [] : undefined, !partialHistory) });
      if (scenario === "wallet-error") setError("Balance unavailable. Usage refreshed independently; no zero balance is implied.");
    } catch {
      if (!controller.signal.aborted) setError("Refresh failed. Any previous snapshot is retained below and may be out of date. Try refreshing again.");
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
  }

  useEffect(() => {
    void refresh("success");
    return () => operation.current?.abort();
  }, [client]);

  const summary = snapshot ? overviewSummary(snapshot.records, period, new Date(snapshot.asOf)) : null;
  const savings = snapshot?.savings;
  const savingsTitle = savings?.coverage.status === "partial" ? "Savings for available history" : "All-time savings";
  const periodLabel = period === "7d" ? "last 7 days" : "last 30 days";

  return <>
    <div className="demo-bar"><span>Account / Overview</span><span>LOCAL DEMO · FICTIONAL DATA · NO LIVE ACCOUNT</span></div>
    <PageHeading title="Overview" description="A clear view of your usage and available credits.">
      <label className="overview-period">Period <select aria-label="Overview period" value={period} onChange={event => {
        const next = new URLSearchParams(params); next.set("period", event.target.value); setParams(next, { preventScrollReset: true });
      }}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label>
    </PageHeading>
    <div className="overview-refresh">
      <span className="small muted">{snapshot ? <>Last updated (local): <time dateTime={snapshot.asOf}>{formatLocalTime(snapshot.asOf)}</time></> : "No account snapshot loaded"}</span>
      <button className="button secondary" onClick={() => void refresh(preview)}>Refresh overview</button>
      <label className="small">Overview preview <select value={preview} onChange={event => setPreview(event.target.value as Preview)}>
        <option value="success">Populated</option><option value="empty">No requests yet</option><option value="loading">Loading</option>
        <option value="refresh-error">Refresh failure</option><option value="wallet-error">Balance unavailable</option><option value="savings-unavailable">Comparison unavailable</option><option value="partial-history">Incomplete history</option>
      </select></label>
    </div>
    {busy && <p role="status">{snapshot ? "Refreshing demo account data; previous snapshot remains visible." : "Loading demo account data…"}</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {snapshot && summary && <>
      <section className="summary" aria-label="Account summary">
        <div><div className="metric-label"><MetricIcon name="wallet" />Available balance</div>
          <div className={`value ${snapshot.balance === null ? "" : "balance"}`} data-testid="overview-balance">{snapshot.balance === null ? "Unavailable" : <>{BigInt(snapshot.balance).toLocaleString("en-US")} <span className="unit">credits</span></>}</div>
          <div className="actions"><Link className="button" to="/dashboard/billing">Add credits +</Link><Link className="text-link" to="/dashboard/billing">Billing history ↗</Link></div>
          <p>Credits never expire.</p>
        </div>
        <div><div className="metric-label"><MetricIcon name="usage" />Credits used</div><div className="value" data-testid="overview-credits">{summary.totals.credits}</div>
          <p>Net settled credits · {periodLabel}</p>{summary.totals.unsettled > 0 && <p>{summary.totals.unsettled} requests awaiting billing confirmation; excluded from credits used.</p>}</div>
        <div><div className="metric-label"><MetricIcon name="requests" />Total requests</div><div className="value" data-testid="overview-requests">{summary.totals.requests}</div>
          <p>{summary.totals.completed} completed · {summary.totals.failed} failed</p><p>{summary.totals.pending} pending · {summary.totals.unknown} unknown</p></div>
      </section>
      <section className="overview-savings" aria-label={savingsTitle}>
        <h2>{savingsTitle}</h2>
        {savings?.coverage.status === "partial" && <p>History is incomplete. This is not an all-time total. Coverage starts {formatLocalTime(savings.coverage.start)}.</p>}
        {savings?.status === "available" ? <><p className="savings-value">You've saved ${savings.usd} compared with official API pricing.</p>
          <p>Fictional USD comparison · {savings.comparedRequests} requests compared · {savings.excludedRequests} excluded. {savings.excludedRequests > 0 ? "Partial comparison coverage." : "Full comparison coverage."}</p>
          </>
          : <p>{savings?.status === "empty" ? "No request history yet. Savings will appear when comparable, settled usage is available." : `Savings unavailable. ${savings?.reason ?? "Historical comparisons could not be loaded."}`}</p>}
        {savings && <details><summary>How this comparison works</summary><p>{savings.basis}</p>
          <p>{savings.totalRequests} recorded requests as of {formatLocalTime(savings.asOf)}. Coverage starts {formatLocalTime(savings.coverage.start)}. {savings.coverage.status === "complete" ? "Complete demo history." : "Incomplete demo history."}</p>
          <p>Excluded by reason: {Object.entries(savings.exclusionReasons).map(([reason, count]) => `${reason.replace(/([A-Z])/g, " $1").toLowerCase()}: ${count}`).join(" · ")}.</p>
          {savings.status === "available" && <p>Official Standard total: ${savings.officialUsd} USD; standard credit value: ${savings.standardChargeUsd} USD. {savings.monetaryApproximate ? "Amounts are rounded for this demo display." : "Exact demo comparison amounts."}</p>}
          <p>Basis version: {savings.basisVersion} · Revision: {savings.revision}.</p>
          <p>Only completed, finally settled, paid requests with equivalent historical official prices count. Failed, refunded (including partial refunds), free, pending, unknown and non-comparable requests are excluded. Retired models retain historical identity and comparison evidence. Later settlement corrections require an audited recalculation.</p><p>These are fictional historical records, not verified customer savings. The chart period and purchase bonuses do not change this comparison.</p>
        </details>}
      </section>
      <div className="overview-split">
        {snapshot.records.length ? <UsageChart daily={summary.daily} totals={summary.totals} /> : <section className="overview-start"><h2>Make your first API request</h2><p>Choose credits, create a key and follow the quickstart from your own application. There is no request history to chart yet.</p><ol><li><Link to="/dashboard/billing">Purchase credits</Link></li><li><Link to="/dashboard/api-keys">Create an API key</Link></li><li><Link to="/docs">Open the quickstart</Link></li></ol><p className="small muted">Account tools are demos; working API instructions await the verified contract.</p></section>}
        <aside className="news"><h2>Updates & announcements</h2>{[...updates].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2).map(update => <article key={update.slug}>
          <span className="tag announcement">Sample announcement</span><h3>{update.title}</h3><time className="small muted" dateTime={update.publishedAt}>{formatLocalTime(update.publishedAt)}</time><p>{update.summary}</p><Link className="text-link" to={`/updates/${update.slug}`}>Read update ↗</Link>
        </article>)}<p><Link className="text-link" to="/updates">All updates</Link></p></aside>
      </div>
      {snapshot.records.length > 0 && <UsageRequestTable requests={summary.recent} overview />}
    </>}
  </>;
}
