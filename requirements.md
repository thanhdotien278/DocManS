# Yêu Cầu Hệ Thống Quản Lý Đề Tài Nghiên Cứu Khoa Học Cấp Trường

**Tên hệ thống:** Research Topic Management System (RTMS)  
**Phiên bản tài liệu:** 1.0  
**Ngày soạn thảo:** 01/04/2026  
**Mục đích tài liệu:** Làm căn cứ trình bày với quản lý và làm đầu vào cho phân tích, thiết kế, triển khai hệ thống.

## 1. Bối cảnh và mục tiêu

Nhà trường cần xây dựng một hệ thống quản lý đề tài nghiên cứu khoa học cấp trường từ đầu, thay cho cách làm rời rạc bằng Excel, email, file lẻ và trao đổi thủ công. Hệ thống phải giúp quản lý toàn bộ vòng đời đề tài, từ tiếp nhận hồ sơ đến đánh giá, phê duyệt, theo dõi thực hiện, giao việc và tổng hợp điều hành.

Mục tiêu chính:

- Chuẩn hóa quy trình quản lý đề tài cấp trường trên một hệ thống thống nhất.
- Minh bạch hóa trạng thái xử lý, trách nhiệm từng cá nhân và từng mốc công việc.
- Giảm bỏ sót hồ sơ, quên hạn báo cáo, quên việc và chậm phê duyệt.
- Giúp lãnh đạo nhìn thấy ngay việc cần làm, việc quá hạn, đề tài rủi ro và tiến độ toàn cục.
- Tạo nền tảng để sau này mở rộng thêm tích hợp, báo cáo nâng cao nếu cần.

## 2. Phạm vi hệ thống

Hệ thống trong giai đoạn này gồm 4 module chính:

1. **Quản lý đề tài (OMS):** Quản lý đợt tiếp nhận, nộp hồ sơ, kiểm tra hồ sơ, đánh giá, phê duyệt.
2. **Theo dõi đề tài:** Quản lý đề tài sau khi được duyệt, tiến độ thực hiện, báo cáo, kinh phí, điều chỉnh và nghiệm thu.
3. **Quản lý giao việc:** Giao nhiệm vụ, theo dõi xử lý, nhắc việc, thống kê mức độ hoàn thành.
4. **Dashboard điều hành:** Cung cấp màn hình tổng hợp công việc, cảnh báo, chỉ số và việc cần xử lý theo vai trò.

Ngoài phạm vi giai đoạn đầu:

- Cổng ngoài cho tổ chức/cá nhân tự đăng ký từ internet công cộng.
- Ký số.
- Tích hợp SSO/LDAP.
- SMS.
- Tích hợp với hệ thống ngoài trường.

## 3. Đối tượng sử dụng và vai trò

### 3.1 Quản trị hệ thống

Chức năng chính:

- Quản lý tài khoản người dùng.
- Gán vai trò, đơn vị, trạng thái tài khoản.
- Quản lý danh mục dùng chung.
- Cấu hình thông báo, mẫu biểu, tham số hệ thống.
- Theo dõi nhật ký hệ thống.

### 3.2 Chuyên viên quản lý khoa học

Chức năng chính:

- Tạo đợt tiếp nhận hồ sơ.
- Tiếp nhận, kiểm tra, yêu cầu bổ sung hồ sơ.
- Tổ chức đánh giá, phân công phản biện, tổng hợp kết quả.
- Theo dõi tiến độ, báo cáo và các thay đổi của đề tài.
- Lập báo cáo quản trị theo phạm vi phụ trách.

### 3.3 Lãnh đạo đơn vị hoặc Ban Giám hiệu

Chức năng chính:

- Xem dashboard tổng hợp.
- Xem hồ sơ, kết quả đánh giá, tiến độ đề tài.
- Phê duyệt hồ sơ, phê duyệt kết quả đánh giá, phê duyệt điều chỉnh hoặc gia hạn theo thẩm quyền.
- Giao việc và theo dõi công việc trọng điểm.
- Xem báo cáo quản trị.

### 3.4 Chủ nhiệm đề tài

Chức năng chính:

- Tạo và nộp hồ sơ đề tài.
- Bổ sung hồ sơ theo yêu cầu.
- Cập nhật kế hoạch, tiến độ, báo cáo định kỳ.
- Đề xuất điều chỉnh, gia hạn, cập nhật sản phẩm nghiên cứu.
- Theo dõi các công việc và thông báo liên quan đến đề tài của mình.

### 3.5 Thành viên đề tài

Chức năng chính:

