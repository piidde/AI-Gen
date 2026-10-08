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
- `account_preferences` (migration `20261008120000_dashboard_live.sql`) stores the
  low-balance switch, integer-micro threshold, product-updates flag and alert
  arming state; `billing_profiles` stores optional billing details;
  `service_incidents` stores published incidents with a timeline.
- `model_prices.official_*` columns hold operator-entered official list prices used
  only for the savings comparison; they never affect charges.

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

## Frontend demo data

The dashboard no longer uses demo data (2026-10-08): `frontend/src/data/api.ts`
calls the Worker and `apiModels.ts` maps server DTOs into the view records below.
The only remaining fixture is the clearly labelled homepage illustration
(`homeDashboardDemo.ts`). The historical notes below describe the removed demo.

### Frontend view records (S01.2, 2026-09-20)

`frontend/src/data/viewModels.ts` defines frontend-only records for the catalogue,
rate evidence, wallet/packages/orders, requests, keys, account/preferences,
status/announcements and overview. These are not server DTOs or schema decisions.
Future live adapters must validate and translate the agreed backend contracts.

Amounts use exact unformatted decimal strings; dates use ISO 8601 instants with
explicit offsets. These aliases document representation, not runtime validation.
No accounting, currency conversion or settlement is implemented by the types.
Credit precision/denomination stays OPEN. Period ends are exclusive. Null means
unknown/unavailable for amounts, timing and usage; optional billing-profile fields
use null for unset. Key last-use explicitly distinguishes never used from unknown.

Request outcome and billing outcome are independent: an unknown charge has no
fabricated amount, and a failed request does not imply a refund. Historical model
and key names and rate versions survive retirement. Key list records have no
secret field; requests contain only safe metadata, never prompts or output.
Documents carry an availability state and identifier, not fabricated download URLs.

`frontend/src/data/demoSnapshot.ts` supplies explicitly fictional typed examples,
with unverified rates, unknown service health, unavailable savings, product updates
off and USD purchases. It is separate from the legacy display fixtures still used
by existing pages. S01.3 and feature stages migrate consumers incrementally; this
addition does not establish a live service, supported model, price or offer.

`createDemoClient()` creates isolated in-memory demo state. Its asynchronous read
and preference-save operations support success, loading, empty, error and uncertain
previews, with AbortSignal cancellation. Callers must abort pending work on unmount
or scenario changes. Loading deliberately remains pending until cancelled. Returned
records and submitted preferences are copied to prevent mutation outside the client.
Only successful demo saves change its state; uncertain previews are not retries or
evidence of a production outcome. No network or persistent storage is involved.
The client is not yet wired into pages; feature-specific mutations arrive with
their owning stages. Live Supabase authentication remains separate.

### Stage 4 billing session

The billing consumer now uses `billingDemo.ts` with researched reference packages
and explicit fictional order records. Shared optional billing profile data remains
in memory; it is never persisted to auth metadata or a database. Order/support data
contains no billing addresses, prompts, secrets or provider payloads. Only an
account-scoped unresolved-order identity marker is kept in sessionStorage (ID,
package ID, absolute creation timestamp). It cannot authenticate payment or supply
amounts; reload reconstructs the reference amounts and always restores pending.
Terminal demo orders, wallet and profile reset on reload/sign-out. This is not a
production persistence, ownership or accounting mechanism; those remain S12.

### Stage 5 request metadata and export

`usageDemo.ts` supplies an explicitly fictional history with independent execution
and billing states, retained historical model/key labels, absolute timestamps and
nullable usage counts. Local calendar filters use exclusive-end instants, including
23/25-hour DST days. Exact decimal aggregation is display-only and changes no balance.
The spending chart groups matching requests by local start date; unsettled amounts
are excluded and separately counted. No storage, management API or schema is added.

