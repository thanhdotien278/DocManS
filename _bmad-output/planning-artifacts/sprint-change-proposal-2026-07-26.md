---
title: "Sprint Change Proposal: Multi-Role Users and Record-Scoped Participation"
project: "DocManSystem"
date: "2026-07-26"
status: "approved"
workflow: "bmad-correct-course"
affected_epics:
  - "EP-03"
  - "EP-07"
scope_classification: "Moderate"
---

# Sprint Change Proposal: Multi-Role Users and Record-Scoped Participation

## 1. Issue Summary

### Problem statement

One person in RTMS can hold several distinct relationships at the same time: principal investigator of one proposal, participant in another, and leadership with approval authority. The product specifications already describe how this should work, but the implementation collapsed it into a single account-level role, and one dependency required by the specification was never built.

The issue is therefore **specification-to-implementation drift**, not a new product requirement.

### Issue type

Technical limitation discovered before implementation, combined with a requirement that was marked delivered but is not present in the build.

### How it was discovered

A UX design review of the multi-role experience triggered a trace through the specifications and the code. The specifications held up. The build did not.

### Evidence

**The specifications already prescribe the correct model.**

| Artifact | Reference | What it already says |
| --- | --- | --- |
| PRD | FR6a | The system distinguishes account-level system roles from record-scoped participation roles |
| PRD | FR67a | Conflict-of-interest and separation-of-duty rules must be enforced |
| `permission-matrix.md` | Section 2.7 | "Do not grant global access by assigning `PI`, `PROJECT_MEMBER` … directly to a user account"; participation "must be resolved in the context of a specific proposal, project, council" |
| `permission-matrix.md` | Section 4 | Defines "Proposal participation scope" and "Conflict policy scope" |
| UX workspaces doc | Section 6.1 | "Không nên tách thành nhiều app riêng cho PI, thành viên và thư ký. Nên dùng một Researcher Workspace, trong đó chức năng thay đổi theo vai trò của người đó trong từng hồ sơ cụ thể." |
| UX workspaces doc | Section 6.3 | Tabs already include "Đề tài tôi chủ nhiệm" and "Đề tài tôi tham gia" |
| UX workspaces doc | Section 8 | "My Work" is already defined as a screen shared by all users |

**The implementation diverges from all of the above.**

| Area | Evidence in code | Consequence |
| --- | --- | --- |
| Proposal participation | `ProposalMember` stores `name`, `role`, `organization` as free text with **no user reference** | The system cannot answer "does this user participate in this proposal?" |
| Frontend role context | `toShellAccount` in `apps/web/src/lib/session.ts` drops the `roles` array; the UI renders a single `account.role` | The UI cannot express a record-scoped role |
| Navigation | `navigationByRole[role]` is a fixed per-role dictionary | Navigation assumes exactly one role per person |
| Proposal read access | `canReadProposal` in `apps/api/src/proposals-shared/proposal-access.ts` grants access to admin, scientific management, and the owning PI only | Leadership and reviewers have no route to read a proposal |
| Record role display | No participation label anywhere in the proposal list or detail UI | Users cannot tell what they are on a given record |

### The blocking finding

Two Epic 3 stories currently in `ready-for-dev` carry acceptance criteria that **cannot be satisfied against the present data model**:

- `AC-ST-3.2-04` requires blocking reviewer assignment when the candidate is the PI, a participant, or the secretary of the same proposal.
- `AC-ST-3.5-04` and `AUTH-ST-3.5-02` require blocking self-approval when the approval authority participates in the same proposal.

Both conflict checks must resolve proposal participation to a user account. Because `ProposalMember` holds only descriptive text, the participant branch of each rule is unevaluable. A developer starting either story today would either silently implement a partial conflict check or block.

Additionally, **FR6a is mapped to Epic 1, which is marked `done`**, yet the account-role versus participation-role distinction is absent from the build.

## 2. Impact Analysis

### Epic impact

| Epic | Status | Impact |
| --- | --- | --- |
| EP-01 | done | FR6a was not delivered as specified. Not reopened; the missing proposal-side capability is picked up in EP-03 and the coverage map now records this. |
| EP-03 | in-progress | Requires one new prerequisite story. ST-3.2 and ST-3.5 gain an explicit dependency. No existing acceptance criteria are weakened or removed. |
| EP-07 | backlog | Gains one story for the cross-module personal work hub already described in the UX workspaces document. |
| EP-04, EP-10 | backlog | Project participation and council membership face the same modelling question. Not addressed here; noted so the pattern established by ST-3.0 is reused rather than reinvented. |

No epic is invalidated, resequenced, or made obsolete.

