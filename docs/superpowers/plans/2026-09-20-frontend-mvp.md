# Takewing AI Frontend MVP Implementation Plan

> For agentic workers: use the executing-plans skill to work through this plan
> task by task. Do not delegate unless authorized by the user or applicable
> instructions. This is one implementation plan and persistent execution log.

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
| Last updated | 2026-09-20 |
| Overall status | READY FOR IMPLEMENTATION; planning complete, product implementation not started under this plan |
| Working branch | `docs/frontend-mvp-review` |
| Inspected code baseline | `7c6f587` — Harden consent layout and SEO redirects |
| Current implementation step | None |
| Next action | S01.1: inspect the current branch/diff and establish the implementation baseline |
| Latest completed work | S00: scope review, code inventory, plan and documentation reconciliation |
| Delivery | User authorized committing/pushing the planning documentation; see H-002 and verify current Git/upstream status |
| Latest verification | Documentation checks in V-001; no fresh build or browser-test pass claimed |
| Global blocker | None for mock-first frontend work; live gates are listed in section 5 |
| Do not forget | Equal image/text acquisition; credits never expire; initial HTML noindex issue F-001; preserve partner authentication work |

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
| S01 | Baseline, shared data/UI conventions and public rendering choice | PENDING | Can start now |
| S02 | Verified catalogue/pricing/content evidence | PENDING | Can research alongside S01; B01/B02 |
| S03 | Models, pricing and public model-family pages | PENDING | S01, verified subset from S02 |
| S04 | Billing purchase/history frontend | PENDING | S01, package evidence; live provider deferred to S12 |
| S05 | Usage, request investigation and exports | PENDING | S01; live retention/export contract B04 |
| S06 | API key frontend lifecycle | PENDING | S01; live keys B05 |
| S07 | Auth extensions, account settings and notifications | PENDING | S01; partner coordination B03/B06 |
| S08 | Status, updates, support and public policy pages | PENDING | S01; real content/sources B07/B08 |
| S09 | Overview and all-time savings | PENDING | S02, S04–S08 view data |
| S10 | Homepage, repository blog and content completion | PENDING | S02/S03, S08; docs boundary B08 |
| S11 | Organic discovery and conversion instrumentation | PENDING | S01/S03/S10; live attribution S12 |
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
| B08 | Documentation brief/API examples, legal/business disclosures, final copy review | Frontend + API/product owners | Page shell/content review proceeds; detailed docs scope needs separate discussion |
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

**Status:** PENDING. **Goal:** establish reusable boundaries and behavior for the
agreed flows without replacing the approved design or partner auth.
**Dependencies:** none for local inspection; B09 for deployment-specific choices.
**Files:** existing `frontend/src/App.tsx`, `demo/fixtures.ts`, `components/{DemoState,Dialog,Tabs,DashboardLayout}.tsx`,
`styles/{tokens,global,home,auth}.css`, `frontend/src/auth/AuthProvider.tsx`,
`frontend/src/auth/RequireAuth.tsx`, `frontend/src/auth/authUtils.ts`,
`frontend/index.html`, `frontend/vite.config.ts`.
New targeted modules: `frontend/src/data/viewModels.ts`, `frontend/src/data/demoClient.ts`,
`frontend/src/lib/{formatting,queryState,clipboard}.ts` as needed.

