import { Link } from "react-router-dom";
import { useServiceStatus } from "../data/useServiceStatus";
import "../styles/service-status.css";

// Shown only while a published incident is open; silence is the normal state.
export default function IncidentNotice() {
  const status = useServiceStatus();
  const open = status.data?.incidents.filter(incident => !incident.resolvedAt) ?? [];
  if (!open.length) return null;
  return <aside className="incident-notice" aria-label="Service status notice">
    <div><strong>{open.length === 1 ? open[0]!.title : `${open.length} active incidents`}</strong><p>{open.length === 1 ? open[0]!.impact : "Some services are affected. See the status page for details."}</p></div>
    <Link className="text-link" to="/status">View status and notices →</Link>
  </aside>;
}
