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

Before users rely on data, credits, API keys, or billing, implement backend
access-token verification, account ownership checks, migrations, and RLS. The
current browser route guard cannot protect any future server-backed resource.

## API keys and payments

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

Our keys must map to accounts, support creation/revocation, and stop working when
revoked. They must not expose upstream credentials. Avoid unnecessary raw-secret
storage. Display-once secrets and last-used metadata are accepted frontend
requirements. Prefix/hash storage remains a candidate design. Document exact
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
