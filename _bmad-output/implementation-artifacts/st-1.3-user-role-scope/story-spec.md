# ST-1.3 User, Role, And Organization Scope Management

## Status

Draft for owner review

## Story statement

Là system administrator, tôi muốn quản lý người dùng, vai trò và phạm vi đơn vị để hệ thống cấp đúng quyền truy cập cho các module nghiệp vụ của RTMS.

## Business value

ST-1.3 tạo nền tảng vận hành thật cho phase 1: biết ai được đăng nhập, ai có role nào, ai thuộc phạm vi đơn vị nào, và backend có đủ current-user context để enforce quyền ở các story sau.

## Scope

- Create user với `username`, `displayName`, initial password, role assignment và organization scope.
- Read/list users với search/filter theo username, display name, role, organization, status.
- Update user profile fields trong phạm vi ST-1.3, tối thiểu là display name.
- Update role assignment cho user.
- Update organization/unit scope assignment cho user.
- Lock/deactivate user để user không login được và không tiếp tục protected flow.
- Unlock/reactivate user để user có thể login lại nếu credential đúng.
- Load current-user context với role và organization scope hiện hành.
- Ghi audit log kỳ vọng cho mọi thao tác quản trị user/role/scope.

## Out of scope

- Hard delete user. User liên quan audit log, hồ sơ, phân công, quyết định và lịch sử xử lý nên không được hard delete trong ST-1.3.
- Soft-delete/archive user. Đây là candidate deferred, cần duyệt riêng trước khi implement.
- Bulk import nâng cao.
- Permission matrix tinh chỉnh cho từng business action nhỏ; phần đó thuộc ST-1.4 hoặc story permission chuyên biệt.
- SSO, external identity provider, reset password nâng cao, password policy nâng cao ngoài initial password tối thiểu.
- Organization hierarchy management đầy đủ nếu vượt quá nhu cầu gán scope tối thiểu cho user.

## Assumptions

- Chỉ system administrator được truy cập user/role/scope management.
- Role và organization/unit tối thiểu đã có hoặc sẽ được tạo ở bước implement bằng dữ liệu nền được duyệt.
- Một user trong ST-1.3 phải có ít nhất một role và ít nhất một organization scope nếu owner xác nhận policy bắt buộc.
- Trạng thái user cần phân biệt đủ để chặn login/protected flow khi bị locked hoặc deactivated.
- Frontend có thể ẩn action theo role, nhưng backend enforcement mới là nguồn quyết định cuối cùng.

## Business rules

- Username là định danh đăng nhập ổn định và không được trùng.
- Display name có thể cập nhật.
- Initial password chỉ dùng khi tạo user; xử lý lưu trữ/hash là trách nhiệm implement sau này.
- Create user phải lưu user, role assignment và organization scope assignment nhất quán; không được tạo partial user record nếu role/scope assignment thất bại.
- User admin page và API chỉ dành cho system administrator.
- Không trả về dữ liệu nhạy cảm như password hash, session token hoặc secret trong user list/detail.
- Search/list/filter phải không rò rỉ dữ liệu ngoài phạm vi quyền của actor.

## User list/search/filter behavior

- Màn user management phải hỗ trợ list mặc định và bộ lọc theo `keyword`, `roleId` hoặc `roleCode`, `organizationId`, và `status`.
- `keyword` tìm theo `username` hoặc `displayName`.
- `keyword` phải được trim khoảng trắng đầu/cuối trước khi gửi hoặc xử lý.
- `keyword` rỗng sau khi trim tương đương không áp dụng keyword filter và không được gây lỗi.
- Tìm kiếm keyword nên không phân biệt hoa thường nếu backend/database pattern hỗ trợ ổn định.
- Dropdown "Tất cả" cho role, organization và status tương đương không áp dụng filter field đó. Nếu UI/API dùng giá trị `all`, contract backend phải xử lý rõ trước khi implement.
- Nút "Lọc" áp dụng toàn bộ điều kiện hiện tại trong form filter.
- Nút "Xóa lọc" reset `keyword`, role, organization và status về mặc định, sau đó reload danh sách mặc định.
- UI giữ lại giá trị filter đang áp dụng sau khi bấm "Lọc" để admin thấy điều kiện hiện hành.
- Result count phải phản ánh tổng số kết quả sau lọc, không phải tổng số user toàn hệ thống.
- Empty state phải hiển thị rõ khi filter không có kết quả.
- Error state phải hiển thị khi request list/search/filter thất bại.
- Filter không được làm lộ user ngoài phạm vi quyền của actor. ST-1.3 hiện yêu cầu system admin; nếu sau này có admin phân cấp theo scope, backend vẫn phải áp dụng scope trước khi trả kết quả.

