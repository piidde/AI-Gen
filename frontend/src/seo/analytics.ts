// Analytics and advertising tags, gated on consent.
//
// The service targets EU customers, so ePrivacy/GDPR apply: analytics and ads
// cookies need prior consent, and Google Consent Mode v2 additionally requires
// `ad_user_data` and `ad_personalization` signals or EEA remarketing and
// conversion measurement degrade. Nothing here loads a third-party script
// before consent is recorded — that ordering is the requirement, not a nicety.
//
// Tag IDs are configuration, not code. Unset IDs mean the tag never loads,
// which keeps preview and demo deployments free of tracking entirely.

export type ConsentState = {
  analytics: boolean;
  ads: boolean;
};

type ConsentSignal = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "takewing.consent";

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const adsConversionId = import.meta.env.VITE_ADS_CONVERSION_ID?.trim();

/** Consent recorded by the user, or null when they have not chosen yet. */
export function readConsent(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Partial<ConsentState>;
    return {
      analytics: value.analytics === true,
      ads: value.ads === true,
    };
  } catch {
    // Private mode or blocked storage: treat as no decision, never as consent.
    return null;
  }
}

export function storeConsent(consent: ConsentState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Consent still applies to this page view even if it cannot be persisted.
  }
}

function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

function signal(granted: boolean): ConsentSignal {
  return granted ? "granted" : "denied";
}

/**
 * Establish Consent Mode defaults. Must run before any tag loads so that
 * pre-consent page views are modelled rather than silently dropped.
 */
export function initConsentMode(): void {
  if (!measurementId && !adsConversionId) return;
  const consent = readConsent();
  gtag("consent", "default", {
    ad_storage: signal(consent?.ads ?? false),
    ad_user_data: signal(consent?.ads ?? false),
    ad_personalization: signal(consent?.ads ?? false),
    analytics_storage: signal(consent?.analytics ?? false),
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

/** Push a consent update after the user chooses. */
export function updateConsent(consent: ConsentState): void {
  storeConsent(consent);
  if (!measurementId && !adsConversionId) return;
  gtag("consent", "update", {
    ad_storage: signal(consent.ads),
    ad_user_data: signal(consent.ads),
    ad_personalization: signal(consent.ads),
    analytics_storage: signal(consent.analytics),
  });
  if (consent.analytics || consent.ads) {
    loadTagScript();
  }
}

let scriptRequested = false;

/** Load gtag.js once, only after consent allows analytics or ads. */
function loadTagScript(): void {
  const tagId = measurementId ?? adsConversionId;
  if (!tagId || scriptRequested) return;
  scriptRequested = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  if (measurementId) {
    // Manual page views: the SPA router, not the script load, marks navigation.
    gtag("config", measurementId, { send_page_view: false });
  }
  if (adsConversionId) {
    gtag("config", adsConversionId);
  }
}

/** Start tags if the user has already consented in a previous session. */
export function initAnalytics(): void {
  initConsentMode();
  const consent = readConsent();
  if (consent?.analytics || consent?.ads) {
    loadTagScript();
  }
}

/** Record a page view for a client-side navigation. */
export function trackPageView(path: string, title: string): void {
  if (!measurementId) return;
  const consent = readConsent();
  if (!consent?.analytics) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

/** Whether any tag is configured, so the consent banner can stay hidden. */
export const analyticsConfigured = Boolean(measurementId || adsConversionId);
