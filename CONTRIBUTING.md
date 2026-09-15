# Contributing

Read [AGENTS.md](AGENTS.md), the [product](docs/PRODUCT.md),
[architecture](docs/ARCHITECTURE.md), and relevant domain guides before substantial work.
See [README.md](README.md) for local setup and commands.

## Small-team workflow

Prefer short-lived feature branches and small, coherent pull requests. Keep
`main` working; do not combine unrelated refactors with feature work.
Current rough ownership is non-exclusive: Mario handles frontend and payment
research; Samuel handles database/Supabase; Pippi + Imerian handle cloud/deployment.
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

Existing checks: `npm run typecheck` and `npm run build`.
After building, `npm start` is a starter smoke check, not a product test suite.
`npm run dev` uses `tsx` and does not type-check.
Format, lint, and test scripts do not exist yet. Run relevant checks that exist;
report skipped or blocked checks without claiming success.

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

Permanent schema changes require migrations; the workflow is still OPEN (OD-002).
Do not make undocumented manual production schema changes.
Never commit secrets; use empty names in `.env.example` and follow
[SECURITY.md](docs/SECURITY.md). Prefer payment test mode and separate development,
preview/staging, and production credentials.
