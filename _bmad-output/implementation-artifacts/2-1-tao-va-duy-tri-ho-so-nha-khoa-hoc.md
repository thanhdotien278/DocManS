---
baseline_commit: 2ae8c3e
---

# Story 2.1: Tạo và duy trì hồ sơ nhà khoa học

Status: review

## Story

As a người quản lý hồ sơ nhà khoa học,
I want tạo và cập nhật hồ sơ học thuật độc lập với tài khoản đăng nhập,
so that hệ thống quản lý được cả nhà khoa học đã và chưa có tài khoản.

## Acceptance Criteria

1. **Create an independent profile.** Given an active `SCIENTIFIC_MANAGEMENT_STAFF` actor with an explicit `researcher-profile.create` allow and an active organization scope covering the selected `managementOrganizationUnitId`, when they submit the required profile fields and valid optional academic/contact fields, then the backend creates an `ACTIVE` researcher profile with its own stable UUID and version; it does not create or require a `User` account. `SYSTEM_ADMIN`, leadership, researcher, UI visibility, or an account-profile link is not an implicit allow. This action is not delegable in the current V1 registry.
2. **Validate canonical and free-text fields.** Given a create or update request, when a catalog-backed rank, degree, research field, status, contact value, or bounded text is invalid, then the DTO/domain validation returns a field-addressable validation error and writes no profile, child row, or audit success event. Catalog-backed values reuse active Story 1.6 catalog items; external affiliation remains explicitly separate from the management organization used for authorization.
3. **Warn about duplicates without leaking data.** Given normalized name/contact/organization facts resemble an existing profile, when an authorized actor saves, then the response contains only visible candidate profiles and the minimum fields needed to resolve the warning; hidden matches do not contribute a count, flag, or metadata, and the system neither blocks nor auto-merges the save.
4. **Enforce scope and minimum disclosure.** Given an actor lacks the exact action or organization intersection, when they create, read, update, activate, or deactivate a profile directly, then the backend denies without revealing profile existence or contact data. `SYSTEM_ADMIN` is not an implicit business-data allow, and frontend visibility is never proof of authority.
5. **Use named lifecycle operations and concurrency control.** Given a current profile version, when an authorized actor updates academic identity or executes the named `activate`/`deactivate` operation, then authorization and version are rechecked in the write transaction and the version increases. A stale version returns `CONTEXT_VERSION_MISMATCH`; no referenced profile is physically deleted and a status transition is not accepted through a generic field patch.
6. **Make mutation and audit atomic.** Given a successful profile mutation, when the transaction commits, then a redaction-safe audit entry records actor, target, action, correlation ID, management organization, version, and permitted before/after facts. If the required audit append fails, the profile mutation and child-row changes roll back together.
7. **Provide an operable responsive management UI.** Given an authorized manager uses the researcher-profile feature, when loading, editing, validating, saving, or receiving a duplicate warning at `360`, `390`, `430`, `768`, `1024`, or `1440` px, then the UI provides labelled controls, visible focus, inline errors, loading/success/error states, text-labelled status, and no full-page horizontal scroll. It consumes backend capabilities and does not infer actions from the account system role.

## Tasks / Subtasks

- [x] Task 1: Add the profile schema and migration (AC: 1-3, 5-6)
  - [x] Add `ResearcherProfile` with stable ID, `managementOrganizationUnitId`, optional external affiliation, identity/academic/contact fields, `ACTIVE|INACTIVE` status, aggregate/version fields, timestamps, and creator/updater references. Follow the field baseline below; do not make an account link, CV, or attachment a creation prerequisite.
  - [x] Store research-field selections and normalized expertise keywords as profile-owned child rows with indexes for later scoped search; validate catalog-backed values against active Story 1.6 catalog items rather than creating a second catalog.
  - [x] Add only indexes needed for scoped list and duplicate candidate lookup. Do not add fuzzy-search infrastructure, Elasticsearch, profile-account links, or generic participation tables in this story.

- [x] Task 2: Extend the shared permission and response contracts (AC: 1, 4-5)
  - [x] Add exact V1 actions `researcher-profile.read`, `.create`, `.update`, `.activate`, and `.deactivate` to `packages/permissions` TypeScript and runtime JavaScript exports with compatibility tests.
  - [x] Define the profile target/context-version projection and backend-derived viewer authorization. Unknown action/schema/code continues to fail closed.
  - [x] Grant management mutations only through explicit policy rules and exact management-organization intersection; do not infer them from navigation or a global “highest role.”

