# ST-1.4 Review Report - Permission primitives, catalogs, and base configuration

## 1. Review Summary
- Overall status: PARTIAL
- Decision: Needs implementation patches
- Reviewed commit/branch: `bmad/ep-01-foundation` at `d0ff701`, with uncommitted working-tree changes present
- Date/time: 2026-06-10 18:54:38 +07

## 2. Source Traceability
Sources reviewed:
- ST-1.4 story section: `_bmad-output/epics-and-stories.md` lines 489-535
- FR6, FR7, FR8: `_bmad-output/prd.md` lines 310-315 and `_bmad-output/epics-and-stories.md` lines 56-60
- Authorization requirements: `_bmad-output/epics-and-stories.md` line 525; `_bmad-output/prd.md` lines 524-526; `_bmad-output/project-context.md` authorization rules
- Audit-log requirements: `_bmad-output/epics-and-stories.md` line 528; `_bmad-output/project-context.md` audit logging rules
- UX requirements: `docs/ux-design-guidelines.md` responsive, state, validation, and accessibility rules
- Architecture/project-context rules: `_bmad-output/architecture.md` lines 172, 925; `_bmad-output/project-context.md`
- Code and tests reviewed: `apps/api/src/admin/*`, `apps/api/src/permissions/permission-policy.ts`, `packages/permissions/src/index.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260609000000_ep01_admin_foundation/migration.sql`, `apps/api/prisma/seed.mjs`, `apps/web/src/components/admin/*`, `apps/web/src/lib/admin-api.ts`, `tests/admin-foundation.test.mjs`, `tests/smoke.test.mjs`

## 3. Acceptance Criteria Matrix

| ID | Requirement / AC | Expected | Evidence found | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| ST-1.4-AC-01 Catalog add/update works | Supported catalog records can be added and updated, ready for later modules | DB model and migration exist for generic `CatalogItem`; API has list/create/update/soft delete; seed covers research fields, proposal types, priorities, report types, scoring criteria | `apps/api/prisma/schema.prisma` lines 126-140; `apps/api/src/admin/admin-catalogs.controller.ts` lines 27-48; `apps/api/prisma/seed.mjs` lines 154-170 | PARTIAL | Backend exists, but UI only supports list/create; tests only cover create, not update or soft delete |
| ST-1.4-AC-02 Config/template update works without code change | Admin can update system parameters and notification templates stored in DB and retrievable from backend | DB models and API list/upsert exist; UI forms submit parameter/template updates | `apps/api/prisma/schema.prisma` lines 143-160; `apps/api/src/admin/admin-config.service.ts` lines 26-82; `apps/web/src/components/admin/admin-config-panel.tsx` lines 40-96 | PARTIAL | Stored as plain strings; no type/value metadata beyond non-empty string validation; no explicit duplicate-key behavior beyond upsert |
| ST-1.4-AC-03 Permission primitives combine role/scope/state | Shared permission primitive combines role, org scope, and state context under one convention | Primitive type includes roles, organization scope, owner, resource organization, and workflow state | `packages/permissions/src/index.ts` lines 33-40 | PARTIAL | Current decision logic does not use resource owner, resource org, or workflow state, except requiring org scope after admin foundation branch |
| ST-1.4-AC-04 Permission primitives fail closed | Missing actor, role, scope, or ambiguous context denies by default | Missing user/roles deny; missing org scope denies for non-admin paths; tests cover empty context | `packages/permissions/src/index.ts` lines 52-85; `tests/admin-foundation.test.mjs` lines 459-473 | PARTIAL | Fail-closed unit check exists, but backend enforcement does not call the primitive |
| ST-1.4-AUTH-01 Admin-only catalog/config management | Only system administrators can access catalog/config management; backend must enforce | Controllers are guarded by session auth and call `assertSystemAdmin` | `apps/api/src/admin/admin-catalogs.controller.ts` lines 22-48; `apps/api/src/admin/admin-config.controller.ts` lines 18-44 | PARTIAL | Catalog create non-admin test exists; config non-admin and catalog list/update/delete non-admin tests are missing |
| ST-1.4-AUD-01 Audit catalog create/update/soft-delete | Audit log records create/update/soft delete catalog changes with actor, action, target type/id, timestamp, and useful context | Service records create/update/soft-delete catalog actions with actor and target metadata | `apps/api/src/admin/admin-catalogs.service.ts` lines 40-47, 87-94, 108-115; `apps/api/src/auth/audit-log.service.ts` lines 51-80 | PARTIAL | No before/after context; tests cover create only; soft delete can throw raw Prisma not-found if id is missing |
| ST-1.4-AUD-02 Audit system parameter/template update | Audit log records parameter/template updates with actor, action, target type/id, timestamp, and useful context | Service records update-system-parameter and update-notification-template actions | `apps/api/src/admin/admin-config.service.ts` lines 43-50 and 72-79 | PARTIAL | No before/after context or changed field context; tests do not assert actor/target metadata for these records |
| ST-1.4-TEST-01 Required tests/manual checks exist | Tests/manual checks prove catalog create/update/soft-delete, config/template update, permission fail-closed, non-admin forbidden, and audit log creation | `npm test`, `npm run lint`, and `npm run build` pass; some unit tests exist | `tests/admin-foundation.test.mjs` lines 407-473 | PARTIAL | Missing required tests for catalog update/soft-delete, non-admin config, config/template audit metadata, and backend use of permission primitive |
| ST-1.4-UX-01 Admin UI follows reusable list/form and UX baseline | Institutional admin UI with loading/empty/error, inline validation, confirmation for destructive action, responsive checks, accessible labels/focus | Catalog/config pages use admin components, labels, loading/empty/error, mobile list/table wrappers | `apps/web/src/components/admin/admin-catalogs-panel.tsx` lines 70-158; `apps/web/src/components/admin/admin-config-panel.tsx` lines 98-183 | PARTIAL | No catalog edit/delete/deactivate UI or confirmation; no recorded 390/768/1440 viewport verification |

