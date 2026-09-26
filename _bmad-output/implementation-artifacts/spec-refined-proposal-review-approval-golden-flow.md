---
title: 'Refined cross-role Proposal Review & Approval Golden Flow'
type: 'feature'
created: '2026-09-21'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd7ab29b960f8eee35374850c8039662c026c62f9'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/sprint-plan.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Existing proposal functionality still gives Staff reviewer assignment and
synthesis authority. Head can submit a Staff draft without explicit finalization; incomplete
reviews do not block draft synthesis. Existing completion claims lack real UI acceptance.

**Approach:** Preserve the current proposal lifecycle and complete one cross-role journey:
PI resubmits → assigned Staff confirms completeness → Head assigns → assignees review →
Staff monitors → Head synthesizes, finalizes and submits → `LEADERSHIP_APPROVAL_AUTHORITY` approves/rejects.

## Boundaries & Constraints

**Always:** Keep seven system roles. REVIEWER is a record assignment. Staff requires exact
active management-officer assignment plus scope; Head requires explicit scope and no
conflict. Retain exactly two reviewers and at least three distinct committee members.
Reuse current submission evidence, summary revision/status, capabilities, transactional
mutation, audit and history. Backend derives readiness and repeats all gates at action time.
Use normal UI/backend for both terminal outcomes and preserve unrelated `skills-lock.json`.

**Never:** Add an Epic, workflow engine, parallel audit, duplicate proposal states or broad
Staff authority. Do not overwrite submitted reviews/finalized evidence, infer
`RESEARCH_OVERSIGHT_AUTHORITY` decision
power, invent review reopening or add an unsupported reminder-delivery system. No DB status
edits, authorization bypass, reset/reseed of existing data or unrelated refactoring.

## I/O & Edge-Case Matrix

| Scenario | Input/state | Expected behavior | Failure |
| --- | --- | --- | --- |
| Both terminal paths | Resubmitted proposal, Staff check, Head roster, complete reviews, finalized synthesis, submitted package | Authorized `LEADERSHIP_APPROVAL_AUTHORITY` approves or rejects; reviews/history/audit survive | Any missing gate denies atomically |
| Readiness | New resubmission without its own completeness evidence | No reviewer assignment; waiting for Staff | Backend workflow denial |
| Actor separation | Staff monitoring; Head assignment/synthesis; Oversight decision; participant/reviewer conflict | Denied even through direct API | Safe authorization reason |
| Synthesis lifecycle | Incomplete reviews; draft submission; stale finalized sources | Denied; no silent package regeneration | Backend readiness/context reason |
| Confidentiality | PI/team/unassigned user or oversight role probes internal fields | Only authorized projection; no raw review leaks | Deny or omit protected fields |

</frozen-after-approval>

## Code Map

Exact paths and ordered changes are in the linked implementation plan.
- Assignment service/support: reuse account/lifecycle/transaction; Head writes and separate Staff reads.
- Summary service/controller/DTO: Head-only draft/finalize/submit, complete current reviews,
  immutable evidence and named operational progress. Validate current completeness payload/binding
  and assignment effective intervals rather than trusting event kind or assignment status alone.
- Capability projector and proposal service: current readiness facts, actor grants, queues/blockers.
- Decision service: completeness/finalized/routed checks and leadership progress redaction.
- Existing evaluation API client, evaluation panel, detail workspace and proposal list:
  independent Staff monitoring and Head actions; preserve reviewer and leadership screens.
- Existing Golden Flow test: focused role/gate/disclosure regression alongside cardinality tests.

## Tasks & Acceptance

**Execution:**
- [x] Update existing Epic 5 sprint plan and Stories 5.1–5.5/5.8 before code; retain
  Story 5.7 and independent 5.6, with no duplicate stories or unearned Done statuses.
- [x] Reconcile `CONTEXT.md`, baseline, matrix, PRD, user flows and Authorization Contracts
  listed in the implementation plan with Head-owned assignment/synthesis.
- [x] Apply backend role/gate/lifecycle changes in the Code Map, preserving existing review
  submission and decision infrastructure. All successful mutations commit audit atomically.
- [x] Separate UI monitoring from write controls and expose backend readiness/reasons.
- [x] Add focused regression checks; run both real UI terminal journeys and required denials.

**Acceptance Criteria:**
- Given a fresh resubmission, when Head assigns before Staff confirms its completeness,
  then assignment is denied; confirmation unlocks assignment without another proposal enum.
- Given all required current reviews are complete, when Head saves/finalizes/submits,
  then each explicit lifecycle action records actor/revision/history and only submission
  transitions the proposal to `ready_for_approval`.
- Given Staff can monitor, when Staff calls any Head synthesis/assignment endpoint,
  then it is denied while named progress/deadline access remains available.
- Given a finalized package changes or is stale, when it is submitted or decided,
  then the backend rejects it; it never silently replaces the approved evidence.
- Given an active eligible `LEADERSHIP_APPROVAL_AUTHORITY` with a current finalized routed package, when each
  approve/reject scenario runs through UI, then exactly the expected terminal state appears;
  all premature/conflicted/unauthorized decisions are rejected.
- Given protected data is requested through an implemented sibling surface, when the
  audience lacks disclosure, then identities/scores/comments/synthesis are omitted or denied.

## Implementation Notes

Implemented with existing summary status/revision/evidence fields. No new migration; the existing
Golden Flow migration was applied locally without reset/reseed. Both synthetic normal-UI
journeys reached their expected Approved and Rejected states on 2026-09-22. See
[verification evidence](epic-05-proposal-review-and-approval/refined-flow-verification.md).
Independent review remains pending; legacy fixture/source-test failures are reported separately.

## Spec Change Log

## Review Triage Log

## Verification

- `npm run build:api` then focused Node review/cardinality/assignment tests.
- `npm run typecheck`, `npm run build:web`, `git diff --check`.
- Two real UI proposal journeys, approved and rejected, plus the sprint plan's negative
  cases. Report commands/results and unavailable coverage separately; no mock-only DoD.
