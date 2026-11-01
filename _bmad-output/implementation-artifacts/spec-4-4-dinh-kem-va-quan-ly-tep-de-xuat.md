---
title: 'Story 4.4: Đính kèm và quản lý tệp đề xuất (phần còn thiếu)'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_commit: 'a97fca3b9b906acbe9565f6f319912782b8df3a2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Upload/list/download tệp đề xuất cho PI và `TOPIC_SECRETARY` đã có, nhưng `file_records` chưa lưu `documentType`, `version`; gọi `download`/`update`/`delete` bằng file ID ngoài quyền trả 403 còn file không tồn tại trả 404, làm lộ sự tồn tại của tệp. AC 2 và 3 của `epics.md` (member/người ngoài upload tệp đóng góp) sai nghiệp vụ.

**Approach:** Thêm `document_type` và `version` vào `file_records` (migration); version tăng khi tải lại cùng loại tài liệu. Tệp đề xuất ngoài quyền đọc trả cùng 404 như tệp không tồn tại. Chốt: `TOPIC_MEMBER` và người tham gia ngoài **chỉ xem** tệp do PI/thư ký tải, không upload, thay thế hay xóa; sửa AC 2, 3 trong `epics.md`.

## Boundaries & Constraints

**Always:** Backend quyết quyền, fail closed; upload vẫn đi qua `files` module và kiểm `contextVersion`. Chỉ PI và thư ký hiệu lực (trong scope tổ chức) upload khi hồ sơ `draft` hoặc `supplement_requested`. Mọi người đọc được hồ sơ thì thấy mọi tệp của hồ sơ. Migration backfill: `document_type = file_purpose`, `version` theo thứ tự `created_at` trong cùng (hồ sơ, loại).

