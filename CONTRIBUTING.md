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

Node starter checks: `npm run typecheck` and `npm run build`.
After building, `npm start` is a starter smoke check, not a product test suite.
`npm run dev` uses `tsx` and does not type-check.
Frontend checks: `npm --prefix frontend run typecheck`,
`npm --prefix frontend run build`, and `npm --prefix frontend test` (Playwright,
desktop/mobile, local Chrome required). Tests use a local preview on port 4173;
traces/results go to the OS temporary directory, not the repository. The frontend
test script builds first. No root test, format or lint script exists. Run relevant
checks and report skipped or blocked checks without claiming success.

For auth/session and shared dashboard interaction changes, also run
`npm --prefix frontend run test:auth`. This builds to a unique OS temporary
directory with a fictional Supabase endpoint/key and disabled indexing/tracking,
then runs desktop/mobile Playwright on port 4174. Responses are intercepted;
unexpected external requests fail the fixture. It exercises the actual browser
auth client/guards, not production server authorization or email delivery. No real
credentials are required and the normal `frontend/dist` is not replaced. Builds,
screenshots and traces stay in OS temp. Do not deploy these fixture artifacts.

For account notification-policy changes, also run `node --experimental-strip-types
--test --test-isolation=none frontend/tests/accountSettings.node.ts` (one command).
These pure model tests cover initial/crossing alerts, exact thresholds, rearming and
unverified-email assumptions; they do not verify a production email scheduler.

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

For public consent controls or analytics-gate changes, run
`node scripts/test-consent.mjs` from `frontend/`. It builds a separate OS-temp fixture
with fictional measurement identifiers and intercepts all external browser requests.
Local Chrome and port 4175 are required. It verifies banner/preferences agreement,
reload persistence, rejection and denied storage without sending tracking data. It
leaves the ordinary dist and authenticated fixture untouched.

## Repository blog

Public rendering checks: `node scripts/test-prerender.mjs` from `frontend/`
builds isolated closed/indexable test fixtures and verifies no-JavaScript content,
metadata, private shells, missing-page status, assets and hydration. Port 4176 and
local Chrome are required; the normal dist and deployment settings are untouched.
Run `node --test --test-isolation=none frontend/tests/prerender.node.mjs` for
template assembly guards and `node --experimental-strip-types --test
--test-isolation=none frontend/tests/funnel.node.ts` for outcome-consumer tests.
Only deploy artifacts from a successful complete build. Local preview routing
models the intended static behavior; it does not certify a production host.

Edit typed article records under `frontend/content/blog/`; follow
`frontend/src/content/blog.ts` validation and reuse catalogue blocks for prices.
Do not paste arbitrary HTML or duplicate numeric rates into prose. Keep drafts
marked as drafts; pages and the SEO registry use only the validated non-draft
collection. Run the frontend suite after content/route changes, including the blog
data and browser checks. Confirm source claims, dates, attribution, related links,
image descriptions and mobile tables. Copyable checklists are not tested API code.

Technical review is distinct from publication approval. Before launch, assign an
ongoing human owner for each guide, refresh its sources and secure publication
review under B08/B12/S13. Current owner assignments remain open; do not infer a
partner's acceptance from a role proposal. Drafts must never receive public routes
or sitemap entries, and preview builds remain closed to indexing.
