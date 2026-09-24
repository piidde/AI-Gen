# Takewing AI Frontend Implementation Plan

> For agentic workers: use the executing-plans skill to work through this plan
> task by task. Do not delegate unless authorized by the user or applicable
> instructions. This is one implementation plan and persistent execution log.

This plan covers the frontend workstream. Partners may maintain separate backend
or infrastructure plans; their dependencies are tracked here without claiming
ownership of those implementations. Resume with "Continue with the Frontend
Implementation Plan" to distinguish this workstream.

**Goal:** complete the agreed public website and API customer dashboard, including
organic discovery, while preserving the approved design and allowing mock-first
frontend development alongside partner-owned backend work.

**Architecture:** retain React, TypeScript, React Router, Vite and ordinary CSS.
Public acquisition/content routes must deliver prerendered content and metadata;
private dashboard routes remain authenticated. Use explicit frontend view data
and small mock/live boundaries; our backend owns prices, money, permissions,
credentials and upstream access. No first-party generation UI.

**Stack:** existing frontend dependencies, Supabase browser authentication,
Playwright with local Chrome; repository-file blog publishing. Choose the smallest
compatible prerender/content mechanism during S01 and record the decision.

## 1. Current handoff — read this first

| Field | Current value |
| --- | --- |
| Last updated | 2026-09-24 |
| Overall status | IN_PROGRESS overall; S01-S11 DONE for local/mock boundaries |
| Working branch | `main` after authorized H-069 integration; source `feat/frontend-mvp-foundation` retained |
| Inspected code baseline | `67a8386` — frontend plan naming; baseline verified in H-004 |
| Current implementation step | H-069 dashboard review checkpoint; owner authorized commit, push and main merge |
| Next action | Owner Settings visual review; S12.1 backend contracts/readiness when partners are ready. |
| Latest completed work | H-068 Settings tabs, notifications and draft warnings refined |
| Delivery | H-069 integrates H-062 through H-068 into main; see git history for checkpoint commit |
| Latest verification | H-069: root/frontend builds and typechecks; 202 frontend checks passed (14 expected skips); H-068 auth 76 passed (2 expected skips) |
| Global blocker | None for mock-first frontend work; verified API examples and real publication remain gated under B07/B08/S12/S13. |
| Do not forget | Equal image/text acquisition; credits never expire; F-001 fixed in local artifacts only; preserve partner authentication; B09/B12/S12/S13 gates remain |

The user requested a plan, not implementation in this planning session. A future
instruction to continue implementation should resume from the next actionable
step here. Inspect the actual repository before relying on this snapshot. Do not
automatically pull, merge, reset, commit, push or deploy. Never discard uncommitted
work. If the branch has been merged or renamed, locate its successor and update
this handoff without recreating completed work.

### Resume procedure

1. Read this handoff, the stage board, unresolved dependencies, and open findings.
2. Read `AGENTS.md`, the relevant domain guide and the target stage's files.
3. Inspect `git status --short`, `git branch --show-current`, `git log -5 --oneline`
   and the relevant diff. Compare current code with the last recorded evidence.
4. Select the in-progress task, otherwise the earliest ready step. If a dependency
   blocks only live integration, continue the agreed mock work or another ready
   stage and record the reason for the order change.
5. Mark the step IN_PROGRESS, with owner/session date, before changing code.
6. Finish a coherent slice, verify it, update the step/board and append decisions,
   findings and evidence here. Update affected domain guides in the same change.
7. Before ending the session, update this handoff with exact next step, dirty files,
   tests actually run, blockers, and any unfinished operation. Do not leave an
   IN_PROGRESS task without an explanation of what remains.

### Status and evidence rules

- PENDING: not started. IN_PROGRESS: active work with a remaining-work note.
- BLOCKED: identify the exact dependency and safe work that can continue.
- DONE: acceptance checks passed and evidence is recorded. A checkbox alone is
  not evidence. Use `[x]` only for DONE steps; keep all others `[ ]` with status.
- SUPERSEDED: retain the history and link to the replacement; do not erase it.
- A mock stage can be DONE with **mock evidence**; that does not close S12 live
  integration or S13 launch. Accepted requirements are not implemented features.
- After new changes invalidate an earlier check, reopen the affected step and
  record why. Do not rewrite historical failures as if they never occurred.
- Commit references are optional until the user authorizes a commit. Record files
  and test evidence for uncommitted work; never fabricate a commit identifier.

This plan owns progress, handoff and implementation history. `FRONTEND_REVIEW.md`
preserves the original discussion. `PRODUCT.md`, `API.md`, `BILLING.md`, `DATA.md`,
`SECURITY.md` and ADRs own their domain contracts. New accepted decisions must be
recorded here and in affected guides; disagreement between them is a finding to
resolve, not permission to silently choose whichever is convenient.

## 2. Existing implementation — reuse, do not rebuild

Source inspection at baseline, not a claim of current passing runtime tests:

| Area | Present today | Still required |
| --- | --- | --- |
| Foundation | Approved dark English design, desktop/mobile layouts, navigation, dialogs, tabs, demo states | Complete agreed interactions and state coverage |
| Authentication | Email/password, Google, gated Discord, confirmation/reset/callback flows, dashboard guard, logout | Approved signup/settings extensions and production gates |
| Profile | Display-name persistence through Supabase user metadata | Email/password changes, billing profile, deletion, real preferences |
| Models | Shared public/dashboard cards, filters, detail dialog; fictional prices | Researched prices, families/variants, comparisons, model pages |
| Overview/usage | Fixture metrics/chart, request filters and basic detail dialog | Periods, richer metadata, exports, savings, real data |
| Billing | Sample orders and explanatory purchase/document dialogs | Packages, purchase states, document flows and provider integration |
| API keys | Sample list and create/revoke previews | Interactive mock lifecycle, show-once behavior, live API integration |
| Public site | Homepage and placeholder docs/support/status/contact/legal routes | Final content, status/updates/blog routes and shared public navigation |
| SEO | Metadata registry, sitemap/robots generation, basic JSON-LD, consent-gated tags | Initial HTML fix, public prerendering, new routes/content and launch verification |
| Backend | Node/TypeScript readiness starter | No account-management API, billing ledger, provider adapter or schema implementation established |

Existing tests: `frontend/tests/frontend.spec.ts`, `frontend/tests/seo.spec.ts`.
Configuration is **`frontend/playwright.config.mjs`**, not a `.ts` file. Tests
currently describe the old demo behavior; evolve meaningful assertions when the
agreed behavior changes. Do not preserve obsolete placeholders just to keep tests green.
Authenticated dashboard tests skip unless `E2E_EMAIL` and `E2E_PASSWORD` are
available. Use controlled test credentials supplied securely, never print/store
them here, and report skipped tests separately from passes (F-007).

## 3. Accepted scope and boundaries

| ID | Requirement / decision | Delivery stages |
| --- | --- | --- |
| R01 | API-only image/text service; preserve design; no video or browser generation | All |
| R02 | Group model families/variants; exact copyable IDs, verified tradeoffs, status and historical retirement handling | S02, S03, S08, S12 |
| R03 | Real GRSAI-reference prices, official comparisons, money first/credits second; fixed standard conversion; no catalogue package selector | S02, S03, S09, S10 |
| R04 | Purchase bonuses add wallet credits only; model credit charge stays fixed; credits never expire | S02, S04, S07, S12 |
| R05 | USD accounting/checkout, optional approximate EUR display with manual switch; browser-local labelled timestamps | S01, S03–S09 |
| R06 | Billing combines purchases/history, receipt and invoice downloads, editable shared billing details | S04, S07, S12 |
| R07 | Failed purchases return captured funds when unfulfilled; failed requests restore credits only if no upstream cost; billed policy rejections stay charged | S04, S05, S12 |
| R08 | Full usage metadata/history, presets/custom dates, filters, duration/tokens, CSV of all matching records | S05, S12 |
| R09 | Named show-once keys, masked identifiers, last used, confirmed revocation, history, usage links and connection help | S06, S12 |
| R10 | Optional personal/business/company/address/VAT fields at signup and settings; email/password changes; self-service deletion forfeits credits | S07, S12 |
| R11 | Credit-threshold email alerts, once per crossing with rearm; initial alert if already below; optional product updates off by default | S07, S12 |
| R12 | Status page/incidents, dashboard notice, catalogue availability, Overview announcements and chronological archive | S08, S09, S12 |
| R13 | Overview 7/30-day metrics/chart, five recent requests, first-use guidance, refresh; all-time official-price savings | S09, S12 |
| R14 | Original savings-led homepage/site copy, verified model cards, prepaid explanation, preview, steps, FAQ and public links | S10 |
| R15 | Support links and safe details; contact/terms/privacy; docs content reviewed separately; chatbot after docs, outside MVP | S05, S08, S10 |
| R16 | Desktop-first responsive flows, keyboard operation, clear states, preserved edits, session return, copy feedback | All UI stages, S13 |
| R17 | URL filters, actionable errors without unsafe retry advice, copy safe support summary | S01, S03, S05, S04 |
| R18 | Prerendered public SEO/GEO surfaces, selected model pages, organic-only acquisition with equal image/text focus, conversion measurement | S01, S03, S10, S11, S13 |
| R19 | Repository-file AI-assisted blog, original verified content, topic filters, article metadata/TOC/code/sources/related links | S10, S11 |
| R20 | Mock-first account workflows; reuse real auth; server-authoritative production behavior | S01, S04–S09, S12 |

Catalogue bonuses never change the displayed model price or saving percentage.
All-time savings use the accepted standard conversion and comparable historical
official rates, with a visible basis/coverage explanation. Do not invent a saving
where there is no equivalent price. Historical comparison prices must not silently
change when today's rates are updated. The settlement edge cases need the explicit
contract in S02.4/S12; this is not permission for browser-side billing arithmetic.

**Excluded unless separately approved:** first-party chat/playground, generation
history content previews, video, BYO storage, multi-provider routing, cross-family
comparison tool, favourites/calculators, auto-topups/custom purchase amounts/codes,
saved-filter management/scheduled reports, separate model/key spending breakdown
widgets, advanced key controls/rename/pause/rotation wizard, MFA/session lists/login
linking, avatars/teams, additional notification channels/subscriptions, notification
bell/unread counts, uptime charts, maintenance calendar, dashboard customization,
runway estimates, global search/PWA/translations, mandatory onboarding/tours,
tickets/live chat/community support, CMS/comments/newsletter/blog search, paid ads,
referrals, fabricated testimonials, trust centre and downloadable policy PDFs.

Earlier deferrals of all model landing pages and the blog were superseded by the
accepted discovery work. Earlier image-first and two-image/one-text suggestions
were superseded by equal image/text focus. Normal accessibility is included;
custom keyboard shortcuts are not. The AI help chatbot is a post-documentation
follow-up, not hidden work inside this MVP.

## 4. Stage board

Step rows below are authoritative; keep this board synchronized. No feature stage
is marked complete merely because an earlier demo exists.

| Stage | Goal | Status | Dependencies / delivery boundary |
| --- | --- | --- | --- |
| S00 | Reconcile scope and establish this plan | DONE | Documentation only; V-001 |
| S01 | Baseline, shared data/UI conventions and public rendering choice | DONE | S01.1–S01.6 complete; ADR-005 accepted; implementation/host gates remain S11/S13 |
| S02 | Verified catalogue/pricing/content evidence | DONE | S02.1-S02.5 complete; D-011 owner approval; B01/B02 and backend/billing validation remain S12 |
| S03 | Models, pricing and public model-family pages | DONE | S03.1-S03.5; V-010/H-014; reference scope only; live and deployed-host gates retained |
| S04 | Billing purchase/history frontend | DONE | S04.1-S04.5; V-011/H-016; mock only, B03/B11/S12 retained |
| S05 | Usage, request investigation and exports | DONE | S05.1-S05.6; V-012/H-018; B04/B02/S12 remain live gates |
| S06 | API key frontend lifecycle | DONE | S06.1-S06.4; V-013/H-020; nonfunctional demo only, B05/S12 retained |
| S07 | Auth extensions, account settings and notifications | DONE | S07.1-S07.6; V-014/H-022; mock extensions, B03/B06/S12 retained |
| S08 | Status, updates, support and public policy pages | DONE | S08.1-S08.6; V-015/H-025. Docs brief accepted; real publication and verified examples remain B07/B08 |
| S09 | Overview and all-time savings | DONE | S09.1-S09.4; V-016/H-027; B02/B04/S12 remain live gates |
| S10 | Homepage, repository blog and content completion | DONE | H-032 correction with approved card pricing hierarchy; publication and backend equivalence remain gated |
| S11 | Organic discovery and conversion instrumentation | DONE | S11.1-S11.6 local preparation/verification; V-018/H-031; B09/B12/S12/S13 gates retained |
| S12 | Replace mocks and verify production contracts | PENDING | Relevant UI slice + corresponding backend/provider gate |
| S13 | Integrated review and launch readiness | PENDING | Relevant stages complete; launch gates closed |

Order is a dependency guide, not a mandate to idle behind partner work. S04–S08
can proceed independently after S01. S12 can connect finished slices incrementally;
record which slice is connected and which still uses mocks. S13 launch cannot be
DONE while required live gates remain open.

## 5. Open dependencies and owners

Names are existing suggested owners, not a claim that anyone accepted new work.
Assign a named owner and evidence when closing a dependency.

| ID | Unresolved input | Owner / coordination | What proceeds / what waits |
| --- | --- | --- | --- |
| B01 | Final supported model/channel set, especially CL; exact alias/capability evidence | Frontend + upstream/API owner | Family UI/research proceeds; unsupported entries cannot be advertised |
| B02 | Verified current rates/packages, standard conversion, historical comparison basis, margin | Frontend + billing/product partners; OD-009/014 | Research/view formats proceed; real offers/savings need evidence |
| B03 | Payment provider/methods, checkout/documents/refund contract | Mario suggested; OD-003 | Provider-neutral mock flow proceeds; no live charge or document promise |
| B04 | Management API shapes, full metadata retention, pagination/export | API implementer + Samuel; OD-002/008/012 | Explicit view models/fixtures proceed; no invented endpoint/retention guarantee |
| B05 | Key generation/storage/revocation and ownership enforcement | API/security owner unassigned; OD-010 | Show-once mock UI proceeds; production secrets/lifecycle wait |
| B06 | Auth extensions, billing-profile persistence, deletion, email delivery/alerts | Samuel/auth partner + backend owner | Mock settings proceed; server side effects/delivery require contracts |
| B07 | Support channel, incident/update publisher and data source | Product/operations partners; assignment open | Page/state design proceeds; no fake contact or healthy status |
| B08 | Documentation brief/API examples, legal/business disclosures, final copy review | Frontend + API/product owners | Docs brief accepted in D-015; tested API examples, legal disclosures and publication review remain open |
| B09 | Production domain/host, redirects/headers, public render deployment | Pippi + Imerian suggested; Samuel SEO | Local prerender work proceeds; public launch/indexing waits |
| B10 | Trial amount, eligibility and anti-abuse | Team; OD-006 | Core prepaid product proceeds; omit trial promises unless separately settled |
| B11 | EUR quote source/freshness and fallback | Frontend + backend/product owner | Mock estimate proceeds; USD remains authoritative; no stale estimate presented as a payment quote |
| B12 | Outreach/content assignments and ongoing maintenance | All partners expect to participate | Content surfaces proceed; each launch article/outreach item gets one owner |

Non-expiry, equal image/text focus, organic-only acquisition and repository blog
publishing are **decided**, not dependencies to reopen. Do not silently select a
payment provider or make a free-credit offer to unblock frontend development.

## 6. Implementation stages and steps

Paths below are relative to the repository root. Existing files should be reused.
New paths are proposed implementation locations, not claims that files already
exist. If inspection suggests a smaller coherent structure, record the choice
and update this plan before dependent work. Do not prebuild generic SDKs or services.

### S00 — Planning baseline

**Status:** DONE. **Goal/scope:** durable, agreed scope and execution record.
**Files:** this plan, `AGENTS.md`, `README.md`, `docs/FRONTEND_REVIEW.md` and linked
domain guides. **Dependencies:** reviewed conversation and source inventory.

- [x] S00.1 [DONE] Consolidate accepted scope, exclusions and superseded directions.
- [x] S00.2 [DONE] Inspect baseline code and map remaining work to stages/files.
- [x] S00.3 [DONE] Add resume links, issue/decision/verification logs and next action.
- [x] S00.4 [DONE] Audit plan coverage, local links, IDs and documentation consistency; V-001.

**Exit:** a new session can find this plan from AGENTS/README without local research
files. No production implementation or runtime pass is claimed by this stage.

### S01 — Foundation and implementation baseline

**Status:** DONE. **Goal:** establish reusable boundaries and behavior for the
agreed flows without replacing the approved design or partner auth.
**Dependencies:** none for local inspection; B09 for deployment-specific choices.
**Files:** existing `frontend/src/App.tsx`, `demo/fixtures.ts`, `components/{DemoState,Dialog,Tabs,DashboardLayout}.tsx`,
`styles/{tokens,global,home,auth}.css`, `frontend/src/auth/AuthProvider.tsx`,
`frontend/src/auth/RequireAuth.tsx`, `frontend/src/auth/authUtils.ts`,
`frontend/index.html`, `frontend/vite.config.ts`.
New targeted modules: `frontend/src/data/viewModels.ts`, `frontend/src/data/demoClient.ts`,
`frontend/src/lib/{formatting,queryState,clipboard}.ts` as needed.

- [x] S01.1 [DONE] Record actual HEAD/dirty files and run baseline checks from section 7. Inspect existing tests and isolate pre-existing failures before feature changes; do not rewrite partner work.
- [x] S01.2 [DONE] Define frontend-only records for catalogue/variants, rate evidence, wallet/packages/orders, requests/billing outcomes, keys, profile/preferences, incidents/updates and overview. Use absolute timestamps, stable IDs and explicit unavailable/unknown values. Keep server DTOs unresolved; do not turn fixture strings into backend contracts.
- [x] S01.3 [DONE] Implement small asynchronous mock boundaries with selectable loading/empty/error/success/uncertain cases. Mock mutations update only demo state. Keep live Supabase auth separate; no secret in fixtures and no production operation behind a demo button.
- [x] S01.4 [DONE] Add consistent local-time labels, USD/EUR estimate formatting, copy success/failure feedback and URL filter helpers. Browser timezone is automatic; custom periods must respect local-day boundaries and preserve absolute instants. Handle invalid query values without crashing. Record the EUR-source fallback choice before real estimates.
- [x] S01.5 [DONE] Choose and document the smallest prerender mechanism compatible with existing React/Vite and hosting direction. Public HTML must contain content and correct route metadata; private routes remain non-indexable. Record an ADR before architecture changes, coordinating with Samuel. Include F-001 remediation in this design; do not migrate frameworks by default.
- [x] S01.6 [DONE] Exercise keyboard focus/return/Escape, retained form input, pending submission and expired-session return. Ensure URL filter changes do not repeatedly steal focus or scroll to the top through current RouteEffects. Establish shared mobile table/dialog behavior.

**Validation/exit:** targeted checks for local-day/DST boundaries, bad query strings,
clipboard failure, cancelled/unmounted mock responses and session return; existing
suite still covers keyboard/mobile behavior. Document any view/backend boundary
assumptions. No live backend integration required to close this stage.

### S02 — Model, price and comparison evidence

**Status:** DONE. **Goal:** remove fictional catalogue pricing with a reviewable,
dated dataset shared by UI/content. **Dependencies:** B01/B02; research can begin now.
**Files:** new `frontend/src/content/catalogue.ts`, `docs/MODEL_PRICING.md`;
`docs/BILLING.md`, `docs/API.md`, `docs/OPEN_DECISIONS.md`. Detailed exploratory
screenshots remain outside the repository; verified publishable facts belong here.

- [x] S02.1 [DONE] Recheck GRSAI image/text inventory and official model identities. Record family, variant ID, provider, capability/resolution, units, limitations, availability and source/date. Isolate unresolved CL/aliases; verify speed/stability claims instead of inferring them from names. Exclude video. Owner: Codex, 2026-09-20; [evidence register](../../MODEL_PRICING.md), V-007/H-010. Unverified speed/stability claims withheld; A1–A8 remain explicit evidence gaps, not verified support.
- [x] S02.2 [DONE] Recheck GRSAI credit rates and USD packages, then official standard rates/options. Record exact units, input/output/cache/image settings, source and as-of date. Compare equivalent variants; distinguish standard from batch/cache discounts and exclude unverified comparisons. Owner: Codex, 2026-09-20; MODEL_PRICING numeric snapshot, V-008/H-011. Reference evidence only; no production price/support approval.
- [x] S02.3 [DONE] Build a typed publishable dataset with fixed standard conversion and integer/scaled decimal or exact string representation. Implement deterministic display calculations without making the browser authoritative. Record rounding rules and show unsupported comparisons as unavailable, never 0% fabricated data. Owner: Codex, 2026-09-20; catalogue.ts/pricing.ts/pricing.spec.ts; V-009/H-012. Reference content is ready for owner review, not publication approval.
- [x] S02.4 [DONE] Agree the all-time savings view contract: historical rate versions, settled usage/charges, coverage and exclusions, failed/refunded requests and retirement. Owner accepted STAGE2_REVIEW on 2026-09-20 with correction: our price must never exceed the equivalent official price; negative differences are errors requiring reconciliation, not normal offers. Backend/billing validation explicitly deferred to S12; D-011/H-013.
- [x] S02.5 [DONE] Review all prices, variants and claims with the frontend/product owner. All 29 entries have verified/unavailable/awaiting-evidence dispositions in [STAGE2_REVIEW](../../STAGE2_REVIEW.md), accepted 2026-09-20. Product owner explicitly defers partner backend/billing validation to S12. No unexplained inventory entries or inferred production support; D-011/H-013.

