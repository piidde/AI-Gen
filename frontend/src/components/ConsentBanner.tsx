import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyticsConfigured,
  readConsent,
  subscribeConsent,
  updateConsent,
} from "../seo/analytics";

// Consent gate for optional analytics. The service targets EU customers,
// so analytics may not load before the user agrees. The banner
// renders only when a tag is actually configured — local, preview and demo
// builds set no tag IDs and therefore show nothing and track nothing.
//
// "Reject" is presented at the same level as "Accept" on purpose: a reject
// path that is harder to reach than accept is not valid consent under GDPR.
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const show = analyticsConfigured && readConsent() === null;
      if (!show && bannerRef.current?.contains(document.activeElement)) {
        const heading = document.querySelector("h1");
        if (heading instanceof HTMLElement) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
      setVisible(show);
    };
    sync();
    return subscribeConsent(sync);
  }, []);

  // The banner is fixed, so the page must reserve the height it occupies or it
  // covers the footer. Measure the outer box rather than assume: text wraps at
  // different widths and the border must not overlap the final content pixel.
  useLayoutEffect(() => {
    const banner = bannerRef.current;
    const root = document.documentElement;
    const body = document.body;
    if (!banner) {
      root.style.removeProperty("--consent-banner-height");
      body.removeAttribute("data-consent-banner-visible");
      return;
    }
    body.dataset.consentBannerVisible = "true";
    const setBannerHeight = () => {
      root.style.setProperty(
        "--consent-banner-height",
        `${Math.ceil(banner.getBoundingClientRect().height)}px`,
      );
    };
    const observer = new ResizeObserver(setBannerHeight);
    setBannerHeight();
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-height");
      body.removeAttribute("data-consent-banner-visible");
    };
  }, [visible]);

  if (!visible) return null;

  function decide(granted: boolean) {
    updateConsent({ analytics: granted, ads: false });
  }

  return (
    <div
      ref={bannerRef}
      className="consent-banner"
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <div className="consent-inner">
        <div>
          <h2 id="consent-title">Cookies and measurement</h2>
          <p id="consent-description">
            We use optional analytics to understand how the site is used.
            Analytics loads only if you agree. Advertising stays off.
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