## 4. Findings

### FINDING-ST-1.4-001: Permission primitive is not used by backend authorization flow
- Severity: HIGH
- Type: Security gap
- Evidence: `evaluatePermission` exists in `packages/permissions/src/index.ts` and `apps/api/src/permissions/permission-policy.ts`, but source search found runtime calls only in tests. Admin controllers use direct `assertSystemAdmin` checks instead.
- Expected: ST-1.4 requires permission primitives to be a shared mechanism for later epics and to combine role/scope/state in backend authorization decisions.
- Actual: Primitive is present and tested in isolation, but backend catalog/config enforcement does not call it.
- Affected files: `packages/permissions/src/index.ts`, `apps/api/src/permissions/permission-policy.ts`, `apps/api/src/admin/admin-catalogs.controller.ts`, `apps/api/src/admin/admin-config.controller.ts`, `tests/admin-foundation.test.mjs`
- Suggested fix scope: Route catalog/config authorization through a backend permission primitive adapter or guard, keeping `assertSystemAdmin` only if it delegates to the primitive.
- Should fix now? Yes

### FINDING-ST-1.4-002: Permission primitive does not actually evaluate resource scope or workflow state
- Severity: HIGH
- Type: Incomplete implementation
- Evidence: `PermissionContext` includes `resourceOwnerId`, `resourceOrganizationUnitId`, and `workflowState`, but `evaluatePermission` only checks actor/roles, system-admin foundation resource actions, missing organization scope, and dashboard read.
- Expected: Permission primitives can combine role + organization scope + state context under a consistent convention and fail closed when context is missing.
- Actual: State and resource scope fields are typed but not used in decisions.
- Affected files: `packages/permissions/src/index.ts`, `apps/api/src/permissions/permission-policy.ts`
- Suggested fix scope: Add minimal decision rules and negative tests for resource organization mismatch, missing state where state is required, and denied state/action combinations.
- Should fix now? Yes

