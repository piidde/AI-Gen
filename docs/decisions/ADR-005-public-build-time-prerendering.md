# ADR-005: Build-time prerendering for public routes

- Status: Accepted for the frontend approach by JannesG / PlaYa-44 on 2026-09-20
- Date: 2026-09-20
- Owner: Frontend workstream; deployment coordination with Samuel (SEO) and hosting owners under B09

## Context

The accepted public-rendering requirement needs readable content and route metadata
in initial HTML. Today `index.html` has an empty root and unconditional noindex;
browser effects later write metadata. `_redirects` sends all known routes to the
same index. This is the source-code risk F-001, not evidence of a deployed failure.
Private account routes must remain client-rendered and non-indexable.

Public models, blog and update content will come from build-known repository data.
The app currently uses React Router's declarative mode, React 19 and Vite. Preserve
the approved components and partner auth; no hosting runtime has been selected.

## Options considered

| Option | Benefit | Cost / conclusion |
| --- | --- | --- |
| Vite server build plus React static prerender API | Reuses components and installed tooling; outputs ordinary static files; no production render server | Own a small route renderer, build assembly and hydration tests. Recommended for the finite public route set. |
| React Router framework-mode prerendering | Built-in prerender and SPA fallback conventions | Requires adopting its Vite plugin/route module conventions and revisiting existing routing. Reconsider if custom build orchestration grows; broader than the present need. |
| Playwright browser snapshots after a client build | Can run current browser effects with isolated browser contexts | Makes builds depend on Chrome, lifecycle timing, consent/auth initialization and DOM cleanup. A browser snapshot is not a guarantee of React-compatible hydration. Retain Playwright for verification. |
| Request-time SSR or another framework | Supports dynamically rendered public requests | Adds runtime/deployment or migration scope without a current requirement; static publication is sufficient. |
| Metadata-only HTML templates | Smallest head-only change | Leaves content absent without JavaScript; does not meet the accepted requirement. |

## Decision

Use Vite's production server build for a public render entry, then React's
`prerender` from `react-dom/static` to produce HTML at build time. The server build
is a build artifact only; deployment remains static. Do not use a dev-server module
loader as the production publishing pipeline. No new runtime dependency is proposed.

The frontend owner explicitly accepted this approach and closing S01.5/Stage 1.
S11 implements the pipeline; hosting-specific coordination remains under B09/S13
and does not block this frontend choice. S01.5 records the design and feasibility
evidence; it does not enable indexing or claim F-001 fixed.

### Render and hydration boundary

- Share public route definitions/components between the browser and render entry;
  do not maintain a second copy of page markup. Use a StaticRouter for build URLs.
  Render only allowlisted published paths. Drafts, queries, private routes and
  unsupported slugs must not become public output files.
- Exclude Supabase initialization and account/session data from the public render
  entry. Rendering must not use a signed-in browser, network credentials, local
  storage, analytics initialization or live account calls. Auth stays in the browser.
- Public components must produce deterministic initial output. Use `hydrateRoot`
  on prerendered public markup, and `createRoot` for the private SPA shell. Preserve
  the same component/provider structure and useId output on the first browser render.
- Query-filter URLs serve canonical unfiltered HTML. Hydrate that same initial
  filter state, then apply actual URL filters after hydration. Current Models reads
  useSearchParams immediately: S11 must adapt that initialization and test it; do
  not suppress hydration warnings or erase the URL to conceal a mismatch.
- Keep browser-only effects outside the build renderer. Consent starts hidden in
  both initial renders and reads stored preferences after hydration. Browser timezone,
  session and relative-time content must not change initial public markup.

### Output, metadata and F-001 remediation

1. Produce `index.html` for `/` and `<route>/index.html` for each public route. Build
   the route inventory from actual published content plus the metadata registry.
   Validate unique output paths/slugs and reject path traversal or collisions.
2. Keep a separate restrictive `spa.html` for known auth/dashboard/legacy SPA routes.
   Never rewrite them to the now-public homepage HTML. Unknown URLs must reach a
   real host 404 response, not a blanket SPA fallback.
