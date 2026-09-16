---
title: 'Proposal detail role views and date-only workflow inputs'
type: 'bugfix'
created: '2026-09-16'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/authorization-core-business-baseline.md'
  - '{project-root}/docs/ux-design-guidelines.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The proposal-detail workspace exposes PI-only submission and edit-oriented content to scientific-management staff, accepts time values where the workflow uses whole calendar days, and permits repeated completeness confirmation for the same submitted version.

**Approach:** Make the backend deny a second completeness check for the current submission and project that state into detail capabilities; render the formal-submit panel only from the PI capability, replace the non-PI staff form with a read-only proposal summary, and reuse the existing Vietnam whole-day date conversion for supplement and reviewer-assignment dates.

</frozen-after-approval>

## Implementation Notes

- Update the active authorization, flow, UX, PRD, and epic statements before code; do not touch archived planning files or the frozen record-aware visibility spec.
- Reuse the current-submission completeness predicate already enforced before reviewer assignment, keeping the guard inside the serializable proposal mutation.
- Reuse `apps/web/src/lib/intake-dates.ts`; start dates map to the start of the selected Vietnam calendar day, while end/deadline dates map to that day's end.
- Keep proposal actions capability-driven. A non-PI must receive `ACTION_NOT_GRANTED` for `proposal.submit`; the current PI may retain a visible disabled submit section when workflow state blocks it.
- Reuse existing `SectionCard`, metadata, participation-list, catalog labels, and currency formatting for the staff read-only board; do not introduce a new component or abstraction.
- Verify focused authorization/service/source tests, typecheck/builds, whitespace, and the live proposal detail page for the five browser comments.
- Updated the active baseline, permission matrix, user flow, UX guidance/spec, PRD, and epic acceptance text before implementation.
- `proposal.submit` now distinguishes a current PI from unrelated viewers; current-submission completeness evidence blocks the capability and the mutation after the first successful check.
- The proposal detail now renders the existing PI form only for the owner, a compact staff-only read board for scientific management, and no submit card when the backend returns `ACTION_NOT_GRANTED`.
- Supplement and assignment date controls now use native date inputs and `intakeDateToIso` whole-day boundaries; stored effective/deadline dates display without hours.
- Focused authorization, source-behavior, and date tests passed with typecheck/API/web builds. The legacy `proposals-ep02.test.mjs` suite still stops at its pre-existing `tx.user.findUnique is not a function` mock gap before reaching the added regression assertions.
- Live verification as scientific-management staff confirmed the repeat completeness button is disabled, the PI submit card is absent, the staff read-only summary is present, and all four affected controls are date-only.
