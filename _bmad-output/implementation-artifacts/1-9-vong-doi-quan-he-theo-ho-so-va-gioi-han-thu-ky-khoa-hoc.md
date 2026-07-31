---
baseline_commit: ba3b835088b424de62dfae70963226f8c28b9169
---

# Story 1.9: Record-Scoped Relationship Lifecycle and Scientific Secretary Limits

Status: done

## Story

As a user assigned to a record,
I want my authority to begin and end according to the real relationship lifecycle,
so that a past relationship or scientific-secretary title cannot grant authority beyond its duties.

## Acceptance Criteria

1. Given a participation or assignment relationship has a status and effective interval, when `effectiveFrom <= asOf < effectiveUntil` and its status is `ACTIVE`, then it can contribute its registered actions; at expiry, suspension, or revocation, its authority stops immediately.
2. Given a source domain supplies relationships to policy, when shared authorization invokes a fact-provider port, then the source domain retains ownership of its data, version, and lifecycle; shared policy neither reads domain persistence directly nor stores a replacement generic authority table.
3. Given an actor has multiple valid relationship types on one record, when policy and UI process that record, then every relationship is preserved and actions are additive only after all denials apply; overlapping same-type relationships are rejected according to registry multiplicity.
4. Given an actor is an active scientific secretary of a record, when they perform granted meeting-material, minutes, file, task, tracking, or draft-summary work, then the backend permits the corresponding administrative action; reviewer assignment, scoring, membership change, approval, rejection, and final decision remain denied.

## Tasks / Subtasks

- [x] Task 1: Complete the executable V1 relationship-lifecycle contract (AC: 1-3)
  - [x] Extend `packages/permissions` as the sole registry owner with every canonical relationship type and its multiplicity/composition rule from `AUTHORIZATION-CONTRACTS.md`; do not create a second registry in API or web code.
  - [x] Define the typed, runtime-validated source fact/port contract: relationship type, actor, target domain/record, `ACTIVE|SUSPENDED|ENDED|REVOKED`, UTC effective interval, and source-owned context version. Invalid, stale, ambiguous, or unavailable facts must resolve fail-closed.
  - [x] Define exact V1 administrative secretary action IDs only for actions backed by an implemented source surface. Do not invent project, council, ethics, task, meeting, or minutes endpoints that belong to later stories; unknown action IDs remain denied.
  - [x] Keep all active viewer relationship types sorted and visible in `ViewerAuthorizationV1`; an inactive/historical row must not create an allowed action.

- [x] Task 2: Make the proposal domain own durable participation and review-assignment lifecycle facts (AC: 1-3)
  - [x] Add a Prisma migration and schema changes for the current proposal source relationships. Preserve history; replace the current delete-and-recreate membership update with named lifecycle operations that activate, suspend, end, or revoke a relationship and record UTC effective times.
  - [x] Backfill existing valid proposal membership facts as active with a deterministic effective start. Preserve existing proposal/review history and do not alter account-level system roles.
  - [x] Add an explicit proposal fact-provider adapter/port. It alone reads proposal relationship persistence and returns all of the actor's relationships at the one supplied `asOf`; shared authorization and capability projection must consume the port, not Prisma tables.
  - [x] Use the database transaction clock for a request-wide UTC `asOf`, enforce half-open intervals, and increment source-owned relationship/conflict context versions atomically with each lifecycle mutation. A source version mismatch must fail with `CONTEXT_VERSION_MISMATCH` before business mutation.
  - [x] Enforce one overlapping active relationship per actor + proposal + canonical relationship type, including concurrent writers. Do not silently collapse duplicates with a `Set`; reject the write with a clear business error and leave no partial update.

- [x] Task 3: Apply lifecycle facts and secretary boundaries to existing proposal authorization (AC: 1-4)
  - [x] Refactor `ProposalParticipationService`, `proposal-participation.ts`, review-access resolution, and `proposal-capability-v1.ts` to use all source facts at the supplied `asOf`, preserve distinct active types, and emit their real status/effective interval.
  - [x] Re-evaluate every protected proposal mutation in its transaction using current source facts. Expired, suspended, revoked, unresolved, or stale relationships must stop access immediately even if a previously returned capability permitted it.
  - [x] Make an active proposal scientific secretary record-scoped only. Keep the existing conflict protections for review candidacy and final decisions, and additionally deny `proposal.review.assign` whenever the acting staff user is secretary/participant on that proposal.
  - [x] Do not grant a secretary draft editing, submission, reviewer visibility, scoring, reviewer assignment, participation/membership change, approval, rejection, or final-decision authority. Administrative secretary allows can be exposed only when an implemented action and source endpoint exist; otherwise return a visible `ACTION_NOT_GRANTED` capability entry.
  - [x] Preserve current list/detail parity, disclosure restrictions, organization scope, workflow guards, audit logging, and the source-owned authorization counters added in Story 1.8.

