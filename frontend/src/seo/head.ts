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
  const head = routeHead(pathname, fallbackTitle);
  document.title = head.title;
  setLink('canonical', head.canonical);
  for (const [key, value] of Object.entries(head.names)) setMeta('name', key, value);
  for (const [key, value] of Object.entries(head.properties)) setMeta('property', key, value);
}

/** Pure metadata shared by static documents and browser navigation. */
export function routeHead(pathname: string, fallbackTitle?: string) {
  const meta = findRouteMeta(pathname);
  const title = meta ? formatTitle(meta) : `${fallbackTitle ?? 'Page not found'} · ${siteName}`;
  const description = meta?.description ?? 'This page could not be found.';
  const canonical = absoluteUrl(meta?.path ?? '/404');
  return { title, canonical,
    names: { description, robots: robotsDirective(meta), 'twitter:card': 'summary_large_image',
      'twitter:title': title, 'twitter:description': description, 'twitter:image': socialImage },
    properties: { 'og:title': title, 'og:description': description, 'og:url': canonical,
      'og:type': 'website', 'og:site_name': siteName, 'og:locale': siteLocale, 'og:image': socialImage,
      'og:image:width': '1200', 'og:image:height': '630' },
  };
}
