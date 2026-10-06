# Contributing

Read [AGENTS.md](AGENTS.md), the [product](docs/PRODUCT.md),
[architecture](docs/ARCHITECTURE.md), and relevant domain guides before substantial work.
See [README.md](README.md) for local setup and commands.

## Small-team workflow

Prefer short-lived feature branches and small, coherent pull requests. Keep
`main` working; do not combine unrelated refactors with feature work.
Current rough ownership is non-exclusive: JannesG / PlaYa-44 leads frontend;
Mario handles payment research; Samuel handles database/Supabase;
Pippi + Imerian handle cloud/deployment.
Four people are involved, with approximately three expected to contribute actively.

Inspect existing work before changing it. Follow YAGNI, KISS, pragmatic DRY/SOLID,
explicit TypeScript, and the engineering rules in [AGENTS.md](AGENTS.md).
Maintain stable interfaces around unresolved work so contributors can proceed
without requiring the whole team to decide every implementation detail upfront.

Use [OPEN_DECISIONS.md](docs/OPEN_DECISIONS.md) for unresolved choices and evidence
gaps. Preserve DECIDED, ASSUMPTION, OPEN, and INVESTIGATION labels. When a choice
is accepted, update its register entry and owning guide; add an
[ADR](docs/decisions/README.md) when the architecture meaningfully changes.

Each meaningful PR explains what changed, why, documentation updates, actual
validation, and known limitations. High-risk areas listed in AGENTS.md need extra
review and evidence beyond compilation. Commit/push only when authorized.

## Validation

Backend checks: `npm run typecheck`, `npm run build` (TypeScript, Vite build,
and Wrangler dry-run), and `npm test` (database and billing tests on in-memory
PGlite; they need no Docker and never touch a hosted database). `npm run dev` builds Vite assets and starts Wrangler.
Local database work uses `npx supabase start`, `npm run db:up`, and
`npm run db:reset`; Docker Desktop is required. Stripe CLI can forward test
webhooks. Do not deploy or apply migrations to a hosted database as part of
routine validation.
Frontend checks: `npm --prefix frontend run typecheck`,
`npm --prefix frontend run build`, and `npm --prefix frontend test` (Playwright,
desktop/mobile, local Chrome required). Tests use a local preview on port 4173;
traces/results go to the OS temporary directory, not the repository. The frontend
test script builds first. No format or lint script exists. Run relevant
checks and report skipped or blocked checks without claiming success.

When behavior is implemented, prioritize billing, credits, auth, API keys,
permissions, idempotency, webhooks, request accounting, adapters, pricing, and
concurrency. Use unit tests for deterministic logic, integration tests at database,
payment, and API boundaries, and a few end-to-end tests for critical flows.
Do not chase arbitrary coverage percentages or over-test trivial presentation.

## Documentation, migrations, and secrets

Update API changes in [API.md](docs/API.md), schema changes in
[DATA.md](docs/DATA.md), billing changes in [BILLING.md](docs/BILLING.md), and
architecture changes in [ARCHITECTURE.md](docs/ARCHITECTURE.md) with an ADR where
appropriate. Documentation must describe the actual implementation as it evolves.

Permanent schema changes require reviewed migrations. The initial workflow is
`supabase/migrations/` with Supabase CLI; see [OD-002](docs/OPEN_DECISIONS.md#od-002-database-structure).
Do not make undocumented manual production schema changes.
Never commit secrets; use empty names in `.env.example` and follow
[SECURITY.md](docs/SECURITY.md). Prefer payment test mode and separate development,
preview/staging, and production credentials.

The backend implementation is isolated on `feature/grsai-backend`. Before backend
work, check the active branch. If it does not contain the implementation, tell
the owner where it lives; do not silently merge or copy it. Keep unrelated
frontend/design changes separate.
