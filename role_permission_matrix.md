# DocManSystem - Ma trận vai trò và phân quyền chi tiết

## 1. Mục đích tài liệu

Tài liệu này xác định phân quyền chi tiết theo vai trò cho toàn bộ hệ thống DocManSystem. Mục tiêu là:

- Làm cơ sở thống nhất giữa nghiệp vụ, thiết kế hệ thống và triển khai phần mềm
- Làm căn cứ để cấu hình RBAC trong hệ thống
- Giúp quản lý và các bộ phận liên quan hiểu rõ ai được xem, tạo, sửa, phê duyệt và xuất báo cáo ở từng module

Tài liệu này áp dụng cho giai đoạn `MVP nội bộ`.

## 2. Nhóm vai trò áp dụng

- `ADM`: Quản trị hệ thống
- `LD`: Lãnh đạo
- `VT`: Văn thư/Hành chính
- `TBP`: Trưởng bộ phận
- `CB`: Cán bộ chuyên môn
- `HD`: Thành viên hội đồng/đánh giá
- `BC`: Người xem báo cáo

## 3. Quy ước quyền

- `Y`: Được phép thực hiện
- `C`: Được phép có điều kiện hoặc trong phạm vi được phân công
- `N`: Không được phép

Nguyên tắc áp dụng cho ký hiệu `C`:

- Chỉ trong phạm vi đơn vị phụ trách
- Chỉ với dữ liệu được giao xử lý
- Chỉ trong trạng thái nghiệp vụ phù hợp
- Chỉ với loại dữ liệu không vượt mức độ mật/quyền truy cập

## 4. Nguyên tắc phân quyền chung

- `ADM` có quyền cấu hình, quản trị, giám sát và xem toàn hệ thống
- `LD` có quyền xem rộng, chỉ đạo, phê duyệt và khai thác báo cáo theo thẩm quyền
- `VT` tập trung vào luồng tiếp nhận, phát hành, lưu trữ, hành chính và điều phối
- `TBP` có quyền điều phối trong phạm vi đơn vị và theo dõi tiến độ bộ phận
- `CB` có quyền tác nghiệp trên hồ sơ, văn bản, công việc, đề tài được giao
- `HD` chỉ tham gia vào phần đánh giá/chấm điểm/họp hội đồng khi được phân công
- `BC` chỉ có quyền xem dashboard, báo cáo và dữ liệu được mở quyền đọc

## 5. Ma trận phân quyền nền tảng

### 5.1 Quản trị người dùng, vai trò, đơn vị, danh mục

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách người dùng | Y | C | N | N | N | N | N |
| Xem chi tiết người dùng | Y | C | N | N | N | N | N |
| Tạo tài khoản | Y | N | N | N | N | N | N |
| Sửa tài khoản | Y | N | N | N | N | N | N |
| Khóa/mở khóa tài khoản | Y | N | N | N | N | N | N |
| Gán vai trò cho người dùng | Y | N | N | N | N | N | N |
| Xem cơ cấu đơn vị/phòng ban | Y | C | C | C | C | N | C |
| Tạo đơn vị/phòng ban | Y | N | N | N | N | N | N |
| Sửa đơn vị/phòng ban | Y | N | N | N | N | N | N |
| Xem danh mục dùng chung | Y | C | C | C | C | C | C |
| Tạo danh mục dùng chung | Y | N | N | N | N | N | N |
| Sửa danh mục dùng chung | Y | N | N | N | N | N | N |
| Xuất báo cáo người dùng/đơn vị | Y | C | N | N | N | N | C |

### 5.2 Tệp đính kèm, audit, thông báo, tìm kiếm

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tải lên tệp đính kèm | Y | C | Y | C | C | C | N |
| Xem/tải tệp đính kèm | Y | C | Y | C | C | C | C |
| Cập nhật phiên bản tệp | Y | C | Y | C | C | C | N |
| Xóa mềm tệp đính kèm | Y | C | C | C | C | N | N |
| Xem audit log hệ thống | Y | C | N | N | N | N | N |
| Xuất audit log | Y | C | N | N | N | N | N |
| Xem thông báo cá nhân | Y | Y | Y | Y | Y | Y | Y |
| Tạo thông báo hệ thống | Y | C | N | N | N | N | N |
| Xem kết quả tìm kiếm toàn hệ thống | Y | C | C | C | C | C | C |
| Xuất kết quả tìm kiếm | Y | C | C | C | C | N | C |

