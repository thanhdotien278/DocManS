# Story 2.2: Tao nhap ho so de xuat va nhap thong tin co cau truc

## Status

Done

## Epic

EP-02: Tiep Nhan Va Nop Ho So De Tai

## Story

As a principal investigator,
I want to create and save a proposal draft with structured data,
So that I can prepare a complete submission over multiple sessions.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-2.2: Tao nhap ho so de xuat va nhap thong tin co cau truc`
- Use Case ID: `UC-220` Proposal draft and structured data entry
- Functional requirements: `FR10`, `FR11`, `FR39`
- UX decisions: `UX-DR9`, `UX-DR10`, `UX-DR12`

## Scope

Implement proposal draft creation and structured editing:

- Create a proposal draft for a PI within an eligible intake period.
- Store structured fields: title, research field, proposal type, host unit, participants, timeline, objectives, summary, and budget metadata.
- Save draft repeatedly across sessions.
- Provide a proposal detail/edit screen with clear sections.
- Provide inline validation without losing valid user-entered data.
- Create a basic history placeholder for draft creation/update events.

## Explicitly Out of Scope

- Formal submission from `ST-2.4`.
- Proposal attachment upload and readiness file checks from `ST-2.3`.
- Supplement request, reviewer assignment, scoring, approval, or rejection.
- Complex budget subsystem or financial approval workflow.
- Editing submitted proposals except where a later story explicitly allows it.

## Acceptance Criteria

### AC-ST-2.2-01: Create and reopen a draft

Given a PI has access to an eligible intake period,
When they create a proposal draft and enter required structured data,
Then the draft is saved,
And the PI can reopen it later and continue editing.

### AC-ST-2.2-02: Structured responsive form

Given the proposal form is long,
When the user works on desktop, tablet, or mobile,
Then fields are grouped into clear sections,
And the page remains usable without full-page horizontal scrolling.

### AC-ST-2.2-03: Inline validation

Given one or more fields are invalid,
When the user leaves a field or saves the draft,
Then inline errors appear near invalid fields,
And valid data already entered remains available to the user.

### AC-ST-2.2-04: Authorization and audit

Given a user attempts to create or update a draft,
When the backend evaluates the request,
Then only the owning PI or an explicitly authorized delegate can modify the draft,
And successful create/update actions produce audit logs when the change is business-significant.

## Data Model Guidance

Add Prisma schema through a migration. Keep this story focused on draft data, not the full proposal lifecycle.

Suggested models:

- `ResearchProposal`
  - `id`
  - `code` optional or generated once available
  - `intakePeriodId`
  - `ownerId`
  - `hostOrganizationUnitId`
  - `researchFieldId` optional relation to catalog item or stored code
  - `proposalTypeId` optional relation to catalog item or stored code
  - `title`
  - `objectives`
  - `summary`
  - `startDate`
  - `endDate`
  - `budgetMetadata` JSON
  - `status`: start with `draft`
  - `createdAt`
  - `updatedAt`

- `ProposalMember`
  - `id`
  - `proposalId`
  - `name` or `userId` if linked to an existing user
  - `role`
  - `organization`
  - `createdAt`

Do not add attachment, review, approval, or supplement tables in this story.

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.module.ts`
- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- Add the module to `apps/api/src/app.module.ts`.

Expected API shape:

- `GET /api/v1/research-proposals`
  - PI sees owned drafts/proposals.
  - Staff/admin visibility must respect role and scope.
- `POST /api/v1/research-proposals`
  - Create a draft in an eligible intake period.
- `GET /api/v1/research-proposals/:id`
  - Return detail only if authorized.
- `PATCH /api/v1/research-proposals/:id`
  - Update draft fields only while status allows editing.

Validation rules:

- Intake period must exist and be eligible for draft creation.
- Title, host unit, timeline, objectives, and summary must be validated.
- End date must be after start date.
- Budget metadata must remain minimal and structured; do not build a finance subsystem.
- Proposal members must have clear roles and non-empty names or user references.

Authorization rules:

- PI can create and edit their own draft within valid scope.
- Staff can read according to workflow/scope rules, but must not edit PI content in this story.
- Reviewer and leadership roles do not receive edit rights in this story.
- Fail closed when owner, role, or organization scope is missing.

Audit-log actions:

- `create-proposal-draft`
- `update-proposal-draft`

Use `targetEntity: research-proposal`.

## Frontend Implementation Guidance

Expected locations:

- `apps/web/src/app/my-proposals/page.tsx` or existing proposal route if that is the current PI-facing convention.
- `apps/web/src/app/proposals/[id]/page.tsx` may be extended only if it remains role-aware.
- `apps/web/src/components/research-proposals/proposal-draft-form.tsx`
- `apps/web/src/lib/research-proposals-api.ts`

UI expectations:

- Sectioned form for core proposal fields.
- Clear save draft action with loading, success, and error states.
- Inline validation near invalid fields.
- Responsive behavior at `390px`, `768px`, and `1440px`.
- Do not add upload controls, submit button, review controls, or approval controls in this story.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add focused tests for create/update draft if the existing test layout supports it.
- Manually verify:
  - PI creates a draft in an eligible intake period.
  - PI saves the draft multiple times and reopens it.
  - Invalid fields show inline validation and preserve valid data.
  - Staff cannot edit PI draft content through backend APIs.
  - Unauthorized user cannot read another PI draft.
  - Audit logs exist for draft create/update.

## Done Definition

- Proposal draft data is persisted in Postgres.
- Backend authorization, validation, and audit logging are enforced.
- The PI-facing form is usable across required breakpoints.
- Scope remains isolated from attachments, formal submission, and EP-03 review/approval.
