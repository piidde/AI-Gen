import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import Brand from "./Brand";
import Icon from "./Icon";
import type { IconName } from "./Icon";
import IncidentNotice from "./IncidentNotice";
import PublicFooter from "./PublicFooter";

const navigation: { path: string; label: string; icon: IconName }[] = [
  { path: "/dashboard", label: "Overview", icon: "overview" },
  { path: "/dashboard/models", label: "Models", icon: "models" },
  { path: "/dashboard/usage", label: "Usage & requests", icon: "usage" },
  { path: "/dashboard/billing", label: "Billing", icon: "billing" },
  { path: "/dashboard/api-keys", label: "API keys", icon: "keys" },
  { path: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function readMetadataString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const email = user?.email ?? "Signed-in account";
  const displayName =
    readMetadataString(user?.user_metadata?.full_name) ??
    readMetadataString(user?.user_metadata?.name) ??
    email;
  const avatarUrl =
    readMetadataString(user?.user_metadata?.avatar_url) ??
    readMetadataString(user?.user_metadata?.picture);
  const initial = displayName.charAt(0).toUpperCase() || "T";
  const provider = readMetadataString(user?.app_metadata?.provider);
  const providerLabel =
    provider === "google"
      ? "Google account"
      : provider === "discord"
        ? "Discord account"
        : "Authenticated account";

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountMenuRef.current?.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Sign out failed.",
      );
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-scroll">
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
        </div>
        <div className="sidebar-bottom">
          <nav className="dashboard-nav" aria-label="Resources">
            <Link to="/docs">Documentation ↗</Link>
            <Link to="/support">Help &amp; support ↗</Link>
            <Link to="/status">Service status ↗</Link>
            <Link to="/updates">Updates ↗</Link>
          </nav>
          <div className="account-menu" ref={accountMenuRef}>
            <button
              ref={accountTriggerRef}
              type="button"
              className="account-trigger"
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span className="avatar" aria-hidden="true">
                {avatarUrl && !avatarFailed ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  initial
                )}
              </span>
              <span className="account-copy">
                <span className="account-email">{email}</span>
                <span className="small muted">{providerLabel}</span>
              </span>
              <span className="account-chevron" aria-hidden="true">
                {accountMenuOpen ? "⌃" : "⌄"}
              </span>
            </button>
            {accountMenuOpen && (
              <div className="account-popover" id="account-menu" role="menu">
                <div className="account-popover-user">
                  <span className="avatar" aria-hidden="true">
                    {avatarUrl && !avatarFailed ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="account-popover-copy">
                    <strong>{displayName}</strong>
                    <span>{email}</span>
                  </span>
                </div>
                <div className="account-popover-provider">{providerLabel}</div>
                <div className="account-menu-divider" />
                <Link
                  className="account-menu-item"
                  to="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  Account settings
                </Link>
                <button
                  type="button"
                  className="account-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          {signOutError && (
            <p className="account-error" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      </aside>
      <main id="main-content" className="dashboard-main" tabIndex={-1}>
        <IncidentNotice />
        <Outlet />
        <footer className="page-footer">
          Illustrative dashboard data only. Payments, API access and usage connections are not live.
        </footer>
        <PublicFooter />
      </main>
    </>
  );
}
