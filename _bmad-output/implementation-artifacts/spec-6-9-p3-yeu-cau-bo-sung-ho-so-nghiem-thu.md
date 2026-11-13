---
title: 'Story 6.9 phần 3 — Yêu cầu bổ sung hồ sơ nghiệm thu đã nộp (backend)'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: 'f493c8237d8152f61252f551fb135a56b841a97b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-8-chuan-bi-va-nop-ho-so-nghiem-thu.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-9-hoi-dong-va-ket-qua-nghiem-thu.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AC Story 6.9 ("Given dossier đã nộp, when CV³ phụ trách completeness review, then có thể yêu cầu bổ sung") chưa làm. Hồ sơ nghiệm thu đã nộp thiếu thì không có đường trả cho PI sửa và nộp lại.

**Approach:** Thêm action `acceptance-dossier.request-supplement` theo khuôn yêu cầu bổ sung báo cáo tiến độ (6.5) và hồ sơ đề xuất (bước 3): lý do + hạn bắt buộc. Hồ sơ `submitted → supplement_requested`, đề tài `pending_acceptance → executing`, `version` +1. PI sửa như nháp rồi nộp lại bằng endpoint nộp sẵn có, tạo snapshot phiên bản mới, đề tài về `pending_acceptance`. Mỗi bước một transaction gồm state, lịch sử, audit, thông báo.

## Boundaries & Constraints

**Always:**
- Người yêu cầu: TP, TB hoặc CV phụ trách, không phải thành viên đề tài (cùng tập với `acceptance-council.submit`).
- Chỉ khi đề tài `pending_acceptance`, hồ sơ `submitted`, hội đồng chưa thành lập, không có tờ trình `ACCEPTANCE_COUNCIL` đang chờ.
- Lý do bắt buộc (≤ 2000 ký tự); hạn bắt buộc, ở tương lai.
- `supplement_requested` cho phép mọi việc của `draft`: soạn mục, tải/xóa tệp, đóng góp tệp, nộp. Readiness khi nộp lại như lần đầu.
- Nộp lại: snapshot mới với version mới; snapshot cũ giữ nguyên; lịch sử ghi trạng thái nguồn thực tế.
- Thông báo PI khi bị yêu cầu (không chép lý do); nộp lại dùng thông báo nộp sẵn có (khóa idempotency theo version).
- View hồ sơ trả yêu cầu bổ sung đang mở (lý do, hạn, người yêu cầu, thời điểm).
- `contextVersion` cũ → 409.

**Never:**
- Không bảng, cột hay migration (status là String, không có CHECK; lý do/hạn đọc từ `projectHistory`).
- Không sửa luồng hội đồng, ký, ghi kết quả, thanh lý; lời mời hội đồng đã có giữ nguyên.
- Không làm giao diện web (tách sang `deferred-work.md`).
- PI, GĐ, PGĐ không yêu cầu bổ sung.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| CV phụ trách / TB / TP yêu cầu | `pending_acceptance`, hồ sơ `submitted`, chưa có tờ trình | Hồ sơ `supplement_requested`, version+1, đề tài `executing`, lịch sử, audit, thông báo PI | — |
| Thiếu lý do hoặc hạn | — | Từ chối | 400 |
| Hạn ở quá khứ | — | Từ chối | 400 `DEADLINE_INVALID` |
| PI, GĐ, CV không phụ trách, TB là thành viên đề tài | — | Từ chối | 403 `ACTION_NOT_GRANTED` |
| Tờ trình đang chờ hoặc hội đồng đã thành lập | — | Từ chối | 400 `WORKFLOW_STATE_DENIED` |
| Yêu cầu lần hai | Hồ sơ `supplement_requested` | Từ chối | 400 `WORKFLOW_STATE_DENIED` |
| PI sửa mục, tải/xóa tệp | `supplement_requested` | Thành công | — |
| PI nộp lại đủ điều kiện | `supplement_requested` | Hồ sơ `submitted`, snapshot v2, đề tài `pending_acceptance`, thông báo CV | — |
| Thành viên được mời phản hồi | Đề tài `executing` sau yêu cầu | Từ chối | 400 `WORKFLOW_STATE_DENIED` |

