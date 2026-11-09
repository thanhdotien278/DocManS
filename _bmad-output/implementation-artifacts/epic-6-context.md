# Epic 6 Context: Theo dõi và nghiệm thu đề tài đã phê duyệt

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Sau khi GĐ phê duyệt đề tài và kinh phí, epic này đưa đề tài qua giai đoạn thực hiện và kết thúc (bước 6–9 của vòng đời 9 bước): khởi tạo project từ proposal đã duyệt, quản lý thành viên/milestone, báo cáo tiến độ, điều chỉnh/gia hạn, hồ sơ nghiệm thu, kết quả nghiệm thu, kinh phí và thanh lý. Mọi bước phải có phân quyền, lịch sử và audit, không ai tự phê duyệt việc của mình. Trọng tâm hiện tại là Story 6.8 (PI lập và nộp hồ sơ nghiệm thu).

## Stories

- Story 6.1: Khởi tạo đề tài từ proposal được phê duyệt
- Story 6.2: Quản lý thành viên, trách nhiệm, milestone và checkpoint
- Story 6.3: Chủ nhiệm nộp báo cáo tiến độ và bằng chứng
- Story 6.4: Thành viên đóng góp tệp và minh chứng trong phạm vi được giao
- Story 6.5: Rà soát báo cáo và theo dõi chậm tiến độ
- Story 6.6: Gửi yêu cầu điều chỉnh hoặc gia hạn
- Story 6.7: Quyết định điều chỉnh hoặc gia hạn
- Story 6.8: Chuẩn bị và nộp hồ sơ nghiệm thu hoặc đánh giá cuối (trọng tâm)
- Story 6.9: Rà soát và ghi nhận kết quả nghiệm thu hoặc đánh giá cuối
- Story 6.10: Trạng thái, lịch sử và truy vấn được phân quyền của đề tài
- Story 6.11: Delta GF4: điều chỉnh/gia hạn qua tờ trình, GĐ hoặc PGĐ-KH ký
- Story 6.12: Kinh phí dạng metadata và thanh lý

## Requirements & Constraints

- Trạng thái project (code, nhãn tiếng Việt): `preparing` Chuẩn bị triển khai → `executing` Đang thực hiện ↔ `paused` Tạm dừng → `pending_acceptance` Chờ nghiệm thu → `accepted` Đã nghiệm thu / `failed` Không đạt → `closed` Đóng/lưu trữ. Quá hạn (overdue) chỉ là cờ suy ra, không phải state workflow.
- Nghiệm thu (D-033, D-034): là bước 8, không phải quyết định chính thức (chỉ bước 5 và 9 là quyết định chính thức). Nghiệm thu sản phẩm, cơ sở, cấp trên đi qua MỘT hội đồng nghiệm thu đề tài duy nhất; không có bản ghi hay quy trình riêng từng cấp. Chủ tịch hội đồng đánh dấu kết quả: đạt → `accepted`, không đạt → `failed`. Sprint change 2026-10-24: Story 6-13 (ghi nhận nghiệm thu cấp trên) đã bị bỏ, không có trong sprint-status.
- Ai được làm gì với hồ sơ nghiệm thu (6.8): chỉ PI (`TOPIC_PI`) có action nộp chính xác; thành viên/thư ký chỉ đóng góp sản phẩm/minh chứng theo trách nhiệm được giao, không nộp, không phê duyệt. PI không có quyền duyệt/quyết định cuối. Sau khi nộp, CV phụ trách nhận việc chuẩn bị hội đồng nghiệm thu.
- Nội dung dossier: kết quả, sản phẩm, báo cáo tổng kết, đối chiếu milestone, tệp bắt buộc; gắn project/version; dùng association và disclosure riêng của acceptance dossier trong module shared files.
- Nộp (6.8): readiness check thiếu milestone/dữ liệu/tệp thì từ chối với lỗi theo section, không đổi state từng phần. Nộp thành công: chuyển state atomically, khóa submitted version, tạo history/audit.
- Phân quyền: CV chỉ thao tác trên project được giao (exact project officer); GĐ, PGĐ-KH, TP, TB xem toàn Học viện; PP, PGĐ-TD chỉ đọc theo phạm vi đơn vị. Tờ trình đi CV lập → TB → TP → BGĐ; hội đồng nghiệm thu do GĐ hoặc PGĐ-KH ký (không phải TP/TB/CV/PP/PGĐ-TD); thanh lý chỉ GĐ ký. Thành viên hội đồng: mọi role trừ QT, không phải người tham gia đề tài, qua kiểm tra conflict hai chiều.
- Nhiều bằng chứng/tệp tham chiếu phiên bản file bất biến; nộp ghim bằng chứng, thay thế không đổi snapshot đã ghim.

