---
title: 'Chọn thành viên nhóm nghiên cứu từ danh mục nhà khoa học'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_commit: '0f7ed0388564a4a6a1ecc3f8dd23ba18f6c48984'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/huong-dan-su-dung/chon-thanh-vien-de-tai.md'
  - '{project-root}/docs/permission-matrix.vi.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trong form tạo/sửa hồ sơ đề xuất, chủ nhiệm gõ tay họ tên, đơn vị và tên đăng nhập của thành viên. Cách này dễ sai chính tả, nhầm người trùng tên, sai đơn vị, và tên đăng nhập thường không biết hoặc gõ sai.

**Approach:** Thay ô Họ tên/Tài khoản bằng ô tìm kiếm nhà khoa học trong danh mục `ResearcherProfile`. Chọn một người thì lưu `researcherProfileId`; server tự lấy họ tên, đơn vị và tài khoản từ hồ sơ. Người ngoài danh mục vẫn nhập thủ công được.

## Boundaries & Constraints

**Always:**
- Server là nguồn tin cậy: khi member có `researcherProfileId`, server ghi đè `name`, `organization` và `userId` bằng dữ liệu hồ sơ (`fullName`; tên đơn vị quản lý, hoặc `externalAffiliation` với hồ sơ EXTERNAL; `linkedUserId`), bỏ qua giá trị client gửi.
- Endpoint tra cứu chỉ trả `id`, `fullName`, tên học hàm, tên học vị, `organization`, `hasAccount`. Chỉ khớp theo `fullNameKey`, không khớp email hay số điện thoại. Từ khóa tối thiểu 2 ký tự; tối đa 20 kết quả; chỉ hồ sơ `ACTIVE`, gồm cả INTERNAL lẫn EXTERNAL, mọi đơn vị.
- Endpoint chỉ dành cho người có quyền tạo hồ sơ đề xuất (`assertCanCreateProposalDraft`).
- Dòng thành viên cũ (có `userId`, không có `researcherProfileId`) phải lưu lại được mà giữ nguyên `userId`.
- Hướng dẫn người dùng: `docs/huong-dan-su-dung/chon-thanh-vien-de-tai.md`.
- **Quyết định phân quyền (2026-11-01):** tra cứu thành viên là ngoại lệ hẹp so với quy tắc "Không có danh bạ": chỉ phục vụ chọn thành viên, chỉ trả các trường nêu trên, mọi đơn vị. Cập nhật `docs/permission-matrix.vi.md`, `docs/permission-matrix.md` và `_bmad-output/.decision-log.md`.

