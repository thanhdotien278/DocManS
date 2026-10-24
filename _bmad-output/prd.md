---
stepsCompleted:
  - "step-01-init"
  - "step-02-discovery"
  - "step-02b-vision"
  - "step-02c-executive-summary"
  - "step-03-success"
  - "step-04-journeys"
  - "step-05-domain"
  - "step-06-innovation"
  - "step-07-project-type"
  - "step-08-scoping"
  - "step-09-functional"
  - "step-10-nonfunctional"
  - "step-11-polish"
  - "step-12-complete"
inputDocuments:
  - "/Users/Super/DocManS/_bmad-output/planning-artifacts/product-brief-DocManSystem.md"
  - "/Users/Super/DocManS/docs/ux-design-guidelines.md"
  - "/Users/Super/DocManS/_bmad-output/project-context.md"
  - "/Users/Super/DocManS/_bmad-output/detaiHVQY.md"
  - "/Users/Super/DocManS/docs/permission-matrix.md"
workflowType: "prd"
status: "final"
documentCounts:
  productBriefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 2
outputFile: "/Users/Super/DocManS/_bmad-output/prd.md"
created: "2026-04-27T22:31:49+0700"
updated: "2026-10-18T00:00:00+0700"
releaseMode: "single-release"
classification:
  projectType: "web_app"
  domain: "edtech + scientific administration"
  complexity: "high"
  projectContext: "greenfield"
---

# Product Requirements Document - DocManSystem

**Author:** ThanhDaika
**Created:** 2026-04-27
**Updated:** 2026-10-18 (10-role authorization model, Sprint Change Proposal 2026-10-18)

## Executive Summary

DocManSystem, also referred to as RTMS, is a greenfield internal web application for the Military Medical Academy to manage the full lifecycle of university-level research topics and scientific project workflows. The product replaces fragmented handling through spreadsheets, email, disconnected files, and manual coordination with a single role-aware system that supports proposal intake, evaluation, approval, approved-project tracking, task execution, notifications, reminders, and executive reporting. The core business goal is not superficial digitization; it is to make workflow state, accountability, deadlines, and decision bottlenecks visible and controllable across the academy’s scientific management process.

Phase 1 targets exactly ten account-level system roles (see the Authorization
Glossary and `docs/permission-matrix.md` §2): QT `SYSTEM_ADMIN`, GĐ
`LEADERSHIP_APPROVAL_AUTHORITY`, PGĐ-KH `SCIENCE_DEPUTY_DIRECTOR`, PGĐ-TD
`RESEARCH_OVERSIGHT_AUTHORITY`, TP `RESEARCH_MANAGEMENT_HEAD`, PP
`RESEARCH_MANAGEMENT_DEPUTY_HEAD`, TB `RESEARCH_BOARD_HEAD`, CV
`RESEARCH_MANAGEMENT_STAFF`, NCV `RESEARCHER_INTERNAL_USER` and NNB
`EXTERNAL_RESEARCHER_USER`—plus record-scoped relationships and assignments. A
proposal has one owner-derived `PROPOSAL_PI`; active proposal/topic team rows use only
`TOPIC_SECRETARY` and `TOPIC_MEMBER`; an approved topic owner uses `TOPIC_PI`.
Reviewer, council and IRB duties remain assignments. Every BGĐ-bound procedure passes
through a mandatory tờ trình routing (CV → TB → TP → BGĐ); GĐ alone approves topics
with their funding and liquidation, while GĐ or PGĐ-KH sign councils, IRB, acceptance,
extension and adjustment. Each submitted record gets one responsible CV, auto-assigned
by segment (mảng).
The product must preserve complex internal workflows rather than flatten them. It
must support controlled state transitions, organization-scoped data access,
role-based and state-based permissions, mandatory audit logging for critical actions,
file traceability, and dashboard views filtered by the current user’s authority. The
first release scope must cover the seven work items listed in `detaiHVQY.md` section
2.1 through 2.7: OMS proposal management, approved-project tracking, seminar and
student research tracking, task management, executive dashboard, related-document
management, and council/ethics management.

This PRD assumes a modular-monolith phase 1 architecture and a strict implementation boundary: no microservices, no external identity integration in phase 1, no workflow engine, no deep financial subsystem, and no public submission portal. The expected operational outcome is a measurable reduction in incomplete proposal records, a strong increase in overdue visibility, faster reporting preparation, and a more auditable and disciplined research administration process.

### What Makes This Special

RTMS is differentiated by deep fit with institutional research administration rather than generic project management. Its value comes from encoding the actual business workflow of academic research topic intake, multi-role evaluation, approval, progress monitoring, adjustment handling, acceptance, and reporting in a way that exposes current state, next action, responsible actor, and audit history. Users should experience the system as an operational control surface for research management, not just a repository of forms and files.

The core insight is that the academy’s main pain is not lack of data entry tools but lack of controlled workflow visibility and decision support. RTMS therefore treats authorization, state machines, reminders, dashboards, and audit logs as first-class product requirements, not secondary technical concerns. This makes the product materially better than ad hoc combinations of office tools or generic admin dashboards that cannot enforce business rules or expose accountability clearly.

## Project Classification

- **Project Type:** Internal web application
- **Domain:** Education-adjacent scientific research administration
- **Complexity:** High, due to multi-role workflows, approval states, scoped authorization, traceable files, notifications, and executive reporting
- **Project Context:** Greenfield

## Phòng KHQS and BGĐ boundary — 2026-10-18

This section replaces the "Scientific Management implementation boundary — 2026-09-21".

- **Role rename / migration note.** The former 7-role codes `SCIENTIFIC_MANAGEMENT_HEAD`
  and `SCIENTIFIC_MANAGEMENT_STAFF` are renamed to `RESEARCH_MANAGEMENT_HEAD` (TP) and
  `RESEARCH_MANAGEMENT_STAFF` (CV). Former `RESEARCH_OVERSIGHT_AUTHORITY` holders are
  re-classified per person as PGĐ-KH (`SCIENCE_DEPUTY_DIRECTOR`) or PGĐ-TD
  (`RESEARCH_OVERSIGHT_AUTHORITY`, monitoring only); PP, TB and PGĐ-TD accounts are
  created fresh, and TB has exactly one holder. Legacy codes must not be used in new work.
- TP¹/TB¹ assign or revoke the responsible CV. The system auto-assigns a CV on
  submit/resubmit by segment (level + nature); unmatched records show "Chưa có người phụ
  trách" for TP.
- Package submission is replaced by approval routing (tờ trình): CV drafts → TB review
  → TP approval → BGĐ signer per procedure; return goes to the author with a mandatory
  reason; no step skipping and no self-review; TB-authored submissions start at the TP step.
- Adjustment (with or without funding change) and extension: the assigned CV appraises →
  routing → GĐ or PGĐ-KH signs; the signature applies the change atomically.
- Project view is Academy-wide for GĐ, PGĐ-KH, TP and TB; proposals remain unit-scoped.
- PP and PGĐ-TD only monitor; PGĐ-TD sees aggregate funding only.

**Code status.** The code on the `DocManS` branch has all ten role codes (commit 0a39db3;
migration `20261016500000` renames HEAD → TP and STAFF → CV), but PGĐ-KH, PP and TB have no
business permissions there yet, and approval routing, segment assignment and IRB signing
exist only on `tuan/DocManS`. That branch has no merge base
with `DocManS`; this PRD describes the target until `tuan/DocManS` is merged or ported.

## Authorization Glossary

- **System role:** The account-level role that controls module/navigation
  access; an account has exactly one active value. Phase 1 has ten values
  (`docs/permission-matrix.md` §2):

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

  QT has no business-data access, no scientific CV and no business dashboard. GĐ alone
  approves topics with their funding and liquidation. PGĐ-KH signs councils, IRB,
  acceptance, extension and adjustment but never approves topics, topic funding or
  liquidation. PGĐ-TD and PP only monitor; PGĐ-TD sees aggregate funding only. TP
  approves every tờ trình before BGĐ, assigns segments and responsible CVs, and never
  performs completeness checks or supplement requests. TB reviews CV-authored tờ trình
  and assigns responsible CVs. CV acts only on records it currently holds as responsible
  officer. Workflow, conflict and disclosure checks always apply.
- **Scope superscripts:** ¹ = only within the user's unit scope; ² = proposals already in
  workflow (submitted or later) within unit scope; ³ = only records to which the CV is
  currently assigned as responsible officer; ⁴ = own participation (PI or member);
  ⁵ = only when assigned as reviewer, council or IRB member; ⁶ = council secretary of
  that record; ⁷ = aggregate figures only (matrix §7.2).
- **BGĐ (Ban giám đốc):** GĐ, PGĐ-KH and PGĐ-TD. "BGĐ signer" means the signer the
  procedure requires (matrix §7.4).
- **Tờ trình (approval routing):** The submission dossier for every BGĐ-bound procedure:
  CV drafts → TB reviews → TP approves → BGĐ signs. A return at any step goes back to
  the author with a mandatory reason; no step is skipped and no one reviews a tờ trình
  they authored.
- **Mảng (segment):** A level + nature (Quân sự / Dân sự) combination that TP assigns to
  a CV and that drives auto-assignment of the responsible CV.
- **Responsible CV:** The single current `PROPOSAL_MANAGEMENT_OFFICER` /
  `PROJECT_MANAGEMENT_OFFICER` of a record; zero is a valid "Chưa có người phụ trách" state.
- **IRB:** The ethics council and its certificate; establishment and
  certificate are signed by GĐ or PGĐ-KH.
- **Two-way anonymity:** PI and reviewers never see the record's action log; only TB¹
  and TP¹ may see reviewer identity.
- **Record participation role:** A relationship to one proposal or approved
  topic. `PROPOSAL_PI`/`TOPIC_PI` is owner-derived; team rows use only
  `TOPIC_SECRETARY` and `TOPIC_MEMBER`. Reviewer, council, ethics, and task
  duties are separate assignments.
- **External researcher user:** An account whose researcher profile is managed by QT
  (platform) or TP¹/CV¹ (unit scope). It may work only on explicitly
  assigned approved-topic/task contributions or reviews and can never create,
  edit, or formally submit a proposal, change its PI/member/budget/objective/status, assign, or
  make a final decision.
- **Assignment role:** A scoped responsibility for one review, council,
  ethics dossier, or task, such as reviewer, council member, ethics reviewer,
  or task assignee.
- **Council membership:** A relationship to one council with a council role
  such as chair, secretary, member, or reviewer.
- **Delegation grant:** An explicit, revocable, time-bounded grant permitting
  listed actions on one record; it does not change the delegate's system role
  or bypass conflict policy.
