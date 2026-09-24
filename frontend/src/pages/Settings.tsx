import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "../auth/AuthProvider";
import { supabase, SUPABASE_CONFIG_ERROR } from "../auth/supabase";
import Button from "../components/Button";
import BillingDetailsForm from "../components/BillingDetailsForm";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import AccountAccess from "../components/AccountAccess";
import NotificationSettings from "../components/NotificationSettings";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import Tabs from "../components/Tabs";

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
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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
            <>
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
                  Use the name you would like displayed in your account.
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
            <BillingDetailsForm />
            </>
          )}
          {tab === "Security" && <AccountAccess failSave={state === "save-error"} />}
          {tab === "Notifications" && <NotificationSettings failSave={state === "save-error"} />}
        </section>
      </DataState>

    </>
  );
}
