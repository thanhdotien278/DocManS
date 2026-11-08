# Epic 5 Context: Kiểm tra, đánh giá và phê duyệt đề xuất

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Đề xuất đã nộp phải đi trọn luồng: kiểm tra đầy đủ và yêu cầu bổ sung, phân công đánh giá độc lập, tổng hợp nội bộ, trình qua tờ trình CV → TB → TP → BGĐ, rồi GĐ quyết định đề tài cùng kinh phí. Mọi bước phải đúng trạng thái, phân quyền và che giấu thông tin phản biện nội bộ. Thư mục planning-artifacts chỉ có kiến trúc và hai sprint-change-proposal (không có PRD, UX, brief riêng); nội dung dưới đây lấy từ epics, `docs/permission-matrix.md` (§7 là chuẩn) và kiến trúc.

## Stories

- Story 5.1: Kiểm tra tính đầy đủ và yêu cầu bổ sung
- Story 5.2: Chỉnh sửa theo yêu cầu và nộp lại đề xuất
- Story 5.3: Phân công reviewer / thành viên hội đồng từ tài khoản
- Story 5.4: Reviewer truy cập và nộp đánh giá của mình
- Story 5.5: Theo dõi tiến độ và tổng hợp đánh giá nội bộ
- Story 5.6: Thư ký khoa học hỗ trợ hành chính cho quy trình đánh giá
- Story 5.7: Lãnh đạo xem hồ sơ trình quyết định
- Story 5.8: Phê duyệt, từ chối và công bố kết quả đề xuất
- Story 5.9: Luồng tờ trình CV → TB → TP → BGĐ
- Story 5.10: BGĐ ký thành lập hội đồng đánh giá và quyết định đề tài cùng kinh phí
- Story 5.11: Delta cho 5.3 theo mô hình mười vai trò

## Requirements & Constraints

- Kiểm tra đầy đủ và yêu cầu bổ sung thuộc TB¹ và CV³; TP không có quyền này. TB/CV là PI hoặc thành viên của hồ sơ vẫn được làm hai hành động này (D-038).
- Phân công reviewer/lập hội đồng, theo dõi tiến độ, tổng hợp và chốt: TP¹/TB¹/CV³. Việc ai được lập hội đồng và mời do QT cấu hình theo loại hội đồng (D-035), mặc định TP¹ và TB¹; CV chỉ khi QT tích và hồ sơ trong phạm vi phụ trách; QT chỉ cấu hình, không tự mời.
- Ứng viên reviewer/thành viên hội đồng: mọi tài khoản active có lý lịch khoa học, trừ QT; phải không tham gia hồ sơ và không conflict. Từ chối lời mời bắt buộc có lý do. Thành viên hội đồng chỉ đọc hồ sơ sau khi BGĐ ký thành lập hội đồng.
- Reviewer chỉ chấm trên phân công hiệu lực; thư ký hội đồng soạn tổng hợp/biên bản nhưng không chấm điểm và không thấy trường đánh giá thô ngoài quyền.
- Chốt tổng hợp tường minh trước khi trình. Gói quyết định chỉ tới GĐ qua tờ trình `DECISION_PACKAGE` đã qua TB và TP.
- Quyết định đề tài và kinh phí chỉ GĐ (không PGĐ-KH, PGĐ-TD, TP, PP, TB, CV, QT, reviewer), sau khi kiểm tra lại: đầy đủ, mọi đánh giá bắt buộc đã nộp, tổng hợp đã chốt, tờ trình hợp lệ, không conflict. Ký thành lập hội đồng do GĐ hoặc PGĐ-KH.
- Công bố kết quả chỉ ở mức thông tin được phép, không lộ phản biện nội bộ.
- Mọi hành động phải ghi audit/lịch sử append-only với actor và relationship.

## Technical Decisions

- `REVIEWER` là phân công hiệu lực trên hồ sơ, không phải vai trò hệ thống mới. Quan hệ bản ghi không tạo vai trò mới.
- Trạng thái lưu: `submitted` / `resubmitted` → `under_review` → `ready_for_approval` → `approved` | `rejected`. `PENDING_APPROVAL` trong tài liệu cũ nghĩa là `ready_for_approval`.
- Phân quyền kế thừa Authorization Contracts V1: kiểm tra actor/context hiện tại ngay trong transaction mutation, minimum disclosure ở mọi read surface, capability do backend tính. Preflight cache không phải thẩm quyền.
- Ký hiệu phạm vi trong ma trận: ¹ trong phạm vi đơn vị, ³ chỉ hồ sơ CV đang được giao phụ trách, ⁵ chỉ khi được phân công reviewer/thành viên/IRB.
- Tờ trình dùng bảng `approval_submissions`, tám loại (`EVALUATION_COUNCIL`, `DECISION_PACKAGE`, `IRB_COUNCIL`, `IRB_CERTIFICATE`, `ACCEPTANCE_COUNCIL`, `PROJECT_EXTENSION`, `PROJECT_ADJUSTMENT`, `LIQUIDATION`); người ký `DIRECTOR` cho `DECISION_PACKAGE` và `LIQUIDATION`, `DIRECTOR_OR_SCIENCE_DEPUTY` cho các loại còn lại; mỗi loại và đối tượng tối đa một submission đang mở.
- Tờ trình `EVALUATION_COUNCIL` bị từ chối nếu còn thành viên chưa chấp nhận hoặc đã từ chối.

## Cross-Story Dependencies

- Thứ tự: 5.1–5.2 → 5.3 (+ delta 5.11) → 5.4 → 5.5 → 5.9 → 5.10 → 5.7 → 5.8. Story 5.9 phải xong trước 5.10, 5.11, 6.11 và 6.12. Story 5.6 độc lập, không là tiền đề.
- Story 5.3 giữ nguyên AC; 5.11 là delta sang mô hình mười vai trò.
- Story 5.7/5.8 phụ thuộc `DECISION_PACKAGE` của 5.9; 5.10 dùng lời mời chấp nhận từ 5.3/5.11.
- Epic 6 (nghiệm thu, gia hạn, điều chỉnh, thanh lý) dùng lại luồng tờ trình của 5.9.
