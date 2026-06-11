# ST-1.3 Test Plan

## Status

Draft for owner review

No test code is written in this artifact. All implementation status values are `not-started`; all review status values are `pending-owner-review`.

## Service-level tests

### TEST-ST-1.3-SVC-01: Create user service stores role and scope

- Covers: `UC-ST-1.3-02`, `AC-ST-1.3-02-01`
- Expected verification: create user stores username, display name, status, role assignment and organization scope assignment.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-SVC-02: Update user profile service

- Covers: `UC-ST-1.3-03`, `AC-ST-1.3-03-01`
- Expected verification: update display name persists only approved profile fields.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-SVC-03: Update role assignment service

- Covers: `UC-ST-1.3-04`, `AC-ST-1.3-04-01`
- Expected verification: valid role change is persisted and invalid role is rejected.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-SVC-04: Update organization scope service

- Covers: `UC-ST-1.3-05`, `AC-ST-1.3-05-01`
- Expected verification: valid scope change is persisted and invalid scope is rejected.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-SVC-05: Lock/deactivate user service

- Covers: `UC-ST-1.3-06`, `AC-ST-1.3-06-01`, `AC-ST-1.3-06-02`
- Expected verification: locked/deactivated status prevents login/current-user eligibility.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-SVC-06: Unlock/reactivate user service

- Covers: `UC-ST-1.3-07`, `AC-ST-1.3-07-01`, `AC-ST-1.3-07-02`
- Expected verification: unlocked/reactivated user becomes login-eligible when credentials are correct.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## API tests

