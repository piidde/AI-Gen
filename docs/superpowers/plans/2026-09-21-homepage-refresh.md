# Homepage refresh — approved scope and implementation

User approved implementation after reviewing the homepage and reference website.
Keep Takewing's abstract hero artwork; no generated-image gallery or reproduction
of the reference site's compositions. Preserve image and text coverage.

Implemented:
- Feature GPT Image 2.5, using existing price calculations and comparison context.
- Compact homepage-only price treatment and expandable source details.
- Stronger heading hierarchy, green section contrast and mint closing CTA.
- Original ascending request-flow SVG, one shared wallet and integrated three-step
  explanation. Illustrations are labelled as illustrative, with API access pending.
- Focused dashboard preview with a subtle request-to-recorded-cost animation.
- Two illustrated links to existing image/text pricing guides.
- Smaller mobile hero artwork, compact prices and merged onboarding content.
- Reduced-motion preferences disable all homepage animations; no new dependencies.

Validation: frontend build/typecheck passed. Desktop/mobile home, pricing,
prerender and frontend route checks: 31 passed, 13 existing skips. Visual review
covered desktop, phone and the new request illustration. An initial build failure
exposed that GPT Image 2.5 has no editorial family route; its detail link now opens
the filtered catalogue. Disclosure tests open Pricing details before checking sources.

Backend contracts and live access remain gated. Gemini 3 Pro investigation remains
paused as requested. No commit, push or deployment.

### H-049 - 2026-09-21 - Workflow illustration refinement

Owner rejected the sparse flat-green diagram as low budget. Rebuilt that section with a separate editorial heading, a framed request workspace, actual Takewing mark, app window, provider/model panels and a distinct shared-credit illustration. Image/text pulses alternate and destination borders respond on arrival. Phone layout changes to a vertical path; tablet heading and provider contrast were refined after screenshots. Removed obsolete flow CSS from home-refresh.css; isolated new styling in home-flow.css.

Final build/typecheck and 8 desktop/mobile homepage/prerender checks passed. Visual review at 1680, 1440, 768 and 390 pixels; final overflow checks clean at 1680/768/390. Reduced-motion check passes. Animation timing sampled at travel and arrival. Local preview refreshed; no commit/push or deployment.
