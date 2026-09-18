// Builds robots.txt and sitemap.xml from the route registry, so the crawl
// surface can never drift from the routes the app actually serves.
//
// Both files are generated at build time by the Vite plugin in vite.config.ts.
// A non-indexable build emits a blanket disallow and no sitemap entries, which
// is what keeps demo and preview deployments out of search results even if the
// deployment is publicly reachable.

import { indexableRoutes } from "./routes.ts";

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
