---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
documentsIncluded:
  - _bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md
  - _bmad-output/prd.md
  - _bmad-output/epics.md
  - _bmad-output/architecture.md
  - _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md
  - docs/authorization-core-business-baseline.md
  - docs/permission-matrix.md
  - docs/ux-ui-spec.md
  - docs/ux-design-guidelines.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-30
**Project:** DocManS
**Scope:** Story 1.4 and its direct PRD, epic, authorization, architecture, UX, implementation, and test dependencies.

## Document Discovery

### Canonical sources

- Story: `_bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md`
- PRD: `_bmad-output/prd.md`
- Epics: `_bmad-output/epics.md`
- Authorization baseline: `docs/authorization-core-business-baseline.md` and `docs/permission-matrix.md`
- Detailed architecture: `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/`
- UX: `docs/ux-ui-spec.md` and `docs/ux-design-guidelines.md`

### Duplicate and historical artifacts

- `_bmad-output/architecture.md` is the architecture summary; the detailed architecture directory is the implementation source.
- `_bmad-output/archive/epics-and-stories-pre-permission-2026-07-29.md` and `docs/stories-notes-vi/epics-and-stories.md` are historical/supporting material and are excluded.
- No duplicate Story 1.4 shard was found.

## PRD Analysis

- The PRD contains 79 functional-requirement entries, including the five account-level roles and the organization-scope, fail-closed, backend-authorization, and legacy-migration requirements relevant to this story.
- The PRD contains NFR1-NFR20. Relevant gates are backend authorization (NFR7), fail-closed behavior (NFR8), atomic state changes (NFR10), Prisma migrations (NFR13), strict TypeScript/DTO validation (NFR19), and story-sized verification (NFR20).
- The approved authorization baseline defines five system roles, including `EXTERNAL_RESEARCHER_USER`; `SYSTEM_ADMIN` has no implicit business-data access, while scientific-management staff operate the intake workflow.

## Epic Coverage Validation

- All 79 PRD FR entries appear in the epics FR coverage map.
- The legacy FR decomposition maps Story 1.4 to FR2, FR3, and FR6, matching the implementation artifact's role, scope, and migration intent.
- The canonical UX/UI delivery section now defines Epic 1 Story 1.4 as shared async/error/forbidden/stale-context/confirmation/toast behavior, while account role and organization scope belong to canonical Epic 2. The implementation artifact still uses the legacy Story 1.4 identity. This is a traceability/documentation conflict, not a missing FR.

## UX Alignment Assessment

- UX documentation exists and aligns with the five-role model, explicit organization scope, backend authority, and no implicit business access for `SYSTEM_ADMIN`.
- UX defines intake-period management for scientific-management staff; it does not grant that business workflow to `SYSTEM_ADMIN`.
- UX and the story are aligned on the need to display the system role separately from record-scoped relationships. The implemented role registry is not aligned because it contains only four roles.

## Story Quality Review

### Findings

#### F1 — Major: the fifth system role is not implemented

Story AC1 and Task 2 explicitly require five roles, including `EXTERNAL_RESEARCHER_USER`. The executable shared registry contains only four roles in `packages/permissions/src/system-roles.js:1-6` and its declaration file. The database migration constraint also allows only four values in `apps/api/prisma/migrations/20260729000000_ep01_single_system_role/migration.sql:67-70`. The admin test asserts exactly four roles in `tests/admin-foundation.test.mjs:324-334` and `745-759`.

Impact: external accounts cannot be created or persisted as the required role. If the role is later added only to the package, the current `toRoleLabel` fallback also presents it as an internal researcher.

Recommendation: add the role to the shared runtime/type registry and create a new Prisma migration that widens the applied constraint; add create, list, persistence, login, and capability-denial tests for external users. Do not edit an already-applied migration.

#### F2 — Major: `SYSTEM_ADMIN` receives proposal-intake business authority

`assertCanManageIntakePeriods` allows both `SYSTEM_ADMIN` and `SCIENTIFIC_MANAGEMENT_STAFF` at `apps/api/src/proposals-shared/proposal-access.ts:36-42`. `listPeriods` consequently exposes scoped intake records to `SYSTEM_ADMIN` at `apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts:52-56`, and create/update/open/close all use the same guard.

Impact: this conflicts with the authorization baseline's rule that `SYSTEM_ADMIN` has no implicit business-data access and with PRD FR9, which assigns intake-period management to scientific-management staff.

Recommendation: narrow the intake business guard to the role explicitly authorized by the baseline; add a negative test proving an admin cannot list or mutate intake periods while retaining platform-foundation administration.

#### F3 — Major: AC3 contains an authorization-inverting sentence

The story says exact organization intersection is required, then says “no intersection denies access” at `...1-4...md:19`. The intended security rule is that no intersection allows access. The legacy epic text separately describes intersection as the allow condition.

Impact: the acceptance criterion is ambiguous and can lead to the opposite implementation or an invalid test.

Recommendation: rewrite the sentence as: “Without an explicit intersection, access is denied; this story adds no cross-unit grant model.”

#### F4 — Moderate: migration ambiguity rules are internally inconsistent

AC2 says every unambiguous legacy council-member account maps to a valid system role, while the Dev Notes say a council-member account without a record-owned council source is unresolved. This repository does not contain a council relationship model, so the story does not define how the migration can distinguish those cases.

Recommendation: state one executable rule: either all legacy council-member accounts are unresolved in this migration, or provide the exact existing source query that proves a record-owned council relationship.

#### F5 — Moderate: completion evidence is stale/incomplete after the fifth role was added

The story claims final validation at 101/101, but the current test suite has no external-role coverage and still asserts four roles. Current verification in this workspace: `npm run typecheck` passed; `npm test` reached 157 passing and 1 failing migration test because PostgreSQL/Docker was unavailable (`ECONNREFUSED`).

Recommendation: after F1/F2 are corrected, rerun the clean-schema migration test with PostgreSQL available and update the completion notes with the current test count and external-role cases.

### Positive evidence

- The migration records unresolved users and disables them rather than guessing, and the authentication boundary rejects disabled/unresolved users.
- Proposal reads enforce exact organization-ID membership before role/relationship checks in `apps/api/src/proposals-shared/proposal-access.ts`.
- User creation and user updates combine account and primary-scope writes transactionally, with focused rollback tests.
- Legacy role authority is archived out of the runtime schema path rather than kept as a parallel permission source.

## Summary and Recommendations

### Overall Readiness Status

NOT READY

### Critical Issues Requiring Immediate Action

1. Complete the five-role implementation, database constraint, labels, and tests (F1).
2. Remove implicit intake-period business access from `SYSTEM_ADMIN` (F2).
3. Correct the inverted wording in AC3 before treating the story as an executable contract (F3).

### Recommended Next Steps

1. Update the shared role registry and add a forward Prisma migration for `EXTERNAL_RESEARCHER_USER`.
2. Add negative/positive tests for external accounts and admin intake-period access.
3. Reconcile the legacy Story 1.4 artifact with the canonical Epic 2 role/scope delivery identity, while preserving legacy FR traceability.
4. Rerun the clean PostgreSQL migration test and replace stale completion evidence.

### Final Note

The role/scope design is directionally sound, but the latest documentation change added a fifth role without updating the executable source of truth. The story should not remain marked `done` until the role registry, persistence constraint, intake authorization, acceptance wording, and verification evidence are reconciled.