## User lifecycle rules

- Create user phải tạo user ở trạng thái cho phép login hoặc trạng thái được owner duyệt.
- Lock/deactivate user phải khiến user không login được.
- Lock/deactivate user đang có phiên hợp lệ phải không được tiếp tục protected flow ở lần kiểm tra session/current-user tiếp theo.
- Unlock/reactivate user phải cho phép login lại nếu credential đúng và user không bị chặn bởi policy khác.
- Hard delete không được phép trong ST-1.3.

## Role assignment rules

- Role assignment phải được quản trị bởi system administrator.
- Tạo user phải đi kèm role hợp lệ nếu policy yêu cầu role bắt buộc.
- Cập nhật role phải thay thế hoặc điều chỉnh assignment theo model được duyệt ở implement sau này.
- Current-user context phải phản ánh role assignment hiện hành sau khi thay đổi.
- Nếu role không resolve được, authorization phải fail closed.

## Organization scope rules

- Tạo user phải đi kèm organization/unit scope hợp lệ nếu policy yêu cầu scope bắt buộc.
- Organization scope assignment phải được quản trị bởi system administrator.
- Current-user context phải phản ánh organization scope hiện hành sau khi thay đổi.
- Nếu scope không resolve được, authorization phải fail closed.
- Downstream proposal/project/task/dashboard/report access sẽ dùng scope này nhưng không implement các workflow đó trong ST-1.3.

## Authorization rules

- `AUTH-ST-1.3-01`: Admin-only access to user management.
- `AUTH-ST-1.3-02`: Backend enforcement for all user admin APIs.
- `AUTH-ST-1.3-FILTER-01`: Only system administrator can list/search/filter users.
- `AUTH-ST-1.3-FILTER-02`: Backend enforces permission for every list/search/filter query.
- `AUTH-ST-1.3-FILTER-03`: List/search/filter must not expose users outside actor scope if hierarchical admin scope is introduced later.
- `AUTH-ST-1.3-03`: Fail closed when actor role/scope cannot be resolved.
- `AUTH-ST-1.3-04`: Prevent deactivated/locked users from authenticated access.
- `AUTH-ST-1.3-05`: Current-user context must reflect active role/scope assignments.

## Audit-log rules

- `AUD-ST-1.3-01`: Create user.
- `AUD-ST-1.3-02`: Update user profile.
- `AUD-ST-1.3-03`: Change role assignment.
- `AUD-ST-1.3-04`: Change organization scope.
- `AUD-ST-1.3-05`: Lock/deactivate user.
- `AUD-ST-1.3-06`: Unlock/reactivate user.

Audit records are expected to include actor, action, target user, before/after values where safe, result, timestamp and request context available to backend.

Normal list/search/filter read operations do not require business audit logs in ST-1.3. Security access logs may capture request metadata if the platform already supports them. Do not create a business audit requirement for every "Lọc" click unless owner approves a read-access audit policy.

## UX behavior requirements

- User management screen must show a dense admin list/table with username, display name, role, organization scope and status.
- Admin can search/filter by username, display name, role, organization and status.
- Filter area must include keyword input, role dropdown, organization dropdown, status dropdown, "Lọc" action and "Xóa lọc" action.
- Keyword input label/placeholder must communicate search by username or display name.
- Role, organization and status dropdown default value must mean "Tất cả".
- List result count and empty/error states must update according to the current applied filters.
- Create form must collect username, display name, initial password, role and organization scope.
- Create form fields visible in the current admin dashboard are: "Tên đăng nhập", "Họ tên hiển thị", "Mật khẩu khởi tạo", "Vai trò", and "Phạm vi đơn vị".
- Successful create must show success feedback, refresh or update the user list, and reset or close the form only when the form instance/state is available.
- Validation/API failure must preserve entered form data where appropriate, show inline or form-level Vietnamese error feedback, and never expose raw JavaScript/runtime error text.
- Raw error text such as `Cannot read properties of null (reading 'reset')` must never be displayed to the admin user.
- Edit flow must support display name, role assignment, organization scope and status operations.
- Lock/deactivate and unlock/reactivate actions must be explicit and show clear status feedback.
- Non-admin users must not be able to use the admin UI; backend still enforces even if UI hides it.

