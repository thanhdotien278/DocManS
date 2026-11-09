---
title: 'Story 6.8 — Chuẩn bị và nộp hồ sơ nghiệm thu hoặc đánh giá cuối'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '0930f0d09f7ebbeafe67ac6758825976016dd0e8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-10-3-tao-hoan-thien-va-nop-ho-so-dao-duc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Đề tài đang thực hiện không có cách lập và nộp hồ sơ nghiệm thu (bước 8, D-033). Chưa có luồng nào đưa đề tài sang `pending_acceptance`, nên Story 6.9 (hội đồng nghiệm thu) chưa có đầu vào.

**Approach:** Làm theo khuôn hồ sơ đạo đức của Story 10.3 (`EthicsDossiersService`). Thêm bản ghi `AcceptanceDossier` gắn với `ApprovedProject`. Hồ sơ có các mục có cấu trúc, lưu nháp theo từng mục, tệp đính kèm qua module tệp và phần đối chiếu mốc tự động. PI nộp trong một transaction: hồ sơ thành `submitted`, phiên bản bị khóa (snapshot), đề tài `executing → pending_acceptance`. Cùng transaction đó ghi lịch sử, audit và báo CV phụ trách chuẩn bị hội đồng nghiệm thu.

## Boundaries & Constraints

**Always:**
- Mỗi đề tài tối đa một hồ sơ (`projectId` unique). Tạo, sửa và nộp chỉ khi đề tài ở `executing`.
- PI là thành viên `TOPIC_PI` đang hiệu lực, không suy từ global role. Chỉ PI được tạo hồ sơ, sửa mục và nộp.
- Một hồ sơ duy nhất cho nghiệm thu sản phẩm, cơ sở và cấp trên (D-034). Không có bản ghi hay mục riêng cho từng cấp.
- Mục hồ sơ gồm `results` (kết quả đạt được so với mục tiêu), `products` (danh sách sản phẩm `{name, type, description}`), `summary` (tóm tắt báo cáo tổng kết) và `milestoneNotes` (giải trình theo id mốc).
- Đối chiếu mốc: server tính từ `ProjectMilestone`, không do client gửi.
- Readiness gồm:
  - đủ `results`, `summary`, và có ít nhất một sản phẩm;
  - mọi mốc chưa `completed` đều có giải trình;
  - có đủ tệp bắt buộc `ACCEPTANCE_FINAL_REPORT` và `ACCEPTANCE_PRODUCT_EVIDENCE` (`ACCEPTANCE_OTHER` và `ACCEPTANCE_CONTRIBUTION` không bắt buộc);
  - đề tài không có yêu cầu điều chỉnh hoặc gia hạn chưa kết thúc, và không có báo cáo tiến độ đang ở `submitted`/`under_review`.
- Readiness không đạt thì trả 400 `READINESS_INCOMPLETE` kèm danh sách thiếu theo mục, và không đổi trạng thái của hồ sơ hay đề tài.
- Nộp thành công: hồ sơ thành `submitted`, đề tài thành `pending_acceptance`. Ghi `AcceptanceDossierSubmission` (snapshot gồm các mục, đối chiếu mốc, id tệp và context đề tài), `projectHistory`, audit, và tăng `aggregateVersion`. Sau đó mọi thao tác sửa mục hay tệp bị từ chối với `WORKFLOW_STATE_DENIED`.
- Thông báo khi nộp gửi CV phụ trách. Nếu đề tài chưa có CV phụ trách thì gửi các user `RESEARCH_BOARD_HEAD` đang active.
- Xem hồ sơ: theo `project.read`. PI không có thêm quyền phê duyệt hay quyết định nào.

