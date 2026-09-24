# Architecture

## Observed implementation

The repository contains an npm-managed Node.js starter (`node >=24`, `.nvmrc` 24),
TypeScript with strict NodeNext/ES-module settings, and `tsx` development watch.
`src/index.ts` prints a readiness message; compilation writes to `dist/`.
`frontend/` is a separate React/TypeScript/Vite browser application with React
Router and ordinary CSS. It implements the reviewed seven-screen design using
local demo fixtures, plus a public catalogue and pending-content/missing-page
states. The initial Supabase Auth browser slice adds Google OAuth, a
configuration-gated Discord OAuth option, email/password auth, password reset,
callback handling, session guards and logout. Its package,
lockfile, TypeScript configuration and build output are independent of the Node
starter. Playwright covers public routes and key interactions at desktop/mobile
widths; generated test artifacts stay outside the repository. There is still no
HTTP API, database schema, payment integration, provider adapter or deployment
configuration. Backend requirements below describe intended behavior.

## DECIDED — boundaries

The API-only MVP accepts customer API calls through our backend/gateway, with services for
authentication, key validation, model availability/routing, pricing, credits,
usage metering, request tracking, errors, and applicable rate limits.
The backend coordinates persistence, trusted payment confirmation, and an adapter
that communicates with the private upstream. These are conceptual responsibilities,
not a mandate for separate services, packages, classes, or deployment units.

Responses return from upstream through the adapter/backend to the calling API
client, which decides how to display or use them. No first-party generation UI
is required. If one is added later, it must reuse the same backend logic.
See [ADR-001](decisions/ADR-001-api-only-mvp.md).

A public website and customer management dashboard are accepted scope in
[FRONTEND.md](FRONTEND.md). They add account, billing, key, and usage management
surfaces without adding a browser generation interface. The frontend stack is
accepted in [ADR-002](decisions/ADR-002-frontend-stack.md); hosting and management
API contracts remain open. `frontend/src/demo/fixtures.ts` contains fictional
view data, not network contracts. Components never perform credit arithmetic or
issue credentials. Notification preferences remain account-scoped demo memory, while the
authenticated display name is persisted through Supabase Auth user metadata.

The next frontend foundation now has explicit view records and fictional data in
`frontend/src/data/{viewModels,demoSnapshot}.ts`. `demoClient.ts` supplies isolated,
cancellable asynchronous reads and demo preference saves, without network or
persistence. These modules are not yet page consumers or management API contracts;
existing pages still use the legacy fixtures until their incremental migration.
Feature stages add their specific operations. Supabase auth remains independent.

Clients call only our API. Keep upstream credentials, privileged database
credentials, payment secrets, pricing, credit deduction, and routing server-side.

Isolate actual upstream behavior in one provider adapter. Translate public input
to internal types, then upstream input; translate upstream results/errors back to
internal and public forms. Model listing, text generation, and image generation
are conceptual capabilities, not finalized TypeScript signatures. Add only verified
behavior; do not build multi-provider machinery or speculative video methods.

## ASSUMPTION — technology direction

- Node.js/TypeScript remains the default existing setup, not a decision against Workers.
- Supabase Auth is selected for the initial browser auth slice. Supabase/PostgreSQL
  remains the database direction; database access, migrations, RLS, and any
  limited internal storage remain subject to database design.
- Payment provider selection remains open; Stripe was the initial candidate, not
  a commitment. Operator privacy is a selection priority. Do not add alternative
  providers for theoretical flexibility.
- Cloudflare is a cloud direction. DNS/CDN/WAF, limits, Workers, R2, hosting, and
  server/VM/hybrid arrangements are candidates, not provisioned infrastructure.
- Prefer upstream-to-backend-to-client text streaming when supported. SSE or
  streaming HTTP is a candidate; verify long-lived request/runtime compatibility.

## OPEN — deployment, delivery, and operations

[Accepted ADR-005](decisions/ADR-005-public-build-time-prerendering.md) selects
a Vite server build plus React static
prerendering, with a separate private SPA shell. S11 implements local asset
assembly, metadata and hydration for 18 public pages, resolving F-001 in build
artifacts. The frontend owner accepted the approach; actual host behavior,
coordination and indexing activation remain open under B09/S13.

See [OD-004](OPEN_DECISIONS.md#od-004-deployment-architecture) for runtime, streaming
limits, jobs, request durations, secrets, preview environments, scaling, and deployment.
Image delivery may proxy/stream, use a temporary upstream URL only after privacy,
reliability, lifetime, and exposure are understood, or use temporary internal
storage when technically necessary (OD-005). No generic storage framework is required.

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

Billing rules live in [BILLING.md](BILLING.md); data concepts in [DATA.md](DATA.md);
contracts in [API.md](API.md). Record accepted material choices in
[ADRs](decisions/README.md) and update this guide as implementation changes.

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
