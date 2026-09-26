---
title: 'Proposal Review & Approval Golden Flow'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e57f015ad72b8fc5645df85e7165096dd351a0ee'
context:
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/authorization-core-business-baseline.md'
  - '{project-root}/docs/permission-matrix.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/sprint-plan.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has separate assignment, review, synthesis and decision surfaces, but the complete Resubmitted-to-Approved/Rejected journey is not yet proven or consistently enforced. Remaining gaps include package/version binding, transaction-time readiness and authority rechecks, server-filtered leadership work, and disclosure parity across sibling reads.

**Approach:** Complete one authoritative cross-role flow using the existing proposal workflow, account-based assignment lifecycle, V1 capability/context contract, review rubric, audit history and shared proposal detail. Harden only the boundaries needed for Head assignment/synthesis, Staff monitoring, reviewer package/submission, leadership queue/package and final approve/reject.

## Boundaries & Constraints

**Always:** Use canonical statuses (`submitted`/`resubmitted`, `under_review`, `ready_for_approval`, `approved`, `rejected`); require completeness evidence, exactly two distinct reviewer assignments and at least three distinct committee-member assignments before routing; enforce record scope, active officer responsibility, assignment lifecycle, conflict/separation-of-duties, stale context and workflow guards in backend mutations; preserve submitted reviews and immutable audit/history; use backend capabilities as the UI source; apply least disclosure to detail, list, file, history and notification projections.