- [x] Task 4: Add focused lifecycle, authorization, and regression coverage (AC: 1-4)
  - [x] Test UTC boundary cases: before start, exact start, before end, exact end, unbounded end, suspension, end, revocation, and a capability becoming stale after a relationship change.
  - [x] Test source-port isolation and fail-closed behavior for unavailable, invalid, stale, and ambiguous facts. Prove the same `asOf` is passed to every resolver in an authorization evaluation.
  - [x] Test multiple distinct active types are preserved, duplicate/overlapping same types are rejected including the persistence/concurrency path, and no inactive row grants a capability.
  - [x] Test secretary actions are limited to implemented administrative actions and are record-scoped; explicitly deny reviewer assignment, scoring, membership change, approval, rejection, and final decision, including when the secretary also has a staff system role.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and architecture guardrails

- This story establishes the lifecycle foundation only for the already implemented proposal source domain. Project, council, ethics, task, meeting, minutes, and file workflow surfaces remain source-owned future-domain work; do not create placeholder endpoints or a generic cross-domain authority table.
- `packages/permissions` owns executable V1 schemas, exact registries, fixtures, and compatibility rules. A source domain owns rows, lifecycle transitions, audit records, and source versions behind a fact-provider port.
- Use one database-clock UTC `asOf` per protected request and the half-open rule `effectiveFrom <= asOf < effectiveUntil`; null end is unbounded. Revocation wins immediately. Never physically delete relationship history.
- All denials override relationship allows. Preserve every relevant relationship; never select a highest role, infer authority from a global role, or expose another user's relationship/conflict source.
- The canonical registry requires multiplicity one for each proposal PI, co-investigator, member, and scientific-secretary type per actor+proposal. It also requires all active types to remain visible. Make the storage and service guard enforce this rather than depending on UI validation.

### Existing seams to preserve and update

- `apps/api/prisma/schema.prisma`: `ProposalMember` currently has only `userId`, `participationRole`, and `createdAt`; the existing `replaceMembers` physically deletes it. Migrate this proposal-owned model safely and retain legacy history.
- `apps/api/src/research-proposals/research-proposals.service.ts`: its shared response projection supplies both list and detail. Keep it the common capability projection seam and update authorization versions within the same lifecycle transaction.
- `apps/api/src/research-proposals/proposal-participation.service.ts` and `apps/api/src/proposals-shared/proposal-participation.ts`: today they derive effective time from `createdAt`, treat every row as active, and collapse identical roles. Replace that inference with source facts and preserve full relationship data.
- `apps/api/src/proposals-shared/proposal-review-access.ts` and `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts`: existing review assignments retain revoked history and increment the relationship version. Align them with the same fact/interval semantics without weakening review disclosure.
- `apps/api/src/permissions/authorization-v1.service.ts` remains the central V1 evaluation and public denial-reason seam. Extend adjacent adapters/resolvers; do not replace it with a parallel policy engine.
- `apps/api/src/permissions/proposal-capability-v1.ts` currently emits every viewer relation as active and lets a staff actor see reviewer-assignment authority without a participation conflict check. Correct both conditions and keep list/detail responses identical.
- `apps/web` consumes validated capability data from Story 1.8. It must not infer lifecycle or secretary authority locally. Any unavailable administrative action remains visibly blocked with the backend reason.

### Security, audit, and data-integrity requirements

- Mutating a relationship lifecycle is security-relevant: validate DTO input at the API boundary, enforce scientific-management organization scope and conflict policy, audit actor/target/from-to status/effective interval/context version, and never log secrets.
- A failed overlap/conflict/version check must persist neither a relationship mutation nor an authorization counter increment. Protect concurrent writers at the database/service transaction boundary.
- Do not disclose reviewer identity, raw scores/comments, or conflict sources to PI, member, or secretary audiences. Account system roles remain exactly the four canonical roles; a record relationship never becomes a global role.

### Testing requirements

- Use the repository's built `node:test` pattern under `tests/*.test.mjs`; run tests through the root scripts after schema generation/build.
- Include allowed and denied authorization tests for canonical and legacy/unknown relationship data. An API capability assertion alone does not prove mutation enforcement: test a stale capability followed by lifecycle change and denied mutation.
- Add migration-safe test coverage for legacy members and direct checks that archived relationship rows remain queryable as history but do not contribute authorization.

### References

