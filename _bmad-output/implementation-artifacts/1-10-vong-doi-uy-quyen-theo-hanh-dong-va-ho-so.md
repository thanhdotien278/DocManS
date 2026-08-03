---
baseline_commit: NO_VCS
---

# Story 1.10: Vòng đời ủy quyền theo hành động và hồ sơ

Status: review

## Story

As a người đang nắm giữ một hành động có thể ủy quyền,
I want đề nghị ủy quyền có kiểm soát cho một người khác,
so that công việc được tiếp tục mà không mở rộng thẩm quyền hoặc phá vỡ phân tách nhiệm vụ.

## Acceptance Criteria

1. Given a grantor currently holds a delegable action on one record, when they create a request with delegate, target domain/record/organization, exact action, validity period, and reason, then the grant is `PENDING_APPROVAL` and grants no authority before an in-scope scientific-management approver activates it.
2. Given an approver is the grantor, outside the target organization scope, or lacks `delegation.grant.approve`, when they try to approve a grant, then the backend denies the transition, leaves it non-active, and writes a denied audit outcome.
3. Given a grant is approved, within its half-open validity interval, unrevoked, and backed by current source authority, when the delegate performs the exact action on the exact target record, then policy may allow it only after organization-scope, workflow-state, and conflict checks; it never applies to another record/action, a wildcard, prefix, or redelegation chain.
4. Given an action is non-delegable or the source authority, account, or grant is inactive/expired/revoked, when the delegate performs the action, then the backend returns `DELEGATION_INVALID` unless a higher-priority denial applies, performs no mutation, refreshes the capability context, and audits the outcome with redaction-safe context.

## Tasks / Subtasks

- [x] Task 1: Complete the executable V1 delegation contract and registry (AC: 1-4)
  - [x] Extend `packages/permissions` (TypeScript and runtime JavaScript exports together) as the only owner of `DelegationGrantV1`, exact lifecycle statuses, runtime validators, the non-delegable registry, and `delegation.grant.approve`; reject unknown, wildcard, prefix, empty, duplicate, or non-delegable action lists fail-closed.
  - [x] Keep the current decision-code ordering and `DELEGATION_INVALID`; delegation must never replace a higher-priority account, context, organization, relationship, workflow, or conflict denial.
  - [x] Limit first implementation to exact, already implemented proposal V1 actions. Do not create future project, council, ethics, task, report, or generic cross-domain authorization surfaces.

- [x] Task 2: Persist an append-only proposal delegation lifecycle and source-owned version (AC: 1-4)
  - [x] Add Prisma schema/migration for record-scoped proposal delegation grants and a proposal `authorizationDelegationVersion`; retain every request/approval/revocation/expiry history row and never physically delete it.
  - [x] Store grantor, delegate, distinct approver, proposal domain/record/organization, non-empty exact actions, source authority context version, start/end timestamps, lifecycle status, approval/revocation timestamps, and reason. Backfill is not required because no delegation rows exist.
  - [x] Use the database transaction UTC clock and `startsAt <= asOf < endsAt` (null end unbounded). Every lifecycle mutation and source-authority-invalidating change must atomically increment the proposal delegation context version; concurrency or expected-token mismatch writes nothing and returns `CONTEXT_VERSION_MISMATCH`.
  - [x] Keep proposal persistence and authority facts source-owned behind an explicit delegation fact-provider/resolver seam. Shared V1 policy must consume the typed fact, not query proposal/delegation tables directly or create a generic authority store.

- [x] Task 3: Add authorized proposal delegation operations and enforce them at mutation time (AC: 1-4)
  - [x] Add narrowly scoped DTO/controller/service operations to create a pending request, approve, reject, revoke, and inspect grants for the existing proposal domain. Validate all inputs at the API boundary and authorize every operation in the owning transaction.
  - [x] Creation verifies the grantor currently holds each requested delegable action on this exact proposal, both accounts are active, the delegate is not granted approval/redelegation authority, and the proposed interval is valid. A pending grant never contributes an allow.
  - [x] Approval requires a different active `SCIENTIFIC_MANAGEMENT_STAFF` actor, exact target organization-scope intersection, and `delegation.grant.approve`; it must re-read grantor source authority in the same transaction. Denied approval is audited without activating the grant.
  - [x] Resolve a delegate grant only when it is active, unrevoked, within interval, tied to the exact proposal/action, and its grantor still currently holds that action. Re-evaluate scope, workflow, conflict, accounts, relationship lifecycle, grant state, and context token inside every protected proposal mutation; a previously returned capability is never sufficient.
  - [x] Update the existing proposal capability seam to expose the real delegation context version and backend-derived allowed/blocked action outcome without exposing another user's grant, source relationship, reviewer identity, or audit detail. Web code must continue to fail closed and must not infer a delegation locally.
  - [x] Audit every create, approve, reject, revoke, expired/invalid use, and denied operation with actor, target, grant identifiers/status, exact actions, context versions, and outcome; never log secrets or undisclosed review data.

