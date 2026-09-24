# Public API

## Current status

No HTTP routes or payload contracts are implemented. This document owns the API
contract as implementation begins; public API changes must update it.

The dated [model evidence register](MODEL_PRICING.md) inventories 29 upstream
image/text entries for S02.1. It separates official identities from unresolved
aliases, channel claims and availability notices. These are internal research IDs,
not approved public API IDs or verified adapter support. Resolve its A1–A8 gaps
before advertising affected capabilities or publishing runnable examples.

## DECIDED — product boundary

Ship an API-only MVP with our own account-owned, revocable API keys. No first-party
browser generation interface is required. Our contract may translate to/from
internal models and upstream formats; exact upstream mirroring is not required.
Validate external input, normalize upstream errors, and never expose upstream
credentials. Security and billing invariants apply to all API clients.

A customer's application, script, terminal tool, or API testing tool sends an HTTP
request to our API. Our backend calls upstream and returns the response to that
client. The client decides whether to display, save, or otherwise process it.
If supported and requested under the eventual contract, streaming delivers chunks;
otherwise the client receives a completed response. Exact formats remain OPEN.

## OPEN — proposed routes, not commitments

| Method | Candidate route | Purpose |
| --- | --- | --- |
| GET | `/health` | Health |
| GET | `/v1/models` | Available models |
| GET | `/v1/credits` | Credit balance |
| GET | `/v1/usage` | Usage information |
| POST | `/v1/chat/completions` | Text/chat |
| POST | `/v1/images/generations` | Image generation |

`POST /v1/videos/generations` is only a potential future route, contingent on
**INVESTIGATION** OD-007. No payloads, status codes, error shapes, compatibility
promise, or implemented versioning policy are defined here yet.

[OD-008](OPEN_DECISIONS.md#od-008-api-contract) covers exact routes and payloads,
errors, streaming transport/format, compatibility goals, request IDs, idempotency,
pagination, and versioning. Streaming depends on upstream and deployment evidence.
[OD-010](OPEN_DECISIONS.md#od-010-api-key-design) covers key format/generation,
hashing, lifecycle, and revocation behavior. Resolve relevant contract questions
before dependent implementation; do not invent unresolved contract details.

Repeated requests must not accidentally duplicate generations or charges. An
upstream timeout can leave an ambiguous billable outcome; do not silently retry.
See [billing](BILLING.md) and [security](SECURITY.md).

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
serializing request/order details into URLs. The `/docs` route remains a navigable
preparation page. No working base URL, API ID, request schema, retry advice or runnable
example is implied. S08.5's documentation brief was approved on 2026-09-20: quickstart (account, credits,
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
