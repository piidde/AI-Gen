import { useState } from "react";
import { Link } from "react-router-dom";
import { requests } from "../demo/fixtures";
import Dialog from "./Dialog";

export default function RequestTable({
  overview = false,
}: {
  overview?: boolean;
}) {
  const [status, setStatus] = useState("all");
  const [model, setModel] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(typeof requests)[number] | null>(
    null,
  );
  const shown = requests.filter(
    (request) =>
      (status === "all" || request.status === status) &&
      (model === "all" || request.model === model) &&
      request.id.includes(search.trim().toLowerCase()),
  );
  return (
    <section className="panel requests">
      <div className="table-head">
        <h2>{overview ? "Recent requests" : "Request log"}</h2>
        {overview ? (
          <Link className="text-link" to="/dashboard/usage">
            View all requests ↗
          </Link>
        ) : (
          <span className="small muted">Latest sample activity</span>
        )}
      </div>
      <div className="filters">
        <div className="filter-group">
          <select
            aria-label="Filter status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option>Completed</option>
            <option>Failed</option>
          </select>
          <select
            aria-label="Filter model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value="all">All models</option>
            <option value="A">Sample model A</option>
            <option value="B">Sample model B</option>
          </select>
        </div>
        <input
          type="search"
          className="search"
          aria-label="Search request ID"
          placeholder="Search request ID…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="Request log table"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              {[
                "TIME · UTC",
                "MODEL",
                "API KEY",
                "STATUS",
                "REQUEST ID",
                "CREDITS",
              ].map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((request) => (
              <tr key={request.id}>
                <td>
                  <time>{request.time}</time>
                </td>
                <td>
                  {overview && (
                    <span className="model-mark">{request.model}</span>
                  )}
                  Sample model {request.model}
                </td>
                <td>{request.key}</td>
                <td>
                  <span className={`status ${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </td>
                <td>{request.id}</td>
                <td>{request.credits}</td>
                <td>
                  <button
                    className="row-button"
                    aria-label={`Details for ${request.id}`}
                    onClick={() => setSelected(request)}
                  >
                    ↗
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7}>No requests match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span role="status">
          Showing {shown.length} of {requests.length} sample requests
        </span>
        <span>September 16 · sample data</span>
      </div>
      {selected && (
        <Dialog title="Request details" onClose={() => setSelected(null)}>
          <dl className="detail-grid">
            <div>
              <dt>Request ID</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selected.status}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>Sample model {selected.model}</dd>
            </div>
            <div>
              <dt>API key</dt>
              <dd>{selected.key}</dd>
            </div>
          </dl>
          <p>
            {selected.status === "Failed"
              ? "Illustrative error: request could not be completed. Exact error categories and billing treatment await the API contract."
              : "This is a fictional completed request."}
          </p>
          <p className="small">
            Metadata only. No prompt or generated output is stored in this demo.
          </p>
        </Dialog>
      )}
    </section>
  );
}
