// Analytics tags, gated on consent. Advertising is excluded from launch scope.
//
// Optional analytics requires prior consent. Advertising consent signals stay
// denied, including when an earlier stored decision allowed advertising.
// Nothing here loads a third-party script before analytics consent is recorded.
//
// Tag IDs are configuration, not code. Unset IDs mean the tag never loads,
// which keeps preview and demo deployments free of tracking entirely.

import { createPublicLandingEvent, pathWithoutQuery, type FunnelEvent } from "./funnel";
import { publicRoutes } from "./routes";

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
const CONSENT_CHANGED = "takewing:consent-changed";
let pageConsent: ConsentState | undefined;
let consentStorageSubscribed = false;
let funnelInitialized = false;

/** Keep mounted consent controls synchronized after either control saves. */
export function subscribeConsent(listener: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED, listener);
  return () => window.removeEventListener(CONSENT_CHANGED, listener);
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
// VITE_ADS_CONVERSION_ID is deliberately ignored for the organic-only launch.

/** Consent recorded by the user, or null when they have not chosen yet. */
export function readConsent(): ConsentState | null {
  if (pageConsent) return pageConsent;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Partial<ConsentState>;
    return {
      analytics: value.analytics === true,
      ads: false,
    };
  } catch {
    // Private mode or blocked storage: treat as no decision, never as consent.
    return null;
  }
}

export function storeConsent(consent: ConsentState): boolean {
  // The latest decision must win even when a previous grant cannot be overwritten.
  pageConsent = { analytics: consent.analytics, ads: false };
  let persisted = false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pageConsent));
    persisted = true;
  } catch {
    // Consent still applies to this page view even if it cannot be persisted.
  }
  return persisted;
}

function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

function signal(granted: boolean): ConsentSignal {
  return granted ? "granted" : "denied";
}

function setCollectionDisabled(disabled: boolean): void {
  if (!measurementId) return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = disabled;
}

function applyConsentSignal(consent: ConsentState): void {
  if (!measurementId) return;
  // Google's documented programmatic opt-out prevents collection after revoke.
  setCollectionDisabled(!consent.analytics);
  gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: signal(consent.analytics),
  });
  if (consent.analytics) loadTagScript();
}

function subscribeConsentStorage(): void {
  if (consentStorageSubscribed) return;
  consentStorageSubscribed = true;
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    pageConsent = undefined;
    const consent = readConsent() ?? { analytics: false, ads: false };
    applyConsentSignal(consent);
    window.dispatchEvent(new Event(CONSENT_CHANGED));
  });
}

/**
 * Establish Consent Mode defaults before any tag loads. Pre-consent page views
 * are not sent; the script itself remains gated on analytics permission.
 */
export function initConsentMode(): void {
  if (!measurementId) return;
  const consent = readConsent();
  setCollectionDisabled(!(consent?.analytics ?? false));
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: signal(consent?.analytics ?? false),
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

/** Push a consent update after the user chooses. */
export function updateConsent(consent: ConsentState): boolean {
  const persisted = storeConsent(consent);
  applyConsentSignal({ analytics: consent.analytics, ads: false });
  // Notify consumers only after consent and tag configuration are queued.
  window.dispatchEvent(new Event(CONSENT_CHANGED));
  return persisted;
}

let scriptRequested = false;

/** Load gtag.js once, only after consent allows analytics. */
function loadTagScript(): void {
  const tagId = measurementId;
  if (!tagId || scriptRequested) return;
  scriptRequested = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  if (measurementId) {
    // Manual page views avoid automatic URL/referrer capture. Enhanced
    // measurement must also stay disabled in the GA property at deployment.
    const initialPath = safePublicPath(window.location.pathname);
    gtag("config", measurementId, {
      send_page_view: false,
      page_location: `${window.location.origin}${initialPath}`,
      page_referrer: "",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }
}

/** Start tags if the user has already consented in a previous session. */
export function initAnalytics(): void {
  initConsentMode();
  subscribeConsentStorage();
  const consent = readConsent();
  if (consent?.analytics) {
    loadTagScript();
  }
}

/** Record a page view for a client-side navigation. */
export function trackPageView(path: string, title: string): void {
  if (!measurementId) return;
  const consent = readConsent();
  if (!consent?.analytics) return;
  const pagePath = safePublicPath(path);
  gtag("event", "page_view", {
    page_path: pagePath,
    page_title: title,
    page_location: `${window.location.origin}${pagePath}`,
    page_referrer: "",
  });
}

/** Emit an already-sanitized funnel event after optional analytics consent. */
export function trackFunnelEvent(event: FunnelEvent): boolean {
  if (!measurementId || !readConsent()?.analytics) return false;
  if (event.name === "public_landing") {
    const landingPath = safePublicPath(event.parameters.landing_path);
    if (landingPath === "/404" ||
        !["direct", "internal", "external"].includes(event.parameters.referral)) return false;
    gtag("event", event.name, {
      landing_path: landingPath,
      referral: event.parameters.referral,
    });
  } else if (event.name === "signup_completed" ||
             event.name === "first_credit_purchase" ||
             event.name === "first_api_request") {
    gtag("event", event.name, {});
  } else {
    return false;
  }
  return true;
}

function safePublicPath(path: string): string {
  const candidate = pathWithoutQuery(path);
  const normalized = candidate.length > 1 && candidate.endsWith("/")
    ? candidate.slice(0, -1)
    : candidate;
  return publicRoutes.some(route => route.path === normalized) ? normalized : "/404";
}

/** Measure the initial allowlisted public entry once consent permits it. */
export function initFunnelMeasurement(): void {
  if (funnelInitialized || !measurementId) return;
  funnelInitialized = true;
  const initialPath = safePublicPath(window.location.pathname);
  if (initialPath === "/404") return;

  // Sanitize immediately; raw URL/referrer values are not retained pre-consent.
  const landing = createPublicLandingEvent({
    path: initialPath,
    referrer: document.referrer,
    siteOrigin: window.location.origin,
  });
  let emitted = false;
  const emitWhenAllowed = () => {
    if (!emitted) emitted = trackFunnelEvent(landing);
  };
  emitWhenAllowed();
  subscribeConsent(emitWhenAllowed);
}

/** Whether any tag is configured, so the consent banner can stay hidden. */
export const analyticsConfigured = Boolean(measurementId);
