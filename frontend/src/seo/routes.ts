// Per-route metadata. One record per addressable page drives the document
// title, description, canonical URL, robots directive and sitemap entry.
//
// `indexable: false` marks pages that must never appear in search results even
// on a production deployment: authentication screens, the private dashboard and
// anything behind it. Those pages carry no unique public value and leak
// account-flow URLs into results where users mistake them for the product.

import { familyPages } from "../content/modelFamilies.ts";
import { updates } from "../content/serviceStatus.ts";
import { publishedBlogArticles } from "../content/blog.ts";

export type RouteMeta = {
  /** Path as registered in the router. */
  path: string;
  /** Title without the site-name suffix; `formatTitle` adds it. */
  title: string;
  description: string;
  /** Whether this page belongs in search results and the sitemap. */
  indexable: boolean;
  /** Relative priority hint for the sitemap, 0.0–1.0. */
  priority?: number;
  /** Sitemap change frequency hint. */
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
};

export const routeMeta: RouteMeta[] = [
  { path: "/blog", title: "AI API pricing guides", description: "Practical guides to image and text API pricing: what you pay for, how to estimate a workload and how our prices compare.", indexable: publishedBlogArticles.length > 0, changefreq: "monthly" },
  ...publishedBlogArticles.map(article => ({ path: `/blog/${article.slug}`, title: article.title, description: article.summary, indexable: true, changefreq: "monthly" as const })),
  { path: "/updates", title: "Updates", description: "Product announcements from AIAPI.deals.", indexable: false },
  ...updates.map(update => ({ path: `/updates/${update.slug}`, title: update.title, description: update.summary, indexable: false })),
  ...familyPages.map(page => ({ path: `/models/${page.slug}`, title: `${page.family} API pricing`, description: page.description, indexable: true, priority: 0.8, changefreq: "weekly" as const })),
  {
    path: "/",
    title: "OpenAI-compatible API for GPT Image 2 and Nano Banana Pro",
    description:
      "OpenAI-compatible API for image and text models such as GPT Image 2, Nano Banana Pro and GPT-5.6. Prepaid credits with no subscription and no surprise bills: change the base URL and keep your code.",
    indexable: true,
    priority: 1.0,
    changefreq: "weekly",
  },
  {
    path: "/models",
    title: "AI API pricing for image and text models",
    description:
      "AI API prices for GPT Image 2, Nano Banana Pro, GPT-5.6 and Gemini Flash next to the official prices, per image or per 1M tokens, so you know what a request costs before you integrate.",
    indexable: true,
    priority: 0.9,
    changefreq: "weekly",
  },
  {
    path: "/docs",
    title: "OpenAI-compatible API documentation and quickstart",
    description:
      "Point the OpenAI SDK or Codex at the AIAPI.deals base URL, then call chat completions, the Responses API and asynchronous image jobs with one prepaid key.",
    indexable: true,
    priority: 0.9,
    changefreq: "weekly",
  },
  {
    path: "/support",
    title: "Support",
    description:
      "Get help with your AIAPI.deals account, API keys, billing or a failing request.",
    indexable: true,
    priority: 0.6,
    changefreq: "monthly",
  },
  {
    path: "/status",
    title: "Service status",
    description:
      "Open incidents and model notices for the AIAPI.deals API.",
    indexable: true,
    priority: 0.5,
    changefreq: "daily",
  },
  {
    path: "/contact",
    title: "Contact",
    description: "How to reach the AIAPI.deals team.",
    indexable: true,
    priority: 0.5,
    changefreq: "monthly",
  },
  {
    path: "/privacy",
    title: "Privacy notice",
    description:
      "How AIAPI.deals handles account, request and payment data, and where to change your cookie preferences.",
    indexable: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  {
    path: "/terms",
    title: "Terms of service",
    description:
      "How prepaid credits, refunds and account deletion work at AIAPI.deals.",
    indexable: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  // Legacy aggregate page. Still reachable, but the per-topic paths above are
  // the canonical, rankable URLs, so this stays out of the sitemap.
  {
    path: "/information",
    title: "Documentation, support and service information",
    description:
      "Find documentation, support channels, service status, contact details and the legal information for AIAPI.deals in one place.",
    indexable: false,
  },
  // Account flows: real pages, deliberately kept out of search results.
  {
    path: "/login",
    title: "Sign in",
    description: "Sign in to your AIAPI.deals account.",
    indexable: false,
  },
  {
    path: "/signup",
    title: "Create your account",
    description: "Create an AIAPI.deals account to get an API key and start building.",
    indexable: false,
  },
  {
    path: "/forgot-password",
    title: "Reset your password",
    description: "Request a password reset link for your AIAPI.deals account.",
    indexable: false,
  },
  {
    path: "/update-password",
    title: "Update your password",
    description: "Choose a new password for your AIAPI.deals account.",
    indexable: false,
  },
  {
    path: "/auth/callback",
    title: "Signing you in",
    description: "Completing your AIAPI.deals sign-in.",
    indexable: false,
  },
  // Dashboard. Private by definition; never indexed.
  {
    path: "/dashboard",
    title: "Account overview",
    description: "Your balance, recent requests and account activity.",
    indexable: false,
  },
  {
    path: "/dashboard/models",
    title: "Models",
    description: "Available models, capabilities and prices for your account.",
    indexable: false,
  },
  {
    path: "/dashboard/usage",
    title: "Requests",
    description: "Your request log with status, model, time and cost.",
    indexable: false,
  },
  {
    path: "/dashboard/billing",
    title: "Billing",
    description: "Buy credits and review orders, payments and invoices.",
    indexable: false,
  },
  {
    path: "/dashboard/api-keys",
    title: "API keys",
    description: "Create, name and revoke the API keys for your integrations.",
    indexable: false,
  },
  {
    path: "/dashboard/settings",
    title: "Settings",
    description: "Your user information, account security and notification preferences.",
    indexable: false,
  },
];

/** Routes that belong in the sitemap, in sitemap order. */
export const indexableRoutes = routeMeta.filter((route) => route.indexable);

export const spaPaths = ['/information', '/login', '/signup', '/forgot-password', '/update-password', '/auth/callback'];
export const publicRoutes = routeMeta.filter(route => !route.path.startsWith('/dashboard') && !spaPaths.includes(route.path));

/** Look up metadata for a pathname, ignoring a trailing slash. */
export function findRouteMeta(pathname: string): RouteMeta | undefined {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return routeMeta.find((route) => route.path === normalized);
}
