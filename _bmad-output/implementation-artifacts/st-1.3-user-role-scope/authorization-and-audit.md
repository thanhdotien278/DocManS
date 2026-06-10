# ST-1.3 Authorization And Audit

## Status

Draft for owner review

## Authorization IDs

### AUTH-ST-1.3-01: Admin-only access to user management

- Description: Only system administrator may access user management UI/API.
- Trigger: Any request to list, search, filter, create, update, assign role, assign scope, lock/deactivate or unlock/reactivate users.
- Required data: Actor user id, actor active status, actor role assignment.
- Success expectation: System administrator is allowed to continue to later validation.
- Failure expectation: Non-admin or inactive actor receives safe forbidden/unauthorized response and no mutation occurs.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01` through `UC-ST-1.3-07`; `AC-ST-1.3-01-01` through `AC-ST-1.3-01-14`, `AC-ST-1.3-09-01`; `TEST-ST-1.3-AUTH-01`, `TEST-ST-1.3-AUTH-FILTER-01`

### AUTH-ST-1.3-02: Backend enforcement for all user admin APIs

- Description: Backend must enforce all user admin permissions; frontend-only checks are insufficient.
- Trigger: Any user admin API request.
- Required data: Server-side session/current-user context, resolved actor role.
- Success expectation: Authorized admin requests proceed; unauthorized requests are blocked before business mutation.
- Failure expectation: Missing or invalid server-side auth context fails closed.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01` through `UC-ST-1.3-07`; `AC-ST-1.3-01-02` through `AC-ST-1.3-01-14`, `AC-ST-1.3-09-01`; `TEST-ST-1.3-AUTH-01`, `TEST-ST-1.3-AUTH-FILTER-01`

### AUTH-ST-1.3-FILTER-01: Only system administrator can list/search/filter users

- Description: User list/search/filter page and API are admin-only.
- Trigger: Any user list/search/filter UI load or API request.
- Required data: Actor user id, active status, resolved system administrator role.
- Success expectation: System administrator can request default list and filtered list.
- Failure expectation: Non-admin or inactive actor receives forbidden/unauthorized response and no user list data.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01`; `AC-ST-1.3-01-01` through `AC-ST-1.3-01-14`, `AC-ST-1.3-09-01`; `TEST-ST-1.3-AUTH-FILTER-01`

### AUTH-ST-1.3-FILTER-02: Backend enforces permission on every filter query

- Description: Backend applies authorization before and during every list/search/filter query; UI state is not trusted.
- Trigger: User list API receives `keyword`, `roleId`, `roleCode`, `organizationId`, `status` or pagination params.
- Required data: Server-side session/current-user context, resolved actor role, actor scope if applicable.
- Success expectation: Authorized filters return only safe user rows and safe count metadata.
- Failure expectation: Missing, invalid or unauthorized context fails closed before records are returned.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01`; `AC-ST-1.3-01-02` through `AC-ST-1.3-01-14`; `TEST-ST-1.3-API-FILTER-01` through `TEST-ST-1.3-API-FILTER-08`, `TEST-ST-1.3-AUTH-FILTER-01`

### AUTH-ST-1.3-FILTER-03: Filter/list does not leak users outside actor scope

- Description: If hierarchical or scoped administrators are introduced later, list/search/filter must apply actor scope before returning rows or counts.
- Trigger: Any current or future scoped admin list/search/filter query.
- Required data: Actor role, actor organization scope, requested filter values.
- Success expectation: Rows and result count include only records visible to the actor.
- Failure expectation: Filter values cannot expand visibility beyond actor scope.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01`; `AC-ST-1.3-01-11`, `AC-ST-1.3-01-14`; `TEST-ST-1.3-API-FILTER-07`, `TEST-ST-1.3-AUTH-FILTER-01`

### AUTH-ST-1.3-03: Fail closed when actor role/scope cannot be resolved

- Description: If the system cannot resolve actor role or required scope context safely, access is denied.
- Trigger: Session/current-user resolution or any protected admin operation.
- Required data: Actor user id, active status, role assignment, organization scope assignment when required.
- Success expectation: Complete context is available before protected behavior runs.
- Failure expectation: Ambiguous, missing or inconsistent context returns safe denial.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01`, `UC-ST-1.3-04`, `UC-ST-1.3-05`, `UC-ST-1.3-08`; `AC-ST-1.3-08-01`; `TEST-ST-1.3-AUTH-04`

