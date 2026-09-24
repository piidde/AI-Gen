# Open decisions and investigations

See the [2026-09-20 frontend review](FRONTEND_REVIEW.md) for subsequent frontend
decisions and remaining details. Payment selection, backend mechanisms and
investigations remain open unless explicitly resolved there.

Entries distinguish accepted requirements from unresolved mechanisms. The
[frontend implementation plan](superpowers/plans/2026-09-20-frontend-implementation-plan.md) tracks
execution, dependencies and subsequent implementation findings.
**OPEN** means no final choice;
**INVESTIGATION** means evidence is needed. **ASSUMPTION** permits provisional
work without making a choice permanent; **DECIDED** marks accepted direction,
not implemented functionality. Explicit decisions must update this register and
the owning guide, with an [ADR](decisions/README.md) for material architecture.

Owners from the bootstrap are retained; suggested owners are not exclusive or
confirmed assignments. Additional entries collect unresolved questions already
present elsewhere in the bootstrap. Work around them using stable boundaries or
documented assumptions; resolve blockers before dependent implementation.

## OD-001 Authentication

Status: **DECIDED for the initial browser auth slice**. Owner: Samuel.
Supabase Auth is the selected auth platform.

The first slice uses email/password and Google OAuth, with email confirmation,
password reset, browser session persistence, protected dashboard routes, and
logout. The frontend also contains a Discord OAuth option, disabled by default
until its Discord and Supabase provider configuration is complete. Its client
secret stays in Supabase Auth settings; `VITE_AUTH_DISCORD_ENABLED` is only a
browser UI gate. Backend token verification, production session strategy,
account records, and RLS remain OPEN and must be coordinated with OD-002 before
server-backed features ship. See [SECURITY.md](SECURITY.md).

## OD-002 Database structure

Status: **OPEN**. Suggested owner: Samuel. **ASSUMPTION:** Supabase/PostgreSQL.

Define final schema, migration workflow, database access, RLS strategy, and
transaction/concurrency strategy for credits. Coordinate OD-001/009/010.
Candidate entities/job states in [DATA.md](DATA.md) are not schema commitments.

## OD-003 Payment architecture

Status: **OPEN** for provider/integration. Suggested owner: Mario. Stripe was an
initial candidate; no provider is selected. Operator privacy is a selection priority.

Choose the provider flow, webhook/document integration and feasible methods.
**DECIDED:** GRSAI-reference packages/bonuses, USD checkout with approximate EUR
display, non-expiring credits and the refund/deletion policies in BILLING.md.
Revalidate package amounts before implementation; do not reopen settled policies
or add alternative providers solely for flexibility.
See [BILLING.md](BILLING.md).

## OD-004 Deployment architecture

Status: **OPEN**. Suggested owners: Pippi + Imerian. **ASSUMPTION:** Cloudflare direction.

Compare Workers, Node.js server, VM, or hybrid. Determine API runtime, streaming
compatibility, background jobs, execution limits, image/video durations, deployment
workflow, scaling, secrets, and preview environments. Local Node.js setup does not
settle production runtime. See [ARCHITECTURE.md](ARCHITECTURE.md).

## OD-005 Object storage and image delivery

Status: **OPEN**. Suggested owners: Pippi + Imerian.
**DECIDED:** no permanent first-party image storage by default unless technically necessary.

Choose proxy/stream vs temporary upstream URLs vs temporary internal cache, retention,
and download behavior. Evaluate URL privacy, reliability, lifetime, and exposure.
User-connected R2/S3-compatible storage is a later possibility, outside MVP;
do not decide its implementation now. See [ARCHITECTURE.md](ARCHITECTURE.md).

## OD-006 Free usage

Status: **OPEN**. Owner: Team. No commitment to launch free credits.

Decide availability, amount, account requirements, abuse prevention, per-account
caps, and total financial exposure. **DECIDED:** any offer needs a hard maximum
financial exposure; unlimited free usage is prohibited. See [PRODUCT.md](PRODUCT.md).

## OD-007 Veo endpoint

Status: **INVESTIGATION**. Owner: unassigned; team member must be assigned.

Video is outside the accepted image/text MVP. This investigation is future scope,
not a dependency for frontend launch.

Test the apparent upstream endpoint; verify supported parameters, response format,
cost, and reliability, including its absence from the model list. Do not advertise
support before verification. No credentials or endpoint evidence were provided
for this bootstrap. See [API.md](API.md).

## OD-008 API contract

Status: **OPEN**. Owner: initial API implementer, reviewed by team (person not assigned).

Define exact routes/payloads, error format, streaming transport/format, compatibility
goals, request IDs, idempotency, pagination, and versioning. Verify upstream streaming
capabilities and deployment compatibility before committing to transport.
Routes in [API.md](API.md) remain proposals.

