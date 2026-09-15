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

## OPEN

[OD-002](OPEN_DECISIONS.md#od-002-database-structure) owns schema, migrations,
access approach, RLS, and transaction/concurrency strategy. Coordinate auth with
OD-001, accounting with OD-009, and key storage with OD-010. Retention is unresolved
for image delivery (OD-005) and logs/usage/audit data (OD-012).
The database owner should propose the concrete schema here before implementation
depends on it; conceptual names are not approved schema decisions.