### Story impact

| Story | Change |
| --- | --- |
| ST-3.0 (new) | Proposal participation model and conflict-of-interest primitives. Prerequisite for ST-3.2 and ST-3.5. |
| ST-3.2 | New technical note recording the dependency on ST-3.0. Acceptance criteria unchanged. |
| ST-3.5 | New technical note recording the dependency on ST-3.0. Acceptance criteria unchanged. |
| ST-7.4 (new) | Unified personal work hub across modules. Backlog. |

### Artifact conflicts

| Artifact | Conflict | Resolution |
| --- | --- | --- |
| PRD | UX requirements did not state the unified-workspace, record-role, or conflict-display rules | Four requirements and one acceptance criterion added |
| Epics and stories | No UX design requirement covered multi-role presentation | UX-DR24 through UX-DR27 added |
| Epics and stories | FR6a coverage map pointed only at Epic 1 | Coverage map now names Epic 3 and ST-3.0 |
| `ux-design-guidelines.md` | No guidance on multi-role users | New section 15 added; checklist extended |
| `permission-matrix.md` | Section 2.7 stated the principle but not the data prerequisite | Implementation notes now state that participation must resolve to a user account |
| `sprint-status.yaml` | Did not track the new stories | ST-3.0 and ST-7.4 entries added |

### Technical impact

- A Prisma migration is required to add an optional user reference to the proposal participation record. Descriptive fields are retained so participants without a system account remain valid.
- Participation resolution belongs in a backend service consumed by both authorization and response shaping.
- The proposal API must return the current user's record-scoped role and derived capability flags, extending the existing server-computed flag pattern already used for `canEdit` and `canSubmit`.
- The web session mapping must stop discarding role and participation context.
- No architectural change: this stays within the modular monolith and introduces no new infrastructure.

## 3. Recommended Approach

**Selected path: Direct Adjustment.**

| Option | Assessment |
| --- | --- |
| Direct Adjustment | **Viable and selected.** Add one prerequisite story, record dependencies, close the specification gaps. Effort: medium. Risk: low. |
| Potential Rollback | Not viable and not warranted. No completed work is wrong; work is missing, not incorrect. Rolling back Epic 1 or Epic 2 would gain nothing. |
| PRD MVP Review | Not required. MVP scope is unchanged. The specifications already committed to this behaviour, so no scope is being added beyond what was agreed. |

### Rationale

The specifications were already right. The correction restores the build to what the PRD, permission matrix, and UX workspaces document already require, and it removes a blocking dependency before a developer hits it mid-story rather than after.

Sequencing ST-3.0 ahead of ST-3.2 and ST-3.5 costs one story now and prevents two partially-correct conflict implementations later. A partially-correct conflict check is worse than none, because it reads as enforcement while leaving the participant path open.

Epic 1 is deliberately not reopened. The missing capability is proposal-specific, EP-03 is where it is consumed, and the coverage map keeps the requirement traceable.

### Timeline impact

One additional story inserted at the front of Epic 3. ST-3.1, ST-3.3, and ST-3.4 are unaffected and may proceed in parallel. ST-3.2 and ST-3.5 wait on ST-3.0.

## 4. Detailed Change Proposals

### 4.1 Stories

**Added: ST-3.0 — Proposal participation model and conflict-of-interest primitives** (EP-03, ahead of ST-3.1)

Links proposal participants to user accounts, resolves the current user's participation role per proposal, returns that role through the API, and provides one reusable conflict-policy primitive. Five acceptance criteria, four technical notes, two authorization requirements, one audit requirement, five verification steps. Out of scope: the cross-module hub, council and ethics participation, researcher-profile linkage, and multiple account-level roles per user.

**Added: ST-7.4 — Unified personal work hub across modules** (EP-07, backlog)

One personal area for every signed-in user, gathering owned records, participating records, and items awaiting action, each labelled with its record-scoped role, with conflicted records excluded from action queues.

**Modified: ST-3.2**

```
ADDED:
TN-ST-3.2-03: Depends on ST-3.0. AC-ST-3.2-04 is unevaluable until proposal
participation is linked to user accounts, because the conflict check must answer
whether the assignment candidate already participates in this proposal.
```

**Modified: ST-3.5**

```
ADDED:
TN-ST-3.5-03: Depends on ST-3.0. AC-ST-3.5-04 is unevaluable until proposal
participation is linked to user accounts, because self-approval detection must
resolve the approver's participation on this proposal.
```

**Modified: EP-03 epic entry**

```
OLD: **FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22
NEW: **FRs covered:** FR6a, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR67a
```

**Modified: FR coverage map**

