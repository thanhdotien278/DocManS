# I. THÔNG TIN CHUNG VỀ ĐỀ TÀI

# 1. Tên đề tài

**Nghiên cứu, thiết kế và xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và Đổi mới sáng tạo tại Học viện Quân y – Phiên bản 2026**

# II. MỤC TIÊU, NỘI DUNG VÀ PHƯƠNG ÁN TỔ CHỨC THỰC HIỆN ĐỀ TÀI

**13. Mục tiêu của đề tài**

Xây dựng một hệ thống quản lý đề tài và điều hành công việc nội bộ tập trung, nhằm số hóa quy trình tác nghiệp, tăng khả năng tra cứu, giám sát tiến độ, hỗ trợ lãnh đạo điều hành, và nâng cao tính minh bạch trong xử lý công việc.

Xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và đổi mới sáng tạo tại Học viện Quân y theo hướng tập trung, liên thông và có khả năng mở rộng. Hệ thống lấy quản lý vòng đời đề tài nghiên cứu khoa học làm lõi, đồng thời tích hợp các phân hệ quản lý thông tin nhà khoa học, hồ sơ đề tài, quy trình đánh giá – phê duyệt – nghiệm thu, theo dõi tiến độ, sản phẩm nghiên cứu, công bố khoa học, sinh viên nghiên cứu khoa học, văn bản liên quan, giao việc và dashboard điều hành. Mục tiêu là số hóa quy trình tác nghiệp, giảm thao tác thủ công, tăng khả năng tra cứu, giám sát tiến độ, hỗ trợ lãnh đạo ra quyết định và nâng cao tính minh bạch trong quản lý hoạt động KH&CN tại Học viện.

**17. Nội dung nghiên cứu khoa học và triển khai thực nghiệm của đề tài và phương án thực hiện**

**Nội dung 2: Xây dựng và hoàn thiện các module chức năng của hệ thống.**

**Công việc 2.1: Phát triển module quản lý đề tài (OMS).**

* Quản lý đợt tiếp nhận hồ sơ.
* Tạo, nộp, kiểm tra và bổ sung hồ sơ đề tài.
* Phân công reviewer/hội đồng.
* Chấm điểm, tổng hợp đánh giá và trình phê duyệt.

**Công việc 2.2: Phát triển module theo dõi đề tài.**

* Khởi tạo hồ sơ theo dõi từ đề tài đã được duyệt.
* Quản lý kế hoạch, văn bản, mốc tiến độ, báo cáo định kỳ.
* Theo dõi điều chỉnh, gia hạn, kinh phí, sản phẩm nghiên cứu.

**Công việc 2.3: Phát triển module theo dõi hội thảo, sinh viên nghiên cứu khoa học.**

* Khởi tạo hội thảo đã được duyệt.
* Quản lý kế hoạch, văn bản.
* Theo dõi điều chỉnh, kinh phí, sản phẩm nghiên cứu.

**Công việc 2.4: Phát triển module quản lý giao việc.**

* Tạo việc, giao việc, cập nhật tiến độ, nhắc việc.
* Theo dõi việc theo cá nhân, đề tài, đơn vị và hạn xử lý.
* Thống kê việc đúng hạn, quá hạn và khối lượng công việc.

**Công việc 2.5: Phát triển module Dashboard điều hành.**

* Tổng hợp số lượng hồ sơ, đề tài, công việc theo trạng thái.
* Hiển thị việc chờ xử lý, việc quá hạn, đề tài chậm tiến độ.
* Cung cấp các báo cáo trực quan phục vụ lãnh đạo và chuyên viên quản lý khoa học.
* Hoàn thiện giao diện phù hợp trên máy tính và có thể sử dụng tốt trên thiết bị di động.
* Tích hợp các chức năng dùng chung như quản lý tài khoản, phân quyền, thông báo, tìm kiếm, quản lý tệp đính kèm, xuất báo cáo.

**Công việc 2.6: Phát triển module quản lý văn bản liên quan.**

* Quản lý kế hoạch, văn bản quản lý nhà nước, pháp lý
* Quản lý văn bản liên quan đề tài, hội nghị theo thời gian thực.

**Công việc 2.7: Phát triển module quản lý hội đồng.**

* Quản lý kế hoạch, văn bản quản lý nhà nước, pháp lý
* Tạo, nộp, hồ sơ y đức.
* Chấm điểm, tổng hợp đánh giá và trình phê duyệt.

Sản phẩm tạo ra: Phần mềm quản lý đảm bảo những yêu cầu ban đầu đề ra.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

**Kỹ thuật sẽ sử dụng**

Hệ thống dự kiến được thiết kế theo kiến trúc web-based nhiều lớp, gồm: lớp giao diện người dùng, lớp xử lý nghiệp vụ, lớp dịch vụ/API và lớp cơ sở dữ liệu. Frontend được xây dựng theo hướng responsive để sử dụng tốt trên máy tính và thiết bị di động. Backend cung cấp các API phục vụ quản lý nghiệp vụ, phân quyền, xử lý quy trình, thông báo, thống kê và tích hợp dữ liệu. Cơ sở dữ liệu quan hệ được sử dụng để quản lý hồ sơ đề tài, thông tin nhà khoa học, hội đồng đánh giá, văn bản, mốc tiến độ, công việc, sản phẩm đầu ra, công bố khoa học và nhật ký hệ thống. Hệ thống áp dụng phân quyền theo vai trò, xác thực người dùng, ghi nhật ký thao tác, sao lưu dữ liệu định kỳ và cơ chế kiểm soát truy cập phù hợp môi trường nội bộ Học viện. Tech stack dự kiến sử dụng

Frontend: Next.js + React + TypeScript

UI: Tailwind CSS + shadcn/ui hoặc Ant Design

Backend: NestJS + TypeScript

Database chính: PostgreSQL

ORM: Prisma

Cache / job queue / nhắc việc: Redis + BullMQ

Lưu file đính kèm: MinIO, tương thích S3, dễ host nội bộ

Dashboard: Recharts hoặc Apache ECharts

Realtime notification: WebSocket hoặc Server-Sent Events

Export báo cáo: ExcelJS cho Excel, pdfmake/Puppeteer cho PDF

Search: PostgreSQL full-text trước; nếu sau này lớn thì thêm Meilisearch hoặc OpenSearch

Deployment: Docker Compose trên máy chủ nội bộ.