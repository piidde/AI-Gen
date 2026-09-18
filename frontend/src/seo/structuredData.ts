// JSON-LD structured data. Search engines use this for rich results: the
// organization/site entries feed knowledge panels and sitelinks search, and
// breadcrumbs render as a path instead of a bare URL in results.
//
// Structured data must describe what the page actually shows. Do not emit
// Product/Offer entries for the demo's fictional prices: marking up prices that
// are not real is a policy violation and a manual-action risk, not a shortcut.

import {
  absoluteUrl,
  isIndexable,
  siteDescription,
  siteName,
  siteOrigin,
  socialImage,
} from "./config";
import { findRouteMeta } from "./routes";

const ELEMENT_ID = "structured-data";

function organization(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/favicon.svg"),
    },
    image: socialImage,
  };
}

function website(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${siteOrigin}/#website`,
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
    publisher: { "@id": `${siteOrigin}/#organization` },
    inLanguage: "en",
  };
}

function breadcrumbs(pathname: string): Record<string, unknown> | undefined {
  const meta = findRouteMeta(pathname);
  if (!meta || meta.path === "/") {
    return undefined;
  }
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: meta.title,
        item: absoluteUrl(meta.path),
      },
    ],
  };
}

/**
 * Write the JSON-LD graph for a route. Emits nothing on non-indexable
 * deployments or pages, so demo data never reaches a structured-data parser.
 */
export function applyStructuredData(pathname: string): void {
  const meta = findRouteMeta(pathname);
  const existing = document.getElementById(ELEMENT_ID);

  if (!isIndexable || !meta?.indexable) {
    existing?.remove();
    return;
  }

  const graph: Record<string, unknown>[] = [organization(), website()];
  const crumbs = breadcrumbs(pathname);
  if (crumbs) {
    graph.push(crumbs);
  }

  const script =
    existing instanceof HTMLScriptElement
      ? existing
      : document.createElement("script");
  script.id = ELEMENT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  if (!script.isConnected) {
    document.head.appendChild(script);
  }
}
