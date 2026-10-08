import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FilterSelect from "../components/FilterSelect";
import "../styles/requests.css";
import UsageRequestTable from "../components/UsageRequestTable";
import { apiDownload, errorMessage, toUsageRequest, useApiResource, type ApiKeyDto, type ModelDto, type UsagePageDto } from "../data/api";
import { isUsageRangeValid, readUsageFilters, usagePeriod, type UsageFilters } from "../lib/usage";

const periods = { today: "Today", "7d": "7 days", "30d": "30 days", "6m": "6 months", "1y": "1 year", all: "All time", custom: "Custom dates" };
const PAGE_SIZE = 10;

// Local-day periods become absolute instants so the server filters exactly what the user sees.
function usageQuery(filters: UsageFilters, now: Date): URLSearchParams {
  const query = new URLSearchParams();
  const range = usagePeriod(filters, now);
  if (range) { query.set("from", range.start); query.set("to", range.endExclusive); }
  if (filters.model !== "all") query.set("model", filters.model);
  if (filters.key !== "all") query.set("key", filters.key);
  if (filters.status !== "all") query.set("outcome", filters.status);
  if (filters.search.trim()) query.set("search", filters.search.trim());
  return query;
}

export default function Usage() {
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => new Date());
  const filters = readUsageFilters(params, now);
  const validRange = isUsageRangeValid(filters);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState(false);
  const exportOperation = useRef<AbortController | null>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreExportFocus = useRef(false);
  const filterQuery = validRange ? usageQuery(filters, now) : null;
  const pageQuery = filterQuery ? new URLSearchParams(filterQuery) : null;
  pageQuery?.set("limit", String(PAGE_SIZE));
  pageQuery?.set("offset", String((filters.page - 1) * PAGE_SIZE));
  const history = useApiResource<UsagePageDto>(pageQuery ? `/v1/usage?${pageQuery}` : null);
  const keys = useApiResource<{ data: ApiKeyDto[] }>("/v1/api-keys");
  const models = useApiResource<{ data: ModelDto[] }>("/v1/models");
  const query = params.toString();

  useLayoutEffect(() => {
    if (!exporting && restoreExportFocus.current) {
      restoreExportFocus.current = false;
      exportButton.current?.focus();
    }
  }, [exporting]);

  // A download belongs to the exact visible filter snapshot. Navigation cancels it.
  useEffect(() => {
    setExporting(false);
    setExportMessage("");
    setExportError(false);
    return () => { exportOperation.current?.abort(); exportOperation.current = null; };
  }, [query]);

  const total = history.data?.total ?? 0;
  const ready = Boolean(history.data) && !history.loading;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const records = history.data?.data.map(toUsageRequest) ?? [];

  function change(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params);
    if ((value === "all" && key !== "period") || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace, preventScrollReset: true });
  }

  async function exportHistory() {
    if (exportOperation.current || !ready || !filterQuery) return;
    const operation = new AbortController();
    exportOperation.current = operation;
    setExporting(true);
    setExportError(false);
    setExportMessage(`Preparing ${total} matching records...`);
    try {
      const file = await apiDownload(`/v1/usage/export.csv?${filterQuery}`, operation.signal);
      if (operation.signal.aborted) return;
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "aiapi-deals-usage.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Give the browser time to consume the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage(file.truncated ? `Exported the newest ${file.rows} records. Narrow the filters to export the rest.` : `Exported ${file.rows} matching records.`);
    } catch (cause) {
      if (operation.signal.aborted) return;
      setExportError(true);
      setExportMessage(`${errorMessage(cause, "Export failed.")} Your filters are preserved; you can export again.`);
    } finally {
      if (exportOperation.current === operation) {
        restoreExportFocus.current = document.activeElement === cancelButton.current;
        exportOperation.current = null;
        setExporting(false);
      }
    }
  }

  const modelOptions = [...new Map([
    ...(models.data?.data ?? []).map(model => [model.id, model.name] as const),
    ...records.map(request => [request.modelId, request.modelName] as const),
  ]).entries()];
  const keyOptions = (keys.data?.data ?? []).map(key => [key.id, key.revoked_at ? `${key.name} (revoked)` : key.name] as const);

  return <div className="requests-page">
    <header className="requests-heading"><h1 tabIndex={-1}>Requests</h1><p>Find a request, check its result, or inspect the details.</p></header>
    <section className="requests-filters" aria-label="Request filters">
      <label className="request-search">Search request ID<input type="search" value={filters.search} onChange={event => change("search", event.target.value, true)} placeholder="Search request ID or model" /></label>
      <FilterSelect label="Request period" value={filters.period} options={Object.entries(periods).map(([value, label]) => ({ value, label }))} onChange={value => change("period", value)} />
      <FilterSelect label="Filter model" value={filters.model} options={[{ value: "all", label: "All models" }, ...modelOptions.map(([value, label]) => ({ value, label })), ...(filters.model !== "all" && !modelOptions.some(([id]) => id === filters.model) ? [{ value: filters.model, label: filters.model }] : [])]} onChange={value => change("model", value)} />
      <FilterSelect label="Filter key" value={filters.key} options={[{ value: "all", label: "All keys" }, ...keyOptions.map(([value, label]) => ({ value, label })), ...(filters.key !== "all" && !keyOptions.some(([id]) => id === filters.key) ? [{ value: filters.key, label: "Unknown key" }] : [])]} onChange={value => change("key", value)} />
      <FilterSelect label="Filter status" value={filters.status} options={[{ value: "all", label: "All statuses" }, { value: "pending", label: "In progress" }, { value: "completed", label: "Succeeded" }, { value: "failed", label: "Failed" }, { value: "unknown", label: "Unknown" }]} onChange={value => change("status", value)} />
      {filters.period === "custom" && <div className="request-dates"><label>Start date<input type="date" value={filters.start} onChange={event => change("start", event.target.value)} /></label><label>End date<input type="date" value={filters.end} onChange={event => change("end", event.target.value)} /></label><span>Both local dates are included.</span></div>}
      {!validRange && <p role="alert">Choose a valid date range with the start on or before the end.</p>}
    </section>
    <div className="request-context"><span>{history.data && validRange ? <><strong data-testid="request-count">{total}</strong> matching requests</> : "Request history"}</span><span>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
    {history.loading && <p role="status">Loading request history...</p>}
    {history.error && <section className="notice error" role="alert"><h2>Request history could not be loaded</h2><p>{history.error}</p><button className="button secondary" onClick={history.reload}>Reload history</button></section>}
    {history.data && validRange && <UsageRequestTable requests={records} />}
    <div className="requests-bottom">
      <div className="request-export"><button ref={exportButton} className="button secondary" disabled={!ready || !validRange || exporting || total === 0} onClick={() => void exportHistory()}>{exporting ? "Preparing CSV..." : "Export CSV"}</button>
        {exporting && <button ref={cancelButton} className="button secondary" onClick={() => { restoreExportFocus.current = true; exportOperation.current?.abort(); exportOperation.current = null; setExporting(false); setExportMessage("Export cancelled."); }}>Cancel export</button>}
        <span>All matching requests</span>
      </div>
      {history.data && validRange && <nav className="request-pagination" aria-label="Request pages"><span>Page {page} of {pageCount}</span><button className="button secondary" disabled={page === 1} onClick={() => change("page", String(page - 1))}>Previous page</button><button className="button secondary" disabled={page === pageCount} onClick={() => change("page", String(page + 1))}>Next page</button></nav>}
    </div>
    <p className="request-export-message" role={exportError ? "alert" : "status"}>{exportMessage}</p>
  </div>;
}
