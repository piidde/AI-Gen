# Public API

## Status and authentication

The Worker implements the routes below. The API is versioned under /v1 and returns JSON except for authenticated generated-file downloads. /v1/openapi.json provides the current OpenAPI 3.1 document.

Use Authorization: Bearer <key>. Customer applications use a Takewing API key. The website uses its Supabase access token for account-management routes. Generation endpoints require a Takewing API key; an ordinary website login token cannot generate billable work. The provider key is never returned.

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
| GET /v1/usage | Account token or API key | Summary and latest 100 requests. |
| GET /v1/api-keys | Supabase user token | List key metadata. |
| POST /v1/api-keys | Supabase user token | Create a key and return its secret once. |
| DELETE /v1/api-keys/{id} | Supabase user token | Revoke one of the user's keys. |
| GET /v1/billing/offers | Supabase user token | Active EUR/USD top-up offers. The initial database has none. |
| POST /v1/billing/checkout | Supabase user token | Create or resume an idempotent Stripe Checkout session. |
| GET /v1/billing/payments | Supabase user token | Payment history and current status. |
| POST /stripe/webhook | Stripe-Signature | Process trusted payment, refund, and dispute events, including closed disputes. |

Administrator routes are under /v1/internal. They require a verified Supabase user ID listed in ADMIN_USER_IDS. They provide operational summaries, account inspection/suspension, API-key revocation, audited credit adjustment, platform/provider controls, model configuration, and purchase-offer configuration. This backend branch does not include an Operations frontend.

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
