---
title: "Sprint Change Proposal — Topic lifecycle 9 steps, 2 phases (D-033)"
date: 2026-10-24
status: approved
approvedBy: Super
approvedOn: 2026-10-24
mode: batch
scope: minor
trigger: "_bmad-output/.decision-log.md D-033 (commit ae899a8)"
authoritativeSource: "_bmad-output/.decision-log.md D-033"
---

# Sprint Change Proposal — Topic lifecycle (D-033)

## 1. Issue Summary

**Trigger.** On 2026-10-24 the product owner fixed the topic lifecycle as 9 steps in
2 phases (D-033). Only `CONTEXT.md` and the decision log recorded it; PRD, epics,
architecture, user flows and UX spec did not.

**Problem statement.** The existing states cover most steps, but:

- No document mapped existing states to the 9 steps, and no story owns a lifecycle
  view across the proposal and its approved project.
- `docs/user-flows.md` §6 sent the supplement request from `UnderReview`, merging
  steps 3 and 4. D-033 allows the supplement loop from step 3 only.
- Step 8 names three acceptance levels (sản phẩm, cơ sở, cấp trên); Stories 6.8/6.9
  model a single acceptance. "Cấp trên" appears nowhere.
- Step 9 groups liquidation and closure as one official decision, but the
  architecture left `Accepted/Failed → Closed` as an untied "later closure".
- D-033 requires dashboards and reports that show the lifecycle to use the 9 steps
  and the 2 phase names; Stories 12.2/12.4 do not say so.

## 2. Impact Analysis

### 2.1 Coverage by step (sprint-status keys)

| Step | Covered by | Gap |
| --- | --- | --- |
| 1. Đợt tiếp nhận | `4-1` | — |
| 2. Hồ sơ đề xuất | `4-2`…`4-6`, `5-2` | — |
| 3. Kiểm tra đầy đủ | `5-1`, `4-7` | `4-8` reopen: which step it returns to is not stated (Q3) |
| 4. Thẩm định, hội đồng | `5-3`…`5-6`, `5-9`, `5-11`, `10-1`…`10-8` | — |
| 5. Phê duyệt, kinh phí | `5-7`, `5-8`, `5-10` | — |
| 6. Lập đề tài | `6-1` | — |
| 7. Thực hiện | `6-2`…`6-7`, `6-11`, `6-12` (disbursement) | Disbursement ACs share a story with step 9 |
| 8. Nghiệm thu | `6-8`, `6-9` | No product/institution/higher-level split; no "cấp trên" |
| 9. Thanh lý, đóng đề tài | `6-12` (liquidation) | Signature does not close the project; no closure AC |
| Cross-cutting | `3-3`, `6-10`, `12-2`, `12-4` | No 9-step stepper/timeline across records; dashboards/reports not grouped by step |

No new epic is needed. Every gap fits an existing epic.

### 2.2 Documents changed in this proposal (applied)

- `_bmad-output/architecture.md`: new "Topic Lifecycle Step Mapping (D-033)", the one
  canonical state-to-step table; `Accepted → Closed` tied to the `LIQUIDATION` signature.
- `_bmad-output/prd.md`: new "Topic Lifecycle (D-033)" section.
- `_bmad-output/epics.md`: pointer above the workflow-state matrix.
- `docs/user-flows.md` §6: supplement moved to the completeness check (step 3); pointer added.
- `docs/ux-ui-spec.md`: Stepper row names the 9 steps and 2 phases.

Not changed: `.decision-log.md` (D-033 is final), `sprint-status.yaml` (waits for approval).

## 3. Recommended Approach

Direct adjustment: one new story, one conditional new story, and AC deltas on existing
stories. Keep existing state names; the lifecycle step is a derived projection, never a
stored state (D-033 does not fix codes). Do not treat child-record loops (tờ trình
`RETURNED`, report/adjustment/extension/acceptance-dossier supplements) as lifecycle
transitions, and do not remove the GĐ/PGĐ-KH signatures that are not lifecycle milestones.

## 4. Detailed Change Proposals

### 4.1 New stories