## Technical Decisions

- Golden Flow 4 (`docs/contracts/project-execution.md`) hiện là hợp đồng thực thi cho 6.1–6.7 và phần execution/history của 6.10. Acceptance dossier, hội đồng nghiệm thu, nghiệm thu và đóng đề tài thuộc flow kế tiếp (6.8–6.9): không mở API bypass cho các state này.
- Mở rộng Authorization Contracts V1 (action có tên, `allowedActions`/`blockedActions`, denial reason, context token); không tạo policy engine thứ hai; React không suy quyền từ chuỗi role. Backend quyết định tại thời điểm mutation, kiểm tra lại actor/scope/relationship/conflict/version trong transaction.
- `PROJECT_PI` = quan hệ `TOPIC_PI` sẵn có, không thêm role mới. 10 system role theo `docs/permission-matrix.md` (§7 thắng khi xung đột); mã code: GĐ `LEADERSHIP_APPROVAL_AUTHORITY`, PGĐ-KH `SCIENCE_DEPUTY_DIRECTOR`, TP `RESEARCH_MANAGEMENT_HEAD`, TB `RESEARCH_BOARD_HEAD`, CV `RESEARCH_MANAGEMENT_STAFF`.
- Quy ước chung: transaction nguyên tử cho state + history + audit; history/audit append-only, ghi cả denial; một project chỉ một request mở tại một thời điểm; không endpoint đặt status tùy ý; không tính "chậm tiến độ" thành state.
- Đồng bộ code: một phần code trên nhánh vẫn mang đường quyết định cũ Staff/Head cho điều chỉnh/gia hạn cho đến khi Story 6.11 hạ cánh; tên state cũ của request giữ nguyên.
- Cấu hình hội đồng (D-035/D-036): Admin chỉ cấu hình role được lập hội đồng và số thành viên; CV lập tờ trình, TB rà soát, TP duyệt, BGĐ ký; chỉ trình ký khi mọi thành viên đã nhận lời.
- Thông báo workflow chưa có backend: chỉ ghi history nguồn, không giả lập gửi.

## UX & Interaction Patterns

- Dùng lại `/projects`, `/my-projects`, `/projects/:id` và component hiện có. Không gian PI: scope được duyệt, thành viên, milestone, báo cáo/revision, upload bằng chứng, trạng thái/lịch sử; thành viên chỉ thấy milestone mình phụ trách.
- Cần đủ trạng thái loading/empty/error/denied/stale-context; hành động quan trọng có xác nhận truy cập được; action bị khóa giải thích lý do từ backend; version đổi thì buộc tải lại trước khi quyết định.
- Lỗi readiness khi nộp hiển thị theo section.

## Cross-Story Dependencies

- 6.8 phụ thuộc project đã `executing` (6.1–6.2), milestone/báo cáo/bằng chứng (6.2–6.4) và shared files; 6.9 xử lý dossier đã nộp (hội đồng nghiệm thu, tờ trình `ACCEPTANCE_COUNCIL`, chuyển `accepted`/`failed`) và phụ thuộc Epic 5 tờ trình routing (5.9) và Epic 10 hội đồng.
- 6.12: tờ trình `LIQUIDATION` do GĐ ký chuyển `accepted` hoặc `failed` sang `closed`; không đường nào khác đóng đề tài.
- Story 3.7 (timeline 9 bước) dựa trên 6.1/6.10; 6.11 điều chỉnh/gia hạn qua tờ trình, GĐ hoặc PGĐ-KH ký.
