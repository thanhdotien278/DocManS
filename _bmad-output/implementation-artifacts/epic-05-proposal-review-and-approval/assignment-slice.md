---
title: 'Proposal reviewer assignment to personal queue'
type: feature
created: 2026-09-21
status: done
route: dispatch
baseline_commit: f7e76ba8087c8dd4ded916160ebf2fff8df096d4
context:
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/authorization-core-business-baseline.md'
  - '{project-root}/docs/permission-matrix.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md'
---

<frozen-after-approval>

**Historical verification record:** This completed slice predates the current
Head/Staff authority split. Its Staff-assignment observations and five-role
fixtures are retained as evidence of the earlier implementation, not as current
normative permission grants. The canonical baseline and permission matrix govern
present behavior.

## Intent

**Authorization applicability — 2026-09-21:** Earlier implementation/demo evidence
below predates the Head/Staff split. It is not a current permission grant or verification
of that split. Current baseline §2.1 requires explicit Head scope and an effective
proposal/project management-officer assignment for Staff management access; neither
role grants leadership final decisions. No seed, account, migration or test is changed
by this documentation update.

Implement the user-authorized first vertical slice of the approved plan: scoped
Scientific Management Staff selects an eligible proposal, assigns eligible active
accounts, passes authoritative conflict/context checks, persists assignment and audit,
and the assignee discovers the work in their personal review queue. Reuse the existing
Story 5.3 lifecycle and only the queue entry of 5.4. Do not advance reviewer evaluation.

## Boundaries & Constraints

Preserve the existing dirty documentation. Keep account selection, nullable profile
provenance, current completeness evidence, serializable proposal mutation, explicit
scope, active account checks, duplicate/cardinality enforcement and atomic audit.
Keep both existing duties and revoke-with-reason semantics. The existing assignment
table is the durable queue source; do not add a parallel task or assignment table.
No new tests or test-file edits, as requested. Run existing checks and isolated runtime
verification. No evaluation, consolidation, decision, notification infrastructure,
new roles, new rounds, unrelated refactoring, commits or pushes. Notification delivery
and the remaining full-story requirements stay explicitly pending.

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts`: existing
  candidates, transactional assign/revoke/audit, roster and personal queue. Queue
  currently spreads the staff DTO and checks proposal access rather than exact row.
- `apps/api/src/permissions/proposal-capability-v1.ts`: assignment capability currently
  ignores its existing completeness flag and unresolved participation role.
- `apps/api/src/research-proposals/research-proposals.service.ts`: detail already
  computes current completeness evidence; retain that source for capabilities.
- `apps/api/src/proposals-shared/proposal-mutation.ts`: lock/current actor/context
  and joined serializable transaction; reuse, do not replace.
- `apps/api/src/proposal-evaluations/proposal-evaluations.dto.ts` and controller:
  assignment/revocation already require context; controller translates note to reason.
- `apps/web/src/lib/proposal-evaluations-api.ts`: assignment client currently makes
  context optional; queue type inherits operational staff fields unnecessarily.
- `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx`: existing
  account/date form and roster; currently depends on broad review-progress load,
  refreshes capabilities asynchronously, and reports every block as workflow state.
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`: caller
  supplies capability and context; owns workflow refresh.
- `apps/web/src/lib/navigation.ts`: shared desktop/mobile navigation lacks my-reviews
  entry for all roles; route and queue page already exist.
- `apps/web/src/components/research-proposals/reviewer-queue-panel.tsx`: existing own
  work table, mobile cards, link and loading/error/empty states.

## Tasks & Acceptance

- [x] Align assignment capability with current completeness and unresolved conflict
  checks; preserve backend mutation as authority.
- [x] Complete assignment/queue contracts: mandatory client context, minimum own-work
  queue projection, exact effective assignment and conflict/workflow filtering.
- [x] Ensure roster reads enforce staff scope and participant denial; retain the
  staff's explicit assignment authority even when self-assigned, without making
  review/consolidation permissions a prerequisite for assignment.
- [x] Complete frontend discovery, account selection and refresh/error behavior:
  all roles can navigate to their own queue; missing/stale context fails closed;
  mutations await parent context refresh before the next assignment/revoke; render
  actual backend denial reason. Preserve existing UX and native date controls.
- [x] Verify durable assignment/history/audit and first transition using existing
  storage; correct only demonstrated slice defects, without migrations unless needed.
- [x] Record actual verification and remaining full-story scope in this artifact and
  the existing implementation/sprint plan. Do not mark all of 5.3 or 5.4 done.

Acceptance: Given scoped unconflicted staff, an eligible checked submitted/resubmitted
proposal and an active nonparticipant, assigning saves one duty and success audit
atomically, opens under_review only once, and appears only in that assignee's effective
queue. Given another account, stale token, wrong scope, inactive candidate, participant,
duplicate or third reviewer, direct mutation fails without partial business writes;
candidate-conflict failure retains failure audit. Given revocation, access and queue
entry end while history remains. Given a browser session in any account role, the
personal queue is discoverable and only displays authorized work.

## Implementation Notes

The user explicitly approved implementation of the existing plan and narrowed it to
assignment through queue, overriding redundant planning/dirty-tree approval gates.
Existing plan and UX edits are preserved. This file records execution, not a new epic.

Reused existing serializable assignment mutation, active-account lock, completeness
evidence, reviewer cardinality, assignment persistence and append-only audit. Added
context/effective interval facts to successful assignment/revocation and candidate
conflict audits. No new persistence model, dependencies or schema migration.

