# Story 3.2: Phan cong reviewer va truy cap proposal theo assignment

## Status

done

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a scientific management staff member,
I want to assign reviewers or council members to proposals,
So that evaluation work is routed securely to the right people.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.2: Phan cong reviewer va truy cap proposal theo assignment`
- Use Case IDs: `UC-320-A`, `UC-320-B`
- Functional requirements: `FR17`, `FR38`, `FR39`, `FR67a`
- Non-functional requirements: `NFR7`, `NFR8`
- Permission source: `docs/permission-matrix.md`

## Scope

Implement reviewer or committee assignment for submitted/resubmitted proposals:

- Assignment record creation and reassignment in allowed workflow states.
- Reviewer queue/list containing only assigned proposals.
- Assigned reviewer access to required proposal package and files.
- Negative access handling for unassigned reviewers.
- Assignment history and audit logs.
- Conflict-policy check for PI/member/scientific secretary or other excluded roles on the same proposal.
- Notification hook or minimal event surface for later notifications, if the current notification module is not ready.

## Explicitly Out of Scope

- Review score/comment form from ST-3.3.
- Evaluation consolidation from ST-3.4.
- Approval/rejection decision from ST-3.5.
- Automatic reviewer recommendation or expertise matching.
- Full council management from EP-10.

## Acceptance Criteria

### AC-ST-3.2-01: Assign reviewers

Given proposal is ready for evaluation,
When authorized staff assigns one or more reviewers or committee members,
Then assignment is stored,
And only assigned users can see the proposal in their review workspace.

### AC-ST-3.2-02: Block unassigned reviewer access

Given a reviewer is not assigned to a proposal,
When they attempt to access that proposal or sensitive metadata,
Then the backend rejects access,
And no sensitive proposal metadata is leaked.

### AC-ST-3.2-03: Reassign in valid state

Given staff needs to adjust assignment,
When they change assignment in an allowed state,
Then the new assignment takes effect,
And assignment history is retained.

### AC-ST-3.2-04: Block conflicted reviewer assignment

Given the candidate reviewer has PI, participant, or scientific secretary role on the same proposal,
When staff attempts to assign them as independent reviewer,
Then conflict policy rejects the assignment,
And no reviewer permission or notification is created.

## Data Model Guidance

Use assignment-scoped records; reviewer must not be a global permission for every proposal.

Suggested model:

- `ProposalReviewAssignment`
  - `id`
  - `proposalId`
  - `reviewerUserId`
  - `reviewerProfileId` optional until EP-11 is implemented
  - `assignmentRole`: `reviewer`, `committee_member`
  - `status`: `assigned`, `revoked`, `completed`
  - `assignedByUserId`
  - `assignedAt`
  - `dueDate` optional

Conflict policy inputs:

- proposal owner/PI
- proposal participants and scientific secretary where available
- reviewer user/profile linkage
- workflow state
- organization/unit scope

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- New focused module/service is acceptable if kept narrow, for example `proposal-review-assignments`.
- `apps/api/src/proposals-shared/proposal-access.ts`
- `apps/api/src/modules/files/files.service.ts` for assigned package file access.

Expected API shape:

- `POST /api/v1/research-proposals/:id/review-assignments`
  - Staff-only within scope.
  - Validates state, candidate identity, conflict policy, and scope.
- `GET /api/v1/research-proposals/review-assignments/mine`
  - Returns only records assigned to current reviewer.
- `GET /api/v1/research-proposals/:id/review-package`
  - Returns assigned proposal package for assigned reviewer only.

Implementation guardrails:

- Backend assignment checks are authoritative; frontend visibility is only a hint.
- Reviewer access must be resolved through assignment records, not raw role name.
- Direct file access by object key remains forbidden.
- Fail closed if reviewer identity/profile linkage or assignment scope is ambiguous.
- Preserve proposal owner/staff flows already implemented in EP-02/ST-3.1.

Authorization rules:

- Only authorized staff may assign/reassign reviewers.
- Reviewer can read only assigned proposals and required supporting files.
- Reviewer cannot edit proposal content.
- PI/member/scientific secretary cannot be assigned as independent reviewer on the same proposal unless an explicit policy later allows it.

Audit-log actions:

- `assign-reviewer`
- `change-reviewer-assignment`
- Optional `revoke-reviewer-assignment`

## Frontend Implementation Guidance

Expected locations:

- Staff proposal detail assignment panel.
- Reviewer queue page or existing `/my-reviews` route if available.
- `apps/web/src/lib/research-proposals-api.ts`
- Shared status/empty-state components where appropriate.

UI expectations:

- Staff sees current assignments, due dates if used, and assignment history summary.
- Candidate conflict errors should name the business reason without exposing unrelated sensitive data.
- Reviewer sees a list of assigned proposals only.
- Unassigned access should result in a safe not-found/forbidden state.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused backend tests for:
  - successful reviewer assignment
  - assigned reviewer can access package
  - unassigned reviewer is blocked
  - conflicted reviewer candidate is blocked
  - assignment history and audit logs are written
- Manually verify staff assignment UI and reviewer queue if frontend is changed.

## Done Definition

- Reviewer assignment is explicit, auditable, and assignment-scoped.
- Assigned reviewers can access only assigned proposal packages.
- Conflict-policy checks prevent PI/member/secretary self-review paths.
- Scope remains isolated from scoring, consolidation, and approval.

## Delivered Implementation

### Data model

`ProposalReviewAssignment` (`proposal_review_assignments`) — `reviewerUserId`, `assignmentRole`
(`reviewer` | `committee_member`), `status` (`assigned` | `revoked` | `completed`), `assignedById`,
`assignedAt`, optional `dueDate`, `revokedAt`, `completedAt`.

Migration `20260727000000_ep03_proposal_evaluation`. Revoked rows are kept as history, so the
uniqueness rule is a **partial** unique index over `(proposal_id, reviewer_user_id) WHERE status =
'assigned'`: one live assignment per reviewer per proposal, re-assignable after a revoke without
rewriting the earlier row (AC-ST-3.2-03).

### Backend

New module `apps/api/src/proposal-evaluations/`, sharing the `research-proposals` base path.

- `POST :id/review-assignments` — staff-only, in scope, from `submitted` / `resubmitted` /
  `under_review`. Validates candidate -> conflict -> duplicate in that order, so a conflicted
  candidate is reported as a conflict rather than as "already assigned". The first assignment moves
  the proposal to `under_review` and writes the transition; later ones join the open round.
- `GET :id/review-assignments` — staff, admin and leadership read the roster.
- `POST :id/review-assignments/:assignmentId/revoke` — revoke-then-assign is the reassignment path.
- `GET review-assignments/mine` — the reviewer queue, built from assignment rows. Declared before
  the `:id` routes and two segments long, so it is never captured by `@Get(":id")`.
- `GET :id/review-package` — the assigned reviewer's package: proposal body, members (names and
  organisations only, no account ids), attachments and workflow history.

`ProposalReviewAccessService` (`proposals-shared/`) is the single seam for "is this user assigned to
this proposal". It depends on Prisma alone, so the proposals module, the files module and the
evaluation module each provide it directly and no module cycle is introduced.

### Authorization

`canReadProposal` takes the resolved assignment as a fourth optional argument. An assigned reviewer
reads that one proposal and nothing else; an unassigned `reviewer` account reads nothing and its
proposal list comes back empty (AC-ST-3.2-02). `FilesService.assertCanRead` resolves the same
assignment, so the attachment list and the download agree. Assignment never confers edit or submit.

Conflict (AC-ST-3.2-04) reuses `ProposalParticipationService.evaluateConflict` from ST-3.0 — the
principal investigator, the secretary and any participant are all refused, the denial is audited
with `result: failure`, and no assignment row, transition or reviewer permission is created.

Audit actions: `assign-reviewer`, `change-reviewer-assignment`.

### Frontend

- `proposal-evaluation-panel.tsx` — staff roster, per-reviewer completion, assign form and revoke.
- `reviewer-queue-panel.tsx` at `/my-reviews` — assigned proposals, due dates and review state.
- The proposal response carries `viewerReviewAssignment`, so the detail screen states the viewer's
  assignment role on that record without inferring it from the account role.

### Coverage

`tests/proposals-ep03.test.mjs` — six ST-3.2 tests: assignment opens the round and is audited; a
second assignment does not rewrite the status; only the assigned reviewer reads the proposal, the
package and the files; revoking retains history, stops access and allows reassignment; PI, member
and secretary are all refused as candidates; and authorization plus workflow state fail closed.
Verified end to end against the running API and Postgres.

## Post-Review Hardening

An adversarial review pass (5 independent lenses, each finding refuted by a separate verifier) raised
32 candidates; the ones that survived verification and were fixed in this epic:

1. **Score coercion.** `validateReviewScores` used `Number(raw)`, so `true` became 1 and `[5]` became
   5 — a hand-built request could store a score nobody entered. It now accepts a number or a whole
   decimal string and rejects everything else.
2. **Read scope on the evaluation surfaces.** `getReviewProgress` and `listAssignments` checked the
   staff role but not the organization scope, so out-of-scope staff could read every reviewer's name
   and score for a unit they do not operate. Both now go through `assertCanReadEvaluation`, which
   scopes staff and admits leadership without a unit scope. The system-administrator role was also
   removed from these reads, matching section 7.4 of the permission matrix (`None`).
3. **Lost updates on workflow transitions.** Every operation read the proposal, validated its status,
   then wrote — so two interleaved requests could both pass validation, letting one proposal be
   approved *and* rejected, or receive its "opened the round" transition twice. The status write is
   now conditional on the status that was validated (`updateProposalStatusGuarded`), so the second
   writer updates zero rows and its transaction rolls back.
4. **Draft save erased omitted fields.** `PUT :id/my-review` read an absent `comment` or `scoreData`
   as empty, so a partial payload wiped work already saved. Absent fields now keep their stored value.
5. **Re-assigning a reviewer who already reviewed.** The duplicate check only looked for `assigned`
   rows, so a reviewer holding a `completed` assignment could be assigned again and be counted twice
   in the round. Any non-revoked assignment now blocks a new one.
6. **Unique-index race.** Two concurrent assignments for the same reviewer both passed the pre-check;
   the partial unique index stopped the second but surfaced as a 500. It is now translated into the
   same 400 the pre-check produces.
7. **Panels swallowed real failures.** A network error or a 500 was rendered as "not entitled" and the
   whole panel silently vanished. Only 401/403 now mean that; everything else shows the error.
8. **Multi-hat accounts.** Panel visibility keyed on `account.role` alone, so an account holding
   several system roles lost surfaces it was entitled to. Both `role` and the `roles` array are checked.
9. **"Chuyển chờ phê duyệt" stayed enabled** with no assignments or outstanding reviews and failed with
   a contradictory message. It is now disabled with the reason stated next to it (UX-DR27).
10. **Staff self-review path.** `assignReviewer` ran the conflict primitive on the candidate but never
    compared the candidate to the assigning actor, and consolidation ran no conflict check at all — so
    one staff member could assign themselves, submit a review, and then consolidate their own review
    through to `ready_for_approval`. The participation primitive cannot see this, because staff hold no
    participation row. Self-assignment is now refused, and consolidation runs the same conflict rule as
    the approval decision (`resolveActorConflict`, shared by ST-3.4 and ST-3.5).
11. **Evaluation reads leaked draft metadata.** `getDecisionPackage`, `getReviewProgress` and
    `listAssignments` had no workflow-state gate, so leadership could read a `draft` proposal's
    existence and attachment count through them while `canReadProposal` refused the same account the
    same record. All three now apply the same gate.
12. **Unsaved consolidation text was wiped** by the refresh that follows an assign or revoke. The form
    now keeps what the user is typing until it is saved.
13. **Reviewer queue** rendered "Hạn Không đặt hạn" when no due date was set, and the review form's
    field errors were not tied to their inputs and its results were not announced. Both fixed.

Regression tests for items 1-5 are in `tests/proposals-ep03.test.mjs` under
"EP-03 hardening found by adversarial review".

Two confirmed findings were **not** acted on, deliberately:

- The conflict rule cannot see participation that is not linked to an account. That is a boundary of
  the ST-3.0 participation model, recorded in `deferred-work.md`.
- A reviewer's "đề nghị chỉnh sửa, bổ sung" outcome has no return path to the PI, because ST-3.1
  restricts supplement requests to `submitted` and `tests/proposals-ep02.test.mjs` asserts that a
  resubmitted proposal cannot be sent back again. Widening it would change agreed ST-3.1 behaviour and
  the permission matrix state rule, so it is flagged for the product owner in
  `proposals-shared/proposal-workflow.ts` and `deferred-work.md` rather than decided here.
