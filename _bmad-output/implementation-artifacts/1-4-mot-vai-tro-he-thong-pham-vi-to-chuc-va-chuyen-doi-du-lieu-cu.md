---
baseline_commit: 81e255883e6cf82302cfcd63b05ce776d52f7d4f
---

# Story 1.4: One System Role, Organization Scope, and Legacy Data Migration

Status: done

## Story

As a system administrator,
I want every account to have exactly one system role and explicit organization scope,
so that platform authority cannot accumulate with record-scoped business relationships.

## Acceptance Criteria

1. Given an administrator creates or updates an account, when assigning its system role, exactly one of `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`, or `RESEARCHER_INTERNAL_USER` is active. Persistence and service boundaries prevent multiple active system roles.
2. Given legacy data contains global PI, reviewer, council-member, or multiple role assignments, when the migration runs, each unambiguous account maps to a valid system role and record relationships remain the source of business authority. The Prisma migration is tested and no legacy global role grants authority in parallel.
3. Given a target record belongs to an organization, when the backend evaluates organization scope, it permits only an explicit intersection between actor and target organization IDs. It must not infer access through the organization tree. No cross-unit grant model exists in this story, so no intersection denies access.
4. Given migration data or role context is ambiguous, when the account requests protected access, it fails closed. The migration records an actionable issue instead of choosing a role arbitrarily.

## Tasks / Subtasks

- [x] Task 1: Define the canonical account-role and unresolved-migration persistence model (AC: 1, 2, 4)
  - [x] Add a Prisma migration that canonicalizes unambiguous legacy roles, records ambiguous/unmapped role data, and disables those accounts.
  - [x] Replace the many-role account assignment source of truth with one nullable `systemRole` field; active accounts require a canonical role, while unresolved migrated accounts remain disabled and have no role.
  - [x] Preserve proposal ownership, proposal participation, and review assignments as their existing record-owned sources; do not create generic relationship tables or council data not present in this repository.
- [x] Task 2: Migrate authentication, admin account management, seed data, and permission primitives to one system role (AC: 1, 2, 4)
  - [x] Define the four system-role constants/types in the shared permission package and consume them from API auth/admin code.
  - [x] Make authentication fail closed for inactive, unresolved, or invalid-role accounts and remove `roles[]` from current-user context.
  - [x] Restrict user create/update inputs to the four canonical roles and make role updates transactional; remove arbitrary role CRUD/assignment behavior.
  - [x] Convert seeded PI/reviewer accounts to `RESEARCHER_INTERNAL_USER`; retain only their existing proposal/review record relationships as business authority.
- [x] Task 3: Enforce explicit organization-scope intersection at shared proposal access seams (AC: 3)
  - [x] Reuse the existing organization scope IDs and require exact target-ID membership; do not traverse `OrganizationUnit.parentId`.
  - [x] Keep any currently required explicit multi-unit scope assignments; do not add a cross-unit-grant table or implied hierarchy behavior.
- [x] Task 4: Remove legacy account-role authority from proposal flows (AC: 2, 3, 4)
  - [x] Replace account-level PI checks with proposal ownership/participation checks where the current record is available.
  - [x] Keep reviewer access assignment-scoped and reject any legacy reviewer role as sufficient authority.
  - [x] Preserve existing staff and approval-authority behavior under their canonical system roles and explicit scope checks.
- [x] Task 5: Add focused regression coverage and validate the migration boundary (AC: 1-4)
  - [x] Test canonical mapping, ambiguous migration issue reporting, and fail-closed authentication.
  - [x] Test that a user cannot hold multiple active system roles, including admin create/update paths.
  - [x] Test record-owned PI/reviewer authority and exact organization-scope allow/deny behavior.
  - [x] Run TypeScript checks and the full test suite.
  - [x] Execute the real migration sequence on a clean temporary PostgreSQL schema, covering single legacy roles, conflicting assignments, unknown roles, disabled accounts, and fail-closed login.

### Review Findings