Staff assignment rendering now loads the existing roster independently of evaluation
progress. A self-assigned staff member retains explicit assignment authority, while
progress and other reviewers' scores are withheld. Leadership cannot use the operational
roster/progress endpoints. Assigned-reviewer detail omits internal supplement requests.
Client assignment/revocation require context; buttons stay busy until parent refresh,
and stale-context rejection refreshes without automatic resubmission.

The implementation subagent reached its usage limit after initial backend changes;
the primary agent completed and verified the implementation directly.

## Review Triage Log

| Finding | Verdict and disposition |
| --- | --- |
| Completeness/unknown-context capability has no automated regression | Medium verification gap. User forbids new tests. Final-build projector smoke confirmed unchecked deny, checked allow and unknown-context deny; browser verified completeness reason. |
| Assigned staff roster/progress redaction lacks automated coverage | Medium verification gap. Final-build disposable-DB smoke confirmed five roster rows with no score/recommendation and progress 403; browser verified self-assignment does not block assignment operations. |
| Supplement redaction lacks automated coverage | Medium verification gap. Seeded an actual synthetic supplement; assigned admin and staff detail both returned zero supplement requests. No test files changed. |
| Audit context/effectivity fields lack automated assertions | Medium verification gap. Inspected persisted success, conflict-failure and revoke audit payloads in the disposable DB; required fields were present. |
| Stale-context frontend recovery lacks runtime verification | Medium verification gap, resolved by browser verification: a concurrent HTTP assignment invalidated the open form, submission returned 409, roster refreshed without auto-assignment, explicit second confirmation succeeded. |
| Navigation has no runtime coverage for every role | Medium verification gap, resolved by executing the actual transpiled helper for all five roles: exactly one `/my-reviews` entry each; desktop/mobile browser checks completed. |
| Legacy EP-03 tests expect leadership operational roster/progress reads | Medium verification debt. The current approved policy requires staff-only operational reads; old leadership-allow expectations are obsolete. Tests left unchanged per user instruction; full legacy suite was not claimed passing. |
| Redacted review metadata could render as an unsubmitted review | Medium, fixed. The assignment table renders the review-status column only when authorized progress is available; assignment lifecycle remains visible independently. |
| Fail-closed review-duty reads | Medium, fixed. Staff roster/progress reuse successfully loaded assignment records with the pure access resolver, so a failed extra access lookup cannot become permission to expose reviews. |

The verification-review layer returned the first seven findings. Blind-hunter and
edge-case reviewer agents failed at the usage limit; no independent clean-review
claim is made for those layers. Primary-agent diff review and runtime verification
completed, including the two additional corrections above.

## Verification

- `npm run build:api`, `npm run typecheck`, `npm run build:web`, `git diff --check`.
- Existing focused assignment/cardinality/authorization checks; report baseline
  failures separately. Run existing database integration only in an isolated database.
- Browser check assignment discovery/form and reviewer queue at desktop/mobile if
  local runtime permits; report any missing evidence honestly.

### Results — 2026-09-21

- API build, TypeScript checks and `git diff --check`: passed.
- Production web build: passed in an isolated source copy so the running application
  was not interrupted.
- Existing focused assignment/cardinality/authorization checks: 22 passed, one
  database-only check skipped without its explicit database URL; no test files changed.
- Existing database assignment integration: 3 passed against a new disposable database
  initialized with all 22 existing migrations before final implementation. Final code
  additionally verified through browser/HTTP/database checks below, not just that baseline.
- Browser, final code: staff selected a checked proposal, assigned an external account
  from another unit with a whole-day deadline, then assigned an admin without a page
  reload. Both succeeded. First assignment opened `under_review`; later ones retained it.
- External account discovered the queue from navigation, saw exactly its one assigned
  proposal and deadline, and opened its detail. Queue projection omitted account/profile/
  assigner identities and review scores. At 390×844, inspected screenshot and verified
  document width 390px with one visible mobile proposal link.
- Staff self-assignment as committee member left assignment usable and removed the
  consolidation section. Staff revoked the external assignment with a reason; its
  queue became empty and direct proposal access returned 403, with history retained.
- Browser selected an unchecked resubmission from the proposal list: assignment button
  disabled with the explicit completeness reason. Direct assignment also returned 400.
- Direct API: missing token 400, third reviewer 400, stale token 409, out-of-scope staff
  403, PI candidate conflict 400. Leadership roster/progress and external reviewer
  roster/progress/unrelated proposal reads returned 403.
- Database after browser operations: three assignment rows, one revoked, exactly one
  `under_review` transition event; three assignment success audits, one revocation audit,
  and one conflict failure audit. All five retained context and effective-start facts.
- Further stale-context browser verification added two committee assignments. Final
  rebuilt-service smoke read five retained roster rows, withheld review score/
  recommendation from self-assigned staff, and denied progress with 403.
- Executed the real navigation helper for all five system roles: exactly one queue
  entry each. Executed final capability projection for checked/unchecked/unknown-context
  inputs: allow/deny/deny respectively.
- Final API build, typecheck, 22 focused existing checks and isolated production web
  build passed after the last code changes. Database-only test remains skipped in
  that focused command; database/browser evidence is recorded separately above.
- Temporary API/web servers stopped. Browser evidence retained outside the worktree
  at `/tmp/docmans-assignment-browser.pKBTXk/browser-evidence`; the disposable
  `docmans_assignment_test_20260921_slice` database is retained for inspection.

No reviewer evaluation was implemented. Full Story 5.3 notifications and the later
evaluation/decision package, file disclosure and enduring historical-review conflict
requirements remain pending under the approved plan. No claim of full Epic 5 completion.