## OD-009 Internal credit unit and accounting

Status: **OPEN**. Owners: database/billing owners (specific billing owner unconfirmed).

Decide denomination, integer precision/representation, ledger rules/schema,
reservation model, concurrency, settlement/release, refunds/adjustments,
idempotency, and treatment of ambiguous upstream outcomes. Coordinate OD-002/003/008.
Integer accounting and financial safety are requirements; exact implementation
is unresolved. See [BILLING.md](BILLING.md).

## OD-010 API key design

Status: **OPEN**. Owner: unassigned.

**DECIDED:** named keys, display-once secrets, masked identifiers, creation and
last-used metadata, confirmed revocation and preserved historical identification.
Define key format, secure generation/hashing, storage and effective server-side
revocation. Prefix + hash + metadata remains a candidate storage design.
Document the design before production. See [SECURITY.md](SECURITY.md).

## OD-011 Rate limits and financial stop controls

Status: **OPEN**. Owner: unassigned.

Choose thresholds/mechanisms across IP, account, key, model, concurrency, daily
usage, and global spend. Define rapid model disablement, account suspension,
key revocation, upstream stop, and platform spend limits. Coordinate free-usage
exposure with OD-006. See [SECURITY.md](SECURITY.md).

## OD-012 Monitoring, logging, and retention

Status: **OPEN**. Owner: unassigned. Candidate: Sentry or equivalent, not selected.

Choose monitoring provider and operational alert handling for application/upstream/
database errors, payment webhook/billing failures, unusual spend, and elevated
error rates. Define metadata access/retention and any required content logging;
prompts/output are excluded by default, and secrets must never be logged.
Usage/audit retention is not specified. See [ARCHITECTURE.md](ARCHITECTURE.md)
and [SECURITY.md](SECURITY.md).

## OD-013 Minimal admin and operations

Status: **OPEN**. Owner: unassigned.

Choose the smallest needed initial operational interface and timing. Candidates:
inspect users, balances, usage, requests, provider failures, and payment status;
suspend accounts, revoke keys, adjust credits with audit trail, and toggle models.
Define privileged access without building a large admin product.
See [SECURITY.md](SECURITY.md).

## OD-014 Pricing and introductory discounts

Status: **OPEN**. Owner: unassigned (coordinate with payment/billing owners).

**DECIDED:** research current GRSAI model prices and package bonuses as the frontend
reference; model credit rates do not change with package size or usage. Catalogue
money/savings use a fixed standard conversion, without a package selector. Credits
never expire. Exact verified numeric rates, margin and historical comparison
implementation remain open; trial/free-credit rules remain under OD-006.
Coordinate currencies/packages with OD-003 and units with OD-009.
**DECIDED:** pricing and final charges are server-authoritative.
See [BILLING.md](BILLING.md).

S02.1's [model evidence register](MODEL_PRICING.md) now covers the complete
29-entry image/text reference inventory. A1–A8 remain investigations, including
unresolved official mappings, preview retirement conflicts and contradictory
CL/VIP refund evidence. B01/B02 remain open; documented listing/identity checks
do not approve launch support, comparisons or pricing. S02.2 has rechecked the
29 tariffs and seven USD packages, confirming the 66,600 credits/USD reference.
Official rates include context/expiry/cache conditions; unresolved aliases and
per-request image comparisons remain unavailable. S02.3 now provides a typed
reference inventory and exact display arithmetic with comparison gates. The
[Stage 2 review](STAGE2_REVIEW.md) records the frontend owner's 2026-09-20
acceptance of historical savings exclusions, versioned coverage and every model
disposition. **DECIDED:** our price must never exceed the equivalent official
price; a negative comparison is a pricing/evidence error, not a normal offer.
S02.4/S02.5 are complete with backend/billing validation explicitly deferred to
B02/S12. Commercial margin, ceiling enforcement and settlement remain open.
No source gap or partner review is resolved by frontend approval.

## OD-015 Search visibility activation and rendering strategy

Status: **DECIDED** for the frontend rendering approach; **OPEN** for activation
and hosting verification. Suggested coordination owner: Samuel.

The frontend owner accepted [ADR-005](decisions/ADR-005-public-build-time-prerendering.md):
Vite production server build plus React static prerendering for public paths and a
separate noindex private SPA shell. An eight-route component probe succeeded with
homepage SVG title warnings (F-011). This settles S01.5's frontend choice, not
production verification or partner approval. Samuel/hosting coordination remains
under B09/S13; S11 implements the design. No indexing flag or deployment has changed.
**DECIDED:** indexing is opt-in and off by default; see
[ADR-004](decisions/ADR-004-seo-and-measurement.md).

