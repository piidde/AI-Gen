# Frontend review — 2026-09-20

This records the ongoing discussion, not an implementation plan or proof of
implementation. The API-only MVP boundary remains in force. Review individual
frontend areas before preparing the final implementation plan.

The review is now consolidated into the [Frontend Implementation Plan](superpowers/plans/2026-09-20-frontend-implementation-plan.md).
Use that plan for current progress, handoff, issues and implementation decisions;
this file preserves the scope-review history.

Continue this work on `docs/frontend-mvp-review`. Each area review should include
the recommended MVP and an additional "Additional stuff worth deciding" section:
relevant alternatives not recommended initially, with reasons, so the owner can
check omissions and deliberately include any that matter. These alternatives are
not accepted scope until reviewed.

"Sounds good" approves only the proposed MVP for the area under review. Additional
options remain excluded unless the owner selects them explicitly; do not ask for
separate rejection or treat a general approval as accepting the alternatives.

The owner reviewed the additional options for Models, Billing and Usage and
chose none for the MVP: cross-family comparison tool, favourites, cost calculator,
automatic top-ups, custom purchase amounts, redemption codes, separate spending
breakdowns by model/key, saved filters, scheduled reports, prompt/output previews
and request-failure emails. Existing agreed filters, variant comparison and CSV
export remain included. These exclusions can be revisited after MVP.

## Accepted direction

- **DECIDED:** retain most of GRSAI's catalogue as the starting direction. Nano
  Banana CL remains under review. This does not verify every model's upstream
  support. The final launch scope is image and text only; video is excluded.
- **DECIDED:** explain model/channel tradeoffs and suitable uses clearly, based on
  verified resolution, price, reliability and performance. VIP does not inherently
  mean higher resolution or longer waiting.
- **DECIDED:** reflect upstream unavailability. Remove retired models from the
  selectable catalogue while retaining historical records.
- **DECIDED:** show money first, credits second, and savings against comparable
  verified official API prices. Use the standard dollar-to-credit conversion
  consistently; purchase bonuses do not change displayed catalogue prices or
  savings. There is no package selector in the catalogue. Show purchase bonuses
  only in Buy credits. This supersedes the proposed package-dependent display.
- **DECIDED:** group related model variants by family, with side-by-side comparison
  and each variant's own price, explanation and copyable API model ID.
- **DECIDED:** replace fictional catalogue prices with researched current GRSAI
  prices and official API comparison prices. Research these before implementing
  the section, recording source/date and matching model, units and output options.
  Do not invent a savings figure where no comparable official price exists.
  Other frontend account/activity data can remain mocked. This establishes the
  frontend pricing reference, not proof of backend billing integration or margin.
- **DECIDED:** start with GRSAI's credit packages and purchase bonuses. Model rates
  remain fixed regardless of popularity/usage. Purchase bonuses increase wallet
  credits only: a 600-credit request stays 600 credits for every package. Our
  numeric model rates and margin are not established by this statement.
- **DECIDED:** USD accounting and checkout, with optional regional EUR estimates
  clearly labelled as approximate. Actual EUR payment support is deferred.
- **DECIDED:** keep credit purchasing and payment history together in Billing.
  Package cards show dollar price, base credits, bonus credits and total received.
  Review the selected package and total before checkout. Cover pending, successful,
  cancelled, failed and refunded states, including payment confirmation in progress.
  History shows date, order ID, amount, credits received and status, with order
  details and separate receipt/invoice downloads when available. Billing details
  are editable here and through settings. Redemption codes are deferred initially;
  reconsider if the eventual trial/promotion approach requires them.
- **DECIDED:** offer receipt/invoice downloads subject to payment integration,
  personal/business selection, and address/VAT fields at signup and in settings.
  These account-type and billing-detail fields are optional during signup;
  nothing additional is mandatory there. Checkout requirements remain dependent
  on the eventual payment integration.
- **DECIDED:** usage includes duration, applicable token breakdowns, full history,
  convenient date presets and export. Backend retention/export contracts remain
  to be agreed; this does not authorize indefinite prompt/output storage.
- **DECIDED:** keep usage reporting and request history together. Provide Today,
  7 days, 30 days, 6 months, All time and custom dates; model/key/status filters
  and request-ID search. Include period totals and a spending-over-time chart.
  Rows show time, model/variant, key name, request status, duration and charge.
  Details include applicable token counts, errors and distinct billing outcomes
  (charged, refunded, awaiting confirmation). CSV export covers all matching
  records, not only the current page. Keep prompt/output content out by default.
