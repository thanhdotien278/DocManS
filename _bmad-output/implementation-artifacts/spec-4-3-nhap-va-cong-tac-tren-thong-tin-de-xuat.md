---
title: 'Story 4.3: Nhập và cộng tác trên thông tin đề xuất có cấu trúc'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_commit: '34e304fa176a3cbf0ddb859cf0e68ccc1d35f6a1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/docs/permission-matrix.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chỉ PI sửa được hồ sơ nháp; `TOPIC_SECRETARY` chưa sửa được phần tóm tắt nháp. `epics.md` từng mô tả section được giao cho thành viên, không đúng nghiệp vụ.

**Approach:** Chỉ PI và `TOPIC_SECRETARY` cập nhật hồ sơ. Thư ký chỉ được sửa `summary` ở trạng thái `draft` hoặc `supplement_requested`; `TOPIC_MEMBER` và người tham gia ngoài chỉ xem. Backend trả `allowedActions` đúng theo quan hệ, UI không suy ra quyền.

## Boundaries & Constraints

**Always:** Backend quyết quyền, fail closed. Mutation lưu trọn vẹn hoặc không lưu gì, audit cả khi từ chối. PI vẫn sửa toàn bộ field như hiện nay. Thư ký phải có quan hệ hiệu lực và trong scope tổ chức.

**Never:** Thư ký không đổi PI, roster, mục tiêu, kinh phí, trạng thái, không nộp thay PI. Không thêm section được giao, cột `grantedSections` hay migration. Không đụng quyền tệp (Story 4.4). Không refactor code không liên quan.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| PI sửa | PI gửi mọi field hợp lệ, hồ sơ nháp | Lưu, audit, trả capability mới | Lỗi gắn đúng field, không lưu gì |
| Thư ký sửa tóm tắt | Thư ký gửi `summary`, hồ sơ nháp | Lưu và audit | N/A |
| Thư ký sửa field khác | Thư ký gửi `objectives`, `budgetMetadata`, `members`... | Từ chối toàn bộ | 403, không lưu field nào |
| Thành viên sửa | `TOPIC_MEMBER` gửi bất kỳ field | Từ chối | 403 |
| Sai trạng thái | Hồ sơ đã nộp | Từ chối với PI và thư ký | 400 trạng thái |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposals-shared/proposal-access.ts:166` -- `assertCanEditProposalDraft` chỉ cho `ownerId`; thêm nhánh thư ký.
- `apps/api/src/research-proposals/research-proposals.service.ts:296` -- `updateDraft`; thư ký chỉ qua nhánh sửa `summary`. `assertCanMutateProposalContent` (dòng 903) và `canMutateProposalFiles` (dòng 1280, mẫu kiểm tra thư ký đã có).
- `apps/api/src/permissions/proposal-capability-v1.ts:140` -- `proposal.draft.update`; thêm điều kiện cho thư ký.
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx:161` -- `canEdit`; form thư ký chỉ mở ô tóm tắt, dòng 491 đã hiển thị quan hệ.

## Tasks & Acceptance

**Execution:**
- [x] `proposal-access.ts` -- cho thư ký hiệu lực qua kiểm tra sửa nháp, giữ PI -- điểm quyền duy nhất
- [x] `research-proposals.service.ts` -- thư ký gửi field ngoài `summary` thì từ chối toàn bộ và audit -- tránh lưu một phần
- [x] `proposal-capability-v1.ts` -- `allowedActions` đúng theo PI/thư ký/thành viên -- UI dùng đúng
- [x] `proposal-detail-workspace.tsx` -- thư ký chỉ sửa ô tóm tắt, thành viên chỉ đọc kèm lý do -- không suy quyền
- [x] Test hiện có của research-proposals -- thêm ca thư ký sửa `summary`, thư ký sửa field khác, thành viên sửa (dùng `test-audit`)

**Acceptance Criteria:**
- Given thư ký hiệu lực và hồ sơ nháp, when gửi `summary`, then lưu và audit.
- Given thư ký gửi kèm field khác, when lưu, then từ chối toàn bộ, không lưu field nào.
- Given `TOPIC_MEMBER`, when sửa, then bị từ chối, UI chỉ đọc.

## Implementation Notes

## Verification

**Commands:**
- Chạy test của `apps/api` liên quan research-proposals và `tsc` -- expected: pass

## Review Triage Log

| Finding | Verdict | Bằng chứng / xử lý |
|---|---|---|
| UI chạy `validateDraft` cho thư ký, bị chặn bởi field không sửa được | low, patch | Đã sửa: bỏ qua `validateDraft` khi `!canEditAllFields`. |
| Thiếu test thư ký trên hồ sơ đã nộp, thiếu `actorId`/`reason` của audit | medium, patch | Đã mở rộng ca Story 4.3 (thư ký bị mất `proposal.draft.update` và `updateDraft` trả 400; audit đúng `actorId` và `reason`). |
| `canSecretaryEditSummary` thiếu kiểm tra org scope | false | `canMutateProposalFiles` gọi `assertHasOrganizationScope` ở dòng 1280+. |
| Payload thiếu `contextVersion` | false | `updateResearchProposalDraft` nhận token làm tham số riêng (dòng 254). |
| Participant thấy form đầy đủ, backend không lọc field | false | Dữ liệu vốn đã trả cho người có quyền đọc; form chỉ hiển thị, các ô đều `disabled`. |
| `proposal-capability-v1.ts` không đổi dù task nêu | false | `allowedActions` được test xác nhận (có `proposal.draft.update`, không có `proposal.submit`). |
| Audit từ chối chỉ ghi cho `ForbiddenException`, không ghi `BadRequestException` (sai trạng thái) | low, defer | Lỗi validate cũng là `BadRequest` nên không phân biệt được từ chối; cần thiết kế riêng. |
| Body response `canEdit` khác `viewerAuthorization` | low, defer | UI chỉ đọc capability; chưa có consumer dùng body. |
| Ràng buộc secretary lặp ở 3 nơi, tham số `participation` tùy chọn | low, defer | Refactor không bắt buộc cho story này. |
| UI không có test render | medium, defer | Repo không có harness render component; cần kiểm tra thủ công. |
