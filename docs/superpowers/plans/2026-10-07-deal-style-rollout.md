# AIAPI.deals site-wide style rollout

**Goal:** carry the owner/partner-approved homepage design across all existing public and account pages. Authorization: the final request in Claude's supplied handoff, continued on 2026-10-07.

**Architecture:** preserve React routes, existing page components, authentication and demo data boundaries. Extend existing ordinary CSS by responsibility. The homepage is the visual reference: paper/white surfaces, ink outlines, condensed Archivo headings, restrained yellow highlights, readable mono metadata and rounded controls. Dense account pages use smaller typography than marketing sections.

**Scope:** catalogue and model details; docs, guides, support, policies, status and updates; authentication; dashboard overview, usage, billing, keys and settings; shared navigation, dialogs and controls. Preserve pricing calculations, reference qualifications, error semantics and existing interactions. No backend integration, publication, deployment, commit or push.

## Execution

- [x] Shared foundation: inspect existing styles, preserve the homepage, unify controls/panels/navigation and account shell. Check readable contrast and responsive bounds.
- [x] Public content and authentication: apply the approved typography, section spacing and surfaces to existing page structures; keep documentation/code/table overflow local.
- [x] Catalogue and pricing presentation: reuse existing values and comparison conditions, align card content and actions, use deliberate responsive grids.
- [x] Dashboard: apply consistent card, metric, table and settings styling without changing business behavior; align repeated package/metric content.
- [x] Integration: review actual diffs, render all route families at desktop/mobile plus tablet and wide desktop samples, exercise existing frontend and isolated auth checks, run root typecheck/build.
- [x] Handoff: update FRONTEND.md and the persistent frontend plan with changes, actual verification and remaining boundaries.

## Review criteria

No viewport overflow at 390, 900, 1440 and 2560px; headings and controls do not collide. Repeated cards align within their rows without fixed heights that clip content. Financial displays retain currency, units and approximation/reference information. Keyboard focus, error states, dialogs, menus and tab behavior remain usable. Browser artifacts stay in OS temporary storage, outside Git.

## Progress

DONE for the local styling scope. Existing uncommitted Claude work is preserved
on `feat/deal-style-rollout`. Three bounded GPT-6 Sol workers handled public/auth,
catalogue and dashboard CSS; integration and responsive corrections were handled
by the main agent, with an independent GPT-6 Astra review.

Verification: root `npm run typecheck` and `npm run build` passed (Wrangler dry-run,
not deployment); final frontend build/typecheck passed. Full frontend suite:
204 passed, 16 expected skips. Full isolated auth suite: 76 passed, two expected
desktop-only skips. After final small CSS corrections, affected public/home/blog
checks passed 30 with 16 expected skips; targeted auth checks passed six, then the
final Settings refinement passed both desktop/mobile keyboard/dialog checks.
Live-credential tests are skipped without E2E credentials; isolated fixtures cover
the authenticated UI without contacting real services.

Browser evidence: 29 routes at 390/900/1440/2560px (116 page/width checks), followed
by all 29 at 320px. No runtime errors. Found and fixed the inherited `nowrap` on
tablet documentation tables, narrow blog heading overflow and a 3px homepage
burst overflow. Final scoped recheck of five affected routes at all five widths
passed 25/25 without document overflow or runtime errors. Screenshot inspection
also corrected the narrow Documentation heading, login divider spacing and mobile
Settings tab arrangement. Review caught the hidden white Discord logo, now ink
on its white button. All screenshots/logs are under OS temp `aiapi-style-*`, not Git.

No business logic, financial arithmetic, provider availability or deployment flags
changed. Existing live-integration/pricing/publication gates remain. Normal local
preview is available at port 5173. No commit or push.
