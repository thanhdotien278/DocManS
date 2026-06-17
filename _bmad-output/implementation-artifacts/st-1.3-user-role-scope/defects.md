# ST-1.3 Known Defects

## Status

Draft for owner review

This file is specification-only. It records observed behavior, expected behavior and traceability for later implementation; it does not prescribe a code fix.

## DEF-ST13-USER-CREATE-RESET-NULL: Create user form throws raw reset null runtime error

- Title: Create user form throws `Cannot read properties of null (reading 'reset')`.
- Story scope: ST-1.3 user, role and organization scope management.
- Current surface: dashboard/admin user creation screen with fields "Tên đăng nhập", "Họ tên hiển thị", "Mật khẩu khởi tạo", "Vai trò", "Phạm vi đơn vị".
- Observed behavior:
  - Admin fills create-user form.
  - Admin submits.
  - UI shows raw JavaScript error text instead of success feedback or user-friendly validation/API error.
- Expected successful behavior:
  - System creates the user.
  - System persists role and organization scope assignments consistently.
  - System applies active/default status according to the approved ST-1.3 status model.
  - System shows success feedback.
  - System refreshes or updates the user list.
  - System safely resets/closes the form only after the form instance/state is available.
- Expected failure behavior:
  - Missing required fields show inline or form-level validation.
  - Duplicate username shows a clear Vietnamese business error.
  - Invalid role or organization scope is rejected by backend validation.
  - Weak or empty initial password is rejected according to the approved password policy.
  - Unauthorized actor is denied by UI/API and no mutation occurs.
  - Network/server/API failure shows a safe retryable error and preserves form state where appropriate.
  - Raw JavaScript/runtime error text is never shown to users.
- Consistency requirements:
  - The system must not create partial user records without role/scope consistency.
  - Password or secret values must never appear in UI after submit, logs, audit details or API responses.
  - Successful create and role/scope assignment require audit coverage.
- Likely implementation risk hypothesis:
  - Unsafe form reference or reset call after modal/state unmount.
  - This is a hypothesis only and must be verified during implementation.
- Related UC IDs: `UC-ST13-01`, `UC-ST13-02`, `UC-ST13-03`, `UC-ST13-04`, `UC-ST13-05`, `UC-ST13-06`, `UC-ST13-07`, `UC-ST13-08`.
- Related AC IDs: `AC-ST13-CREATE-01` through `AC-ST13-CREATE-12`.
- Related TEST IDs: `T-ST13-CREATE-001` through `T-ST13-CREATE-014`.
- Related source requirements: `FR3`, `FR4`, `FR5`, `FR6`, `NFR7`, `NFR8`, `NFR9`, `NFR10`, `NFR14`, `NFR19`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`
