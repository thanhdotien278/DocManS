# Quy Tắc UI Demo

## Ngôn ngữ

- Mọi text người dùng nhìn thấy phải là tiếng Việt có dấu.
- Không dùng “Dashboard”, “Tasks”, “Overview”, “Status”, “Priority” trong UI.
- Dùng “Bảng điều hành”, “Nhiệm vụ”, “Tổng quan”, “Trạng thái”, “Mức độ ưu tiên”.

## Phong cách

- Institutional admin dashboard.
- Nền sáng, xanh Học viện là màu chủ đạo, vàng huy hiệu là điểm nhấn tiết chế.
- Bố cục dữ liệu dày nhưng dễ đọc.
- Không dùng hero trang trí, glassmorphism, gradient mạnh hoặc hiệu ứng màu mè.

## Component

- Ưu tiên dùng `PageHeader`, `SectionCard`, `KpiCard`, `FilterBar`, `StatusBadge`, `Timeline`.
- Dùng các component nền tảng mới cho phase sau: `DataTable`, `MobileRecordList`, `DetailInfoGrid`, `ProcessTabs`, `DocumentList`, `ActionPanel`, `ModuleSummaryStrip`.
- Bảng desktop phải có phương án mobile dạng card list.
- Badge trạng thái phải có màu, icon và nhãn tiếng Việt.

## Responsive

- Kiểm tra tối thiểu tại `390px`, `768px`, `1024px`, `1440px`.
- Mobile ưu tiên một cột, action chính rõ ràng, không tràn ngang toàn trang.
- Tablet có thể dùng hai cột nhưng không ép bảng quá hẹp.
