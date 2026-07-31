---
baseline_commit: dea95ed512b139e77e6cb8ef79d83d40a7e685d3
---

# Story 1.8: Capability Response and Non-Inferential Permission UI

Status: done

## Story

As a user participating in a record,
I want the UI to show relationships and actions calculated by the backend,
so that I understand what I can or cannot do on the current record.

## Acceptance Criteria

1. Given the backend returns a protected record or list item, when the actor has one or more relationships on that record, then the response conforms to `ViewerAuthorizationV1`, preserves every security-relevant relationship of that actor, and uses exact `PermissionActionV1` values, V1 codes, and clear reasons for allowed and blocked actions.
2. Given the actor has an otherwise permitting relationship but is blocked by a conflict or workflow-state guard, when the UI renders the action, then the action remains visible but disabled with the backend reason; the UI does not select a highest role, union permissions, or re-evaluate policy.
3. Given a capability contains an unsupported schema version or code, when the client processes the response, then it fails closed for protected actions and shows a reload/support state rather than guessing permission.
4. Given the same record appears in a list and in detail, when its context version is unchanged, then relationship labels, allowed actions, and blocked actions are consistent, and state is not represented by colour alone.

## Tasks / Subtasks

- [x] Task 1: Complete the executable V1 viewer-capability contract (AC: 1, 3)
  - [x] Export `ViewerAuthorizationV1`, viewer-relationship types/statuses, exact runtime validators, and a fail-closed capability parser from `packages/permissions`; arrays must be canonical-ID sorted and action/code recognition exact.
  - [x] Reuse the V1 registries and public decision reasons from Story 1.7. Do not add a second action or decision vocabulary and do not expose other users, reviewer assignments, or conflict sources.
- [x] Task 2: Project proposal capabilities exclusively in the backend response seam (AC: 1, 2, 4)
  - [x] Add one proposal capability projector/service at the existing `apps/api/src/permissions` / `research-proposals` boundary. It must produce the identical `ViewerAuthorizationV1` for a list item and detail response given the same proposal, viewer facts, and context version.
  - [x] Map only currently implemented proposal actions (`proposal.read`, `proposal.draft.update`, `proposal.submit`, review assignment/submission, decision, and file actions where applicable) from authoritative existing checks. Map proposal participation and a viewer's own review assignment to canonical V1 relationship IDs. Each blocked action must remain present with the V1 denial code and public Vietnamese reason; preserve all current viewer relationships rather than choosing a highest role.
  - [x] Treat unavailable/invalid capability context as a fail-closed protected capability. Keep existing endpoint enforcement authoritative; this story does not implement Story 1.9 relationship lifecycle, Story 1.10 delegation, or migrate unrelated domains.
- [x] Task 3: Consume backend capabilities in proposal list and detail UI without policy inference (AC: 2-4)
  - [x] Replace proposal action/role render decisions derived from `account.systemRole`, `canEdit`, `canSubmit`, `viewerParticipation.conflict`, or reviewer-assignment hints with the validated `capability` response for protected controls in the proposal list/detail workspace and its evaluation/review/decision panels.
  - [x] Show every backend-provided viewer relationship as text-labelled badges. Render blocked protected actions disabled, with their backend reason in accessible text (`title`/described help); never hide them solely because blocked and never rely on colour alone.
  - [x] For unsupported schema/code/malformed capability, disable protected controls and show a clear Vietnamese reload/support message. Do not call protected mutations while fail-closed.
- [x] Task 4: Add regression coverage and validate the story (AC: 1-4)
  - [x] Add focused API/service tests proving multiple viewer relationships are preserved; exact allowed/blocked action IDs and denial codes/reasons are returned; conflict/state blocks remain visible; list/detail capabilities match; and no sensitive relationship/conflict source leaks.
  - [x] Add focused client capability-parser/UI tests or equivalent deterministic component-level checks for unknown schema/version/code fail-closed handling and text-labelled disabled controls.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

### Review Findings

