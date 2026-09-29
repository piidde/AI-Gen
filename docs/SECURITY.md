# Security guide

These controls describe the current backend code and its remaining deployment
gates; they are not proof of a deployed service or regulatory compliance. The
backend lives on `feature/grsai-backend`; it has not been deployed, and its SQL
migration has not yet been applied or executed.

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

The browser is untrusted and calls the backend for account data. The Worker
verifies Supabase access tokens, authenticates Takewing API keys by SHA-256 digest,
and routes account-owned data through private database functions. Privileged
credentials, upstream access, routing, pricing, credit deduction, and payment
secrets stay server-side. External requests, webhooks, configuration, and
necessary upstream responses are validated at boundaries. Database execution and
behavioral tests remain pre-launch gates (OD-001/002).

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

Before users rely on data, credits, API keys, or billing, apply and review the
migration, verify token and ownership behavior against Supabase, and execute the
database/API flow locally. The browser route guard is presentation only; every
protected resource must continue to enforce authorization in the Worker/database.

## API keys and payments

Takewing keys use a `tw_live_` prefix and 256 random bits, are shown once, and are
stored only as a SHA-256 digest plus prefix/metadata. Revocation is checked during
authentication and again before request reservation. GrsAI keys remain in the
Worker secret `GRSAI_KEYS_JSON`; never store them in Postgres or expose them to the
browser. The per-request provider key ID is persisted so already accepted jobs
continue to use the same key; retain old key entries until their jobs finish.

Verify trusted server-side payment confirmation; frontend success is insufficient.
Handle repeated webhook events without duplicate credit. Preserve billing
concurrency/idempotency guarantees and deliberately handle ambiguous upstream
outcomes; see [BILLING.md](BILLING.md).

## Logging, abuse, and production access

Structured logs include operational IDs, status, latency, usage, and error
categories without prompts, outputs, secrets, authorization headers, or raw keys.
Optional Sentry uses `SENTRY_DSN`, disables default PII, and strips request bodies,
cookies, and credential headers. Cloudflare observability is configured in
`wrangler.jsonc`. Alert destinations, observability retention, 90-day usage
retention, and financial-record retention still require explicit setup/decisions.

The database enforces atomic available-credit and provider-budget reservations,
and defaults to at most three concurrent requests per account. It does not yet
enforce per-IP, per-key, or daily-rate limits; Cloudflare rate-limit configuration
is a launch task. Operators can pause the platform/provider, disable models,
suspend accounts, revoke keys, and adjust credits with an audit reason. Results
are copied to private R2 and delivered only through authenticated, expiry-checked
Worker routes; upstream result hosts are restricted by `DOWNLOAD_HOST_ALLOWLIST`.

Use least-privilege production access and restrict privileged administration to
the verified user IDs in `ADMIN_USER_IDS`. Credit adjustments require an
idempotency key, reason, and audit record. No undocumented production schema
edits; use migrations. Production secrets/access and alert routing are not yet
configured. Review the current dependency audit and relevant advisories before
deployment; do not update dependencies blindly.

High-risk code requires additional review and meaningful tests; see
[AGENTS.md](../AGENTS.md). Security controls alone do not establish legal or
regulatory compliance for EU or North American customers.
