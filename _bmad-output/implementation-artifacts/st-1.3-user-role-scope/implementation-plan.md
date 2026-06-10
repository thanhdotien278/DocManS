# ST-1.3 Later Implementation Plan

## Status

Draft for owner review

This file is a plan only. Do not implement until owner approves the spec. All implementation status values are `not-started`; all review status values are `pending-owner-review`.

## Phase 0: Owner review and approval of spec

- Goal: Confirm the ST-1.3 functional boundary, status model, role model, organization scope model and deferred decisions.
- Expected files to touch later: None.
- Risks: Implementing before owner resolves lock vs deactivate, single vs multiple roles, and scope cardinality could cause rework.
- Verification: Owner approves this spec folder or requests edits.
- Related UC/AC/TEST IDs: All `UC-ST-1.3-*`, all `AC-ST-1.3-*`, all `TEST-ST-1.3-*`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 1: Discovery existing implementation

- Goal: Inspect current auth/session, user model, role data, organization data, audit log and admin UI patterns before coding.
- Expected files to touch later: None during discovery; likely read `apps/api/`, `apps/web/`, Prisma schema, seed data, tests and BMAD context files.
- Risks: Existing list/create UI may already exist but not cover update/status; coding without discovery may duplicate patterns.
- Verification: Produce a short discovery note or implementation checklist before code changes.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01` through `UC-ST-1.3-08`; `TEST-ST-1.3-API-01`, `TEST-ST-1.3-WEB-01`, `TEST-ST-1.3-AUTH-04`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 1A: Backend discovery for user list/search/filter

- Goal: Verify the current user list API, query params, pagination behavior, role model, organization model and status values before coding filter behavior.
- Expected files to touch later: None during discovery; read only the current admin user controller/service, DTOs if present, API client helper, role/org/status seed/model definitions and existing tests.
- Discovery checklist:
  - Check whether the list users API already accepts `keyword`, `roleId`, `roleCode`, `organizationId`, `status`, page or limit params.
  - Check whether role filtering should use `roleId`, `roleCode`, or both.
  - Check whether organization filtering uses a direct organization id, unit id, or assignment table relation.
  - Check current status values and align them with the owner-approved status model.
  - Check current list response shape for rows, total/result count and pagination metadata.
- Risks: Implementing filter params before confirming current API shape may break existing admin user list behavior.
- Verification: Discovery note or implementation checklist confirms exact query contract before code changes.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01`; `AC-ST-1.3-01-01` through `AC-ST-1.3-01-14`; `TEST-ST-1.3-API-FILTER-01` through `TEST-ST-1.3-API-FILTER-08`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 2: Backend API/service/dto/auth/audit

- Goal: Implement admin-only user service/API behavior for create/list/update/role/scope/status and current-user context enforcement.
- Expected files to touch later:
  - Backend user/admin module files under `apps/api/src/` after discovery identifies exact module boundaries.
  - DTO/validation files under the same backend module.
  - Auth/session/current-user enforcement files only where needed for locked/deactivated behavior.
  - Audit log service integration files.
  - Prisma schema/migration only after owner approves data model changes.
- Filtering tasks later:
  - Add or complete query DTO for `keyword`, `roleId` or `roleCode`, `organizationId`, `status` and existing pagination params.
  - Trim keyword and treat empty keyword as no keyword filter.
  - Apply username/displayName search and role/organization/status filters in service/repository layer.
  - Preserve admin-only guard and future actor-scope enforcement before returning rows or count metadata.
  - Reject invalid filter values unless owner approves ignore-invalid behavior.
- Risks: Backend-only enforcement can be incomplete if UI state is mistaken for authorization; locked/deactivated users with existing sessions must be handled.
- Verification: Service/API/auth/audit tests pass for `TEST-ST-1.3-SVC-*`, `TEST-ST-1.3-API-*`, `TEST-ST-1.3-AUD-*`, `TEST-ST-1.3-AUTH-*`.
- Related UC/AC/TEST IDs: All UCs; all ACs; all backend, audit and auth tests.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 3: Frontend user management UI

- Goal: Complete admin UI for list/search/filter/create/edit/role/scope/status actions without relying on frontend permission as the only control.
- Expected files to touch later:
  - User management page/component files under `apps/web/src/` after discovery identifies current location.
  - User admin API client helpers under `apps/web/src/lib/` if needed.
  - Navigation entry only if current app shell pattern requires it.
- Filtering tasks later:
  - Wire keyword, role, organization and status form state to the list API query.
  - Implement "Lọc" to submit all current filter values.
  - Implement "Xóa lọc" to clear keyword, reset dropdowns to "Tất cả" and reload default list.
  - Keep applied filter values visible after "Lọc".
  - Show loading, empty and error states for filter requests.
- Risks: UI may expose actions to non-admin if shell guard is incomplete; frontend state may drift from backend status/assignment values.
- Verification: UI/manual tests cover `TEST-ST-1.3-WEB-01` through `TEST-ST-1.3-WEB-04` and `TEST-ST-1.3-WEB-FILTER-01` through `TEST-ST-1.3-WEB-FILTER-04`.
- Related UC/AC/TEST IDs: `UC-ST-1.3-01` through `UC-ST-1.3-07`; `AC-ST-1.3-01-01` through `AC-ST-1.3-07-02`; `TEST-ST-1.3-WEB-*`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 4: Tests and manual verification

- Goal: Verify service, API, web, E2E, audit and authorization behavior with focused tests and seeded/manual users.
- Expected files to touch later:
  - Focused test files in the existing test layout.
  - Test helpers/fixtures only if existing patterns require them.
  - No unrelated formatter or repo-wide churn.
- Risks: Tests may pass for happy path while missing non-admin, locked/deactivated or missing role/scope fail-closed cases.
- Verification: Run smallest reliable commands selected after discovery; include manual checks for admin, non-admin, locked/deactivated and reactivated users.
- Manual filter flow later with Playwright or chrome_devtools:
  1. Login admin.
  2. Open Users.
  3. Search username.
  4. Search display name.
  5. Filter role.
  6. Filter organization.
  7. Filter status.
  8. Combine keyword, role, organization and status.
  9. Clear filters.
  10. Check non-admin access is forbidden for user list/filter page and API.
- Related UC/AC/TEST IDs: All `TEST-ST-1.3-*`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`

## Phase 5: BMAD review and report

- Goal: Review completed implementation against this traceability spec before moving to the next story.
- Expected files to touch later:
  - Story log or BMAD review/report artifact if the repo workflow requires it.
  - Sprint tracker only after implementation status is verified.
- Risks: Marking story complete without audit/auth verification would weaken downstream EP-02 and dashboard/reporting authorization.
- Verification: BMAD review cites evidence for each UC/AC/AUTH/AUD/TEST and produces an explicit gate result.
- Related UC/AC/TEST IDs: All `UC-ST-1.3-*`, `AC-ST-1.3-*`, `AUTH-ST-1.3-*`, `AUD-ST-1.3-*`, `TEST-ST-1.3-*`.
- Implementation status: `not-started`
- Review status: `pending-owner-review`
