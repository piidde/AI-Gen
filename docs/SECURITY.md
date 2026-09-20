# Security guide

These are requirements for implementation, not claims of deployed controls or
regulatory compliance. Supabase Auth is implemented for the browser login slice;
no backend authorization, payments, or production infrastructure exists yet.

## Secrets and trust boundaries

Never commit upstream keys/accounts, payment/webhook secrets, Supabase privileged
credentials, database passwords, or production authentication secrets. Use
environment variables or a secret manager. The frontend may expose only the
Supabase project URL and publishable key; service-role or secret keys must never
reach browser code. Google and Discord OAuth client secrets stay in Supabase Auth
settings. The tracked frontend `.env.example` contains names/placeholders only,
while the ignored local `.env.local` supplies browser-safe development values.
Keep production credentials out of routine local development. Aim for separate
development, preview/staging, and production access; use payment test mode where possible.

The browser is untrusted and calls only our backend or the selected Supabase Auth
client flow. Keep privileged credentials,
upstream access, routing, pricing, credit deduction, and payment secrets server-side.
Validate external requests, webhooks, configuration, and necessary upstream responses
at boundaries. Enforce account ownership, permissions, model availability, balances,
rate limits, and payment state server-side on every relevant operation.
The current client guard protects dashboard navigation, but it is not a substitute
for server-side token verification or authorization. Backend auth/session and RLS
details remain OPEN (OD-001/002).

## Browser-auth production gates

Do not call the browser authentication slice production-ready until all of the
following are complete and tested on the final HTTPS domain:

- In Supabase Auth URL configuration, allow the exact production
  `/auth/callback` and `/update-password` URLs. Keep production redirects
  exact; use any preview URLs as separately controlled entries, not a broad
  production wildcard.
- Keep email confirmation enabled. Use a custom authenticated SMTP domain for
  confirmation and reset mail, including SPF, DKIM, and DMARC, rather than the
  development mail service.
- Enable CAPTCHA for sign-up, password sign-in, and password reset, and set
  deliberate Auth rate limits. Configure a server-enforced password policy;
  enable leaked-password protection when supported by the selected plan. The
  current frontend does not yet supply a CAPTCHA token, so select and integrate
  a provider before enabling that dashboard setting.
- Review session lifetime and refresh-token reuse detection in Supabase Auth;
  do not rely on the browser's local session state as an authorization check.
- Verify that the selected static host enforces `_headers` and `_redirects`.
  Add and test a restrictive Content-Security-Policy for the final Supabase and
  analytics origins; a CSP is not configured in this repository yet.
- For Discord, register only
  `https://<project-ref>.supabase.co/auth/v1/callback` in the Discord OAuth
  application. Put the Discord client ID and secret only in the Supabase
  Discord provider configuration, enable the provider there, then run a full
  sign-in/sign-out and existing-account test before setting
  `VITE_AUTH_DISCORD_ENABLED=true`. That variable reveals a button only; it is
  not a security control or a credential.

Before users rely on data, credits, API keys, or billing, implement backend
access-token verification, account ownership checks, migrations, and RLS. The
current browser route guard cannot protect any future server-backed resource.

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