**Never:**
- Không tự gán `userId` khi liên kết tài khoản cho hồ sơ, không bắt buộc thư ký có tài khoản khi nộp: hai việc này đã chuyển vào `deferred-work.md`.
- Không mở danh bạ nhà khoa học đầy đủ (`GET /researcher-profiles`) cho người tạo hồ sơ; không thêm thư viện UI mới.
- Không còn ô nhập tên đăng nhập trên UI. API vẫn chấp nhận `username` để tương thích.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chọn từ danh mục | member `{researcherProfileId, name:"sai", organization:"sai"}` | Lưu tên/đơn vị/userId theo hồ sơ | N/A |
| Hồ sơ chưa có tài khoản | profile `linkedUserId=null` | Lưu `userId=null`, response `isAccountLinked=false` | N/A |
| Hồ sơ không tồn tại/INACTIVE | `researcherProfileId` sai | Không lưu gì | 400 "Không tìm thấy hồ sơ nhà khoa học…" |
| Trùng người | cùng `researcherProfileId` hai lần | Không lưu gì | 400 |
| Nhập thủ công | không có `researcherProfileId`, `userId` | Lưu như hiện nay | N/A |
| Tra cứu | `keyword` < 2 ký tự | `[]` | N/A |
| Tra cứu bằng email | `keyword` là email của ai đó | Không trả hồ sơ đó (trừ khi khớp tên) | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma:478` -- `ProposalMember`: thêm `researcherProfileId String?` + relation/index; back-relation trên `ResearcherProfile` (:214).
- `apps/api/prisma/migrations/` -- migration mới sau `20261027000000_project_funding_liquidation`.
- `apps/api/src/proposals-shared/proposal-types.ts:22,35` -- thêm `researcherProfileId` vào `ProposalMemberInput`, `ProposalMemberPersistInput`.
- `apps/api/src/proposals-shared/proposal-validation.ts:117` -- `readMembers` đọc `researcherProfileId`; khi có thì `name`/`organization` không bắt buộc.
- `apps/api/src/research-proposals/proposal-participation.service.ts:139` -- `resolveMemberAccounts`: nạp hồ sơ theo lô, ghi đè, chặn trùng/INACTIVE.
- `apps/api/src/research-proposals/research-proposals.service.ts` -- `replaceMembers` (~918): `key()` dùng `profile:<id>` khi không có userId; `sameMember` so sánh `researcherProfileId`; `ProposalMemberRecord` (~91); `toMemberResponse` (~1193) trả `researcherProfileId`; thêm `listMemberCandidates(actor, keyword)`.
- `apps/api/src/research-proposals/research-proposals.controller.ts` -- `@Get("member-candidates")` đặt TRƯỚC `@Get(":id")`.
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts` -- tái dùng `normalizeResearcherKey` (từ dto).
- `apps/api/src/approved-projects/approved-projects.service.ts:245` -- copy member có liệt kê field tường minh, không bị ảnh hưởng; không sửa.
- `apps/web/src/lib/research-proposals-api.ts:9` -- thêm `researcherProfileId` vào `ProposalMember`, hàm `searchProposalMemberCandidates`.
- `apps/web/src/components/research-proposals/proposal-members-editor.tsx` -- dùng chung cho `/new` và trang sửa; thay bằng combobox tìm kiếm.
- `tests/proposals-st30.test.mjs:256` -- fake prisma đã xử lý `user.findMany`; mở rộng cho `researcherProfile.findMany`.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` + migration -- thêm cột nullable, FK `ON DELETE RESTRICT`, index -- liên kết thành viên với hồ sơ.
- [x] `proposal-types.ts`, `proposal-validation.ts` -- nhận `researcherProfileId` -- hợp đồng input.
- [x] `proposal-participation.service.ts` -- ghi đè từ hồ sơ, lỗi khi không tồn tại/INACTIVE/trùng -- ranh giới tin cậy.
- [x] `research-proposals.service.ts` -- `replaceMembers`, response, `listMemberCandidates` -- lưu và tra cứu.
- [x] `research-proposals.controller.ts` -- route `member-candidates?keyword=` -- expose tra cứu.
- [x] `research-proposals-api.ts`, `proposal-members-editor.tsx` -- combobox (debounce, ARIA `combobox`/`listbox`, bàn phím), trạng thái đã chọn khóa tên/đơn vị kèm nhãn "Đã có tài khoản"/"Chưa có tài khoản" và nút "Đổi người", nút "Nhập thủ công (ngoài danh mục)"; dòng cũ giữ `userId` -- UI.
- [x] `docs/permission-matrix.vi.md`, `docs/permission-matrix.md`, `_bmad-output/.decision-log.md` -- ghi ngoại lệ tra cứu thành viên -- đồng bộ ma trận quyền.
- [x] `tests/proposals-st30.test.mjs` -- test ghi đè + INACTIVE; test tra cứu không trả trường liên hệ và không khớp email -- bảo vệ hành vi.

**Acceptance Criteria:**
- Given chủ nhiệm ở `/my-proposals/new`, when gõ "Nguyễn" và chọn một kết quả, then tên và đơn vị điền tự động, không sửa được, và sau khi lưu nháp mở lại vẫn hiển thị đúng người.
- Given hồ sơ nháp cũ có thành viên đã liên kết tài khoản, when lưu lại không đổi gì, then `userId` của thành viên đó giữ nguyên.
- Given người không có quyền tạo hồ sơ đề xuất, when gọi `member-candidates`, then nhận 403.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / Xử lý |
|---|-------|-----------|---------|--------------------|
| 1 | BH, ECH | Hồ sơ đã chọn chuyển INACTIVE làm mọi lần lưu nháp lỗi, không rõ dòng nào | medium | `updateDraft` luôn gọi `resolveMemberAccounts`; patch: thông báo nêu tên thành viên. Giữ liên kết cho dòng đã lưu → defer |
| 2 | BH | Tên/đơn vị là snapshot; đổi tên hoặc liên kết tài khoản làm dòng bị kết thúc/tạo lại ở lần lưu sau | medium | `sameMember` so `name/organization/userId`; defer (gắn với mục tự gán tài khoản đã defer) |
| 3 | BH, ECH | Dòng nhập thủ công không còn liên kết được tài khoản qua username | false | Intent frozen: "Không còn ô nhập tên đăng nhập trên UI" |
| 4 | BH | Picker không loại người đã chọn ở dòng khác | low | Server chặn trùng (400); sửa cần thêm logic lọc → reject |
| 5 | BH | Một userId được giữ hai vai trò qua dòng cũ, nhưng một hồ sơ thì không | low | Hiếm gặp, sửa cần đổi quy tắc định danh → reject |
| 6 | BH, ECH | Thành viên danh mục có thể có đơn vị rỗng | false | `managementOrganizationUnitId` bắt buộc (schema:216) nên luôn có tên đơn vị dự phòng |
| 7 | BH | Người sửa nháp không phải researcher nội bộ bị 403 khi tra cứu | maybe-false | Cần xác nhận có vai trò sửa nháp mà không qua `isInternalResearcherEligible`; nếu đúng chỉ là low → reject |
| 8 | BH, ECH | `keyword` không giới hạn độ dài | low | Sửa một điều kiện → patch |
| 9 | BH | Không ưu tiên khớp tiền tố; LIKE quét toàn bảng | low | 20 kết quả, danh mục nhỏ → reject |
| 10 | BH, VG | Không có test luồng `createDraft/updateDraft` lưu và trả `researcherProfileId`, nhánh `profile:` của `key()` | medium | Fake prisma trong `proposals-st30` đã hỏng sẵn (`tx.user.findUnique`) → defer |
| 11 | BH | Test thứ tự kết quả đúng do trùng hợp (fake bỏ qua `orderBy`) | low | Sửa trực tiếp assertion → patch |
| 12 | BH | Không ghi chú lý do `ON DELETE RESTRICT` | low | Không có xóa cứng hồ sơ → reject |
| 13 | BH | Thay đổi tài liệu không nằm trong diff | false | Diff review chỉ gồm code; tài liệu D-039 có trong working tree |
| 14 | ECH | Key theo index làm ô tìm kiếm giữ query cũ sau khi bỏ dòng | low | Hiếm gặp, sửa cần thêm client key → reject |
| 15 | ECH | Enter trong combobox khi danh sách đóng sẽ submit form | medium | `onKeyDown` chỉ `preventDefault` khi có lựa chọn → patch |
| 16 | ECH | Dòng chưa chọn / thiếu thông tin bị lọc im lặng khi lưu | medium | Bộ lọc payload có từ trước, nay áp cả dòng đang tìm → defer |
| 17 | ECH | `researcherProfileId` lộ cho phản biện | false | Nhánh phản biện ở `research-proposals.service.ts` (~1217) chỉ trả `id/name/role/organization` |
| 18 | VG | Không có test render UI picker | medium | Chưa có hạ tầng render test cho UI đề xuất → defer |

## Verification

**Commands:**
- `npm run build:api && node --test tests/proposals-st30.test.mjs` -- expected: tất cả PASS.
- `npx tsc -p apps/web --noEmit` (hoặc lệnh typecheck web của dự án) -- expected: không lỗi.

**Manual checks (if no CLI):**
- Trên `localhost:3000/my-proposals/new`: tìm, chọn, đổi người, nhập thủ công, lưu nháp, mở lại.
