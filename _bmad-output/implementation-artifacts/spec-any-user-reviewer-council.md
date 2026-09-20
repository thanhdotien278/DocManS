---
title: 'Allow any active account as proposal reviewer or council member'
type: 'feature'
created: '2026-09-16'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Authorization applicability — 2026-09-21:** Earlier implementation/demo evidence
below predates the Head/Staff split. It is not a current permission grant or verification
of that split. Current baseline §2.1 requires explicit Head scope and an effective
proposal/project management-officer assignment for Staff management access; neither
role grants leadership final decisions. No seed, account, migration or test is changed
by this documentation update.

**Problem:** Reviewer/council selection only permits linked researcher profiles with host-unit scope.

**Approach:** Allow every active account regardless of role, organization scope or profile, except the proposal PI and active team participants. Use the account picker and retain assignment-scoped review access end to end. Preserve staff authority, workflow/completeness, stale-context, duplicate, expiry/revocation and final-decision conflict checks.

</frozen-after-approval>

## Implementation Notes

- Bounded reversible policy change; no migration, historical backfill or production data mutation. Prior-turn seed script remains outside this change.
- Replace profile selection with account ID in the assignment service, DTO and web picker; retain nullable linked profile provenance in existing schema.
- Update baseline, matrix and authorization contract before code. Remove assignee host-scope checks from review queue/package/submit and shared read/capability evaluation where required.
- Reuse existing participation conflict and serializable proposal mutation mechanisms. Any active nonparticipant includes self-selection; leadership review-versus-decision conflict remains enforced.
- Verify both duties with active nonresearcher/unlinked/out-of-scope accounts, inactive rejection, PI/member conflicts, duplicate/stale/expiry/revocation behavior, and end-to-end review access. Run focused tests, API/web typecheck/build and diff checks.
- Implemented account selector and optional profile provenance; active accounts of all roles can receive either duty. Preserved unknown participation fail-closed behavior and added staff capability scope checks because assigned out-of-scope staff can now read the proposal.
- Verification passed: API build, web build, typecheck, 27 focused authorization/lifecycle/UI checks, and three reviewer-assignment checks including a real disposable PostgreSQL lifecycle. The integration covers unlinked admin/leadership across units, both duties and review submission, PI/member and inactive/pending denial, stale context, duplicate completed reviews, self-selection, inactive linked-profile provenance, revocation, retained history/audit and cross-record denial.
- Local API restarted and read-only HTTP checks confirmed 31 eligible account candidates including admin/external accounts, plus username search. Current proposal data was not changed. Disposable test database removed after verification.
- Existing `tests/files-route.test.mjs` has three failing source assertions about upload extensions and submitter labels; the referenced `proposal-detail-workspace.tsx` is byte-identical to HEAD. These unrelated baseline checks were not changed. No browser visual check was performed.
