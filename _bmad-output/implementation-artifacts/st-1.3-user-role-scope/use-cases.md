# ST-1.3 Use Cases

## Status

Draft for owner review

## UC-ST-1.3-01: List, search, and filter users

- Actor: System administrator.
- Preconditions: Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin opens user management.
  2. System loads default user list without sensitive fields.
  3. Admin enters `keyword` to search by username or display name.
  4. Admin selects role filter.
  5. Admin selects organization filter.
  6. Admin selects status filter.
  7. Admin clicks "Lọc".
  8. System returns only user records matching all applied conditions and the actor's authorized scope.
  9. System shows result count for the filtered result set.
  10. Admin clicks "Xóa lọc".
  11. System resets keyword, role, organization and status to defaults and reloads the default list.
- Alternate/error flows:
  - Keyword has no matching username or display name: system shows empty state and result count `0`.
  - Filter combination has no result: system shows empty state and keeps current filter values visible.
  - Non-admin actor accesses page/API: backend returns forbidden/unauthorized and protected user data is not returned.
  - Backend/API fails during filter request: UI shows error state and does not display stale data as confirmed filtered data.
  - Role, organization or status dropdown options fail to load: UI shows option-load error or disabled filter state and does not submit ambiguous values.
  - Invalid filter value is received by backend: backend rejects with validation error unless owner explicitly approves ignore-invalid behavior.
  - Missing actor role/scope context fails closed.
- Postconditions: Admin can inspect matching users and select create/edit/status actions.
- Related AC IDs: `AC-ST-1.3-01-01` through `AC-ST-1.3-01-14`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-03`, `AUTH-ST-1.3-FILTER-01`, `AUTH-ST-1.3-FILTER-02`, `AUTH-ST-1.3-FILTER-03`
- Related AUD IDs: None
- Related TEST IDs: `TEST-ST-1.3-API-01`, `TEST-ST-1.3-WEB-01`, `TEST-ST-1.3-API-FILTER-01` through `TEST-ST-1.3-API-FILTER-08`, `TEST-ST-1.3-WEB-FILTER-01` through `TEST-ST-1.3-WEB-FILTER-04`, `TEST-ST-1.3-AUTH-FILTER-01`

## UC-ST-1.3-02: Create user with role and organization scope

- Actor: System administrator.
- Preconditions: Actor is authenticated, active, and resolved as system administrator. Role and organization scope values are valid.
- Main flow:
  1. Admin enters username, display name, initial password, role and organization scope.
  2. System validates required fields and username uniqueness.
  3. System creates the user and stores role/scope assignments.
  4. System writes audit log for create user.
  5. System shows success feedback.
  6. System refreshes or updates the user list.
  7. System resets or closes the create form only when the form instance/state is available.
- Alternate/error flows:
  - Duplicate username is rejected.
  - Missing role or organization scope is rejected when mandatory policy is confirmed.
  - Invalid role or organization scope is rejected.
  - Missing username, display name, initial password, role or organization scope shows inline validation and blocks submit.
  - Weak or empty initial password is rejected according to the approved phase 1 password policy.
  - API validation or business failure keeps entered data where appropriate and shows a safe Vietnamese error message.
  - Network/server error shows a retryable safe error state and preserves form state.
  - Non-admin actor is denied by UI/API and no user is created.
  - UI must not call unsafe reset behavior on a null/unmounted form reference.
  - Audit logging failure follows the later implementation policy, with expected fail-safe behavior documented before coding.
- Postconditions: New user appears in admin list with assigned role, organization scope and status.
- Related AC IDs: `AC-ST-1.3-02-01`, `AC-ST-1.3-02-02`, `AC-ST-1.3-02-03`, `AC-ST13-CREATE-01` through `AC-ST13-CREATE-12`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-03`
- Related AUD IDs: `AUD-ST-1.3-01`
- Related TEST IDs: `TEST-ST-1.3-SVC-01`, `TEST-ST-1.3-API-02`, `TEST-ST-1.3-WEB-02`, `TEST-ST-1.3-AUD-01`, `T-ST13-CREATE-001` through `T-ST13-CREATE-014`

## UC-ST13 create-user refinement set

The IDs below are stable refinement IDs for implementation and regression planning around `DEF-ST13-USER-CREATE-RESET-NULL`. They refine `UC-ST-1.3-02` without replacing the existing BMAD story IDs.

### UC-ST13-01: Admin creates user successfully with role and organization scope

