---
baseline_commit: 2ae8c3e
---

# Story 2.2: Liên kết hồ sơ nhà khoa học với tài khoản

Status: ready-for-dev

## Story

As a người quản lý được ủy quyền,
I want liên kết đúng hồ sơ nhà khoa học với đúng tài khoản,
so that quan hệ nghiệp vụ có thể tham chiếu một định danh thống nhất mà không biến hồ sơ thành vai trò hệ thống.

## Acceptance Criteria

1. **Create one compatible active link.** Given an active profile and active user are both visible in the manager's exact organization scope, when an actor with `researcher-profile.account-link.create` creates a link with a valid half-open effective interval, then an append-only link row is created with status, version, `effectiveFrom`, and optional `effectiveUntil`. At any instant, one user has at most one active profile and one profile has at most one active user.
2. **Reject overlap and ambiguity atomically.** Given either side already has an overlapping non-ended link, or identity/scope context is unresolved, stale, or ambiguous, when a create/correct operation is attempted, then the backend returns the appropriate V1 denial or stable business conflict code, creates no replacement, and exposes no hidden account/profile facts.
3. **Preserve lifecycle history.** Given an existing link, when an authorized actor suspends, ends, or corrects it, then a named lifecycle operation closes the old row and, for a correction, creates a successor linked to its predecessor in one transaction. Physical deletion and in-place rewriting of historical identity linkage are forbidden; all boundaries use database UTC and `effectiveFrom <= asOf < effectiveUntil`.
4. **Do not grant authority.** Given a link becomes active, when account/session/capability data is resolved, then `User.systemRole`, organization scopes, proposal/project relationships, assignments, and allowed actions remain unchanged. A link only resolves identity; every record action still requires its owning source relationship and the complete authorization contract.
5. **Keep external identity separate from authority.** Given the linked account has `EXTERNAL_RESEARCHER_USER`, when the link is resolved, then it may support an explicitly assigned draft/review relationship but cannot create/submit proposals, change protected fields, assign, or decide; the profile link itself grants none of those actions.
5. **Handle account and profile status independently.** Given the user is disabled, when the profile is queried by an authorized viewer, then the academic profile remains available with only the permitted account-status projection, while the disabled account cannot act. Given the profile is inactive, the link history remains but new business association/assignment flows follow their explicit eligibility rule rather than silently reactivating it.
6. **Protect concurrent lifecycle mutation.** Given a manager submits an expected profile/link context version, when another transaction has changed either side or the interval, then the write returns `CONTEXT_VERSION_MISMATCH` and leaves every link, version, and audit row unchanged. Successful lifecycle mutation increments the profile link/context version.
7. **Audit with minimum disclosure.** Given any successful or denied link lifecycle operation, when the response is produced, then redaction-safe audit records capture actor, target profile, account/link identifiers as policy permits, interval/status, reason, correlation ID, and before/after lifecycle facts. A required success audit append is in the same transaction as the link mutation.

## Tasks / Subtasks

- [ ] Task 1: Add the append-only account-link model and PostgreSQL constraints (AC: 1-3, 5-7)
  - [ ] Add `ResearcherProfileUserLink` with profile/user foreign keys, lifecycle status, effective interval, version, predecessor/successor or correction metadata, actor/reason, timestamps, and indexes.
  - [ ] Enforce active 1:1 cardinality on both `profileId` and `userId`, including overlapping effective intervals. Use migration SQL/constraints appropriate for PostgreSQL; reuse the existing `btree_gist` foundation when an exclusion constraint is selected.
  - [ ] Add a profile-owned link/context version and update it atomically for create, suspend, end, or correction. Do not update `User.systemRole` or organization scopes in this migration.

- [ ] Task 2: Extend exact action and identity-link contracts (AC: 1-7)
  - [ ] Add `researcher-profile.account-link.read`, `.create`, `.suspend`, `.end`, and `.correct` to the shared permissions owner and runtime compatibility tests.
  - [ ] Define a minimum-disclosure account-link DTO: link lifecycle plus permitted account ID/display/status only. Never include password/session facts or use the linked user's system role as a record relationship.
  - [ ] Define stable validation/conflict errors for overlap, invalid interval, incompatible status, and missing target without weakening canonical authorization denial precedence.

