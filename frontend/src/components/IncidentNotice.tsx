import { Link, useLocation } from "react-router-dom";
import { getServiceStatus, readStatusScenario, statusHref } from "../content/serviceStatus";
import "../styles/service-status.css";

export default function IncidentNotice() {
  const { search } = useLocation();
  const status = getServiceStatus(readStatusScenario(search));
  return <aside className="incident-notice" aria-label="Service status notice">
    <div><strong>{status.title}</strong><p>{status.description}</p></div>
    <Link className="text-link" to={statusHref(search)}>View status and notices →</Link>
  </aside>;
}
