---
title: "Sprint Change Proposal — 10-role authorization model"
date: 2026-10-18
status: approved
approvedBy: Super
approvedOn: 2026-10-18
mode: batch
scope: moderate
trigger: "docs/permission-matrix.md 10-role update (commits c7993b8..f1b01af)"
authoritativeSource: "docs/permission-matrix.md (§7 wins on conflict)"
---

# Sprint Change Proposal — 10-role authorization model

## 1. Issue Summary

**Trigger.** On 2026-10-18 the authoritative permission matrix (`docs/permission-matrix.md`,
source `docs/Ma_tran-phan-qquyen-DocManS.pdf`) moved from 7 to 10 system roles. The other
`docs/` files have since been synced to it, and README, requirements and CONTEXT have been
normalized. That work is in commits c7993b8, 8236a6f, 2174a61 and f1b01af. Nothing in
`_bmad-output/` was synced.

**Category.** New requirement from stakeholders (institutional hierarchy and approval routing),
not a technical failure.

**Problem statement.** The planning artifacts (PRD, epics, architecture, project context, UX
workspaces) and the open implementation artifacts still encode the 7-role operating model. In
that model:

- Head assigns reviewers, synthesizes and submits packages.
- Staff decides Project Adjustments; Head decides Project Extensions.
- Leadership decides neither.
- `RESEARCH_OVERSIGHT_AUTHORITY` is the Science Deputy Director with internal-researcher eligibility.

The matrix now defines:

- **Ten roles:** QT, GĐ, PGĐ-KH, PGĐ-TD, TP, PP, TB, CV, NCV, NNB.
- **Mandatory tờ trình routing:** CV → TB → TP → BGĐ.
- **Signer rules:** GĐ alone approves topic + funding and liquidation; GĐ or PGĐ-KH sign councils, IRB, acceptance, extension and adjustment (including a funding change).
- **Responsible CV:** auto-assigned by segment (mảng).
- **Academy-wide project view** for BGĐ, TP and TB.
- **Reviewers:** any role except QT can be invited and score.
- **Two-way anonymity.**
- **Product decisions of 2026-10-18 (matrix §7.3):**
  - CV approves post-submission withdraw/edit/reopen.
  - TB/TP decide duplicate-profile merges and may see reviewer identity.
  - The PI withdraws when no eligible actor exists.

**Evidence.**

- `rg 'SCIENTIFIC_MANAGEMENT_|RESEARCH_OVERSIGHT_AUTHORITY|LEADERSHIP_APPROVAL_AUTHORITY' _bmad-output` hits 28 of 92 files.
- PRD, epics and architecture contain no requirement for tờ trình, segments, TB, PP, PGĐ-KH, IRB certificate signing or liquidation.
- The "finalized 2026-09-21" sections of `architecture.md`, `AUTHORIZATION-CONTRACTS.md` and `ARCHITECTURE-SPINE.md` assert the opposite decision rights to the matrix.
- The working implementation of the routing exists on `tuan/DocManS`:
  - model `approval_submissions` / `approval_steps` (migration `20261018000000_approval_routing`);
  - kinds `EVALUATION_COUNCIL`, `DECISION_PACKAGE`, `IRB_COUNCIL`, `IRB_CERTIFICATE`, `ACCEPTANCE_COUNCIL`, `PROJECT_EXTENSION`, `PROJECT_ADJUSTMENT`, `LIQUIDATION`;
  - stages `BOARD_REVIEW` → `HEAD_REVIEW` → `LEADERSHIP` → `CLOSED`;
  - statuses `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`, `CANCELLED`;
  - signer `DIRECTOR` | `DIRECTOR_OR_SCIENCE_DEPUTY`.
- Segment tie-breaking and IRB composition come from `tuan/DocManS:docs/design/phan-cap-va-trinh-duyet.md`, which is not on this branch.

## 2. Impact Analysis

### 2.1 Checklist status

