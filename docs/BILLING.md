# Billing and credits

The database schema and billing code exist, but have not yet been executed against
Supabase or tested against live Stripe/GrsAI accounts. Purchases and generations
remain disabled until an operator configures verified prices, provider budgets,
and purchase offers.

## Credit and price units

Credits are a shared USD-value balance stored as signed PostgreSQL `bigint`
micro-units: 1,000,000 units equal USD 1. The browser receives exact integer
strings alongside display values; it does not calculate charges. EUR and USD
Checkout offers each state an exact integer amount and exact credit quantity.
There is no automatic FX feed or implicit conversion. Offer configuration and
conversion assumptions must be reviewed and versioned by an operator.

Model cost records are versioned. Text cost uses provider input/output micro-cost
per million tokens and a bounded `max_tokens`; image/video cost uses a configured
per-unit value and a maximum count/duration. Customer price is provider cost times
the selected model markup or global markup, rounded up to one micro-unit. A
request keeps its price version and markup snapshot if configuration changes
while it is running. Missing costs, limits, markup, usage, or provider budget fail
closed.

## Generation accounting

`tw_reserve_generation` locks the account and provider group in one transaction,
checks model bounds, account balance, per-account concurrency (default 3), and
provider-group budget, then reserves both customer credits and provider spend.
The append-only credit ledger records reserve, settle, release, purchase, refund,
dispute, and administrative adjustment entries. Successful responses settle only
against verifiable provider usage and cannot exceed the reservation. Unused
reserved credits return to the account.

Media requires an `Idempotency-Key`; chat accepts one and recommends it. Request
fingerprints are HMAC-SHA-256 so prompt fingerprints cannot be used as a plain
offline guessing oracle. Same key/same request returns the existing operation;
same key/different request returns 409. Mappings expire after 30 days. A request
that may have reached GrsAI is never automatically resubmitted. It becomes
`unknown`; after 24 hours, the customer's reservation is released and the
reserved provider maximum is booked against the provider-group risk budget.

## Stripe Checkout

Checkout quotes snapshot account, offer, currency, minor-unit amount, credits,
price version, and an idempotency key before a session is created. Retries reuse
the same Stripe idempotency key/session. Only a signature-verified Stripe webhook
with matching quote/session/payment intent, amount, currency, and confirmed payment
can grant credits. Stripe event IDs and ledger keys prevent duplicate fulfillment.
Refunds create proportional credit reversals; disputes reverse remaining purchased
credits and suspend the account. Underfunded accounts stay suspended until
reviewed.

Stripe may deliver distinct events in either order. A signed refund or dispute
event is linked through the PaymentIntent's Takewing quote metadata; the database
locks that quote, records its purchase once if Checkout fulfillment has not run,
then applies the reversal in the same transaction. Event IDs are serialized and
deduplicated before financial changes, so a retried webhook cannot apply a second
credit movement. Older cumulative refund snapshots are recorded as stale without
reversing a newer refund. A won dispute can restore the reversed purchase credits,
while account access remains suspended for manual review.

Offers start empty and inactive. Exact credit packs, margins, EUR/USD conversion,
Stripe fee treatment, refunds/chargeback terms, tax, invoicing, and the required
financial-record retention period remain launch decisions. The markup is not
profit: operating, payment, FX, and provider-loss costs must be accounted for.

## Before money is accepted

Apply and execute the migration locally, test concurrency and duplicate event
behavior, use Stripe test mode/CLI, reconcile quote and webhook paths, and verify
all provider usage/pricing bounds. Configure production secrets and alerts,
customer terms, tax/invoicing, refund policy, resale rights, and an explicit
provider risk budget before activating a model or offer. See
[OD-003](OPEN_DECISIONS.md#od-003-payment-architecture),
[OD-009](OPEN_DECISIONS.md#od-009-internal-credit-unit-and-accounting), and
[OD-014](OPEN_DECISIONS.md#od-014-pricing-and-introductory-discounts).
