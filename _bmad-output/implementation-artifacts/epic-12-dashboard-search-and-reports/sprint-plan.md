# Epic 12: Dashboard, tìm kiếm, báo cáo và xuất dữ liệu

**Authorization refinement — 2026-10-18 (10-role model, supersedes 2026-09-21):** Stories 12.1–12.5 implement FR45a: TP/TB see authorized-scope responsible CV and unassigned records, filter/group by officer and nature (Quân sự/Dân sự) and monitor workload/status/deadlines. CV management queries include only current officer assignments. PGĐ-TD sees aggregate figures only (per-record funding columns empty). Apply identical current authorization to list/detail/search/count/facets/dashboard/reports/export/notifications/files/history and drill-down. `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD) monitors only; GĐ alone decides topic + funding. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

- **Epic status:** `backlog`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 12.1 | Tìm kiếm và lọc xuyên phân hệ theo quyền | `backlog` |
| 12.2 | Dashboard điều hành theo vai trò và phạm vi | `backlog` |
| 12.3 | Drill-down và đối chiếu chỉ số với hồ sơ nguồn | `backlog` |
| 12.4 | Báo cáo tổng hợp theo phạm vi nghiệp vụ | `backlog` |
| 12.5 | Xuất Excel/PDF có kiểm soát và truy vết | `backlog` |
| 12.6 | PP and PGĐ-TD monitoring dashboards | `backlog` |

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