- **Conflict policy:** Separation-of-duty rules that can deny an assignment or
  action because of the actor's relationships to the same record.
- **Effective permission:** The backend result produced from system role,
  organization scope, record participation roles, assignment scope, valid
  delegations, workflow state, and conflict policy.
- **Capability response:** Backend-derived record relationships, allowed
  actions, blocked actions, stable denial codes, and plain-language denial
  reasons returned for authorized UI rendering.

## Authorization Source Of Truth

`docs/permission-matrix.md` governs role, scope, workflow, disclosure, and
audit requirements in this PRD; its §7 (system-role matrix, general rules and tờ
trình procedures) wins whenever a PRD section, architecture, story, the
`docs/authorization-core-business-baseline.md` or another matrix cell conflicts with
it. The baseline remains the reference for evaluation-position compatibility and
multiplicity where it does not conflict with §7. Backend authorization is authoritative and is applied before every
business-record detail, list, search, count, facet, dashboard, export,
notification, file-metadata, and file-content disclosure.

## Topic Lifecycle (D-033)

A topic follows a fixed 9-step lifecycle in 2 phases (`.decision-log.md` D-033):

- **Giai đoạn đề xuất:** 1. Đợt tiếp nhận → 2. Hồ sơ đề xuất → 3. Kiểm tra đầy đủ →
  4. Thẩm định, hội đồng → 5. Phê duyệt, kinh phí.
- **Giai đoạn thực hiện và kết thúc:** 6. Lập đề tài → 7. Thực hiện (tiến độ, báo
  cáo, giải ngân) → 8. Nghiệm thu (sản phẩm, cơ sở, cấp trên) → 9. Thanh lý, đóng đề tài.

From step 3 a supplement request returns the dossier to step 2 and the PI's
resubmission re-enters step 3. Steps 5 (GĐ approves topic + funding) and 9 (GĐ
signs liquidation and the topic closes) are the only two official decisions.
Every step keeps history and audit. UI, dashboards and reports that show the
lifecycle use these 9 steps and phase names. The state-to-step mapping is in
`architecture.md` → "Topic Lifecycle Step Mapping (D-033)".

## Success Criteria

### User Success

- TP or CV can open an intake period; the responsible CV (auto-assigned by segment) checks completeness, requests supplements and monitors reviews; TP¹/TB¹/CV³ assign reviewers and synthesize results; the result is routed through the tờ trình flow (CV → TB → TP → BGĐ) without relying on external spreadsheets or ad hoc trackers.
- GĐ and PGĐ-KH can immediately see items awaiting their decision or signature, overdue work, delayed projects, and unit-level summary metrics from role-scoped dashboard views; PP and PGĐ-TD can monitor progress and counts (PGĐ-TD with aggregate funding only).
- Principal investigators can submit proposals, understand current status, respond to supplement requests, track approved project milestones, and submit periodic reports without needing manual email follow-up to know what happens next.
- Reviewers and committee members can access only assigned proposals, submit scores and review comments, and complete evaluation work within a controlled and traceable workflow.
- Phòng KHQS (TP/TB/CV within their scope; student research by CV¹ per matrix §9.6) can manage approved seminars, student research activities, related governing documents, council plans, and IRB dossiers without keeping parallel spreadsheets outside the system.
- QT, TP¹ and CV¹ can maintain researcher profiles and reuse them across proposals, projects, seminars, councils, reviews, and reports instead of repeatedly entering scientist information.
- Users experience clear confirmation, error handling, and next-step guidance on important actions such as submit, approve, reject, request supplement, upload files, and update progress.

### Business Success

- Reduce proposal returns caused by missing required documents or incorrect submission packages, with the improvement target to be baselined during pilot/UAT because no reliable pre-system baseline is currently available.
- Ensure 100 percent visibility of waiting approvals, overdue tasks, overdue reports, and delayed projects in role-appropriate dashboard views.
- Improve Phòng KHQS reporting preparation time for routine executive summaries, with the target to be baselined during pilot/UAT.
- Improve on-time completion for tracked tasks and scheduled reports, with the target to be baselined during pilot/UAT.
- Ensure 100 percent of critical business actions defined in this PRD are traceable through audit logs and linked workflow history.

### Technical Success

- Enforce role-based, data-scope, and state-based authorization in all protected backend flows.
- Guarantee controlled status transitions for proposal intake, proposal review, approvals, approved-project progress, adjustment requests, acceptance, and relevant task states.
- Store important files with permission-controlled access and traceable metadata.
- Deliver notification and reminder workflows through reliable backend-driven rules rather than frontend-only cues.
- Preserve modular-monolith maintainability with clean domain boundaries, Prisma migrations for schema changes, and testable services.

### Measurable Outcomes

- Proposal submissions in phase 1 show measurable improvement in completeness after required validation, with the final target to be baselined during pilot/UAT.
- At least 95 percent of reminders for overdue or upcoming due items are generated and delivered according to configured business rules during verification and early rollout.
- All dashboard metrics must reflect current-user authorization scope with no unauthorized cross-unit leakage in QA verification.
- All critical workflow actions listed in the audit-log section of this PRD must be verifiable in testing or controlled UAT scenarios.

## Product Scope

### MVP - Minimum Viable Product

- Research proposal intake and approval workflow, including intake periods, draft proposals, submission, completeness checks, supplement requests, resubmission, reviewer assignment, scoring, review comments, summary, approval, and rejection.
- Approved project tracking workflow, including project initiation from approved proposals, milestones, progress reporting, delay visibility, adjustment requests, extensions, acceptance, and final review handling.
- Seminar and student research tracking workflow, including approved activity records, plans, related documents, adjustments, budget metadata, and research products.
- Task management linked to business records or standalone administrative work, including assignment, due dates, priorities, reminders, progress tracking, and overdue alerts.
- Role-based dashboard and reporting for Phòng KHQS (TP, PP, TB, CV) and BGĐ (GĐ, PGĐ-KH, PGĐ-TD), including waiting items, risk indicators, delayed work, and summary metrics by unit, field, status, and reporting cycle.
- Related-document management for governing, legal, planning, proposal, project, seminar, and council documents with metadata, version context, effective status, and permission-checked access.
- Council and ethics (IRB) management, including council plans, member roles, ethics dossier submission, completeness review, scoring, consolidation, and tờ trình approval routing to the BGĐ signer.
- Approval routing (tờ trình) CV → TB → TP → BGĐ for every BGĐ-bound procedure, segment-based auto-assignment of the responsible CV, and funding recorded as audited metadata.
- Researcher profile management, including scientist identity, academic information, unit, expertise, account linkage, participation links, search, history, and auditability.
- Role-based and scope-based authorization, audit logs, file management, in-app notifications, email notifications for important events, and export capabilities for core Excel/PDF reporting needs.

### Growth Features (Post-MVP)

- Richer analytics and longitudinal performance reporting across units, research areas, and academic periods.
- More advanced administrative configurability for templates, scoring criteria, notification rules, and reporting packs.
- Broader participation support for topic team members beyond the minimal phase 1 responsibilities.
- Improved convenience features such as richer previews, bulk operations, and more refined reviewer workload balancing.

### Vision (Future)

- Institution-wide research operations platform extending beyond the first managing unit.
- Deeper integration with identity, digital approval, and additional internal systems when later approved.
- Proactive risk detection and more advanced decision-support capabilities for research governance.

## User Journeys

### TP, TB and PP oversight within the Phòng KHQS workspace

TP opens the unit-scoped proposal portfolio and the Academy-wide project portfolio,
checks the "Chưa có người phụ trách" records left unmatched by segment auto-assignment,
assigns or reassigns the responsible CV, filters/groups by responsible CV and monitors
workload, status and deadlines. TP works the tờ trình approval queue and forwards
approved submissions to the BGĐ signer. TB works the tờ trình review queue, forwards
CV-authored submissions to TP or returns them to the author with a reason, and may also
assign responsible CVs. PP monitors progress and counts within unit scope only, with no
routing step and no approval, even when TP is absent. Drill-down and reports retain the
same scope and disclosure. CV sees only assigned management work plus separately
authorized participation/review work, with no administrative permissions from that
participation.

### UJ-1: CV Runs A Proposal Intake Cycle

Lan is a CV (`RESEARCH_MANAGEMENT_STAFF`). She may create and open intake periods, and she manages only proposals where she is the current `PROPOSAL_MANAGEMENT_OFFICER`, normally because the system auto-assigned her by segment when the proposal was submitted. She is preparing a new intake period for school-level research proposals. Today she coordinates the process through spreadsheets, email threads, and paper-based follow-up, which makes it hard to know which proposals are complete, who still owes feedback, and which approvals are stuck.

In RTMS, she creates an intake period, configures required documents, opens the submission window, and monitors incoming proposals from a single operational view. As submissions arrive, the system assigns each one to the CV whose segment matches; on her assigned proposals she checks completeness, requests supplements where needed, confirms current-version readiness, invites reviewers or council members by field, monitors review progress and synthesizes the results. She then drafts the tờ trình, which goes to TB for review, then to TP for approval, and finally to GĐ for the topic and funding decision; a return at any step comes back to her with a reason. The climax of her journey is not proposal creation; it is operational control. She can see which records are waiting, which are overdue, and which actor owns the next step.

If something goes wrong, such as an incomplete resubmission or a late reviewer, Lan needs visible recovery tools: supplement history, due-date reminders, review status tracking, and clear escalation paths. The journey succeeds when she can run the whole intake cycle without maintaining shadow trackers outside the system.

### UJ-2: Principal Investigator Submits A Proposal And Recovers From A Supplement Request

Dr. Minh is a principal investigator submitting a new research proposal. His current pain is not only document preparation but uncertainty after submission. He often does not know whether the package is complete, what has been reviewed, or how to respond when changes are requested.

In RTMS, he creates a draft proposal, fills structured sections, uploads required files, saves progress, and submits formally. After submission, he receives a supplement request with a clear explanation of missing or incorrect content, a due date, and traceable status history. He revises the proposal, uploads updated files, and resubmits without losing prior context.

The turning point is that the system makes the workflow legible. Instead of asking staff for updates, he can see current status, required next action, and key dates. The journey succeeds when proposal submission and correction are controlled, transparent, and bounded by clear validation and status rules.

### UJ-3: Reviewer Or Committee Member Completes An Evaluation

Dr. Hoa is assigned as a reviewer for proposals relevant to her expertise. In the current process, assignments and materials may arrive through scattered channels, and review progress is hard to track centrally.

