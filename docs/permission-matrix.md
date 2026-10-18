# Permission Matrix - DocManSystem / RTMS

> Bản tiếng Việt: [`permission-matrix.vi.md`](./permission-matrix.vi.md). Sửa file này thì
> sửa cả bản tiếng Việt trong cùng thay đổi.

> **Cập nhật 18/10/2026 — 10 vai trò hệ thống.** Nguồn quyết định hiện hành là
> `docs/Ma_tran-phan-qquyen-DocManS.pdf` (ma trận đối chiếu code API ngày 15/10/2026)
> và tài liệu thiết kế `docs/design/phan-cap-va-trinh-duyet.md` (hiện nằm trên nhánh
> `tuan/DocManS`, chưa merge vào `DocManS`). Khi mâu thuẫn, mục 7 của file này thắng.
>
> Các tài liệu sau vẫn mô tả mô hình 7 vai trò cũ và **chờ đồng bộ**, không dùng làm
> nguồn quyết định cho phần mâu thuẫn:
> [`authorization-core-business-baseline.md`](./authorization-core-business-baseline.md),
> [`contracts/project-execution.md`](contracts/project-execution.md),
> [`contracts/researcher-profile-access.md`](contracts/researcher-profile-access.md).

## 1. Purpose

This document is the detailed phase 1 permission matrix for DocManSystem / RTMS.
It defines role-based, data-scope, state-based, and audit expectations for
implementation, review, testing, and QA.

Use this document as the source of truth when implementing backend policies,
API guards, UI action visibility, dashboard queries, export queries, file access
flows, workflow transitions, and authorization test cases.

If PRD, requirements, story scope, roles, or workflow states change, this
document must be updated in the same change set.

## 2. Canonical System Roles

Each account has **exactly one** system role. Effective permission additionally
depends on the user's organization/unit scope and the user's relationship with each
proposal/project (11 record-relationship types; 83 V1 authorization action codes per
the 15/10/2026 code audit).

| Abbr. | Vietnamese title | System role code | Group |
| --- | --- | --- | --- |
| QT | Quản trị hệ thống | `SYSTEM_ADMIN` | Platform |
| GĐ | Giám đốc Học viện | `LEADERSHIP_APPROVAL_AUTHORITY` | Ban giám đốc (BGĐ) |
| PGĐ-KH | Phó Giám đốc phụ trách Khoa học | `SCIENCE_DEPUTY_DIRECTOR` | Ban giám đốc |
| PGĐ-TD | Phó Giám đốc khác, chỉ theo dõi | `RESEARCH_OVERSIGHT_AUTHORITY` | Ban giám đốc |
| TP | Trưởng phòng KHQS | `RESEARCH_MANAGEMENT_HEAD` | Phòng KHQS |
| PP | Phó phòng KHQS | `RESEARCH_MANAGEMENT_DEPUTY_HEAD` | Phòng KHQS |
| TB | Trưởng ban QLKH (một người) | `RESEARCH_BOARD_HEAD` | Phòng KHQS |
| CV | Chuyên viên QLKH | `RESEARCH_MANAGEMENT_STAFF` | Phòng KHQS |
| NCV | Nhà nghiên cứu nội bộ | `RESEARCHER_INTERNAL_USER` | Researcher |
| NNB | Nhà nghiên cứu bên ngoài | `EXTERNAL_RESEARCHER_USER` | Researcher |

Role renames versus the former 7-role model: `SCIENTIFIC_MANAGEMENT_HEAD` →
`RESEARCH_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF` → `RESEARCH_MANAGEMENT_STAFF`.
New roles: `SCIENCE_DEPUTY_DIRECTOR`, `RESEARCH_MANAGEMENT_DEPUTY_HEAD`,
`RESEARCH_BOARD_HEAD`. `RESEARCH_OVERSIGHT_AUTHORITY` now means only the other Deputy
Directors who monitor; it is no longer the Science Deputy Director.

### QT — System Administrator

- Platform administration only: accounts, roles, units, catalogs, configuration,
  researcher-profile provisioning/linking, scientific document management.
- Has no scientific CV, no business dashboard, cannot be assigned as reviewer,
  council or IRB member, and has no business decision authority.

### GĐ — Giám đốc Học viện

- The only role that approves topics (proposal) with their funding, and approves
  contract liquidation (thanh lý).
- Can also sign everything PGĐ-KH signs: evaluation/acceptance/IRB council
  establishment, IRB certificate, project extension and adjustment.
- Sees every project in the Academy and per-project funding; manages funding,
  disbursement and settlement.

### PGĐ-KH — Phó Giám đốc phụ trách Khoa học

- Signs council establishment (evaluation, acceptance, IRB), IRB certificate,
  project extension and adjustment (without funding change).
- Does not approve topics, funding or liquidation; does not manage funding.
- Sees every project in the Academy and per-project funding.

### PGĐ-TD — Phó Giám đốc khác, chỉ theo dõi

- Monitoring only: progress, counts and **aggregate** funding reports (note 7).
- Cannot view per-record funding and signs nothing.

### TP — Trưởng phòng KHQS

- Approves every submission dossier (tờ trình) before it goes to BGĐ.
- Assigns topic segments (mảng) to CV, assigns/reassigns/revokes the responsible CV
  on proposals and projects, coordinates every proposal within unit scope.
- May also perform CV-level evaluation work (reviewer/council assignment, synthesis,
  IRB council, drafting tờ trình) within unit scope.
- Sees every project in the Academy; manages funding Academy-wide.
- Does not perform completeness checks or supplement requests.

### PP — Phó phòng KHQS

- Monitoring only (progress, counts) within unit scope. No step in the tờ trình
  flow and no approval, even when TP is absent.
- Sees per-project funding only for projects in which PP is PI/member (note 4).

### TB — Trưởng ban QLKH

- Reviews CV-authored tờ trình, then forwards to TP or returns to the author.
- Assigns/revokes the responsible CV within unit scope; performs completeness,
  supplement, reviewer/council assignment, synthesis, IRB council and tờ trình
  drafting within unit scope.
- Sees every project in the Academy; manages funding Academy-wide.

### CV — Chuyên viên QLKH

- Works only on proposals/projects to which CV is currently assigned as responsible
  officer (note 3): completeness, supplement request, reviewer/council invitation,
  synthesis, IRB council, drafting tờ trình, daily project operations (milestone
  setup, report review, appraising adjustment/extension, acceptance, products,
  drafting liquidation, project closing), funding within assignment.
- Creates/opens/closes intake periods; manages researcher profiles in unit scope;
  manages student research (NCKH sinh viên) in unit scope.
- Never operates on records assigned to another CV.

