# Story 1.2 - Đăng nhập, đăng xuất và quản lý phiên nội bộ

## Story Status

done

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
- [x] Runtime DTO validation cho `POST /api/v1/auth/login`
- [x] Rate protection tối thiểu cho `POST /api/v1/auth/login`
- [x] `GET /api/v1/auth/audit-logs` trả forbidden cho user không phải admin
- [x] Fail closed nếu auth context thiếu hoặc sai
- [x] Lưu user/session/audit bằng Prisma thay vì in-memory store

## Frontend Checklist

- [x] Thay `/login` shell hiện tại bằng flow đăng nhập thật
- [x] Kết nối form login tới backend
- [x] Refresh current-user context sau login thành công trước khi redirect
- [x] Hiển thị lỗi đăng nhập an toàn
- [x] Kết nối logout từ app shell
- [x] Chuyển hướng đúng sau login/logout
- [x] Áp dụng protected routes không phụ thuộc fixture auth cũ
- [x] Không render protected dashboard khi shell chưa có current-user context hợp lệ

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
- [x] API-level tests cho login/session/logout/audit/validation/rate protection bằng compiled Nest code
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
- [x] Story 1.2 review findings addressed: current-user refresh, login DTO validation, login rate protection, forbidden audit-log authorization, API tests

## Verification - 2026-05-29

- [x] `npm test` pass: 22 tests, 2 suites
- [x] `npm run lint` pass
- [x] `npm run build` pass
- [x] `docker compose exec -T api npm run prisma:deploy` pass and applied `20260529000000_audit_log_targets`
- [x] PostgreSQL is running in Docker and seeded users authenticate successfully.
- [x] Live API checks pass for unauthenticated `/api/v1/auth/me`, valid login, invalid login, authenticated `/api/v1/auth/me`, admin audit-log access, logout, and `/api/v1/auth/me` after logout.
- [x] Live web middleware check passes: `/dashboard` redirects to `/login` without a cookie, redirects to `/login` with forged `rtms_session`, and returns `200` with a valid session cookie.

Local DB verification commands for a developer machine:

```bash
docker compose up -d postgres
npm run prisma:migrate
npm run prisma:seed
```

## Known Issues

- Chưa có file story BMAD implementation riêng trong `_bmad-output/implementation-artifacts`; file này đang được dùng làm tracking log.
- Seed credentials chỉ được ghi trong `docs/development/auth-seed-users.md`, không hiển thị trong UI.

## Review Findings - 2026-05-29

- [x] [Review][Patch] Protected route middleware accepts any non-empty `rtms_session` cookie, so a forged or revoked cookie can receive protected page HTML before client-side session validation redirects. [`apps/web/src/middleware.ts:7`]
- [x] [Review][Patch] Unknown user statuses are treated as active because only the literal `disabled` value maps to disabled. [`apps/api/src/auth/auth.store.ts:105`]
- [x] [Review][Patch] Login/current-user parsing failures can escape safe handling because `response.json()` is outside the fetch `try`, and `refreshCurrentUser()` does not catch unexpected failures before clearing loading state. [`apps/web/src/lib/auth-api.ts:35`]
- [x] [Review][Patch] Logout clears local UI state even if the API request fails before the server session is revoked. [`apps/web/src/lib/auth-api.ts:39`]
- [x] [Review][Patch] Malformed stored password hashes can throw during verification instead of failing closed as invalid credentials. [`apps/api/src/auth/password.service.ts:22`]
- [x] [Review][Patch] Login skips password hashing work for unknown usernames, creating a username-enumeration timing side channel. [`apps/api/src/auth/auth.service.ts:28`]
- [x] [Review][Patch] Audit log rows do not capture target entity and target id, which conflicts with the project audit-log rule for important actions. [`apps/api/prisma/schema.prisma:40`]
- [x] [Review][Patch] Verification notes still say PostgreSQL migration/seed were not run in this environment, but the current review verified running PostgreSQL and seeded auth users. [`docs/story-logs/story-1.2-auth-session.md:115`]
- [x] [Review][Defer] Dashboard fixture data remains leadership-scoped instead of role/scope aware. [`apps/web/src/app/dashboard/page.tsx:114`] — deferred, pre-existing demo/dashboard limitation outside the narrow Story 1.2 auth/session scope.
- [x] [Review][Defer] Rate limiting is in-memory and per-process. [`apps/api/src/auth/auth-rate-limit.service.ts:14`] — deferred, Story 1.2 only required minimum local rate protection; persistent distributed throttling belongs later hardening.
- [x] [Review][Defer] Cookie-authenticated state-changing endpoints do not document or enforce an explicit CSRF strategy beyond SameSite/CORS. [`apps/api/src/auth/auth.controller.ts:25`] — deferred, security-hardening decision for the next auth hardening slice.
- [x] [Review][Defer] HTTP/Prisma integration coverage is still mostly manual rather than automated. [`tests/auth-api.test.mjs:1`] — deferred, current review ran manual API checks against live Postgres; automated integration tests can be added in a later QA slice.
- [x] [Review][Defer] Seed password hashes use deterministic development salts. [`apps/api/prisma/seed.mjs:1`] — deferred, seed-only development accounts; production credential lifecycle is out of current story scope.

## Final Decision

- [ ] Not ready
- [ ] Ready for review
- [x] Passed
