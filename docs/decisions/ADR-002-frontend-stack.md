# ADR-002: Separate React frontend with Vite

- Status: Accepted
- Date: 2026-09-16
- Owner: JannesG / PlaYa-44

## Context and options

Transfer Takewing AI's accepted seven-screen design into a maintainable frontend
while backend contracts and hosting are unresolved. Considered a standalone
React/TypeScript/Vite app and a framework with integrated server rendering.

## Decision and reasons

Use React, TypeScript, Vite and React Router under `frontend/`, ordinary CSS,
shared visual variables and a small set of components. Keep its dependencies,
lockfile and browser compilation separate from the existing Node starter.
The owner confirmed this choice before scaffolding.

This supports local visual implementation without choosing a backend runtime,
hosting platform, UI kit or global state framework. React Router provides real
routes, direct local navigation, browser history and missing-page handling.

## Consequences and limitations

This increment uses explicit fictional fixtures and local interaction state.
It defines no network, auth, pricing, payment or key-lifecycle contract.
Generation remains API-only. No deployment is authorized or configured.

Public-page indexing/prerendering must be settled before launch; this client
application currently uses `noindex`. A future static host needs an application
route fallback. A rendering framework remains an option if public content needs
justify changing the approach. Fonts are bundled locally; third-party asset
licenses accompany the build. Research and screenshots remain outside Git.