### NCV — Nhà nghiên cứu nội bộ

- Creates, edits and submits proposals as PI; PI and member work on own projects.
- Reviewer, council member/secretary or IRB member only when assigned (notes 5, 6).
- Registers student research as supervising lecturer.

### NNB — Nhà nghiên cứu bên ngoài

- Cannot create proposals, cannot see intake periods, cannot be PI.
- Participates only as reviewer, council/IRB member, council secretary or project
  member through an explicit record relationship.

### Record-Scoped Participation And Assignment Roles

Scientific work roles such as `PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_SECRETARY`,
`TOPIC_MEMBER`, reviewer, council chair, council secretary, council member, IRB
member/secretary and responsible officer must be resolved in the context of a specific
proposal, approved topic, council, IRB dossier, review, task, or related business
record. A proposal has one `PROPOSAL_PI` derived from `ownerId`; its team contains only
`TOPIC_SECRETARY` and `TOPIC_MEMBER`.

Do not grant global access by assigning participation labels directly to a user
account. Backend authorization calculates effective permission from system role,
organization/unit scope, record relationship, assignment, workflow state, and
conflict policy.

| Role Type | Examples | Scope Boundary | Important Limits |
| --- | --- | --- | --- |
| Management responsibility | `PROPOSAL_MANAGEMENT_OFFICER`, `PROJECT_MANAGEMENT_OFFICER` (a CV) | One proposal/project | At most one active responsible CV per record; auto-assigned by segment on submission, or assigned by TP/TB; history/audit retained. |
| Proposal participation | `PROPOSAL_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | One proposal | No access to unrelated proposals; PI is derived from `ownerId`. |
| Approved-topic participation | `TOPIC_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | One approved topic | Depends on active relationship and workflow state. |
| Review assignment | Evaluation reviewer / evaluation council member | One proposal | Invited from any account with a scientific CV (every role except QT, including GĐ, PGĐ, TP, PP, TB, CV); must accept invitation; scores; reads records outside own unit. |
| Council / IRB membership | Chair, secretary, member, IRB member, IRB secretary | One council / IRB dossier | IRB members invited from any account with a scientific CV; council secretary writes synthesis/minutes but does not score. |
| Task assignment | Owner, assignee, collaborator | One task and linked record | Task access still depends on linked-record permission. |

## 3. External Researcher User Overlay

Apply this overlay to every row in addition to the system-role matrix:

| Capability | `EXTERNAL_RESEARCHER_USER` rule |
| --- | --- |
| Authentication and account context | May sign in only while active; the session exposes the external system role and never invents PI/member/reviewer authority. |
| Profile and account administration | No user, role, scope, profile, account-link, catalog, or configuration management. Own scientific CV self-update only. |
| Intake periods | Cannot see intake periods. |
| Proposal discovery and detail | Read only proposals with an explicit active reviewer/council/IRB assignment or project-member relationship. Same unit, name, or another record relationship does not grant access. |
| Proposal draft and submission | No create, edit, submit, or resubmit authority; never PI. |
| Review work | Read and submit only an explicitly assigned and accepted review package; council secretary of the record may write synthesis/minutes (note 6). |
| Project, task, and file work | Member milestone-progress updates and reads only where an active relationship grants the exact action. |
| Dashboard, search, export, notification, and history | Only records already visible through the same relationship/assignment policy. |

The backend rechecks role, scope, relationship/assignment, workflow state,
conflict, and any applicable delegation contract at mutation time. Proposal
creation, submission, and resubmission never use delegation. UI capability data
never grants an action by itself.

## 4. Permission Legend

| Symbol / Permission | Meaning |
| --- | --- |
| ✓ | Allowed (superscript = condition note). |
| ◐n | Conditional, see note n. |
| Xem / Read | View only. |
| — / None | Denied. |
| Create / Update / Submit | Create, edit, or formally submit in an allowed workflow state. |
| Review | Review completeness, progress, evidence, scores, or business context. |
| Assign | Assign reviewers, council members, officers, task owners, or collaborators. |
| Approve/Reject / Ký | Authority decision that changes workflow outcome. |
| Manage | Full operational management within allowed scope. |
| Export | Generate or download report/export output within allowed scope. |
| Audit/View History | View workflow history, audit logs, or timeline records where allowed. |

## 5. Scope Rules

| Scope Rule | Definition |
| --- | --- |
| Platform scope | QT administrative data only; never business records. |
| Unit scope (note 1) | Limited to the user's granted organization/unit scope. Proposals always follow unit scope. |
| Submitted-in-unit scope (note 2) | Proposals already in workflow (submitted or later) within unit scope. |
| Academy-wide project scope | BGĐ (GĐ, PGĐ-KH), TP and TB view every project in the Academy; TP and TB manage funding Academy-wide. Other project operations remain unit-scoped. |
| Assigned officer scope (note 3) | Only records where the CV is the current responsible officer; past assignment grants nothing. |
| Own participation scope (note 4) | Only records where the user is PI or member. PP sees per-project funding only for such projects. |
| Reviewer / council / IRB assignment scope (note 5) | Only when assigned as reviewer, council or IRB member; may read records outside own unit. |
| Council secretary scope (note 6) | Secretary of the council of that record: synthesis and minutes, no scoring. |
| Aggregate-only scope (note 7) | PGĐ-TD dashboard: aggregate figures; per-project/proposal funding columns stay empty. |
| Conflict policy scope | Denied when the actor has a conflicting relationship on the same record (see §7.3). |

## 6. State Rules

| State Rule | Authorization Meaning |
| --- | --- |
| Draft | Proposal draft content may be created or updated only by its current PI (any role except QT/NNB); no team member, secretary, delegate or manager edits or submits it. |
| Open intake | Intake periods created/opened/closed by TP or CV; visible to every role except QT and NNB. |
| Closed intake | New submissions are blocked; read access remains scope-controlled. |
| Submitted | Locked from draft edits; system auto-assigns a responsible CV by segment (level + nature); unmatched records show "Chưa có người phụ trách" for TP to assign. |
| Needs supplement | PI may revise only the requested content or files allowed by workflow. |
| Resubmitted | Returns to the responsible CV's workflow. |
| Under review | Assigned, accepted reviewers perform review actions; unrelated users cannot access review material. |
| Tờ trình in routing | CV drafts → TB reviews → TP approves → BGĐ signs. Return at any step goes back to the author with a mandatory reason. |
| Ready for approval | Only GĐ decides topic + funding approval. |
| Approved / Rejected | Approved-project creation may begin; decision history remains visible by scope. |
| Active project | Daily operations by the assigned CV; PI and members act per relationship. |
| Waiting report submission (derived flag) | PI submits the formal report; members update only milestones they are responsible for. |
| Report under review | Assigned CV reviews, accepts, or requests supplementation (no tờ trình). |
| Pending adjustment / extension | PI submits; assigned CV appraises and drafts tờ trình; TB → TP → GĐ or PGĐ-KH signs. Code state names `under_staff_review`, `under_staff_validation`, `ready_for_head_decision` belong to the former flow and must be synchronized with the code. |
| Liquidation | CV drafts liquidation minutes → TB → TP → only GĐ signs. |
| Completed/accepted | Mostly read-only except history, reporting, and allowed archival actions. |
| Task open/in progress/completed/cancelled | Depends on task state, assignee/collaborator scope, and linked-record permission. |