- Xem đề tài được tham gia.
- Nhận và cập nhật công việc được giao.
- Tải lên tài liệu, kết quả trong phạm vi quyền được cấp.

### 3.6 Reviewer hoặc thành viên hội đồng

Chức năng chính:

- Xem hồ sơ đề tài được phân công.
- Đánh giá, chấm điểm, nhập nhận xét.
- Xem lịch đánh giá hoặc nghiệm thu.
- Xem lại kết quả đánh giá của chính mình.

## 4. Nguyên tắc quản lý và phân quyền

Hệ thống phải hỗ trợ các nguyên tắc sau:

- Phân quyền theo vai trò.
- Phân quyền theo đơn vị.
- Phân quyền theo phạm vi dữ liệu.
- Phân quyền theo trạng thái nghiệp vụ khi cần.
- Mọi thao tác quan trọng phải được ghi nhật ký để truy vết.

Các thao tác bắt buộc phải có log:

- Đăng nhập, đăng xuất.
- Tạo mới, cập nhật, xóa mềm.
- Nộp hồ sơ, yêu cầu bổ sung, nộp lại hồ sơ.
- Phân công đánh giá.
- Chấm điểm, nhập nhận xét, phê duyệt.
- Tạo việc, giao việc, cập nhật trạng thái việc.
- Tải lên, tải xuống tài liệu quan trọng.

## 5. Nhóm chức năng dùng chung

### 5.1 Quản lý người dùng và cơ cấu tổ chức

Hệ thống phải cho phép:

- Tạo, sửa, khóa tài khoản.
- Gắn tài khoản với đơn vị, chức danh, vai trò.
- Gán một người dùng nhiều vai trò nếu cần.
- Kích hoạt hoặc ngừng hiệu lực tài khoản.

### 5.2 Danh mục dùng chung

Hệ thống phải có danh mục để quản trị:

- Đơn vị, bộ môn, khoa.
- Lĩnh vực nghiên cứu.
- Loại đề tài.
- Đợt tiếp nhận hồ sơ.
- Trạng thái hồ sơ và trạng thái đề tài.
- Mức độ ưu tiên công việc.
- Loại báo cáo.
- Loại sản phẩm nghiên cứu.
- Mẫu biểu, checklist, tiêu chí chấm điểm.

### 5.3 Quản lý tệp đính kèm

Hệ thống phải cho phép:

- Tải lên nhiều tệp đính kèm theo từng đối tượng nghiệp vụ.
- Gắn tệp với hồ sơ đề tài, báo cáo, biên bản, công việc, sản phẩm nghiên cứu.
- Tải xuống theo quyền.
- Xem trước các định dạng phổ biến nếu có thể.
- Lưu lịch sử phiên bản đối với các tài liệu cần theo dõi thay thế.

### 5.4 Tìm kiếm và tra cứu

Hệ thống phải hỗ trợ:

- Tìm kiếm theo từ khóa.
- Tìm theo mã đề tài, tên đề tài, chủ nhiệm, đơn vị, trạng thái.
- Bộ lọc theo đợt tiếp nhận, lĩnh vực, năm học, hạn xử lý, người phụ trách.
- Tra cứu lịch sử xử lý của từng hồ sơ, từng đề tài, từng công việc.

### 5.5 Thông báo và nhắc việc

Hệ thống phải có:

- Thông báo trong hệ thống.
- Thông báo email cho các sự kiện quan trọng.
- Nhắc trước hạn đối với công việc và báo cáo.
- Cảnh báo quá hạn.
- Thông báo khi có yêu cầu bổ sung, đánh giá mới, phê duyệt mới hoặc thay đổi trạng thái.

### 5.6 Xuất dữ liệu và báo cáo

Hệ thống phải hỗ trợ:

- Xuất Excel đối với danh sách và báo cáo chính.
- Xuất PDF đối với một số biểu mẫu, biên bản, quyết định hoặc báo cáo tổng hợp.
- In hoặc tải về phiếu đánh giá, quyết định, biên bản theo mẫu khi cần.

## 6. Module 1: Quản lý đề tài (OMS)

### 6.1 Mục tiêu

Quản lý toàn bộ quá trình tiếp nhận hồ sơ đề tài, kiểm tra điều kiện, tổ chức đánh giá và trình phê duyệt.

### 6.2 Chức năng chi tiết

#### 6.2.1 Quản lý đợt tiếp nhận hồ sơ

Hệ thống phải cho phép chuyên viên quản lý khoa học:

