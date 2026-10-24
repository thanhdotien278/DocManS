# Epic 4: Tiếp nhận và nộp đề xuất nghiên cứu

**Authorization refinement — 2026-10-18 (10-role model, supersedes 2026-09-21):** Intake scope never grants proposal visibility. TP and CV create/open/close intake periods; every role except QT/NNB sees open periods and may be PI (NNB is denied). Story 4.2 must represent unassigned proposals ("Chưa có người phụ trách"); TP/TB see them within unit scope, CV needs the current officer assignment (`PROPOSAL_MANAGEMENT_OFFICER`). The system auto-assigns a responsible CV by segment on submit/resubmit (new 4.7); post-submission withdraw/edit/reopen is handled by the assigned CV (new 4.8). Preserve independent PI/team access and existing PI submission restrictions. `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD) monitors only; only GĐ decides topic + funding. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

- **Epic status:** `backlog`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 4.1 | Tạo và quản lý đợt tiếp nhận đề xuất | `backlog` |
| 4.2 | Tạo đề xuất nháp và thiết lập quan hệ tham gia | `backlog` |
| 4.3 | Nhập và cộng tác trên thông tin đề xuất có cấu trúc | `backlog` |
| 4.4 | Đính kèm và quản lý tệp đề xuất | `backlog` |
| 4.5 | Kiểm tra mức độ sẵn sàng trước khi nộp | `backlog` |
| 4.6 | Nộp chính thức và xem lịch sử nộp đề xuất | `backlog` |
| 4.7 | Auto-assign responsible CV by segment on submit | `backlog` |
| 4.8 | Post-submission withdraw/edit/reopen by assigned CV | `backlog` |

## Execution note

Create the next story specification only after its preceding dependency is understood and the shared authorization, audit, and file rules in the project context remain satisfied.

## Finalized leadership authorization impact

Updated 2026-10-18 to the 10-role model (`docs/permission-matrix.md`, §7 wins).
`RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD) monitors only and is not
`SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH). Only GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`) approves
topic + funding and liquidation; GĐ or PGĐ-KH sign councils, IRB, acceptance, extension and
adjustment. Tờ trình routing is CV → TB → TP → BGĐ; former Head/Staff duties go to TP/TB/CV
per action. All surfaces must preserve disclosure, source authorization and active officer
restrictions; no broad CV queues. Project/council establishment, notifications/My Work and
institutional dashboards/reports remain planned where their owning backend is absent.
Funding uses available metadata only.