## 7. System-role matrix (authoritative)

Source: `docs/Ma_tran-phan-qquyen-DocManS.pdf`. `—` means denied; a record relationship
never creates a new system role.

### 7.1 Function × role

| Chức năng | QT | GĐ | PGĐ-KH | PGĐ-TD | TP | PP | TB | CV | NCV | NNB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Quản trị và tài khoản** | | | | | | | | | | |
| Quản lý tài khoản, vai trò, đơn vị, danh mục, cấu hình | ✓ | — | — | — | — | — | — | — | — | — |
| Quản lý hồ sơ nhà khoa học (tạo, cấp hoặc liên kết tài khoản) | ✓ | — | — | — | ✓¹ | — | — | ✓¹ | — | — |
| Có lý lịch khoa học, tự cập nhật | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Quản lý văn bản khoa học | ✓ | — | — | — | ✓ | — | ✓ | ✓ | — | — |
| **Đợt tiếp nhận** | | | | | | | | | | |
| Tạo, mở, đóng đợt | — | — | — | — | ✓ | — | — | ✓ | — | — |
| Xem đợt đang mở | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **Hồ sơ đề xuất** | | | | | | | | | | |
| Tạo, sửa, nộp đề xuất (tư cách chủ nhiệm) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Xem hồ sơ | — | Xem² | Xem² | Xem¹ | Xem¹ | Xem¹ | Xem¹ | ◐3 | ◐4 | ◐5 |
| Giao hoặc thu hồi chuyên viên phụ trách hồ sơ, phân mảng | — | — | — | — | ✓¹ | — | ✓¹ | — | — | — |
| Kiểm tra đầy đủ, yêu cầu bổ sung | — | — | — | — | — | — | ✓¹ | ◐3 | — | — |
| Phân công phản biện, lập hội đồng đánh giá | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Chấm phiếu đánh giá | — | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 |
| Tổng hợp, chốt, trình kết quả đánh giá | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | ◐6 | ◐6 |
| Xem tiến độ đánh giá | — | Xem¹ | Xem¹ | Xem¹ | Xem¹ | Xem¹ | Xem¹ | ◐3 | — | — |
| Lập hội đồng IRB (mời thành viên), trình kết luận IRB | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Nhận xét IRB (thành viên), lập kết luận IRB (thư ký) | — | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 |
| **Tờ trình qua Phòng KHQS** | | | | | | | | | | |
| Lập tờ trình | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Rà soát, trình Trưởng phòng (bước Trưởng ban) | — | — | — | — | — | — | ✓¹ | — | — | — |
| Duyệt, trình Ban giám đốc (bước Trưởng phòng) | — | — | — | — | ✓¹ | — | — | — | — | — |
| Ký thành lập hội đồng đánh giá, IRB, nghiệm thu; cấp giấy IRB; gia hạn, điều chỉnh | — | ✓ | ✓ | — | — | — | — | — | — | — |
| Phê duyệt đề tài và kinh phí; phê duyệt thanh lý | — | ✓ | — | — | — | — | — | — | — | — |
| **Đề tài đang thực hiện** | | | | | | | | | | |
| Xem và theo dõi đề tài | — | ✓ | ✓ | Xem¹ | Xem | Xem¹ | Xem | Xem¹ | ◐4 | ◐4 |
| Xem chi tiết kinh phí từng đề tài | — | ✓ | ✓ | — | ✓ | ◐4 | ✓ | ◐3 | ◐4 | ◐4 |
| Quản lý kinh phí, giải ngân, quyết toán | — | ✓ | — | — | ✓ | — | ✓ | ◐3 | — | — |
| Giao hoặc thu hồi chuyên viên phụ trách đề tài | — | — | — | — | ✓¹ | — | ✓¹ | — | — | — |
| Nghiệp vụ hằng ngày: thiết lập mốc, xét báo cáo, thẩm định điều chỉnh, gia hạn, nghiệm thu, sản phẩm, lập thanh lý, đóng đề tài | — | — | — | — | — | — | — | ◐3 | — | — |
| Việc của chủ nhiệm: báo cáo, xin điều chỉnh hoặc gia hạn, nộp nghiệm thu, nộp sản phẩm | — | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | — |
| Cập nhật tiến độ mốc mình phụ trách (thành viên) | — | — | — | — | — | — | — | — | ◐4 | ◐4 |
| **Đề tài sinh viên NCKH** | | | | | | | | | | |
| Đăng ký đề tài (giảng viên hướng dẫn) | — | — | — | — | — | — | — | ✓ | ✓ | — |
| Duyệt, quản lý, hoàn thành | — | — | — | — | — | — | — | ✓¹ | — | — |
| **Tổng quan** | | | | | | | | | | |
| Dashboard nghiệp vụ, xuất Excel | — | ✓ | ✓ | ✓⁷ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 7.2 Condition notes

1. Only within the user's unit scope.
2. Proposals already in workflow (submitted or later), within unit scope.
3. Only proposals/projects to which the CV is currently assigned as responsible officer.
4. Only proposals/projects where the user is PI or member. PP sees per-project funding
   only for projects PP participates in.
5. Only when assigned as reviewer, council member or IRB member; may read records
   outside own unit. Evaluation reviewers/council members and IRB members are invited
   from every account with a scientific CV (every role except QT); anyone invited to the
   evaluation council scores. Record participants cannot be invited. A council member
   or reviewer cannot sign or decide on that same record (§7.3, §8).
   *Changed 18/10/2026 by product decision; the PDF limited evaluation reviewers to
   NCV/NNB and scoring to CV/NCV/NNB.*
6. Council secretary of that record: drafts synthesis and minutes, does not score.
7. Not defined in the PDF legend. Per `docs/design/phan-cap-va-trinh-duyet.md` §5:
   PGĐ-TD sees aggregate figures only; per-project/proposal funding stays empty.

### 7.3 General rules

- **Conflict of interest.** PI, member or reviewer of a proposal/project cannot use
  management authority on that same record (assignment, completeness check,
  synthesis, decision, funding).
