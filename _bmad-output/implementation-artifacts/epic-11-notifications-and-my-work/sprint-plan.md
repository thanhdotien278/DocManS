# Epic 11: Thông báo, nhắc việc và khu “Của tôi”

**Authorization refinement — 2026-09-21:** Resolve Head oversight, officer management and participation/review access separately. Re-authorize notifications and work queues at dispatch/read; officer revocation removes management items without erasing independent participation. No role-wide Staff recipient set or count leakage. Finalized baseline §2.1 grants Head officer management and eligible package submission. Deputy has researcher eligibility plus read-only institutional oversight; Director alone has eligible final decisions. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

- **Epic status:** `backlog`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 11.1 | Thông báo trong ứng dụng theo sự kiện nghiệp vụ | `backlog` |
| 11.2 | Email cho sự kiện và kết quả quan trọng | `backlog` |
| 11.3 | Nhắc hạn và công việc tồn đọng an toàn | `backlog` |
| 11.4 | Tổng hợp backend cho khu “Của tôi” | `backlog` |
| 11.5 | Giao diện “Của tôi” và mục bị chặn do xung đột | `backlog` |

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