- [ ] S01.1 [PENDING] Record actual HEAD/dirty files and run baseline checks from section 7. Inspect existing tests and isolate pre-existing failures before feature changes; do not rewrite partner work.
- [ ] S01.2 [PENDING] Define frontend-only records for catalogue/variants, rate evidence, wallet/packages/orders, requests/billing outcomes, keys, profile/preferences, incidents/updates and overview. Use absolute timestamps, stable IDs and explicit unavailable/unknown values. Keep server DTOs unresolved; do not turn fixture strings into backend contracts.
- [ ] S01.3 [PENDING] Implement small asynchronous mock boundaries with selectable loading/empty/error/success/uncertain cases. Mock mutations update only demo state. Keep live Supabase auth separate; no secret in fixtures and no production operation behind a demo button.
- [ ] S01.4 [PENDING] Add consistent local-time labels, USD/EUR estimate formatting, copy success/failure feedback and URL filter helpers. Browser timezone is automatic; custom periods must respect local-day boundaries and preserve absolute instants. Handle invalid query values without crashing. Record the EUR-source fallback choice before real estimates.
- [ ] S01.5 [PENDING] Choose and document the smallest prerender mechanism compatible with existing React/Vite and hosting direction. Public HTML must contain content and correct route metadata; private routes remain non-indexable. Record an ADR before architecture changes, coordinating with Samuel. Include F-001 remediation in this design; do not migrate frameworks by default.
- [ ] S01.6 [PENDING] Exercise keyboard focus/return/Escape, retained form input, pending submission and expired-session return. Ensure URL filter changes do not repeatedly steal focus or scroll to the top through current RouteEffects. Establish shared mobile table/dialog behavior.

**Validation/exit:** targeted checks for local-day/DST boundaries, bad query strings,
clipboard failure, cancelled/unmounted mock responses and session return; existing
suite still covers keyboard/mobile behavior. Document any view/backend boundary
assumptions. No live backend integration required to close this stage.

### S02 — Model, price and comparison evidence

**Status:** PENDING. **Goal:** remove fictional catalogue pricing with a reviewable,
dated dataset shared by UI/content. **Dependencies:** B01/B02; research can begin now.
**Files:** new `frontend/src/content/catalogue.ts`, `docs/MODEL_PRICING.md`;
`docs/BILLING.md`, `docs/API.md`, `docs/OPEN_DECISIONS.md`. Detailed exploratory
screenshots remain outside the repository; verified publishable facts belong here.

- [ ] S02.1 [PENDING] Recheck GRSAI image/text inventory and official model identities. Record family, variant ID, provider, capability/resolution, units, limitations, availability and source/date. Isolate unresolved CL/aliases; verify speed/stability claims instead of inferring them from names. Exclude video.
- [ ] S02.2 [PENDING] Recheck GRSAI credit rates and USD packages, then official standard rates/options. Record exact units, input/output/cache/image settings, source and as-of date. Compare equivalent variants; distinguish standard from batch/cache discounts and exclude unverified comparisons.
- [ ] S02.3 [PENDING] Build a typed publishable dataset with fixed standard conversion and integer/scaled decimal or exact string representation. Implement deterministic display calculations without making the browser authoritative. Record rounding rules and show unsupported comparisons as unavailable, never 0% fabricated data.
- [ ] S02.4 [PENDING] Agree the all-time savings view contract: historical rate versions, actual settled usage/charges, coverage and exclusions. Resolve refunded/charged-failure and negative-difference handling explicitly with billing; do not silently clamp or count a refunded request as a delivered saving. Preserve historical records after retirement.
- [ ] S02.5 [PENDING] Review prices, variants and claims with the product/backend owners. Mark each entry verified, unavailable or awaiting evidence. A verified subset can unblock S03; do not call the full catalogue done while agreed entries remain unexplained.

Reference package snapshot observed 2026-09-20, **revalidate before publishing**:

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

**Status:** PENDING. **Goal:** discover and compare supported models and variants.
**Dependencies:** S01 and verified S02 entries. **Files:** `frontend/src/pages/Models.tsx`,
new `frontend/src/pages/ModelDetail.tsx`, `frontend/src/content/catalogue.ts`,
`frontend/src/App.tsx`, `frontend/src/seo/{routes,generate,structuredData}.ts`;
targeted catalogue components only where public/dashboard reuse warrants them.

