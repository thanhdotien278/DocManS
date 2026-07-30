---
baseline_commit: 0e9c513c759f8ccdcb201527a0f0250a0e8a36f3
---

# Story 1.6: Shared Catalog and Operational Configuration Management

Status: review

## Story

As a system administrator,
I want to manage shared catalogs, phase 1 parameters, and notification templates,
so that workflows use consistent reference data.

## Acceptance Criteria

1. Given a system administrator opens a supported catalog, when they create, update, activate, deactivate, archive, or soft-delete a valid value, the backend validates the change, applies the catalog rules, and historical records keep their references.
2. Given a system administrator updates a phase 1 parameter or notification template, when the configuration violates validation or contains an unsupported placeholder, the backend rejects the whole change and returns an error tied to the field that must be fixed.
3. Given a non-admin user accesses catalog/config APIs, when they read or mutate catalog/config data, the backend rejects the request and every successful mutation creates an audit record.

## Tasks / Subtasks

- [x] Task 1: Context and story package (AC: 1-3)
  - [x] Create the Story 1.6 file from canonical Epic 1 and current implementation context.
  - [x] Mark Story 1.6 in progress in sprint tracking without altering prior Story 1.5 work.
- [x] Task 2: Harden backend catalog behavior (AC: 1, 3)
  - [x] Keep supported catalog types explicit: `research-field`, `proposal-type`, `priority`, `report-type`, and `scoring-criterion`.
  - [x] Validate catalog code/name/description/status on create/update, reject deleted or missing records on update/delete, and use soft-delete only.
  - [x] Audit successful create/update/status/delete mutations without deleting referenced catalog history.
- [x] Task 3: Harden backend config behavior (AC: 2, 3)
  - [x] Allow only Story 1.6 phase 1 system parameters and validate values before writes.
  - [x] Allow only Story 1.6 notification templates and reject unsupported `{{placeholder}}` tokens before writes.
  - [x] Ensure invalid config/template requests do not persist partial changes or audit success.
- [x] Task 4: Complete the minimal admin UI and API client seams (AC: 1-3)
  - [x] Add catalog update, status transition, and soft-delete actions to the existing `/catalogs` surface.
  - [x] Keep `/system-settings` aligned with backend validation and display actionable Vietnamese errors.
  - [x] Do not expose catalog/config operations outside existing authenticated admin routes.
- [x] Task 5: Add regression coverage and validate (AC: 1-3)
  - [x] Cover catalog update/status/delete, invalid deleted-record mutation, non-admin rejection, config validation, placeholder rejection, no partial persistence, and audit success.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope decisions

- This story extends the existing EP-01 admin foundation. Do not create a new module, new ORM models, or a workflow engine.
- Prisma already has `CatalogItem`, `SystemParameter`, and `NotificationTemplate` from migration `20260609000000_ep01_admin_foundation`; keep those tables.
- Catalog records are soft-deleted by setting `deletedAt` and `status: "archived"`. Historical records can keep `type/code` references; do not hard delete rows.
- Phase 1 config is intentionally small. `session_timeout_minutes` is the only currently seeded operational parameter and should be numeric.
- `user_created` is the currently seeded notification template. Placeholder validation must reject unknown placeholders, even if the body otherwise passes length validation.

### Existing code to extend

- `apps/api/src/admin/admin-catalogs.service.ts` and `admin-catalogs.controller.ts` own catalog behavior.
- `apps/api/src/admin/admin-config.service.ts` and `admin-config.controller.ts` own system-parameter and notification-template behavior.
- `apps/web/src/components/admin/admin-catalogs-panel.tsx` and `apps/web/src/components/admin/admin-config-panel.tsx` are the existing admin UI surfaces.
- `apps/web/src/lib/admin-api.ts` is the existing typed client seam.
- `tests/admin-foundation.test.mjs` already has admin foundation coverage and in-memory Prisma doubles for catalogs/config.

### Testing requirements

- Follow the existing built-output test pattern in `tests/*.test.mjs`; run a build/typecheck before `npm test` if dist output is stale.
- Keep tests behavior-level and focused on Story 1.6 boundaries.
- Final validation is mandatory: `npm run typecheck`, `npm test`, and `git diff --check`.

### References

- [Source: _bmad-output/epics.md#Story 1.6]
- [Source: _bmad-output/project-context.md#Authorization And Security Rules]
- [Source: _bmad-output/project-context.md#Audit Logging Rules]
- [Source: apps/api/prisma/migrations/20260609000000_ep01_admin_foundation/migration.sql]
- [Source: apps/api/prisma/seed.mjs]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from canonical Epic 1, current EP-01 admin services, seed data, and Story 1.5 implementation patterns.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented transactional catalog mutations with supported type/status validation, deleted-record rejection, soft-delete preservation, and success audit rows.
- Implemented phase 1 config allowlists for `session_timeout_minutes` and `user_created`, including numeric bounds and per-template placeholder validation.
- Added catalog edit, activate/deactivate, and soft-delete controls to the existing admin catalog UI.
- Verified `npm run typecheck`, `npm test` (112/112), `npm run build`, and `git diff --check`.

### File List

- _bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/src/admin/admin-catalogs.service.ts
- apps/api/src/admin/admin-config.service.ts
- apps/web/src/app/globals.css
- apps/web/src/components/admin/admin-catalogs-panel.tsx
- apps/web/src/lib/admin-api.ts
- tests/admin-foundation.test.mjs

### Change Log

- 2026-07-30: Created implementation-ready Story 1.6 specification and started development.
- 2026-07-30: Implemented Story 1.6 backend validation/audit, admin catalog UI actions, regression coverage, and moved story to review.
