# Story 3.5: Phe duyet hoac tu choi proposal

## Status

done

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a leadership or approval authority user,
I want to review the complete proposal record and make a formal approval decision,
So that accepted proposals can advance into project execution while rejected ones remain traceable.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.5: Phe duyet hoac tu choi proposal`
- Use Case ID: `UC-350`
- Functional requirements: `FR20`, `FR21`, `FR22`, `FR23`, `FR38`, `FR39`, `FR67a`
- Non-functional requirements: `NFR8`, `NFR10`
- UX decisions: `UX-DR11`, `UX-DR13`, `UX-DR14`
- Permission source: `docs/permission-matrix.md`

## Scope

Implement leadership/approval authority decision for proposals ready for approval:

- Decision package view with proposal history, review outputs, files, and consolidated summary.
- Approve/reject action with confirmation.
- Controlled state transition to approved/rejected or equivalent target state.
- Decision note where policy requires or allows it.
- Decision history and audit log.
- Conflict-policy check to block self-approval when authority is also PI, participant, reviewer, or secretary on the same proposal.

## Explicitly Out of Scope

- Creating the approved-project tracking record; that belongs to ST-4.1.
- Project execution, milestones, progress reports, and adjustments.
- Digital signature integration.
- Appeal/reopen workflow unless already explicitly supported.

## Acceptance Criteria

### AC-ST-3.5-01: Authority reviews complete decision package

Given proposal is ready for approval,
When leadership or approval authority opens the proposal,
Then they see required decision context including history, reviews, files, and consolidated summary,
And displayed data still respects permission rules.

### AC-ST-3.5-02: Authority approves or rejects

Given leadership confirms approve or reject,
When decision is submitted,
Then proposal transitions to the valid target state,
And decision is stored with actor, timestamp, and note if provided.

### AC-ST-3.5-03: Invalid state is blocked

Given proposal is not in a state that allows decision,
When any user attempts approve/reject,
Then backend rejects the action,
And workflow state cannot be bypassed.

### AC-ST-3.5-04: Self-approval conflict is blocked

Given approval authority is also PI, participant, reviewer, or secretary for the same proposal,
When they attempt approve/reject,
Then conflict policy blocks the decision,
And proposal state remains unchanged.

## Data Model Guidance

Suggested model:

- `ProposalDecision`
  - `id`
  - `proposalId`
  - `decision`: `approved`, `rejected`
  - `note`
  - `decidedByUserId`
  - `decidedAt`
  - `fromStatus`
  - `toStatus`

Proposal status guidance:

- Decision operation should transactionally update proposal status and write decision/history/audit.
- Approved status should make proposal eligible for ST-4.1 approved-project creation, but ST-3.5 should not create that project record.

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- Optional focused `approvals` or `proposal-decisions` service if it keeps decision logic clear.
- `apps/api/src/proposals-shared/proposal-access.ts`

Expected API shape:

- `GET /api/v1/research-proposals/:id/decision-package`
  - Authority-scoped read model for final decision.
- `POST /api/v1/research-proposals/:id/approve`
  - Controlled approval transition.
- `POST /api/v1/research-proposals/:id/reject`
  - Controlled rejection transition.

Implementation guardrails:

- Decision operation must check authority scope, proposal state, and conflict policy in the same service path.
- Staff/reviewer/PI must not call decision endpoints unless a separate policy grants authority.
- A system administrator role alone does not imply business approval authority.
- Use transactions for status, decision, history, and audit writes.
- Preserve review outputs and consolidated summary; do not mutate review records during decision.

Authorization rules:

- Only approval authority within allowed scope can approve/reject.
- Authority with conflict participation/assignment on the same proposal cannot decide unless policy explicitly allows it.
- PI/member can read result only within permitted proposal participation scope.
- Reviewer access after decision remains assignment/policy controlled.

Audit-log actions:

- `approve-proposal`
- `reject-proposal`

## Frontend Implementation Guidance

Expected locations:

- Proposal decision view or decision section in proposal detail.
- Leadership/approval queue if route exists.
- `apps/web/src/lib/research-proposals-api.ts` or focused approvals API client.

UI expectations:

- Decision actions appear only for users likely allowed to decide, but backend remains authoritative.
- Approve/reject requires confirmation.
- Decision note field should be available where policy expects explanation.
- Conflict, invalid-state, and unauthorized errors should be clear and non-leaky.
- Proposal history shows final decision actor/time/note.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused backend tests for:
  - approval authority approves valid proposal
  - approval authority rejects valid proposal
  - invalid state is blocked
  - self-approval conflict is blocked
  - staff/reviewer/PI without authority are blocked
  - decision history and audit logs are written transactionally
- Manually verify decision package and confirmation flow if frontend is changed.

## Done Definition

- Approval/rejection is an explicit backend domain operation.
- Decision state, history, and audit logs are consistent.
- Conflict policy prevents self-approval.
- Approved proposal is ready for ST-4.1 without ST-3.5 creating project execution records.

## Delivered Implementation

### Data model

`ProposalDecision` (`proposal_decisions`) — `decision` (`approved` | `rejected`), `note`,
`decidedById`, `decidedAt`, `fromStatus`, `toStatus`. Decisions accumulate as history rather than
being overwritten, so a later reopen policy does not lose the original record.

### Backend

- `GET :id/decision-package` — the authority-scoped read model: workflow status, `canDecide`, the
  conflict statement, review progress, every submitted review, the consolidated summary, prior
  decisions, the attachment count and the full workflow trail (AC-ST-3.5-01).
- `POST :id/approve` and `POST :id/reject` — one transaction writes the status change, the decision
  row, the `ProposalSubmissionEvent` and the audit entry (AC-ST-3.5-02). Review outputs and the
  consolidated summary are never mutated by the decision. A rejection requires a note.

Authority, workflow state and conflict are checked in the same service path, so no caller can
satisfy two of the three and skip the last. Only `ready_for_approval` is decidable, which also makes
a second decision on an already-decided proposal impossible (AC-ST-3.5-03). Authority is the
`leadership` role only — a system administrator role does not imply business approval authority, as
section 2 of the permission matrix states.

Conflict (AC-ST-3.5-04) is the ST-3.0 participation primitive **plus** a reviewer assignment on the
same proposal: an authority who scored the proposal would otherwise be judging their own review.
A blocked decision is audited with `result: failure` and leaves the proposal state untouched.

Leadership read access was opened here, as carried forward from ST-3.0: leadership reads any
proposal that has entered the formal workflow, i.e. every state except `draft`. It does not require
a matching organization scope. Drafts stay private to their owner until formal submission.

Audit actions: `approve-proposal`, `reject-proposal`.

### Frontend

- `proposal-decision-panel.tsx` — the decision package, the reviews behind it, prior decisions, a
  note field, and confirmed approve/reject actions. A conflict is shown with its reason rather than
  the buttons silently vanishing (UX-DR27).
- `approval-queue-panel.tsx` at `/approvals` — "chờ quyết định" and "đã quyết định" lists.

### Coverage

`tests/proposals-ep03.test.mjs` — four ST-3.5 tests: the authority reads the full package while
staff, PI and reviewers are refused; approve and reject are transactional and do not mutate review
outputs, and a rejection without a reason is refused; a proposal that is not ready for approval
cannot be decided and a decided one cannot be decided again; and self-approval is blocked both for a
participating authority and for one who was assigned as a reviewer, while an unrelated authority
decides normally. Verified end to end against the running API and Postgres.

## Post-Review Hardening

See the shared section in `3-2-phan-cong-reviewer-va-truy-cap-proposal-theo-assignment.md`, which
records the adversarial review of the whole evaluation module and the fixes applied across ST-3.2 to
ST-3.5.