- [ ] S03.1 [PENDING] Replace example cards with grouped families and side-by-side variants, keeping provider/capability/search filters and URL state. Show each exact API ID with copy feedback and verified suitable-use/limitation explanations.
- [ ] S03.2 [PENDING] Show fixed monetary rates first, credits second, explicit units/settings, official comparison and evidence date. Add optional EUR estimate/manual currency selection without changing USD checkout or introducing a package selector.
- [ ] S03.3 [PENDING] Show temporary unavailability and remove permanent retirements from active discovery. Keep historical request references readable. Reuse a single availability source with status surfaces; do not fake automatic upstream monitoring.
- [ ] S03.4 [PENDING] Add `/models/:slug` for a researched selection of useful image and text family pages: original explanation, rates/options, limitations, verified integration/docs links and CTA. Register routes, metadata and internal links for prerendering. Unverified examples must not look runnable.
- [ ] S03.5 [PENDING] Verify public/dashboard consistency, empty filters, invalid/deep URLs, currency estimates, variant keyboard interaction and mobile comparison layout. Refresh/back restores filters; unknown slugs produce a true missing page at deployment.

**Exit:** catalogue uses researched data, has no fictional-price or package-based
rate behavior, and provides equal discoverability for image and text. S12 owns
live availability/pricing integration; static snapshots are explicitly dated.

### S04 — Billing and purchases

**Status:** PENDING. **Goal:** complete reviewable purchase/order/document flows.
**Dependencies:** S01/S02 packages; B03/B11 for live checkout/EUR.
**Files:** `frontend/src/pages/Billing.tsx`, `frontend/src/data/{viewModels,demoClient}.ts`,
new `frontend/src/components/BillingDetailsForm.tsx`, `docs/BILLING.md`.

- [ ] S04.1 [PENDING] Build package cards with USD price, base/bonus/total credits and non-expiry copy. Add a selected-package review showing the exact USD total before continuing; EUR is only an estimate. Do not add custom amounts, codes or auto-topups.
- [ ] S04.2 [PENDING] Implement mock pending/success/cancel/failure/refund states. Pending confirmation must not claim credited funds or encourage a potentially duplicate payment. Failed purchase explanations distinguish uncaptured failure from captured-funds reconciliation/refund.
- [ ] S04.3 [PENDING] Expand history with date, ID, amount, credits received and status; order detail shows clear receipt and invoice download states. Simulate local labelled sample documents or explicit unavailable states; do not claim authentic documents or successful payment.
- [ ] S04.4 [PENDING] Reuse the shared optional billing profile in Billing and Settings. Add status/support links and safe copyable order details. Preserve edits/errors and prevent duplicate submissions.
- [ ] S04.5 [PENDING] Verify package arithmetic/display, no credits from a redirect alone, pending reload behavior, failed/denied document downloads, local timestamps and mobile review flow. Record provider-required fields as B03, not new signup requirements.

**Exit:** mock purchase/history flows are complete and truthful; actual provider
actions, document downloads and credited balances remain gated by S12. Live
download authorization and transaction safety require backend evidence.

### S05 — Usage and request investigation

**Status:** PENDING. **Goal:** explain activity and charges without storing content.
**Dependencies:** S01; B04/B02 for live history and settlement.
**Files:** `frontend/src/pages/Usage.tsx`, `components/{RequestTable,UsageChart}.tsx`,
new `frontend/src/lib/{usageExport,supportDetails}.ts`, mock records.