- Tạo đợt tiếp nhận hồ sơ theo năm học hoặc kế hoạch nghiên cứu.
- Khai báo thời gian bắt đầu, kết thúc, phạm vi áp dụng.
- Khai báo loại đề tài, lĩnh vực, điều kiện tham gia.
- Khai báo bộ hồ sơ bắt buộc và biểu mẫu tương ứng.
- Đóng hoặc mở đợt tiếp nhận theo thời gian thực tế.

#### 6.2.2 Nộp và quản lý hồ sơ đề tài

Hệ thống phải cho phép chủ nhiệm đề tài:

- Tạo hồ sơ đề tài mới.
- Lưu nháp trước khi nộp.
- Khai báo thông tin cơ bản:
  - tên đề tài
  - lĩnh vực
  - đơn vị chủ trì
  - chủ nhiệm và thành viên
  - thời gian thực hiện
  - mục tiêu
  - nội dung chính
  - kinh phí đề xuất
- Tải lên thuyết minh, dự toán, lý lịch khoa học và các tài liệu yêu cầu.
- Nộp chính thức hồ sơ.

Hệ thống phải tự động:

- Kiểm tra dữ liệu bắt buộc.
- Kiểm tra định dạng và dung lượng tệp.
- Ghi nhận ngày giờ nộp.
- Gửi xác nhận nộp hồ sơ.

#### 6.2.3 Kiểm tra hồ sơ và yêu cầu bổ sung

Hệ thống phải cho phép chuyên viên:

- Tiếp nhận hồ sơ theo đợt.
- Kiểm tra tính đầy đủ và hợp lệ.
- Yêu cầu bổ sung nếu hồ sơ chưa đạt.
- Ghi rõ nội dung cần bổ sung và thời hạn bổ sung.
- Theo dõi lịch sử bổ sung.

Chủ nhiệm đề tài phải có khả năng:

- Xem yêu cầu bổ sung.
- Cập nhật hồ sơ và nộp lại.
- Xem lịch sử các lần chỉnh sửa hoặc bổ sung.

#### 6.2.4 Tổ chức đánh giá

Hệ thống phải cho phép:

- Tạo hội đồng hoặc nhóm reviewer.
- Phân công reviewer theo lĩnh vực chuyên môn.
- Gửi thông báo đến người được phân công.
- Cấu hình bộ tiêu chí và thang điểm.
- Nhập nhận xét, điểm chấm, kiến nghị.
- Tổng hợp kết quả theo từng reviewer và kết quả trung bình.
- Theo dõi tiến độ chấm của từng reviewer.

#### 6.2.5 Họp hội đồng và tổng hợp kết quả

Hệ thống phải cho phép chuyên viên:

- Lập lịch đánh giá hoặc họp hội đồng.
- Đính kèm tài liệu phục vụ họp.
- Nhập biên bản họp, kết luận, kiến nghị chỉnh sửa.
- Tổng hợp kết quả cuối cùng theo vòng đánh giá.

#### 6.2.6 Phê duyệt

Hệ thống phải cho phép lãnh đạo:

- Xem hồ sơ đầy đủ, nhận xét, điểm đánh giá và tổng hợp đề xuất.
- Phê duyệt hoặc không phê duyệt.
- Ghi ý kiến phê duyệt.
- Chuyển hồ sơ đã được duyệt sang module theo dõi đề tài.

Hệ thống nên hỗ trợ:

- Sinh quyết định hoặc mẫu hợp đồng từ dữ liệu đã duyệt.
- Lưu bản PDF của văn bản được phát hành.

### 6.3 Trạng thái nghiệp vụ đề xuất

- Mới tạo
- Nháp
- Đã nộp
- Chờ kiểm tra
- Cần bổ sung
- Đủ điều kiện
- Không đủ điều kiện
- Đang đánh giá
- Chờ tổng hợp kết quả
- Chờ phê duyệt
- Được duyệt
- Không được duyệt

### 6.4 Dữ liệu cần quản lý

- Mã hồ sơ đề tài
- Mã đề tài sau khi được duyệt
- Tên đề tài
- Lĩnh vực
- Loại đề tài
- Đơn vị chủ trì
- Chủ nhiệm và thành viên
- Thời gian thực hiện
- Kinh phí đề xuất
- Đợt tiếp nhận
- Bộ hồ sơ đã nộp
- Reviewer hoặc hội đồng liên quan
- Điểm chấm, nhận xét, kết luận
- Quyết định phê duyệt

### 6.5 Báo cáo cần có

