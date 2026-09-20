# AI Gen

An API-only MVP for EU / North American customers, providing a public developer
API backed by a private upstream AI aggregator, with pay-as-you-go prepaid credits.
Customers call our API from their own clients and receive responses there.
A first-party browser chat/generation interface is outside the MVP.

Current implementation: a TypeScript/Node.js starter plus a separate Takewing AI
React frontend in `frontend/`. The seven reviewed screens run with explicit
fictional demo data, and the initial Supabase Auth browser flow supports Google,
configuration-gated Discord, email/password, confirmation, password reset and
logout. Backend features and service integrations are not implemented.
Supabase/PostgreSQL, Stripe, and
Cloudflare remain the documented directions for later slices.

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

For local browser auth, copy `frontend/.env.example` to the ignored
`frontend/.env.local` and set the Supabase project URL and publishable key. Add
the local app origins (for example `http://127.0.0.1:5173` and
`http://localhost:5173`) to Supabase Auth's URL configuration. OAuth client
secrets remain in the Supabase provider settings and never belong in the frontend.

To prepare Discord sign-in, register the exact Supabase callback
`https://<project-ref>.supabase.co/auth/v1/callback` in the Discord application,
enable Discord in Supabase Auth with the Discord client ID and secret, and add
the app's `/auth/callback` URL to Supabase Auth's redirect allow list. Only then
set `VITE_AUTH_DISCORD_ENABLED=true`. That variable merely reveals the browser
button; it is not a credential or a provider configuration.

- `npm --prefix frontend run typecheck` — check browser application types.
- `npm --prefix frontend run build` — typecheck and build into `frontend/dist/`.
- `npm --prefix frontend run preview` — serve the frontend build locally.
- `npm --prefix frontend test` — build and run desktop/mobile Playwright tests.
  Tests use locally installed Google Chrome, start a preview on port 4173,
  and write failure artifacts to the OS temporary directory, outside the repo.

Routes: `/`, `/models`, `/docs`, `/support`, `/status`, `/contact`, `/privacy`,
`/terms`, `/login`, `/signup`, `/forgot-password`, `/update-password`,
`/auth/callback`, `/dashboard`, and `/dashboard/{models,usage,billing,api-keys,settings}`.
The dashboard routes require a Supabase session. Documentation, support and legal
routes lead to explicit pending-content notices; the older `/information?topic=`
links still resolve to the same content. Unknown routes show a missing-page
screen. Browser Back and direct local
route loads work; a future static host must serve `index.html` for application
routes. No hosting or deployment has been selected.

Demo fixtures live in `frontend/src/demo/fixtures.ts`. Filters, tabs and dialogs
work locally. Key creation/revocation and purchases do not change an account;
the authenticated display name persists through Supabase Auth user metadata.
Public pages need no auth, while auth and dashboard routes use the browser-safe
Supabase variables. The frontend does not call the upstream.
Search indexing is opt-in and **disabled by default**. Titles, descriptions,
canonical URLs, structured data, `robots.txt` and `sitemap.xml` are generated from
one route registry, but stay inactive until a deployment sets
`VITE_SITE_INDEXABLE=true`. Leave it off while the catalogue shows fictional
prices. Before launch, also resolve the initial-HTML noindex risk and public
prerendering work tracked in the implementation plan; the flag alone has not been
verified sufficient. Analytics and advertising tags are likewise inert until their IDs are
configured, and never load before the visitor consents. See
[ADR-004](docs/decisions/ADR-004-seo-and-measurement.md) for the decision and
[frontend scope](docs/FRONTEND.md) for the launch checklist and limitations.

## Project documentation

- [Agent rules](AGENTS.md) and [contributing](CONTRIBUTING.md)
- [Product scope](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [Frontend scope](docs/FRONTEND.md)
- [Frontend MVP Implementation Plan and persistent log](docs/superpowers/plans/2026-09-20-frontend-mvp.md)
- [API contract direction](docs/API.md), [billing](docs/BILLING.md), and [data](docs/DATA.md)
- [Security](docs/SECURITY.md)
- [Open decisions and investigations](docs/OPEN_DECISIONS.md)
- [Architecture decision records](docs/decisions/README.md)

These documents are the permanent repository source of truth. Planned behavior
in the guides is not a claim that it is implemented. The initial bootstrap
specification is no longer required.
