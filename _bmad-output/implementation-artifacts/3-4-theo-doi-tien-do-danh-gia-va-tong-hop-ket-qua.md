# Story 3.4: Theo doi tien do danh gia va tong hop ket qua

## Status

done

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a scientific management staff member,
I want to monitor review completion and consolidate evaluation outcomes,
So that proposals can move efficiently toward an approval decision.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.4: Theo doi tien do danh gia va tong hop ket qua`
- Use Case ID: `UC-340`
- Functional requirements: `FR19`, `FR38`, `FR39`, `FR47`
- UX decisions: `UX-DR7`, `UX-DR8`, `UX-DR13`
- Permission source: `docs/permission-matrix.md`

## Scope

Implement staff monitoring and consolidation after reviewer scoring:

- Staff review progress view by proposal and reviewer assignment.
- Completion status for each reviewer.
- Consolidated evaluation summary entry.
- Ready-for-approval marker or controlled transition.
- Queue/list of proposals waiting for decision.
- History and audit log for important consolidation actions.

## Explicitly Out of Scope

- Reviewer assignment from ST-3.2.
- Reviewer score/comment submission from ST-3.3.
- Leadership approval/rejection action from ST-3.5.
- Full executive dashboard from EP-07.
- Automated scoring algorithm or reviewer ranking.

## Acceptance Criteria

### AC-ST-3.4-01: Staff monitors review progress

Given proposal has multiple reviewer assignments,
When staff opens review progress view,
Then staff sees which reviewers are completed or incomplete,
And can identify whether proposal is ready for consolidation.

### AC-ST-3.4-02: Staff creates consolidated outcome

Given enough review information is available,
When staff enters summary or consolidated outcome,
Then proposal is marked ready for approval,
And the summary is saved with actor and timestamp.

### AC-ST-3.4-03: Unauthorized consolidation is blocked

Given a reviewer, PI, or out-of-scope staff user attempts to update consolidated outcome,
When the backend evaluates the request,
Then the action is rejected,
And review data and proposal state remain unchanged.

### AC-ST-3.4-04: Consolidation is traceable

Given consolidated outcome is created or updated,
When authorized users view proposal history,
Then the action appears in timeline/history,
And audit log contains the relevant action context.

## Data Model Guidance

Suggested model:

- `ProposalEvaluationSummary`
  - `id`
  - `proposalId`
  - `summary`
  - `recommendation`
  - `status`: `draft`, `ready_for_approval`
  - `createdByUserId`
  - `updatedByUserId`
  - `createdAt`
  - `updatedAt`

Proposal state guidance:

- Consolidation should move proposal to `ready_for_approval` only through explicit domain operation.
- Do not duplicate state in multiple unrelated modules. If a summary status exists, define how it maps to proposal status.

## Backend Implementation Guidance

Expected locations:

- Review/evaluation service from ST-3.3.
- `apps/api/src/research-proposals/` or focused `proposal-evaluations` module.
- `apps/api/src/proposals-shared/proposal-access.ts`.

Expected API shape:

- `GET /api/v1/research-proposals/:id/review-progress`
  - Staff view of assignments, submitted reviews, and completion status.
- `PUT /api/v1/research-proposals/:id/evaluation-summary`
  - Staff creates/updates consolidated outcome within scope.
- `POST /api/v1/research-proposals/:id/mark-ready-for-approval`
  - Optional explicit operation if not combined with summary save.

Implementation guardrails:

- Staff scope and proposal state must be checked on every consolidation action.
- Reviewer data should be read-only through this workflow.
- Do not let reviewers or PIs change consolidated outcomes.
- Do not move to approval if required reviewer submissions are missing unless policy explicitly allows staff override.
- Audit log should identify proposal, actor, from/to state where state changes, and safe summary context.

Authorization rules:

- Only scientific management staff in allowed scope can consolidate.
- Leadership may read summary in ST-3.5 decision package.
- Reviewers cannot edit consolidated outcome.
- PI/member cannot access internal review details unless policy allows result view.

Audit-log actions:

- `consolidate-evaluation`
- Optional `mark-ready-for-approval`

## Frontend Implementation Guidance

Expected locations:

- Staff proposal detail review-progress section.
- Proposal list filter/queue for waiting consolidation or ready for approval.
- `apps/web/src/lib/research-proposals-api.ts` or focused evaluation API client.

UI expectations:

- Reviewer completion uses text labels plus visual status.
- Staff can drill into submitted reviews within permission scope.
- Consolidated summary form has clear save/submit state.
- Ready-for-approval action requires confirmation if it changes proposal state.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused backend tests for:
  - staff sees review progress
  - staff creates consolidated outcome
  - ready-for-approval marker/state is set correctly
  - reviewer/PI/out-of-scope staff are blocked
  - history and audit logs are written
- Manually verify staff progress UI and status filters if frontend is changed.

## Done Definition

- Staff can monitor review completion without spreadsheets.
- Consolidated outcome is explicit, permission-checked, and traceable.
- Proposal can enter ST-3.5 decision package through controlled state.
- Scope remains isolated from leadership decision workflow.

## Delivered Implementation

### Data model

`ProposalEvaluationSummary` (`proposal_evaluation_summaries`) — one row per proposal (unique
`proposal_id`), with `summary`, `recommendation`, `status` (`draft` | `ready_for_approval`),
`createdById`, `updatedById` and `markedReadyAt`.

### Backend

- `GET :id/review-progress` — per-reviewer completion, the named pending reviewers, the average
  total score, the submitted reviews and the current consolidated outcome. Staff, admin and
  leadership read it; reviewers and PIs are refused (AC-ST-3.4-01, AC-ST-3.4-03).
- `PUT :id/evaluation-summary` — save the consolidated outcome. `markReady` is an explicit flag, so
  a draft consolidation cannot drift into an approval-ready state as a side effect of an ordinary
  save. With `markReady: true` the proposal moves to `ready_for_approval`, any still-open assignment
  is completed with the round, the transition is written to the timeline and the audit action
  becomes `mark-ready-for-approval` (AC-ST-3.4-02, AC-ST-3.4-04).

Completion is measured against assignments that are still part of the round: a revoked assignment
does not hold the proposal open, a completed one counts as done. Marking ready while a review is
outstanding is refused and the response names the reviewers still pending. Every action re-checks
`scientific-management` plus organization scope, so out-of-scope staff are refused on scope alone.

Audit actions: `consolidate-evaluation`, `mark-ready-for-approval`.

### Frontend

The consolidation half of `proposal-evaluation-panel.tsx`: submitted reviews with scores and
comments, a visible "còn N phiếu chưa gửi" warning naming the pending reviewers, the summary form,
and separate "Lưu nháp tổng hợp" and "Chuyển chờ phê duyệt" actions with confirmation on the second.
`/proposals` gained `under_review`, `ready_for_approval`, `approved` and `rejected` status filters.

### Coverage

`tests/proposals-ep03.test.mjs` — three ST-3.4 tests: progress reports per-reviewer completion and a
revoked assignment stops holding the round open; consolidation is gated on completion, a draft save
does not move the proposal, marking ready transitions it once and updates rather than duplicates the
summary row; and reviewers, PIs and out-of-scope staff can neither read nor change the consolidation
while leadership reads it.

## Post-Review Hardening

See the shared section in `3-2-phan-cong-reviewer-va-truy-cap-proposal-theo-assignment.md`, which
records the adversarial review of the whole evaluation module and the fixes applied across ST-3.2 to
ST-3.5.