Reference package snapshot rechecked in S02.2 on 2026-09-20, **revalidate before publishing**:

| USD | Total credits | Bonus |
| --- | ---: | ---: |
| $5 | 333,000 | 0% |
| $10 | 732,600 | 10% |
| $30 | 2,597,400 | 30% |
| $60 | 5,994,000 | 50% |
| $100 | 11,322,000 | 70% |
| $150 | 19,980,000 | 100% |
| $1,000 | 133,200,000 | 100% |

The snapshot's standard reference is 66,600 credits/USD. Bonus credits are derived
from the verified package; they do not change the price of a 600-credit request.
No specific model price is approved solely because it appeared in old research.

**Validation/exit:** hand-calculated representative text input/output/cache and
image-option cases agree with displays; mixed units, missing official rates and
rounding cannot produce misleading discounts. Content uses the same source.

### S03 — Catalogue and model-family pages

**Status:** DONE (Codex, 2026-09-20; V-010/H-014). **Goal:** discover and compare supported models and variants.
**Dependencies:** S01 and verified S02 entries. **Files:** `frontend/src/pages/Models.tsx`,
new `frontend/src/pages/ModelDetail.tsx`, `frontend/src/content/catalogue.ts`,
`frontend/src/App.tsx`, `frontend/src/seo/{routes,generate,structuredData}.ts`;
targeted catalogue components only where public/dashboard reuse warrants them.

- [x] S03.1 [DONE] Replace example cards with grouped families and side-by-side variants, keeping provider/capability/search filters and URL state. Show each exact API ID with copy feedback and verified suitable-use/limitation explanations.
- [x] S03.2 [DONE] Show fixed monetary rates first, credits second, explicit units/settings, official comparison and evidence date. Add optional EUR estimate/manual currency selection without changing USD checkout or introducing a package selector.
- [x] S03.3 [DONE] Show temporary unavailability and remove permanent retirements from active discovery. Keep historical request references readable. Reuse a single availability source with status surfaces; do not fake automatic upstream monitoring.
- [x] S03.4 [DONE] Add `/models/:slug` for a researched selection of useful image and text family pages: original explanation, rates/options, limitations, verified integration/docs links and CTA. Register routes, metadata and internal links for prerendering. Unverified examples must not look runnable.
- [x] S03.5 [DONE] Verify public/dashboard consistency, empty filters, invalid/deep URLs, currency estimates, variant keyboard interaction and mobile comparison layout. Refresh/back restores filters; unknown slugs produce a true missing page at deployment.

**Completion boundary:** D-011 permits the accepted dated reference inventory,
including unresolved variants. Exact public API IDs remain pending and copy controls
are explicitly for reference IDs. EUR selection falls back to USD until B11 provides
fresh estimates. Retirements are excluded non-destructively from discovery; existing
history retains its own labels. Four known family paths have metadata and generated
host rules; unknown paths render the missing page with noindex and receive no model
wildcard rewrite. S11 prerendering and S13 actual deployed HTTP status remain required.
This local frontend completion does not claim that those later gates are verified.

**Exit:** catalogue uses researched data, has no fictional-price or package-based
rate behavior, and provides equal discoverability for image and text. S12 owns
live availability/pricing integration; static snapshots are explicitly dated.

### S04 — Billing and purchases

**Status:** DONE (Codex, 2026-09-20; V-011/H-016). **Goal:** complete reviewable purchase/order/document flows.
**Dependencies:** S01/S02 packages; B03/B11 for live checkout/EUR.
**Files:** `frontend/src/pages/{Billing,Settings}.tsx`, `frontend/src/data/{billingDemo.ts,BillingDemoProvider.tsx,demoClient.ts}`,
`frontend/src/components/{BillingDetailsForm,Dialog}.tsx`, `frontend/src/App.tsx`,
`frontend/src/styles/global.css`, billing data/auth-fixture tests and `docs/BILLING.md`.

- [x] S04.1 [DONE] Build package cards with USD price, base/bonus/total credits and non-expiry copy. Add a selected-package review showing the exact USD total before continuing; EUR is only an estimate. Do not add custom amounts, codes or auto-topups.
- [x] S04.2 [DONE] Implement mock pending/success/cancel/failure/refund states. Pending confirmation must not claim credited funds or encourage a potentially duplicate payment. Failed purchase explanations distinguish uncaptured failure from captured-funds reconciliation/refund.
- [x] S04.3 [DONE] Expand history with date, ID, amount, credits received and status; order detail shows clear receipt and invoice download states. Simulate local labelled sample documents or explicit unavailable states; do not claim authentic documents or successful payment.
- [x] S04.4 [DONE] Reuse the shared optional billing profile in Billing and Settings. Add status/support links and safe copyable order details. Preserve edits/errors and prevent duplicate submissions.
- [x] S04.5 [DONE] Verify package arithmetic/display, no credits from a redirect alone, pending reload behavior, failed/denied document downloads, local timestamps and mobile review flow. Record provider-required fields as B03, not new signup requirements.

**Completion boundary:** seven dated reference packages, explicit asynchronous demo
outcomes, conservative pending reload, safe support copy and shared optional profile.
Receipt/invoice controls use explicit pending/unavailable states plus simulated
failure/denial, not generated documents. No checkout provider or live EUR source
selected. Profile/wallet/history are account-keyed in-memory demo data; only an
unresolved identity marker is retained in tab storage. Provider-required fields,
real documents, refunds, offers, confirmation and accounting remain B03/B11/S12.

**Exit:** mock purchase/history flows are complete and truthful; actual provider
actions, document downloads and credited balances remain gated by S12. Live
download authorization and transaction safety require backend evidence.

### S05 — Usage and request investigation

**Status:** DONE (Codex, 2026-09-20; V-012/H-018). **Goal:** explain activity and charges without storing content.
**Dependencies:** S01; B04/B02 for live history and settlement.
**Files:** `frontend/src/pages/Usage.tsx`, `components/{UsageRequestTable,UsageSpendingChart}.tsx`,
`frontend/src/data/usageDemo.ts`, `frontend/src/lib/{usageExport,supportDetails}.ts`,
`frontend/tests/usageData.spec.ts` and authenticated fixture coverage. Existing
Overview RequestTable/UsageChart remain unchanged until S09.

- [x] S05.1 [DONE] Add Today/7 days/30 days/6 months/All time/custom dates; model, key and status filters plus request-ID search. Persist applicable filters in URLs and paginate history. All time means the agreed full account metadata history, not a silent hardcoded sample window.
- [x] S05.2 [DONE] Synchronize period totals and spending chart; rows show time, model/variant, key name, request state, duration and charge. Label local timezone; keep execution and billing statuses independent.
- [x] S05.3 [DONE] Expand details with applicable input/output/cache counts, safe errors, settled charge/refund/awaiting-confirmation states and relevant actions/docs. Only known causes receive corrective advice; unknown/ambiguous billable outcomes must not suggest unsafe automatic retry.
- [x] S05.4 [DONE] Export all filtered records, not just the current page, as CSV. Specify units, timezone/absolute timestamp, fields, escaping and progress/failure/cancel behavior. Prevent spreadsheet formula interpretation of untrusted fields. Never export secrets/prompts/outputs.
- [x] S05.5 [DONE] Add Copy support details with ID, timestamp/timezone, model/status and safe error context, plus Get help. Verify redaction through an explicit allowlist, not blind serialization of response objects.
- [x] S05.6 [DONE] Test composed URL filters/back/reload, local-day boundaries, empty/failed/loading vs zero, retired models/revoked key labels, multi-page CSV completeness, token applicability and failed-but-charged vs refunded requests.

**Exit:** fixture dataset contains enough records and distinct failure/billing
cases to prove behavior. S12 must confirm history retention and complete export;
the frontend cannot promise indefinite backend retention by itself.

### S06 — API keys

**Status:** DONE (Codex, 2026-09-20; V-013/H-020). **Goal:** simple safe key-management UI.
**Dependencies:** S01; B05 for live keys. **Files:** `frontend/src/pages/ApiKeys.tsx`,
`frontend/src/data/KeyDemoProvider.tsx`, App provider integration, Usage key options,
clipboard helper, scoped table CSS and `docs/SECURITY.md`.

- [x] S06.1 [DONE] Create named demo keys with a visibly nonfunctional sample secret, one-time display, copy feedback and save-before-close guidance. After closing, retain only the masked identifier in lists; do not persist secrets in storage, logs or URLs.
- [x] S06.2 [DONE] List name/status/created/last-used, including never used. Active is default; allow access to revoked history. Link each key to filtered usage and provide verified base URL/quickstart help when available.
- [x] S06.3 [DONE] Confirm revocation with integration impact and model pending/error/success behavior. Lost secrets use create-replacement then revoke guidance; no rename/pause/scopes/limits/expiry features.
- [x] S06.4 [DONE] Test secret disappearance across dialog closure/navigation/reload, copy failure, focus return, cancelled/failed revoke, duplicate submission and historical labels. Existing tests that assert the sample list never changes must be updated to agreed mock behavior, not real credential issuance.

**Exit:** UI lifecycle is verified with nonfunctional demo keys; live generation,
hashing, ownership and effective revocation are explicitly S12 evidence.

### S07 — Auth, account settings and notifications

**Status:** DONE. **Goal:** extend existing auth and complete account self service.
**Dependencies:** S01; coordinate B03/B06 before touching shared auth interfaces.
**Files:** `frontend/src/pages/{Signup,Login,AuthCallback,ForgotPassword,UpdatePassword,Settings}.tsx`,
`frontend/src/auth/{AuthProvider,RequireAuth}.tsx`, `frontend/src/auth/authUtils.ts`,
shared `BillingDetailsForm.tsx`, mock client and `docs/SECURITY.md`.

- [x] S07.1 [DONE] Coordinate current partner work and preserve existing sign-in methods/gates. Add optional account-type/company/address/VAT capture with equivalent optional completion after OAuth; no mandatory onboarding, extra identity questions or trial promises.
- [x] S07.2 [DONE] Make confirmation/reset expiration/failure states actionable and preserve safe intended destinations. Add email change with pending verification and password change for password accounts; explain provider-managed credentials for OAuth accounts without silently linking methods.
- [x] S07.3 [DONE] Reuse display-name editing and shared billing profile. Add identity-confirmed deletion flow showing remaining credits and explicit forfeiture/API-access termination. Mock deletion must not delete the real Supabase user. Resolve pending operations and retention effects with B06 before live deletion.
- [x] S07.4 [DONE] Add low-balance enable toggle, editable credit threshold, current balance and verified account email. Add one optional product-update toggle off by default; remove separate documentation updates. Explain essential transactional messages separately.
- [x] S07.5 [DONE] Model one initial alert if enabled while below threshold, one alert on a downward crossing, rearm only after recovery above threshold. Document threshold-edit and unverified-email cases with backend owner before integration. The browser saves preferences, never acts as the production email scheduler.
- [x] S07.6 [DONE] Test optional signup completion, OAuth/password differences, retained edits, expired links, rejected save, deletion cancellation/reauth failure and preference states. Plan server behavior tests for duplicate alerts/rearming under S12.

**Exit:** mock account flows and actual supported auth paths are distinguishable.
No new production claim until security guide gates (SMTP, CAPTCHA/rate policy,
callbacks, server verification, etc.) are tested by the responsible owners.

### S08 — Status, updates, support and policy content

**Status:** DONE for mock/content scope (V-015/H-025); documentation brief accepted in D-015. **Goal:** make problems and help discoverable.
**Dependencies:** S01; B07/B08 for real publishing/contact/legal content.
**Files:** new `frontend/src/pages/{Status,Updates,Support,Policy}.tsx`,
new `frontend/src/components/IncidentNotice.tsx`; existing `Information.tsx`,
`App.tsx`, `DashboardLayout.tsx`, SEO registry; repository content records as needed.

- [x] S08.1 [DONE] Build `/status` with overall and affected-model/service state, timestamp, incident impact/start/update/resolution details. Include unavailable/stale-source behavior; no fetch failure may imply operational health.
- [x] S08.2 [DONE] Reuse incidents in dashboard notices/catalogue availability. Build recent dated announcements and a chronological `/updates` archive with addressable details. Keep incidents distinct from ordinary news; no bell/unread/search/subscriptions.
- [x] S08.3 [DONE] Build one Support page linking common help topics, docs and status; show only the selected real contact channel/response expectations. Link request/order help and explain safe context to send. Unchosen contact information stays an explicit content gate.
- [x] S08.4 [DONE] Replace Contact/Terms/Privacy placeholders with readable approved content, dated sections and consistent footer links. Reflect non-expiry, conditional request refunds and deletion forfeiture. Do not generate legal promises from competitor text. Keep consent preferences revisitable.
- [x] S08.5 [DONE] Hold the separately requested documentation scope review before detailed docs implementation. Record its accepted brief and steps here; provide the existing `/docs` route/navigation boundary now, but do not invent working API examples or omit documentation from launch readiness.
- [x] S08.6 [DONE] Check incident/catalogue agreement, missing status data, chronological links, safe support context, section anchors, mobile navigation and public/private boundaries. Real publishing/delivery is completed in S12 or via reviewed repository content, per B07.

**Exit:** agreed public/help/status UI works with explicit mock/content boundaries.
Publishable documents and real support/source ownership are required for launch,
not for initial layout review. Chatbot remains a follow-up.

### S09 — Overview and savings

**Status:** DONE for mock scope (V-016/H-027). **Goal:** summarize the account and demonstrate savings honestly.
**Dependencies:** S02 and S04–S08 shared view data.
**Files:** `frontend/src/pages/Overview.tsx`, `components/{UsageChart,UsageRequestTable}.tsx`,
existing `IncidentNotice.tsx`, `data/overviewDemo.ts` and shared request/wallet fixtures.

- [x] S09.1 [DONE] Preserve the layout; add shared 7/30-day totals/chart periods, available credits, Add credits/history actions and completed/failed counts. Keep request/credit chart switching and show exactly five recent requests.
- [x] S09.2 [DONE] Add the all-time summary: "You've saved $X compared with official API pricing." Explain standard conversion, historical comparison and coverage; handle no history, unavailable and partial comparison cases. Chart period changes must not change the all-time figure.
- [x] S09.3 [DONE] Compose approved active-incident and announcement content. New accounts receive useful next steps (purchase, key, quickstart), not misleading zero-filled charts or an onboarding wizard.
- [x] S09.4 [DONE] Add last-updated and refresh behavior, with independent error handling where appropriate. Test consistent totals with usage data, period changes, partial savings, retired models and failed refresh without implying zero balance.

**Exit:** Overview agrees with the same fixture records used by Billing/Usage;
production savings/settlement are server-confirmed during S12.

### S10 — Homepage, blog and publication content

**Status:** DONE for reference/content scope (V-017/H-029). **Goal:** turn the existing design into original, useful
acquisition content for image and text customers equally.
**Dependencies:** S02/S03, S08; B08 for final copy/docs and B12 for content ownership.
**Files:** `frontend/src/pages/Home.tsx`, `styles/home.css`, new
`frontend/src/pages/{Blog,BlogArticle}.tsx`, `frontend/content/blog/`,
`frontend/src/content/blog.ts`, `App.tsx`, SEO registry; reuse catalogue data.

- [x] S10.1 [DONE] Review original savings-led copy across the site: precise model/API cost benefit with substantiated comparisons, Get started/Explore models actions, equal image/text visibility. Remove vague/obsolete demo claims where they no longer describe the page, while retaining accurate mock labels.
- [x] S10.2 [DONE] Update homepage selected real models/prices, prepaid/bonus explanation, dashboard preview, signup-to-request steps and concise FAQ. Only add executable copyable integration snippets after API verification. Keep public support/status/docs/legal links consistent.
- [x] S10.3 [DONE] Select a simple repository article format compatible with S01 rendering; record the choice. Validate slug/title/summary/topic, author or reviewer attribution, publication/update dates, draft state and related links. Exclude drafts from routes/sitemaps. Do not add a CMS or permit arbitrary unsafe HTML from content by default.
- [x] S10.4 [DONE] Build `/blog` summaries/topic filters and `/blog/:slug` pages with headings, dates, images/tables, source links, code-copy feedback, longer-article TOC, related articles and contextual model/docs/signup links. No blog search, comments, newsletter or translations.
- [x] S10.5 [DONE] Prepare reviewed launch content for both modalities from researched opportunities: cost comparisons, tested integration examples, cost-saving guides or first-hand tests. AI-assisted drafts require verified claims/code/results; do not invent tests, authors, customer evidence or savings. Reuse verified prices to reduce drift; assign ongoing owners.
- [x] S10.6 [DONE] Check original copy, readable long articles/mobile tables, image descriptions, draft exclusion, invalid slugs, code copying, broken links and price consistency across homepage/catalogue/blog. Record deferred API examples/content as launch gates rather than publishing filler.

**Exit:** content surfaces complete and selected articles genuinely reviewed;
specific article count is not fixed by this plan. Both image and text have useful
coverage. Publication timing remains controlled by S13.

### S11 — Search, AI discovery and organic measurement

**Status:** DONE for local preparation and instrumentation. **Goal:** expose useful public content and measure customer outcomes.
**Dependencies:** S01 render decision, S03/S10 routes, B09/B12 for activation/owners.
**Files:** `frontend/index.html`, `frontend/vite.config.ts`,
`frontend/src/seo/{config,routes,generate,head,structuredData,analytics}.ts`,
`frontend/src/components/ConsentBanner.tsx`, `frontend/tests/seo.spec.ts`,
new `docs/ACQUISITION.md` for verified content targets/operations, not another plan.

- [x] S11.1 [DONE] Implement S01 public prerender choice and fix F-001. Production-ready public responses contain readable content, title/description/canonical/social metadata and correct robots directives without executing JS. Preview remains closed; auth/private routes remain noindex. Do not embed session data in public artifacts.
- [x] S11.2 [DONE] Generate sitemap and public routes including model/blog/update pages from actual publishable content; exclude drafts, private/search/filter variants. Verify missing URLs return correct host status, old topic redirects, query canonicalization and social previews. Use structured data only when truthful and applicable, not as a claimed GEO shortcut.
- [x] S11.3 [DONE] Verify relevant search/AI crawler access against current official guidance and actual host/CDN configuration. Record source/date. Separate search retrieval permissions from training preferences; no special-file or citation guarantee. Register Search Console/Bing with authorized account/domain access at launch.
- [x] S11.4 [DONE] Define and instrument the consent-aware funnel: public landing/referral, signup completion, first confirmed credit purchase, first successful API request. Do not count clicks/redirects as purchases or send secrets/query PII. Deduplicate verified outcomes; record attribution gaps and keep advertising tags/campaigns inactive.
- [x] S11.5 [DONE] Research specific image and text topics without an image-first quota; record evidence, audience, verified price advantage and intended landing page. Assign one owner per article/outreach deliverable. Prepare useful distribution material; sending/posting requires explicit authorization and is not implied by this plan.
- [x] S11.6 [DONE] Verify raw HTML in indexable/non-indexable builds, public route hydration, canonical/JSON-LD output, consent rejection/revisit, no unauthorized tracking, funnel event duplicates and no private data in URLs/events. Production search registration/event outcomes remain S13 gates.

**Exit:** locally verified crawlable content and testable instrumentation. Search
rankings, AI citations and customer volume are outcomes to measure, not acceptance
promises. Organic work continues after launch with assigned maintenance.

### S12 — Live integration and partner handoff

**Status:** PENDING. **Goal:** connect completed slices without weakening trust boundaries.
**Dependencies:** relevant UI stage plus each B01–B09 contract. Can run slice by slice.
**Files:** new `frontend/src/data/apiClient.ts` or small feature-specific clients
when justified; existing view/mock boundary, auth files and affected pages;
`docs/{API,BILLING,DATA,SECURITY,ARCHITECTURE}.md` updated with verified contracts.

