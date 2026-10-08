# Architecture

## Implemented architecture (not yet deployed)

The API and Vite site run in one TypeScript Cloudflare Worker using Hono. The
Worker verifies Supabase Auth access tokens for dashboard/admin operations and
accepts separately generated Takewing API keys for customer generation. It calls
private Supabase PostgreSQL functions for account, model, usage, billing, and
request state; browser roles cannot read the private schema. The Worker is the
only component holding Stripe and GrsAI credentials.

Text requests use GrsAI's OpenAI-style chat endpoint synchronously (streamed chat
is re-emitted from the finished completion) and, for coding models, its Responses
endpoint, whose event stream is proxied while the Worker reads the final usage
(`src/text.ts`). Image/video requests reserve limits and credits in PostgreSQL, store an
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

A public website and customer management dashboard are accepted scope in
[FRONTEND.md](FRONTEND.md). They add account, billing, key, and usage management
surfaces without adding a browser generation interface. The frontend stack is
accepted in [ADR-002](decisions/ADR-002-frontend-stack.md); management API
contracts are in [API.md](API.md), but the dashboard is not yet connected to them. `frontend/src/demo/fixtures.ts` contains fictional
view data, not network contracts. Components never perform credit arithmetic or
issue credentials. Notification preferences remain account-scoped demo memory, while the
authenticated display name is persisted through Supabase Auth user metadata.

The next frontend foundation now has explicit view records and fictional data in
`frontend/src/data/{viewModels,demoSnapshot}.ts`. `demoClient.ts` supplies isolated,
cancellable asynchronous reads and demo preference saves, without network or
persistence. These modules are not yet page consumers or management API contracts;
existing pages still use the legacy fixtures until their incremental migration.
Feature stages add their specific operations. Supabase auth remains independent.

## Deployment and operations

`wrangler.jsonc` defines the Worker, same-origin Vite assets, private R2 binding,
media queue/consumer, five-minute cron (recovery, cleanup and low-balance alerts),
the `EMAIL` Cloudflare Email Sending binding (sender `ALERT_FROM_EMAIL`), and an
isolated staging name/bucket/queue (staging has no email binding, so alerts are skipped).
Go-live steps are listed in [GO_LIVE.md](GO_LIVE.md).
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
[open decisions](OPEN_DECISIONS.md), and [ADR-006](decisions/ADR-006-backend-runtime-and-boundaries.md).

## Operations requirements

Aim to separate development, preview/staging, and production. Use structured logs
with useful request/account/key/model/provider IDs, status, latency, usage, charges,
provider costs, and error categories, subject to [security rules](SECURITY.md).
Production monitoring should cover application/upstream/database errors, webhook
and billing failures, unusual spending, and elevated error rates. Sentry or an
equivalent is a candidate; provider, retention, and alerting are OPEN (OD-012).

Plan the smallest usable operational interface for inspection and controls, not
a large admin product (OD-013). Rapid model disabling, key revocation, account
suspension, upstream shutdown, and platform spending limits are required directions
for financial protection; mechanisms/thresholds remain OPEN (OD-011).

## Frontend architecture

The authenticated dashboard is a client of the same-origin `/v1` API: pages load
through `useApiResource` in `frontend/src/data/api.ts` with the Supabase access token,
and `npm --prefix frontend run dev` proxies `/v1` to `wrangler dev` on port 8787.

[Accepted ADR-005](decisions/ADR-005-public-build-time-prerendering.md) selects
a Vite server build plus React static
prerendering, with a separate private SPA shell. S11 implements local asset
assembly, metadata and hydration for 18 public pages, resolving F-001 in build
artifacts. The frontend owner accepted the approach; actual host behavior,
coordination and indexing activation remain open under B09/S13.

### Stage 3 catalogue consumers

Models, ModelDetail and the status reference notice now consume the accepted dated
content/catalogue.ts inventory. content/modelFamilies.ts owns the four editorial
family-page records, grouping and active-discovery/availability helpers. Small
CatalogueBasis, CatalogueRates, ModelFamily and PublicCatalogueShell components
reuse the public/dashboard presentation. They do not call the account demo client
or private upstream. Legacy request history still owns its recorded model labels.

The four family records also populate seo/routes.ts, so existing sitemap and
explicit host rewrite generation discover them without a second list. Unknown
model paths receive no rewrite rule; selected-host HTTP status remains S13 evidence.
ADR-005 public prerendering was subsequently implemented in S11 below. Stage 3 added no
backend API, auth changes, dependencies, deployment or indexing activation.

### Stage 4 billing demo boundary

`data/billingDemo.ts` is a focused mock order/profile client, reusing the cancellable
wait from `demoClient.ts`. `BillingDemoProvider.tsx` owns its account-keyed in-memory
session. The provider surrounds routes for signed-in users so support/status visits
preserve demo state; `RequireAuth` still guards dashboard routes independently.
Anonymous public rendering does not create a billing session or access its storage.
BillingDetailsForm shares optional billing data with Settings. Production auth profile
updates remain separate and unchanged. Only the pending identity marker uses tab
storage; all browser billing state is untrusted. No API, provider SDK, schema or new
dependency is introduced. The older generic demo snapshot remains for other stages.

### Stage 5 usage presentation boundary

