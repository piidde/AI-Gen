# Billing and credits

No server billing implementation exists. Billing is high-risk and needs extra review
and behavioral evidence beyond successful compilation.

S02.1's [model evidence register](MODEL_PRICING.md) records identity and unit
gaps that constrain pricing research. In particular, upstream per-request image
charges are not automatically per-image charges, official token prices are not
flat image prices, and CL/VIP policy-refund sources conflict (A7). Preserve the
accepted cost-dependent refund policy below; upstream badges do not establish
settlement evidence. S02.2 now records 29 model tariffs, all seven USD packages,
and official Standard references with explicit comparison exclusions. Package
arithmetic confirms 66,600 reference credits/USD; this is the fixed catalogue
research basis, not a chosen ledger denomination or approved production margin.
S02.3 adds typed reference content and exact display-only calculations. The
frontend owner accepted S02.4/S02.5 on 2026-09-20; see [the Stage 2 review](STAGE2_REVIEW.md)
for the historical savings contract and all variant dispositions. Backend/billing
validation is deferred to S12. No server accounting has been added.

## DECIDED — safety requirements

- Use pay-as-you-go prepaid credits and trusted server-side pricing, including
  discounts. Frontend prices, balances, payment success, and final charges are untrusted.
- Use integer denominations with sufficient precision; ordinary JavaScript
  floating-point balance arithmetic is prohibited. Exact units/representation remain OPEN.
- Keep accounting auditable. Prefer a ledger over a mutable balance-only design;
  if a cached balance is needed, the ledger remains the auditable record. Exact schema is OPEN.
- Prevent concurrent requests from spending the same remaining credit. A potentially
  billable request needs a way to prevent spending beyond available credit.
- Protect against repeated generations, charges, and payment credits through
  deliberate idempotency where practical. Never silently retry ambiguous billable
  upstream operations: a timeout does not prove that generation failed.
- Grant purchased credit only from trusted server-side payment confirmation such
  as a verified webhook. Repeated webhook delivery must not duplicate credit.
- Free usage, if adopted, must have a hard maximum financial exposure.

## DECIDED — customer-facing policies (2026-09-20)

- Purchase bonuses add wallet credits; they do not reduce a model's credit rate.
  A 600-credit request remains 600 credits regardless of the purchased package.
- The frontend catalogue will use current GRSAI prices and verified official API
  comparisons, researched before section implementation instead of fictional
  prices. Record sources, dates and comparable billing units/options. This does
  not verify commercial margin or implement backend prices.
- Takewing prices must never exceed the equivalent official price (owner
  correction, 2026-09-20). Negative comparisons are pricing/evidence errors, not
  a normal higher-price offer. Do not silently clamp or hide them; affected savings
  are unavailable until reconciled. S12 must validate equivalent settings and
  enforce the ceiling before publishing production prices. Unknown comparisons
  do not prove compliance; exact enforcement and margin remain backend work.
- All-time savings follow the accepted Stage 2 contract: completed, finally settled,
  fully comparable requests only; failed and fully/partially refunded requests are
  excluded with coverage disclosure. Preserve historical rates and audit later
  settlement corrections. Purchase bonuses do not change the comparison basis.
- USD accounting and checkout; optional EUR equivalents are approximate displays.
- Unsuccessful credit purchases must not leave captured money without purchased
  credits. Return captured funds if the purchase cannot be completed. Uncaptured
  payments need no cash refund; provider reconciliation remains to be designed.
- For failed requests, restore charged credits only when the request incurred no
  upstream cost. Billed generations rejected for content-policy reasons remain
  chargeable. An error or timeout alone does not prove zero upstream cost; pending
  reconciliation must not be presented as a confirmed refund or final charge.
  Upstream charge evidence and settlement mechanisms remain OPEN under OD-009.
- Account deletion forfeits unused credits without refund. The deletion UI must
  communicate this consequence before confirmation.
- Low-balance emails use a customer-entered absolute credit threshold.

S07 now presents these deletion/alert policies in mock Settings controls. Deletion
shows the current shared demo wallet before confirmation and changes no real
account or credit balance. Alert evaluation uses exact display amounts only;
backend delivery, pending-operation reconciliation and retention remain B06/S12.

