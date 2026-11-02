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
import { faqAnswerText, homeFaq } from "../content/homeFaq";
import { getPublishedArticle } from "../content/blog";

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
      url: absoluteUrl("/icon-512.png"),
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

function faqPage(): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: homeFaq.map(entry => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: faqAnswerText(entry) },
    })),
  };
}

// Dated, attributed guides: the author and dates are what answer engines and
// search use to judge whether a cost explanation is current and accountable.
function techArticle(pathname: string): Record<string, unknown> | undefined {
  const slug = pathname.match(/^\/blog\/([^/]+)$/)?.[1];
  const article = getPublishedArticle(slug);
  if (!article?.author) return undefined;
  return {
    "@type": "TechArticle",
    headline: article.title,
    description: article.summary,
    url: absoluteUrl(`/blog/${article.slug}`),
    datePublished: article.publishedOn,
    dateModified: article.updatedOn,
    author: { "@type": "Person", name: article.author },
    publisher: { "@id": `${siteOrigin}/#organization` },
    image: socialImage,
    inLanguage: "en",
  };
}

/**
 * Write the JSON-LD graph for a route. Emits nothing on non-indexable
 * deployments or pages, so demo data never reaches a structured-data parser.
 */
export function structuredData(pathname: string): string | null {
  const meta = findRouteMeta(pathname);
  if (!isIndexable || !meta?.indexable) return null;
  const graph: Record<string, unknown>[] = [organization(), website()];
  const crumbs = breadcrumbs(pathname);
  if (crumbs) graph.push(crumbs);
  if (meta.path === "/") graph.push(faqPage());
  const article = techArticle(meta.path);
  if (article) graph.push(article);
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export function applyStructuredData(pathname: string): void {
  const existing = document.getElementById(ELEMENT_ID);
  const json = structuredData(pathname);
  if (!json) { existing?.remove(); return; }
  const script = existing instanceof HTMLScriptElement ? existing : document.createElement('script');
  script.id = ELEMENT_ID;
  script.type = 'application/ld+json';
  script.textContent = json;
  if (!script.isConnected) document.head.appendChild(script);
}
