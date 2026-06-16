# Story 2.3: Dinh kem ho so de xuat va kiem tra dieu kien truoc khi nop

## Status

Done

## Epic

EP-02: Tiep Nhan Va Nop Ho So De Tai

## Story

As a principal investigator,
I want to upload required attachments and see submission readiness,
So that I can know whether my proposal can be submitted formally.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-2.3: Dinh kem ho so de xuat va kiem tra dieu kien truoc khi nop`
- Use Case IDs: `UC-230-A`, `UC-230-B`
- Functional requirements: `FR12`, `FR13`, `FR36`, `FR37`, `FR39`
- Non-functional requirements: `NFR7`, `NFR8`
- UX decisions: `UX-DR15`, `UX-DR16`

## Scope

Implement proposal attachment management and pre-submission readiness checks:

- Upload files against an existing draft proposal.
- Validate file type and size.
- Persist file metadata linked to the proposal.
- Display attachment metadata: name, type, size, uploader, upload time, and requirement category.
- Compute readiness using proposal required fields plus required package items from the intake period.
- Show a readiness panel listing missing data/files.

## Explicitly Out of Scope

- Formal submission from `ST-2.4`.
- Advanced replacement/version history beyond what is necessary for initial submission.
- Supplement-cycle replacement rules from EP-03.
- Reviewer, approval, or leadership file-review workflows.
- Public file links or direct object-key access.

## Acceptance Criteria

### AC-ST-2.3-01: Upload valid attachment

Given a proposal draft requires attachments,
When the owning PI uploads a valid file,
Then the file is linked to the proposal,
And the UI shows file name, type, size, uploader, and upload timestamp.

### AC-ST-2.3-02: Reject invalid file

Given a file has an unsupported type or exceeds the configured size limit,
When the user uploads it,
Then the backend rejects the file,
And the UI shows a clear error without creating incomplete file metadata.

### AC-ST-2.3-03: Show readiness

Given a proposal draft is missing required data or files,
When readiness is evaluated,
Then the PI sees the missing items clearly,
And the system reports that the proposal is not ready for formal submission.

### AC-ST-2.3-04: Enforce file permissions

Given a user attempts to upload or view proposal attachment metadata,
When the backend evaluates access,
Then only the owning PI or an authorized scoped user can access the record,
And unauthorized users receive no sensitive file metadata.

## Data Model Guidance

Add only the file/proposal metadata needed for this vertical slice.

Suggested model:

- `ProposalAttachment`
  - `id`
  - `proposalId`
  - `requirementCode`
  - `fileName`
  - `mimeType`
  - `sizeBytes`
  - `storageKey`
  - `uploadedById`
  - `status`: `active`, `removed`
  - `createdAt`
  - `updatedAt`

Use the later shared `files` module if it already exists at implementation time. If it does not, keep the proposal attachment slice minimal and do not build a broad file platform beyond this story.

## Backend Implementation Guidance

Expected locations:

- `apps/api/src/research-proposals/research-proposals.module.ts`
- `apps/api/src/research-proposals/proposal-attachments.controller.ts`
- `apps/api/src/research-proposals/proposal-attachments.service.ts`
- Optional later-shared boundary: `apps/api/src/files/`

Expected API shape:

- `GET /api/v1/research-proposals/:id/attachments`
  - List attachment metadata for authorized users.
- `POST /api/v1/research-proposals/:id/attachments`
  - Upload an attachment for an editable draft.
- `GET /api/v1/research-proposals/:id/readiness`
  - Return readiness status and missing items.

Validation rules:

- Proposal must exist and be in an editable draft state.
- File must match allowed type and size rules.
- Attachment must map to a known required package item when requirement matching is used.
- File metadata must not be persisted if upload validation fails.

Authorization rules:

- PI can upload only to owned drafts.
- Staff/admin read access must respect organization scope.
- Reviewer/leadership access is not introduced by this story.
- File metadata and download paths must not leak for unauthorized proposals.

Audit-log actions:

- `upload-proposal-attachment`

Use `targetEntity: proposal-attachment` and include the linked `research-proposal` id in safe context where practical.

## Frontend Implementation Guidance

Expected locations:

- `apps/web/src/components/research-proposals/proposal-attachments-panel.tsx`
- `apps/web/src/components/research-proposals/proposal-readiness-panel.tsx`
- `apps/web/src/lib/research-proposals-api.ts`

UI expectations:

- Attachment list with compact desktop table and mobile card layout.
- Upload control with loading, success, and error states.
- Readiness panel with clear missing item rows.
- No formal submit button unless it is disabled navigation to the later ST-2.4 action.
- No reviewer, supplement, or approval UI.

## Test and Verification Checklist

- `npm run prisma:generate`
- `npm run build:api`
- `npm run typecheck`
- Add focused upload/readiness tests if supported by current test setup.
- Manually verify:
  - Valid file upload succeeds for owning PI.
  - Invalid type and oversized file are rejected.
  - Attachment metadata displays correctly.
  - Unauthorized user cannot see attachment metadata.
  - Readiness panel lists missing fields/files.
  - Audit log exists for upload.

## Implementation Review - 2026-06-17

Completed coverage:

- ST-2.3A shared files foundation is implemented through `apps/api/src/modules/files` with MinIO object ownership, `file_records` metadata, allowed `.doc/.docx/.pdf/.xls/.xlsx` validation, configurable max size, permission-checked upload/list/download/update/delete routes, soft-delete metadata, and upload/download/update/delete audit rows.
- ST-2.3 / UC-230-A proposal attachment workflow uses the shared files API from the proposal UI and API client, preserves Unicode-safe original filenames, displays proposal-linked metadata, and avoids raw object-key exposure on the client.
- ST-2.3B / UC-230-B pre-submission readiness is covered by `GET /api/v1/research-proposals/:id/readiness`, missing structured-field/file reporting, and submit blocking until required files and required proposal data are present.

Verification evidence:

- `node --test tests/files-route.test.mjs` -> 5/5 pass.
- `node --test tests/proposals-ep02.test.mjs` -> 7/7 pass.
- `npm test` -> 48/48 pass.
- `npm run typecheck` -> pass for web and API.
- `npm run build` -> pass for Next.js web build and API build with Prisma generate.

## Done Definition

- Proposal attachments are persisted and linked to drafts.
- Backend file authorization and validation are enforced.
- Readiness reflects both structured proposal data and required package files.
- Scope remains isolated from formal submission and EP-03 supplement/review workflows.
