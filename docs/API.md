# Public API

## Status and authentication

The Worker implements the routes below. The API is versioned under /v1 and returns JSON except for authenticated generated-file downloads. /v1/openapi.json provides the current OpenAPI 3.1 document.

Use Authorization: Bearer <key>. Customer applications use a Takewing API key. The website uses its Supabase access token for account-management routes. Generation endpoints require a Takewing API key; an ordinary website login token cannot generate billable work. The provider key is never returned.

The dated [model evidence register](MODEL_PRICING.md) inventories 29 upstream
image/text entries for S02.1. It separates official identities from unresolved
aliases, channel claims and availability notices. These are internal research IDs,
not approved public API IDs or verified adapter support. Resolve its A1–A8 gaps
before advertising affected capabilities or publishing runnable examples.

Every API error has this shape:

    { "error": { "message": "...", "type": "invalid_request_error", "code": "...", "request_id": "..." } }

The response includes X-Request-Id. Generation responses also include X-Takewing-Request-Id. Provider secrets and raw upstream errors are not returned.

## Routes

| Method and path | Authentication | Behavior |
| --- | --- | --- |
| GET /healthz | None | Worker liveness only; it does not prove database or provider health. |
| GET /v1/openapi.json | None | OpenAPI 3.1 route document. |
| GET /v1/models | None | Models that are enabled, priced, and available while the platform accepts requests. |
| POST /v1/chat/completions | Takewing API key | OpenAI-style non-streaming chat subset. |
| POST /v1/generations | Takewing API key | Create an asynchronous image or video job. Requires Idempotency-Key. |
| GET /v1/requests/{id} | Account token or API key | Request state, charge, error category, and live result manifest. |
| GET /v1/requests/{id}/result | Account token or API key | Retrieve a stored text response or media manifest before expiry. |
| GET /v1/files/{requestId}/{index} | Account token or API key | Download a private generated file after ownership and expiry checks. |
| GET /v1/credits | Account token or API key | Available and reserved USD-value credits. |
| GET /v1/dashboard/summary | Account token or API key | Customer dashboard aggregates. |
| GET /v1/usage | Account token or API key | Summary plus a filtered page of requests, newest first. Query: from, to (ISO instants), model, key, outcome (completed/failed/pending/unknown), search (ID prefix or model), limit (≤100), offset. Returns total, limit, offset. Rows include tokens/units, price version and API key. |
| GET /v1/usage/export.csv | Supabase user token | The same filters as CSV, newest 5000 rows; X-Export-Truncated reports omitted rows. Formula-like cells are neutralized. |
| GET /v1/usage/overview | Account token or API key | period=today/7d/30d/6m/1y/all (UTC, default 30d): totals, UTC daily series and top models, computed server-side. |
| GET /v1/dashboard/savings | Account token or API key | period (default all): settled charges versus operator-entered official prices; reports compared and excluded request counts. |
| GET, PUT /v1/account/preferences | Supabase user token | Low-balance alert switch, threshold_micros and product-updates flag. |
| GET, PUT /v1/account/billing-profile | Supabase user token | Optional billing name, company, address, two-letter country code and VAT ID. |
| GET /v1/status | None | Published incidents: open ones and those resolved within 7 days. Empty means nothing reported, not verified health. Cached 60 s. |
| GET /v1/api-keys | Supabase user token | List key metadata. |
| POST /v1/api-keys | Supabase user token | Create a key and return its secret once. |
| DELETE /v1/api-keys/{id} | Supabase user token | Revoke one of the user's keys. |
| GET /v1/billing/offers | Supabase user token | Active EUR/USD top-up offers. The initial database has none. |
| POST /v1/billing/checkout | Supabase user token | Create or resume an idempotent Stripe Checkout session. |
| GET /v1/billing/payments | Supabase user token | Payment history and current status. |
| GET /v1/billing/payments/{id}/receipt | Supabase user token | Stripe receipt link for an owned, confirmed payment; 409 until Stripe issues one. No invoices are generated. |
| POST /stripe/webhook | Stripe-Signature | Process trusted payment, refund, and dispute events, including closed disputes. |