- **DECIDED:** basic API-key management, excluding advanced limits/scopes/expiry.
  Create named keys; show the full secret once with copy/save guidance, then only
  a masked identifier. List name, status, creation date and last use. Confirm
  revocation with its integration impact. Retain revoked keys for history while
  showing active keys by default. Link to usage filtered by key, a copyable API
  base URL and the quickstart. Replace/revoke lost keys. Renaming, temporary
  disable/reactivate and guided replacement were additional options, not approved.
- **DECIDED:** email/password changes and self-service account deletion. Deletion
  forfeits unused credits and does not trigger a refund; explain this consequence
  before the customer confirms deletion.
- **DECIDED:** account settings supports display-name/email editing with pending
  email-verification feedback, password changes for password-based accounts and
  provider-specific sign-in explanations for Google/Discord accounts. Optional
  personal/business and company/address/VAT fields share data with Billing.
  Preserve edits on save errors and show clear save/success/error states.
  Self-service deletion requires identity confirmation and explains lost credits
  and termination of API access. Keep notifications in their existing tab.
  MFA, session management, login-method linking/unlinking, avatar uploads and
  team/shared-billing accounts were additional options, not approved MVP scope.
- **DECIDED:** basic notifications and email low-balance alerts with a customer-
  entered absolute credit threshold. This supersedes percentage presets.
  Provide an enable toggle, current balance and verified account email. Send one
  alert on falling below the threshold, rearming after recovery above it; send
  one initial alert if enabled while already below. Avoid repeated low-balance
  emails while the balance remains low. Use one optional product-update toggle,
  off by default, for new models/significant features instead of separate
  documentation updates. Explain essential account/security/payment emails
  separately. Keep incidents visible in the dashboard. Separate alert addresses,
  multiple thresholds, repeated reminders, model incident email subscriptions and
  browser/Slack/webhook channels were additional options, not approved MVP scope.
- **DECIDED:** visible service/model status and the dashboard announcement element.
  Support channel and announcement publishing workflow remain open.
- **DECIDED:** a public status page shows overall health, affected models/services,
  active incidents and last-update time. Incident details explain customer impact,
  start time, updates and resolution. Active dashboard notices link to details;
  catalogue availability agrees with status information. Show status unavailable
  when information cannot be retrieved. Keep dated recent announcements with
  summaries/detail links on Overview and a chronological All updates archive.
  Distinguish incidents from ordinary product news. Publishing ownership and the
  status data source remain open; frontend states can be mocked. Announcement
  bells/unread counts, archive search/category filters, historical uptime charts,
  maintenance calendars and incident subscriptions were not approved MVP scope.
- **DECIDED:** easy, understandable documentation; detailed documentation scope is
  deferred. Final site copy can be reviewed separately.
- **DECIDED:** retain the Overview layout/design, prominent available credits,
  Add credits and billing-history shortcuts. Spending/request totals and the
  requests/credits chart share a selectable 7-day or 30-day period, including
  completed/failed counts. Show five recent requests with detail/history links,
  agreed incident notices and announcements. New accounts receive useful next
  steps (buy credits, create key, quickstart). Show last-update time and refresh;
  distinguish loading/error states from real zero balances/activity.
- **DECIDED:** include the explicitly selected all-time savings summary:
  "You've saved $X compared with official API pricing." Calculate from actual
  comparable usage and verified official rates, using the agreed fixed standard
  dollar-to-credit conversion without package-bonus adjustments. Preserve the
  historical comparison basis when prices change. Explain the basis and mark
  partial coverage if some models/requests have no verified comparable rate;
  do not invent savings for them. Backend calculation remains to be implemented.
  Estimated credit runway, top-model widgets, previous-period percentages and
  customizable widgets were additional options, not approved MVP scope.
- **DECIDED:** mock data for remaining frontend work while partners implement
  backend integration; reuse existing authentication work.
- **DECIDED:** homepage retains the approved design with clearer content: describe
  API access and pricing, offer Get started and Explore models & pricing actions,
  feature researched model prices/comparisons, explain prepaid credits/bonuses,
  retain the dashboard preview, explain signup-to-first-request steps and provide
  a copyable integration example once the API contract is verified. Include a
  concise FAQ and discoverable docs/support/status/legal links. Model-specific
  landing pages, an interactive savings calculator, testimonials/customer logos,
  a public roadmap and referrals were additional options, not approved scope.
- **DECIDED:** site-wide copy leads with the product's core differentiator:
  lower prices than the official API. Replace vague benefit language with precise
  explanations and verified monetary/percentage comparisons. Integration ease,
  usage visibility and other benefits support that message. Write original copy;
  Cheaper Inference is a clarity/positioning reference, not a source to copy or
  closely paraphrase. Exact savings claims must match verified comparable prices;
  do not imply every model/option is cheaper without evidence. Dashboard actions,
  errors and billing explanations remain task-focused rather than promotional.

