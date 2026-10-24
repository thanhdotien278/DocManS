# Epic 6: Theo dõi và nghiệm thu đề tài đã phê duyệt

**Authorization refinement — 2026-10-18 (10-role model, supersedes 2026-09-21/22):** Stories 6.1/6.2 own independent `PROJECT_MANAGEMENT_OFFICER` lifecycle: at most one active primary officer (a CV), no automatic proposal-authority copy, atomic reassignment/history/audit; TP¹/TB¹ assign it. Project view is Academy-wide for GĐ, PGĐ-KH, TP and TB; CV operates only on assigned projects; PP and PGĐ-TD read only. GĐ approval of topic + funding is the gate before execution. After activation, the assigned CV reviews/accepts reports and appraises Project Adjustment/Extension; the request then goes through tờ trình routing (CV → TB → TP → BGĐ) and is signed by GĐ or PGĐ-KH, whose signature applies the change atomically. Acceptance council is signed by GĐ or PGĐ-KH; liquidation only by GĐ. New stories 6.11 (adjustment/extension via routing) and 6.12 (funding metadata and liquidation). The Golden Flow 4 code on `DocManS` still ships the former Staff/Head decision paths until 6.11 lands. Institutional dashboards and notification delivery remain later work.

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
| 6.11 | Delta for GF4: adjustment/extension via approval routing, signed by GĐ/PGĐ-KH | `backlog` |
| 6.12 | Funding metadata and liquidation | `backlog` |

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

## Golden Flow 4 delivery gate — 2026-09-22

[Execution contract](../../../docs/contracts/project-execution.md) refines stories
6.1–6.7 and execution/history from 6.10 into one vertical flow. 6.8–6.9 remain the
next flow. The documentation gate is complete; implementation is **in progress**.
Target model (10 roles, 2026-10-18; the code on `DocManS` has the ten role codes but still
implements the former Staff/Head (now CV/TP) decision paths until story 6.11): the assigned proposal CV creates the
project; TP¹/TB¹ separately assign the project CV, who confirms setup. GĐ approval of
topic + funding is required before execution begins. The assigned CV appraises Project
Adjustment/Extension and drafts the tờ trình; TB → TP route it; GĐ or PGĐ-KH sign, and the
signature applies the change atomically. TP, TB and PP have no direct adjustment or
extension decision action.

Verification must cover all twenty happy/negative scenarios in the user request,
including immutable report/evidence revisions, assigned-CV scope, CV report
acceptance, CV appraisal of adjustment/extension, tờ trình routing (no step skipping,
no self-review, return with reason), GĐ or PGĐ-KH signature approval/rejection and denial
for TP/TB/PP/PGĐ-TD, atomic end-date/plan application,
rejection preservation, inactive actors, incompatible assignments, stale/duplicate
decisions, derived overdue, capability-driven UI and append-only audit. Seed must
demonstrate the entire flow.
Run Prisma validation/migration checks, seed, typecheck, focused and integration
checks, existing frontend tests and build; record actual results and runtime gaps.
