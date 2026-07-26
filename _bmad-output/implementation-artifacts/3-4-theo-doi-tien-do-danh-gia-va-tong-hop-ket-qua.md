# Story 3.4: Theo doi tien do danh gia va tong hop ket qua

## Status

ready-for-dev

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
