import { useEffect, useState } from "react";
import { analyticsConfigured, readConsent, subscribeConsent, updateConsent } from "../seo/analytics";

export default function CookiePreferences() {
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setAllowed(readConsent()?.analytics ?? false);
    return subscribeConsent(() => {
    setAllowed(readConsent()?.analytics ?? false);
    setMessage("");
  }); }, []);
  function save(analytics: boolean) {
    // Advertising is outside the accepted organic-only launch scope.
    const persisted = updateConsent({ analytics, ads: false });
    setAllowed(analytics);
    setMessage(persisted
      ? "Cookie preferences saved. You can change them here at any time."
      : "Your choice applies to this page only because your browser could not save it. After a reload, an earlier saved preference may apply; check your browser storage settings.");
  }
  return <section id="cookie-preferences" className="help-section" tabIndex={-1}>
    <h2>Cookie preferences</h2>
    <p>Optional analytics requires your permission. Advertising stays off. Changing this choice does not remove cookies already stored by your browser.</p>
    {!analyticsConfigured && <p>No optional measurement tags are configured in this build.</p>}
    <label className="cookie-option"><input type="checkbox" checked={allowed} onChange={event => { setAllowed(event.target.checked); setMessage(""); }} /> Allow analytics</label>
    <div className="actions"><button className="button secondary" onClick={() => save(false)}>Reject optional cookies</button><button className="button" onClick={() => save(allowed)}>Save cookie preferences</button></div>
    <p role="status">{message}</p>
  </section>;
}