See the [frontend review](FRONTEND_REVIEW.md) for related choices. These are
accepted policies, not implemented billing behavior. Credits never expire: this
is a firm decision, not a working assumption. Catalogue monetary prices and
official-price comparisons use the standard dollar-to-credit conversion, without
purchase-bonus adjustments or a package selector. Purchase bonuses are presented in Buy credits only;
the numeric reference is now verified as 66,600 credits/USD; equivalent settings,
production price approval and publication-time rate rechecks remain required.

## Proposed flow, not a finalized algorithm

Authenticate and validate; estimate maximum cost; reserve credit; call upstream;
determine actual usage; settle the actual charge; release unused reservation.
The transaction/concurrency strategy, reservation lifecycle, recovery from ambiguous
outcomes, idempotency scope, and settlement rules remain OPEN. Do not assume an
unverified upstream retry or idempotency guarantee.

## ASSUMPTION / OPEN

Payment providers remain undecided; operator privacy is a selection priority.
Stripe was the initial candidate, not a selected payment architecture.
[OD-003](OPEN_DECISIONS.md#od-003-payment-architecture) covers purchase flow,
webhooks, packages, currencies, refunds, alternatives, and anonymous payment feasibility.
[OD-009](OPEN_DECISIONS.md#od-009-internal-credit-unit-and-accounting) covers units,
precision, ledger rules, reservations, concurrency, settlement, refunds/adjustments,
idempotency, and uncertain upstream outcomes, coordinated with database OD-002.
[OD-014](OPEN_DECISIONS.md#od-014-pricing-and-introductory-discounts) covers prices,
margins, packages, and introductory discount mechanics; no rates are set.
Free-usage terms are OD-006 and financial limits/stop controls are OD-011.

Test risk-bearing behavior when implemented: concurrent spend, repeated customer
requests/webhooks, reservation settlement/release, trusted pricing, refunds,
audited adjustments, and timeout ambiguity. A manual test balance for the first
controlled vertical slice is not production accounting or an unlimited free offer.

### Stage 3 display implementation

The reference catalogue now shows fixed monetary rates before credits, including
explicit token/request units and dated official candidates. It uses no package
selector. Unknown/mismatched equivalents withhold savings; D-011 violations return
an error before rounding, not a negative offer or silently clamped zero. Both normal
and tiny negative cases have regression coverage. USD remains visible when EUR has
no fresh supplied estimate. These are display-only reference calculations;
server-authoritative offers, ceiling enforcement and settlement remain B02/S12.
See [MODEL_PRICING.md](MODEL_PRICING.md) for sources and limits.

### Stage 4 mock purchase and history implementation

Billing consumes all seven dated reference packages from `content/catalogue.ts`.
Cards show exact USD amounts, base/bonus/total credits and non-expiry; selected
package review repeats the USD total before demo checkout. EUR selection uses the
shared unavailable-estimate fallback until B11 supplies a fresh quote. These are
reference previews, not published offers; B02 revalidation is still required.

`data/billingDemo.ts` owns fictional orders and wallet transitions. Creation is
pending and duplicate starts return the existing unresolved order. Only an explicit,
labelled simulated provider response can add demo credits, using integer arithmetic;
terminal confirmations are idempotent. No return URL, stored amount or browser
redirect confirms payment. Failed-before-capture and cancelled cases add no credits;
captured/unfulfilled cases remain refund-pending until simulated refund confirmation.
Uncertain or refund-pending orders block another checkout and direct users to status
and support. This is UI evidence, not the eventual server settlement algorithm.

The authenticated demo session shares optional billing details between Billing and
Settings, without sending them to Supabase or a provider. Profile and wallet/history
stay in memory and reset on reload/sign-out. An account-scoped sessionStorage marker
retains only an unresolved demo order's ID, package and creation time in the tab.
Reload restores it as unconfirmed and rebuilds amounts from the reference package;
it deliberately cannot preserve or establish any claimed payment/refund outcome.
Storage failure has an explicit warning. No address, VAT ID or billing name is stored.

History and order details show IDs, local labelled timestamps, USD amounts, credits
received and status. Receipt/invoice requests expose pending/unavailable, simulated
failure and access-denied states. No file, authentic document, live charge or real
refund is generated. Safe support copy contains order metadata only. B03/S12 owns
provider selection, required checkout fields, trusted confirmation, documents and
refunds; all signup/billing profile fields remain optional in this stage.

### Stage 5 request investigation display

Usage presents execution and billing independently, including failed-but-charged,
confirmed refund and unconfirmed outcomes. Exact display totals subtract confirmed
refunds and exclude unsettled amounts with visible coverage; this is not a ledger or
settlement implementation. Refunds are attributed to the original request date in
this frontend view. Safe request guidance never automatically retries ambiguous
billable work. S12 must validate amounts, historical rate versions and settlement
against the authoritative backend; mock fixtures prove only frontend behavior.

### Stage 8 public policy summaries

The Terms review page restates accepted non-expiry, fixed model rates independent of
package bonuses, USD accounting, conditional request refunds, captured-funds return
for failed unfulfilled purchases and account-deletion credit forfeiture. It explicitly
is not published legal terms. No new payment/refund guarantee, provider decision or
contractual wording was approved by implementing this review surface. Operator-supplied
legal text and actual payment procedures remain B08/B03 launch gates.

### Stage 9 savings display

Overview shows fictional historical official-price comparisons from the same request
fixture as Usage. Only completed, charged, positive and fully comparable records
qualify. Failed (including charged policy failures), fully/partly refunded, free,
unsettled and non-comparable requests have mutually exclusive exclusion counts.
The supplied summary preserves historical rate/conversion evidence and revision;
period changes and purchase bonuses do not alter it. Partial historical coverage
shows a start date and a qualified heading instead of an unqualified all-time claim.

A negative comparison withholds the entire savings claim. Exact rational arithmetic
is retained until display rounding; the fractional legacy fixtures produce rounded
mock USD transport values as disclosed in DATA.md. This is display-only mock evidence,
not server billing or an amendment to the accepted exact production contract in
STAGE2_REVIEW.md. Server aggregation, equivalent metering/options, money precision,
price ceiling, ownership and audited settlement revisions still require B02/S12.


## 2026-09-21: upstream purchasing basis confirmed

**DECIDED (owner):** always use the GrsAI USD150 package for upstream acquisition. The currently verified package includes19,980,000 total credits, giving133,200 credits/USD. Acquisition cost is model credits /133,200 USD, half the base-package reference cost. This supersedes treating the bulk package as merely hypothetical. Recheck package terms if they change.

**OPEN (product/billing owners):** customer selling prices and margin. Package choice alone does not authorize replacing customer prices with acquisition cost. The existing66,600-credit reference remains unchanged until selling prices are agreed. Any future savings claim must use the actual selling price and matching official settings.


## 2026-09-21: provisional selling-price markup

**DECIDED (owner, for now):**20% markup above acquisition cost using the USD150 package. Formula: model credits /133,200 *1.20 USD (equivalently credits /111,000 USD). This is markup, not20% gross margin; gross margin before fees and other costs is1/6. Supersedes the open markup choice in the preceding package decision. Implementation and production enforcement remain pending.

This does not establish universal savings: Sunburst2400 credits gives acquisition0.018018... USD and proposed retail0.0216216... USD, above the official1024-square Medium output example0.01317 and below the4K High output example0.10008. Comparisons must retain explicit settings and exclusions; no blanket positive percentage is authorized by this commercial choice.


## H-043 - 2026-09-21: approved static up-to savings

**DECIDED and implemented in frontend preview:** display Save up to X% using the approved acquisition package plus20% markup. Selling USD=model credits/111,000, calculated exactly. Shared home/catalogue/family/detail price displays and detailed rate amounts use this selling basis. Existing research conversion and backend financial logic remain unchanged.

For images, choose the largest official output cost among the same variant's listed comparison presets (1K square,2K square,4K UHD; supported quality levels). This maximizes percentage saving at the flat listed request tariff; the matching official amount and exact settings are shown together. No selectable controls. Percentages round down and only positive differences receive badges. Uncertain bare2.5/Lite/fast mappings and missing Gemini3Pro reference remain excluded. These are published-price examples, not verified served settings or guaranteed total savings; input/thinking exclusions remain visible.

Sunburst maximum preset example:2K square Max official output0.42816 USD; proposed retail2400/111000=0.0216216... USD; conservatively94% saving. At1K Medium the same retail remains above the output-only reference, so the claim is explicitly up-to.
