# Story 3.1: Yeu cau bo sung va nop lai ho so

## Status

ready-for-dev

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a scientific management staff member and principal investigator,
I want to issue, receive, and resolve supplement requests,
So that incomplete proposals can be corrected within a traceable workflow.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.1: Yeu cau bo sung va nop lai ho so`
- Use Case IDs: `UC-310-A`, `UC-310-B`
- Functional requirements: `FR15`, `FR16`, `FR22`, `FR38`, `FR39`
- Non-functional requirement: `NFR10`
- UX decisions: `UX-DR10`, `UX-DR13`, `UX-DR14`
- Permission source: `docs/permission-matrix.md`

## Scope

Implement the controlled supplement loop after a proposal has been formally submitted:

- Staff request supplement with reason and due date.
- Proposal transitions from `submitted` or equivalent review state to `supplement_requested`.
- PI sees supplement request details and deadline.
- PI can update only allowed proposal data/files while supplement is open.
- PI resubmits the proposal and resolves the open supplement request.
- Proposal timeline/history records request and resubmission events.
- Audit logs are created for supplement request, allowed updates during supplement, and resubmission.

## Explicitly Out of Scope

- Reviewer assignment and review scoring from ST-3.2/ST-3.3.
- Evaluation consolidation from ST-3.4.
- Approval/rejection decision from ST-3.5.
- Arbitrary workflow engine or unlimited configurable state machine.
- Broad file-service redesign; reuse the shared files module from EP-02.

## Acceptance Criteria

### AC-ST-3.1-01: Staff requests supplement

Given proposal is in a state that allows completeness review,
When authorized staff sends a supplement request with reason and due date,
Then proposal transitions to `supplement_requested` or equivalent controlled state,
And the PI can see the request content and response deadline.

### AC-ST-3.1-02: PI resubmits after supplement

Given proposal is waiting for supplement,
When the owning PI updates allowed data/files and resubmits,
Then proposal transitions to `resubmitted` or equivalent controlled state,
And the system preserves supplement request and resubmission history.

### AC-ST-3.1-03: Invalid state is blocked

Given proposal is not in a state that allows supplement request or resubmission,
When staff or PI attempts the action,
Then the backend rejects the action,
And proposal state remains unchanged.

### AC-ST-3.1-04: Authorization is enforced

Given a user outside allowed staff scope or a non-owning PI attempts supplement actions,
When the backend evaluates the request,
Then the action is rejected fail-closed,
And no partial history, audit, or state transition is written.

## Data Model Guidance

Use explicit proposal-domain records rather than generic notes.

Suggested model:

- `ProposalSupplementRequest`
  - `id`
  - `proposalId`
  - `reason`
  - `dueDate`
  - `status`: `open`, `resolved`, `cancelled`
  - `requestedByUserId`
  - `requestedAt`
  - `resolvedAt`

Proposal history should record:

- request supplement: `fromStatus` -> `supplement_requested`
- resubmit proposal: `supplement_requested` -> `resubmitted`
- actor, timestamp, and safe business context

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- `apps/api/src/research-proposals/research-proposals.dto.ts`
- `apps/api/src/proposals-shared/proposal-access.ts`
- Shared files module under `apps/api/src/modules/files/` for supplement attachments.

Expected API shape:

- `POST /api/v1/research-proposals/:id/supplement-requests`
  - Staff-only within scope.
  - Validates reason, due date, state, and scope.
  - Transactionally writes supplement request, state transition, history, and audit log.
- `POST /api/v1/research-proposals/:id/resubmit`
  - PI/delegated owner only.
  - Validates open supplement request and readiness for resubmission.
  - Transactionally resolves request, updates state/history, and writes audit log.

Implementation guardrails:

- Inspect current worktree first; supplement code/tests may already exist locally.
- Preserve ST-2.4 submit/history behavior and do not reopen normal draft editing for submitted proposals.
- Allow only the workflow-approved edit surface during supplement.
- Use backend DTO validation; do not rely on frontend-only checks.
- Fail closed on missing proposal, user, organization scope, owner, state, or supplement request context.

Authorization rules:

- Scientific management staff may request supplement only within organization/unit/assigned scope.
- PI may view and respond only for their own proposal or explicitly delegated proposal.
- Reviewer and leadership cannot edit proposal content in this story.
- File access and updates must remain record-permission checked.

Audit-log actions:

- `request-supplement`
- `update-proposal-during-supplement`
- `resubmit-proposal`

## Frontend Implementation Guidance

Expected locations:

- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`
- `apps/web/src/components/research-proposals/research-proposals-panel.tsx`
- `apps/web/src/lib/research-proposals-api.ts`
- Optional focused components for supplement request form and supplement banner.

UI expectations:

- Staff sees supplement request action only when proposal state and scope allow it.
- PI sees open supplement request reason, deadline, and resubmit action.
- State/status badges distinguish submitted, supplement requested, and resubmitted.
- Long or state-changing actions require confirmation and clear success/error feedback.
- Mobile layouts must preserve request details and primary actions.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused backend tests for:
  - staff requests supplement successfully
  - PI views open request and resubmits
  - invalid state is blocked
  - unauthorized staff or non-owner PI is blocked
  - audit logs and history are written transactionally
- Manually verify the proposal detail UI for staff and PI views if frontend is changed.

## Done Definition

- Supplement request and resubmission are explicit backend domain operations.
- State, history, and audit logs stay consistent.
- Authorization is backend-enforced and fail-closed.
- UI exposes only allowed actions for staff and PI.
- Scope remains isolated from reviewer assignment, scoring, consolidation, and approval.
