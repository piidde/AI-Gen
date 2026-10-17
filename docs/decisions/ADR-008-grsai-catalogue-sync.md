# ADR-008: Automatic GrsAI catalogue and price sync

Status: Accepted
Date: 2026-10-17
Owner: Repository owner

## Context

Model prices and availability were copied by hand from grsai.com (2026-09-20 frontend
research, 2026-10-06 seed). GrsAI changes prices, closes models for maintenance and adds
models without notice. A stale cost can mean selling below cost; a closed model fails
requests. The owner asked for prices and models to stay current automatically and
decided (2026-10-17):

1. Customers pay **2.0x the acquisition cost**; cost is GrsAI credits bought with the
   USD 150 package (19,980,000 credits on 2026-10-17, so credits / 133,200 USD).
2. The sync rules below.

GrsAI's dashboard is a Next.js app whose bundle calls unauthenticated JSON endpoints on
`https://eb.grsaiapi.com`: `POST /client/serverGrsai/getModelListV2` (every model with
`type`, `costType`, `cost`, `inputTokens`, `outputTokens`, `cacheCost` in credits,
`closeModel`, `maintenance`) and `POST /client/goods/getGoodsList` (credit packages).
Health and announcement endpoints require a login and are not used.

## Options considered

- Scrape the rendered HTML pages: fragile, and the data is already served as JSON.
- Use the undocumented JSON endpoints (chosen): exact credits, no credentials, one
  request each per run. Risk: they can change without notice.
- Ask GrsAI for an official price feed: preferable long term; still open.

## Decision

- **Backend, hourly** (cron `17 * * * *`, `src/upstream-catalog.ts`): fetch both
  endpoints, validate strictly (zod; unknown billing units, missing prices on open models,
  duplicates or a missing USD 150 package fail the run), keep text and image models only
  (video stays out, OD-007), and call `tw_sync_upstream_catalog` (migration
  `20261017140000`). Cost micros = ceil(credits x package USD / package credits).
  In one transaction per run:
  - higher cost: new price version at once (markup kept, so price stays 2x cost);
  - lower cost: pending until an admin applies it;
  - GrsAI closes or drops a model: disabled; re-enabled automatically only if the sync
    disabled it and GrsAI reopens it;
  - new upstream model: added disabled with a candidate price, pending review;
  - a component moving beyond 3x either way: model disabled, pending decision;
  - a list less than half the previous size: run rejected (an admin can accept it).
  Running requests keep their reserved price version. Every automatic enable/disable is
  audited with the system actor. Admins get an email for each run with changes and after
  three consecutive failures; Admin > GrsAI sync shows state, pending changes and history.
- **Public pages, nightly** (`.github/workflows/catalogue-sync.yml`): `npm run
  catalogue:sync` regenerates `frontend/src/content/upstreamSnapshot.ts` (credits and
  closed flags) with the same validation and opens a pull request. Editorial evidence
  (families, official references, gaps) stays hand-written in `catalogue.ts`; a new
  upstream model is published only after it gets a row there.
- Public selling prices use the same formula: credits x 2 / 133,200 USD.

## Consequences

- Production prices for enabled models rise about 7.25% on the first run, because the
  2026-10-06 seed used an assumed 0.14 USD/CNY (credits x 7 micros) instead of the
  USD 150 package (credits x 7.5075 micros).
- At 2x, eight image variants (GPT Image 2 and 2.5 against official Low, and the CL/VIP
  Nano Banana channels) cost more than their official reference. The frontend shows
  this without a savings badge; it conflicts with the earlier rule that our price never
  exceeds the official price and needs an owner decision (per-model markups exist).
- A format change at GrsAI stops price updates (fail closed) until the adapter is fixed;
  the failure alert makes that visible. Enabling a model GrsAI marks closed is refused.
- The public snapshot changes through reviewed pull requests, not automatically.