- Danh sách hồ sơ theo đợt tiếp nhận
- Hồ sơ theo đơn vị, lĩnh vực, trạng thái
- Hồ sơ chờ kiểm tra hoặc chờ bổ sung
- Tiến độ đánh giá theo reviewer hoặc hội đồng
- Kết quả được duyệt hoặc không được duyệt

## 7. Module 2: Theo dõi đề tài

### 7.1 Mục tiêu

Theo dõi việc thực hiện đề tài sau khi được duyệt, bao gồm kế hoạch, tiến độ, báo cáo, sản phẩm, điều chỉnh và nghiệm thu.

### 7.2 Chức năng chi tiết

#### 7.2.1 Khởi tạo hồ sơ theo dõi

Hệ thống phải cho phép:

- Tự động tạo hồ sơ theo dõi từ đề tài đã được duyệt.
- Kế thừa các thông tin cơ bản từ module OMS.
- Bổ sung kế hoạch triển khai chi tiết, mốc thời gian và người phụ trách.

#### 7.2.2 Quản lý kế hoạch và tiến độ

Hệ thống phải cho phép chủ nhiệm đề tài và chuyên viên:

- Khai báo các mốc tiến độ chính.
- Ghi tỷ lệ hoàn thành của từng mốc hoặc toàn đề tài.
- Cập nhật tình hình thực hiện theo kỳ.
- Ghi nhận khó khăn, vướng mắc, đề xuất hỗ trợ.
- Phát hiện đề tài chậm tiến độ so với kế hoạch.

#### 7.2.3 Quản lý báo cáo định kỳ

Hệ thống phải cho phép:

- Tạo lịch báo cáo theo tháng, quý hoặc theo mốc.
- Nộp báo cáo định kỳ theo mẫu.
- Đính kèm tệp báo cáo, minh chứng và sản phẩm trung gian.
- Chuyên viên nhận xét hoặc yêu cầu bổ sung báo cáo.
- Nhắc tự động trước hạn và khi quá hạn.

#### 7.2.4 Quản lý điều chỉnh và gia hạn

Hệ thống phải cho phép chủ nhiệm đề tài:

- Tạo đề xuất điều chỉnh nội dung, nhân sự, kinh phí hoặc thời gian.
- Gửi đề xuất gia hạn khi cần.

Hệ thống phải cho phép lãnh đạo hoặc chuyên viên:

- Tiếp nhận đề xuất điều chỉnh.
- Xem lịch sử thay đổi.
- Phê duyệt hoặc từ chối đề xuất.

#### 7.2.5 Quản lý kinh phí và sản phẩm nghiên cứu

Hệ thống phải cho phép:

- Ghi kế hoạch kinh phí được duyệt.
- Cập nhật tình hình sử dụng hoặc giải ngân theo mức theo dõi quản trị.
- Quản lý danh sách sản phẩm nghiên cứu:
  - báo cáo
  - bài báo
  - chuyên đề
  - sản phẩm ứng dụng
  - minh chứng nghiệm thu

#### 7.2.6 Nghiệm thu đề tài

Hệ thống phải cho phép:

- Tạo đợt nghiệm thu.
- Phân công hội đồng nghiệm thu.
- Tổ chức chấm nghiệm thu, nhập nhận xét và kết luận.
- Lưu biên bản, quyết định, sản phẩm cuối cùng.
- Cập nhật kết quả nghiệm thu và trạng thái kết thúc đề tài.

### 7.3 Trạng thái nghiệp vụ đề xuất

- Khởi tạo theo dõi
- Đang thực hiện
- Chờ báo cáo kỳ
- Chậm tiến độ
- Đang điều chỉnh
- Chờ nghiệm thu
- Đang nghiệm thu
- Hoàn thành
- Tạm dừng

### 7.4 Dữ liệu cần quản lý

- Mã đề tài
- Tên đề tài
- Đơn vị chủ trì
- Chủ nhiệm và thành viên
- Thời gian thực hiện
- Kinh phí được duyệt
- Các mốc tiến độ
- Báo cáo định kỳ
- Cảnh báo tiến độ
- Đề xuất điều chỉnh hoặc gia hạn
- Sản phẩm nghiên cứu
- Kết quả nghiệm thu

### 7.5 Báo cáo cần có

- Danh sách đề tài theo trạng thái
- Đề tài sắp đến hạn báo cáo
- Đề tài chậm tiến độ
- Đề tài đang xin điều chỉnh hoặc gia hạn
- Tình hình hoàn thành theo đơn vị hoặc lĩnh vực
- Kết quả nghiệm thu theo kỳ

## 8. Module 3: Quản lý giao việc

### 8.1 Mục tiêu

