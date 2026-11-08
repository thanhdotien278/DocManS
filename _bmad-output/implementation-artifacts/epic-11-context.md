# Epic 11 Context: Thông báo, nhắc việc và khu “Của tôi”

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Mỗi người dùng nhận được thông báo (trong ứng dụng, email) và nhắc việc đúng quyền, đồng thời có một khu làm việc cá nhân hợp nhất “Của tôi” và hàng đợi công việc theo vai trò cho hồ sơ tham gia và hành động đang chờ. Mọi nội dung phải tuân thủ quyền hiện hành và quy tắc che giấu thông tin đánh giá nội bộ. Backend project/council/dashboard/notification chưa có trong repo vẫn là backlog; chỉ tích hợp nguồn đã contract-complete.

## Stories

- Story 11.1: Thông báo trong ứng dụng theo sự kiện nghiệp vụ
- Story 11.2: Email cho sự kiện và kết quả quan trọng
- Story 11.3: Nhắc hạn và công việc tồn đọng an toàn
- Story 11.4: Tổng hợp backend cho khu “Của tôi”
- Story 11.5: Giao diện “Của tôi” và mục bị chặn do xung đột
- Story 11.6: Hàng đợi công việc theo vai trò

## Requirements & Constraints

- Mô hình 10 vai trò, mỗi tài khoản đúng một vai trò hệ thống: QT, GĐ, PGĐ-KH, PGĐ-TD, TP, PP, TB, CV, NCV, NNB. Quan hệ bản ghi không tạo vai trò hệ thống.
- Người nhận thông báo xác định theo quan hệ/phân công, không có tập người nhận “toàn bộ CV” và không lộ số đếm ngoài phạm vi.
- Tờ trình đi theo CV → TB → TP → BGĐ, không bỏ bước. Khi submit/forward/approve: thông báo người ở bước kế tiếp (TB, TP, hoặc người ký BGĐ theo loại thủ tục); khi bị trả lại: thông báo tác giả.
- PP và PGĐ-TD chỉ theo dõi: không nhận thông báo yêu cầu hành động tờ trình, không có hành động duyệt/ký/tờ trình trong hàng đợi; PGĐ-TD không thấy kinh phí từng đề tài.
- Thông báo cho người tham gia cùng bản ghi không được lộ danh tính reviewer, điểm/nhận xét thô hay phân công ẩn; chỉ dùng trạng thái workflow chung nếu matrix cho phép.
- Email: validate template/version, không ghi secret hoặc payload đánh giá thô vào log; không gửi trùng khi retry (idempotency key); link email yêu cầu đăng nhập và re-authorize, không mở file/record trực tiếp.
- Hàng đợi theo vai trò: TB chờ rà soát (`BOARD_REVIEW`), TP chờ duyệt (`HEAD_REVIEW`) cùng nhóm “Chưa có người phụ trách” (TP giao CV từ đó), CV hồ sơ mình phụ trách, GĐ quyết định đề tài/kinh phí và ký (`LEADERSHIP`), PGĐ-KH chỉ ký, reviewer lời mời/đánh giá được giao.
- QT không có “Của tôi”, không có hàng đợi, không có role switcher; mục “Của tôi” có trong điều hướng mọi vai trò còn lại.
- UI: không tràn trang trên mobile/tablet/desktop, hỗ trợ bàn phím/screen reader, trạng thái không chỉ dựa vào màu, phân biệt lỗi toàn response với danh sách rỗng.

## Technical Decisions

- AD-11 (Restricted Review Disclosure): trước trạng thái công bố đã cấu hình, PI/thành viên/thư ký nhóm không nhận danh tính reviewer, điểm, nhận xét; áp dụng cho thông báo, danh sách, dashboard, lịch sử. Trường bị ẩn thì bỏ hẳn, không trả null.
- AD-13 (Authoritative Commands and Jobs): job nhắc việc/thông báo/email dùng `AuthorizationJobEnvelopeV1`; kiểm tra service-principal action và quyền on-behalf-of hiện hành tại thời điểm chạy. Mất quyền, tài khoản vô hiệu, conflict, đổi state hoặc lệch `ContextVersionTokenV1` thì hủy side effect và audit. Job chỉ hệ thống chỉ cho action `SERVICE_ONLY`.
- AD-14: chỉ tích hợp nguồn đã contract-complete (lifecycle, disclosure, conflict, file, version); consumer không đọc trực tiếp bảng council/ethics. Nguồn enabled bị unresolved/stale thì fail closed cả response/batch, kèm cảnh báo vận hành.
- Thông báo: có stable source ID/version, audience, target action, idempotency key; re-evaluate account/organization/relationship/state/conflict/disclosure khi tạo và khi đọc. Link chỉ điều hướng, endpoint đích vẫn re-authorize (thông báo không phải quyền truy cập).
- `PersonalWorkEntryV1`: `sourceDomain`, `sourceRecordId`, `sourceVersion`, `contextVersion`, `displayLabel`, `dueAt`, `routeRef`, `targetAction`, `actionable`, `blocked{code,reason}|null`. Mục bị chặn chỉ lộ label, domain, due date, route, target action, code/reason; cấm danh tính reviewer, phân công ẩn, điểm/nhận xét, nguồn conflict, danh tính người tham gia khác.
- Tổng hợp: một `asOf` cho cả request, gọi mọi source enabled; de-duplicate theo `sourceDomain + sourceRecordId + targetAction`, giữ mọi viewer relationship (không chọn vai trò cao nhất); sort `dueAt` tăng dần (null cuối), rồi domain, record ID, action. Đếm actionable loại trừ mục blocked/denied nhưng mục blocked vẫn hiện trong danh sách.
- Cursor chứa `asOf`, tuple sort cuối và mọi source version; lệch version trả `CONTEXT_VERSION_MISMATCH`, phải tải lại từ trang đầu. Lỗi/stale ở bất kỳ source nào thì không trả danh sách, count hay cursor từng phần.
- Audit tách riêng nhật ký và thông báo; mọi bước routing tờ trình và gán CV phụ trách được audit.

## UX & Interaction Patterns

- Trang “Của tôi” có ba nhóm: hồ sơ chủ trì, hồ sơ tham gia, việc chờ xử lý; mỗi mục có nhãn vai trò, trạng thái, hạn, hành động theo ngữ cảnh. Khu blocked/non-actionable riêng, không nằm trong queue có thể thao tác.

## Cross-Story Dependencies

- 11.1 là nền cho 11.2 (email dùng cùng event/audience/idempotency) và 11.3 (nhắc việc phát qua thông báo/email).
- 11.4 (backend tổng hợp) phải xong trước 11.5 (UI) và 11.6 (hàng đợi theo vai trò dùng cùng contract).
- Phụ thuộc Epic 2–10: tờ trình/routing, phân công CV phụ trách, project, council, IRB; nguồn chưa triển khai thì giữ nguyên backlog, không tích hợp.
- Tham chiếu `docs/permission-matrix.md` (§9.10, §10; mục 7 thắng khi mâu thuẫn).
