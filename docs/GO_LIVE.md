# Go-live checklist

Steps that need the owner's accounts before the live dashboard works end to end.
The code needs no further changes for these; each step is an operator action.
Run them in order and tick them off here (or in the release notes).

## 1. Database

- [x] `dashboard_live` and `responses_api` migrations are applied to the Supabase
      project `pwaiidpiymmeppxebfjd` (`npx supabase db push` with the project linked,
      or paste it into the SQL editor). Earlier migrations are already applied.
- [x] `20261010120000_admin_panel.sql` was applied through the SQL editor on 2026-10-09
      (functions verified present). The editor records no history: run
      `npx supabase migration repair --status applied 20261010120000` once (project linked)
      before any `db push`, or the `drop function` in it fails on re-run.
- [ ] Check that browser roles still have no table access:
      `select has_table_privilege('authenticated', 'private.account_preferences', 'select');` returns `false`.

## 2. Worker secrets (`npx wrangler secret put <NAME>`)

Already required by the backend; confirm each one exists in production:

- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `STRIPE_SECRET_KEY` (test-mode key) and `STRIPE_WEBHOOK_SECRET`
      (set 2026-10-09; switch both to live values for real payments, see section 3)
- [x] `GRSAI_KEYS_JSON`, `PAYLOAD_ENCRYPTION_KEY`, `IDEMPOTENCY_HMAC_SECRET`
- [x] `ADMIN_USER_IDS` (three admin user IDs, set 2026-10-09)

## 3. Stripe

- [x] Test-mode webhook endpoint `https://aiapi.deals/stripe/webhook` with events
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
      `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
      Created 2026-10-09; repeat in live mode with `sk_live_` keys and a separate live
      webhook (needs an activated Stripe account).
- [ ] Enable customer email receipts (Settings → Customer emails → Successful payments).
- [ ] Run one test-mode purchase (card 4242 4242 4242 4242, signed in at aiapi.deals): the dashboard should show "Confirming your payment",
      then the payment as Paid, the balance increased, and a working Receipt link.

## 4. Email alerts (Cloudflare Email Sending)

- [ ] Workers Paid plan on the account.
- [ ] Onboard `aiapi.deals` in Cloudflare Email Service and add its DNS records.
- [ ] After deploy, set a threshold above your balance in Settings → Notifications;
      an email from `alerts@aiapi.deals` should arrive within about five minutes.

## 5. Catalogue, offers and status (admin panel or admin API)

Apply migration `20261010120000_admin_panel.sql` before deploying the Worker that uses
it. Signed in as an `ADMIN_USER_IDS` user, `/dashboard/admin` covers the steps below
except official prices and incidents, which remain API-only.

- [ ] Enable models and prices: `POST /v1/internal/models/{id}` (only verified prices).
- [ ] Optional savings reference: `POST /v1/internal/models/{id}/official-prices`.
      Without it, Overview shows "No settled requests can be compared" instead of a number.
- [ ] Credit offers: `POST /v1/internal/offers` (EUR and/or USD). Until then Billing says
      "Credit purchases are not open yet".
- [ ] Platform controls: `POST /v1/internal/provider` (budget, markup, accepting requests).
- [ ] Incidents, when needed: `POST /v1/internal/incidents`.

## 6. Deploy and smoke test

- [ ] `npm run build` (typecheck, frontend build, `wrangler deploy --dry-run`), then `npm run deploy`.
- [ ] Sign in at https://aiapi.deals/dashboard: Overview, Requests, Billing, API keys,
      Settings and Models load without errors.
- [ ] Create an API key, call `POST /v1/chat/completions` with it, then see the request
      in Requests and the charge in Overview. Revoke the key and confirm calls return 401.
- [ ] Export CSV from Requests; save billing details and notification preferences and
      confirm they survive a reload.

Not part of this release (decided 2026-10-08): self-service account deletion
(support handles it) and invoices (Stripe receipts only). See OD-016 and OD-003 in
[OPEN_DECISIONS.md](OPEN_DECISIONS.md).
