# Story 2.4: Nop ho so chinh thuc va xem lich su nop

## Status

Ready for Dev

## Epic

EP-02: Tiep Nhan Va Nop Ho So De Tai

## Story

As a principal investigator,
I want to submit my prepared proposal formally and view submission history,
So that the proposal enters the controlled intake workflow with traceable status changes.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-2.4: Nop ho so chinh thuc va xem lich su nop`
- Use Case IDs: `UC-240-A`, `UC-240-B`
- Functional requirements: `FR14`, `FR22`, `FR38`, `FR39`
- Non-functional requirement: `NFR10`
- UX decisions: `UX-DR11`, `UX-DR13`, `UX-DR14`

## Scope

Implement the formal submission operation for a ready proposal:

- Submit action for an eligible draft.
- Controlled status transition from `draft` to `submitted`.
- Confirmation dialog before submission.
- Submission timestamp and actor capture.
- Submission history/timeline display on proposal detail.
- Basic read-only protection after submit.

## Explicitly Out of Scope

- Supplement requests and resubmission from EP-03.
- Reviewer assignment and scoring from EP-03.
- Approval/rejection decision workflow.
- Approved-project creation from approved proposal.
- Complex workflow engine or arbitrary state transition editor.

## Acceptance Criteria

### AC-ST-2.4-01: Submit a ready proposal

Given a proposal draft has met readiness requirements,
When the owning PI confirms formal submission,
Then the proposal status changes to `submitted`,
And the system records submit timestamp and submit actor.

### AC-ST-2.4-02: Block incomplete submission

Given a proposal draft is missing required fields or required attachments,
When the PI attempts formal submission,
Then the backend rejects the transition,
And the response identifies the missing conditions clearly enough for the UI to guide the user.

### AC-ST-2.4-03: Show submission history

Given a proposal has been submitted,
When an authorized user views proposal detail,
Then they see a timeline/history entry for the submission,
And illegal post-submit edits are blocked by backend state rules.

### AC-ST-2.4-04: Enforce owner/state authorization

Given a non-owner or unauthorized actor attempts submission,
When the backend evaluates the request,
Then submission is rejected,
And no status transition or partial history write occurs.

## Data Model Guidance

Extend the proposal domain only as needed for submission history.

Suggested model:

- `ProposalSubmissionEvent`
  - `id`
  - `proposalId`
  - `actorId`
  - `fromStatus`
  - `toStatus`
  - `submittedAt`
  - `note` optional

If a generic business history table already exists by implementation time, use it only if it preserves the explicit proposal submission fields above. Do not build a broad workflow-history platform in this story.

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- Optional focused service: `apps/api/src/research-proposals/proposal-submission.service.ts`

Expected API shape:

- `POST /api/v1/research-proposals/:id/submit`
  - Performs readiness check, authorization check, transactional status update, history insert, and audit log.
- `GET /api/v1/research-proposals/:id/history`
  - Returns submission history/timeline items for authorized users.

Validation and transition rules:

- Only `draft` proposals can be submitted in this story.
- Readiness from ST-2.3 must pass before transition.
- Intake period must still allow submission.
- Submission should be transactional: if history or audit logging fails, do not leave a misleading partial state.

Authorization rules:

- Only the owning PI or explicitly authorized delegate can submit.
- Staff, reviewer, and leadership roles do not submit on behalf of the PI in this story.
- Authorized staff/admin may read history within allowed scope.
- Fail closed on missing owner, role, scope, or state context.

Audit-log actions:

- `submit-proposal`

Use `targetEntity: research-proposal`.

## Frontend Implementation Guidance

Expected locations:

- `apps/web/src/components/research-proposals/proposal-submit-panel.tsx`
- `apps/web/src/components/research-proposals/proposal-history-timeline.tsx`
- `apps/web/src/lib/research-proposals-api.ts`

UI expectations:

- Submit button appears only when the current user can attempt submission.
- Confirmation dialog explains that the proposal becomes officially submitted.
- If readiness is incomplete, show the missing items instead of a generic error.
- Proposal detail shows submission timeline/history.
- Submitted proposal fields should be visibly read-only where the backend blocks edits.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add focused submission transition tests if supported by current test setup.
- Manually verify:
  - Ready proposal submits successfully.
  - Incomplete proposal is blocked.
  - Non-owner cannot submit.
  - Submitted proposal cannot be edited through draft update endpoint.
  - Submission history/timeline displays timestamp and actor.
  - Audit log exists for submit.

## Done Definition

- Submission is an explicit backend domain operation.
- Status transition, history, and audit log are consistent.
- UI supports confirmation and history viewing.
- Scope remains isolated from EP-03 supplement, review, and approval workflows.
