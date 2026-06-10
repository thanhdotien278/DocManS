# Story 2.1: Tao va quan ly dot tiep nhan de tai

## Status

Ready for Dev

## Epic

EP-02: Tiep Nhan Va Nop Ho So De Tai

## Story

As a scientific management staff member,
I want to create and manage proposal intake periods,
So that proposal submissions are controlled by time window and required package rules.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-2.1: Tao va quan ly dot tiep nhan de tai`
- Use Case ID: `UC-210` Intake period management
- Functional requirements: `FR9`, `FR39`
- Non-functional requirements: `NFR7`, `NFR8`, `NFR9`
- UX decisions: `UX-DR8`, `UX-DR10`

## Scope

Implement the minimum vertical slice for proposal intake period management:

- CRUD proposal intake periods.
- Open and close intake period status.
- Start/end date validation and effective-window display.
- Basic applicability rules tied to organization/unit scope.
- Minimal required package definition needed by later submission stories.
- List and filter intake periods for staff/admin management.
- PI-facing read access for intake periods that apply to the PI.
- Backend authorization and audit logging for create/update/open/close.

## Explicitly Out of Scope

- Proposal draft creation and structured proposal form from `ST-2.2`.
- Proposal attachments, file upload, file replacement, or required-file completeness from `ST-2.3`.
- Formal proposal submission and submission history from `ST-2.4`.
- Supplement request, reviewer assignment, scoring, approval, rejection, or any `EP-03` workflow.
- A generic rule engine or configurable workflow engine.
- Complex package-rule semantics beyond the fields needed for later submission eligibility checks.

## Acceptance Criteria

### AC-ST-2.1-01: Create an intake period

Given a scientific management staff user or system administrator has the required permission,
When they create an intake period with title/code, start date, end date, applicability scope, and required package definition,
Then the intake period is persisted with a valid status,
And it can be referenced later by proposal submission stories.

### AC-ST-2.1-02: Close or expire an intake period

Given an intake period is open,
When its end date has passed or an authorized staff/admin closes it manually,
Then the system does not allow new submission eligibility against that intake period,
And the list/detail UI shows the closed or expired status clearly.

### AC-ST-2.1-03: Enforce role and scope access

Given users with different roles access intake periods,
When a system administrator or authorized scientific management staff user uses management endpoints,
Then they can create/update/open/close intake periods within the allowed backend policy.

Given a principal investigator accesses intake periods,
When they list available intake periods,
Then they only see active/open intake periods applicable to their organization scope.

### AC-ST-2.1-04: Audit critical actions

Given an authorized user creates, updates, opens, or closes an intake period,
When the action succeeds,
Then an audit log is recorded with action, actor, target entity, target id, result, and username.

## Data Model Guidance

Add Prisma schema through a migration. Keep the model small and specific.

Suggested model:

- `ProposalIntakePeriod`
  - `id`
  - `code` unique, business-readable identifier
  - `title`
  - `description` optional
  - `startsAt`
  - `endsAt`
  - `status`: `draft`, `open`, `closed`
  - `applicableOrganizationUnitId` optional FK to `OrganizationUnit`
  - `requiredPackage` JSON or equivalent minimal structured field
  - `createdAt`
  - `updatedAt`

Database naming should follow the architecture convention:

- Prisma model: `ProposalIntakePeriod`
- Table: `proposal_intake_periods`
- FK: `applicable_organization_unit_id`

Do not create proposal, attachment, reviewer, approval, or workflow tables in this story.

## Backend Implementation Guidance

Create a dedicated backend module for intake periods rather than folding it into generic admin catalogs.

Expected locations:

- `apps/api/src/proposal-intake-periods/proposal-intake-periods.module.ts`
- `apps/api/src/proposal-intake-periods/proposal-intake-periods.controller.ts`
- `apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts`
- Add the module to `apps/api/src/app.module.ts`

Expected API shape:

- `GET /api/v1/proposal-intake-periods`
  - Staff/admin: list manageable periods with filters.
  - PI: list only open/applicable periods.
- `POST /api/v1/proposal-intake-periods`
  - Create period.
- `PATCH /api/v1/proposal-intake-periods/:id`
  - Update period fields while staying in ST-2.1 scope.
- `POST /api/v1/proposal-intake-periods/:id/open`
  - Open a valid period.
- `POST /api/v1/proposal-intake-periods/:id/close`
  - Close a period manually.

Validation rules:

- `code` follows existing `readCode` style.
- `title` is required.
- `startsAt` and `endsAt` must parse as dates.
- `endsAt` must be after `startsAt`.
- `requiredPackage` must be minimal and structured enough for later checks, for example required document labels/types.
- Opening requires a valid date range and at least one required package item if the business rule demands a package.

Authorization rules:

- Reuse `SessionAuthGuard`.
- Do not rely on frontend-only access checks.
- System administrators may manage all intake periods.
- Scientific management staff may manage intake periods according to the backend policy available in the current codebase.
- PI users may read applicable open periods only and may not create/update/open/close.
- Fail closed when role or scope cannot be resolved.

Audit-log actions:

- `create-proposal-intake-period`
- `update-proposal-intake-period`
- `open-proposal-intake-period`
- `close-proposal-intake-period`

Use the existing `AuditLogService` pattern and set `targetEntity` to `proposal-intake-period`.

## Frontend Implementation Guidance

Add a focused management screen and keep it operational, not marketing-style.

Expected locations:

- `apps/web/src/app/proposal-intake-periods/page.tsx`
- `apps/web/src/components/proposal-intake-periods/proposal-intake-periods-panel.tsx`
- `apps/web/src/lib/proposal-intake-periods-api.ts`
- Add a navigation entry only if needed by the existing shell/navigation fixture pattern.

UI expectations:

- Dense list/table with mobile list fallback matching current admin pages.
- Filters for status and optional organization/unit scope.
- Create/edit form with code, title, description, start date, end date, applicability, and required package items.
- Open/close actions with clear status feedback.
- No proposal draft form, upload controls, reviewer UI, approval UI, or full workflow timeline.

## Test and Verification Checklist

Run the smallest reliable checks after implementation:

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add or update focused API tests if the existing test layout supports this module.
- Manually verify with seeded users:
  - Admin/staff can create an intake period.
  - Admin/staff can open and close an intake period.
  - PI cannot create/update/open/close.
  - PI only sees applicable open intake periods.
  - Closed or expired intake period is not eligible for new submission checks.
  - Audit logs exist for create/update/open/close.

## Dev Notes

- Keep the implementation DB-first; no fixture-only backend behavior for this story.
- Add a Prisma migration for schema changes.
- Match existing NestJS controller/service style and request validation patterns.
- Keep required package rules deliberately simple. Later stories can extend the model only when submission, attachments, and readiness checks need it.
- Do not rename existing proposal fixture pages unless needed for routing consistency.
- Do not implement the full proposal workflow state machine in this story.

## Done Definition

- Story scope is implemented end to end across database, backend API, and frontend management UI.
- Backend authorization and audit logging are enforced.
- Verification checklist is completed or any skipped item is explicitly documented with reason.
- `ST-2.1` remains isolated from `ST-2.2`, `ST-2.3`, `ST-2.4`, and `EP-03`.