### FINDING-ST-1.4-003: Catalog UI does not support update or soft delete/deactivate
- Severity: HIGH
- Type: Missing implementation
- Evidence: Web API wrapper exposes only `loadCatalogItems` and `createCatalogItem`; `AdminCatalogsPanel` renders list/filter/create only. Search found no frontend call to catalog update or delete endpoints.
- Expected: ST-1.4 catalog management should support add/update, and audit requirements include soft delete catalog records. UX requirements require confirmation for delete/soft delete/deactivate.
- Actual: Backend has `PATCH /api/v1/catalogs/:id` and `DELETE /api/v1/catalogs/:id`, but the admin UI cannot exercise them.
- Affected files: `apps/web/src/lib/admin-api.ts`, `apps/web/src/components/admin/admin-catalogs-panel.tsx`, `apps/api/src/admin/admin-catalogs.controller.ts`
- Suggested fix scope: Add scoped edit and deactivate/archive actions to the catalog panel with inline validation and confirmation.
- Should fix now? Yes

### FINDING-ST-1.4-004: Required ST-1.4 tests are incomplete
- Severity: HIGH
- Type: Missing test
- Evidence: Existing test covers non-admin catalog create, admin catalog create, system parameter update, notification template update, and isolated permission fail-closed. It does not cover catalog update, catalog soft delete, non-admin config endpoints, audit metadata for config/template, or live backend use of permission primitives.
- Expected: VER-ST-1.4 requires create/update catalog, update config/template, missing-context permission primitive, and audit log checks. User-requested minimum verification also requires non-admin forbidden for catalog/config endpoints.
- Actual: `npm test` passes, but story-level proof is incomplete.
- Affected files: `tests/admin-foundation.test.mjs`
- Suggested fix scope: Add focused tests for missing cases before marking ST-1.4 complete.
- Should fix now? Yes

### FINDING-ST-1.4-005: Audit logs lack before/after or useful change context for catalog/config updates
- Severity: MEDIUM
- Type: Audit gap
- Evidence: Audit service supports action, actor, target, username, result, ip, userAgent, and reason only. Catalog/config services record action and target metadata, but no before/after or changed-field context.
- Expected: Audit log needs actor, action, target type/id, timestamp, and context/before-after if appropriate, while avoiding sensitive payloads.
- Actual: Timestamp is created by DB, actor/target/action exist, but update context is not captured.
- Affected files: `apps/api/src/auth/audit-log.service.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/admin/admin-catalogs.service.ts`, `apps/api/src/admin/admin-config.service.ts`
- Suggested fix scope: Add a minimal safe `reason` or context payload pattern for changed non-secret fields, or explicitly document why before/after is deferred.
- Should fix now? Yes

### FINDING-ST-1.4-006: System parameters have no explicit type/value handling beyond string validation
- Severity: MEDIUM
- Type: Incomplete implementation
- Evidence: `SystemParameter` stores `key`, `value`, and `label`; service validates value as a non-empty string and upserts by key.
- Expected: Minimum system parameter support should include validation, duplicate key handling, and type/value handling.
- Actual: Duplicate key is handled by upsert, but there is no declared parameter type or typed value validation.
- Affected files: `apps/api/prisma/schema.prisma`, `apps/api/src/admin/admin-config.service.ts`, `apps/web/src/components/admin/admin-config-panel.tsx`
- Suggested fix scope: Add minimal type metadata or a supported-key registry with value validators for parameters that ST-1.4 claims to support.
- Should fix now? Yes

