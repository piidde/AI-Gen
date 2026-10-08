# Security guide

These controls describe the current backend code and its remaining deployment
gates; they are not proof of a deployed service or regulatory compliance. See
[OD-002](OPEN_DECISIONS.md#od-002-database-structure) and
[OD-004](OPEN_DECISIONS.md#od-004-deployment-architecture) for current database
and deployment status.

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

Local browser regression coverage is available through `npm --prefix frontend run
test:auth` (see CONTRIBUTING). It uses a separate temporary build and intercepted
fictional auth responses, with no production bypass flag or altered session guard.
It covers expired-session return, cross-tab sign-out, pending/error form behavior
and unsafe return paths. Return paths reject external destinations, backslashes
and ASCII control characters that URL parsers may normalize. This is browser-side
regression evidence, not verification of Supabase policies, backend authorization,
token security or real delivery. The production gates below remain open.

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

### Dashboard account management (2026-10-08)

Preferences, billing details, receipts and CSV export require a Supabase user token
(API keys are rejected) and are scoped to the token's account in every RPC. CSV
cells that could be read as spreadsheet formulas are prefixed. Alert emails are
looked up with the service role only inside the Worker cron and never logged.
Email and password changes use Supabase Auth directly (confirmation mail for email
changes). Receipt links come from Stripe only after an ownership check.

### Stage 7 account controls and auth recovery

The existing email/password, Google and gated Discord authentication, real reset,
session guard and display-name save remain. Callback failures now offer safe return,
confirmation-resend and reset links; confirmation resend uses the browser Auth client.
Reset requests preserve a sanitized local destination. Password-update submission is
disabled without a session or on an explicit failed link. These are usability gates,
not proof of fresh authentication; Supabase/server policy remains authoritative.
Official resend reference: [Supabase Auth resend](https://supabase.com/docs/reference/javascript/auth-resend).

New Settings email/password changes and identity-confirmed deletion are explicitly
mock operations with no Auth mutation, network request or real password verification.
Password previews require an email identity; OAuth-only users get provider guidance.
Mock identity confirmation asks for a simulation checkbox, never a real credential.
Deletion explains non-expiry, forfeiture and API termination but leaves the real
user, session, credits and keys unchanged. Pending operations cancel on closure or
navigation. Signup billing fields accept sample data only and are never included
in Auth requests, metadata, storage or URLs; later optional completion is in Settings.

B06/S12 still require partner review of fresh reauthentication, email verification,
provider identity changes, deletion authorization, pending purchases/requests,
retention and effective session/key termination. Test rejection, duplicate attempts,
races and cross-account access before live integration. Production redirect allowlists
and email templates must preserve the safe destination query as well as the path;
verify this on the final host without broad wildcard authorization. No partner
approval, email delivery or production account change is evidenced by local fixtures.

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

### Stage 5 metadata copy/export

Usage details, support copy and CSV use frontend-only safe metadata. Export selects
known fields explicitly and normalizes error code/message pairs through a fixed
allowlist; it never serializes whole response objects or raw error/billing reasons.
CSV quotes and escapes fields and protects formula prefixes after leading whitespace
or controls. Prompts, generated output, credentials and provider payloads are absent.
This is mock presentation evidence, not authorization: S12 must enforce account
ownership, retention and access at the backend before live history/export is enabled.

### Stage 6 nonfunctional key lifecycle

The key frontend constructs only explicitly invalid demo samples. A sample lives in
the creation dialog state, never in the metadata provider, storage, URLs or logs.
Closing or unmounting the page removes it from the UI; user-directed clipboard copies
are outside that lifecycle and cannot be recalled. This is not a memory-erasure or
production secret-handling guarantee. Metadata is scoped to the authenticated user
in memory and resets on reload/sign-out/account change. Pending mock mutations are
cancelled on dialog closure/navigation; duplicate submission is guarded.

B05/OD-010/S12 still require server generation, secure storage, account ownership,
creation-response-only delivery, effective revocation and race/authorization tests.
The demo establishes no real credential format, hashing design or revocation timing.
Before live integration, verify secrets cannot enter analytics, logs, persisted
client caches, error reports or later list/detail responses. Historical key labels
must survive revocation without retaining recoverable credentials.

### Stage 8 public information and support

Public support does not collect/send messages or echo arbitrary query parameters.
It points to existing safe request/order summaries and warns against sharing keys,
passwords/tokens, payment details, prompts, generated content and unredacted logs.
Authenticated links still go through RequireAuth; status/update pages contain only
public fixture content. No selected contact channel or response commitment is invented.

Contact/Terms/Privacy are review surfaces with explicit content gates. Product policy
summaries are not a published contract, privacy notice or compliance claim. Confirm
operator/controller identity, recipients/locations, purposes, retention, rights and
legal disclosures against the real service before publication. Live status publishing
and incident source integrity/freshness also remain B07/B08/S12 launch requirements.

The privacy page includes revisitable optional cookie preferences shared with the
initial banner. Consent updates synchronize both mounted controls. If browser storage
rejects a save, the current page honors the latest decision and the UI explicitly says
it may not survive reload; a prior stored grant cannot override a current rejection.
Configured-tag fixtures cover these paths without contacting any analytics provider.
S11 adds cross-tab consent synchronization and configured local tracking checks;
deployed tracking behavior still needs S13 verification. Browser cookies already
stored are not silently deleted.

For the organic-only launch, the analytics boundary ignores
`VITE_ADS_CONVERSION_ID`, normalizes old advertising grants to denied and never
configures advertising tags. Consent-mode advertising signals stay denied even
when analytics is accepted. The legacy environment-variable name is retained only
for configuration compatibility; setting it cannot activate advertising.

### Stage 11 public rendering and analytics

Public prerendering excludes browser authentication/providers and renders only
registered public repository content. Builds never run authenticated browser sessions
or request account data. Account routes use an empty noindex shell; missing paths
use a noindex 404 document. Host-enforced headers/status and release eligibility
still need B09/S13 evidence; noindex is not access control.

Custom measurement uses allowlisted public paths and strips query/fragment data.
Unregistered and private paths map to a generic path; raw referrer URLs are replaced
with direct/internal/external categories. No account/order/request IDs, amounts,
tokens, prompts or outputs enter funnel event parameters. Consent and tag
configuration precede late-grant landing events; rejection stops custom events,
including after a preference change in another tab. Existing provider cookies
and already-transmitted data are not erased by these controls.
Denial/revocation also sets Google's documented
[`ga-disable-<measurement-id>` opt-out](https://developers.google.com/tag-platform/security/guides/privacy)
before updating Consent Mode, including cross-tab storage clearing.

Before enabling GA, disable enhanced measurement and any automatic URL/form/search
capture in the selected GA property, and verify actual network payloads on the final
host. Local fixtures intercept the tag, so they prove our command/payload boundary,
not a remote vendor's behavior. Tags stay unconfigured in ordinary demo builds.
Server-confirmed conversion delivery, account isolation and durable deduplication
remain S12. No simulated billing or auth redirect is reported as a conversion.