- [ ] S05.1 [PENDING] Add Today/7 days/30 days/6 months/All time/custom dates; model, key and status filters plus request-ID search. Persist applicable filters in URLs and paginate history. All time means the agreed full account metadata history, not a silent hardcoded sample window.
- [ ] S05.2 [PENDING] Synchronize period totals and spending chart; rows show time, model/variant, key name, request state, duration and charge. Label local timezone; keep execution and billing statuses independent.
- [ ] S05.3 [PENDING] Expand details with applicable input/output/cache counts, safe errors, settled charge/refund/awaiting-confirmation states and relevant actions/docs. Only known causes receive corrective advice; unknown/ambiguous billable outcomes must not suggest unsafe automatic retry.
- [ ] S05.4 [PENDING] Export all filtered records, not just the current page, as CSV. Specify units, timezone/absolute timestamp, fields, escaping and progress/failure/cancel behavior. Prevent spreadsheet formula interpretation of untrusted fields. Never export secrets/prompts/outputs.
- [ ] S05.5 [PENDING] Add Copy support details with ID, timestamp/timezone, model/status and safe error context, plus Get help. Verify redaction through an explicit allowlist, not blind serialization of response objects.
- [ ] S05.6 [PENDING] Test composed URL filters/back/reload, local-day boundaries, empty/failed/loading vs zero, retired models/revoked key labels, multi-page CSV completeness, token applicability and failed-but-charged vs refunded requests.

**Exit:** fixture dataset contains enough records and distinct failure/billing
cases to prove behavior. S12 must confirm history retention and complete export;
the frontend cannot promise indefinite backend retention by itself.

### S06 — API keys

**Status:** PENDING. **Goal:** simple safe key-management UI.
**Dependencies:** S01; B05 for live keys. **Files:** `frontend/src/pages/ApiKeys.tsx`,
mock data/client, clipboard helper, `docs/SECURITY.md`.

- [ ] S06.1 [PENDING] Create named demo keys with a visibly nonfunctional sample secret, one-time display, copy feedback and save-before-close guidance. After closing, retain only the masked identifier in lists; do not persist secrets in storage, logs or URLs.
- [ ] S06.2 [PENDING] List name/status/created/last-used, including never used. Active is default; allow access to revoked history. Link each key to filtered usage and provide verified base URL/quickstart help when available.
- [ ] S06.3 [PENDING] Confirm revocation with integration impact and model pending/error/success behavior. Lost secrets use create-replacement then revoke guidance; no rename/pause/scopes/limits/expiry features.
- [ ] S06.4 [PENDING] Test secret disappearance across dialog closure/navigation/reload, copy failure, focus return, cancelled/failed revoke, duplicate submission and historical labels. Existing tests that assert the sample list never changes must be updated to agreed mock behavior, not real credential issuance.

**Exit:** UI lifecycle is verified with nonfunctional demo keys; live generation,
hashing, ownership and effective revocation are explicitly S12 evidence.

### S07 — Auth, account settings and notifications

**Status:** PENDING. **Goal:** extend existing auth and complete account self service.
**Dependencies:** S01; coordinate B03/B06 before touching shared auth interfaces.
**Files:** `frontend/src/pages/{Signup,Login,AuthCallback,ForgotPassword,UpdatePassword,Settings}.tsx`,
`frontend/src/auth/{AuthProvider,RequireAuth}.tsx`, `frontend/src/auth/authUtils.ts`,
shared `BillingDetailsForm.tsx`, mock client and `docs/SECURITY.md`.

- [ ] S07.1 [PENDING] Coordinate current partner work and preserve existing sign-in methods/gates. Add optional account-type/company/address/VAT capture with equivalent optional completion after OAuth; no mandatory onboarding, extra identity questions or trial promises.
- [ ] S07.2 [PENDING] Make confirmation/reset expiration/failure states actionable and preserve safe intended destinations. Add email change with pending verification and password change for password accounts; explain provider-managed credentials for OAuth accounts without silently linking methods.
- [ ] S07.3 [PENDING] Reuse display-name editing and shared billing profile. Add identity-confirmed deletion flow showing remaining credits and explicit forfeiture/API-access termination. Mock deletion must not delete the real Supabase user. Resolve pending operations and retention effects with B06 before live deletion.
- [ ] S07.4 [PENDING] Add low-balance enable toggle, editable credit threshold, current balance and verified account email. Add one optional product-update toggle off by default; remove separate documentation updates. Explain essential transactional messages separately.
- [ ] S07.5 [PENDING] Model one initial alert if enabled while below threshold, one alert on a downward crossing, rearm only after recovery above threshold. Document threshold-edit and unverified-email cases with backend owner before integration. The browser saves preferences, never acts as the production email scheduler.
- [ ] S07.6 [PENDING] Test optional signup completion, OAuth/password differences, retained edits, expired links, rejected save, deletion cancellation/reauth failure and preference states. Plan server behavior tests for duplicate alerts/rearming under S12.

