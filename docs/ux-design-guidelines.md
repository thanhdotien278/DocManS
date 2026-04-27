# Quy Định Thiết Kế UX Cho RTMS

## 1. Mục Đích

Tài liệu này quy định các nguyên tắc UX/UI bắt buộc khi thiết kế hệ thống Research Topic Management System (RTMS).

RTMS là một module nghiệp vụ nằm trong hệ sinh thái website Học viện Quân y, vì vậy giao diện phải kế thừa nhận diện hiện có của website chính, đồng thời đáp ứng nhu cầu quản trị nội bộ với dữ liệu dày, nhiều vai trò và nhiều trạng thái xử lý.

Mục tiêu thiết kế:

- Đồng nhất với hình ảnh website Học viện Quân y.
- Tạo cảm giác chính thống, nghiêm túc, tin cậy, phù hợp môi trường quân y và học thuật.
- Ưu tiên hiệu quả thao tác, khả năng đọc dữ liệu, theo dõi trạng thái và xử lý công việc.
- Giảm sai sót trong các luồng nghiệp vụ quan trọng như nộp hồ sơ, đánh giá, phê duyệt, giao việc và theo dõi tiến độ.

## 2. Định Hướng Thị Giác

Phong cách thiết kế bắt buộc:

- Institutional admin dashboard.
- Professional, official, data-first.
- Gọn, rõ, dễ quét mắt, không trang trí quá mức.
- Phù hợp vai trò quản trị, chuyên viên, lãnh đạo, chủ nhiệm đề tài, thành viên hội đồng và reviewer.

Cần tránh:

- Phong cách startup SaaS quá hiện đại không gắn với nhận diện nhà trường.
- Màu tím/cam làm chủ đạo nếu không có trong brand của website chính.
- Gradient mạnh, glassmorphism nặng, hiệu ứng bóng đổ quá dày.
- Hero/banner lớn trong màn hình nghiệp vụ nội bộ.
- Minh họa cảm tính, emoji icon, ảnh nền trang trí không có giá trị nghiệp vụ.

## 3. Màu Sắc

### 3.1 Nguyên Tắc Màu Sắc

Màu sắc của RTMS phải ưu tiên kế thừa website Học viện Quân y:

- Xanh lá đậm là màu nhận diện chính.
- Trắng và xám xanh nhạt là nền giao diện.
- Vàng huy hiệu chỉ dùng làm accent tiết chế.
- Đỏ, vàng, xanh dương, xanh lá chỉ dùng theo ý nghĩa trạng thái nghiệp vụ.

Không được dùng màu là dấu hiệu duy nhất để truyền tải trạng thái. Mọi trạng thái cần có nhãn văn bản, icon hoặc mô tả ngắn.

### 3.2 Bảng Màu Đề Xuất

| Vai trò màu | Mã màu đề xuất | Cách dùng |
| --- | --- | --- |
| Primary | `#145A37` | Nút chính, menu active, điểm nhấn chính |
| Primary dark | `#0F3F2A` | Header, sidebar, nền điều hướng |
| Primary soft | `#EAF5EF` | Nền phụ, hover nhẹ, block thông tin phụ |
| Accent gold | `#D6A51E` | Điểm nhấn gắn với huy hiệu, cảnh báo cấp thấp |
| Background | `#F7FAF8` | Nền trang quản trị |
| Surface | `#FFFFFF` | Bảng, form, panel, card nghiệp vụ |
| Text primary | `#10251B` | Tiêu đề, nội dung chính |
| Text secondary | `#52665A` | Mô tả, metadata, nội dung phụ |
| Border | `#DDE8E1` | Đường viền bảng, input, panel |

### 3.3 Màu Trạng Thái Nghiệp Vụ

| Trạng thái | Màu | Cách dùng |
| --- | --- | --- |
| Được duyệt, hoàn thành | Xanh lá | Badge thành công, kết quả đạt |
| Chờ xử lý, sắp đến hạn | Vàng amber | Cảnh báo sớm, việc cần theo dõi |
| Cần bổ sung, chờ phản hồi | Xanh dương | Yêu cầu bổ sung, đang chờ từ bên khác |
| Quá hạn, từ chối, lỗi | Đỏ | Lỗi nghiệp vụ, việc quá hạn, kết quả không đạt |
| Nháp, tạm dừng, hủy | Xám | Trạng thái trung tính hoặc ít ưu tiên |

## 4. Typography

Nguyên tắc chữ:

- Ưu tiên font sans-serif để đọc trên bảng, form và dashboard.
- Nếu website chính đã có font, RTMS phải dùng cùng font đó.
- Nếu chưa có font chính thức, có thể dùng `Source Sans 3`, `Noto Sans` hoặc font sans-serif tương đương.
- Không dùng font serif học thuật cho giao diện thao tác hằng ngày.
- Cỡ chữ nội dung tối thiểu nên từ `14px` đến `16px`.
- Tiêu đề trong panel, card, bảng không được quá lớn; chỉ dùng kích thước lớn cho tiêu đề trang.

## 5. Bố Cục Tổng Thể

RTMS là module nội bộ sau đăng nhập, nên bố cục cần phục vụ thao tác nghiệp vụ:

- Sidebar trái cho các module chính: Dashboard, Quản lý đề tài, Theo dõi đề tài, Giao việc, Báo cáo, Cấu hình.
- Topbar có tìm kiếm nhanh, thông báo, thông tin người dùng và vai trò hiện tại.
- Breadcrumb bắt buộc có trên các trang chi tiết hồ sơ, đề tài, công việc, báo cáo.
- Vùng nội dung chính cần ưu tiên việc cần xử lý, bộ lọc, KPI và danh sách dữ liệu.
- Không dùng carousel, hero image hoặc banner lớn trong các màn hình nghiệp vụ.

Khoảng cách và kích thước:

- Giữ mật độ thông tin vừa phải, ưu tiên scan nhanh.
- Card/panel nên có border radius nhỏ, tối đa `8px` nếu không có design system khác.
- Bóng đổ dùng nhẹ hoặc không dùng; ưu tiên border rõ ràng.
- Layout phải hoạt động tốt ở các kích thước `375px`, `768px`, `1024px`, `1440px`.

## 6. Dashboard Điều Hành

Dashboard phải hiển thị theo vai trò và đúng phạm vi quyền của người dùng.

Thứ tự ưu tiên thông tin:

1. Việc cần xử lý ngay.
2. Hồ sơ chờ kiểm tra hoặc chờ phê duyệt.
3. Đề tài sắp đến hạn, chậm tiến độ hoặc có rủi ro.
4. Công việc quá hạn hoặc sắp đến hạn.
5. Chỉ số tổng hợp theo đơn vị, lĩnh vực, đợt tiếp nhận.

Yêu cầu thiết kế:

- KPI card nên gọn, nền trắng, border mỏng, nhấn bằng màu trạng thái.
- Biểu đồ dùng màu xanh chính làm nền, đỏ/vàng chỉ dùng cho cảnh báo.
- Các cảnh báo quan trọng phải có mức độ ưu tiên rõ ràng.
- Không để dashboard trở thành màn hình trang trí; mọi thành phần phải hỗ trợ ra quyết định hoặc hành động.

## 7. Bảng Dữ Liệu Và Danh Sách

Bảng dữ liệu là thành phần trung tâm của RTMS.

Mọi danh sách nghiệp vụ quan trọng cần có:

- Tìm kiếm theo từ khóa.
- Lọc theo đợt, đơn vị, lĩnh vực, năm học, trạng thái, hạn xử lý, người phụ trách.
- Sắp xếp theo ngày nộp, hạn xử lý, mức độ ưu tiên, trạng thái.
- Badge trạng thái nhất quán toàn hệ thống.
- Hành động nhanh phù hợp vai trò và trạng thái.
- Trạng thái rỗng, đang tải và lỗi tải dữ liệu.

Yêu cầu responsive:

- Desktop ưu tiên bảng đầy đủ.
- Mobile có thể dùng scroll ngang hoặc card list rút gọn.
- Không để bảng tràn viewport hoặc tạo horizontal scroll toàn trang.

## 8. Form Và Quy Trình Nghiệp Vụ

Form trong RTMS thường dài và có ý nghĩa pháp lý/nghiệp vụ, vì vậy cần thiết kế theo section rõ ràng:

- Thông tin chung.
- Đơn vị, chủ nhiệm, thành viên.
- Thời gian, kinh phí, lĩnh vực.
- Nội dung chuyên môn.
- Tài liệu đính kèm.
- Lịch sử xử lý và nhận xét.

Yêu cầu bắt buộc:

- Trường bắt buộc phải được đánh dấu rõ.
- Lỗi nhập liệu hiển thị inline gần trường sai.
- Validate trên blur hoặc khi người dùng rời khỏi section quan trọng.
- Nút chính và nút phụ phải rõ nghĩa: Lưu nháp, Nộp chính thức, Phê duyệt, Từ chối, Yêu cầu bổ sung.
- Các hành động quan trọng phải có xác nhận và nêu rõ hậu quả.
- Sau mỗi thao tác phải có loading, thành công hoặc lỗi rõ ràng.

## 9. Trạng Thái, Timeline Và Lịch Sử Xử Lý

