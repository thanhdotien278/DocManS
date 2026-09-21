# Epic 6: Theo dõi và nghiệm thu đề tài đã phê duyệt

**Authorization refinement — 2026-09-21:** Stories 6.1/6.2 own independent `PROJECT_MANAGEMENT_OFFICER` lifecycle: at most one active primary officer, no automatic proposal-authority copy, atomic reassignment/history/audit. Head oversight and assigned-Staff visibility apply to reporting/acceptance/files/history; participants cannot hold conflicting management/evaluation roles. Finalized baseline §2.1 grants Head officer management and eligible package submission. Deputy has researcher eligibility plus read-only institutional oversight; Director alone has eligible final decisions. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

- **Epic status:** `backlog`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 6.1 | Khởi tạo đề tài từ proposal được phê duyệt | `backlog` |
| 6.2 | Quản lý thành viên, trách nhiệm, milestone và checkpoint | `backlog` |
| 6.3 | Chủ nhiệm nộp báo cáo tiến độ và bằng chứng | `backlog` |
| 6.4 | Thành viên đóng góp tệp và minh chứng trong phạm vi được giao | `backlog` |
| 6.5 | Rà soát báo cáo và theo dõi chậm tiến độ | `backlog` |
| 6.6 | Gửi yêu cầu điều chỉnh hoặc gia hạn | `backlog` |
| 6.7 | Quyết định điều chỉnh hoặc gia hạn | `backlog` |
| 6.8 | Chuẩn bị và nộp hồ sơ nghiệm thu hoặc đánh giá cuối | `backlog` |
| 6.9 | Rà soát và quyết định nghiệm thu hoặc đánh giá cuối | `backlog` |
| 6.10 | Trạng thái, lịch sử và truy vấn được phân quyền của đề tài | `backlog` |

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
