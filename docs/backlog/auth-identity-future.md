# Backlog tương lai: tài khoản, đăng ký và khôi phục truy cập

## Trạng thái hiện tại

Giai đoạn hiện tại dùng mô hình quản trị nội bộ: quản trị viên tạo từng tài khoản, gán mật khẩu ban đầu, vai trò hệ thống và phạm vi đơn vị. Hệ thống chưa lưu hoặc xác minh email, số điện thoại hay kênh liên hệ của người dùng.

Story 1.5 có chức năng quản trị viên khởi tạo mã đặt lại mật khẩu một lần. Mã phải được quản trị viên chuyển qua kênh ngoài hệ thống; đây không phải luồng “Quên mật khẩu” tự phục vụ và không cần hiển thị trên trang đăng nhập.

## Hạng mục để phát triển sau

### 1. Reset Password có kênh xác minh

- Chọn và quản trị dữ liệu liên hệ đã xác minh: email cơ quan, số điện thoại, hoặc cả hai.
- Thiết kế luồng “Quên mật khẩu” tại trang đăng nhập mà không tiết lộ tài khoản có tồn tại hay không.
- Gửi mã/link qua kênh đã xác minh; quy định thời hạn, một lần sử dụng, rate limit, chống spam và audit an toàn.
- Xác minh lại quyền sở hữu kênh liên hệ, xử lý thay đổi liên hệ và thu hồi mọi phiên sau khi reset.
- Chỉ thay thế luồng admin chuyển mã thủ công sau khi có chính sách quản trị kênh liên hệ và hạ tầng gửi tin cậy.

### 2. Register / onboarding người dùng

- Xác định mô hình trước khi triển khai: tự đăng ký, lời mời do quản trị viên gửi, hay nhập từ nguồn nhân sự được phê duyệt.
- Áp dụng phê duyệt, liên kết đơn vị, vai trò mặc định tối thiểu và kích hoạt tài khoản có kiểm soát.
- Không để đăng ký tự do tự cấp vai trò, phạm vi dữ liệu hoặc quyền truy cập hồ sơ nghiệp vụ.
- Audit toàn bộ vòng đời: gửi lời mời/đăng ký, xác minh, phê duyệt, kích hoạt, từ chối và hết hạn.

### 3. Self-service account recovery

- Cho phép người dùng đã có kênh liên hệ xác minh cập nhật mật khẩu, kiểm tra phiên đang hoạt động và yêu cầu trợ giúp khôi phục truy cập.
- Phân biệt rõ đổi mật khẩu khi đang đăng nhập với reset khi mất quyền truy cập.
- Bổ sung hỗ trợ vận hành cho trường hợp mất kênh liên hệ, tài khoản bị khóa, hoặc dấu hiệu chiếm đoạt tài khoản.
- Đánh giá MFA/SSO/LDAP theo chính sách tổ chức trước khi mở rộng sang môi trường vận hành chính thức.

### 4. Bulk user adding / import tài khoản hàng loạt

- Nhập CSV/XLSX qua luồng preview → kiểm tra → xác nhận → thực thi, không tạo tài khoản ngay khi tải tệp lên.
- Kiểm tra trùng username, dữ liệu bắt buộc, vai trò hệ thống, đơn vị/phạm vi, trạng thái và định dạng kênh liên hệ nếu đã có.
- Cung cấp kết quả từng dòng, tải báo cáo lỗi, idempotency/retry an toàn và không ghi mật khẩu plaintext vào file, log hay báo cáo.
- Quy định cách phát mật khẩu/lời mời khởi tạo, buộc đổi mật khẩu lần đầu nếu chính sách yêu cầu, và audit cho từng tài khoản được tạo/cập nhật/bỏ qua.

## Điều kiện bắt đầu

Trước khi nhận một hạng mục vào sprint, cần chốt chính sách nguồn danh tính, kênh liên hệ được phép, quy trình phê duyệt, đơn vị vận hành, yêu cầu bảo mật và retention/audit. Các hạng mục này không làm thay đổi mô hình cấp tài khoản nội bộ hiện tại cho đến khi có quyết định riêng.