CSV and support details have explicit field allowlists. Normalized error codes map
to fixed safe descriptions; raw messages and reasons never enter either output.
CSV blanks distinguish unavailable values from numeric zero; durations are ms,
counts are tokens/images and monetary consumption fields are credits. CSV includes
UTC, browser-local time and the IANA timezone; spreadsheet formulas are neutralized.
Live account ownership, metadata retention and full-history export are still B04/S12.

### Stage 6 key metadata

The API-key page uses the existing `ApiKey` view record for session-only demo data:
stable ID, name, masked identifier, status, created/last-used/revoked instants. Creation
samples are page-local and never enter these records. Revocation preserves records;
usage links use stable IDs and request history keeps its original labels. Reload or
account changes reset the fictional list. No schema/storage/retention decision is
implied; server key design and authorization remain OD-010/B05/S12.

### Stage 7 account preferences

`AccountDemoProvider` keeps optional product updates (default off), low-balance
enablement/positive integer threshold and pending mock email in account-keyed memory.
Successful saves survive client navigation, resetting on reload/sign-out/account
change. Drafts and sample passwords live in the relevant form; no new storage,
schema, auth metadata or endpoint is introduced. Signup billing samples reset on
departure; Settings and Billing reuse the same optional field component/session.

The pure `advanceAlert` preview models one initial alert below threshold, one per
downward crossing and rearm only strictly above threshold. Equality never alerts or
rearms. It compares exact decimals, not floating-point balances. **ASSUMPTION:**
threshold changes and disable/re-enable start a new evaluation; unchanged saves do
not; unverified email suppresses delivery without consuming an eligible alert.
These rules are documented for B06 review, not agreed production delivery behavior.
The browser saves preferences and explains the initial state; it never schedules
mail. S12 must test transactional deduplication, concurrent settlements, recovery,
threshold changes and delayed verification against the eventual server contract.

### Stage 8 status and content fixtures

`content/serviceStatus.ts` contains local sample incidents with stable IDs, affected
reference IDs, impact, absolute start/update/resolution times and timeline entries.
Source-unavailable, stale, loading, active and resolved previews are explicit URL
scenarios (`statusPreview`), not fetched operational state or proposed API DTOs.
Unrecognised scenarios are unavailable. Dated model notices come from the existing
catalogue; fictional incidents never overwrite its reference evidence.

The two sample announcements carry unique slugs, publication timestamps and sample
labels, sorted newest first. No account content enters these records, the public
pages or update metadata. Real source freshness, publishing authorization, ownership
and retention contracts remain B07/S12. No database or storage mechanism was added.

### Stage 9 historical savings fixture

`overviewDemo.ts` supplies a mock savings summary at read time, separate from table
pagination and current catalogue prices. It retains historical comparison versions,
coverage start/completeness, summary time, revision, basis version, total/compared/
excluded request counts and mutually exclusive exclusion reasons. Complete demo
history and incomplete-history previews are distinct. Missing comparisons never
produce a claim of zero savings; price-ceiling violations withhold the result.

The mock helper uses exact rational display arithmetic and sums before rounding.
Existing fractional usage credits divided by 66,600 can be repeating decimals, so
the mock's monetary transport fields are explicitly rounded to 12 decimal places
and carry `monetaryApproximate`; the main amount is displayed at six places. This
fixture limitation does not change the accepted exact production view contract.
S12 must agree money precision/representation and consume server-produced totals,
including audited settlement corrections, complete history and authorized ownership.
No browser ledger, database, storage or management API has been implemented.

### Stage 11 measurement data boundary

Public landing attribution contains an allowlisted route and a coarse referral
category only. It is kept in page memory until consent; no raw referrer/query or
pre-consent attribution record is persisted. A future confirmed-outcome reader
uses opaque IDs only to suppress accepted duplicates within its lifetime; those
IDs are not emitted to analytics. S12 must define trusted confirmation, account
scope, durable deduplication, event retention and consent/attribution behavior.
There is no new database schema or server event pipeline in this stage.
