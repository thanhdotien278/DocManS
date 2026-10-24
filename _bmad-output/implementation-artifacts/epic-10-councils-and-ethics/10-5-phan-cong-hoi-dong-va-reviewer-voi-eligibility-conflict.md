---
baseline_commit: 0d1460c
spec: _bmad-output/specs/spec-hoi-dong-tham-dinh.md
---

# Story 10.5: Phân công hội đồng và reviewer với eligibility/conflict (hội đồng đánh giá)

Status: review (hội đồng đánh giá); backlog (IRB, nghiệm thu)

## Story

As a người được cấu hình thành lập hội đồng (mặc định TP¹/TB¹),
I want mời người đủ điều kiện vào từng vị trí của hội đồng đánh giá và để họ nhận lời hoặc từ chối,
so that hội đồng độc lập, không tự đánh giá, không làm tắc luồng tờ trình.

## Acceptance Criteria

1. **Ứng viên.** Given actor có quyền thành lập, when tìm ứng viên cho một vị trí, then kết quả chỉ gồm tài khoản active có lý lịch khoa học (mọi role trừ QT), không gồm chính actor, PI/thành viên/thư ký đề tài, CV phụ trách, người đã có vị trí trong vòng, người đã thao tác trên tờ trình hội đồng của vòng, người mà nếu mời sẽ không còn ai xử lý bước TB/TP/BGĐ.
2. **Mutation kiểm lại.** Given request mời gửi trực tiếp, when mutation chạy dưới khóa hồ sơ, then các kiểm tra spec §7.3 chạy theo đúng thứ tự và trả đúng mã (`SELF_ASSIGNMENT_DENIED`, `CANDIDATE_NOT_ELIGIBLE`, `CONFLICT_DENIED`, `DUPLICATE_OR_OVERLAPPING_ASSIGNMENT`, `INCOMPATIBLE_COUNCIL_POSITION`, `ROUTING_ACTOR_CONFLICT`, `ROUTING_ACTOR_UNAVAILABLE`, `COUNCIL_POSITION_FULL`, `COUNCIL_SIZE_EXCEEDED`, `COUNCIL_SUBMISSION_PENDING`) mà không tạo hàng; conflict tham gia có audit thất bại.
3. **Lời mời.** Given người được mời, when họ mở `/my-reviews`, then chỉ thấy tên đề tài, vị trí, hạn, người mời; chấp nhận hoặc từ chối (từ chối bắt buộc lý do, dialog thay `window.prompt`); có audit.
4. **Thu hồi.** Given người có quyền thành lập, when thu hồi một thành viên (lý do bắt buộc), then hàng cũ giữ lịch sử, quyền truy cập dừng ngay; người từ chối vẫn chiếm vị trí tới khi bị thu hồi.
5. **Khóa khi trình.** Given có tờ trình `EVALUATION_COUNCIL` `PENDING` của vòng, when mời hoặc thu hồi, then backend từ chối `COUNCIL_SUBMISSION_PENDING`.
6. **Thay thế sau thành lập.** Given hội đồng đã thành lập, when thu hồi và mời người thay thế, then hội đồng về "Đang lập" và cần tờ trình bổ sung; thành viên cũ giữ quyền.
7. **Không ủy quyền.** Thư ký, QT, BGĐ và role không được cấu hình không mời/thu hồi được.

## Tasks / Subtasks

- [ ] Gói BE2: `assignable-reviewers?position=`, `POST review-assignments` với 4 giá trị `assignmentRole`, sửa `normalizeAssignmentRole` (giá trị lạ bị từ chối), kiểm tra §7.3, quyền `canFormCouncil` cho mời/thu hồi (AC 1, 2, 4, 5, 7).
- [ ] Gói FE2: form mời trong panel "Hội đồng thẩm định", bỏ form phân công cũ trong `ProposalEvaluationPanel`, dialog từ chối/thu hồi (AC 3, 4).
- [ ] Test BE2 theo spec §12 (CV mặc định bị từ chối, TB duy nhất bị `ROUTING_ACTOR_UNAVAILABLE`).

## Dev Notes

- Spec: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §5, §7.2–§7.3, §8.2, §10 S2–S3.
- Đã có trên baseline: `respondToInvitation`, lọc QT/không lý lịch/chính mình, `assertNoPendingCouncil` (Story 5.11).
- Đề xuất chờ xác nhận: P4 (mời phản biện cũng theo cấu hình; CV mất quyền mặc định), P6 (quy tắc người giữ bước), P8, P9.