- [ ] S12.1 [PENDING] Agree management operations/payloads, timestamp/credit representation, ownership, error categories, pagination, export, request/billing states, rate versions and freshness. Map to existing view data explicitly; do not silently turn mock shapes into server schema. Record each slice owner and readiness in the table below.
- [ ] S12.2 [PENDING] Connect catalogue, wallet/usage/history/export and overview/savings. Prove cross-account denial, correct pagination/export, historical price preservation, retired identity retention and unknown/ambiguous state behavior. Full metadata-history requirement needs a documented retention contract.
- [ ] S12.3 [PENDING] Connect keys and account/profile/preferences/deletion using server-authorized operations. Prove one-time secret handling, effective revocation, no secret persistence, account-owned data, identity-confirmed deletion and credit forfeiture. Verify live alert initial/crossing/rearm/duplicate behavior through backend evidence.
- [ ] S12.4 [PENDING] Connect chosen payment flow, confirmed balances/orders and authorized receipt/invoice delivery in test mode. Obtain meaningful backend evidence for duplicate webhooks, concurrent spend, uncertain charges and refund rules. A compile or browser success screen cannot close this step.
- [ ] S12.5 [PENDING] Connect incident/announcement sources and support/docs/API metadata; integrate true EUR quote/fallback if provided. Ensure unavailable/stale sources do not produce invented health or prices. Verify actual signup/reset/notification email delivery with test accounts.
- [ ] S12.6 [PENDING] Wire server-confirmed conversion outcomes and remove demo labels only from connected verified surfaces. Retain clear development fixture access without a public mock/live ambiguity. Complete per-slice handoff and risk review with evidence.

| Live slice | Status | Contract/owner/evidence |
| --- | --- | --- |
| Catalogue/availability/rates | PENDING | B01/B02/B04 |
| Wallet/usage/export/savings | PENDING | B02/B04 |
| Key management | PENDING | B05 |
| Account/profile/deletion | PENDING | B06 |
| Preferences/email delivery | PENDING | B06 |
| Checkout/orders/documents/refunds | PENDING | B03 |
| Status/announcements/support | PENDING | B07/B08 |
| Acquisition outcomes | PENDING | Verified events from the above |

**Exit:** every required slice has contract and behavioral evidence; backend
implementation remains partner-owned unless explicitly assigned. Never mark a
missing backend DONE because the UI is complete. Block only dependent slices.

### S13 — Integrated acceptance and launch readiness

**Status:** PENDING. **Goal:** verify the agreed experience and operational handoff.
**Dependencies:** required stages/live slices complete, publishable content, B09.
**Files:** `frontend/tests/{frontend,seo}.spec.ts`, targeted feature specs added
along the way, `frontend/playwright.config.mjs`, deployment files and this log.

- [ ] S13.1 [PENDING] Run the agreed end-to-end journey in a controlled environment: signup/confirmation, optional profile, credits purchase, key creation, request from an external API client, usage/refund investigation, savings/history/export and documents. No browser generator is added for testing.
- [ ] S13.2 [PENDING] Verify public pages/content, responsive desktop/mobile flows, keyboard operation, local timezone/DST, currency estimate labels, error/empty/loading states, direct routes/back links and regression coverage. Review the existing 2550px wide layout as well as 1440px desktop and 390px mobile.
- [ ] S13.3 [PENDING] Close security-guide production gates with owners: exact auth URLs, email delivery, selected CAPTCHA/auth-rate controls, server ownership/authorization, host headers/CSP and payment test evidence. Required controls are backend/ops dependencies, not new optional customer settings.
- [ ] S13.4 [PENDING] Verify final domain/HTTPS/host behavior, raw initial HTML, robots/sitemap/canonicals and no indexing of previews/private pages. Enable indexing only for verified public content. Verify search-account registrations, consent behavior and real conversion events without paid campaigns.
- [ ] S13.5 [PENDING] Review all R01–R20 coverage, outstanding findings/workarounds and deferred items with the owner. Record explicit release limitations and rollback/operator contact. Publishing/deployment, commit and push need authorization beyond preparing this plan.
- [ ] S13.6 [PENDING] After authorized release, smoke-check public and private paths, record deployment/commit and actual evidence, and hand off pricing/content/status/support ownership. Change the handoff to maintenance or the next authorized stage; do not erase the implementation log.

**Exit:** mock completion, live integration and launch verification are separately
evidenced. No unresolved critical issue is hidden by an overall DONE status.

## 7. Validation protocol

Existing commands, run from the repository root:

```powershell
git status --short
git branch --show-current
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix frontend test
git diff --check
```

Use `npm --prefix frontend ci` only when dependencies are absent or the lockfile
changed. Node >=24 is the existing requirement. The frontend test script builds
first, starts preview on port 4173 and uses local Chrome. Do not run competing
preview servers on that port. Artifacts go to the OS temporary directory.

For a targeted existing spec after building, run with `frontend` as the explicit
tool working directory:

```powershell
npx playwright test tests/frontend.spec.ts
```

Record the exact command and working directory. Prefer the established full test
script for stage completion. Do not invent root test/lint/format scripts.
Only run root `npm run typecheck` and `npm run build` if Node-side work changes.

Tests should protect meaningful behavior listed in each stage, especially pricing,
authorization, secrets, refunds and repeated operations. Compilation is insufficient
for those areas. Avoid redundant tests for static prose/trivial styling. After
repeated clean checks, target changed risk areas; broaden only for new concerns
and the integrated release review. Document skipped/blocked checks honestly.

For SEO, inspect the raw served HTML and status codes with JS disabled or an HTTP
client, not just the hydrated DOM. Test indexable and preview builds separately;
never enable preview indexing on a public deployment for a test. For mocks, tests
must demonstrate absence of real charges/credential issuance and clear fixture labels.

## 8. Decision log

Add a row when implementation changes the method, boundary or scope. Accepted
product decisions above need not be debated again. A new proposal remains OPEN
until settled; never let an implementation shortcut silently change a policy.

| ID / date | Status | Decision and reason | Affected stages / follow-through |
| --- | --- | --- | --- |
| D-001 / 2026-09-20 | DECIDED | One plan with stage/step state, handoff and append-only execution history; user requires cross-session continuity | All; linked from AGENTS/README/FRONTEND |
| D-002 / 2026-09-20 | DECIDED | Mock-first account work, researched real prices, preserve partner auth and approved design | S01–S12 |
| D-003 / 2026-09-20 | DECIDED | Fixed catalogue conversion; bonuses only purchase credits; non-expiry firm | S02/S04/S09/S12 |
| D-004 / 2026-09-20 | DECIDED | Equal image/text acquisition supersedes image-first research suggestion | S03/S10/S11; research evidence retained, not a launch quota |
| D-005 / 2026-09-20 | DECIDED | Organic only; repository-file blog; public prerendering needed | S01/S10/S11; mechanism still to be recorded |
| D-006 / 2026-09-20 | DECIDED | Existing working branch holds planning work; no commits/push/product implementation authorized by plan creation | All; do not rewrite shared main |
| D-007 / 2026-09-20 | ASSUMPTION — frontend implementation | S01.2 uses exact decimal strings and explicit-offset instants for view records. Add a separate typed snapshot rather than parsing legacy display strings or migrating every page at once. S01.3 provides isolated async reads/preference saves; consuming pages and feature-specific mutations migrate in their owning stages. No server denomination, DTO, pricing or settlement rule is selected. | S01/S04–S09/S12; DATA/ARCHITECTURE; V-003 |
| D-008 / 2026-09-20 | ASSUMPTION — display fallback | Preserve supplied decimal precision rather than silently rounding. EUR without a supplied fresh estimate falls back to USD and an unavailable label; no invented exchange rate/source. Custom dates use local calendar boundaries and exclusive-end absolute instants. Catalogue selects push history, search typing replaces it. | S01.4/S03–S09; FRONTEND; B11 remains open; V-004 |
| D-009 / 2026-09-20 | SUPERSEDED by D-010 | Prefer Vite production server build + React static prerender for public paths, separate private SPA shell, shared metadata and matched hydration. Alternatives and eight-route component probe in proposed ADR-005. No architecture implementation or partner acceptance claimed. | S01.5/S11/S13; OD-015/B09; Samuel/hosting review pending |
| D-010 / 2026-09-20 | DECIDED — explicit frontend owner approval | JannesG / PlaYa-44 accepted ADR-005's Vite/React build-time public rendering and separate non-indexable private SPA shell, and closing S01.5/Stage 1. Corrects the earlier treatment of partner coordination as a blocker to the frontend choice. No partner acceptance is implied; host-specific coordination remains B09/S13. | S01 DONE; S11 implementation and local F-001/F-011 fixes complete in V-018; supersedes D-009 |
| D-011 / 2026-09-20 | DECIDED - explicit frontend owner approval | JannesG / PlaYa-44 accepted the full Stage 2 reference dispositions and savings contract, with the correction that our price will never exceed the equivalent official price. Negative comparisons indicate errors, not normal offers; do not silently clamp them. Backend/billing validation deferred to S12, without claiming partner approval. | S02 DONE; B01/B02/S12 production gates remain open; STAGE2_REVIEW and BILLING updated |

| D-012 / 2026-09-20 | ASSUMPTION - frontend implementation | Reuse grouped cards and shared rates/details for all 29 accepted reference variants; four editorial pages give two image/two text entry points. No table framework, new dependency, invented public ID or exchange rate. Confirmed retirements leave discovery without deleting source data; existing history owns recorded labels. | S03; FRONTEND/MODEL_PRICING; V-010; S11/S12/S13 boundaries retained |

New row fields: ID/date, owner/source, options considered, chosen option/reason,
scope/contract impact, files/ADR, follow-up stage IDs, verification. Preserve
superseded decisions with a link to their replacement.

| F-018 / 2026-09-20 | RESOLVED - billing session lifecycle and focus | Independent review found Support navigation recreated the dashboard-scoped demo session, and pending checkout disabled/removed the modal opener. Browser regressions reproduced lost profile values and both focus-return failures. Moved the account-keyed provider above route switching; Dialog now resolves a current fallback to the pending-order action or focusable history heading. Final desktop/mobile suites pass; no auth bypass or live billing change. |

## 9. Findings, errors and workarounds

| ID / discovered | State | Evidence, impact and required follow-up |
| --- | --- | --- |
| F-001 / 2026-09-20 | RESOLVED locally; deployed gate retained | S11 build emits route content and correct robots directly in HTML. Both isolated build modes pass raw no-JS checks; V-018. Original empty-root/runtime-noindex limitation is preserved in earlier entries. Actual deployed host/indexing still B09/S13. |
| F-002 / 2026-09-20 | OPEN — contract gap | Current fixtures are formatted strings and contain fictional EUR payments, dates, rates and product-updates-on defaults. S01 normalizes view data; S02/S04/S07 replace incompatible samples. Never parse formatted strings as authoritative money. |
| F-003 / 2026-09-20 | RECORDED limitation | Google Trends research returned HTTP 429; no reliable image-vs-text search-volume claim obtained. No workaround data invented. Equal image/text decision is D-004; S11 researches specific topics. |
| F-004 / 2026-09-20 | RECONCILED | Older notes left non-expiry tentative, last-used optional, acquisition paid/open or image-first. Updated review/domain register to current decisions; preserve historical research as evidence, not authority over later decisions. |
| F-005 / 2026-09-20 | RESOLVED inspection error | Attempted `.ts` Playwright config read failed; `rg --files` found `frontend/playwright.config.mjs`. Plan uses actual file. No product defect or test failure resulted. |
| F-006 / 2026-09-20 | RESOLVED shared behavior | S01.4 changed RouteEffects to distinguish filter changes from page navigation. S01.4/S01.6 browser tests verify catalogue focus, history and scroll preservation. S05 must retain these semantics for its new filters. |
| F-007 / 2026-09-20 | LOCAL MOCK COVERAGE ADDED; live coverage open | S01.6 adds separate test:auth build with fictional intercepted responses, exercising actual guards/session/forms without a production bypass. Original E2E_EMAIL/E2E_PASSWORD tests still skip without credentials; do not claim live service evidence or all future dashboard feature coverage from the fixture. |
| F-008 / 2026-09-20 | RESOLVED tooling limitation | Initial documentation-audit attempt using Python failed because Python was unavailable on PATH. Re-ran the link/status/ID audit using existing Node.js; passed. No installation or product change needed. Use Node or PowerShell for similar local checks. |
| F-009 / 2026-09-20 | RESOLVED local environment | S01.1 typecheck/build initially failed because the installed dependencies lacked the locked Supabase package. `npm --prefix frontend ci` restored dependencies without lockfile changes. Sandbox-only installation failed with ENOTCACHED; Vite then required escalation for child-process EPERM. Approved tool retries succeeded; no application workaround added. |
| F-010 / 2026-09-20 | RESOLVED test structure; live coverage still F-007 | The wide-layout test filtered a public-only route list for dashboard routes, executing zero dashboard assertions. Added a separate authenticated test enumerating all six dashboard routes. Moved public missing-page/catalogue interaction checks outside login requirements. Key-operation request observation now starts after sign-in, excluding the expected auth POST. Public checks pass; authenticated assertions remain unverified without controlled credentials. |
| F-011 / 2026-09-20 | RESOLVED | UsageChart SVG point title now has one composed string. Public prerender builds and accessible chart regressions pass without the original React title-child warning. V-018. No warning suppression added. |
| F-012 / 2026-09-20 | RESOLVED — return-path validation | S01.6 fixture test reproduced getSafeNext accepting `/\t/example.com` (and analogous newline paths). ASCII control characters can change meaning during URL normalization. Replaced NUL-only rejection with all ASCII controls/DEL; adversarial and valid-local-path tests pass. No auth bypass or destination contract expansion. |
| F-013 / 2026-09-20 | RESOLVED — mobile sign-out inaccessible | Cross-tab sign-out test failed on mobile because the existing <=720px CSS hid `.sidebar-bottom`, including account controls. Kept the account/resources section visible and positioned its popover below the trigger. Final mobile sign-out test passes; inspected screenshot and bounds. No test-only UI workaround. |
| F-014 / 2026-09-20 | OPEN — catalogue evidence conflicts | S02.1 compared the live directory, announcements and official model docs. MODEL_PRICING A1–A8 record ambiguous IDs, preview lifecycle conflicts, image maintenance, quality differences and contradictory CL/VIP refund claims. Expected: equivalent identity/settings and trustworthy cost/availability evidence before offers. Cause: conflicting or incomplete published sources; actual routing unknown. No product workaround added. B01/B02/API/billing owners resolve with version/parameter/settlement evidence before affected S02/S03/S12 claims; research completeness does not close these gaps. |
| F-015 / 2026-09-20 | RESOLVED — display comparison edge cases | Independent pricing review reproduced tiny negative differences rendered as 0.0% and impossible dates passing freshness checks. Added explicit nonzero percentage bounds and calendar validation; regression and full suite pass. Official arithmetic tests now derive totals instead of formatting constants. No live comparison was enabled. |
| F-016 / 2026-09-20 | RESOLVED — rapid search loses characters | Full suite captured mobile typing “model” as “modl”; isolated repetition failed once in three. Installed BrowserRouter defers URL-state updates via startTransition, while Models controls the input from that state. Chose the supported useTransitions=false option over mirrored local/URL state for this small synchronous app. Three targeted mobile passes, then full ordinary/auth suites pass with explicit value/URL assertions. Revisit when routes require transition rendering; S03/S05 must retain the regression. |

| F-017 / 2026-09-20 | RESOLVED - test transform mismatch | An additional EUR test imported TSX into Playwright then called React static rendering. Playwright's jsx-runtime emits __pw_type objects, which React rejects. Browser app rendering already passed. Moved rate formatting to the pure formatReferenceMoney helper consumed by CatalogueRates and tested directly; no dependency/config workaround. Final ordinary/auth suites pass. The unused history-label helper was removed after review; tests now accurately separate discovery filtering from preserved existing history. |

