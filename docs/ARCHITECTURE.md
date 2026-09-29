# Architecture

## Implemented architecture (not yet deployed)

The API and Vite site run in one TypeScript Cloudflare Worker using Hono. The
Worker verifies Supabase Auth access tokens for dashboard/admin operations and
accepts separately generated Takewing API keys for customer generation. It calls
private Supabase PostgreSQL functions for account, model, usage, billing, and
request state; browser roles cannot read the private schema. The Worker is the
only component holding Stripe and GrsAI credentials.

Text requests use GrsAI's OpenAI-style chat endpoint synchronously. Streaming is
disabled. Image/video requests reserve limits and credits in PostgreSQL, store an
encrypted short-lived input in private R2, and enqueue only the request ID in
Cloudflare Queues. The Worker polls GrsAI, copies allowlisted media into private
R2, and serves downloads through authenticated routes. A five-minute scheduled
handler recovers queue work, marks stale submissions unresolved, releases old
reservations according to the 24-hour policy, and removes expired R2 objects.

PostgreSQL is authoritative for request and payment state. Atomic SQL functions
reserve customer credits and provider-group spend, snapshot prices, settle usage,
and append a credit ledger. The schema is introduced by
`supabase/migrations/20260929120000_takewing_backend.sql`; it has not yet been
applied to a local or hosted database. The seed contains the discovered provider
catalogue with every model disabled and no price rows.

## Boundaries

- Public generation is API-only. The website is a customer account, billing,
  API-key, usage, and restricted operations portal; it has no generation UI.
- A single GrsAI adapter isolates provider endpoints and response parsing.
  Provider-listed models are not treated as verified compatibility or pricing.
- Supabase Auth tokens are verified server-side. Account ownership is checked in
  database functions for customer data and results. Admin access is an explicit
  environment allowlist (`ADMIN_USER_IDS`) plus an audit reason.
- API keys, Stripe secrets, Supabase service credentials, media encryption keys,
  and request-fingerprint HMAC secrets stay in Worker secrets. Never expose them
  through Vite variables or logs.
- R2 is private; files are delivered only after account and expiry checks. The
  default result lifetime is two hours after successful storage. There is no
  cross-customer prompt/result cache.

## Deployment and operations

`wrangler.jsonc` defines the Worker, same-origin Vite assets, private R2 binding,
media queue/consumer, five-minute cron, and an isolated staging name/bucket/queue.
Cloudflare observability is enabled. Sentry is an optional Worker binding via
`SENTRY_DSN`, with request bodies, cookies, authorization headers, and default PII
excluded. Alert destinations and retention still require operator configuration.

Local setup uses Node.js 24+, npm, Supabase CLI with Docker, and Wrangler. Stripe
CLI can forward test webhooks. Migrations are applied locally with `npm run
db:up`; deployments do not apply database migrations automatically. Do not run a
deploy until the matching Cloudflare resources, Supabase project, secrets, origins,
limits, alarms, and rollback path are configured.

## Known limitations and open launch gates

- No live provider or Stripe request has been tested by this implementation.
  Provider media submit/result formats, costs, usage fields, model parameters,
  and result-host allowlist must be validated before enablement.
- All model entries, provider spending, platform request acceptance, and purchase
  offers default off. A price row requires an operator-supplied evidence note and
  limits; this is not itself proof of provider behavior.
- `stream=true` returns 501. There is no IP/API-key rate-limit service; the
  database enforces available-credit, provider-budget, and per-account concurrency
  limits (default three concurrent requests).
- Usage and audit retention, tax/invoicing, customer terms, resale and data
  processing terms, alert routing, and production secrets are not finalized.
- Database migrations and financial/authentication behavior still need local
  database execution, meaningful behavior/concurrency tests, and focused review.

See [API](API.md), [billing](BILLING.md), [data](DATA.md), [security](SECURITY.md),
[open decisions](OPEN_DECISIONS.md), and [ADR-005](decisions/ADR-005-backend-runtime-and-boundaries.md).
