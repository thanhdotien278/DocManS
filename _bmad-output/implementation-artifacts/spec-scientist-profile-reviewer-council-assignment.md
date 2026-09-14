---
title: 'Scientist Profile Reviewer / Council Assignment'
type: feature
created: '2026-09-14'
status: done
route: dispatch
baseline_commit: 72875c89cc89149e02548957e339a5a9e774fb87
review_loop_iteration: 0
context:
  - CONTEXT.md
  - docs/authorization-core-business-baseline.md
  - _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md
---

<frozen-after-approval reason="User explicitly authorized documentation alignment followed by implementation">

## Intent

Complete proposal reviewer/council assignment using existing Scientist Profiles as
the sole candidate identity source. Current code returns independent account and
profile lists and implicitly links accounts during assignment, making selection
ambiguous. Replace that with selection of an eligible existing linked profile;
preserve the current record-scoped review lifecycle, access and disclosure.
The user authorized the complete docs-first implementation without an additional
approval checkpoint. Updated normative documents are written before code.

## Boundaries & Constraints

Always use active profiles in staff scope with an existing active linked internal
or external researcher account explicitly scoped to the proposal host unit.
Require scoped, unconflicted Scientific Management Staff, current proposal token,
valid workflow and completeness evidence. Block PI/team conflicts, self-assignment,
invalid/unresolved context, inactive profile/account and non-revoked duplicates.
Both reviewer and committee_member duties use the same checks. No account linking
inside assignment, no new system roles, no council-management subsystem, no scope
expansion, no unrelated refactoring. No live database deployment is required.
Retain submitted reviews and old assignments. Profile deactivation blocks new
assignments; preserve existing lifecycle rules for historical assignments.
User continuation explicitly requests no test additions or modifications. Verify
with existing checks, builds, schema validation and read-only inspection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior |
| --- | --- | --- |
| Eligible profile | Scoped staff, active linked researcher, eligible proposal | Candidate returned; reviewer or committee_member assignment binds profile/account and audits atomically |
| Invalid identity | Missing/inactive/unlinked profile, inactive/wrong-role account, independent account input | Exclude from candidates or reject mutation; no linking side effect |
| Conflict | PI, active secretary/member, unresolved participation | Exclude or reject for both duty types |
| Invalid authority | Non-staff, wrong scope, missing/stale token, closed workflow | Deny without mutation |
| Duplicate | Existing assigned/completed duty | Exclude or reject |
| Revoke | Valid staff/context/state and nonblank note | Retain row/reviews, append audit, remove access grant |
| Disclosure | PI/team/unrelated caller | No candidate or assignment identity disclosure |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts`: candidates, assignReviewer, resolveReviewerCandidate, revokeAssignment. Reuse runProposalMutation (serializable/current actor/context), shared conflict service, duplicate lookup, assignment history and audit. Replace account-first resolution and implicit link writes. Candidate search must enforce assignable state and same eligibility as creation, including completeness evidence where appropriate.
- `apps/api/src/proposal-evaluations/proposal-evaluations.dto.ts`: pipe currently requires account identifier; change to mandatory bounded profile ID and reject account selection fields. Validate date text and role using current patterns.
- `apps/api/prisma/schema.prisma`: ResearcherProfile linkedUserId unique; ProposalReviewAssignment currently account-bound. Add nullable researcherProfileId FK and reverse relation, index; new application writes always populate it. New scoped migration must preserve legacy rows with null; do not guess backfill. Reuse existing append-only protections.
- `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts`: add optional nullable profile ID to record typing; operational response carries profile ID under existing disclosure.
- `apps/web/src/lib/proposal-evaluations-api.ts`, `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx`: remove independent account input/list; profile-only selection, search/empty/error handling and existing revoke note mapping. Keep backend capabilities and current context token. Ensure capability changes refresh candidate availability.
- `tests/proposals-ep03.test.mjs`, `tests/helpers/evaluation-prisma.mjs`: existing legacy mocks may not implement newer transaction/context logic; establish pre-existing failures instead of broad fixture refactoring. Do not add or modify tests, per the latest user instruction; existing checks may be run.
- Governing docs updated: baseline, permission matrix, user flows, UX, PRD FR17, Epic 5 Story 5.3, authorization contract section 12.

## Tasks & Acceptance

- [x] Update relevant governing docs and requirements before implementation.
- [x] Add profile provenance schema field and preservation migration.
- [x] Implement profile-only candidate discovery and transaction-time validation, remove implicit linking, preserve assign/revoke audit and record access.
- [x] Update DTO/API contracts and existing assignment UI.
- [x] Verify the implementation using existing checks and static inspection; leave test files unchanged.
- [x] Run API build, typecheck and appropriate existing regression checks; record actual failures and remaining validation limitations.

Given scoped staff and an eligible profile, when either assignment role is saved,
then the persisted duty and audit identify the same profile/account without link
mutation. Given profile/account changes after search, when confirmation occurs,
then the backend rechecks current data and denies invalid candidates. Given
revocation, when prior assignee accesses the package/files, then the revoked
assignment no longer grants access. Given existing histories, when migration is
applied, then no historical relationship or submitted evidence is rewritten.

## Implementation Notes

- Resumed under explicit user direction: no explanations and no writing/modifying tests. This supersedes the original test-authoring task.

- Account-link provisioning is the separate Story 2.2 prerequisite. The current profile-management UI does not expose linking; this change must not claim that it does. Existing valid linked profiles are eligible, unlinked profiles remain excluded.

- Implemented source-profile provenance on new assignments with a nullable restrictive foreign key; preserved legacy null profile IDs, reviewer account access, and record-scoped duty types.
- Replaced independent account discovery/selection and implicit linking with backend-filtered active linked profiles. Mutation rechecks scope, account/profile state, completeness, conflicts, duplicates and current proposal context in the existing serializable transaction, holding profile/account read locks until commit.
- Assignment/revocation audit now includes source profile, account and duty role. No global roles, permission actions, or separate council aggregate were added.
- Validation passed: API and web production builds, typecheck, Prisma validation, diff whitespace check, and 27 existing authorization/relationship/profile checks. The unchanged runtime script prepared before the continuation passed on isolated PostgreSQL for eligible discovery, both roles, completeness, PI conflict, stale token, inactive profile, audit provenance and revoke access/history. No test files were added or modified.
- Initially applied migrations only to the disposable verification database and inspected the nullable column and restrictive FK. Application deployment is recorded below. Read-only local data check found one active profile and zero active linked profiles, so local assignment use requires account-link provisioning first.
- Baseline full suite before code changes: 157 tests, 108 passed and 49 failed, including obsolete transaction mocks (`tx.user.findUnique is not a function`) and unrelated source expectations. Those test files were left unchanged.

## Spec Change Log

## Review Triage Log

- Fixed: candidate lookup failure previously hid the entire evaluation panel. Candidate errors now remain in the assignment section while progress/history stays visible.
- Fixed: completeness confirmation changes the context without necessarily changing the assignment capability. Candidate refresh now follows aggregate version changes.
- Fixed: missing submittedAt could accept unrelated old completeness evidence. Submitted/resubmitted assignment now fails closed when the current submission instant is absent.
- Verified: active profile/account and explicit active organization scope predicates precede candidate disclosure; profile/account locks and serializable transaction protect assignment writes. Audit and revocation use the same transaction.
- Limitation: independent reviewer runs were interrupted; their results are unavailable. Direct source review and reported build/runtime checks completed. Browser visual verification was not performed.
- Final typecheck, API build, whitespace check and 27 existing checks passed after review fixes; test files remain unchanged.

## Verification

- `npm run build:api`
- `npm run typecheck`
- Relevant existing authorization/relationship tests, reporting pre-existing failures separately.
- `npx prisma validate --schema apps/api/prisma/schema.prisma`
- `git diff --check`

## Local deployment continuation

- Applied `20260914010000_scientist_profile_assignment_binding` to local `docmansystem` using `prisma db execute --file`, then recorded it with `prisma migrate resolve --applied`. Read-back confirmed the nullable column, restrictive foreign key and successful migration record.
- Used this targeted path because normal deploy would also run the unrelated pending `20260914000000_finalize_proposal_team_model`, which drops `proposal_delegations`. That migration remains pending. The database also records `20260906000000_researcher_identity_links`, absent from this checkout. Neither discrepancy was rewritten or removed.
- Test files remain unchanged. No account/profile links or assignment records were created in the application database.