3. Extract shared pure metadata/JSON-LD generation from today's DOM-writing helpers.
   Build HTML and browser navigation must use the same titles, descriptions,
   canonicals, social tags and robots policy. Escape HTML and script data correctly.
4. Write the correct robots directive directly into every artifact. Preview/demo
   builds stay noindex everywhere. Only release-eligible public pages in an explicitly
   indexable build may emit index/follow. Auth/private/missing pages stay noindex.
   Remove the need to relax an initial noindex tag with browser JavaScript.
5. Preserve built asset URLs/preloads/styles in every nested document. Keep the
   render bundle/intermediate files outside the deployable directory. Fail the build
   if an expected page or metadata is missing; never publish partial/stale output.

### Host and ownership handoff

Static output does not settle OD-004. Confirm with hosting owners how canonical
extensionless URLs, directory indexes, trailing slashes, private SPA rewrites,
404 statuses, headers and legacy query redirects work on the selected host.
Generated `_redirects` rules must serve route-specific public HTML instead of the
current single `/index.html`; their precedence must be tested on that host.

Samuel reviews compatibility with ADR-004, the metadata registry and organic-only
measurement. Hosting owners verify B09 behavior. The frontend owner implements
and tests the build/hydration changes in S11. No message has been sent and no
partner approval or production domain is claimed by the frontend owner's acceptance.

## Evidence and limits

S11 implementation (2026-09-20): `entry-public.tsx`, the Vite post-client-build
renderer and BrowserApp now implement this boundary. Two isolated build modes
exercise all 18 public paths without JavaScript, account shells and unknown 404s.
Shared metadata and explicit public/spa rewrites replace the single-index output.
Template markers and final content are checked; React static output has no SVG
multi-child title warnings after the UsageChart correction. Browser hydration and
account regression evidence is recorded in V-018 of the implementation plan.
Bundling React Router emits its upstream `use client` directive warning; this is
a static React build, not an RSC boundary. Host/indexing/publication gates remain.

On 2026-09-20, an in-memory Node probe in `frontend` used installed Vite's
`createServer({server:{middlewareMode:true},appType:'custom'})`, `ssrLoadModule`
for Home/Models/Information, StaticRouter/Routes and React `prerender`. Reading the
returned prelude produced an h1 for all eight current public routes:
`/`, `/models`, `/docs`, `/support`, `/status`, `/contact`, `/privacy`, `/terms`.
The Vite server was closed in finally. No artifact was published or build changed.

This proves component-level rendering feasibility, not production asset assembly,
metadata, hydration, hosting or content readiness. Homepage rendering reported
seven warnings from UsageChart's SVG title with multiple JSX children. F-011
tracks normalizing each title to one string and checking accessible chart output
before the S11 build is accepted. Other routes produced no reported warnings.

## S11 acceptance checks

- Two isolated builds: closed preview and test-only indexable mode. Fetch raw HTML
  without JS for all public/auth/unknown route categories. Verify content, one h1,
  unique metadata, canonical, robots, JSON-LD policy, styles/assets and no private data.
- Hydrate direct and query-filter URLs with no recoverable hydration errors; test
  public-to-private navigation, back/forward, persisted consent, filter focus and
  copy dialogs on desktop/mobile. Keep account auth guards unchanged.
- Reconcile generated routes, sitemap and rewrites; exclude drafts/filter variants;
  test true 404 and redirect behavior against the actual chosen host at S13.
- Do not enable deployed indexing until content, prices, domain and release gates
  are verified. Build-time rendering does not prove search rankings or AI citations.

## Primary sources checked 2026-09-20

- [Vite SSR and static prerendering](https://vite.dev/guide/ssr): supports build-time
  rendering of known routes; exposes low-level APIs that the application must own.
- [React static prerender](https://react.dev/reference/react-dom/static/prerender):
  generates static HTML and waits for suspended content.
- [React hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot):
  initial browser output must match the rendered HTML.
- [React Router prerendering](https://reactrouter.com/how-to/pre-rendering) and
  [framework modes](https://reactrouter.com/start/modes): framework-mode alternative.
- [Playwright browser isolation](https://playwright.dev/docs/browser-contexts):
  clean contexts support tests but do not resolve snapshot/hydration concerns.