| Item | Status | Finding |
| --- | --- | --- |
| 1.1 Trigger | [x] | Matrix update 18/10/2026; no single story triggered it. |
| 1.2 Problem | [x] | New stakeholder requirement; see §1. |
| 1.3 Evidence | [x] | See §1. |
| 2.1 Current epics | [!] | Epics 2, 5 and 6 are in progress, and their open stories encode old semantics. |
| 2.2 Epic changes | [!] | Modify the scope of Epics 1, 2, 4, 5, 6, 8, 10, 11 and 12; add stories (§4.3). No new epic. |
| 2.3 Future epics | [!] | Backlog Epics 3, 4, 7–12 need role vocabulary and actor changes. |
| 2.4 Obsolete/new epics | [x] | None obsolete. Tờ trình fits Epic 5 (Proposal review and approval) and serves Epics 6 and 10. |
| 2.5 Order | [!] | New story 5.9 (routing) must precede 5.10, 6.11 and 6.12. |
| 3.1 PRD | [!] | FR2, FR6/6b/6f, FR9, FR14–FR21, FR28, FR45, FR50–53, FR58–66 change; FR71–FR79 are new. MVP is still achievable. |
| 3.2 Architecture | [!] | Role enum, scope model, approval-routing aggregate, segment assignment, account migration. |
| 3.3 UI/UX | [!] | Workspace split TP/PP/TB/CV and GĐ/PGĐ-KH/PGĐ-TD; routing inbox; unassigned view; per-role queues. |
| 3.4 Other | [!] | Seeds, demo accounts and code (handoff only). The `tuan/DocManS` branch has no merge base with `DocManS`. |
| 4.1 Direct adjustment | Viable | Effort Medium, risk Medium. |
| 4.2 Rollback | Not viable | Rolling back done stories would not remove the need for routing. |
| 4.3 MVP review | Not needed | Funding stays metadata-only (decision 2026-10-18), so MVP is unchanged. |
| 4.4 Path | [x] | Option 1, Direct Adjustment. |

### 2.2 Epic impact (legacy numbering, tracked in sprint-status)

| Epic | Status | Impact |
| --- | --- | --- |
| 1 Foundation and permissions | in-progress (1.1–1.9 done) | New stories 1.11 (ten-role registry and account migration) and 1.12 (segments). Done stories keep their text plus a banner. |
| 2 Researcher profiles | in-progress | 2.2–2.6: actor wording QT/TP¹/CV¹, conflict list. New 2.7 (duplicate merge, TB/TP decide) and 2.8 (delta for 2.1). |
| 3 Files, history, audit | backlog | 3.3–3.5: two-way anonymity, tờ trình audit events. New 3.6. |
| 4 Proposal intake | backlog | 4.1 TP/CV manage intake; PI is any role except QT/NNB; NNB is denied. New 4.7 (auto-assign CV) and 4.8 (withdraw/edit/reopen by CV). |
| 5 Review and approval | in-progress (5.3 review) | 5.1 TB/CV completeness. 5.5 synthesis by TP/TB/CV, with routing moved out to 5.9. 5.6 secretary drafts synthesis/minutes. 5.7–5.8 GĐ only. New 5.9 (routing), 5.10 (BGĐ signing of councils), 5.11 (delta for 5.3). |
| 6 Approved projects | in-progress | 6.8–6.9 acceptance council signed by GĐ/PGĐ-KH. New 6.11 (delta for GF4 decisions → routing) and 6.12 (funding metadata and liquidation). |
| 7 Tasks | backlog | QT/BGĐ create no tasks; TP/TB/CV create within scope. |
| 8 Seminars and student research | backlog | Student research per matrix §9.6 (new 8.6). Seminar is an open question. |
| 9 Related documents | backlog | Document managers: QT, TP, TB, CV. |
| 10 Councils and IRB | backlog | 10.1, 10.5 TP¹/TB¹/CV³; 10.4 TB/CV; 10.8 GĐ or PGĐ-KH sign; members invited from any role except QT; council tờ trình only after every member accepts. |
| 11 Notifications and My Work | backlog | Recipients include the next routing step; My Work excludes QT. New 11.6 (per-role queues). |
| 12 Dashboards and reports | backlog | Per-role dashboards; PGĐ-TD aggregate only; nature and responsible-CV breakdown. New 12.6. |
| 13 Scientific CV | done | Banner only; 13.10 already covers own-CV for managers. |

