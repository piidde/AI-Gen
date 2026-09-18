# Architecture

## Observed implementation

The repository contains an npm-managed Node.js starter (`node >=24`, `.nvmrc` 24),
TypeScript with strict NodeNext/ES-module settings, and `tsx` development watch.
`src/index.ts` prints a readiness message; compilation writes to `dist/`.
`frontend/` is a separate React/TypeScript/Vite browser application with React
Router and ordinary CSS. It implements the reviewed seven-screen design using
local demo fixtures, plus a public catalogue and pending-content/missing-page
states. The initial Supabase Auth browser slice adds Google OAuth, email/password
auth, password reset, callback handling, session guards and logout. Its package,
lockfile, TypeScript configuration and build output are independent of the Node
starter. Playwright covers public routes and key interactions at desktop/mobile
widths; generated test artifacts stay outside the repository. There is still no
HTTP API, database schema, payment integration, provider adapter or deployment
configuration. Backend requirements below describe intended behavior.

## DECIDED — boundaries

The API-only MVP accepts customer API calls through our backend/gateway, with services for
authentication, key validation, model availability/routing, pricing, credits,
usage metering, request tracking, errors, and applicable rate limits.
The backend coordinates persistence, trusted payment confirmation, and an adapter
that communicates with the private upstream. These are conceptual responsibilities,
not a mandate for separate services, packages, classes, or deployment units.

Responses return from upstream through the adapter/backend to the calling API
client, which decides how to display or use them. No first-party generation UI
is required. If one is added later, it must reuse the same backend logic.
See [ADR-001](decisions/ADR-001-api-only-mvp.md).

A public website and customer management dashboard are accepted scope in
[FRONTEND.md](FRONTEND.md). They add account, billing, key, and usage management
surfaces without adding a browser generation interface. The frontend stack is
accepted in [ADR-002](decisions/ADR-002-frontend-stack.md); hosting and management
API contracts remain open. `frontend/src/demo/fixtures.ts` contains fictional
view data, not network contracts. Components never perform credit arithmetic or
issue credentials. Demo settings remain component state, with no persistence.

Clients call only our API. Keep upstream credentials, privileged database
credentials, payment secrets, pricing, credit deduction, and routing server-side.

Isolate actual upstream behavior in one provider adapter. Translate public input
to internal types, then upstream input; translate upstream results/errors back to
internal and public forms. Model listing, text generation, and image generation
are conceptual capabilities, not finalized TypeScript signatures. Add only verified
behavior; do not build multi-provider machinery or speculative video methods.

## ASSUMPTION — technology direction

- Node.js/TypeScript remains the default existing setup, not a decision against Workers.
- Supabase Auth is selected for the initial browser auth slice. Supabase/PostgreSQL
  remains the database direction; database access, migrations, RLS, and any
  limited internal storage remain subject to database design.
- Stripe is the primary payment candidate. Do not add alternative providers for
  theoretical flexibility.
- Cloudflare is a cloud direction. DNS/CDN/WAF, limits, Workers, R2, hosting, and
  server/VM/hybrid arrangements are candidates, not provisioned infrastructure.
- Prefer upstream-to-backend-to-client text streaming when supported. SSE or
  streaming HTTP is a candidate; verify long-lived request/runtime compatibility.

## OPEN — deployment, delivery, and operations

See [OD-004](OPEN_DECISIONS.md#od-004-deployment-architecture) for runtime, streaming
limits, jobs, request durations, secrets, preview environments, scaling, and deployment.
Image delivery may proxy/stream, use a temporary upstream URL only after privacy,
reliability, lifetime, and exposure are understood, or use temporary internal
storage when technically necessary (OD-005). No generic storage framework is required.

Aim to separate development, preview/staging, and production. Use structured logs
with useful request/account/key/model/provider IDs, status, latency, usage, charges,
provider costs, and error categories, subject to [security rules](SECURITY.md).
Production monitoring should cover application/upstream/database errors, webhook
and billing failures, unusual spending, and elevated error rates. Sentry or an
equivalent is a candidate; provider, retention, and alerting are OPEN (OD-012).

Plan the smallest usable operational interface for inspection and controls, not
a large admin product (OD-013). Rapid model disabling, key revocation, account
suspension, upstream shutdown, and platform spending limits are required directions
for financial protection; mechanisms/thresholds remain OPEN (OD-011).

Billing rules live in [BILLING.md](BILLING.md); data concepts in [DATA.md](DATA.md);
contracts in [API.md](API.md). Record accepted material choices in
[ADRs](decisions/README.md) and update this guide as implementation changes.