- **Two-way anonymity.** PI and reviewers cannot view the record's action log.
- **Tờ trình flow.** CV drafts → TB reviews → TP approves → BGĐ signs. A TB-authored
  tờ trình goes straight to TP; a TP-authored one still passes the TB step. Return at
  any step goes back to the author (mandatory reason). TB/TP never review a tờ trình
  they authored and handle only tờ trình within their unit scope.
- **Signatures.** Only GĐ signs topic approval, funding and liquidation. GĐ or PGĐ-KH
  signs evaluation/acceptance/IRB council establishment, IRB certificate, extension
  and adjustment.
- **Project view scope.** BGĐ, TP and TB see every project in the Academy; TP and TB
  manage funding Academy-wide; other project operations stay within unit scope.
  Proposals always follow unit scope.
- **PP** only monitors and has no step in the tờ trình flow.
- **NNB** creates no proposal and sees no intake period; participates as reviewer,
  IRB member or project member.
- **QT** only administers the platform: no scientific CV, no business dashboard,
  cannot be assigned as reviewer.
- Unit titles (Trưởng khoa, Chủ nhiệm Bộ môn, …) are display-only and grant no
  permission.
- Higher roles may see what lower roles see; lower roles never change a higher
  role's decision. The backend enforces every permission.

### 7.4 Tờ trình procedures

| Procedure | Starts from | BGĐ signer |
| --- | --- | --- |
| Evaluation council establishment | Council tờ trình after every member accepted | GĐ or PGĐ-KH |
| Topic and funding approval | Finalized evaluation package | GĐ only |
| IRB council / IRB certificate | IRB council proposal / IRB conclusion | GĐ or PGĐ-KH |
| Acceptance council | Acceptance council proposal | GĐ or PGĐ-KH |
| Project extension | CV appraisal of the extension request | GĐ or PGĐ-KH |
| Project adjustment (no funding change) | CV appraisal of the adjustment request | GĐ or PGĐ-KH |
| Contract liquidation | Draft liquidation minutes | GĐ only |

Small tasks the CV completes without routing: completeness confirmation, supplement
request, reviewer assignment, invitation follow-up, progress report review.

## 8. Contextual permission matrix (record-persona shorthand)

Columns are grouped by role; resolve them against §7 first. "Phòng KHQS" means TP¹/TB¹
for coordination and CV³ for record operations unless the cell names a role. "BGĐ"
means the signer from §7.4. Missing or denied cells are explicit `None`.

| Capability Group | QT | Phòng KHQS (TP / TB / CV) | BGĐ (GĐ / PGĐ-KH / PGĐ-TD) | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Council / IRB | Scope Rule | State Rule | Audit Required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User, role, organization administration | Manage | None | None | None | None | None | Platform scope | Any | Yes |
| Shared catalogs and configuration | Manage | Read | Read | Read where needed | Read where needed | Read where needed | Platform scope | Any | Yes for changes |
| Proposal intake period management | None | TP, CV: Manage; TB, PP: Read | Read open periods | Read applicable | None | None | Unit scope | Draft, open intake, closed intake | Yes |
| Proposal draft creation and editing | None | None from management role | None from management role | Create/Update own (any role except QT/NNB) | None | None | Own proposal scope | Draft | Yes |
| Proposal attachment upload/view/download | None | Read (TP/TB/PP¹, CV³) | Read (GĐ/PGĐ-KH², PGĐ-TD¹) | Create/Read own | Secretary: Create/Read; Member: Read | Read assigned | Record-level scope | Draft, needs supplement, under review | Yes for important file actions |
| Proposal formal submission | None | None | None | Submit own | None | None | Own proposal scope | Draft, open intake | Yes |
| Proposal completeness review | None | TB¹, CV³: Review | None | Read own | Read if participating | None | Unit / assigned officer scope | Submitted, resubmitted | Yes |
| Supplement request | None | TB¹, CV³: Submit request | None | Read/respond | Read if participating | None | Unit / assigned officer scope | Submitted, needs supplement | Yes |
| Proposal resubmission | None | Read | Read | Submit own | None | None | Own proposal scope | Needs supplement | Yes |
| Reviewer/council assignment | None | TP¹, TB¹, CV³: Assign with conflict check | Monitor progress¹ | None | None | Accept/decline invitation | Unit scope, assigned officer scope, conflict policy | Submitted, resubmitted, under review | Yes |
| Reviewer scoring and comments | None | Only via own council/reviewer assignment⁵ | Only via own council/reviewer assignment⁵ | None | None | Review/Submit assigned (any role except QT) | Reviewer assignment scope | Under review | Yes |
| Evaluation consolidation / Trình kết quả | None | TP¹, TB¹, CV³: Review/Update/Submit | Monitor progress¹ | None | None | Council secretary: synthesis/minutes (note 6) | Unit scope, conflict policy | Under review | Yes |
| Approval/rejection of topic and funding | None | Route only (TB → TP) | GĐ only: Approve/Reject | Read result | Read result if participating | None | Unit scope, conflict policy | Ready for approval | Yes |
| Council / IRB / acceptance establishment | None | Draft and route | GĐ or PGĐ-KH: Sign | None | None | IRB member comments, IRB secretary drafts conclusion | Unit scope, IRB assignment scope | State-dependent | Yes |
| Approved project creation and setup | None | CV³: Create/Setup; TP¹/TB¹ assign officer | Read | Read own | Read if participating | None | Unit scope | Approved | Yes |
| Milestone/checkpoint management | None | CV³: Manage | Read | Read/Update own allowed items | Member: update own milestone progress | None | Unit / participation scope | Active project | Yes for changes |
| Progress report submission | None | Read | Read | Submit own | Contribution only | None | Own topic scope | Waiting report, active project | Yes |
| Progress report review/follow-up | None | CV³: Review/Accept/Request supplement | Read/Monitor | Read/respond | Read assigned | None | Assigned officer scope | Submitted report, delayed project | Yes |
| Project Adjustment / Extension request | None | CV³: Appraise and draft tờ trình; TB → TP route | GĐ or PGĐ-KH: Sign | Create/Submit/Withdraw own | None | None | Own topic scope; assigned officer scope | Active project | Yes |
| Acceptance/final review | None | CV³: Prepare; route tờ trình | GĐ or PGĐ-KH: Sign council establishment | Submit acceptance dossier | Read assigned | Review if assigned | Unit scope, reviewer assignment scope, conflict policy | Waiting decision, completed/accepted | Yes |
| Funding view (per project) | None | TP, TB: all; CV³; PP⁴ | GĐ, PGĐ-KH: all; PGĐ-TD: aggregate only | Read own⁴ | Read⁴ | None | Academy-wide / assigned / own | Any | No for read |
| Funding management, disbursement, settlement | None | TP, TB: Academy-wide; CV³ | GĐ: Manage | None | None | None | Academy-wide / assigned | Active project | Yes |
| Liquidation | None | CV³: Draft; route | GĐ only: Sign | Read | Read | None | Assigned officer scope | Completed | Yes |
| Task creation and assignment | None | Create/Assign within scope | None | Create in own topic scope | None unless explicitly assigned | None | Task / linked record scope, conflict policy | Task states | Yes |
| Task status/progress update | None | Update scoped | Read | Update own/assigned | Update assigned | None | Task assignee/collaborator scope | Task states | Yes |
| Workflow history/timeline view | Audit/View History | Scoped | Scoped | None (two-way anonymity) | Read participating | None (two-way anonymity) | Same as source record | Any | No for read |
| Audit log search/view | Audit/View History | If authorized | If authorized | None | None | None | Platform / unit scope | Any | No for read |
| Notifications | Manage templates | Read own; trigger by workflow | Read own | Read own | Read own | Read own | User-specific scope | Any | No for read |
| Dashboard view / Excel export | None | Scoped dashboard | GĐ, PGĐ-KH: authority dashboard; PGĐ-TD: aggregate⁷ | Own dashboard | Own dashboard | Own dashboard | Role and data scope | Any | Yes for export |
| Search/filter | Admin data only | Scoped | Scoped | Read own | Read participating | Read assigned | Role and data scope | Any | No for read |

