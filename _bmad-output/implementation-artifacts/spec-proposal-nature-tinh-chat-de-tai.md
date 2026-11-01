---
title: 'Thêm Tính chất đề tài (Quân sự/Dân sự) và chuẩn hóa danh mục Loại đề tài'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_commit: '37708cdd88f5ee2eacf5f4336e207473065989ed'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hồ sơ đề xuất chưa có "Tính chất đề tài" (Quân sự / Dân sự) để phân loại đề tài, và danh mục "Loại đề tài" trong `seed.mjs` mới có 1 mục trong khi nghiệp vụ cần 7.

**Approach:** Thêm trường `proposalNatureCode` vào hồ sơ, lấy từ danh mục mới `proposal-nature`, giống cách `proposalTypeCode` đang chạy: PI chọn khi tạo nháp, sửa được ở trang chi tiết, bắt buộc khi nộp. Bổ sung 6 loại đề tài còn lại vào seed.

## Decisions

- Tính chất bắt buộc khi nộp và nộp lại: thiếu thì kiểm tra sẵn sàng báo "Tính chất đề tài".
- Catalog `proposal-nature` có 2 mục seed: `military` = "Quân sự", `civil` = "Dân sự"; admin quản lý được trong trang danh mục.
- 6 loại đề tài thêm vào seed (cùng `academy-level` đã có): `student-research` "Đề tài Sinh viên / Học viên NCKH", `ministry-defense` "Đề tài cấp Bộ Quốc phòng", `base-level` "Đề tài cấp Cơ sở", `sector-level` "Đề tài cấp Ngành / Cục", `national-level` "Đề tài cấp Quốc gia". Seed bỏ qua mục nếu DB đã có mục cùng `type` và `name`, tránh trùng với dữ liệu đã nhập tay.
- Hồ sơ cũ để `proposalNatureCode = null` và phải chọn trước khi nộp.

## Boundaries & Constraints

**Always:** Giá trị phải thuộc catalog `proposal-nature` đang `active` (kiểm tra bằng `validateCatalogs`). Migration Prisma cho cột mới. Chỉ PI (và người đã được sửa theo 4.3) sửa được, như các field khác. Giữ nguyên quy tắc khóa nội dung sau khi nộp.

**Never:** Không đổi cơ chế `proposalTypeCode`. Không lan sang đề tài đã duyệt, hội đồng hay báo cáo. Không đổi mã loại đề tài đã có trong DB.

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma:434` -- `ResearchProposal`; thêm `proposalNatureCode String? @map("proposal_nature_code")`, và migration mới trong `apps/api/prisma/migrations/`.
- `apps/api/prisma/seed.mjs:351` -- mảng `catalogs`; thêm `proposal-nature` và 5 loại; tránh trùng theo `name`.
- `apps/api/src/admin/admin-catalogs.service.ts:7` -- `CATALOG_TYPES`; thêm `proposal-nature`. `apps/web/src/components/admin/admin-catalogs-panel.tsx:13` -- nhãn loại danh mục.
- `apps/api/src/research-proposals/research-proposals.dto.ts` -- DTO và pipe tạo/sửa nháp (5 chỗ dùng `proposalTypeCode`).
- `apps/api/src/research-proposals/research-proposals.service.ts` -- `createDraft` (dòng 240), `updateDraft` (296), `validateCatalogs` (806), danh sách catalog trả cho form (dòng 802), `getMissingFields` (1176), response chi tiết.
- `apps/web/src/lib/research-proposals-api.ts:166,213` -- kiểu dữ liệu.
- `apps/web/src/components/research-proposals/research-proposals-panel.tsx:394` -- form tạo nháp; thêm select "Tính chất đề tài".
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx:80,198,538` -- form sửa và nhãn; thêm select và hiển thị.
- `tests/proposals-st30.test.mjs` -- chạy được sau khi vá ở 4.3; mở rộng ca hiện có.

## Tasks & Acceptance

**Execution:**
- [x] `schema.prisma` và migration -- thêm cột `proposal_nature_code` nullable
- [x] `seed.mjs` -- thêm catalog `proposal-nature` và 5 loại đề tài, bỏ qua nếu trùng `type` và `name`
- [x] `admin-catalogs.service.ts`, `admin-catalogs-panel.tsx` -- thêm loại danh mục `proposal-nature` (nhãn "Tính chất đề tài")
- [x] `research-proposals.dto.ts`, `research-proposals.service.ts` -- nhận, validate, lưu, trả `proposalNatureCode`; `getMissingFields` báo thiếu
- [x] `research-proposals-api.ts`, `research-proposals-panel.tsx`, `proposal-detail-workspace.tsx` -- select "Tính chất đề tài" khi tạo và sửa, hiển thị nhãn
- [x] `tests/proposals-st30.test.mjs` -- ca: tạo nháp với tính chất hợp lệ, giá trị không thuộc catalog bị từ chối, thiếu tính chất thì `readiness` báo thiếu

**Acceptance Criteria:**
- Given PI tạo nháp, when chọn Quân sự hoặc Dân sự, then hồ sơ lưu `proposalNatureCode` tương ứng.
- Given hồ sơ chưa có tính chất, when kiểm tra sẵn sàng hoặc nộp, then báo thiếu "Tính chất đề tài" và không nộp được.
- Given mã không thuộc `proposal-nature` active, when lưu, then từ chối với lỗi gắn đúng trường.
- Given chạy seed trên DB đã có mục "Đề tài cấp Bộ Quốc phòng" mã khác, when seed, then không tạo mục trùng tên.

## Implementation Notes

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass
- `npm run build:api && node --test tests/proposals-st30.test.mjs` -- expected: ca mới pass
