# Proposal Review & Approval — refined Golden Flow implementation plan

Updated: 2026-10-18. Status of the 2026-09-22 slice: **implemented and UI-verified; independent review pending**.
**10-role update (`docs/permission-matrix.md`, §7 wins):** the Head/Staff actors below map to TP/TB/CV per
action (TP¹/TB¹/CV³ assign and synthesize; TB¹/CV³ check completeness, never TP). Package submission is
replaced by tờ trình routing CV → TB → TP → BGĐ (story 5.9); only GĐ decides topic + funding. The code on
`DocManS` has the ten role codes (commit 0a39db3) but still implements the former Head/Staff actors as TP/CV until stories 5.9–5.11 land.
Owning stories: 5.1–5.5, 5.7–5.8 in [epics.md](../../epics.md).
This replaces the obsolete Staff-owned assignment/synthesis plan. Historical evidence
remains in [assignment-slice.md](assignment-slice.md) and the earlier Golden Flow spec;
neither proves acceptance of this refinement.

## Audit and source reconciliation

Reviewed the latest PRD FR15–22, existing Epic 5 stories, current sprint plan/tracker,
CONTEXT, baseline, permission matrix, user flows, architecture authorization
contracts, and the evaluation/capability/UI implementation. The 2026-09-22 request moved proposal reviewer assignment and synthesis from Staff to Head; under the
10-role model these are TP¹/TB¹/CV³ actions. It does not change independent project/council workflows.

| Existing implementation | Keep | Gap to address |
| --- | --- | --- |
| Completeness evidence and resubmission events | Once-per-submission check, PI revisions, snapshots, canonical proposal states | Current guard checks only event kind/time: validate readiness payload and exact current-submission binding, then expose operational re-check queue |
| `ProposalReviewAssignmentsService` | Candidate checks, active account lock, participation checks, assignment lifecycle, two-reviewer cap, revoke history | Candidates/assign/revoke currently use Staff gate; change to TP¹/TB¹/CV³ without widening read authority of monitor-only roles; live-assignment queries must respect effective intervals |
| `ProposalReviewsService` | Own assignment, draft/save/submit, context/version binding, submitted lock | Verify cross-record/version, expiry/revocation, existing evidence and terminal read-only paths |
| `ProposalEvaluationSummaryService` | Summary storage/revision, review counts, locked mutation, existing package submit action (superseded by routing, 5.9) | Saves allow incomplete reviews; Staff can synthesize/route with markReady; TP/TB/CV need submitted-review reads and summary authoring; no finalized stage; status-only progress counts ignore expiry |
| `ProposalDecisionsService` | Leadership role/scope/conflict, package revision/current event, guarded terminal mutation, audit/history | Explicit completeness/finalized/routed evidence gate; decision-package progress currently includes raw average and pending-reviewer fields despite redaction comment |
| `projectProposalViewerAuthorizationV1` | Existing action registry and safe denials | Assignment/consolidation are Staff-only in shipped code (target TP¹/TB¹/CV³); readiness is largely workflow-state-only; align with authoritative completion/finalization facts |
| `proposal-evaluation-panel.tsx` | Shared role-aware workspace and typed API | Roster loading/rendering depends on write capability; monitoring would disappear after role change. Separate monitoring from management actions; show overdue/blockers |
| Existing queues | `/reviews`, `/my-reviews`, `/approvals`, server-filtered decision queue | Verify routing/labels and make management queues show current readiness/work without frontend-derived authority |

Current baseline requires exactly two distinct reviewers and at least three distinct
committee members. Preserve this requirement. Proposal duties currently support only
reviewer/committee_member; do not implement a council subsystem to add other positions.
Existing compatibility policy already defines mutually exclusive council positions.
Notification delivery/reminders are absent: report this as unsupported, reuse deadlines
and operational follow-up display, and do not invent a delivery backend.

## Planned state and authority contract