### 2.3 Technical impact (handoff, not part of this doc change)

- The code on `DocManS` ships 7 roles. These files reference `SCIENTIFIC_MANAGEMENT_HEAD`:
  - `packages/permissions/src/system-roles.{js,d.ts}`;
  - `apps/api/src/permissions/proposal-capability-v1.ts`, `approved-projects/project-capability-v1.ts`, `proposals-shared/proposal-access.ts`, `researcher-profiles/researcher-profile-access.ts`, `modules/files/files.service.ts`, `admin/admin-users.service.ts`;
  - `apps/api/prisma/seed.mjs`;
  - `apps/web/src/lib/session.ts`, fixtures, `research-proposals-panel.tsx`, `login-form.tsx`.

  Run a second scan for `SCIENTIFIC_MANAGEMENT_STAFF`. Do not edit migration `20260921000000`; add a forward migration.
- Account migration:
  - HEAD → TP and STAFF → CV are mechanical.
  - The old `RESEARCH_OVERSIGHT_AUTHORITY` holders (e.g. `vndinh`) must be re-classified per person, PGĐ-KH or PGĐ-TD.
  - PP, TB and PGĐ-TD accounts are created fresh. TB has exactly one holder.
- The routing, segment and IRB implementation exists on `tuan/DocManS`. That branch has **no merge base** with `DocManS` and carries its own 7-role `_bmad-output`, so any later merge will conflict on every planning file rewritten here.
- The "83 V1 action codes / 11 relationship types" figure is quoted from the matrix (15/10/2026 audit) and has not been re-verified here.

## 3. Recommended Approach

**Direct Adjustment (Option 1).** The decisions are already authoritative in the matrix. The
change is a backlog reorganization plus a rewrite of the planning artifacts, not a replan.

- **Effort:** Medium (about 15 living files; three architecture sections rewritten wholesale).
- **Risk:** Medium. A partial rename would leave the contradictory "finalized 2026-09-21" rules in place, so those sections are replaced, not renamed.
- **Timeline:** no MVP change. Funding stays metadata-only:
  - allocation, disbursement and settlement figures plus documents, with audit;
  - no ledger, payments, banking or ERP.
- **Done and in-flight work:**
  - Done stories, review reports, verification records, completed specs and archives are history. They get a one-line banner and are not rewritten.
  - In-flight stories keep their ACs; the 10-role behaviour goes into new delta stories, so sprint status stays truthful (decision 2026-10-18).

## 4. Detailed Change Proposals

Sections are referenced by heading because line numbers drift after the first edit. Each
file keeps its language: PRD, project-context and architecture in English; epics story bodies
and the UX workspaces doc in Vietnamese.

### 4.1 Global vocabulary (mechanical, every living file)

