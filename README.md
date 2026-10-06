# Takewing

Takewing is a prepaid AI API gateway. Customer apps call the Takewing API; the Worker authenticates requests, reserves customer credits and provider budget, calls GrsAI, and returns verified results. The website is the account portal for credits, API keys, model availability, usage, billing, and restricted operations.

## Current implementation

- Cloudflare Worker API using TypeScript and Hono, serving the Vite site from the same Worker.
- Supabase Auth token verification and a private PostgreSQL schema accessed through explicit service-role RPC functions.
- Hashed, display-once Takewing API keys.
- Non-streaming chat endpoint and asynchronous image/video job pipeline, with provider calls disabled until model behavior and pricing are verified.
- Cloudflare Queue, encrypted temporary media inputs, private R2 result storage, and a five-minute recovery and cleanup schedule.
- Integer microcredit reservations, versioned model prices, provider spending budgets, Stripe Checkout/webhooks, and audited admin operations.
- The backend API and dashboard-management routes are implemented. The frontend is not yet integrated with this API; the existing Vite site still needs a separate, reviewed client change.
- No model prices, credit offers, or enabled GrsAI routes are seeded.
- A separate React frontend in `frontend/` (public website and customer dashboard). The dashboard screens run with explicit fictional demo data; the Supabase Auth browser flow supports Google, configuration-gated Discord, email/password, confirmation, password reset and logout. The build prerenders public reference pages and emits a separate private SPA shell. Indexing remains off; see [acquisition operations](docs/ACQUISITION.md) for crawler, content ownership, measurement and deployment gates.

This is implementation code, not a deployed service. The migrations run against in-memory PGlite in `npm test`, but have not been applied to a Supabase (local or hosted) database, and no live GrsAI or Stripe transaction has been run. Public provider catalogue entries are not tested support.

## Requirements and install

Use Node.js 24 or newer and npm. Supabase local development requires Docker Desktop. From the repository root:

- Install the root dependencies with npm ci.
- Install the frontend dependencies with npm --prefix frontend ci.
- Copy .dev.vars.example to .dev.vars and add development-only Supabase, Stripe test-mode, and GrsAI credentials as required. Set SENTRY_DSN only if a Sentry project is configured.
- Create persistent 32-byte PAYLOAD_ENCRYPTION_KEY and IDEMPOTENCY_HMAC_SECRET values. Do not change either while jobs or idempotency records still depend on them.
- Start Supabase locally with npx supabase start, then apply the migration with npm run db:up. The local site needs a Supabase project URL and publishable key in frontend/.env.local; set VITE_API_BASE_URL=http://localhost:8787 for Vite-to-Worker calls.
- Start the API and website with npm run dev. Start the standalone Vite site with npm --prefix frontend run dev.

For local Supabase, use its generated API URL and keys. Keep service-role keys, Stripe secrets, GrsAI keys, and encryption secrets only in .dev.vars. The browser must receive only the Supabase URL and publishable key.

## Commands

- npm run typecheck checks the Worker TypeScript.
- npm test runs the database, billing, request-body and OpenAPI tests on in-memory PGlite (no Docker, no hosted database). PGlite serialises connections, so it verifies SQL logic and idempotent outcomes but not true row-lock concurrency.
- npm run build checks types, builds the frontend, and runs Wrangler's Worker dry-run.
- npm --prefix frontend run typecheck and npm --prefix frontend run build check the browser app.
- npm run db:new -- migration_name creates a SQL migration.
- npm run db:up applies local migrations; npm run db:reset rebuilds the local database.
- npm run deploy and npm run deploy:staging publish to Cloudflare. Do not run them until resources, secrets, domain, and staging/production controls are configured.
- npm --prefix frontend test runs the existing desktop/mobile Playwright suite.

Wrangler requires a Cloudflare account and the configured Queue and R2 buckets for a real deployment. Configure each environment's resources and secrets separately. Keep model enablement, provider budgets, markup, and purchase offers disabled until they are independently checked.

## API and operations

The public contract is documented in docs/API.md and the executable HTTP examples are in examples/takewing.http. OpenAPI is exposed at /v1/openapi.json. Billing and operational constraints are in docs/BILLING.md, docs/SECURITY.md, and docs/DATA.md.

