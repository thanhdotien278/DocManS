# Proposal flow — source-controlled design context

1. An eligible internal PI opens an applicable intake and saves a proposal draft.
2. The PI completes fields and required package files; the backend returns readiness and missing items.
3. The current internal PI reviews the confirmation and submits; non-PI and delegate requests are denied before mutation.
4. The submitted version is locked; Staff operations require an effective `PROPOSAL_MANAGEMENT_OFFICER` plus scope; review work requires its own assignment.
5. If the assigned management Staff requests a supplement, the PI corrects the draft and explicitly resubmits after readiness passes.

Design constraints: workflow transitions are named backend operations, every consequential action is audited, and a stale authorization context requires refresh before mutation. Sources: `docs/authorization-core-business-baseline.md`, `docs/permission-matrix.md`, `_bmad-output/architecture.md`, `docs/user-flows.md`.

Head assigns an in-scope Staff officer and can submit completed Staff packages. Staff actions
require that active assignment. Deputy Director may act as internal PI through their own
relationship; institutional oversight alone exposes operational status, never final decisions
or confidential reviewer fields. Director decisions require scope, eligible state and no conflict.
