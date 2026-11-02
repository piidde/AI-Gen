// Builds robots.txt, sitemap.xml and llms.txt from the route registry, so the crawl
// surface can never drift from the routes the app actually serves.
//
// Both files are generated at build time by the Vite plugin in vite.config.ts.
// A non-indexable build emits a blanket disallow and no sitemap entries, which
// is what keeps demo and preview deployments out of search results even if the
// deployment is publicly reachable.

import { indexableRoutes, routeMeta, publicRoutes, type RouteMeta } from "./routes.ts";

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
 * llms.txt (llmstxt.org): a Markdown index for language models and coding
 * agents. No search engine ranks on it; it exists so an agent wiring up the API
 * finds the integration facts and the OpenAPI document without parsing the UI.
 * Links come from the route registry, so it lists exactly the indexable pages.
 * Returns null for non-indexable builds, which must not advertise any content.
 */
export function buildLlmsTxt(options: { origin: string; indexable: boolean }): string | null {
  if (!options.indexable) return null;
  const link = (route: RouteMeta) =>
    `- [${route.title}](${options.origin}${route.path === "/" ? "/" : route.path}): ${route.description}`;
  const section = (heading: string, routes: RouteMeta[]) =>
    routes.length ? [`## ${heading}`, "", ...routes.map(link), ""] : [];
  const pick = (paths: string[]) => indexableRoutes.filter(route => paths.includes(route.path));

  return [
    "# AIAPI.deals",
    "",
    "> OpenAI-compatible API for image and text models with prepaid credits and no subscription.",
    "",
    `- Base URL: ${options.origin}/v1. Authenticate with \`Authorization: Bearer <API key>\`; keys are created in the dashboard.`,
    "- Text: `POST /v1/chat/completions` (OpenAI chat format) and `POST /v1/responses` (OpenAI Responses API with tool calling for coding models; works with Codex).",
    "- Images: `POST /v1/generations` starts an asynchronous job (requires an `Idempotency-Key` header); poll `GET /v1/requests/{id}` for the result.",
    "- Models: `GET /v1/models` lists the enabled models, their endpoints and parameters.",
    "- Existing OpenAI SDK code works after changing the base URL and API key.",
    "",
    ...section("Docs", [
      ...pick(["/docs"]),
      { path: "/v1/openapi.json", title: "OpenAPI 3.1 document", description: "Machine-readable route, request and response schemas.", indexable: true },
    ]),
    ...section("Models and pricing", [...pick(["/models"]), ...indexableRoutes.filter(route => route.path.startsWith("/models/"))]),
    ...section("Guides", indexableRoutes.filter(route => route.path.startsWith("/blog/"))),
    ...section("Optional", pick(["/support", "/status", "/terms", "/privacy"])),
  ].join("\n");
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
    // "/" is served natively: a "/ /index.html" rule is rejected by Cloudflare's
    // HTML handling as a loop, because it strips "/index.html" back to "/".
    // Targets use the canonical HTML-handling form ("/spa", "/blog/"): a ".html"
    // target is answered with a 307 to that form, which would change the visible
    // URL and break client routing (e.g. /login ending up at /spa).
    ...routeMeta
      .filter((route) => route.path !== "/" && !route.path.startsWith("/dashboard/"))
      .map((route) => route.path.padEnd(48) + (publicRoutes.some(page => page.path === route.path) ? `${route.path}/` : "/spa").padEnd(60) + "200"),
    "/dashboard/*".padEnd(36) + "/spa".padEnd(20) + "200",
    "",
  ];

  return lines.join("\n");
}
