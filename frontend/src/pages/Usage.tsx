import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeading from "../components/PageHeading";
import UsageRequestTable from "../components/UsageRequestTable";
import UsageSpendingChart from "../components/UsageSpendingChart";
import { waitForDemo, type DemoScenario } from "../data/demoClient";
import { filterUsage, isUsageRangeValid, readUsageFilters, usageRequests, usageTotals } from "../data/usageDemo";
import { usageCsv } from "../lib/usageExport";
import { useKeyDemo } from "../data/KeyDemoProvider";

const periods = { today: "Today", "7d": "7 days", "30d": "30 days", "6m": "6 months", all: "All time", custom: "Custom dates" };

export default function Usage() {
  const { keys } = useKeyDemo();
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const filters = readUsageFilters(params, now);
  const validRange = isUsageRangeValid(filters);
  const [preview, setPreview] = useState<DemoScenario>("success");
  const [historyState, setHistoryState] = useState<DemoScenario>("loading");
  const [exportPreview, setExportPreview] = useState<DemoScenario>("success");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState(false);
  const exportOperation = useRef<AbortController | null>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreExportFocus = useRef(false);
  const query = params.toString();

  useLayoutEffect(() => {
    if (!exporting && restoreExportFocus.current) {
      restoreExportFocus.current = false;
      exportButton.current?.focus();
    }
  }, [exporting]);

  useEffect(() => {
    const operation = new AbortController();
    setHistoryState("loading");
    void waitForDemo({ scenario: preview, signal: operation.signal }).then(() => {
      if (!operation.signal.aborted) setHistoryState(preview);
    }).catch(error => { if (error.name !== "AbortError") setHistoryState("error"); });
    return () => operation.abort();
  }, [preview]);

  // A download belongs to the exact visible filter snapshot. Navigation cancels it.
  useEffect(() => {
    setExporting(false);
    setExportMessage("");
    setExportError(false);
    return () => { exportOperation.current?.abort(); exportOperation.current = null; };
  }, [query, preview]);

  const records = historyState === "empty" ? [] : usageRequests;
  const filtered = filterUsage(records, filters, now);
  const totals = usageTotals(filtered);
  const ready = historyState === "success" || historyState === "empty";
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(filters.page, pageCount);

  function change(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params);
    if ((value === "all" && key !== "period") || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace, preventScrollReset: true });
  }

  async function exportHistory() {
    if (exportOperation.current || !ready || !validRange) return;
    const operation = new AbortController();
    exportOperation.current = operation;
    setExporting(true);
    setExportError(false);
    setExportMessage(`Preparing ${filtered.length} matching records...`);
    try {
      await waitForDemo({ scenario: exportPreview, signal: operation.signal, delayMs: 400 });
      if (operation.signal.aborted) return;
      if (exportPreview === "error") throw new Error("Simulated export failure");
      const url = URL.createObjectURL(new Blob([usageCsv(filtered)], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "takewing-demo-usage.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Give the browser time to consume the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage(`Exported ${filtered.length} matching records.`);
    } catch {
      if (operation.signal.aborted) return;
      setExportError(true);
      setExportMessage("Export failed. Your filters are preserved; you can export again.");
    } finally {
      if (exportOperation.current === operation) {
        restoreExportFocus.current = document.activeElement === cancelButton.current;
        exportOperation.current = null;
        setExporting(false);
      }
    }
  }

  const modelOptions = [...new Map(usageRequests.map(request => [request.modelId, request.modelName])).entries()];
  // Include keys before their first request; retain labels from historical records.
  const keyOptions = [...new Map([
    ...keys.map(key => [key.id, key.name] as const),
    ...usageRequests.map(request => [request.keyId, request.keyName] as const),
  ]).entries()];

  return <>
    <div className="demo-bar">
      <span>LOCAL DEMO · FICTIONAL REQUEST METADATA</span>
      <label>History response preview <select value={preview} onChange={event => setPreview(event.target.value as DemoScenario)}>
        <option value="success">Populated</option><option value="empty">Empty</option><option value="loading">Loading</option><option value="error">Load error</option>
      </select></label>
    </div>
    <PageHeading title="Usage & requests" description="Trace activity and understand where your credits go." />
    <p className="small muted">Times and date boundaries use {Intl.DateTimeFormat().resolvedOptions().timeZone}. All time includes every record in this demo history. Live history retention awaits the management API.</p>
    <section className="panel usage-controls" aria-label="Usage filters">
      <div className="filters">
        <label>Usage period <select value={filters.period} onChange={event => change("period", event.target.value)}>
          {Object.entries(periods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Filter model <select value={filters.model} onChange={event => change("model", event.target.value)}>
          <option value="all">All models</option>{modelOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          {filters.model !== "all" && !modelOptions.some(([id]) => id === filters.model) && <option value={filters.model}>Unknown model ({filters.model})</option>}
        </select></label>
        <label>Filter key <select value={filters.key} onChange={event => change("key", event.target.value)}>
          <option value="all">All keys</option>{keyOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          {filters.key !== "all" && !keyOptions.some(([id]) => id === filters.key) && <option value={filters.key}>Unknown key ({filters.key})</option>}
        </select></label>
        <label>Filter status <select value={filters.status} onChange={event => change("status", event.target.value)}>
          <option value="all">All statuses</option>{["completed", "failed", "pending", "unknown"].map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label>Search request ID <input type="search" value={filters.search} onChange={event => change("search", event.target.value, true)} placeholder="Search request ID" /></label>
      </div>
      {filters.period === "custom" && <div className="filters">
        <label>Start date <input type="date" value={filters.start} onChange={event => change("start", event.target.value)} /></label>
        <label>End date <input type="date" value={filters.end} onChange={event => change("end", event.target.value)} /></label>
        <span className="small muted">Both local dates are included.</span>
      </div>}
      {!validRange && <p role="alert">Choose a valid date range with the start on or before the end.</p>}
    </section>
    {historyState === "loading" && <p role="status">Loading request history...</p>}
    {historyState === "error" && <section className="notice error" role="alert"><h2>Request history could not be loaded</h2><p>Simulated read failure. Totals are unavailable.</p><button className="button secondary" onClick={() => setPreview("success")}>Reload history</button></section>}
    {ready && validRange && <>
      <div className="mini-stats" data-testid="usage-totals">
        <div><span className="metric-label">Matching requests</span><strong>{totals.requests}</strong></div>
        <div><span className="metric-label">Settled net credits</span><strong>{totals.credits}</strong></div>
        <div><span className="metric-label">Completed</span><strong>{totals.completed}</strong></div>
      </div>
      <p className="small muted">Charges less confirmed refunds, attributed to request start time. {totals.unsettled} request(s) awaiting billing confirmation are excluded from settled totals.</p>
      <UsageSpendingChart requests={filtered} />
      {historyState === "empty" && <p>No requests yet. <Link className="text-link" to="/dashboard/api-keys">Manage API keys</Link></p>}
      <UsageRequestTable requests={filtered.slice((page - 1) * 10, page * 10)} />
      <div className="table-foot usage-pagination">
        <span>Page {page} of {pageCount} · {filtered.length} matching requests</span>
        <div><button className="button secondary" disabled={page === 1} onClick={() => change("page", String(page - 1))}>Previous page</button>{" "}<button className="button secondary" disabled={page === pageCount} onClick={() => change("page", String(page + 1))}>Next page</button></div>
      </div>
    </>}
    <section className="panel usage-export" aria-label="Export usage">
      <div className="filters">
        <button ref={exportButton} className="button secondary" disabled={!ready || !validRange || exporting} onClick={() => void exportHistory()}>Export CSV</button>
        {exporting && <button ref={cancelButton} className="button secondary" onClick={() => {
          restoreExportFocus.current = true;
          exportOperation.current?.abort(); exportOperation.current = null; setExporting(false); setExportMessage("Export cancelled.");
        }}>Cancel export</button>}
        <label>Export response preview <select value={exportPreview} disabled={exporting} onChange={event => setExportPreview(event.target.value as DemoScenario)}><option value="success">Success</option><option value="loading">Slow / pending</option><option value="error">Failure</option></select></label>
      </div>
      <p className="small muted">Exports all matching records across every page. CSV includes UTC and local timestamps, timezone, duration in milliseconds, token/image counts and credit units. Unknown values stay blank. Text is escaped for spreadsheets; no secrets, prompts or outputs.</p>
      <p role={exportError ? "alert" : "status"}>{exportMessage}</p>
    </section>
  </>;
}