## 6. Ma trận phân quyền theo module

### 6.1 Quản lý văn bản, công văn

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách văn bản | Y | C | Y | C | C | N | C |
| Xem chi tiết văn bản | Y | C | Y | C | C | N | C |
| Tạo văn bản đến | Y | C | Y | N | N | N | N |
| Tạo văn bản đi | Y | C | Y | C | C | N | N |
| Tạo văn bản nội bộ | Y | C | Y | C | C | N | N |
| Sửa thông tin văn bản trước khi phát hành/chuyển xử lý | Y | C | Y | C | C | N | N |
| Gắn file scan/file gốc | Y | C | Y | C | C | N | N |
| Đăng ký số văn bản | Y | C | Y | N | N | N | N |
| Phân loại mức độ khẩn/mật | Y | C | Y | C | N | N | N |
| Chuyển xử lý văn bản | Y | Y | Y | C | N | N | N |
| Chỉ đạo xử lý trên văn bản | Y | Y | C | C | N | N | N |
| Nhận xử lý văn bản | Y | C | C | C | C | N | N |
| Cập nhật kết quả xử lý | Y | C | C | C | C | N | N |
| Hoàn thành xử lý văn bản | Y | C | C | C | C | N | N |
| Phê duyệt phát hành văn bản đi | Y | Y | C | C | N | N | N |
| Xem lịch sử luân chuyển | Y | C | Y | C | C | N | C |
| Xuất báo cáo văn bản | Y | Y | C | C | N | N | C |

Ghi chú:

- `LD` có quyền xem và phê duyệt theo thẩm quyền đối với văn bản thuộc phạm vi lãnh đạo phụ trách
- `TBP` chủ yếu phân công và theo dõi văn bản trong đơn vị
- `CB` chỉ xử lý văn bản được giao hoặc được chia sẻ quyền đọc

### 6.2 Quản lý hồ sơ

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách hồ sơ | Y | C | Y | C | C | N | C |
| Xem chi tiết hồ sơ | Y | C | Y | C | C | N | C |
| Tạo hồ sơ | Y | C | Y | C | C | N | N |
| Sửa thông tin hồ sơ | Y | C | Y | C | C | N | N |
| Cập nhật thành phần hồ sơ | Y | C | Y | C | C | N | N |
| Gắn tài liệu vào hồ sơ | Y | C | Y | C | C | N | N |
| Xác nhận hồ sơ đầy đủ | Y | C | Y | C | C | N | N |
| Chuyển trạng thái hồ sơ | Y | C | Y | C | C | N | N |
| Ghi nhận vị trí lưu trữ | Y | N | Y | C | N | N | N |
| Quản lý mượn/trả hồ sơ | Y | N | Y | C | C | N | N |
| Bàn giao/lưu trữ hồ sơ | Y | C | Y | C | N | N | N |
| Xem lịch sử hồ sơ | Y | C | Y | C | C | N | C |
| Xuất báo cáo hồ sơ | Y | Y | C | C | N | N | C |

Ghi chú:

- `VT` là đầu mối chính đối với lưu trữ hành chính và hồ sơ giấy
- `CB` được cập nhật hồ sơ trong phạm vi công việc được giao
- `LD` chủ yếu xem, chỉ đạo và phê duyệt các thao tác cần thẩm quyền

### 6.3 Quản lý giao việc

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách công việc | Y | C | C | C | C | N | C |
| Xem chi tiết công việc | Y | C | C | C | C | N | C |
| Tạo công việc độc lập | Y | Y | C | Y | C | N | N |
| Tạo công việc từ văn bản/hồ sơ/đề tài | Y | Y | C | Y | C | N | N |
| Sửa thông tin công việc | Y | C | C | Y | C | N | N |
| Giao người chủ trì/phối hợp | Y | Y | C | Y | N | N | N |
| Giao hạn xử lý | Y | Y | C | Y | N | N | N |
| Cập nhật tiến độ | Y | C | C | C | Y | N | N |
| Gửi phản hồi/trao đổi nội bộ | Y | C | C | C | Y | N | N |
| Đính kèm kết quả thực hiện | Y | C | C | C | Y | N | N |
| Xác nhận hoàn thành công việc | Y | Y | C | Y | C | N | N |
| Đánh giá kết quả công việc | Y | Y | N | Y | N | N | N |
| Xem việc quá hạn | Y | C | C | C | C | N | C |
| Xuất báo cáo công việc | Y | Y | C | C | N | N | C |