- [x] Task 3: Add module, DTOs, services, API, and atomic audit (AC: 1-6)
  - [x] Create the `researcher-profiles` Nest module with thin controller and domain service operations for create, read, update, activate, and deactivate under `/api/v1/researcher-profiles`.
  - [x] Normalize Vietnamese-aware comparison inputs deterministically: preserve NFC display values and store an accent-folded, lower-cased, whitespace-collapsed search key plus normalized email/phone/keywords. Do not depend on environment-specific database collation.
  - [x] Re-read actor account, scope, target/version, catalogs, and duplicate candidates inside the authoritative transaction where required; use the shared authorization decision and error envelope.
  - [x] Reuse `AuditLogService` with its transaction client. If the current storage shape cannot hold correlation and redacted before/after facts, extend it minimally; do not create a parallel researcher-only audit authority.

- [x] Task 4: Add the first profile management UI without pre-implementing Story 2.5 (AC: 3, 7)
  - [x] Add feature-scoped API types/client and routes/components under `researcher-profiles`; reuse the existing shell, breadcrumb, status, empty-state, form, and error patterns.
  - [x] Provide a scoped paginated management list sufficient to select/create/edit a profile. Advanced directory filters, facets, participation filtering, and public detail composition remain Story 2.5.
  - [x] Show visible duplicate candidates as a warning requiring an explicit save confirmation; never render a hidden-match signal.

- [x] Excluded from this story: upload or attachment management for a researcher profile. A CV, certificate, publication, or identity document is a business file, not a profile field. It requires the shared `files` module and exact file capabilities from Epic 3 before a later, explicitly scoped researcher-profile attachment story may add it.

- [x] Task 5: Verify behavior and regressions (AC: 1-7)
  - [x] Add migration/schema tests plus service/API tests for valid create/update/status, invalid DTO/catalog, exact scope denial, inactive actor, duplicate visible/hidden behavior, stale version, concurrent writers, and audit rollback.
  - [x] Add source/UI tests for capability-driven actions, PII omission, keyboard labels/focus, all required responsive breakpoints, and loading/empty/error/success states.
  - [x] Run focused tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and architecture guardrails

- This is the identity foundation for Epic 2. A profile is not a user, role, permission, assignment, or participation row. Do not create a user implicitly and do not let a profile status change a system role.
- `managementOrganizationUnitId` is the authorization/data-owner scope. An external or display affiliation is separate and must not accidentally widen access.
- Duplicate detection is advisory and authorization-filtered. No global pre-query, count, telemetry, or error may reveal hidden profiles.
- Preserve Story 1.7-1.10 authorization invariants: one request/transaction `asOf`, complete context, denial precedence, backend capabilities, source-owned versions, and atomic mutation checks.
- The legacy UX sentence that selects a “highest relationship” is superseded by the canonical architecture and PRD: preserve all security-relevant relationships and never collapse them for authorization.

### Create authority

- Only an authenticated, active `SCIENTIFIC_MANAGEMENT_STAFF` account may create a profile, and only when the V1 policy explicitly allows `researcher-profile.create` for the selected `managementOrganizationUnitId` within that actor's active organization scopes.
- Creation has no pre-existing profile target; the selected management organization is the authorization target and must be rechecked inside the create transaction. A missing, inactive, unresolved, ambiguous, or out-of-scope organization denies the request before any profile, child row, or audit-success event is written.
- `SYSTEM_ADMIN` manages platform foundations such as users, roles, organizations, and catalogs; it does not receive researcher-profile business-data access merely from that role. `LEADERSHIP_APPROVAL_AUTHORITY` and `RESEARCHER_INTERNAL_USER` likewise receive no implicit create access.
- The current V1 delegable-action registry contains only `proposal.submit`; therefore `researcher-profile.create` cannot be delegated unless a future policy/story explicitly changes that registry and defines its safeguards.

### Profile field baseline

| Group | Fields | Rule in Story 2.1 |
|---|---|---|
| Required business input | `fullName`, `managementOrganizationUnitId`, at least one `researchField` | `fullName` is the display identity; the management organization is the authorization/data-owner scope; research fields use active Story 1.6 catalog items. |
| Optional academic and organization input | `academicRank`, `academicDegree`, `title`, `externalAffiliation` | Rank, degree, and research fields are catalog-backed where configured; external affiliation is display/business data and never widens authorization. |
| Optional contact input | permitted `email`, `phone`, and bounded contact note/address fields | Normalize email/phone for validation and duplicate warnings; return them only under the profile disclosure policy. |
| Optional expertise input | one or more free-text expertise keywords | Preserve display values and store normalized Vietnamese-aware keys for duplicate checks and later scoped search. |
| System-managed only | stable UUID, `status` (defaults to `ACTIVE`), aggregate/context version, normalized comparison keys, timestamps, creator/updater, audit correlation facts | The client must not set these as arbitrary profile fields; status changes use named `activate`/`deactivate` operations. |

