# AI Gen

An API-only MVP for EU / North American customers, providing a public developer
API backed by a private upstream AI aggregator, with pay-as-you-go prepaid credits.
Customers call our API from their own clients and receive responses there.
A first-party browser chat/generation interface is outside the MVP.

Current implementation: a TypeScript/Node.js starter plus a separate Takewing AI
React frontend in `frontend/`. The seven reviewed screens run with explicit
fictional demo data. Backend features and service integrations are not implemented.
Supabase, Stripe, and Cloudflare are working directions, not installed integrations
or finalized architecture choices.

## Requirements

- Node.js 24 or newer (Node.js 24 is selected in `.nvmrc`)
- npm

## Getting started

Run `npm ci` to install the locked dependencies, then `npm run dev` to run
`src/index.ts` and restart automatically when source files change.

The starter requires no environment variables and does not load `.env` files.
`.env.example` documents anticipated integration names with empty values; it is
not an implemented configuration contract.

## Commands

- `npm run dev` — run TypeScript in watch mode.
- `npm run typecheck` — check types without generating files.
- `npm run build` — compile source files into `dist/`.
- `npm start` — run the compiled application after building.

Development uses `tsx`, which does not check types; run `npm run typecheck`
to validate them. The build also checks types before emitting JavaScript.

Add application code under `src/`. Use `.js` extensions in relative imports
(for example, `import { helper } from "./helper.js"`) so compiled ES modules
run in Node.js. The compiler uses strict checking and NodeNext module settings;
see the [TypeScript configuration reference](https://www.typescriptlang.org/tsconfig/).

## Takewing AI frontend

From the repository root, run `npm --prefix frontend ci`, then
`npm --prefix frontend run dev`. Open the localhost URL printed by Vite (normally
`http://127.0.0.1:5173`). The root Node starter and its commands are unchanged.

- `npm --prefix frontend run typecheck` — check browser application types.
- `npm --prefix frontend run build` — typecheck and build into `frontend/dist/`.
- `npm --prefix frontend run preview` — serve the frontend build locally.
- `npm --prefix frontend test` — build and run desktop/mobile Playwright tests.
  Tests use locally installed Google Chrome, start a preview on port 4173,
  and write failure artifacts to the OS temporary directory, outside the repo.

Routes: `/`, `/models`, `/dashboard`, and `/dashboard/{models,usage,billing,api-keys,settings}`.
Documentation, support, legal and sign-in links lead to explicit pending-content
notices. Unknown routes show a missing-page screen. Browser Back and direct local
route loads work; a future static host must serve `index.html` for application
routes. No hosting or deployment has been selected.

Demo fixtures live in `frontend/src/demo/fixtures.ts`. Filters, tabs and dialogs
work locally. Key creation/revocation, purchases and profile saves do not change
an account; reloading resets the demo. No credentials or environment variables
are needed. The frontend does not consume `.env.example` or call the upstream.
Public indexing remains disabled with `noindex` until content and integrations
are ready. See [frontend scope](docs/FRONTEND.md) for boundaries and limitations.

## Project documentation

- [Agent rules](AGENTS.md) and [contributing](CONTRIBUTING.md)
- [Product scope](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [Frontend scope](docs/FRONTEND.md)
- [API contract direction](docs/API.md), [billing](docs/BILLING.md), and [data](docs/DATA.md)
- [Security](docs/SECURITY.md)
- [Open decisions and investigations](docs/OPEN_DECISIONS.md)
- [Architecture decision records](docs/decisions/README.md)

These documents are the permanent repository source of truth. Planned behavior
in the guides is not a claim that it is implemented. The initial bootstrap
specification is no longer required.