| Action | Actor | State/evidence |
| --- | --- | --- |
| Resubmit | Current eligible PI (any role except QT/NNB) | `supplement_requested` → `resubmitted`; awaiting TB/assigned CV |
| Confirm completeness | TB¹ or CV³ (exact effective officer + scope), no conflict; never TP | Same proposal state; current immutable submission gets completeness evidence |
| Search/assign/revoke reviewer | TP¹/TB¹/CV³, conflict-free; candidates any account with a scientific CV, never QT | Current completeness mandatory; first assignment enters `under_review` |
| Draft/submit review | Effective assigned reviewer/committee member | Correct current submitted package; submitted review immutable |
| Monitor | CV³; TP¹/TB¹; PP/PGĐ-TD read only | Backend counts, named permitted roster/deadlines/pending/overdue; no implicit write grant |
| Create/edit synthesis | TP¹/TB¹/CV³, conflict-free (council secretary drafts, no scoring) | All required current reviews submitted; summary `draft`; proposal stays `under_review` |
| Finalize synthesis | Same authority | Explicit action: summary `draft` → `finalized`; immutable snapshot with actor/time/revision |
| Submit package | Same authority, through tờ trình routing CV → TB → TP (5.9) | Recheck finalized evidence and full readiness; summary/proposal → `ready_for_approval` |
| Approve/reject | Active scoped conflict-free `LEADERSHIP_APPROVAL_AUTHORITY` (GĐ only; topic + funding together) | Recheck completeness, roster/reviews, finalization, routing and current package/context; terminal decision |

Reuse the summary's existing string status, revision and evidence snapshot plus immutable
submission-event/audit infrastructure. No proposal status or parallel audit system is needed.
Ordinary edits after finalization/routing are denied. Reopening is outside this phase unless
an approved explicit workflow is found; missing policy must never produce a silent edit.
A changed roster/source after finalization must invalidate submission and explain the blocker,
not silently regenerate the finalized package. Resolve recovery using an explicit audited
return-to-draft only if authorized by an existing rule; otherwise record the policy gap.

## Ordered implementation tasks

1. **Policy alignment:** update `CONTEXT.md`, `docs/authorization-core-business-baseline.md`,
   `docs/permission-matrix.md`, `docs/user-flows.md`, `_bmad-output/prd.md` and
   `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`.
   Reconcile active Staff monitoring statements in place. Historical reports stay historical.
2. **Backend authority:** in `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts`
   and `proposal-review-assignments.service.ts`, separate management writes (TP/TB/CV) from monitor-only reads; trace every caller, preserve scope/conflict/current-account transaction gates.
3. **Summary lifecycle:** update `proposal-evaluation-summary.service.ts`,
   `proposal-evaluations.dto.ts` and `proposal-evaluations.controller.ts` with explicit finalize,
   strict completion on draft/save/finalize/submit, current completeness, immutable revisions,
   and source-bound finalized/routed evidence. Validate active/effective assignments and current-account eligibility in readiness, not only status/counts. Remove the Staff/markReady routing bypass (routing is 5.9).
4. **Capabilities/decisions:** update `apps/api/src/permissions/proposal-capability-v1.ts`,
   its source facts in `research-proposals.service.ts`, and `proposal-decisions.service.ts`.
   Derive readiness/blockers server-side; recheck at mutation time; redact leadership progress.
5. **UI:** update `apps/web/src/lib/proposal-evaluations-api.ts` and
   `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx` with independent
   monitoring and management draft/finalize/submit actions. Update `proposal-detail-workspace.tsx`
   and existing review queue only where capability/readiness integration needs it.
6. **Checks:** extend `tests/proposal-review-golden-flow.test.mjs` with role/gate/disclosure
   regressions and use existing cardinality/assignment checks. Fix only fixtures needed to
   test the changed contract; report unrelated baseline failures separately.
7. **Runtime acceptance:** inspect migration/runtime state without exposing credentials;
   run two normal-UI proposals through resubmission to approved/rejected and required negative
   cases. Do not reset/reseed, alter existing status, or bypass authorization to make a demo pass.

## Acceptance evidence to record

- Both terminal proposals: identifiers, actor transitions, correct current-version review
  packages, monitoring, distinct finalization/submission, final decisions, history/audit.
- Denials enumerated in the sprint plan, including monitor-only role writes (formerly Staff), premature synthesis and
  draft decisions, wrong version, immutable reviews, incompatible assignment and participant leaks.
- `npm run build:api`, focused Node tests, `npm run typecheck`, `npm run build:web`,
  `git diff --check`; each command's actual outcome and remaining gaps.
- Runtime availability is checked live. Previous Prisma failures are historical, not proof
  of a current blocker. If UI acceptance cannot run, keep the deliverable incomplete and say why.

## Implementation verification

Both synthetic UI journeys reached their expected terminal states. Backend, frontend and
canonical policy changes are implemented; independent review is pending.
See [verification evidence](refined-flow-verification.md) for proposal identifiers, checks,
known legacy-test failures, skipped disposable-DB coverage and remaining policy gaps.
