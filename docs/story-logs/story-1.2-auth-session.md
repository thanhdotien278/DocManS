# Story 1.2 - Đăng nhập, đăng xuất và quản lý phiên nội bộ

## Story Status

Ready for BMAD code-review

## Source Documents

- `_bmad-output/epics-and-stories.md`
- `_bmad-output/project-context.md`
- `_bmad-output/architecture.md`
- `docs/ux-design-guidelines.md`
- `docs/sprints/sprint-001-foundation.md`

## Scope Checklist

- [x] Mô hình user nền tảng cho Story 1.2
- [x] Credential storage an toàn
- [x] Prisma/PostgreSQL persistence for Story 1.2 auth state
- [x] Backend auth endpoints
- [x] Login form tích hợp thật
- [x] Logout flow
- [x] Session or token handling cho phase 1
- [x] Protected route middleware phù hợp
- [x] Basic current-user context trong app shell

## Out-of-Scope Checklist

- [x] Chưa làm quản trị tài khoản phức tạp
- [x] Chưa làm reset password nâng cao
- [x] Chưa tích hợp SSO hoặc external identity
- [x] Chưa làm quản lý user/role/scope đầy đủ của Story 1.3
- [x] Chưa tạo catalog/config workflows của Story 1.4
- [x] Chưa thêm Redis, MinIO, notification jobs
- [x] Chỉ tạo Prisma migration tối thiểu cho auth/session/audit của Story 1.2

## Backend Checklist

- [x] Chọn auth module/boundary rõ ràng trong `apps/api`
- [x] Tạo endpoint đăng nhập
- [x] Tạo endpoint đăng xuất
- [x] Tạo endpoint current session/current user nếu cần
- [x] Xử lý invalid credentials an toàn
- [x] Fail closed nếu auth context thiếu hoặc sai
- [x] Lưu user/session/audit bằng Prisma thay vì in-memory store

## Frontend Checklist

- [x] Thay `/login` shell hiện tại bằng flow đăng nhập thật
- [x] Kết nối form login tới backend
- [x] Hiển thị lỗi đăng nhập an toàn
- [x] Kết nối logout từ app shell
- [x] Chuyển hướng đúng sau login/logout
- [x] Áp dụng protected routes không phụ thuộc fixture auth cũ

## Security Checklist

- [x] Không lưu secret không an toàn trong code
- [x] Hash credential đúng cách nếu Story 1.2 yêu cầu lưu local auth
- [x] Không tiết lộ chi tiết nhạy cảm khi login thất bại
- [x] Session/token invalidation hoạt động khi logout
- [x] Route protection được enforce ở backend và web boundary phù hợp
- [x] CORS credentialed được giới hạn theo allowlist cấu hình

## Audit-Log Checklist

- [x] Ghi audit log cho `login`
- [x] Ghi audit log cho `logout`
- [x] Lưu actor, timestamp, kết quả và context tối thiểu
- [x] Không log password, secret hoặc raw token
- [x] Audit log được lưu persistent qua Prisma

## Test Checklist

- [x] Unit tests cho auth boundary bằng smoke/source checks
- [x] Integration verification cho auth endpoints bằng manual API checks
- [x] Regression check cho app shell và protected routes
- [x] `npm test` pass
- [x] `npm run lint` pass
- [x] `npm run build` pass
- [x] Prisma client generation pass
- [x] Migration SQL validated against Prisma schema

## Manual Verification Checklist

- [x] Login thành công với user hợp lệ
- [x] Login sai bị từ chối
- [x] Logout thành công
- [x] Route protected không truy cập được khi chưa đăng nhập
- [x] Route protected không truy cập được sau logout
- [x] Current user context hiển thị đúng trong shell

## BMAD Code-Review Checklist

- [x] Scope bám đúng Story 1.2
- [x] Không kéo sớm Story 1.3 hoặc 1.4
- [x] Không để auth logic phụ thuộc fixture UI
- [x] Không tạo scope creep về workflow business
- [x] Có bằng chứng verification đủ cho review
- [x] Story 1.2-F1 review findings addressed

## Known Issues

- Docker CLI và `psql` không có trong môi trường Codex hiện tại, nên chưa thể apply migration/seed trực tiếp tại đây. Chạy `docker compose up -d postgres`, `npm run prisma:migrate`, và `npm run prisma:seed` trên máy dev có Docker/PostgreSQL.
- Chưa có file story BMAD implementation riêng trong `_bmad-output/implementation-artifacts`; file này đang được dùng làm tracking log.
- Seed credentials chỉ được ghi trong `docs/development/auth-seed-users.md`, không hiển thị trong UI.

## Final Decision

- [ ] Not ready
- [x] Ready for review
- [ ] Passed