| Old | New | Rule |
| --- | --- | --- |
| `SCIENTIFIC_MANAGEMENT_HEAD`, "Head" (role sense) | `RESEARCH_MANAGEMENT_HEAD` (TP), or TB/TP where the action is review/assignment | Decide per sentence. TP never does completeness or supplement. |
| `SCIENTIFIC_MANAGEMENT_STAFF`, "Staff" (role sense), "chuyên viên" | `RESEARCH_MANAGEMENT_STAFF` (CV) | CV acts only on records it currently holds. |
| "Leadership", "approval authority", "lãnh đạo" | GĐ for topic + funding and liquidation; "GĐ or PGĐ-KH" for other signatures | Per §7.4. |
| `RESEARCH_OVERSIGHT_AUTHORITY` as Science Deputy Director | `SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH); `RESEARCH_OVERSIGHT_AUTHORITY` = PGĐ-TD, monitoring only | Remove "internal researcher eligibility". |
| "seven system roles" | "ten system roles" | List per matrix §2. |
| "Thư ký khoa học" | CV **only** when it means old Staff | Never a global replace: it also names council/team secretaries. |
| PI = active `RESEARCHER_INTERNAL_USER` | PI = any role except QT/NNB | Matrix §6 Draft. |
| "temporary password" | 48-hour single-use setup-password link | Decision 2026-10-18. |

### 4.2 Semantic rewrites (before → after)

**A. `architecture.md` — "Scientific Management Head / Staff boundary — 2026-09-21"**

OLD (summary): HEAD reads all records in scope. Head owns officer changes and submits eligible
packages. Assigned Staff finally decides adjustments; Head finally decides Staff-prepared
extensions; Leadership monitors only.

NEW: replace with **"Phòng KHQS and BGĐ boundary — 2026-10-18"**:

1. TP¹/TB¹ assign or revoke the responsible CV. The system auto-assigns a CV on submit/resubmit by segment (level + nature). Unmatched records show "Chưa có người phụ trách" for TP.
2. Package submission is replaced by approval routing (`approval_submissions`):
   - CV drafts;
   - `BOARD_REVIEW` (TB) → `HEAD_REVIEW` (TP) → `LEADERSHIP` (signer per kind);
   - return to the author with a mandatory reason;
   - no step skipping; no self-review;
   - TB-authored submissions start at `HEAD_REVIEW`.
3. Adjustment (with or without funding change) and extension: CV appraises → routing → GĐ or PGĐ-KH signs. The signature applies the change atomically.
4. Project view: Academy-wide for GĐ, PGĐ-KH, TP and TB. Proposals remain unit-scoped.
5. PP and PGĐ-TD only monitor; PGĐ-TD sees aggregate funding only.

Also in `architecture.md`:

- Authentication & Security "System-role model": the ten codes.
- Project state machine / Golden Flow 4 pointer: the routed decision. Reconcile `under_staff_review`, `under_staff_validation` and `ready_for_head_decision` with routing (matrix §6).
- Researcher profile section: QT/TP¹/CV¹ and the setup-password link.
- Implementation scope / dashboards: queues per matrix §9.10:
  - TB review, TP approval, CV assigned records;
  - GĐ decision + signature, PGĐ-KH signature;
  - PGĐ-TD aggregate.
- AD-2: add routing stage and segment as context dimensions.
- AD-12: add the 7 → 10 account migration.

**B. `AUTHORIZATION-CONTRACTS.md`**

- "Scientific Management role and access contract — 2026-09-21 finalized" → rewrite as **"Research Management roles and approval-routing contract — 2026-10-18"** with the same content as A.
- `SystemRoleV1`: 10 values.
- Routing-step actors (TB, TP, BGĐ signer) are workflow-step state, **not** a new relationship type, so the relationship registry stays at its current count.
- §4 non-delegable registry: add routing submit/forward/return/approve/sign.
- §6 viewer contract:
  - management projection goes to TP/TB (and GĐ/PGĐ-KH);
  - assign/consolidate/finalize: TP¹/TB¹/CV³;
  - completeness: TB¹/CV³;
  - topic decision: GĐ only, after `HEAD_REVIEW`.
- §7 disclosure: TB¹/TP¹ may see reviewer identity; PI and reviewers see no action log.
- §8 personal work: per-role queues.
- §9 jobs: segment auto-assignment runs service-only, with audit actor `System`.
- §10 audit: routing step events and segment assignment.
- §12 assignment binding: TP¹/TB¹/CV³; candidates are any account with a scientific CV, never QT.
- "Existing proposal capability additions": `proposal.management-officer.assign/revoke` → TP¹/TB¹. `proposal.review.submit-package` is superseded by routing.
- "Golden Flow 4 integration boundary": full rewrite per A.3.
- **Action codes:** take names from the `tuan/DocManS` registry (`apps/api/src/approvals/*`, `proposals-shared/approval-routing.ts`). Do not invent codes in the doc.

**C. `ARCHITECTURE-SPINE.md`**

- Reality Baseline: "ten roles in the target; `DocManS` code still ships seven".
- "Scientific Management clarification — 2026-09-21" → "Research Management clarification — 2026-10-18" (per A).
- Contracts table and module map: add an approval-routing module and segment-assignment ownership.
- Open decisions: segment taxonomy values; TB single holder; PP never substitutes for TP.

**D. PRD — FR rewrites (existing numbers kept)**

| FR | New intent |
| --- | --- |
| FR2 | Ten roles (§2). Reviewer/council/IRB duty is invited from any account with a scientific CV (every role except QT). |
| FR6 / FR6f | Project view Academy-wide for GĐ, PGĐ-KH, TP and TB; proposals unit-scoped; CV operations need the current officer assignment; PP and PGĐ-TD read-only. Remove "Staff decides adjustments / Head decides extensions". |
| FR6b, FR10 | PI = any role except QT/NNB; NNB can never be PI. |
| FR6g | Add the matrix §8 closing rule: officer, reviewer, council member, routing reviewer/approver and signer are mutually exclusive on one record. |
| FR9 | TP and CV create/open/close intake periods; visible to every role except QT/NNB. |
| FR14 | Post-submission withdraw/edit requests are approved by the assigned CV; reopen is a CV action with a mandatory reason. |
| FR15 | Completeness and supplement: TB¹ or the assigned CV³; never TP. |
| FR17 / FR18 | TP¹/TB¹/CV³ assign with a conflict check. Invitees from any non-QT account must accept or decline (decline with a reason). Members read the dossier only after BGĐ signs establishment. Every invited role scores. |
| FR19 / FR19a | TP¹/TB¹/CV³ synthesize; the council secretary drafts synthesis/minutes without scoring. Submission goes through routing (FR71). |
| FR20 / FR21 | GĐ only; topic and funding together. |
| FR28 | Assigned CV appraises → routing → GĐ or PGĐ-KH signs; the signature applies the change; includes funding-change adjustments. |
| FR45 / FR45a | Per-role dashboards; PGĐ-TD aggregate only; filters year/unit/level/field/nature; responsible-CV breakdown with an "unassigned" group. |
| FR50–FR53 | Student research per §9.6: CV/NCV register as supervising lecturer; CV¹ approves/manages/completes. Seminar unchanged (open question). |
| FR58–FR64 | IRB naming; TP¹/TB¹/CV³ set up councils; GĐ or PGĐ-KH sign establishment and the IRB certificate. |
| FR65 / FR66 | Profile managers: QT (platform), TP¹/CV¹ (unit scope). |

Also in the PRD:

- Executive Summary, Glossary (System role; add Tờ trình, Mảng, Responsible CV, BGĐ, IRB, Two-way anonymity), Personas (ten roles; add PGĐ-KH, PGĐ-TD, TP, PP, TB), User Journeys (Head oversight → TP/TB/PP; UJ-1 CV auto-assigned; UJ-4 split GĐ/PGĐ-KH), Role-Based Access, Data-Scope, Audit-Log list (matrix §11), Dashboard section, AC-PERM-05b/05c/02/09/12, "Researcher Profile completion", "Finalized implementation scope".
- "Authorization Source Of Truth": `docs/permission-matrix.md` §7 wins.
- Phase 1 Out-of-Scope: "No accounting, ledger, payment, banking or ERP integration. Funding allocation/disbursement/settlement figures and documents are recorded as audited metadata."
- Add FR70 (scientific CV), which exists in epics but is missing in the PRD.

### 4.3 New requirements and stories

**New FRs (same numbers in PRD and epics; epics already ends at FR70):**

| FR | Requirement |
| --- | --- |
| FR71 | Approval routing for every BGĐ-bound procedure (8 kinds), with a signer per kind (§7.4). CV drafts → TB review → TP approval → BGĐ sign. Return to the author with a reason. No skipping, no self-review. TB-authored submissions start at TP. One open submission per kind and subject. |
| FR72 | Segments (level + nature) assigned by TP to CV. Auto-assignment of one responsible CV on submit/resubmit: more specific match first, then fewer active records. Unmatched → "Chưa có người phụ trách". TP/TB assign/reassign/revoke, keeping history. |
| FR73 | BGĐ signatures: GĐ or PGĐ-KH for councils (evaluation, IRB, acceptance), IRB certificate, extension and adjustment; GĐ only for topic + funding and liquidation. A signer cannot be a participant or reviewer on the record. |
| FR74 | Funding as audited metadata. View: GĐ/PGĐ-KH/TP/TB all; CV assigned; PP and PI/members own participation; PGĐ-TD aggregate only. Manage: GĐ, and TP/TB Academy-wide; CV assigned. Liquidation: CV drafts → routing → GĐ signs. |
| FR75 | Duplicate researcher profile warning (raised by QT/TP/CV) notified to TB/TP, who decide the merge; history kept. |
| FR76 | Post-submission withdraw/edit/reopen approved or performed by the assigned CV, with audit. |
| FR77 | Two-way anonymity: PI and reviewers see no action log. TB/TP may see reviewer identity. |
| FR78 | Per-role work queues (§9.10): TB review, TP approval, CV assigned, GĐ decision/signature, PGĐ-KH signature, reviewer invitations. QT has none. |
| FR79 | Account activation by a 48-hour single-use setup-password link; no temporary password. |

**New stories (sprint-status key, status `backlog`):**

| ID | Title | FR | Notes |
| --- | --- | --- | --- |
| 1.11 | Ten-role registry and account migration | FR2 | 1.10 is taken by the archived story. HEAD→TP, STAFF→CV; old OVERSIGHT holders re-classified per person; TB single holder; ambiguous accounts reported, not guessed. |
| 1.12 | Segment catalog and CV segment assignment | FR72 | TP-owned; audited. |
| 2.7 | Duplicate profile warning and TB/TP merge decision | FR75 | |
| 2.8 | Delta for 2.1: profile managers QT/TP¹/CV¹ | FR65 | 2.1 stays in review. |
| 3.6 | Two-way anonymity and reviewer identity for TB/TP | FR77 | Same filters on list/detail/file/export. |
| 4.7 | Auto-assign responsible CV by segment on submit | FR72 | Depends on 1.12. |
| 4.8 | Post-submission withdraw/edit/reopen by assigned CV | FR76 | |
| 5.9 | Approval routing CV → TB → TP → BGĐ | FR71 | Precedes 5.10, 6.11 and 6.12. Model per `tuan/DocManS` `approval_submissions`. |
| 5.10 | BGĐ signing: evaluation council establishment and topic + funding decision | FR73, FR20 | Council routed only after every member accepts. |
| 5.11 | Delta for 5.3: TP¹/TB¹/CV³ assignment, non-QT candidates, accept/decline | FR17 | 5.3 stays in review. Self-assignment denied per matrix §8 closing rule. |
| 6.11 | Delta for GF4: adjustment/extension via routing, signed by GĐ/PGĐ-KH | FR28, FR73 | Replaces the Staff/Head decision paths of 6.6–6.7. PI withdrawal already exists (commit 7d8d277); adds only the "no eligible actor → PI withdraws" rule. |
| 6.12 | Funding metadata and liquidation | FR74 | Metadata only. |
| 8.6 | Student research registration and approval | FR50–FR53 | Per §9.6. |
| 11.6 | Per-role work queues | FR78 | |
| 12.6 | PP and PGĐ-TD monitoring dashboards | FR45, FR74 | PGĐ-TD per-record funding columns empty. |

The UX delivery view in `epics.md` gets matching rows: Epic 4 table, workflow-state matrix
("Approval routing" state family; Pending adjustment/extension rows), S07–S11, S15,
traceability.

### 4.4 Other living files

| File | Change |
| --- | --- |
| `project-context.md` | Ten-role list; "Scientific Management Head and Staff — finalized model" → "Phòng KHQS and BGĐ — 10-role model"; GF4 paragraph; domain modules (approval routing, segments, funding metadata); audit list; Do-Not rules (no legacy codes, no step skipping); setup-password link. |
| `user-interface-workspaces-docmansystem.md` | §1 workspace list and §4 split into TP/PP/TB/CV; §5 split into GĐ/PGĐ-KH/PGĐ-TD; §6 PI any role except QT/NNB; §7 accept/decline, IRB naming; §8 My Work rows per role; §9 student research; §10 navigation (Tờ trình, Kinh phí, Phân mảng); §11 table. Add sections for duplicate merge, the activation link and the unassigned-records view. Reword "không phân quyền theo một vai trò cố định" to "one system role + record relationships". |
| Sprint-plans epic-01, 04, 05, 06, 10, 11, 12 | Replace the "Finalized leadership authorization impact" block; Head/Staff → TP/TB/CV. epic-05: "Keep seven roles" → ten. Reconcile its 5.x table with sprint-status. |
| `epic-05/implementation-plan.md` | Head/Staff table → TP/TB/CV; routing replaces package submission. |
| Open specs: `spec-any-user-reviewer-council`, `spec-golden-flow-4-project-execution`, `spec-refined-proposal-review-approval-golden-flow`, `spec-proposal-detail-role-views-and-date-only-inputs` | Actor wording; GF4 I/O rows → routing; repoint frontmatter from the baseline to `docs/permission-matrix.md`. |
| Stories 2-2, 2-4 (ready-for-dev) | Actor wording only (QT/TP¹/CV¹; conflict list adds routing actors and signers). |
| `deferred-work.md`, `handoff-gf4-frontend-review-fixes.md` | Actor wording. |

### 4.5 Historical banner (no rewrite)

Add one line at the top of each file below:

> Role names and decision rights here predate the 10-role model; see `docs/permission-matrix.md`.

Files:

- Done stories 1-4 and 1-9.
- Review records `review-1-6-*`.
- `epic-05/refined-flow-verification.md` and `epic-05/assignment-slice.md`.
- Completed specs: `spec-finalized-management-and-leadership-authorization`, `spec-proposal-review-approval-golden-flow`, `spec-researcher-profile-completion`, `spec-seed-researcher-accounts`.
- `specs/spec-scientific-cv/{SPEC.md, stories.yaml, stories/13-1…, 13-10…}`.
- `reconcile-phan-quyen-nha-khoa-hoc.md`.
- `archive/*`.

## 5. Implementation Handoff

**Scope: Moderate.** Backlog reorganization plus a rewrite of the planning artifacts.

| Recipient | Responsibility |
| --- | --- |
| Developer agent (docs) | Apply §4.1–§4.5 to `_bmad-output`. Add the new stories and FRs to `epics.md` and the PRD. Add sprint-status keys for the §4.3 stories (`backlog`). Do not change the status of existing stories. |
| PO / Developer | Sequence: 1.11 → 1.12 → 4.7 → 5.9 → (5.10, 5.11, 6.11, 6.12) → 11.6, 12.6. Decide how to port the `tuan/DocManS` routing code given there is no merge base. |
| Architect | Confirm the action-code names from the `tuan/DocManS` registry and the reconciliation of the old GF4 state names. |

**Success criteria:**

- `rg 'SCIENTIFIC_MANAGEMENT_' _bmad-output` hits only rename notes, migration notes and bannered historical files.
- No living artifact grants Staff/Head adjustment or extension decisions, or a topic decision to anyone but GĐ.
- PRD and epics share FR71–FR79.
- sprint-status lists every new story.

### Open questions (not blocking)

1. Seminar permissions: the matrix does not cover them. Epic 8 seminar stories stay unchanged.
2. Roster readiness, "exactly two reviewers and at least three committee members" (story 5.3): not in the matrix; kept as-is.
3. Whether BGĐ/PP/TB may read other users' scientific CVs (story 13.1): the matrix gives management of profiles only to QT/TP/CV.

## Addendum — 2026-10-18 (after approval)

Commit 0a39db3 ("refactor(roles): đồng bộ 10 mã vai trò theo permission-matrix") landed on
`DocManS` while this proposal was being applied. The code now has all ten role codes and
migration `20261016500000` renames HEAD → TP and STAFF → CV. PGĐ-KH, PP and TB still have no
business permissions. Statements above that the code "ships 7 roles" are superseded; Story
1.11 is partly delivered (remaining: per-person re-classification of former
`RESEARCH_OVERSIGHT_AUTHORITY` holders, ambiguous-account report, TB single holder, role/title
audit) and is tracked as `in-progress`.