**Exit:** mock account flows and actual supported auth paths are distinguishable.
No new production claim until security guide gates (SMTP, CAPTCHA/rate policy,
callbacks, server verification, etc.) are tested by the responsible owners.

### S08 — Status, updates, support and policy content

**Status:** PENDING. **Goal:** make problems and help discoverable.
**Dependencies:** S01; B07/B08 for real publishing/contact/legal content.
**Files:** new `frontend/src/pages/{Status,Updates,Support,Policy}.tsx`,
new `frontend/src/components/IncidentNotice.tsx`; existing `Information.tsx`,
`App.tsx`, `DashboardLayout.tsx`, SEO registry; repository content records as needed.

- [ ] S08.1 [PENDING] Build `/status` with overall and affected-model/service state, timestamp, incident impact/start/update/resolution details. Include unavailable/stale-source behavior; no fetch failure may imply operational health.
- [ ] S08.2 [PENDING] Reuse incidents in dashboard notices/catalogue availability. Build recent dated announcements and a chronological `/updates` archive with addressable details. Keep incidents distinct from ordinary news; no bell/unread/search/subscriptions.
- [ ] S08.3 [PENDING] Build one Support page linking common help topics, docs and status; show only the selected real contact channel/response expectations. Link request/order help and explain safe context to send. Unchosen contact information stays an explicit content gate.
- [ ] S08.4 [PENDING] Replace Contact/Terms/Privacy placeholders with readable approved content, dated sections and consistent footer links. Reflect non-expiry, conditional request refunds and deletion forfeiture. Do not generate legal promises from competitor text. Keep consent preferences revisitable.
- [ ] S08.5 [PENDING] Hold the separately requested documentation scope review before detailed docs implementation. Record its accepted brief and steps here; provide the existing `/docs` route/navigation boundary now, but do not invent working API examples or omit documentation from launch readiness.
- [ ] S08.6 [PENDING] Check incident/catalogue agreement, missing status data, chronological links, safe support context, section anchors, mobile navigation and public/private boundaries. Real publishing/delivery is completed in S12 or via reviewed repository content, per B07.

**Exit:** agreed public/help/status UI works with explicit mock/content boundaries.
Publishable documents and real support/source ownership are required for launch,
not for initial layout review. Chatbot remains a follow-up.

### S09 — Overview and savings

**Status:** PENDING. **Goal:** summarize the account and demonstrate savings honestly.
**Dependencies:** S02 and S04–S08 shared view data.
**Files:** `frontend/src/pages/Overview.tsx`, `components/{UsageChart,RequestTable}.tsx`,
`IncidentNotice.tsx`, mock summary/savings records.

- [ ] S09.1 [PENDING] Preserve the layout; add shared 7/30-day totals/chart periods, available credits, Add credits/history actions and completed/failed counts. Keep request/credit chart switching and show exactly five recent requests.
- [ ] S09.2 [PENDING] Add the all-time summary: "You've saved $X compared with official API pricing." Explain standard conversion, historical comparison and coverage; handle no history, unavailable and partial comparison cases. Chart period changes must not change the all-time figure.
- [ ] S09.3 [PENDING] Compose approved active-incident and announcement content. New accounts receive useful next steps (purchase, key, quickstart), not misleading zero-filled charts or an onboarding wizard.
- [ ] S09.4 [PENDING] Add last-updated and refresh behavior, with independent error handling where appropriate. Test consistent totals with usage data, period changes, partial savings, retired models and failed refresh without implying zero balance.

