# Golden Flow — Proposal Review & Approval

Updated: 2026-10-18 (10-role model; authoritative source `docs/permission-matrix.md`, §7 wins).
Owning Epic: **5**. Delivery status of the 2026-09-22 slice (seven-role code on `DocManS`):
**Implemented; UI acceptance passed; independent review pending**. The target model now adds
tờ trình routing (5.9), BGĐ signing (5.10) and the assignment delta (5.11); the shipped
Head/Staff slice is retained as the baseline those stories replace. Source presence is not UI
acceptance. Canonical per-story status lives in `sprint-status.yaml`.

## Definition of Done

A Proposal can move from Resubmitted to Approved/Rejected through the real ten-role
workflow: TB or the assigned CV completeness/readiness check, TP/TB/CV reviewer assignment,
Reviewer submission, monitoring, TP/TB/CV synthesis and finalization, tờ trình routing
(CV → TB → TP → BGĐ) and the GĐ topic + funding decision, with authorization, conflict,
disclosure, audit and transition rules enforced. Both outcomes must run through normal
UI/backend without direct database edits, manual status manipulation or bypass.
`REVIEWER` remains an assignment, not an eleventh role.

## Current audit and owning stories

| Story/task | Slice delivery | Tracker status (`sprint-status.yaml`) | Existing behavior to preserve / remaining work |
| --- | --- | --- | --- |
| 5.1 Administrative re-check | Done | `backlog` | Current-submission completeness evidence and once-per-version confirmation exist; verify resubmitted queue and current-version gate through UI. CV needs exact active officer + scope; completeness belongs to TB¹/CV³, never TP. |
| 5.2 Supplement/resubmit | Done | `backlog` | PI revision/resubmit and immutable submission events exist; verify that resubmission waits for the assigned CV, without declaring review readiness. |
| 5.3 Reviewer assignment | Done | `review` | Reuse candidate search, active account checks, two-reviewer cap, both duty types, conflict guards, transaction, revoke/replace history. Write/candidate authority is TP¹/TB¹/CV³ (target; shipped code gates on Head); candidates are any account with a scientific CV, never QT; invitee accepts or declines (delta 5.11). |
| 5.4 Assigned review | Done | `backlog` | Reuse My Reviews, correct submission binding, rubric, draft, submit lock and review history. Verify wrong version/record and unassigned denials, files and terminal read-only display. |
| 5.5 Monitoring | Done | `backlog` | Counts/roster/deadlines exist. Show named pending/submitted/overdue work and server-derived blockers without granting assignment or synthesis to monitor-only roles (PP, PGĐ-TD). |
| 5.5 Synthesis | Done | `backlog` | Existing summary storage/revision is reusable. TP¹/TB¹/CV³ need submitted review projection, completion gate on every save, explicit draft → finalized lifecycle and separate submit action; submission now goes through routing (5.9). |
| 5.7 Routed leadership package | Done | `backlog` | Reuse server decision queue and package. Recheck package projection, redact reviewer data from aggregate/history, require finalized current package that has passed routing (TB → TP) and the BGĐ step. |
| 5.8 Final decision | Done | `backlog` | Reuse locked approve/reject, scope/conflict/context/package checks and audit; GĐ only (topic + funding together). Add explicit completeness/finalization evidence recheck and verify both terminal outcomes. |
| 5.9 Approval routing CV → TB → TP → BGĐ | Not started | `backlog` | FR71. Precedes 5.10, 6.11, 6.12. Return to author with reason; no step skipping or self-review. |
| 5.10 BGĐ signing (council establishment, topic + funding decision) | Not started | `backlog` | FR73, FR20. Council routed only after every member accepts; GĐ or PGĐ-KH sign councils, GĐ only topic + funding. |
| 5.11 Delta for 5.3 (TP¹/TB¹/CV³ assignment, non-QT candidates, accept/decline) | Not started | `backlog` | FR17. Self-assignment denied per matrix §8 closing rule. |
| Cross-story real UI acceptance | Done | n/a | Both resubmitted synthetic proposals completed the full UI sequence: approved/rejected; see refined-flow-verification.md. |
| Reminder delivery (11.1–11.2) | Missing | `backlog` | No proposal delivery backend wired. Preserve deadlines/follow-up visibility; do not invent a scheduler or notification system for “where supported”. |
| Review reopening | Blocked by Business Decision | n/a | No approved explicit reopening/revision workflow is established for this slice; retain the submitted-review lock. Other council positions remain outside the existing proposal API, under the already-defined compatibility policy. |

"Done" in the slice-delivery column refers to the 2026-09-22 refined deliverable (seven-role code), verified against the recorded runtime evidence; it does not close acceptance criteria in the wider stories. The tracker column mirrors `sprint-status.yaml`, which stays authoritative; this table is not a second status engine. Story 5.6 remains independent and unchanged.

## Dependency order and verification

1. Reconcile current baseline, permission matrix, PRD, contracts and user flows with the
   ten-role model. Keep scope/officer and disclosure rules.
2. 5.1–5.3: verify resubmission → TB/CV readiness → TP/TB/CV assignment. Deny assignment
   before current completeness; deny assignment by PP, PGĐ-TD and unassigned CV; preserve revoked/submitted evidence.
3. 5.4–5.5: exercise each review, monitoring, then TP/TB/CV draft/finalize/submit (via routing, 5.9).
   Require exactly two reviewers and at least three distinct committee members under the
   existing policy; all required current-version reviews must be submitted. No new proposal
   statuses: readiness is completeness evidence; synthesis lifecycle belongs to its summary.
4. 5.7–5.8: decision package only after explicit submission and routing; `LEADERSHIP_APPROVAL_AUTHORITY`
   (GĐ) alone decides topic + funding. PGĐ-KH, `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD), TP, TB and CV remain without that decision.
5. Use two proposals for UI approve/reject journeys and record identifiers, actor steps,
   state transitions, audit/history evidence and exact checks run in the implementation plan.

Required denials: assignment before readiness; PI/member/secretary reviewer; incompatible
or duplicate assignment; unassigned access; wrong proposal/version review; silent submitted
review edit; monitor-only role (PP, PGĐ-TD) writes; premature assignment/synthesis; premature leadership
package/decision; PGĐ-KH or PGĐ-TD topic decision; tờ trình step skipping and self-review; same-context reviewer decision; participant access to
protected identities/scores/comments/synthesis through APIs, files, history, list/counts and
any implemented notification/export surface. Missing surfaces remain identified backlog.

See [implementation plan](implementation-plan.md) and the
[refinement spec](../spec-refined-proposal-review-approval-golden-flow.md).
