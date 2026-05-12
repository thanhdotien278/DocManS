# Phạm Vi Demo RTMS

## Mục tiêu

Giai đoạn demo tập trung mở rộng giao diện và mô phỏng quy trình vận hành của RTMS để phục vụ trình bày lãnh đạo, hội đồng chuyên môn và các đơn vị liên quan.

## Trong phạm vi

- Giao diện quản trị nội bộ bằng tiếng Việt.
- Dữ liệu mô phỏng có thuật ngữ phù hợp Học viện Quân y.
- Bảng điều hành, bảng dữ liệu, bộ lọc, trạng thái, timeline và trang chi tiết.
- Minh họa luồng xử lý liên module bằng dữ liệu frontend.
- Responsive cho điện thoại, máy tính bảng và desktop.

## Ngoài phạm vi

- Backend nghiệp vụ thật.
- Cơ sở dữ liệu, Prisma hoặc migration.
- Xác thực thật, phân quyền thật hoặc lưu trữ lâu dài.
- Tích hợp hệ thống bên ngoài.
- Kiến trúc state management mới.

## Nguyên tắc triển khai

- UI-first, cho phép dữ liệu mô phỏng.
- Không hiển thị các nhãn như “demo”, “mock”, “test data” trong UI.
- Không thêm logic backend nếu không cần cho trình diễn giao diện.
- Ưu tiên pattern và component đã có trong `apps/web`.