The SEO, structured-data and consent-gated measurement infrastructure exists and
is inactive. What remains open is when to activate it and how public pages are
rendered.

- Activation is blocked by real content and verified pricing, and by the domain
  decision in OD-004. It must not be enabled while the catalogue shows fictional
  prices: an "unverified" label on the page does not travel into a search snippet.
- **DECIDED:** prerender public acquisition/content pages with content and metadata
  in the initial HTML using the Vite/React build-time approach in ADR-005. Hosting
  integration remains open.
  **INVESTIGATION:** initial HTML currently has unconditional noindex that runtime
  JS removes. Fix and verify production/preview behavior before launch; a flag
  change alone is not yet proven sufficient. See the plan's issue F-001.
- **DECIDED:** organic acquisition only, with equal image/text focus. Measure
  conversions without enabling advertising campaigns/tags. All partners expect to
  help with outreach; assign individual deliverables rather than assuming ownership.
- **OPEN:** structured data for models and prices. `Product`/`Offer` markup is
  deliberately absent and must not be added before prices are verified.

Coordinate with OD-004 (hosting, which determines whether `_headers` and
`_redirects` apply), OD-012 (monitoring and retention overlap with analytics), and
OD-014 (pricing). See [FRONTEND.md](FRONTEND.md) for the launch checklist.

## Review notes and uncertainties

- The existing Node.js starter agrees with the bootstrap technology default, but
  does not establish Workers compatibility or decide deployment. No direct setup
  contradiction was found; missing product features are expected at this stage.
- **Resolved scope conflict (2026-09-15):** the user explicitly chose an API-only
  MVP, superseding the bootstrap's browser-at-launch requirement and browser-first
  milestone. The original specification need not be retained; follow
  [ADR-001](decisions/ADR-001-api-only-mvp.md) and [PRODUCT.md](PRODUCT.md).
- No backend framework is selected. The first slice uses an API client, not a
  first-party chat page. Future generation UI timing is uncommitted. Public website
  and customer dashboard scope is now accepted in [FRONTEND.md](FRONTEND.md);
  the initial browser auth slice is implemented under OD-001; backend auth,
  payments and the database remain open under OD-002/003. Frontend technology and
  navigation are accepted in that guide and [ADR-002](decisions/ADR-002-frontend-stack.md).
  Hosting, notifications and support/status delivery remain open. Public-page
  indexing is now built but deliberately inactive under OD-015.
- `.env.example` names anticipated Supabase/Stripe/upstream integration variables;
  none are consumed by the starter. Monitoring variables await OD-012.
- These repository guides are the permanent source of truth; the initial bootstrap
  specification is no longer required.
- Git inspection found no commits and a configured `origin/main` tracking branch
  reported as gone during bootstrap inspection. This is a historical observation;
  verify current Git/remote state before collaboration work.


## 2026-09-21: upstream purchasing basis confirmed

**DECIDED (owner):** always use the GrsAI USD150 package for upstream acquisition. The currently verified package includes19,980,000 total credits, giving133,200 credits/USD. Acquisition cost is model credits /133,200 USD, half the base-package reference cost. This supersedes treating the bulk package as merely hypothetical. Recheck package terms if they change.

**OPEN (product/billing owners):** customer selling prices and margin. Package choice alone does not authorize replacing customer prices with acquisition cost. The existing66,600-credit reference remains unchanged until selling prices are agreed. Any future savings claim must use the actual selling price and matching official settings.


## 2026-09-21: provisional selling-price markup

**DECIDED (owner, for now):**20% markup above acquisition cost using the USD150 package. Formula: model credits /133,200 *1.20 USD (equivalently credits /111,000 USD). This is markup, not20% gross margin; gross margin before fees and other costs is1/6. Supersedes the open markup choice in the preceding package decision. Implementation and production enforcement remain pending.

This does not establish universal savings: Sunburst2400 credits gives acquisition0.018018... USD and proposed retail0.0216216... USD, above the official1024-square Medium output example0.01317 and below the4K High output example0.10008. Comparisons must retain explicit settings and exclusions; no blanket positive percentage is authorized by this commercial choice.


**DECIDED (2026-09-21, H-043):** apply approved credits/111,000 USD selling-price formula to frontend preview cards and detailed rates. Static Save up to badges use best listed image preset with its official reference settings visible. This supersedes H-042 pending frontend implementation; backend enforcement remains open.


H-044: A6 published mapping resolved from July1 announcement plus Chinese catalogue: Fast and2Lite both reference gemini-3.1-flash-lite-image,1K. Runtime routing still unverified. A1 bareGPT2.5 and A8 Gemini3Pro exact served ID remain open; detailed source findings in MODEL_PRICING.md.
