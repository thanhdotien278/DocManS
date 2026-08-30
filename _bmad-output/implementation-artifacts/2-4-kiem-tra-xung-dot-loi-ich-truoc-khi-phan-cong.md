---
baseline_commit: 2ae8c3e
---

# Story 2.4: Kiểm tra xung đột lợi ích trước khi phân công

Status: ready-for-dev

## Story

As a chuyên viên quản lý khoa học,
I want kiểm tra xung đột trước khi gán vai trò nhạy cảm,
so that không xảy ra tự đánh giá, tự phê duyệt hoặc thư ký ra quyết định trái thẩm quyền.

## Acceptance Criteria

1. **Evaluate a precise candidate and target.** Given an authorized operator submits `candidateResearcherProfileId`, exact target domain/record/organization, proposed relationship or `PermissionActionV1`, and expected context tokens, when preflight runs, then it resolves the candidate profile/account link and every active source-owned relationship at one request-wide database `asOf`, and returns allowed/blocked, the canonical primary code, a minimum-disclosure reason, and all required context versions.
2. **Fail closed on identity or source uncertainty.** Given candidate identity, account link for an account-required assignment, source facts, contract version, or context version is unresolved, stale, ambiguous, or unsupported, when preflight runs, then it returns the corresponding higher-priority context denial rather than mislabelling the result `CONFLICT_DENIED`. It discloses no hidden profile, assignment, or conflict-source fact.
3. **Deny proposal self-review and self-decision.** Given a candidate is an active proposal PI, co-investigator, or member, when proposed as reviewer or approval authority on that same proposal, then the backend returns `CONFLICT_DENIED`; neither preflight consumers nor the authoritative assignment/decision mutation create an assignment, access, notification, or decision side effect.
4. **Constrain scientific secretary actions.** Given a candidate is the active scientific secretary on the target, when proposed for scoring, reviewer assignment, membership change, approval, rejection, or final decision, then the backend denies according to conflict/non-delegable policy. The same relationship may still contribute only the exact registered administrative actions for meeting material, minutes, file, task, tracking, and draft summary.
5. **Preserve all relationships and record isolation.** Given the candidate holds multiple active relationships on one record and different relationships on another, when both targets are evaluated, then every same-record relationship participates in denial evaluation without selecting a “highest role”; denial applies only to the conflicting record and the other record is evaluated independently.
6. **Do not infer external authority.** Given a candidate has system role `EXTERNAL_RESEARCHER_USER`, when preflight evaluates a proposal/project/review assignment, then the role alone never makes the candidate eligible; eligibility requires the exact active relationship/assignment and disclosure context for that target.
7. **Treat preflight as descriptive, not authority.** Given preflight was allowed but participation, account link, workflow state, delegation, scope, or context version changes before assignment, when the owning mutation runs, then it re-evaluates in its write transaction or atomically compares all multi-record tokens and returns `CONTEXT_VERSION_MISMATCH`/current denial without writing. A cached preflight response never grants permission.
8. **Ship one end-to-end source integration only.** Given the proposal provider is the initial contract-complete source, when proposal reviewer assignment is executed, then the existing proposal assignment service consumes the conflict assertion in its transaction. Future project/council/ethics/task integrations remain disabled until their owning stories pass the integration gate.

## Tasks / Subtasks

- [ ] Task 1: Define exact preflight and conflict-fact contracts (AC: 1-7)
  - [ ] Add `ConflictPreflightRequestV1`, minimum-disclosure response, candidate identity version, multi-record context tokens, proposed-action/relationship registry, and source-provider port to the shared contract owner.
  - [ ] Add exact `researcher-profile.conflict.preflight`; preserve canonical decision ordering, non-delegable actions, and unknown-code/version fail-closed behavior.
  - [ ] Define proposal conflict fixtures for PI, co-investigator, member, secretary, reviewer, clean candidate, multiple relationships, cross-record isolation, inactive intervals, and every context failure.

