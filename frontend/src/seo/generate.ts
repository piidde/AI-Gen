// Builds robots.txt and sitemap.xml from the route registry, so the crawl
// surface can never drift from the routes the app actually serves.
//
// Both files are generated at build time by the Vite plugin in vite.config.ts.
// A non-indexable build emits a blanket disallow and no sitemap entries, which
// is what keeps demo and preview deployments out of search results even if the
// deployment is publicly reachable.

import { indexableRoutes, routeMeta } from "./routes.ts";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildRobotsTxt(options: {
  origin: string;
  indexable: boolean;
}): string {
  if (!options.indexable) {
    return [
      "# This deployment is not a public release and must not be indexed.",
      "User-agent: *",
      "Disallow: /",
      "",
    ].join("\n");
  }

  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Private account surfaces. No public content, and crawling them only",
    "# produces sign-in walls in search results.",
    "Disallow: /dashboard",
    "Disallow: /login",
    "Disallow: /signup",
    "Disallow: /forgot-password",
    "Disallow: /update-password",
    "Disallow: /auth/",
    "",
    "# Tracking parameters create duplicate URLs for the same page.",
    "Disallow: /*?*utm_",
    "",
    `Sitemap: ${options.origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function buildSitemapXml(options: {
  origin: string;
  indexable: boolean;
  lastmod: string;
}): string {
  const entries = options.indexable ? indexableRoutes : [];
  const urls = entries
    .map((route) => {
      const loc = route.path === "/" ? `${options.origin}/` : `${options.origin}${route.path}`;
      const parts = [
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${options.lastmod}</lastmod>`,
      ];
      if (route.changefreq) {
        parts.push(`    <changefreq>${route.changefreq}</changefreq>`);
      }
      if (route.priority !== undefined) {
        parts.push(`    <priority>${route.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * SPA rewrite rules for static hosts, one per known route.
 *
 * A catch-all `/* /index.html 200` would serve every unknown URL as a success
 * page. Crawlers call that a soft 404 and may index the error page, and it
 * hides broken links from crawl reports. Enumerating the real routes lets a
 * genuinely unknown path fall through to the host's 404 handling and return an
 * actual 404 status, while every real route still deep-links.
 */
export function buildRedirects(): string {
  const lines = [
    "# Generated at build time from src/seo/routes.ts. Do not edit by hand.",
    "# Redirects for static hosts that read this file (Cloudflare Pages, Netlify).",
    "",
    "# One rewrite per known route; see buildRedirects() for why this is not a",
    "# catch-all. Dashboard children share a prefix rule.",
    ...routeMeta
      .filter((route) => !route.path.startsWith("/dashboard/"))
      .map((route) => route.path.padEnd(36) + "/index.html".padEnd(20) + "200"),
    "/dashboard/*".padEnd(36) + "/index.html".padEnd(20) + "200",
    "",
  ];

  return lines.join("\n");
}