In RTMS, she receives an assignment notification, accesses only the proposals assigned to her, reviews the submission package, enters scores and review comments against defined criteria, and completes her evaluation within a controlled deadline. She must be able to distinguish draft evaluation work from submitted evaluation results and must not see unrelated proposals or reviews beyond her authorization scope.

She may hold any system role except QT; she accepts or declines the invitation (declining needs a reason) before the full package opens to her, and she never sees the record's action log. The journey succeeds when review work is confidential, scoped, timely, and traceable, and when the responsible CV, TB and TP can immediately see completion status without manual chasing.

### UJ-4: GĐ And PGĐ-KH Review Pending Decisions And Use The Dashboard To Act

Colonel An is the GĐ; he does not need operational detail first; he needs an accurate picture of what requires his decision or signature. In the current process, this view comes late and often only after manual summary preparation.

In RTMS, he opens a role-based dashboard and immediately sees tờ trình awaiting his decision or signature, overdue tasks, delayed projects, upcoming reports, and summary indicators by unit, field and nature. From those signals, he can drill into filtered lists, inspect the relevant proposal or project history and the tờ trình step history, review supporting documents, and approve or reject topics with their funding and liquidations, which only GĐ may do, or sign councils, IRB, acceptance, extensions and adjustments.

The PGĐ-KH works the same way but only signs council establishment (evaluation, IRB, acceptance), the IRB certificate, extensions and adjustments; topic, funding and liquidation decisions are never offered to the PGĐ-KH. The PGĐ-TD only monitors progress, counts and aggregate funding and signs nothing.

The critical moment is when dashboard information supports action instead of decoration. The journey succeeds when GĐ and PGĐ-KH can move directly from signal to decision or signature with confidence that the underlying data reflects current authorization scope and real workflow state.

### UJ-5: System Administrator Investigates Access, Audit, And Configuration Issues

Huy is a system administrator responsible for accounts, roles, shared catalogs, and operational traceability. He is not the main business operator, but he is essential when access rules fail, a record appears inconsistent, or a team needs new configuration.

In RTMS, he manages user accounts, role assignments, organizational mappings, shared catalogs, notification settings, and system parameters. When an incident occurs, such as a user reporting missing access or a dispute over who approved a record, he uses audit logs and system history to investigate safely without altering business content improperly.

This journey succeeds when administration is controlled, traceable, and separated from business authority, allowing support and investigation without weakening security or accountability.

### UJ-6: CV Tracks Seminars, Student Research, Documents, And Councils

Mai is a CV responsible for records that are adjacent to proposal and project management: approved seminars, student research activities, related legal or governing documents, council plans, and ethics dossiers. In the current process, these records may be tracked separately from proposals and projects, which weakens reporting and makes it difficult to know which plan, decision, document, or council action is current.

In RTMS, she creates or imports approved seminar records, approves and manages student research topics registered by supervising lecturers (CV or NCV) in her unit scope, maintains plans and related documents, records adjustments, tracks budget metadata and products, registers official documents with effective status, links documents to the relevant business records, prepares council plans, receives IRB dossiers, invites council and IRB members, consolidates scores, and drafts the tờ trình that TB and TP forward to GĐ or PGĐ-KH for signature. Seminar permissions are not covered by the permission matrix and are unchanged here (open question). The journey succeeds when these adjacent research administration records are traceable, permission-controlled, and visible in the same operational reporting surface as proposals, projects, and tasks.

### UJ-7: A Researcher Works As Topic Secretary Without Receiving Decision Authority

Dr. Binh is `TOPIC_SECRETARY` for one approved topic and the secretary
of a different council. These are record-scoped assignments, not global system
roles. On the topic, Binh can update the administrative information delegated
to the secretary, prepare meeting schedules and minutes, upload authorized
documents, maintain assigned tasks, and draft progress or meeting summaries. On
the council, Binh can prepare the agenda, member-material checklist, meeting
minutes, and draft consolidated record.

The system always states which secretary relationship applies to the current
record. Binh cannot use a secretary assignment from one record to access
another record and cannot score, approve, reject, or issue the final decision
for a record merely because Binh is its secretary. If a requested action in a
domain with an applicable delegation contract depends on delegation, the
backend verifies the action, record, validity period, workflow state, and
conflict policy before allowing it. Proposal creation, submission, and
resubmission never use delegation. The
journey succeeds when secretarial work is operationally useful but never
silently expands into reviewer or decision authority.

### Journey Requirements Summary

These journeys require the system to support:

- structured proposal intake periods, submission flows, segment-based responsible-CV assignment, supplement cycles, reviewer assignment, scoring, tờ trình approval routing, and history visibility
- role-aware dashboards that lead to filtered operational lists and decision screens
- scoped access to proposals, projects, reviews, tasks, files, and reports based on role, organization, assignment, and state
- notifications and reminders for assignments, supplement requests, approvals, due dates, overdue items, and reporting milestones
- auditable file upload, replacement, viewing, and download flows linked to business records
- seminar, student research, related-document, council, and ethics-dossier records aligned with the same authorization, history, notification, and reporting rules
- configuration and support capabilities for administrators without collapsing business authorization boundaries
- record-scoped scientific-secretary workflows for authorized administrative data, meeting materials, minutes, files, tasks, and draft summaries without reviewer or final-decision authority
- explicit, auditable record-scoped delegation when a non-default action is allowed; unresolved or expired delegation must fail closed

## Domain-Specific Requirements

### Compliance And Governance

- The system must support institutional research-governance workflows where records, approvals, and review outcomes are traceable and defensible.
- The system must preserve accountability for who performed each important action, when it happened, and under which role or authority it happened.
- The system must be designed so that internal policies for proposal handling, review, approval, periodic reporting, and acceptance can be enforced through workflow state and permission rules rather than informal process.
- Accessibility for core workflows must target WCAG AA because institutional systems must remain operable for a broad internal user base.

### Technical Constraints

- Security and authorization are central domain constraints, not generic platform features. Role, organization scope, assignment scope, and workflow state must all influence access decisions.
- The system must support dense administrative data, long-running workflows, and frequent file attachments without losing traceability.
- The system must support official document registers, council records, ethics dossiers, seminar records, and student research records as first-class business objects rather than treating them as unstructured file attachments.
- Notification and reminder logic must be derived from business deadlines and workflow state, not only from user-driven interactions.
- Reporting and dashboard queries must remain trustworthy under authorization filtering; aggregate views must not reveal cross-scope information incorrectly.

### Integration Requirements

- Phase 1 does not require external identity, public portal, or deep financial integrations.
- The architecture must still leave room for later integration with identity, digital approval, and other institutional systems without forcing redesign of the core workflow model.
- File storage integration with MinIO must preserve metadata, access control, and future extensibility for institutional document handling.

### Risk Mitigations

- Risk: workflow shortcuts bypass required business review.
  Mitigation: use controlled state transitions and explicit action permissions.
- Risk: unauthorized cross-unit visibility through search, export, or dashboard aggregation.
  Mitigation: enforce scope filtering at the backend and verify it in testing.
- Risk: missing reminders cause overdue tasks, reports, or review delays.
  Mitigation: implement backend-driven reminder jobs with traceable trigger rules.
- Risk: disputes over decisions or submission history.
  Mitigation: require audit logs and visible workflow history for critical actions.
- Risk: the product degrades into a document repository without operational control value.
  Mitigation: prioritize queues, statuses, assignments, alerts, and decision screens over passive storage features.

## Web Application Specific Requirements

### Project-Type Overview

RTMS is a browser-based internal administrative web application optimized for multi-role operational workflows, dense data presentation, file-heavy records, and role-scoped dashboards. It is not a marketing site and not a public content product. Requirements should therefore emphasize secure authenticated access, workflow responsiveness, list and form usability, and accessibility under institutional conditions rather than SEO-driven public discovery.

### Technical Architecture Considerations

- The frontend should support authenticated internal workflows with stable navigation, predictable state handling, and resilient handling of long-running form and list operations.
- The application should support hybrid rendering patterns appropriate for internal dashboards and detail screens, with a bias toward maintainability and secure server-mediated data access.
- Backend APIs must be optimized for filtered lists, dashboard summaries, status transitions, file operations, and export flows common to administrative use cases.

### Browser Matrix

- The product must support current versions of major evergreen desktop browsers used in institutional environments.
- The product must remain usable on modern mobile browsers for status checking, approvals, notifications, and lightweight task actions.
- Browser support decisions must prioritize reliability for internal users over experimental browser features.

### Responsive Design

- The product must support `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px` layouts for core screens.
- Desktop experiences should favor sidebar navigation, full data tables, filters, and denser management views.
- Mobile and tablet experiences must adapt navigation, list density, form actions, and dashboard layout without making critical workflows unusable.
- Contained horizontal scrolling may be used for dense tables, but full-page horizontal scrolling is not acceptable.

### Performance Targets

- List pages, dashboard widgets, and common detail screens should feel responsive under realistic internal administrative workloads.
- Search, filter, pagination, dashboard aggregation, and workflow actions should be designed to avoid avoidable blocking behavior.
- Export, reminder, and reporting workloads that may be heavier should be handled through backend-aware design patterns rather than making the primary UI unresponsive.

### SEO Strategy

- Public SEO is not a phase 1 priority because RTMS is an authenticated internal system.
- Metadata and document structure should still remain orderly and maintainable, but search-engine acquisition is not a product requirement.

### Accessibility Level

- Core workflows must target WCAG AA.
- Forms, filters, status badges, dialogs, navigation, tables, and action controls must preserve semantic structure, focus visibility, keyboard operability, and readable feedback.
- Accessibility conformance must apply to responsive layouts, not only desktop layouts.

### Implementation Considerations

- UX and frontend implementation must prioritize dashboards, filtered lists, forms, workflow history, file interactions, and notification surfaces over promotional or decorative patterns.
- Frontend architecture should allow reuse of stable admin patterns without over-abstracting components prematurely.
- The system must treat performance, accessibility, and responsive support as product requirements, not post-launch enhancements.

## Project Scoping

### Strategy & Philosophy

**Approach:** Single-release phase 1 scope with the seven functional work items from `detaiHVQY.md` section 2.1 through 2.7 preserved. The scoping strategy is disciplined, not reduced: ship the full internal workflow needed for proposal intake and approval, approved-project tracking, seminar and student research tracking, task management, executive dashboard/reporting, related-document management, and council/ethics management in one coherent release. Within that release, prioritize must-have operational capabilities over convenience enhancements.

**Resource Requirements:** This scope assumes a delivery team capable of full-stack web implementation across frontend, backend, database, workflow logic, file handling, notifications, and QA. The team must be able to deliver secure authorization, auditability, and workflow correctness, not just CRUD screens.

### Complete Feature Set

**Core User Journeys Supported:**

