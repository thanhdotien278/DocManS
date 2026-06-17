# ST-1.3 Acceptance Criteria

## Status

Draft for owner review

## UC-ST-1.3-01: List, search, and filter users

### AC-ST-1.3-01-01: Admin views user list

Given a system administrator is authenticated and active,
When they open user management or call the user list API,
Then the system returns user records with username, display name, role, organization scope and status,
And the response does not include password hashes, secrets or session tokens.

### AC-ST-1.3-01-02: Admin searches by username

Given a system administrator is on the user list,
When they enter a keyword matching a username and click "Lọc",
Then the system returns only user records whose username matches the trimmed keyword,
And the match is case-insensitive when the backend/database pattern supports it.

### AC-ST-1.3-01-03: Admin searches by display name

Given a system administrator is on the user list,
When they enter a keyword matching a display name and click "Lọc",
Then the system returns only user records whose display name matches the trimmed keyword,
And the response does not include password hashes, secrets or session tokens.

### AC-ST-1.3-01-04: Keyword is trimmed and empty keyword is safe

Given a system administrator enters keyword text with leading or trailing spaces,
When they click "Lọc",
Then the system applies search using the trimmed keyword,
And an empty keyword after trim is treated as no keyword filter rather than an error.

### AC-ST-1.3-01-05: Admin filters by role

Given a system administrator is on the user list,
When they select a role filter and click "Lọc",
Then the system returns only user records assigned to the selected role,
And selecting "Tất cả" is equivalent to not applying a role filter.

### AC-ST-1.3-01-06: Admin filters by organization

Given a system administrator is on the user list,
When they select an organization filter and click "Lọc",
Then the system returns only user records in the selected organization scope,
And selecting "Tất cả" is equivalent to not applying an organization filter.

### AC-ST-1.3-01-07: Admin filters by status

Given a system administrator is on the user list,
When they select a status filter and click "Lọc",
Then the system returns only user records with the selected status,
And selecting "Tất cả" is equivalent to not applying a status filter.

### AC-ST-1.3-01-08: Admin combines keyword, role, organization and status filters

Given a system administrator has entered keyword, role, organization and status filters,
When they click "Lọc",
Then the system returns only user records that match all applied conditions,
And backend filtering is the source of truth, not frontend-only state.

### AC-ST-1.3-01-09: Clear filter resets all filter fields

Given a system administrator has applied keyword, role, organization or status filters,
When they click "Xóa lọc",
Then keyword is cleared and role, organization and status return to "Tất cả",
And the system reloads the default user list.

### AC-ST-1.3-01-10: Empty state is shown for no results

Given a system administrator applies a keyword or filter combination with no matching user,
When the list response succeeds with zero records,
Then the UI shows an empty state,
And the result count reflects `0`.

### AC-ST-1.3-01-11: Filter does not expose unauthorized users

Given a user list/search/filter request is made,
When backend resolves the actor and applies query filters,
Then the response includes only users the actor is authorized to see,
And no filter value can bypass admin-only or future actor-scope enforcement.

### AC-ST-1.3-01-12: Error state is shown when filter request fails

Given a system administrator applies search or filter conditions,
When the backend/API request fails,
Then the UI shows an error state,
And stale data is not presented as confirmed filtered results.

### AC-ST-1.3-01-13: UI keeps applied filter values visible

Given a system administrator applies keyword, role, organization or status filters,
When the filtered list is displayed,
Then the UI keeps the applied filter values visible,
And those values remain until the admin changes them or clicks "Xóa lọc".

### AC-ST-1.3-01-14: Result count reflects filtered results

Given a system administrator applies search or filters,
When the system displays the user list,
Then the result count reflects the current filtered result set,
And it does not show the unfiltered total as the filtered count.

## UC-ST-1.3-02: Create user with role and organization scope

### AC-ST-1.3-02-01: Admin creates user with valid role and scope

Given a system administrator provides username, display name, initial password, valid role and valid organization scope,
When they submit create user,
Then the system creates the user,
And stores the role assignment and organization scope assignment,
And records audit log `AUD-ST-1.3-01`,
And the UI shows success feedback, refreshes or updates the user list, and resets or closes form state only when safe.

### AC-ST-1.3-02-02: Duplicate username is blocked

Given a user already exists with username `X`,
When a system administrator tries to create another user with username `X`,
Then the system rejects the request,
And no second user is created.

### AC-ST-1.3-02-03: Missing mandatory role or scope is blocked

Given role and organization scope are confirmed mandatory for ST-1.3,
When a system administrator submits create user without role or without organization scope,
Then the system rejects the request,
And no user is created.

## ST13 create-user defect/regression acceptance criteria

These criteria refine the create-user behavior for defect `DEF-ST13-USER-CREATE-RESET-NULL` and use stable IDs requested for later implementation traceability.

### AC-ST13-CREATE-01: Successful create persists complete user context

Given a system administrator submits valid username, display name, initial password, role and organization scope,
When create user succeeds,
Then the system persists the user, assigned role(s), organization scope, active/default status and timestamps needed by the approved data model,
And the created user appears in the user list after refresh or local list update.

### AC-ST13-CREATE-02: Successful create shows safe success feedback

Given create user succeeds,
When the UI presents the result,
Then the admin sees success feedback,
And the UI does not show raw JavaScript/runtime error text.

### AC-ST13-CREATE-03: Form reset/close is safe

