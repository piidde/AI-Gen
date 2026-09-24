import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterSelect from "../components/FilterSelect";
import "../styles/requests.css";
import UsageRequestTable from "../components/UsageRequestTable";
import { waitForDemo, type DemoScenario } from "../data/demoClient";
import { filterUsage, isUsageRangeValid, readUsageFilters, usageRequests } from "../data/usageDemo";
import { usageCsv } from "../lib/usageExport";
import { useKeyDemo } from "../data/KeyDemoProvider";

const periods = { today: "Today", "7d": "7 days", "30d": "30 days", "6m": "6 months", "1y": "1 year", all: "All time", custom: "Custom dates" };

export default function Usage() {
  const { keys } = useKeyDemo();
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const filters = readUsageFilters(params, now);
  const validRange = isUsageRangeValid(filters);
  const [reload, setReload] = useState(0);
  const [historyState, setHistoryState] = useState<DemoScenario>("loading");
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
    void waitForDemo({ scenario: "success", signal: operation.signal }).then(() => {
      if (!operation.signal.aborted) setHistoryState("success");
    }).catch(error => { if (error.name !== "AbortError") setHistoryState("error"); });
    return () => operation.abort();
  }, [reload]);

  // A download belongs to the exact visible filter snapshot. Navigation cancels it.
  useEffect(() => {
    setExporting(false);
    setExportMessage("");
    setExportError(false);
    return () => { exportOperation.current?.abort(); exportOperation.current = null; };
  }, [query, reload]);

  const records = historyState === "empty" ? [] : usageRequests;
  const filtered = filterUsage(records, filters, now);
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
      await waitForDemo({ scenario: "success", signal: operation.signal, delayMs: 400 });
      if (operation.signal.aborted) return;
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

  return <div className="requests-page">
    <header className="requests-heading"><h1 tabIndex={-1}>Requests</h1><p>Find a request, check its result, or inspect the details.</p></header>
    <section className="requests-filters" aria-label="Request filters">
      <label className="request-search">Search request ID<input type="search" value={filters.search} onChange={event => change("search", event.target.value, true)} placeholder="Search request ID" /></label>
      <FilterSelect label="Request period" value={filters.period} options={Object.entries(periods).map(([value, label]) => ({ value, label }))} onChange={value => change("period", value)} />
      <FilterSelect label="Filter model" value={filters.model} options={[{ value: "all", label: "All models" }, ...modelOptions.map(([value, label]) => ({ value, label })), ...(filters.model !== "all" && !modelOptions.some(([id]) => id === filters.model) ? [{ value: filters.model, label: "Unknown model (" + filters.model + ")" }] : [])]} onChange={value => change("model", value)} />
      <FilterSelect label="Filter key" value={filters.key} options={[{ value: "all", label: "All keys" }, ...keyOptions.map(([value, label]) => ({ value, label })), ...(filters.key !== "all" && !keyOptions.some(([id]) => id === filters.key) ? [{ value: filters.key, label: "Unknown key (" + filters.key + ")" }] : [])]} onChange={value => change("key", value)} />
      <FilterSelect label="Filter status" value={filters.status} options={[{ value: "all", label: "All statuses" }, { value: "pending", label: "In progress" }, { value: "completed", label: "Succeeded" }, { value: "failed", label: "Failed" }, { value: "unknown", label: "Unknown" }]} onChange={value => change("status", value)} />
      {filters.period === "custom" && <div className="request-dates"><label>Start date<input type="date" value={filters.start} onChange={event => change("start", event.target.value)} /></label><label>End date<input type="date" value={filters.end} onChange={event => change("end", event.target.value)} /></label><span>Both local dates are included.</span></div>}
      {!validRange && <p role="alert">Choose a valid date range with the start on or before the end.</p>}
    </section>
    <div className="request-context"><span>{ready && validRange ? <><strong data-testid="request-count">{filtered.length}</strong> matching requests</> : "Request history"}</span><span>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
    {historyState === "loading" && <p role="status">Loading request history...</p>}
    {historyState === "error" && <section className="notice error" role="alert"><h2>Request history could not be loaded</h2><p>Try again to load your requests.</p><button className="button secondary" onClick={() => setReload(value => value + 1)}>Reload history</button></section>}
    {ready && validRange && <UsageRequestTable requests={filtered.slice((page - 1) * 10, page * 10)} />}
    <div className="requests-bottom">
      <div className="request-export"><button ref={exportButton} className="button secondary" disabled={!ready || !validRange || exporting} onClick={() => void exportHistory()}>{exporting ? "Preparing CSV..." : "Export CSV"}</button>
        {exporting && <button ref={cancelButton} className="button secondary" onClick={() => { restoreExportFocus.current = true; exportOperation.current?.abort(); exportOperation.current = null; setExporting(false); setExportMessage("Export cancelled."); }}>Cancel export</button>}
        <span>All matching requests</span>
      </div>
      {ready && validRange && <nav className="request-pagination" aria-label="Request pages"><span>Page {page} of {pageCount}</span><button className="button secondary" disabled={page === 1} onClick={() => change("page", String(page - 1))}>Previous page</button><button className="button secondary" disabled={page === pageCount} onClick={() => change("page", String(page + 1))}>Next page</button></nav>}
    </div>
    <p className="request-export-message" role={exportError ? "alert" : "status"}>{exportMessage}</p>
  </div>;
}
