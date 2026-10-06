# Decisions and investigations

**DECIDED** records an accepted implementation direction, not a deployed or
verified service. **OPEN** records unresolved choices. **INVESTIGATION** means
evidence is required before claiming support.

## OD-001 Authentication

Status: **DECIDED** for Supabase Auth. The Worker verifies Supabase bearer tokens;
generation requires a separate Takewing API key. Production Auth URL, SMTP,
CAPTCHA, session settings, and local authorization verification remain launch
tasks. See [SECURITY.md](SECURITY.md).

## OD-002 Database structure

Status: **DECIDED** for Supabase PostgreSQL, a private schema, migrations, and
explicit service-role RPC functions. Both migrations execute in the PGlite
tests (`npm test`), which cover ledger/balance invariants, idempotency, Stripe
refund/dispute ordering, role grants, and result-delivery leases. They are applied to the Supabase project "AI API Clone"
(`pwaiidpiymmeppxebfjd`, 2026-10-06; function bodies match the local files, browser
roles have no execute/table access). Not yet verified there: real multi-connection concurrency, PostgREST
end-to-end calls, and migration rollback.

## OD-003 Payment architecture

Status: **DECIDED** for Stripe Checkout and signed webhooks with immutable quotes.
EUR and USD are supported as offer currencies; no offers are configured. Test
mode, refund/dispute ordering, receipts/invoices, tax, and payment policy remain
launch work. See [BILLING.md](BILLING.md).

## OD-004 Deployment architecture

Status: **DECIDED** for TypeScript/Hono on Cloudflare Workers with Supabase,
Queues, private R2, and a five-minute recovery schedule. Production runs on
https://aiapi.deals (Worker `takewing-api`, account samuelfalecx, deployed
2026-10-06) with R2 buckets, queues/DLQs and a 3-day R2 lifecycle backstop. Wrangler config exists;
resources, secrets, domains, staging/production databases, alerts, and rollback
are not configured. Text streaming is disabled.

## OD-005 Object storage and result delivery

Status: **DECIDED** for private R2 and authenticated Worker downloads. Completed
results are accessible for two hours after storage by default; expiry is checked
in PostgreSQL before each read. Media inputs are encrypted and temporary. Actual
R2 lifecycle backstops and deletion alarms require deployment setup.

## OD-006 Free usage

Status: **OPEN**. There is no free-credit offer. Any future free allowance needs
a hard maximum financial exposure and abuse limits.

## OD-007 Veo and unverified video models

Status: **INVESTIGATION**. The seeded provider catalogue is not evidence of
working video support. Verify parameters, cost, job states, outputs, and terms
before enabling or advertising a video model.

## OD-008 Public API contract

Status: **DECIDED** for the current `/v1` contract in [API.md](API.md), including
non-streaming OpenAI-style chat, asynchronous media jobs, idempotency, ownership,
and a common error format. Streaming and full provider compatibility remain
unverified. OpenAPI and example completeness should be checked as routes evolve.

## OD-009 Credit accounting

Status: **DECIDED** for USD-value microcredits, `bigint` ledger entries, atomic
customer/provider reservations, versioned costs, and a 24-hour unresolved-request
policy. Database execution and concurrency/webhook fault tests remain required.
The exact accounting, tax, and financial-record retention policy remains open.

## OD-010 API keys

Status: **DECIDED** for 256-bit random `tw_live_` secrets displayed once and stored
as SHA-256 digests with metadata. Revocation is enforced server-side. Generation
idempotency fingerprints use HMAC-SHA-256 and expire after 30 days; scope is per
account and capability.

## OD-011 Rate limits and financial stop controls

Status: **PARTLY DECIDED**. Atomic credit/provider budget checks, a default
three-request per-account concurrency limit, global/provider pause, model
disablement, account suspension, and key revocation exist in code. Per-IP,
per-key, and daily limits and their thresholds are **OPEN**; Cloudflare rate-limit
configuration is not present.

## OD-012 Monitoring, logs, and retention

Status: **PARTLY DECIDED**. Cloudflare observability is configured; optional
Sentry removes request bodies, cookies, credential headers, and default PII.
Prompts and generated content are not logged. Alert destinations, log/Sentry
retention, 90-day usage retention, and financial-record retention remain **OPEN**.

## OD-013 Minimal admin and operations

Status: **DECIDED** for restricted `/v1/internal` routes guarded by verified user
IDs in `ADMIN_USER_IDS`, with required audit reasons for privileged changes.
The dashboard UI is not included on `feature/grsai-backend`; admin identity
rotation and production access review remain launch tasks.

## OD-014 Prices, markup, offers, and currency

Status: **PARTLY DECIDED**. Customer pricing uses verified, versioned provider
costs times a configurable global or per-model markup. **ASSUMPTION:** a global
2.0x markup (+100%) and candidate prices for the 29 text/image models, scraped
from grsai.com/dashboard/models on 2026-10-06 (CNY) and converted at an assumed
0.14 USD/CNY, are seeded by migration `20261006120000`; all models stay disabled
and the provider has a zero budget. Video (minimax-h3) is unpriced (OD-007). EUR/USD offers store exact
minor-unit amounts and credit quantities. Actual provider prices, markup values,
credit packages, conversion assumptions, payment fees, and introductory discounts
remain **OPEN**; no offer is seeded.

## OD-015 Search visibility and rendering

Status: **OPEN** as recorded in [FRONTEND.md](FRONTEND.md) and
[ADR-004](decisions/ADR-004-seo-and-measurement.md). Indexing remains opt-in and
must stay off until the website publishes verified models/prices and a confirmed
domain.

## Launch gates

Before public sales, apply and review the migration, run database and financial
behavior tests, validate GrsAI text/media request and response contracts with a
limited budget, configure and test Stripe, verify all enabled model prices and
limits, set customer terms/tax/invoicing/retention, configure alarms and Cloudflare
resources, and complete the focused security/billing review. The implementation
is on `feature/grsai-backend`; it is not deployed and the website client is not
connected in this branch.