## Quyết định (người dùng chốt 2026-11-13)

- Người yêu cầu: TP, TB hoặc CV phụ trách (không chỉ CV), để đề tài chưa có CV phụ trách không bị kẹt.
- Lời mời hội đồng đã có: giữ nguyên; mời/thu hồi/trình/phản hồi tự khóa khi đề tài về `executing`, tiếp tục sau khi nộp lại.
- Phạm vi: spec này chỉ backend, quyền, tài liệu, test; giao diện tách story riêng.

</frozen-after-approval>

## Code Map

- `packages/permissions/src/index.ts` (:79), `index.js` (:76) -- thêm action ID `acceptance-dossier.request-supplement`.
- `apps/api/src/approved-projects/project-capability-v1.ts` -- thêm vào `PROJECT_ACTIONS` (:14). `acceptanceDossierDenial` (:177): nhánh `request-supplement` dùng điều kiện `manager` của `acceptanceCouncilDenial` (:201: `isHead || RESEARCH_BOARD_HEAD || (isStaff && officer)`) + `notInProject`, trạng thái như `forming` (:195); edit/contribute/submit chấp nhận `["draft","supplement_requested"]`. Mở rộng kiểu input (thêm `officer`, `notInProject`).
- `apps/api/src/approved-projects/acceptance-dossiers.service.ts` -- hằng `ACCEPTANCE_DOSSIER_SUPPLEMENT`; method `requestSupplement` theo khuôn `requestReportSupplement` (approved-projects.service.ts:529) trong `this.projects.mutate`, quyền qua `authorizeMutation`. `submit` (:118): `fromStatus` = `dossier.status`. `view` (:164): `editable`/`contributes` theo hai trạng thái; thêm `supplementRequest` từ `projectHistory` mới nhất có action `acceptance-dossier.request-supplement` khi hồ sơ `supplement_requested`.
- `apps/api/src/modules/files/files.service.ts` -- `assertUnsubmittedFile` (:292) chấp nhận cả `supplement_requested`.
- `apps/api/src/approved-projects/approved-projects.controller.ts` -- `POST :id/acceptance-dossier/supplement` (cạnh :122), `projectReportReviewPipe` (dto.ts:57); service kiểm bắt buộc.
- `apps/web/src/lib/projects-api.ts` -- chỉ nhãn trạng thái "Cần bổ sung" (:134) và nhãn action (:40) để UI hiện tại không hiện mã thô.
- `docs/permission-matrix.md` -- :400 (người yêu cầu, chuyển `pending_acceptance → executing`), :542, đoạn :696.
- Test mẫu: `tests/acceptance-dossier-db.test.mjs`, `tests/acceptance-council-db.test.mjs`.

## Tasks & Acceptance

**Execution:**
- [x] permissions + capability -- action mới, trạng thái sửa được.
- [x] `acceptance-dossiers.service.ts` + controller + files.service -- yêu cầu bổ sung, nộp lại, view.
- [x] `projects-api.ts` -- nhãn.
- [x] `tests/acceptance-dossier-db.test.mjs` -- các dòng ma trận I/O và vòng nộp lại v2.
- [x] `docs/permission-matrix.md`, `sprint-status.yaml` (ghi chú 6.9), `deferred-work.md` (đánh dấu mục 6.9 đã làm phần backend).

**Acceptance Criteria:**
- Given hồ sơ nộp lại thành v2, when GET hồ sơ, then `submissions` có v1 và v2 với snapshot riêng.
- Given hồ sơ `supplement_requested`, when người yêu cầu GET hồ sơ, then thấy `supplementRequest` và `readOnly: true`.

## Implementation Notes