Ghi chú:

- `LD` và `TBP` là hai vai trò chính có quyền giao việc và xác nhận hoàn thành
- `CB` được tạo việc cá nhân hoặc việc con nếu quy trình cho phép, nhưng không mặc định có quyền giao người khác ngoài phạm vi

### 6.4 Lịch công tác

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem lịch cá nhân | Y | Y | Y | Y | Y | C | C |
| Xem lịch đơn vị | Y | C | Y | Y | C | C | C |
| Xem lịch lãnh đạo | Y | Y | C | C | N | N | C |
| Tạo lịch họp/công tác | Y | C | Y | C | C | N | N |
| Sửa lịch | Y | C | Y | C | C | N | N |
| Hủy/hoãn lịch | Y | C | Y | C | N | N | N |
| Mời thành phần tham dự | Y | C | Y | C | C | N | N |
| Xác nhận tham dự | Y | Y | Y | Y | Y | Y | N |
| Đính kèm tài liệu cuộc họp | Y | C | Y | C | C | C | N |
| Liên kết lịch với văn bản/hồ sơ/đề tài/việc | Y | C | Y | C | C | C | N |
| Phê duyệt lịch quan trọng/lịch lãnh đạo | Y | Y | C | C | N | N | N |
| Xem lịch sử cập nhật lịch | Y | C | Y | C | C | C | C |
| Xuất báo cáo lịch công tác | Y | Y | C | C | N | N | C |

Ghi chú:

- `VT` thường là đầu mối điều phối lịch đơn vị hoặc lịch lãnh đạo
- `HD` chỉ xem hoặc xác nhận các lịch hội đồng, lịch họp liên quan

### 6.5 Quản lý đề tài (OMS)

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách hồ sơ đề tài | Y | C | C | C | C | C | C |
| Xem chi tiết hồ sơ đề tài | Y | C | C | C | C | C | C |
| Tạo đợt tiếp nhận | Y | C | N | C | C | N | N |
| Sửa đợt tiếp nhận | Y | C | N | C | C | N | N |
| Khai báo checklist, biểu mẫu | Y | C | N | C | C | N | N |
| Tiếp nhận hồ sơ đề tài | Y | C | C | C | Y | N | N |
| Kiểm tra đủ/thiếu hồ sơ | Y | C | N | C | Y | N | N |
| Yêu cầu bổ sung hồ sơ | Y | C | N | C | Y | N | N |
| Xác nhận đủ điều kiện | Y | C | N | C | Y | N | N |
| Lập hội đồng đánh giá | Y | C | C | C | Y | N | N |
| Phân công phản biện/chuyên gia | Y | C | N | C | Y | N | N |
| Xếp lịch họp đánh giá | Y | C | C | C | Y | N | N |
| Tạo phiếu chấm điểm | Y | C | N | C | Y | N | N |
| Chấm điểm/nhận xét | Y | N | N | N | N | Y | N |
| Tổng hợp kết quả đánh giá | Y | C | N | C | Y | N | N |
| Trình phê duyệt kết quả | Y | C | N | C | Y | N | N |
| Phê duyệt kết quả cuối cùng | Y | Y | N | C | N | N | N |
| Xem biên bản/điểm/nhận xét | Y | C | C | C | C | C | C |
| Xuất báo cáo OMS | Y | Y | N | C | C | N | C |

Ghi chú:

- `HD` chỉ có quyền trên hồ sơ được phân công đánh giá
- `LD` là đầu mối phê duyệt kết quả cuối cùng hoặc cho ý kiến theo thẩm quyền
- `CB` là nhóm tác nghiệp chính trong tiếp nhận, kiểm tra và tổng hợp

### 6.6 Theo dõi đề tài

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh sách đề tài | Y | C | C | C | C | C | C |
| Xem chi tiết đề tài | Y | C | C | C | C | C | C |
| Tạo hồ sơ theo dõi đề tài | Y | C | N | C | Y | N | N |
| Sửa thông tin đề tài | Y | C | N | C | Y | N | N |
| Khai báo mốc tiến độ | Y | C | N | C | Y | N | N |
| Cập nhật báo cáo tiến độ | Y | C | N | C | Y | N | N |
| Ghi nhận báo cáo định kỳ | Y | C | C | C | Y | N | N |
| Ghi nhận điều chỉnh/gia hạn | Y | C | N | C | Y | N | N |
| Tạo cảnh báo chậm tiến độ | Y | C | N | C | Y | N | N |
| Liên kết văn bản/hồ sơ/việc/lịch | Y | C | C | C | Y | N | N |
| Xác nhận hoàn thành mốc | Y | C | N | C | Y | N | N |
| Phê duyệt điều chỉnh lớn/nghiệm thu | Y | Y | N | C | N | N | N |
| Xem lịch sử theo dõi đề tài | Y | C | C | C | C | N | C |
| Xuất báo cáo theo dõi đề tài | Y | Y | N | C | C | N | C |

