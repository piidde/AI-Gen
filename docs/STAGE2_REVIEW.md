# Stage 2 owner review

Accepted 2026-09-20. **DECIDED: frontend/product owner approved with the price-ceiling correction below; backend/billing validation deferred to S12.**
This is the complete review set for S02.4/S02.5, not approval on behalf of partners.
Sources and full numeric tables are in [MODEL_PRICING.md](MODEL_PRICING.md).
The typed reference dataset is `frontend/src/content/catalogue.ts`.

## Accepted savings view contract — S02.4

**DECIDED: JannesG / PlaYa-44 approved this frontend contract on 2026-09-20.**
Use a server-produced all-time summary. The browser formats the supplied values;
it never reconstructs lifetime savings from a paginated usage table or today's
catalogue. This contract changes no refund or accounting policy.

1. Compare only completed, delivered requests with final settlement and a verified
   equivalent official Standard total. Record actual metered usage, final charged
   credits, immutable Takewing rate version, official rate version, standard
   conversion version, model identity and relevant options for each comparison.
   Ordinary input and cache-read buckets must be disjoint; account for thinking,
   input images, tools, storage and other billable components where applicable.
   If any required component is unknown, exclude the entire request, not just
   its expensive or unverified component.
2. Value final charged credits at the historical standard conversion; exclude
   purchase bonuses from the comparison. This is a standard-price comparison,
   not a claim about the customer's cash outlay or savings after taxes/FX.
3. Exclude fully or partially refunded requests, failed requests (including
   charged policy rejections), pending/uncertain settlement, missing usage,
   unmatched models/options, missing historical rates and unsupported extras.
   A charged failure remains charged in usage/billing but is not delivered saving.
   Partial refunds are conservatively excluded until a separately agreed method
   establishes which delivered usage and official cost remain comparable.
4. Takewing pricing must never exceed the equivalent official price. A negative
   difference violates this product requirement; it is a pricing/comparison error,
   not an accepted customer-facing higher-price state. Preserve exact signed
   arithmetic for detection and investigation; never silently clamp the error
   to zero or omit the offending record to inflate savings. Withhold the affected
   savings summary as unavailable until reconciled. S12 must validate the ceiling
   before enabling prices and comparisons. Missing equivalents remain unavailable,
   not evidence that the ceiling is satisfied. Exact zero remains valid parity.
5. Sum exact values before rounding. Supply compared/excluded request counts,
   mutually exclusive exclusion reasons and total recorded requests as of the
   summary timestamp. Counts must reconcile. Show coverage and the basis beside
   the result. If no requests qualify, show unavailable, not $0 saved or 0%.
   If historical coverage is incomplete, disclose its start date and do not label
   the metric unqualified “all-time”. Never infer completeness from a zero count.
6. Pin historical versions and model names across price changes/retirement.
   Subsequent confirmed refunds or settlement corrections revise the summary
   using an auditable revision and the original comparison basis. Today's price
   changes must not rewrite historical savings. Retired models can still count
   when their historical request meets every condition.

Accepted frontend view requirements (final server DTO remains open): status/reason; signed `differenceUsd`; `officialUsd` and
`standardChargeUsd` for qualifying requests; `comparedRequests`,
`excludedRequests`, reason counts and `totalRequests`; `asOf`; coverage
(`complete` or `partial` plus earliest covered instant); `basisVersion` and
`revision`. Monetary fields are exact decimal strings. The server owns aggregation,
settlement, deduplication and authorization; endpoint, database schema and ledger
denomination remain OD-002/008/009. S09 will consume the accepted view; S12 must
prove backend behavior before live savings are displayed.

Required future backend fixtures: mixed successful/charged-failed/refunded/pending
requests; price-ceiling violations and zero totals; no qualifying requests; absent rate/usage;
partial history; retired models; changed current rates; refund after an earlier
summary; duplicate settlement notifications. No browser accounting implementation
or mocked server proof is included in Stage 2.

## Full variant disposition — S02.5

“Verified” below describes dated evidence only. **Every row awaits Takewing support,
public API ID, margin and backend integration approval.** No row claims live health.
All numeric tariffs were transcribed and checked against the S02.2 register.