**Never:**
- Hội đồng nghiệm thu, tờ trình `ACCEPTANCE_COUNCIL` và ghi kết quả (Story 6.9).
- Yêu cầu bổ sung hay rút hồ sơ đã nộp.
- Bản ghi hay quy trình riêng cho nghiệm thu cấp trên (D-034).
- Hủy hoặc xóa nháp.
- Sửa luồng báo cáo tiến độ.
- Giao diện web (phần 2, ghi trong `deferred-work.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| PI tạo | Đề tài `executing`, chưa có hồ sơ | Hồ sơ `draft`; ghi lịch sử, audit | — |
| Tạo trùng | Đã có hồ sơ | Từ chối | 409 `ACCEPTANCE_DOSSIER_EXISTS` |
| CV hoặc thư ký sửa mục | `draft` | Từ chối | 403 `ACTION_NOT_GRANTED` |
| Thành viên có trách nhiệm tải tệp đóng góp | `draft` | Lưu tệp, ghi lịch sử | — |
| Thành viên tải `ACCEPTANCE_FINAL_REPORT` | `draft` | Từ chối | 403 |
| Nộp thiếu | Thiếu mục, giải trình mốc hoặc tệp | Từ chối, trả danh sách thiếu | 400 `READINESS_INCOMPLETE` |
| Còn yêu cầu gia hạn mở | Hồ sơ `draft`, đề tài có yêu cầu gia hạn chưa kết thúc | Từ chối | 400 `READINESS_INCOMPLETE` (`openRequests`) |
| Thư ký nộp | Đủ readiness | Từ chối | 403 |
| PI nộp hợp lệ | Đủ readiness | Hồ sơ `submitted`, đề tài `pending_acceptance`, snapshot v1, lịch sử, audit, thông báo CV | — |
| Sửa sau khi nộp | `submitted` | Từ chối sửa mục và tệp | 400 `WORKFLOW_STATE_DENIED` |
| Đề tài `paused` | — | Từ chối tạo, sửa, nộp | `WORKFLOW_STATE_DENIED` |
| Client cũ | `contextVersion` cũ | Từ chối | 409 (cơ chế `mutate` hiện có) |

## Quyết định (người dùng chốt 2026-11-09)

- Phạm vi: spec này chỉ làm backend, API, quyền, tệp và test. Giao diện tách sang phần 2.
- Mốc chưa `completed` không chặn nộp nếu PI giải trình từng mốc.
- Chỉ PI soạn các mục hồ sơ. Thư ký và thành viên chỉ đóng góp tệp.
- Chặn nộp khi còn yêu cầu điều chỉnh hoặc gia hạn chưa kết thúc, hoặc còn báo cáo tiến độ đang chờ CV xét. Mục đích: snapshot không lệch với đề tài.

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- thêm `AcceptanceDossier` và `AcceptanceDossierSubmission`, sao theo `EthicsDossier` (`:1128`) và `EthicsDossierSubmission` (`:1154`). Thêm quan hệ ngược trên `ApprovedProject` và `User`.
- `apps/api/prisma/migrations/20261110000000_acceptance_dossiers/` -- migration viết tay theo quy ước hiện có.
- `packages/permissions/src/index.ts` + `index.js` -- thêm `acceptance-dossier.read|create|edit|contribute|submit` vào `PERMISSION_ACTION_IDS_V1`. `index.js` là bản viết tay, phải sửa cả hai file.
- `apps/api/src/approved-projects/project-capability-v1.ts` -- thêm action vào `PROJECT_ACTIONS` và trường `project.acceptanceDossier?: {status}`. Thêm hàm `acceptanceDossierDenial` theo mẫu `ethicsDossierDenial` (`:158`). Đóng góp dùng lại điều kiện của `project.evidence.contribute` (`:133`).
- `apps/api/src/approved-projects/approved-projects.service.ts` -- thêm `acceptanceDossier` vào `PROJECT_INCLUDE`; `toProjectResponse` trả tóm tắt `{id,status,submittedAt}`. Dùng lại `mutate`, `loadAuthorized`, `currentOfficer`, `assertOfficer` (đã public từ 10.3).
- `apps/api/src/approved-projects/acceptance-dossiers.service.ts` (mới) -- get, create, updateSection, submit, theo mẫu `ethics-dossiers.service.ts`. Dùng lại `bumpEthicsProjectContext` và `ethicsCapabilityError` (có thể đổi tên chung nếu sửa ít). Khi nộp, cập nhật `approvedProject.status` trong cùng transaction.
- `apps/api/src/approved-projects/approved-projects.controller.ts`, `approved-projects.module.ts`, `approved-projects.dto.ts` -- `GET|POST|PATCH :id/acceptance-dossier`, `POST :id/acceptance-dossier/submit`.
- `apps/api/src/modules/files/files.dto.ts`, `files.service.ts` -- entity `acceptance_dossier`, sửa ở những chỗ 10.3 đã thêm nhánh `ETHICS_DOSSIER_ENTITY_TYPE`: whitelist, `assertCanUpload` (PI được mọi purpose; người đóng góp chỉ `ACCEPTANCE_CONTRIBUTION` và chỉ tệp của mình), `assertCanRead`, `assertUnsubmittedFile`, và định tuyến `mutateProject`.
- `apps/api/src/notifications/notification-events.ts` -- thêm `"acceptance_dossier"` vào `NotificationSourceType`.
- `tests/ethics-dossier-db.test.mjs` -- khuôn test DB tạm (`createMigratedDatabase`) để sao cho test mới.

## Tasks & Acceptance

**Execution:**
- [x] schema + migration -- thêm hai model.
- [x] permissions + capability -- thêm action và luật từ chối.
- [x] `acceptance-dossiers.service.ts` + controller + module -- create, updateSection (mỗi lần một mục, có validate), submit (readiness, snapshot, chuyển trạng thái đề tài, lịch sử, audit, thông báo).
- [x] files module -- thêm entity `acceptance_dossier`.
- [x] `tests/acceptance-dossier-db.test.mjs` -- các dòng của ma trận I/O.

**Acceptance Criteria:**
- Given hồ sơ đã nộp, when GET, then trả snapshot v1, các mục và tệp ở chế độ chỉ đọc, đề tài ở `pending_acceptance`, và không còn action `edit`/`submit`/`contribute`.
- Given đề tài `pending_acceptance`, when PI thử tạo báo cáo tiến độ hoặc yêu cầu điều chỉnh, then bị từ chối với `WORKFLOW_STATE_DENIED` (hành vi `canPi` hiện có).

## Design Notes

- Lịch sử đề tài và `afterFacts` chỉ ghi id, trạng thái, version và purpose của tệp, không ghi nội dung mục (giống 10.3).
- `idempotencyKey` của thông báo: `acceptance-dossier:{dossierId}:v{version}`.
- Đối chiếu mốc trả về `[{milestoneId, title, dueDate, status, note}]`.
- Khi nộp, ghi hai dòng `projectHistory`: `acceptance-dossier.submit` (trạng thái hồ sơ) và `project.acceptance.submit` (`fromStatus: executing`, `toStatus: pending_acceptance`), theo mẫu `project.setup.confirm` (`approved-projects.service.ts:297`). Nhờ đó timeline đề tài hiện "Chờ nghiệm thu".

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && DATABASE_URL=… node --test tests/acceptance-dossier-db.test.mjs` -- expected: PASS.

## Implementation Notes

- `AcceptanceDossier` không có `applicantUserId`/`hostOrganizationUnitId` (PI lấy từ thành viên hiện hành). Dùng lại `ethicsCapabilityError`, `bumpEthicsProjectContext`, `ethicsSectionPipe`.
- `notifications.service.ts` thêm nhánh lọc `acceptance_dossier` (ngoài Code Map) để người nhận thấy thông báo.
- Review: sửa quyền đóng góp cho thư ký theo Always; link thông báo tạm trỏ `/projects/{id}` tới khi có giao diện phần 2.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 0 | tự soát diff | Thư ký không đóng góp được tệp nếu không phụ trách mốc | medium | Lệch Always (thư ký HOẶC người phụ trách mốc). Đã sửa `acceptanceDossierDenial` và test. |
| 1 | edge+blind | Báo cáo `supplement_requested` không chặn nộp; sau nộp PI không sửa được | low | Quyết định chỉ chặn báo cáo "đang chờ CV xét"; không làm lệch snapshot. Defer để người dùng xác nhận. |
| 2 | edge | Yêu cầu nháp chặn nộp | false | Đúng spec: "yêu cầu chưa kết thúc"; `openRequests` cho PI biết để rút. |
| 3 | edge | CV phụ trách bị khóa tài khoản → không ai nhận thông báo | low | Dữ liệu bất thường; cùng cách 10.3. Bỏ qua. |
| 4 | blind | Dự phòng gửi mọi TB, không lọc đơn vị | false | TB xem toàn Học viện (`academyWide`), giống D-042. |
| 5 | blind | Snapshot tệp chỉ có id/purpose | low | Như triage #10 của 10.3. Bỏ qua. |
| 6 | vgap+blind | Thiếu test thành viên không phụ trách mốc bị từ chối đóng góp | medium | Pre-verified. Patch test. |
| 7 | vgap | Không quan sát tăng context sau khi đổi tệp | medium | Pre-verified. Patch test. |
| 8 | vgap+blind | Thiếu test xóa tệp hợp lệ khi nháp | medium | Pre-verified. Patch test. |
| 9 | vgap | Báo cáo `submitted` chặn nộp chưa có test | low | Thêm một dòng vào test 2. Patch. |
| 10 | blind | Thiếu test người ngoài bị từ chối đọc | low | `canRead` có sẵn đã được test ở luồng đề tài. Bỏ qua. |
| 11 | blind | Truy vấn lặp khi upload | low | Vài truy vấn mỗi lượt; bỏ qua. |
| 12 | blind | Hai nguồn đồng hồ khi tăng context; `bumpContext` riêng | low | Cùng cách nhánh tệp đạo đức; bỏ qua. |
| 13 | blind | Link thông báo trỏ route web chưa có (404) | medium | Route chưa tồn tại. Patch: trỏ `/projects/{id}`. |
| 14 | blind | Helper tên ethics; module files import từ approved-projects | low | Phụ thuộc đã có từ 10.3. Bỏ qua. |
| 15 | blind | `milestoneNotes` mồ côi/khoảng trắng | low | Readiness trim; đối chiếu tính từ mốc hiện tại. Bỏ qua. |
