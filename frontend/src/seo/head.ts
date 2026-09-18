// Applies document metadata for the active route. This is a single-page app,
// so every tag that a crawler or social scraper reads must be rewritten on
// navigation; a stale canonical or og:title is worse than none, because it
// tells the crawler two different URLs are the same page.

import {
  absoluteUrl,
  isIndexable,
  siteLocale,
  siteName,
  socialImage,
} from "./config";
import { findRouteMeta, type RouteMeta } from "./routes";

/** Title shown in the tab and in search results. */
export function formatTitle(meta: RouteMeta): string {
  return meta.path === "/"
    ? `${siteName} — ${meta.title}`
    : `${meta.title} · ${siteName}`;
}

/**
 * Robots directive for a route. A non-indexable deployment overrides every
 * page, so preview and demo builds stay out of search results entirely.
 */
export function robotsDirective(meta: RouteMeta | undefined): string {
  if (!isIndexable || !meta?.indexable) {
    return "noindex, nofollow";
  }
  // max-image-preview:large enables full-size thumbnails in results and
  // Discover; max-snippet:-1 lifts the snippet length cap.
  return "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
}

function setMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string): void {
  const selector = `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Rewrite the document head for a pathname. `fallbackTitle` covers routes with
 * no registered metadata, such as the not-found page.
 */
export function applyRouteHead(pathname: string, fallbackTitle?: string): void {
  const meta = findRouteMeta(pathname);
  const title = meta
    ? formatTitle(meta)
    : `${fallbackTitle ?? "Page not found"} · ${siteName}`;
  const description = meta?.description ?? "";

  document.title = title;
  if (description) {
    setMeta("name", "description", description);
  }
  setMeta("name", "robots", robotsDirective(meta));

  // Canonical always points at the registered path, never the visited URL, so
  // tracking parameters (?utm_source=…) never fragment a page's ranking signals.
  const canonical = absoluteUrl(meta?.path ?? pathname);
  setLink("canonical", canonical);

  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", siteName);
  setMeta("property", "og:locale", siteLocale);
  setMeta("property", "og:image", socialImage);
  setMeta("property", "og:image:width", "1200");
  setMeta("property", "og:image:height", "630");

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", socialImage);
}
