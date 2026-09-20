# Repository agent rules

## Context and sources

Before substantial changes, read this file, [product scope](docs/PRODUCT.md),
[architecture](docs/ARCHITECTURE.md), [open decisions](docs/OPEN_DECISIONS.md),
and the task-specific [API](docs/API.md), [billing](docs/BILLING.md),
[data](docs/DATA.md), or [security](docs/SECURITY.md) guide.
Follow [CONTRIBUTING.md](CONTRIBUTING.md) for collaboration and validation.

Repository documentation records shared decisions; chats and private memory do
not replace it. These guides are the permanent source of truth and do not depend
on retaining the initial bootstrap specification.
For "Continue with the Implementation Plan" or frontend MVP continuation, read
[the Frontend MVP Implementation Plan](docs/superpowers/plans/2026-09-20-frontend-mvp.md)
first, including its current handoff, stage/step statuses and issue log. Update it
as work proceeds and before handing off; never infer completion from accepted scope.
The explicit API-only MVP correction supersedes the bootstrap's browser-at-launch
scope; see [ADR-001](docs/decisions/ADR-001-api-only-mvp.md). Do not implement a
first-party chat/generation frontend for the MVP.

Use these labels consistently:

- **DECIDED:** accepted direction or requirement; not proof of implementation.
- **ASSUMPTION:** provisional working direction that may change.
- **OPEN:** unresolved choice; record an owner where practical.
- **INVESTIGATION:** evidence must be gathered before support or a decision is claimed.

## Working procedure

1. Inspect relevant code and documentation before editing. Identify affected interfaces.
2. Check whether an OPEN or INVESTIGATION item blocks the task. Do not silently
   finalize it: preserve a boundary, use a documented assumption, propose options,
   ask the developer, or update the decision register. Record explicit decisions.
3. For non-trivial work, give a short plan, then make the smallest coherent change
   within the authorized scope. Documentation work does not authorize product implementation.
4. Update affected guides in the same change. Record meaningful architecture
   decisions using [ADRs](docs/decisions/README.md).
5. Run relevant existing checks and report actual results and limitations.
   Node checks are `npm run typecheck` and `npm run build`. Frontend checks are
   `npm --prefix frontend run typecheck`, `npm --prefix frontend run build`, and
   `npm --prefix frontend test` (desktop/mobile Playwright with local Chrome).
   There are no format, lint, or root test scripts; do not invent results or add
   tooling just to tick boxes. Keep browser artifacts outside the repository.
6. Summarize changes, unresolved decisions, assumptions, and risks. Do not commit
   or push unless explicitly instructed.

## Engineering principles

- **YAGNI / KISS:** build current requirements with clear data flow, few moving
  parts, and minimal dependencies. A ledger does not imply event sourcing.
- **Pragmatic DRY / SOLID:** extract genuinely shared semantics, not hypothetical
  reuse. Prefer straightforward TypeScript modules, functions, and explicit types
  over class hierarchies, generic factories, or unnecessary interfaces.
- Use abstractions at real boundaries: upstream, payments, database, public API,
  and client/backend. One upstream adapter is required; multi-provider routing is not.
- Prefer explicit, readable code and obvious failure behavior. Comments explain
  reasons, not obvious operations. Avoid clever metaprogramming and hidden effects.
- Inspect working code and identify a concrete problem before replacing it.
  Keep diffs small; avoid unrelated refactors or style-driven rewrites.
- Debug by reproducing, inspecting logs/state, identifying the root cause, fixing
  it, and adding a regression test where practical. Do not repeatedly patch symptoms.
- Fail meaningfully on impossible states. Do not swallow unexpected errors or
  return `null` unless that is intentionally part of the contract.
- Validate HTTP input, webhooks, environment configuration, user IDs, and upstream
  responses where necessary at trust boundaries; avoid redundant internal checks.

## Non-negotiable boundaries

- API clients call our backend, which owns core business logic and private upstream
  access. If a first-party generation UI is added later, it must reuse that logic
  and never hold privileged credentials or call the private upstream directly.
- Keep upstream details in the adapter and use internal request/response types.
- Enforce permissions, pricing, credits, model availability, payment state,
  ownership, and limits server-side; the frontend is untrusted.
- Follow billing safety: integer units, auditable accounting, concurrency safety,
  trusted payment confirmation, duplicate protection, and no silent retry of
  ambiguous billable requests. Exact mechanisms remain open.
- Never log secrets or commit credentials. Avoid prompt/output logging by default.
- Use migrations for permanent schema changes; no undocumented manual production edits.
- Do not advertise Veo/video support before investigation verifies it.

Billing, ledger changes, pricing, payment webhooks, authentication, API keys,
authorization, migrations, provider retries, secret configuration, and admin
credit adjustments require extra review. Compilation alone is insufficient.
Prioritize meaningful tests for these behaviors and concurrency, not arbitrary
coverage targets or trivial presentation details.
