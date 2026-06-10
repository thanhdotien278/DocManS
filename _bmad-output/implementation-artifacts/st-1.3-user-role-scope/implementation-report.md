# ST-1.3 User Search/Filter Implementation Report

## Summary

Implemented `UC-ST-1.3-01` list/search/filter behavior for the user management screen and backend API.

The backend now supports `keyword`, `roleCode`, `roleId`, `organizationId`, `organization`, and `status` query inputs. `keyword` is trimmed and matches `username` or `displayName` case-insensitively through Prisma. Role filtering uses the existing denormalized `users.role` for `roleCode` and the existing `UserRoleAssignment.roleId` relation for `roleId`. Organization filtering uses the existing `UserOrganizationScope.organizationUnitId` relation for `organizationId`, while retaining the older `organization` name filter for compatibility. No new role or organization model was created.

The frontend Users panel now submits the spec-aligned query fields, keeps applied values visible, uses `organizationId` from the existing organization list, displays filtered result count from the API, shows loading/error states, and shows a distinct no-results empty state for filtered searches. "Xóa lọc" clears keyword, role, organization, and status before reloading the default list.

## Spec Files Used

- `story-spec.md`
- `use-cases.md`
- `acceptance-criteria.md`
- `authorization-and-audit.md`
- `test-plan.md`
- `traceability-matrix.md`
- `implementation-plan.md`
- `spec-review-checklist.md`

## AC IDs Covered

- `AC-ST-1.3-01-01`
- `AC-ST-1.3-01-02`
- `AC-ST-1.3-01-03`
- `AC-ST-1.3-01-04`
- `AC-ST-1.3-01-05`
- `AC-ST-1.3-01-06`
- `AC-ST-1.3-01-07`
- `AC-ST-1.3-01-08`
- `AC-ST-1.3-01-09`
- `AC-ST-1.3-01-10`
- `AC-ST-1.3-01-11`
- `AC-ST-1.3-01-12`
- `AC-ST-1.3-01-13`
- `AC-ST-1.3-01-14`

## TEST IDs Covered

- Automated/API: `TEST-ST-1.3-API-FILTER-01` through `TEST-ST-1.3-API-FILTER-08`
- Automated/auth: existing admin-only controller guard coverage supports `TEST-ST-1.3-AUTH-FILTER-01`
- Build/typecheck/manual-by-code-path: `TEST-ST-1.3-WEB-FILTER-01` through `TEST-ST-1.3-WEB-FILTER-04`

No new frontend test framework was introduced.

## Files Changed

- `apps/api/src/admin/admin-users.controller.ts`
- `apps/api/src/admin/admin-users.service.ts`
- `apps/web/src/lib/admin-api.ts`
- `apps/web/src/components/admin/admin-users-panel.tsx`
- `tests/admin-foundation.test.mjs`
- `_bmad-output/implementation-artifacts/st-1.3-user-role-scope/traceability-matrix.md`
- `_bmad-output/implementation-artifacts/st-1.3-user-role-scope/implementation-report.md`

## APIs Changed

- `GET /api/v1/users`
  - Accepts `keyword`, `roleCode`, `roleId`, `organizationId`, `organization`, and `status`.
  - Keeps compatibility with existing `search` and `role` aliases.
  - Returns `{ users, total }`, where `total` is the filtered result count.
  - Still requires system administrator authorization through the existing backend guard.
  - Does not return password hashes, tokens, or secrets.

## UI Changed

- User filter form now submits:
  - `keyword`
  - `roleCode`
  - `organizationId`
  - `status`
- The role dropdown uses existing role codes.
- The organization dropdown uses existing organization unit IDs.
- The result count reflects filtered API results.
- Empty state distinguishes "no users yet" from "no users match current filters".
- Loading and error states remain visible around filter requests.
- Clear filter resets all filter controls and reloads the default list.

## Tests Added/Updated

- `tests/admin-foundation.test.mjs`
  - Added `TEST-ST-1.3-API-FILTER-01..08` coverage for default list, username search, display name search, role code, role id, organization id, status, combined filters, no-result behavior, no business audit on read-only list/filter, and invalid status rejection.
  - Existing non-admin controller guard test continues to cover admin-only access for the list/filter API.

## Commands Run

- `npm test`
  - First RED run failed on the new `keyword` contract, as expected.
- `npm test`
  - Passed after implementation: 36 tests, 4 suites.
- `npm run lint`
  - Passed.
- `npm run build`
  - Passed.
- `npm run prisma:generate`
  - Ran as part of `npm test` and `npm run build`; no migration was created.

## Manual Verification Results

- Automated API tests verified the backend filter semantics.
- Typecheck/build verified the frontend code path compiles.
- Full browser flow was not run in this pass because no frontend E2E framework is currently present and no new framework was introduced for this scope.

## Known Limitations

- `organization` by name is retained only for compatibility; the spec-aligned UI now uses `organizationId`.
- Invalid `status` is rejected. Unknown `roleCode`, `roleId`, or `organizationId` safely returns no rows through the database filter rather than crashing.
- API `total` currently reflects the returned filtered list length; pagination is not introduced in this change.

## Deferred Work

- Add full Playwright E2E coverage for `TEST-ST-1.3-WEB-FILTER-01` through `TEST-ST-1.3-WEB-FILTER-04` when the project standardizes frontend E2E tests.
- If pagination is introduced later, move `total` to a database count query.
- Owner decisions on separate `locked` vs `deactivated` semantics remain outside this filter-only scope.

## Confirmation

- No hard delete behavior was implemented.
- No Prisma schema change or migration was added.
- No new role or organization model was added.
- No business audit log was added for read-only list/search/filter operations.
