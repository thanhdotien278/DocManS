# Story 3.3: Reviewer cham diem va gui nhan xet

## Status

done

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

## Delivered Implementation

### Data model

`ProposalReview` (`proposal_reviews`) — `assignmentId` (**unique**), `reviewerUserId`, `status`
(`draft` | `submitted`), `scoreData` (JSONB), `totalScore`, `comment`, `recommendation`,
`submittedAt`. The unique `assignmentId` is what makes AC-ST-3.3-01 structural: a review belongs to
one assignment, so no request shape can reach another reviewer's row.

### Scoring rubric

Fixed in code in `proposals-shared/proposal-review-access.ts`, not a rubric builder (explicitly out
of scope): Giá trị khoa học 30, Tính khả thi 25, Hiệu quả ứng dụng 25, Tính hợp lý của kinh phí 20 —
100 total. Criterion codes match the `scoring-criterion` catalog type seeded in EP-01, so a later
story can move the table into the catalog without changing the stored `scoreData` shape.
Recommendations: `approve`, `revise`, `reject`.

### Backend

- `GET :id/my-review` — the caller's own review plus the rubric and recommendation options, so the
  form can never present a criterion the server would reject.
- `PUT :id/my-review` — draft save. Accepts partial scores so a reviewer can stop halfway, but still
  refuses an out-of-range number: "missing" is allowed, "invalid" is not.
- `POST :id/my-review/submit` — validates every criterion, the comment and the recommendation, and
  returns `fieldErrors` keyed by field for inline display (AC-ST-3.3-02). Nothing is written when
  validation fails. Submitting completes the assignment, writes a `ProposalSubmissionEvent` so staff
  see completion on the timeline (AC-ST-3.3-03), and audits the submit.

All three resolve the caller's assignment first, so an unassigned reviewer, staff, the PI and
leadership are all refused (AC-ST-3.3-04). A submitted review is immutable; any reopen policy is
left to an explicit later story. A draft save is deliberately **not** audited — only the submit is.

Audit action: `submit-score-and-review-comment`.

### Frontend

`proposal-review-form.tsx` — one labelled input per criterion with its maximum, a running total,
comment, recommendation, and inline `fieldErrors`. A submitted review renders read-only rather than
disappearing, so the reviewer can still see what they sent.

### Coverage

`tests/proposals-ep03.test.mjs` — three ST-3.3 tests: a valid submit stores the review, completes
the assignment, writes the timeline event and the audit entry, and shows as completed to staff;
incomplete or out-of-range scoring blocks the submit, saves nothing and returns field-level errors;
and unassigned reviewers, staff, PI and leadership are refused while two reviewers write separate
rows and a submitted review cannot be edited.

## Post-Review Hardening

See the shared section in `3-2-phan-cong-reviewer-va-truy-cap-proposal-theo-assignment.md`, which
records the adversarial review of the whole evaluation module and the fixes applied across ST-3.2 to
ST-3.5.
