// Central site metadata. Values here drive <head> tags, structured data,
// sitemap.xml and robots.txt so the same facts are never restated by hand.
//
// Indexing is opt-in. The demo publishes fictional prices and no live service,
// so search engines and ad crawlers must stay out until a real service ships.
// Set VITE_SITE_INDEXABLE=true only when the deployment serves a real offering.

function envFlag(value: string | undefined): boolean {
  return value === "true";
}

function normalizeOrigin(value: string | undefined): string {
  const origin = value?.trim() || "https://takewing.ai";
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

/** Canonical origin without a trailing slash, e.g. `https://takewing.ai`. */
export const siteOrigin = normalizeOrigin(import.meta.env.VITE_SITE_ORIGIN);

/**
 * Whether crawlers may index this deployment. Defaults to false so preview,
 * local and demo builds can never leak fictional pricing into search results.
 */
export const isIndexable = envFlag(import.meta.env.VITE_SITE_INDEXABLE);

export const siteName = "Takewing AI";

export const siteTagline = "Leading AI models. Lower API prices.";

export const siteDescription =
  "Image and text generation APIs built to cut your AI costs. Explore Takewing pricing, official rate references and the prepaid dashboard preview.";

/** Locale advertised to crawlers and social scrapers. */
export const siteLocale = "en_US";

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return path === "/" ? `${siteOrigin}/` : `${siteOrigin}${path}`;
}

/** Social sharing image, generated at `frontend/public/og-image.svg`. */
export const socialImage = absoluteUrl("/og-image.png");