- PI nhận thông báo theo thành viên `TOPIC_PI` đang hiệu lực, cùng cách `acceptance-council.service.ts:217`.
- `acceptanceManager`/`acceptanceForming` tách ra để `request-supplement` và `acceptance-council.submit` dùng chung một điều kiện.
- Giao diện hiện tại: `acceptance-dossier-workspace.tsx` còn gắn sửa/nộp với `status === "draft"`; chưa UI nào gọi route mới nên trạng thái `supplement_requested` chưa tới được từ web. Story UI (deferred-work) phải sửa chỗ này.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | vgap+blind | Không test `projectReportReviewPipe` (giới hạn 2000 ký tự, ngày hợp lệ) cho route mới | medium | Pre-verified. Patch: test pipe. |
| 2 | edge+blind | Hạn không parse được → NaN qua kiểm tra quá khứ, `toISOString` ném 500 | low | Pipe chặn ở HTTP; sửa một điều kiện. Patch. |
| 3 | edge+blind | `submittedAt`/`submittedById` v1 còn khi `supplement_requested`; project-detail.tsx:141 hiện "Cần bổ sung · Ngày nộp v1" | low | Sửa trực tiếp trong cùng update. Patch. |
| 4 | blind | Cột trạng thái ma trận quyền :400 thiếu `pending_acceptance → executing` | low | Sửa chữ. Patch. |
| 5 | blind+vgap+edge | Workspace web chưa cho nộp lại/đóng góp ở `supplement_requested` | low | Chưa UI nào gọi route yêu cầu bổ sung nên trạng thái không tới được từ web; UI đã tách theo quyết định người dùng (deferred-work p3). Bỏ qua. |
| 6 | blind | Kiểu `AcceptanceDossierView` thiếu `supplementRequest`, chưa có wrapper API | false | Thuộc story UI đã tách; không ai dùng trường này ở web hiện tại. |
| 7 | edge+blind | Không có PI hiệu lực thì không ai nhận thông báo | low | Đề tài luôn có `TOPIC_PI` từ lúc khởi tạo; hiếm, thêm nhánh dự phòng. Bỏ qua. |
| 8 | edge | PI xóa tệp nằm trong snapshot v1 → không tải lại được từ v1 | low | View chỉ đếm tệp của snapshot, không có chỗ tải tệp v1; chặn xóa là thêm luật mới. Bỏ qua. |
| 9 | blind | Quá hạn bổ sung không có cờ/nhắc | low | Cùng mức với yêu cầu bổ sung báo cáo 6.5; thêm tính năng. Bỏ qua. |
| 10 | blind | Thành viên hội đồng và CV không được báo khi TP/TB yêu cầu | low | Spec chỉ đòi báo PI; thêm người nhận là mở rộng. Bỏ qua. |
| 11 | blind | Đề tài về `executing` mở lại báo cáo, điều chỉnh, tạm dừng | false | Đúng quyết định "đề tài về executing"; readiness khi nộp lại vẫn chặn báo cáo dang dở. |
| 12 | blind | Thiếu test PGĐ yêu cầu, TP là thành viên, invite/revoke/submit khóa khi `executing` | low | Cùng nhánh `acceptanceManager`/`acceptanceForming` đã test bằng GĐ/TB/respond. Bỏ qua. |
| 13 | blind | Thành viên đã nhận lời không xác nhận lại sau v2 | false | Người dùng chốt giữ nguyên lời mời (2026-11-13). |
| 14 | blind | Spec in-review khi sprint-status ghi "xong" | false | Sprint-status ghi chú phần 3; khóa story 6-9 vẫn `review`. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && DATABASE_URL=… node --test tests/acceptance-dossier-db.test.mjs tests/acceptance-council-db.test.mjs tests/smoke.test.mjs` -- expected: PASS.

## Phần giao diện (người dùng yêu cầu làm tiếp 2026-11-13)

- `acceptance-dossier-workspace.tsx`: `supplement_requested` sửa/đóng góp/nộp lại như nháp; thẻ "Yêu cầu bổ sung hồ sơ" hiện lý do, người yêu cầu, hạn; form lý do + hạn cho người có `acceptance-dossier.request-supplement`; bảng phiên bản đã nộp vẫn hiện khi đang bổ sung.
- `projects-api.ts`: kiểu `supplementRequest`, wrapper `requestAcceptanceSupplement`.
- Kiểm chứng: typecheck PASS, `tests/acceptance-dossier-workspace-source.test.mjs` PASS. Chưa thử trên trình duyệt: DB dev chưa áp migration `20261112000000_acceptance_council` và chưa có hồ sơ nghiệm thu.
