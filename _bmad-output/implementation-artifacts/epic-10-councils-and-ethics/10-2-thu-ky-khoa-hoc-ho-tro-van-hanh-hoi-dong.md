---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.2: Thư ký khoa học hỗ trợ vận hành hội đồng (thư ký hội đồng đánh giá)

Status: review (thư ký soạn dự thảo tổng hợp/biên bản); backlog (chương trình, tài liệu họp, điểm danh, task, tệp biên bản, thư ký IRB/nghiệm thu)

## Story

As a thư ký của hội đồng đánh giá đã thành lập,
I want xem phiếu đã gửi ở dạng ẩn danh và soạn dự thảo tổng hợp/biên bản,
so that hội đồng có biên bản đầy đủ mà tôi không chấm điểm hay quyết định.

## Acceptance Criteria

1. **Vị trí thư ký.** Mỗi hội đồng đánh giá có đúng 1 thư ký (`council_secretary`); thư ký là người được mời, phải nhận lời và chỉ làm việc sau khi BGĐ ký.
2. **Xem phiếu ẩn danh.** Given thư ký, when gọi `GET :id/evaluation-council/reviews`, then nhận "Phiếu 1..N" (điểm từng tiêu chí, tổng, kết luận, nhận xét, thời điểm gửi) và tiến độ; không có tên, username, vị trí người chấm. Người khác nhận `403`.
3. **Soạn dự thảo.** Given bản tổng hợp còn nháp, when thư ký lưu nội dung và kết luận qua `PUT :id/evaluation-summary`, then lưu thành công, có audit với `actorPosition`; thư ký không chốt, không trình, không lập/duyệt tờ trình.
4. **Không chấm, không quyết định.** Thư ký gọi chấm phiếu, mời/thu hồi, chốt, trình, ký đều bị từ chối.
5. **Hết hiệu lực.** Thư ký bị thu hồi thì mất quyền ngay; bản nháp đã lưu vẫn còn.

## Tasks / Subtasks

- [ ] Gói BE2: route `evaluation-council/reviews`, nhánh thư ký trong `saveEvaluationSummary`, chặn thư ký ở finalize/submit (AC 2–5).
- [ ] Gói FE2: `CouncilSecretaryPanel` trên chi tiết hồ sơ (AC 2, 3).
- [ ] Test BE2 theo spec §12 (thư ký không chấm; readiness không chờ thư ký).

## Dev Notes

- Spec: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §5, §7.2, §8.2, §10 S7.
- Đề xuất chờ xác nhận: P7 (phạm vi dữ liệu thư ký được xem; nhận xét tự do có thể lộ danh tính gián tiếp).
- Không thêm bảng biên bản: dự thảo dùng `ProposalEvaluationSummary`; tệp biên bản để backlog.