Administrator routes are under /v1/internal. They require a verified Supabase user ID listed in ADMIN_USER_IDS. They provide operational summaries, account inspection/suspension, API-key revocation, audited credit adjustment, platform/provider controls, model configuration, official reference prices for savings (`POST /v1/internal/models/{id}/official-prices`), incident publishing (`POST /v1/internal/incidents`), and purchase-offer configuration. There is no Operations frontend yet.

## Chat request contract

The accepted body fields are model, messages, max_tokens or max_completion_tokens, temperature, top_p, stop, seed, and stream. messages is an array of 1-100 strict role/content objects; role is system, developer, user, or assistant, and content is a string. Set exactly one of max_tokens and max_completion_tokens. A bounded output maximum is mandatory because credits and provider budget are reserved before the provider call. The configured model supplies the maximum input and output limits. The Worker also bounds the provider's chat response body (8 MiB by default) before parsing it; an oversized or unreadable result becomes unresolved rather than prompting an automatic retry.

stream=true returns 501 streaming_not_enabled. Tools, image input, response_format, logprobs, and other unlisted OpenAI options are rejected. The request body limit defaults to 1 MiB. Input tokens are estimated before submission and actual customer charges require numeric input/output usage from the provider response. A missing or invalid usage result becomes an unresolved request; it is never guessed.

Chat Idempotency-Key is optional but recommended. It must be 8-128 characters. The same key and same authenticated account/capability/request body returns the stored successful response or an in-progress/unresolved response. The same key with different input returns 409. Idempotency is scoped by account and capability (text, image, or video), and mappings expire after 30 days. A duplicate success goes through the same ownership and expiry check as an explicit result request; after result expiry it returns 410. Results can be retrieved for two hours by request ID; there is no cross-customer prompt/result cache.

## Media job contract

Send model plus model-specific input to POST /v1/generations and include a stable Idempotency-Key. Parameters are validated against the enabled model's stored JSON-schema subset before any credit or provider reservation. Unknown fields, remote reference URLs, out-of-range numbers, and unconfigured media limits are rejected.

A new request returns 202 with an owned request ID, status URL, and result URL. Queue messages contain only the request ID. The encrypted input payload is held in private R2 only until submission/cleanup. Worker downloads provider results to private R2; returned file URLs point to authenticated Takewing downloads. Each request can return up to 120 files, subject to the model schema and configured result byte limit. Do not pass user-controlled remote URLs through this API.

A repeated key with the same input returns the original request; a completed media request returns 200 after checking result ownership and expiry. A repeated key with different input returns 409. A result that reached its expiry returns 410, including when cleanup has not yet run; it is never regenerated automatically. The 2-hour default result TTL starts after the completed result has been stored. Admin TTL changes apply to future completions. Unrecognized provider job states become unresolved requests and are not polled or resubmitted indefinitely.

## Status and errors

Request states include queued, submitting, provider_pending, succeeded, failed, unknown, and expired. unknown means the upstream may have accepted a billable request but the backend cannot confirm the outcome. Check status using the same request ID; never retry the generation with a new key solely because of a timeout. Stripe dispute events are deduplicated and terminal outcomes restore/keep reversed credits as appropriate; resolved disputes do not automatically restore account access.

Common codes include authentication_required, api_key_required, model_unavailable, insufficient_credits, concurrency_limit, provider_budget_exhausted, idempotency_conflict, result_not_ready, result_expired, provider_outcome_unknown, and database_unavailable.

## Local examples

examples/takewing.http is runnable with the VS Code REST Client extension after setting its base URL and API key variables. It shows chat, media job creation, polling, result retrieval, and authorized downloads. It uses no valid provider credentials.

## Dashboard integration

