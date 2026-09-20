# Frontend scope

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
`?topic=` form still resolves for existing links, and host-level 301 redirects
are configured in `frontend/public/_redirects`.

### Structured data

`src/seo/structuredData.ts` emits Organization, WebSite and BreadcrumbList
JSON-LD on indexable public pages only.

**Do not add `Product` or `Offer` markup while prices are unverified.** Marking
up prices that are not real is a search and advertising policy violation, not a
shortcut to rich results. That markup belongs in the same change that publishes
verified pricing.

### Analytics and advertising

Tag IDs are configuration (`VITE_GA_MEASUREMENT_ID`, `VITE_ADS_CONVERSION_ID`).
When unset, no third-party script loads and the consent banner does not appear,
so local and demo builds carry no tracking at all.

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
7. Only then configure analytics or advertising tag IDs.

### Known limitation

The app is client-rendered. Google executes JavaScript, but other search engines
and most social scrapers read only the static `index.html`, which carries
homepage metadata and a restrictive robots directive. If organic search becomes a
primary acquisition channel, evaluate pre-rendering the public routes. That is a
larger change and was deliberately not made here.
