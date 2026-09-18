import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase, SUPABASE_CONFIG_ERROR } from "../auth/supabase";
import Button from "../components/Button";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import Tabs from "../components/Tabs";
import { profile } from "../demo/fixtures";

const sections = ["Profile", "Security", "Notifications"] as const;

function readMetadataString(user: User | null, key: string): string {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getDisplayName(user: User | null): string {
  return (
    readMetadataString(user, "full_name") ||
    readMetadataString(user, "name") ||
    user?.email?.split("@")[0] ||
    ""
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [state, setState] = useState<DemoState>("populated");
  const [tab, setTab] = useState<(typeof sections)[number]>("Profile");
  const [name, setName] = useState(() => getDisplayName(user));
  const [productUpdates, setProductUpdates] = useState(profile.productUpdates);
  const [documentationUpdates, setDocumentationUpdates] = useState(
    profile.documentationUpdates,
  );
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [security, setSecurity] = useState(false);

  useEffect(() => {
    setName(getDisplayName(user));
  }, [user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "save-error") {
      setMessage("Simulated save failure. Your edits are still here.");
      return;
    }

    const displayName = name.trim();
    if (!displayName) {
      setMessage("Please enter a display name.");
      return;
    }
    if (!supabase || !user) {
      setMessage(SUPABASE_CONFIG_ERROR);
      return;
    }

    setSavingProfile(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });
    setSavingProfile(false);

    if (error) {
      setMessage(`Profile save failed: ${error.message}`);
      return;
    }

    setName(displayName);
    setMessage("Profile saved.");
  }

  function saveNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      state === "save-error"
        ? "Simulated save failure. Your edits are still here."
        : "Notification preferences remain local demo state and were not saved.",
    );
  }
  return (
    <>
      <DemoBar
        state={state}
        settings
        liveAccount
        onChange={(value) => {
          setState(value);
          setMessage("");
        }}
      />
      <PageHeading
        title="Account settings"
        description="Manage your profile, account access and notification preferences."
      />
      <DataState
        state={state}
        title="Account settings"
        emptyTitle="No settings"
        onRetry={() => setState("populated")}
      >
        <Tabs
          label="Account settings"
          options={sections}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setMessage("");
          }}
          panelId="settings-panel"
          className="settings-tabs"
        />
        <section
          id="settings-panel"
          className="settings-panel"
          role="tabpanel"
          aria-label={tab}
          tabIndex={0}
        >
          {tab === "Profile" && (
            <form className="panel setting-section" onSubmit={saveProfile}>
              <h2>
                <MetricIcon name="profile" />
                Profile details
              </h2>
              <p>
                Your display name helps identify your account in the dashboard.
              </p>
              <div className="field">
                <label htmlFor="display-name">Display name</label>
                <input
                  id="display-name"
                  required
                  pattern=".*\S.*"
                  maxLength={80}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setMessage("");
                  }}
                  aria-describedby="name-hint"
                  disabled={savingProfile}
                />
                <p id="name-hint">
                  Use the name you’d like displayed in your account.
                </p>
              </div>
              <div className="field">
                <label htmlFor="account-email">Email address</label>
                <input
                  id="account-email"
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  aria-describedby="email-hint"
                />
                <p id="email-hint">
                  Changing your sign-in email requires a verified account-access
                  flow.
                </p>
              </div>
              <div className="form-footer">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
                <span
                  role="status"
                  className={`save-status ${state === "save-error" ? "error" : ""}`}
                >
                  {message}
                </span>
              </div>
            </form>
          )}
          {tab === "Security" && (
            <>
              <div className="panel setting-section">
                <h2>
                  <MetricIcon name="keys" />
                  Account access
                </h2>
                <p>
                  Keep sign-in details and recovery options under your control.
                </p>
                <div className="setting-row">
                  <div>
                    <h3>Sign-in method</h3>
                    <p>
                      Available controls depend on your account’s authentication
                      method.
                    </p>
                  </div>
                  <Button
                    className="secondary"
                    onClick={() => setSecurity(true)}
                  >
                    Review sign-in options
                  </Button>
                </div>
                <div className="setting-row">
                  <div>
                    <h3>API access</h3>
                    <p>
                      Manage the keys used by your apps separately from account
                      sign-in.
                    </p>
                  </div>
                  <Link className="text-link" to="/dashboard/api-keys">
                    Manage API keys ↗
                  </Link>
                </div>
              </div>
              <p className="review-note">
                Authentication is connected through Supabase Auth. Password
                changes, multifactor authentication and session controls are
                not available in this first slice.
              </p>
            </>
          )}
          {tab === "Notifications" && (
            <>
              <form className="panel setting-section" onSubmit={saveNotifications}>
                <h2>
                  <MetricIcon name="bell" />
                  Notification preferences
                </h2>
                <p>Choose which optional updates you’d like to receive.</p>
                <label className="setting-row">
                  <span>
                    <strong>Product updates</strong>
                    <span className="setting-description">
                      News about features and improvements.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Product updates"
                    checked={productUpdates}
                    onChange={(event) => {
                      setProductUpdates(event.target.checked);
                      setMessage("");
                    }}
                  />
                </label>
                <label className="setting-row">
                  <span>
                    <strong>Documentation updates</strong>
                    <span className="setting-description">
                      Changes to guides and integration documentation.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Documentation updates"
                    checked={documentationUpdates}
                    onChange={(event) => {
                      setDocumentationUpdates(event.target.checked);
                      setMessage("");
                    }}
                  />
                </label>
                <div className="form-footer">
                  <Button type="submit">Save preferences</Button>
                  <span
                    role="status"
                    className={`save-status ${state === "save-error" ? "error" : ""}`}
                  >
                    {message}
                  </span>
                </div>
              </form>
              <p className="review-note">
                Demo categories only. Notification types and delivery channels
                are not finalized; these controls do not subscribe you to
                anything.
              </p>
            </>
          )}
        </section>
      </DataState>
      {security && (
        <Dialog title="Sign-in controls" onClose={() => setSecurity(false)}>
          <p>
            The final controls will match the chosen authentication system. This
            demo does not change passwords, sessions or recovery settings.
          </p>
        </Dialog>
      )}
    </>
  );
}
