# Epic 11: Thông báo, nhắc việc và khu “Của tôi”

**Authorization refinement — 2026-10-18 (10-role model, supersedes 2026-09-21):** Resolve management oversight, officer management and participation/review access separately. Re-authorize notifications and work queues at dispatch/read; officer revocation removes management items without erasing independent participation. Recipients include the next tờ trình routing step (TB, TP, then the BGĐ signer); My Work excludes QT. No role-wide CV recipient set or count leakage. `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD) monitors only; GĐ alone decides topic + funding. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

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
| 11.6 | Per-role work queues (TB review, TP approval, CV assigned, GĐ/PGĐ-KH signature, reviewer invitations) | `backlog` |

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
