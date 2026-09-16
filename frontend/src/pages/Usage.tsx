import { useState } from "react";
import { Link } from "react-router-dom";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import PageHeading from "../components/PageHeading";
import { MetricIcon } from "../components/Icon";
import RequestTable from "../components/RequestTable";
import { summary } from "../demo/fixtures";

export default function Usage() {
  const [state, setState] = useState<DemoState>("populated");
  return (
    <>
      <DemoBar state={state} onChange={setState} />
      <PageHeading
        title="Usage & requests"
        description="Trace activity and understand where your credits go."
      >
        <div className="period">{summary.period} · UTC</div>
      </PageHeading>
      <DataState
        state={state}
        onRetry={() => setState("populated")}
        title="Request activity"
        emptyTitle="No requests yet"
        emptyContent={
          <p>
            Requests from your integration will appear here.{" "}
            <Link className="text-link" to="/dashboard/api-keys">
              Manage API keys ↗
            </Link>
          </p>
        }
      >
        <div className="mini-stats">
          <div>
            <span className="metric-label">
              <MetricIcon name="requests" />
              Requests
            </span>
            <strong>{summary.requests}</strong>
          </div>
          <div>
            <span className="metric-label">
              <MetricIcon name="usage" />
              Credits used
            </span>
            <strong>{summary.used}</strong>
          </div>
          <div>
            <span className="metric-label">
              <MetricIcon name="check" />
              Completed
            </span>
            <strong>{summary.completed}</strong>
          </div>
        </div>
        <RequestTable />
      </DataState>
    </>
  );
}
