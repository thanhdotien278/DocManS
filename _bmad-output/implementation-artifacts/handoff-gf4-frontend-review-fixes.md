# Handoff — GF4 frontend review fixes (13 patches)

Created 2026-10-14. Self-contained brief for a new session. Project root: `/Users/Super/DocManS`.

## Context

- Golden Flow 4 (Epic 6 project execution) code review, batch 2 (frontend), produced 13 `[Review][Patch]` items. They are recorded under `### Review Findings` → "Code review 2026-10-14, batch 2" in `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`. That spec is the source of truth; tick each item `[x]` there when it is done.
- Contract: `docs/contracts/project-execution.md` (section "Capabilities and UX").
- Batch 1 (backend) fixes are applied but **uncommitted** in the working tree:
  - `approved-projects.service.ts`, `project-capability-v1.ts`, `schema.prisma`;
  - migration `20261015000000_project_report_superseded`;
  - `project-detail.tsx`, `projects-api.ts`;
  - tests `tests/approved-project-service.test.mjs` and `tests/project-execution-migration.test.mjs`.
  
  The API now returns per-item `allowedActions` on every request and report; the web reads them through `canItem` in `apps/web/src/lib/projects-api.ts`. Build on this; do not revert it.
- `apps/web/src/components/researcher-profiles/scientific-cv/cv-history-tabs.tsx` has an unrelated, uncommitted CV change that was not made by the GF4 work. Leave it alone and do not include it in any GF4 commit.
- Follow `AGENTS.md`: BMAD `bmad-build` for implementation, test policy (`test-audit`), and a scoped diff. Write the final report in Vietnamese, ADREP format per the user's CLAUDE.md.

## Files

- `apps/web/src/components/projects/project-detail.tsx` (most items)
- `apps/web/src/components/projects/project-list.tsx` (items 6, 7)
- `apps/web/src/lib/projects-api.ts` (types/helpers if needed)
- `tests/approved-project-service.test.mjs` (item 13)

## The 13 patches

1. **Adjustment correction overwrites the PI's proposal.** "Tạo bản sửa theo yêu cầu" for an adjustment sends `adjustmentValues()` from the shared create form, which is `{scope:{}}` when the form is untouched. Default to `item.proposedValues`; use form values only when the PI edited them for that item.
2. **Report correction sends empty period/checkpoint.** It spreads the new-draft form state `report`, so `checkpointId`, `reportingPeriodStart` and `reportingPeriodEnd` go out as `""`. Default to the item's own values; text fields already fall back to the item.
3. **Shared evidence selection.** A single `evidenceIds` state is attached to whichever report or request is submitted next. Key the selection by target item id. Show the picker wherever a submit action is allowed.
4. **"Báo cáo chung" sends `checkpointId: ""`.** Send `undefined` instead.
5. **PI cannot edit an existing draft report.** "Lưu bản nháp báo cáo" always POSTs a new revision. When the PI has an open draft, prefill the form and PATCH `reports/:reportId`, gated on `canItem(item, "project.report.draft")`.
6. **`/my-projects` is not personal.** `ProjectList({ mine })` calls the same `listProjects()`. When `mine` is set, keep only projects whose `viewerAuthorization.viewerRelationships` include `TOPIC_PI`, `TOPIC_MEMBER` or `TOPIC_SECRETARY`.
7. **"Tạo đề tài" is ungated.** It shows for every approved proposal without a project, to Head, Leadership and unassigned Staff alike; the backend allows only the active proposal management officer. Show it only when the proposal's viewerAuthorization shows that relationship. Check the proposal capability shape in `apps/api/src/permissions/proposal-capability-v1.ts` and `apps/web/src/lib/research-proposals-api.ts`. Also guard a missing `contextVersion` with a notice, as `ProjectDetail.run` does.
8. **Officer revoke reason is a fixed default** ("Thu hồi phân công"). Require a user-entered reason next to the revoke button.
9. **Missing confirmations.** Add a `confirmText` to: setup "Lưu mốc triển khai", "Bắt đầu xem xét" (report and adjustment), "Kiểm tra hành chính" (extension validate), and "Trình Trưởng phòng" (extension prepare).
10. **Raw codes in the UI.** Map the following to Vietnamese business labels: project status (use the contract's labels, e.g. "Chuẩn bị triển khai", "Đang thực hiện"), report and request statuses (including `withdrawn` and `superseded`), `participationRole`, and history `action`. Show the officer's name instead of `officerUserId`; the name is available from `managementOfficers` in the API include. If the response lacks it, add a minimal field.
11. **File inputs.** Reset `event.target.value` after each upload and disable the inputs while `busy`.
12. **Withdraw with an empty or cancelled reason does nothing silently.** Show `setNotice("Cần nhập lý do rút yêu cầu.")`.
13. **Test.** In `tests/approved-project-service.test.mjs`, extend the test "each request and report carries the viewer's own allowed actions". Assert that the PI's per-item report `allowedActions` are `["project.report.draft","project.report.submit"]` for their own `draft`, and `["project.report.draft"]` for a `supplement_requested` report.

## Verification

- `npm run typecheck`, then `npm run build`. Tests import from `dist/`.
- `node --test tests/approved-project-service.test.mjs tests/approved-project-withdraw.test.mjs tests/project-execution-capability.test.mjs tests/project-execution-migration.test.mjs`
- `npm test` — compare the failing test names (with durations stripped) against the baseline: 54 pre-existing failures, all unrelated (proposal, EP-02/03 and admin suites). The latest run had 220 tests, 165 pass, 54 fail, 1 skip. There must be no new failures.
- Browser, using the preview configs `api-4001` and `web-3001` in `.claude/launch.json`. Seeded accounts all use password `1234`: PI `patuan`, project Staff `hdtien2`, Head `nmphuong`, Leadership `tvtien`.
  - Check items 1–12 on `/projects/gf4-demo-project`, `/projects` and `/my-projects`.
  - The dev DB demo data is partly consumed: the extension was approved, an adjustment was approved, and the report was accepted. Creating new drafts or requests as PI is fine. Reseeding needs `gf4-demo-project` deleted first, which requires the user's approval.
- The user's own servers on `:3000`/`:4000` run old code; tell the user to restart them. Do not kill them yourself.

## Out of scope / deferred (do not do)

- Staff/Head monitoring workspaces (calendar, extension queue, `/projects/monitor`).
- Multi-milestone setup UI.
- A UI test harness.
- Files-service project-branch tests (batch 1, item 19, partial).

All of these are listed in `deferred-work.md`.

## Close-out

- After the fixes: set the GF4 spec status per the review rules (`done` only if no unresolved patches remain; batch 1 item 19 is still partial) and sync `sprint-status.yaml` (epic-6 stays `in-progress`; 6.8–6.9 are not started).
- Commit only if the user asks. The branch is `DocManS` (main). Keep the unrelated CV file out of the commit.