- Actor: System administrator.
- Expected outcome: User, role assignment, organization scope assignment, default/active status and audit log are created consistently; user appears in the refreshed list.
- Related AC IDs: `AC-ST13-CREATE-01`, `AC-ST13-CREATE-02`, `AC-ST13-CREATE-08`, `AC-ST13-CREATE-09`, `AC-ST13-CREATE-12`
- Related TEST IDs: `T-ST13-CREATE-001`, `T-ST13-CREATE-008`, `T-ST13-CREATE-011`, `T-ST13-CREATE-012`

### UC-ST13-02: Admin submits create-user form with missing/invalid fields and sees inline validation

- Actor: System administrator.
- Expected outcome: Missing username, display name, password, role or scope is blocked before create; errors are shown inline or at form level without clearing valid entered data unnecessarily.
- Related AC IDs: `AC-ST13-CREATE-04`, `AC-ST13-CREATE-10`, `AC-ST13-CREATE-12`
- Related TEST IDs: `T-ST13-CREATE-002`, `T-ST13-CREATE-014`

### UC-ST13-03: Admin tries duplicate username and receives clear business error

- Actor: System administrator.
- Expected outcome: Duplicate username is rejected with a clear Vietnamese business message and no second user is created.
- Related AC IDs: `AC-ST13-CREATE-05`, `AC-ST13-CREATE-08`
- Related TEST IDs: `T-ST13-CREATE-003`

### UC-ST13-04: Admin selects invalid or unavailable role/scope and creation is blocked

- Actor: System administrator.
- Expected outcome: Invalid role or organization scope is rejected by backend validation, and no partial assignment is stored.
- Related AC IDs: `AC-ST13-CREATE-06`, `AC-ST13-CREATE-08`
- Related TEST IDs: `T-ST13-CREATE-004`, `T-ST13-CREATE-005`, `T-ST13-CREATE-010`

### UC-ST13-05: Non-admin attempts create-user action and is denied

- Actor: Authenticated non-admin user.
- Expected outcome: UI/API denies create-user access and no mutation occurs.
- Related AC IDs: `AC-ST13-CREATE-07`
- Related TEST IDs: `T-ST13-CREATE-006`

### UC-ST13-06: Create-user API succeeds but UI form reset/close/update sequence must not crash

- Actor: System administrator.
- Expected outcome: Success feedback and list refresh happen without raw runtime errors; form reset/close only runs when safe.
- Related AC IDs: `AC-ST13-CREATE-02`, `AC-ST13-CREATE-03`, `AC-ST13-CREATE-10`, `AC-ST13-CREATE-11`
- Related TEST IDs: `T-ST13-CREATE-008`, `T-ST13-CREATE-009`, `T-ST13-CREATE-013`, `T-ST13-CREATE-014`

### UC-ST13-07: Create-user API fails and UI must not call unsafe reset on null form reference

- Actor: System administrator.
- Expected outcome: Failed create keeps form state where appropriate, shows a safe error, and does not attempt unsafe reset/close behavior.
- Related AC IDs: `AC-ST13-CREATE-03`, `AC-ST13-CREATE-10`
- Related TEST IDs: `T-ST13-CREATE-007`, `T-ST13-CREATE-009`

### UC-ST13-08: Network/server error during create user shows safe retryable error and preserves form state

- Actor: System administrator.
- Expected outcome: Network/server failure shows safe retryable feedback, preserves entered values where appropriate, and does not leak raw runtime details.
- Related AC IDs: `AC-ST13-CREATE-02`, `AC-ST13-CREATE-10`, `AC-ST13-CREATE-12`
- Related TEST IDs: `T-ST13-CREATE-007`, `T-ST13-CREATE-009`, `T-ST13-CREATE-012`

## UC-ST-1.3-03: Update user profile fields

- Actor: System administrator.
- Preconditions: Target user exists. Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin opens target user edit flow.
  2. Admin updates display name.
  3. System validates and saves the change.
  4. System writes audit log for profile update.
- Alternate/error flows:
  - Target user is missing.
  - Invalid display name is rejected.
  - Non-admin actor receives forbidden response.
- Postconditions: Target user profile reflects updated display name.
- Related AC IDs: `AC-ST-1.3-03-01`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`
- Related AUD IDs: `AUD-ST-1.3-02`
- Related TEST IDs: `TEST-ST-1.3-SVC-02`, `TEST-ST-1.3-API-03`, `TEST-ST-1.3-WEB-03`, `TEST-ST-1.3-AUD-02`

## UC-ST-1.3-04: Update user role assignment

- Actor: System administrator.
- Preconditions: Target user and target role exist. Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin opens target user role assignment.
  2. Admin selects valid role assignment.
  3. System saves role assignment.
  4. System writes audit log for role change.
- Alternate/error flows:
  - Invalid role is rejected.
  - Missing actor role context fails closed.
  - Current-user context must refresh or re-resolve the changed role on next check.
- Postconditions: Target user has updated role assignment.
- Related AC IDs: `AC-ST-1.3-04-01`, `AC-ST-1.3-08-01`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-03`, `AUTH-ST-1.3-05`
- Related AUD IDs: `AUD-ST-1.3-03`
- Related TEST IDs: `TEST-ST-1.3-SVC-03`, `TEST-ST-1.3-API-04`, `TEST-ST-1.3-WEB-03`, `TEST-ST-1.3-AUD-03`