- Phòng KHQS runs intake (TP, CV), review coordination (TP¹/TB¹/CV³), tờ trình routing (CV drafts, TB reviews, TP approves), project follow-up (CV³), and reporting; PP monitors only
- CV manages seminars, student research activities, related documents, council plans, and IRB dossiers within scope
- QT, TP¹ and CV¹ maintain researcher profiles and link scientists to business records
- principal investigator (any role except QT/NNB) submits and maintains proposals and approved-project progress records
- reviewer or committee member (any role except QT) evaluates assigned proposals and contributes to controlled review workflows
- GĐ and PGĐ-KH monitor dashboard signals and decide or sign per procedure; PGĐ-TD monitors aggregates only
- system administrator manages accounts, roles, catalogs, and traceability support

**Must-Have Capabilities:**

- proposal intake periods, proposal draft/save/submit, completeness checks, supplement requests, resubmission, evaluation assignment, scoring, approval, rejection, and workflow history
- approved-project records, milestones, progress reports, delay tracking, adjustment requests, extensions, acceptance, and final review
- seminar and student research records, plans, documents, adjustments, budget metadata, products, and status tracking
- task creation, assignment, prioritization, due dates, reminders, status updates, overdue indicators, and linkage to proposals or projects
- role-based dashboards, filtered work queues, operational alerts, and reporting/export for key administrative, Phòng KHQS and BGĐ use cases
- related-document registry with document type, issuing authority, effective status, version context, and links to proposals, projects, seminars, councils, and tasks
- council and ethics workflows covering council planning, member assignment, ethics dossier submission, completeness checks, scoring, consolidation, and tờ trình approval routing
- researcher profiles covering scientist identity, academic rank or degree, unit, expertise, account linkage, participation history, and searchable profile metadata
- system administration for users, roles, units, catalogs, template-level configuration, and system parameters needed for phase 1
- role-based, unit-scoped, assignment-scoped, and state-based authorization
- audit logging for all critical business actions listed in this PRD
- file attachment upload, replacement, preview where practical, download, and traceable metadata with permission checks
- in-app notifications and email notifications for important workflow events and reminders

**Nice-to-Have Capabilities:**

- richer file previews and convenience UI for heavy document workflows
- more advanced analytics and trend visualizations beyond the first executive dashboard set
- bulk actions and power-user productivity features where they do not compromise correctness
- richer configuration of templates and notification rules beyond minimum operational needs

### Risk Mitigation Strategy

**Technical Risks:** The highest technical risk is incorrect implementation of authorization, state transitions, and dashboard aggregation. Mitigation requires explicit permission modeling, controlled status services, backend enforcement, and verification of scoped data access in tests or manual QA.

**Market Risks:** The main product risk is not external competition but failure to deliver enough operational value to replace off-system workarounds. Mitigation requires focusing phase 1 on queues, status visibility, reminders, and auditable workflows rather than over-investing in secondary polish.

**Resource Risks:** This is a broad internal workflow product. If delivery capacity becomes constrained, mitigation should focus on reducing convenience enhancements, not removing core modules or core governance controls already committed to scope.

## Functional Requirements

### Identity, Users, Roles, And Organizations

- FR1: System administrators can create, update, activate, deactivate, and lock user accounts.
- FR2: System administrators can assign exactly one active account-level system role from the ten roles of `docs/permission-matrix.md` §2 (`SYSTEM_ADMIN`, `LEADERSHIP_APPROVAL_AUTHORITY`, `SCIENCE_DEPUTY_DIRECTOR`, `RESEARCH_OVERSIGHT_AUTHORITY`, `RESEARCH_MANAGEMENT_HEAD`, `RESEARCH_MANAGEMENT_DEPUTY_HEAD`, `RESEARCH_BOARD_HEAD`, `RESEARCH_MANAGEMENT_STAFF`, `RESEARCHER_INTERNAL_USER`, or `EXTERNAL_RESEARCHER_USER`) to a user; owner-derived PI, `TOPIC_SECRETARY`, `TOPIC_MEMBER`, reviewer, council member, and IRB member permissions are assigned through record-scoped relationships or assignments instead of additional global roles. Reviewer, council and IRB duty can be invited from any account with a scientific CV, i.e. every role except QT.
- FR3: System administrators can associate users with an organizational unit and other scope-defining organizational attributes.
- FR4: The system can authenticate users and establish a role-aware session for authorized access.
- FR4a: Authenticated users can change their own password, and authorized administrators can initiate a controlled password reset flow for internal users.
- FR5: The system can enforce role-based access rules across all protected capabilities.
- FR6: The system can enforce explicit organization-scope or unit-scope access rules across proposals, projects, seminars, student research activities, councils, IRB dossiers, related documents, tasks, files, dashboards, and reports. Project view is Academy-wide for GĐ, PGĐ-KH, TP and TB; proposals always follow unit scope; CV operations require the current responsible-officer assignment on the record; PP and PGĐ-TD are read-only. Parent/child units never imply scope.
- FR6f: Distinguish coordination from record operations. TP¹ and TB¹ coordinate proposals within unit scope and see every project in the Academy; CV needs an effective `PROPOSAL_MANAGEMENT_OFFICER` or `PROJECT_MANAGEMENT_OFFICER` on the exact record and never operates on records assigned to another CV; PP and PGĐ-TD only monitor. Each record has at most one active responsible CV; assignment, reassignment and revocation preserve history and audit, including concurrent changes. No Phòng KHQS role decides topics, adjustments or extensions; those go through tờ trình routing to the BGĐ signer (FR71, FR73).
- FR6g: Preserve independent PI/member/secretary/reviewer/council/task access for Phòng KHQS users on other records without management actions. Backend capabilities identify the access basis. On one record, the responsible officer, reviewer, council member, tờ trình reviewer/approver and final signer are mutually exclusive with participation and with each other (matrix §8 closing rule); also deny reviewer + final decision in the same round and mutually exclusive council positions; check every relationship creation/change and protected action. Apply the same authorization/disclosure to list, detail, search, counts/facets, dashboards, reports/export, notifications, files and workflow/business history.
- FR6a: The system can distinguish account-level system roles from record-scoped relationships or assignments, including owner-derived PI, `TOPIC_SECRETARY`, `TOPIC_MEMBER`, reviewer, council member, and ethics reviewer, so those relationships only grant permissions within the specific proposal, approved topic, council, review, ethics dossier, task, or related record context.
- FR6b: Proposal creation, submission, and resubmission are owner-only actions requiring the current PI to be an active account with any system role except QT (`SYSTEM_ADMIN`) and NNB (`EXTERNAL_RESEARCHER_USER`); NNB can never be PI; no proposal-submit delegation or delegated capability is supported.
- FR6c: Protected record responses can state the current user's record-scoped relationships, allowed actions, blocked actions, and plain-language denial reasons as calculated by backend authorization policy.
- FR6d: A record-scoped `TOPIC_SECRETARY` can perform only the explicitly authorized administrative, meeting, minutes, document, task, tracking, and draft-summary actions for the assigned proposal, approved topic, council, or ethics record; the secretary relationship alone never grants reviewer scoring or final approval/rejection authority.
- FR6e: Proposal participation, project participation, council membership, reviewer assignment, task assignment, and ethics assignment relationships can be activated, suspended, ended, or revoked with effective dates and status, and an inactive relationship immediately stops granting access or capabilities.
- FR72: Segments (level + nature) assigned by TP to CV. Auto-assignment of one responsible CV on submit/resubmit: more specific match first, then fewer active records. Unmatched → "Chưa có người phụ trách". TP/TB assign/reassign/revoke, keeping history.
- FR79: Account activation by a 48-hour single-use setup-password link; no temporary password.

### Shared Catalogs And Configuration

- FR7: System administrators can manage shared catalogs required by business workflows, including organizational units, research fields, proposal types, statuses, priorities, report types, product types, forms, checklists, and scoring criteria.
- FR8: System administrators can configure system parameters, notification templates, and selected workflow-supporting settings required for phase 1 operations.

### Research Proposal Intake And Submission

- FR9: TP and CV can create, open, close and manage proposal intake periods with dates, required submission packages, and either Academy-wide scope (the default) or an explicit selected-unit scope. Open intake periods are visible to every role except QT and NNB.
- FR10: A PI holding any system role except QT/NNB, with applicable unit scope, can create a proposal draft, save progress, and submit a proposal formally within an applicable intake period; NNB (external researchers) can never be PI and cannot create or submit proposals.
- FR11: Principal investigators can enter structured proposal information including title, field, host unit, participants, timeline, objectives, content summary, and proposed budget metadata.
- FR12: Principal investigators can upload required proposal attachments and supporting documents to a proposal record.
- FR13: The system can validate required proposal data and required file conditions before formal submission.
- FR14: The system can record immutable proposal submission history, including timestamps, submission state changes, actor/authorization context, and locked versions; post-submission edits, withdrawal, and reopening use explicit requests/actions rather than overwriting a submitted version. Post-submission withdraw/edit requests filed by the PI are approved or rejected by the assigned CV; reopen is a CV action with a mandatory reason.
- FR76: Post-submission withdraw/edit/reopen approved or performed by the assigned CV, with audit.

### Proposal Review, Supplement, And Approval Workflow

- FR15: TB¹ or the CV assigned as the current proposal management officer (CV³) can review proposal completeness once per submitted/resubmitted version and request supplements with a stated reason and whole-calendar-day due date; repeat completeness confirmation for the current version is denied. TP never performs completeness checks or supplement requests.
- FR16: Principal investigators can view supplement requests, revise proposal content or attachments, and resubmit the proposal.
- FR17: TP¹, TB¹ or the assigned CV³ can invite, assign, revoke or change proposal reviewer/council evaluation positions, with a conflict check, for eligible active accounts of any system role except QT, regardless of host-unit scope or profile linkage; retain optional linked-profile provenance and enforce actor scope, current-submission completeness, workflow, source-participation conflict, one active mutually exclusive evaluation position per person/context, non-overlapping lifecycle, mutation-time context revalidation, append-only history/audit and disclosure. Invitees must accept or decline (declining requires a reason). See the compatibility/multiplicity definition in `docs/authorization-core-business-baseline.md`.
- FR18: Reviewers and committee members who accepted their invitation can access assigned proposals and submit scores, comments, and recommendations; every invited evaluation council member scores, whatever their system role. Council members read the dossier only after BGĐ signs the council establishment.
- FR19: TP¹, TB¹ or the assigned CV³ can monitor named pending/submitted/overdue reviews and backend-derived synthesis readiness, and synthesize, finalize and submit the evaluation result without conflict; the council secretary of the record drafts the synthesis and minutes without scoring.
- FR19a: The finalized evaluation result bound to the current submission goes to GĐ only through tờ trình routing (FR71); this replaces the former "Trình phê duyệt" package submission and never grants a Phòng KHQS role final approve/reject authority.
- FR20: GĐ alone can review proposal history, evaluation outputs, tờ trình step history, and supporting files before making the topic and funding decision.
- FR21: GĐ alone can approve, reject, or otherwise disposition a proposal together with its funding according to workflow rules, after the tờ trình has passed TB and TP; PGĐ-KH, PGĐ-TD, Phòng KHQS roles, QT and reviewers never decide a topic.
- FR22: The system can treat proposal statuses as controlled states and restrict actions based on current proposal state.

