# ADR-007: Cloudflare Email Sending for account alerts

Status: Accepted
Date: 2026-10-08
Owner: Repository owner

## Context

Customers can enable a low-balance email alert in the dashboard. The Worker already
runs a five-minute cron and holds all server secrets; Supabase Auth only sends its
own authentication emails and cannot send application notifications.

## Options considered

- Resend (HTTP API, separate account and API key).
- Cloudflare Email Sending through a Worker `send_email` binding (public beta,
  Workers Paid plan, domain onboarded to Cloudflare Email Service).
- Store preferences only and send nothing until a provider is chosen.

## Decision

Use Cloudflare Email Sending. `wrangler.jsonc` declares the `EMAIL` binding restricted
to the sender in `ALERT_FROM_EMAIL` (`alerts@aiapi.deals`). The cron step
`low_balance_alerts` claims due alerts in PostgreSQL (`tw_claim_low_balance_alerts`,
skip-locked, disarmed before sending), looks up the recipient with the Supabase
admin API, skips unverified addresses, and re-arms any alert it could not deliver.
If the binding or sender is missing (staging, local), the step does nothing.

## Consequences

- No extra vendor or secret; requires the Workers Paid plan and onboarding
  `aiapi.deals` in Email Service (DNS records) before alerts are delivered.
- The product is in beta; delivery failures are logged as
  `alerts.low_balance_failed` and retried on the next cron run.
- Alert policy (one email per crossing, re-arm on recovery or threshold change) is
  enforced and tested in the database (`tests/dashboard.test.ts`).
