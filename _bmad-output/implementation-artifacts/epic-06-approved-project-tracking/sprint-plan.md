# Epic 6: Theo dõi và nghiệm thu đề tài đã phê duyệt

**Authorization refinement — 2026-09-21/22:** Stories 6.1/6.2 own independent `PROJECT_MANAGEMENT_OFFICER` lifecycle: at most one active primary officer, no automatic proposal-authority copy, atomic reassignment/history/audit. Head oversight and assigned-Staff visibility apply to reporting/adjustment/extension/files/history; participants cannot hold conflicting management/evaluation roles. Leadership approval is the gate before execution. After activation, assigned Staff reviews/accepts reports and finally approves/rejects Project Adjustment; assigned Staff validates/prepares Project Extension and scoped Head finally approves/rejects it. Leadership does not decide either request type. Golden Flow 4 project execution is in implementation; acceptance/council, institutional dashboards and notification delivery remain later work.

- **Epic status:** `in-progress`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below (superseded for the Golden Flow 4 vertical slice — see the delivery gate below)
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 6.1 | Khởi tạo đề tài từ proposal được phê duyệt | `in-progress` |
| 6.2 | Quản lý thành viên, trách nhiệm, milestone và checkpoint | `in-progress` |
| 6.3 | Chủ nhiệm nộp báo cáo tiến độ và bằng chứng | `in-progress` |
| 6.4 | Thành viên đóng góp tệp và minh chứng trong phạm vi được giao | `in-progress` |
| 6.5 | Rà soát báo cáo và theo dõi chậm tiến độ | `in-progress` |
| 6.6 | Gửi yêu cầu điều chỉnh hoặc gia hạn | `in-progress` |
| 6.7 | Quyết định điều chỉnh hoặc gia hạn | `in-progress` |
| 6.8 | Chuẩn bị và nộp hồ sơ nghiệm thu hoặc đánh giá cuối | `backlog` |
| 6.9 | Rà soát và quyết định nghiệm thu hoặc đánh giá cuối | `backlog` |
| 6.10 | Trạng thái, lịch sử và truy vấn được phân quyền của đề tài | `in-progress` (execution/history portions in the GF4 slice; remainder backlog) |

## Execution note

Create the next story specification only after its preceding dependency is understood and the shared authorization, audit, and file rules in the project context remain satisfied.

## Finalized leadership authorization impact

`RESEARCH_OVERSIGHT_AUTHORITY` combines internal researcher capabilities through record
relationships with explicit-scope institutional oversight. It grants no final proposal,
council-establishment, funding or acceptance decision. `LEADERSHIP_APPROVAL_AUTHORITY`
has the proposal gate and any separately defined later decision authority, but no
Golden Flow 4 Project Adjustment or Project Extension decision. All surfaces must
preserve disclosure, source authorization and active officer restrictions; no broad
Staff queues.
Project/council establishment, notifications/My Work and institutional dashboards/reports
remain planned where their owning backend is absent. Funding uses available metadata only.

## Golden Flow 4 delivery gate — 2026-09-22

[Execution contract](../../../docs/contracts/project-execution.md) refines stories
6.1–6.7 and execution/history from 6.10 into one vertical flow. 6.8–6.9 remain the
next flow. The documentation gate is complete; implementation is **in progress**. Assigned proposal
Staff creates; Head separately assigns project Staff, who confirms setup. Leadership
approval is required before execution begins, but Leadership does not approve project
adjustments or extensions. Head has no Project Adjustment decision action.
Head officer-grant authority is already settled by baseline §2.1.

Verification must cover all twenty happy/negative scenarios in the user request,
including immutable report/evidence revisions, assigned-Staff scope, Staff report
acceptance, Staff adjustment approval/rejection, Head extension approval/rejection,
Leadership denial for both project request types, atomic end-date/plan application,
rejection preservation, inactive actors, incompatible assignments, stale/duplicate
decisions, derived overdue, capability-driven UI and append-only audit. Seed must
demonstrate the entire flow.
Run Prisma validation/migration checks, seed, typecheck, focused and integration
checks, existing frontend tests and build; record actual results and runtime gaps.