Ghi chú:

- `CB` là đầu mối cập nhật dữ liệu chuyên môn hằng ngày
- `TBP` theo dõi tiến độ trong phạm vi đơn vị phụ trách
- `LD` phê duyệt các quyết định quan trọng như điều chỉnh lớn hoặc nghiệm thu

## 7. Phân quyền dashboard và báo cáo

### 7.1 Dashboard

| Chức năng | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Xem dashboard tổng quan toàn hệ thống | Y | C | N | N | N | N | C |
| Xem dashboard lãnh đạo | Y | Y | N | N | N | N | C |
| Xem dashboard đơn vị | Y | C | C | Y | C | N | C |
| Xem dashboard cá nhân | Y | Y | Y | Y | Y | Y | Y |
| Tùy biến widget dashboard | Y | C | C | C | C | N | N |

### 7.2 Xuất báo cáo

| Loại báo cáo | ADM | LD | VT | TBP | CB | HD | BC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Báo cáo tổng hợp toàn hệ thống | Y | Y | N | N | N | N | C |
| Báo cáo theo đơn vị | Y | C | C | Y | N | N | C |
| Báo cáo văn bản | Y | Y | C | C | N | N | C |
| Báo cáo hồ sơ | Y | Y | C | C | N | N | C |
| Báo cáo OMS | Y | Y | N | C | C | N | C |
| Báo cáo theo dõi đề tài | Y | Y | N | C | C | N | C |
| Báo cáo giao việc | Y | Y | C | C | C | N | C |
| Báo cáo lịch công tác | Y | Y | C | C | N | N | C |
| Xuất dữ liệu Excel/PDF | Y | Y | C | C | C | N | C |

## 8. Các thao tác cần phê duyệt

Các thao tác sau phải đi qua bước phê duyệt hoặc xác nhận có thẩm quyền:

- Phát hành văn bản đi
- Phê duyệt xử lý văn bản quan trọng hoặc văn bản mật
- Bàn giao/lưu trữ hồ sơ có giá trị chính thức
- Phê duyệt kết quả OMS
- Phê duyệt điều chỉnh lớn, gia hạn hoặc nghiệm thu đề tài
- Xác nhận hoàn thành các công việc trọng yếu do lãnh đạo hoặc trưởng bộ phận giao
- Phê duyệt lịch lãnh đạo hoặc lịch họp quan trọng

## 9. Quy tắc triển khai RBAC đề xuất

### 9.1 Quyền ở mức hệ thống

- `view`
- `create`
- `edit`
- `approve`
- `export`
- `assign`
- `comment`
- `manage`

### 9.2 Quyền ở mức phạm vi dữ liệu

- `all`: toàn hệ thống
- `department`: trong đơn vị
- `assigned`: được giao phụ trách
- `participating`: tham gia xử lý/họp/đánh giá
- `own`: do chính người dùng tạo hoặc phụ trách

### 9.3 Nguyên tắc cấu hình

- Không gán trực tiếp quá nhiều quyền lẻ cho từng người dùng
- Gán quyền theo vai trò chuẩn, sau đó mở rộng bằng phạm vi dữ liệu
- Các quyền `approve`, `export toàn hệ thống`, `view audit log`, `manage users` chỉ cấp cho nhóm thật sự cần thiết
- Mọi quyền liên quan dữ liệu mật phải tách riêng khỏi quyền xem dữ liệu thường

## 10. Đề xuất dùng tài liệu này trong dự án

Tài liệu này nên được dùng làm đầu vào cho:

- Thiết kế RBAC trong cơ sở dữ liệu và backend
- Thiết kế điều kiện hiển thị nút bấm trên giao diện
- Thiết kế workflow phê duyệt
- Viết test phân quyền và test nghiệm thu
- Rà soát phạm vi trách nhiệm giữa các phòng ban trước khi triển khai thực tế
