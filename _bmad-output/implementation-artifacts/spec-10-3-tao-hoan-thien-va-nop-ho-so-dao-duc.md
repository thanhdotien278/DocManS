---
title: 'Story 10.3 (phần 1: backend) — Tạo, hoàn thiện và nộp hồ sơ đạo đức (IRB)'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'a9f159850a2904222a8c6303015d216cd71d9724'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-10-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chưa có hồ sơ đạo đức (IRB). PI hoặc CV phụ trách không có chỗ để lập và nộp hồ sơ cho hội đồng IRB xem xét (FR59).

**Approach:** Phần 1 (spec này) làm backend: API, quyền, tệp và test. Giao diện tách sang phần 2 (`deferred-work.md`). Thêm bản ghi `EthicsDossier` gắn với đề tài đã duyệt. Hồ sơ gồm 6 mục có cấu trúc, lưu nháp theo từng mục, và tệp đính kèm qua module tệp. Khi nộp, trạng thái đổi trong một transaction, phiên bản đã nộp bị khóa (snapshot), đồng thời ghi lịch sử đề tài, audit log và gửi thông báo. Các quyết định nghiệp vụ theo D-042 trong `_bmad-output/.decision-log.md`.

## Boundaries & Constraints

**Always:**
- Chỉ gắn với `ApprovedProject`; mỗi đề tài tối đa một hồ sơ (`projectId` unique). Tạo, sửa và nộp chỉ khi đề tài ở `preparing`, `executing` hoặc `paused`.
- PI là thành viên `TOPIC_PI` đang hiệu lực của đề tài, không suy ra từ global role. CV phụ trách là `ProjectManagementOfficer` đang hiệu lực và có role `RESEARCH_MANAGEMENT_STAFF`.
- Tạo: PI hoặc CV phụ trách. Sửa mục và tệp: PI, CV phụ trách hoặc thư ký đề tài (`TOPIC_SECRETARY`). Nộp (`ethics-dossier.submit`): chỉ PI hoặc CV phụ trách. Thành viên chỉ được xem.
- Mục 6 (cam kết) chỉ PI được tích hoặc bỏ tích.
- Xem hồ sơ: theo `project.read`, trừ PP (`RESEARCH_MANAGEMENT_DEPUTY_HEAD`) và PGĐ-TD (`RESEARCH_OVERSIGHT_AUTHORITY`).
- Readiness: đủ 6 mục; mục 1 có ít nhất một đối tượng; mục 6 đã tích; có đủ tệp bắt buộc `ETHICS_APPLICATION`, `ETHICS_PROTOCOL`, `ETHICS_DATA_TOOL`, và `ETHICS_CONSENT` (trừ khi mục 4 chọn miễn). `ETHICS_OTHER` không bắt buộc.
- Nộp xong: `status=submitted`, sửa mục hay tệp bị từ chối `WORKFLOW_STATE_DENIED`. Snapshot lưu các mục, id tệp và context đề tài (`projectContextVersion`, `sourceSubmissionEventId`, `sourceDecisionId`).
- Thông báo khi nộp gửi CV phụ trách; nếu đề tài chưa có CV phụ trách thì gửi các user `RESEARCH_BOARD_HEAD` đang active.
- (Người dùng chốt khi review, D-042) CV phụ trách tự nộp thì thông báo gửi PI. Người không phải PI sửa mục 1–5 hoặc tải lên/sửa/xóa tệp thì cam kết (mục 6) tự về chưa tích.