| Upstream research ID | Identity disposition | Rate evidence | Comparison disposition / remaining evidence |
| --- | --- | --- | --- |
| `gpt-image-2.5` | Awaiting evidence A1 | Verified 600/request | Unavailable: unidentified official model and request settings |
| `gpt-image-2.5-sunburst` | Verified exact official ID | Verified 2400/request | Unavailable: equivalent request total; A2 maintenance notice |
| `gpt-image-2.5-flare` | Verified exact official ID | Verified 2000/request | Unavailable: equivalent request total; A2 maintenance and A3 quality gap |
| `gpt-image-2-vip` | Awaiting evidence A4 | Verified 2000/request | Unavailable: channel/model/settings |
| `gpt-image-2` | Verified exact official ID | Verified 600/request | Unavailable: equivalent request settings and total |
| `nano-banana-pro` | Awaiting evidence A5 | Verified 1800/request | Unavailable: served preview/stable version and total |
| `nano-banana-2-lite` | Awaiting evidence A6 | Verified 440/request | Unavailable: alias routing, resolution and total |
| `nano-banana-2` | Awaiting evidence A5 | Verified 1200/request | Unavailable: served version and total |
| `nano-banana-fast` | Awaiting evidence A6 | Verified 440/request | Unavailable: conflicting alias descriptions |
| `nano-banana-2-cl` | Awaiting evidence A5/A7 | Verified 6000/request | Unavailable: channel/version/settings/refund conflict |
| `nano-banana-pro-cl` | Awaiting evidence A5/A7 | Verified 10000/request | Unavailable: channel/version/settings/refund conflict |
| `nano-banana-2-2k-cl` | Awaiting evidence A5/A7 | Verified 9000/request | Unavailable: channel/version/settings/refund conflict |
| `nano-banana-pro-4k-vip` | Awaiting evidence A5/A7 | Verified 18000/request | Unavailable: channel/version/settings/refund conflict |
| `nano-banana-pro-vip` | Awaiting evidence A5/A7 | Verified 10000/request | Unavailable: channel/version/settings/refund conflict |
| `nano-banana-2-4k-cl` | Awaiting evidence A5/A7 | Verified 13000/request | Unavailable: channel/version/settings/refund conflict |
| `gpt-6-astra` | Verified exact official ID | Verified input/output/cache | Awaiting upstream context, token accounting and cache-read equivalence |
| `gpt-5.6-terra` | Verified exact official ID | Verified input/output/cache | Awaiting upstream context, token accounting and cache-read equivalence |
| `gpt-5.6-sol` | Verified exact official ID | Verified input/output/cache | Awaiting same; promotional source recheck November 21 |
| `gpt-5.5` | Verified exact official ID | Verified input/output/cache | Awaiting same; long-context official cache unavailable |
| `gemini-3.5-flash` | Verified exact official ID | Verified input/output; cache unknown | Awaiting upstream context/thinking equivalence; cache unavailable |
| `gemini-3.1-flash-lite` | Verified exact official ID | Verified input/output; cache unknown | Awaiting text/settings equivalence; cache unavailable |
| `gemini-3.5-flash-lite` | Verified exact official ID | Verified input/output; cache unknown | Awaiting text/settings equivalence; cache unavailable |
| `gemini-3.7-flash` | Verified exact official ID | Verified input/output; cache unknown | Awaiting equivalence; promotional rates expire December 31 |
| `gemini-3.8-flash` | Verified exact official ID | Verified input/output; cache unknown | Awaiting equivalence; promotional rates expire December 31 |
| `gemini-3.1-pro` | Awaiting evidence A8 | Verified input/output; cache unknown | Unavailable: preview alias mapping |
| `gemini-3-flash` | Awaiting evidence A8 | Verified input/output; cache unknown | Unavailable: preview alias mapping |
| `gemini-3-pro` | Awaiting evidence A8 | Verified input/output; cache unknown | Unavailable: alias/retired candidate; no substitute official rate |
| `gemini-2.5-flash` | Verified exact official ID | Verified input/output; cache unknown | Awaiting text/thinking equivalence; cache unavailable |
| `gemini-2.5-pro` | Verified exact official ID | Verified input/output; cache unknown | Awaiting context brackets/thinking equivalence; cache unavailable |

Accepted: use this complete reference inventory for S03's frontend work,
retain every unresolved entry's visible unavailable/awaiting-evidence state, and
withhold unsupported savings, capability and health claims. This is a dated
research subset, not an enabled offer. Do not expose upstream research identifiers
as Takewing public IDs until the API owner approves that contract.

## Additional stuff worth deciding

- Including partially refunded delivered requests could improve coverage, but
  needs an agreed allocation method. Exclusion is the initial recommendation.
- Showing charged failures as negative savings would reflect more account costs,
  but mixes delivered-use comparison with a hypothetical unsuccessful official
  request. Keep these costs in usage/billing and disclose the exclusion instead.
- Bonus-adjusted cash savings could be a separate metric, but conflicts with the
  accepted standard-conversion basis for this one. Excluded from the MVP.

## Review decision and closure

On 2026-09-20, JannesG / PlaYa-44 answered "our price will never be higher. apart
from that approved yes" to the frontend contract and deferral of backend/billing
validation to Stage 12. S02.4/S02.5 and Stage 2 are complete for this frontend
workstream. The earlier proposed normal negative-savings display is superseded
by the price-ceiling invariant in rule 4. Other optional additions remain excluded.

No partner approval or live support is implied. Billing/backend owners must still
validate historical settlement, rate versions, comparison equivalence and the
price ceiling before launch. Production implementation and unresolved source
investigations remain B01/B02/S12. Approval does not convert reference tariffs
into production offers or settle how the backend enforces the ceiling.
