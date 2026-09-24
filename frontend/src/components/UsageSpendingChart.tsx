import type { UsageRequest } from "../data/viewModels";
import { usageDaily } from "../data/usageDemo";

export default function UsageSpendingChart({ requests }: { requests: UsageRequest[] }) {
  const days = usageDaily(requests);
  // Approximate numbers are used only for plot geometry. Text/totals stay exact.
  const max = Math.max(1, ...days.map(day => Number(day.credits)));
  return <section className="panel usage-spending" aria-label="Spending over time">
    <h2>Spending over time</h2>
    <p className="small muted">Settled net credits by local request day · same filters as the log</p>
    {days.length === 0 ? <p>No spending in this selection.</p> : <div className="spending-bars" role="list" aria-label="Daily settled credits" tabIndex={0}>
      {days.map(day => <div role="listitem" className="spending-day" key={day.day}>
        <span>{day.day}</span><span className="spending-track" aria-hidden="true"><span style={{ width: `${Number(day.credits) / max * 100}%` }} /></span><span>{day.credits} credits · {day.requests} requests</span>
      </div>)}
    </div>}
  </section>;
}
