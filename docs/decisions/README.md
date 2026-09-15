# Architecture decision records

Use ADRs for accepted choices that meaningfully affect architecture, not trivial
implementation details. Candidates include runtime/deployment, ledger strategy,
provider boundary design, API compatibility, and storage strategy.
Accepted records:

- [ADR-001: API-only MVP](ADR-001-api-only-mvp.md) — explicit scope correction
  following the documentation bootstrap.

Track unresolved choices and evidence in [OPEN_DECISIONS.md](../OPEN_DECISIONS.md).
An assumption or investigation is not an accepted ADR. When the team explicitly
decides, update the owning guide and decision-register entry, then add a numbered
file such as `ADR-001-short-title.md`. Preserve history when superseding a decision
and link to its replacement. Do not invent acceptance dates or owners.

## Template

Use these fields and sections, keeping the record as short as the decision allows:

- Title: `ADR-NNN: Decision title`
- Status: Proposed, Accepted, or Superseded (with replacement link)
- Date: actual decision date (`YYYY-MM-DD`)
- Owner: responsible person/team
- Context: why the choice was needed
- Options considered: real alternatives
- Decision: the accepted choice (or clearly labeled proposal)
- Reasons: why this option
- Consequences: what becomes easier or harder
- Known limitations: accepted trade-offs

Update [ARCHITECTURE.md](../ARCHITECTURE.md) and affected domain guides so readers
can find current behavior without reconstructing it from historical records.