A participant cannot simultaneously be the responsible officer, reviewer, council
member, tờ trình reviewer/approver or final signer on the same record. Reviewer and
final decision in the same round, and mutually exclusive council positions, are also
denied. Check on assignment creation/change, participant changes and again on
protected action execution. Reassignment atomically ends the prior officer, preserves
history/audit and prevents competing officers. Zero officers is a valid unassigned
state; unresolved officer context is a fail-closed error.

Validation must cover TP/TB in/out of scope, assigned/unassigned/revoked CV, CV with
participation only, PP read-only, PGĐ-TD aggregate-only, both orders of conflicting
assignments, concurrent reassignment, same-round decision conflict, tờ trình step
skipping and self-review, and identical filtering across list/detail/count/file/history.

## 9. Detailed Module Permission Matrix

Module tables use the same column groups as §8. Where a module row and §7 disagree,
§7 wins.

### 9.1 Identity, Roles, Organizations

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create/update user account | Manage | None | None | None | None | None | Platform scope | Yes | FR1, Story 1.3 |
| Activate/deactivate or lock account | Manage | None | None | None | None | None | Platform scope | Yes | FR1, Story 1.3 |
| Assign role (exactly one per account) | Manage | None | None | None | None | None | Platform scope | Yes | FR2, Story 1.3 |
| Assign organization/unit scope | Manage | None | None | None | None | None | Platform scope | Yes | FR3, FR6, Story 1.3 |
| Assign display-only unit title | Manage | None | None | None | None | None | Platform scope | Yes | Role hierarchy GĐ1 |
| Assign topic segments (mảng) to CV | None | TP | None | None | None | None | Unit scope | Yes | Role hierarchy GĐ1 |
| Load role-aware session context | Read own | Read own | Read own | Read own | Read own | Read own | Current user | No | FR4, FR5, FR6 |

### 9.2 Catalogs And Configuration

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View shared catalogs | Read | Read | Read | Read where needed | Read where needed | Read where needed | Role and data scope | No | FR7, Story 1.4 |
| Create/update/soft delete catalog item | Manage | None | None | None | None | None | Platform scope | Yes | FR7, Story 1.4 |
| Configure system parameters / notification templates | Manage | None | None | None | None | None | Platform scope | Yes | FR8, FR41-FR43, Story 1.4 |
| Manage scientific documents | Manage | TP, TB, CV: Manage | None | None | None | None | Role scope | Yes | §7.1 |
| Evaluate permission primitive | Read policy result | Read policy result | Read policy result | Read policy result | Read policy result | Read policy result | Role, scope, and state context | No | FR6, FR6a, NFR7, NFR8, Story 1.4 |

### 9.3 Proposal Intake And Submission

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create/update/open/close intake period | None | TP, CV | None | None | None | None | Unit scope | Draft, open intake | Yes | FR9, Story 2.1 |
| List open intake periods | None | Read | Read | Read applicable (not NNB) | None | None | Unit scope | Open intake | No | FR9, Story 2.1 |
| Create/update proposal draft | None | None from management role | None from management role | Own (any role except QT/NNB) | None | None | Own proposal scope | Open intake, draft | Yes | FR10, FR11, Story 2.2 |
| Upload proposal attachment | None | None | None | Create own | Secretary: Create; Member: None | None | Proposal relationship scope | Draft, needs supplement | Yes | FR12, FR36, Story 2.3 |
| View/download proposal attachment | None | TP/TB/PP¹, CV³ | GĐ/PGĐ-KH², PGĐ-TD¹ | Read own | Read if participating | Read assigned⁵ | Record-level scope | Any allowed state | Yes for important downloads | FR12, FR36, Story 2.3 |
| Check submission readiness | None | None | None | Read own | Read if participating | None | Own proposal scope | Draft | No | FR13, Story 2.3 |
| Submit proposal formally | None | None | None | Submit own | None | None | Own proposal scope; omit the submit section for non-PI viewers | Draft, open intake | Yes | FR14, FR22, Story 2.4 |
| Auto-assign responsible CV | System | TP: assign unmatched records | None | None | None | None | Segment match | Submitted, resubmitted | Yes | Role hierarchy GĐ1 |
| View submission history | None | Scoped | Scoped | Read own | Read if participating | None | Same as proposal scope | Submitted or later | No | FR14, FR38, Story 2.4 |

