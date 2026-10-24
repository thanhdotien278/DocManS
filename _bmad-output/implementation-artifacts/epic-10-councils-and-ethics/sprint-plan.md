# Epic 10: Hội đồng và hồ sơ đạo đức

- **Epic status:** `backlog`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Initial status |
|---|---|---|
| 10.1 | Lập kế hoạch hội đồng, thành viên và căn cứ liên quan | `backlog` |
| 10.2 | Thư ký khoa học hỗ trợ vận hành hội đồng | `backlog` |
| 10.3 | Tạo, hoàn thiện và nộp hồ sơ đạo đức | `backlog` |
| 10.4 | Kiểm tra hồ sơ đạo đức và xử lý bổ sung | `backlog` |
| 10.5 | Phân công hội đồng và reviewer với eligibility/conflict | `backlog` |
| 10.6 | Thành viên hội đồng hoặc reviewer nộp đánh giá được phân công | `backlog` |
| 10.7 | Theo dõi, tổng hợp và trình kết quả hội đồng | `backlog` |
| 10.8 | Quyết định hội đồng hoặc hồ sơ đạo đức | `backlog` |
| 10.9 | Contract tích hợp hội đồng và hồ sơ đạo đức | `backlog` |

## Execution note

Create the next story specification only after its preceding dependency is understood and the shared authorization, audit, and file rules in the project context remain satisfied.

**Cập nhật 2026-10-24 (D-035, D-036):** người thành lập hội đồng và mời thành viên do QT cấu hình theo từng loại hội đồng (mặc định TP¹/TB¹; CV không còn mặc định); Phòng KHQS lập và trình tờ trình (CV³/TB¹/TP¹), BGĐ ký. Phạm vi hội đồng đánh giá: `../../specs/spec-hoi-dong-tham-dinh.md` và các file story 10-1, 10-2, 10-5, 10-6, 10-7, 10-8 trong thư mục này. Ghi chú 2026-10-18 dưới đây bị thay ở điểm "TP¹/TB¹/CV³ set up councils".

**Authorization refinement — 2026-10-18 (10-role model):** Stories 10.1 and 10.5: TP¹/TB¹/CV³ set up councils and assign members with a conflict check; members and IRB members are invited from any account with a scientific CV (every role except QT) and must accept or decline (decline with a reason); the council tờ trình is routed only after every member has accepted. Story 10.4 (IRB completeness): TB/CV. Story 10.8: GĐ or PGĐ-KH sign council establishment, IRB council and IRB certificate. Council members read the dossier only after BGĐ signs establishment. "Thư ký khoa học" in story 10.2 means the council/team secretary (writes synthesis/minutes, no scoring), not the former Staff role.

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
