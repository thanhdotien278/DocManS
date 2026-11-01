---
title: 'Story 4.1: Vá lệch AC và lỗ hổng scope của đợt tiếp nhận'
type: 'bugfix'
created: '2026-11-01'
status: 'done'
baseline_commit: '6395747b04fbb2f235dce1fe693a6b1c1a35152b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Review Story 4.1 cho thấy đợt tiếp nhận lệch AC: chưa audit khi từ chối, audit thiếu before/after và context version, AC còn đòi "loại đề xuất" và "checklist" theo đợt trong khi nghiệp vụ không cần, CV có scope hẹp tạo được đợt toàn Học viện, và panel không hiện lỗi/kết quả mở-đóng đợt. Các luồng sửa/mở/đóng và xung đột `contextVersion` chưa có test chạy được.

**Approach:** Sửa AC cho khớp nghiệp vụ, vá các lệch AC trong `proposal-intake-periods` (API và panel web), bổ sung test cho update/open/close, xung đột version và scope. Phần cứng hóa upload và dọn tệp mồ côi để sau.

## Decisions

- Đợt tiếp nhận không lưu "loại đề xuất" hay checklist riêng. "Checklist" chính là gói tệp bắt buộc (`requiredPackage`); loại đề tài và tính chất đề tài do PI chọn trên hồ sơ (đã làm, commit `6395747`). Sửa AC Story 4.1 trong `epics.md` và dòng "Đợt tiếp nhận" trong `epic-4-context.md` cho khớp. Không migration.

- CV có scope đơn vị hẹp vẫn được tạo, sửa đợt "toàn Học viện" (danh sách đơn vị rỗng), giữ như hiện nay, khớp `epic-4-context`. Không thêm kiểm tra scope cho trường hợp này.
- Đợt đang mở vẫn sửa được ngày, mã, gói tệp như hiện nay, không khóa field.
- Chỉ TP và CV quản lý đợt tiếp nhận; TB không có quyền, giữ nguyên AC và `permission-matrix`.

## Boundaries & Constraints

**Always:** Backend quyết quyền, fail closed. Mutation lưu trọn vẹn hoặc không lưu gì. Audit từ chối phải ghi ngoài transaction (giao dịch đã rollback). Mã lỗi gắn đúng trường khi từ chối dữ liệu đợt.

**Never:** Không thay đổi quy tắc CV phụ trách đợt (Story 4.7). Không hardening upload (giới hạn dung lượng, magic bytes), không dọn tệp mồ côi, không streaming tải mẫu. Không refactor module không liên quan.

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts` -- `mutate` (dòng 55), `createPeriod` (166), `updatePeriod` (207), `openPeriod` (264), `closePeriod` (293), `readUnits` (133), `assertIntakeScope` (339).
- `apps/api/src/proposals-shared/proposal-access.ts:96` -- `intakeAppliesToUser`; `assertCanManageIntakePeriods` (dòng 66).
- `apps/web/src/components/proposal-intake-periods/proposal-intake-periods-panel.tsx` -- `handleStatusAction`, `handleSubmit`, dialog tạo/sửa.
- `_bmad-output/epics.md` (Story 4.1, dòng ~2477) và `_bmad-output/implementation-artifacts/epic-4-context.md` -- AC cần sửa.
- `tests/intake-templates.test.mjs` -- test hiện có (chỉ tạo và tải mẫu); mock đã có `$transaction`, `$queryRaw`, `user.findUnique`.
- `apps/api/prisma/schema.prisma:423` -- `ProposalIntakePeriod`.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/epics.md`, `epic-4-context.md` -- bỏ "loại đề xuất, checklist" theo đợt khỏi AC Story 4.1, ghi checklist là gói tệp bắt buộc -- AC khớp nghiệp vụ
- [x] `proposal-intake-periods.service.ts` -- `mutate` ghi audit thất bại (ngoài transaction, cùng cách `updateDraft` ở 4.3) khi `ForbiddenException`, kèm actor và đợt đích -- AC từ chối có audit
- [x] `proposal-intake-periods.service.ts` -- audit thành công của create/update/open/close ghi before/after và `contextVersion` vào `reason` (JSON) -- truy vết thay đổi
- [x] `proposal-intake-periods.service.ts` -- bắt Prisma P2002 trùng `code` trả `ConflictException` kèm `field: "code"`; `openPeriod` trên đợt đã `open` trả `BadRequestException` -- lỗi 4xx đúng trường
- [x] `proposal-intake-periods-panel.tsx` -- hiện lỗi/kết quả mở-đóng ở khu vực ngoài Dialog (`role="status"` / `role="alert"`), `setShowCreate(false)` sau khi tạo thành công -- người dùng thấy kết quả
- [x] `tests/intake-templates.test.mjs` -- mở rộng mock (`proposalIntakePeriod.findUnique/update`) và thêm ca: open rồi close với `contextVersion` đúng, `contextVersion` cũ trả 409 `CONTEXT_VERSION_MISMATCH`, mở đợt đã mở trả 400, TB bị từ chối và có audit thất bại, mã trùng trả 409

**Acceptance Criteria:**
- Given TP hoặc CV có quyền, when tạo, sửa, mở hoặc đóng đợt, then audit thành công có before/after và context version.
- Given actor là TB, QT, BGĐ hoặc NCV, when tạo, sửa, mở hoặc đóng đợt, then bị từ chối và có audit thất bại không lộ dữ liệu ngoài phạm vi.
- Given `contextVersion` cũ, when mở hoặc đóng đợt, then trả 409 và không đổi trạng thái.
- Given mã đợt đã tồn tại, when tạo hoặc sửa, then trả 409 gắn trường `code`.
- Given thao tác mở hoặc đóng từ danh sách thất bại hoặc thành công, then panel hiển thị kết quả.

## Implementation Notes

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass
- `npm run build:api && node --test tests/intake-templates.test.mjs` -- expected: pass

