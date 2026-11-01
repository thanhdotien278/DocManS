---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.7: Theo dõi, tổng hợp và trình kết quả hội đồng (hội đồng đánh giá)

Status: review (lập tờ trình thành lập hội đồng đánh giá, readiness tổng hợp); backlog (`IRB_CERTIFICATE`, kết luận IRB, nghiệm thu)

## Story

As a CV phụ trách³, TB¹ hoặc TP¹,
I want theo dõi việc lập hội đồng, lập tờ trình thành lập hội đồng và tổng hợp khi hội đồng đã chấm xong,
so that hội đồng được BGĐ ký đúng luồng và kết quả đánh giá sẵn sàng trình phê duyệt.

## Acceptance Criteria

1. **Trạng thái hội đồng.** Given người được xem panel hội đồng, when mở chi tiết hồ sơ, then thấy trạng thái suy ra (`FORMING`, `READY_TO_SUBMIT`, `IN_APPROVAL`, `ESTABLISHED`), tiến độ từng vị trí, danh sách thành viên và blockers (spec §6, §7.4).
2. **Lập tờ trình.** Given hội đồng đủ đúng `memberCount`, đúng cơ cấu và mọi người đã nhận lời, when CV³/TB¹/TP¹ không xung đột lập tờ trình `EVALUATION_COUNCIL`, then tờ trình đi luồng Story 5.9 với khóa theo vòng (`subjectRef = reviewedSubmissionEventId`); chưa đủ thì `400 COUNCIL_NOT_READY` kèm `blockers`.
3. **Trả lại.** Given tờ trình bị trả lại ở bất kỳ bước, then lý do bắt buộc, hội đồng về `READY_TO_SUBMIT`, người lập thấy lý do.
4. **Readiness tổng hợp.** Given hội đồng `ESTABLISHED`, when chốt hoặc trình tổng hợp, then chỉ cho phép khi mọi thành viên chấm đã gửi phiếu; thư ký không tính vào phiếu chờ; cổng cứng "đúng 2 phản biện + ≥ 3 ủy viên" bị thay bằng cơ cấu theo cấu hình.
5. **Không lộ ra ngoài.** PI, thành viên đề tài và thư ký không thấy danh tính người chấm/điểm thô qua tiến độ.

## Tasks / Subtasks

- [ ] Gói BE2: `getCouncil` theo hợp đồng spec §8.3; `submitCouncil`/`decideCouncil` khóa theo vòng; hàm blocker §7.4 thay `councilRosterBlockers` và phần cứng của `summarizeReviewProgress`; readiness `finalize`/`submit` (AC 1–4).
- [ ] Gói FE2: panel "Hội đồng thẩm định" (trạng thái, vị trí, blockers, nút lập tờ trình, thông báo khóa danh sách) (AC 1–3).
- [ ] Cập nhật fixture `tests/proposal-review-golden-flow.test.mjs`, `tests/proposal-review-cardinality.test.mjs`; test `COUNCIL_NOT_READY` khi thiếu thư ký (spec §12).

## Dev Notes

- Spec: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §6, §7.4, §8.2–§8.3, §10 S2, S4.
- Quyền lập tờ trình (CV³/TB¹/TP¹, D-036) tách khỏi quyền thành lập hội đồng (cấu hình D-035).
- Đề xuất chờ xác nhận: P2 (chặn trình/ký khi chưa đủ số lượng).

## Ghi chú hoàn tất (2026-10-24)

- **Phạm vi đã làm:** hội đồng đánh giá (bước 4) theo `_bmad-output/specs/spec-hoi-dong-tham-dinh.md`. Phần ACCEPTANCE/IRB, lịch họp, liên kết văn bản, tệp biên bản, email vẫn `backlog`.
- **Commit:** `ed1e0ff` (tính năng), `874db68`, `44045ef`, `2163e59` (sửa lỗi theo QA), `c8d5ba5` (tài liệu).
- **Kiểm thử tự động:** `npm run typecheck`, `build:api`, `admin-foundation` 17/17, `approval-routing-db` 17/17, `proposal-review-cardinality` 4/4, `proposal-review-golden-flow` 7/7, `proposal-capability-ui-source` 6/6. `npm test` toàn bộ: không có test nào fail mới so với `d4e37bc` (HEAD 53 fail, baseline 71 fail). Ca DB của `reviewer-council-assignment`: NOT RUN.
- **QA UI Playwright (Codex):** vòng 1: 9 PASS/2 FAIL/5 BLOCKED; vòng 2: 8 PASS/1 FAIL (9 kịch bản chạy lại); vòng 3: N01, N03, U03 PASS, N02 sửa sau vòng 3 và đã kiểm lại. Báo cáo: `_bmad-output/qa-evidence/hoi-dong-tham-dinh/`.
- **Còn lại:** chốt tổng hợp sau khi thư ký lưu nháp sớm cần lưu lại nháp (`PACKAGE_CONTEXT_MISMATCH`); thu hồi thành viên không chấm sau khi thành lập chưa kiểm lại cơ cấu; thông báo chỉ trong ứng dụng (email thuộc Epic 11).