Với các quy trình như nộp hồ sơ, kiểm tra, đánh giá, tổng hợp, phê duyệt, theo dõi tiến độ và nghiệm thu, giao diện cần có:

- Timeline hoặc stepper thể hiện trạng thái hiện tại.
- Lịch sử xử lý theo thời gian, người thực hiện và nội dung thay đổi.
- Nhận xét, điểm đánh giá, file liên quan và quyết định phải được liên kết trực tiếp vào mốc xử lý.
- Trạng thái tiếp theo nên rõ ràng để người dùng biết cần làm gì.

Không ẩn các thông tin truy vết quan trọng sau modal hoặc tooltip khó tìm.

## 10. Tệp Đính Kèm

Quản lý tệp cần rõ ràng và có khả năng truy vết:

- Hiện tên tệp, loại tệp, dung lượng, người tải lên, thời điểm tải lên.
- Có trạng thái upload, lỗi upload và hành động thử lại.
- Hỗ trợ xem trước nếu định dạng cho phép.
- Tài liệu quan trọng cần có version hoặc lịch sử thay thế.
- Nút tải xuống/xóa/thay thế chỉ hiện khi người dùng có quyền.

## 11. Điều Hướng Và Tìm Kiếm

Điều hướng phải giúp người dùng quay lại nhanh từ chi tiết về danh sách:

- Breadcrumb cho mọi trang chi tiết.
- Link trực tiếp từ dashboard đến danh sách đã lọc tương ứng.
- Tìm kiếm nhanh nên hỗ trợ mã hồ sơ, mã đề tài, tên đề tài, chủ nhiệm, đơn vị.
- Bộ lọc đang áp dụng phải hiện rõ và có thể xóa nhanh.

## 12. Accessibility

RTMS phải đạt tối thiểu mục tiêu WCAG AA cho các luồng chính.

Yêu cầu bắt buộc:

- Tất cả input có label hoặc accessible name.
- Tất cả nút và link có focus state rõ ràng.
- Không xóa outline nếu không có focus style thay thế.
- Các thành phần có click phải dùng button/link semantic khi có thể.
- Thông báo lỗi và cập nhật bất đồng bộ cần hỗ trợ screen reader bằng `aria-live` hoặc cơ chế tương đương.
- Không chặn paste trong các trường nhập liệu.
- Kích thước vùng bấm trên mobile tối thiểu gần `44px`.
- Tôn trọng `prefers-reduced-motion`.

## 13. Icon Và Hình Ảnh

Yêu cầu:

- Dùng một bộ icon thống nhất, ưu tiên Lucide hoặc Heroicons.
- Không dùng emoji làm icon UI.
- Logo/huy hiệu Học viện chỉ nên xuất hiện ở header, màn đăng nhập hoặc vị trí nhận diện cấp cao.
- Không lặp lại logo trong từng card/panel.
- Ảnh lễ nghi, ảnh sự kiện, carousel chỉ phù hợp với website công khai, không phù hợp màn hình quản trị nội bộ.

## 14. Checklist Tuân Thủ Khi Thiết Kế

Trước khi chốt một màn hình UX/UI, cần kiểm tra:

- Màn hình có kế thừa màu xanh, trắng, vàng huy hiệu của website Học viện Quân y không.
- Có phù hợp cảm giác chính thống, quân y, học thuật, nội bộ không.
- Có ưu tiên việc cần xử lý và trạng thái nghiệp vụ trước nội dung trang trí không.
- Bảng, form, bộ lọc, badge trạng thái có nhất quán với các màn hình khác không.
- Màu trạng thái có kèm text/icon để tránh phụ thuộc chỉ vào màu không.
- Các thao tác quan trọng có loading, xác nhận, thành công và lỗi không.
- Màn hình có đọc được và thao tác được trên mobile/tablet/desktop không.
- Có focus state, label, inline error và keyboard navigation cơ bản không.
- Có tránh hero, carousel, gradient mạnh, emoji icon và decoration không cần thiết không.

## 15. Nguyên Tắc Khi Có Thiết Kế Mới

Khi thiết kế thêm màn hình hoặc tính năng mới:

- Ưu tiên dùng lại component và pattern đã có.
- Nếu cần thêm màu mới, phải gắn với ý nghĩa nghiệp vụ rõ ràng.
- Nếu cần thêm component mới, phải đảm bảo dùng được cho nhiều màn hình cùng loại.
- Không tạo phong cách riêng cho từng module nếu không có lý do nghiệp vụ mạnh.
- Bất kỳ màn hình nào cũng phải được đánh giá theo tài liệu này trước khi đưa vào thiết kế chi tiết.
