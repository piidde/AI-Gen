import { Link, NavLink, Outlet } from "react-router-dom";
import Brand from "./Brand";
import Icon from "./Icon";
import type { IconName } from "./Icon";

const navigation: { path: string; label: string; icon: IconName }[] = [
  { path: "/dashboard", label: "Overview", icon: "overview" },
  { path: "/dashboard/models", label: "Models", icon: "models" },
  { path: "/dashboard/usage", label: "Usage & requests", icon: "usage" },
  { path: "/dashboard/billing", label: "Billing", icon: "billing" },
  { path: "/dashboard/api-keys", label: "API keys", icon: "keys" },
  { path: "/dashboard/settings", label: "Settings", icon: "settings" },
];
export default function DashboardLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">YOUR ACCOUNT</div>
        <nav className="dashboard-nav" aria-label="Dashboard">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <nav className="dashboard-nav" aria-label="Resources">
            <Link to="/information?topic=docs">Documentation ↗</Link>
            <Link to="/information?topic=support">Help & support ↗</Link>
          </nav>
          <div className="account">
            <span className="avatar">S</span>
            <div>
              Sample account
              <div className="small muted">Personal account · demo</div>
            </div>
          </div>
        </div>
      </aside>
      <main id="main-content" className="dashboard-main" tabIndex={-1}>
        <Outlet />
        <footer className="page-footer">
          Illustrative data only. No live account, payment or API connection.
        </footer>
      </main>
    </>
  );
}
