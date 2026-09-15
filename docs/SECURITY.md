# Security guide

These are requirements for implementation, not claims of deployed controls or
regulatory compliance. No auth, payments, or production infrastructure exists yet.

## Secrets and trust boundaries

Never commit upstream keys/accounts, payment/webhook secrets, Supabase privileged
credentials, database passwords, or production authentication secrets. Use
environment variables or a secret manager. `.env.example` contains empty expected
names only; the current starter does not load or validate them.
Keep production credentials out of routine local development. Aim for separate
development, preview/staging, and production access; use payment test mode where possible.

The browser is untrusted and calls only our backend. Keep privileged credentials,
upstream access, routing, pricing, credit deduction, and payment secrets server-side.
Validate external requests, webhooks, configuration, and necessary upstream responses
at boundaries. Enforce account ownership, permissions, model availability, balances,
rate limits, and payment state server-side on every relevant operation.
Auth/session/RLS details remain OPEN (OD-001/002).

## API keys and payments

Our keys must map to accounts, support creation/revocation, and stop working when
revoked. They must not expose upstream credentials. Avoid unnecessary raw-secret
storage. Display-once keys with a prefix, secure hash, and metadata are a likely
approach, not a finalized design. Last-used metadata is optional. Document exact
generation/hashing and revocation behavior before production use (OD-010).

Verify trusted server-side payment confirmation; frontend success is insufficient.
Handle repeated webhook events without duplicate credit. Preserve billing
concurrency/idempotency guarantees and deliberately handle ambiguous upstream
outcomes; see [BILLING.md](BILLING.md).

## Logging, abuse, and production access

Use structured operational metadata, such as request/account/key identifiers,
model/provider IDs, status, latency, usage, charge/cost, and error category.
Never log secrets, authorization headers, or raw keys. Avoid prompts and generated
content by default unless specifically required; minimize sensitive data and limit
log access. Retention and monitoring provider remain OPEN (OD-012).

Rate limits protect money as well as capacity. Candidate dimensions are IP,
account, API key, model, concurrency, daily usage, and global spend. Thresholds
and mechanisms remain OPEN (OD-011); any free offer needs a hard financial cap.
Plan rapid model disablement, key revocation, account suspension, upstream stop,
and platform spending limits. Temporary upstream result URLs require privacy,
reliability, lifetime, and exposure evaluation (OD-005).

Use least-privilege production access and restrict privileged administration.
Credit adjustments need an audit trail. No undocumented production schema edits;
use migrations. Deployment/secrets/access workflow and minimal admin tooling await
OD-004/013. Review dependencies and lockfile changes, keep dependencies minimal,
and investigate relevant vulnerabilities rather than blindly updating packages.

High-risk code requires additional review and meaningful tests; see
[AGENTS.md](../AGENTS.md). Security controls alone do not establish legal or
regulatory compliance for EU or North American customers.