```
OLD: FR6a: Epic 1 - Phân biệt system role với participation/assignment role theo bản ghi
NEW: FR6a: Epic 1, Epic 3 - Phân biệt system role với participation/assignment role
     theo bản ghi (proposal participation linkage delivered by ST-3.0)
```

### 4.2 UX design requirements

Four requirements added after UX-DR23:

- **UX-DR24** — one unified workspace; navigation from account-level role, in-record capability from record participation; no global role switcher.
- **UX-DR25** — a personal work area shared by every signed-in user, grouping owned records, participating records, and items awaiting action, each with its record-scoped role label.
- **UX-DR26** — every list row and detail screen must state the viewer's role on that record, using the Vietnamese labels `Chủ nhiệm`, `Thành viên`, `Người phê duyệt`, `Người đánh giá`; the account-level role must never stand in for the record role.
- **UX-DR27** — conflict-blocked actions stay visible but disabled with a plain-language reason such as `Bạn đang tham gia hồ sơ này nên không thể phê duyệt`; work queues exclude records the user is disqualified from.

### 4.3 PRD

Four bullets added to **UX Requirements** covering the unified workspace, the record-role statement, the shared personal work area, and visible-but-disabled conflict handling.

One bullet added to **UX Acceptance**:

> A user who is simultaneously the owner of one proposal, a participant in another, and an approval authority can carry out each responsibility without switching accounts or roles, sees the correct record-scoped role stated on each record, and is blocked with a stated reason from approving a proposal they participate in.

### 4.4 UX design guidelines (`docs/ux-design-guidelines.md`)

New section 15, "Người Dùng Đa Vai Trò Và Vai Trò Theo Hồ Sơ", written in Vietnamese in line with the document's audience. Covers the two-axis model, the unified-workspace rule, the shared personal area, the role-label taxonomy, detail-screen behaviour, conflict-of-interest presentation, and anti-patterns. Former sections 15 and 16 renumbered to 16 and 17; three items added to the compliance checklist.

### 4.5 Permission matrix (`docs/permission-matrix.md`)

Three implementation notes added: participation must resolve from the record to a user account or dependent conflict rules are unenforceable; the current user's effective participation role should travel with the record so the UI can state it; denial reasons should reach the UI so a blocked control can explain itself.

### 4.6 Sprint status

```
ADDED under epic-3: 3-0-proposal-participation-model-and-conflict-primitives: backlog
ADDED under epic-7: 7-4-unified-personal-work-hub: backlog
```

### 4.7 Configuration

`_bmad/custom/config.toml` now pins `document_output_language = "English"`. BMad planning artifacts are authored in English; Vietnamese is reserved for the product's own UX/UI copy, quoted inside English specifications where a label or message is being specified.

## 5. Implementation Handoff

### Scope classification: Moderate

Backlog reorganization plus a schema change. No fundamental replan; no PM or Architect escalation required.

### Sequencing

1. **ST-3.0** — blocking prerequisite. Migration, participation resolution service, API exposure, conflict primitive.
2. **ST-3.2 and ST-3.5** — proceed once ST-3.0 lands; their existing conflict acceptance criteria become evaluable.
3. **ST-3.1, ST-3.3, ST-3.4** — unaffected, may run in parallel.
4. **ST-7.4** — backlog, scheduled with EP-07.

### Ownership

| Role | Responsibility |
| --- | --- |
| Developer | Implement ST-3.0 including the Prisma migration, then unblock ST-3.2 and ST-3.5 |
| Product Owner | Confirm ST-3.0 placement at the front of EP-03 and hold ST-3.2 and ST-3.5 until it lands |
| UX | Apply section 15 of the UX design guidelines to proposal list and detail screens |

### Success criteria

- Proposal participation resolves to a user account where an account exists, and external participants without accounts still save.
- The proposal API returns the current user's record-scoped role, and the UI states it on both list and detail.
- One shared conflict primitive backs both reviewer assignment and approval decisions, and fails closed when participation context cannot be resolved.
- A user who owns proposal X and participates in proposal Y sees the correct role on each and is blocked, with a stated reason, from approving either.
- `AC-ST-3.2-04` and `AC-ST-3.5-04` are demonstrably testable.

### Open items carried forward

- Project participation (EP-04) and council membership (EP-10) need the same account linkage before their conflict rules become enforceable. Reuse the ST-3.0 pattern.
- `canReadProposal` grants no read path to leadership, reviewers, or council members. Required by ST-3.5 and ST-3.3 and to be handled inside those stories.
- Researcher-profile linkage (FR66, EP-11) overlaps with participation identity and should be reconciled when EP-11 is planned.
