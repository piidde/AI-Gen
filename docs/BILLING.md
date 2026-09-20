# Billing and credits

No billing implementation exists. Billing is high-risk and needs extra review
and behavioral evidence beyond successful compilation.

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

See the [frontend review](FRONTEND_REVIEW.md) for related choices. These are
accepted policies, not implemented billing behavior. Credits never expire: this
is a firm decision, not a working assumption. Catalogue monetary prices and
official-price comparisons use the standard dollar-to-credit conversion, without
purchase-bonus adjustments or a package selector. Purchase bonuses are presented in Buy credits only;
the actual numeric conversion and comparable official rates still need verification.

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
