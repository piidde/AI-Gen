# Decisions and investigations

**DECIDED** records an accepted implementation direction, not a deployed or
verified service. **OPEN** records unresolved choices. **INVESTIGATION** means
evidence is required before claiming support.

See the [2026-09-20 frontend review](FRONTEND_REVIEW.md) for frontend decisions.
The [frontend implementation plan](superpowers/plans/2026-09-20-frontend-implementation-plan.md)
tracks frontend execution, dependencies and implementation findings.

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
No admin dashboard UI exists yet; admin identity
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

Frontend pricing research (2026-09-20 to 2026-09-21):

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

## OD-015 Search visibility and rendering

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

## Launch gates

Before public sales, apply and review the migration, run database and financial
behavior tests, validate GrsAI text/media request and response contracts with a
limited budget, configure and test Stripe, verify all enabled model prices and
limits, set customer terms/tax/invoicing/retention, configure alarms and Cloudflare
resources, and complete the focused security/billing review. The backend was
merged into `main` on 2026-10-06; the website dashboard is not yet connected to it.

## 2026-09-21: upstream purchasing basis confirmed

**DECIDED (owner):** always use the GrsAI USD150 package for upstream acquisition. The currently verified package includes19,980,000 total credits, giving133,200 credits/USD. Acquisition cost is model credits /133,200 USD, half the base-package reference cost. This supersedes treating the bulk package as merely hypothetical. Recheck package terms if they change.

**OPEN (product/billing owners):** customer selling prices and margin. Package choice alone does not authorize replacing customer prices with acquisition cost. The existing66,600-credit reference remains unchanged until selling prices are agreed. Any future savings claim must use the actual selling price and matching official settings.


## 2026-09-21: provisional selling-price markup

**DECIDED (owner, for now):**20% markup above acquisition cost using the USD150 package. Formula: model credits /133,200 *1.20 USD (equivalently credits /111,000 USD). This is markup, not20% gross margin; gross margin before fees and other costs is1/6. Supersedes the open markup choice in the preceding package decision. Implementation and production enforcement remain pending.

**Superseded for the backend (2026-10-06 merge):** OD-014 records the backend's
assumed 2.0x markup, which takes precedence. Frontend price displays still use
the 20% formula and must be aligned before any model is enabled.

This does not establish universal savings: Sunburst2400 credits gives acquisition0.018018... USD and proposed retail0.0216216... USD, above the official1024-square Medium output example0.01317 and below the4K High output example0.10008. Comparisons must retain explicit settings and exclusions; no blanket positive percentage is authorized by this commercial choice.


**DECIDED (2026-09-21, H-043):** apply approved credits/111,000 USD selling-price formula to frontend preview cards and detailed rates. Static Save up to badges use best listed image preset with its official reference settings visible. This supersedes H-042 pending frontend implementation; backend enforcement remains open.


H-044: A6 published mapping resolved from July1 announcement plus Chinese catalogue: Fast and2Lite both reference gemini-3.1-flash-lite-image,1K. Runtime routing still unverified. A1 bareGPT2.5 and A8 Gemini3Pro exact served ID remain open; detailed source findings in MODEL_PRICING.md.