**`3-7-vong-doi-de-tai-9-buoc-va-timeline-xuyen-ho-so`** — MVP. Depends on `3-3`, `6-1`, `6-10`.

As a người tham gia hoặc quản lý đề tài, I want xem đề tài đang ở bước nào trong 9 bước
và lịch sử từng bước, so that mọi người cùng hiểu tiến trình theo một mô hình duy nhất.

- **Given** proposal or approved project the viewer may read, **When** detail loads,
  **Then** backend returns the derived step (1–9) and phase per the architecture mapping,
  and the UI stepper shows the 2 phase names and 9 steps, marking steps 5 and 9 as
  official decisions.
- **Given** an approved project, **When** the timeline loads, **Then** it joins the source
  proposal history (steps 1–5) and project history (steps 6–9) in one ordered view, each
  event tagged with its step, under the same disclosure as `3-3`/`6-10`.
- **Given** a rejected proposal, **Then** the stepper ends at step 5 with the rejection.
  **Given** an approved proposal with no project, **Then** step 5 is done and step 6 pending.
- **Given** a supplement request/resubmission, **Then** the stepper shows the return to
  step 2 and re-entry at step 3; no other backward step is displayed.
- No stored step field; no client-side derivation from raw status.

**`6-13-ghi-nhan-nghiem-thu-cap-tren`** — conditional on Q1. Depends on `6-9`.
Records the higher-level acceptance result (decision document, date, outcome, files)
after the institution-level acceptance, with audit. Authority and whether it gates
step 9 come from the product owner's answer to Q1; this story invents neither.

### 4.2 AC deltas on existing stories

| Story | Delta |
| --- | --- |
| `6-8` | Dossier records results per level: sản phẩm (products) and cơ sở (institution); cấp trên per `6-13`. |
| `6-9` | Rename the outcome to "kết quả nghiệm thu" (step 8 is not an official decision). Authority rules unchanged. |
| `6-12` | Tag ACs by step: allocation/disbursement/settlement = step 7; liquidation = step 9. Add: **Given** the `LIQUIDATION` tờ trình is signed by GĐ, **Then** the project moves to `Closed` atomically with the liquidation result and audit; no other path closes an `Accepted` project. Optional: split liquidation + closure into its own story. |
| `12-2` | Lifecycle widgets group counts by the 9 steps and 2 phase names; each count drills down to source records under the same scope. |
| `12-4` | Lifecycle reports use the 9 steps and 2 phase names as grouping dimensions. |
| `4-8` | State which step a CV reopen returns the proposal to (Q3). |

## 5. Implementation Handoff

| Recipient | Responsibility |
| --- | --- |
| PO | Answer Q1–Q3. Approve §4. |
| Developer agent (docs) | After approval: add `3-7` (and `6-13` if Q1 confirms) to `epics.md` and `sprint-status.yaml` as `backlog`; apply §4.2 deltas. |
| Architect | Confirm the step projection lives in the source modules (proposal/project), not in consumers. |

**Sequence:** `6-12` delta and `3-7` after `6-1`/`6-10`; `12-2`/`12-4` deltas when those stories start.

### Open questions (not blocking this doc change)

1. **Nghiệm thu cấp trên:** what does the system record (only the external decision and
   files, or a workflow)? Who records it? Must it pass before liquidation?
2. **`Failed` (nghiệm thu không đạt):** does the project still close through a `LIQUIDATION`
   tờ trình signed by GĐ, or through another path?
3. **Reopen (FR76, `4-8`):** after a CV reopens a submitted proposal, is it back at step 2?
   D-033 names only the step 3 → 2 supplement loop.

## Addendum — 2026-10-24 (after approval)

- Added Story 3.7 to `epics.md` and `3-7-vong-doi-de-tai-9-buoc-va-timeline-xuyen-ho-so: backlog` to `sprint-status.yaml`.
- Applied §4.2 deltas to Stories 4.8 (Q3 placeholder), 6.8, 6.9 (title wording only; sprint-status key unchanged), 6.12, 12.2, 12.4.
- `6-13` waits for the PO answer to Q1; Q2 and Q3 remain open.
