# Takewing

Takewing is a prepaid AI API gateway. Customer apps call the Takewing API; the Worker authenticates requests, reserves customer credits and provider budget, calls GrsAI, and returns verified results. The website is the account portal for credits, API keys, model availability, usage, billing, and restricted operations.

## Current implementation

- Cloudflare Worker API using TypeScript and Hono, serving the Vite site from the same Worker.
- Supabase Auth token verification and a private PostgreSQL schema accessed through explicit service-role RPC functions.
- Hashed, display-once Takewing API keys.
- Non-streaming chat endpoint and asynchronous image/video job pipeline, with provider calls disabled until model behavior and pricing are verified.
- Cloudflare Queue, encrypted temporary media inputs, private R2 result storage, and a five-minute recovery and cleanup schedule.
- Integer microcredit reservations, versioned model prices, provider spending budgets, Stripe Checkout/webhooks, and audited admin operations.
- The backend API and dashboard-management routes are implemented. This branch does not include the frontend API integration; the existing Vite site still needs a separate, reviewed client change.
- No model prices, credit offers, or enabled GrsAI routes are seeded.

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

For administrators, set ADMIN_USER_IDS to comma-separated verified Supabase user UUIDs in the Worker environment. `/v1/internal/*` routes enforce that allowlist; the frontend Operations interface is intentionally excluded from this backend branch. Admin changes require an audit reason; credit adjustments require an Idempotency-Key.

## Launch gates

Before selling credits or enabling a model, apply and review the migration, configure a bounded provider budget, test GrsAI request and result formats with a limited account, verify exact model costs and usage fields, configure Stripe test/live webhooks and offers, and resolve provider resale/data-processing, customer terms, tax, and invoicing requirements. Streaming is intentionally disabled. All model rows start disabled.