**Never:** giao diện web (phần 2); nộp thay hoặc ủy quyền nộp; hủy hoặc xóa nháp; kiểm tra đầy đủ và yêu cầu bổ sung (Story 10.4); hội đồng IRB và giấy chứng nhận; cờ "cần IRB"; gắn hồ sơ vào đề xuất.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| PI tạo | Đề tài `executing`, chưa có hồ sơ | Hồ sơ `draft`, lưu applicant, đơn vị, context nguồn; ghi lịch sử và audit | — |
| Tạo trùng | Đề tài đã có hồ sơ | Từ chối | 409 `ETHICS_DOSSIER_EXISTS` |
| Thư ký sửa mục | `draft` | Mục được lưu | — |
| Thư ký nộp | `draft`, đủ readiness | Từ chối | 403 `ACTION_NOT_GRANTED` |
| CV tích cam kết | Mục 6 | Từ chối | 403 `ACTION_NOT_GRANTED` |
| Nộp thiếu | Thiếu mục hoặc tệp | Từ chối, trả danh sách thiếu | 400 `READINESS_INCOMPLETE` |
| PI nộp hợp lệ | Đủ readiness | `submitted`, snapshot v1, lịch sử, audit, thông báo | — |
| Sửa sau khi nộp | `submitted` | Từ chối sửa mục, tải lên, xóa tệp | 400 `WORKFLOW_STATE_DENIED` |
| Đề tài đóng | `closed` | Từ chối tạo, sửa, nộp | `WORKFLOW_STATE_DENIED` |
| PP / PGĐ-TD xem | — | Từ chối | 403 |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- thêm `EthicsDossier` và `EthicsDossierSubmission`; quan hệ ngược trên `ApprovedProject`/`User`.
- `apps/api/prisma/migrations/` -- thư mục mới `20261109000000_ethics_dossiers` (đặt tên tay theo quy ước hiện có).
- `packages/permissions/src/index.ts` + `index.js` (bản JS viết tay, phải sửa cả hai) -- thêm `ethics-dossier.read|create|edit|submit` vào `PERMISSION_ACTION_IDS_V1`.
- `apps/api/src/approved-projects/project-capability-v1.ts` -- thêm 4 action vào `PROJECT_ACTIONS`; `project.ethicsDossier?: {status}` trong input; luật từ chối theo Boundaries.
- `apps/api/src/approved-projects/approved-projects.service.ts` -- `PROJECT_INCLUDE` thêm `ethicsDossier`; dùng lại `mutate()` (transaction, kiểm tra context, audit khi bị từ chối), `loadAuthorized()`, `currentOfficer()`, `projectContextVersion`, `readTransactionClockV1`; `toProjectResponse` trả tóm tắt `ethicsDossier {id,status,submittedAt}`.
- `apps/api/src/approved-projects/ethics-dossiers.service.ts` (mới) -- get/create/updateSection/submit; mẫu theo `createReportDraft`/`submitReport` (`:414`, `:464`).
- `apps/api/src/approved-projects/approved-projects.controller.ts` -- `GET|POST|PATCH :id/ethics-dossier`, `POST :id/ethics-dossier/submit`.
- `apps/api/src/modules/files/files.dto.ts`, `files.service.ts` -- entity `ethics_dossier`, với `relatedEntityId` = id hồ sơ. Cần sửa:
  - Whitelist ở `validateRelatedEntity` và `assertSupportedEntity`. `filePurpose` không có whitelist, nên các mã `ETHICS_*` được kiểm tra trong nhánh mới.
  - `assertCanUpload` chỉ dựa vào capability `ethics-dossier.edit`. Không áp quy tắc `PROJECT_CONTRIBUTION` cho người không phải PI.
  - `assertCanRead` chỉ dựa vào `ethics-dossier.read`. Không chặn GĐ như nhánh `approved_project` đang làm.
  - `downloadFile` gọi `assertCanRead` cho mọi entity khác proposal, nên nhánh mới không lọt vào chỗ bỏ qua kiểm tra.
  - `assertUnsubmittedFile` khóa khi hồ sơ không còn `draft`.
  - Mutation tìm `projectId` từ hồ sơ rồi định tuyến qua `mutateProject`.
- `apps/api/src/notifications/notification-events.ts` -- `NotificationSourceType` thêm `"ethics_dossier"`; gọi `notifyUsers` trong transaction nộp.

## Tasks & Acceptance

**Execution:**
- [x] schema + migration -- model `EthicsDossier { projectId @unique, applicantUserId, hostOrganizationUnitId, status, sections Json, sourceContext Json, version Int, createdById, submittedAt?, submittedById? }` và `EthicsDossierSubmission { dossierId, version, actorId, snapshot Json, submittedAt }`.
- [x] permissions + capability -- action và luật từ chối.
- [x] `ethics-dossiers.service.ts` + controller + đăng ký trong module -- create, updateSection (một mục mỗi lần, có validate), submit (readiness, snapshot, `projectHistory` `ethics-dossier.*`, audit, notify).
- [x] files module -- entity `ethics_dossier`.
- [x] `tests/ethics-dossier-db.test.mjs` -- các dòng trong ma trận I/O trên DB tạm (`createMigratedDatabase`).

**Acceptance Criteria:**
- Given hồ sơ đã nộp, when GET, then trả snapshot phiên bản 1, các mục và tệp ở chế độ chỉ đọc, và capability không còn `edit`/`submit`.
- Given CV phụ trách bị thu hồi, when CV đó thử sửa hoặc nộp, then backend từ chối.

## Design Notes

