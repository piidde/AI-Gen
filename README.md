# AI Gen

An API-only MVP for EU / North American customers, providing a public developer
API backed by a private upstream AI aggregator, with pay-as-you-go prepaid credits.
Customers call our API from their own clients and receive responses there.
A first-party browser chat/generation interface is outside the MVP.

Current implementation: a minimal TypeScript and Node.js starter using npm and
ES modules. Product features and service integrations are not implemented.
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

## Project documentation

- [Agent rules](AGENTS.md) and [contributing](CONTRIBUTING.md)
- [Product scope](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [API contract direction](docs/API.md), [billing](docs/BILLING.md), and [data](docs/DATA.md)
- [Security](docs/SECURITY.md)
- [Open decisions and investigations](docs/OPEN_DECISIONS.md)
- [Architecture decision records](docs/decisions/README.md)

These documents are the permanent repository source of truth. Planned behavior
in the guides is not a claim that it is implemented. The initial bootstrap
specification is no longer required.
