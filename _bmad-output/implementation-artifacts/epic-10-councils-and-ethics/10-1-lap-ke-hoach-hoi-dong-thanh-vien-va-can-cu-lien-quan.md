---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.1: Lập kế hoạch hội đồng, thành viên và căn cứ liên quan (phần hội đồng đánh giá)

Status: review (phần hội đồng đánh giá); backlog (nghiệm thu, IRB, lịch họp, liên kết văn bản)

## Story

As a QT cấu hình và người được cấu hình thành lập hội đồng (mặc định TP¹/TB¹, D-035),
I want cấu hình theo từng loại hội đồng ai được thành lập/mời và số lượng thành viên, rồi lập hội đồng đánh giá với đủ vị trí,
so that mỗi hội đồng đánh giá có cơ cấu và trách nhiệm rõ ràng trước khi trình Ban giám đốc ký.

## Acceptance Criteria

1. **Cấu hình theo loại.** Given QT mở `/system-settings`, when QT xem/sửa cấu hình `EVALUATION`, `ACCEPTANCE`, `IRB`, then QT tích được trong TP, PP, TB, CV (ít nhất một) và nhập số lượng thành viên trong phạm vi cho phép; lưu có audit `update-council-formation-config` với before/after. Mặc định khi chưa lưu: TP, TB; 7 / 7 / 5. Chỉ `EVALUATION` được áp dụng; hai loại còn lại hiển thị "Chưa áp dụng".
2. **QT chỉ cấu hình.** Given QT, when QT gọi bất kỳ thao tác lập/mời/ký hội đồng, then backend từ chối; QT không bao giờ là ứng viên.
3. **Quyền thành lập theo cấu hình.** Given actor có role được tích (TP/PP/TB trong phạm vi đơn vị chủ trì; CV chỉ khi đang phụ trách hồ sơ), when actor mở hồ sơ đã xác nhận đầy đủ cho vòng hiện tại, then actor thấy form mời; actor có role không được tích nhận `403 COUNCIL_FORMATION_DENIED` và UI ẩn form kèm lý do.
4. **Cơ cấu hội đồng đánh giá.** Given cấu hình `memberCount = n`, when lập hội đồng, then cơ cấu bắt buộc là 1 Chủ tịch, 2 Phản biện, n−4 Ủy viên, 1 Thư ký; mời vượt vị trí hoặc vượt tổng bị từ chối `COUNCIL_POSITION_FULL` / `COUNCIL_SIZE_EXCEEDED`.
5. **Một vị trí mỗi người mỗi vòng.** Given một người đã có vị trí còn hiệu lực trong hội đồng của vòng này, when mời họ vào cùng hoặc vị trí khác, then backend từ chối `DUPLICATE_OR_OVERLAPPING_ASSIGNMENT` / `INCOMPATIBLE_COUNCIL_POSITION`; đổi vị trí phải thu hồi trước, giữ lịch sử.
6. **Một nguồn policy.** Tìm ứng viên, mời, thu hồi, capability `proposal.review.assign` và `GET evaluation-council` đều dùng `canFormCouncil` (spec §7.1).

Backlog (không làm trong story này): hội đồng nghiệm thu/IRB và nơi lưu thành viên của chúng; lịch, mục đích, liên kết văn bản Epic 9; kích hoạt/đình chỉ thành viên ngoài thu hồi.

## Tasks / Subtasks

- [ ] Gói BE1: `council-formation.ts` (hằng số, validator, đọc cấu hình, `canFormCouncil`), route `GET/PUT /api/v1/config/council-formation`, validator cho khóa `council_formation.*` trong `PUT /config/system-parameters`, audit before/after (AC 1, 2, 6).
- [ ] Gói FE1: `AdminCouncilConfigPanel` trên `/system-settings` (AC 1).
- [ ] Gói BE2: cơ cấu, giới hạn vị trí/tổng, exclusivity trong mutation mời (AC 3–5).
- [ ] Test theo spec §12 (BE1: `tests/admin-foundation.test.mjs`; BE2: `tests/approval-routing-db.test.mjs`).

## Dev Notes

- Spec chuẩn: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §3–§8, §10 S1–S2, gói BE1/BE2/FE1 ở §16.
- Baseline là đỉnh `claude/step3-project-6-11-6-12-57d947`; không có bảng/migration mới; cấu hình lưu `system_parameters`.
- Đề xuất chờ chủ sản phẩm xác nhận: P1 (số lượng cố định, kể cả thư ký), P3 (role tích được), P5 (đổi cấu hình không ảnh hưởng hội đồng đã thành lập).

## Ghi chú hoàn tất (2026-10-24)

- **Phạm vi đã làm:** hội đồng đánh giá (bước 4) theo `_bmad-output/specs/spec-hoi-dong-tham-dinh.md`. Phần ACCEPTANCE/IRB, lịch họp, liên kết văn bản, tệp biên bản, email vẫn `backlog`.
- **Commit:** `ed1e0ff` (tính năng), `874db68`, `44045ef`, `2163e59` (sửa lỗi theo QA), `c8d5ba5` (tài liệu).
- **Kiểm thử tự động:** `npm run typecheck`, `build:api`, `admin-foundation` 17/17, `approval-routing-db` 17/17, `proposal-review-cardinality` 4/4, `proposal-review-golden-flow` 7/7, `proposal-capability-ui-source` 6/6. `npm test` toàn bộ: không có test nào fail mới so với `d4e37bc` (HEAD 53 fail, baseline 71 fail). Ca DB của `reviewer-council-assignment`: NOT RUN.
- **QA UI Playwright (Codex):** vòng 1: 9 PASS/2 FAIL/5 BLOCKED; vòng 2: 8 PASS/1 FAIL (9 kịch bản chạy lại); vòng 3: N01, N03, U03 PASS, N02 sửa sau vòng 3 và đã kiểm lại. Báo cáo: `_bmad-output/qa-evidence/hoi-dong-tham-dinh/`.
- **Còn lại:** chốt tổng hợp sau khi thư ký lưu nháp sớm cần lưu lại nháp (`PACKAGE_CONTEXT_MISMATCH`); thu hồi thành viên không chấm sau khi thành lập chưa kiểm lại cơ cấu; thông báo chỉ trong ứng dụng (email thuộc Epic 11).
