import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading";
import { MetricIcon } from "../components/Icon";
import RequestTable from "../components/RequestTable";
import UsageChart from "../components/UsageChart";
import { summary } from "../demo/fixtures";

export default function Overview() {
  return (
    <>
      <div className="demo-bar">
        <span>Account / Overview</span>
        <span>LOCAL DEMO · FICTIONAL DATA · NO LIVE ACCOUNT</span>
      </div>
      <PageHeading
        title="Overview"
        description="A clear view of your usage and available credits."
      >
        <div className="period">{summary.period} · Last 7 days</div>
      </PageHeading>
      <section className="summary">
        <div>
          <div className="metric-label">
            <MetricIcon name="wallet" />
            Available balance
          </div>
          <div className="value balance">
            {summary.balance} <span className="unit">credits</span>
          </div>
          <div className="actions">
            <Link className="button" to="/dashboard/billing">
              Add credits +
            </Link>
            <Link className="text-link" to="/dashboard/billing">
              Billing history ↗
            </Link>
          </div>
        </div>
        <div>
          <div className="metric-label">
            <MetricIcon name="usage" />
            Credits used
          </div>
          <div className="value">{summary.used}</div>
          <p>Across all models · last 7 days</p>
        </div>
        <div>
          <div className="metric-label">
            <MetricIcon name="requests" />
            Total requests
          </div>
          <div className="value">{summary.requests}</div>
          <p>
            {summary.completed} completed · {summary.failed} failed
          </p>
        </div>
      </section>
      <div className="overview-split">
        <UsageChart />
        <aside className="news">
          <h2>Updates & announcements</h2>
          <article>
            <span className="tag announcement">Sample announcement</span>
            <h3>Your first integration, step by step</h3>
            <p>
              From creating a key to inspecting your first request, start with
              the quickstart.
            </p>
            <Link className="text-link" to="/docs">
              Read the guide ↗
            </Link>
          </article>
          <article>
            <span className="tag">Account tip</span>
            <h3>One key for each integration</h3>
            <p>
              Give keys recognizable names so you can trace activity back to
              your tools.
            </p>
          </article>
        </aside>
      </div>
      <RequestTable overview />
    </>
  );
}