### Approval Routing (Tờ trình) And BGĐ Signatures

- FR71: Approval routing for every BGĐ-bound procedure (8 kinds), with a signer per kind (§7.4). CV drafts → TB review → TP approval → BGĐ sign. Return to the author with a reason. No skipping, no self-review. TB-authored submissions start at TP. One open submission per kind and subject.
- FR73: BGĐ signatures: GĐ or PGĐ-KH for councils (evaluation, IRB, acceptance), IRB certificate, extension and adjustment; GĐ only for topic + funding and liquidation. A signer cannot be a participant or reviewer on the record.

### Approved Project Tracking

- FR23: The system can create an approved-project record from an approved proposal while preserving relevant source data.

Golden Flow 4 is specified in the [Project Execution contract](../docs/contracts/project-execution.md).
It preserves project-scoped `TOPIC_PI` (the requested `PROJECT_PI`). The assigned CV
reviews/accepts reports without a tờ trình. For adjustments (with or without funding
change) and extensions the assigned CV appraises the PI's request and drafts the tờ
trình; TB reviews, TP approves, and GĐ or PGĐ-KH signs; the signature atomically applies
the change. No Phòng KHQS role decides an adjustment or extension. If no eligible TB/TP
step actor or conflict-free signer exists, the PI withdraws the request to unblock the
project. Submitted revisions/evidence are immutable; overdue is derived, never a project
state. The current proposal CV creates the project; TP¹/TB¹ independently assign the
project CV, who confirms setup. Controlled fields change only through the appropriate
signed request. The former Golden Flow 4 state names (`under_staff_review`,
`under_staff_validation`, `ready_for_head_decision`) must be reconciled with the routing.
Acceptance/council implementation belongs to the next flow.

- FR24: The assigned project CV and independently authorized project participants can define and maintain project milestones and planned reporting checkpoints.
- FR25: Principal investigators can submit periodic progress reports and supporting evidence for approved projects.
- FR26: The CV assigned as the current project management officer can review project progress reports, request follow-up where needed, and track unresolved issues.
- FR27: Principal investigators can submit adjustment or extension requests for approved projects.
- FR27a: Principal investigators can prepare and submit acceptance or final-review dossiers with required structured data, files, and readiness validation when the approved-project workflow requires a formal dossier before the authority decision.
- FR28: The assigned project CV appraises adjustment (including funding-change adjustment) and extension requests and drafts the tờ trình; it is routed TB → TP → BGĐ (FR71) and signed by GĐ or PGĐ-KH (FR73); the signature applies the change. CV, TB, TP, PP and PGĐ-TD never finally decide an adjustment or extension. Acceptance council establishment is signed by GĐ or PGĐ-KH; acceptance/final-review details remain governed by their separate later workflow.
- FR29: The system can identify delayed projects, upcoming deadlines, and projects waiting for administrative action.
- FR30: The system can treat approved-project workflow states as controlled states and restrict actions based on current project state.
- FR30a: `TOPIC_MEMBER` and `TOPIC_SECRETARY` users can view approved topics they participate in, including assigned responsibilities, relevant milestones, and permitted supporting files.
- FR30b: Topic team users can upload permitted contribution files or evidence within the scope granted to them for an approved topic.
- FR74: Funding as audited metadata. View: GĐ/PGĐ-KH/TP/TB all; CV assigned; PP and PI/members own participation; PGĐ-TD aggregate only. Manage: GĐ, and TP/TB Academy-wide; CV assigned. Liquidation: CV drafts → routing → GĐ signs.

### Task Management

- FR31: Authorized users can create tasks that are standalone or linked to proposals, approved projects, reports, meetings, or workflow events.
- FR32: Authorized users can assign task ownership, collaborators, due dates, priorities, and descriptive instructions.
- FR33: Task assignees and authorized users can update task status, progress, notes, and completion evidence.
- FR34: The system can identify and surface overdue tasks and upcoming due tasks.
- FR35: The system can treat relevant task statuses as controlled workflow states where business rules depend on them.

### Files, History, And Auditability

- FR36: Authorized users can upload, replace, view, and download files attached to business records according to permission rules.
- FR37: The system can preserve file metadata including uploader, timestamp, related record, and other traceability context required for business use.
- FR38: The system can present workflow history and business-record history for proposals, projects, seminars, student research activities, councils, ethics dossiers, related documents, tasks, and related decisions.
- FR39: The system can create audit-log records for critical business actions defined by this PRD.
- FR40: Authorized administrators and authorized business users can inspect audit or history information appropriate to their responsibilities and permissions.
- FR77: Two-way anonymity: PI and reviewers see no action log. TB/TP may see reviewer identity.

### Notifications, Reminders, And Work Queues

- FR41: The system can create in-app notifications for important business events such as assignment, supplement request, approval request, state change, and deadline-related events.
- FR42: The system can send email notifications for important business events and reminders defined in phase 1 scope.
- FR43: The system can generate reminders for approaching deadlines, overdue reports, overdue tasks, and pending workflow actions.
- FR44: The system can present user-specific work queues showing items waiting for the current user’s attention.
- FR78: Per-role work queues (§9.10): TB review, TP approval, CV assigned, GĐ decision/signature, PGĐ-KH signature, reviewer invitations. QT has none.

### Dashboard, Search, And Reporting

- FR45: Every role except QT can access a per-role dashboard showing, within authorized scope, items awaiting the user's decision, signature or routing step, delayed projects, overdue tasks, council or IRB queues, seminar or student research milestones, document status gaps, upcoming reports, and summary indicators. PGĐ-TD sees aggregate figures only and per-record funding columns stay empty. Filters include year, unit, level, field and nature (Quân sự / Dân sự / Chưa phân loại).
- FR46: Users can search and filter proposals, projects, seminar records, student research records, council records, document records, tasks, and reports by relevant business attributes such as code, title, unit, field, status, assignee, due date, and intake period.
- FR45a: Phòng KHQS dashboards show each proposal/project's current responsible CV with a breakdown by responsible CV and an "unassigned" group, so TP and TB can monitor workload, status and deadlines within authorized scope. CV management dashboards/reports contain only their assigned records; participation/review queues remain separately authorized. Counts, drill-down and exports use the same filters and access basis.
- FR47: The system can provide traceable detail views that connect dashboard indicators and list results to the underlying workflow records.
- FR48: Authorized users can export designated lists and reports to Excel or PDF according to business needs and permission rules.
- FR49: The system can produce role-scoped reporting views and summary outputs by unit, field, status, reporting period, module type, and related administrative dimensions.

### Seminar And Student Research Tracking

Student research (Đề tài sinh viên NCKH) follows `docs/permission-matrix.md` §9.6: CV or NCV
register a topic as supervising lecturer, and only CV¹ approves, manages and completes it.
Seminar permissions are not covered by the matrix and remain unchanged (open question).

- FR50: CV (former Scientific Management Staff) can create or import approved seminar records with responsible unit, participants, schedule, scope, and source decision metadata. CV and NCV can register student research topics as supervising lecturer, and CV¹ approves them.
- FR51: CV can maintain plans, related documents, milestones, and administrative notes for approved seminars; CV¹ maintains them for student research activities.
- FR52: Authorized users can record adjustment requests, budget metadata, products, and outcomes for seminars; for student research activities this is managed by CV¹.
- FR53: The system can treat seminar and student research statuses as controlled states, expose role-scoped lists, and preserve history for important changes; student research is completed by CV¹.

### Related Document Management

- FR54: Authorized users can register governing, legal, planning, proposal, project, seminar, council, and other related documents with document type, issuing authority, code, date, effective status, and metadata.
- FR55: Authorized users can link related documents to proposals, approved projects, seminars, student research activities, councils, ethics dossiers, tasks, and reports.
- FR56: The system can preserve version or replacement history for important related documents and distinguish current, expired, superseded, and archived document states.
- FR57: The system can provide role-scoped search, filtering, and retrieval of related documents without exposing file metadata or document content outside authorized scope.

### Council And Ethics Management

The ethics council is named IRB (ethics council); council and IRB members are
invited from any account with a scientific CV (every role except QT).

- FR58: TP¹, TB¹ or the assigned CV³ can set up and manage council plans (evaluation, IRB, acceptance) with purpose, schedule, member roles, related legal documents, and linked business records; a council tờ trình is routed only after every invited member has accepted.
- FR59: Principal investigators or the assigned CV³ can create, complete, and submit IRB dossiers with required structured data and attachments.
- FR60: TB¹ or the assigned CV³ *(TB¹ for IRB dossiers: to be confirmed)* can review IRB dossier completeness, request supplements, and track resubmissions.
- FR61: Council or IRB members who accepted their invitation can access assigned IRB dossiers or council records and submit scores, comments, and recommendations; the IRB secretary drafts the IRB conclusion.
- FR62: TP¹, TB¹ or the assigned CV³ can monitor council review progress, consolidate evaluation outcomes, and draft the tờ trình that is routed TB → TP → BGĐ (FR71).
- FR63: GĐ or PGĐ-KH signs council establishment (evaluation, IRB, acceptance) and the IRB certificate according to workflow rules (FR73); no other role decides council or IRB records.
- FR64: The system can treat council and IRB workflow statuses as controlled states with role-scoped dashboards, reports, history, notifications, and audit logs.

### Researcher Profile Management