### AUTH-ST-1.3-04: Prevent deactivated/locked users from authenticated access

- Description: Locked/deactivated users cannot login or continue protected flows.
- Trigger: Login attempt, current-user resolution, protected route/API access.
- Required data: Target user active/locked/deactivated status.
- Success expectation: Active users may continue if all other policies pass.
- Failure expectation: Locked/deactivated users receive safe denial and no protected data.
- Related UC/AC/TEST IDs: `UC-ST-1.3-06`, `UC-ST-1.3-07`, `UC-ST-1.3-08`; `AC-ST-1.3-06-02`, `AC-ST-1.3-07-02`; `TEST-ST-1.3-AUTH-02`, `TEST-ST-1.3-AUTH-03`

### AUTH-ST-1.3-05: Current-user context must reflect active role/scope assignments

- Description: Current-user context must derive role/scope from persisted active assignments.
- Trigger: Current-user context load after login or protected flow check.
- Required data: User id, active status, role assignments, organization scope assignments.
- Success expectation: Context returns current role/scope values for downstream enforcement.
- Failure expectation: Stale, missing or inconsistent assignment context fails closed.
- Related UC/AC/TEST IDs: `UC-ST-1.3-04`, `UC-ST-1.3-05`, `UC-ST-1.3-08`; `AC-ST-1.3-04-01`, `AC-ST-1.3-05-01`, `AC-ST-1.3-08-01`; `TEST-ST-1.3-API-08`, `TEST-ST-1.3-AUTH-04`

## Audit IDs

Normal list/search/filter read operations do not require a business audit log in ST-1.3. Security access logs may capture request metadata if available. Add business audit for read access only if owner later approves an admin-sensitive read-audit policy.

### AUD-ST-1.3-01: Create user

- Description: Audit successful user creation.
- Trigger: Admin creates user.
- Required data: Actor id, target user id, username, assigned role id/name, organization scope id/name, result, timestamp.
- Success expectation: Audit record exists without storing password or secret.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-02`; `AC-ST-1.3-02-01`; `TEST-ST-1.3-AUD-01`

### AUD-ST-1.3-02: Update user profile

- Description: Audit user profile field update.
- Trigger: Admin updates display name or other approved profile fields.
- Required data: Actor id, target user id, changed fields, safe before/after values, result, timestamp.
- Success expectation: Audit record shows profile change trace.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-03`; `AC-ST-1.3-03-01`; `TEST-ST-1.3-AUD-02`

### AUD-ST-1.3-03: Change role assignment

- Description: Audit role assignment change.
- Trigger: Admin changes target user's role assignment.
- Required data: Actor id, target user id, old role assignment, new role assignment, result, timestamp.
- Success expectation: Audit record shows who changed which role assignment.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-04`; `AC-ST-1.3-04-01`; `TEST-ST-1.3-AUD-03`

### AUD-ST-1.3-04: Change organization scope

- Description: Audit organization/unit scope assignment change.
- Trigger: Admin changes target user's organization scope.
- Required data: Actor id, target user id, old scope assignment, new scope assignment, result, timestamp.
- Success expectation: Audit record shows who changed which organization scope.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-05`; `AC-ST-1.3-05-01`; `TEST-ST-1.3-AUD-04`

### AUD-ST-1.3-05: Lock/deactivate user

- Description: Audit disabling a user through lock or deactivation.
- Trigger: Admin locks or deactivates target user.
- Required data: Actor id, target user id, old status, new status, reason if captured, result, timestamp.
- Success expectation: Audit record shows disabled status transition.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-06`; `AC-ST-1.3-06-01`; `TEST-ST-1.3-AUD-05`

### AUD-ST-1.3-06: Unlock/reactivate user

- Description: Audit enabling a user through unlock or reactivation.
- Trigger: Admin unlocks or reactivates target user.
- Required data: Actor id, target user id, old status, new status, reason if captured, result, timestamp.
- Success expectation: Audit record shows enabled status transition.
- Failure expectation: Later implementation must define whether mutation fails if audit write fails.
- Related UC/AC/TEST IDs: `UC-ST-1.3-07`; `AC-ST-1.3-07-01`; `TEST-ST-1.3-AUD-06`
