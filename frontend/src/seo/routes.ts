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
  { path: "/blog", title: "Image and text cost guides", description: "Understand image request tariffs and text token components with dated reference guides.", indexable: true, changefreq: "monthly" },
  ...publishedBlogArticles.map(article => ({ path: `/blog/${article.slug}`, title: article.title, description: article.summary, indexable: true, changefreq: "monthly" as const })),
  { path: "/updates", title: "Updates", description: "Sample product announcements and the Takewing updates archive preview.", indexable: false },
  ...updates.map(update => ({ path: `/updates/${update.slug}`, title: update.title, description: update.summary, indexable: false })),
  ...familyPages.map(page => ({ path: `/models/${page.slug}`, title: `${page.family} models & pricing`, description: page.description, indexable: true, priority: 0.8, changefreq: "weekly" as const })),
  {
    path: "/",
    title: "Leading AI models. Lower API prices.",
    description:
      "Image and text generation APIs built to cut your AI costs. Explore Takewing pricing, official rate references and the prepaid dashboard preview.",
    indexable: true,
    priority: 1.0,
    changefreq: "weekly",
  },
  {
    path: "/models",
    title: "Models & pricing",
    description:
      "Compare AI model capabilities, providers and billing units side by side, so you can pick a model and understand what a request costs before you integrate.",
    indexable: true,
    priority: 0.9,
    changefreq: "weekly",
  },
  {
    path: "/docs",
    title: "Documentation and quickstart",
    description:
      "Documentation preparation status. Quickstart and API examples await a verified Takewing API contract.",
    indexable: true,
    priority: 0.9,
    changefreq: "weekly",
  },
  {
    path: "/support",
    title: "Support",
    description:
      "Get help with your Takewing AI account, API keys, billing or a failing request.",
    indexable: true,
    priority: 0.6,
    changefreq: "monthly",
  },
  {
    path: "/status",
    title: "Service status",
    description:
      "Service status source availability, fictional incident previews and dated model reference notices.",
    indexable: true,
    priority: 0.5,
    changefreq: "daily",
  },
  {
    path: "/contact",
    title: "Contact",
    description: "How to reach the Takewing AI team.",
    indexable: true,
    priority: 0.5,
    changefreq: "monthly",
  },
  {
    path: "/privacy",
    title: "Privacy notice",
    description:
      "Review-stage data-handling information, publication gaps and revisitable cookie preferences.",
    indexable: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  {
    path: "/terms",
    title: "Terms of service",
    description:
      "Review-stage product policies for prepaid credits, conditional refunds and deletion; legal terms await publication.",
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
      "Find documentation, support channels, service status, contact details and the legal information for Takewing AI in one place.",
    indexable: false,
  },
  // Account flows: real pages, deliberately kept out of search results.
  {
    path: "/login",
    title: "Sign in",
    description: "Sign in to your Takewing AI account.",
    indexable: false,
  },
  {
    path: "/signup",
    title: "Create your account",
    description: "Create a Takewing AI account to get an API key and start building.",
    indexable: false,
  },
  {
    path: "/forgot-password",
    title: "Reset your password",
    description: "Request a password reset link for your Takewing AI account.",
    indexable: false,
  },
  {
    path: "/update-password",
    title: "Update your password",
    description: "Choose a new password for your Takewing AI account.",
    indexable: false,
  },
  {
    path: "/auth/callback",
    title: "Signing you in",
    description: "Completing your Takewing AI sign-in.",
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
    title: "Usage & requests",
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
