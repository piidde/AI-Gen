# ADR-006: Cloudflare backend runtime and service boundaries

Status: Accepted
Date: 2026-09-29
Owner: Repository owner

## Context

The product needs a low-operations API gateway for prepaid AI requests, account
management, and asynchronous media work. The existing website is a separate
React/Vite client and must not hold provider or payment credentials. Financial
state needs one transactional source of truth.

## Options considered

- A continuously running Node.js service with a separate job runner and object
  store.
- Cloudflare Workers for the API/website edge, with Supabase PostgreSQL for
  transactions, Cloudflare Queues for asynchronous work, and private R2 for
  temporary results.

## Decision

Use a TypeScript/Hono Cloudflare Worker as the public API and static-site host.
Use Supabase Auth for user sessions, PostgreSQL migrations and explicit RPCs for
trusted state changes, Cloudflare Queues for image/video jobs, private R2 for
short-lived encrypted inputs and generated results, and Stripe Checkout with
verified webhooks for purchases. Keep GrsAI behind one adapter and store its keys
only in Worker secrets. Do not build provider load balancing, Redis, Kubernetes,
or a separate database for the initial service.

The public generation surface is non-streaming chat plus idempotent asynchronous
media jobs. Results are served through authenticated Worker routes and are
available for two hours by default. The website remains a customer-management
portal; generation UI is outside the API-only MVP.

## Reasons

The API mostly waits on an external provider, while PostgreSQL owns atomic credit
and budget reservations. Queues isolate long media work from client HTTP timeouts.
One database and a small number of managed services keep the initial operating
model simple.

## Consequences

The Worker is the only owner of private provider, database service-role, and
Stripe credentials. PostgreSQL owns durable job/payment state; queue messages
carry only IDs. A scheduled handler recovers queued/pending work and removes
expired R2 objects. Schema changes remain explicit migrations and are not
automatically applied by deployment.

## Known limitations

The code is not deployed and the migration has not been run. No provider model,
media state, cost, or streaming contract is enabled without live verification.
Worker request limits, provider behavior, database latency, and financial
concurrency still require real tests. Alert routing, environment secrets,
retention, resale/data-processing terms, tax, and customer policies remain launch
gates. See [OPEN_DECISIONS.md](../OPEN_DECISIONS.md).
