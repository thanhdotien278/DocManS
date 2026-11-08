---
title: 'Story 5.2: Chỉnh sửa theo yêu cầu và nộp lại đề xuất'
type: 'feature'
created: '2026-11-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Luồng PI sửa và nộp lại sau yêu cầu bổ sung đã có từ slice 2026-09-22 (backend `resubmitProposal`, UI "Lưu bổ sung"/"Nộp lại hồ sơ"), nhưng giao diện chưa có cờ quá hạn phản hồi theo UX spec, và PI vẫn thấy form "Yêu cầu bổ sung" của cán bộ ở trạng thái bị khóa.

**Approach:** Giữ nguyên backend. Trên trang chi tiết hồ sơ: (1) đánh dấu "Quá hạn" cho yêu cầu bổ sung còn mở đã qua hết ngày hạn theo giờ Việt Nam (quá hạn chỉ là cờ theo dõi, không chặn nộp lại — `docs/authorization-core-business-baseline.md`); (2) người tham gia hồ sơ (PI/thành viên/thư ký) không được cấp `proposal.supplement.request` thì không thấy form gửi yêu cầu, chỉ thấy lịch sử yêu cầu.

**Quyết định (người dùng, 2026-11-08):** Mục/tệp cần bổ sung được cán bộ ghi trong ô lý do; không thêm trường có cấu trúc, không đổi schema hay Story 5.1. Action `proposal.resubmit` trong AC được ánh xạ vào `proposal.submit` hiện có (đã cho phép ở `supplement_requested`), không thêm action mới.

</frozen-after-approval>

## Implementation Notes

- Bằng chứng backend đã đáp ứng AC (không sửa):
  - AC1: `toProposalDetailResponse` trả `supplementRequests` (lý do, hạn, người yêu cầu); `reviewWorkflow` chỉ trả cho TP/CV, không cho PI.
  - AC2: `updateDraft` ghi audit `update-proposal-during-supplement`; `assertCanMutateProposalContent` chỉ mở sửa ở `draft`/`supplement_requested`.
  - AC3: `resubmitProposal` chuyển `resubmitted` trong transaction, đóng yêu cầu, ghi `proposalSubmissionEvent` có snapshot, báo CV phụ trách; `assertCurrentCompletenessEvidence` chặn phân công khi chưa xác nhận đầy đủ đúng phiên bản hiện tại (test `proposal-review-golden-flow`).
  - AC4: `runProposalMutation` nạp lại actor (tài khoản phải active), khóa hồ sơ và so `contextVersion` trong transaction.
- File thay đổi: `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`.
- Sau review: gom `latestSupplementRequest` để bỏ gọi `at(-1)` lặp và bỏ non-null assertion.
- Kiểm chứng UI (localhost:3000, hồ sơ `cc36d963-…` "Mùa thu 3", hạn 02/11/2026): PI `int1` thấy "Hạn phản hồi 02/11/2026 · Quá hạn", "Đang chờ bổ sung · Quá hạn", nút "Nộp lại hồ sơ", không thấy form "Lý do bổ sung"; CV `hdtien1` vẫn thấy form và cờ quá hạn. Chưa bấm nộp lại thật trên UI (không đổi dữ liệu dev).

## Review Triage Log

- Form và section dùng điều kiện khác nhau (người ngoài nhóm không có quyền vẫn thấy form khóa) — false: đúng AC Story 5.1 "UI hiển thị blocked action với lý do"; spec chỉ ẩn với người tham gia.
- Hạn rỗng bị coi là quá hạn — false: backend bắt buộc `dueDate` (`readDate` trong `requestSupplement`), không có yêu cầu bổ sung nào thiếu hạn.
- Thiếu test hồi quy UI — low, bỏ qua: thay đổi hiển thị thuần, đã kiểm chứng trên trình duyệt; repo chỉ có test đọc mã nguồn (`tests/proposal-capability-ui-source.test.mjs`, vẫn PASS 6/6), không render component.
- Spec thiếu AC/Verification — false: route oneshot theo template bỏ các mục này; AC gốc ở `_bmad-output/epics.md` Story 5.2.
- Sprint-status thiếu dòng ghi chú — low, đã sửa khi đồng bộ trạng thái.
- Cờ quá hạn chưa có ở hàng đợi CV / "Cần tôi xử lý" — medium, defer (ghi `deferred-work.md`).
- "Quá hạn" là chữ thường, không có tone cảnh báo — low, bỏ qua: cosmetic.
- `at(-1)` lặp ba lần kèm `!` — low, đã sửa.
- Cờ tính theo đồng hồ client — low, bỏ qua: chỉ là cờ theo dõi, không chặn nghiệp vụ.
- Tham chiếu D-038 có thể sai (D-041) — false: FR15 trong epics ghi D-038 cho TB/CV kiểm tra đầy đủ/yêu cầu bổ sung trên hồ sơ của chính mình.