## Signup, login and first use

- **DECIDED:** build on the partner's existing authentication work. Offer optional
  personal/business and billing details without blocking signup. Explain email
  confirmation and how to continue; provide recovery actions for expired/invalid
  verification and reset links. Return customers to their intended dashboard page
  after login. New accounts reach Overview with credit-purchase, key-creation and
  quickstart guidance. Do not promise trial credits before eligibility/anti-abuse
  decisions. Coordinate signup/settings ownership with the authentication partner.
- Mandatory onboarding wizards, company-size/use-case questions, interactive tours
  and passwordless email login were additional options, not approved MVP scope.

## Shared frontend behavior

- **DECIDED:** retain the dark English interface, consistent loading/empty/error/
  success/disabled states, preserved form input on errors, duplicate-submission
  prevention, labelled controls, visible keyboard focus and readable contrast.
  Give copy feedback; handle expired sessions and return to the intended page
  after sign-in. Clearly identify mocked activity while using researched prices.
- **DECIDED:** retain basic responsiveness using the existing layouts. Desktop is
  the primary API-management workflow; mobile should support balance, purchases,
  request inspection and other agreed account tasks without a separate mobile
  product. User acceptance is based on keeping the additional effort modest.
- **DECIDED:** replace the proposed UTC-only display with customer-local timestamps
  to avoid manual conversion. Detect the browser/device timezone,
  label it clearly and format stored absolute timestamps accordingly, including
  daylight-saving changes. This is distinct from locale/currency detection; no
  IP geolocation is needed. Preserve absolute times for accurate support lookup.
  A manual timezone selector has not been selected.
- Translations, global dashboard search, PWA/offline mode and custom keyboard
  shortcuts were additional options, not approved MVP scope. Standard keyboard
  operation means Tab navigation, Enter/Space activation and Escape for dialogs.

## Public contact and legal pages

- **DECIDED:** readable Contact, Terms and Privacy pages in the existing design,
  consistently linked from public pages and the dashboard. Coordinate contact
  information with the chosen support channel. Use clear headings, last-updated
  dates and section links. Keep billing explanations consistent with accepted
  credit/refund/deletion policies. Preserve optional-tracking consent controls
  and a way to revisit consent. Actual legal wording/business disclosures await
  settled business/payment/data arrangements and appropriate content review.
- Dedicated trust/security centres, public policy revision histories, downloadable
  PDFs and enterprise/compliance pages were additional options, not approved MVP
  scope.

## Support review and follow-up

- **DECIDED:** one Support page, linked from public pages and the dashboard,
  directs customers to getting-started, purchase, failed-request, key and account
  help plus service status. Show the actual support channel when selected, and
  explain useful context (request/order ID, approximate time, description), never
  API secrets. Failed-request/payment details link to help and allow copying the
  reference ID. Publish response-time expectations only when agreed.
- **OPEN:** the actual support contact channel. Contact forms, dashboard tickets,
  live chat, a community Discord and searchable help-centre functionality were
  additional options, not approved scope.
- **DECIDED:** defer an AI documentation/support chatbot until documentation is
  ready. It is a follow-up, not MVP scope or authorization to implement. The
  discussed starting concept answers from approved help content with source links,
  uncertainty/human-support fallback and usage limits. Account-aware access and
  actions were not approved.

## Stage 3 additions

- **DECIDED:** keep applicable model/date/status filters in the page URL so refresh,
  bookmarks and back navigation preserve the view. This does not add saved-filter
  management or share account data with another user; normal authorization applies.
- **DECIDED:** provide actionable request errors where the cause is known, such as
  adding credits, checking a model ID, correcting unsupported settings or opening
  a relevant guide. Do not recommend retrying an ambiguously billable request.
- **DECIDED:** extend reference-ID copying with Copy support details: request/order
  reference, timestamp with timezone, applicable model/status and safe error
  information. Exclude API secrets, prompts and generated output.
- Suggested replacement models for retirements, separate test/production key
  labels and a dedicated explanation of why prices are lower were additional
  options, not approved scope. Do not invent a commercial explanation.

The initial three discussion stages were reviewed. The owner subsequently reopened
discovery, SEO and GEO before plan consolidation: acquisition is a primary product
concern. Detailed documentation remains deferred. This decision record is not an
implementation plan and does not authorize product implementation.

## Discovery, SEO and GEO — review reopened

- **DECIDED:** review customer acquisition and search/AI discovery before writing
  the final frontend plan. Technical metadata alone does not settle this scope.
