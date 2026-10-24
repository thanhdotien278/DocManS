---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.6: Thành viên hội đồng hoặc reviewer nộp đánh giá được phân công (hội đồng đánh giá)

Status: ready-for-dev (hội đồng đánh giá); backlog (IRB, nghiệm thu)

## Story

As a Chủ tịch, Phản biện hoặc Ủy viên của hội đồng đánh giá đã thành lập,
I want đọc hồ sơ và gửi phiếu đánh giá của mình,
so that tôi hoàn thành trách nhiệm mà không thấy phiếu của người khác.

## Acceptance Criteria

1. **Chỉ sau khi ký.** Given thành viên đã nhận lời nhưng BGĐ chưa ký thành lập, when gọi `review-package`, `my-review` hoặc tệp hồ sơ, then nhận `403`; sau khi ký thì đọc được.
2. **Mọi thành viên trừ thư ký chấm phiếu.** Given Chủ tịch/Phản biện/Ủy viên, when lưu nháp và gửi phiếu theo bộ tiêu chí cố định, then phiếu được khóa sau khi gửi, có audit. Given Thư ký, when gọi `my-review` GET/PUT/submit, then `403 SECRETARY_CANNOT_SCORE` và UI không hiện form chấm.
3. **Không lộ phiếu người khác.** Thành viên không thấy danh tính, điểm, nhận xét của thành viên khác qua API, tệp hay lịch sử.
4. **Thu hồi/xung đột/đổi trạng thái** làm mất quyền ngay; phiếu đã gửi giữ nguyên.
5. **Hàng đợi.** `/my-reviews` hiện dòng đã thành lập với vị trí; thành viên chấm có hành động "Chấm phiếu", thư ký có "Soạn biên bản".

## Tasks / Subtasks

- [ ] Gói BE2: chặn thư ký ở `ProposalReviewsService`; capability `proposal.review.submit` (`proposal-capability-v1.ts`) trả blocked "Thư ký hội đồng không chấm phiếu." cho `council_secretary`; `review-assignments/mine` trả `scoring` (AC 2, 5).
- [ ] Gói FE2: tiêu đề phiếu có vị trí, ẩn form với thư ký, hành động theo `scoring` (AC 2, 5).
- [ ] Test BE2: thư ký `my-review/submit` `403`; trước ký `review-package` `403`, sau ký `200` (spec §12).

## Dev Notes

- Spec: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §5, §7.2, §8.2, §10 S3, S6.
- Cổng đọc `grantsReviewAccess` đã có trên baseline (Story 5.10/5.11); không viết lại.
