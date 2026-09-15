# ADR-001: API-only MVP

Status: Accepted (DECIDED)
Date: 2026-09-15
Owner: Repository owner (explicit product-scope clarification)

## Context

The original bootstrap described both a browser generation interface and public
API at launch, with a browser-first integration milestone. The user explicitly
corrected this: the initial MVP focuses on API only, without a browser chat window.

## Options considered

- Original bootstrap: browser generation interface and public API at launch.
- Explicitly selected scope: API-only MVP.

## Decision and reasons

Focus initial delivery on customer API client -> our API/backend -> private
upstream provider -> our backend -> calling client. Do not build a first-party
chat/generation frontend for the MVP. This reflects the user's clarified launch
scope and removes that UI from the initial engineering milestone.

## Consequences

Validate the first generation flow with an API client or script. The customer
controls where responses appear or how they are processed. Keep upstream access,
pricing, accounting, and security in our backend. A future first-party generation
UI, if adopted, must reuse the same logic.

## Known limitations

This decision does not select a framework, runtime, response format, streaming
transport, or future UI delivery date. It does not define an account/payment
management interface or remove existing billing/security requirements.
The original bootstrap's conflicting launch scope is superseded; retaining that
file is not required to understand this decision. Other unresolved choices remain
in [OPEN_DECISIONS.md](../OPEN_DECISIONS.md).
