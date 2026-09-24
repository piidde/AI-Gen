import { useState } from "react";
import { Link } from "react-router-dom";
import type { UsageRequest } from "../data/viewModels";
import { billingLabel } from "../data/usageDemo";
import { formatLocalTime } from "../lib/formatting";
import { requestSupportDetails, safeRequestError } from "../lib/supportDetails";
import Dialog from "./Dialog";
import CopyButton from "./CopyButton";

export default function UsageRequestTable({ requests, overview = false }: { requests: UsageRequest[]; overview?: boolean }) {
  const [selected, setSelected] = useState<UsageRequest | null>(null);
  const error = selected ? safeRequestError(selected) : null;
  return <section className="panel requests">
    <div className="table-head"><h2>{overview ? "Recent requests" : "Request log"}</h2>{overview ? <Link className="text-link" to="/dashboard/usage?period=all">View all requests ↗</Link> : <span className="small muted">Metadata only · demo history</span>}</div>
    <div className="table-scroll" role="region" aria-label="Request log table" tabIndex={0}>
      <table><thead><tr>{["TIME · LOCAL", "MODEL / VARIANT", "API KEY", "EXECUTION", "DURATION", "BILLING / CREDITS", "REQUEST ID"].map(label => <th scope="col" key={label}>{label}</th>)}<th scope="col"><span className="sr-only">Details</span></th></tr></thead>
        <tbody>{requests.map(request => <tr key={request.id}>
          <td><time dateTime={request.startedAt}>{formatLocalTime(request.startedAt)}</time></td>
          <td>{request.modelName}<br /><span className="small muted">{request.modelId}</span></td>
          <td>{request.keyName}</td><td><span className={`status ${request.outcome}`}>{request.outcome}</span></td>
          <td>{request.durationMs === null ? "Unavailable" : `${request.durationMs} ms`}</td><td>{billingLabel(request)}</td><td>{request.id}</td>
          <td><button className="row-button" aria-label={`Details for ${request.id}`} onClick={() => setSelected(request)}>↗</button></td>
        </tr>)}{requests.length === 0 && <tr><td colSpan={8}>No requests match these filters.</td></tr>}</tbody>
      </table>
    </div>
    {selected && <Dialog title="Request details" onClose={() => setSelected(null)}>
      <dl className="detail-grid">
        {Object.entries({ "Request ID": selected.id, "Started (local)": formatLocalTime(selected.startedAt), "Started (UTC)": selected.startedAt,
          "Completed (local)": formatLocalTime(selected.completedAt), Model: `${selected.modelName} · ${selected.modelId}`, "API key": selected.keyName,
          Execution: selected.outcome, Duration: selected.durationMs === null ? "Unavailable" : `${selected.durationMs} ms`, Billing: billingLabel(selected),
          "Rate version": "rateVersion" in selected.billing ? selected.billing.rateVersion : "Unavailable",
          "Input tokens": selected.inputTokens ?? "Not applicable / unavailable", "Output tokens": selected.outputTokens ?? "Not applicable / unavailable",
          "Cached input tokens": selected.cachedInputTokens ?? "Not applicable / unavailable", Images: selected.imageCount ?? "Not applicable / unavailable",
        }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {error && <div className="notice"><p><strong>{error.code}</strong>: {error.message}</p><p>{error.advice}</p></div>}
      {(selected.billing.status === "unknown" || selected.billing.status === "pending") && <p>Awaiting billing confirmation. Do not resubmit automatically; the original request may have incurred a charge.</p>}
      <p className="small">Metadata only. No prompt or generated output is stored in this demo. Charges and refunds shown here are fictional.</p>
      <CopyButton label="Copy support details" text={requestSupportDetails(selected)} />
      <p><Link className="text-link" to="/support">Get help</Link>{" · "}<Link className="text-link" to="/docs">API documentation</Link>{" · "}<Link className="text-link" to="/status">Service status</Link></p>
    </Dialog>}
  </section>;
}