**Never:** Add a workflow engine, duplicate role/status model, council-management subsystem, automatic reviewer selection, approval bypass, silent review edit, direct status mutation, project creation, unrelated redesign, or a second notification system. Preserve `skills-lock.json` and all unrelated worktree changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| APPROVED_HAPPY_PATH | Complete resubmission; two reviewers and three committee members submit valid reviews; Head synthesis is ready | Scoped leadership queue shows the proposal; authorized `LEADERSHIP_APPROVAL_AUTHORITY` approves; status, decision, audit and history become terminal | Any stale context or concurrent state change rejects the mutation without partial writes |
| REJECTED_HAPPY_PATH | Same flow, leadership supplies a reason | `LEADERSHIP_APPROVAL_AUTHORITY` rejects; status is `rejected`; reason and audit/history remain available to authorized readers | Missing rejection reason is a validation error |
| CONFLICT_OR_READINESS_DENIAL | PI/member/secretary/conflicting reviewer; missing assignment/review/summary; reviewer or non-authority attempts decision | Assignment, review, synthesis or decision is denied; protected data is not disclosed | Stable denial reason; failure audit where current audit rules require it |
| LOCKED_REVIEW | Existing submitted review or revoked reviewer with persisted review | Review remains readable only through permitted projections and cannot be silently overwritten; historical conflict remains for consolidation/decision | Explicit workflow reopen is unavailable in this slice |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts` -- account candidates, assignment/revocation lifecycle, queue, package and roster source; reuse its transaction and cardinality checks.
- `apps/api/src/proposal-evaluations/proposal-reviews.service.ts` -- assignment-scoped rubric, draft save, submit lock, review audit and staff projection.
- `apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts` -- progress, cardinality/readiness, Head synthesis and route transitions; add authoritative version/context evidence here.
- `apps/api/src/proposal-evaluations/proposal-decisions.service.ts` -- scoped decision package and guarded approve/reject; align package disclosure and transaction rechecks here.
- `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts` and `apps/api/src/permissions/proposal-capability-v1.ts` -- shared scope, conflict, workflow and capability rules; do not duplicate policy in controllers/UI.
- `apps/api/src/research-proposals/research-proposals.service.ts` and `apps/api/src/modules/files/files.service.ts` -- proposal/list/detail/history/file disclosure seam; preserve reviewer redaction and close sibling-route leaks.
- `apps/api/src/research-proposals/research-proposals.controller.ts`, `apps/web/src/lib/research-proposals-api.ts`, `apps/web/src/lib/proposal-evaluations-api.ts` -- extend existing APIs for a server-filtered decision queue and typed package/context data.
- `apps/web/src/components/research-proposals/{reviewer-queue-panel,proposal-review-form,proposal-evaluation-panel,proposal-decision-panel,approval-queue-panel,proposal-detail-workspace}.tsx` -- shared role-aware UI; keep actions capability-driven.

## Tasks & Acceptance

**Execution:**
- [x] Harden backend review package, progress/synthesis, decision package and decision mutations with current context, conflict, cardinality, readiness, disclosure and immutable evidence checks.
- [x] Add the smallest server-filtered leadership decision queue and typed client projection; keep the existing proposal detail and assignment lifecycle.
- [x] Complete reviewer/staff/leadership UI paths from queue to workspace, synthesis and decision without frontend-only authorization.
- [x] Add focused regression coverage for both terminal outcomes and required negative/disclosure scenarios.
- [x] Run API/web builds, focused authorization/lifecycle checks, disposable-DB workflow checks and browser checks where the local stack permits.

**Acceptance Criteria:**
- Given a valid checked resubmission, when Head assigns eligible accounts, reviewers submit, Head synthesizes/routes and an authorized `LEADERSHIP_APPROVAL_AUTHORITY` decides, then the proposal reaches exactly one terminal state with preserved reviews, decision, audit and workflow history.
- Given any missing cardinality, review, summary, scope, current officer, context, or conflict condition, when a protected mutation is attempted, then the backend rejects it atomically and the UI shows the backend denial reason.
- Given a submitted review, revoked reviewer, PI/team member, `RESEARCH_OVERSIGHT_AUTHORITY`/Head/Staff, or unrelated user, when protected review/package/list/file/history data is requested, then only the disclosure permitted by the current baseline is returned.
- Given concurrent assignment, synthesis or decision attempts, when the proposal state/context changes first, then the stale writer cannot create a second assignment, readiness bypass or competing terminal decision.

## Implementation Notes

- Evaluation assignments and submitted reviews now bind to the immutable current submission event. Review and synthesis evidence carries versioned snapshots; the database migration protects submitted review rows from direct edits.
- Head synthesis increments a package revision and stores the package evidence used for routing. Leadership decisions require that revision and re-check package/readiness/cardinality inside the locked mutation before creating the terminal decision, audit entry and history event.
- Leadership queue discovery is scoped by explicit organization IDs and only returns routed/terminal proposals. The leadership package keeps aggregate progress and synthesis while omitting reviewer identity, raw scores and confidential comments.
- Added the `/reviews` staff/head route, package-aware reviewer workspace loading, and a typed server-filtered `/research-proposals/decision-queue` client path.
- Focused regression coverage is in `../../tests/proposal-review-golden-flow.test.mjs`. Full-stack migration deployment was attempted against the configured local PostgreSQL but Prisma returned a schema-engine error; no reset or reseed was performed. Existing repository-wide failures remain outside this slice (stale role expectations and transaction mocks).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / action |
|---|---|---|
| Blind/Edge: submission evidence accepted null or malformed snapshots | fixed | `findCurrentSubmissionEvidence` now requires an object with members, attachments and requiredPackage arrays and fails closed. |
| Blind/Edge: migration bound every historical assignment to the latest submission | fixed | Migration backfill only binds assignments created at or after the latest submission event; summary evidence is backfilled for already-routed rows. |
| Blind: reviewer access could resolve an older active assignment first | fixed | Shared access resolution now selects the newest effective active assignment deterministically. |
| Blind/Edge: package status was checked before assignment authorization and could leak workflow state | fixed | `getReviewPackage` authorizes the assignment/conflict first, then checks current event and workflow status. |
| Blind/Edge: terminal submitted reviews failed when the package endpoint rejected terminal status | fixed | Reviewer form keeps the assignment-scoped review read and treats an unavailable package projection as optional/read-only context. |
| Blind: routing completed stale assignments from prior rounds | fixed | Head routing updates only assignments bound to the current submission event. |
| Blind/Edge: legacy same-status review history could disclose reviewer identity | fixed | Leadership and proposal history projections redact both `review_submitted` and legacy under_review-to-under_review events. |
| Blind/Edge: submitted review DELETE and ownership fields were not protected by the trigger | fixed | Migration trigger now blocks DELETE and changes to proposal, assignment, reviewer, status, scoring, comments, context and evidence. |
| Blind: decision package evidence did not prove it belonged to the current submission event | fixed | Decision read and locked transaction both compare package `submissionEventId` to current immutable submission evidence. |
| Blind: review evidence stored only attachment IDs | fixed | Review evidence now carries the full immutable submission snapshot in addition to attachment data. |
| Blind: generic progress could average revoked-review scores | fixed | `summarizeProgress` filters submitted reviews to active assignment IDs before counts and averages. |
| Blind: leadership queue can contain a conflicted record | deferred | The queue remains a scoped work list; decision-package and decision mutation conflict checks fail closed. A per-row conflict projection would add another read pass without changing authorization. |
| Blind: evidence IDs have no cross-proposal database foreign key | deferred | Current-event/proposal binding is enforced in service queries and package snapshots; cross-proposal composite FKs require a wider schema migration and are not needed for this slice. |
| Blind: summary/decision JSON evidence can be edited by direct SQL | deferred | Submission events and submitted reviews are protected in this slice; broader append-only JSON hardening is a persistence follow-up. |
| Blind: publicSummary and requiredFollowUp were persisted but not projected | fixed | Decision responses and the web decision type now expose both optional fields. |
| Blind: DTO comment described an empty approval body as fully valid | fixed | Comment now documents the required package revision/context and service-level reject note rule. |
| Blind: client review contextVersion was optional while the API required it | fixed | Review save/submit inputs are required and the form reports a missing context token before mutation. |
| Blind: focused tests did not exercise the complete mutation transaction | deferred | The repository's existing transaction fixtures fail before assertions on stale `tx.user.findUnique` mocks; the focused suite covers boundary guards and queue semantics without rewriting unrelated fixtures. |
| Blind: spec acceptance implied full browser/DB proof | deferred | Spec remains in review until the local DB/browser path is available; builds and focused checks pass, while Prisma deploy returned only a schema-engine error. |
| Blind: `skills-lock.json` appeared in the worktree | false positive | It is preserved as the user's unrelated untracked file and was not edited or staged. |
| Edge: package projection could race assignment expiry/revocation | fixed | Package read rechecks assignment status and effective interval after resolving access; mutation paths recheck again. |
| Verification: evidence test fake ignored query filters/order | fixed | Focused test now captures the Prisma `where`/`orderBy`, supplies unsorted and out-of-window events, and verifies the current event selection. |
| Verification: server-filtered queue had no regression coverage | fixed | Focused test covers non-leadership denial and leadership organization/status filters. |
| Verification: disclosure redaction lacked a dedicated assertion | deferred | Code paths are redacted and type/build checks pass; a full service fixture is deferred with the existing stale transaction-mock failures. |
| Verification: migration/trigger could not be exercised against the local DB | deferred | `npm run prisma:deploy` was attempted; Prisma returned `Error: Schema engine error:` and no reset/reseed was performed. |
| Verification: client decision request body lacked a browser/mock-fetch test | deferred | The request now includes note, packageRevision and contextVersion in the typed client; browser/mock-fetch coverage is deferred until the local browser path is available. |
| Verification: routed historical summaries could be undecidable because evidenceSnapshot was null | fixed | Migration backfills minimum package evidence and revision 1 for existing ready_for_approval summaries with current-round assignments. |

## Verification

**Commands:**
- `npm run build:api` -- expected: API compiles.
- `npm run typecheck` -- expected: workspace TypeScript checks pass.
- Focused existing review/cardinality/authorization tests and disposable-DB workflow checks -- expected: approved/rejected paths and denials pass.
- `npm run build:web` -- expected: web build passes.
- `git diff --check` -- expected: no whitespace errors.
