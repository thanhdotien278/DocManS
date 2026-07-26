# Story 3.3: Reviewer cham diem va gui nhan xet

## Status

ready-for-dev

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a reviewer or council member,
I want to submit scores, comments, and recommendations for assigned proposals,
So that the evaluation outcome can be consolidated in a controlled manner.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.3: Reviewer cham diem va gui nhan xet`
- Use Case ID: `UC-330`
- Functional requirements: `FR18`, `FR38`, `FR39`
- UX decisions: `UX-DR10`, `UX-DR20`, `UX-DR21`
- Permission source: `docs/permission-matrix.md`

## Scope

Implement reviewer scoring and comments for assigned proposals:

- Review form for assigned proposal.
- Score criteria selection or numeric score fields based on current catalog support.
- Reviewer comments and recommendation.
- Save draft if needed by the simplest viable workflow.
- Submit review as a controlled action.
- Reviewer-only edit access to their own review before submission or while policy allows.
- Staff read access to submitted reviews for consolidation.
- Audit log and history/status updates for submitted review.

## Explicitly Out of Scope

- Reviewer assignment from ST-3.2.
- Evaluation consolidation from ST-3.4.
- Approval/rejection decision from ST-3.5.
- Complex scoring rubric builder.
- PI visibility into internal reviews unless policy explicitly allows it later.

## Acceptance Criteria

### AC-ST-3.3-01: Reviewer submits review

Given reviewer is assigned to a proposal,
When reviewer enters score, comment, recommendation, and submits,
Then review result is stored against that proposal and reviewer,
And reviewer cannot overwrite another reviewer or committee member review.

### AC-ST-3.3-02: Required score/comment validation

Given score criteria or required fields are missing,
When reviewer attempts to submit,
Then the system blocks submission,
And the UI can show clear field-level errors.

### AC-ST-3.3-03: Staff sees review completion

Given reviewer has submitted review,
When staff views proposal review status,
Then staff sees the corresponding review completion state,
And processing history shows the review submission timestamp.

### AC-ST-3.3-04: Unauthorized review changes are blocked

Given a reviewer is unassigned or attempts to edit another person's review,
When they call review endpoints,
Then the backend rejects the request,
And no partial review data is saved.

## Data Model Guidance

Suggested model:

- `ProposalReview`
  - `id`
  - `proposalId`
  - `assignmentId`
  - `reviewerUserId`
  - `status`: `draft`, `submitted`
  - `scoreData` or explicit score fields
  - `comment`
  - `recommendation`
  - `submittedAt`
  - `createdAt`
  - `updatedAt`

Use scoring catalog data if it exists from EP-01; otherwise keep scoring fields simple and explicitly documented. Do not introduce a broad rubric engine in this story.

## Backend Implementation Guidance

Expected locations:

- Proposal review assignment service from ST-3.2, if created.
- New focused review service/module, for example `proposal-evaluations`, if this keeps domain boundaries clearer.
- `apps/api/src/research-proposals/` only if the existing module remains the owner for proposal evaluation in this phase.
- `apps/api/src/proposals-shared/proposal-access.ts`.

Expected API shape:

- `GET /api/v1/research-proposals/:id/my-review`
  - Assigned reviewer loads their own draft/submitted review.
- `PUT /api/v1/research-proposals/:id/my-review`
  - Save draft or update allowed fields before submit.
- `POST /api/v1/research-proposals/:id/my-review/submit`
  - Validates required score/comment/recommendation and submits.

Implementation guardrails:

- Review access must be assignment-scoped from ST-3.2.
- Submitted reviews should be immutable unless a later explicit reopen policy is added.
- Staff can read review status/results for consolidation; reviewers cannot read or edit others' reviews.
- PI should not see internal review content unless permission matrix/policy is changed.
- Audit logging must happen on submit, not just on save draft.

Authorization rules:

- Only assigned reviewers create/update/submit their own review.
- Staff in scope may read submitted review content for consolidation.
- Leadership may read review outputs only through ST-3.5 decision package.
- PI/member access to review output remains blocked unless policy allows result view.

Audit-log actions:

- `submit-score-and-review-comment`

## Frontend Implementation Guidance

Expected locations:

- Reviewer review page or `/my-reviews` flow.
- Staff proposal review status panel.
- `apps/web/src/lib/research-proposals-api.ts` or focused evaluation API client.

UI expectations:

- Review form is accessible, keyboard usable, and labels every score/comment field.
- Required field errors appear near fields.
- Submitted state is visibly read-only.
- Status labels do not rely on color alone.
- Reviewer queue links directly to assigned proposal review form.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused backend tests for:
  - assigned reviewer submits valid review
  - missing required score/comment blocks submit
  - reviewer cannot access or edit another review
  - unassigned reviewer is blocked
  - staff can see completion status
  - audit log exists for submit
- Manually verify reviewer form and staff status view if frontend is changed.

## Done Definition

- Review submission is assignment-scoped and auditable.
- Review validation is backend-enforced.
- Staff can see completion state needed for ST-3.4.
- PI/internal-review visibility follows permission policy.