### 9.4 Proposal Review, Supplement And Approval

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review proposal completeness | None | TB¹, CV³ | None | Read own | Read if participating | None | Unit / assigned officer scope | Submitted, resubmitted | Yes | FR15, Story 3.1 |
| Request supplement | None | TB¹, CV³ | None | Read own request | Read if participating | None | Unit / assigned officer scope | Submitted, needs supplement | Yes | FR15, Story 3.1 |
| Respond to supplement request | None | Read | None | Update/Submit own | None | None | Own proposal scope | Needs supplement | Yes | FR16, Story 3.1 |
| Invite/assign/revoke reviewer or council member | None | TP¹, TB¹, CV³ with conflict check | Monitor progress¹ | None | None | Accept or decline (reason required) | Unit scope, assigned officer scope, conflict policy | Submitted, resubmitted, under review | Yes | FR17, FR67a, Story 3.2 |
| Access assigned review package | None | Only via own assignment | Only via own assignment | None | None | Title/role/deadline before acceptance; full package after acceptance | Reviewer assignment scope | Under review | No | FR18, Story 3.2 |
| Submit score/comment/recommendation | None | Only via own assignment⁵ | Only via own assignment⁵ | None | None | Review/Submit assigned | Reviewer assignment scope | Under review | Yes | FR18, Story 3.3 |
| Consolidate, finalize, submit evaluation result | None | TP¹, TB¹, CV³ without conflict | Monitor progress¹ | None | None | Council secretary⁶ | Unit scope | Under review, ready for approval | Yes | FR19, Story 3.4 |
| Route evaluation package / council tờ trình | None | CV drafts → TB → TP | None | None | None | None | Unit scope | Ready for approval | Yes | Role hierarchy GĐ2–GĐ3 |
| Sign evaluation council establishment | None | None | GĐ or PGĐ-KH | None | None | None | Unit scope, conflict policy | Tờ trình at BGĐ | Yes | Role hierarchy GĐ3 |
| Approve/reject topic and funding | None | None | GĐ only, with conflict check | Read result | Read result if participating | None | Unit scope, conflict policy | Ready for approval | Yes | FR21, FR22, FR67a, Story 3.5 |

Assignment and decision cells inherit the compatibility/multiplicity matrix and
reason codes in `docs/authorization-core-business-baseline.md#evaluation-position-compatibility-and-multiplicity`
(pending its 10-role sync). Single, bulk, import, direct-API and administrative writes
must re-evaluate that policy inside the owning mutation.

`submitted` and `resubmitted` require current completeness evidence before the first
assignment opens `under_review`. Invalid or unresolved context denies.

#### 9.4.1 Read-Scope Contract

This table is a contract, not a completion claim; see the
[Proposal Review & Approval plan](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md)
for implementation gaps.

| Rule | Decision | Where |
| --- | --- | --- |
| Reviewer read | Granted only by an accepted reviewer/council/IRB assignment on that one proposal while it is in the formal workflow; a revoked assignment stops granting immediately. Before acceptance only title, role, deadline and inviter are visible. | `canReadProposal`, `ProposalReviewAccessService` |
| Reviewer file read | Same assignment lookup as the proposal read. Upload still requires proposal ownership. | `FilesService.assertCanRead` |
| BGĐ read | GĐ/PGĐ-KH: submitted-or-later proposals in unit scope (note 2); PGĐ-TD: unit scope read-only, no per-record funding. | Shared proposal/evaluation/file authorization |
| Topic decision | `LEADERSHIP_APPROVAL_AUTHORITY` plus scope, routed record through TB and TP, ready state and no conflict. PGĐ-KH, QT and reviewers grant no topic decision. | Shared decision mutation |
| Management evaluation actions | TP/TB with unit scope; CV only on assigned records; completeness only TB/CV; no conflict. | Shared capability check |
| Decision/consolidation conflict | Participation and reviewer conflicts override role/scope; persisted evaluations keep the conflict after assignment revocation. | Shared conflict resolver |

Proposal detail UI renders review/approval sections only from the current proposal's
capability/assignment result: `ACTION_NOT_GRANTED` omits the section, conflict/state
denials remain visible and disabled with the backend reason. Supplement deadlines and
reviewer-assignment dates are whole Vietnam calendar days. The PI receives the
edit/submission workspace; management roles receive a read-only summary. Allowed
states per action are declared once in `apps/api/src/proposals-shared/proposal-workflow.ts`.
Researcher profile pages never host proposal workflow sections.

### 9.5 Approved Project Tracking

PI means active `TOPIC_PI`. CV means the current project officer; proposal-officer
access is not project authority. Every grant also requires active account, current
context, exact scope, workflow and conflict checks. Acceptance/council implementation
details remain in their governing stories.

| Action | PI | Assigned CV | TP / TB | PP | GĐ / PGĐ-KH | PGĐ-TD | State / invariant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create/confirm project | None | Current proposal officer creates; independently assigned project officer confirms setup | Assign project officer¹ separately | None | None | None | Approved immutable source; no automatic officer copy |
| Assign/reassign/revoke project officer | None | None | Scoped¹, conflict-free | None | None | None | One current officer; history preserved |
| View project/milestones/history | Own | Read in unit scope¹; operate only if assigned³ | All in Academy | Unit scope¹ | All in Academy | Unit scope¹ | Same filters for list/detail/count/files |
| Monitor deadlines | Own | Assigned³ | Scope | Scope¹ | Scope | Scope¹ | Overdue/report-due are derived flags, never workflow states |
| View per-project funding | Own⁴ | Assigned³ | All | Own participation only⁴ | All | Aggregate only | — |
| Manage funding, disbursement, settlement | None | Assigned³ | Academy-wide | None | GĐ only | None | Audited |
| Plan milestones/members during setup | Read | `project.setup.configure` for initial milestones/checkpoints/responsibilities; confirm | Read | Read | Read | Read | Confirm setup before execution |
| Update own milestone progress | Own | Read | Read | Read | Read | Read | Members (NCV/NNB) on milestones they own⁴ |
| Upload evidence | Own exact file grant | No PI-content overwrite | No PI-content overwrite | Metadata only | Metadata only | Metadata only | `project.evidence.contribute` for active member/secretary responsible for an open milestone; own unsubmitted file only; submitted links immutable |
| Create/edit/submit/resubmit progress report | Own | Read submitted | Read | Read | Read | Read | Submitted revisions/evidence locked; return permits a new revision |
| Review report / accept / request supplement | Read/respond | Review; accept or request supplement | Read | Read | Read | Read | No tờ trình needed; an accepted report does not accept the project or change the plan |
| Draft/submit Project Adjustment or Extension | Own | None | None | None | None | None | Extension end date must be later |
| Appraise adjustment/extension, draft tờ trình | None | Assigned³ | Read | Read | Read | Read | Applies no change by itself |
| Review tờ trình (TB step) / approve to BGĐ (TP step) | None | None | TB then TP¹; return to author with reason | None | None | None | No step skipping; no self-review |
| Sign extension / adjustment (no funding change) | Read result | Read result | Read result | Read | GĐ or PGĐ-KH, conflict-free | None | Signature atomically applies the change |
| Withdraw Project Adjustment / Extension (`project.adjustment.withdraw`, `project.extension.withdraw`) | Own request only, active PI requester, required reason | Denied | Denied | Denied | Denied | Denied | Project `executing`/`paused`; non-terminal request → terminal `withdrawn`; members denied |
| Acceptance council, products, liquidation draft, closing | Submit acceptance dossier/products | Prepare and draft | Route¹ | Read | Acceptance council: GĐ or PGĐ-KH; liquidation: GĐ only | Read | Via tờ trình flow |