- [x] [Review][Decision resolved: expand Story 1.8] Replace fabricated authorization context versions with source-owned facts — `evaluatedAsOf` and relationship effective times currently reuse proposal `updatedAt`, while relationship/conflict versions are derived from counts/booleans. This cannot detect same-count relationship replacements or a reviewer assignment change. Implement source-owned version/effective-time facts in this story. [apps/api/src/permissions/proposal-capability-v1.ts:33]
- [x] [Review][Patch] Do not permit a conflicted actor to consolidate review results [apps/api/src/permissions/proposal-capability-v1.ts:79]
- [x] [Review][Patch] Do not permit an assigned reviewer to make the final decision [apps/api/src/permissions/proposal-capability-v1.ts:89]
- [x] [Review][Patch] Reject a capability whose allowed and blocked action arrays overlap [packages/permissions/src/index.ts:150]
- [x] [Review][Patch] Bind a client capability to its loaded proposal record and domain before enabling controls [apps/web/src/lib/research-proposals-api.ts:70]
- [x] [Review][Patch] Reject unsorted or duplicated viewer relationships in the capability validator [packages/permissions/src/index.ts:145]
- [x] [Review][Patch] Keep blocked supplement and file-upload controls visible with their backend reason [apps/web/src/components/research-proposals/proposal-detail-workspace.tsx:613]
- [x] [Review][Patch] Restrict the supplement-request capability to `submitted`, matching the backend workflow guard [apps/api/src/permissions/proposal-capability-v1.ts:81]

## Dev Notes

### Scope and architecture guardrails

- The normative contract is `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`, sections 2, 3, 5, 6, and 11. `packages/permissions` owns executable schemas/registries; source domains provide facts; the UI consumes validated response data only.
- `ViewerAuthorizationV1` contains only the current viewer's security-relevant relationships, `allowedActions`, `blockedActions` with exact V1 code/reason, `policyVersion`, `evaluatedAsOf`, and `contextVersion`. Sort arrays canonically; do not reveal another person's assignment, reviewer identity, conflict source, or undisclosed review data.
- All denial conditions override additive relationship allows. Multiple relationships are preserved, never collapsed to a highest role. Unsupported schema/action/code is a client-side fail-closed condition, not a fallback to existing boolean hints.
- Limit this story to the existing research-proposal protected list/detail surface. Proposal relationship lifecycle/effective intervals, delegation, and new source-domain integrations are explicitly deferred to Stories 1.9–1.10 and later epics.

### Existing seams to preserve and update

- `packages/permissions/src/index.ts` is the existing V1 action/decision registry and validators. Extend it; do not duplicate constants in API or web code.
- `apps/api/src/permissions/authorization-v1.service.ts` owns V1 evaluation/public reason behavior. Reuse it or add a small adjacent projector; do not create a parallel policy engine.
- `apps/api/src/research-proposals/research-proposals.service.ts` already runs `toProposalResponse` for both list and detail. Add the capability at this shared projection point so list/detail cannot diverge. Existing checks still enforce every mutation endpoint.
- `apps/api/src/research-proposals/proposal-participation.service.ts` resolves only the viewer's proposal relationships in batch for list responses. Its legacy `role` is a highest-precedence presentation value; do not use it as capability authority. Reuse its complete `roles` output to prevent extra per-row queries and preserve all returned roles.
- `apps/web/src/lib/research-proposals-api.ts`, `apps/web/src/components/research-proposals/research-proposals-panel.tsx`, `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`, `proposal-evaluation-panel.tsx`, and `proposal-decision-panel.tsx` currently consume legacy participation and boolean/render hints. Migrate protected presentation to one validated capability helper; do not calculate actions from `ShellAccount.systemRole`.
- Existing proposal review/decision panels may keep their own authoritative API checks unless their control visibility is within the shared capability actions implemented here. Do not broaden this story into an EP-03 refactor.

### Testing requirements

- Follow the repository's `node:test` built-output pattern under `tests/*.test.mjs`; API code is built to `dist/apps/api` and the permissions package is resolved from its workspace source.
- Cover exact action recognition, unknown version/code, canonical sorting, multiple relationships, blocked conflict/workflow actions, data-minimising output, and list/detail equality for unchanged context.
- Client tests must prove a malformed/unknown capability disables protected actions and provides non-colour text guidance. A source-only API assertion does not satisfy AC 3.
- Mandatory final gates: `npm run typecheck`, `npm test`, and `git diff --check`.