Source for F-001: [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
Do not claim it proves a current deployed indexing failure; it establishes a
concrete source-code risk to verify and fix.

For every unexpected implementation issue, append: reproduction/context, expected
and actual behavior, affected step/files, root cause (or unknown), attempted fixes
and outcomes, chosen resolution/workaround, verification, residual risk, owner,
expiry/removal condition and later stages affected. Reopen the stage if its exit
criteria are no longer met. Never retain a workaround without explaining removal.

## 10. Verification and session history

| ID / date | Scope and actual result | Limitations |
| --- | --- | --- |
| V-001 / 2026-09-20 | Documentation-only plan audit: source/file inventory, requirement-to-stage coverage, local link/step-ID checks and `git diff --check` | No product code changed. Runtime/typecheck/build/Playwright not run in this planning session; first baseline is S01.1. Exact final audit output is recorded in H-001. |
| V-002 / 2026-09-20 | S01.1 baseline: restored locked dependencies; frontend typecheck passed; `npm --prefix frontend test` built successfully and reported 29 passed / 13 skipped; `git diff --check` passed | 11 skips require E2E credentials; two wide-screen tests intentionally skip mobile. No authenticated dashboard behavior, live integration or launch readiness claimed. See H-004. |
| V-003 / 2026-09-20 | S01.2–S01.3: typecheck passed; full frontend build/test passed, 37 passed / 13 skipped (21.6s); `git diff --check` passed | New client tests run under both existing projects, without a browser fixture. Same 11 credential-dependent and two mobile width skips. Modules are not yet consumed by pages. |
| V-004 / 2026-09-20 | S01.4: typecheck and full frontend build/test passed; 47 passed / 13 skipped (24.7s); `git diff --check` passed | Same dashboard/mobile skips. Public catalogue integration tested on both viewports; account formatting migration and live EUR source remain future work. |
| V-005 / 2026-09-20 | S01.5 design: in-memory Vite/React static rendering probe produced headings on all eight public routes; document links and `git diff --check` verified | F-011 homepage warnings; no production render build, hydration or host validation. No repeat of unchanged application tests; V-004 remains the latest full suite. |
| V-006 / 2026-09-20 | S01.6: final `npm --prefix frontend test` passed build and 49 tests / 13 skips (24.7s); `npm --prefix frontend run test:auth` passed typecheck/build and 13 tests / 1 skip (9.6s); `git diff --check` passed | Ordinary skips: 11 credential-dependent and 2 desktop-only. Auth fixture skip: wide desktop test on mobile. Fictional intercepted responses do not verify live backend/auth policies. Mobile menu screenshot inspected. |
| V-007 / 2026-09-20 | S02.1: read live upstream directory/announcements/linked API docs and official OpenAI/Google identity/lifecycle pages; Node audit passed 29 unique image/text IDs matching the earlier full inventory and 36 local links before the plan evidence link was added; `git diff --check` passed | Documentation research only. No model request, payment or runtime change; no repeated application suite. A1–A8/F-014 remain unresolved; no support, latency, settlement or launch verification claimed. Final plan status/link audit recorded in H-010. |
| V-008 / 2026-09-20 | S02.2: Node audit compared all 29 tariffs / 47 numeric components to current public HTML; all seven USD packages and base/bonus arithmetic matched public goods data; three representative arithmetic checks passed | Official Standard source tables checked with context/cache/expiry conditions. No paid requests, checkout, settlement verification or runtime changes. Initial audit script mixed require/top-level await; corrected to explicit ES modules, then passed. Final documentation audit in H-011. |
| V-009 / 2026-09-20 | S02.3: final npm --prefix frontend test passed typecheck/build and 61 tests / 13 skips (26.8s); test:auth passed typecheck/build and 13 tests / 1 skip (12.9s). Six pricing tests execute in both projects. Independent pricing review has no remaining important findings. Three focused mobile typing passes after F-016 fix. | Initial full run: 60 passed / 1 failed / 13 skipped, exposing F-016. Ordinary skips remain 11 credential-dependent and two desktop-only; fixture skip is wide desktop on mobile. No live financial/provider/auth evidence. Documentation audit and whitespace checks recorded in H-012. |

### H-001 — 2026-09-20 — Planning session

- Work: consolidated frontend/discovery decisions and inspected code at `7c6f587`;
  created this plan, synchronized superseded policies and added continuation links.
- Completion: S00 only. No S01–S13 implementation step started.
- Branch: `docs/frontend-mvp-review`; planning edits uncommitted, nothing pushed.
- Tests: Node-based documentation audit passed: 14 stages, 75 unique steps,
  4 DONE planning steps, 71 PENDING implementation steps, 20 requirement groups,
  81 local links checked, no broken links/undefined step IDs/status mismatches or
  trailing whitespace. `git diff --check` passed; Git emitted only Windows line-
  ending conversion notices. No runtime/build/browser checks run for this docs-only
  change. Python audit attempt failed and was replaced by Node (F-008).
- External research: GRSAI/Cheaper Inference scans and image/text acquisition note
  live outside the repo in the owner's research directory. They are optional
  evidence, not prerequisites for another agent to resume this plan. Recheck live
  sources for rates/capabilities before publication.
- Next: S01.1 when implementation is requested; no unresolved question blocks
  mock-first frontend progress. Respect live gates and documentation-scope review.

### Append each future session here

Use the next H-ID with date, branch/HEAD, owner and step IDs. Record what changed,
why, exact validation commands/results and skipped checks; decisions/findings IDs;
remaining work, blocked dependencies, relevant dirty files and next action. Record
commits/deployments only if actually performed with authorization. Keep substantive
context here rather than requiring a reader to reconstruct chat history.

### H-002 — 2026-09-20 — Commit and push authorization

- User explicitly requested committing and pushing the full planning work on
  `docs/frontend-mvp-review` to `origin`. No merge or product implementation requested.
- This entry is included in the planning commit; locate that commit with
  `git log --oneline -- docs/superpowers/plans/2026-09-20-frontend-implementation-plan.md`.
- Pre-commit inspection: only the eleven intended documentation files are changed
  or new; `git diff --check` passes. Product tests remain unnecessary for this
  documentation-only delivery; S01.1 still establishes the runtime baseline.
- Verify delivery using branch/upstream comparison and clean working-tree status;
  do not infer a successful push solely from this pre-commit entry.
- Next implementation action remains S01.1. All 71 implementation steps remain pending.

### H-003 — 2026-09-20 — Explicit frontend plan naming

- Renamed the document to `2026-09-20-frontend-implementation-plan.md` and the title
  to Takewing AI Frontend Implementation Plan at the user's request, to distinguish
  it from possible partner-owned plans. Updated repository links and resume guidance.
- The previous plan delivery is commit `7442b90`, pushed to the review branch.
  User authorized committing and pushing this naming update on the same branch.
- Scope and step statuses are unchanged; next implementation step remains S01.1.

### H-004 — 2026-09-20 — S01.1 implementation baseline

- User requested continuing this plan on a new branch. Created and switched to
  `feat/frontend-mvp-foundation` from clean HEAD `67a8386`; no pull, merge, commit,
  push or deployment. Work remains in the existing IDE checkout.
- Owner: Codex for the frontend workstream. Completed S01.1 only; S01.2–S01.6
  remain pending. No application behavior or partner authentication code changed.
- Initial `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`
  failed on missing `@supabase/supabase-js`, with dependent implicit-any errors.
  Verified it was present in the lockfile but absent locally. Restored via
  `npm --prefix frontend ci`: 41 packages installed, audit reported zero vulnerabilities.
  Node is v24.18.0. Package and lockfile contents are unchanged.
- Tool limitations: branch creation required escalation for `.git` write access;
  npm install required network/cache access; Vite required child-process access.
  All escalated retries were approved and completed. A PowerShell read mistakenly
  used shell brace expansion and failed before execution; re-read the files with
  native PowerShell enumeration. No repository changes resulted from that error.
- Baseline `npm --prefix frontend test` after environment restoration built and
  reported 25 passed / 13 skipped (18.8s). Inspection identified F-010: vacuous
  dashboard width coverage, unnecessarily skipped public checks, and a key test
  that counted sign-in traffic as a demo mutation. Corrected the test structure.
- Final commands, all from repository root: `npm --prefix frontend test` passed
  its build and reported 29 passed / 13 skipped (22.2s);
  `npm --prefix frontend run typecheck` passed; `git diff --check` passed.
  Git emitted only line-ending conversion warnings. Root Node checks were not
  run because no Node-side code changed. Artifacts remain in the OS temp directory.
- Coverage: public catalogue filters, empty/error/retry behavior, modal Escape and
  focus return, and unusual legacy topic values now execute on desktop/mobile.
  The 13 final skips comprise 11 credential-dependent dashboard cases and two
  desktop-only width cases on mobile. F-007 remains OPEN; before validating
  dashboard changes, use controlled test credentials or an isolated test-only
  network/auth fixture. Do not weaken production auth or treat these skips as passes.
- Dirty files: `frontend/tests/frontend.spec.ts` and this plan. No operation left
  running. Next: S01.2 frontend-only records with stable IDs, absolute timestamps
  and explicit unknown values; S01.3 adds asynchronous demo boundaries. Existing
  formatted fixtures remain unchanged (F-002), and F-001/F-006 remain open.

### H-005 — 2026-09-20 — View records and async demo boundary

- Continued on `feat/frontend-mvp-foundation`, HEAD `67a8386`, preserving H-004's
  uncommitted test/plan changes. User authorized continuation; no commit or push.
- Owner: Codex. S01.2 and S01.3 completed as foundation modules. Added
  `frontend/src/data/viewModels.ts`, `demoSnapshot.ts`, `demoClient.ts` and
  `frontend/tests/demoClient.spec.ts`; updated DATA and ARCHITECTURE.
- Records cover all S01.2 areas. Stable identifiers, historical model/key names,
  exact decimal amount strings, explicit-offset instants, unknown/unavailable
  values and independent request/billing outcomes preserve unresolved contracts.
  List records contain no key secret; request records contain no generated content.
- Typed fictional snapshot has unverified pricing, unknown health, unavailable
  savings and product updates off. Existing UI fixtures remain in use; this is a
  gradual migration boundary (D-007), not a silent replacement of reviewed pages.
- Demo clients own copied in-memory state. Reads and preference saves support
  success/loading/empty/error/uncertain cases. Cancellation rejects with AbortError;
  loading stays pending until aborted. Only successful saves mutate demo state.
  Consumers must abort on unmount or scenario change. No network/storage/auth changes.
- Test-first evidence: `npx playwright test tests/demoClient.spec.ts --project=desktop`
  from `frontend` failed because the client module did not exist. After implementation,
  the three initial tests passed. Added a submitted-value capture test, then ran
  `npm --prefix frontend test` from root: build passed, 37 passed / 13 skipped (21.6s).
  `npm --prefix frontend run typecheck` and `git diff --check` passed. Test artifacts
  stayed outside the repository. No root checks needed; no backend changed.
- Tests cover independent clients, returned-record isolation, non-success saves,
  edits during pending submission, already-aborted reads, loading cancellation and
  cancellation before mutation. Browser-level unmount wiring remains for consumers;
  authenticated dashboard coverage still requires F-007's test setup.
- Next: S01.4. Leave S01.5/S01.6 pending, and F-001/F-002/F-006/F-007 open. Numeric
  rates, EUR source, server DTOs and financial settlement remain unresolved where
  previously documented. No operation left running. Dirty files include H-004
  plus the three data modules, client tests, DATA and ARCHITECTURE.

### H-006 — 2026-09-20 — Formatting, copy feedback and URL filters

- Continued on `feat/frontend-mvp-foundation`, preserving H-004/H-005 work. HEAD
  remains `67a8386`; no commit, push or deployment. Owner: Codex; S01.4 complete.
- Added `lib/formatting.ts`, `queryState.ts`, `clipboard.ts`, `components/CopyButton.tsx`
  and `tests/foundation.spec.ts`. Updated Models, App RouteEffects and FRONTEND.
- Money formatting preserves exact decimal strings beyond safe Number precision.
  EUR requires a supplied fresh estimate; otherwise USD remains visible (D-008).
  Timestamp formatting labels the resolved local timezone. Local custom date ranges
  validate calendar dates and use calendar increments across DST, not fixed 24h days.
- Catalogue filters now round-trip through the URL. Malformed query values do not
  crash the view. Query-only updates no longer move focus/reset scroll in RouteEffects;
  pathname/legacy-topic changes retain navigation focus behavior. This implements
  F-006's shared correction; usage filter and broader keyboard/session checks still
  belong to S05/S01.6 and are not marked done by this change.
- Copy controls retain selectable fictional IDs, report pending/success/failure,
  and ignore completions after unmount or text changes. No live API/model claims.
- Test-first run: `npx playwright test tests/foundation.spec.ts --project=desktop`
  from `frontend` failed on the absent formatting module. After implementation,
  `npm --prefix frontend test` from root built and passed: 47 passed / 13 skipped
  (24.7s). `npm --prefix frontend run typecheck` and `git diff --check` passed.
  Tests cover Berlin's 23h/25h DST days, invalid/inverted dates, precision beyond
  Number limits, missing/expired EUR estimates, clipboard denial/unavailability,
  URL reload/history/focus, malformed filters, and visible copy failure on both
  desktop/mobile. Root backend checks were unnecessary; no Node-side code changed.
- Formatting helpers are ready for consuming pages, not a claim that legacy
  dashboard fixtures have already migrated. B11 and F-007 remain open. All earlier
  dirty files remain, with the S01.4 files above. No operation left running.
- Next: S01.5, compare the smallest compatible public prerender mechanisms and
  record an ADR covering initial HTML/noindex behavior and the host boundary.
  Hosting/coordination remain open; do not enable preview indexing or deploy.

### H-007 — 2026-09-20 — Public prerender design and feasibility

- Branch `feat/frontend-mvp-foundation`, HEAD `67a8386`; preserved all earlier dirty
  work. Owner: Codex. No product code, dependencies, build flags or deployment changed.
- S01.5 design completed in proposed ADR-005. Compared native Vite/React static
  output, React Router framework mode, browser snapshots, request-time rendering/
  framework migration and metadata-only templates. Native build-time rendering is
  the smallest proposed fit for current repository-backed public content.
- Checked official Vite, React, React Router and Playwright guidance on 2026-09-20;
  linked sources and implementation/validation requirements in the ADR. Inspected
  actual entrypoint, routes, head/structured-data helpers, auth/consent boundary,
  index template and redirects. Proposed separate public HTML/private SPA output,
  deterministic hydration including query filters, and initial-HTML robots policy.
- Ran a PowerShell here-string piped to `node --input-type=module` from `frontend`.
  The in-memory probe used Vite middleware-mode ssrLoadModule for the existing
  Home/Models/Information components, React Router StaticRouter/Routes and React
  static prerender, reading each prelude through Response.text(). All eight routes
  produced an h1; output lengths: / 16661, /models 11741, /docs 701, /support 615,
  /status 621, /contact 607, /privacy 639, /terms 625 characters. Vite closed in
  finally; exit 0. Home emitted seven title-child warnings, investigated as F-011.
  This is component feasibility, not a production build/hydration test.
- Updated ADR index, ARCHITECTURE, FRONTEND and OD-015. Checked local document links
  and `git diff --check`; no application changes warrant repeating V-004's suite.
- S01.5 remains IN_PROGRESS solely for the required SEO/hosting coordination and
  final choice. The ADR index explicitly prohibits treating an assumption as an
  accepted ADR, so its status remains Proposed. No partner approval/contact invented.
  S11/F-001 implementation is still pending and preview indexing remains closed.
- Next independent task: S01.6 shared keyboard/form/session behavior verification.
  Resolve ADR-005 with Samuel/hosting owners before S11 architecture changes.
  Additional dirty files: ADR-005, ADR index and OPEN_DECISIONS, plus documentation
  updates above. All earlier dirty work retained; no operation left running.

### H-008 — 2026-09-20 — S01.6 session and shared interaction coverage

- Branch `feat/frontend-mvp-foundation`, HEAD `67a8386`. Owner: Codex. Preserved
  earlier work; no commit, push or deployment. S01.6 completed with local fixture
  evidence; S01 remains IN_PROGRESS only for S01.5's coordination.
- Added `npm --prefix frontend run test:auth`, a dedicated Playwright config,
  scripts/test-auth.mjs and preview-auth.mjs, and tests/auth-fixture.spec.ts.
  The runner builds the actual app with fictional auth configuration, disabled
  indexing/tracking and a unique OS-temp output. Port 4174 avoids the ordinary
  suite's 4173. Playwright intercepts only fictional auth endpoints and rejects
  unexpected external traffic. Production auth client/provider/guard unchanged.
- Covered expired refresh-token rejection and return with filters after login;
  cross-tab sign-out removing protected content; pending login/profile saves and
  retained failed edits; keyboard tabs; modal Escape/focus return and mobile bounds;
  all six dashboard routes at 2550px. Added catalogue scroll preservation to the
  ordinary foundation suite, extending S01.4's focus/history coverage.
- First auth run: 6 passed / 2 failed on unsafe control-character return paths.
  Fixed getSafeNext (F-012). Expanded run: 12 passed / 1 failed / 1 skipped, revealing
  hidden mobile account controls (F-013). Fixed the CSS; final auth run passed
  typecheck/build and 13 tests, with 1 intentional mobile skip for wide-desktop
  coverage (9.6s). The failing cases were reproduced before their fixes.
- Ordinary `npm --prefix frontend test` also run after changes; final result in
  V-006. No root Node checks needed. `git diff --check` passed. Screenshots/traces
  and isolated builds remain in OS temp, not the repository; mobile account-menu
  screenshot visually inspected. No real identity, email delivery or server
  authorization is verified by mock responses.
- Updated CONTRIBUTING, SECURITY and FRONTEND with command, scope and limits.
  F-006 shared focus/scroll defect is verified fixed; S05 still tests its future
  consumers. F-007 now has independent S01 local mock coverage, but original live
  credential-gated tests and all production gates remain open.
- Additional dirty files: package.json, playwright.config.mjs, new auth config/
  scripts/spec, foundation.spec.ts, authUtils.ts, auth.css/global.css and the guides.
  Earlier dirty work retained. No pending operation after final verification.
- Next independent step: S02.1 model/capability evidence research. S01.5's proposed
  ADR-005 still needs SEO/hosting coordination before S11 architecture changes;
  do not mark S01 fully DONE or infer a framework/deployment approval.

### H-009 — 2026-09-20 — Frontend owner accepts rendering choice; Stage 1 closed

- User explicitly answered yes to accepting the Vite/React build-time public
  prerender approach, separate private client-rendered noindex shell, and closing
  S01.5/Stage 1. Recorded acceptance in ADR-005 and D-010; updated the ADR index,
  ARCHITECTURE, FRONTEND, OD-015, stage board, step and current handoff.
- All six S01 steps are now DONE. H-007/H-008 retain the earlier coordination
  interpretation as history; D-010 supersedes it. Hosting verification and partner
  coordination are follow-up work under B09/S13, not a blocker to this choice.
- No rendering implementation, indexing activation or deployment claimed. S11
  still implements the accepted design and fixes F-001/F-011. Prior test evidence
  remains V-006; no application code changed in this approval-recording turn.
- Verification: documentation status/link consistency audit and `git diff --check`.
  No repeated runtime tests for this documentation-only update. All previous dirty
  work preserved on `feat/frontend-mvp-foundation`; no commit or push.
- Next: S02.1 model/capability evidence research. No operation left running.

### H-010 — 2026-09-20 — S02.1 catalogue identity and capability evidence

- Continued on `feat/frontend-mvp-foundation`, HEAD `67a8386`, preserving all
  H-004–H-009 dirty work. Owner: Codex. No commit, push, deployment or partner message.
- Completed S02.1's research inventory in `docs/MODEL_PRICING.md`: all 15 image
  and 14 text entries, family/provider grouping, exact upstream IDs, units,
  advertised resolutions, official identity checks, unknown capabilities and
  dated availability evidence. Excluded video; retained retirement/history notes.
- Re-read the live GRSAI directory, announcement list, linked Banana/GPT-image/chat
  API pages, official OpenAI model pages and Google model/deprecation pages.
  Earlier local research was used for completeness comparison, not as current
  support evidence. No authentication, generation, payment or account mutation.
- Findings A1–A8/F-014 prevent overclaiming: bare aliases and preview identities
  need reconciliation; Flare/Sunburst have a maintenance notice; CL/VIP refund
  evidence conflicts; performance adjectives remain unverified. The unsuccessful
  guessed bare GPT Image 2.5 official URL is not proof of model nonexistence;
  catalogue and named variant pages were checked as alternatives.
- API, BILLING and OPEN_DECISIONS now link the evidence and preserve its limits.
  No typed publishable dataset or price display changed. S02.2–S02.5 remain
  PENDING; B01/B02 and financial/launch gates remain open. A verified identity
  is not verification of the model actually served through the intermediary.
- Validation: PowerShell here-string piped to Node checked 29 unique inventory
  IDs against all 29 image/text IDs in the earlier local inventory; every current
  directory entry was separately checked during research. Initial local-link
  audit passed 36 links across the five touched documents; final audit includes
  the added plan link and verifies step/board consistency. `git diff --check`
  passed with only Windows line-ending notices. No application checks repeated
  for this documentation-only slice; latest runtime evidence is V-006.
- This session's dirty files: new MODEL_PRICING, API, BILLING, OPEN_DECISIONS and
  this plan, in addition to all pre-existing foundation changes. No operation
  remains running. Next: S02.2 numeric rates/packages and equivalent official
  comparison evidence; preserve unavailable comparisons for unresolved mappings.

### H-011 — 2026-09-20 — S02.2 rate and package evidence

- Continued on `feat/frontend-mvp-foundation`, preserving all prior dirty work.
  Owner: Codex. S02.2 complete; S02 remains IN_PROGRESS. No application changes,
  commits, push, deployment or external messages.
- Added the dated numeric snapshot to MODEL_PRICING: 29 upstream image/text
  tariffs, seven USD packages with exact base/bonus derivations, official paid
  Standard text/image components, context thresholds, cache distinctions and
  promotional recheck dates. BILLING and OD-014 now reflect this evidence.
- The standard reference is 66,600 credits/USD from the unbonused $5 package.
  Confirmed all other package totals with that base. This is research for the
  accepted fixed-conversion policy, not approval of margin or ledger units.
- Eleven exact-ID text models have candidate component references. Three text
  aliases and image per-request comparisons stay unavailable. Future displays
  must retain version/settings/unit gaps, cache semantics and source freshness.
  S02.4 savings/settlement decisions and S02.5 owner review remain pending.
- Browser limitation: Playwright reported its profile already in use; CUA had
  no connected browsers (IAB/Chrome unavailable). Did not close anyone's browser.
  Public HTML/script inspection identified the catalogue's existing package read
  endpoint; an unauthenticated POST with country `en` returned HTTP 200/code 0.
  This read performed no purchase or account mutation and used no credentials.
- OpenAI's extracted HTML interleaved hidden Standard/Batch tables. Checked its
  explicit `pricing.md` tables before recording GPT Image 2's Standard rates;
  did not use the half-price Batch row. Official model pages supplied context
  conditions; unresolved GPT-5.5 long-context cache pricing remains unavailable.
- Verification: a PowerShell here-string piped to `node --input-type=module`
  compared 29 documented tariffs / 47 numeric components with live HTML, seven
  documented packages with public goods data, exact base/bonus arithmetic and
  three representative text/cache/image calculations; passed. The first script
  used require with top-level await and failed before checks; changed to import
  and explicit module mode, then passed. No product defect or workaround.
- Final documentation audit checks local links, 75 unique plan steps and
  checkbox/status consistency; `git diff --check` checks whitespace. Application
  builds/tests were not rerun for this documentation-only work; V-006 remains
  the latest runtime evidence, with its recorded skips and limits.
- This session changed MODEL_PRICING, BILLING, OPEN_DECISIONS and this plan.
  All earlier foundation changes remain. No operation running. Next: S02.3
  typed dataset and exact display calculations; retain unknown comparisons and
  do not invent settlement/rounding policy for actual financial accounting.


### H-012 ? 2026-09-20 ? Exact reference pricing and complete owner-review packet

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386; preserved all earlier
  uncommitted work. Owner: Codex. User requested completion through Stage 2;
  no commit, push, deployment or partner message authorized/performed.
- S02.3 complete: added content/catalogue.ts, lib/pricing.ts and pricing.spec.ts.
  All 29 reference variants, seven packages, 11 exact-ID official text candidates,
  context tiers, unknown cache and missing comparisons retain explicit evidence.
  Data stays separate from legacy cards until S03. Public API IDs are unassigned.
- Exact decimal strings and BigInt fractions preserve recurring conversion and
  values beyond Number precision. Display-only rounding/bounds are documented in
  MODEL_PRICING; no bonus-adjusted tariff, browser accounting or rate publication.
- Prepared STAGE2_REVIEW with the proposed savings contract, all 29 dispositions,
  exclusions, historical corrections, coverage and owner closure requirements.
  Updated BILLING/OPEN_DECISIONS. S02.4/S02.5 are BLOCKED only on actual owner
  agreement/review. Asked the user whether to accept the frontend proposal and
  explicitly defer partner review to S12; no response has been recorded. Do not
  treat the instruction to continue as acceptance of these new financial details.
- Test-first run failed on absent catalogue module; initial implementation then
  passed five tests and typecheck. Independent code-review agent found F-015;
  reproduced, corrected and added official derivation/transcription coverage.
  Reviewer checked the corrections and reported no remaining important findings.
- First full suite exposed F-016 in the existing URL-backed search. Trace captured
  modl instead of model; a separate three-run mobile reproduction had one failure.
  Inspected installed router behavior and official React Router documentation.
  Set BrowserRouter useTransitions=false, strengthened search/URL assertions and
  documented the tradeoff in FRONTEND. Three focused reruns passed; stopped
  repetition after those clean passes. Final ordinary/auth results are V-009.
- Tool limits: Python unavailable, then one PowerShell plan write used frontend
  cwd incorrectly; neither changed the plan. Retried from repository root. Initial
  sandbox Playwright failed spawn EPERM; approved process-access retry worked.
  rg wildcard path syntax failed on Windows; directory plus -g search succeeded.
  No dependencies or configuration workaround were added for tool failures.
- This session touched MODEL_PRICING, BILLING, OPEN_DECISIONS, FRONTEND and this
  plan; added STAGE2_REVIEW, catalogue.ts, pricing.ts, pricing.spec.ts; changed
  main.tsx and foundation.spec.ts for F-016. All H-004?H-011 dirty work retained.
  Build/test artifacts remain ignored frontend/dist or OS temp; browser traces
  are outside the repo. Root Node checks unnecessary: no backend code changed.
- Remaining: owner decision on STAGE2_REVIEW, then record actual acceptance and
  finish S02.4/S02.5 or retain partner-review blockers. B01/B02/A1?A8 and S12
  production evidence remain open regardless. No operation left running.
- Final Node documentation audit passed 47 local links, 75 unique steps with
  consistent checkbox/status values, all 29 review dispositions and whitespace
  in new/updated files. git diff --check passed with line-ending notices only.


### H-013 - 2026-09-20 - Owner approval closes Stage 2

- User approved the Stage 2 frontend contract and complete variant dispositions,
  correcting the premise of higher prices: our price must never be higher than
  the equivalent official price. Recorded D-011 in BILLING, OPEN_DECISIONS,
  MODEL_PRICING, FRONTEND and STAGE2_REVIEW; earlier proposals remain in history.
- Normal negative-savings UI is superseded by a pricing/comparison error boundary.
  Exact signed arithmetic remains useful for detecting violations; do not clamp
  them or hide affected records to inflate savings. No helper or UI code changed.
- Backend/billing validation is explicitly deferred to S12. This closes S02.4,
  S02.5 and Stage 2 for frontend scope; no partner review, live support, settlement
  implementation or production offer is claimed. B01/B02 and source gaps remain.
- Existing branch and all dirty work retained; no commit, push or deployment.
  Latest runtime evidence remains V-009; documentation-only approval recording
  does not warrant repeating unchanged runtime tests. Next: S03.1 when requested.
- Validation: local document links, 75 unique step statuses, all five S02 steps
  DONE and consistent stage/handoff state; git diff --check. No operation running.


### V-010 - 2026-09-20 - Stage 3 reference catalogue and family pages

- Test-first catalogue check failed as expected: 4 old cards vs 29 required.
  Price-ceiling regression failed on the old -50.0% result; corrected compareRate
  to report errors for both ordinary and subprecision negatives before rounding.
- Initial full browser run: 69 passed / 13 skipped (36.7s). Expanded data checks
  exposed F-017 test infrastructure mismatch, corrected without app config changes.
- Final npm --prefix frontend run typecheck passed. npm --prefix frontend test
  rebuilt successfully and passed 75 tests / 13 skips (37.1s), desktop/mobile.
  npm --prefix frontend run test:auth passed its typecheck/isolated build and
  17 tests / 1 skip (16.6s). Ordinary skips remain credential-gated account tests
  plus inapplicable wide-mobile checks; auth skip is only the wide-desktop case.
- Covers all 29 tariffs, exact fixed conversion, missing/expired/future EUR,
  unknown cache, official context/source details, zero/negative comparison gates,
  URL reload/back/focus/scroll, legacy Gemini filters, empty results, copy denial,
  keyboard details and focus return, four family deep routes/canonicals, invalid
  slugs, matching status notices, retired-discovery source preservation, public/
  authenticated card equality and legacy history readability. Desktop/mobile
  family screenshots visually inspected; wide dashboard fixture still passes.
- Generated sitemap/preview exclusion and explicit known-route rules verified.
  Vite preview is not a deployed host: true HTTP 404 and initial public HTML are
  explicitly deferred to S11/S13. Indexing and Product/Offer markup stay disabled.
- Independent code-review agent found no blocking findings. Its history-test
  scope concern was addressed by removing an unused helper and adding actual
  authenticated legacy-history checks; final delta reviewed with no important issues.
- Sandbox Playwright initially failed spawn EPERM; approved local process-access
  retry succeeded. Build warning about extensionless Vite-config imports resolved
  with explicit .ts imports. No dependencies, public deployment or external messages.
- git diff --check passed with line-ending notices only. Final documentation audit
  checks links, unique steps, status/checkbox consistency and Stage 3 completion.
  No root Node checks needed: backend source did not change.

### H-014 - 2026-09-20 - Stage 3 complete

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386; preserved all H-004-H-013
  uncommitted work. User requested continuing through all of Stage 3. S03.1-S03.5
  are DONE for accepted reference/frontend scope; runtime evidence is V-010.
- Replaced fictional catalogue cards with 29 researched variants in 12 families,
  shared public/dashboard UI, reference-ID copy details, fixed USD-first pricing,
  unit/settings/source explanations, manual EUR fallback and D-011 error handling.
- Added GPT Image 2, Nano Banana Pro, GPT-5.6 and Gemini Flash pages. Registered
  metadata/known host paths/internal links; added shared dated model notices to
  the existing status page without claiming S08 incident integration or live health.
- New: components/CatalogueBasis.tsx, CatalogueRates.tsx, ModelFamily.tsx,
  PublicCatalogueShell.tsx; content/modelFamilies.ts; pages/ModelDetail.tsx;
  tests/catalogue.spec.ts and catalogueData.spec.ts. Changed Models, Information,
  App, seo/routes, catalogue snapshot/type, pricing helper, global CSS and
  foundation/frontend/pricing/auth-fixture tests. Prior dirty files retained.
- Updated FRONTEND, MODEL_PRICING, BILLING, API, ARCHITECTURE and this plan.
  Official family content links were read on 2026-09-20; no upstream spending,
  generation, account change, commit, push, deployment or partner message.
- Remaining gates: B01/B02 public IDs, support, current prices and comparisons;
  B11 supplied live EUR; S11 initial HTML/prerendering; B09/S13 production host
  404/redirect behavior. Source conflicts A1-A8 and F-001/F-011 remain open.
  None blocks accepted mock/reference frontend completion; no approval invented.
- Next: S04.1 package cards/review, followed by S04 mock purchase/history flows.
  Do not enable live payment from this handoff. All started verification operations
  have finished; artifacts remain in ignored frontend/dist or OS temp.

### H-015 - 2026-09-20 - Stage 4 started

- User authorized completing the next stage, S04. Existing branch/dirty work retained.
- Implement researched packages, asynchronous mock order states, truthful document
  availability, and shared optional billing details. Profile stays in memory; only
  a non-sensitive pending-order marker survives reload in account-scoped tab storage.
- Use a small billing-specific demo module/provider alongside the existing generic
  demo client; no live payment API or invented provider contracts. Verify behavior
  and obtain independent review before closing all five steps. B03/B11/S12 remain.

### V-011 - 2026-09-20 - Stage 4 billing verification

- Test-first billing data import failed on absent module; implementation passed
  four behavioral tests. UI tests first failed on absent packages/profile, then
  six desktop/mobile billing checks passed. Expanded checks cover cancellation,
  storage denial, account isolation, pending controls and safe copy failure.
- First full ordinary suite: 83 passed / 13 skips. First expanded auth suite:
  25 passed / 1 skip / 2 failures from an incorrect expected clipboard string;
  inspected output and aligned the test with existing truthful error wording.
- Independent reviewer identified F-018. Regression runs reproduced profile loss,
  pending close focus loss, then terminal completion focus loss; corrected each.
  Final delta review reported no remaining important findings.
- Final npm --prefix frontend run test:auth passed typecheck and isolated build,
  then 29 tests / 1 intentional mobile wide-desktop skip (50.3s). Final npm
  --prefix frontend test passed typecheck/build and 83 tests / 13 skips (33.0s).
  Ordinary skips remain credential-gated account tests and inapplicable wide-mobile
  cases. No real login, payment, webhook, document or server authorization verified.
- Evidence includes exact package sums, idempotent starts/confirmation, all mock
  outcomes, captured/uncaptured distinction, forged redirect/storage non-authority,
  pending reload, document denial/failure, support-copy privacy/denial, local times,
  retained failed edits, shared settings, departing-operation cancellation,
  second-account isolation, modal focus, mobile widths and 2550px dashboard checks.
- Visually inspected desktop package/profile layout and desktop/mobile review
  dialogs. Screenshots and traces remain in OS temp; builds in ignored dist or
  isolated OS-temp directories. No backend code changed; root checks unnecessary.
- Initial sandbox test process failed with spawn EPERM; approved local process
  retry worked. One spaced grep expression selected no tests; simple grep worked.
  An accidental Windows-1252 plan decode was reversed with a verified lossless
  round-trip, then UTF-8 used for subsequent edits. No content was discarded.
- Final documentation audit checks links, 75 unique steps, checkbox/status/stage
  consistency and whitespace. No test/server operation remains running.

### H-016 - 2026-09-20 - Stage 4 complete

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386; preserved all prior
  uncommitted work. S04.1-S04.5 DONE for accepted mock frontend scope; V-011.
- Added billingDemo.ts, BillingDemoProvider.tsx, BillingDetailsForm.tsx and
  billingData.spec.ts. Replaced Billing placeholders; integrated shared form in
  Settings and account-keyed provider around routes. Reused cancellable demo wait,
  added optional Dialog focus fallback and billing CSS. Extended auth-fixture
  tests and updated the old live-credential billing expectations.
- Updated BILLING, FRONTEND, ARCHITECTURE, DATA and this plan with actual behavior,
  storage/data limits and provider boundaries. No new dependencies or backend API,
  no real payment/document, partner message, commit, push or deployment.
- Dated reference packages are not approved production offers. B02/B03/B11/S12
  remain for revalidation, provider-required fields, confirmation, document access,
  refunds and EUR. Mock state must never be treated as server accounting.
- Next: S05.1 usage periods and URL filters, followed by request investigation and
  export frontend. Stop at S04 as requested; Stage 5 remains PENDING.
- All verification operations finished. Existing dirty changes and local research
  remain intact; no cleanup or branch integration performed.

### H-017 - 2026-09-20 - Stage 5 started

- User authorized finishing the next stage, S05. Existing branch and dirty work retained.
- Implement one filtered history for periods, totals, chart, pagination and CSV.
  Use explicit safe error/support fields; independent execution and billing states.
- Deterministic helpers/tests delegated under the execution skill; UI and integration
  remain with the primary agent. No live retention, endpoint or export guarantee.

### F-019 - 2026-09-20 - Export terminal keyboard focus

- Independent review found completion/failure removes a focused Cancel export
  button. A focused browser regression reproduced lost focus. Initial RAF focus
  restoration still failed because React had not yet committed the enabled export
  button; diagnostic focus events showed no successful focus event. Replaced with
  a layout effect after the state commit, guarded by whether Cancel held focus.
- Desktop/mobile terminal success/failure regression passes; final auth suite also
  checks that moving focus elsewhere is respected. No timer workaround retained.

### D-013 - 2026-09-20 - Usage implementation assumptions

- Reuse typed request records and local calendar helpers with a focused fixture,
  rather than replacing the older Overview preview ahead of S09. Separate small
  request-table/chart components preserve its behavior. No new dependency.
- Today/7/30 day windows include today; six months starts on the same local day
  six calendar months earlier, clamped to month end. Custom end date is inclusive.
  Default 30 days; All time has no date cut-off. Fixtures include 400-day history.
- Ten-row pagination only affects the table. Exact net credits and daily chart
  use the full matching set, by original request start day; unresolved amounts are
  visibly excluded. All-time/retention/settlement remain B04/B02/S12 live gates.

### V-012 - 2026-09-20 - Stage 5 usage verification

- Test-first UI checks failed on absent period/history controls; helper tests failed
  on absent modules. Implemented and verified both. Helper regressions additionally
  exposed incomplete amount labels, legacy names/timezone and control-prefixed CSV
  formulas; corrected before acceptance. Eight data tests pass in both projects.
- First complete ordinary suite: npm --prefix frontend test passed typecheck/build
  and 99 tests / 13 skips (33.2s). Same credential-gated and wide-mobile skips.
- Initial full auth suite: 37 passed / 1 skip / 2 failures, isolating F-019 export
  focus to both viewports. RAF attempt failed; post-commit layout effect fixed it.
  Targeted terminal tests then passed on desktop/mobile. Final npm --prefix frontend
  run test:auth passed typecheck, isolated build, 39 tests / 1 intentional mobile
  wide-desktop skip (1.2m). Final focus-only delta is covered by this auth suite;
  unchanged ordinary helpers/public checks were not repeated unnecessarily.
- Evidence covers preset/custom/DST dates, six-month end-month clamp, 400-day history,
  exact decimals, failed-but-charged/refunded/unresolved billing, applicable tokens,
  old model/key labels, URL composition/reload/back/focus/scroll, ten-row pagination,
  exact export of all 37 IDs, quoting/formula protection, redacted support/copy denial,
  loading/error versus zero, export failure/cancel/stale snapshots and keyboard focus.
- Independent spec/code review and final correction review have no important findings.
  Desktop history and mobile history/details screenshots visually inspected; wide
  dashboard assertion passed. Tables/chart scroll locally. Artifacts remain OS temp.
- Initial sandbox Vite run failed spawn EPERM; approved process access retry worked.
  A combined delete/add patch was rejected before modifying files; used a direct
  UTF-8 write. Removed a malformed ellipsis introduced by PowerShell default encoding
  in the initial added test. Later writes use explicit UTF-8. No dependency changes.
- Root checks unnecessary: backend source unchanged. No production history, retention,
  ownership, payment, generation, accounting or real authenticated API was tested.
  Final documentation audit verifies links, 75 unique steps and stage consistency;
  git diff --check passes with line-ending notices only.

### H-018 - 2026-09-20 - Stage 5 complete

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386; all pre-existing dirty work
  preserved. User requested the next stage, S05, and resumed after an interrupted
  connection. S05.1-S05.6 DONE for mock frontend scope, V-012; stop before S06.
- Replaced Usage placeholders with URL periods/filters, one matching history snapshot,
  settled totals/chart, paginated rows, request investigation, safe support copy and
  cancellable full filtered CSV. Added usageDemo, usageExport, supportDetails,
  UsageRequestTable, UsageSpendingChart and usageData tests. Updated Usage/global CSS
  and ordinary/authenticated usage assertions; old Overview components remain S09.
- Updated FRONTEND, DATA, ARCHITECTURE, API, BILLING, SECURITY and this plan.
  Exact display arithmetic is not settlement; no production DTO, retention promise,
  endpoint, storage or dependency was invented. B04/B02/S12 remain live gates.
- Final code review clear; all verification processes ended. Generated builds remain
  ignored dist or OS temp; screenshots/traces outside the repo. No commit, push,
  deployment, external message, account mutation or upstream spending performed.
- Next: S06.1 named show-once nonfunctional demo keys, then confirmed mock revocation
  and preserved history. Keep B05/S12 secret generation/ownership enforcement gated.

### H-019 - 2026-09-20 - Stage 6 started

- User authorized completing the next stage, S06; branch and prior dirty work retained.
- Account-scoped in-memory demo metadata, page-local show-once sample, abortable mutations.
- Implementation delegated under executing-plans; regression tests/integration and documentation handled by primary agent. B05/S12 remain live gates.

### F-020 - 2026-09-20 - New key usage labels

- Independent S06 review found Usage derived key options only from request history,
  displaying a newly created named key as Unknown key. Desktop/mobile regression
  reproduced the exact incorrect label. Merge session metadata with historical key
  names; existing request labels remain unchanged. The regression now verifies the
  created name and zero matching requests. Final review has no important findings.
- Added finite-success create/revoke cancellation checks after the 500ms completion
  deadline, supplementing indefinite pending previews so cancellation is exercised.

### V-013 - 2026-09-20 - Stage 6 key verification

- Test-first desktop/mobile lifecycle checks failed on the absent Key status
  control. Initial implementation run: 10 passed / 4 failed because exact label
  matching included nested option text. Explicit key label associations corrected
  that; existing Usage controls use accessible-role locators in the new tests.
- F-020's named Usage filter regression reproduced Unknown key on both viewports;
  merged session metadata with historical labels and added zero-request coverage.
  Focused key/keyboard run passed 16 checks. Independent review and re-review clear.
- npm --prefix frontend test passed typecheck/build and 99 tests / 13 expected
  skips (35.5s). npm --prefix frontend run test:auth passed typecheck/isolated build
  and 51 tests / 1 expected mobile wide-desktop skip (1.6m). Ordinary skips remain
  credential-gated account tests and inapplicable wide-mobile checks.
- Subsequent screenshot inspection improved only key table wrapping/action spacing.
  Final targeted lifecycle test rebuilt/typechecked and passed desktop/mobile
  (2 tests, 8.7s), including normal desktop table bounds and mobile document bounds.
  Final screenshots visually inspected; table scroll stays local on mobile, full
  desktop actions visible. No unrelated suite rerun after the scoped layout delta.
- Evidence: one-time sample closure/navigation/reload, no sample in browser storage,
  explicit clipboard success/denial, duplicate creation, retained failed edits,
  pending and finite cancellation for create/revoke, confirmed revoked history,
  modal focus return, never-used/local timestamps, historical names, named empty
  usage, second-account isolation, and existing 2550px dashboard checks.
- Initial sandbox Vite spawn EPERM required approved local-process retry. A spaced
  grep selected no tests; simple grep succeeded. Early PowerShell brace expansion
  was invalid and retried with explicit paths. An image read during a fresh suite
  hit cleaned temporary paths; inspected regenerated screenshots after completion.
  No app workaround, dependency, real credential, network API or backend change.
- git diff --check and final local-link/75-step status audit verify documentation.
  Artifacts remain ignored dist or OS temp. No test/server operation remains running.

### H-020 - 2026-09-20 - Stage 6 complete

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386; all earlier dirty work
  preserved. S06.1-S06.4 DONE for nonfunctional mock frontend scope, V-013. Stop
  before S07 as requested. No commit, push, deployment or external message.
- Replaced ApiKeys previews with asynchronous create/revoke lifecycle, show-once
  samples, copy feedback, active/revoked/all history, local metadata and usage links.
  Added KeyDemoProvider; App scopes it to the authenticated account across routes.
  Usage includes keys before their first request, preserving historical names.
  Shared dialog/clipboard helpers reused; global CSS adds only scoped key layout.
- Extended auth-fixture tests and updated obsolete frontend key expectations.
  Updated FRONTEND, SECURITY, ARCHITECTURE, DATA, API and this plan.
- ASSUMPTION: demo metadata survives client navigation but resets on reload/sign-out
  or account change; samples live only in page state, never the provider/storage.
  B05/OD-010/S12 still own secure server generation/storage, ownership and effective
  revocation; B08 still owns verified quickstart/base URL. No production key claims.
- Next: S07.1 inspect/coordinate existing partner authentication before optional
  signup/account extensions. Preserve the current real auth flow and B03/B06 gates.
- All operations finished; local research and earlier work remain intact.

### H-021 - 2026-09-20 - Stage 7 started

- User authorized the next stage, S07; existing feature branch and dirty work retained.
- Existing auth interfaces inspected; no partner communication or approval claimed.
  B03/B06 remain live gates; new settings side effects are explicit local mocks.
- Account settings delegated under the execution skill; primary owns signup/auth
  recovery, integration tests and documentation. No shared auth API changes planned.

### D-014 - 2026-09-20 - Account extension boundaries

- Existing auth interfaces/provider gates and local partner work inspected before
  changes; no external coordination message or partner approval claimed. B03/B06
  stay open. Retain current real auth/display-name behavior; new settings changes
  use account-keyed in-memory previews rather than extending unknown server APIs.
- Reuse BillingProfileFields for optional signup samples and Settings/Billing.
  Signup samples deliberately remain page-local, never Auth metadata/storage;
  optional post-OAuth completion uses Settings. Persistence/handoff waits for B06.
- ASSUMPTION: positive whole-credit threshold; threshold edits and disable/re-enable
  begin a new alert evaluation, unchanged saves do not. Unverified email defers
  without consuming an alert. DATA/SECURITY record required B06/S12 review/tests.
  No production scheduler, email delivery, deletion or credential mutation added.

### F-021 - 2026-09-20 - Preference cancellation keyboard focus

- Independent review found removal of focused Cancel save lost keyboard focus.
  Desktop/mobile regression reproduced it. Capture focus ownership before ending
  the operation, then restore Save preferences in a post-commit layout effect.
  Regression includes explicit cancel, success, failure and deliberate focus moves.
  Independent correction review reports no remaining important findings.
### V-014 - 2026-09-20 - Stage 7 verification

- Test-first signup/recovery checks failed on absent optional fields and expired-link
  handling on desktop/mobile. Settings check reproduced old product-updates-on state.
  Early typecheck encountered the in-progress helper's optional split result; corrected
  before acceptance. Local Vite required approved process-access retry after spawn EPERM.
- Initial new account checks: 8 passed. Review reproduced F-021 on desktop/mobile;
  final regression covers cancel, terminal success/failure and intentional focus moves.
- npm --prefix frontend test passed typecheck/build and 99 tests / 13 expected skips
  (33.8s). Skips remain credential-gated tests and inapplicable mobile wide checks.
- npm --prefix frontend run test:auth passed typecheck/isolated build and 63 tests /
  1 intentional mobile wide-layout skip (2.2m). Five pure alert tests passed via
  node --experimental-strip-types --test --test-isolation=none frontend/tests/accountSettings.node.ts.
- Final signup wording change avoids naming a gated provider. Targeted test:auth
  -- --grep signup rebuilt/typechecked and passed both viewports (2 tests, 4.1s),
  additionally checking optional fields and page bounds. No unrelated suite rerun.
- Evidence covers signup auth-payload privacy, optional fields, confirmation resend,
  expired callbacks/reset, safe return destination, mock pending email/password,
  provider-only accounts, verified/unverified email, retained failed edits, async
  preference saves, cancellation, navigation persistence, account isolation,
  identity failure/deletion cancellation and zero network mutations from new mocks.
- Alert evidence covers initial/crossing/equality/recovery, duplicate suppression,
  threshold edits, disabled/unverified cases and exact large/fractional amounts.
  Production deduplication/concurrency/ownership/retention/email delivery remain S12.
- Independent spec/code review and correction review clear. Desktop notification,
  mobile deletion and desktop/mobile signup screenshots visually inspected. Wide
  dashboard regression passes. Artifacts remain OS temp/ignored dist; no backend
  source or dependency change, so root checks are unnecessary.
- git diff --check passes with line-ending notices only. Final documentation audit
  verifies links, unique steps and board/checkbox consistency. No operation running.

### H-022 - 2026-09-20 - Stage 7 complete

- Continued on feat/frontend-mvp-foundation, HEAD 67a8386, preserving all prior dirty
  work. S07.1-S07.6 DONE for mock frontend scope plus existing Auth-client recovery,
  V-014. Stop before Stage 8. No commit, push, deployment or partner message.
- Added AccountAccess, NotificationSettings, BillingProfileFields, AccountDemoProvider,
  accountSettings and accountSettings.node tests. Changed Settings, Signup,
  AuthCallback, ForgotPassword, UpdatePassword, BillingDetailsForm and App wiring;
  extended auth-fixture and existing frontend assertions. No auth provider/interface,
  database, real credential/deletion or notification-scheduler change.
- Updated CONTRIBUTING, API, ARCHITECTURE, BILLING, DATA, FRONTEND, SECURITY and plan.
  D-014 records provisional threshold/unverified-email and signup persistence rules.
  B03/B06/S12 still need actual partner review and server contracts. Signup sample
  fields do not survive departure or enter real signup; post-sign-in completion is
  optional. Production account management and email delivery are not verified.
- Next: S08.1 overall/affected-service status and incidents with stale/unavailable
  source behavior. S08.5 requires its separately requested docs scope review before
  detailed docs implementation; B07/B08 remain content/ownership gates.
- All verification operations finished; existing dirty files and local research
  preserved. No cleanup, integration, external account change or upstream spending.

### H-023 - 2026-09-20 - Stage 8 started

- User authorized completing the next stage, S08; existing branch and dirty work retained.
- Status/updates implementation delegated under the execution skill; primary owns public help/policy boundaries, integration, tests and documentation.
- Separate docs brief review requested; no accepted brief or partner-owned content inferred. B07/B08 remain launch gates.

### D-015 - 2026-09-20 - Stage 8 content and documentation boundary

**DECIDED ? owner approval:** the user accepted the proposed documentation brief after clarification: quickstart (account ? credits ? key ? first API request), API-key authentication, model IDs/capabilities, image and text request guides, errors/conditional refunds, and usage/billing basics. Working examples await the verified API contract; chatbot stays post-MVP. The additional options below remain excluded. This supersedes the pending-review state recorded below and in H-024; it does not authorize S09 or imply detailed docs are implemented.

- Default status source is unavailable. URL-selected fictional incident/resolution/stale/loading previews share one source across status, dashboard and model cards; no healthy default or real publisher is inferred.
- Terms/Privacy show dated review summaries of accepted rules and observed implementation, not published legal text. Contact/support channel and response expectations remain unselected, B07/B08.
- S08.5 owner review requested: proposed quickstart, API-key authentication, model IDs/capabilities, image and text request guides, errors/conditional refunds, usage/billing basics. Working examples await the verified contract. Chatbot remains post-MVP.
- Proposal is not accepted without an explicit reply. Documentation brief owner: frontend owner. Additional options for review, excluded by default: SDK-specific tutorials (maintenance before SDK choice), tool/client recipes (need tested contracts), streaming guide (only if verified), extensive troubleshooting cookbook (grow from observed issues).
- After brief acceptance: record its scope; map each section to verified API/product evidence and an owner; author and test examples when B08/S12 contracts exist; review navigation/content in S10 and publication in S13. Current /docs navigation remains usable without invented examples.

### F-022 - 2026-09-20 - Consent controls synchronization

- Independent review found new privacy controls and existing configured-tag banner had independent state; banner could remain and overwrite a saved preference, including enabling ads contrary to organic-only scope.
- Focused configured-tag fixtures reproduced the failures, including old advertising grants/configuration. Shared consent notifications and an in-memory decision fix synchronization and storage-denial revocation. Advertising IDs are ignored and all ad consent stays denied. Final 10/10 configured checks and independent correction review pass; external fixture traffic is intercepted.

### F-023 - 2026-09-20 - Mobile scroll regression setup

- Full authenticated suite found its hard-coded scroll offset (100px) now left the focused Usage search below the viewport after adding dashboard status/navigation. Chrome legitimately scrolled to the field while typing (253px).
- Added an in-viewport assertion, which reproduced the invalid setup before any typing. Center the field before recording scroll, then retain exact focus/scroll and totals/export assertions. Desktop/mobile targeted checks pass; no production scroll workaround was added.

### V-015 - 2026-09-20 - Stage 8 frontend verification

- Test-first help/policy browser checks reproduced missing headings/controls on desktop/mobile. Status helper red was missing-module loading; subsequent data and browser checks cover actual fixture behavior. Initial status browser assertions incorrectly assumed selectOption focuses and timezone labels use GMT; corrected the tests to focus explicitly and read the browser timezone.
- npm --prefix frontend test passed typecheck/build and 117 tests / 13 expected skips (37.2s). Skips remain credential-gated account checks and inapplicable mobile-wide cases. After the final analytics-only boundary correction, affected help/SEO checks rebuilt/typechecked and passed 26/26 (18.8s); unrelated tests were not repeated.
- Initial full auth fixture: 64 passed / 1 skip / 1 mobile test failure. F-023 identifies the obsolete viewport setup; failing in-viewport assertion proved the cause. Targeted corrected checks passed both viewports, then final npm --prefix frontend run test:auth passed typecheck/isolated build and 65 tests / 1 expected mobile-wide skip (2.2m).
- node scripts/test-consent.mjs (from frontend) passed 10/10 desktop/mobile configured-tag scenarios, independently rerun by primary. F-022 covers synchronization, rejected persistence, focus and legacy ad grants/IDs; no real external tracking request was sent. Builds are isolated in OS temp.
- Independent spec/code review and two correction reviews have no remaining important findings. Evidence covers source unknown/stale/loading/resolved states, incident/catalogue agreement, source/timeline timestamps, chronological sample details/noindex, malformed slugs, safe support/private navigation, local anchors/reload, docs boundary, consent persistence and advertising disabled.
- Desktop support/status and mobile status/privacy screenshots visually inspected. Mobile bounds and 2550px dashboard checks pass. Screenshots/traces remain OS temp; build output ignored dist or isolated temp. Initial Vite spawn EPERM required approved process-access retry. An early overlapping helper runner caused a port/artifact collision; later runners isolated or sequential. Python was unavailable for documentation audit; equivalent Node audit passed.
- git diff --check and local-link/75-unique-step checkbox audit pass. No backend source, dependency or schema changed; root checks not needed. No production feed, legal review, support delivery, account management or tracking deployment verified.

### H-024 - 2026-09-20 - Stage 8 implementation ready; docs brief review pending

- Continued on feat/frontend-mvp-foundation at HEAD 67a8386, preserving every prior dirty workstream. S08.1-S08.4/S08.6 DONE for approved mock/content boundaries, V-015. S08 remains BLOCKED only because S08.5 expressly requires a separate documentation scope review and no owner response has arrived. D-015 records the concrete proposed brief and alternatives without claiming acceptance.
- Added Status, Updates, Support, Policy, IncidentNotice, PublicFooter, CookiePreferences, serviceStatus content, focused CSS and browser/helper/consent regression coverage. Integrated routes, metadata, dashboard/model notices, public navigation and section links. Information now owns only docs preparation/missing-page boundaries; known legacy topics redirect.
- Fixed consent-state synchronization and current-page rejection when storage fails; enforced existing organic-only decision at the analytics boundary. Advertising configuration is ignored, including old grants. Same-page synchronization only; cross-tab/deployed measurement verification remains S11/S13.
- Updated FRONTEND, API, ARCHITECTURE, DATA, BILLING, SECURITY, CONTRIBUTING, README, frontend env comments, ADR-004 supersession note and this plan. No live status/contact/legal content invented; B07/B08/S12/S13 remain publication/integration gates.
- Next: owner answers proposed docs brief (quickstart, key authentication, model IDs/capabilities, image/text request guides, errors/refunds, usage/billing basics; verified examples later). Record acceptance or requested revisions in D-015 and owning docs before closing S08. No S09 work started.
- All verification processes finished. Branch/worktree retained with uncommitted changes; no commit, push, deployment, external message, real payment or upstream spending. Local research untouched.

### H-025 - 2026-09-20 - Stage 8 complete after docs brief approval

- User explicitly accepted the clarified proposed docs brief. Recorded the decision in D-015, FRONTEND and API; S08.5 and Stage 8 are now DONE for the agreed mock/content boundary. H-024 is retained as historical pending-review evidence.
- Updated the /docs preparation copy to remove the obsolete scope-review message. No detailed documentation or working examples were added. Verified API contracts/examples, real support/status ownership and publishable legal content remain B07/B08/S12/S13.
- Stage 9 remains PENDING. Next authorized continuation starts S09.1. No commit, push, deployment, integration or external message. Earlier work and V-015 evidence preserved.
- Closure verification: typecheck/build and targeted docs navigation tests passed desktop/mobile (2/2, 3.9s); 75-step/board audit confirms all S08 steps DONE and S09 PENDING. git diff --check passes with existing line-ending notices. No verification process remains running.

### H-026 - 2026-09-20 - Stage 9 started

- User authorized the next stage, S09. Continued on feat/frontend-mvp-foundation,
  HEAD 67a8386, preserving earlier uncommitted work. No new checkout required.
- Execution skill delegated the isolated summary/savings helper and tests; primary
  owns page/shared-component integration, browser coverage and documentation.
- Reused Billing wallet, Usage records/table and chart with optional daily props;
  homepage keeps its existing fixture default. B02/B04/S12 remain live gates.

### F-024 - 2026-09-20 - Savings summary coverage contract

- Independent spec review found the first implementation lacked the accepted S02
  summary metadata and could not distinguish excluded comparisons from incomplete
  historical coverage. Browser regression reproduced the absent partial-history UI.
- Added supplied mock summary with coverage start/completeness, timestamp, revision,
  basis version, monetary totals and mutually exclusive exclusion counts. Overview
  snapshots it during refresh; partial history qualifies the heading and time range.
- Correction spec review and independent code-quality review report no remaining
  important findings. Live aggregation/ownership/settlement proof remains S12.

### D-016 - 2026-09-20 - Overview mock summary precision boundary

- Overview uses complete shared fictional Usage records and Billing's demo wallet.
  Chart/totals use local 7/30-day ranges; latest five requests and savings are not
  narrowed by chart period. No-history preview keeps the wallet and implies no grant.
- ASSUMPTION for fixtures only: historical comparison snapshots use the accepted
  66,600 credits/USD reference. Fractional legacy credits can produce repeating USD
  decimals. Exact rational calculation precedes display rounding; mock supplied
  monetary fields carry an approximation flag and 12-place values, with a six-place
  headline. DATA/BILLING disclose this limitation; the accepted exact production
  summary contract and backend precision decision remain unchanged under B02/S12.
- readDemoSavings is the mock read boundary. A live adapter must consume the
  server-produced summary rather than reconstruct lifetime savings from table pages.

### V-016 - 2026-09-20 - Stage 9 verification

- Test-first browser checks failed on missing Overview period/balance controls in
  both viewports. Partial-history check later reproduced the F-024 gap. Helper
  tests observed failing assertions before implementation/corrections.
- npm --prefix frontend test passed typecheck/build and 133 tests / 13 expected
  skips (38.5s), including eight new helper cases in both desktop/mobile projects.
- Full npm --prefix frontend run test:auth: 71 passed / 2 failed / 1 expected mobile
  wide-layout skip (3.5m). Both failures were the new test using exact label-text
  lookup on Usage's wrapping select label. Browser snapshots confirmed correct
  navigation/control; changing the locator to the existing non-exact label pattern
  fixed it. Final test:auth -- --grep overview rebuilt/typechecked and passed all
  8 Overview checks (22.5s). No application workaround or unrelated rerun added.
- Final wide-layout run passed 1 desktop / 1 expected mobile skip (4.9s), after
  adding a wait for the populated Overview and a 2550px capture. A regex selector
  selected only wide checks in this runner; Overview then used a separate simple
  selector. Earlier spaced grep selected no tests. Local Vite spawn EPERM required
  approved process-access retry. Initial Windows file encoding was corrected to
  UTF-8 after Vite identified invalid bytes. One full test start overlapped the
  helper's test-first export addition and was retried once the helper was ready.
- Evidence covers shared Usage totals/chart, five recent records, Billing purchase
  balance propagation, 7/30 periods, local dates, historical/retired comparisons,
  refunds/free/failure exclusions, negative/parity arithmetic, revised settlement
  summaries, incomplete history, independent unavailable balance/savings, loading
  supersession, stale snapshot/timestamp retention, announcements and first steps.
- Independent spec review, correction review and code-quality review are clear.
  Desktop/mobile Overview screenshots inspected; table scroll remains local and
  wide layout passes. Artifacts remain OS temp; normal build output ignored dist.
- Documentation audit: 75 unique steps/consistent checkboxes and 38 local links.
  git diff --check passes. No backend or dependency changed, so root checks were
  not required. No live settlement, authorization, provider or savings verified.

### H-027 - 2026-09-20 - Stage 9 complete

- S09.1-S09.4 DONE for the approved mock boundary, V-016. Stopped before S10 as
  requested. Branch feat/frontend-mvp-foundation, HEAD 67a8386, earlier dirty work
  retained. No commit, push, deployment, external message or upstream spending.
- Changed Overview, UsageChart, UsageRequestTable, scoped global CSS and frontend/
  auth-fixture tests; added overviewDemo and overviewData tests. Updated FRONTEND,
  ARCHITECTURE, API, DATA, BILLING and this plan. The homepage chart retains its
  earlier fixture default; detailed homepage content remains Stage 10.
- B02/B04/S12 own live wallet/history/savings, exact summary precision, server
  aggregation/ownership, settlement revision and price-ceiling verification.
  D-016 records the rounded mock monetary limitation without changing that contract.
- Next: S10.1 original site copy review, then homepage/blog/content scope, retaining
  B08 verified-example and B12 reviewed-publication ownership gates. No S10 started.
- All verification operations finished. Worktree and local research preserved.


### H-028 - 2026-09-20 - Stage 10 started

- User authorized completion of the next stage, S10. Continued on the existing
  feat/frontend-mvp-foundation branch at 67a8386, retaining all prior dirty work.
- Execution skill delegated the bounded repository blog implementation; primary
  owns homepage, shared navigation/route integration, documentation and acceptance.
- Reuse shared catalogue/price rendering rather than duplicate rates. Two image
  and two text references replace fictional homepage cards; no percentage saving
  claimed without equivalence evidence. Existing sign-in wording corrected.
- B08/B12/S12/S13 retain verified examples, human content ownership and publication.
  No S11 prerender implementation, indexing activation, commit or push authorized.


### D-017 - 2026-09-20 - Repository article format and publication boundary

- Implementation choice: typed TypeScript records with explicit React-rendered
  content blocks, local SVG diagrams and shared catalogue references. No Markdown/
  MDX parser, arbitrary HTML, CMS or dependency. Validation runs when the registry
  loads, so malformed content fails builds rather than producing broken pages.
- Two useful reference guides explain text components and image request units.
  Codex technical review is attributed honestly; no human review, first-hand API
  test, customer result or equivalent saving is invented. Copyable checklists are
  planning text, not integration snippets. Dates reflect this preparation session.
- Non-draft records are eligible for local review routes; default closed indexing
  and S13 publication gates remain. Drafts are absent from lookup/listing/metadata/
  sitemap/rewrite generation. Ongoing human owner acceptance remains OPEN B12 in
  FRONTEND publication register. Tested API examples remain B08/S12/S13.


### F-025 - 2026-09-20 - Blog asset URLs and narrow byline

- Independent code review found article-record new URL asset resolution produced
  local file URLs under Node, incompatible with the accepted future server render.
  Records now hold validated illustration keys; rendering pages alone import SVGs
  through Vite. Node content/route generation no longer depends on asset loading.
- Review also identified minimum-width byline items exceeding narrow mobile tracks.
  Mobile items can shrink and the byline becomes one column below 380px; the article
  regression now checks 320px document bounds. Correction review is clear.
- Full prerender asset/hydration proof remains S11; no production SSR claim added.


### V-017 - 2026-09-20 - Stage 10 verification

- Homepage test-first checks reproduced three fictional cards instead of four
  shared image/text references on desktop/mobile. Final focused checks passed 2/2.
  Initial Vite build needed approved subprocess access after spawn EPERM. An early
  overlapping helper output cleanup affected trace artifacts; later helper runners
  used isolated OS-temp output and coordinated the shared preview port.
- Blog helper reports test-first missing-module evidence, then invalid-date fixture
  correction; early browser failures were ambiguous link locators. Final focused
  blog checks passed 19/19 with one expected desktop skip for mobile-only bounds.
- npm --prefix frontend test passed typecheck/build and 154 tests / 14 expected
  skips (47.7s). Skips are credential-gated account checks and viewport-specific
  wide/narrow tests. Blog desktop/mobile, 320px article bounds, 2550px homepage,
  metadata, reference price consistency, keyboard FAQ/TOC, clipboard success/denial,
  invalid/draft noindex, generated sitemap/rewrites and related links pass.
- Independent spec review and code-quality/correction review report no outstanding
  important findings. Homepage desktop/mobile and blog article/index captures
  visually inspected; screenshots/traces remain OS temp. No backend or dependency
  changed, so root checks are not required. Auth fixture verification follows.

- npm --prefix frontend run test:auth passed typecheck/isolated build and 73 tests /
  1 expected mobile-wide skip (2.6m). Existing auth/dashboard workflows remain
  intact. No live payment, generation, account mutation or external message.
- Final documentation audit verifies 75 unique steps, checkbox/board consistency
  and 41 local links; git diff --check passes. All verification processes finished.

### H-029 - 2026-09-20 - Stage 10 complete

- S10.1-S10.6 DONE for approved reference/content scope, V-017. Stop before S11.
  Existing feat/frontend-mvp-foundation branch at 67a8386 and all earlier dirty
  work retained. No commit, push, deployment, partner message or upstream spending.
- Changed Home/home.css, public navigation, App blog routes, route/config/baseline
  metadata and SEO tests. Added typed repository articles, original SVG diagrams,
  blog validation/pages/CSS and blog/home content tests. Updated FRONTEND, API,
  ARCHITECTURE, CONTRIBUTING and this plan. No dependencies/backend/schema change.
- D-017 records content format and review boundary. Two guides are technically
  reviewed references, not human-approved launch content or tested API examples.
  B08/B12/S12/S13 retain verified examples, source refresh, ongoing human ownership
  and publication approval. Mock labels remain wherever integration is absent.
- Next: S11.1 public build-time prerendering per ADR-005 and F-001 remediation,
  followed by organic discovery/measurement. No S11 implementation begun here.
- Worktree and local research preserved; no process remains running.

### H-030 - 2026-09-20 - Stage 11 started

- Authorized next-stage continuation on existing feature branch and dirty worktree. Primary owns rendering; execution skill delegated measurement. No commit/push or activation.

### F-026 - 2026-09-20 - Public render assembly and local preview

- Test-first browser checks reproduced the empty public root on both viewports.
  The first temporary SSR bundle could not resolve external React from OS temp;
  bundling its installed dependencies fixed that without a new dependency. The
  render bundle remains outside deployable output and is removed after use.
- Initial preview checks failed because a build-only plugin excluded its preview
  middleware. Registering preview hooks independently of build execution fixed
  the actual response failure. Dev retains SPA behavior; preview models the
  explicit public/private/404 contract. Production host behavior is still B09/S13.
- Spec review identified unchecked template replacements. Assembly now rejects
  missing/duplicate markers and checks final content/head output before writes;
  callback replacements preserve literal dollar sequences. Two helper tests pass.
- F-001/F-011 are closed locally, with no indexing activation. Upstream bundled
  React Router emits two `use client` directive warnings; this is a static React
  build, not an RSC boundary. No warning suppression or product workaround added.

### F-027 - 2026-09-20 - Consented funnel ordering and privacy

- Review found first-grant landing notification could precede granted consent and
  GA configuration. Notification now follows both; regression asserts ordering.
- Same-page and cross-tab grant/reject/storage-clear decisions synchronize. Google
  collection opt-out is set before denial; custom events stop. Configured fixture
  covers late consent, stored consent, rejected persistence and legacy ad grants.
- Public paths are allowlisted, query/hash/referrer details excluded, and unknown
  or private paths map to a generic measurement path. Outcome kinds are validated;
  accepted opaque IDs suppress duplicate outcomes without entering event payloads.
  Abort and declined-emission replay are covered. No trusted source is connected.

### D-018 - 2026-09-20 - Stage 11 implementation and acquisition limits

- Implemented accepted ADR-005 with shared public App, browser-only BrowserApp
  providers/routes, temporary production Vite render bundle and React prerender.
  Public documents hydrate; private shells create the client root. URL filters,
  stored preferences and browser timestamps apply after deterministic hydration.
- Eighteen public reference routes include the noindex sample updates. Drafts and
  unknown/private/filter variants stay out of public output/sitemap discovery.
  Existing account demo state remains above route switching, preserving S04-S09.
- ACQUISITION records official crawler guidance checked 2026-09-20, search versus
  training controls, balanced image/text topics and unsent distribution material.
  Preparation ownership is an explicit assumption; accepted publication/maintenance
  owners stay B12. No price advantage, search volume, rankings or citations invented.
- Local Stage 11 completion does not close actual host/CDN policy, redirects/status,
  domain/search registrations, content publication or GA property/network review
  (B09/B12/S13). Backend-confirmed outcomes and durable attribution/deduplication
  stay S12. No real signup/purchase/request conversion is inferred from a UI action.

### V-018 - 2026-09-20 - Stage 11 verification

- Full npm --prefix frontend test: typecheck/build and 158 passed / 14 expected
  skips (50.4s). Full test:auth: isolated build and 73 passed / 1 expected mobile
  wide-layout skip (2.8m). No credential, auth-guard or backend bypass was added.
- After final template/consent corrections, the affected prerender/SEO/help suite
  rebuilt/typechecked and passed 30/30 desktop/mobile (25.4s), including all public
  route hydration, query filters and existing legacy navigation. Unchanged account
  flows were not repeated after analytics-only corrections.
- test-prerender.mjs passed closed and test-only indexable isolated builds. Each
  checked 18 no-JS public documents, unique titles, descriptions, canonical/robots,
  JSON-LD policy, assets, sitemap counts, private shells and missing/draft 404s.
  Both modes hydrated every public path in a mobile browser using Los Angeles time
  without recoverable errors. The default build remains closed to indexing.
- Configured consent runner passed 12/12 desktop/mobile, independently rerun by
  primary after helper completion. Third-party traffic is intercepted. Funnel Node
  tests passed 6/6; template helper tests 2/2. Red failures/findings and corrections
  are recorded in F-026/F-027; tests do not prove vendor delivery or backend events.
- Independent spec correction and code-quality reviews are clear. Existing public
  responsive/focus/copy and wide-dashboard checks pass. No layout redesign occurred.
  Browser artifacts and isolated builds remain OS temp; render bundles are removed.
  Vite/Chrome required approved subprocess retries after sandbox EPERM.
- No root/backend/dependency/schema change, so root checks were not required.
  No deployment, indexing activation, external message, payment or upstream spend.
- Final audit: 75 unique steps with consistent checkboxes, S11 DONE/S12 PENDING,
  and 59 local document links pass. Normal git diff --check passes with the existing
  LF/CRLF notices. An attempted per-command autocrlf override treated Windows CRs
  as whitespace; the repository's normal configuration was retained and rechecked.

### H-031 - 2026-09-20 - Stage 11 complete

- S11.1-S11.6 DONE for the local preparation/verification scope, V-018. Stopped
  before S12. Existing feat/frontend-mvp-foundation branch at 67a8386 and all
  prior dirty work retained. No commit, push, publication or deployment.
- Added BrowserApp, entry-public, publicHydration, prerender/build verification
  scripts, funnel boundary/tests and ACQUISITION. Updated shared App/main, public
  hydration consumers, SEO generation/head/analytics, Vite preview/build hooks,
  configured consent tests and owning guides/ADRs. No new package dependency.
- Next: S12.1 establish verified management contracts and per-slice owners/readiness.
  Backend remains a starter; do not infer endpoint/schema readiness from frontend
  fixtures. B01-B09 and acquisition outcomes gate their respective live slices;
  B12/S13 retain content ownership and release approval. No S12 implementation begun.
- All verification operations finished; worktree and local research preserved.

### H-032 - 2026-09-21 - Owner landing-page revision

- Owner review identifies an S10 acceptance gap: the homepage failed to lead with
  lower API prices and exposed excessive internal readiness information. Existing
  design approval and the explicit revision request authorize this correction.
- Retain artwork, page width, dark/emerald brand, image/text balance and FAQ.
  Prefer compact cards over a wide comparison table (mobile scanning), and combine
  the repetitive onboarding/prepaid sections rather than expanding either one.
- [x] Replace abstract hero/closing copy and bring model prices directly after hero.
- [x] Add a focused landing price renderer consuming exact shared catalogue values:
  two-place USD display with nonzero sub-cent precision, input/output only, official
  Standard references and source links. Never change settlement or source amounts.
- [x] Resolve published-rate percentage presentation with owner; no image total
  or equivalence evidence is inferred from an official output-only rate.
- [x] Align preview with Overview's neutral panels, balance and emerald chart;
  combine prepaid benefits and the API journey in one concise section.
- [x] Update existing homepage acceptance tests, verify price edge cases, run the
  frontend checks and inspect desktop/mobile screenshots. Update owning guides
  and rebuild the running local preview; no deployment, commit or push.

### V-019 - 2026-09-21 - Landing revision verification and remaining choice

- Updated homepage regression failed on the old cards in both viewports before
  implementation. Full frontend build/typecheck and suite then passed 158 tests
  with 14 expected skips (56.8s). Final copy/preview corrections rebuilt and passed
  all 26 landing/prerender/SEO checks (23.9s), including raw HTML and hydration.
- Inspected desktop/mobile captures; existing wide composition check passed.
  Independent review caught overly broad image savings wording and unattributed
  official conditions; both corrected, follow-up review clear. Simplified fictional
  preview uses three metrics, current demo request names/charges, 333,000 sample
  balance and shared chart. No private account providers imported into public HTML.
- Existing exact precision tests pass. Landing rounds display only, with three
  places below a cent and a bound below precision; detailed prices stay exact.
- H-032 remains IN_PROGRESS solely for the owner choice requested asynchronously:
  show clearly labelled published text-rate percentage differences before backend
  metering equivalence is proven, or wait for that verification. No response yet;
  percentages were not silently enabled. Image equivalence remains unresolved.
- S10.1/S10.2 reopened so this acceptance gap is not hidden by historical DONE
  status. S12 remains PENDING. All earlier dirty work retained; no commit/push.
- Local preview running at http://127.0.0.1:4173/ for owner inspection. Normal
  git diff --check passes (existing LF/CRLF notices). No backend/dependency/auth
  logic changed, so root/auth suites were not repeated. Browser artifacts OS temp.

### D-019 - 2026-09-21 - Approved pricing card hierarchy

- Owner supplied a comparison reference, then explicitly rejected table rows for
  the smaller OpenAI/Google catalogue and approved compact cards. Retain original
  Takewing styling; crossed-out official rates, prominent preview rates and
  separate input/output badges implement that direction.
- This resolves the H-032 presentation question: badges state lower published
  component rates, not realized customer savings. Whole percentages truncate from
  exact rational values, independent of rounded money and package bonuses.
  Image percentages remain absent without matching identity/output evidence.
  compareRate and historical savings verification gates are unchanged.

### V-020 - 2026-09-21 - Card comparison completion

- Browser regression first failed on absent crossed-out official rates on both
  viewports. Final build/typecheck and affected homepage/pricing/prerender suite
  passed 18/18 (10.3s), including exact badge values and absent image badges.
- Desktop capture inspected; mobile card/overflow check passes. H-032 and
  S10.1/S10.2 now DONE within the approved published-reference scope. All prior
  backend verification and publication boundaries remain. Preview restarted for
  owner review; no commit, push, deployment or backend changes.

### H-033 - 2026-09-21 - Stronger pricing hierarchy and image investigation

- User approved stronger Our price/Official API labels, prices and badges plus
  further image comparison research. Implemented stronger contrast, bordered
  official panels and image official-pricing links in LandingPrices/home.css.
- Rechecked upstream directory/API guides and official OpenAI/Google pricing.
  Quality/output count and preview/stable identity gaps persist, recorded in
  MODEL_PRICING; no unsupported image price or percentage added.
- Build/typecheck and affected homepage/prerender desktop/mobile checks passed
  6/6; desktop capture inspected. Preview rebuilt for owner review. No commit,
  push, backend changes or external account actions. S12 remains pending.

### H-034 - 2026-09-21 - Concise official image reference

- Owner approved numeric Nano Banana Pro output references instead of vague
  variable-pricing copy. Shows approx $0.13 at 1K/2K and $0.24 at 4K, with a
  short input/thinking-extra note. No equivalent savings claim introduced.
- Presentation-only correction; existing source values retained in MODEL_PRICING.

### H-035 - 2026-09-21 - Complete numeric official references on landing cards

- Owner corrected the incomplete one-model fix. Read official OpenAI calculator
  implementation and Standard token pricing; derived GPT Image 2 medium-quality
  1024-square output cost 0.05268 USD, displayed approx $0.05 with size/quality
  and input-extra labels. All four featured cards now show numeric official rates.
- Updated homepage regression to require numbers/settings on both image cards
  and reject vague variable-price text. No image savings equivalence invented.

### H-036 - 2026-09-21 - Catalogue-wide percentages

- Owner corrected scope: include image percentage examples and ALL Models &
  Pricing variants, not just homepage. Replaced LandingPrices with shared
  ModelPrices plus publishedPrices references/arithmetic and scoped CSS.
- Both homepage and all catalogue/family/dashboard cards show price/reference
  and signed percentage disposition. 28 variants have sourced named examples;
  Gemini 3 Pro alias has no verified current official comparison. Family/preview references
  are explicitly named and never upgrade catalogue identity/equivalence evidence.
- Removed primary-card ID/cache/readiness clutter; preserve details, source links,
  filters, status notices, exact amounts and backend verification boundaries.
- New reference test initially failed on missing module. First browser run then
  passed 16/18: only two obsolete homepage locators assumed settings inside the
  price panel, now in the shared source/basis block. Updated that locator.
- V-021: full frontend suite 164 passed, 14 expected skips; final desktop/mobile catalogue regression 2/2 after review wording correction. Build/typecheck passed. Desktop/mobile screenshots reviewed; no horizontal overflow. Independent review found one unresolved-alias retirement wording issue, corrected without inventing a percentage. No commit or push.


### H-037 - 2026-09-21 - Compact availability notices

- Fixed generic .notice class collision that gave card labels 24px padding, a border and 25px margins. Use scoped availability-warning class instead.
- Combined duplicated availability/reference notice into one compact line with dated source link; retained status evidence and sample incident notices.
- Regression reproduced on desktop/mobile before fix (2 failures). Build/typecheck and four affected desktop/mobile catalogue/status checks passed after fix. Screenshot reviewed. No commit or push.


### H-038 - 2026-09-21 - Keep notices outside pricing flow

- Owner screenshot showed compact labels still offset sibling prices. Moved availability and sample incident notices into the existing card footer beside View details.
- Footer regression failed on both viewports before fix. Build/typecheck and four affected status/catalogue checks passed; final two catalogue checks include exact alignment of all three GPT Image 2.5 price sections at 2016px. Screenshot reviewed.


### H-039 - 2026-09-21 - Settings-specific image comparisons

- Owner approved matching resolution/quality comparisons and clarified VIP means gpt-image-2-vip. Shared controls now recalculate official output examples and scoped percentages on home, catalogue, family pages and details. Unverified aliases retain named references without percentage claims.
- Official calculator re-fetched; formula and dimensions recorded in MODEL_PRICING.md. Backend tariffs and settlement untouched.
- Build/typecheck and 20 desktop/mobile catalogue, homepage and comparison tests passed. Tests cover 4K half-even arithmetic, unsupported quality, changing values, fixed request tariff, mobile overflow and three-column alignment. Screenshot reviewed. Independent source review found no material issue. No commit/push.


### H-040 - 2026-09-21 - Static savings presentation


H-040 (2026-09-21) supersedes selectable image comparisons: owner wants static cards with resolution/quality as context only. Removed all per-image selectors from shared display. Only positive computed differences receive savings badges; zero/higher/unknown references retain numbers without a discount badge or struck-through official price. Reference defaults remain first listed resolution and Medium; no favorable baseline or package selected to force a saving.

Public recharge API rechecked: USD5 buys333000 credits; USD150 buys19980000 including100% bonus. Base66600 credits/USD remains the current customer-facing conversion. Bulk133200 credits/USD is an acquisition-cost scenario, not an approved customer tariff. The directory CNY display is Chinese yuan, not Japanese yen; converting both sides to EUR cannot change a percentage. Uniform savings for every variant are not established.

Build/typecheck passed; 20 affected desktop/mobile catalogue/homepage tests passed. No commit/push.


### H-041 - 2026-09-21 - Upstream package decision

Owner confirmed always buying the USD150 package:19,980,000 credits,133,200 credits/USD. Recorded acquisition basis in BILLING, MODEL_PRICING and OPEN_DECISIONS. Customer margin remains open; no product rates changed. Documentation-only update.


### H-042 - 2026-09-21 - Provisional markup accepted

Owner accepted20% markup over USD150-package acquisition cost. Recorded formula credits/111,000 USD in owning guides. Current question concerns whether this proves universal savings: it does not; Sunburst1K Medium remains a counterexample. Customer price implementation remains pending; no runtime changes in this answer.


## H-043 - 2026-09-21: approved static up-to savings

**DECIDED and implemented in frontend preview:** display Save up to X% using the approved acquisition package plus20% markup. Selling USD=model credits/111,000, calculated exactly. Shared home/catalogue/family/detail price displays and detailed rate amounts use this selling basis. Existing research conversion and backend financial logic remain unchanged.

For images, choose the largest official output cost among the same variant's listed comparison presets (1K square,2K square,4K UHD; supported quality levels). This maximizes percentage saving at the flat listed request tariff; the matching official amount and exact settings are shown together. No selectable controls. Percentages round down and only positive differences receive badges. Uncertain bare2.5/Lite/fast mappings and missing Gemini3Pro reference remain excluded. These are published-price examples, not verified served settings or guaranteed total savings; input/thinking exclusions remain visible.

Sunburst maximum preset example:2K square Max official output0.42816 USD; proposed retail2400/111000=0.0216216... USD; conservatively94% saving. At1K Medium the same retail remains above the output-only reference, so the claim is explicitly up-to.

H-043 verification: initial targeted run20 passed/2 failed because test assumed4K landscape maximized cost; calculator correctly selected2K square due aspect-ratio token grid. Corrected expected preset and documentation. Final full suite170 passed/14 expected skips, build/typecheck passed. Independent source review found no arithmetic issues; internal margin-copy concern corrected. No commit or push.


## H-044 - 2026-09-21: alias investigation and schema evidence

Re-read English/Chinese primary catalogues, July1 and September9/10 announcements, and raw OpenAPI markdown reached through https://qmy27nhsd9.apifox.cn/llms.txt. Web extraction hid schema fields; direct read-only fetch returned full YAML.

- Nano Banana Fast and Nano Banana2 Lite: July1 explicitly identifies both as gemini-3.1-flash-lite-image. Chinese primary directory https://grsai.ai/zh/dashboard/models corroborates it; English Fast description is stale. Google model page specifies1K only and pricing lists0.0336 USD output. Resolved A6 for published mapping/1K reference (not runtime routing), grouped both as Nano Banana2 Lite, enabled88% badge at approved440/111000 retail. Historical retired Nano Banana remains separate.
- Bare GPT Image2.5: primary directory and September9 announcement say1K but do not identify Sunburst/Flare. Subdomain https://zjdl.grsai.ai/dashboard/models says Sunburst, conflicting with primary evidence; insufficient to close A1. Raw https://qmy27nhsd9.apifox.cn/452409160e0.md and https://qmy27nhsd9.apifox.cn/512802278e0.md specify auto-only quality for basic2 and2.5. No fixed-quality savings claim for either until actual output/settings can be matched.
- GPT Image2 VIP: those same schemas restrict quality to medium. Corrected comparison presets accordingly; earlier broad announcement/options do not override explicit per-model schema.
- Gemini3 Pro: Chinese primary listing identifies3.0 family but no exact official served ID. Chat-completion and Gemini-native schemas don't resolve the mapping. May15 price-change announcement doesn't identify it either. Google deprecation page retires gemini-3-pro-preview; no current interchangeable baseline established. A8 remains open, owner upstream/API: obtain exact served identifier/current mapping.

Sources: https://grsai.com/dashboard/announcements ; https://grsai.ai/zh/dashboard/models ; https://qmy27nhsd9.apifox.cn/452409160e0.md ; https://qmy27nhsd9.apifox.cn/512802278e0.md ; https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image ; https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/deprecations .

H-044 validation: build/typecheck and28 affected desktop/mobile tests passed. Two aliases resolved; bare2.5 identity and Gemini3Pro current routing not identifiable from checked primary docs. No billable requests, commit or push.


### H-045 - 2026-09-21 - Conservative Auto-quality benchmark

Owner requested continuing the unresolved comparison work. Basic GPT Image2/2.5 use the shared1024-square Low output benchmark0.00588 USD instead of assuming High auto output. Selling600/111000=0.0054054... gives8% below that benchmark. Display explicitly says 8% below Low reference, not an unverified maximum savings promise; Auto output varies. Underlying bare2.5 routing remains open, but both official2.5 candidates have the same benchmark formula. This is not proof of equivalent total request cost. Gemini3Pro remains unresolved; no current version can be inferred from a retired official candidate.

H-045: build/typecheck and24 affected desktop/mobile checks passed. No commit or push.

### H-046 - 2026-09-21 - Basic GPT Image 2.5 presentation

Supersedes H-045 customer wording for basic GPT Image 2.5 only. Shared cards show the approved flat request price (approximately USD0.005), a One flat price badge, and an unstruck official 1024-square Low-High output reference range (approximately USD0.006-0.053). Automatic quality and excluded input costs remain short context. The range is the common Low-High comparison for both official 2.5 candidates, not the full Sunburst quality range or proof of served quality/identity. No maximum savings percentage is inferred from Auto. Other model comparisons remain unchanged.

Build/typecheck and 24 affected desktop/mobile tests passed; desktop screenshot confirms aligned card pricing and footer notices. No commit or push.

### H-047 - 2026-09-21 - Requested GPT Image 2.5 savings wording

Supersedes H-046 badge: shared basic GPT Image 2.5 cards now say Save up to 89%, calculated from exact selling price against the official 1K High output reference. Adjacent copy explicitly identifies that comparison and automatic quality; no confirmed High output equivalence is claimed. Official Low-High price range remains visible. Build/typecheck and 14 desktop/mobile pricing checks passed.

### H-048 - 2026-09-21 - Homepage visual refresh

Implemented the owner's approved visual direction: retain hero artwork, feature GPT Image 2.5, compact homepage prices, increase typography/section contrast, add original ascending request-flow/shared-wallet and request-cost animations, improve dashboard framing, replace sparse guides with illustrated links, strengthen CTA and merge repeated onboarding content. Motion respects reduced-motion settings. Pricing arithmetic and catalogue presentation unchanged; sources remain accessible through Pricing details. Gemini 3 Pro remains paused.

See [refresh scope and validation](2026-09-21-homepage-refresh.md). Frontend build/typecheck passed; 31 desktop/mobile checks passed, 13 existing skips. No commit, push or deployment.

### H-049 - 2026-09-21 - Workflow illustration refinement

Owner rejected the sparse flat-green diagram as low budget. Rebuilt that section with a separate editorial heading, a framed request workspace, actual Takewing mark, app window, provider/model panels and a distinct shared-credit illustration. Image/text pulses alternate and destination borders respond on arrival. Phone layout changes to a vertical path; tablet heading and provider contrast were refined after screenshots. Removed obsolete flow CSS from home-refresh.css; isolated new styling in home-flow.css.

Final build/typecheck and 8 desktop/mobile homepage/prerender checks passed. Visual review at 1680, 1440, 768 and 390 pixels; final overflow checks clean at 1680/768/390. Reduced-motion check passes. Animation timing sampled at travel and arrival. Local preview refreshed; no commit/push or deployment.

### H-050 - 2026-09-21 - Workflow readability

Owner approved the refined visual design and requested more readable small text without redesigning the section. Increased labels from 7-10px to 11-13px, model/body labels to 14-16px, brightened muted text and reduced excessive label tracking. Credit art receives enough height for larger copy; balance panel stacks at 1200px to protect diagram spacing. Existing artwork, sequence and motion remain intact.

Build/typecheck and all 4 homepage desktop/mobile checks passed. Visual/text-clipping inspection at 1440, 768 and 390px found no clipped text or horizontal overflow. Preview refreshed; no commit/push.

### H-051 - 2026-09-21 - Reference-based GPT Image 2.5 dot animation

Owner supplied a local screen recording and requested fidelity to the actual blue-dot motion. Inspected time-separated frames: fixed grid with changing dot radii, rather than moving particles. Extracted a 12x11 spatial radius field at 16fps for 20 seconds (42,240 bytes). Asset contains only radius samples; no recording, prompts, interface pixels or progress UI. ImageDotField reconstructs the grid with spatial/temporal interpolation and a one-second loop crossfade. Placement/scale and edge fade adapt it to the featured homepage card, so this is a reference-based recreation rather than the original renderer.

Animation pauses offscreen and in hidden tabs, cleans up on unmount, and renders a still frame under reduced motion. Pricing and layout remain unchanged. Build/typecheck and 10 desktop/mobile homepage/prerender checks passed, including moving/still canvas checks. Desktop/mobile card screenshots reviewed. Local preview refreshed; no commit/push.

### H-052 - 2026-09-21 - Ambient model-card treatment

Owner clarified that reference motion should be a subtle full-card background in Takewing mint, not a separate blue graphic. Updated canvas color, full-card sizing, 20% opacity and directional fades to preserve text contrast. Removed In focus and its reserved spacing on request. Motion samples and pricing unchanged. Ambient version passed all 6 desktop/mobile homepage checks; label removal validated with build/typecheck. Preview refreshed.

### H-053 - 2026-09-21 - Native-resolution dot rendering

Fixed blur from stretching the fixed 340px canvas over the card. Backing dimensions now match the actual element size times devicePixelRatio; drawing preserves the centered-cover composition through vector transforms. ResizeObserver redraws on layout changes, including reduced-motion still frames. Removed CSS object-fit resampling. Mint, opacity, masking and timing unchanged.

Build/typecheck and 8 homepage checks passed, including 2x-density desktop-to-phone resizing. No commit/push; local preview refreshed.

### H-054 - 2026-09-21 - Compact homepage prices and faithful dashboard excerpt

Owner requested scannable price cards and an accurate dashboard preview. Homepage compact ModelPrices now shows our price, one semantic struck official reference, savings and one necessary basis line. Removed visible Official API Example, pricing disclosures, source links and extended comparison paragraphs from homepage cards only. Basic GPT Image 2.5 uses 0.05268 High reference for the existing 89% badge, explicitly retaining Auto versus official High in the short basis; no equivalence claim added. Catalogue remains unchanged.

Removed request-trail animation and marketing gradient/shadow from dashboard preview. HomeDashboardPreview reuses actual UsageChart, UsageRequestTable and overviewSummary with consistent demo data; restores all three summary metrics and labels itself an excerpt. Client-only loading matches the real dashboard's relative-date/local-time boundary and avoids hydration mismatches. Two real request rows remain horizontally scrollable like the dashboard. No generation, payment or account operations added.

Build/typecheck and 28 desktop/mobile homepage, pricing and prerender checks passed. Reviewed desktop/mobile screenshots and overflow. Tests caught and corrected accidental removal of FAQ/guides during section replacement and relative-date hydration mismatch. Local preview refreshed; no commit/push.

### H-055 - 2026-09-21 - Clear official-price label

Added visible Official API label beside homepage reference prices and increased the strikethrough to 2px in the price text color. Preserves compact layout and short comparison basis. Build/typecheck passed; preview rebuilt.

### H-056 - 2026-09-21 - Cleaner reference prices and compact dashboard excerpt

Removed the visible Official API label again at owner request; retained its accessible label. The approximation symbol is outside the numeric strikethrough. Dashboard preview now abridges the real request table to model, execution and billing on desktop, model and billing on mobile. Homepage-only spacing and chart height are reduced, with fewer visible mobile date labels. No fictional controls or animations added; real dashboard unchanged.

Build/typecheck and all 10 desktop/mobile homepage checks passed. The first run had a mobile client-loading timeout; a fresh run passed without changing loading behavior. Final desktop/mobile screenshots reviewed; table scrollWidth equals clientWidth at both sizes. Preview refreshed at port 4173; no commit/push.

### H-057 - 2026-09-21 - Balanced preview graph and varied demo activity

Implemented the approved graph refinement: seven varied fictional daily request counts (12, 18, 15, 25, 21, 28, 24), derived through the existing overview aggregation from a dedicated landing-page request fixture. Both chart tabs, summary totals and recent rows share that history (143 requests, 2.28 demo credits). Existing dashboard history is unchanged. Shared chart request axes now use whole-number intervals; preview plot height is 190px desktop and 160px mobile. No smoothing, animation or synthetic dashboard controls added.

Build/typecheck and all 10 desktop/mobile homepage tests passed, including request-axis and consistent-total assertions. Final screenshots reviewed at 1440px and 390px. Preview refreshed on port 4173; no commit/push.

### H-058 - 2026-09-24 - Homepage review corrections

Owner requested Lowest API prices in the hero, wider supporting text, GPT-6 Astra and Gemini 3.8 Flash as the two featured text cards, updated workflow model names, removal of the workflow coming-soon caption, smoother signal motion and centered onboarding steps. Implemented using existing catalogue records and pricing arithmetic. Hero paragraph max-width is 560px; workflow description is 480px on desktop. Both use two lines at reviewed desktop/tablet widths and wrap naturally on phones.

The route dash previously used a 100-unit pattern and moved by exactly 100 units, making the bright segment reappear at the origin and linger while fading. The 110-unit pattern now travels from offset 5 to -100 at constant speed, leaving the path before reset. Reduced-motion behavior and alternating destination highlights remain. Onboarding has horizontal connectors only between desktop steps, with a centered stacked layout on phones. Longer provider names wrap if necessary.

Validation: frontend typecheck and build passed; 14 existing homepage/prerender checks and both new workflow checks passed. The new regression failed on the original animation; its first post-fix mobile run exposed a test assumption because the SVG is intentionally hidden on phones. Corrected the test to verify that mobile boundary; both workflow checks then passed. Desktop/mobile screenshots reviewed; measurements at 2560, 1440, 768 and 390px found no page overflow or clipped provider labels and confirmed centered steps. Preview remains running at http://127.0.0.1:5173/. No commit, push or deployment.

### H-059 - 2026-09-24 - Compact public catalogue and shared navigation

Owner requested consistent homepage-style navigation across public subpages, a stronger compact catalogue introduction, a denser model overview with less fragmented grouping, cleaner cards, branded filter menus, and a CTA/footer ending. Implemented PublicHeader and PublicFooter on Home and PublicCatalogueShell, with centered public navigation and right-aligned sign-in/signup actions. Public shell width follows the homepage's 1520px maximum. Dashboard and authentication shells remain separate.

Models now presents two continuous collections (image/text), keeping variants adjacent by family and identifying providers on each card. Responsive grids show four columns on wide desktops, three on standard desktops, two on tablets and one on phones. Human-readable model titles retain original reference IDs in the details flow. Overview prices reuse the existing arithmetic and sourced inventory, with compact comparison amounts, savings and a short settings basis. Repeated explanation paragraphs and Official pricing links are removed from overview cards; full source/rate information remains in details. Availability notices remain visible. Homepage pricing and family-detail presentation retain their existing behavior.

The public page replaces the internal demo-state toolbar with a branded hero and adds a closing signup/documentation CTA before the standard footer. Dashboard demo states remain available. Provider, capability and currency menus use a shared accessible FilterSelect with branded hover/selected states, keyboard navigation/typeahead, dismissal and bounded popup placement. Existing URL parameters, legacy Gemini provider alias, history, search focus and currency fallback are preserved.

Visual review: screenshots at 1440/390px, layout measurements at 2560/1440/768/390px. Three or four cards per desktop row, approximately 317-344px image-card heights, no document overflow, and visible CTA/footer. Shared navigation/footer also inspected on Home, Blog, Docs and a family detail route. Build/typecheck and diff whitespace check pass. Full browser run: 185 passed, 14 expected skips, five old-copy/offscreen-input assertions failed; corrected those assertions, retained the explicit High comparison basis, and all 36 affected catalogue/foundation/published-price checks passed on rerun. Dropdown keyboard tests passed in the full run. Auth fixture: 71 passed and one expected skip; two assertions still used the superseded 66,600-credit price. Updated that stale expectation to the existing approved 111,000-credit selling basis; both desktop/mobile catalogue fixture checks passed on rerun. Final build/typecheck passed. No commit, push or deployment.

### H-060 - 2026-09-24 - Catalogue readability, price hierarchy and preview sizing

Removed the extra border above the preview-price strip and hid the reference-price explanation disclosure on the Models overview. Family detail disclosures remain available. Increased 10-11px card supporting labels to 12px and made Our price/Official API labels visible. Our amounts use mint; savings sit alongside input/output headings or the image price heading. Official discounted amounts use a 2px current-color strikethrough, with approximation symbols outside the decorated amount. Price calculations and comparison qualifications are unchanged.

Availability no longer changes footer divider alignment: collections with notices reserve a 36px status slot in every card, with left-aligned details actions and 12px status text. Text collections without notices keep compact footers. Notice and sample incident links remain intact.

The missing-footer report was caused by the controlled browser preview viewport, not a page container: a fixed 1440px inner viewport exceeded the native 1249px browser content area. Footer ancestors had visible overflow and no maximum height. Preview viewport corrected to 2560x1249; a final bottom screenshot and bounds check show the entire CTA/footer inside the visible content area. Future visual checks should use isolated browser sessions and must not leave a larger emulated viewport on the user's review tab.

Validation: typecheck/build passed; all 40 targeted catalogue, alignment, published pricing, homepage and prerender checks passed. Alignment geometry verified at 2560/1440/390 widths. Preview remains open at the page bottom for footer review. No commit, push or deployment.

### H-061 - 2026-09-24 - Authorized frontend checkpoint and dashboard review handoff

Owner finished the current homepage/public catalogue review and requested commit/push, followed by dashboard preview and a short review checklist. Checkpoint includes accumulated S01-S11 frontend work, shared components, tests and documentation on feat/frontend-mvp-foundation. No deployment or merge requested. Dashboard review starts with Overview, then Usage, Billing, API keys, Models and Settings; include empty/error previews. Authentication and display-name saving use the existing real auth integration; payment, usage, keys and extended account workflows retain their documented mock boundaries.

Fresh validation before checkpoint: frontend typecheck/build passed; main suite 192 passed and 14 skipped; isolated authenticated desktop/mobile fixture 73 passed and one skipped. Staged whitespace check passed. Backend and launch gates remain unchanged.

### H-062 - 2026-09-24 - Overview visual hierarchy (DONE)

Owner approved four compact summary cards, a shared branded period filter, emerald all-time savings, smoothed exact-value chart interaction, top four models by net settled credits above announcements, and removal of recent requests and redundant introduction/footer labels. This explicitly supersedes R13 recent-request placement and the earlier exclusion of a model spending breakdown for this compact Overview ranking only.

Plan: update Overview and dedicated styles; correct zero top padding on dashboard status notice; implement chart interactions without overshoot and exact model aggregation with focused regression checks; update affected auth checks and run typecheck/build plus relevant data/browser tests; rebuild isolated fictional-account preview and review desktop/mobile. Preserve period URL state, historical savings qualifications, refresh/empty/error flows and all backend gates. No new commit or push requested.


H-062 validation: typecheck and production/isolated builds passed; 8 authenticated desktop/mobile Overview checks and 32 homepage/data checks passed. Desktop/mobile screenshots reviewed without document overflow. Initial fixture run was blocked by the existing preview server on 4174; stopped that owned preview before testing and restarted against the verified new fixture afterward. Updated two stale test assumptions: distinct chart/page status regions, and scroll-to-top before measuring the notice after keyboard chart interaction. Preserved savings qualification and refresh recovery behavior. No commit/push.

### H-063 - 2026-09-24 - Realistic dashboard preview and cleaner Overview (DONE)

Owner requested varied believable preview records, 7d/30d/6m/1y/all Overview periods, removal of developer scenario controls, a simplified header, a chart matching the right column height, and sidebar/footer divider alignment at the bottom. Plan: share deterministic synthetic activity between Usage/Overview; extend period filtering and monthly long-range buckets while preserving exact settled-credit aggregation; remove visible debug controls; stretch desktop chart; preserve fixed sidebar and measure footer dimensions for matching bottom bands if CSS alone cannot handle wrapping; verify period consistency and responsive bottom geometry. Existing backend/real-data gates unchanged. No commit/push requested.


H-063 validation: typecheck and production/isolated builds passed. Main desktop/mobile suite 202 passed, 14 expected skips. Auth suite 67 passed, one expected skip, two stale 37-record CSV assertions failed after expanding the dataset; updated them to reconcile exported row count to the displayed all-time request total, and both reruns passed. New desktop geometry check passed at 2560/1440/900/721px across Overview and API keys; its mobile variant is intentionally skipped. Verified chart/right-column bottom alignment and sidebar/footer border alignment within 1px, with no overflow. Desktop and isolated mobile screenshots reviewed. Refreshed fictional-account preview remains at http://127.0.0.1:4174/dashboard with a 2560x1249 review viewport. No commit/push.

H-063 follow-up: owner requested rounding the savings figure. Overview now formats the supplied comparison amount as USD to two decimal places; underlying comparison calculations stay unchanged. Typecheck and isolated preview build passed; refreshed browser displays $10.81. No commit/push.

### H-064 - 2026-09-24 - Requests history redesign (DONE)

Owner approved renaming Usage & requests to Requests, removing duplicated analytics and demo controls, and a six-column history table: Model, Credits used, Duration, Status, local Time, View details. Full IDs, API key, token/image counts, billing breakdown and safe support copy remain in Details. Unknown execution and unsettled billing remain distinct from failure/zero. Plan: reuse branded filters with URL/history/custom dates; align pagination and all-matching CSV export; preserve cancel/focus and error handling without customer-facing simulation controls; validate table/modal contracts, filters, exports and responsive layout. Existing /dashboard/usage URLs remain valid to preserve links. No commit/push requested.


H-064 validation: typecheck and production/isolated builds passed. Public/shared route, SEO and homepage checks: 39 passed, 13 expected skips. Full authenticated desktop/mobile suite: 68 passed, two expected skips, four stale cross-page assertions failed; made the Request log region selector exact and moved revoked-key label assertion into Details, then all four affected reruns passed. Requests filters, date validation, empty matches, six columns, technical details, credit states, CSV scope, focus and cancellation checks passed. Desktop/mobile screenshots reviewed with no document overflow; mobile table scroll stays local and custom menus stay inside the viewport. Preview left at /dashboard/usage without sign-in. No commit/push.
`nH-064 preview download follow-up: controlled browser used GUID-named download artifacts despite the application supplying takewing-demo-usage.csv. Configured its current browser context with Browser.setDownloadBehavior allow and the user Downloads folder. A fresh export saved takewing-demo-usage.csv (148454 bytes) there. Future recreated review contexts need the same normal-filename download setup; this is browser-session configuration, not an application export-code defect. The automation artifact collector may report an error because it expects GUID storage, while the normal Downloads file succeeds.

### H-065 - 2026-09-24 - Dashboard-wide dropdown consistency (DONE)

Owner explicitly requested a complete audit of every dashboard filter/dropdown and consistent use of the previously approved emerald custom component, without repeated page-specific reminders. DECIDED: FilterSelect is the shared dashboard standard, including currency, form selections and modal/preview selectors. Plan: migrate remaining native selects on Billing, API keys, Settings and shared forms; retain labels, values, keyboard behavior and disabled states; verify all affected flows and inspect responsive popup placement. Public Status and an unused legacy RequestTable are outside dashboard runtime scope. Future dashboard select controls must reuse this component. No commit/push requested.


H-065 validation: frontend typecheck and production/isolated preview builds passed. Shared catalogue/dropdown/homepage checks: 26 passed. Full authenticated desktop/mobile suite: 72 passed, two expected desktop-only skips. Added route-level native-select audit and modal disabled/Escape assertions. Desktop billing menu and mobile API-key dialog screenshots reviewed; menus fit inside dialog/viewport with no document overflow. Worker sandbox builds initially hit Windows spawn EPERM; main elevated integrated builds passed. Refreshed preview remains available without sign-in. No commit/push.


### H-066 - 2026-09-24 - Billing hierarchy and direct editing (DONE)

Owner requested removal of top demo controls and redundant balance messaging, clearer credit packages with emerald bonus badges, subtle payment status colors, and integrated billing-details editing. Plan: retain exact package data and mock payment safety boundaries; use responsive three-column cards led by total credits and price; remove the top scenario selector and redundant Settings action; simplify the existing shared inline profile form; verify billing transitions and shared profile behavior on desktop/mobile, then refresh the isolated preview. No commit/push requested.


H-066 validation: production and isolated preview builds/typecheck passed; 8 existing billing-data checks and 72 authenticated desktop/mobile checks passed, with two expected desktop-only skips. Existing mock payment/reconciliation, cancellation, account isolation and shared Billing/Settings profile behavior remain covered. Desktop and mobile screenshots reviewed with no page overflow; status colors verified. A fixture build initially ran from the repository root and failed to resolve the frontend entry; rerunning from frontend succeeded. Final copy/spacing refinement rebuilt and preview refreshed at /dashboard/billing. No commit/push.


### H-067 - 2026-09-24 - API keys demo toolbar removal

Owner approved Billing and requested removing Local Demo from API keys plus recommendations. Removed the page toolbar and its unused scenario state; actual empty key lists retain first-key guidance. Kept operation dialogs explicit about nonfunctional samples and preserved key lifecycle behavior. Suggested matching the View requests wording and moving the repeated timezone into one table-level label; the owner subsequently approved both (implemented below). No commit/push.

H-067 validation: typecheck and production/fixture builds passed; four targeted desktop/mobile lifecycle and failure/cancellation checks passed. Preview refreshed on API keys.

H-067 approved follow-up: renamed key actions to View requests, retained their key-filtered URLs, and moved the local timezone to one accessible table-level label. Dates and times remain in the user browser timezone; other consumers retain full timezone strings. Production/fixture builds and typecheck passed.
Follow-up validation: four desktop/mobile key lifecycle and request-link checks passed; preview refreshed. No commit/push.


### H-068 - 2026-09-24 - Settings cleanup (DONE)

Owner approved removing demo controls, separating Billing from Profile, simpler notification toggles and conditional threshold, dirty-only saves with unsaved-change warnings, and a restrained Security danger zone. Plan: keep existing live display-name integration and explicit mock boundaries; simplify child forms; use tab/link discard confirmations and browser reload/close warnings; update existing behavioral tests, run builds and inspect responsive tabs. Native SPA browser-history traversal is outside the scoped link/tab guard (BrowserRouter has no data-router blocker); no history interception or router migration. No commit/push requested.

H-068 validation: production/fixture builds and typecheck passed; full auth suite 76 passed with two expected desktop-only skips; five alert-policy tests passed. New tests cover tab/link discard confirmation, threshold visibility and disabled unchanged saves; actual intercepted auth rejection, cancellation, account isolation and Billing/Settings sharing remain covered. Desktop/mobile screenshots inspected without page overflow. Final mobile toggle sizing/alignment adjusted and rebuilt. Preview refreshed; no commit/push.


### H-069 - 2026-09-24 - Authorized dashboard checkpoint and main integration

Owner requested committing and pushing all current changes, checking out main and merging. Scope includes reviewed Overview data/layout, Requests history, shared dashboard dropdowns, Billing packages and direct editing, API-key cleanup, Settings cleanup and associated documentation/tests. Fetched origin before integration; origin/main is an ancestor of the feature branch, so integration can fast-forward without conflict resolution. Preserve the feature branch. Backend/payment/security production gates and the documented browser-history draft-warning limitation remain unchanged.

H-069 validation: root typecheck/build and frontend build passed; full frontend suite 202 passed with 14 expected skips. The preceding authenticated suite passed 76 with two expected skips, plus five alert-policy tests. Staged whitespace check passed. Integration uses the identical tested tree because main can fast-forward; no deployment, credential change or production backend gate closure.