- Cách viết luật capability theo `projectActionDenial`. Hàm `authorize()` trong `loadAuthorized` đã truyền nguyên `project`, nên chỉ cần thêm `ethicsDossier` vào `PROJECT_INCLUDE` là capability tự có thông tin trạng thái hồ sơ.
- CV phụ trách: dùng lại `canOperate` (capability) và `assertOfficer` (service), không viết luật kiểm tra officer mới. Hai hàm này đã lo phạm vi đơn vị, ngoại lệ D-041 phần 2 kèm audit, và kiểm tra xung đột với vai trò phản biện.
- `ProjectHistory` và `afterFacts` của audit chỉ ghi id, trạng thái và version, không ghi nội dung các mục. Lý do: `project.history.read` theo `canRead`, nên PGĐ-TD cũng đọc được lịch sử.
- `notifyUsers` dùng `idempotencyKey` = `ethics-dossier:{dossierId}:v{version}`.
- Hình dạng `sections`: `{ subjects:{types:string[],sampleSize,description}, methods, riskBenefit, consent:{mode:"required"|"waived",text}, dataProtection, commitment:boolean }`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && DATABASE_URL=… node --test tests/ethics-dossier-db.test.mjs` -- expected: PASS.


## Implementation Notes

- Bỏ `private` ở `mutate`, `loadAuthorized`, `currentOfficer`, `assertOfficer` của `ApprovedProjectsService` để `EthicsDossiersService` dùng lại.
- Body PATCH: `{section, value, contextVersion}`; mỗi lần thay nguyên một mục. Mã đối tượng: `human|animal|biospecimen|secondary_data`.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | edge+blind | Sửa/nộp hồ sơ không đổi `aggregateVersion` → ghi đè im lặng, PI nộp nội dung chưa xem | medium | `projectContextVersion` theo `aggregateVersion`; các mutation trạng thái khác của đề tài đã tăng nó. Patch: tăng ở create/updateSection/submit và upload/sửa/xóa tệp hồ sơ. |
| 2 | edge+blind | Cam kết PI vẫn tích sau khi người khác sửa | medium | Intent gap; người dùng chốt "tự bỏ tích" (D-042). Patch. |
| 3 | edge+blind | CV tự nộp → không ai nhận thông báo | medium | `exclude` loại người nhận duy nhất. Người dùng chốt báo PI (D-042). Patch. |
| 4 | edge | Nhánh tệp hồ sơ bỏ qua `assertOfficer` cho CV | medium | `assertCanUpload` chỉ xét capability; thiếu kiểm tra xung đột phản biện. Patch. |
| 5 | edge | Không có CV và không có TB → không thông báo | low | Vận hành luôn có TB; bỏ qua. |
| 6 | edge | PI ngoài phạm vi đơn vị không tích được cam kết | false | `isPi` yêu cầu scoped giống luồng báo cáo PI hiện có. |
| 7 | edge | Nhiều `TOPIC_PI` hiệu lực → applicant tùy ý | low | Bất biến dữ liệu do luồng đề tài giữ; bỏ qua. |
| 8 | edge | Lỗi khác Forbidden làm hỏng danh sách thông báo | false | FK `Restrict` nên đề tài luôn tồn tại; `getProject` không đọc trạng thái tài khoản. |
| 9 | blind | PATCH thiếu khóa xóa dữ liệu mục | false | Thiết kế: PATCH thay nguyên một mục. |
| 10 | blind | Snapshot thiếu tên tệp/applicant | low | Tệp là bản ghi bất biến tham chiếu bằng id; bỏ qua. |
| 11 | blind | Bất biến chưa ép ở DB | low | Theo quy ước repo; bỏ qua. |
| 12 | blind | `version` chưa bao giờ tăng | low | Thuộc Story 10.4 (nộp lại); 10.4 phải tăng `version` trước khi nộp lại. |
| 13 | blind | N+1 khi liệt kê tệp hồ sơ | low | ~5 tệp mỗi hồ sơ; bỏ qua. |
| 14 | blind | Trùng tên `ethicsDossierDenial`; DTO import từ service | low | Sửa trực tiếp. Patch. |
| 15 | blind | `getDossier` không trong transaction | low | Chỉ đọc; bỏ qua. |
| 16 | vgap | Không test ẩn thông báo khi mất quyền đọc | medium | Pre-verified. Patch test. |
| 17 | vgap | Không test `assertOfficer` cho CV có xung đột | medium | Pre-verified. Patch test. |
| 18 | vgap | Không test liệt kê/xóa/sửa tệp hồ sơ ở nháp | medium | Pre-verified. Patch test. |
| 19 | vgap | Không test tóm tắt `ethicsDossier` trên chi tiết đề tài | medium | Pre-verified. Patch test. |
| 20 | vgap | Thư ký xóa được tệp do PI tải ở nháp | false | Đúng ý: PI/CV/thư ký cùng soạn nháp (D-042). |