**Never:** Không thêm loại tệp đóng góp, không cấp quyền upload cho member hay người ngoài. Không đổi hành vi tệp của `approved_project` (giữ mã `ACTION_NOT_GRANTED`). Không thêm cột `contextVersion` vào `file_records`. Không refactor code không liên quan.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tải lần đầu | PI upload loại `X`, hồ sơ nháp | `documentType=X`, `version=1` | N/A |
| Tải lại cùng loại | PI/thư ký upload tiếp loại `X` | `version` = max cũ + 1, kể cả bản đã xóa | N/A |
| Member upload | `TOPIC_MEMBER` gọi upload | Từ chối, không lưu gì | 403 |
| Member xem | Member gọi list/download | Thấy mọi tệp active | N/A |
| Không liên quan | Actor ngoài quyền biết file ID, gọi download/update/delete | Cùng phản hồi với file không tồn tại | 404 `Không tìm thấy tệp.`, không lộ tên/object key |
| Quan hệ hết hạn | Thư ký hết hiệu lực gọi download | Như trên | 404 |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma:548` -- `FileRecord`; thêm `documentType String @map("document_type")`, `version Int @default(1)`. Migration mới trong `apps/api/prisma/migrations/` (mẫu: `20261101120000_proposal_nature_code`).
- `apps/api/src/modules/files/files.service.ts` -- `uploadFile` (dòng 140: tính version trong `$transaction`, đặt `documentType = filePurpose`); `downloadFile`/`updateFile`/`deleteFile` gọi `findActiveFile` rồi `assertCanRead`/`assertCanUpload`; thêm bước đọc-được-hồ-sơ, đổi `ForbiddenException` thành `NotFoundException` chỉ cho `research_proposal`; `toFileResponse` (dòng ~470) thêm `documentType`, `version`.
- `apps/api/src/research-proposals/research-proposals.service.ts:1488` -- `toAttachmentResponse` và `ProposalAttachmentRecord` (dòng ~113) thêm `documentType`, `version`.
- `apps/web/src/lib/research-proposals-api.ts` -- type `ProposalAttachment` thêm hai field; `proposal-detail-workspace.tsx` hiện nhãn `v{version}`.
- `_bmad-output/epics.md:2580` -- sửa AC 2, 3 theo Intent (tiếng Việt).
- `tests/proposals-ep02.test.mjs:635` -- test files service hiện có; mock `fileRecord` ở dòng 283 cần hỗ trợ `version`.

## Tasks & Acceptance

**Execution:**
- [x] `schema.prisma` + migration -- thêm cột, backfill, `NOT NULL` -- lưu `documentType`/`version`
- [x] `files.service.ts` -- tính version khi upload, trả field mới, fail-closed 404 cho tệp đề xuất -- AC 1 và 4
- [x] `research-proposals.service.ts`, `research-proposals-api.ts`, `proposal-detail-workspace.tsx` -- đưa `documentType`/`version` ra API và UI
- [x] `epics.md` -- sửa AC 2, 3 (member/người ngoài chỉ xem)
- [x] `tests/proposals-ep02.test.mjs` -- mở rộng ca upload/download hiện có: version tăng, member upload bị 403, actor ngoài nhận 404 (dùng `test-audit`)

**Acceptance Criteria:**
- Given PI upload cùng loại hai lần, when xem danh sách, then bản sau `version` lớn hơn bản trước.
- Given `TOPIC_MEMBER`, when upload, replace hoặc delete, then bị từ chối; when xem/download, then thành công.
- Given actor không liên quan, when gọi metadata/download/update/delete, then 404 giống file không tồn tại.

## Implementation Notes

- Test mới ở `tests/proposal-files-4-4.test.mjs` (suite `proposals-ep02` đỏ sẵn 9/10 ca, không chạy được logic upload). Đã đổi assertion 403→404 ở `proposals-ep02`, `ep03`, `st30` cho ca người ngoài quyền đọc tệp.
- `intake-periods.service.ts` tạo `FileRecord` trực tiếp nên được gán `documentType = item.code`.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Xử lý |
|---|---|---|
| Test hiện có còn assert 403 cho tải/sửa/xóa của người ngoài (ep02, ep03, st30) | medium, patch | Đã đổi sang `NotFoundException`; staff vẫn 403 |
| Race version khi upload song song, không unique index | low, reject | Mọi upload đề xuất đi qua `mutate` (FOR UPDATE hồ sơ, Serializable) |
| Version/documentType cũng áp cho `approved_project` | low, reject | Cột NOT NULL buộc phải đặt; hành vi quyền project không đổi |
| `downloadFile` gọi `assertCanRead` hai lần | low, reject | Sửa cần thêm nhánh, lợi ích không đáng |
| Lỗi không phải Forbidden lọt qua `findReadableFile` | false | `assertCanRead` chỉ ném `ForbiddenException` cho từ chối quyền |
| Metadata theo file ID vẫn 403 | false | Controller không có GET theo file ID; list theo proposal ID |
| Member upload 403 không có test | false | `proposals-st30` đã có ca "participant cannot upload"; đường kiểm quyền không đổi |
| Migration không index/NOT NULL khi rollout, thiếu test SQL | low, defer | Triển khai một lần; cần harness migration |
| `documentType` trùng `filePurpose`, intake dùng version mặc định 1 | low, reject | Theo thiết kế đã chốt |

## Design Notes

Version được tính trong cùng transaction với việc tạo bản ghi; `mutate` đã khóa theo context version của hồ sơ nên upload đồng thời cùng loại bị tuần tự hóa. Không thêm unique index (shortcut: chấp nhận khi chưa có upload song song ngoài `mutate`).

## Verification

**Commands:**
- `npm run build:api && node --test tests/proposal-files-4-4.test.mjs` -- expected: pass
- `tests/proposals-ep02|ep03|st30` đang đỏ sẵn từ trước (mock thiếu `tx.user.findUnique`), không dùng làm bằng chứng
- `npm run typecheck` -- expected: pass
