# Organic acquisition operations

Checked **2026-09-20** by Codex for frontend plan S11.3/S11.5. This is a
research and release-check record for the existing public catalogue, model-family
pages and repository guides. It does not activate indexing, register a domain or
search account, change crawler policy, publish content, or send outreach.

## Boundaries and ownership

- **DECIDED:** acquisition is organic only, image and text receive equal attention,
  and the repository blog is the initial editorial surface.
- **DECIDED:** preview and private/account routes stay non-indexable. Public
  indexing remains opt-in and may be enabled only after the S13 launch checks.
- **ASSUMPTION — preparation owner:** JannesG / PlaYa-44, the existing frontend
  owner, prepares the deliverables below and coordinates their local review.
  **OPEN — acceptance:** this proposed assignment has not been accepted by a
  partner and does not assign publication or ongoing maintenance.
- **OPEN B12:** each deliverable needs one accepted human publication/maintenance
  owner before launch. “Frontend/content owner” below is a proposed role, not a
  person who has accepted responsibility.
- **OPEN B09:** the production domain, host and CDN behavior are not selected.
  Local generated-output checks can prove artifact content only; deployed HTTP,
  WAF, bot, redirect, canonical and account-verification behavior require the
  selected production host and authorized domain access.
- **OPEN — training preference owner:** product/legal/content ownership must decide
  whether public material may be used for model training. Search retrieval access
  does not settle that choice. Do not change `robots.txt`, enable a CDN-managed
  policy, or create crawler-specific WAF rules until this owner and preference are
  recorded.

## Current official crawler guidance

The following official sources were read on **2026-09-20**. They describe access
controls and verification steps, not a promise of ranking, inclusion, citation or
traffic.