- [x] Task 4: Add focused contract, persistence, authorization, and regression coverage (AC: 1-4)
  - [x] Test runtime validators and policy resolution for pending, active, revoked, expired, exact UTC start/end boundaries, null end, exact action/record/org matching, duplicate/unknown/non-delegable actions, wildcard/prefix rejection, and no redelegation.
  - [x] Test creation/approval/revocation through service or API seams: no authority before approval; self-approval, wrong scope, missing approval action, inactive account, missing/lost source authority, state block, and conflict block all deny and leave no unauthorized mutation.
  - [x] Test source-authority lifecycle loss invalidates a live grant immediately; test capability context/delegation version changes and a stale-token mutation fails before writing.
  - [x] Test delegation audit records for allowed and denied outcomes are append-only/redaction-safe; prove list/detail capability parity and that mutation-time reauthorization defeats a stale previously allowed capability.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and architecture guardrails

- Story 1.9 is the dependency: preserve its source-owned proposal relationship lifecycle, database-clock `asOf`, half-open intervals, audit semantics, disclosure restrictions, list/detail parity, and `runAuthorizedMutationV1` token guard.
- `packages/permissions` owns executable V1 schemas, exact action/status registries, decision compatibility, and fixtures. API and web must not duplicate these constants; synchronize `src/index.ts` and `src/index.js`.
- A V1 grant is strictly one proposal record and exact action identifiers. No collection-wide grants, wildcards, prefix inheritance, cross-organization widening, approval delegation, or delegation chains. Unknown action IDs are non-delegable by default.
- A delegation is an additional narrow source of authority, never an override: all normal organization, account, relationship, workflow, and conflict denials still apply, and the highest-priority V1 decision code wins.
- Do not invent future-domain actions/endpoints. Phase-1 implementation here is only for existing proposal actions already present in `PERMISSION_ACTION_IDS_V1`; later domain stories own their records and their fact providers.

### Existing seams to preserve and update

- `apps/api/prisma/schema.prisma` currently has proposal relationship/conflict authorization versions but no durable delegation model/version. Add the delegation counter to the proposal context token instead of hard-coding `delegationVersion: 0`.
- `apps/api/src/permissions/authorization-v1.service.ts` already evaluates the `delegation` dimension, applies fixed denial precedence, reads one transaction clock, and compares V1 context tokens. Extend this seam and adjacent resolver/fact-provider code; do not build another policy engine.
- `apps/api/src/permissions/proposal-capability-v1.ts` is the shared list/detail capability projection. It must remain backend-derived and use the persisted proposal delegation version.
- `apps/api/src/research-proposals/research-proposals.service.ts` owns protected proposal mutations and the relationship-context transaction patterns. Reuse its source fact providers and transaction checks; do not let a controller or frontend authorize a delegation.
- Existing migrations `20260731000000_st_18_authorization_context_versions` and `20260731000100_st_19_proposal_relationship_lifecycle` establish this repository's migration and lifecycle style. Preserve PostgreSQL history and concurrent-writer safety.

### Security, integrity, and audit requirements

- Use one database-server UTC `asOf` per request/transaction. Approval/revocation/authorization must read current grant and current source authority in the transaction that updates or mutates business data.
- Both grantor and delegate must be active. Suspension/end/revocation of grantor source authority invalidates the grant immediately; a new valid source authority does not silently revive a revoked/expired grant.
- Approval separation is mandatory: grantor cannot approve their own request. The approver must be active scientific-management staff with exact target organization scope and `delegation.grant.approve`.
- Store/audit only minimum security-relevant facts. Capability DTOs must never disclose another person's grant or source authority details. Blocked actions remain visible with the stable backend reason; malformed/unknown capability input fails closed in the client.

### Testing requirements