- [x] [Review][Patch] Enforce exact organization-ID scope for every proposal read path [apps/api/src/proposals-shared/proposal-access.ts:91]
- [x] [Review][Patch] Restrict intake-period visibility and management to explicit organization scope [apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts:51]
- [x] [Review][Patch] Fail closed for legacy council-member data without a record-owned council source [apps/api/prisma/migrations/20260729000000_ep01_single_system_role/migration.sql:46]
- [x] [Review][Patch] Do not map stale denormalized roles when no active legacy assignment exists [apps/api/prisma/migrations/20260729000000_ep01_single_system_role/migration.sql:22]
- [x] [Review][Patch] Make user creation atomic with its initial organization scope [apps/api/src/admin/admin-users.service.ts:182]
- [x] [Review][Patch] Preserve explicit multi-unit scopes when changing a primary unit [apps/api/src/admin/admin-users.service.ts:287]
- [x] [Review][Patch] Use the shared permission package as the system-role source of truth [apps/api/src/auth/auth.types.ts:1]

## Dev Notes

### Canonical decisions

- `User.systemRole` is the sole account-level authority source. Accepted persisted values are `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`, and `RESEARCHER_INTERNAL_USER`.
- Legacy mappings are deterministic: `system-admin` → `SYSTEM_ADMIN`, `scientific-management` → `SCIENTIFIC_MANAGEMENT_STAFF`, `leadership` → `LEADERSHIP_APPROVAL_AUTHORITY`, and `principal-investigator`/`reviewer`/`council-member` → `RESEARCHER_INTERNAL_USER` only when no conflicting active legacy assignment exists.
- Multiple distinct active legacy assignments, unknown legacy roles, or a council-member account without a record-owned council source are unresolved. Record a migration issue with safe role evidence, disable the account, and leave `systemRole` null. Authentication must deny it.
- This story does not implement Story 1.7 policy/capability contracts, Story 1.9 relationship lifecycle, Story 1.10 delegation, a cross-unit-grant model, or a council relationship model. Do not create placeholders for them.
- Organization authorization uses exact organization-ID intersection only. `OrganizationUnit.parentId` is descriptive data and must never grant inherited access.

### Existing code to reconcile

- `apps/api/prisma/schema.prisma` currently has both denormalized `User.role`/`roleLabel` and unconstrained `UserRoleAssignment[]`; remove the duplicated/multi-role authority path through a Prisma migration.
- `apps/api/src/auth/auth.store.ts` currently selects a primary assignment and returns `roles[]`; replace that with `systemRole` validation and fail-closed behavior.
- `apps/api/src/admin/admin-users.service.ts` and its controller currently allow arbitrary role records and assignments. Keep user lifecycle management but restrict it to the canonical system-role enum.
- `packages/permissions/src/index.ts` and `apps/api/src/permissions/permission-policy.ts` duplicate a legacy global-role model. Consolidate on the shared package; do not create another authorization seam.
- Proposal authority already has record-owned sources: proposal owner/`ProposalMember` and `ProposalReviewAssignment`. Preserve them; do not represent PI or reviewer as a system role.

### Testing requirements

- Follow the repository’s Node test pattern in `tests/*.test.mjs`; build the API before running tests.
- Add regression tests for ambiguous migration handling, one-role account validation, disabled/unresolved session rejection, record-scoped PI/reviewer behavior, and exact organization-ID scope checks.
- Use `npm run typecheck` and `npm test` for final validation.

### References