Quản lý các công việc phát sinh trong quá trình điều hành đề tài, bảo đảm rõ người chịu trách nhiệm, hạn xử lý và mức độ hoàn thành.

### 8.2 Chức năng chi tiết

#### 8.2.1 Tạo và giao việc

Hệ thống phải cho phép:

- Tạo công việc độc lập hoặc gắn với đề tài.
- Tạo công việc từ một mốc tiến độ, yêu cầu bổ sung, báo cáo hoặc kết luận cuộc họp.
- Giao người chủ trì và người phối hợp.
- Gán hạn xử lý, mức độ ưu tiên, mô tả công việc.
- Đính kèm tệp hoặc liên kết tới hồ sơ liên quan.

#### 8.2.2 Theo dõi xử lý công việc

Hệ thống phải cho phép:

- Cập nhật trạng thái công việc.
- Cập nhật tỷ lệ hoàn thành.
- Ghi chú trao đổi trên từng việc.
- Đính kèm kết quả thực hiện.
- Xem danh sách việc theo cá nhân, đơn vị, đề tài, hạn xử lý.

#### 8.2.3 Nhắc việc và cảnh báo

Hệ thống phải hỗ trợ:

- Nhắc trước hạn theo cấu hình.
- Cảnh báo công việc quá hạn.
- Thông báo cho cả người giao và người nhận.

#### 8.2.4 Thống kê

Hệ thống phải cho phép:

- Thống kê khối lượng việc theo người.
- Thống kê việc đúng hạn, quá hạn.
- Thống kê việc theo đề tài, đơn vị, khoảng thời gian.
- Xem tải công việc của từng cá nhân.

### 8.3 Trạng thái nghiệp vụ đề xuất

- Mới giao
- Đã nhận
- Đang thực hiện
- Chờ phản hồi
- Chờ duyệt kết quả
- Hoàn thành
- Quá hạn
- Hủy

### 8.4 Dữ liệu cần quản lý

- Mã việc
- Tên việc
- Nguồn phát sinh
- Đề tài liên quan
- Người giao
- Người chủ trì
- Người phối hợp
- Ngày giao
- Hạn xử lý
- Mức độ ưu tiên
- Tiến độ
- Kết quả thực hiện

### 8.5 Báo cáo cần có

- Việc theo người phụ trách
- Việc theo đề tài
- Việc quá hạn
- Tỷ lệ hoàn thành đúng hạn
- Khối lượng việc theo tháng, quý, năm

## 9. Module 4: Dashboard điều hành

### 9.1 Mục tiêu

Cung cấp cho từng vai trò một màn hình tổng hợp để biết ngay tình hình xử lý và việc cần làm.

### 9.2 Nguyên tắc hiển thị

- Dashboard phải hiển thị theo vai trò.
- Dữ liệu hiển thị phải đúng phạm vi quyền của người dùng.
- Ưu tiên hiển thị việc cần xử lý trước, số liệu tổng hợp sau.

### 9.3 Dashboard cho lãnh đạo

Phải hiển thị tối thiểu:

- Số lượng đề tài theo trạng thái.
- Hồ sơ chờ kiểm tra, chờ phê duyệt.
- Đề tài sắp đến hạn báo cáo hoặc chậm tiến độ.
- Công việc quá hạn hoặc sắp đến hạn.
- Tỷ lệ hoàn thành theo đơn vị hoặc lĩnh vực.
- Danh sách việc cần lãnh đạo phê duyệt.

### 9.4 Dashboard cho chuyên viên quản lý khoa học

Phải hiển thị tối thiểu:

- Hồ sơ mới nộp.
- Hồ sơ cần kiểm tra hoặc cần yêu cầu bổ sung.
- Danh sách reviewer chưa hoàn thành chấm.
- Đề tài chậm báo cáo hoặc chậm tiến độ.
- Công việc được giao cho chuyên viên.

### 9.5 Dashboard cho chủ nhiệm đề tài

Phải hiển thị tối thiểu:

- Các đề tài mình đang chủ trì.
- Các mốc tiến độ sắp đến hạn.
- Báo cáo sắp phải nộp.
- Công việc của cá nhân và nhóm đề tài.
- Thông báo mới nhất liên quan đến đề tài.

### 9.6 Thành phần hiển thị chính

- Thẻ số liệu tổng hợp.
- Danh sách việc cần làm.
- Danh sách phê duyệt chờ xử lý.
- Danh sách cảnh báo.
- Biểu đồ tiến độ hoặc phân bố trạng thái.
- Nút thao tác nhanh:
  - tạo hồ sơ đề tài
  - xem danh sách hồ sơ
  - cập nhật tiến độ
  - tạo công việc mới