All mutations above are audited. FR23–30b map to implementation Epic 6 stories
6.1–6.7 and 6.10; member contributions remain distinct from formal PI submission under
Story 6.4. Plan/membership changes after activation go only through a typed Project
Adjustment, never direct edits. Code state names from the former Golden Flow 4
(`under_staff_review`, `under_staff_validation`, `ready_for_head_decision`) must be
reconciled with the tờ trình routing implemented on `tuan/DocManS`.

### 9.6 Student Research (Đề tài sinh viên NCKH)

| Action | CV | NCV | Others | Scope Rule | Audit Required |
| --- | --- | --- | --- | --- | --- |
| Register topic as supervising lecturer | ✓ | ✓ | None | Own registration | Yes |
| Approve, manage, complete | ✓¹ | None | None | Unit scope | Yes |

### 9.7 Tasks

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create task (standalone or linked) | None | Create within scope | None | Create in own project scope | None unless delegated | None | Linked record scope | Yes | FR31, Story 5.1 |
| Assign task owner/collaborators | None | Assign within scope | None | Within own project if allowed | None unless delegated | None | Linked record scope, conflict policy | Yes | FR32, Story 5.1 |
| Update task status/progress/notes, attach evidence | None | Update scoped | Read | Update own/assigned | Update assigned | None unless task assigned | Task assignee/collaborator scope | Yes | FR33, FR36, Story 5.2 |
| View overdue/upcoming tasks | None | Read scoped | Read scoped | Read own/assigned | Read assigned | Read assigned if applicable | Role and data scope | No | FR34 |

### 9.8 Files

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Upload/replace important business file | None | Scoped where workflow allows | None | Own allowed files | Assigned allowed files | Assigned review file if workflow allows | Record-level scope | Yes | FR36, FR37 |
| View metadata / download | None | Scoped | Scoped (PGĐ-TD: no funding detail) | Own | Participating | Assigned | Record-level scope | Yes for downloads | FR36, FR37 |
| Soft delete file | None | Scoped if policy allows | None | Own allowed files | None unless delegated | None | Record-level scope | Yes | FR36, FR37 |

### 9.9 Audit Logs And Workflow History

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View record action log / workflow history | Audit/View History | Scoped | Scoped | None (two-way anonymity) | Read participating | None (two-way anonymity) | Same as source record | No | FR38, FR40 |
| View tờ trình step history | None | Scoped | Scoped | Read own record | Read participating | None | Same as source record | No | Role hierarchy GĐ2–GĐ3 |
| Search/export audit logs | Audit/Export | If authorized | If authorized | None | None | None | Platform / unit scope | Yes or operational trace | FR39, FR40 |
| Create audit record from domain action | System generated | System generated | System generated | System generated | System generated | System generated | Same as source action | Yes | Audit-Log Requirements |

### 9.10 Notifications, Reminders And Work Queues

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Receive in-app/email notification | Read own | Read own (incl. next tờ trình step) | Read own (tờ trình awaiting signature) | Read own | Read own | Read own (invitations) | Recipient permission scope | FR41, FR42 |
| Configure templates / reminder jobs | Manage | None | None | None | None | None | Platform scope | FR41-FR43 |
| View work queue | None | TB: review queue; TP: approval queue; CV: assigned records | Awaiting approval/signature | Own | Own/assigned | Assigned review queue | Role, scope, assignment | FR44 |

### 9.11 Dashboard, Search, Reports And Export

| Action | QT | Phòng KHQS | BGĐ | PI | Topic Team | Reviewer / Council | Scope Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View business dashboard | None | Scoped; nature (Quân sự/Dân sự) and responsible-CV breakdown | GĐ/PGĐ-KH: scoped; PGĐ-TD: aggregate only⁷ | Own | Own | Own | Role and data scope | No | FR45, Story 7.2 |
| Drill down / search / filter | Admin data only | Scoped | Scoped | Own | Participating | Assigned | Same as target record scope | No | FR46, FR47 |
| View report | None | Scoped | Scoped (PGĐ-TD: aggregate funding only) | Own if report supports it | Own if report supports it | Assigned if report supports it | Role and data scope | No | FR49, Story 7.3 |
| Export Excel/PDF | None | Scoped | Scoped (PGĐ-TD: no per-record funding) | Own if allowed | Own if allowed | Assigned if allowed | Role and data scope | Yes | FR48, Story 7.3 |

## 10. Critical Negative Rules

- Frontend-only authorization is not sufficient; the backend enforces every protected action.
- One account holds exactly one system role; record relationships never create a system role.
- QT never receives business-record access, a scientific CV, a business dashboard or a reviewer assignment.
- `EXTERNAL_RESEARCHER_USER` is never PI, never sees intake periods and never creates proposals.
- PP and PGĐ-TD never approve, sign or route; PGĐ-TD never sees per-record funding.
- PGĐ-KH never approves topics, funding or liquidation.
- TP never performs completeness checks or supplement requests.
- CV never operates on proposals/projects assigned to another CV.
- No tờ trình skips a step; TB/TP never review a tờ trình they authored.
- PI and reviewers never see the record's action log.
- Users must not see cross-unit proposal data unless explicitly permitted.
- Reviewers, council and IRB members must not access unassigned records.
- Officer, reviewer, council or IRB assignment is denied when the candidate is PI,
  participant, `TOPIC_SECRETARY` or another excluded role on the same record.
- A PI, member or reviewer never uses management authority (assignment, completeness,
  synthesis, decision, funding) on the same record.
- The PI must not edit submitted proposals unless the workflow allows supplement or resubmission.
- File access must not be granted by object key alone.
- Direct status mutation is forbidden; transitions go through explicit domain actions.
- Sensitive actions fail closed when role, scope, relationship, assignment, conflict
  or state context cannot be resolved safely.
- Search results, dashboard totals, export files, notifications, audit views and file
  metadata must not leak unauthorized records.

## 11. Audit Requirements By Action