## Known defect coverage

- `DEF-ST13-USER-CREATE-RESET-NULL`: Create user form throws `Cannot read properties of null (reading 'reset')`.
- Observed behavior: Admin fills the create-user form, submits it, and the UI shows raw JavaScript error text instead of success feedback or a user-friendly validation/API error.
- Expected behavior: Successful creation persists user, role and organization scope assignments, shows success feedback, refreshes or updates the user list, and resets/closes form state only after the form instance is available.
- Expected failure behavior: Validation, duplicate username, invalid role, invalid organization scope, weak/empty initial password, unauthorized actor, network error and server error are handled explicitly with safe user-facing messages and no partial persistence.
- Implementation-risk hypothesis: unsafe form reference or reset call after modal/state unmount; this must be verified during implementation and must not be treated as a confirmed root cause in the spec.

## API behavior expectations for later implementation

- Provide admin-only API behavior for list/search/filter users.
- Expected list/search/filter query params: `keyword`, `roleId` or `roleCode`, `organizationId`, `status`, plus existing pagination params if the current API already has them.
- Expected list/search/filter response: safe user rows containing username, display name, role summary, organization scope summary and status; pagination/result-count metadata if the current list API supports pagination.
- Empty result returns a successful response with an empty list and result count `0`.
- Filter request failure returns a safe error response and must not expose secrets or unauthorized records.
- Invalid filter values must be rejected with validation error or ignored only if that behavior is explicitly chosen in implementation contract; owner review should confirm the preferred behavior before coding.
- Provide admin-only create user behavior with validation for username uniqueness, role and organization scope.
- Provide admin-only update behavior for display name, role assignment and organization scope.
- Provide admin-only status behavior for lock/deactivate and unlock/reactivate.
- Provide current-user context behavior that returns active role/scope without sensitive fields.
- All user admin APIs must return safe forbidden/unauthorized responses for non-admin actors.

## Data/model expectations for later implementation

- User entity stores username, display name, status and timestamps.
- Role assignment connects user to role records.
- Organization scope assignment connects user to organization/unit records.
- Current-user context can derive role and organization scope from persisted assignments.
- Audit log can target user and assignment changes.
- Delete model is not part of ST-1.3; soft-delete/archive remains deferred.

## Security/privacy requirements

- Never expose password hashes, initial password after submission, session tokens or secrets.
- Backend must enforce admin-only access and fail closed on missing role/scope context.
- Locked/deactivated users must not authenticate or continue protected flows.
- Audit log details must avoid leaking secrets while preserving traceability.
- User list/search must avoid unauthorized record leakage.

## Deferred decisions

- Whether user status should use separate `locked` and `deactivated` states or one disabled state with reason.
- Whether users can have multiple roles in ST-1.3 or exactly one role for phase 1.
- Whether users can have multiple organization scopes or exactly one primary unit in ST-1.3.
- Whether role and organization scope are mandatory on create in all cases.
- Whether unlock and reactivate are one operation or two separate operations.
- Whether soft-delete/archive should be introduced in a later story.
- Whether API should accept `roleId`, `roleCode`, or both for role filtering.
- Whether invalid filter values should be rejected or ignored; recommended default is reject with validation error for clarity.
- Whether status filter values are exactly `active`, `locked`, `deactivated`, or must follow the status model approved for ST-1.3.

## Open questions for owner review

- Confirm whether ST-1.3 must support both lock/unlock and deactivate/reactivate as separate actions, or whether one status model is enough.
- Confirm if role assignment is single-role or multi-role for phase 1.
- Confirm if organization scope is single unit, multiple units, or hierarchical.
- Confirm default status after create.
- Confirm list/search/filter API role contract: `roleId`, `roleCode`, or both.
- Confirm status filter enum after status model decision.
- Confirm invalid filter behavior: reject with validation error or ignore invalid values.