## 10. Liên thông giữa các module

Hệ thống phải bảo đảm các luồng liên thông sau:

- Hồ sơ đề tài được duyệt ở OMS phải tự động chuyển sang module theo dõi đề tài.
- Từ đề tài hoặc mốc tiến độ có thể phát sinh công việc trong module giao việc.
- Từ báo cáo, yêu cầu bổ sung hoặc kết luận họp có thể phát sinh công việc.
- Dashboard phải tổng hợp dữ liệu từ OMS, theo dõi đề tài và giao việc.
- Lịch sử xử lý phải được xem xuyên suốt từ lúc nộp hồ sơ đến khi nghiệm thu.

## 11. Quy trình nghiệp vụ tổng quát

Quy trình chính đề xuất như sau:

1. Chuyên viên tạo đợt tiếp nhận hồ sơ.
2. Chủ nhiệm đề tài tạo hồ sơ, lưu nháp và nộp chính thức.
3. Chuyên viên kiểm tra hồ sơ:
   - Nếu thiếu thì yêu cầu bổ sung.
   - Nếu đủ thì chuyển đánh giá.
4. Reviewer hoặc hội đồng chấm điểm, nhập nhận xét.
5. Chuyên viên tổng hợp kết quả, trình lãnh đạo phê duyệt.
6. Đề tài được duyệt thì chuyển sang theo dõi thực hiện.
7. Chủ nhiệm cập nhật tiến độ, nộp báo cáo, đề xuất điều chỉnh nếu có.
8. Công việc phát sinh được giao và theo dõi trong module giao việc.
9. Khi đủ điều kiện, chuyên viên tổ chức nghiệm thu và cập nhật kết quả cuối cùng.
10. Dashboard theo dõi xuyên suốt các hồ sơ, đề tài, công việc và cảnh báo.

## 12. Ma trận quyền mức cao

| Nhóm chức năng | Quản trị hệ thống | Chuyên viên QLKH | Lãnh đạo | Chủ nhiệm đề tài | Thành viên đề tài | Reviewer/Hội đồng |
| --- | --- | --- | --- | --- | --- | --- |
| Quản trị tài khoản, danh mục | Toàn quyền | Xem theo nhu cầu | Không | Không | Không | Không |
| Tạo đợt tiếp nhận | Cấu hình | Thực hiện | Xem | Không | Không | Không |
| Nộp hồ sơ đề tài | Không | Hỗ trợ | Xem | Thực hiện | Hỗ trợ nếu được phân quyền | Không |
| Kiểm tra hồ sơ, yêu cầu bổ sung | Xem | Thực hiện | Xem | Xem và bổ sung | Xem trong phạm vi tham gia | Không |
| Phân công đánh giá | Xem | Thực hiện | Xem | Không | Không | Không |
| Chấm điểm, nhận xét | Không | Theo dõi | Xem | Không | Không | Thực hiện |
| Phê duyệt hồ sơ | Không | Trình | Thực hiện | Xem kết quả | Xem theo quyền | Không |
| Theo dõi tiến độ đề tài | Xem toàn hệ thống | Theo dõi và cập nhật | Xem, chỉ đạo | Cập nhật đề tài của mình | Cập nhật việc được giao | Xem phần được phân quyền |
| Quản lý công việc | Xem toàn hệ thống | Giao và theo dõi | Giao và theo dõi | Giao trong nhóm đề tài và cập nhật | Cập nhật việc được giao | Không |
| Dashboard, báo cáo | Toàn quyền | Theo phạm vi phụ trách | Theo thẩm quyền | Theo đề tài của mình | Theo phạm vi được giao | Theo phần đánh giá liên quan |

## 13. Báo cáo quản trị cốt lõi

Hệ thống phải có tối thiểu các báo cáo sau:

- Báo cáo hồ sơ đề tài theo đợt tiếp nhận.
- Báo cáo hồ sơ theo đơn vị, lĩnh vực, trạng thái.
- Báo cáo kết quả đánh giá và phê duyệt.
- Báo cáo đề tài đang thực hiện, sắp đến hạn, chậm tiến độ.
- Báo cáo tình hình báo cáo định kỳ.
- Báo cáo công việc đúng hạn, quá hạn, theo cá nhân và theo đề tài.
- Báo cáo tổng hợp phục vụ lãnh đạo theo tháng, quý, năm.

## 14. Yêu cầu phi chức năng

### 14.1 Bảo mật và kiểm soát

