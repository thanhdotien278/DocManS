---
baseline_commit: bf24abe990070036e5df23850da49d285e70fba5
---

# Story 1.7: Authorization Contract and Shared Policy Evaluation

Status: done

## Story

As a business owner,
I want every protected access point to use the same backend authorization contract,
so that the same context always produces the same safe decision.

## Acceptance Criteria

1. Given a protected request, when policy evaluation begins, an `AuthorizationContextV1` is created with one UTC `asOf` from the transaction clock, and every resolver receives the same actor, target, action, and `asOf`.
2. Given resolvers return role, organization, relationship, assignment, delegation, state, and conflict context, `RESOLVED_EMPTY` and `NOT_APPLICABLE` never grant access; `UNRESOLVED`, `STALE`, and `AMBIGUOUS` fail closed with the corresponding V1 code.
3. Given multiple denials apply, the primary code follows the canonical `AuthorizationDecisionCodeV1` order while every rule outcome remains in an `AuthorizationAuditV1` record.
4. Given a mutation provides a stale context-version token, the owning transaction saves no business change and returns `CONTEXT_VERSION_MISMATCH` so the client reloads before retrying.

## Tasks / Subtasks

- [x] Task 1: Define the V1 contracts and registries in the existing shared permissions package (AC: 1-4)
  - [x] Export versioned types/validators for action IDs, decision codes, resolver results, context versions, `AuthorizationContextV1`, decision/audit outcomes, and the canonical denial order.
  - [x] Keep action and code recognition exact; unknown version/code fails closed.
- [x] Task 2: Implement a single pure policy evaluator and context factory (AC: 1-3)
  - [x] Build one context using a caller-provided transaction-clock UTC instant and pass exactly that value to all resolvers.
  - [x] Aggregate only explicit allows; fail closed for unresolved/stale/ambiguous dimensions and choose the first applicable denial by canonical order.
  - [x] Return all evaluated outcomes plus a redaction-safe `AuthorizationAuditV1` payload.
- [x] Task 3: Add the API seam for protected command evaluation and atomic context-version comparison (AC: 1, 4)
  - [x] Use the existing `apps/api/src/permissions` boundary; do not add a second policy engine or controller-only authorization path.
  - [x] Obtain `asOf` from the active Prisma transaction clock, then compare expected and current tokens before a supplied mutation callback runs.
  - [x] Surface stable decision codes and Vietnamese reasons without leaking hidden assignments or conflict sources.
- [x] Task 4: Add behavior-level regression tests and validate the story (AC: 1-4)
  - [x] Cover shared `asOf`, resolved-empty/not-applicable non-grants, each unsafe resolver state, deterministic multi-denial order, audit outcomes, and stale-token rollback.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and architectural guardrails

- This story is the shared V1 contract foundation. It must extend `packages/permissions` and the existing `apps/api/src/permissions/permission-policy.ts` seam; do not create a parallel authorization engine, global “business role,” or frontend grant.
- The normative contract is `planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`. The complete registry order is: `UNAUTHENTICATED`, `ACCOUNT_INACTIVE`, `CONTRACT_VERSION_UNSUPPORTED`, `CONTRACT_CODE_UNKNOWN`, `CONTEXT_UNRESOLVED`, `CONTEXT_STALE`, `CONTEXT_AMBIGUOUS`, `CONTEXT_VERSION_MISMATCH`, `ORG_SCOPE_DENIED`, `RELATIONSHIP_INACTIVE`, `WORKFLOW_STATE_DENIED`, `CONFLICT_DENIED`, `DELEGATION_INVALID`, `ACTION_NOT_GRANTED`, `ALLOWED`.
- Resolver outputs must distinguish `RESOLVED_VALUE`, `RESOLVED_EMPTY`, `NOT_APPLICABLE`, `UNRESOLVED`, `STALE`, and `AMBIGUOUS`. Only explicit resolved values can contribute an allow. `RESOLVED_EMPTY`/`NOT_APPLICABLE` cannot imply an allow.
- A protected request gets one transaction-clock UTC `asOf`; never call `new Date()` in individual resolvers. Relationship/delegation intervals use half-open UTC semantics.
- Keep audit append-only and redaction-safe: capture request/correlation IDs, actor, target, exact action, shared `asOf`, policy/schema version, context versions, every outcome, and primary decision. Do not include conflict sources or undisclosed identities in general responses.
- The mutation helper must compare all expected context-version tokens inside the same transaction before invoking the business mutation; mismatch returns `CONTEXT_VERSION_MISMATCH` and must execute no mutation callback.

### Existing seams to preserve

- `packages/permissions/src/index.ts` currently contains the legacy small permission types/evaluator. Consolidate it into the V1 exports; do not let it remain an independent grant source.
- `apps/api/src/permissions/permission-policy.ts` is consumed by the admin foundation tests and must keep legacy admin behavior fail-closed while delegating through the shared V1 decision contract where applicable.
- Existing proposal, review, file, and admin modules have local access checks. Story 1.7 establishes the contract and shared evaluator; do not refactor every domain in this story. Later stories integrate capability responses and relationship/delegation lifecycles.
- Keep the current `node:test` built-output test pattern: API code compiles to `dist/apps/api`, while `packages/permissions` is consumed as TypeScript source by workspace resolution.

### Testing requirements

- Add a focused V1 policy test file under `tests/` with deterministic fixture resolvers. Tests must assert codes, ordered outcomes, shared instant identity/value, and zero mutation calls on token mismatch.
- Preserve canonical-role allow/deny coverage in `tests/admin-foundation.test.mjs`; do not reintroduce legacy role strings as authority.
- Final gates are mandatory: `npm run typecheck`, `npm test`, and `git diff --check`.

### References

- [Source: _bmad-output/epics.md#Story 1.7]
- [Source: _bmad-output/prd.md#Additional Requirements AR3-AR7]
- [Source: _bmad-output/architecture.md#Authorization Decision Contract]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md]
- [Source: _bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from canonical Epic 1, PRD authorization requirements, adopted V1 architecture contracts, current shared permissions package, and Story 1.6 completion evidence.
- Started implementation from the existing shared permissions and API policy seams; no V1 contract, evaluator, transaction clock, or context-version guard existed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Began the V1 foundation with the canonical decision registry, resolver outcome contract, request-wide context builder, deterministic evaluator, transaction-clock helper, and mutation token guard.
- Added focused regression coverage for shared `asOf`, unsafe resolver fail-closed precedence/audit, and zero writes for stale context tokens.
- Completed the V1 action/decision registries, transaction-clock context factory, deterministic fail-closed evaluator, public Vietnamese decision reasons, redaction-safe audit envelope, and stale-token mutation guard.
- Final validation on 2026-07-31: `npm run typecheck`, `npm test` (126/126), and `git diff --check` passed.

### File List

- _bmad-output/implementation-artifacts/1-7-hop-dong-phan-quyen-va-bo-danh-gia-policy-dung-chung.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/src/permissions/authorization-v1.service.ts
- apps/api/src/permissions/permission-policy.ts
- packages/permissions/src/index.ts
- packages/permissions/src/index.js
- tests/authorization-v1.test.mjs

### Change Log

- 2026-07-31: Created implementation-ready Story 1.7 specification from the canonical authorization contracts.
- 2026-07-31: Implemented and validated the shared V1 authorization contract foundation; moved to review.
- 2026-07-31: Applied review fixes for fail-closed context/resolver handling, transaction-bound token comparison, redaction-safe audit payloads, and shared registry runtime use; final gates passed.