- FR65: QT (platform scope) and TP¹/CV¹ (unit scope) can create and maintain researcher profiles with identity, academic rank or degree, title, contact details, organization, research fields, expertise keywords, and active status.
- FR66: QT (platform scope) and TP¹/CV¹ (unit scope) can link researcher profiles to user accounts where applicable while still allowing profile records for researchers who do not yet have system login accounts.
- FR67: Authorized users can associate researcher profiles with proposals, approved projects, seminars, student research activities, councils, ethics dossiers, reviews, publications, products, and tasks where relevant.
- FR67a: The system can enforce record/council/evaluation-context-scoped conflict-of-interest, separation-of-duty and assignment-multiplicity rules when assigning participation, reviewer, council, secretary, or approval roles, including blocking source participants from evaluation/approval, multiple active mutually exclusive evaluation positions, overlapping assignments, reviewer final decisions, stale assignment context and unauthorized secretary decision actions. Preflight is advisory; every authoritative single, bulk, import, direct-API or administrative mutation rechecks the same backend policy.
- FR68: Users can search and filter researcher profiles by name, unit, field, expertise, status, participation history, and other authorized business attributes.
- FR69: The system can preserve researcher profile history and audit important profile changes according to role and data-scope permissions.
- FR70: Researchers can maintain a scientific CV (Lý lịch khoa học, form BM-06) on their researcher profile — general info, education, work history, research experience — validated server-side, with sensitive fields protected, and can view/print it in Vietnamese and English; authorized scoped managers can view it. Every role except QT has a scientific CV.
- FR75: Duplicate researcher profile warning (raised by QT/TP/CV) notified to TB/TP, who decide the merge; history kept.

## User Personas

The personas below describe people and journeys, not additional account-level
system roles. Their business permissions come from record-scoped participation
or assignment unless the persona is one of the ten system roles listed in the
Authorization Glossary.

### System Administrator (QT)

Maintains accounts, roles, organizational mappings, shared catalogs, configuration, researcher-profile provisioning/linking, scientific documents and operational traceability. Has no scientific CV, no business dashboard and no reviewer assignment; needs controlled administrative power without bypassing business authority.

### Giám đốc Học viện (GĐ)

The only role that approves topics with their funding and approves liquidation; can also sign everything PGĐ-KH signs. Sees every project in the Academy and per-project funding, manages funding, and works a decision and signature queue.

### Phó Giám đốc phụ trách Khoa học (PGĐ-KH)

Signs evaluation, IRB and acceptance council establishment, the IRB certificate, project extensions and adjustments (with or without funding change). Never approves topics, topic funding or liquidation and does not manage funding. Sees every project in the Academy and per-project funding.

### Phó Giám đốc khác, chỉ theo dõi (PGĐ-TD)

Monitors progress, counts and aggregate funding only; never sees per-record funding and signs nothing.

### Trưởng phòng KHQS (TP)

Approves every tờ trình before it goes to BGĐ; assigns segments to CVs and assigns/reassigns/revokes the responsible CV; coordinates proposals within unit scope and may also do CV-level evaluation work (reviewer/council assignment, synthesis, IRB council, drafting tờ trình). Sees every project in the Academy and manages funding Academy-wide. Never performs completeness checks or supplement requests.

### Phó phòng KHQS (PP)

Monitors progress and counts within unit scope only; has no step in the tờ trình flow and no approval, even when TP is absent. Sees per-project funding only for projects PP participates in.

### Trưởng ban QLKH (TB)

A single holder. Reviews CV-authored tờ trình and forwards them to TP or returns them to the author; assigns/revokes the responsible CV; performs completeness, supplement, reviewer/council assignment, synthesis, IRB council and tờ trình drafting within unit scope. Sees every project in the Academy, manages funding Academy-wide, and may see reviewer identity.

### Chuyên viên QLKH (CV)

On proposals/projects where CV is the current responsible officer, runs the operational workflow: completeness, supplement requests, reviewer/council invitation, synthesis, IRB council, drafting tờ trình, and daily project operations (milestones, report review, appraising adjustments/extensions, acceptance, products, drafting liquidation, closing). Also creates intake periods, manages researcher profiles and student research in unit scope. Never operates on records assigned to another CV. This is the most workflow-intensive persona in phase 1.

### Principal Investigator

Holds any system role except QT/NNB. Creates proposals, responds to supplement requests, tracks project progress, submits reports, and requests adjustments or extensions.

### Topic Team Member

Participates in approved-project work, receives assigned tasks, contributes evidence or files within granted scope, and monitors responsibilities related to the project. May have a researcher profile linked to their system user when they are part of the scientific personnel directory.

### Reviewer / Committee Member

Holds any system role except QT and is invited explicitly; accepts or declines (with a reason), then accesses assigned proposals, IRB dossiers, council records, or review records, submits scores and comments, and participates in controlled evaluation or acceptance workflows. Never sees the record's action log and cannot sign or decide on the same record.

### External Researcher User (NNB)

Works only on explicitly related records such as approved-topic/task contributions
or assigned review packages; never sees intake periods and is never PI. Cannot create, edit, or formally submit proposals,
change PI/members/objective/budget/status, assign users, or
make a final decision. This is one account-level system role; PI, member,
reviewer, and secretary authority remains record-scoped.

## Role-Based Access Requirements

- Each protected capability must be explicitly mapped to one or more roles.
- Each account has exactly one active system role in phase 1. Multiple business
  relationships are represented by record-scoped participation, assignment,
  council membership, task assignment, or delegation records, not by stacking
  global roles.
- Business actions such as proposal submission, supplement request handling, review submission, approval decisions, project follow-up, seminar/student research updates, document registration, ethics dossier submission, council decisions, and report export must be restricted by role.
- `EXTERNAL_RESEARCHER_USER` may read only explicitly related records, update
  only assigned approved-topic/task contributions, and submit only an
  explicitly assigned review. It never receives authority from same-unit
  membership, another record, a profile link, or a UI capability hint.
- Administrator permissions must remain distinct from business-decision permissions.
- Reviewer, council member, and committee access must be limited to assigned items and required supporting context.
- A reviewer may access only the supporting files required for the assigned
  review and may view only their own draft or submitted review unless policy
  explicitly permits broader review visibility.
- PI, team member, and topic secretary users cannot
  view internal reviewer identities, raw scores, reviewer comments, or
  consolidated evaluation material before the configured disclosure state.
  After a final decision, only the policy-approved decision summary is visible
  by default; raw internal reviews remain restricted unless an explicit
  disclosure policy allows them.
- BGĐ actions must be limited to the signer rules of `docs/permission-matrix.md` §7.4: GĐ alone approves topic + funding and liquidation; GĐ or PGĐ-KH sign councils, IRB, acceptance, extension and adjustment; PGĐ-TD signs nothing.
- PP and PGĐ-TD never approve, sign or route; TP never performs completeness checks or supplement requests; CV never operates on records assigned to another CV.
- Every BGĐ-bound procedure passes the tờ trình flow CV → TB → TP → BGĐ; no step is skipped and TB/TP never review a tờ trình they authored.
- PI and reviewers never see the record's action log (two-way anonymity); only TB¹ and TP¹ may see reviewer identity.
- QT is never assignable as reviewer, council or IRB member; every other role may be invited.
- `PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_MEMBER`, `TOPIC_SECRETARY`, reviewer, council member, and ethics reviewer status must be treated only as record-scoped relationship or assignment context and must not be configured as account-level system roles.
- Authorization must evaluate conflict-of-interest rules before sensitive assignments or decisions, including responsible-CV assignment, reviewer assignment, council membership assignment, tờ trình review/approval, proposal approval, adjustment/extension signature, and council or IRB signature.
- A topic team member cannot formally create, submit, or resubmit a proposal,
  change official membership, approve a report, or make a project decision.
- A topic secretary may update only the files, administrative fields, meeting
  materials, minutes, tasks, tracking information, and summaries explicitly
  authorized for the assigned record or council. On a proposal, the current
  implementation permits an internal secretary to upload files but not edit or
  submit the draft. Secretary status never grants
  scoring, reviewer assignment, approval, rejection, or final-decision power.
- Any delegation contract in a future/domain-specific capability must identify
  the target record, allowed actions, grantor, delegate, approving staff actor,
  status, and validity period; it must be revocable, auditable, and denied when
  expired, revoked, ambiguous, or conflicting. Proposal creation, submission,
  and resubmission are explicitly non-delegable.

## Data-Scope Authorization Requirements

- Access to proposals, projects, seminars, student research activities, councils, ethics dossiers, researcher profiles, related documents, tasks, dashboards, reports, and files must be restricted by organizational scope where applicable.
- Users must only see records for units, assignments, or approval scopes they are permitted to access.
- Search results, dashboard counts, exports, notification targets, and history views must respect the same data-scope rules as detail pages.
- Cross-unit visibility must be explicit and rule-driven, never implicit.
- Effective permission must be calculated from system role, organization scope, record participation role, assignment scope, workflow state, and conflict policy; missing or ambiguous context must fail closed.
- `SYSTEM_ADMIN` receives no business-data access merely from its system role.
  Proposals always follow unit scope: TP, TB, PP and PGĐ-TD read them within unit
  scope¹, GĐ and PGĐ-KH read submitted-or-later proposals within unit scope², CV only
  records it currently holds³, NCV/NNB only own participation⁴ or assignment⁵.
  Projects are visible Academy-wide to GĐ, PGĐ-KH, TP and TB; PP, PGĐ-TD and CV see projects
  within unit scope (CV operates only on records it currently holds³); TP and TB manage funding Academy-wide; other project operations
  stay within unit scope. Per-record funding is never visible to PGĐ-TD (aggregate
  only), and PP sees it only for projects PP participates in. No scope bypasses
  workflow, conflict, disclosure or the BGĐ signer rules.
- Delegation grants may narrow or add only the explicitly listed record actions
  and must not widen organization scope, bypass workflow state, or override a
  conflict-of-interest prohibition.
- Participation, assignment, council-membership, and delegation status and
  effective dates are checked on every protected request; inactive or expired
  relationships are not treated as permissions.

## Audit-Log Requirements

- The system must create audit logs for login, logout, change password, initiate or complete password reset, create, update, soft delete, create/update/deactivate user, assign role/scope/unit title, assign CV segment, create/update/open/close intake period, create/update proposal draft, submit or resubmit proposal, post-submission withdraw/edit/reopen, request supplement, assign/reassign/revoke responsible CV (manual or automatic, recording actor or system, old/new officer and segment match), invite/accept/decline/revoke reviewer, council or IRB member, submit score and comment, consolidate evaluation, tờ trình submit/forward/return/approve/sign (with procedure type, step, decision and reason), approve or reject topic and funding, create approved project / milestone change, submit progress report, create/withdraw adjustment or extension request, sign adjustment/extension, funding disbursement/settlement and liquidation, create task, assign task, update task status, register or replace important related documents, create or update researcher profile, link researcher profile to user account or business record, submit IRB dossier, update council decision, upload important file, download important file, and export report (`docs/permission-matrix.md` §11).
- Audit-log entries must include actor, action, timestamp, target record, and sufficient business context to support investigation.
- Audit logs must be retained in a form that supports operational review, dispute resolution, and timeline-style history where appropriate.

## File Attachment Requirements

