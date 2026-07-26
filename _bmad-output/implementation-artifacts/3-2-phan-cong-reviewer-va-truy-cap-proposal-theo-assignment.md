# Story 3.2: Phan cong reviewer va truy cap proposal theo assignment

## Status

ready-for-dev

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