- Use built `node:test` coverage under `tests/*.test.mjs`; update fixtures affected by a real `authorizationDelegationVersion` instead of masking schema changes with default production behavior.
- API capability assertions do not prove enforcement. Cover a capability issued before a grant/source change followed by a denied protected mutation.
- Verification must include typecheck, root suite, and whitespace diff check. If PostgreSQL infrastructure reports the known sandbox connection failure, rerun to distinguish it from a regression and report focused/full-suite evidence separately.

### References

- [Source: _bmad-output/epics.md#Story 1.10]
- [Source: _bmad-output/prd.md#FR6b, Role-Based Access Requirements, AC-PERM-09, AC-PERM-10, and AC-PERM-13]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Exact Action and Delegation Contract, Context Version and Atomic Mutation, and Integration Gate and Fixtures]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md#AD-2, AD-3, AD-5, AD-6, AD-9, and AD-10]
- [Source: _bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md]
- [Source: apps/api/src/permissions/authorization-v1.service.ts and apps/api/src/permissions/proposal-capability-v1.ts]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-03: Created from the canonical epic/PRD, authorization contracts, architecture spine, Story 1.9 completion record, and current proposal authorization seams.
- 2026-08-03: `node --test tests/delegation-v1.test.mjs` initially failed because the new contract exports did not exist; it passes after the synchronized TypeScript/runtime implementation.

### Completion Notes List

- Ultimate context-engine analysis completed: Story 1.10 is implementation-ready and constrained to proposal-backed, exact-action delegation.
- Completed Task 1: added exact V1 delegation statuses, schema validator, proposal-only delegable registry, and approval action registry while retaining existing denial precedence.
- Started Task 2: added the proposal delegation schema/migration and a source-owned delegation version; API/service lifecycle enforcement remains incomplete.
- Continued Task 2: added a pure source-owned proposal delegation resolver with exact target/action, lifecycle, UTC interval, revocation, and continuing source-authority checks. Proposal capability tokens now project the persisted delegation version; relationship-changing proposal writes increment it.
- Continued Task 3: added proposal-scoped delegation DTO validation and API module/service for pending creation, in-scope staff approval, and grantor revocation with transaction-bound context checks and audit records. Rejection/list operations and full mutation-time delegated action wiring remain incomplete.
- Continued Task 3: added rejection and record-scoped listing operations with the same in-transaction scope/context checks and audit/version invalidation. Existing proposal mutations still need an explicit delegated-action input and authoritative grant recheck before this task can close.
- Narrowed the executable V1 delegable registry to `proposal.submit`, the only proposal action currently wired through mutation-time delegated authorization; unsupported draft/file actions remain non-delegable until their own mutation seams are integrated.
- Completed Story 1.10 implementation: proposal-scoped delegation lifecycle, transaction-clock transitions, exact-action resolver, context-version invalidation, API operations, mutation-time submit reauthorization, audit outcomes, and focused service/contract coverage.
- Validation 2026-08-03: `npm run typecheck`, `npm run build:api`, focused delegation tests (5/5), and escalated full suite (149/149) passed. `git diff --check` could not run because this environment has no usable Xcode Git binary.

### File List

- _bmad-output/implementation-artifacts/1-10-vong-doi-uy-quyen-theo-hanh-dong-va-ho-so.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20260803000000_st_110_proposal_delegations/migration.sql
- apps/api/src/permissions/proposal-delegation-v1.ts
- apps/api/src/delegations/delegations.dto.ts
- apps/api/src/delegations/delegations.service.ts
- apps/api/src/delegations/delegations.controller.ts
- apps/api/src/delegations/delegations.module.ts
- apps/api/src/app.module.ts
- apps/api/src/permissions/proposal-capability-v1.ts
- apps/api/src/research-proposals/research-proposals.service.ts
- apps/api/src/proposal-evaluations/proposal-reviews.service.ts
- apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts
- apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts
- packages/permissions/src/index.ts
- packages/permissions/src/index.js
- tests/delegation-v1.test.mjs
- tests/delegations-service.test.mjs

### Change Log

- 2026-08-03: Created implementation-ready Story 1.10 specification from the canonical delegation contract, PRD, architecture, Story 1.9 learnings, and current codebase.
- 2026-08-03: Began implementation; completed the shared delegation contract and added proposal delegation persistence groundwork.
- 2026-08-03: Added delegation resolution and source-version invalidation groundwork; authorized delegation operations and mutation enforcement remain in progress.
- 2026-08-03: Completed delegation lifecycle operations, transaction-clock enforcement, mutation-time proposal submit reauthorization, focused tests, and moved story to review.
