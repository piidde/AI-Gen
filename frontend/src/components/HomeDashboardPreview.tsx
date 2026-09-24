import { useEffect, useState } from 'react';
import UsageChart from './UsageChart';
import UsageRequestTable from './UsageRequestTable';
import { overviewSummary } from '../data/overviewDemo';
import { homeDashboardRequests } from '../data/homeDashboardDemo';

export default function HomeDashboardPreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // The real dashboard's demo history is relative to the browser clock and locale.
  // Match its client-side loading boundary instead of prerendering volatile dates.
  if (!ready) return <div className="panel home-dashboard-preview" aria-label="Dashboard preview with fictional data"><p>Loading demo overview...</p></div>;
  const now = new Date();
  const previewSummary = overviewSummary(homeDashboardRequests(now), '7d', now);
  return (<div className="panel home-dashboard-preview" aria-label="Dashboard preview with fictional data">
              <div className="home-preview-top"><span>Account / Overview</span><span>Dashboard excerpt · Fictional data</span></div>
              <div className="home-preview-heading"><h3>Overview</h3><span>Last 7 days</span></div>
              <div className="home-preview-metrics">
                <div><span>Available balance</span><strong>333,000<small> credits</small></strong></div>
                <div><span>Credits used</span><strong>{previewSummary.totals.credits}</strong></div>
                <div><span>Total requests</span><strong>{previewSummary.totals.requests}</strong></div>
              </div>
              <div className="home-preview-chart"><UsageChart daily={previewSummary.daily} totals={previewSummary.totals} /></div>
              <UsageRequestTable requests={previewSummary.recent.slice(0, 2)} overview />
            </div>);
}