| Action | Audit Required | Minimum Context |
| --- | --- | --- |
| login / logout | Yes | actor, username, timestamp, result, request/session context |
| create/update/deactivate user | Yes | actor, target user, action, before/after status where feasible |
| assign role/scope/unit title | Yes | actor, target user, role, scope, title, timestamp |
| assign CV segment | Yes | actor, CV, segment (level/nature), timestamp |
| create/update/open/close intake period | Yes | actor, intake period id/code, from/to status, timestamp |
| create/update proposal draft | Yes | actor, proposal id, changed section or safe summary, timestamp |
| upload/download/replace important file | Yes | actor, file id, target entity, action, timestamp, safe metadata |
| submit / resubmit proposal | Yes | actor, proposal id, from/to status, timestamp |
| request supplement | Yes | actor, proposal id, reason, due date, timestamp |
| assign/reassign/revoke responsible CV (manual or automatic) | Yes | actor or system, record, old/new officer, segment match, timestamp, reason |
| invite/accept/decline/revoke reviewer, council or IRB member | Yes | actor, record, member, role, decision, reason, timestamp |
| submit score/comment | Yes | actor, proposal id, review id, submitted status, timestamp |
| consolidate evaluation | Yes | actor, proposal id, evaluation summary id, timestamp |
| tờ trình submit/forward/return/approve/sign | Yes | actor, tờ trình id, procedure type, step, decision, reason, timestamp |
| approve/reject topic and funding | Yes | actor, target record, decision, from/to status, timestamp, note |
| create approved project / milestone change | Yes | actor, project id, milestone id, before/after state where feasible |
| submit progress report | Yes | actor, project id, report id, reporting period, timestamp |
| create/withdraw adjustment/extension request | Yes | actor, project id, request id, request type, reason, timestamp |
| sign adjustment/extension | Yes | actor, project id, request id, decision, timestamp |
| funding disbursement/settlement, liquidation | Yes | actor, project id, amount/document, decision, timestamp |
| create/assign task, update task status | Yes | actor, task id, assignees, linked record, from/to status, timestamp |
| export report | Yes | actor, report type, filters, scope, export format, timestamp |

## 12. Implementation Notes

- This file is the source of truth for permission implementation; §7 wins on conflict.
- The ten system role codes are those in §2 (`packages/permissions/src/system-roles.js`
  on `tuan/DocManS`). The `DocManS` branch still ships the former seven roles until
  that work is merged.
- Backend policies combine system role, unit scope, record relationship, assignment,
  workflow state, tờ trình step, and conflict policy.
- Participation roles (`PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_MEMBER`, `TOPIC_SECRETARY`,
  reviewer, council member/secretary, IRB member/secretary, responsible officer) are
  stored on the relevant relationship or assignment record, never inferred from the
  account role.
- Participation must be resolvable from the record to a user account; text-only
  entries cannot be used to evaluate conflict policy.
- The effective record relationship of the current user is returned with the record;
  the UI must not derive it from the system role.
- When conflict policy denies an action, the denial reason is available to the UI.
- UI button visibility is a UX hint only; backend checks are authoritative.
- API tests and manual QA include allowed and denied cases for every protected
  capability, and cross-scope leakage tests for aggregates, search, export,
  notifications and file metadata.
- Legacy roles removed: ADM, LD, VT, TBP, CB, HD, BC, and the former
  `SCIENTIFIC_MANAGEMENT_HEAD` / `SCIENTIFIC_MANAGEMENT_STAFF` codes.

## User Account assignment contract

Reviewer, council and IRB assignment (`proposal.review.assign`, including revocation)
follows these rules; the baseline contract section is pending its 10-role sync.

| Operation | Required checks | Evidence / disclosure |
| --- | --- | --- |
| Search eligible accounts | TP¹/TB¹ or assigned CV³; assignable state; current completeness evidence; active candidate; evaluation reviewers/council members and IRB members from any account with a scientific CV (never QT); no PI/team conflict or live duplicate | Account ID, display name, username, display-only unit title |
| Invite either duty | Recheck eligibility, proposal context, effective dates/deadline | Atomic invitation and audit |
| Accept / decline | Invitee only; decline requires reason; council tờ trình can be routed only when every member has accepted | Before acceptance only title, role, deadline and inviter |
| Read package/files or submit own review | Accepted assignment, no participation conflict, applicable state and disclosure; may cross unit boundaries | Own assignment and review only |
| Revoke either duty | TP¹/TB¹ or assigned CV³, no actor conflict, assignable state, nonblank reason | Retain history and submitted reviews; immediately end access |

Council members who accepted can read the dossier only after BGĐ signs the council
establishment decision.

## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](contracts/researcher-profile-access.md)
remains the source for API/data fields, credential delivery, migration compatibility
and history retention; its role list is pending 10-role sync.

- QT (platform) and TP¹/CV¹ (unit scope) manage internal/external profiles
  independently of Accounts. Profile activation and account activation remain
  separate actions.
- Every role except QT has a scientific CV and self-updates it through My Profile.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when the manager checks `Tạo tài khoản truy cập hệ thống`.
- Activation uses hashed single-use tokens, expires exactly after 48 hours and sends
  only a setup-password link. No temporary password is generated, emailed, persisted,
  returned to staff or placed in audit.
- Login accepts either configured username or account email. Username is optional at
  provisioning, unique when set later by the linked user, and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.

### Researcher profile action matrix

| Action | QT / TP¹ / CV¹ | Linked active account (any role except QT) | Other account |
| --- | --- | --- | --- |
| Directory/create/read/update/status | Exact granted scope | No directory; own profile through My Profile | Deny |
| Publication/participation edits | Exact granted scope | Own profile only | Deny |
| Account create/link/unlink/resend activation | Scoped, matching researcher account; email/context/reason as required | Deny | Deny |
| Own username update | Deny unless through explicit support flow | Own active linked account only | Deny |
| Own profile read/update | — | Current active linked profile; personal allowlist | Deny |
| History | Scope-filtered profile history | Own scientific/profile changes only | Deny |
| Normal features before mandatory change | Deny | Deny | Deny |

These profile permissions do not widen any business-record permission in this matrix.

### Implementation scope

On `DocManS` the model is implemented on the existing proposal, intake,
researcher-profile, file and evaluation features. Approved projects, council/IRB
lifecycles, institutional dashboards, general search/report/export and
notification/My Work backends remain planned where no operational source exists
(tờ trình routing, council invitations and dashboard breakdowns exist on
`tuan/DocManS`). `PROJECT_MANAGEMENT_OFFICER` is a contract relationship, not a
persisted orphan assignment.
Dashboard showcase data is not an institutional report or proof of authorization.
Future source domains must apply the same scope, relationship, conflict and disclosure
checks before aggregates or drill-down. Dashboard filters include year, unit, level,
field and nature (Quân sự / Dân sự / Chưa phân loại) with a responsible-CV breakdown
and an "unassigned" group. Only GĐ gets topic/funding decision queues; GĐ and PGĐ-KH
get signature queues; TB gets the tờ trình review queue and TP the approval queue.
Proposal funding currently provides `budgetMetadata.amount` (requested funding); never
infer expenditure or add ledgers, payments, banking, invoices or ERP integration.
