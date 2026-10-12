# Lý lịch khoa học (BM-06): nhật ký quyết định và kịch bản tự kiểm thử

Ghi lại các quyết định của chủ dự án trong khi làm Epic 13, kèm cách tự kiểm tra trên ứng dụng thật. Thêm mục mới xuống cuối, không sửa mục cũ.

---

## QĐ-13.5-01 — Bản in BM-06 không hiển thị thông tin định danh, ngân hàng, SmartCA

- **Ngày:** 2026-10-12
- **Người quyết định:** chủ dự án (trong buổi duyệt Story 13.5)
- **Nội dung:** Bản xem và bản in (Tab 5 "Xem & In Lý lịch khoa học", cả tiếng Việt và tiếng Anh) **không** hiển thị:
  - Số CCCD / Hộ chiếu, Ngày cấp, Nơi cấp
  - Số tài khoản, Tên ngân hàng, Chi nhánh
  - Serial SmartCA
- **Lý do:** bảo mật. Giấy đã in ra khỏi hệ thống thì không còn kiểm soát được.
- **Thay đổi so với trước:** AC của Story 13.5 trong `epics.md` từng yêu cầu bản in có "ngân hàng/SmartCA". Quyết định này thay thế yêu cầu đó.
- **Phạm vi:** chỉ áp dụng cho bản xem/in. Các trường này vẫn được kê khai và lưu ở Tab 1 "Thông tin chung" như cũ. Chủ hồ sơ và quản lý đúng phạm vi vẫn xem được trên Tab 1.
- **Đánh số lại mục I:** 1 Họ và tên · 2 Ngày sinh / Giới tính / Nơi sinh / Quốc tịch · 3 Quân hàm / Chức vụ · 4 Học hàm, học vị · 5 Cơ quan công tác · 6 Địa chỉ liên hệ · 7 Điện thoại / Email · 8 Lĩnh vực nghiên cứu · 9 Từ khóa chuyên môn · 10 Ngoại ngữ.

**Tự kiểm thử**
1. Đăng nhập bằng tài khoản nhà khoa học (ví dụ `patuan`) và mở "Hồ sơ của tôi".
2. Ở Tab 1, nhập Số CCCD, Ngày cấp, Nơi cấp, Số tài khoản, Ngân hàng, Chi nhánh, Serial SmartCA. Bấm "Lưu lý lịch khoa học".
3. Mở Tab 5. Ở cả "Tiếng Việt" và "English", kiểm tra trên tờ giấy không có giá trị nào vừa nhập, và không có dòng nhãn "CCCD", "Tài khoản / SmartCA", "ID / Passport", "Bank account".
4. Bấm "In lý lịch khoa học (A4)" và xem trước bản in (hoặc lưu thành PDF). Kiểm tra lại như bước 3.
5. Quay về Tab 1. Các giá trị vẫn còn đúng như đã nhập.

---

## QĐ-13.5-02 — Không tải ảnh chân dung từ địa chỉ web bên ngoài

- **Ngày:** 2026-10-12
- **Người quyết định:** chủ dự án (trong buổi duyệt Story 13.5)
- **Vấn đề:** dữ liệu lý lịch cho phép trường ảnh chân dung là một URL `http(s)://` bên ngoài. Khi ai đó mở lý lịch, trình duyệt của họ sẽ gọi tới máy chủ đó, làm lộ địa chỉ IP và thời điểm xem cho bên ngoài.
- **Quyết định:** giao diện chỉ hiển thị ảnh khi ảnh là:
  - ảnh tải lên và cắt trong hệ thống (`data:image/...`), hoặc
  - đường dẫn nội bộ cùng máy chủ (bắt đầu bằng `/`, không phải `//`).

  URL bên ngoài thì khung ảnh để trống, áp dụng cho cả khung xem trước ở Tab 1 lẫn ảnh 3x4 trên bản in Tab 5.
- **Không đổi:** API vẫn chấp nhận và lưu giá trị cũ, nên dữ liệu hiện có không bị lỗi khi lưu. Muốn có ảnh thì người dùng tải ảnh lên lại bằng nút "Tải ảnh lên".

**Tự kiểm thử**
1. Ở Tab 1, bấm "Tải ảnh lên", cắt ảnh rồi lưu. Ảnh hiện ở Tab 1 và trong khung 3x4 trên Tab 5.
2. Gửi PATCH qua API (công cụ dev) để đặt `curriculumVitae.personalInfo.avatarUrl` thành một URL `https://...` bên ngoài. Tải lại trang.
3. Mở DevTools, tab Network, rồi mở Tab 1 và Tab 5. Không có request nào tới máy chủ ảnh bên ngoài, và khung ảnh để trống.
4. Tải ảnh lên lại để khôi phục.

---

## QĐ-13.5-03 — Thông báo "thay đổi chưa lưu" không báo nhầm

- **Ngày:** 2026-10-12
- **Người quyết định:** chủ dự án (trong buổi duyệt Story 13.5)
- **Vấn đề:** khi gõ vào một ô tùy chọn đang trống rồi xóa đi, Tab 5 vẫn báo "Các thay đổi chưa lưu không được hiển thị" dù dữ liệu không đổi.
- **Quyết định:** khi so sánh bản đang sửa với bản đã lưu, ô trống và ô chưa có giá trị được coi là như nhau. Thông báo chỉ hiện khi thật sự có thay đổi.

**Tự kiểm thử**
1. Mở "Hồ sơ của tôi", đi qua Tab 1 → 4 mà không sửa gì, rồi mở Tab 5. Không có thông báo "thay đổi chưa lưu".
2. Ở Tab 4, bấm sửa một dòng giải thưởng. Gõ vào ô "Cơ quan trao tặng" đang trống, rồi xóa hết. Mở Tab 5: không có thông báo.
3. Ở Tab 1, đổi "Họ và tên" mà không lưu. Mở Tab 5: có thông báo, và tờ giấy vẫn hiện họ tên cũ đã lưu.
4. Tải lại trang để bỏ thay đổi.