**Exit:** Overview agrees with the same fixture records used by Billing/Usage;
production savings/settlement are server-confirmed during S12.

### S10 — Homepage, blog and publication content

**Status:** PENDING. **Goal:** turn the existing design into original, useful
acquisition content for image and text customers equally.
**Dependencies:** S02/S03, S08; B08 for final copy/docs and B12 for content ownership.
**Files:** `frontend/src/pages/Home.tsx`, `styles/home.css`, new
`frontend/src/pages/{Blog,BlogArticle}.tsx`, `frontend/content/blog/`,
`frontend/src/content/blog.ts`, `App.tsx`, SEO registry; reuse catalogue data.

- [ ] S10.1 [PENDING] Review original savings-led copy across the site: precise model/API cost benefit with substantiated comparisons, Get started/Explore models actions, equal image/text visibility. Remove vague/obsolete demo claims where they no longer describe the page, while retaining accurate mock labels.
- [ ] S10.2 [PENDING] Update homepage selected real models/prices, prepaid/bonus explanation, dashboard preview, signup-to-request steps and concise FAQ. Only add executable copyable integration snippets after API verification. Keep public support/status/docs/legal links consistent.
- [ ] S10.3 [PENDING] Select a simple repository article format compatible with S01 rendering; record the choice. Validate slug/title/summary/topic, author or reviewer attribution, publication/update dates, draft state and related links. Exclude drafts from routes/sitemaps. Do not add a CMS or permit arbitrary unsafe HTML from content by default.
- [ ] S10.4 [PENDING] Build `/blog` summaries/topic filters and `/blog/:slug` pages with headings, dates, images/tables, source links, code-copy feedback, longer-article TOC, related articles and contextual model/docs/signup links. No blog search, comments, newsletter or translations.
- [ ] S10.5 [PENDING] Prepare reviewed launch content for both modalities from researched opportunities: cost comparisons, tested integration examples, cost-saving guides or first-hand tests. AI-assisted drafts require verified claims/code/results; do not invent tests, authors, customer evidence or savings. Reuse verified prices to reduce drift; assign ongoing owners.
- [ ] S10.6 [PENDING] Check original copy, readable long articles/mobile tables, image descriptions, draft exclusion, invalid slugs, code copying, broken links and price consistency across homepage/catalogue/blog. Record deferred API examples/content as launch gates rather than publishing filler.

**Exit:** content surfaces complete and selected articles genuinely reviewed;
specific article count is not fixed by this plan. Both image and text have useful
coverage. Publication timing remains controlled by S13.

### S11 — Search, AI discovery and organic measurement

**Status:** PENDING. **Goal:** expose useful public content and measure customer outcomes.
**Dependencies:** S01 render decision, S03/S10 routes, B09/B12 for activation/owners.
**Files:** `frontend/index.html`, `frontend/vite.config.ts`,
`frontend/src/seo/{config,routes,generate,head,structuredData,analytics}.ts`,
`frontend/src/components/ConsentBanner.tsx`, `frontend/tests/seo.spec.ts`,
new `docs/ACQUISITION.md` for verified content targets/operations, not another plan.