### TEST-ST-1.3-API-01: Admin list/search/filter API

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-01`, `AC-ST-1.3-01-02`
- Expected verification: admin receives default safe user list and can use the refined filter test set below for specific conditions.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-01: List default users

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-01`
- Expected verification: admin list request without filters returns safe user rows and result count/pagination metadata if supported.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-02: Search by username

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-02`, `AC-ST-1.3-01-04`
- Expected verification: `keyword` is trimmed and matches username without exposing sensitive fields.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-03: Search by display name

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-03`, `AC-ST-1.3-01-04`
- Expected verification: `keyword` is trimmed and matches display name without exposing sensitive fields.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-04: Filter by role

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-05`
- Expected verification: `roleId` or `roleCode` returns only users assigned to the requested role; "Tất cả" means no role filter.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-05: Filter by organization

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-06`
- Expected verification: `organizationId` returns only users in the requested organization scope; "Tất cả" means no organization filter.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-06: Filter by status

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-07`
- Expected verification: `status` returns only users in the requested status; "Tất cả" means no status filter.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-07: Combine keyword, role, organization and status

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-08`, `AC-ST-1.3-01-11`, `AC-ST-1.3-01-14`
- Expected verification: combined filters use AND semantics, respect admin authorization/scope and return count for the filtered result.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-FILTER-08: Reject or handle invalid filter values

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-12`
- Expected verification: invalid `roleId`/`roleCode`, `organizationId` or `status` is rejected with validation error unless owner approves ignore-invalid behavior.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-02: Admin create user API

- Covers: `UC-ST-1.3-02`, `AC-ST-1.3-02-01`, `AC-ST-1.3-02-02`, `AC-ST-1.3-02-03`
- Expected verification: valid create succeeds; duplicate username and missing mandatory role/scope fail.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-03: Admin update profile API

- Covers: `UC-ST-1.3-03`, `AC-ST-1.3-03-01`
- Expected verification: admin can update display name and receives updated user data.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-04: Admin update role API

- Covers: `UC-ST-1.3-04`, `AC-ST-1.3-04-01`
- Expected verification: valid role assignment update succeeds; invalid role fails.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-05: Admin update organization scope API

- Covers: `UC-ST-1.3-05`, `AC-ST-1.3-05-01`
- Expected verification: valid organization scope update succeeds; invalid scope fails.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-06: Admin lock/deactivate API

- Covers: `UC-ST-1.3-06`, `AC-ST-1.3-06-01`
- Expected verification: status update succeeds and response reflects locked/deactivated state.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-07: Admin unlock/reactivate API

- Covers: `UC-ST-1.3-07`, `AC-ST-1.3-07-01`
- Expected verification: status update succeeds and response reflects active/login-eligible state.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-API-08: Current-user context API includes role and scope

- Covers: `UC-ST-1.3-08`, `AC-ST-1.3-08-01`
- Expected verification: active user context includes role and organization scope, without sensitive secrets.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Web/UI and manual tests

### TEST-ST-1.3-WEB-01: User list UI

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-01`, `AC-ST-1.3-01-02`
- Expected verification: admin can view list and sees search/filter controls.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-FILTER-01: Filter form submits selected filters

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-02` through `AC-ST-1.3-01-08`, `AC-ST-1.3-01-13`, `AC-ST-1.3-01-14`
- Expected verification: clicking "Lọc" sends current keyword, role, organization and status filters and keeps applied values visible.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-FILTER-02: Clear filter resets fields and reloads default list

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-09`
- Expected verification: clicking "Xóa lọc" clears keyword, resets dropdowns to "Tất cả" and reloads the default list.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-FILTER-03: Empty state shown for no results

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-10`
- Expected verification: no-result filter response shows empty state and count `0`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-FILTER-04: Error state shown on failed request

- Covers: `UC-ST-1.3-01`, `AC-ST-1.3-01-12`
- Expected verification: failed filter request shows error state and does not present stale data as confirmed results.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-02: Create user UI

- Covers: `UC-ST-1.3-02`, `AC-ST-1.3-02-01`, `AC-ST-1.3-02-02`, `AC-ST-1.3-02-03`
- Expected verification: create form captures username, display name, initial password, role and organization scope with validation feedback, success feedback, safe list refresh/update and no unsafe null reset behavior.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-03: Edit user UI

- Covers: `UC-ST-1.3-03`, `UC-ST-1.3-04`, `UC-ST-1.3-05`, `AC-ST-1.3-03-01`, `AC-ST-1.3-04-01`, `AC-ST-1.3-05-01`
- Expected verification: edit flow supports display name, role assignment and organization scope assignment.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-WEB-04: Lock/unlock or deactivate/reactivate UI

- Covers: `UC-ST-1.3-06`, `UC-ST-1.3-07`, `AC-ST-1.3-06-01`, `AC-ST-1.3-07-01`
- Expected verification: admin can perform status action and see clear status feedback.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## E2E tests

### TEST-ST-1.3-E2E-01: Locked/deactivated user denied protected flow

- Covers: `UC-ST-1.3-06`, `AC-ST-1.3-06-02`
- Expected verification: user is denied login and denied protected route/API after lock/deactivation.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-E2E-02: Unlocked/reactivated user can login

- Covers: `UC-ST-1.3-07`, `AC-ST-1.3-07-02`
- Expected verification: user can login after unlock/reactivation with correct credential.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Audit-log tests

### TEST-ST-1.3-AUD-01: Audit create user

- Covers: `AUD-ST-1.3-01`, `AC-ST-1.3-02-01`
- Expected verification: create user writes audit log without password/secret.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUD-02: Audit update profile

- Covers: `AUD-ST-1.3-02`, `AC-ST-1.3-03-01`
- Expected verification: display name update writes audit log with safe before/after values.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUD-03: Audit role assignment change

- Covers: `AUD-ST-1.3-03`, `AC-ST-1.3-04-01`
- Expected verification: role assignment update writes audit log.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUD-04: Audit organization scope change

- Covers: `AUD-ST-1.3-04`, `AC-ST-1.3-05-01`
- Expected verification: organization scope update writes audit log.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUD-05: Audit lock/deactivate

- Covers: `AUD-ST-1.3-05`, `AC-ST-1.3-06-01`
- Expected verification: lock/deactivate writes audit log.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUD-06: Audit unlock/reactivate

- Covers: `AUD-ST-1.3-06`, `AC-ST-1.3-07-01`
- Expected verification: unlock/reactivate writes audit log.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Authorization tests

### TEST-ST-1.3-AUTH-01: Non-admin forbidden

- Covers: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AC-ST-1.3-09-01`
- Expected verification: non-admin cannot access admin UI/API or mutate user data.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUTH-FILTER-01: Non-admin forbidden from user list/filter API/page

- Covers: `AUTH-ST-1.3-FILTER-01`, `AUTH-ST-1.3-FILTER-02`, `AUTH-ST-1.3-FILTER-03`, `AC-ST-1.3-01-11`, `AC-ST-1.3-09-01`
- Expected verification: non-admin cannot access user list/filter page or API and receives no user data, rows or count metadata.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUTH-02: Locked/deactivated user cannot authenticate

- Covers: `AUTH-ST-1.3-04`, `AC-ST-1.3-06-02`
- Expected verification: locked/deactivated user login fails safely.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUTH-03: Reactivated user can authenticate with valid credential

- Covers: `AUTH-ST-1.3-04`, `AC-ST-1.3-07-02`
- Expected verification: reactivated user login succeeds with correct credential.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### TEST-ST-1.3-AUTH-04: Fail closed on missing role/scope context

