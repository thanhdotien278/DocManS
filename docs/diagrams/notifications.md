# Luồng thông báo

```mermaid
flowchart TD
  event{"Sự kiện nghiệp vụ"}
  approval_event["Tờ trình: lập, chuyển, trả lại, ký, từ chối"]
  proposal_event["Hồ sơ: nộp, nộp lại, yêu cầu bổ sung, giao CV, quyết định"]
  review_event["Mời phản biện"]
  write["Cùng transaction nghiệp vụ: notifyUsers ghi user_notifications<br/>(bỏ trùng theo user_id + idempotency_key, bỏ tài khoản không active)"]
  read["Người nhận mở chuông / trang /notifications"]
  reauth{"Kiểm tra lại quyền hiện hành khi đọc"}
  shown["Hiện trong danh sách và số chưa đọc"]
  hidden["Ẩn khỏi danh sách và số đếm"]
  open["Bấm thông báo: đánh dấu đã đọc, điều hướng"]
  target["Trang đích tự kiểm tra quyền<br/>(thông báo không cấp quyền)"]

  event --> approval_event --> write
  event --> proposal_event --> write
  event --> review_event --> write
  write --> read --> reauth
  reauth -- "còn quyền" --> shown --> open --> target
  reauth -- "mất quyền / xung đột / lời mời bị thu hồi" --> hidden
```

Story 11.1 (`_bmad-output/implementation-artifacts/spec-11-1-thong-bao-trong-ung-dung-theo-su-kien-nghiep-vu.md`):

- Thông báo ghi trong cùng transaction với thao tác nghiệp vụ; thao tác rollback thì không có thông báo. Quyết định ở D-040 (`_bmad-output/.decision-log.md`).
- Người nhận tờ trình theo bước đến: TB (`BOARD_REVIEW`), TP (`HEAD_REVIEW`), GĐ và PGĐ-KH khi loại thủ tục cho phép (`LEADERSHIP`); tác giả khi trả lại, ký, từ chối. PP và PGĐ-TD không nhận. Khi bước chuyển, thông báo "chờ xử lý" cũ của tờ trình đó được đánh dấu đã đọc.
- Khi đọc: `approval` lọc theo `canViewApproval` và xung đột; `proposal` theo `canReadProposal`; `review_assignment` theo assignment còn hiệu lực của chính người xem.
- Đánh dấu đã đọc: `POST /api/v1/notifications/:id/read` và `POST /api/v1/notifications/read-all`.
- Chưa có: email (11.2), nhắc hạn (11.3), sự kiện đề tài ngoài tờ trình (xem `deferred-work.md`).