- **INVESTIGATION:** `frontend/index.html` contains an unconditional initial
  `noindex, nofollow`; opting into indexing relaxes metadata at runtime. Google's
  JavaScript SEO guidance warns initial noindex can prevent rendering. The current
  assumption that the launch configuration flag alone enables indexing must be
  revalidated against the served production HTML. Do not enable preview indexing.
- **DECIDED:** the proposed discovery MVP is accepted: prerender public marketing,
  model and documentation content with initial-HTML metadata; verify launch crawl
  access, links, redirects, social previews and mobile performance. Implementation
  mechanism remains to be chosen. Add a researched selection of useful model-family
  pricing pages and comparison/integration content. This supersedes deferring all
  model pages, not approval of repetitive pages for every model/keyword. Provide
  readable, sourced, dated comparison information for search and AI discovery.
  Measure landing-page to signup, purchase and first-successful-request conversion
  with appropriate consent and verified outcomes. Coordinate with Samuel, the
  existing SEO/measurement owner. Detailed documentation scope remains deferred.
- **DECIDED:** organic acquisition only initially, with useful external distribution
  and outreach. All partners expect to participate; task ownership and available
  time still need assignment. No paid-advertising budget or campaign is approved.
- **DECIDED:** add a quality public blog to the frontend/acquisition scope. Detailed
  presentation is now accepted: `/blog` summaries and simple topic filters;
  article pages with headings, author/reviewer, publication and meaningful update
  dates, readable tables/images, copyable code and sources. Longer articles get a
  table of contents. Link to relevant models/pricing/docs, related articles and
  contextual signup actions. Apply public-page prerendering/metadata standards.
  Focus on cost comparisons, verified integrations, cost-saving guides and
  first-hand tests with methodology/limitations; reuse verified pricing data where
  practical. Topic examples are not researched keyword commitments. This overrides
  blanket blog deferral, not approval of generic AI news or bulk-generated posts.
- **DECIDED:** publish blog articles through repository files; the team intends
  to use AI-assisted writing. No browser CMS is needed. Exact content file format
  is an implementation choice. Existing requirements for original useful content,
  verified pricing, tested integration examples and evidenced first-hand claims
  still apply to AI-assisted drafts. Comments, newsletter signup, blog search and
  multilingual articles remain excluded unless explicitly selected later.
- **DECIDED:** the launch offer covers image and text models, not video. Exact
  model/channel selection remains subject to the existing verification/review.
- **DECIDED:** focus equally on image and text acquisition at launch across the
  homepage, model pages, blog and outreach. This supersedes the image-first
  hypothesis and proposed two-image/one-text split. Prioritize individual topics
  by useful evidence and verified savings, then adjust using customer outcomes;
  equal focus is not a mandated article-count quota.
- **INVESTIGATION — initial research completed:** public provider usage and current
  advertised-price comparisons support testing image-first acquisition, but do
  not establish greater search demand or better economics than text. Google Trends
  returned HTTP 429; no defensible comparative keyword-volume data was obtained.
  Both modalities showed substantial advertised savings in a small Gemini sample;
  upstream model equivalence and realized margin are unverified. Image-model SEO
  already has direct competitors. Detailed dated evidence is saved externally in
  `2026-09-20-image-first-assessment.md` in the owner's research folder. An initial
  two-image/one-text content test was proposed and subsequently superseded by the
  equal image/text decision above.
- No rankings, AI citations or customer acquisition results are guaranteed by
  frontend changes. Ongoing content, price maintenance and outreach need ownership.

Primary guidance checked during this review:
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google generative AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

## Commercial policies still unresolved

- **OPEN:** payment providers/methods. Operator privacy is a selection priority;
  this discussion selects no provider.
- **OPEN:** trial/free usage is desired, but eligibility and anti-abuse rules need
  a decision before an unconditional offer is shown.
- **DECIDED:** credits never expire. The owner explicitly confirmed this as a firm
  policy, superseding the earlier tentative classification. Account deletion still
  forfeits unused credits under the separate accepted deletion policy.
- **DECIDED:** unsuccessful credit purchases must not leave the customer charged
  without the purchased credits; return captured funds where purchase completion
  fails. Restore request credits for failed requests only when no upstream cost
  was incurred. A billed generation rejected for content-policy reasons remains
  chargeable. See [BILLING.md](BILLING.md) for uncertainty boundaries.

Owners: product partners for commercial policies; frontend owner for presentation,
coordinating signup choices with the authentication owner.

## References

GRSAI and Cheaper Inference inform the review but do not define scope. Detailed
research/screenshots stay outside the repository. Cheaper Inference's variable
marketplace prices, seller flows, routing controls and generation playgrounds are
not accepted MVP scope. Competitor privacy/performance claims are not ours.
