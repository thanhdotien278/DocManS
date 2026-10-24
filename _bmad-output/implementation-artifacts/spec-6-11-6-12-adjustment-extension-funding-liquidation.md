---
title: 'Stories 6.11 and 6.12: adjustment/extension via tờ trình, funding metadata, liquidation'
type: feature
status: in-review
story_keys: [6-6, 6-7, 6-11, 6-12]
---

# Stories 6.11 / 6.12

AC source: `_bmad-output/epics.md` Stories 6.6, 6.7, 6.11, 6.12; D-033, D-034, D-035.

## Status reconciliation (no new status names)

| Former request status | Meaning now | Routing state (`approval_submissions`, `subject_ref` = request id) |
| --- | --- | --- |
| `submitted` | PI submitted, waiting for CV | none |
| `under_staff_review` (adjustment) / `under_staff_validation` (extension) | CV appraises; also where a RETURNED request lands | none PENDING (last one `RETURNED`) |
| `ready_for_head_decision` (both types) | CV appraisal recorded and tờ trình opened | PENDING at `BOARD_REVIEW` → `HEAD_REVIEW` → `LEADERSHIP` |
| `approved` / `rejected` | GĐ or PGĐ-KH signed at `LEADERSHIP` | `APPROVED` / `REJECTED`, applied in the same transaction |
| `withdrawn` | PI withdrew | `CANCELLED` (step `CANCEL` by PI) |
| `supplement_requested` | CV asked PI to supplement during appraisal | none |

`ready_for_head_decision` is kept only as the stored name; its label says "tờ trình đã trình". The Architect may rename it.

## What changed

- `POST /projects/:id/requests/:type/:requestId/prepare` (both types): CV records the appraisal note (required) and opens `PROJECT_ADJUSTMENT`/`PROJECT_EXTENSION`. Appraisal changes nothing on the project.
- `decideRequest` is signer-only: GĐ or PGĐ-KH, not a project member, tờ trình at `LEADERSHIP`; `closeApprovalSubmission` and the change run in one `mutate` transaction. Others get `ACTION_NOT_GRANTED` or a conflict denial.
- TB/TP return: `revertProjectRequest` (approval-routing.ts) moves the request back to the CV status with history; Head/Staff decision paths and the Head supplement path are removed.
- PI withdraw cancels the open tờ trình. UI shows the stage and the rule that PI may withdraw when nobody can review or sign.
- Capability: GĐ, PGĐ-KH, TP, TB read every project; approve/reject only for signers; per-request `approve/reject` listed only at `LEADERSHIP`.
- 6.12: `project_funding_records` (append-only versions, GRANT/DISBURSEMENT/SETTLEMENT) with history and audit; `project_liquidations` + `LIQUIDATION` tờ trình (GĐ only). Signing sets `Accepted`/`Failed` → `Closed` atomically. PGĐ-TD gets no per-project funding (endpoint, project detail and list) and only `GET /projects/funding/summary`.

## Gaps

- No flow yet produces `accepted`/`failed` (Stories 6.8/6.9 are backlog), so liquidation cannot be reached outside tests; the gate itself is implemented.
- Funding documents: `fileRecordIds` must reference active files already attached to the project; GĐ/TP/TB/CV cannot upload through `FilesService` (only PI/members can). Upload for funding writers is open.
- No web UI for funding records or liquidation; no notifications (Epic 11).
- `/approvals` routes for TB/TP do not yet show project-specific context beyond the title.
