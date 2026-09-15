# Product

DECIDED means an accepted
requirement, not an implemented feature. See [status definitions](../AGENTS.md).

## DECIDED — MVP direction

Build a production-oriented AI platform for EU / North American customers,
reselling a private upstream AI aggregator through our own product and API.
The upstream is an implementation detail, never the customer integration surface.

- Pay-as-you-go prepaid credits; customers purchase before paid generation.
- API-only MVP: no first-party browser chat or generation interface at launch.
  Customers use their own applications, scripts, or API clients.
- Our own public developer API at launch, simpler and better documented than the
  upstream where practical; exact upstream compatibility is not required.
- Backend authentication, API keys, routing, metering, accounting, limits,
  upstream communication, and error handling serve the public API. Any later
  first-party generation interface must reuse these services.
- No permanent first-party generated-image storage by default unless technically
  necessary. Prefer streaming/proxying and direct downloads. Bring-your-own-storage
  (R2/S3-compatible or other storage) is outside MVP.
- Preserve the possibility of strong introductory discounts. Charges remain server-authoritative.

## ASSUMPTION / conditional direction

The API-only scope was explicitly clarified on 2026-09-15 and supersedes the
bootstrap's browser-at-launch requirement and browser-first milestone; see
[ADR-001](decisions/ADR-001-api-only-mvp.md). A future generation UI is not a
committed milestone. Any account/payment management interface remains unspecified.

Node.js/TypeScript is the existing default. Supabase, Stripe, and Cloudflare are
working technology directions; see [architecture](ARCHITECTURE.md).
Prefer text streaming if upstream support is verified. Limited registered-user
free usage is a possibility, not a launch commitment; any offer needs a hard
maximum financial exposure.

## OPEN / INVESTIGATION

Pricing, discounts, free usage, exact API contracts, image delivery, and launch
operational scope remain unresolved in [the decision register](OPEN_DECISIONS.md).
Veo/video is **INVESTIGATION**: an apparent endpoint is not verified support and
may be absent from the upstream model list. Do not advertise it before verification.

## Delivery direction and non-goals

Current code is only a starter. After documentation review, aim for one controlled
text-generation request from a test API client through our API/backend and provider
adapter to the upstream, with the response returned through our backend to that
same client. Validate integration, configuration, deployment compatibility, and
request lifecycle. Streaming is conditional on verified support and the API contract;
it is not a browser feature or a prerequisite silently settled by this milestone.
A temporary/manual test balance is acceptable for this controlled milestone;
it does not remove financial protection requirements for paid usage.

Then complete production credit accounting, payments, API key management, images, limits,
monitoring, and Veo investigation as appropriate. This order is a recommendation,
not a rigid sequence; the public API is the initial product surface. Test access
and upstream spending must be controlled from the first billable integration.

Do not prebuild microservices, Kubernetes, Kafka/event buses, custom identity,
enterprise organizations/permission hierarchies, plugin systems, multi-region or
advanced autoscaling infrastructure, generic cloud/storage layers, multi-provider
load balancing, a complicated design system, or an internal developer platform.
Build the smallest serious system that safely meets current needs.
