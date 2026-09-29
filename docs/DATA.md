# Data and database access

## Current implementation

Supabase Auth owns customer identities. The migration
`supabase/migrations/20260929120000_takewing_backend.sql` creates a private
PostgreSQL schema for application controls, provider groups, catalogue/prices,
accounts, API keys, generation requests, credit ledger, Stripe offers/quotes and
events, and audit records. It seeds only the provider-listed catalogue; models,
provider acceptance, and offers remain disabled. The migration is not yet applied
or verified on a local database.

The browser never reads these tables. Supabase PostgREST exposes only explicit
`public.tw_*` security-definer RPCs to the Worker service role. RPC functions pin
their search path, validate state transitions, and own atomic balance/budget
changes. Revoke direct table access from `public`, `anon`, `authenticated`, and
`service_role`; do not add browser table grants. The Worker verifies Supabase
access tokens and passes the authenticated account ID to ownership-filtered RPCs.

## Important records and limits

- `accounts` stores available/reserved integer microcredits and suspension state.
- `api_keys` stores a prefix and SHA-256 digest, never the raw Takewing key.
- `generation_requests` snapshots model, price version, effective markup,
  provider group/key ID, usage, state, bounded reservation, and result expiry.
- `credit_ledger` records auditable balance movements with unique event keys.
- `model_prices` keeps verified cost inputs, limits, evidence note, and version.
- `stripe_quotes` binds an immutable purchase amount/credit quantity to one
  account, Stripe session, and PaymentIntent; `stripe_events` serializes and
  deduplicates webhook deliveries. A private transaction helper records a
  verified purchase before applying an earlier-arriving refund/dispute event.
- `audit_log` records privileged changes and their required reason.

Media inputs are AES-GCM encrypted before private R2 storage, with the key kept in
Worker secrets. Queue payloads carry request IDs only. Inputs are removed after
submission or by cleanup; result objects are private and expire after the
configured TTL (default two hours after successful storage). Expiry is checked in
PostgreSQL on every result/download read; the five-minute cleanup removes bytes
after access has already been denied.

Detailed request/financial metadata currently remains in PostgreSQL. The planned
90-day usage retention and separate legally required financial retention are not
implemented because a deletion rule must preserve ledger and reconciliation
evidence. Set the retention period and deletion/archive behavior before launch.
Do not log prompt, response, key, token, or complete media URL data.

## Migration workflow

Install Docker Desktop, then run `npx supabase start`, `npm run db:up`, and the
appropriate local checks. `npm run db:reset` rebuilds the local database from
migrations and seed. Review every migration before applying it to hosted projects;
deployment never applies schema changes automatically. Production schema edits
must always arrive through a reviewed migration.

See [billing](BILLING.md), [security](SECURITY.md), and
[OD-002](OPEN_DECISIONS.md#od-002-database-structure).