- Bắt buộc đăng nhập để sử dụng.
- Mỗi người dùng chỉ được xem dữ liệu theo quyền.
- Có cơ chế khóa tài khoản khi cần.
- Có nhật ký thao tác.
- Tài liệu đính kèm phải được kiểm soát quyền tải xuống.

### 14.2 Hiệu năng và khả năng sử dụng

- Hệ thống phải đáp ứng tốt cho nhu cầu tác nghiệp nội bộ của nhà trường.
- Các màn hình danh sách chính phải hỗ trợ lọc, sắp xếp, phân trang.
- Thao tác phổ biến phải đơn giản, dễ học, dễ dùng.
- Giao diện phải phù hợp trên màn hình máy tính và có thể sử dụng trên trình duyệt hiện đại.

### 14.3 Lưu trữ và sao lưu

- Có cơ chế sao lưu dữ liệu định kỳ.
- Có phương án phục hồi khi có sự cố.
- Tệp đính kèm phải được quản lý tập trung.

### 14.4 Khả năng mở rộng

- Có thể mở rộng thêm SSO, ký số, SMS hoặc cổng ngoài sau này.
- Có thể bổ sung thêm biểu mẫu, tiêu chí chấm điểm và báo cáo mà không phải thay đổi lớn quy trình.
- Có thể bổ sung hệ thống quản lý văn bản, công văn sau này

## 15. Kiến trúc và tech stack đề xuất

### 15.1 Định hướng triển khai

- Hệ thống giai đoạn đầu được thiết kế theo mô hình web-based, truy cập qua trình duyệt, ưu tiên triển khai trên môi trường internet có kiểm soát.
- Kiến trúc áp dụng theo hướng modular monolith để giảm độ phức tạp triển khai nhưng vẫn tách module rõ ràng theo nghiệp vụ.
- Một codebase dùng chung cho các module OMS, theo dõi đề tài, giao việc, dashboard, quản trị tài khoản và báo cáo.
- Hệ thống phải có khả năng đóng gói và triển khai bằng Docker để thuận lợi cho cài đặt, bàn giao và mở rộng sau này.

### 15.2 Tech stack chốt cho giai đoạn đầu

- Frontend: Next.js, React, TypeScript.
- Backend API: NestJS, TypeScript.
- Cơ sở dữ liệu chính: PostgreSQL.
- ORM và migration: Prisma.
- Cache, queue, nhắc việc nền: Redis.
- Lưu trữ tệp đính kèm: MinIO theo chuẩn S3-compatible object storage.
- Giao diện: Tailwind CSS kết hợp bộ component nội bộ.
- Dashboard và biểu đồ: Recharts hoặc Apache ECharts.
- Xuất Excel: ExcelJS.
- Xuất PDF hoặc biểu mẫu in: pdfmake hoặc Puppeteer tùy từng biểu mẫu.
- Reverse proxy và HTTPS: Nginx.
- Đóng gói và triển khai: Docker Compose ở giai đoạn đầu.

### 15.3 Lý do lựa chọn

- Next.js và NestJS cùng dùng TypeScript giúp thống nhất kiểu dữ liệu giữa frontend và backend, thuận lợi cho bảo trì và bàn giao nội bộ.
- PostgreSQL phù hợp với hệ thống có dữ liệu quan hệ chặt, nhiều trạng thái nghiệp vụ, phân quyền, audit log và báo cáo tổng hợp.
- Redis phù hợp cho các tác vụ nhắc việc, thông báo nền, cache dashboard và hàng đợi xử lý bất đồng bộ.
- MinIO phù hợp cho môi trường tự triển khai, kiểm soát dữ liệu tốt, không phụ thuộc nhà cung cấp cloud bên ngoài.
- Docker Compose giúp cài đặt nhanh, sao lưu và phục hồi thuận tiện, phù hợp giai đoạn đầu khi quy mô hệ thống chưa cần Kubernetes.

### 15.4 Cơ chế đăng nhập giai đoạn đầu

- Giai đoạn đầu sử dụng đăng nhập đơn giản bằng tài khoản và mật khẩu do quản trị hệ thống cấp.
- Mật khẩu phải được băm an toàn trong cơ sở dữ liệu, không lưu dạng rõ.
- Hệ thống phải có chức năng đổi mật khẩu, khóa hoặc mở khóa tài khoản, đặt lại mật khẩu bởi quản trị viên.
- Phiên đăng nhập phải có thời hạn hiệu lực và tự hết hạn sau một khoảng thời gian không hoạt động.
- Chưa triển khai SSO, LDAP, OIDC hoặc MFA ở giai đoạn đầu.
- Kiến trúc phải chừa khả năng mở rộng sang SSO hoặc xác thực nhiều lớp ở giai đoạn sau mà không phải thay đổi lớn phần lõi hệ thống.

