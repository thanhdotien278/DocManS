# Epic 1: Truy cập hệ thống và quản trị phân quyền hợp nhất

- **Epic status:** `in-progress`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Status |
|---|---|---|
| 1.1 | Khởi tạo workspace Nx và khung ứng dụng nội bộ | `done` |
| 1.2 | Đăng nhập, đăng xuất và quản lý phiên nội bộ | `done` |
| 1.3 | Quản trị vòng đời tài khoản người dùng | `done` |
| 1.4 | Một vai trò hệ thống, phạm vi tổ chức và chuyển đổi dữ liệu cũ | `done` |
| 1.5 | Đổi mật khẩu và đặt lại mật khẩu có kiểm soát | `backlog` |
| 1.6 | Quản lý danh mục và cấu hình vận hành dùng chung | `done` |
| 1.7 | Hợp đồng phân quyền và bộ đánh giá policy dùng chung | `review` |
| 1.8 | Capability response và giao diện không suy diễn quyền | `backlog` |
| 1.9 | Vòng đời quan hệ theo hồ sơ và giới hạn thư ký khoa học | `backlog` |
| 1.10 | Vòng đời ủy quyền theo hành động và hồ sơ | `backlog` |

## Execution note

Stories 1.1–1.4 are implemented and covered by the current workspace, authentication, admin-user, proposal-scope, and clean-schema migration test suites. Story 1.4 is `done`: review blockers were resolved with exact organization-ID enforcement, fail-closed legacy migration handling, atomic account/scope writes, preserved multi-unit scopes, and one shared system-role source.
