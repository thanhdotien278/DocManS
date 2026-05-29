# Sprint 001 - Foundation, Auth, User/Role Base

## Sprint Goal

Establish a clean technical foundation, real authentication, user/role/scope base, and shared permission/catalog foundations.

## Sprint Scope

- [x] Story 1.1: Khởi tạo workspace và ứng dụng nền tảng
- [x] Story 1.1-F2: Cleanup Story 1.1 Foundation Compliance
- [ ] Story 1.2: Đăng nhập, đăng xuất và quản lý phiên nội bộ
- [ ] Story 1.3: Quản lý người dùng, vai trò và phạm vi đơn vị
- [ ] Story 1.4: Permission primitives, danh mục dùng chung và cấu hình nền

## Completed

- [x] Story 1.1: Khởi tạo Nx workspace, `apps/web`, `apps/api`, shared packages, strict TypeScript, Docker Compose skeleton, Nginx skeleton, app shell nền tảng
- [x] Story 1.1-F2: Cleanup fake auth/session behavior, cô lập dữ liệu UI tạm trong `apps/web/src/fixtures`, làm sạch health endpoint, chuẩn hóa permission primitives

## In Progress

- [x] Story 1.2: Đăng nhập, đăng xuất và quản lý phiên nội bộ
- [x] Backend auth endpoints
- [x] Credential storage an toàn
- [x] Protected routes và session handling
- [x] Login/logout UI tích hợp với backend
- [x] Audit log cho login/logout
- [x] Story 1.2-F1: Prisma/PostgreSQL persistence cho auth/session/audit
- [x] Story 1.2 review fixes: current-user refresh, login DTO validation, login rate protection, forbidden audit-log authorization, API auth tests
- [x] Test và manual verification

## Not Started

- [ ] Story 1.3: Quản lý người dùng, vai trò và phạm vi đơn vị
- [ ] Story 1.4: Permission primitives, danh mục dùng chung và cấu hình nền

## Risks / Blockers

- [ ] Chưa có tracking file BMAD story chính thức trong `_bmad-output/implementation-artifacts`
- [ ] Story 1.2 migration/seed cần được apply trên máy dev có Docker/PostgreSQL; môi trường Codex hiện tại không kết nối được Docker daemon và không có `psql`

## Verification Checklist

- [x] Story 1.1 đã pass BMAD code-review
- [x] `npm test` pass ở nền tảng hiện tại
- [x] `npm run lint` pass ở nền tảng hiện tại
- [x] `npm run build` pass ở nền tảng hiện tại
- [x] Web app chạy local
- [x] API health endpoint trả response sạch
- [x] Login thành công với auth thật
- [x] Login sai bị từ chối an toàn
- [x] DTO validation từ chối payload login không hợp lệ
- [x] Rate protection từ chối quá nhiều lần login sai
- [x] Logout vô hiệu hóa session
- [x] Protected routes chặn truy cập chưa xác thực
- [x] Audit log `login` và `logout` được tạo
- [x] Non-admin bị forbidden khi gọi audit-log API
- [x] `User`, `Session`, `AuditLog` được giới hạn đúng scope Story 1.2
- [x] Prisma client generation pass

## Review Status

- [x] Story 1.1: Passed
- [x] Story 1.1-F2: Passed
- [x] Story 1.2: Ready for review after BMAD code-review fixes
- [ ] Story 1.2 BMAD re-review: Pending
- [ ] Sprint review: Pending

## Notes For Next Story

- Story 1.2 phải thay thế neutral shell context bằng xác thực thật từ backend.
- Chỉ dùng Prisma migration tối thiểu cho auth/session/audit; không tạo Redis, MinIO, notification jobs hoặc workflow business ngoài scope của Story 1.2.
- Ưu tiên local auth cho phase 1, fail closed, và chuẩn bị boundary rõ cho Story 1.3.
- Cập nhật file này mỗi khi task chính của Story 1.2 hoàn thành hoặc khi trạng thái chuyển sang `Ready for review` hay `Passed`.