- File attachments must be associated with business records such as proposals, reports, decisions, tasks, seminars, student research activities, related documents, councils, ethics dossiers, and supporting evidence.
- Upload, replacement, view, preview, and download actions must enforce authorization checks.
- Important file records must preserve metadata and traceability, including uploader, upload time, related record, and relevant version context.
- File validation must enforce allowed type, size, and required association rules before acceptance.

## Notification And Reminder Requirements

- The system must support in-app notifications for workflow events that require awareness or action.
- The system must support email notifications for important workflow events and reminders in phase 1.
- Reminder workflows must cover supplement deadlines, review deadlines, approvals, project reporting deadlines, seminar or student research milestones, council or ethics review deadlines, document effective dates where relevant, task due dates, and overdue items.
- Notification delivery must respect role and data-scope authorization.

## Dashboard And Reporting Requirements

- Dashboard content must be role-based and scope-filtered.
- GĐ dashboards must prioritize topic + funding decisions, liquidation and other tờ trình awaiting signature; PGĐ-KH dashboards must prioritize tờ trình awaiting signature (councils, IRB, acceptance, extension, adjustment). Both also show delayed projects, overdue tasks, upcoming reports, unit-level summaries, and action-oriented queues.
- PGĐ-TD dashboards show progress, counts and aggregate funding only; per-project/proposal funding columns stay empty. PP dashboards show progress and counts within unit scope.
- TB dashboards prioritize the tờ trình review queue and TP dashboards the tờ trình approval queue and the "Chưa có người phụ trách" records; both include a responsible-CV breakdown with an "unassigned" group.
- CV dashboards must prioritize assigned operational backlogs, supplement queues, review progress, seminar/student research milestones, document status gaps, council/IRB queues, reporting deadlines, and unresolved issues.
- QT has no business dashboard. Dashboard filters include year, unit, level, field and nature (Quân sự / Dân sự / Chưa phân loại).
- Dashboard signals must link directly to filtered lists or detail views that explain the underlying records requiring action.
- Report exports must preserve business filtering and permission rules and support the core Excel/PDF reporting needs defined for phase 1.

## UX Requirements

- The product must follow an institutional admin dashboard style appropriate for the Military Medical Academy context.
- Primary color direction must remain dark green, with white and light gray-green surfaces and restrained gold accents.
- The UI must avoid startup SaaS styling, heavy gradients, glassmorphism, decorative hero areas, and emoji iconography.
- Desktop layouts must use sidebar-oriented administration patterns, while mobile and tablet layouts must adapt navigation appropriately.
- Topbar patterns must preserve quick access to search, notifications, account context, and current role.
- Important detail pages must include breadcrumbs that support return to prior lists or dashboards.
- Core screens must support `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`.
- Forms must use clear sections, inline validation, visible success and error feedback, and confirmation for important destructive or state-changing actions.
- Mobile form layouts must support one-column input flow and may use sticky primary actions where forms are long.
- Workflow-heavy screens should expose current status, timeline or stepper context, and history without burying them in hard-to-find overlays.
- Status communication must combine color with text labels or icons.
- A user who holds different roles on different records must work inside one unified workspace: navigation follows the account-level system role, while what the user may do inside a record follows that record's participation. The UI must not offer a global role switcher or require the user to declare which role they are acting as.
- Every list row and detail screen must state the viewer's role on the specific record being shown, and must never present the account-level system role as if it were the record role.
- A personal work area shared by all signed-in users must gather the records they own, the records they participate in, and the items awaiting their action, each entry labelled with its record-scoped role.
- Actions blocked by conflict-of-interest policy must remain visible but disabled with a plain-language reason, rather than being silently hidden.
- Record list and detail APIs must provide backend-derived capability data
  sufficient for the UI to show all relevant record relationships, allowed
  actions, disabled actions, and denial reasons without inferring permission
  from the active system role.
- When a user has multiple relationships to the same record, the UI must show
  all security-relevant relationships. It must not choose a “highest role” and
  must not hide a relationship that creates a conflict or restriction.
- Researcher profile details must expose authorized views of account linkage,
  owned records, participating records, secretary assignments, council
  memberships, assigned reviews, assigned tasks, participation history, and
  audit/history.
- Proposal, approved-topic, council, and ethics detail screens must provide an
  authorized personnel-and-roles view that distinguishes owner-derived PI,
  `TOPIC_MEMBER`, `TOPIC_SECRETARY`, reviewers, chair, council secretary, and
  council members as applicable.
- Personnel lists must use visible text role badges for every authorized
  relationship and must not rely on color alone.
- The topbar or account menu must provide authorized summary counts for owned
  records, participating records, secretary assignments, assigned reviews, and
  pending actions, with drill-down to the personal work area.
- Accessibility for core workflows must target WCAG AA.

## Acceptance Criteria

### Core Workflow Acceptance

- Proposal intake, supplement, review, approval, approved-project tracking, seminar/student research tracking, task management, related-document management, council/ethics management, notifications, and dashboard/reporting flows are all demonstrably available in phase 1 through test execution or controlled UAT scenarios.
- Proposal, approved-project, seminar/student research, council/ethics, and task states are enforced as controlled workflows rather than free-form edits, verified by positive and negative workflow transition scenarios.
- Each canonical system role plus owner-derived PI, topic team member, reviewer, and council or committee member can complete at least one primary journey in verification scenarios without relying on external shadow tracking for the main workflow.

### Governance Acceptance

- Role-based, data-scope, and state-based authorization are enforced on protected operations, verified through role-specific and cross-scope negative test scenarios.
- Participation-role, assignment-scope, and conflict-of-interest authorization are enforced on protected operations, verified through negative scenarios such as PI self-review, GĐ/PGĐ-KH self-approval or signature on a record they participate in, tờ trình self-review, secretary overreach, and council member access outside assigned records.
- Critical audit-log actions are generated and verifiable for the workflow actions listed in this PRD.
- File access, preview, and file download permissions are enforced and verifiable for authorized and unauthorized cases.

### Permission Scenario Acceptance

- AC-PERM-01: Given a user is PI of one proposal and a member, secretary, or reviewer on
  other records, when the user opens each record, then the backend returns the
  correct relationships and capabilities for that record without changing the
  active system role.
- AC-PERM-02: Given a current PI holding any system role except QT/NNB owns a draft
  proposal in an applicable intake period, when the PI edits, uploads required files,
  and submits a complete proposal, then the actions succeed; the same
  create/submit/resubmit actions are denied to a team member, secretary, Phòng KHQS
  or BGĐ user acting in a management capacity, QT, NNB, or delegate before mutation.
- AC-PERM-03: Given a topic team member has a granted evidence responsibility,
  when the member uploads evidence or updates an assigned task, then the action succeeds only
  within the granted project/task scope; formal report submission, membership
  changes, adjustment requests, and decisions remain denied.
- AC-PERM-04: Given a `TOPIC_SECRETARY` is assigned to a proposal, approved topic, or council,
  when the secretary performs an explicitly authorized file, administrative,
  meeting, minutes, task, tracking, or summary action, then the action succeeds and
  is audited; scoring, reviewer assignment, approval, and rejection remain
  denied.
- AC-PERM-05: Given a reviewer is assigned to a record, when the reviewer opens the
  evaluation workspace, then only the assigned record, permitted supporting
  files, and the reviewer's own review are available; unassigned records and
  other reviewers' reviews remain unavailable unless policy explicitly allows
  them.
- AC-PERM-05a: Given a user has no active assignment on the current proposal,
  when capabilities are evaluated, then `proposal.review.submit` is not allowed
  and the evaluation section is omitted; an inactive, revoked, expired, or
  missing assignment also denies the evaluation API.
- AC-PERM-05b: Given TP¹, TB¹ or the assigned CV³ is viewing a proposal, when the
  proposal is in an assignable state, then reviewer/council assignment, synthesis and
  tờ trình drafting capabilities are evaluated for that proposal only, and the TB
  review step and TP approval step are offered only to TB¹ and TP¹ respectively; an
  unassigned CV, PP, PGĐ-TD, QT and other users receive no such capability, and no
  Phòng KHQS role ever receives topic approval.
- AC-PERM-05c: Given GĐ is viewing a proposal whose tờ trình has passed TB and TP,
  when it is ready for approval and no conflict exists, then topic + funding
  approve/reject are available; conflict or state denial remains disabled with a
  reason; PGĐ-KH, PGĐ-TD and every other role receive no topic approval capability.
- AC-PERM-05d: Given a user opens a researcher profile page, when the profile is
  not a proposal detail context, then evaluation, assignment, and approval
  sections are absent regardless of system role or other-record assignments.
- AC-PERM-06: Given a candidate is PI, member, secretary, or another disqualified
  participant on a record, when TP¹, TB¹ or the assigned CV³ attempts to assign an independent
  reviewer or conflicting council role, then the assignment is rejected and no
  access or notification is created.
- AC-PERM-06a: Given a researcher already has any active chair, council-secretary,
  council-member, reviewer, or council-reviewer position in an evaluation
  context, when the same or another position is proposed with an overlapping
  interval, then preflight and the authoritative mutation reject it with the
  stable backend reason; an assignment on an unrelated record/council/round has
  no effect.
- AC-PERM-06b: Given an authorized position change, when the replacement becomes
  effective, then the prior row is ended or revoked first, active intervals do
  not overlap, and immutable assignment history is retained even under
  concurrent or bulk requests.
- AC-PERM-07: Given GĐ or PGĐ-KH (as decider or signer) is also PI, member, secretary, reviewer, or
  conflicting council participant on the same record, when the authority
  attempts a final decision, then the action is blocked even though the
  account-level role normally permits approval.
- AC-PERM-07a: Given a person holds an active evaluation position or has a
  persisted draft/submitted evaluation in
  the same evaluation round, when that person attempts final approval or
  rejection, then the backend denies `REVIEWER_DECISION_CONFLICT` even if the
  assignment later expired or was revoked; an ended assignment with no
  persisted evaluation creates no lasting conflict.
- AC-PERM-08: Given the same person is reviewer or secretary on a different unrelated
  record, when authorization is evaluated, then that relationship does not
  restrict or widen permissions on the current record.
- AC-PERM-09: Given any actor other than the current PI (any role except QT/NNB) requests
  proposal creation, submission, or resubmission, when the request reaches the
  backend, then it is denied before mutation and no delegated capability is
  accepted.
- AC-PERM-10: Given participation, assignment, delegation, workflow state, or conflict
  context is missing or ambiguous, when a protected action is requested, then
  the backend fails closed and returns a stable denial code plus a
  plain-language reason.
