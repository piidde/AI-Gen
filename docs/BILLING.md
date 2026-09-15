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

## Proposed flow, not a finalized algorithm

Authenticate and validate; estimate maximum cost; reserve credit; call upstream;
determine actual usage; settle the actual charge; release unused reservation.
The transaction/concurrency strategy, reservation lifecycle, recovery from ambiguous
outcomes, idempotency scope, and settlement rules remain OPEN. Do not assume an
unverified upstream retry or idempotency guarantee.

## ASSUMPTION / OPEN

Stripe is the primary payment candidate, not selected payment architecture.
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