Given create user succeeds or fails,
When the UI attempts to reset, close or update the create form,
Then reset/close behavior happens only when the form instance/state is available,
And no null form reset call is possible from the specified behavior.

### AC-ST13-CREATE-04: Required fields are blocked with inline validation

Given a system administrator leaves username, display name, initial password, role or organization scope empty or invalid,
When they submit create user,
Then the UI/API blocks creation with inline or form-level validation,
And no user is created.

### AC-ST13-CREATE-05: Duplicate username has a clear Vietnamese business error

Given a user already exists with the submitted username,
When a system administrator submits create user,
Then creation is rejected,
And the admin sees a clear Vietnamese message that the username already exists,
And no duplicate user is created.

### AC-ST13-CREATE-06: Invalid role or organization scope is rejected by backend

Given the submitted role or organization scope is invalid, unavailable or outside the allowed catalog,
When create user is submitted,
Then backend validation rejects the request,
And no user/assignment inconsistency is persisted.

### AC-ST13-CREATE-07: Unauthorized users cannot create accounts

Given an actor is unauthenticated or is not a system administrator,
When they attempt create-user from UI or API,
Then access is denied,
And no user, role assignment or organization scope assignment is created.

### AC-ST13-CREATE-08: Failed create has no partial persistence

Given user creation, role assignment or organization scope assignment fails,
When create user returns an error,
Then the system does not leave partial role/scope assignments or inconsistent user records.

### AC-ST13-CREATE-09: Successful create is audited

Given create user succeeds,
When the transaction completes,
Then an audit log exists for user creation and role/scope assignment,
And audit details exclude password or secret values.

### AC-ST13-CREATE-10: Create-user UI states follow admin UX guidelines

Given an admin uses the create-user flow,
When loading, empty, success, validation or error states occur,
Then the UI follows the institutional admin UX guidelines with clear, work-focused feedback and no raw runtime errors.

### AC-ST13-CREATE-11: Create-user flow is responsive

Given an admin uses the create-user flow at required project breakpoints,
When the viewport is 390px, 768px or 1440px wide,
Then the form, validation feedback, buttons and list update remain usable without full-page horizontal scroll.

### AC-ST13-CREATE-12: Password and secrets never leak

Given an initial password or secret value is submitted,
When create user succeeds or fails,
Then password/secret values are never logged, displayed after submit, returned in API response or included in audit details.

## UC-ST-1.3-03: Update user profile fields

### AC-ST-1.3-03-01: Admin updates display name

Given a target user exists,
When a system administrator updates the target user's display name,
Then the new display name is saved,
And audit log `AUD-ST-1.3-02` is recorded.

## UC-ST-1.3-04: Update user role assignment

### AC-ST-1.3-04-01: Admin updates role assignment

Given a target user exists and a target role is valid,
When a system administrator changes the target user's role assignment,
Then the role assignment is saved,
And current-user context reflects the new role on the next context resolution,
And audit log `AUD-ST-1.3-03` is recorded.

## UC-ST-1.3-05: Update user organization scope

### AC-ST-1.3-05-01: Admin updates organization scope

Given a target user exists and a target organization scope is valid,
When a system administrator changes the target user's organization scope,
Then the organization scope assignment is saved,
And current-user context reflects the new scope on the next context resolution,
And audit log `AUD-ST-1.3-04` is recorded.

## UC-ST-1.3-06: Lock or deactivate user

### AC-ST-1.3-06-01: Admin locks or deactivates user

Given a target user is active,
When a system administrator locks or deactivates the target user,
Then the target user's status changes to the disabled state selected by the admin,
And the status is visible in user management,
And audit log `AUD-ST-1.3-05` is recorded.

### AC-ST-1.3-06-02: Locked or deactivated user cannot login or continue protected flow

Given a user is locked or deactivated,
When they attempt to login or access a protected flow with an existing session,
Then the system denies access safely,
And protected business data is not returned.

## UC-ST-1.3-07: Unlock or reactivate user

### AC-ST-1.3-07-01: Admin unlocks or reactivates user

Given a target user is locked or deactivated,
When a system administrator unlocks or reactivates the target user,
Then the target user's status becomes active or otherwise login-eligible,
And audit log `AUD-ST-1.3-06` is recorded.

### AC-ST-1.3-07-02: Unlocked or reactivated user can login with valid credential

Given a user has been unlocked or reactivated,
When they login with correct credentials,
Then the system authenticates them if no other policy blocks access,
And current-user context can be resolved.

## UC-ST-1.3-08: Load current-user context with role and scope

### AC-ST-1.3-08-01: Current-user context reflects active role and scope

Given an authenticated active user has role and organization scope assignments,
When current-user context is loaded,
Then the response includes the active role and organization scope needed for downstream enforcement,
And no sensitive credential/session secret is returned.

## Cross-cutting authorization and audit criteria

### AC-ST-1.3-09-01: Non-admin is blocked from user management

Given an authenticated user is not a system administrator,
When they access user admin page or user admin API,
Then the system denies access,
And the backend does not perform the requested user management action.

### AC-ST-1.3-09-02: Audit log is expected for all mutating admin actions

Given a system administrator successfully performs create user, update profile, change role, change scope, lock/deactivate or unlock/reactivate,
When the action completes,
Then the corresponding `AUD-ST-1.3-*` audit record is expected for later implementation verification.