### References

- [Source: _bmad-output/epics.md#Story 1.8]
- [Source: _bmad-output/prd.md#FR6c and UX Requirements]
- [Source: _bmad-output/project-context.md#Authorization And Security Rules, UX/UI Rules, and Testing Rules]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Viewer Authorization Contract]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md#AD-6 Server Capability Contract]
- [Source: _bmad-output/implementation-artifacts/1-7-hop-dong-phan-quyen-va-bo-danh-gia-policy-dung-chung.md]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from the canonical Story 1.8 epic/PRD requirements, the adopted V1 authorization contracts, Story 1.7 completion record, project context, and current proposal list/detail API/UI seams.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added the executable `ViewerAuthorizationV1` contract and strict runtime validation for exact action/code IDs, including fail-closed handling of unknown contracts in the web API helper.
- Added a proposal capability projector shared by list and detail response shaping; it preserves every current viewer relationship and returns sorted allowed/blocked V1 actions with public Vietnamese reasons.
- Migrated proposal list/detail relationships plus draft, submit, supplement, evaluation, review, and decision control states to backend capability data; blocked panels retain a disabled control with the backend reason.
- Reused `publicAuthorizationReasonV1` from the Story 1.7 policy seam for every projected denial reason.
- Final validation on 2026-07-31: `npm run typecheck`, `npm test` (135/135), and `git diff --check` passed.
- Resolved the review decision to use source-owned authorization context: proposal relationship/conflict counters increment in the mutation transactions that change participation or review-assignment state; relationship effective times now come from membership, ownership, and assignment source records.
- Validation after the review follow-up on 2026-07-31: `npm run typecheck` and `npm test` (135/135) passed.
- Resolved all seven remaining review patches: projector/backend guard alignment, disjoint canonical capability validation, capability record binding, and disabled supplement/upload controls with backend reasons.
- Final validation after review fixes on 2026-07-31: `npm run typecheck` and `npm test` (138/138) passed.

### File List

- _bmad-output/implementation-artifacts/1-8-capability-response-va-giao-dien-khong-suy-dien-quyen.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/src/permissions/proposal-capability-v1.ts
- apps/api/src/permissions/authorization-v1.service.ts
- apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts
- apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts
- apps/api/src/proposal-evaluations/proposal-reviews.service.ts
- apps/api/src/proposals-shared/proposal-participation.ts
- apps/api/src/proposals-shared/proposal-review-access.ts
- apps/api/src/proposals-shared/proposal-review-access.service.ts
- apps/api/src/research-proposals/research-proposals.service.ts
- apps/api/src/research-proposals/proposal-participation.service.ts
- apps/api/src/modules/files/files.service.ts
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20260731000000_st_18_authorization_context_versions/migration.sql
- apps/web/src/components/research-proposals/proposal-detail-workspace.tsx
- apps/web/src/components/research-proposals/research-proposals-panel.tsx
- apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx
- apps/web/src/components/research-proposals/proposal-review-form.tsx
- apps/web/src/components/research-proposals/proposal-decision-panel.tsx
- apps/web/src/lib/research-proposals-api.ts
- packages/permissions/src/index.ts
- packages/permissions/src/index.js
- tests/authorization-v1.test.mjs
- tests/proposal-capability-ui-source.test.mjs
- tests/proposals-st30.test.mjs

### Change Log

- 2026-07-31: Created implementation-ready Story 1.8 specification from the canonical capability contract and current proposal seams.
- 2026-07-31: Started implementation of proposal capability projection and fail-closed detail UI consumption.
- 2026-07-31: Completed capability projection and non-inferential proposal list/detail UI; moved to review.
- 2026-07-31: Addressed review decision: added source-owned proposal authorization-context counters and relationship effective times; Story remains in progress pending the other review patches.
- 2026-07-31: Addressed all seven remaining code-review patches; moved Story 1.8 back to review.
- 2026-07-31: User confirmed final acceptance; marked Story 1.8 done.
