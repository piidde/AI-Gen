import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyticsConfigured,
  readConsent,
  updateConsent,
} from "../seo/analytics";

// Consent gate for analytics and advertising tags. The service targets EU
// customers, so these tags may not load before the user agrees. The banner
// renders only when a tag is actually configured — local, preview and demo
// builds set no tag IDs and therefore show nothing and track nothing.
//
// "Reject" is presented at the same level as "Accept" on purpose: a reject
// path that is harder to reach than accept is not valid consent under GDPR.
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (analyticsConfigured && readConsent() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function decide(granted: boolean) {
    updateConsent({ analytics: granted, ads: granted });
    setVisible(false);
  }

  return (
    <div
      className="consent-banner"
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <div className="consent-inner">
        <div>
          <h2 id="consent-title">Cookies and measurement</h2>
          <p id="consent-description">
            We use analytics and advertising cookies to understand how the site
            is used and to measure our campaigns. They load only if you agree.
            Essential cookies needed to sign in are always active.{" "}
            <Link className="text-link" to="/privacy">
              Privacy information
            </Link>
          </p>
        </div>
        <div className="consent-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => decide(false)}
          >
            Reject
          </button>
          <button type="button" className="button" onClick={() => decide(true)}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
