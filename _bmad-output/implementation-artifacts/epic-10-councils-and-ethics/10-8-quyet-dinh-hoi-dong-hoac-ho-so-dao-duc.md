---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.8: Quyết định hội đồng hoặc hồ sơ đạo đức (ký thành lập hội đồng đánh giá)

Status: review (ký thành lập hội đồng đánh giá); backlog (ký hội đồng IRB, cấp giấy IRB, ký hội đồng nghiệm thu)

## Story

As a GĐ hoặc PGĐ-KH,
I want ký thành lập hội đồng đánh giá hoặc trả lại tờ trình,
so that hội đồng có hiệu lực đúng thẩm quyền và thành viên chỉ đọc hồ sơ sau khi tôi ký.

## Acceptance Criteria

1. **Đúng người ký.** Given tờ trình `EVALUATION_COUNCIL` của vòng hiện tại ở `LEADERSHIP`, when GĐ hoặc PGĐ-KH không xung đột mở hồ sơ, then thấy danh sách thành viên chỉ đọc và nút "Ký thành lập hội đồng", "Trả lại". PGĐ-TD, TP, PP, TB, CV, QT và thành viên hội đồng không ký được; người ký là thành viên/PI/thành viên đề tài bị `APPROVAL_CONFLICT`.
2. **Kiểm lại khi ký.** Given danh sách hoặc cấu hình thay đổi sau khi trình, when ký, then backend kiểm lại blocker trong cùng transaction và từ chối `COUNCIL_NOT_READY` nếu không còn đủ điều kiện.
3. **Hiệu lực.** Given ký thành công, then tờ trình `APPROVED`, mọi thành viên còn hiệu lực chưa có `councilEstablishedAt` được đặt cùng thời điểm, audit `establish-evaluation-council` ghi người ký, thời điểm, vòng, có phải tờ trình bổ sung; thao tác không lặp lại được.
4. **Trả lại.** Given BGĐ trả lại, then lý do bắt buộc, danh sách không đổi, hội đồng về `READY_TO_SUBMIT`.
5. **UX.** Ký có dialog xác nhận không hoàn tác; nút bị khóa hiện lý do từ backend.

## Tasks / Subtasks

- [ ] Gói BE2: `decideCouncil` khóa theo vòng, kiểm lại blocker, audit bổ sung `councilRound`, `supplement` (AC 1–4).
- [ ] Gói FE2: nút ký/trả lại với dialog trong panel hội đồng (AC 1, 5).
- [ ] Không thêm test mới ngoài spec §12; ca "sau ký đọc được hồ sơ" nằm ở test BE2.

## Dev Notes

- Spec: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §7.2, §8.2–§8.3, §10 S5.
- `assertReadyForLeadership`, `closeApprovalSubmission`, `canSignApproval` đã có (Story 5.9/5.10).
