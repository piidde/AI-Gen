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
- No permanent first-party generated-media storage. Temporary private storage is
  allowed when required for asynchronous jobs and authenticated retrieval; this
  implementation retains completed results for two hours. Bring-your-own-storage
  (R2/S3-compatible or other storage) is outside MVP.
- Preserve the possibility of strong introductory discounts. Charges remain server-authoritative.

## DECIDED / remaining assumptions

The API-only scope was explicitly clarified on 2026-09-15 and supersedes the
bootstrap's browser-at-launch requirement and browser-first milestone; see
[ADR-001](decisions/ADR-001-api-only-mvp.md). A future generation UI is not a
committed milestone. A public website and customer management dashboard are now
accepted frontend scope; see [frontend scope](FRONTEND.md). Backend integrations
and hosting remain open, and generation stays API-only.

The implementation uses TypeScript/Hono on Cloudflare Workers, Supabase Auth and
PostgreSQL, Cloudflare Queues/R2, and Stripe Checkout; see
[architecture](ARCHITECTURE.md) and [ADR-005](decisions/ADR-005-backend-runtime-and-boundaries.md).
Text streaming is disabled until provider format and usage billing are verified.
Free usage remains uncommitted; any future offer needs a hard maximum financial
exposure.

## OPEN / INVESTIGATION

Exact model prices/limits, credit offers, markup values, FX assumptions, free
usage, provider compatibility, operational alert routing, and legal launch terms
remain unresolved in [the decision register](OPEN_DECISIONS.md). The route
contracts are implemented in [API.md](API.md), but streaming and all provider
models still require verification. Veo/video remains **INVESTIGATION**; do not
advertise support before testing.

## Delivery direction and non-goals

The backend implementation is on `feature/grsai-backend`. It is not deployed,
the migration has not been applied, and the existing website has not been wired
to these APIs on this branch. All models and purchase offers start disabled. The
next delivery gate is a local database run and reviewed test-mode vertical slice,
followed by limited-budget provider validation and production configuration.

Do not prebuild microservices, Kubernetes, Kafka/event buses, custom identity,
enterprise organizations/permission hierarchies, plugin systems, multi-region or
advanced autoscaling infrastructure, generic cloud/storage layers, multi-provider
load balancing, a complicated design system, or an internal developer platform.
Build the smallest serious system that safely meets current needs.
