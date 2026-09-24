# Model and pricing evidence

Checked **2026-09-20** by Codex for frontend plan S02.1/S02.2. This is a dated
research record, not an enabled Takewing catalogue or a backend price contract.
S02.2's numeric reference rates and comparison exclusions are recorded below;
S02.3 supplies the typed reference dataset. Existing application prices remain fictional
until S03 consumes reviewed content; no new price has been published.

## Evidence boundaries

- **Verified listing:** a public source names the model or documents a parameter.
- **Verified identity:** an official provider documents that exact identifier.
  Matching names do not independently verify the model served by the intermediary.
- **Awaiting evidence:** alias, channel, capability or comparison is unresolved.
- **Unavailable notice:** an upstream announcement reports an outage; this is
  neither a live probe nor Takewing monitoring.

No authenticated API calls, generations, payments or account mutations were made.
No latency, reliability, output quality, refund execution or account-specific
access was measured. All rows still require Takewing support approval under B01
and integration evidence under S12. Do not translate a listing into `available`.
Public API IDs remain a backend-owned decision; upstream IDs below are internal
research identifiers, not customer integration instructions.

## Complete image/text inventory

The [GRSAI directory](https://grsai.com/dashboard/models) lists 15 image and
14 text entries. Its remaining video entry is outside scope. Snapshot date applies
to every row. Image billing is per request; text billing separates input/output
per million tokens, with cache rates shown for GPT text entries only. Missing
cache evidence means unknown, not free. Image counts per billable request still
need verification before translating the unit to `images` in view data.

Family/provider grouping below follows official sources in the identity section;
it does not assert a verified upstream routing implementation.

### Image variants

Resolution labels are the directory's advertised options, not measured outputs.
`?` means the listing does not establish the constraint. Gaps reference the next
section. Every row has image output; editing/input limits require the documented
request format and integration checks below.

| Upstream ID | Family / provider | Listed resolution | Gap |
| --- | --- | --- | --- |
| `gpt-image-2.5` | GPT Image 2.5 / OpenAI | 1K | A1 |
| `gpt-image-2.5-sunburst` | GPT Image 2.5 / OpenAI | 1K/2K/4K | A2 |
| `gpt-image-2.5-flare` | GPT Image 2.5 / OpenAI | 1K/2K/4K | A2, A3 |
| `gpt-image-2-vip` | GPT Image 2 / OpenAI | 1K/2K/4K | A4 |
| `gpt-image-2` | GPT Image 2 / OpenAI | 1K | — |
| `nano-banana-pro` | Nano Banana Pro / Google | 1K/2K/4K | A5 |
| `nano-banana-2-lite` | Nano Banana 2 Lite / Google | ? | A6 |
| `nano-banana-2` | Nano Banana 2 / Google | 1K/2K/4K | A5 |
| `nano-banana-fast` | Nano Banana / Google, disputed | ? | A6 |
| `nano-banana-2-cl` | Nano Banana 2 / Google | 1K | A5, A7 |
| `nano-banana-pro-cl` | Nano Banana Pro / Google | 1K | A5, A7 |
| `nano-banana-2-2k-cl` | Nano Banana 2 / Google | 2K | A5, A7 |
| `nano-banana-pro-4k-vip` | Nano Banana Pro / Google | 4K | A5, A7 |
| `nano-banana-pro-vip` | Nano Banana Pro / Google | 1K/2K | A5, A7 |
| `nano-banana-2-4k-cl` | Nano Banana 2 / Google | 4K | A5, A7 |

### Text variants

All have text output in the upstream inventory. Official identity evidence is
linked below; upstream context/output limits, vision inputs, tools, structured
outputs, reasoning options and streaming behavior remain unverified per variant.
Do not inherit all official-provider features into our catalogue.

| Upstream ID | Family / provider | Official ID check |
| --- | --- | --- |
| `gpt-6-astra` | GPT-6 / OpenAI | Same ID, O1 |
| `gpt-5.6-terra` | GPT-5.6 / OpenAI | Same ID, O1 |
| `gpt-5.6-sol` | GPT-5.6 / OpenAI | Same ID, O1 |
| `gpt-5.5` | GPT-5.5 / OpenAI | Same ID, O2 |
| `gemini-3.5-flash` | Gemini Flash / Google | Same ID, G1 |
| `gemini-3.1-flash-lite` | Gemini Flash-Lite / Google | Same ID, G1 |
| `gemini-3.5-flash-lite` | Gemini Flash-Lite / Google | Same ID, G1 |
| `gemini-3.7-flash` | Gemini Flash / Google | Same ID, G1 |
| `gemini-3.8-flash` | Gemini Flash / Google | Same ID, G1 |
| `gemini-3.1-pro` | Gemini Pro / Google | Preview suffix differs, A8 |
| `gemini-3-flash` | Gemini Flash / Google | Preview suffix differs, A8 |
| `gemini-3-pro` | Gemini Pro / Google | Retired candidate, A8 |
| `gemini-2.5-flash` | Gemini Flash / Google | Same ID, G1 |
| `gemini-2.5-pro` | Gemini Pro / Google | Same ID, G1 |

## Identity, capability and availability findings

### OpenAI evidence

- **O1:** [OpenAI model catalogue](https://developers.openai.com/api/docs/models)
  documents the three listed Astra/Sol/Terra identifiers. It also lists
  `gpt-5.6` as Sol's alias; this does not authorize adding another upstream ID.
- **O2:** [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5)
  documents text input/output and image input, with a dated snapshot. The upstream
  listing does not establish which snapshot or official feature subset is served.
- **O3:** [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2)
  documents generation/editing from text and image inputs. `-vip` is not an
  official variant identified by this page; retain it as an upstream channel.
- **O4:** [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
  and [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
  both document image generation/editing and quality values
  `low`, `medium`, `high`, `xhigh`, `max`, `auto`. Their token rates do not establish
  a fixed official cost for an upstream per-request image offer. The official
  pages explicitly distinguish 2.5 token consumption from the GPT Image 2 calculator.

### Google evidence

- **G1:** [Google model catalogue](https://ai.google.dev/gemini-api/docs/models)
  documents the seven exact-ID Gemini text matches above. It uses
  `gemini-3.1-pro-preview` and `gemini-3-flash-preview` for the two preview families.
- **G2:** [Nano Banana 2](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image)
  is `gemini-3.1-flash-image`. Official output options include 0.5K/1K/2K/4K;
  do not add 0.5K to Takewing based solely on Google's support. Generation and
  editing are documented, but intermediary parameters still require verification.
- **G3:** [Nano Banana Pro](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image)
  is `gemini-3-pro-image`, with image/text input and image/text output. Google
  documents thinking and search grounding; neither is proven through our upstream.
- **G4:** [Nano Banana 2 Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image)
  is `gemini-3.1-flash-lite-image`, with generation/editing and 1K output;
  2K/4K are unsupported. Google's latency claim is not a Takewing response-time
  guarantee. Its aspect-ratio prose mentions 14 while enumerating ten; do not
  publish a count without confirming the actual accepted parameters.
- **G5:** [Google deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
  records June 25, 2026 shutdown dates for both image preview IDs, March 9 for
  `gemini-3-pro-preview`, and October 2 for `gemini-2.5-flash-image`. The page says
  dates may be earliest shutdown dates. Treat these as lifecycle evidence to
  reconcile, not proof of the intermediary's current routing or health.

### Gaps and required resolution

The [upstream announcements](https://grsai.com/dashboard/announcements) were
checked alongside the directory. Announcement timestamps have no verified
timezone; retain their displayed dates without inventing UTC instants.

| Gap | Evidence and implication | Owner / closure evidence |
| --- | --- | --- |
| A1 | Bare `gpt-image-2.5` has no established official counterpart in the checked catalogue/pages. Fetching its guessed official model URL failed. Do not assume Flare or Sunburst. | B01 upstream owner: identify actual model/settings before comparison. |
| A2 | September 19 announcement reports Flare/Sunburst maintenance; no later restoration was present in the checked list. | Operations: fresh restoration/probe before offering these as available. |
| A3 | Flare's upstream quality list is narrower than O4. Official options cannot fill this gap. | API owner: confirm accepted quality values and charging for each. |
| A4 | GPT Image 2 VIP is an intermediary channel, not a verified official model ID. | API owner: confirm underlying model, output settings and limits. |
| A5 | Banana 2/Pro directory descriptions still name preview versions, while G2/G3 document stable IDs and G5 gives preview shutdown dates. | API owner: identify the served version; do not silently substitute stable prices. |
| A6 | July 1 announcement remaps `nano-banana-fast` to Lite and removes `nano-banana`; the English directory retains the earlier Flash Image description. | API owner: resolve identity and supported resolution. Preserve old request identity separately. |
| A7 | CL/VIP names establish neither a speed guarantee nor verified routing. June 24 announcement excludes policy refunds, conflicting with directory badges. | API/billing owners: channel identity, billable rejection evidence and support choice; B01/B02/OD-009. |
| A8 | Two Google text aliases omit `-preview`; `gemini-3-pro` also conflicts with the official candidate's retirement. | API owner: exact version mapping; no automatic comparison or retirement inference from name alone. |

The September 9 announcement removes `gpt-5.4`; keep it and `nano-banana` out
of the candidate active inventory, while preserving historical references.
No other row is proven healthy merely because there is no outage notice.
No independently verified CL/VIP speed/stability benchmark was found in these
sources. Do not publish those adjectives as comparative Takewing claims.

## Request-format evidence and limitations

The upstream-linked Apifox pages document separate formats:

- [Banana generation](https://qmy27nhsd9.apifox.cn/452392911e0)
  uses image references, an aspect ratio and `imageSize` in its example.
- [GPT image generation](https://qmy27nhsd9.apifox.cn/452409160e0)
  instead illustrates pixel dimensions in `aspectRatio` plus `quality`.
- [Chat completions](https://qmy27nhsd9.apifox.cn/452418916e0)
  illustrates messages and `stream: false`, and lists a streaming response.

The extracted pages omit field-schema detail, and generated cURL examples have
an unusable host. These are format clues, not validated runnable Takewing examples.
Do not mix old/new upstream schemas, assume all text variants stream identically,
or infer reference-image counts, file limits or exact pixel bounds. Backend
adapter verification owns those facts. No request was submitted to test them.

## Numeric reference snapshot — S02.2

All values in this section were rechecked on **2026-09-20**. These are published
reference prices, not verified settlement or approved Takewing offers. Use exact
integers/decimal strings when transferring them to S02.3. Currency conversion
must not parse the upstream's rounded money labels.

### Upstream credit rates

Source: [GRSAI directory](https://grsai.com/dashboard/models). Each image row
retains its resolution and evidence gaps from the inventory above. A listed flat
rate does not prove how multiple outputs or unsupported parameters are charged.

| Image ID | Credits/request |
| --- | ---: |
| `gpt-image-2.5` | 600 |
| `gpt-image-2.5-sunburst` | 2400 |
| `gpt-image-2.5-flare` | 2000 |
| `gpt-image-2-vip` | 2000 |
| `gpt-image-2` | 600 |
| `nano-banana-pro` | 1800 |
| `nano-banana-2-lite` | 440 |
| `nano-banana-2` | 1200 |
| `nano-banana-fast` | 440 |
| `nano-banana-2-cl` | 6000 |
| `nano-banana-pro-cl` | 10000 |
| `nano-banana-2-2k-cl` | 9000 |
| `nano-banana-pro-4k-vip` | 18000 |
| `nano-banana-pro-vip` | 10000 |
| `nano-banana-2-4k-cl` | 13000 |

Text columns are credits per **1,000,000 tokens**. `?` is unpublished/unknown.

| Text ID | Input | Output | Cache |
| --- | ---: | ---: | ---: |
| `gpt-6-astra` | 80000 | 400000 | 8000 |
| `gpt-5.6-terra` | 18000 | 104000 | 1800 |
| `gpt-5.6-sol` | 44000 | 260000 | 4500 |
| `gpt-5.5` | 44000 | 270000 | 4500 |
| `gemini-3.5-flash` | 24000 | 200000 | ? |
| `gemini-3.1-flash-lite` | 5000 | 30000 | ? |
| `gemini-3.5-flash-lite` | 6000 | 50000 | ? |
| `gemini-3.7-flash` | 12000 | 70000 | ? |
| `gemini-3.8-flash` | 12000 | 70000 | ? |
| `gemini-3.1-pro` | 30000 | 140000 | ? |
| `gemini-3-flash` | 8000 | 60000 | ? |
| `gemini-3-pro` | 30000 | 140000 | ? |
| `gemini-2.5-flash` | 6000 | 40000 | ? |
| `gemini-2.5-pro` | 25000 | 125000 | ? |

### USD packages and conversion

The public catalogue loads packages client-side. Rechecked its read-only
`getGoodsList` call with country `en`, without cookies or authorization:
[public goods endpoint](https://eb.grsaiapi.com/client/goods/getGoodsList),
HTTP 200, response code 0, seven `usdList` rows. This is a POST-based read used
by the public site, not order creation. The site's published client divides
`amount` by 100 for dollars. Package IDs are deliberately not Takewing IDs.
No checkout, payment method or tax treatment was verified.

| USD | Base credits | Bonus credits | Total credits | Bonus % |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 333000 | 0 | 333000 | 0 |
| 10 | 666000 | 66600 | 732600 | 10 |
| 30 | 1998000 | 599400 | 2597400 | 30 |
| 60 | 3996000 | 1998000 | 5994000 | 50 |
| 100 | 6660000 | 4662000 | 11322000 | 70 |
| 150 | 9990000 | 9990000 | 19980000 | 100 |
| 1000 | 66600000 | 66600000 | 133200000 | 100 |

**Derived standard reference:** `333000 / 5 = 66600` credits/USD. Base and
bonus columns are exact derivations, checked against every returned total/tag.
This supplies the numeric research basis for the already-decided fixed catalogue
conversion. It does not choose a backend ledger denomination or establish margin.
All packages keep the same model credit charge; no bonus-adjusted catalogue rate.

### Official text reference rates

USD per million text tokens, **paid Standard**, ordinary input / output / cached
input. These are component references, not complete request quotes. No batch,
flex, priority, free-tier, regional or tool charges are folded into the comparison.

| Official ID | Input | Output | Cached input | Condition / evidence |
| --- | ---: | ---: | ---: | --- |
| `gpt-6-astra` | 10 | 50 | 1 | <=272K input; P1 |
| `gpt-5.6-sol` | 4 | 20 | 0.40 | <=272K input; P2 |
| `gpt-5.6-terra` | 2 | 12 | 0.20 | <=272K input; P3 |
| `gpt-5.5` | 5 | 30 | 0.50 | <=272K input; P4 |
| `gemini-3.5-flash` | 1.50 | 9 | 0.15 | P5 |
| `gemini-3.1-flash-lite` | 0.25 | 1.50 | 0.025 | Text input; P5 |
| `gemini-3.5-flash-lite` | 0.30 | 2.50 | 0.03 | P5 |
| `gemini-3.7-flash` | 0.75 | 3.75 | 0.075 | Through 2026-12-31; P5 |
| `gemini-3.8-flash` | 0.75 | 3.75 | 0.075 | Through 2026-12-31; P5 |
| `gemini-2.5-flash` | 0.30 | 2.50 | 0.03 | Text input; P5 |
| `gemini-2.5-pro` | 1.25 | 10 | 0.125 | <=200K input; P5 |
| `gemini-2.5-pro` | 2.50 | 15 | 0.25 | >200K input; P5 |
| `gemini-3.1-pro-preview` | 2 | 12 | 0.20 | <=200K; alias comparison excluded, A8; P5 |
| `gemini-3.1-pro-preview` | 4 | 18 | 0.40 | >200K; alias comparison excluded, A8; P5 |
| `gemini-3-flash-preview` | 0.50 | 3 | 0.05 | Text; alias comparison excluded, A8; P5 |

- **P1:** [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).
  Above 272K input, input/cache rates double and output becomes 75. Cache writes
  cost 12.50 below the threshold, 25 above it. Batch/Flex are half Standard;
  Fast mode doubles it. Do not compare a cache write to a cache read.
- **P2:** [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol).
  Promotional rates are promised at least through November 21, 2026: schedule
  a source recheck then, not an invented automatic replacement price.
- **P3:** [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra).
  For Sol/Terra above 272K, input doubles and output is multiplied by 1.5.
  The [Standard pricing table](https://developers.openai.com/api/docs/pricing.md)
  also doubles their cached-input rates. Cache writes below/above the threshold:
  Sol 5/10; Terra 2.50/5. Upstream write pricing is unknown.
- **P4:** [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5).
  Above 272K input, ordinary input/output become 10/45. The fetched model page
  does not separately specify the long-context cached-input price; leave that
  component unavailable rather than infer it. Regional processing has a 10% uplift.
- **P5:** [Google Standard pricing](https://ai.google.dev/gemini-api/docs/pricing).
  Output includes thinking. Cache storage adds hourly charges: 4.50 per million
  tokens for Pro; 1 for the other listed text models, except 3.7/3.8 Flash at
  0.50 through 2026-12-31. Their listed token/storage rates double from 2027-01-01.

Unresolved `gemini-3-pro` has **no comparable official rate** in this snapshot.
Do not reuse 3.1 Pro's rate. Google cached-input references above are recorded
for completeness; the missing upstream cache tariff prevents a savings claim.
Audio, grounding, caching storage, cache writes and hosted tools need their own
equivalent evidence before any total-cost comparison. Upstream context brackets
and reasoning-token accounting also require confirmation; do not silently
extend the flat directory tariff to unsupported usage.

### Official image reference rates and settings

[OpenAI's explicitly labelled Standard table](https://developers.openai.com/api/docs/pricing.md)
lists the same token rates for GPT Image 2, Sunburst and Flare: text input 5,
cached text input 1.25, image input 8, cached image input 2, image output 30
USD/million tokens. The separate GPT Image 2 Batch rows halve those rates;
they are not the Standard baseline. Bare `gpt-image-2.5` remains unmapped.

The [image cost guide](https://developers.openai.com/api/docs/guides/image-generation)
requires explicit pixel dimensions and quality for an output estimate; `auto`
is variable. Quality options are low/medium/high for GPT Image 2 and additionally
xhigh/max for 2.5. Input tokens add to output cost, and Responses usage adds the
calling model's cost. Equal token rates do not establish equal per-image cost.
No numeric per-request GPT image saving is supported by the present evidence.

[Google Standard image pricing](https://ai.google.dev/gemini-api/docs/pricing)
provides these token bases. Monetary output amounts below are **exact derivations**
from tokens and rate, not rounded source labels or full request costs.

| Official ID | Input USD/M | Text/thinking output USD/M | Image output USD/M | Output tokens and derived USD |
| --- | ---: | ---: | ---: | --- |
| `gemini-3.1-flash-image` | 0.50 | 3 | 60 | 0.5K: 747 = 0.04482; 1K: 1120 = 0.0672; 2K: 1680 = 0.1008; 4K: 2520 = 0.1512 |
| `gemini-3.1-flash-lite-image` | 0.25 | 1.50 | 30 | 1K: 1120 = 0.0336 |
| `gemini-3-pro-image` | 2 | 12 | 120 | 1K/2K: 1120 = 0.1344; 4K: 2000 = 0.24 |

These image references exclude input, thinking and grounding costs. Preview
mapping, channel differences, supported output settings and request/image units
remain A4–A7. Do not turn an output-only amount into an official total or compare
it to an unidentified channel. The old Flash Image price is intentionally not
used for the disputed `nano-banana-fast` alias.

### Comparison eligibility and arithmetic checks

The eleven exact-ID text models have candidate ordinary-input/output component
references under the conditions above. The four GPT cache columns are candidate
cache-read references only after the upstream's meaning of cache is confirmed.
Three Google text aliases and all image per-request comparisons remain unavailable.
No blanket family discount, performance equivalence or all-time saving is implied.
S02.5 frontend review is accepted; backend/billing review and S12 integration
still gate actual publication.

Independent arithmetic fixtures for S02.3 (research examples, not billing code):

- A 600-credit request is exactly `600/66600 = 1/111` USD. The repeating decimal
  must not be rounded to cents and then reused for credits or savings.
- GPT-5.6 Terra: 1000 ordinary input + 2000 output + 500 separately counted
  cached-input tokens gives `18 + 208 + 0.9 = 226.9` reference credits. Standard
  official components give `0.002 + 0.024 + 0.0001 = 0.0261` USD. This example
  assumes disjoint input/cache buckets; actual upstream overlap remains unverified.
- Nano Banana 2's official 2K output component is `1680 * 60 / 1000000 = 0.1008`
  USD, excluding all other components. This is not an eligible upstream comparison.
- A $30 package yields `30 * 66600 = 1998000` base plus `599400` bonus, totaling
  `2597400`; a subsequent model request keeps its original credit rate.

## Next evidence work

S02.1's full inventory check is complete with the above explicit unresolved
items. This does not close B01, approve a launch subset, or complete S02.

S02.2's rate/package research is complete with explicit comparison exclusions.
For unresolved aliases, the official comparison stays unavailable. S02.3 now
preserves exact decimal arithmetic and rounds only under an explicit display rule.
S02.4/S02.5 received frontend owner approval on 2026-09-20, with backend/billing
validation deferred to S12 and a firm requirement that our price never exceed
the equivalent official price. No production rate is enabled by this evidence pass. The 66,600 reference is
verified package arithmetic; approval of production pricing/margin remains B02.

## Typed reference dataset and display arithmetic — S02.3

`frontend/src/content/catalogue.ts` retains all 29 image/text entries and seven
packages, under snapshot `grsai-reference-2026-09-20`. Every record inherits that
snapshot's checked date and directory source; official component references carry
their own source URL and settings. The identity/source discussion above is part
of the evidence, not an assertion of intermediary behavior. Research IDs are
explicitly separate from the still-unassigned public API IDs.

Amounts are exact strings. Image tariffs use **requests**, never an assumed image
count. Missing cache rates are null. Official text references retain ordinary and
long-context tiers, thinking/cache exclusions and known promotional review dates.
An absent review deadline is null, not an invented guaranteed validity period.
All sources require a publication-time recheck; known promotional dates do not
authorize publishing stale data before that date. No rate comparison is currently
marked verified: the eleven exact-ID text candidates still require equivalent
upstream context/token/settings evidence. All image request comparisons and three
text alias comparisons are unavailable. Official image component research remains
above, outside per-request comparison records, so it cannot become a total quote.

`frontend/src/lib/pricing.ts` performs exact BigInt rational arithmetic for
reference display only. USD uses 66,600 credits per dollar; packages are not an
input to rate calculations. Quantity calculations preserve rational fractions,
and summation occurs before formatting. This is neither a ledger denomination nor
browser-authoritative billing. The existing S01 ModelRate view is not reused because
its image unit cannot express the verified per-request research boundary.

Display rules: USD defaults to six decimal places, rounded half away from zero;
the formatter returns an `approximate` flag whenever rounding changes the value.
Consumers must show an approximation marker and retain the unit and evidence date.
Nonzero values below display precision use a bound instead of apparent zero.
Savings percentages use one decimal, truncated toward zero; subprecision positive
and negative differences retain direction as `<0.1` and `>-0.1`. Negative arithmetic detects a price-ceiling violation; future consumers must
report the comparison as unavailable pending reconciliation, never publish it as
a normal higher-price offer or silently clamp it. Unknown/mismatched units, settings, missing evidence,
invalid dates or expired/unassigned review deadlines return unavailable with a
reason. Exact zero is only possible with an actual equal-price comparison.

Never parse a formatted value back into another calculation or apply these helpers
to settlement. Proposed historical savings and every variant's owner-review
disposition are in [the accepted Stage 2 review](STAGE2_REVIEW.md). S02.4/S02.5
are complete for frontend scope; backend/billing validation remains S12.

## Stage 3 reference presentation (2026-09-20)

The public/dashboard catalogue now consumes the typed inventory. Model-family
pages cover GPT Image 2 and Nano Banana Pro (image), plus GPT-5.6 and Gemini Flash
(text). Their original explanations were checked against the [GPT Image 2 model
page](https://developers.openai.com/api/docs/models/gpt-image-2), [GPT-5.6 Terra
page](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [Google image
guide](https://ai.google.dev/gemini-api/docs/image-generation) and [Google model
catalogue](https://ai.google.dev/gemini-api/docs/models) on 2026-09-20. This content
check does not revalidate intermediary routing, financial equivalence or live rates.

All 29 dispositions are retained. Public API IDs remain pending; copy controls
explicitly copy a reference ID. Each displayed tariff shows its fixed USD value,
credits, unit and checked date. Detailed official references retain context tiers,
thinking/cache conditions and source links. Per-request image tariffs never become
per-image quotes, and no unavailable cache tariff becomes zero. No savings or
production offer is enabled by this presentation.

D-011 is now enforced in compareRate: an exact negative difference returns a
pricing/comparison error before percentage rounding, including subprecision
violations. Zero remains parity when all evidence gates pass. The earlier signed
percentage behavior above is superseded for this consumer; exact rational
arithmetic still detects the violation without clamping. This does not enforce
server prices or perform settlement.

formatReferenceMoney formats USD and a supplied per-rate EUR estimate only while
its timestamp interval is valid, preserving the USD reference beside EUR. No live
EUR source is selected; pages currently select EUR but truthfully fall back to USD.
Retired entries are excluded from active discovery without deleting the source
record. Existing history does not resolve names through the active catalogue.
S05/S12 still own history migration and confirmed live retirement handling.

## Landing presentation correction (2026-09-21)

Rechecked the featured official text prices directly: [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
remains $2 input/$12 output per million, up to 272K input tokens;
[Gemini 3.5 Flash Standard](https://ai.google.dev/gemini-api/docs/pricing)
remains $1.50 input/$9 output including thinking. This refresh covers these two
featured references only, not the entire inventory or upstream behavior.

LandingPrices rounds display to two places, using three below $0.01 and a bound
for positive subprecision values. Exact catalogue arithmetic and detailed rates
are unchanged. Public API ID readiness is irrelevant to displaying a sourced
tariff and is omitted from these cards. Cache rates remain in detailed pricing.
Image cards keep request units: official output-only prices still do not establish
a comparable complete request price or resolve the documented alias gaps.

Owner-approved landing badges compare published text component tariffs only,
using exact rational differences and truncating to whole percentages (positive
sub-percent differences display <1%). They require verified listed identity and
matching units/denominators, and never imply backend-verified request savings.
No image discount, zero-baseline discount or negative discount is displayed.

### Image comparison recheck, 2026-09-21

Revisited the public GRSAI model directory and its linked GPT/Banana API guides,
OpenAI GPT Image 2 model page and Google pricing. The directory still supplies
600 credits/request for GPT Image 2, without establishing equivalent quality and
output count; Nano Banana Pro remains 1,800 credits/request and still names
gemini-3-pro-image-preview. The official Google pricing uses the stable model.
The linked API examples do not resolve these gaps. No numeric image discount
was enabled. Landing image cards now link official pricing and explain size/quality
dependence in customer terms; they do not invent an official fixed request price.

Owner requested a concise numeric image reference: Nano Banana Pro landing card
now shows approximately $0.13 per 1K/2K image output (exact reference $0.1344),
and $0.24 at 4K, with input/thinking charges separate. This is the official stable
model output reference, not an equivalent upstream request quote; no strikethrough
or image savings badge is added. GPT Image still needs specified size/quality.

### GPT Image 2 numeric output reference, 2026-09-21

Read the official calculator linked from https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency
and its public GptImageTokenCalculator.react.Z2Zu5XGo.js module. For GPT Image 2
at 1024x1024, its low/medium/high estimates are 196/1756/7024 output tokens.
The calculator receives 30 USD/million output tokens; the Standard table at
https://developers.openai.com/api/docs/pricing.md independently confirms this
(the separate Batch rate is 15, not the baseline). Derived output costs are
0.00588 / 0.05268 / 0.21072 USD. The landing card displays approx $0.05 for
1024-square Medium quality, excluding input, instead of vague variable copy.
This is an official output estimate, not a verified equivalent upstream tariff.
All four featured homepage models now have numeric official references.

## Catalogue-wide published examples (2026-09-21 owner correction)

The owner explicitly requested percentages across homepage and all Models &
Pricing variants. ModelPrices and publishedPrices now supply one presentation.
These are labelled published examples, not the equivalence/settlement records
used by compareRate or the historical savings service. Raw catalogue values and
all backend gates remain unchanged. Supersedes earlier presentation-only
statements that every unverified comparison must omit numerical differences.

- GPT Image 2 and VIP: 1024-square Medium, 1756 output tokens, $0.05268.
- GPT Image 2.5 Sunburst/Flare: same size/Medium, 439 tokens, $0.01317.
  Bare 2.5 explicitly labels the Sunburst/Flare family example; it does not claim
  the upstream alias is either specific official model.
- Nano Banana Pro variants: stable Gemini 3 Pro Image reference, $0.1344 at
  1K/2K, $0.24 at 4K. Channel/version equivalence remains unverified.
- Nano Banana 2 variants: Gemini 3.1 Flash Image, $0.0672/$0.1008/$0.1512
  at 1K/2K/4K, with the baseline matching each fixed-resolution variant.
- Lite and fast: Gemini 3.1 Flash-Lite Image, $0.0336 at 1K. The July 1
  upstream announcement explicitly remaps fast to Lite; the card names that
  reference rather than inheriting the stale directory description.
- Exact-ID text references reuse the earlier sourced Standard component data.
  Gemini 3.1 Pro / 3 Flash explicitly name their official preview reference:
  $2/$12 (up to 200K input), and $0.50/$3 per million input/output respectively.
- Gemini 3 Pro has no current official reference: official preview retired
  March 9, 2026. No replacement-model price or fake percentage is substituted.

Sources rechecked: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing),
[Google retirements](https://ai.google.dev/gemini-api/docs/deprecations),
[upstream announcements](https://grsai.com/dashboard/announcements), and the
OpenAI calculator/source and Standard pricing recorded above.

Image badges compare one listed request to ONE output at the visible settings;
input/thinking costs are excluded. A lower example ratio is not verified savings.
Whole-percent differences use exact unrounded values: lower differences round
down, higher differences round up. Higher examples receive a distinct neutral
badge, never a false saving or clamped zero. This exposes potential offer problems
without authorizing any live rate above the equivalent official total.


## Settings-specific image comparisons (2026-09-21 correction)

H-039 supersedes the fixed 1K Medium comparison presentation. The owner clarified VIP means gpt-image-2-vip and requested equivalent resolution/quality examples, not a tier-wide higher/lower claim. All shared image price displays now expose the variant's listed resolution options; GPT quality options reflect the directory (Sunburst low/medium/high/xhigh/max; Flare low/medium/high). Defaults remain first listed resolution and Medium, without selecting a more favorable discount.

OpenAI examples use 1024x1024 (1K), 2048x2048 (2K), and 3840x2160 (4K UHD). A 4096-square output is outside the official calculator's 8,294,400-pixel / 3840-edge limits. Calculator source fetched from the official image-generation guide: quality grid long edge factors GPT Image 2 =16/48/96, GPT Image 2.5 =16/24/48/64/96; short edge rounds half to even by aspect ratio; tokens=ceil(gridArea*(2,000,000+pixels)/4,000,000), output USD=tokens*30/1,000,000. 4K High Sunburst=0.10008; GPT Image 2 VIP=0.40026, output only. Google selected-resolution values retain the sourced rate table above.

Percentages explicitly name the selected settings and remain output-only reference examples, not verified served quality or total savings. Bare gpt-image-2.5 and both disputed Lite/fast mappings show the named reference price without percentage claims. Requests, inputs, thinking and backend equivalence still require verification. No settlement/pricing enforcement changed.


H-040 (2026-09-21) supersedes selectable image comparisons: owner wants static cards with resolution/quality as context only. Removed all per-image selectors from shared display. Only positive computed differences receive savings badges; zero/higher/unknown references retain numbers without a discount badge or struck-through official price. Reference defaults remain first listed resolution and Medium; no favorable baseline or package selected to force a saving.

Public recharge API rechecked: USD5 buys333000 credits; USD150 buys19980000 including100% bonus. Base66600 credits/USD remains the current customer-facing conversion. Bulk133200 credits/USD is an acquisition-cost scenario, not an approved customer tariff. The directory CNY display is Chinese yuan, not Japanese yen; converting both sides to EUR cannot change a percentage. Uniform savings for every variant are not established.


## 2026-09-21: upstream purchasing basis confirmed

**DECIDED (owner):** always use the GrsAI USD150 package for upstream acquisition. The currently verified package includes19,980,000 total credits, giving133,200 credits/USD. Acquisition cost is model credits /133,200 USD, half the base-package reference cost. This supersedes treating the bulk package as merely hypothetical. Recheck package terms if they change.

**OPEN (product/billing owners):** customer selling prices and margin. Package choice alone does not authorize replacing customer prices with acquisition cost. The existing66,600-credit reference remains unchanged until selling prices are agreed. Any future savings claim must use the actual selling price and matching official settings.


## 2026-09-21: provisional selling-price markup

**DECIDED (owner, for now):**20% markup above acquisition cost using the USD150 package. Formula: model credits /133,200 *1.20 USD (equivalently credits /111,000 USD). This is markup, not20% gross margin; gross margin before fees and other costs is1/6. Supersedes the open markup choice in the preceding package decision. Implementation and production enforcement remain pending.

This does not establish universal savings: Sunburst2400 credits gives acquisition0.018018... USD and proposed retail0.0216216... USD, above the official1024-square Medium output example0.01317 and below the4K High output example0.10008. Comparisons must retain explicit settings and exclusions; no blanket positive percentage is authorized by this commercial choice.


## H-043 - 2026-09-21: approved static up-to savings

**DECIDED and implemented in frontend preview:** display Save up to X% using the approved acquisition package plus20% markup. Selling USD=model credits/111,000, calculated exactly. Shared home/catalogue/family/detail price displays and detailed rate amounts use this selling basis. Existing research conversion and backend financial logic remain unchanged.

For images, choose the largest official output cost among the same variant's listed comparison presets (1K square,2K square,4K UHD; supported quality levels). This maximizes percentage saving at the flat listed request tariff; the matching official amount and exact settings are shown together. No selectable controls. Percentages round down and only positive differences receive badges. Uncertain bare2.5/Lite/fast mappings and missing Gemini3Pro reference remain excluded. These are published-price examples, not verified served settings or guaranteed total savings; input/thinking exclusions remain visible.

Sunburst maximum preset example:2K square Max official output0.42816 USD; proposed retail2400/111000=0.0216216... USD; conservatively94% saving. At1K Medium the same retail remains above the output-only reference, so the claim is explicitly up-to.


## H-044 - 2026-09-21: alias investigation and schema evidence

Re-read English/Chinese primary catalogues, July1 and September9/10 announcements, and raw OpenAPI markdown reached through https://qmy27nhsd9.apifox.cn/llms.txt. Web extraction hid schema fields; direct read-only fetch returned full YAML.

- Nano Banana Fast and Nano Banana2 Lite: July1 explicitly identifies both as gemini-3.1-flash-lite-image. Chinese primary directory https://grsai.ai/zh/dashboard/models corroborates it; English Fast description is stale. Google model page specifies1K only and pricing lists0.0336 USD output. Resolved A6 for published mapping/1K reference (not runtime routing), grouped both as Nano Banana2 Lite, enabled88% badge at approved440/111000 retail. Historical retired Nano Banana remains separate.
- Bare GPT Image2.5: primary directory and September9 announcement say1K but do not identify Sunburst/Flare. Subdomain https://zjdl.grsai.ai/dashboard/models says Sunburst, conflicting with primary evidence; insufficient to close A1. Raw https://qmy27nhsd9.apifox.cn/452409160e0.md and https://qmy27nhsd9.apifox.cn/512802278e0.md specify auto-only quality for basic2 and2.5. No fixed-quality savings claim for either until actual output/settings can be matched.
- GPT Image2 VIP: those same schemas restrict quality to medium. Corrected comparison presets accordingly; earlier broad announcement/options do not override explicit per-model schema.
- Gemini3 Pro: Chinese primary listing identifies3.0 family but no exact official served ID. Chat-completion and Gemini-native schemas don't resolve the mapping. May15 price-change announcement doesn't identify it either. Google deprecation page retires gemini-3-pro-preview; no current interchangeable baseline established. A8 remains open, owner upstream/API: obtain exact served identifier/current mapping.

Sources: https://grsai.com/dashboard/announcements ; https://grsai.ai/zh/dashboard/models ; https://qmy27nhsd9.apifox.cn/452409160e0.md ; https://qmy27nhsd9.apifox.cn/512802278e0.md ; https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image ; https://ai.google.dev/gemini-api/docs/pricing ; https://ai.google.dev/gemini-api/docs/deprecations .


### H-045 - 2026-09-21 - Conservative Auto-quality benchmark

Owner requested continuing the unresolved comparison work. Basic GPT Image2/2.5 use the shared1024-square Low output benchmark0.00588 USD instead of assuming High auto output. Selling600/111000=0.0054054... gives8% below that benchmark. Display explicitly says 8% below Low reference, not an unverified maximum savings promise; Auto output varies. Underlying bare2.5 routing remains open, but both official2.5 candidates have the same benchmark formula. This is not proof of equivalent total request cost. Gemini3Pro remains unresolved; no current version can be inferred from a retired official candidate.

### H-046 - 2026-09-21 - Basic GPT Image 2.5 presentation

Supersedes H-045 customer wording for basic GPT Image 2.5 only. Shared cards show the approved flat request price (approximately USD0.005), a One flat price badge, and an unstruck official 1024-square Low-High output reference range (approximately USD0.006-0.053). Automatic quality and excluded input costs remain short context. The range is the common Low-High comparison for both official 2.5 candidates, not the full Sunburst quality range or proof of served quality/identity. No maximum savings percentage is inferred from Auto. Other model comparisons remain unchanged.

Build/typecheck and 24 affected desktop/mobile tests passed; desktop screenshot confirms aligned card pricing and footer notices. No commit or push.

### H-047 - 2026-09-21 - Requested GPT Image 2.5 savings wording

Supersedes H-046 badge: shared basic GPT Image 2.5 cards now say Save up to 89%, calculated from exact selling price against the official 1K High output reference. Adjacent copy explicitly identifies that comparison and automatic quality; no confirmed High output equivalence is claimed. Official Low-High price range remains visible. Build/typecheck and 14 desktop/mobile pricing checks passed.
