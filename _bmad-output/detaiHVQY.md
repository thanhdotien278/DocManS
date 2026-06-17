**THUYẾT MINH**

**ĐỀ TÀI KHOA HỌC VÀ CÔNG NGHỆ CẤP HỌC VIỆN QUÂN Y**[[1]](#footnote-1)

# I. THÔNG TIN CHUNG VỀ ĐỀ TÀI

# 1. Tên đề tài

**Nghiên cứu, thiết kế và xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và Đổi mới sáng tạo tại Học viện Quân y – Phiên bản 2026**

# II. MỤC TIÊU, NỘI DUNG VÀ PHƯƠNG ÁN TỔ CHỨC THỰC HIỆN ĐỀ TÀI

**13. Mục tiêu của đề tài**

Xây dựng một hệ thống quản lý đề tài và điều hành công việc nội bộ tập trung, nhằm số hóa quy trình tác nghiệp, tăng khả năng tra cứu, giám sát tiến độ, hỗ trợ lãnh đạo điều hành, và nâng cao tính minh bạch trong xử lý công việc.

Xây dựng hệ thống quản lý hoạt động nghiên cứu khoa học, công nghệ và đổi mới sáng tạo tại Học viện Quân y theo hướng tập trung, liên thông và có khả năng mở rộng. Hệ thống lấy quản lý vòng đời đề tài nghiên cứu khoa học làm lõi, đồng thời tích hợp các phân hệ quản lý thông tin nhà khoa học, hồ sơ đề tài, quy trình đánh giá – phê duyệt – nghiệm thu, theo dõi tiến độ, sản phẩm nghiên cứu, công bố khoa học, sinh viên nghiên cứu khoa học, văn bản liên quan, giao việc và dashboard điều hành. Mục tiêu là số hóa quy trình tác nghiệp, giảm thao tác thủ công, tăng khả năng tra cứu, giám sát tiến độ, hỗ trợ lãnh đạo ra quyết định và nâng cao tính minh bạch trong quản lý hoạt động KH&CN tại Học viện.

**17. Nội dung nghiên cứu khoa học và triển khai thực nghiệm của đề tài và phương án thực hiện**

**17.1. Nội dung nghiên cứu**

**Xây dựng và hoàn thiện thuyết minh đề tài**

**Nội dung 1:** **Khảo sát thực trạng, phân tích yêu cầu và thiêt kế hệ thống.**

Công việc 1.1: Khảo sát thực trạng công tác quản lý đề tài nghiên cứu khoa học cấp trường tại đơn vị triển khai (Khảo sát, tham khảo các mô hình hệ thống quản lý đề tài, hệ thống quản trị quy trình và dashboard điều hành đã có).

Công việc 1.2: Thu thập, tổng hợp các biểu mẫu, quy trình, quy định và tài liệu liên quan đến các khâu: tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi tiến độ, báo cáo, nghiệm thu và giao việc (Phân tích các khó khăn, bất cập trong phương thức quản lý hiện nay như: dữ liệu phân tán, khó tra cứu, khó theo dõi trạng thái xử lý, chậm nhắc hạn, khó tổng hợp báo cáo cho lãnh đạo).

Công việc 1.3: Thiết kế mô hình nghiệp vụ, mô hình dữ liệu, phân quyền người dùng, trạng thái xử lý và luồng liên thông giữa các module.

Xác định các yêu cầu chức năng, phi chức năng của hệ thống. Thiết kế cơ sở dữ liệu, các models và kiến trúc hệ thống phù hợp với triển khai web-based trong môi trường nội bộ

Sản phẩm tạo ra: Hoàn thiện thuyết minh đề tài và khung phần mềm quản lý theo mục tiêu đề ra.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

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

**Nội dung 3: Triển khai thực nghiệm, kiểm thử và đánh giá hệ thống.**

**Công việc 3.1: Xây dựng dữ liệu mẫu và kịch bản nghiệp vụ thử nghiệm cho các tình huống chính.**

* Nộp hồ sơ đề tài.
* Kiểm tra và yêu cầu bổ sung.
* Phân công đánh giá, chấm điểm, phê duyệt.
* Theo dõi tiến độ, nộp báo cáo định kỳ.
* Giao việc, nhắc việc, cảnh báo quá hạn.
* Nghiệm thu và cập nhật kết quả cuối cùng.

**Công việc 3.2: Triển khai thực nghiệm hệ thống tại một số đầu mối chuyên môn hoặc đơn vị quản lý khoa học của nhà trường.**

**Công việc 3.3: Kiểm thử các chức năng chính, kiểm thử phân quyền người dùng, kiểm thử tính đúng đắn của luồng xử lý và dữ liệu.**

**Công việc 3.4: Đánh giá hệ thống theo các tiêu chí.**

* Mức độ đáp ứng yêu cầu nghiệp vụ.
* Tính ổn định và chính xác của dữ liệu.
* Khả năng tra cứu, tổng hợp báo cáo.
* Tính thuận tiện khi sử dụng hệ thống đối với cán bộ quản lý, chủ nhiệm đề tài, reviewer và lãnh đạo.

**Công việc 3.5: Thu thập ý kiến người dùng thử nghiệm, chỉnh sửa và hoàn thiện hệ thống.**

**Công việc 3.6: Hoàn thiện tài liệu hướng dẫn sử dụng, báo cáo tổng kết và các sản phẩm của đề tài.**

Sản phẩm tạo ra: Phần mềm quản lý.

Nhu cầu về nhân lực, trang thiết bị: Các thành viên nghiên cứu của đề tài tham gia, trang thiết bị cần một máy tính có cấu hình cao.

**17.2. Cách tiếp cận vấn đề nghiên cứu, thiết kế nghiên cứu, đối tượng và phương pháp nghiên cứu, kỹ thuật sẽ sử dụng** *(gắn với từng nội dung nghiên cứu của đề tài)*

**Cách tiếp cận vấn đề nghiên cứu**

Đề tài được tiếp cận theo hướng nghiên cứu ứng dụng, lấy bài toán quản lý thực tiễn làm trung tâm, kết hợp giữa phân tích nghiệp vụ quản lý khoa học và thiết kế hệ thống thông tin. Cách tiếp cận này nhằm bảo đảm sản phẩm của đề tài không chỉ có ý nghĩa về mặt nghiên cứu mà còn có khả năng triển khai, vận hành và sử dụng thực tế trong môi trường học viện nhà trường.

Cụ thể, đề tài được tiếp cận theo các hướng sau:

* Tiếp cận hệ thống: Xem công tác quản lý đề tài nghiên cứu khoa học cấp trường là một hệ thống nghiệp vụ tổng thể, bao gồm nhiều khâu liên thông như tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi thực hiện, giao việc, báo cáo và nghiệm thu. Trên cơ sở đó xây dựng giải pháp đồng bộ, tránh xử lý rời rạc từng khâu riêng lẻ.
* Tiếp cận từ thực tiễn quản lý: Xuất phát từ các khó khăn đang tồn tại trong thực tế như dữ liệu phân tán, xử lý thủ công, khó theo dõi tiến độ, chậm nhắc hạn, khó tổng hợp báo cáo cho lãnh đạo. Việc phân tích thực trạng là cơ sở để xác định đúng yêu cầu và phạm vi hệ thống.
* Tiếp cận theo quy trình nghiệp vụ: Chuẩn hóa các bước xử lý của từng nhóm người dùng, làm rõ vai trò, trách nhiệm, trạng thái nghiệp vụ và luồng chuyển tiếp giữa các bước. Đây là nền tảng để thiết kế hệ thống đúng với yêu cầu quản trị.
* Tiếp cận lấy người dùng làm trung tâm: Giao diện, chức năng và báo cáo được thiết kế phù hợp với từng nhóm người dùng như chuyên viên quản lý khoa học, lãnh đạo, chủ nhiệm đề tài, thành viên đề tài và reviewer.
* Tiếp cận theo hướng mở và có khả năng mở rộng: Hệ thống được xây dựng cho nhu cầu hiện tại nhưng vẫn tính đến khả năng mở rộng sau này như tích hợp chữ ký số, SSO, tích điểm bài báo khoa học, cổng ngoài hoặc báo cáo nâng cao.

**Thiết kế nghiên cứu**

Đề tài được thiết kế theo mô hình nghiên cứu ứng dụng kết hợp giữa nghiên cứu mô tả, nghiên cứu phân tích và nghiên cứu thiết kế phát triển hệ thống.

Quy trình thiết kế nghiên cứu gồm các giai đoạn chính:

1. Khảo sát và thu thập thông tin thực trạng: thu thập tài liệu, biểu mẫu, quy trình hiện hành; khảo sát cách thức quản lý đề tài tại đơn vị; ghi nhận các bất cập và nhu cầu thực tế.
2. Phân tích yêu cầu và mô hình hóa nghiệp vụ: phân tích các chức năng cần thiết, các vai trò sử dụng, các trạng thái xử lý, dữ liệu cần quản lý và các mối liên hệ giữa các module.
3. Thiết kế hệ thống: thiết kế kiến trúc tổng thể, cơ sở dữ liệu, phân hệ chức năng, giao diện người dùng, cơ chế phân quyền và luồng xử lý.
4. Xây dựng thử nghiệm hệ thống phát triển phiên bản thử nghiệm với các module cốt lõi gồm quản lý đề tài, theo dõi đề tài, quản lý giao việc và dashboard điều hành.
5. Triển khai thực nghiệm và đánh giá kiểm thử hệ thống theo các kịch bản nghiệp vụ điển hình, lấy ý kiến người dùng, đánh giá mức độ đáp ứng yêu cầu và hiệu chỉnh hoàn thiện.

Thiết kế nghiên cứu như trên phù hợp với đặc thù của đề tài công nghệ thông tin ứng dụng, vì kết quả cuối cùng không chỉ là báo cáo nghiên cứu mà còn là một hệ thống phần mềm có khả năng sử dụng trong thực tế.

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

Deployment: Docker Compose trên máy chủ nội bộ;

Để thực hiện đề tài, các kỹ thuật chủ yếu được sử dụng gồm:

* Kỹ thuật khảo sát và thu thập yêu cầu: Phỏng vấn, trao đổi, tổng hợp biểu mẫu, phân tích tài liệu nghiệp vụ.
* Kỹ thuật phân tích và thiết kế hệ thống thông tin: Sử dụng các mô hình như Use Case, Activity Diagram, Class Diagram, sơ đồ luồng xử lý hoặc BPMN để mô tả hệ thống.
* Kỹ thuật thiết kế cơ sở dữ liệu: Xây dựng mô hình dữ liệu logic và mô hình dữ liệu vật lý phù hợp với bài toán quản lý đề tài, bảo đảm dễ mở rộng và thuận lợi cho tra cứu, báo cáo.
* Kỹ thuật phát triển phần mềm web: Xây dựng hệ thống theo kiến trúc ứng dụng web hiện đại, có khả năng phân tách giao diện, xử lý nghiệp vụ và dữ liệu.
* Kỹ thuật phân quyền và bảo mật: Áp dụng cơ chế xác thực người dùng, phân quyền theo vai trò, ghi nhật ký thao tác và kiểm soát truy cập dữ liệu theo phạm vi được cấp.
* Kỹ thuật giao diện người dùng đáp ứng: Thiết kế giao diện dễ sử dụng trên máy tính, đồng thời có thể hiển thị tốt trên thiết bị di động.
* Kỹ thuật kiểm thử phần mềm: Kiểm thử chức năng, kiểm thử luồng nghiệp vụ, kiểm thử phân quyền, kiểm thử dữ liệu đầu vào và đánh giá khả năng vận hành trong điều kiện sử dụng thực tế.
* Kỹ thuật thống kê và tổng hợp số liệu: Sử dụng các công cụ như Excel hoặc phần mềm hỗ trợ để tổng hợp kết quả khảo sát, kết quả thử nghiệm và đánh giá hiệu quả hệ thống.

**18. Phương án phối hợp với các đơn vị nghiên cứu và cơ sở sản xuất trong nước**

**19. Phương án hợp tác quốc tế** (nếu có)

**20. Phương án thuê chuyên gia** (nếu có)

**20.1. Thuê chuyên gia trong nước**

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| **Số TT** | **Họ và tên, học hàm, học vị** | **Thuộc tổ chức** | **Lĩnh vực chuyên môn** | **Nội dung thực hiện và giải trình lý do cần thuê** | **Thời gian thực hiện quy đổi**  **(tháng)** |
| 1 |  |  |  |  |  |

**20.2. Thuê chuyên gia nước ngoài**

|  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| **Số TT** | **Họ và tên, học hàm, học vị** | **Quốc tịch** | **Thuộc tổ chức** | **Lĩnh vực chuyên môn** | **Nội dung thực hiện và giải trình lý do cần thuê** | **Thời gian thực hiện quy đổi**  **(tháng)** |
| 1 |  |  |  |  |  |  |

**21. Tiến độ thực hiện**

|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | **Các nội dung, công việc  chủ yếu cần được thực hiện; các mốc đánh giá chủ yếu** | **Kết quả phải đạt** | **Thời gian**  (bắt đầu,  kết thúc) | **Cá nhân,  đơn vị  chủ trì\*** | **Dự kiến  kinh phí** |
| *(1)* | *(2)* | *(3)* | *(4)* | *(5)* | *(6)* |
|  | **Xây dựng và hoàn thiện thuyết minh đề tài** | Thuyết minh đầy đủ, đảm bảo tính khoa học và được Phê duyệt thông qua |  | Phạm Anh Tuấn, Khoa Toán – Tin học |  |
| **1** | **Nội dung 1: Khảo sát thực trạng, phân tích yêu cầu và thiêt kế hệ thống** |  |  |  |  |
| 1.1 | - Công việc 1.1: Khảo sát thực trạng công tác quản lý đề tài nghiên cứu khoa học cấp trường tại đơn vị triển khai | Báo cáo thực trạng công tác quản lý đề tài nghiên cứu khoa học cấp trường tại đơn vị triển khai | 4/2026-4/2026 | Phạm Anh Tuấn, Khoa Toán – Tin học | 19,2 |
|  | - Công việc 1.2: Thu thập, tổng hợp các biểu mẫu, quy trình, quy định và tài liệu liên quan đến các khâu: tiếp nhận hồ sơ, đánh giá, phê duyệt, theo dõi tiến độ, báo cáo, nghiệm thu và giao việc. | Báo cáo thực trạng các tài liệu trong công tác quản lý đề tài nghiên cứu khoa học cấp trường tại đơn vị triển khai | 4/2026-4/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Hoàng Thị Thu Hương, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 40,8 |
|  | - Công việc 1.3: Thiết kế mô hình nghiệp vụ, mô hình dữ liệu, phân quyền người dùng, trạng thái xử lý và luồng liên thông giữa các module. | Khung hệ thống | 4/2026-4/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
| **2** | **Nội dung 2: Xây dựng và hoàn thiện các module chức năng của hệ thống*.*** |  |  |  |  |
|  | - Công việc 2.1: Phát triển module Quản lý đề tài (OMS). | Module chức năng | 4/2026-5/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Vũ Thị Thanh Bình, Khoa Toán – Tin học | 38,4 |
|  | - Công việc 2.2: Phát triển module Theo dõi đề tài. | Module chức năng | 4/2026-5/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Vũ Thị Thanh Bình, Khoa Toán – Tin học | 38,4 |
|  | - Công việc 2.3: Phát triển module theo dõi hội thảo, sinh viên nghiên cứu khoa học. | Module chức năng | 6/2026-7/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 2.4: Phát triển module Quản lý giao việc. | Module chức năng | 7/2026-8/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 2.5: Phát triển module Dashboard điều hành. | Module chức năng | 7/2026-8/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 2.6: Phát triển module quản lý văn bản liên quan. | Module chức năng | 7/2026-8/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 2.7: Phát triển module quản lý hội đồng y đức. | Module chức năng | 7/2026-8/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
| **3** | ***Nội dung 3: Triển khai thực nghiệm, kiểm thử và đánh giá hệ thống.*** |  |  |  |  |
|  | - Công việc 3.1: Xây dựng dữ liệu mẫu và kịch bản nghiệp vụ thử nghiệm cho các tình huống chính. | Phần mềm dạng thử nghiệm | 9/2026-10/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Hà Duy Tiến, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 3.2: Triển khai thực nghiệm hệ thống tại một số đầu mối chuyên môn hoặc đơn vị quản lý khoa học của nhà trường. | Phần mềm dạng thử nghiệm | 9/2026-10/2026 | Phạm Anh Tuấn, Khoa Toán – Tin học; Nguyễn Thảo Anh, Ban CNTT; Hà Duy Tiến, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 3.3: Kiểm thử các chức năng chính, kiểm thử phân quyền người dùng, kiểm thử tính đúng đắn của luồng xử lý và dữ liệu. | Phần mềm dạng thử nghiệm | 9/2026-10/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 3.4: Đánh giá hệ thống theo các tiêu chí. | Báo cáo đánh giá phần mềm theo các tiêu chí | 10/2026-11/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |
|  | - Công việc 3.5: Thu thập ý kiến người dùng thử nghiệm, chỉnh sửa và hoàn thiện hệ thống. | Báo cáo về ý kiến người sử dụng | 10/2026-11/2026 | Đỗ Tiến Thành, Hoàng Thị Thu Hương, Khoa Toán – Tin học; Nguyễn Thảo Anh, Ban CNTT; Hà Duy Tiến, Ban Quản lý KHQS | 43,2 |
|  | - Công việc 3.6: Hoàn thiện tài liệu hướng dẫn sử dụng, báo cáo tổng kết và các sản phẩm của đề tài. | Phần mềm | 10/2026-11/2026 | Phạm Anh Tuấn, Đỗ Tiến Thành, Khoa Toán – Tin học; Đỗ Minh Trung, Ban Quản lý KHQS | 38,4 |

*\* Chỉ ghi các đơn vị, cá nhân có tên tại Mục 8, 9, 10, 11, 12, 20*

1. Thuyết minh được trình bày và in trên khổ A4 [↑](#footnote-ref-1)