- [ ] S11.1 [PENDING] Implement S01 public prerender choice and fix F-001. Production-ready public responses contain readable content, title/description/canonical/social metadata and correct robots directives without executing JS. Preview remains closed; auth/private routes remain noindex. Do not embed session data in public artifacts.
- [ ] S11.2 [PENDING] Generate sitemap and public routes including model/blog/update pages from actual publishable content; exclude drafts, private/search/filter variants. Verify missing URLs return correct host status, old topic redirects, query canonicalization and social previews. Use structured data only when truthful and applicable, not as a claimed GEO shortcut.
- [ ] S11.3 [PENDING] Verify relevant search/AI crawler access against current official guidance and actual host/CDN configuration. Record source/date. Separate search retrieval permissions from training preferences; no special-file or citation guarantee. Register Search Console/Bing with authorized account/domain access at launch.
- [ ] S11.4 [PENDING] Define and instrument the consent-aware funnel: public landing/referral, signup completion, first confirmed credit purchase, first successful API request. Do not count clicks/redirects as purchases or send secrets/query PII. Deduplicate verified outcomes; record attribution gaps and keep advertising tags/campaigns inactive.
- [ ] S11.5 [PENDING] Research specific image and text topics without an image-first quota; record evidence, audience, verified price advantage and intended landing page. Assign one owner per article/outreach deliverable. Prepare useful distribution material; sending/posting requires explicit authorization and is not implied by this plan.
- [ ] S11.6 [PENDING] Verify raw HTML in indexable/non-indexable builds, public route hydration, canonical/JSON-LD output, consent rejection/revisit, no unauthorized tracking, funnel event duplicates and no private data in URLs/events. Production search registration/event outcomes remain S13 gates.

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

New row fields: ID/date, owner/source, options considered, chosen option/reason,
scope/contract impact, files/ADR, follow-up stage IDs, verification. Preserve
superseded decisions with a link to their replacement.

## 9. Findings, errors and workarounds

| ID / discovered | State | Evidence, impact and required follow-up |
| --- | --- | --- |
| F-001 / 2026-09-20 | OPEN — launch risk | `frontend/index.html` starts with unconditional noindex; runtime removes it. Google may skip rendering after initial noindex. S01 design/S11 raw-HTML regression/S13 deployed check required. Not fixed by this planning work. |
| F-002 / 2026-09-20 | OPEN — contract gap | Current fixtures are formatted strings and contain fictional EUR payments, dates, rates and product-updates-on defaults. S01 normalizes view data; S02/S04/S07 replace incompatible samples. Never parse formatted strings as authoritative money. |
| F-003 / 2026-09-20 | RECORDED limitation | Google Trends research returned HTTP 429; no reliable image-vs-text search-volume claim obtained. No workaround data invented. Equal image/text decision is D-004; S11 researches specific topics. |
| F-004 / 2026-09-20 | RECONCILED | Older notes left non-expiry tentative, last-used optional, acquisition paid/open or image-first. Updated review/domain register to current decisions; preserve historical research as evidence, not authority over later decisions. |
| F-005 / 2026-09-20 | RESOLVED inspection error | Attempted `.ts` Playwright config read failed; `rg --files` found `frontend/playwright.config.mjs`. Plan uses actual file. No product defect or test failure resulted. |
| F-006 / 2026-09-20 | OPEN — interaction risk | App RouteEffects currently reacts to query changes with heading focus and scroll reset. URL-filter work must preserve filter input focus and usable back/forward behavior; test in S01/S05. |
| F-007 / 2026-09-20 | OPEN — validation dependency | Authenticated Playwright tests call signIn(), which skips without E2E_EMAIL/E2E_PASSWORD. A green public-only run does not verify dashboard stages. S01.1 must record coverage; use controlled test accounts or a clearly scoped test-only auth fixture without weakening production guards. |
| F-008 / 2026-09-20 | RESOLVED tooling limitation | Initial documentation-audit attempt using Python failed because Python was unavailable on PATH. Re-ran the link/status/ID audit using existing Node.js; passed. No installation or product change needed. Use Node or PowerShell for similar local checks. |

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
  `git log --oneline -- docs/superpowers/plans/2026-09-20-frontend-mvp.md`.
- Pre-commit inspection: only the eleven intended documentation files are changed
  or new; `git diff --check` passes. Product tests remain unnecessary for this
  documentation-only delivery; S01.1 still establishes the runtime baseline.
- Verify delivery using branch/upstream comparison and clean working-tree status;
  do not infer a successful push solely from this pre-commit entry.
- Next implementation action remains S01.1. All 71 implementation steps remain pending.