- [ ] Task 3: Implement lifecycle operations in the researcher-profile module (AC: 1-7)
  - [ ] Add create/read/suspend/end/correct service operations and explicit API action routes; validate UUIDs, interval, reason, and expected context version at the boundary.
  - [ ] Read the database transaction clock once, re-resolve actor, both records, exact scopes, status, overlap, and versions in the transaction, then persist link/version/audit atomically.
  - [ ] A correction ends the old record and creates a successor. Do not “fix” historical rows with update/delete or auto-replace a conflicting active link.

- [ ] Task 4: Add authorized account-link UI to the profile detail/edit flow (AC: 1-5, 7)
  - [ ] Render profile identity and account status as separate labelled concepts. Show lifecycle actions only from backend capability data and confirm destructive/end operations.
  - [ ] Provide visible loading, empty, conflict, stale-refresh, success, and error behavior without leaking hidden account candidates.

- [ ] Task 5: Add database, API, policy, and regression tests (AC: 1-7)
  - [ ] Test one-to-one active cardinality in both directions, future/current intervals, exact start/end boundaries, overlap, suspend/end/correct successor history, and concurrent writers.
  - [ ] Test inactive account/profile behavior, external-role identity-only behavior, cross-scope denial, unresolved/ambiguous identity, hidden target non-disclosure, no role/scope/action side effects, audit redaction, and audit rollback.
  - [ ] Run focused PostgreSQL tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Dependencies and boundaries

- Story 2.1 is a hard dependency. Reuse its profile aggregate, management organization, version, module, policy, API, UI, and audit seam.
- Phase 1 cardinality is explicitly one active link per profile and per account at any instant. Changing this is a product/architecture change, not an implementation choice.
- Grant account-link lifecycle actions explicitly to in-scope `SCIENTIFIC_MANAGEMENT_STAFF` and `SYSTEM_ADMIN`; both still require exact scope over the profile and target account. Neither role receives an implicit bypass.
- Link rows are identity resolution facts, not global roles or source-domain authority. Proposal/project/council/task modules continue to own their typed relationships.
- Linking an `EXTERNAL_RESEARCHER_USER` account to a profile does not make it a PI, member, reviewer, or secretary; those capabilities require an active relationship/assignment on the target record.
- Do not backfill by matching a name, username, email, or free-text `ProposalMember.name`. A later source migration may backfill only through an exact active profile-account link; ambiguity remains unresolved and reportable.

### Existing seams to preserve

- Reuse Story 1.9 lifecycle semantics and database-clock pattern from proposal participation/assignment migrations and services.
- Reuse the source-owned context-version and `runAuthorizedMutationV1` patterns from `apps/api/src/permissions/authorization-v1.service.ts`.
- The current Prisma schema has `User`, `OrganizationUnit`, and `UserOrganizationScope`, but no researcher profile/account-link model; add a migration and do not repurpose `User.unit` as link authority.

### Latest technical specifics

- Prisma supports interactive transactions and configurable isolation. Use repository-established transaction patterns and handle concurrent write conflicts deterministically; do not add a generic retry framework unless the focused operation requires the established `P2034` retry behavior.
- PostgreSQL constraints are the final concurrency backstop; a pre-query alone is insufficient for active-link uniqueness.

### References

- [Source: _bmad-output/epics.md#Story 2.2]
- [Source: _bmad-output/prd.md#FR66, Role-Based Access Requirements, Data-Scope Authorization Requirements, and Audit-Log Requirements]
- [Source: _bmad-output/architecture.md#Relationship Lifecycle Contract and Researcher Profile Ownership]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Request-Wide Evaluation Context, Context Version and Atomic Mutation, and Audit Contract]
- [Source: _bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md]
- [External: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted after Story 2.1 with explicit 1:1 lifecycle cardinality, database constraints, identity-only semantics, and concurrent-writer requirements.

### Completion Notes List

- Ultimate context-engine analysis completed; link lifecycle, constraints, scope, disclosure, audit, and no-authority semantics are implementation-ready.

### File List
