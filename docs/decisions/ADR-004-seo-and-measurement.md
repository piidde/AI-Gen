# ADR-004: Opt-in search indexing with consent-gated measurement

- Status: Accepted
- Date: 2026-09-18
- Owner: Samuel

## Context

The frontend needs the technical groundwork for search visibility and paid
acquisition before launch: per-route metadata, canonical URLs, structured data,
a sitemap, a crawl policy, and analytics/advertising tags.

Building that groundwork conflicts with the current state of the site. The
demo publishes fictional model prices, carries explicit "unverified" labels, and
serves no live service. The production host is still unresolved (OD-004), so no
canonical domain is confirmed. Indexing the site as it stands would place
unverified pricing into search results, where the surrounding disclaimers do not
travel with the snippet.

Measurement carries a separate constraint. The service targets EU customers, so
ePrivacy and GDPR require consent before analytics or advertising cookies, and
Google Consent Mode v2 additionally requires `ad_user_data` and
`ad_personalization` signals for EEA traffic.

## Options considered

- Enable indexing and tags now, and correct the content later.
- Defer all SEO and measurement work until the service is live.
- Build the full infrastructure, but gate activation behind configuration.

## Decision

Build the complete SEO and measurement infrastructure, and gate its activation
on environment configuration rather than on code changes.

- `VITE_SITE_INDEXABLE` defaults to false. A build that is not explicitly marked
  indexable emits `noindex, nofollow` on every route, ships a blanket-disallow
  `robots.txt`, publishes an empty sitemap, and emits no structured data.
- Per-route metadata lives in a single registry (`src/seo/routes.ts`) that drives
  titles, descriptions, canonicals, robots directives and sitemap entries.
- Account and dashboard routes are marked non-indexable permanently, independent
  of the deployment flag.
- Analytics and advertising tag IDs are configuration. When unset, no
  third-party script loads and no consent banner appears. When set, Consent Mode
  defaults are established before any tag loads, and the tag script is requested
  only after the visitor consents.
- Structured data describes the organization, the website and breadcrumbs only.
  No `Product` or `Offer` markup is emitted while prices remain unverified.

## Reasons

Gating on configuration separates the engineering work, which can be reviewed and
tested now, from the business decision to go public, which depends on unresolved
items. Launch becomes a configuration change on a verified deployment rather than
a code change under time pressure.

Defaulting to closed means the failure mode of forgetting the flag is an
unindexed site, not fictional pricing in search results. The reverse default
would make an accidental public preview a content and advertising-policy problem.

Keeping metadata in one registry prevents the common drift where a route exists
in the router but not in the sitemap, or carries a canonical URL copied from
another page.

## Consequences

- Launch requires setting `VITE_SITE_ORIGIN` and `VITE_SITE_INDEXABLE=true` on
  the production deployment, and verifying the served `robots.txt`.
- Adding a public route now means adding a registry entry; a route without one
  falls back to non-indexable, which is safe but invisible.
- Content topics moved from `?topic=` parameters to their own paths (`/docs`,
  `/privacy`, …), so each can rank independently. The parameter form still
  resolves. A permanent redirect for that legacy query form must be configured
  using the selected host's query-redirect mechanism after OD-004.
- The consent banner occupies bottom screen space once a tag ID is configured.

## Known limitations

Update from the 2026-09-20 frontend review: public content prerendering is now
accepted direction, with the specific mechanism/deployment still to be decided.
Organic acquisition only is selected. The original expectation that enabling the
flag alone completes indexing is not sufficient: initial HTML contains noindex
that runtime JavaScript removes, a crawler risk tracked as F-001 in the
[implementation plan](../superpowers/plans/2026-09-20-frontend-implementation-plan.md).
Resolve it and verify raw production HTML before activation. These are planned
follow-ups, not claims that the implementation below has changed.

- The application is client-rendered. Google executes JavaScript, but other
  crawlers and most social scrapers do not, so they see only the static
  `index.html` metadata. If organic search becomes a primary acquisition channel,
  pre-rendering or server-side rendering for public routes should be evaluated;
  that is a larger change and is deliberately not made here.
- `_headers` and `_redirects` target static hosts that read those files. If
  OD-004 selects a different runtime, they must be translated.
- The published content is still placeholder text. Metadata quality cannot
  compensate for pages that do not yet answer a query.