Usage uses a focused `usageDemo.ts` metadata fixture and pure filter/aggregation
helpers, with the existing abortable demo wait for history/export state previews.
`UsageRequestTable` and `UsageSpendingChart` keep one filtered record set shared with
totals and CSV. Separate components preserve the older Overview preview until S09.
No new dependency, endpoint, database schema, auth change or storage is introduced.
`usageExport.ts` and `supportDetails.ts` explicitly select safe metadata rather than
serializing response objects. The browser never settles credits or retries generation.

### Stage 6 key demo boundary

`KeyDemoProvider.tsx` owns account-keyed in-memory `ApiKey` metadata across routes.
`ApiKeys.tsx` owns abortable mock operations and the transient nonfunctional sample;
no full sample is passed to the provider. This focused provider reuses existing auth,
dialog, clipboard and timestamp helpers without adding a service/SDK or storage.
History remains a separate metadata snapshot so revocation cannot erase old labels.
No live key endpoint, server authorization, credential issuance or dependency is added.

### Stage 7 account and auth boundaries

`AccountDemoProvider` follows the existing account-keyed provider pattern around
routes. `AccountAccess` and `NotificationSettings` keep abortable mock side effects
separate from the real display-name form. `accountSettings.ts` provides a pure alert
transition model and identity/threshold checks, without an email scheduler.
`BillingProfileFields` shares optional inputs between signup and the existing billing
form; signup samples remain page-local rather than inventing a profile-persistence
contract. Actual sign-in methods/AuthProvider interfaces remain unchanged. Callback,
confirmation-resend and password-reset recovery use the existing Supabase client.
No backend, dependency, database migration or live account-management API is added.

### Stage 8 public service and help boundaries

Status, Updates, Support and Policy now have dedicated public components. The shared
`content/serviceStatus.ts` provides fictional incident scenarios, sample announcements
and dated catalogue notices. Status, dashboard IncidentNotice and affected model cards
consume the same scenario; no live feed or healthy default is implied. Unknown preview
values fall back to an unconnected source. Source and incident times use labelled local
time. The sample updates archive and each known detail route are explicitly noindex.

`PublicFooter` keeps help, status, updates and policy navigation consistent across the
public catalogue/help pages and dashboard; Home retains its layout with the same links.
Legacy topic links redirect to their dedicated routes. Fragment navigation resolves a
literal element ID, supporting section links without interpreting a selector. Support
uses static links into authenticated history, never accepts/sends URL-provided details.
No backend, source publisher, contact service, dependency or schema was added.

### Stage 9 Overview boundary

Overview now consumes the Billing demo client's wallet, shared usage records and a
supplied historical-savings demo summary. UsageChart accepts daily values/totals while
retaining its original homepage fixture default. UsageRequestTable also renders the
five-row Overview list, reusing details instead of introducing a second request flow.
The small overviewDemo module aggregates fictional complete records for its mock
response; a live adapter must consume the server-produced summary, never reconstruct
lifetime savings from paginated rows or the current catalogue. No backend, dependency,
schema, authentication or storage change is introduced.

### Stage 10 repository content boundary

Homepage model cards consume the same dated catalogue as Models. Following the
2026-09-21 owner correction, ModelPrices provides a compact input/output or
image-request presentation using shared exact pricing arithmetic; CatalogueRates
continues to own detailed catalogue presentation. Fictional dashboard preview
data remains separately labelled. Public
navigation now includes the blog without changing authentication or account flows.

Blog records live in `frontend/content/blog/articles.ts`; the small typed block
format renders paragraphs, callouts, diagrams, tables, catalogue references, plain
copyable text and links through React. This avoids a Markdown/MDX dependency and
executable author content. `src/content/blog.ts` validates records and supplies the
non-draft collection to both pages and the route registry. Missing/draft slugs do
not resolve as articles or receive sitemap/rewrite entries. React escapes text;
there is no arbitrary HTML renderer. Repository code remains trusted source code.

This format works with the static React rendering implemented in S11 below;
S13 owns deployed HTTP status/publication checks.
No CMS, dependency, server endpoint, storage or indexing activation is introduced.

### Stage 11 public build boundary

Vite completes the client build, then builds a temporary public render entry and
uses React static prerendering for the 18 registered public paths. App owns shared
public routes; BrowserApp adds the unchanged browser authentication, demo providers
and private routes. The public render import graph excludes Supabase/auth providers.
No session, storage or network source is used to create public HTML. Both entry
points reuse page components; the browser hydrates public roots and creates the
private SPA root. Query filters and persisted preferences apply after hydration;
announcement dates begin in UTC and then show the browser's labelled local time.

Pure head and JSON-LD functions serve build output and browser navigation. Public
paths receive directory-index documents; spa.html is restrictive and contains no
account markup. 404.html supplies a noindex missing-page document. Template,
route/output uniqueness, content and asset checks fail the build on invalid output.
The temporary bundled renderer is removed and never placed in deployable output.

Generated explicit rewrites target public HTML or spa.html, never a blanket
homepage fallback. The Vite preview middleware exercises those local semantics;
directory aliases, production status/redirect precedence, headers and legacy
query redirects still require B09/S13 host evidence. See ADR-005 and ACQUISITION.

ModelPrices now consumes content/publishedPrices for labelled component and image
examples across Home and ModelFamily. Detailed CatalogueRates retains exact
credits/cache/conditions; billing compareRate and historical savings are unchanged.
