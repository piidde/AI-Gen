# Public API

## Current status

No HTTP routes or payload contracts are implemented. This document owns the API
contract as implementation begins; public API changes must update it.

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
