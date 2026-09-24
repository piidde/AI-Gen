import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "../auth/AuthProvider";
import { supabase, SUPABASE_CONFIG_ERROR } from "../auth/supabase";
import Button from "../components/Button";
import BillingDetailsForm from "../components/BillingDetailsForm";
import AccountAccess from "../components/AccountAccess";
import NotificationSettings from "../components/NotificationSettings";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import Tabs from "../components/Tabs";
import "../styles/settings.css";

const sections = ["Profile", "Security", "Notifications", "Billing"] as const;

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
  const [childDirty, setChildDirty] = useState(false);
  const [tab, setTab] = useState<(typeof sections)[number]>("Profile");
  const [name, setName] = useState(() => getDisplayName(user));
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedName, setSavedName] = useState(() => getDisplayName(user));
  const profileDirty = name.trim() !== savedName;
  const dirty = tab === "Profile" ? profileDirty : childDirty;
  const confirmDiscard = () => !dirty || window.confirm("Discard your unsaved changes?");

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm("Discard your unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty]);

  useEffect(() => {
    setName(getDisplayName(user));
    setSavedName(getDisplayName(user));
  }, [user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile || !profileDirty) return;

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
    setSavedName(displayName);
    setMessage("Profile saved.");
  }

  return (
    <>
      <PageHeading
        title="Account settings"
        description="Manage your profile, account access and notification preferences."
      />
        <Tabs
          label="Account settings"
          options={sections}
          value={tab}
          onChange={(value) => {
            if (value === tab || !confirmDiscard()) return;
            setName(savedName);
            setChildDirty(false);
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
                <Button type="submit" disabled={savingProfile || !profileDirty}>
                  {savingProfile ? "Saving..." : "Save changes"}
                </Button>
                <span
                  role="status"
                  className="save-status"
                >
                  {message}
                </span>
              </div>
            </form>

            </>
          )}
          {tab === "Security" && <AccountAccess />}
          {tab === "Notifications" && <NotificationSettings onDirtyChange={setChildDirty} />}
          {tab === "Billing" && <BillingDetailsForm onDirtyChange={setChildDirty} />}
        </section>


    </>
  );
}
