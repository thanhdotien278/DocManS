---
title: 'Record-aware proposal review visibility and authorization'
type: 'feature'
created: '2026-09-16'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '/Users/Super/DocManS/docs/authorization-core-business-baseline.md'
  - '/Users/Super/DocManS/docs/permission-matrix.md'
  - '/Users/Super/DocManS/_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Proposal review and approval cards are projected from any blocked capability, so users can see workflow sections that are irrelevant to the current proposal or belong to another workflow context. Staff routing is also labelled as a final approval action.

**Approach:** Keep backend authorization record-scoped and authoritative, expose only actions granted for the current proposal, retain disabled denial-reason behavior for relevant conflict/state blocks, and align the proposal UI and canonical documentation with the assignment/state contract.

</frozen-after-approval>

## Implementation Notes

- The existing `ProposalReviewAccessService` and evaluation services already recheck the exact proposal assignment and fail closed for missing, revoked, or expired access; reuse them.
- Update the canonical docs first, then adjust the proposal-detail capability projection so `ACTION_NOT_GRANTED` omits irrelevant sections while `CONFLICT_DENIED` and `WORKFLOW_STATE_DENIED` remain visible but disabled.
- Rename the staff transition to “Trình phê duyệt” / “Gửi lãnh đạo phê duyệt”; keep final approve/reject restricted to the leadership capability actions.
- Verification: `npm run typecheck`, `npm run build:api`, `npm run build:web`, focused authorization/lifecycle/UI-source tests (25 passed), and `git diff --check` passed. The broader EP-03 mock suite remains blocked by its existing `tx.user.findUnique is not a function` fixture mismatch.

## Review Triage Log

- patch — capability projection now renders only conflict/workflow denials and fails closed for unresolved context; this prevents stale or incomplete capability data from exposing workflow sections.
- patch — evaluation consolidation receives its own backend denial reason instead of reusing the assignment reason; this preserves accurate disabled-state feedback.
- false — the decision fallback card is still present inside the panel component, but the proposal-detail parent omits it for `ACTION_NOT_GRANTED`; relevant backend-denied states still need the disabled explanation.
- defer — broader positive/negative matrix coverage would be useful, but existing focused capability, lifecycle, and UI-source tests cover the changed projection and the EP-03 integration fixture is independently incompatible (`tx.user.findUnique is not a function`).
