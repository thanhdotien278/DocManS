# Golden Flow — Proposal Review & Approval

Updated: 2026-09-22. Owning Epic: **5**. Delivery status: **Implemented; UI acceptance passed; independent review pending**.
This refinement supersedes the former Staff-owned assignment/synthesis plan and its
completion claim. Existing implementation is retained; source presence is not UI acceptance.

## Definition of Done

A Proposal can move from Resubmitted to Approved/Rejected through the real seven-role
workflow, with Staff completeness/readiness check, Head reviewer assignment, Reviewer
submission, Staff monitoring, Head synthesis/finalization/submission, and authorized
Leadership decision, with authorization, conflict, disclosure, audit and transition rules
enforced. Both outcomes must run through normal UI/backend without direct database edits,
manual status manipulation or bypass. `REVIEWER` remains an assignment, not an eighth role.

## Current audit and owning stories

| Story/task | Status | Existing behavior to preserve / remaining work |
| --- | --- | --- |
| 5.1 Administrative re-check | Done | Current-submission completeness evidence and once-per-version confirmation exist; verify resubmitted queue and current-version gate through UI. Staff needs exact active officer + scope. |
| 5.2 Supplement/resubmit | Done | PI revision/resubmit and immutable submission events exist; verify that resubmission waits for Staff, without declaring review readiness. |
| 5.3 Head assignment | Done | Reuse candidate search, active account checks, two-reviewer cap, both duty types, conflict guards, transaction, revoke/replace history. Move write/candidate authority from Staff to scoped Head; retain Staff roster reads. |
| 5.4 Assigned review | Done | Reuse My Reviews, correct submission binding, rubric, draft, submit lock and review history. Verify wrong version/record and unassigned denials, files and terminal read-only display. |
| 5.5 Staff monitoring | Done | Counts/roster/deadlines exist. Show named pending/submitted/overdue work and server-derived blockers without granting assignment or synthesis. |
| 5.5 Head synthesis | Done | Existing Staff summary storage/revision is reusable. Head needs submitted review projection, completion gate on every save, explicit draft → finalized lifecycle and separate submit action. |
| 5.7 Routed leadership package | Done | Reuse server decision queue and package. Recheck package projection, redact reviewer data from aggregate/history, require finalized current package. |
| 5.8 Final decision | Done | Reuse locked approve/reject, scope/conflict/context/package checks and audit. Add explicit completeness/finalization evidence recheck and verify both terminal outcomes. |
| Cross-story real UI acceptance | Done | Both resubmitted synthetic proposals completed the full UI sequence: approved/rejected; see refined-flow-verification.md. |
| Reminder delivery (11.1–11.2) | Missing | No proposal delivery backend wired. Preserve deadlines/follow-up visibility; do not invent a scheduler or notification system for “where supported”. |
| Review reopening | Blocked by Business Decision | No approved explicit reopening/revision workflow is established for this slice; retain the submitted-review lock. Other council positions remain outside the existing proposal API, under the already-defined compatibility policy. |

Done above refers to this refined deliverable slice, verified against the recorded runtime evidence; it does not close unrelated acceptance criteria in the wider stories. Canonical tracker
statuses remain conservative; the table is the required delivery assessment, not a second
status engine. Story 5.6 remains independent and unchanged.

## Dependency order and verification

1. Reconcile current baseline, permission matrix, PRD, contracts and user flows with the
   user-authorized Head/Staff split. Keep seven roles, scope/officer and disclosure rules.
2. 5.1–5.3: verify resubmission → Staff readiness → Head assignment. Deny assignment
   before current completeness; deny Staff assignment; preserve revoked/submitted evidence.
3. 5.4–5.5: exercise each review, Staff monitoring, then Head draft/finalize/submit.
   Require exactly two reviewers and at least three distinct committee members under the
   existing policy; all required current-version reviews must be submitted. No new proposal
   statuses: readiness is completeness evidence; synthesis lifecycle belongs to its summary.
4. 5.7–5.8: decision package only after explicit submission; Director alone decides.
   Deputy oversight, Head and Staff remain without final decisions.
5. Use two proposals for UI approve/reject journeys and record identifiers, actor steps,
   state transitions, audit/history evidence and exact checks run in the implementation plan.

Required denials: assignment before readiness; PI/member/secretary reviewer; incompatible
or duplicate assignment; unassigned access; wrong proposal/version review; silent submitted
review edit; Staff assignment/synthesis; premature Head synthesis; premature leadership
package/decision; Deputy decision; same-context reviewer decision; participant access to
protected identities/scores/comments/synthesis through APIs, files, history, list/counts and
any implemented notification/export surface. Missing surfaces remain identified backlog.

See [implementation plan](implementation-plan.md) and the
[refinement spec](../spec-refined-proposal-review-approval-golden-flow.md).
