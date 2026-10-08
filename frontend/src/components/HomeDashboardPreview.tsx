import { useEffect, useState } from 'react';
import UsageChart from './UsageChart';
import UsageRequestTable from './UsageRequestTable';
import { homeDashboardPreview } from '../data/homeDashboardDemo';
import { usd } from '../lib/usage';

export default function HomeDashboardPreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // The illustration is relative to the browser clock; render it client-side instead of prerendering volatile dates.
  if (!ready) return <div className="panel home-dashboard-preview" aria-label="Dashboard preview with fictional data"><p>Loading preview...</p></div>;
  const now = new Date();
  const previewSummary = homeDashboardPreview(now);
  return (<div className="panel home-dashboard-preview" aria-label="Dashboard preview with fictional data">
              <div className="home-preview-top"><span>Account / Overview</span><span>Dashboard excerpt · Fictional data</span></div>
              <div className="home-preview-heading"><h3>Overview</h3><span>Last 7 days</span></div>
              <div className="home-preview-metrics">
                <div><span>Available balance</span><strong>$25.00</strong></div>
                <div><span>Charged</span><strong>{usd(previewSummary.totals.credits)}</strong></div>
                <div><span>Total requests</span><strong>{previewSummary.totals.requests}</strong></div>
              </div>
              <div className="home-preview-chart"><UsageChart daily={previewSummary.daily} totals={previewSummary.totals} timezone={Intl.DateTimeFormat().resolvedOptions().timeZone} /></div>
              <UsageRequestTable requests={previewSummary.recent} overview />
            </div>);
}