- [Source: _bmad-output/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md#AD-1 and AD-12]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Request-Wide Evaluation Context]
- [Source: CONTEXT.md#RTMS Context]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from Epic 1 acceptance criteria, current code inspection, and the adopted authorization architecture.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented the single-system-role migration, fail-closed auth boundary, seed mappings, and migration issue persistence.
- Verified the applied migration and seeded canonical roles in PostgreSQL; `npm test` passed 95/95 and `npm run typecheck` passed.
- Session 2 archived legacy role columns and assignment tables, then removed their runtime use from Prisma, session/auth, admin, proposal access, and web session/navigation boundaries.
- Verified with `npm run typecheck`, `npm test` (98/98), `git diff --check`, and a runtime source scan with no legacy authority matches.
- Session 3 updated the API permission policy to accept one validated `systemRole`; legacy `roles[]` context, missing roles, and invalid roles fail closed. Reviewer and PI authority remain record-scoped in their existing assignment and participation seams.
- Verified with `node --test tests/admin-foundation.test.mjs` (10/10) and `npm run typecheck`.
- Session 4 added regression coverage proving legacy PI, reviewer, and council-member account labels grant no proposal authority without ownership, `ProposalMember`, or `ProposalReviewAssignment`; the existing staff, leadership, and organization-scope paths remain unchanged.
- Verified with `npm run build:api && node --test tests/proposals-st30.test.mjs tests/proposals-ep03.test.mjs` (36/36), `npm run typecheck`, and a focused source scan showing no `user.role`, `user.roles`, `actor.role`, or `actor.roles` checks in the proposal authorization seams.
- Session 5 moved the user update and organization-scope replacement into one Prisma transaction. Audit entries remain after the transaction, so a failed scope write leaves no role, status, unit, scope, or audit change.
- Verified with `npm run build:api && node --test tests/admin-foundation.test.mjs` (11/11), including a forced scope-write failure that rolls back the user and scope state, plus `npm run typecheck`.
- Session 6 corrected the migration to map a single active legacy assignment rather than the stale denormalized role column. A clean-schema migration test covers a single legacy role, a single assignment, multiple roles, unknown roles, disabled accounts, and fail-closed login.
- Final validation passed: `npm run typecheck`, `npm test` (101/101), and `git diff --check`.

### File List

- _bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20260729000000_ep01_single_system_role/migration.sql
- apps/api/prisma/migrations/20260730000000_archive_legacy_role_authority/migration.sql
- apps/api/prisma/seed.mjs
- apps/api/src/admin/admin-users.service.ts
- apps/api/src/auth/auth.store.ts
- apps/api/src/auth/auth.types.ts
- apps/api/src/proposals-shared/proposal-access.ts
- apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts
- apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts
- apps/api/src/permissions/permission-policy.ts
- apps/api/src/research-proposals/research-proposals.service.ts
- apps/web/src/lib/session.ts
- apps/web/src/lib/auth-api.ts
- apps/web/src/lib/admin-api.ts
- apps/web/src/components/layout/app-shell.tsx
- apps/web/src/components/layout/mobile-nav.tsx
- apps/web/src/components/layout/sidebar.tsx
- apps/web/src/components/research-proposals/proposal-detail-workspace.tsx
- apps/web/src/components/admin/admin-users-panel.tsx
- apps/web/src/fixtures/shell-context.ts
- apps/web/src/fixtures/showcase-data.ts
- packages/permissions/src/index.ts
- tests/auth-api.test.mjs
- tests/admin-foundation.test.mjs
- tests/proposals-ep02.test.mjs
- tests/proposals-ep03.test.mjs
- tests/proposals-st30.test.mjs
- tests/smoke.test.mjs
- tests/system-role-migration.test.mjs

### Change Log

- 2026-07-29: Created implementation-ready Story 1.4 specification.
- 2026-07-30: Implemented and validated the migration/authentication foundation; role-context and proposal-flow cleanup remain.
- 2026-07-30: Completed Session 2 legacy authority removal; typecheck and full test suite passed (98/98).
- 2026-07-30: Completed Session 3 permission-policy consolidation; focused policy test and typecheck passed.
- 2026-07-30: Completed Session 4 proposal record-relationship regression coverage; focused proposal tests (36/36) and typecheck passed.
- 2026-07-30: Completed Session 5 atomic user-update transaction and rollback regression coverage; focused admin tests (11/11) and typecheck passed.
- 2026-07-30: Completed Session 6 clean-schema migration validation and final Story 1.4 gates; full test suite passed (101/101), typecheck and diff check passed. Story is ready for review.
