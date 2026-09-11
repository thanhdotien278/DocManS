# Proposal flow — source-controlled design context

1. An eligible internal PI opens an applicable intake and saves a proposal draft.
2. The PI completes fields and required package files; the backend returns readiness and missing items.
3. The PI, or only an approved exact-record `proposal.submit` delegate, reviews the confirmation and submits.
4. The submitted version is locked; controlled staff/review work follows.
5. If staff requests a supplement, the PI corrects the draft and explicitly resubmits after readiness passes.

Design constraints: workflow transitions are named backend operations, every consequential action is audited, and a stale authorization context requires refresh before mutation. Sources: `docs/authorization-core-business-baseline.md`, `docs/permission-matrix.md`, `_bmad-output/architecture.md`, `docs/user-flows.md`.