- [Source: _bmad-output/epics.md#Story 1.9]
- [Source: _bmad-output/prd.md#FR6a, FR6d, FR6e, AC-PERM-04, NFR7, and NFR8]
- [Source: _bmad-output/project-context.md#Authorization And Security Rules, Audit Logging Rules, Data And State-Management Rules, and Testing Rules]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Request-Wide Evaluation Context, Relationship Type Registry, and Viewer Authorization Contract]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md#AD-9 Canonical Lifecycle Time]
- [Source: _bmad-output/implementation-artifacts/1-8-capability-response-va-giao-dien-khong-suy-dien-quyen.md]
- [Source: Prisma Migrate documentation - migration history and schema are source-controlled; no Prisma version change is required for this story.]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from canonical PRD/Epic requirements, V1 authorization architecture, Story 1.8 completion record, current proposal authorization seams, and a source audit on 2026-07-31.
- 2026-07-31: Red lifecycle test initially failed because `isRelationshipActiveAt` did not exist; it now covers the UTC half-open boundary and inactive secretary rows.

### Completion Notes List

- Completed: added proposal-member and review-assignment lifecycle columns with a backfill migration; lifecycle reads now reject expired, suspended, ended, and revoked facts at the UTC half-open boundary.
- Completed: added the V1 runtime-validated source relationship-fact contract, an explicit proposal fact-provider seam, and the canonical registry/multiplicity rule in `packages/permissions`.
- Completed: membership changes retain history, use the transaction database clock, reject duplicate active actor/type relationships at both service and PostgreSQL partial-index boundaries, and fail stale capability contexts with `CONTEXT_VERSION_MISMATCH` before the authorization version changes.
- Completed: proposal secretary file operations remain record-scoped; a staff actor who is also a participant/secretary is blocked from reviewer assignment, scoring, approval, rejection, and final decisions.
- Validation on 2026-07-31: `npm run typecheck`, `npm test` (142/142), and `git diff --check` passed.

### File List

- _bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20260731000100_st_19_proposal_relationship_lifecycle/migration.sql
- apps/api/src/proposals-shared/proposal-participation.ts
- apps/api/src/proposals-shared/proposal-review-access.ts
- apps/api/src/proposals-shared/proposal-review-access.service.ts
- apps/api/src/research-proposals/proposal-participation.service.ts
- apps/api/src/research-proposals/research-proposals.service.ts
- apps/api/src/proposal-evaluations/proposal-evaluation-support.ts
- apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts
- apps/api/src/modules/files/files.service.ts
- apps/api/src/permissions/proposal-capability-v1.ts
- apps/web/src/components/research-proposals/proposal-detail-workspace.tsx
- apps/web/src/lib/research-proposals-api.ts
- packages/permissions/src/index.ts
- packages/permissions/src/index.js
- tests/relationship-lifecycle-v1.test.mjs
- tests/proposals-ep02.test.mjs
- tests/proposals-ep03.test.mjs
- tests/proposals-st30.test.mjs

### Change Log

- 2026-07-31: Created implementation-ready Story 1.9 specification from the canonical PRD, epics, authorization contract, current codebase, and Story 1.8 learnings.
- 2026-07-31: Started implementation of the proposal relationship lifecycle and secretary boundary foundation.
- 2026-07-31: Completed lifecycle persistence, source-fact validation, stale-context mutation guard, secretary limits, and focused regression coverage; moved story to review.

### Review Findings

- [x] [Review][Patch] Backend reviewer assignment denies an acting staff user who is an active participant or scientific secretary. [apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts:70]
- [x] [Review][Patch] Review writes recheck current participation and deny an assigned reviewer who later becomes a participant or scientific secretary. [apps/api/src/proposal-evaluations/proposal-reviews.service.ts:233]
- [x] [Review][Patch] `PROPOSAL_CO_INVESTIGATOR` is preserved through normalization and capability projection. [apps/api/src/proposals-shared/proposal-participation.ts:105]
- [x] [Review][Patch] Scheduled-expiry relationships retain their real `effectiveUntil` in the capability response. [apps/api/src/permissions/proposal-capability-v1.ts:72]
- [x] [Review][Patch] Membership uses an interval-exclusion constraint so non-overlapping active successors are valid. [apps/api/prisma/migrations/20260731000100_st_19_proposal_relationship_lifecycle/migration.sql:21]
- [x] [Review][Patch] Membership reads and duplicate handling run inside the transaction and translate database conflicts to a business error. [apps/api/src/research-proposals/research-proposals.service.ts:613]
- [x] [Review][Patch] Review-assignment lifecycle timestamps now use the database transaction clock. [apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts:128]
- [x] [Review][Patch] File upload rechecks authorization inside the metadata write transaction and compensates object storage on denial. [apps/api/src/modules/files/files.service.ts:111]
- [x] [Review][Patch] Same actor/type membership changes create a lifecycle successor when relationship metadata changes. [apps/api/src/research-proposals/research-proposals.service.ts:619]