For administrators, set ADMIN_USER_IDS to comma-separated verified Supabase user UUIDs in the Worker environment. `/v1/internal/*` routes enforce that allowlist; the frontend Operations interface is not implemented yet. Admin changes require an audit reason; credit adjustments require an Idempotency-Key.

## Launch gates

Before selling credits or enabling a model, apply and review the migration, configure a bounded provider budget, test GrsAI request and result formats with a limited account, verify exact model costs and usage fields, configure Stripe test/live webhooks and offers, and resolve provider resale/data-processing, customer terms, tax, and invoicing requirements. Streaming is intentionally disabled. All model rows start disabled.

## Frontend

To prepare Discord sign-in, register the exact Supabase callback
`https://<project-ref>.supabase.co/auth/v1/callback` in the Discord application,
enable Discord in Supabase Auth with the Discord client ID and secret, and add
the app's `/auth/callback` URL to Supabase Auth's redirect allow list. Only then
set `VITE_AUTH_DISCORD_ENABLED=true`. That variable merely reveals the browser
button; it is not a credential or a provider configuration.

- `npm --prefix frontend run typecheck` — check browser application types.
- `npm --prefix frontend run build` — typecheck and build into `frontend/dist/`.
- `npm --prefix frontend run preview` — serve the frontend build locally.
- `npm --prefix frontend test` — build and run desktop/mobile Playwright tests.
  Tests use locally installed Google Chrome, start a preview on port 4173,
  and write failure artifacts to the OS temporary directory, outside the repo.

Routes: `/`, `/models`, `/docs`, `/support`, `/status`, `/contact`, `/privacy`,
`/terms`, `/login`, `/signup`, `/forgot-password`, `/update-password`,
`/auth/callback`, `/dashboard`, and `/dashboard/{models,usage,billing,api-keys,settings}`.
The dashboard routes require a Supabase session. `/docs` is the API reference;
support and legal routes lead to explicit pending-content notices; the older `/information?topic=`
links still resolve to the same content. Unknown routes show a missing-page
screen. Browser Back and direct local
route loads work. The site is served by the same Cloudflare Worker as the API
(see `wrangler.jsonc`), using the generated `_redirects` rewrites.

Demo fixtures live in `frontend/src/demo/fixtures.ts`. Filters, tabs and dialogs
work locally. Key creation/revocation and purchases do not change an account;
the authenticated display name persists through Supabase Auth user metadata.
Public pages need no auth, while auth and dashboard routes use the browser-safe
Supabase variables. The frontend does not call the upstream.
Search indexing is opt-in and **disabled by default**. Titles, descriptions,
canonical URLs, structured data, `robots.txt` and `sitemap.xml` are generated from
one route registry, but stay inactive until a deployment sets
`VITE_SITE_INDEXABLE=true`. Leave it off while the catalogue shows fictional
prices. Before launch, also resolve the initial-HTML noindex risk and public
prerendering work tracked in the implementation plan; the flag alone has not been
verified sufficient. Analytics stays inert until its ID is configured and the
visitor consents. Advertising is disabled for the organic-only launch, including
legacy advertising IDs and saved grants. See
[ADR-004](docs/decisions/ADR-004-seo-and-measurement.md) for the decision and
[frontend scope](docs/FRONTEND.md) for the launch checklist and limitations.

## Project documentation

- [Agent rules](AGENTS.md) and [contributing](CONTRIBUTING.md)
- [Product scope](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [Frontend scope](docs/FRONTEND.md)
- [Frontend Implementation Plan and persistent log](docs/superpowers/plans/2026-09-20-frontend-implementation-plan.md)
- [API contract direction](docs/API.md), [billing](docs/BILLING.md), and [data](docs/DATA.md)
- [Security](docs/SECURITY.md)
- [Open decisions and investigations](docs/OPEN_DECISIONS.md)
- [Architecture decision records](docs/decisions/README.md)

These documents are the permanent repository source of truth. Planned behavior
in the guides is not a claim that it is implemented. The initial bootstrap
specification is no longer required.
