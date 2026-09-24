# Data

## Current status / ASSUMPTION

No schema, migrations, or database integration exists. Supabase/PostgreSQL is the
working direction, with Samuel the suggested primary owner. Supabase Auth,
database access, RLS, and limited internal storage responsibilities are provisional.

## Candidate concepts, not table definitions

- Users/profiles and account-owned API keys.
- Credit accounts and ledger entries.
- Generation requests and generation usage.
- Payments.
- Models and model pricing.
- Audit logs.

Image/video jobs may require state; `queued`, `processing`, `completed`, and
`failed` are examples, not a chosen state machine. No tables, columns, relationships,
SQL types, indexes, retention periods, or job infrastructure are specified yet.

## DECIDED — data requirements

Permanent schema changes require migrations and an update to this document.
Do not make undocumented manual production schema changes. Enforce account
ownership and authorization; do not assume RLS exists before it is designed.
Billing must remain auditable, integer-based, duplicate-safe, and safe under
concurrency; follow [BILLING.md](BILLING.md). Avoid unnecessary raw API key storage
and default prompt/output logging; follow [SECURITY.md](SECURITY.md).

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

## OPEN

[OD-002](OPEN_DECISIONS.md#od-002-database-structure) owns schema, migrations,
access approach, RLS, and transaction/concurrency strategy. Coordinate auth with
OD-001, accounting with OD-009, and key storage with OD-010. Retention is unresolved
for image delivery (OD-005) and logs/usage/audit data (OD-012).
The database owner should propose the concrete schema here before implementation
depends on it; conceptual names are not approved schema decisions.

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
