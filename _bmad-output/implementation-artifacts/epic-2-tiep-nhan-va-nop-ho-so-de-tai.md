# Epic 2: Tiep Nhan Va Nop Ho So De Tai

## Status

In Progress

## Source

- Source epic: `_bmad-output/epics-and-stories.md` -> `EP-02: Tiep Nhan Va Nop Ho So De Tai`
- Sprint tracker: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Epic Goal

Build the controlled intake slice for research proposals: staff can open intake periods, PIs can prepare proposal drafts, attach required files, verify readiness, and formally submit into a traceable workflow entry point.

## Story Sequence

1. `2-1-tao-va-quan-ly-dot-tiep-nhan-de-tai.md`
   - Establish proposal intake periods, open/close rules, minimum required package configuration, and audit logging.
2. `2-2-tao-nhap-ho-so-de-xuat-va-nhap-thong-tin-co-cau-truc.md`
   - Create and save structured proposal drafts tied to an eligible intake period.
3. `2-3-dinh-kem-ho-so-de-xuat-va-kiem-tra-dieu-kien-truoc-khi-nop.md`
   - Attach required proposal files and compute readiness for submission.
4. `2-4-nop-ho-so-chinh-thuc-va-xem-lich-su-nop.md`
   - Submit a ready proposal and expose submission history/timeline.

## Epic Boundaries

In scope:

- Intake period management.
- Proposal draft creation and editing.
- Proposal attachment upload and metadata.
- Pre-submission readiness checks.
- Formal submission transition from draft to submitted.
- Submission history and audit log capture.

Out of scope:

- Supplement requests and resubmission after staff review.
- Reviewer assignment, scoring, evaluation summary, approval, or rejection.
- Approved-project creation.
- A generic workflow engine or full proposal lifecycle state machine beyond the statuses needed for EP-02.

## Shared Implementation Guardrails

- Use PostgreSQL with Prisma migrations for new persistent business data.
- Keep modules explicit: `proposal-intake-periods`, `research-proposals`, and `files` where needed.
- Backend authorization is mandatory; frontend checks are only UX hints.
- State-changing operations must be explicit service methods, not arbitrary field updates.
- Audit logs are required for critical actions: create/update proposal draft, upload important file, and submit proposal.
- Avoid fixture-only implementation for EP-02 business data.

## Epic Done Definition

- All four EP-02 story files are implemented and marked `done` in `sprint-status.yaml`.
- A PI can complete the happy path from eligible intake period to submitted proposal.
- Unauthorized users cannot create/edit/submit proposals or access attachments outside their allowed scope.
- Audit logs and submission history are verifiable for the core EP-02 actions.
