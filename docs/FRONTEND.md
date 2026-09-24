# Frontend scope

For execution, current progress and session handoff, use the
[Frontend Implementation Plan](superpowers/plans/2026-09-20-frontend-implementation-plan.md).
Its accepted scope supersedes earlier provisional frontend directions below;
historical implementation sections remain evidence of the existing foundation.

### Shared interaction helpers (S01.4, 2026-09-20)

S01.6 now includes isolated browser auth fixtures (`npm --prefix frontend run
test:auth`): expired-session return with catalogue filters, cross-tab sign-out,
pending login/profile saves, retained edits after failures, keyboard tabs, modal
Escape/focus return, mobile table/dialog bounds and six wide dashboard routes.
The mobile account section is visible: the prior responsive rule hid Sign out
along with resource links. Its popover opens below the trigger on mobile. These
checks use fictional intercepted auth responses, not real service verification.

Catalogue provider/capability/search filters now use URL parameters, shared by
public and dashboard catalogue pages. Invalid choices fall back to All. Select
changes add history entries; typing replaces the current entry to avoid one Back
step per keystroke. Other query parameters are retained. Filter updates preserve
focus and scroll; page navigation still focuses the heading. Legacy information
topic changes count as page navigation.

`BrowserRouter` uses synchronous updates (`useTransitions={false}`) because these
controlled inputs read their values directly from URL state. Deferred router
updates reproduced dropped characters during rapid mobile typing (F-016).
The supported [React Router opt-out](https://reactrouter.com/explanation/react-transitions)
avoids a second mirrored input state; revisit if later route rendering needs
transitions. Focus, scroll, history and auth-return fixtures pass with this setting.

S02.3 adds a dated typed reference catalogue and exact display arithmetic, with
all unsupported comparisons explicitly unavailable. S03 now wires that inventory into the public and dashboard catalogue. [Stage 2 owner review](STAGE2_REVIEW.md)
contains the accepted variant dispositions and savings contract, including the
requirement that our price never exceed the equivalent official price. Backend
validation remains S12; this does not enable production offers.

Model dialogs expose a clearly fictional example ID with copy feedback. The shared
CopyButton reports pending, successful and failed copying; denied/unavailable
clipboard access leaves the text visible for manual copying. It does not copy a
real credential or claim that fixture model IDs are callable.

`lib/formatting.ts` provides local-time labels including the browser's timezone,
inclusive local-date inputs converted to an exclusive-end absolute range using
calendar arithmetic, and exact-decimal USD/EUR display. Invalid custom periods
return no range. Supplied precision is preserved without floating-point conversion
or billing arithmetic. These formatting helpers will be adopted as legacy page
fixtures migrate; existing account timestamps and amounts are not yet converted.

EUR fallback: show authoritative USD with “EUR estimate unavailable” unless a
caller supplies an estimate with an as-of time and an unexpired expiry time. No
exchange source or refresh interval is invented; B11 remains open. Valid estimates
are explicitly approximate and dated, never checkout quotes. The future currency
switch belongs to the consuming account/catalogue stages.

The [2026-09-20 frontend review](FRONTEND_REVIEW.md) records the latest accepted
direction and unresolved details. It is a decision record, not the final plan.


### Reference catalogue and family pages (S03, 2026-09-20)

The public and authenticated Models views now share all 29 accepted reference
variants, grouped into 12 families. Provider, capability, search and display
currency use URL state; older provider=Gemini links remain supported as Google.
Cards compare variants side by side at desktop widths and stack on mobile.
Details retain exact copyable **reference IDs**, pending public API IDs, unknown
cache prices, listed image resolutions, explicit request/token units, official
context tiers and source dates. No reference ID is advertised as runnable.

Four editorial family pages provide equal image/text coverage: GPT Image 2,
Nano Banana Pro, GPT-5.6 and Gemini Flash. Original explanations distinguish
original-provider capabilities from unverified Takewing integration. Official
links, documentation status, account CTA, canonicals, metadata, sitemap entries
and enumerated host rewrites share the route registry. No Product/Offer markup
or indexing activation was added in S03. S11 now implements prerendered initial HTML;
S13 must verify deep URLs and real HTTP 404 status on the selected host. Vite
preview now models public/static and private-shell routing locally; it is not
evidence of production status codes.

Rates use the fixed 66,600-credit/USD basis, with six-place rounded money marked
as approximate. Bonuses never change rates. EUR is manually selectable; with no
approved quote source it shows USD and an explicit unavailable message. The
shared formatter accepts a fresh supplied per-rate EUR estimate, retains USD,
and rejects expired/future estimates. Live quote delivery remains B11/S12.
Equivalent savings remain unavailable for all current references; price-ceiling
violations return an explicit pricing/comparison error, including tiny negatives.

Catalogue and /status use the same dated availability records. Flare/Sunburst
retain the maintenance notice; unknown health never becomes operational status.
Confirmed retired records are filtered from discovery without deleting source
records. No current research alias is declared permanently retired from an
unverified candidate mapping. Legacy request history still displays its recorded
model labels independently of catalogue membership; S05/S12 own the richer
history migration and live retirement evidence.

Implementation uses small shared catalogue components and content/modelFamilies.ts,
not the fictional account-data client. No account mutations, backend APIs,
production pricing, live monitoring or financial settlement were introduced.

### Homepage and repository guides (S10, 2026-09-20)

The homepage retains its reviewed width, artwork and dashboard preview. Four
selected catalogue references give equal image/text visibility: GPT Image 2,
Nano Banana Pro, GPT-5.6 Terra and Gemini 3.5
Flash. These are dated references, not verified Takewing offers or callable IDs.
No equivalent percentage saving is claimed. The fictional dashboard preview keeps
its label; the old assertion that accounts were disconnected is removed because
the existing configured Supabase sign-in is real.

Get started links to signup; Explore models leads to the catalogue. The page now
explains prepaid credits, non-expiry, wallet-only bonuses, conditional failed-request
refunds, and the intended account → credits → key → first external request journey.
Native disclosure controls provide a concise keyboard-operable FAQ. Help, docs,
status, blog and policy links remain available. The homepage metadata describes the
API pricing positioning while the visible preview notice retains the unconnected boundary.

Owner correction 2026-09-21 (headline superseded by H-058 below): the original S10 copy did not meet the accepted
lower-price positioning. The hero now says "Leading AI models. Lower API prices."
and pricing immediately follows it. ModelPrices shares exact catalogue values
and rational arithmetic, but uses two decimal places (three below one cent,
bounded values below precision), retaining approximation markers. It omits credit
counts, cache rates and internal readiness labels. Exact detail views remain
unchanged. Text cards show official Standard input/output prices with source links
and their context/thinking conditions; no image total is guessed. The owner approved published-rate badges in compact cards on 2026-09-21. Official
text prices are crossed out above prominent preview prices; emerald badges show
separate input/output percentage differences, rounded down from exact values.
Verified realized savings remain gated by backend equivalence and settlement evidence.

The shared UsageChart stays in a neutral charcoal preview with the Overview
balance/header hierarchy and emerald accents. One split section combines prepaid
benefits with a three-step API journey. FAQ behavior and content are retained.

`/blog` filters two technically reviewed image/text guides by topic. Article pages
include dates, honest AI review attribution, described original diagrams, locally
scrolling tables, section navigation, source links, copyable planning checklists,
related guides and contextual model/docs/signup links. There are no claimed API
tests, runnable integration examples, fabricated savings or customer endorsements.
The typed repository format and validation are described in
[ARCHITECTURE.md](ARCHITECTURE.md#stage-10-repository-content-boundary).

**Publication register — prepared content, not launch approval:**

| Article | Technical review | Ongoing human owner | Publication requirement |
| --- | --- | --- | --- |
| Understanding text token rates | Codex; 2026-09-20; shared catalogue conditions and component boundaries | OPEN B12; frontend/content owner to accept | Refresh linked source evidence, confirm served model/accounting, approve final copy |
| Understanding image model request rates | Codex; 2026-09-20; request/output distinction and shared reference | OPEN B12; frontend/content owner to accept | Refresh linked source evidence, confirm settings/output accounting, approve final copy |

Both guides are available for local review in the closed preview deployment.
Their repository non-draft state permits route generation; it is not human launch
approval. A retained editorial draft is excluded from article lookup, public lists,
route metadata, sitemap and host rewrite generation. Missing paths render a useful
noindex state; deployed HTTP 404 behavior remains S13. S11 adds raw public HTML
prerendering, and indexing stays off by default. Detailed docs and tested image/text
API examples remain B08/S12/S13, with ongoing publication owners under B12.

## DECIDED — initial scope (2026-09-15)

Owner: JannesG / PlaYa-44 (frontend), coordinating with the relevant backend owners.
This records accepted scope, not implemented functionality or approval to build.

Provide a public website and customer management dashboard for our API service.
Generation remains API-only: no first-party chat, playground, or generation UI
in the MVP. This clarifies the management surfaces left unspecified by
[ADR-001](decisions/ADR-001-api-only-mvp.md).

### Public website

- Homepage: service explanation, benefits, supported capabilities, getting started.
- Models and pricing: searchable catalogue with clear billing units.
- Documentation: quickstart, examples, API reference.
- Discoverable support and service-status information.
- Footer with contact, terms, and privacy information.

These were initially scoped as content areas. Homepage and catalogue routes are
implemented below; separate routes for the remaining public content await that work.

### Customer dashboard

| Section | Scope |
| --- | --- |
| Overview | Balance, recent spending, request summary, important announcements |
| Models | Available models, capabilities, prices, documentation links |
| Usage and requests | Task/request log with status, model, time, cost, and error details |
| Billing | Buy credits, orders, payment status, transaction history, receipts/invoices |
| API keys | Create, name, revoke keys, and access integration details |
| Settings | User information, account security, notification preferences |

Announcements belong on the overview initially; user information belongs in
Settings. The initial customer journey is account creation, credit purchase,
API-key creation, first request from an external client, then usage/cost inspection.
Request logs do not imply prompt/output storage; existing security and retention
boundaries apply.

### Boundaries

- GRSAI is a functional reference for the upstream-backed service; its interface,
  model claims, and prices are not our design or verified capability contract.
- Our backend owns permissions, prices, credits, payments, and private upstream
  access. The dashboard displays server-authoritative results.
- Additional partner features will be scoped when concrete requirements arrive.
  Do not prebuild extension frameworks or speculative screens.
- Internal admin tooling remains a separate unresolved scope under OD-013.

## DECIDED — theme and foundation sequence (2026-09-15)

The public website and customer dashboard are dark-only. There is no light
variant or theme toggle; system theme preferences must not switch the interface
to light. This supersedes the research note's initial light-surface proposal.
The reason is a consistent product identity, explicitly requested by the owner.
The accepted visual system is recorded below; it supersedes the earlier open color choices.

Before detailed page concepts, establish the product name, brand direction,
visual system and technical approach. The owner requested this foundation first
because naming and identity influence design; isolated page concepts would
otherwise precede the decisions they depend on. The selected customer-facing name is Takewing AI; AI Gen remains the repository name.

## Foundation and continuity

Keep accepted frontend scope, decisions and reasons in this guide. Technical
contracts belong in their existing owning guides; material architecture choices
belong in ADRs. Distinguish DECIDED requirements, ASSUMPTION proposals and OPEN
questions, and mark superseded directions explicitly.

Detailed exploratory research and reference images are maintained locally by
the frontend owner. Shared documentation retains the resulting direction and
contracts. Resume by reading the shared guides, the owner's local handoff when
available, and the actual branch/diff.

## ASSUMPTION — reference direction (2026-09-15)

The proposed combination is Resend's labelled navigation and compact request
logs, Mercury's balance-first overview, OpenAI's key management, and selected
Vercel/Stripe onboarding and billing patterns. These are structural references,
not a selected design or verified live product contracts. Adapt to dark-only.
The owner subsequently approved the Takewing AI visual direction and authorized moving toward implementation. The references describe design inspiration, not backend contracts.

## OPEN — design and implementation

React/TypeScript/Vite and ordinary CSS are now accepted and implemented as described
below. Hosting remains open. The visual system and dashboard navigation below
are accepted; local HTML previews supplied the design review workflow.

The initial browser authentication slice is implemented under OD-001 with
Supabase Auth, Google OAuth, a configuration-gated Discord OAuth option,
email/password, reset flow and protected dashboard navigation. The Discord
button stays hidden until its provider is configured in Supabase Auth. Backend
token verification, account data and RLS still require coordination with the
database/API owners. Payments and invoice delivery
(OD-003), API contracts (OD-008), credit units (OD-009), key lifecycle (OD-010),
retention (OD-012), and pricing (OD-014) still require coordination with their owners. Notification
channels, support/status delivery, and announcement publishing are not selected.
Record agreed contracts before dependent implementation; label mock data and
provisional contracts as assumptions.

See [product scope](PRODUCT.md), [architecture](ARCHITECTURE.md), and
[open decisions](OPEN_DECISIONS.md).

## DECIDED - Takewing AI visual direction (2026-09-16)

Owner: JannesG / PlaYa-44. Accepted after local prototype review, then authorized
application across the existing seven-screen design set. This records a design
contract, not implemented application behavior.

- Name: Takewing AI. Abstract lift symbol with same-baseline wordmark.
- Voice: calm, clear, practical and competent; international English, aimed at
  independent builders and small teams. Avoid hype and unsupported claims.
- Dark-only; Geist is the primary typeface for website and dashboard.
- Neutral page #101112, sidebar #141516, panel #191B1D, primary text #F2F2F3.
  Use readable gray secondary text and neutral borders rather than green-tinted
  surfaces throughout the interface.
- Emerald #57C99B emphasizes primary actions, model prices, small icons,
  selection indicators and chart accents. Small icon tiles may have a faint tint.
- Balance figures and secondary links, including View details, stay neutral.
  Avoid stacking a green balance, button and secondary link in one cluster.
- Provider icons remain monochrome. Text/image/video capability labels use small
  emerald icons; capabilities must be supported by verified catalogue data.
- Models use a multi-column card grid: two cards per row, a three-column desktop
  comparison in the prototype, and one column on narrow screens. Whether users
  need a density toggle in the shipped app remains a product choice.
- Overview uses the accepted hybrid hierarchy: prominent readable balance,
  restrained surfaces, compact activity table, usage chart and announcements.
- Dashboard navigation: Overview, Models, Usage & requests, Billing, API keys,
  Settings. Public homepage retains the abstract emerald lift graphic.
- Status labels accompany color. Error and pending states retain their own
  semantic treatment; brand green must not erase these distinctions.

The seven local previews cover homepage, overview, models, keys, usage, billing
and settings. They are standalone HTML/CSS with fictional data and simulated
interactions, not application code connected to a backend. Their screenshots and
exploratory history stay outside version control. Sample prices, balances,
currencies, model entries and Veo examples are not commercial or API decisions.
OD-007 still gates public claims of video support.

## DECIDED - frontend stack and first increment (2026-09-16)

Owner approved React/TypeScript with Vite in a separate `frontend/` directory,
ordinary CSS and React Router, retaining the existing Node.js starter and its
scripts. This supersedes the earlier stack proposal. Shared design variables and
a small set of reusable components implement the accepted visual system.
See [ADR-002](decisions/ADR-002-frontend-stack.md). Hosting is not decided.
A static client app keeps this first increment independent of backend runtime;
public-page indexing/prerendering must be addressed before launch. A framework
with integrated rendering is an alternative if that becomes an immediate need.

Implemented: homepage, Overview, Models & Pricing, Usage & Requests, Billing,
API Keys and Settings, with router-backed navigation, active states, direct local
loads, browser history and missing-page handling. The public `/models` route
reuses the catalogue in a public layout. Shared components cover navigation,
dialogs, keyboard tabs, request tables and demo states. Geist is bundled locally;
asset notices and licenses ship under `frontend/public/`.

Fixtures remain separate in `frontend/src/demo/fixtures.ts`. All balances,
prices, dates, requests, accounts and model entries are illustrative. Filters,
details, chart metrics, keyboard tabs, empty/error states, notification controls
and most settings feedback are local interactions. The authenticated profile
page reads the current Supabase email and profile name; display-name changes
persist through Supabase Auth user metadata. Key actions only preview results,
with an unmistakably invalid sample value; no credentials are issued or
revoked. Purchase/receipt dialogs explain unavailable integration.

The prototype density comparison control is omitted in this increment; the grid
uses two desktop columns and one mobile column. Whether to ship a user density
control remains open. The unverified Veo entry is omitted; no video support is
advertised. Support, documentation and legal destinations display honest
pending-content notices. The sign-in and account-creation slice is now connected
to Supabase Auth; payment flow and API schema remain unimplemented.

The frontend is a local demo, not a production launch. Indexing/prerendering,
verified public content, hosting route fallback, and all listed backend contracts
remain launch work. Screenshots and detailed exploratory records stay outside the
repository. See README for typecheck/build and browser regression commands.

### Stage 7 account self service (mock extensions)

Signup offers optional personal/business/company/address/VAT sample fields, with
equivalent optional completion in Settings after any sign-in method. Samples are
explicitly not saved with signup and disappear on departure; B03/B06 own persistence
and provider-required fields. Callback/expired links have actionable recovery and
safe return destinations; confirmation resend and the existing reset remain real
Auth-client paths, verified locally only with intercepted fictional responses.

Settings preserves real display-name editing and shared mock billing details. Its
new email change shows pending verification, password change is limited to email
identities, and OAuth-only accounts receive provider-managed guidance. New credential
changes are mocks. Deletion previews identity confirmation, remaining credits,
forfeiture and API-access termination, with explicit failure/cancel states; it never
deletes or signs out the real account. No mandatory onboarding or new login method.

Notifications expose low-balance enablement, threshold, current demo balance and
actual account email verification state; product updates default off. Documentation
updates are removed; essential account/security/payment messages are explained
separately. Successful mock preferences survive navigation within this account,
resetting on reload/sign-out. Alert preview assumptions and server deduplication/
rearm tests remain in DATA/B06/S12; browser controls never send or schedule mail.

## DECIDED - wide-screen layout refinement (2026-09-16)

Following review on a wide desktop, the dashboard fills all available width
beside the sidebar with modest outer padding. Its former 1700px page cap is
removed. Homepage and public catalogue use a centered, responsive container
(92% width, up to 1920px), replacing the narrow prototype caps. Mobile gutters
and readable limits on individual text blocks and settings forms remain.
Wide-screen checks at 2550px supplement desktop and mobile regression coverage.

Homepage follow-up: the owner accepted the dashboard width but rejected the
stretched homepage composition. The homepage's 1920px cap above is superseded
by 1520px, with a proportionally sized hero headline/artwork and balanced column
spacing. This keeps it wider than the original preview without pulling the
composition apart. Dashboard and public catalogue sizing are unchanged.

## DECIDED - homepage expansion (2026-09-16)

Owner approved expanding the content below the accepted hero: three illustrative
model cards, a live-component dashboard preview with fictional data, a simplified
three-step integration sequence, and a closing call to action. The hero and
1520px container remain unchanged. The preview reuses the usage chart and demo
fixtures; catalogue prices and availability remain explicitly unverified. No new
API, account or payment contracts are introduced.

The initial vertical float was too subtle in review. It is superseded by a
diagonal lift along the artwork's slope (16 SVG units right, 8 up), on staggered
4.5- and 5-second CSS cycles. Each plane's faces move together while the grid
and caption stay still. Motion is enabled only when the visitor has no
reduced-motion preference.

## DECIDED — search visibility and measurement (2026-09-18)

Owner: Samuel. See [ADR-004](decisions/ADR-004-seo-and-measurement.md) for the
decision and its reasoning. This records what exists and how to operate it; the
visual design is unchanged by this work.

### Indexing is opt-in

Search indexing is controlled by `VITE_SITE_INDEXABLE` and defaults to **false**.
While it is false, every route emits `noindex, nofollow`, `robots.txt` disallows
everything, the sitemap is empty, and no structured data is emitted. This is
deliberate: the site publishes fictional prices and serves no live service, and
the "unverified" labels on those prices do not appear in a search snippet.

**Do not enable it** until the deployment serves verified content on a confirmed
domain. Enabling it is a configuration change, not a code change.

### Route metadata registry

`frontend/src/seo/routes.ts` is the single source of truth for per-route titles,
descriptions, robots directives and sitemap entries. Every addressable route
belongs in it.

- Adding a public page means adding an entry. A route with no entry falls back to
  non-indexable — safe, but invisible to search.
- Account and dashboard routes are marked `indexable: false` permanently,
  independent of the deployment flag.
- `robots.txt` and `sitemap.xml` are generated from this registry at build time
  by a plugin in `vite.config.ts`, so the crawl surface cannot drift from the
  routes the app actually serves.

Metadata is applied per navigation in `src/seo/head.ts`, because this is a
single-page app: titles, descriptions, canonicals and Open Graph tags must be
rewritten on route change. Canonical URLs are built from the registered path, so
tracking parameters never fragment a page's ranking signals.

### Content topics have their own URLs

Documentation, support, status, contact, privacy and terms previously shared one
URL behind a `?topic=` parameter. Crawlers canonicalise such parameters away, so
only one of the six could ever rank. Each now resolves at its own path
(`/docs`, `/support`, `/status`, `/contact`, `/privacy`, `/terms`). The
`?topic=` form still resolves for existing links. A permanent host-level redirect
for those legacy query URLs must use the selected host's query-redirect format
after OD-004; `_redirects` cannot express that portably.

### Structured data

`src/seo/structuredData.ts` emits Organization, WebSite and BreadcrumbList
JSON-LD on indexable public pages only.

**Do not add `Product` or `Offer` markup while prices are unverified.** Marking
up prices that are not real is a search and advertising policy violation, not a
shortcut to rich results. That markup belongs in the same change that publishes
verified pricing.

### Analytics and advertising

Analytics uses `VITE_GA_MEASUREMENT_ID`. When unset, no third-party script loads
and the consent banner does not appear. `VITE_ADS_CONVERSION_ID` is ignored for
the accepted organic-only launch; old advertising grants are normalized to denied.

The service targets EU customers, so tags may not load before consent. Consent
Mode v2 defaults (including `ad_user_data` and `ad_personalization`) are
established before any tag loads; the tag script is requested only after the
visitor accepts. Reject is presented at the same level as Accept, because a
reject path that is harder to reach than accept is not valid consent.

A Playwright test asserts that no request reaches a tracking host without
consent. Treat a failure there as a compliance problem, not a flaky test.

### Launch checklist

Before the first public deployment:

1. Confirm the production domain and set `VITE_SITE_ORIGIN` to it.
2. Replace the placeholder content on `/docs`, `/support`, `/privacy`, `/terms`,
   `/contact` and `/status` with real content. Metadata cannot compensate for a
   page that does not answer the query it ranks for.
3. Replace the fictional model catalogue with verified models and prices.
4. Set `VITE_SITE_INDEXABLE=true`, deploy, then fetch `/robots.txt` and
   `/sitemap.xml` from the live domain and confirm both are correct.
5. Verify the `_headers` and `_redirects` files are honoured by the chosen host
   (OD-004). If the host does not read them, translate the rules to its format.
6. Register the domain in Google Search Console and Bing Webmaster Tools, and
   submit the sitemap.
7. Only then configure the analytics tag ID. Advertising remains disabled.

### Follow-up fixes (2026-09-18)

Three defects found while reviewing the work above, all corrected:

- **Untranslated interface copy.** Three German strings shipped in an
  English-only interface on `lang="en"`: the Supabase-not-configured warning in
  `AuthShell`, `SUPABASE_CONFIG_ERROR` (surfaced across eight auth files) and the
  fallback in `getErrorMessage`. Two of them only appear on an error path, so a
  rendered-page check never sees them; the regression test therefore scans the
  built bundle as well as the rendered pages.
- **Consent banner covered the page footer.** The banner is `position: fixed`
  with nothing reserving its space. It now measures itself with a
  `ResizeObserver` and publishes `--consent-banner-height`, which the page uses
  as bottom padding — measured rather than a guessed constant, because the text
  wraps to different heights across viewport widths.
- **Soft 404s from the SPA fallback.** A catch-all `/* /index.html 200` rewrite
  serves every unknown URL as a success page. Crawlers treat that as a soft 404,
  may index the error page, and broken links stay invisible in crawl reports.
  `_redirects` is now generated from the route registry with one rule per known
  route, so unknown paths reach the host's 404 handling. It is emitted at build
  time alongside `robots.txt` and `sitemap.xml`, and cannot drift from the router.

### Historical rendering limitation — superseded locally by Stage 11

S01.5 follow-up (2026-09-20): [accepted ADR-005](decisions/ADR-005-public-build-time-prerendering.md)
records the frontend owner's Vite/React static rendering choice, alternatives,
compatibility probe and S11 acceptance criteria. Host-specific coordination remains
under B09/S13 and does not block Stage 1 completion. This design
did not change the client-rendered behavior described below. S11 now resolves
F-001 in local build artifacts; deployed validation remains B09/S13.

Before S11, the app was client-rendered. Google executes JavaScript, but other search engines
and most social scrapers read only the static `index.html`, which carries
homepage metadata and a restrictive robots directive. That historical limitation
is resolved locally by S11 below; no production deployment is inferred.

### Stage 11 discovery and measurement (2026-09-20)

The build now prerenders all 18 public reference/content routes with complete
metadata. Closed builds remain noindex; isolated indexable fixtures verify the
opt-in output without changing deployment settings. Private routes use a separate
empty noindex shell, and unknown routes receive a local preview 404. Public content
hydrates before URL filters, browser timestamps and stored consent are applied.
Existing auth and account demo state still persist across public navigation.

The organic funnel measures a consented, allowlisted initial public landing and
only a coarse direct/internal/external referral category. Trusted signup completion,
first confirmed credit purchase and first successful API request have a tested
consumer boundary; no live source or mock conversion is wired. These outcomes,
durable deduplication and identity/attribution contracts remain S12. Optional tags
and advertising stay disabled by default; privacy controls remain revisitable.

[ACQUISITION.md](ACQUISITION.md) records official crawler evidence, balanced image
and text topics, useful unsent distribution copy, and explicit preparation/owner
assumptions. No equivalent-price advantage, launch ownership, search registration,
training preference, publication, deployment or rankings are inferred. B09/B12/S13
retain host, accepted human ownership and release checks.

### Stage 4 billing frontend (2026-09-20)

The Billing page now uses the seven researched reference packages, USD-first review,
non-expiry and bonus breakdowns, and an asynchronous provider-neutral mock checkout.
Pending/unknown orders never imply credited funds and block duplicate checkout;
explicit demo controls cover confirmation, cancellation, uncaptured failure, captured
failure awaiting refund, and refund completion. This changes fictional state only.
History provides local timestamps, order details, safe support copy, status/support
links and separate receipt/invoice availability, failure and denial previews.
No authentic document is generated; explicit unavailable states are the S04 choice.

`BillingDetailsForm` is shared by Billing and Settings for optional personal/business,
name, company, address and VAT details. Saves retain failed edits and prevent duplicate
submission. The account-keyed `BillingDemoProvider` shares state across client-side
navigation; sign-out/account changes clear its in-memory data. Reload resets the demo
wallet/history/profile, retaining only an unresolved order identity in tab storage,
restored conservatively as unconfirmed. Storage failure is visible. No billing data
is sent to the live auth profile. See [BILLING](BILLING.md) for exact limits.

The purchase/session/document contract remains B03/S12; B11 still supplies any live
EUR estimate. Tests use fictional intercepted auth and prohibit unexpected external
traffic. Stage completion does not enable checkout or close production gates.

### Stage 5 usage frontend (2026-09-20)

Usage now reads a fictional metadata history through a cancellable demo read.
Today, 7-day, 30-day, six-calendar-month, all-time and inclusive custom local dates
compose with model, key, execution status and request-ID filters in the URL.
Selects/page changes push history; search typing replaces the current entry.
Malformed choices fall back safely; invalid custom dates require correction.
Historical model names and revoked key labels remain available. Ten-row pagination
only limits the visible table: totals, the spending chart and CSV use all matches.

Settled net credits are exact decimal sums of charges minus confirmed refunds,
attributed to request start day. Unknown/pending billing is counted separately,
never presented as confirmed zero. Execution outcomes do not imply billing outcomes.
Details show available duration, token/image counts, rate version, charge/refund
amounts and normalized safe errors. Unknown amounts/counts remain unavailable.
No automatic retry or generation action is offered for ambiguous requests.

CSV uses explicit metadata fields, UTC/local timestamps and timezone, milliseconds,
tokens, images and credits. It escapes quotes/newlines and neutralizes spreadsheet
formula prefixes including leading controls/whitespace. Export has progress,
failure and cancel previews; filter/navigation changes cancel the old snapshot.
Support copy uses an allowlist and fixed safe error descriptions, never raw error
messages, prompts, outputs, billing reasons or credentials. Help/docs/status links
reuse existing destinations; final public support content remains S08.

All-time means every record in the demo history. Backend history retention,
authorized pagination and complete server export remain B04/S12. Stage 9 Overview
now shares these request records and period aggregation with Usage.

### Stage 6 key frontend (2026-09-20)

API keys now demonstrate named creation with a visibly nonfunctional sample shown
only in the creation dialog, copy feedback and save-before-close guidance. Closing,
navigating away or reloading removes that sample; lists retain masked identifiers.
Active keys are the default, with revoked/all views, local creation/last-used times,
never-used metadata and links to all-time usage filtered by stable key ID. Historical
request labels remain independent of the key list. Lost-secret guidance is to create
a replacement, update the integration, then revoke the old key.

Creation/revocation previews offer asynchronous success, failure and pending states.
Closing a pending dialog or leaving the page cancels the mock mutation; failed edits
remain available. Revocation requires confirmation explaining integration impact.
The account-scoped in-memory list survives client navigation but resets on reload,
sign-out or account change. No credentials are issued and no key state is persisted.
Production URL/quickstart details remain unavailable until verified under B05/B08/S12;
the UI links to the existing documentation status instead of inventing an endpoint.

Usage filter options also include session key metadata before the first request;
historical request names take precedence where records already exist. Revoking a
key does not remove its filter or historical records.

## Stage 8 implementation (2026-09-20)

The public Status page now shows overall/source state, affected services/models and
incident impact/start/update/resolution timelines. All incident examples are visibly
fictional; default source is unconnected. Stale and loading states never establish
health or recovery. Dated catalogue maintenance notices remain separate. Dashboard
notices and affected model cards consume the same status preview and link to it.

Updates has a newest-first sample archive and addressable details. Every sample route
is noindex; incidents remain distinct from announcements. Stage 9 Overview now reuses
these announcements. Support links common topics, docs/status and authenticated request/order
investigation, with safe context guidance and no form or invented contact address.

Contact/Terms/Privacy now have dated, anchored review sections and shared footer links.
They restate only accepted product rules and known implementation boundaries; legal
publication, real contact information/response expectations and source/publisher owners
remain B07/B08. `/docs` remains an explicit preparation boundary. The separately
requested documentation brief was approved by the owner on 2026-09-20, closing S08.5.
The accepted scope is quickstart (account ? credits ? key ? first API request), API-key
authentication, model IDs/capabilities, image and text request guides, errors/conditional
refunds, and usage/billing basics. Working examples await the verified API contract;
the chatbot stays post-MVP. Extra tutorials/recipes remain excluded. This approves
the content brief, not a claim that detailed docs are implemented or Stage 9 started.

Privacy includes revisitable analytics preferences; shared consent notifications keep
them synchronized with the initial banner. The latest decision applies to the current
page even when localStorage cannot persist it, with explicit session-only feedback.
Advertising remains outside the accepted organic acquisition scope. Source/publisher,
contact/legal publication and verified documentation examples remain content gates; fixture
verification does not close them.

### Stage 9 Overview (2026-09-20)

Overview retains the balance-first layout and shares Billing's session wallet and
Usage's request records. Its URL-backed 7/30-day period drives totals and both chart
metrics using local calendar days. Settled credits exclude unknown/pending billing;
execution counts remain separate. The five latest requests come from all recorded
history, retaining historical model/key labels and the shared metadata dialog.
New-history previews show purchase, key and quickstart links instead of an empty chart.
Announcements reuse the public archive; the existing shared incident notice remains.

Savings consume a supplied mock summary, independent of the chart period. The view
shows comparison coverage and separately qualifies incomplete historical coverage
with its start date. Basis, revision, summary time and exclusion reasons are available
beside the result. These fictional comparisons do not enable current catalogue
comparisons or prove real customer savings. Server aggregation, complete history,
settlement revisions and owned reads remain B02/B04/S12.

Refresh is abortable and can supersede a pending mock read. Failed refresh preserves
the previous snapshot and timestamp with an explicit stale-data message. An unavailable
wallet displays unavailable while usage remains readable; a missing savings source
does not erase usage or balance. No browser action changes real credits or calls a
management API. The no-history preview retains the shared wallet: it represents an
account with no requests, not a claim that a new user receives free credits.

### Landing pricing emphasis, 2026-09-21

Owner requested stronger visual emphasis after card review. Every tariff now has
explicit Our price and Official API labels; larger prices, bordered official-rate
panels and larger emerald badges improve scanning. Image cards show pricing
dependence and official links while the numerical comparison remains unverified.

All four landing cards now show numeric official references. GPT Image 2 uses
1024-square Medium output (approx $0.05), Nano Banana Pro 1K/2K output
(approx $0.13; $0.24 at 4K); short labels disclose settings and extra input costs.
Official image estimates remain separate from verified equivalent savings.

### Catalogue-wide comparison correction (2026-09-21)

ModelPrices now renders both homepage and all 29 catalogue cards, including
family pages and dashboard catalogue. Named published image/preview examples
and exact-ID text references provide numerical differences for 28 variants;
the Gemini 3 Pro alias has no verified current official comparison. Image badges are explicitly
vs an example at stated output settings, not verified realized savings. Higher
example costs are visible. Unknown integration IDs and cache detail stay in the
dialog, not primary cards. Source links and settings accompany each component.
This supersedes the earlier homepage-only display described above.

Catalogue availability labels use availability-warning rather than the generic notice panel class. A single compact label includes the dated notice link; sample incident messages remain separate.

H-038 supersedes the inline notice placement: availability and sample incident notices belong in the card footer, keeping headings, resolutions and prices aligned across variants.

H-039: shared image comparison controls select listed resolution and GPT quality on homepage, catalogue, family pages and details. Percentage labels name settings; uncertain bare2.5/Lite/fast mappings omit percentage claims. Controls do not change request tariffs or generation settings.


H-040 (2026-09-21) supersedes selectable image comparisons: owner wants static cards with resolution/quality as context only. Removed all per-image selectors from shared display. Only positive computed differences receive savings badges; zero/higher/unknown references retain numbers without a discount badge or struck-through official price. Reference defaults remain first listed resolution and Medium; no favorable baseline or package selected to force a saving.

Public recharge API rechecked: USD5 buys333000 credits; USD150 buys19980000 including100% bonus. Base66600 credits/USD remains the current customer-facing conversion. Bulk133200 credits/USD is an acquisition-cost scenario, not an approved customer tariff. The directory CNY display is Chinese yuan, not Japanese yen; converting both sides to EUR cannot change a percentage. Uniform savings for every variant are not established.


## H-043 - 2026-09-21: approved static up-to savings

**DECIDED and implemented in frontend preview:** display Save up to X% using the approved acquisition package plus20% markup. Selling USD=model credits/111,000, calculated exactly. Shared home/catalogue/family/detail price displays and detailed rate amounts use this selling basis. Existing research conversion and backend financial logic remain unchanged.

For images, choose the largest official output cost among the same variant's listed comparison presets (1K square,2K square,4K UHD; supported quality levels). This maximizes percentage saving at the flat listed request tariff; the matching official amount and exact settings are shown together. No selectable controls. Percentages round down and only positive differences receive badges. Uncertain bare2.5/Lite/fast mappings and missing Gemini3Pro reference remain excluded. These are published-price examples, not verified served settings or guaranteed total savings; input/thinking exclusions remain visible.

Sunburst maximum preset example:2K square Max official output0.42816 USD; proposed retail2400/111000=0.0216216... USD; conservatively94% saving. At1K Medium the same retail remains above the output-only reference, so the claim is explicitly up-to.


## H-044 - 2026-09-21: alias investigation and schema evidence

Re-read English/Chinese primary catalogues, July1 and September9/10 announcements, and raw OpenAPI markdown reached through https://qmy27nhsd9.apifox.cn/llms.txt. Web extraction hid schema fields; direct read-only fetch returned full YAML.

- Nano Banana Fast and Nano Banana2 Lite: July1 explicitly identifies both as gemini-3.1-flash-lite-image. Chinese primary directory https://grsai.ai/zh/dashboard/models corroborates it; English Fast description is stale. Google model page specifies1K only and pricing lists0.0336 USD output. Resolved A6 for published mapping/1K reference (not runtime routing), grouped both as Nano Banana2 Lite, enabled88% badge at approved440/111000 retail. Historical retired Nano Banana remains separate.
- Bare GPT Image2.5: primary directory and September9 announcement say1K but do not identify Sunburst/Flare. Subdomain https://zjdl.grsai.ai/dashboard/models says Sunburst, conflicting with primary evidence; insufficient to close A1. Raw https://qmy27nhsd9.apifox.cn/452409160e0.md and https://qmy27nhsd9.apifox.cn/512802278e0.md specify auto-only quality for basic2 and2.5. No fixed-quality savings claim for either until actual output/settings can be matched.
- GPT Image2 VIP: those same schemas restrict quality to medium. Corrected comparison presets accordingly; earlier broad announcement/options do not override explicit per-model schema.
- Gemini3 Pro: Chinese primary listing identifies3.0 family but no exact official served ID. Chat-completion and Gemini-native schemas don't resolve the mapping. May15 price-change announcement doesn't identify it either. Google deprecation page retires gemini-3-pro-preview; no current interchangeable baseline established. A8 remains open, owner upstream/API: obtain exact served identifier/current mapping.

Sources: https://grsai.com/dashboard/announcements ; https://grsai.ai/zh/dashboard/models ; https://qmy27nhsd9.apifox.cn/452409160e0.md ; https://qmy27nhsd9.apifox.cn/512802278e0.md ; https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image ; https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/deprecations .


### H-045 - 2026-09-21 - Conservative Auto-quality benchmark

Owner requested continuing the unresolved comparison work. Basic GPT Image2/2.5 use the shared1024-square Low output benchmark0.00588 USD instead of assuming High auto output. Selling600/111000=0.0054054... gives8% below that benchmark. Display explicitly says 8% below Low reference, not an unverified maximum savings promise; Auto output varies. Underlying bare2.5 routing remains open, but both official2.5 candidates have the same benchmark formula. This is not proof of equivalent total request cost. Gemini3Pro remains unresolved; no current version can be inferred from a retired official candidate.

### H-046 - 2026-09-21 - Basic GPT Image 2.5 presentation

Supersedes H-045 customer wording for basic GPT Image 2.5 only. Shared cards show the approved flat request price (approximately USD0.005), a One flat price badge, and an unstruck official 1024-square Low-High output reference range (approximately USD0.006-0.053). Automatic quality and excluded input costs remain short context. The range is the common Low-High comparison for both official 2.5 candidates, not the full Sunburst quality range or proof of served quality/identity. No maximum savings percentage is inferred from Auto. Other model comparisons remain unchanged.

Build/typecheck and 24 affected desktop/mobile tests passed; desktop screenshot confirms aligned card pricing and footer notices. No commit or push.

### H-047 - 2026-09-21 - Requested GPT Image 2.5 savings wording

Supersedes H-046 badge: shared basic GPT Image 2.5 cards now say Save up to 89%, calculated from exact selling price against the official 1K High output reference. Adjacent copy explicitly identifies that comparison and automatic quality; no confirmed High output equivalence is claimed. Official Low-High price range remains visible. Build/typecheck and 14 desktop/mobile pricing checks passed.

### H-048 - 2026-09-21 - Homepage visual refresh

Implemented the owner's approved visual direction: retain hero artwork, feature GPT Image 2.5, compact homepage prices, increase typography/section contrast, add original ascending request-flow/shared-wallet and request-cost animations, improve dashboard framing, replace sparse guides with illustrated links, strengthen CTA and merge repeated onboarding content. Motion respects reduced-motion settings. Pricing arithmetic and catalogue presentation unchanged; sources remain accessible through Pricing details. Gemini 3 Pro remains paused.

See [refresh scope and validation](superpowers/plans/2026-09-21-homepage-refresh.md). Frontend build/typecheck passed; 31 desktop/mobile checks passed, 13 existing skips. No commit, push or deployment.

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

Homepage preview refinement (H-056): the official-price label is screen-reader-only again, with the approximation symbol outside the numeric strike. The dashboard excerpt uses compact spacing and an abridged real request table (model/execution/billing on desktop; model/billing on phones) without horizontal overflow or added animations. Actual dashboard remains unchanged. Build/typecheck and 10 homepage browser checks passed; desktop/mobile screenshots reviewed.

H-057: Landing-page dashboard graph now uses seven varied days of explicitly fictional requests, aggregated by overviewSummary for matching chart, totals and recent rows. Preview plot proportions are 190px desktop / 160px mobile. Shared UsageChart request axes use whole-number ticks. Build/typecheck and 10 homepage tests passed; desktop/mobile screenshots reviewed.

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
