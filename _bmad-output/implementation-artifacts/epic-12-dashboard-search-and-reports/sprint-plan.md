# Epic 12: Dashboard, tìm kiếm, báo cáo và xuất dữ liệu

**Authorization refinement — 2026-09-21:** Stories 12.1–12.5 implement FR45a: Head sees authorized-scope responsible Staff/unassigned records, filters/groups by officer and monitors workload/status/deadlines. Staff management queries include only current officer assignments. Apply identical current authorization to list/detail/search/count/facets/dashboard/reports/export/notifications/files/history and drill-down. Finalized baseline §2.1 grants Head officer management and eligible package submission. `RESEARCH_OVERSIGHT_AUTHORITY` has researcher eligibility plus read-only institutional oversight; `LEADERSHIP_APPROVAL_AUTHORITY` alone has eligible final decisions. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

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

## Execution note

Create the next story specification only after its preceding dependency is understood and the shared authorization, audit, and file rules in the project context remain satisfied.

## Finalized leadership authorization impact

`RESEARCH_OVERSIGHT_AUTHORITY` combines internal researcher capabilities through record
relationships with explicit-scope institutional oversight. It grants no final proposal,
council-establishment, funding or acceptance decision. `LEADERSHIP_APPROVAL_AUTHORITY`
has oversight plus eligible conflict-free final decisions. All surfaces must preserve
disclosure, source authorization and active officer restrictions; no broad Staff queues.
Project/council establishment, notifications/My Work and institutional dashboards/reports
remain planned where their owning backend is absent. Funding uses available metadata only.