## UC-ST-1.3-05: Update user organization scope

- Actor: System administrator.
- Preconditions: Target user and target organization/unit scope exist. Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin opens target user organization scope assignment.
  2. Admin selects valid organization/unit scope.
  3. System saves organization scope assignment.
  4. System writes audit log for scope change.
- Alternate/error flows:
  - Invalid organization/unit scope is rejected.
  - Missing actor scope context fails closed.
  - Current-user context must refresh or re-resolve the changed scope on next check.
- Postconditions: Target user has updated organization scope assignment.
- Related AC IDs: `AC-ST-1.3-05-01`, `AC-ST-1.3-08-01`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-03`, `AUTH-ST-1.3-05`
- Related AUD IDs: `AUD-ST-1.3-04`
- Related TEST IDs: `TEST-ST-1.3-SVC-04`, `TEST-ST-1.3-API-05`, `TEST-ST-1.3-WEB-03`, `TEST-ST-1.3-AUD-04`

## UC-ST-1.3-06: Lock or deactivate user

- Actor: System administrator.
- Preconditions: Target user exists and is not already in the same disabled state. Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin chooses lock/deactivate for target user.
  2. System records the new disabled status.
  3. System prevents target user from login or continuing protected flows.
  4. System writes audit log for lock/deactivate.
- Alternate/error flows:
  - Target user is missing.
  - Non-admin actor receives forbidden response.
  - Attempting to disable the last viable admin is an open policy question for owner review.
- Postconditions: Target user cannot authenticate or access protected flows.
- Related AC IDs: `AC-ST-1.3-06-01`, `AC-ST-1.3-06-02`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-04`
- Related AUD IDs: `AUD-ST-1.3-05`
- Related TEST IDs: `TEST-ST-1.3-SVC-05`, `TEST-ST-1.3-API-06`, `TEST-ST-1.3-WEB-04`, `TEST-ST-1.3-E2E-01`, `TEST-ST-1.3-AUD-05`, `TEST-ST-1.3-AUTH-02`

## UC-ST-1.3-07: Unlock or reactivate user

- Actor: System administrator.
- Preconditions: Target user exists and is locked/deactivated. Actor is authenticated, active, and resolved as system administrator.
- Main flow:
  1. Admin chooses unlock/reactivate for target user.
  2. System records active status.
  3. System allows target user to login again if credential is correct.
  4. System writes audit log for unlock/reactivate.
- Alternate/error flows:
  - Target user is missing.
  - Credential is wrong after reactivation, so login still fails.
  - Non-admin actor receives forbidden response.
- Postconditions: Target user can authenticate if credentials and all other policies pass.
- Related AC IDs: `AC-ST-1.3-07-01`, `AC-ST-1.3-07-02`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-04`
- Related AUD IDs: `AUD-ST-1.3-06`
- Related TEST IDs: `TEST-ST-1.3-SVC-06`, `TEST-ST-1.3-API-07`, `TEST-ST-1.3-WEB-04`, `TEST-ST-1.3-E2E-02`, `TEST-ST-1.3-AUD-06`, `TEST-ST-1.3-AUTH-03`

## UC-ST-1.3-08: Load current-user context with role and scope

- Actor: Any authenticated active user.
- Preconditions: User has valid session and active role/scope assignments.
- Main flow:
  1. User accesses current-user/session context.
  2. System resolves active user, role assignment and organization scope assignment.
  3. System returns safe current-user context for downstream enforcement.
- Alternate/error flows:
  - Locked/deactivated user is denied.
  - Missing role or scope context fails closed.
  - Non-sensitive fields only are returned.
- Postconditions: Downstream flows can enforce role/scope using current-user context.
- Related AC IDs: `AC-ST-1.3-08-01`
- Related AUTH IDs: `AUTH-ST-1.3-03`, `AUTH-ST-1.3-04`, `AUTH-ST-1.3-05`
- Related AUD IDs: None
- Related TEST IDs: `TEST-ST-1.3-API-08`, `TEST-ST-1.3-AUTH-04`