Do not add an account link, participation history, assignment, CV, certificate, publication, identity document, or generic attachment to this model. Account linkage belongs to Story 2.2; participation/history belongs to Stories 2.3 and 2.6; file binaries and metadata belong to the shared files module introduced by Epic 3.

### Existing seams to reuse

- Register the new module in `apps/api/src/app.module.ts`; follow existing domain module/controller/service placement rather than moving current modules.
- Extend `apps/api/prisma/schema.prisma` through a new Prisma migration. The schema currently has no researcher profile model.
- Reuse `OrganizationUnit`, Story 1.6 `CatalogItem`, `AuditLogService`, `AuthorizationV1Service`, the shared error envelope, and UI primitives under `apps/web/src/components/ui`.
- Match the repository's current Next.js 15, NestJS 11, Prisma 7.8, React 19, TypeScript, and `node:test` setup. Do not upgrade dependencies in this story.

### Testing requirements

- A successful API response is not sufficient evidence: tests must prove wrong-scope direct URLs, hidden duplicate candidates, stale versions, and audit failure leave no partial writes.
- PostgreSQL-backed migration/integration tests are required for schema constraints. Keep unit/source tests focused and retain the full root suite as the regression gate.

### References

- [Source: _bmad-output/epics.md#Story 2.1]
- [Source: _bmad-output/prd.md#Researcher Profile Management, Data-Scope Authorization Requirements, Audit-Log Requirements, and NFRs]
- [Source: _bmad-output/project-context.md#Authorization And Security Rules, Audit Logging Rules, UX/UI Rules, and Testing Rules]
- [Source: _bmad-output/architecture.md#Data Architecture, Authorization Architecture Spine, Project Structure & Boundaries, and Researcher Profile Ownership]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Request-Wide Evaluation Context, Context Version and Atomic Mutation, and Viewer Authorization Contract]
- [Source: docs/ux-design-guidelines.md#Responsive UI, Form, Accessibility, and Multi-Role Rules]
- [External: https://docs.nestjs.com/techniques/validation]
- [External: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted from the canonical Epic 2, PRD, project context, authorization contracts, current schema/code, and parallel BMAD requirement/architecture/quality analysis.
- 2026-08-23: Implemented schema/migration, exact V1 actions, scoped service/API, transactional redaction-safe audit fields, responsive management UI, and focused/full regression tests. `npm run prisma:deploy` applied migration `20260823000000_st_21_researcher_profiles` successfully against the local PostgreSQL dev database.

### Completion Notes List

- Ultimate context-engine analysis completed; schema, scope, disclosure, concurrency, audit atomicity, UI boundary, and Story 2.5 exclusions are explicit.
- Story 2.1 implementation complete: independent profile lifecycle, catalog validation, visible-scope duplicate confirmation, fail-closed management authorization, context-version concurrency checks, atomic audit append, and capability-driven UI are implemented.
- Verification passed: Prisma schema validation, local migration deployment, `npm run typecheck`, `npm run build:web`, `npm test` (158/158), focused researcher-profile tests, and `git diff --check`.

### File List

- `_bmad-output/implementation-artifacts/2-1-tao-va-duy-tri-ho-so-nha-khoa-hoc.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/api/prisma/migrations/20260823000000_st_21_researcher_profiles/migration.sql`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/admin/admin-catalogs.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/auth/audit-log.service.ts`
- `apps/api/src/researcher-profiles/researcher-profile-access.ts`
- `apps/api/src/researcher-profiles/researcher-profiles.controller.ts`
- `apps/api/src/researcher-profiles/researcher-profiles.dto.ts`
- `apps/api/src/researcher-profiles/researcher-profiles.module.ts`
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts`
- `apps/web/src/app/researcher-profiles/page.tsx`
- `apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx`
- `apps/web/src/fixtures/shell-context.ts`
- `apps/web/src/lib/researcher-profiles-api.ts`
- `packages/permissions/src/index.js`
- `packages/permissions/src/index.ts`
- `tests/researcher-profiles-ui-source.test.mjs`
- `tests/researcher-profiles.test.mjs`
- `tests/smoke.test.mjs`

### Change Log

- 2026-08-23: Implemented Story 2.1 and moved status to `review` after all validation gates passed.