- Covers: `AUTH-ST-1.3-03`, `AUTH-ST-1.3-05`, `AC-ST-1.3-08-01`
- Expected verification: missing or inconsistent role/scope context denies protected access.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## ST13 create-user defect/regression tests

These are specification-only test IDs for later implementation. No test code is written in this update.

### T-ST13-CREATE-001: Create user happy path as system admin

- Covers: `UC-ST13-01`, `AC-ST13-CREATE-01`, `AC-ST13-CREATE-02`, `AC-ST13-CREATE-09`
- Expected verification: system admin creates user with role and organization scope; user appears in list and audit exists.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-002: Required-field validation for username, display name, password, role, scope

- Covers: `UC-ST13-02`, `AC-ST13-CREATE-04`, `AC-ST13-CREATE-10`
- Expected verification: each missing required field blocks create and shows safe validation feedback.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-003: Duplicate username business error

- Covers: `UC-ST13-03`, `AC-ST13-CREATE-05`, `AC-ST13-CREATE-08`
- Expected verification: duplicate username is rejected with a clear Vietnamese user-facing message and no duplicate record.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-004: Invalid role ID rejected

- Covers: `UC-ST13-04`, `AC-ST13-CREATE-06`, `AC-ST13-CREATE-08`
- Expected verification: invalid role ID is rejected by backend validation and does not create partial data.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-005: Invalid organization scope ID rejected

- Covers: `UC-ST13-04`, `AC-ST13-CREATE-06`, `AC-ST13-CREATE-08`
- Expected verification: invalid organization scope ID is rejected by backend validation and does not create partial data.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-006: Non-admin cannot access create-user UI/API

- Covers: `UC-ST13-05`, `AC-ST13-CREATE-07`
- Expected verification: non-admin is denied from create-user UI/API and no mutation occurs.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-007: API failure does not reset form and shows safe error

- Covers: `UC-ST13-07`, `UC-ST13-08`, `AC-ST13-CREATE-03`, `AC-ST13-CREATE-10`
- Expected verification: failed create preserves form state where appropriate, shows safe retryable/form-level error and does not call unsafe reset.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-008: Successful create refreshes user list and clears form safely

- Covers: `UC-ST13-01`, `UC-ST13-06`, `AC-ST13-CREATE-01`, `AC-ST13-CREATE-02`, `AC-ST13-CREATE-03`
- Expected verification: success refreshes or updates list and clears/closes form only when safe.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-009: Regression test for reset null runtime error

- Covers: `DEF-ST13-USER-CREATE-RESET-NULL`, `UC-ST13-06`, `UC-ST13-07`, `UC-ST13-08`, `AC-ST13-CREATE-02`, `AC-ST13-CREATE-03`, `AC-ST13-CREATE-10`
- Expected verification: `Cannot read properties of null (reading 'reset')` does not appear in UI or console during success, validation failure, API failure or network/server failure.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-010: No partial persistence when role/scope assignment fails

- Covers: `UC-ST13-04`, `AC-ST13-CREATE-08`
- Expected verification: simulated role/scope assignment failure leaves no inconsistent user or assignment records.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-011: Audit log created for successful create and assignments

- Covers: `UC-ST13-01`, `AC-ST13-CREATE-09`
- Expected verification: audit log records successful create and role/scope assignment without secrets.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-012: No password leakage in logs, audit log, UI, or API response

- Covers: `UC-ST13-01`, `UC-ST13-08`, `AC-ST13-CREATE-12`
- Expected verification: initial password is absent from logs, audit details, UI after submit and API responses.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-013: Responsive/manual check at 390px, 768px, 1440px

- Covers: `UC-ST13-06`, `AC-ST13-CREATE-11`
- Expected verification: create-user form, validation, success/error feedback and user list update are usable at 390px, 768px and 1440px with no full-page horizontal scroll.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

### T-ST13-CREATE-014: Accessibility check for create-user form

- Covers: `UC-ST13-02`, `UC-ST13-06`, `AC-ST13-CREATE-10`, `AC-ST13-CREATE-11`
- Expected verification: labels, focus order, keyboard submit/cancel and async error announcement use accessible behavior such as `aria-live` or equivalent.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Regression checklist

- Verify existing login/logout behavior still works for active users.
- Verify non-admin protected access remains denied for admin-only pages/APIs.
- Verify current-user context remains free of secrets.
- Verify audit logs remain queryable by authorized admin users.
- Verify user list/search/filter does not expose password/session data.
- Verify user list/search/filter does not require business audit logs for normal read-only filter operations.
- Verify status changes do not hard delete users.