| Surface | Current guidance and Takewing implication | Official source checked |
| --- | --- | --- |
| Google Search and Google AI features in Search | Googlebot access, indexable responses and applicable preview controls govern ordinary Search and its AI features. Google says crawling, indexing and serving are not guaranteed. A crawler must be allowed to fetch a page to read its `noindex` or snippet controls. At launch, verify raw public HTML, status, canonical and robots directives with URL Inspection after domain verification. | [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works), [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), [robots meta specification](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) |
| Google training/grounding outside Search | `Google-Extended` is a separate control for uses including future Gemini training and does not affect Google Search inclusion or act as a Search ranking signal. Its setting therefore needs the open training-preference decision; it must not be inferred from the desired Search policy. | [Google crawling infrastructure](https://developers.google.com/crawling/docs/about-crawling) |
| Bing Search | Bingbot follows `robots.txt`; Bing documents a root sitemap declaration and a robots tester. At launch, verify the final host is crawlable and submit/inspect the real sitemap through an authorized Bing Webmaster Tools account. Registration and submission are S13 operations, not work completed by this document. | [Create a robots.txt file](https://www.bing.com/webmasters/help/how-to-create-a-robots-txt-file-cb7c31ec), [why a site is not indexed](https://www.bing.com/webmasters/help/why-is-my-site-not-in-the-index-2141dfab) |
| ChatGPT search retrieval | OpenAI says `OAI-SearchBot` access permits content to be considered for summaries/snippets and that `noindex` is needed to suppress even title/link discovery in the case it describes. OpenAI also states that ChatGPT search referrals include `utm_source=chatgpt.com`. Allowing access still does not guarantee discovery or citation. | [OpenAI publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) |
| OpenAI training | OpenAI identifies `GPTBot` separately from `OAI-SearchBot` and directs publishers to disallow GPTBot for pages they want excluded from potential training. The launch owner must decide this independently of ChatGPT search retrieval. | [OpenAI publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) |
| Cloudflare, if selected | Cloudflare can generate managed `robots.txt` rules for known AI crawlers and can separately enforce allow/block policy through AI Crawl Control/WAF. Managed rules can alter the origin's intended behavior, while WAF/bot challenges can return failures even when `robots.txt` allows access. Because Cloudflare and the production host are only candidates, verify settings on the actual zone rather than enabling these features now. | [managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/), [AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/), [WAF precedence](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/) |

No `llms.txt`, “GEO” file, structured-data type or other special file is recorded
as a discovery requirement. Truthful structured data can help consumers understand
a page, but it is not evidence of special ranking or citation treatment.

## Content targets and deliverables

The repository already contains two technically reviewed guides and four model
family pages. The catalogue evidence snapshot is dated 2026-09-20. Every proposed
piece below must reuse that evidence boundary, refresh its linked sources before
publication, and avoid presenting a reference ID as a callable public API ID.
There is currently **no verified equivalent price advantage**: all image
comparisons are unavailable and text candidates still need served-model,
settings, context and token-accounting equivalence. Headlines and distribution
copy must therefore omit savings percentages, “cheaper than” claims and total-cost
claims until B02/S12 provides matching evidence.

| Deliverable | Evidence and intended audience | Target page(s) | Proposed single owner |
| --- | --- | --- | --- |
| Maintain **Understanding text token rates** | Existing guide explains input, output and cache-read components for API builders estimating text workloads. Evidence: repository catalogue plus linked GPT-5.6 family/reference sources. | `/blog/understanding-text-token-rates`, then `/models/gpt-5-6` and `/models` | **ASSUMPTION:** frontend/content owner prepares and refreshes it. **OPEN B12:** owner acceptance and ongoing maintenance. |
| Maintain **Understanding image model request rates** | Existing guide helps image API evaluators distinguish per-request billing from output count, resolution, quality, input and availability. Evidence: repository catalogue plus the linked GPT Image 2 source. | `/blog/understanding-image-model-rates`, then `/models/gpt-image-2`, `/models`, `/status` | **ASSUMPTION:** frontend/content owner prepares and refreshes it. **OPEN B12:** owner acceptance and ongoing maintenance. |
| Draft **Text API cost worksheet: input, output, cache and context tiers** | Builders comparing text workloads need a worked method that retains unknowns and context thresholds. Ground it in the existing text-rate guide and catalogue; use hypothetical arithmetic clearly labelled as such until a Takewing API request is tested. | New blog article; contextual links to `/blog/understanding-text-token-rates`, `/models/gpt-5-6`, `/models/gemini-flash`, `/docs` | **ASSUMPTION:** frontend/content owner prepares the draft. **OPEN B12:** one human owner must accept publication and refresh responsibility. |
| Draft **Choosing an image request configuration without a false per-image quote** | Image automation developers and creative-tool builders need a checklist for model identity, output count, resolution, quality, inputs and current availability. Ground it in the existing image guide and the GPT Image 2/Nano Banana Pro family pages; do not compare quality or speed without tests. | New blog article; contextual links to `/blog/understanding-image-model-rates`, `/models/gpt-image-2`, `/models/nano-banana-pro`, `/status`, `/docs` | **ASSUMPTION:** frontend/content owner prepares the draft. **OPEN B12:** one human owner must accept publication and refresh responsibility. |

These are content opportunities, not a fixed publishing quota. Executable API
examples wait for B08/S12 verification. A price-comparison article should remain
deferred until equivalence and current Takewing offers are proven; once proven,
its evidence must state model/version, settings, unit, source date and excluded
cost components beside the comparison.

## Prepared distribution drafts — not sent

These drafts are useful only after the target page is approved and publicly
reachable. Sending or posting requires explicit authorization. Each item has one
proposed preparation owner; channel ownership and maintenance remain open B12.

### Text guide: developer-community post

> Text-model price tables split input, output and cache reads into different
> units. We made a practical checklist for estimating a workload without treating
> one component as the total request cost. It also keeps context tiers, dates and
> unknown cache behavior visible. Read the guide: [public article URL after launch]

**ASSUMPTION — preparation owner:** frontend/content owner. **OPEN B12 — acceptance:**
no person or community channel has accepted publication or follow-up maintenance.

### Image guide: developer-community post

> A per-request image rate is not automatically a per-image quote. This guide
> shows the evidence to keep beside a rate: output count, resolution, quality,
> inputs, availability and snapshot date. Read the guide: [public article URL
> after launch]

**ASSUMPTION — preparation owner:** frontend/content owner. **OPEN B12 — acceptance:**
no person or community channel has accepted publication or follow-up maintenance.

### Maintainer outreach note for a relevant resource list

> Hello — we prepared a source-linked guide to [text token components / image
> request-rate evidence] for API builders. It avoids unverified savings and
> performance claims and labels dated catalogue references separately from live
> availability. If it fits your resource criteria, here is the public page:
> [approved URL]. No placement or reciprocal link is expected.

**ASSUMPTION — preparation owner:** frontend/content owner selects a genuinely
relevant resource only after launch. **OPEN B12 — acceptance:** an outreach owner
must accept the target, final wording and responsibility for replies. No recipient
has been selected or contacted.

## Release and recurring checks

### Measurement implementation and limits

S11 emits one initial public landing after analytics consent, with only an
allowlisted path and direct/internal/external referral category. It intentionally
does not preserve campaign values, search queries, referrer domains, user IDs or
cross-session attribution. Denied visitors remain unmeasured; late consent can
record the sanitized current-document entry, without pre-consent persistence.

Signup completion, first confirmed credit purchase and first successful API
request have a tested server-outcome consumer boundary only. No source is wired;
demo actions and callbacks emit no conversions. S12 must agree server confirmation,
account ownership, durable deduplication, consent and attribution handling.

Configured local tests intercept the analytics tag and check commands rather than
vendor delivery. GA enhanced measurement/automatic URL, form and site-search
capture must be disabled in the selected property before activation, followed by
real payload verification under S13. Advertising remains off.

### Local artifact gate

Before any deployment, use the indexable production-mode build and the closed
preview build to verify:

1. Every publishable homepage, catalogue, family, blog and update URL has readable
   raw HTML, a distinct title/description, one correct canonical and the intended
   robots directive without running JavaScript.
2. Drafts, missing pages, private/dashboard routes, auth callbacks, search/filter
   variants and the closed preview are excluded or `noindex` as designed. No
   session/account data appears in public artifacts.
3. The generated sitemap contains only canonical publishable routes. Internal
   links resolve, article sources work, structured data matches visible content,
   and neither metadata nor copy claims verified Takewing support, API examples,
   price advantage, customer results, rankings or citations.
4. Hydration preserves the raw content and metadata. Consent rejection/revisit
   creates no unauthorized tracking, and referral query values are not copied
   into events as secrets or personal data.

These checks establish artifact behavior only. They cannot close B09 or prove
what a crawler receives over the public network.

### Deployed-host gate — B09/S13

After the authorized domain, host and CDN are selected, verify from outside the
application session:

1. HTTPS and preferred-host redirects, canonical URLs, status codes (including
   real 404s), `robots.txt`, sitemap content type/status and raw HTML on representative
   public, private, preview, missing and redirected URLs.
2. The origin/CDN/WAF returns the intended response to verified Googlebot, Bingbot
   and OAI-SearchBot traffic without a JavaScript challenge, CAPTCHA or blanket bot
   rule. If Cloudflare is used, inspect managed `robots.txt`, AI Crawl Control,
   Bot/WAF rule precedence and logs on the actual zone. Confirm that CDN output
   does not silently replace repository policy.
3. Only after owner approval, verify the separately chosen Google-Extended and
   GPTBot training preferences. Record the exact deployed directives and decision
   owner; search access alone is not consent to training.
4. With authorized domain access, register/verify Google Search Console and Bing
   Webmaster Tools, submit the canonical sitemap, inspect representative URLs and
   record errors. This work is not complete until performed against the real host.
5. Confirm consent-aware analytics receives real public referrals and deduplicated
   verified funnel outcomes. Treat `utm_source=chatgpt.com` as referral attribution,
   not proof that a specific page was cited. Keep campaigns and advertising tags
   inactive.

### Maintenance cadence

The accepted B12 owner should check source freshness before each publication and
after a model/rate/status change, review crawler/search-console errors after launch,
and periodically update or retire material that no longer matches the served
catalogue. Record observed queries, qualified referrals, signup completion, first
confirmed purchase and first successful API request. Rankings, AI citations and
traffic volume are measured outcomes, never release acceptance criteria.
