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
- Alternate/error flows:
  - Duplicate username is rejected.
  - Missing role or organization scope is rejected when mandatory policy is confirmed.
  - Invalid role or organization scope is rejected.
  - Audit logging failure follows the later implementation policy, with expected fail-safe behavior documented before coding.
- Postconditions: New user appears in admin list with assigned role, organization scope and status.
- Related AC IDs: `AC-ST-1.3-02-01`, `AC-ST-1.3-02-02`, `AC-ST-1.3-02-03`
- Related AUTH IDs: `AUTH-ST-1.3-01`, `AUTH-ST-1.3-02`, `AUTH-ST-1.3-03`
- Related AUD IDs: `AUD-ST-1.3-01`
- Related TEST IDs: `TEST-ST-1.3-SVC-01`, `TEST-ST-1.3-API-02`, `TEST-ST-1.3-WEB-02`, `TEST-ST-1.3-AUD-01`

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
