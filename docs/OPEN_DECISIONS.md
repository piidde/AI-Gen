# Open decisions and investigations

All entries below remain unresolved. **OPEN** means no final choice;
**INVESTIGATION** means evidence is needed. **ASSUMPTION** permits provisional
work without making a choice permanent; **DECIDED** marks accepted direction,
not implemented functionality. Explicit decisions must update this register and
the owning guide, with an [ADR](decisions/README.md) for material architecture.

Owners from the bootstrap are retained; suggested owners are not exclusive or
confirmed assignments. Additional entries collect unresolved questions already
present elsewhere in the bootstrap. Work around them using stable boundaries or
documented assumptions; resolve blockers before dependent implementation.

## OD-001 Authentication

Status: **OPEN**. Suggested owner: Samuel. **ASSUMPTION:** Supabase Auth.

Choose auth platform, email/password vs magic links vs OAuth providers, session
handling, and RLS usage. See [SECURITY.md](SECURITY.md).

## OD-002 Database structure

Status: **OPEN**. Suggested owner: Samuel. **ASSUMPTION:** Supabase/PostgreSQL.

Define final schema, migration workflow, database access, RLS strategy, and
transaction/concurrency strategy for credits. Coordinate OD-001/009/010.
Candidate entities/job states in [DATA.md](DATA.md) are not schema commitments.

## OD-003 Payment architecture

Status: **OPEN**. Suggested owner: Mario. **ASSUMPTION:** Stripe is primary candidate.

Choose Checkout or another flow, webhook design, credit purchase packages,
currencies, refunds, alternative-provider need, and whether anonymous payment
methods are desirable/possible. Do not add alternatives only for flexibility.
See [BILLING.md](BILLING.md).

## OD-004 Deployment architecture

Status: **OPEN**. Suggested owners: Pippi + Imerian. **ASSUMPTION:** Cloudflare direction.

Compare Workers, Node.js server, VM, or hybrid. Determine API runtime, streaming
compatibility, background jobs, execution limits, image/video durations, deployment
workflow, scaling, secrets, and preview environments. Local Node.js setup does not
settle production runtime. See [ARCHITECTURE.md](ARCHITECTURE.md).

## OD-005 Object storage and image delivery

Status: **OPEN**. Suggested owners: Pippi + Imerian.
**DECIDED:** no permanent first-party image storage by default unless technically necessary.

Choose proxy/stream vs temporary upstream URLs vs temporary internal cache, retention,
and download behavior. Evaluate URL privacy, reliability, lifetime, and exposure.
User-connected R2/S3-compatible storage is a later possibility, outside MVP;
do not decide its implementation now. See [ARCHITECTURE.md](ARCHITECTURE.md).

## OD-006 Free usage

Status: **OPEN**. Owner: Team. No commitment to launch free credits.

Decide availability, amount, account requirements, abuse prevention, per-account
caps, and total financial exposure. **DECIDED:** any offer needs a hard maximum
financial exposure; unlimited free usage is prohibited. See [PRODUCT.md](PRODUCT.md).

## OD-007 Veo endpoint

Status: **INVESTIGATION**. Owner: unassigned; team member must be assigned.

Test the apparent upstream endpoint; verify supported parameters, response format,
cost, and reliability, including its absence from the model list. Do not advertise
support before verification. No credentials or endpoint evidence were provided
for this bootstrap. See [API.md](API.md).

## OD-008 API contract

Status: **OPEN**. Owner: initial API implementer, reviewed by team (person not assigned).

Define exact routes/payloads, error format, streaming transport/format, compatibility
goals, request IDs, idempotency, pagination, and versioning. Verify upstream streaming
capabilities and deployment compatibility before committing to transport.
Routes in [API.md](API.md) remain proposals.

## OD-009 Internal credit unit and accounting

Status: **OPEN**. Owners: database/billing owners (specific billing owner unconfirmed).

Decide denomination, integer precision/representation, ledger rules/schema,
reservation model, concurrency, settlement/release, refunds/adjustments,
idempotency, and treatment of ambiguous upstream outcomes. Coordinate OD-002/003/008.
Integer accounting and financial safety are requirements; exact implementation
is unresolved. See [BILLING.md](BILLING.md).

## OD-010 API key design

Status: **OPEN**. Owner: unassigned.

Define key format, secure generation/hashing, storage, creation/display lifecycle,
and effective revocation behavior. Prefix + hash + metadata with display-once
secrets is a likely approach; optional last-used metadata is not a requirement.
Document the design before production. See [SECURITY.md](SECURITY.md).

## OD-011 Rate limits and financial stop controls

Status: **OPEN**. Owner: unassigned.

Choose thresholds/mechanisms across IP, account, key, model, concurrency, daily
usage, and global spend. Define rapid model disablement, account suspension,
key revocation, upstream stop, and platform spend limits. Coordinate free-usage
exposure with OD-006. See [SECURITY.md](SECURITY.md).

## OD-012 Monitoring, logging, and retention

Status: **OPEN**. Owner: unassigned. Candidate: Sentry or equivalent, not selected.

Choose monitoring provider and operational alert handling for application/upstream/
database errors, payment webhook/billing failures, unusual spend, and elevated
error rates. Define metadata access/retention and any required content logging;
prompts/output are excluded by default, and secrets must never be logged.
Usage/audit retention is not specified. See [ARCHITECTURE.md](ARCHITECTURE.md)
and [SECURITY.md](SECURITY.md).

## OD-013 Minimal admin and operations

Status: **OPEN**. Owner: unassigned.

Choose the smallest needed initial operational interface and timing. Candidates:
inspect users, balances, usage, requests, provider failures, and payment status;
suspend accounts, revoke keys, adjust credits with audit trail, and toggle models.
Define privileged access without building a large admin product.
See [SECURITY.md](SECURITY.md).

## OD-014 Pricing and introductory discounts

Status: **OPEN**. Owner: unassigned (coordinate with payment/billing owners).

Set model/token/image prices, price structure and margins, purchase packages,
and introductory discount mechanics. No amounts or discount rules are finalized.
Coordinate currencies/packages with OD-003 and units with OD-009.
**DECIDED:** pricing and final charges are server-authoritative.
See [BILLING.md](BILLING.md).

## Review notes and uncertainties

- The existing Node.js starter agrees with the bootstrap technology default, but
  does not establish Workers compatibility or decide deployment. No direct setup
  contradiction was found; missing product features are expected at this stage.
- **Resolved scope conflict (2026-09-15):** the user explicitly chose an API-only
  MVP, superseding the bootstrap's browser-at-launch requirement and browser-first
  milestone. The original specification need not be retained; follow
  [ADR-001](decisions/ADR-001-api-only-mvp.md) and [PRODUCT.md](PRODUCT.md).
- No backend framework is selected. The first slice uses an API client, not a
  first-party chat page. Future generation UI timing is uncommitted. Public website
  and customer dashboard scope is now accepted in [FRONTEND.md](FRONTEND.md);
  auth/payment mechanisms remain open under OD-001/003. Frontend technology and
  navigation are accepted in that guide and [ADR-002](decisions/ADR-002-frontend-stack.md).
  Hosting, public-page indexing, notifications and support/status delivery remain open.
- `.env.example` names anticipated Supabase/Stripe/upstream integration variables;
  none are consumed by the starter. Monitoring variables await OD-012.
- These repository guides are the permanent source of truth; the initial bootstrap
  specification is no longer required.
- Git inspection found no commits and a configured `origin/main` tracking branch
  reported as gone during bootstrap inspection. This is a historical observation;
  verify current Git/remote state before collaboration work.