### FINDING-ST-1.4-007: Catalog duplicate and soft-delete edge behavior is not acceptance-grade
- Severity: MEDIUM
- Type: Incomplete implementation
- Evidence: `CatalogItem` has a unique `(type, code)` index. Create uses raw Prisma create and does not map duplicates to a domain validation response. Soft delete updates by id without a pre-read/not-found guard.
- Expected: Catalog management should provide predictable admin validation and fail closed/cleanly on invalid operations.
- Actual: Duplicate create and missing-id soft delete likely surface raw Prisma errors rather than controlled API errors.
- Affected files: `apps/api/src/admin/admin-catalogs.service.ts`, `apps/api/prisma/schema.prisma`
- Suggested fix scope: Add duplicate-key handling and not-found guard for soft delete, with tests.
- Should fix now? Yes

### FINDING-ST-1.4-008: UX responsive/manual verification evidence is missing
- Severity: LOW
- Type: UX gap
- Evidence: UI components include loading, empty, error, labels, table wrapper, and mobile card list, but no recorded checks at 390px, 768px, and 1440px.
- Expected: UX guideline requires responsive checks and no full-page horizontal overflow.
- Actual: Source looks directionally aligned, but no viewport verification evidence exists for ST-1.4.
- Affected files: `apps/web/src/components/admin/admin-catalogs-panel.tsx`, `apps/web/src/components/admin/admin-config-panel.tsx`, `docs/ux-design-guidelines.md`
- Suggested fix scope: Run Playwright/browser screenshots for `/catalogs` and `/system-settings` at 390, 768, and 1440 widths after implementation gaps are patched.
- Should fix now? No

## 5. Missing or Incomplete Items

Must fix before calling ST-1.4 complete:
- Backend authorization should use the shared permission primitive or a direct delegate to it, not only standalone `assertSystemAdmin`.
- Permission primitive must evaluate role + organization scope + relevant state/resource context, with fail-closed negative tests.
- Catalog UI must support update and soft delete/deactivate, including confirmation.
- Tests must cover catalog update, catalog soft delete/deactivate, non-admin catalog/config endpoint denial, and audit metadata for catalog/config changes.
- Audit logging should capture minimum useful safe context for catalog/config updates or explicitly document the accepted audit payload boundary.

Should fix soon:
- Add system parameter type/value handling for supported keys.
- Add controlled duplicate-key and not-found handling for catalog operations.
- Add UI/API error assertions for invalid catalog/config payloads.

Can defer:
- Full workflow-driven notification engine. ST-1.4 explicitly excludes workflow engine configuration.
- Full business workflow integration of every catalog into downstream modules, as long as later story artifacts reference the catalog source.
- Formal viewport screenshots until missing backend/UI behavior is patched, though they are still required before final UX acceptance.

## 6. Verification Run
- `npm test`: PASS. Ran `npm run build:api` and Node tests. Result: 36 tests passed, 0 failed.
- `npm run lint`: PASS. Ran web and API TypeScript checks.
- `npm run build`: PASS. Next.js web build and API build completed successfully.
- Relevant source checks: PASS for presence of DB models, migrations, seed data, admin catalog/config API, and basic UI pages.
- Relevant API/manual checks: Not run in live browser/API session during this review. Current evidence is automated tests plus source inspection.
- Viewport checks at 390px, 768px, 1440px: Not run during this review; no existing ST-1.4 screenshot evidence found.

## 7. Recommendation
ST-1.4 should not be marked completed yet. The implementation is a partial foundation: catalog/config DB, API, seed, and basic UI exist, and automated build/lint/test pass. However, the story cannot pass while backend permission primitives are not actually used, scope/state primitive behavior is mostly placeholder, catalog update/soft-delete UI and tests are missing, and audit context is incomplete.

Recommended order:
1. Patch backend permission primitive usage and add fail-closed tests for missing scope/state/resource context.
2. Patch catalog UI/API client for update and soft delete/deactivate with confirmation.
3. Add tests for catalog update, catalog soft delete, non-admin config/list/update/delete denial, duplicate handling, and audit metadata.
4. Add minimal supported-key/type validation for system parameters.
5. Run live admin UI verification at 390px, 768px, and 1440px before final PASS.