- [ ] Task 2: Implement profile identity resolution and the proposal conflict provider (AC: 1-5, 7)
  - [ ] Resolve profile and active account link separately. A profile-only person may be checked for participation conflict, but an assignment requiring login remains ineligible until an exact active account link exists.
  - [ ] Implement proposal conflict facts behind the proposal-owned provider using explicit `researcherProfileId`, lifecycle, workflow/context versions, and one `asOf`; the researcher module must not query proposal persistence directly.
  - [ ] Return only public code/reason from normal preflight. Full rule outcomes and conflict sources belong only in redacted privileged audit.

- [ ] Task 3: Implement preflight API and authoritative assertion (AC: 1-7)
  - [ ] Add a scoped preflight service/endpoint with DTO validation, source registry dispatch, denial precedence, correlation ID, and no-existence-leak behavior.
  - [ ] Expose a server-internal assertion for owning mutations. Wire it into current proposal reviewer assignment in the same transaction, including expected target and profile/link versions.
  - [ ] Ensure denied attempts create only the required redaction-safe audit outcome and no assignment/notification/access side effect.

- [ ] Task 4: Add capability-driven preflight UX where the proposal assignment UI already exists (AC: 1-7)
  - [ ] Show clean/blocked state and plain-language backend reason for the selected candidate without exposing who or which hidden relationship caused the conflict.
  - [ ] Keep the final assignment action responsible for refresh/recheck; handle stale preflight by refreshing candidates/context, not blind retry.

- [ ] Task 5: Verify conflict, TOCTOU, disclosure, and regression behavior (AC: 1-7)
  - [ ] Test all proposal fixtures, multiple simultaneous relationships, exact interval boundaries, inactive account/link/profile, wrong scope, unresolved/stale/ambiguous source, and denial precedence.
  - [ ] Test an allowed preflight followed by relationship/link/state/version change and prove direct assignment writes nothing; test no notification/access artifact on denial.
  - [ ] Test public reason/audit redaction, no hidden candidate existence leak, no delegation/system-role override, external-role non-inference, and future sources disabled.
  - [ ] Run focused provider/consumer and PostgreSQL tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and policy boundary

- Stories 2.1-2.3 are dependencies. Conflict facts are source-domain facts; the researcher-profile module resolves shared identity and orchestrates providers but never owns proposal relationship persistence.
- The operator performing an assignment and the candidate being evaluated are different subjects. Both need their own authorization/identity context.
- `CONFLICT_DENIED` is used only for a resolved prohibited relationship. Unresolved/stale/ambiguous identity or provider state retains its higher-priority canonical context code.
- Do not implement future council/ethics/project assignment routes. Define compatible contracts and ship proposal end-to-end because current proposal assignment code exists.

### Existing seams to update

- Extend `ProposalParticipationService`, `ProposalReviewAssignmentsService`, and the shared authorization V1 resolver/context-token seam; do not create a second conflict policy engine.
- Reuse the non-delegable registry and denial precedence from `packages/permissions`. A system role or delegation never overrides conflict.
- UI must consume backend reason/capability data and preserve visible disabled actions. It must not locally compare roles or infer the conflict source.

### Testing requirements

- A preflight endpoint test alone cannot satisfy this story. The authoritative proposal assignment mutation must be tested after a stale previously-allowed preflight.
- Include concurrent/source-version cases and multi-record token comparison before any write.

### References

- [Source: _bmad-output/epics.md#Story 2.4]
- [Source: _bmad-output/prd.md#FR67a, Role-Based Access Requirements, Permission Scenario Acceptance, and UX Requirements]
- [Source: _bmad-output/architecture.md#Authorization Decision Contract, AD-2 through AD-6, AD-9, AD-13, and AD-14]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Canonical Decision Registry, Relationship Type Registry, Context Version and Atomic Mutation, and Integration Gate]
- [Source: apps/api/src/permissions/authorization-v1.service.ts, apps/api/src/research-proposals/proposal-participation.service.ts, and apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted with explicit operator/candidate separation, proposal-only first integration, canonical denial mapping, minimum disclosure, and mutation-time recheck.

### Completion Notes List

- Ultimate context-engine analysis completed; preflight and authoritative mutation responsibilities are unambiguous.

### File List