- AC-PERM-10a: Given candidate/preflight was allowed but the candidate, source,
  council/round, assignment interval, or context version changes before write,
  when any assignment path reaches the authoritative mutation, then it denies
  `STALE_ASSIGNMENT_CONTEXT` without a partial assignment, notification, access
  grant, or decision side effect.
- AC-PERM-11: Given a participation, assignment, or council membership reaches
  its end date, is suspended, or is revoked, when the affected user next
  requests the record or an action, then the relationship grants no access or
  capability and the lifecycle change is auditable.
- AC-PERM-12: Given a PI, team member, or topic secretary opens an
  evaluation record before the configured disclosure state, when the response
  is produced, then reviewer identities, raw scores, reviewer comments, and
  consolidated outcomes are omitted; after the final decision only the
  policy-approved summary becomes visible by default. PI and reviewers never
  receive the record's action log (two-way anonymity); TB¹ and TP¹ may see reviewer
  identity, while PI, members and other reviewers may not.
- AC-PERM-13: Given a tờ trình is in routing, when any actor attempts to skip a step
  (CV → TP or CV → BGĐ directly, or TP-authored without the TB step), or TB/TP attempts
  to review a tờ trình they authored, then the backend denies the action; a
  TB-authored tờ trình starts at the TP step, and a return at any step goes back to
  the author only with a mandatory reason.
- AC-PERM-14: Given a PP or PGĐ-TD user views a proposal, project or tờ trình, when
  capabilities are evaluated, then no approve, sign or routing (forward/return)
  action is available and direct API attempts are denied, including when TP is absent.
- AC-PERM-15: Given PGĐ-KH opens a topic + funding tờ trình or a liquidation tờ trình,
  when a decision or signature is attempted, then it is denied; PGĐ-KH signing a
  council establishment, IRB certificate, extension or adjustment succeeds when no
  conflict exists.
- AC-PERM-16: Given TP has unit scope over a submitted proposal, when TP attempts a
  completeness check or supplement request, then the backend denies it; TB¹ and the
  assigned CV³ are allowed.
- AC-PERM-17: Given a proposal is submitted or resubmitted, when segment
  auto-assignment runs, then exactly one responsible CV is assigned (more specific
  segment match first, then fewer active records) and audited with actor System; when
  no segment matches, the record shows "Chưa có người phụ trách" and appears for TP to
  assign.
- AC-PERM-18: Given a liquidation tờ trình reaches BGĐ, when any role other than GĐ
  attempts to sign it, then the action is denied; GĐ signing succeeds when no
  conflict exists.
- AC-PERM-19: Given a PGĐ-TD user opens a dashboard, report, export, project detail or
  file metadata, when funding is rendered, then only aggregate figures appear and
  every per-project/proposal funding value is empty or denied.
- AC-PERM-20: Given a proposal or project is assigned to one CV, when another CV
  attempts any record operation (completeness, supplement, assignment, synthesis,
  tờ trình drafting, project operations, funding) on it, then the backend denies it;
  a CV's past assignment grants nothing.

### UX Acceptance

- Core administrative screens work across the required breakpoints of `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`.
- Dashboard, list, detail, and form experiences remain usable and legible on desktop and mobile/tablet layouts without full-page horizontal scrolling on mobile.
- Core workflows satisfy the baseline accessibility expectations stated in this PRD, verified by keyboard navigation checks, visible focus checks, label checks, and status readability checks on affected screens.
- A user who is simultaneously the owner of one proposal, a participant in another, and GĐ can carry out each responsibility without switching accounts or roles, sees the correct record-scoped role stated on each record, and is blocked with a stated reason from approving a proposal they participate in.
- A user with multiple relationships on one record sees every
  security-relevant relationship and backend-derived allowed/blocked actions;
  the UI does not collapse them into a locally inferred “highest role.”
- Researcher and business-record detail screens expose the authorized
  participation/personnel views required by this PRD without leaking
  out-of-scope profile or assignment metadata.

## Phase 1 Out-Of-Scope

- Public internet-facing submission portals
- SSO, LDAP, OIDC, MFA, and other external identity integrations
- Digital signature workflows
- SMS delivery
- No accounting, ledger, payment, banking or ERP integration. Funding allocation/disbursement/settlement figures and documents are recorded as audited metadata.
- Dynamic workflow-engine configuration for arbitrary process modeling
- Elasticsearch or OpenSearch adoption unless later approved explicitly
- Microservices or Kubernetes-based deployment architecture

## Implementation Risks And Assumptions

### Risks

- Authorization or data-scope mistakes could expose cross-unit records or incorrect dashboard aggregates.
- Workflow-state modeling may become inconsistent if states are not treated as first-class domain logic.
- Notification and reminder correctness may fail if trigger rules are left implicit or implemented only in the UI.
- File-handling flows may become weak points if metadata, permission checks, or history are incomplete.

### Assumptions

- Phase 1 is an internal authenticated system with no public self-service access.
- The academy accepts a modular-monolith phase 1 approach with future extensibility rather than immediate distributed architecture.
- Local authentication is acceptable in phase 1.
- The provided planning documents plus `detaiHVQY.md` represent the approved product direction for current PRD scope.

## Non-Functional Requirements

### Performance

- NFR1: Standard authenticated list views, detail pages, and common workflow actions shall return user-visible results within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR2: Dashboard views shall present core widgets and counts within 3 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR3: Search and filter interactions on primary administrative lists shall complete within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR4: Heavy operations such as exports, reminder batches, and derived reporting workloads shall provide visible progress, queued status, or completion feedback and shall not block normal interactive request handling, as verified by workflow testing under concurrent usage scenarios.

### Security

- NFR5: All authenticated traffic shall require encrypted transport in deployment environments, verified by environment configuration review and transport-layer access tests.
- NFR6: Passwords, activation tokens, credentials, and session-related secrets shall never be stored in plaintext or exposed in ordinary application responses; researcher credential emails shall carry only single-use setup links, never temporary passwords, verified by security review and automated or manual inspection of relevant authentication paths.
- NFR7: Authorization shall be enforced on the backend for all protected operations, including dashboards, reports, search, exports, workflow actions, file access, and history views, verified by endpoint and service-level authorization tests for allowed and denied cases.
- NFR8: The system shall fail closed when authorization scope, participation role, assignment scope, conflict policy, or state-based permission context cannot be resolved safely, verified by negative-path tests.
- NFR9: Audit-log records for critical actions shall be queryable by authorized users within the product or operational support tooling and verifiable during audit-log acceptance testing.

### Reliability And Data Integrity

- NFR10: Critical workflow actions such as submission, supplement request, approval decision, task status change, and key file-linking operations shall either complete successfully with consistent state changes or fail without partial business-state persistence, verified by integration testing.
- NFR11: Reminder, notification, and background processing flows shall be safe to retry without causing inconsistent state and should avoid duplicate business outcomes where the same trigger is reprocessed, verified by retry-path testing for affected jobs.
- NFR12: Important business records shall support soft delete where defined by product rules, verified by record lifecycle tests that confirm recoverability and traceability expectations.
- NFR13: Every schema change shall be versioned through a Prisma migration and validated through migration execution in controlled development or test environments.

### Accessibility

- NFR14: Core phase 1 workflows shall meet WCAG AA expectations for labels, focus visibility, keyboard navigation, readable status communication, and error feedback, verified by accessibility review and manual keyboard checks on affected flows.
- NFR15: Responsive versions of core workflows shall preserve accessibility behavior rather than treating accessibility as desktop-only, verified across desktop and mobile/tablet layouts for affected screens.
- NFR16: Status communication shall not depend on color alone and shall include text or icon reinforcement, verified by design review and UI verification of affected status components.

### Maintainability And Modularity

- NFR17: The phase 1 solution shall preserve modular-monolith boundaries so major business areas remain separable in code, testing, and review, verified by architecture and code review.
- NFR18: Business logic shall remain centralized in backend service layers rather than being fragmented across controllers or frontend-only flows, verified by code review of implemented stories.
- NFR19: New code introduced under this PRD shall maintain TypeScript strictness, explicit DTO validation, and clear domain naming, verified by build, test, and code review gates.
- NFR20: New functionality shall be implemented in a way that supports story-sized testing, review, and rollback of changes without broad unrelated refactoring, verified during story review and implementation readiness checks.


## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](../docs/contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- QT (platform scope) and TP¹/CV¹ (unit scope) manage internal/external
  profiles independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when the QT/TP/CV profile manager checks `Tạo tài khoản truy cập hệ thống`.
- Every role except QT has a scientific CV and self-updates it through My Profile (FR70).
- A duplicate-profile warning raised by QT, TP¹ or CV¹ is notified to TB¹ and TP¹, who
  decide the merge; history is kept (FR75).
- Activation uses hashed single-use tokens, expires exactly after 48 hours and
  sends only a setup-password link. No temporary password is generated, emailed,
  persisted, returned to profile managers or placed in audit.
- Login accepts either configured username or account email. Username is optional
  at provisioning, unique when set later by the linked researcher in My Profile,
  and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.

### Implementation scope — 2026-10-18

This replaces "Finalized implementation scope — 2026-09-21". On `DocManS` the model is
implemented on the existing proposal, intake, researcher-profile, file and evaluation
features, with the ten role codes but without PGĐ-KH/PP/TB business permissions (see "Phòng KHQS and BGĐ boundary — 2026-10-18").
Approved projects, council-establishment/IRB lifecycles, institutional dashboards, general
search/report/export and notification/My Work backends remain planned where no
operational source exists; tờ trình routing, council invitations and dashboard breakdowns
exist on `tuan/DocManS`. `PROJECT_MANAGEMENT_OFFICER` is a contract relationship, not a
persisted orphan assignment. Dashboard showcase data is not an institutional report or
proof of authorization. Future source domains must apply the same current scope,
relationship, conflict and disclosure checks before aggregates or drill-down.

GĐ, PGĐ-KH and PGĐ-TD require institutional research dashboard views of available
proposal stages, overdue work, active/delayed/reporting-due/acceptance/completed projects,
funding and management workload; PGĐ-TD sees funding as aggregate figures only. Work
queues follow matrix §9.10: only GĐ gets topic + funding and liquidation decision queues;
GĐ and PGĐ-KH get signature queues (councils, IRB, acceptance, extension, adjustment); TB
gets the tờ trình review queue and TP the approval queue; CV sees its assigned records.
Phòng KHQS dashboards include the responsible-CV breakdown with an "unassigned" group.
Proposal funding currently provides `budgetMetadata.amount` (requested funding). Approved,
used and remaining project funding and utilization are unavailable until their source exists;
never infer expenditure or add ledgers, payments, banking, invoices or ERP integration.