Since 2026-10-08 every `/dashboard` page reads and writes these routes through
`frontend/src/data/api.ts` (same-origin, Supabase access token). No demo data,
simulated outcomes or local-only saves remain in the dashboard. Account deletion is
not offered yet (support handles it), and receipts come from Stripe; invoices are
out of scope. The public `/models` catalogue stays a dated reference page.

## Frontend stage boundaries

These sections record the frontend demo boundaries from the Frontend Implementation
Plan. They predate the backend contract above, which is now authoritative; the
dashboard integration above supersedes their mock-only notes.

### Stage 3 catalogue boundary

The shared catalogue and four public model-family pages now display the accepted
reference inventory. IDs in detail dialogs are labelled reference IDs; public API
IDs remain unassigned. Documentation links report contract preparation, and no
runnable endpoint example is fabricated. S12 must supply approved public IDs and
verified integration details before these references become supported offers.

### Stage 5 usage/export boundary

The mock Usage frontend now demonstrates periods, composed filters, pagination,
metadata details and CSV across all matching records. Its local view/helper shapes
are not proposed HTTP DTOs or endpoint contracts. S12 must establish account-owned
history reads, metadata retention, authorized pagination/export, safe error mapping,
complete export semantics and authoritative settlement before connecting live data.

### Stage 6 key-management boundary

Named creation, show-once sample display, filtered lists and confirmed revocation
are now interactive mock frontend flows. No key-management endpoint, credential
format or valid base URL is established by these controls. B05/OD-010/S12 must supply
owned metadata reads, creation-only secret delivery and effective server revocation;
B08 supplies verified quickstart instructions before any runnable example is shown.

### Stage 7 account-management boundary

Email/password-change, identity/deletion and notification controls are mock frontend
flows, not proposed endpoints. B06/S12 owns profile/preference persistence, verified
email transitions, fresh identity checks, deletion and pending-operation handling,
retention and duplicate-safe alert delivery. Existing Supabase browser auth/recovery
remains separate; no new management HTTP contract is inferred from these components.

### Stage 8 public help and documentation boundary

Status and announcements remain local fixtures; their shapes are not management API
contracts. B07/S12 must supply a reviewed source, publisher and freshness/failure
contract. Support links to the existing account-owned investigation views without
serializing request/order details into URLs. The `/docs` route now serves the backend API
reference (`frontend/src/pages/Docs.tsx`), replacing the earlier preparation page. S08.5's documentation brief was approved on 2026-09-20: quickstart (account, credits,
key, first request), API-key authentication, model IDs/capabilities, image and text
request guides, errors/conditional refunds, and usage/billing basics. Detailed content
and tested examples remain a B08/S12/S13 launch requirement and wait for the verified
API contract. The chatbot remains post-MVP; extra tutorials were not approved.

### Stage 9 Overview integration boundary

Overview periods, latest requests, wallet and savings are mock reads. Production
integration must supply the accepted Stage 2 historical summary, including history
coverage, exclusion counts, versions, revision and timestamp, with server ownership
and complete-history guarantees. A paginated Usage response is not an all-time
savings source. The frontend fixture shape does not establish a new HTTP endpoint.

### Stage 10 acquisition content boundary

The homepage and two repository reference guides explain image request units and
text input/output/cache components using the shared dated catalogue. Their copyable
checklists are plain planning text, not API examples. No base URL, authentication
header, public model ID, payload, compatibility or tested generation result is
invented. Working image/text examples remain B08/S12/S13 requirements; publish them
only after exercising the verified public contract from an external API client.

### Stage 11 conversion integration boundary

The frontend's ConfirmedFunnelOutcomeSource is a testable consumer interface, not
an HTTP endpoint or proof of trusted events. S12 must supply authorized server
confirmation of completed signup, the first fulfilled/confirmed credit purchase,
and the first successful API request, with stable opaque deduplication identifiers.
Clicks, checkout redirects, auth callbacks and demo mutations are not confirmation.
No source is connected today. Browser-lifetime duplicate suppression is not durable
cross-session/account/device exactly-once delivery. Outcome IDs, keys, customer
identities, order amounts and request payloads must not be sent to analytics.