### 15.5 Mô hình triển khai internet giai đoạn đầu

- Người dùng truy cập hệ thống qua HTTPS.
- Nginx làm reverse proxy cho frontend và backend API.
- Frontend Next.js và backend NestJS được đóng gói thành các container riêng.
- PostgreSQL, Redis và MinIO chạy ở các container hoặc máy chủ riêng tùy điều kiện vận hành.
- Tệp cấu hình môi trường phải tách riêng cho môi trường phát triển, kiểm thử và production.
- Phải có cơ chế sao lưu định kỳ cho PostgreSQL và vùng lưu trữ tệp đính kèm.

### 15.6 Các thành phần chưa bắt buộc ở giai đoạn đầu

- Chưa bắt buộc tích hợp Elasticsearch hoặc OpenSearch.
- Chưa bắt buộc triển khai Kubernetes.
- Chưa bắt buộc tích hợp Keycloak hoặc hệ thống định danh tập trung.
- Chưa bắt buộc triển khai microservices.
- Chưa bắt buộc tách mobile app riêng; giao diện web responsive là đủ cho giai đoạn đầu.

## 16. Kịch bản nghiệm thu chính

### 16.1 Nộp và xét hồ sơ đề tài

- Tạo đợt tiếp nhận.
- Chủ nhiệm nộp hồ sơ.
- Chuyên viên kiểm tra hồ sơ.
- Hệ thống yêu cầu bổ sung khi thiếu.
- Hồ sơ đủ điều kiện được chuyển sang đánh giá.

### 16.2 Đánh giá và phê duyệt

- Phân công reviewer hoặc hội đồng.
- Reviewer nhập điểm và nhận xét.
- Chuyên viên tổng hợp kết quả.
- Lãnh đạo xem và ra quyết định phê duyệt.

### 16.3 Theo dõi thực hiện

- Đề tài được duyệt được chuyển sang theo dõi.
- Chủ nhiệm cập nhật mốc tiến độ và nộp báo cáo định kỳ.
- Hệ thống nhắc khi sắp đến hạn và cảnh báo khi quá hạn.
- Có thể tạo đề xuất điều chỉnh hoặc gia hạn.

### 16.4 Quản lý giao việc

- Tạo việc gắn với đề tài.
- Giao người chủ trì và người phối hợp.
- Cập nhật trạng thái, tiến độ và kết quả.
- Theo dõi báo cáo đúng hạn và quá hạn.

### 16.5 Nghiệm thu

- Tạo đợt nghiệm thu.
- Phân công hội đồng nghiệm thu.
- Nhập kết quả chấm và kết luận.
- Cập nhật trạng thái hoàn thành đề tài.

### 16.6 Dashboard

- Lãnh đạo nhìn thấy việc chờ phê duyệt, việc quá hạn, đề tài rủi ro.
- Chuyên viên nhìn thấy hồ sơ mới, hồ sơ cần xử lý, đề tài chậm báo cáo.
- Chủ nhiệm nhìn thấy việc cần làm, báo cáo sắp đến hạn và thông báo mới.

## 17. Đề xuất thứ tự triển khai

Để tạo giá trị sớm và giảm rủi ro, thứ tự triển khai đề xuất là:

1. Nền tảng hệ thống, người dùng, phân quyền, danh mục.
2. Module Quản lý đề tài (OMS).
3. Module Theo dõi đề tài.
4. Module Quản lý giao việc.
5. Dashboard điều hành và báo cáo cốt lõi.

## 18. Thông điệp trình bày với quản lý

Khi trình bày hệ thống với quản lý, có thể nhấn mạnh các điểm sau:

- Hệ thống giúp nhà trường quản lý trọn vòng đời đề tài trên một nền tảng thống nhất.
- Lãnh đạo nhìn thấy ngay hồ sơ nào đang chờ phê duyệt, đề tài nào chậm tiến độ, việc nào sắp quá hạn.
- Chuyên viên quản lý khoa học giảm đáng kể theo dõi thủ công bằng Excel và email.
- Chủ nhiệm đề tài biết rõ mình đang ở giai đoạn nào, cần nộp gì, phải làm gì tiếp theo.
- Hệ thống vừa đủ chi tiết để triển khai thực tế, đồng thời đủ trực quan để trình bày với Ban Giám hiệu.
