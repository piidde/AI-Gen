# ADR-003: Supabase Auth for the initial browser account flow

- Status: Accepted
- Date: 2026-09-18
- Owner: Samuel

## Context

The Takewing AI frontend needs the smallest usable account flow before the
dashboard can become server-backed. The repository does not yet have an API or
database schema, so the first increment must not invent backend authorization or
account tables.

## Options considered

- Supabase Auth with email/password and selected OAuth providers.
- A custom Node authentication service.
- A second auth platform or a frontend-only mock.

## Decision

Use Supabase Auth from the React/Vite browser client with the publishable key
only. The initial providers are email/password and Google OAuth. The client also
supports email confirmation, password reset, callback handling, session
persistence, protected dashboard navigation and logout. Discord is deferred.

## Reasons

This keeps the first account flow small, uses the already configured Supabase
project, and avoids putting privileged credentials in the browser. It also gives
the later API a standard token source without pretending that server-side
authorization already exists.

## Consequences and known limitations

The frontend now needs browser-safe Supabase environment variables and the
Supabase Auth redirect allow-list must include the local and future deployment
origins. The dashboard still shows fictional data. Backend token verification,
account/profile persistence, RLS, production session strategy and provider
selection beyond Google remain open work.
