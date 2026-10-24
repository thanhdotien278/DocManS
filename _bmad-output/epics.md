---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
status: complete
updated: 2026-10-18
changeProposal: "_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-18.md"
inputDocuments:
  - "/Users/Super/DocManS/_bmad-output/prd.md"
  - "/Users/Super/DocManS/_bmad-output/architecture.md"
  - "/Users/Super/DocManS/_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md"
  - "/Users/Super/DocManS/_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md"
  - "/Users/Super/DocManS/phan-quyen-trong-de-tai-khoa-hoc.md"
  - "/Users/Super/DocManS/_bmad-output/project-context.md"
  - "/Users/Super/DocManS/docs/ux-design-guidelines.md"
  - "/Users/Super/DocManS/docs/ux-ui-spec.md"
  - "/Users/Super/DocManS/_bmad-output/epics-and-stories.md"
  - "/Users/Super/DocManS/docs/stories-notes-vi/epics-and-stories.md"
  - "/Users/Super/DocManS/docs/authorization-core-business-baseline.md"
  - "/Users/Super/DocManS/docs/permission-matrix.md"
---

# DocManSystem - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DocManSystem,
decomposing the requirements from the PRD, UX design, architecture, the
approved authorization baseline and permission matrix, and the existing backlog into implementable
stories.

## Authorization Baseline Alignment

`docs/permission-matrix.md` (§7 wins on conflict) and
`docs/authorization-core-business-baseline.md` are binding inputs for every story.
Where an older PRD, architecture, or story statement conflicts, the permission
matrix wins. Every protected action requires backend authorization before detail, list,
search, count, facet, dashboard, export, notification, or file-metadata
disclosure; unresolved context fails closed and important changes are audited.

- Each account has exactly one active system role from the ten roles of matrix §2:
  QT `SYSTEM_ADMIN`; GĐ `LEADERSHIP_APPROVAL_AUTHORITY`; PGĐ-KH
  `SCIENCE_DEPUTY_DIRECTOR`; PGĐ-TD `RESEARCH_OVERSIGHT_AUTHORITY`; TP
  `RESEARCH_MANAGEMENT_HEAD`; PP `RESEARCH_MANAGEMENT_DEPUTY_HEAD`; TB
  `RESEARCH_BOARD_HEAD` (one holder); CV `RESEARCH_MANAGEMENT_STAFF`; NCV
  `RESEARCHER_INTERNAL_USER`; NNB `EXTERNAL_RESEARCHER_USER`. GĐ, PGĐ-KH and
  PGĐ-TD form Ban giám đốc (BGĐ); TP, PP, TB and CV form Phòng KHQS. All PI,
  member, secretary, reviewer, council, IRB/ethics, and task authority remains
  record scoped.
- Rename note (7 → 10 roles, 2026-10-18): `SCIENTIFIC_MANAGEMENT_HEAD` →
  `RESEARCH_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF` →
  `RESEARCH_MANAGEMENT_STAFF`; `RESEARCH_OVERSIGHT_AUTHORITY` now means only the
  other Deputy Directors who monitor and no longer the Science Deputy Director.
  Done and in-flight story text below keeps the old names (see the epic banners).
- Condition superscripts follow matrix §7.2: ¹ = within the user's unit scope;
  ² = submitted-or-later proposals in unit scope; ³ = only records where the CV is
  the current responsible officer; ⁴ = own PI/member participation; ⁵ = when
  assigned as reviewer, council or IRB member; ⁶ = council secretary of that
  record; ⁷ = aggregate only (PGĐ-TD).
- `SYSTEM_ADMIN` manages platform data only: no business-data, review, approval
  or reopen access, no scientific CV, no business dashboard, never a reviewer.
- Proposal creation, submission, and resubmission are owner-only actions of the
  PI (any role except QT/NNB). No proposal-submit delegation or delegated
  capability is supported. Any future delegation remains domain-specific and
  contract-bound.

### Phòng KHQS and BGĐ scope for all epic descriptions and stories

FR6f–FR6g and FR71–FR79 apply to both the delivery-epic summaries and numbered
story backlog below (10-role model, decisions of 18/10/2026):

- **Responsible CV.** Every CV proposal/project operation requires the current
  responsible-officer assignment (³); participation/review access never supplies
  it, and a CV never operates on records assigned to another CV. On
  submit/resubmit the system auto-assigns one responsible CV by segment (mảng =
  level + nature); unmatched records show "Chưa có người phụ trách" for TP. TP¹/TB¹
  assign, reassign or revoke the responsible CV with history; TP assigns segments
  to CV.
- **Phòng KHQS.** Roles configured by QT per council type (default TP¹/TB¹, D-035) form councils and invite reviewers/members; TP¹/TB¹/CV³ synthesize and draft tờ
  trình; completeness and supplement belong to TB¹/CV³ only (never TP). TP and CV
  create/open/close intake periods. PP only monitors (unit scope) and has no step in
  the tờ trình flow, even when TP is absent.
- **Tờ trình routing.** Every BGĐ-bound procedure goes through approval routing:
  CV drafts → TB reviews → TP approves → BGĐ signs. A TB-authored tờ trình starts at
  TP; a TP-authored one still passes TB. Return at any step goes back to the author
  with a mandatory reason; no step skipping; no self-review.
- **Signer rules (matrix §7.4).** GĐ alone approves topic + funding and contract
  liquidation. GĐ or PGĐ-KH signs evaluation/acceptance/IRB council
  establishment, the IRB certificate, project extension and project adjustment
  (including a funding change). A signer cannot be participant, reviewer or council
  member on the same record. PGĐ-TD only monitors with aggregate funding (⁷).
- **Project view.** GĐ, PGĐ-KH, TP and TB see every project in the Academy; TP and
  TB manage funding Academy-wide; proposals always follow unit scope.
- **Reviewers.** Reviewer/council/IRB duty is invited from any account with a
  scientific CV (every role except QT); invitees accept or decline.
- **Two-way anonymity.** PI and reviewers never see the record's action log;
  TB¹/TP¹ may see reviewer identity.
- **Decisions of 18/10/2026 (matrix §7.3).** The assigned CV³ approves
  post-submission withdraw/edit requests and reopens with a mandatory reason;
  TB¹/TP¹ decide duplicate researcher-profile merges; if no eligible TB/TP step
  actor or conflict-free signer exists for an adjustment/extension, the PI
  withdraws the request. Funding stays audited metadata only (no ledger, payment,
  banking or ERP). Account activation uses a 48-hour single-use setup-password
  link.

| Requirement | Owning existing stories |
| --- | --- |
| FR6f: roles, management lifecycle, one responsible CV, audited assignment | 1.4, 1.7–1.9, 1.11; proposal integration 4.2/4.7/5.1; project integration 6.1–6.2 |
| FR6g: independent access basis, bidirectional/action-time conflict, surface parity | 1.7–1.9, 2.4, 3.1–3.6, 4–7, 10.5–10.8, 11.1–11.6, 12.1–12.6 |
| FR45a: TP/TB oversight, responsible-CV filters, unassigned and workload/status/deadlines | Dashboard delivery Epic 8, reporting delivery Epic 9; Stories 12.1–12.6 |
| FR71: approval routing | 5.9; consumers 5.10, 6.11, 6.12, 10.7–10.8 |
| FR72: segments and responsible-CV auto-assignment | 1.12, 4.7 |
| FR73: BGĐ signatures | 5.10, 6.11, 10.8 |
| FR74: funding metadata and liquidation | 6.12, 12.6 |
| FR75: duplicate profile merge | 2.7 |
| FR76: post-submission withdraw/edit/reopen | 4.8 |
| FR77: two-way anonymity | 3.6 |
| FR78: per-role work queues | 11.6 |
| FR79: setup-password activation link | Covered by 2.1 (review), 2.2 (ready-for-dev) and the Researcher Profile completion section; no new story |

The ten-role registry and the 7 → 10 account migration are Story 1.11 (codes and the HEAD/STAFF rename already delivered by commit 0a39db3). Proposal
officer history is source-owned; no generic ACL is introduced. Records with no
segment match stay unassigned until TP/TB assigns a CV.

## Requirements Inventory

### Functional Requirements

- FR1: System administrators can create, update, activate, deactivate, and lock user accounts.
- FR2: System administrators can assign exactly one active account-level system role from the ten roles of the permission matrix §2 (`SYSTEM_ADMIN` QT, `LEADERSHIP_APPROVAL_AUTHORITY` GĐ, `SCIENCE_DEPUTY_DIRECTOR` PGĐ-KH, `RESEARCH_OVERSIGHT_AUTHORITY` PGĐ-TD, `RESEARCH_MANAGEMENT_HEAD` TP, `RESEARCH_MANAGEMENT_DEPUTY_HEAD` PP, `RESEARCH_BOARD_HEAD` TB, `RESEARCH_MANAGEMENT_STAFF` CV, `RESEARCHER_INTERNAL_USER` NCV, `EXTERNAL_RESEARCHER_USER` NNB) to a user; owner-derived PI, `TOPIC_SECRETARY`, `TOPIC_MEMBER`, reviewer, council member, and IRB/ethics member permissions are assigned through record-scoped relationships or assignments instead of additional global roles. Reviewer, council and IRB duty is invited from any account with a scientific CV (every role except QT).
- FR3: System administrators can associate users with an organizational unit and other scope-defining organizational attributes.
- FR4: The system can authenticate users and establish a role-aware session for authorized access.
- FR4a: Authenticated users can change their own password, and authorized administrators can initiate a controlled password reset flow for internal users.
- FR5: The system can enforce role-based access rules across all protected capabilities.
- FR6: The system can enforce explicit organization-scope or unit-scope access rules across proposals, projects, seminars, student research activities, councils, ethics dossiers, related documents, tasks, files, dashboards, and reports; approved projects are visible Academy-wide to GĐ, PGĐ-KH, TP and TB, while proposals always follow unit scope; CV operations require an effective record-level responsible-officer assignment. Parent/child units never imply scope.
- FR6f: Distinguish Phòng KHQS coordination from CV record operations. GĐ, PGĐ-KH, TP and TB view every project in the Academy; proposals stay unit-scoped (TP/TB/PP/PGĐ-TD¹, GĐ/PGĐ-KH²). CV needs an effective `PROPOSAL_MANAGEMENT_OFFICER` or `PROJECT_MANAGEMENT_OFFICER` on the exact record. Each record has at most one active responsible CV; TP¹/TB¹ assignment, reassignment and revocation (and segment auto-assignment) preserve history and audit, including concurrent changes. PP and PGĐ-TD are read-only (PGĐ-TD aggregate funding only). Project adjustment and extension decisions follow FR28 (CV appraisal → routing → GĐ or PGĐ-KH signature); no Phòng KHQS role decides them.
- FR6g: Preserve independent PI/member/secretary/reviewer/council/task access for Phòng KHQS and BGĐ accounts on other records without management actions. Backend capabilities identify the access basis. On one record the responsible officer, reviewer, council member, tờ trình reviewer/approver and final signer are mutually exclusive with participation (PI/member/secretary) and with each other where the matrix §8 closing rule says so; deny reviewer + final decision in the same round and mutually exclusive council positions; check every relationship creation/change and protected action. Apply the same authorization/disclosure to list, detail, search, counts/facets, dashboards, reports/export, notifications, files and workflow/business history.
- FR6a: The system can distinguish account-level system roles from record-scoped relationships or assignments, including owner-derived PI, `TOPIC_SECRETARY`, `TOPIC_MEMBER`, reviewer, council member, and ethics reviewer, so those relationships only grant permissions within the specific proposal, approved topic, council, review, ethics dossier, task, or related record context.
- FR6b: Proposal creation, submission, and resubmission require the current owner-derived PI, who may hold any system role except `SYSTEM_ADMIN` (QT) and `EXTERNAL_RESEARCHER_USER` (NNB); NNB can never be PI; no proposal-submit delegation or delegated capability is supported.
- FR6c: Protected record responses can state the current user's record-scoped relationships, allowed actions, blocked actions, and plain-language denial reasons as calculated by backend authorization policy.
- FR6d: A record-scoped `TOPIC_SECRETARY` can perform only the explicitly authorized administrative, meeting, minutes, document, task, tracking, and draft-summary actions for the assigned proposal, approved topic, council, or ethics record; the secretary relationship alone never grants reviewer scoring or final approval/rejection authority.
- FR6e: Proposal participation, project participation, council membership, reviewer assignment, task assignment, and ethics assignment relationships can be activated, suspended, ended, or revoked with effective dates and status, and an inactive relationship immediately stops granting access or capabilities.
- FR7: System administrators can manage shared catalogs required by business workflows, including organizational units, research fields, proposal types, statuses, priorities, report types, product types, forms, checklists, and scoring criteria.
- FR8: System administrators can configure system parameters, notification templates, and selected workflow-supporting settings required for phase 1 operations.
- FR9: TP and CV can create, open, close and manage proposal intake periods with dates, required submission packages, and either Academy-wide scope (the default) or an explicit selected-unit scope; open periods are visible to every role except QT and NNB.
- FR10: A PI (any role except QT/NNB) with applicable unit scope can create a proposal draft, save progress, and submit a proposal formally within an applicable intake period; external researchers (NNB) cannot see intake periods or create or submit proposals.
- FR11: Principal investigators can enter structured proposal information including title, field, host unit, participants, timeline, objectives, content summary, and proposed budget metadata.
- FR12: Principal investigators can upload required proposal attachments and supporting documents to a proposal record.
- FR13: The system can validate required proposal data and required file conditions before formal submission.
- FR14: The system can record immutable proposal submission history, including timestamps, submission state changes, PI actor context, and locked versions; post-submission edits, withdrawal, and reopening use explicit requests/actions rather than overwriting a submitted version; the PI's post-submission withdraw/edit requests are approved or rejected by the assigned CV³, and reopen is a CV³ action with a mandatory reason (FR76).
- FR15: TB¹ or the assigned CV³ can review proposal completeness once per submitted/resubmitted version and request supplements with a stated reason and whole-calendar-day due date; repeat completeness confirmation for the current version is denied; TP never performs completeness or supplement actions.
- FR16: Principal investigators can view supplement requests, revise proposal content or attachments, and resubmit the proposal.
- FR17: TP¹, TB¹ or the assigned CV³ can invite, assign, revoke or replace eligible active proposal reviewers/council members, with a conflict check, after current-submission completeness is confirmed. Candidates are any active account with a scientific CV (every role except QT) that is not a participant on the record; self-assignment is denied. Invitees must accept or decline (decline with a reason). Preserve optional profile provenance, current-account/context validation, compatibility, lifecycle, immutable audit/history and disclosure.
- FR18: Reviewers and council members who accepted their invitation can access assigned proposals and submit scores, comments, and recommendations; before acceptance they see only title, role, deadline and inviter; council members read the dossier only after BGĐ signs the council establishment; every invited role scores.
- FR19: TP¹, TB¹ or the assigned CV³ can monitor named assignments, deadlines, pending/overdue work and backend-derived completion/blockers, and conflict-free create, update and finalize the synthesis after all required reviews are complete; the council secretary of the record drafts synthesis/minutes without scoring.
- FR19a: A finalized current review/synthesis package is submitted for decision only through approval routing (FR71: drafted → TB → TP → GĐ). Draft save and finalization alone do not route the proposal; no Phòng KHQS role has final approve/reject authority.
- FR20: GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`) alone can review the routed proposal history, evaluation outputs, and supporting files before deciding topic and funding together.
- FR21: GĐ alone can approve or reject a proposal (topic and funding together) after the routed package has passed `HEAD_REVIEW`; PGĐ-KH, PGĐ-TD, Phòng KHQS roles, QT and reviewers have no topic decision.
- FR22: The system can treat proposal statuses as controlled states and restrict actions based on current proposal state.
- FR23: The system can create an approved-project record from an approved proposal while preserving relevant source data.
- FR24: The assigned project CV³ and independently authorized project participants can define and maintain project milestones and planned reporting checkpoints.
- FR25: Principal investigators can submit periodic progress reports and supporting evidence for approved projects.
- FR26: The assigned project CV³ (current project management officer) can review project progress reports, request follow-up where needed, and track unresolved issues.
- FR27: Principal investigators can submit adjustment or extension requests for approved projects.
- FR27a: Principal investigators can prepare and submit acceptance or final-review dossiers with required structured data, files, and readiness validation when the approved-project workflow requires a formal dossier before the authority decision.
- FR28: The assigned project CV³ appraises Project Adjustment (typed milestone/scope-plan/membership change, with or without a funding change) and Project Extension requests and drafts the tờ trình; it passes approval routing (TB → TP) and GĐ or PGĐ-KH signs; the signature applies the change atomically. No Phòng KHQS role decides either request type. If no eligible TB/TP step actor or conflict-free signer exists, the PI withdraws the request. Acceptance council establishment is signed by GĐ or PGĐ-KH.
- FR29: The system can identify delayed projects, upcoming deadlines, and projects waiting for administrative action.
- FR30: The system can treat approved-project workflow states as controlled states and restrict actions based on current project state.
- FR30a: Project members can view approved projects they participate in, including assigned responsibilities, relevant milestones, and permitted supporting files.
- FR30b: Project members can upload permitted contribution files or evidence within the scope granted to them for an approved project.
- FR31: Authorized users can create tasks that are standalone or linked to proposals, approved projects, reports, meetings, or workflow events.
- FR32: Authorized users can assign task ownership, collaborators, due dates, priorities, and descriptive instructions.
- FR33: Task assignees and authorized users can update task status, progress, notes, and completion evidence.
- FR34: The system can identify and surface overdue tasks and upcoming due tasks.
- FR35: The system can treat relevant task statuses as controlled workflow states where business rules depend on them.
- FR36: Authorized users can upload, replace, view, and download files attached to business records according to permission rules.
- FR37: The system can preserve file metadata including uploader, timestamp, related record, and other traceability context required for business use.
- FR38: The system can present workflow history and business-record history for proposals, projects, seminars, student research activities, councils, ethics dossiers, related documents, tasks, and related decisions.
- FR39: The system can create audit-log records for critical business actions defined by this PRD.
- FR40: Authorized administrators and authorized business users can inspect audit or history information appropriate to their responsibilities and permissions.
- FR41: The system can create in-app notifications for important business events such as assignment, supplement request, approval request, state change, and deadline-related events.
- FR42: The system can send email notifications for important business events and reminders defined in phase 1 scope.
- FR43: The system can generate reminders for approaching deadlines, overdue reports, overdue tasks, and pending workflow actions.
- FR44: The system can present user-specific work queues showing items waiting for the current user's attention.
- FR45: Every role except QT can access a per-role dashboard (GĐ/PGĐ-KH authority dashboards; TP, PP, TB and CV scoped dashboards; PGĐ-TD aggregate only, with per-record funding columns empty; researchers their own dashboard) showing waiting approvals/signatures, delayed projects, overdue tasks, council or IRB queues, seminar or student research milestones, document status gaps, upcoming reports, and summary indicators within authorized scope; filters include year, unit, level, field and nature (Quân sự / Dân sự / Chưa phân loại).
- FR46: Users can search and filter proposals, projects, seminar records, student research records, council records, document records, tasks, and reports by relevant business attributes such as code, title, unit, field, status, assignee, due date, and intake period.
- FR45a: TP and TB can identify each proposal/project's current responsible CV or unassigned state ("Chưa có người phụ trách"), filter/group by responsible CV with an "unassigned" group, and monitor workload, status and deadlines within authorized scope. CV management dashboards/reports contain only their assigned records; participation/review queues remain separately authorized. Counts, drill-down and exports use the same filters and access basis.
- FR47: The system can provide traceable detail views that connect dashboard indicators and list results to the underlying workflow records.
- FR48: Authorized users can export designated lists and reports to Excel or PDF according to business needs and permission rules.
- FR49: The system can produce role-scoped reporting views and summary outputs by unit, field, status, reporting period, module type, and related administrative dimensions.
- FR50: Student research (đề tài sinh viên NCKH) follows matrix §9.6: CV and NCV register a topic as supervising lecturer; CV¹ approves it. Seminar records keep the existing rule: scientific management staff (CV) can create or import approved seminar records with responsible unit, participants, schedule, scope, and source decision metadata (seminar permissions are an open question).
- FR51: CV¹ manages approved student research activities, and CV maintains approved seminars: plans, related documents, milestones, and administrative notes.
- FR52: CV¹ (student research) and authorized users (seminar) can record adjustment requests, budget metadata, products, and outcomes for seminars and student research activities.
- FR53: The system can treat seminar and student research statuses as controlled states, expose role-scoped lists, and preserve history for important changes; CV¹ completes student research.
- FR54: Authorized users can register governing, legal, planning, proposal, project, seminar, council, and other related documents with document type, issuing authority, code, date, effective status, and metadata.
- FR55: Authorized users can link related documents to proposals, approved projects, seminars, student research activities, councils, ethics dossiers, tasks, and reports.
- FR56: The system can preserve version or replacement history for important related documents and distinguish current, expired, superseded, and archived document states.
- FR57: The system can provide role-scoped search, filtering, and retrieval of related documents without exposing file metadata or document content outside authorized scope.
- FR58: TP¹, TB¹ or the assigned CV³ can set up evaluation, acceptance and IRB (ethics) councils with purpose, schedule, member roles, related legal documents, and linked business records; members are invited from any account with a scientific CV except QT and must accept; a council tờ trình is routed only after every member accepts, and GĐ or PGĐ-KH signs the establishment.
- FR59: Principal investigators or the assigned CV³ can create, complete, and submit IRB (ethics) dossiers with required structured data and attachments.
- FR60: TB¹ or the assigned CV³ can review IRB dossier completeness, request supplements, and track resubmissions.
- FR61: Council members, IRB members or assigned reviewers who accepted can access assigned IRB dossiers or council records and submit scores, comments, and recommendations; the IRB/council secretary drafts the conclusion/minutes without scoring.
- FR62: TP¹, TB¹ or the assigned CV³ can monitor council review progress, consolidate evaluation outcomes, and route the IRB conclusion or council result through approval routing (FR71).
- FR63: GĐ or PGĐ-KH signs council establishment (evaluation, acceptance, IRB) and the IRB certificate after routing; a signer cannot be a participant, reviewer or council member on the record.
- FR64: The system can treat council and IRB workflow statuses as controlled states with role-scoped dashboards, reports, history, notifications, and audit logs.
- FR65: QT (platform scope) and TP¹/CV¹ (unit scope) can create and maintain researcher profiles with identity, academic rank or degree, title, contact details, organization, research fields, expertise keywords, and active status.
- FR66: QT and TP¹/CV¹ can link researcher profiles to user accounts where applicable while still allowing profile records for researchers who do not yet have system login accounts.
- FR67: Authorized users can associate researcher profiles with proposals, approved projects, seminars, student research activities, councils, ethics dossiers, reviews, publications, products, and tasks where relevant.
- FR67a: The system enforces record/evaluation-context conflict, separation-of-duty and multiplicity policy in preflight and every authoritative assignment/decision mutation; the authorization baseline owns the compatibility matrix and stable reasons.
- FR68: Users can search and filter researcher profiles by name, unit, field, expertise, status, participation history, and other authorized business attributes.
- FR69: The system can preserve researcher profile history and audit important profile changes according to role and data-scope permissions.
- FR70: Researchers can maintain a scientific CV (Lý lịch khoa học, form BM-06) on their researcher profile — general info, education, work history, research experience — validated server-side, with sensitive fields protected, and can view/print it in Vietnamese and English; authorized scoped managers can view it.
- FR71: The system routes every BGĐ-bound procedure (8 kinds: evaluation council, decision package, IRB council, IRB certificate, acceptance council, project extension, project adjustment, liquidation) through approval routing with a signer per kind (matrix §7.4): CV drafts → TB review → TP approval → BGĐ signature. Any step can return the submission to its author with a mandatory reason. No step skipping and no self-review; a TB-authored submission starts at TP. One open submission per kind and subject.
- FR72: TP assigns segments (mảng = level + nature) to CV. On submit/resubmit the system auto-assigns one responsible CV: the more specific segment match first, then the CV with fewer active records; unmatched records show "Chưa có người phụ trách". TP/TB assign, reassign and revoke the responsible CV, keeping history.
- FR73: BGĐ signatures: GĐ or PGĐ-KH signs councils (evaluation, IRB, acceptance), the IRB certificate, project extension and project adjustment; GĐ alone signs topic + funding and liquidation. A signer cannot be a participant or reviewer on the record.
- FR74: Funding is recorded as audited metadata (allocation, disbursement and settlement figures plus documents; no ledger, payments, banking or ERP). View: GĐ/PGĐ-KH/TP/TB all; CV assigned; PP and PI/members own participation; PGĐ-TD aggregate only. Manage: GĐ, and TP/TB Academy-wide; CV assigned. Liquidation: CV drafts → routing → GĐ signs.
- FR75: A duplicate researcher-profile warning (raised by QT, TP or CV) is notified to TB/TP, who decide the merge; history is kept.
- FR76: Post-submission withdraw/edit requests are approved or rejected, and reopen is performed, by the assigned CV, with a mandatory reason and audit.
- FR77: Two-way anonymity: the PI and reviewers see no action log of the record; TB/TP may see reviewer identity.
- FR78: Per-role work queues (matrix §9.10): TB review queue, TP approval queue, CV assigned records, GĐ decision/signature queue, PGĐ-KH signature queue, reviewer invitations. QT has none.
- FR79: Accounts are activated by a 48-hour single-use setup-password link; no temporary password is generated or sent.

### NonFunctional Requirements

- NFR1: Standard authenticated list views, detail pages, and common workflow actions return user-visible results within 2 seconds for at least 95 percent of measured requests under normal phase 1 conditions.
- NFR2: Dashboard views present core widgets and counts within 3 seconds for at least 95 percent of measured requests under normal phase 1 conditions.
- NFR3: Search and filter interactions on primary administrative lists complete within 2 seconds for at least 95 percent of measured requests under normal phase 1 conditions.
- NFR4: Exports, reminder batches, and derived reporting workloads provide queued/progress/completion feedback and do not block normal interactive requests.
- NFR5: All authenticated traffic requires encrypted transport in deployment environments.
- NFR6: Passwords, activation tokens and session secrets are never persisted in plaintext or returned in ordinary application responses. Researcher account activation emails carry only single-use setup links, never temporary passwords.
- NFR7: Backend authorization protects dashboards, reports, search, exports, workflow actions, files, and history with allowed and denied tests.
- NFR8: Authorization fails closed when scope, participation, assignment, conflict, delegation, or state context cannot be resolved safely.
- NFR9: Critical-action audit logs are queryable by authorized users or operational support tooling.
- NFR10: Critical workflow actions complete atomically or fail without partial business-state persistence.
- NFR11: Reminder, notification, and background flows are safe to retry and avoid duplicate business outcomes.
- NFR12: Important business records support soft delete where product rules require recoverability and traceability.
- NFR13: Every schema change is versioned and validated through a Prisma migration.
- NFR14: Core phase 1 workflows meet WCAG AA expectations for labels, focus, keyboard navigation, status communication, and errors.
- NFR15: Responsive versions of core workflows preserve accessibility on desktop, mobile, and tablet.
- NFR16: Status communication never depends on color alone and includes text or icon reinforcement.
- NFR17: The solution preserves modular-monolith boundaries with separable business modules.
- NFR18: Business logic remains in backend services rather than controllers or frontend-only flows.
- NFR19: New code maintains TypeScript strictness, explicit DTO validation, and clear domain naming.
- NFR20: New functionality supports story-sized testing, review, and rollback without unrelated refactoring.

### Additional Requirements

- AR1: Treat the authorization architecture as the adopted target, not as current implementation; complete the brownfield migration before dependent permission work.
- AR2: Migrate legacy global PI/reviewer/council roles and multi-role session/data shapes to one active system role plus typed record relationships without allowing old and new policies to grant in parallel.
- AR3: Consolidate existing API and proposal permission seams into one shared backend policy; do not build a parallel authorization engine.
- AR4: Implement the normative `AuthorizationContextV1`, `PermissionActionV1`, `AuthorizationDecisionCodeV1`, `ViewerAuthorizationV1`, `ContextVersionTokenV1`, `PersonalWorkEntryV1`, `AuthorizationJobEnvelopeV1`, and `AuthorizationAuditV1` contracts in `packages/permissions`.
- AR5: Use one database-server UTC `asOf` per protected request and half-open relationship/delegation intervals; preserve immutable lifecycle history and deterministic revocation behavior.
- AR6: Apply the canonical denial order and distinguish resolved-empty/not-applicable from unresolved, stale, ambiguous, version-mismatch, and unknown-contract contexts.
- AR7: Re-authorize and mutate atomically in the owning service or validate all context-version tokens in the mutation transaction.
- AR8: When a future domain contract permits delegation, restrict it to one target record, exact registered actions, active source authority, organization intersection, current-holder initiation, independent staff approval, no self-approval, no wildcards, and no chains; proposal create/submit/resubmit remain excluded.
- AR9: Apply the V1 non-delegable registry to reviewer/council assignment, scoring/evaluation submission, membership changes, disclosure, delegation approval, business approval/rejection, and final decisions.
- AR10: Apply the binding review-disclosure matrix consistently to APIs, lists, details, files, exports, notifications, search, dashboards, and history.
- AR11: Build researcher participation history and personal work as authorized query-on-read aggregations; source domains remain authoritative and any enabled-source failure fails the whole aggregation.
- AR12: Keep conflict-blocked personal-work items visible but non-actionable with only the permitted V1 fields; exclude them from actionable counts and never disclose hidden assignments or conflict sources.
- AR13: Background jobs use the V1 service-principal/on-behalf-of envelope and re-authorize current authority before protected effects; idempotency and cancellation are testable.
- AR14: A source domain is integration-ready only after its relationship/state resolver, authorized query contract, mutation re-authorization, disclosure behavior, and canonical producer/consumer fixtures pass.
- AR15: Preserve the phase 1 modular monolith, Next.js/NestJS/TypeScript/PostgreSQL/Prisma/Redis/MinIO/Docker Compose/Nginx stack and explicit domain boundaries; do not introduce microservices, Kubernetes, external IdP, or search-engine infrastructure.
- AR16: All important file operations go through the shared files module, store metadata in PostgreSQL and binary data in MinIO, re-check permission on every access, and audit important actions.
- AR17: Controlled workflow transitions execute through named backend application actions with authorization, validation, persistence, audit, and notification hooks.
- AR18: Shared authorization depends on domain fact-provider ports and shared contracts, never domain persistence; architecture tests enforce dependency direction.
- AR19: Protected jobs, exports, notifications, dashboard/report queries, search, and files inherit the same environment-independent policy, audit, disclosure, and fail-closed behavior.
- AR20: Every story that changes authorization, audit, files, state, notifications, exports, responsive UX, or accessibility includes scoped automated tests or explicit reliable verification.

### UX Design Requirements

- UX-DR1: Use an official institutional admin visual system with dark green `#145A37`, dark navigation `#0F3F2A`, white/light gray-green surfaces, restrained gold accent, small-radius panels, and no heavy gradient, glassmorphism, decorative hero, carousel, emoji icon, or unnecessary ceremonial imagery.
- UX-DR2: Use desktop sidebar navigation, a topbar with search/notifications/account context, breadcrumbs on detail screens, and compact drawer/navigation behavior on mobile/tablet.
- UX-DR3: Design and verify primary screens at 360, 390, 430, 768, 1024, and 1440 pixels without full-page horizontal scrolling.
- UX-DR4: Use full data tables on desktop, reduced-column tables on tablet, and card lists or contained horizontal scrolling on mobile while preserving identifier, status, deadline, responsibility, and primary action.
- UX-DR5: Long forms use clear sections, inline validation, explicit required fields, confirmation for consequential actions, loading/success/error states, and a mobile sticky action bar where needed.
- UX-DR6: Statuses use consistent text badges and optional icons in addition to color; loading, empty, success, and error states are first-class.
- UX-DR7: Permission-sensitive UI consumes backend capability data, displays every security-relevant record relationship without “highest role” inference, and never treats the system role as the role on the current record.
- UX-DR8: Conflict-blocked actions remain visible and disabled with the backend denial reason; conflicted work is excluded from actionable counts but remains visible in the defined blocked presentation.
- UX-DR9: Provide one unified workspace with no global role switcher; navigation follows the system role while record actions follow the current record relationships.
- UX-DR10: Provide an always-available “Của tôi” area covering records led by the user, records participated in, and work awaiting action, with role labels, state, deadline, and contextual action.
- UX-DR11: Dashboards prioritize immediate work, pending checks/approvals, delayed or risky projects, overdue tasks, and scoped summary indicators; every card links to the authorized filtered records behind its count.
- UX-DR12: Detail screens show current workflow state, next action, timeline/history, actor and change context, related comments/files/decisions, and the viewer's record relationships near the top.
- UX-DR13: File components show name, type, size, uploader, upload time, version/replacement history, progress/error/retry, and only capability-authorized download/replace/delete actions.
- UX-DR14: Search and lists expose clear active filters, quick removal, relevant business filters/sorts, and breadcrumb/direct return paths without leaking unauthorized rows or counts.
- UX-DR15: Core flows meet WCAG AA with labels/accessibility names, semantic controls, visible focus, keyboard reachability, `aria-live` feedback, paste support, reduced motion, and touch targets near 44px.
- UX-DR16: Use one consistent icon set such as Lucide or Heroicons and practical sans-serif typography aligned with the academy website where available.
- UX-DR17: Apply the review-disclosure matrix to all visible fields, files, summaries, exports, notifications, dashboards, search, and history; hidden internal review data is omitted rather than represented by revealing placeholders.
- UX-DR18: Treat the older UX sentence that requested only the “highest” relationship as superseded; the PRD and architecture require all security-relevant relationships to remain visible and independently evaluated.

### FR Coverage Map

- FR1: Epic 1 — Quản trị vòng đời tài khoản.
- FR2: Epic 1 — Một trong mười vai trò hệ thống và vai trò nghiệp vụ theo hồ sơ (Story 1.11).
- FR3: Epic 1 — Phạm vi tổ chức của tài khoản.
- FR4: Epic 1 — Đăng nhập và phiên làm việc.
- FR4a: Epic 1 — Đổi và đặt lại mật khẩu.
- FR5: Epic 1 — Phân quyền backend cho năng lực được bảo vệ.
- FR6: Epic 1 — Phạm vi đơn vị/tổ chức.
- FR6a: Epic 1 — Quan hệ nghiệp vụ theo từng hồ sơ.
- FR6b: Epic 1 — Chỉ PI (mọi vai trò trừ QT/NNB) được tạo, nộp và nộp lại đề xuất; không ủy quyền.
- FR6c: Epic 1 — Capability response từ backend.
- FR6d: Epic 1 — Năng lực và giới hạn của thư ký khoa học.
- FR6e: Epic 1 — Vòng đời quan hệ tham gia/phân công.
- FR7: Epic 1 — Danh mục dùng chung.
- FR8: Epic 1 — Tham số và cấu hình hỗ trợ vận hành.
- FR9: Epic 4 — Đợt tiếp nhận đề xuất.
- FR10: Epic 4 — Lập nháp và nộp đề xuất.
- FR11: Epic 4 — Thông tin cấu trúc của đề xuất.
- FR12: Epic 4 — Tệp đề xuất.
- FR13: Epic 4 — Kiểm tra sẵn sàng trước khi nộp.
- FR14: Epic 4 — Lịch sử nộp.
- FR15: Epic 5 — Kiểm tra tính đầy đủ và yêu cầu bổ sung.
- FR16: Epic 5 — Chỉnh sửa và nộp lại.
- FR17: Epic 5 — Phân công người đánh giá (Story 5.11; người mời vào hội đồng theo cấu hình QT, mặc định TP¹/TB¹ — D-035, Story 10.1/10.5).
- FR18: Epic 5 — Chấm điểm, nhận xét và kiến nghị.
- FR19: Epic 5 — Theo dõi và tổng hợp đánh giá.
- FR19a: Epic 5, Stories 5.5 và 5.9 — Trình hồ sơ đã tổng hợp qua luồng tờ trình tới GĐ.
- FR20: Epic 5 — Hồ sơ trình GĐ quyết định.
- FR21: Epic 5 — GĐ phê duyệt hoặc từ chối đề tài và kinh phí.
- FR22: Epic 5 — Máy trạng thái đề xuất.
- FR23: Epic 6 — Chuyển đề xuất được duyệt thành đề tài.
- FR24: Epic 6 — Mốc tiến độ và kỳ báo cáo.
- FR25: Epic 6 — Báo cáo tiến độ của chủ nhiệm.
- FR26: Epic 6 — Kiểm tra báo cáo và theo dõi tồn đọng.
- FR27: Epic 6 — Điều chỉnh và gia hạn.
- FR27a: Epic 6 — Hồ sơ nghiệm thu/đánh giá cuối.
- FR28: Epic 6 — Thẩm định điều chỉnh/gia hạn qua tờ trình, GĐ hoặc PGĐ-KH ký; nghiệm thu và đánh giá cuối.
- FR29: Epic 6 — Phát hiện chậm tiến độ và việc chờ xử lý.
- FR30: Epic 6 — Máy trạng thái đề tài.
- FR30a: Epic 6 — Phạm vi xem của thành viên đề tài.
- FR30b: Epic 6 — Tệp đóng góp của thành viên.
- FR31: Epic 7 — Tạo công việc độc lập hoặc liên kết.
- FR32: Epic 7 — Giao việc, cộng tác, hạn và ưu tiên.
- FR33: Epic 7 — Cập nhật tiến độ, trạng thái và minh chứng.
- FR34: Epic 7 — Việc sắp đến hạn và quá hạn.
- FR35: Epic 7 — Máy trạng thái công việc.
- FR36: Epic 3 — Tải lên, thay thế, xem và tải xuống tệp.
- FR37: Epic 3 — Metadata và khả năng truy vết tệp.
- FR38: Epic 3 — Lịch sử workflow và hồ sơ nghiệp vụ.
- FR39: Epic 3 — Ghi audit cho hành động quan trọng.
- FR40: Epic 3 — Tra cứu audit/lịch sử theo quyền.
- FR41: Epic 11 — Thông báo trong ứng dụng.
- FR42: Epic 11 — Thông báo email.
- FR43: Epic 11 — Nhắc hạn và việc tồn đọng.
- FR44: Epic 11 — Hàng đợi công việc cá nhân.
- FR45: Epic 12 — Dashboard theo vai trò và phạm vi (Story 12.6 cho PP, PGĐ-TD).
- FR46: Epic 12 — Tìm kiếm và lọc đa phân hệ.
- FR47: Epic 12 — Drill-down truy vết về hồ sơ nguồn.
- FR48: Epic 12 — Xuất Excel/PDF theo quyền.
- FR49: Epic 12 — Báo cáo tổng hợp theo phạm vi.
- FR50: Epic 8 — Tạo/nhập seminar; đăng ký đề tài sinh viên NCKH (Story 8.6).
- FR51: Epic 8 — Kế hoạch, văn bản, mốc và ghi chú.
- FR52: Epic 8 — Điều chỉnh, kinh phí, sản phẩm và kết quả.
- FR53: Epic 8 — Trạng thái, danh sách và lịch sử.
- FR54: Epic 9 — Đăng ký văn bản liên quan.
- FR55: Epic 9 — Liên kết văn bản với hồ sơ nghiệp vụ.
- FR56: Epic 9 — Phiên bản, thay thế và hiệu lực văn bản.
- FR57: Epic 9 — Tìm kiếm/truy xuất văn bản theo quyền.
- FR58: Epic 10 — Kế hoạch hội đồng và vai trò thành viên.
- FR59: Epic 10 — Lập và nộp hồ sơ đạo đức.
- FR60: Epic 10 — Kiểm tra và yêu cầu bổ sung hồ sơ đạo đức.
- FR61: Epic 10 — Đánh giá hội đồng/đạo đức được phân công.
- FR62: Epic 10 — Theo dõi, tổng hợp và trình phê duyệt.
- FR63: Epic 10 — Quyết định hội đồng/đạo đức.
- FR64: Epic 10 — Trạng thái, dashboard, báo cáo, lịch sử và thông báo.
- FR65: Epic 2 — Hồ sơ nhà khoa học (QT/TP¹/CV¹; Story 2.8).
- FR66: Epic 2 — Liên kết hồ sơ với tài khoản.
- FR67: Epic 2 — Liên kết tham gia với hồ sơ nghiệp vụ.
- FR67a: Epic 2 — Xung đột lợi ích và phân tách nhiệm vụ.
- FR68: Epic 2 — Tìm kiếm hồ sơ nhà khoa học.
- FR69: Epic 2 — Lịch sử và audit hồ sơ nhà khoa học.
- FR70: Epic 13 — Lý lịch khoa học (BM-06).
- FR71: Epic 5, Story 5.9 — Luồng tờ trình CV → TB → TP → BGĐ cho 8 loại thủ tục.
- FR72: Epic 1, Story 1.12; Epic 4, Story 4.7 — Phân mảng và tự động giao CV phụ trách.
- FR73: Epic 5, Story 5.10; Epic 6, Story 6.11; Epic 10, Story 10.8 — Chữ ký BGĐ theo loại thủ tục.
- FR74: Epic 6, Story 6.12; Epic 12, Story 12.6 — Kinh phí dạng metadata có audit và thanh lý.
- FR75: Epic 2, Story 2.7 — Cảnh báo hồ sơ trùng và TB/TP quyết định gộp.
- FR76: Epic 4, Story 4.8 — Rút, sửa sau nộp và mở lại do CV phụ trách.
- FR77: Epic 3, Story 3.6 — Ẩn danh hai chiều và danh tính reviewer cho TB/TP.
- FR78: Epic 11, Story 11.6 — Hàng đợi công việc theo vai trò.
- FR79: Epic 2, Stories 2.1–2.2 — Kích hoạt tài khoản bằng link đặt mật khẩu 48 giờ (đã có; không thêm story).

## Canonical UX/UI Delivery Epics

This section is the implementation-ready delivery view derived from
`docs/ux-ui-spec.md`. The repository has no root `epics.md`; therefore this
file remains the canonical planning location. The original 12-Epic FR/story
decomposition is retained below as a traceability source and is not removed.

### Delivery rules

- Priority labels are `[MVP]`, `[Should have]`, and `[Later / non-MVP]`.
- Every protected read, list, count, facet, dashboard, search, export,
  notification, history, and file operation is backend-authorized. The UI
  consumes `ViewerAuthorizationV1`, keeps `contextVersion`, and never infers a
  transition or a "highest" record role.
- Workflow mutations are named backend operations with validation, atomic
  authorization/context checks, audit, and notification hooks where required.
- PostgreSQL is the source of truth. Background reminders use the existing
  PostgreSQL-backed Scheduled Job / Background Worker; no Redis task is added.
- Every screen task below includes loading, empty/no-match, error, forbidden,
  blocked-with-reason, stale-context, success, and locked/read-only behavior as
  applicable. Hidden data is omitted rather than returned as placeholders.

### Consolidation and scope-preservation map

| Canonical epic | Existing backlog retained | Delivery intent |
| --- | --- | --- |
| 1. Foundation, authentication, app shell, navigation | Epic 1 stories 1.1-1.2, 1.5, 1.8 | Establish one authenticated responsive workspace and route boundary. |
| 2. User, role, organization, catalog administration | Epic 1 stories 1.3-1.9, 1.11-1.12; Epic 2 stories 2.1-2.8 | Keep account, ten system roles and the 7 → 10 account migration, scope, segments, researcher profiles and duplicate merge, relationships, conflicts, and catalogs. |
| 3. Proposal / research topic management | Epic 4 stories 4.1-4.8 | Convert intake, draft, structured form, files, readiness, submit, resubmit, responsible-CV auto-assignment and post-submission withdraw/edit/reopen into UX-backed delivery slices. |
| 4. Review, evaluation, aggregation, approval | Epic 5 stories 5.1-5.11 | Preserve supplement, reviewer assignment, evaluation, aggregation, approval routing (tờ trình), BGĐ signature, GĐ decision, disclosure, and state controls. |
| 5. Project tracking after approval | Epic 6 stories 6.1-6.12 | Preserve explicit project creation, milestones, reports, adjustment/extension through routing, acceptance, funding metadata and liquidation, member scope, and final decision. |
| 6. Task management | Epic 7 stories 7.1-7.5 | Preserve standalone/linked tasks, assignment, evidence, due dates, and controlled task states. |
| 7. File management and document history | Epic 3 stories 3.1-3.3, 3.6; Epic 9 stories 9.1-9.5 | Unify shared files, related documents, versioning, history, and effective-date traceability. |
| 8. Dashboard and operational alerts | Epic 11 stories 11.3-11.6; Epic 12 stories 12.2-12.3, 12.6 | Deliver per-role dashboard, My Work, per-role work queues, due/overdue alerts, and drill-down. |
| 9. Search, filtering, reports, exports | Epic 12 stories 12.1, 12.4-12.5; Epic 9 story 9.4 | Keep server-side scoped search, reports, Excel/PDF export, and source/version consistency. |
| 10. Audit log, notifications, accessibility, hardening | Epic 3 stories 3.4-3.5; Epic 11 stories 11.1-11.2; Epic 8 (incl. 8.6); Epic 10 | Preserve audit and notification delivery plus accessibility/security hardening and the existing seminar, student research, council, and ethics scope as supporting tracks. |

## Epic 1: Foundation, authentication, app shell, navigation

### Goal

Give every authenticated user one responsive workspace whose navigation and
actions are driven by backend-resolved capability, not by a client-side role
switcher.

### Business value

Users reach their next valid action quickly, while unauthenticated and
unauthorized requests remain outside the protected data boundary.

### Primary users / roles

Unauthenticated users; all ten active system roles (QT, GĐ, PGĐ-KH, PGĐ-TD, TP,
PP, TB, CV, NCV, NNB); record-scoped PI, member, reviewer, secretary, and task
assignee relationships.

### In scope

Login, controlled session handling, change password, app shell, sidebar,
header, breadcrumbs, responsive navigation, route guards, capability-aware
action rendering, and shared loading/empty/error/forbidden states.

### Out of scope / later

`[Later / non-MVP]` SSO/LDAP/OIDC/MFA, public registration, native mobile app,
role impersonation, and a new design system.

### Dependencies

Existing session/auth API, `packages/permissions`, UI tokens/shared components,
authorization baseline, and API/web route structure.

### UX screens involved

Login, change password, controlled reset, dashboard shell, My Work shell,
notifications entry, all protected detail/list routes.

### Backend/API needs

`POST /auth/login`, `POST /auth/change-password`, controlled reset endpoints,
`GET /auth/me`, route-scoped capability response, session expiry, and safe
error codes. The browser never accesses PostgreSQL or MinIO directly.

### Permission and security notes

Use server-side `Authenticated Session`; fail closed on missing/expired context;
do not expose secrets; re-authorize every mutation and direct route; show the
current system role separately from record relationships.

### Acceptance criteria

- Login establishes the correct session/account context, audits the result, and
  gives no partial access for invalid, locked, or inactive accounts.
- At 360, 390, 430, 768, 1024, and 1440px the shell has no full-page horizontal
  scroll; mobile uses a labeled drawer and long forms use a full-screen surface.
- Navigation and actions vary by backend capability; direct URL access receives
  a safe denied/not-found response, not hidden data.
- Loading, empty, error, stale, forbidden, and success states are accessible and
  distinguishable without color alone.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 1.1 | MVP | Implement login, session expiry, logout, change password, and controlled reset. |
| 1.2 | MVP | Implement app shell, sidebar, header, breadcrumbs, responsive drawer, and account context. |
| 1.3 | MVP | Bind route/list/detail actions to `ViewerAuthorizationV1`, `contextVersion`, and safe denial states. |
| 1.4 | MVP | Add shared async, error, forbidden, stale-context, confirmation, and toast behavior. |
| 1.5 | Later / non-MVP | Integrate external identity or MFA only after an explicit product decision. |

## Epic 2: User, role, organization, catalog administration

### Goal

Provide a safe administrative foundation for accounts, exactly one active
system role, organization scope, researcher profiles, record relationships,
conflict checks, catalogs, and shared configuration. Proposal submission is
owner-only and has no delegated path.

### Business value

Correct identity and scope facts prevent accidental over-permission and make
reviewer/approval decisions auditable.

### Primary users / roles

QT `SYSTEM_ADMIN` (platform); TP¹/CV¹ as researcher-profile managers; TP as
segment owner; TB¹/TP¹ as duplicate-merge deciders; `EXTERNAL_RESEARCHER_USER`
as a managed account with no administrative authority; read-only users of
catalog values.

### In scope

Users, ten system roles and the 7 → 10 account migration, units/scope,
display-only unit titles, segments (mảng) and CV segment assignment, researcher
profiles, account links and the 48-hour setup-password link, duplicate-profile
merge, participation history, reviewer/team relationships, conflict preflight,
catalogs, forms, checklists, score criteria, notification templates, and
configuration.

### Out of scope / later

`[Later / non-MVP]` Arbitrary policy wildcards, automatic role inference,
organization-tree inheritance, self-service external onboarding, and workflow
engine configuration.

### Dependencies

Epic 1 session/shell; `packages/permissions`; source-domain fact-provider
contracts; Prisma migrations; authorization baseline and conflict policy.

### UX screens involved

Users, roles/permissions, organization units, catalogs, segment assignment
(Phân mảng), researcher profiles and duplicate merge, intake configuration,
reviewer candidate search, and account reset.

### Backend/API needs

Admin user/role/unit/catalog endpoints; researcher profile CRUD/link/history;
relationship lifecycle and conflict preflight endpoints; DTO validation,
versions, audit, and scoped queries.

### Permission and security notes

`SYSTEM_ADMIN` has no implicit proposal/project/review/approval access. Every
relationship has status/effective dates. Conflict denial wins over role grants.
Proposal create/submit/resubmit are PI-only; no proposal delegation is allowed.

### Acceptance criteria

- An account has exactly one active system role from the ten canonical values;
  legacy HEAD/STAFF accounts migrate to TP/CV, former `RESEARCH_OVERSIGHT_AUTHORITY`
  holders are re-classified per person, and ambiguity fails closed and is reported
  for migration, never guessed.
- An active `EXTERNAL_RESEARCHER_USER` can sign in and receive only explicitly
  related/assigned record capabilities; it cannot manage accounts, roles,
  scopes, profiles, or configuration.
- Admin screens do not disclose business data merely because the viewer is an
  admin; scope, relationship, assignment, state, delegation, and conflict are
  independently evaluated.
- Researcher profile and relationship history is retained, searchable only in
  scope, and never used as an unverified authorization shortcut.
- Candidate assignment is blocked by PI/member/secretary conflict with a safe
  reason; protected conflict source is not disclosed.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 2.1 | MVP | Manage users, one active system role (ten values), status/lock, unit scope, display-only unit title, and controlled reset. |
| 2.2 | MVP | Manage organizations, catalogs, forms, checklists, priorities, and score criteria with soft lifecycle. |
| 2.3 | MVP | Manage researcher profiles (QT, TP¹/CV¹), account links, duplicate-merge decisions (TB¹/TP¹), participation history, and record relationships. |
| 2.4 | MVP | Run conflict/separation-of-duty preflight before officer, reviewer, council, secretary, tờ trình step or signer assignment. |
| 2.5 | MVP | Maintain the segment catalog and TP-owned CV segment assignment (legacy 1.12). |

## Epic 3: Proposal / research topic management

### Goal

Let an eligible PI (any role except QT/NNB) create, complete, save, submit, and
resubmit a research proposal through a controlled intake without overwriting
submitted versions, and hand each submitted proposal to one responsible CV.

### Business value

Proposal intake becomes complete, visible, and traceable from opening an intake
through the responsible CV's next action.

### Primary users / roles

TP and CV for intake periods; TB¹/CV³ for completeness checks; TP¹/TB¹ for
responsible-CV assignment of unmatched records; the current PI (any role except
QT/NNB) for proposal authoring; related team members and reviewers for permitted
read/file work. NNB never sees intake periods.

### In scope

Intake periods, proposal list/detail, create/edit form, readiness checklist,
submit confirmation, supplement response, resubmission, segment-based
responsible-CV auto-assignment and the "Chưa có người phụ trách" view,
post-submission withdraw/edit requests and reopen by the assigned CV, proposal
files, status badges, timeline, and next-action presentation.

### Out of scope / later

`[Later / non-MVP]` Public proposal portal, digital signature, full external
portal, and arbitrary workflow editing.

### Dependencies

Epics 1-2; shared files from Epic 7; catalogs/checklists; proposal state machine;
audit and notification hooks from Epic 10.

### UX screens involved

Intake periods, proposal list, proposal detail, create/edit proposal, submit
confirmation, supplement request, CV completeness check, unassigned-records view,
and withdraw/edit/reopen requests.

### Backend/API needs

`/proposal-intake-periods`, `/research-proposals`, readiness/check endpoints,
named submit/resubmit/supplement operations, immutable versions, field/file
validation, scoped list/detail/count/facet, and `ViewerAuthorizationV1`.

### Permission and security notes

PI edit/submit is limited to applicable intake and scope. Submitted versions
lock. Non-PI users cannot create, edit, submit, or resubmit proposal drafts.
No direct status PATCH. Post-submission withdraw/edit is a PI request decided by
the assigned CV³; reopen is a CV³ action with a mandatory reason; all are audited.

### Acceptance criteria

- Draft save permits incomplete sections; submit requires backend readiness,
  active intake, scope, relationship, conflict, deadline, and context version.
- An external researcher can open only a related proposal under disclosure rules;
  external access cannot create, edit, submit, resubmit, or change PI, team,
  objective, budget, status, or other protected fields.
- Submitted, supplement-requested, resubmitted, eligible, and rejected versions
  show the canonical state and immutable history with allowed next action.
- Closed intake, stale context, denied capability, invalid field/file, and
  failed upload preserve user input and provide a corrective message.
- Lists, detail, counts, facets, files, history, and exports disclose only
  authorized proposal data.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 3.1 | MVP | Create/manage intake periods and required submission packages. |
| 3.2 | MVP | Build proposal list/detail and sectioned create/edit form with server validation. |
| 3.3 | MVP | Add readiness, submit confirmation, immutable submission, supplement, and resubmit flow. |
| 3.4 | MVP | Implement state badges, next-action strip, version/history, and capability-aware controls. |
| 3.5 | Should have | Add richer read/file contribution guidance for related team members after core PI intake is stable. |
| 3.6 | MVP | Auto-assign the responsible CV by segment on submit/resubmit; TP¹/TB¹ assign unmatched records (legacy 4.7). |
| 3.7 | MVP | Implement post-submission withdraw/edit requests and reopen by the assigned CV (legacy 4.8). |

## Epic 4: Review, evaluation, aggregation, and approval

### Goal

Move eligible proposals through conflict-safe reviewer assignment, independent
evaluation, result aggregation, approval routing (tờ trình CV → TB → TP → BGĐ),
BGĐ signature of the evaluation council, and GĐ approval/rejection of topic and
funding.

### Business value

Decisions are evidence-based, separated by duty, and reproducible from the
submitted package and audit trail.

### Primary users / roles

TB¹/CV³ for completeness checks; QT-configured roles (default TP¹/TB¹, D-035) for
reviewer/council assignment; TP¹/TB¹/CV³ for synthesis; TB (review step) and TP (approval step) in routing; GĐ or PGĐ-KH as
council signer; GĐ as the only topic + funding decider; assigned
reviewer/council/IRB evaluator from any role except QT, including an external
researcher when explicitly assigned; PP and PGĐ-TD as monitors; PI/member/external
researcher as disclosure-limited viewers.

### In scope

TB/CV check and supplement; reviewer/council invitation by QT-configured roles (default TP/TB, D-035) with accept/decline;
evaluation aggregation and tờ trình drafting; approval routing with return and
reason; BGĐ signature of the evaluation council; decision package, GĐ
approve/reject confirmation, disclosure, decision history, and proposal state
transitions.

### Out of scope / later

`[Later / non-MVP]` Automatic reviewer selection, delegated approval, public
review disclosure, and arbitrary multi-stage approval builder.

### Dependencies

Epics 1-3; researcher/conflict facts from Epic 2; shared files/history; audit,
notifications, and state transition contracts from Epic 10.

### UX screens involved

Completeness check, reviewer assignment and invitation, reviewer evaluation,
result aggregation, tờ trình routing inbox (TB review, TP approval), BGĐ
signature, GĐ decision, proposal detail review/history tabs.

### Backend/API needs

Check, supplement, reviewer assignment and invitation response, evaluation,
aggregation, approval routing (`approval_submissions`: submit/forward/return/
approve/sign), decision package, approve/reject endpoints; server-calculated
totals; disclosure-filtered DTOs; atomic state/version/conflict checks.

### Permission and security notes

Reviewer sees only assigned package and own evaluation. PI/member/secretary do
not see protected raw review data before disclosure. Reviewer cannot decide a
record they reviewed; PI/member cannot review or approve their own record.
Within one source-record evaluation round/council, chair, council secretary,
council member and reviewer/council reviewer are mutually exclusive active
positions for the same person; unrelated records/councils/rounds remain
independent. Position changes are revoke/end-then-assign with no interval overlap
and immutable history. The baseline compatibility/multiplicity definition is
canonical; stories reference it rather than redefine pairwise rules.
Researcher-profile pages never render proposal review/assignment/approval cards;
proposal detail renders them only from backend capability and exact assignment
context. `ACTION_NOT_GRANTED` omits a section; conflict/state blocks keep the
relevant section disabled with its denial reason. TB/TP routing steps are not
final approval; PP and PGĐ-TD never route, sign or decide; PGĐ-KH never decides a
topic; `SYSTEM_ADMIN` gains no implicit proposal workflow action. PI and reviewers
see no action log (two-way anonymity); TB¹/TP¹ may see reviewer identity.

### Acceptance criteria

- Assignment cannot be confirmed until active candidate, scope, dates, conflict,
  and required context checks pass.
- Candidate preflight and every authoritative single/bulk/import/admin assignment
  mutation enforce the same source-participation, mutually exclusive position,
  duplicate/overlap and stale-context rules; concurrent writes cannot create two
  active evaluation positions for one person/context.
- An external researcher may review only an explicitly assigned review package;
  the account role alone grants no reviewer access, assignment authority, or
  final decision capability.
- Evaluation validates every required criterion, calculates totals on the
  backend, and locks the submitted version.
- Aggregation cannot move to pending approval until required reviews and summary
  conditions pass; missing/late review is actionable only for TP¹/TB¹/CV³.
- A finalized dossier reaches GĐ only through approval routing (drafted by
  TP/TB/CV → TB review → TP approval → GĐ); a return at any step goes to the author
  with a mandatory reason; steps are never skipped and nobody reviews a
  submission they authored. No Phòng KHQS role invokes final approve/reject.
- An evaluation council tờ trình is routed only after every member accepted, and
  GĐ or PGĐ-KH signs the establishment before members read the dossier.
- GĐ approve/reject of topic and funding rechecks authority, scope, conflict,
  state, version, routing completion and disclosure; rejection requires a reason
  and creates an immutable audit.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 4.1 | MVP | Implement TB¹/CV³ completeness check and supplement request. |
| 4.2 | MVP | Implement candidate search for QT-configured council roles (default TP¹/TB¹, D-035; any candidate role except QT), conflict preflight, invitation with accept/decline, reviewer assignment/change/revoke. |
| 4.3 | MVP | Implement reviewer score form, save draft, submit-once lock, and disclosure. |
| 4.4 | MVP | Implement TP¹/TB¹/CV³ aggregation with backend totals and readiness gate; council secretary drafts synthesis/minutes without scoring. |
| 4.5 | MVP | Implement approval routing CV → TB → TP → BGĐ with return-with-reason, no skipping and no self-review (legacy 5.9). |
| 4.6 | MVP | Implement BGĐ signature of the evaluation council and the GĐ topic + funding decision package and approve/reject action (legacy 5.7, 5.8, 5.10). |
| 4.7 | Should have | Add council/IRB evaluator variants using the same assignment/evaluation contracts. |

## Epic 5: Project tracking after approval

### Goal

Create a tracked project explicitly from an approved proposal and manage
milestones, reports, adjustments, acceptance, and completion without silently
changing the source proposal.

### Business value

Approved work has a visible owner, schedule, evidence, risk state, and final
acceptance path.

### Primary users / roles

The assigned project CV³ for daily operations; TP¹/TB¹ for project-officer
assignment and routing steps; GĐ, PGĐ-KH, TP and TB with Academy-wide project
view; GĐ or PGĐ-KH as signer of extension, adjustment and acceptance council; GĐ
as liquidation signer; PP and PGĐ-TD as monitors; project PI, members, secretary,
assigned evaluators, permitted delegates, and external researchers only where an
explicit project/review relationship grants access.

### In scope

Project creation/setup, overview/detail, milestones, periodic reports,
delayed/risk flags, adjustment/extension appraisal and routing, acceptance/final
review, funding metadata (allocation, disbursement, settlement) and liquidation,
project states, member scope, files, tasks, and history.

### Out of scope / later

`[Later / non-MVP]` Deep accounting/financial integration (no ledger, payments,
banking or ERP; funding stays audited metadata), automatic project creation,
automatic pause/reject on overdue, and mobile-native workflows.

### Dependencies

Approved proposal from Epic 4; files/history from Epic 7; tasks from Epic 6;
notifications/alerts from Epic 8/10; report/export services from Epic 9.

### UX screens involved

Project overview/detail, progress milestones, periodic reports,
adjustment/extension, tờ trình routing and signature, acceptance/final review,
funding (Kinh phí) and liquidation.

### Backend/API needs

Approved-project creation operation; milestones, progress reports, adjustment,
acceptance, state transition, and scoped list/detail endpoints; explicit copied
relationship/source link; aggregate/context version and audit.

### Permission and security notes

Members see only related project information and permitted files/tasks. Project
state does not imply proposal authority. Overdue is a derived flag/reminder,
not a hidden state mutation. Per-project funding is visible to GĐ/PGĐ-KH/TP/TB,
the assigned CV and own participants (PP only own participation); PGĐ-TD sees
aggregates only. No Phòng KHQS role decides an adjustment or extension.

### Acceptance criteria

- Approval does not create a project automatically; the assigned CV explicitly confirms
  source, copied relationships, code, dates, milestones, and report calendar.
- Project state badges follow the canonical lifecycle; report due, delayed and
  pending adjustment are derived or child-record flags, not project states.
- Submitted reports and acceptance dossiers lock versions; adjustment and final
  decisions use separate operations and retain history.
- Adjustment (with or without funding change) and extension: the assigned CV
  appraises and drafts the tờ trình, TB → TP route it, GĐ or PGĐ-KH signs, and the
  signature applies the change atomically. If no eligible step actor or
  conflict-free signer exists, the PI withdraws the request.
- Liquidation is drafted by the CV, routed TB → TP and signed by GĐ only.
- Project member and external-researcher access, file access, task access,
  dashboard counts, and exports all use the same record scope and disclosure
  rules; external access never widens the linked-record permission.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 5.1 | MVP | Create/confirm project from approved proposal with explicit setup. |
| 5.2 | MVP | Implement project overview/detail, milestones, progress, report due and delayed flags. |
| 5.3 | MVP | Implement PI periodic report draft/submit and assigned-CV follow-up (no tờ trình). |
| 5.4 | MVP | Implement adjustment/extension request, CV appraisal, routing and GĐ or PGĐ-KH signature (legacy 6.11). |
| 5.5 | MVP | Implement acceptance dossier, acceptance council (signed by GĐ or PGĐ-KH), evaluation, aggregation, final decision, and completed state. |
| 5.7 | MVP | Implement funding metadata and liquidation routed to GĐ (legacy 6.12). |
| 5.6 | Should have | Carry forward seminar/student research tracking as a related activity track using the same milestone/file/history patterns. |

## Epic 6: Task management

### Goal

Let authorized users create, assign, update, evidence, and complete standalone
or linked tasks without exceeding the linked record's permission.

### Business value

Operational work becomes visible with clear ownership, due dates, evidence, and
follow-up rather than remaining in email or spreadsheets.

### Primary users / roles

Task creator/manager (TP/TB/CV within scope, PI within own project); assignee;
collaborators; BGĐ and PP for scoped read-only oversight (QT and BGĐ create no
tasks); any authorized linked-record participant, including an external
researcher only when explicitly assigned.

### In scope

Task list/detail/create-edit, assignment, collaborators, priority, due date,
progress, notes, evidence, reminders, overdue flag, and controlled task states.

### Out of scope / later

`[Later / non-MVP]` Full project-management suite, arbitrary automation rules,
chat, and external task integrations.

### Dependencies

Epic 1 authorization; linked records from Epics 3-5/7; files from Epic 7;
alerts from Epic 8/10.

### UX screens involved

Task list, task detail, create/edit task, task evidence/file section, My Work.

### Backend/API needs

Scoped `/tasks` list/detail, create/update, assignment, status transition,
evidence/file operations, due/overdue query, audit, and linked-record access
check.

### Permission and security notes

Task permission never widens linked-record permission. Assignee updates are
limited to allowed fields; manager-only reassign/cancel/approve rules are
backend-enforced.

### Acceptance criteria

- Task states New, Accepted, In progress, Waiting for response, Waiting for
  result approval, Completed, Overdue, and Cancelled have explicit transitions.
- Create/assign/status/evidence changes validate actor, linked record, dates,
  state, conflict/separation rules, and context version.
- Overdue is visible and actionable but does not auto-cancel or mutate the linked
  proposal/project workflow.
- Cancelled/completed tasks retain traceable history and authorized evidence.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 6.1 | MVP | Build task list/detail/create-edit with linked-record authorization. |
| 6.2 | MVP | Add assignment, collaborators, priority, due dates, and state transitions. |
| 6.3 | MVP | Add progress, notes, evidence, completion, overdue flag, and audit. |
| 6.4 | Should have | Add task views embedded in project/proposal/report workspaces. |

## Epic 7: File management and document history

### Goal

Provide one private, versioned, API-authorized file and related-document
experience for proposals, projects, tasks, reports, councils, ethics dossiers,
and other business records.

### Business value

Evidence remains findable, current versions are clear, and restricted files do
not become an accidental bypass around record authorization.

### Primary users / roles

Authorized record participants, PI/members, external researchers, Phòng KHQS
and BGĐ roles within scope (PGĐ-TD without per-record funding detail),
reviewers, and scientific-document managers (QT, TP, TB, CV) according to each
record's disclosure policy.

### In scope

Upload, validation, scan/status, metadata, preview/download where supported,
replace/version, soft delete, related documents, effective dates, file history,
and business timeline.

### Out of scope / later

`[Later / non-MVP]` Preview for every format, public object URLs, full document
management integration, OCR, digital signature, and arbitrary retention
automation.

### Dependencies

Record-owner authorization contracts; private MinIO; PostgreSQL metadata;
Epics 3-6 source records; audit from Epic 10.

### UX screens involved

File upload, file preview/download row, file history, related documents,
detail-page files/history tabs.

### Backend/API needs

Shared `/files` and related-document endpoints; API-mediated MinIO access;
extension/MIME/size/name validation; version/replacement/soft-delete; source
record authorization on every metadata/content request.

### Permission and security notes

Object keys and URLs are never permission tokens. Review disclosure applies to
file name, metadata, content, history, search, notifications, and export.

### Acceptance criteria

- Upload stores PostgreSQL metadata and private MinIO content only after source
  authorization and validation; failure leaves no usable orphan association.
- Download/preview re-authorizes at request time; replace creates a new version;
  soft delete preserves required history.
- Current/superseded/deleted/scanning/failed states are text-readable and
  accessible; unsupported preview falls back to authorized download.
- Related documents preserve owner, effective date, version, source links, and
  audit history without hard deletion of required evidence.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 7.1 | MVP | Implement upload/download with source-record authorization and safe validation. |
| 7.2 | MVP | Implement metadata, replacement/version history, soft delete, and file states. |
| 7.3 | MVP | Add file/history tabs and timeline to proposal/project/task/report details. |
| 7.4 | Should have | Implement related-document registration, linking, effective dates, and scoped retrieval. |
| 7.5 | Later / non-MVP | Add broad file preview coverage only when supported formats and security scanning are proven. |

## Epic 8: Dashboard and operational alerts

### Goal

Give every authenticated user a scoped dashboard and My Work view that expose
only actionable queues, risks, due dates, and permitted drill-downs.

### Business value

Phòng KHQS and BGĐ roles can prioritize their own queues; researchers and
reviewers know what they owe; counts do not leak records outside scope.

### Primary users / roles

Every role except QT, with per-role cards and queues (TB review queue, TP
approval queue, CV assigned records, GĐ decision/signature, PGĐ-KH signature, PP
and PGĐ-TD monitoring, PGĐ-TD aggregate only); external researchers see only
queues and cards derived from their explicit assignments. QT has no business
dashboard and no My Work.

### In scope

Per-role dashboard, My Work, per-role work queues, KPI cards, alert list,
due/overdue queues, source-list drill-down, relationship labels,
blocked-with-reason items, responsible-CV and nature (Quân sự / Dân sự / Chưa
phân loại) breakdowns with an "unassigned" group, and scoped operational
summaries.

### Out of scope / later

`[Later / non-MVP]` Complex charts, saved filters, predictive risk scoring,
cross-institution benchmarking, and decorative dashboards.

### Dependencies

Source contracts from Epics 2-7; search/filter from Epic 9; scheduled jobs and
notifications from Epic 10; shared components from Epic 1.

### UX screens involved

Role-aware dashboard `/dashboard`, My Work `/my-work`, alert list, notification
entry, filtered source lists, and record next-action strips.

### Backend/API needs

Scoped `GET /dashboard`, `GET /me/work`, due/overdue source queries, KPI-to-source
filter tokens, `asOf`/source versions, and fail-closed composite aggregation.

### Permission and security notes

Counts, tooltips, facets, queues, and drill-down use the same authorization as
detail. Conflict-blocked known records can be non-actionable with safe fields;
hidden records remain undiscoverable.

### Acceptance criteria

- Each role sees only relevant KPI cards, queues, and quick actions; QT has no
  business dashboard; PGĐ-TD per-record funding columns stay empty.
- Every actionable card drills to the same scoped filter/source version and
  re-authorizes on detail open.
- Composite source failure shows unavailable/fail-closed rather than partial
  totals presented as complete.
- My Work is available to every role except QT, de-duplicates entries, preserves
  all viewer relationships, and excludes blocked items from actionable counts;
  external researchers receive only explicitly assigned work.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 8.1 | MVP | Implement per-role dashboard KPIs, urgent queue, scope line, and source links. |
| 8.2 | MVP | Implement My Work aggregation and per-role work queues for proposals, projects, tờ trình steps, signatures, reports, tasks, and invitations (legacy 11.6). |
| 8.3 | MVP | Add due/overdue flags and operational alert list with safe disclosure. |
| 8.4 | MVP | Add KPI drill-down with filter/asOf/source-version consistency. |
| 8.6 | Should have | Add PP and PGĐ-TD monitoring dashboards with aggregate-only funding for PGĐ-TD (legacy 12.6). |
| 8.5 | Later / non-MVP | Add complex charts, saved filters, or predictive risk indicators. |

## Epic 9: Search, filtering, reports, and exports

### Goal

Make core records discoverable and reportable with server-side filters,
authorization-scoped facets, and traceable Excel/PDF exports.

### Business value

Users find the right record quickly and can reuse operational data without
creating a second, ungoverned data access path.

### Primary users / roles

All authenticated users for authorized search; external researchers only for
related/assigned records; every role except QT for scoped report and Excel
export (PGĐ-TD without per-record funding); QT only for administrative data.

### In scope

Global/local search, filters, sort, pagination/cursors, proposals/projects/
tasks/reports/documents/researcher/activity/council/ethics result tabs, report
catalog, parameterized report run, preview, Excel/PDF generation, export status,
and export audit.

### Out of scope / later

`[Later / non-MVP]` Elasticsearch/OpenSearch, advanced report builder, saved
filters, scheduled external distribution, and unrestricted bulk export.

### Dependencies

Authorized source query contracts; dashboard source versions from Epic 8;
files/history and audit; existing PostgreSQL indexes and export tooling.

### UX screens involved

Global search, core list filter bars, reports catalog, report parameters/preview,
export history/result.

### Backend/API needs

Server-side `/search`, scoped facets/counts/suggestions, report definitions and
run/export jobs, cursor/version snapshot, `AuthorizationJobEnvelopeV1`, and
download re-authorization.

### Permission and security notes

Apply authorization before result/count/facet/suggestion/export. Redact hidden
reviewer identity/raw score/comment and protected personnel fields. External
researchers receive only related/assigned results and export does not become an
access grant.

### Acceptance criteria

- Search/list filters persist in the URL where safe, are cancellable/server-side,
  and distinguish no-match from no-access.
- 95% of normal core search/list interactions meet the 2-second Phase 1 target
  under measured conditions.
- Report preview/export uses the same scope/filter/source version as the source
  list; required source failure does not show partial totals as complete.
- Export jobs show queued/progress/completion/error states, are retry-safe, have
  expiry, and append an audit event.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 9.1 | MVP | Implement server-side search/filter/sort/pagination for proposal, project, task, and researcher core lists. |
| 9.2 | MVP | Implement scoped report catalog, parameters, preview, and source drill-down. |
| 9.3 | MVP | Implement controlled Excel/PDF export, progress, expiry, re-authorization, and audit. |
| 9.4 | Should have | Add cross-module tabs for documents, seminars/student research, councils, and ethics. |
| 9.5 | Later / non-MVP | Add advanced report builder, saved filters, and search-engine infrastructure. |

## Epic 10: Audit log, notifications, accessibility, and hardening

### Goal

Make consequential work traceable and safely communicated while enforcing the
UX security/accessibility floor across all modules; carry forward supporting
seminar, student research, council, and ethics workflows without creating a
second authorization model.

### Business value

The institution can explain what happened, notify the right person, meet core
accessibility expectations, and operate supporting research-governance flows
with consistent controls.

### Primary users / roles

All users for notifications (including the next tờ trình step and BGĐ
signature requests); system admin and authorized audit viewers for logs;
Phòng KHQS (council and IRB setup by QT-configured roles, default TP¹/TB¹ — D-035; tờ trình by CV³/TB¹/TP¹ — D-036), BGĐ signers (GĐ or PGĐ-KH),
researchers, reviewers and council/IRB participants from any role except QT,
including external researchers only for their scoped supporting workflows; CV¹
for student research; QA and operations for hardening.

### In scope

Append-only audit, in-app notifications, configured email/reminder hooks,
accessibility and responsive QA, security/error hardening, retry/idempotency,
and supporting seminar/student research, council, and ethics state/assignment/
evaluation/decision slices retained from the legacy backlog.

### Out of scope / later

`[Later / non-MVP]` SMS, digital signature, external integrations, mobile-native
flows, full notification orchestration, and arbitrary workflow engine.

### Dependencies

All workflow epics; `AuthorizationAuditV1`, `AuthorizationJobEnvelopeV1`,
scheduled worker, notification templates/config, component library, and QA
acceptance matrix.

### UX screens involved

Audit log, notifications, alert/toast surfaces, seminar/student research,
council/ethics screens, and accessibility states on every screen.

### Backend/API needs

Append-only audit capture in the same transaction as critical mutation;
notification/delivery records, retry-safe reminders, source contracts for
supporting domains, redacted audit query/export, and correlation IDs.

### Permission and security notes

Audit access is itself authorized. Notifications contain minimum disclosure and
never grant access. Every supporting domain must pass resolver, disclosure,
mutation re-authorization, state, and fixture integration gates before being
advertised as covered.

### Acceptance criteria

- Critical submit, supplement, assignment, responsible-CV assignment (manual or
  automatic), evaluation, aggregation, tờ trình submit/forward/return/approve/sign,
  decision, project, funding, liquidation, report, task, file, account, and
  policy actions have actor, target,
  action, UTC time, outcome, context/policy version, and redacted changes.
- Notification/reminder retry does not duplicate business outcomes and cancels
  effects when authority or state is no longer valid.
- Core flows meet WCAG 2.2 AA floor: landmarks, headings, labels, visible focus,
  keyboard access, live regions, semantic status, paste support, and responsive
  breakpoints.
- Seminar and council/IRB supporting stories retain their existing business
  scope; student research follows matrix §9.6 (CV/NCV register, CV¹ approves,
  manages and completes); IRB/council establishment and the IRB certificate are
  routed and signed by GĐ or PGĐ-KH; all use the same backend authorization,
  files, states, audit, notification, and disclosure contracts.

### Suggested stories / tasks

| ID | Priority | Story/task |
| --- | --- | --- |
| 10.1 | MVP | Implement append-only audit capture/query, redaction, correlation, and retention-safe history. |
| 10.2 | MVP | Implement in-app notifications, configured email for required events, and safe reminders. |
| 10.3 | MVP | Run accessibility/responsive/security hardening across core MVP screens and mutations. |
| 10.4 | Should have | Carry forward seminar/student research workflow slices and integration contracts. |
| 10.5 | Should have | Carry forward council/IRB intake, supplement, assignment, evaluation, aggregation, routing, and BGĐ signature slices. |
| 10.6 | Later / non-MVP | Add SMS, digital signature, external integrations, or workflow-engine capabilities. |

## Cross-epic screen implementation tasks

The following rows are the screen-level task register. They are intentionally
specific enough to create frontend/backend stories without inventing routes or
behavior outside `docs/ux-ui-spec.md`.

| Task | Description | Roles | Route / UI | Data needed | API/backend dependency | Permission rules | Main states | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 Login | Authenticate and establish safe session. | Unauthenticated | `/login` | Username, password, account-state message. | `POST /auth/login`. | Generic credential failure; no secret in URL/logs. | Loading, invalid, locked/inactive, network error, success. | Successful login lands on scoped dashboard; duplicate submit is prevented; audit is written. |
| S02 Password | Change password or complete admin-issued reset. | Authenticated; reset-context user | `/change-password`, `/password-reset` | Current/new/confirm password, reset expiry. | Change/reset endpoints. | No credential-detail leakage; token single-use. | Loading, validation, expired token, error, success. | Policy and confirmation are validated; success invalidates old reset/session context as required. |
| S03 Dashboard/My Work | Show scoped KPIs, per-role queues and action-needed records. | Every role except QT | `/dashboard`, `/my-work` | KPI, queue, relationship, state, due/risk, route. | `GET /dashboard`, `GET /me/work`. | Same scope for cards/counts/drill-down; conflict items non-actionable. | Loading, empty, unavailable source, error, success. | Every card links to an authorized filtered source list; no global counts. |
| S04 Intake/proposal list | Browse intake/proposal queues. | TP/CV manage intakes; every role except QT/NNB reads open intakes; authorized proposal relationships/scope for proposals. | `/intakes`, `/proposals`, `/my-proposals` | Code/title/PI/unit/field/intake/state/due. | Intake/proposal list APIs. | Server-side scope, counts, facets, filters. | Loading, no records, no match, error, denied. | URL filters restore; desktop table/mobile cards preserve code, state, due, owner, action. |
| S05 Proposal detail | Canonical proposal detail workspace. | Authorized relationship/scope/assignment. | `/proposals/:id` | Header, relationship, tabs, files, timeline, capabilities. | Scoped detail API. | Disclosure-filtered DTO; stale context retained. | Loading, safe not-found/denied, stale, read-only, success. | PI gets the edit/submit workspace; staff gets a read-only proposal/team/schedule/budget summary; hidden tabs/data are omitted. |
| S06 Create/edit proposal | Create/edit structured draft. | Current PI only (any role except QT/NNB). | `/proposals/new`, `/proposals/:id/edit` | Intake, participants, dates, objectives, budget, files, readiness. | Create/update proposal, catalogs, files. | Owner, system role, scope, state; submitted version locked. | Loading, incomplete, field/server error, locked, saved. | Save draft preserves values; invalid required fields focus first error; non-PI users cannot edit or submit. |
| S07 Submit confirmation / supplement request / completeness check / withdraw-edit-reopen | Confirm submit, request supplement, perform completeness check, or handle post-submission requests. | Current PI (any role except QT/NNB) for submit/resubmit and withdraw/edit requests; TB¹ or assigned CV³ for check/supplement (never TP); assigned CV³ for withdraw/edit decisions and reopen. | Proposal action panels. | Readiness, version, reasons, whole-day due date, checklist, responsible CV or "Chưa có người phụ trách". | Submit/resubmit/check/supplement/withdraw/edit/reopen operations; segment auto-assignment on submit. | Atomic state/context/conflict checks; proposal submit/resubmit are PI-only; one completeness check per submitted version; reopen needs a reason. | Loading, blocked, stale, validation error, unassigned, success. | Non-PI viewers do not receive the submit section; repeat completeness is disabled and denied; supplement reason/due date and withdraw/edit/reopen decisions are immutable history. |
| S08 Reviewer assignment / reviewer evaluation | Invite/assign reviewers and collect own evaluation. | TP¹, TB¹ or assigned CV³; invited reviewer/council/IRB evaluator from any role except QT. | `/proposals/:id/assignments`, `/reviews/:assignmentId` | Candidate, conflict result, invitation status (accept/decline with reason), rubric, score, recommendation, whole-day effective dates/deadline. | Assignment/invitation/evaluation APIs. | No self-assignment or self-review; participants cannot be invited; own accepted assignment only; before acceptance only title/role/deadline/inviter; one submit/lock. | Loading, empty candidates, conflict-blocked, invited, declined, incomplete, submitted, error. | Date controls omit hours/minutes; conflict blocks confirmation; total is backend-calculated; other reviews remain hidden; TB¹/TP¹ alone may see reviewer identity. |
| S09 Result aggregation / tờ trình routing / BGĐ signature / GĐ decision | Consolidate evidence, route the tờ trình, sign and decide. | TP¹/TB¹/CV³ synthesize and draft; council secretary drafts synthesis/minutes; TB review step; TP approval step; GĐ or PGĐ-KH sign the evaluation council; GĐ alone decides topic + funding. | `/proposals/:id/aggregation`, routing inbox (Tờ trình), `/proposals/:id/decision` | Review counts, synthesis, package, routing stage/status and step history, return reasons, conflict indicator. | Aggregation, approval-routing (`approval_submissions`), signature, decision package and decision APIs. | No step skipping or self-review; return goes to the author with a reason; Phòng KHQS roles, PGĐ-KH, PP and PGĐ-TD cannot decide a topic; conflicted signer/decider cannot act. | Loading, not-ready, in routing, returned, blocked, confirm, error, immutable success. | Pending approval requires conditions and completed routing; reject/return require a reason; every step and decision is audited and read-only. |
| S10 Project tracking overview | Operate approved project lifecycle. | Assigned CV³; GĐ, PGĐ-KH, TP, TB (Academy-wide view); PP and PGĐ-TD (monitor, unit scope); PI, members, secretary. | `/projects`, `/projects/:id` | Source proposal, relationships, state, progress, risks, tabs. | Project detail/list and explicit create API. | Member scope; no automatic project creation; state-based actions. | Loading, empty, denied tab, delayed, read-only, success. | Project setup clearly separates copied data from source proposal and exposes next action. |
| S11 Progress milestone / periodic report / adjustment-extension / acceptance-evaluation / funding-liquidation | Manage progress evidence, request routed decisions and record funding. | PI; assigned project CV³; TB and TP routing steps; GĐ or PGĐ-KH signer; GĐ for liquidation; GĐ, TP/TB and assigned CV manage funding. | Project subroutes (incl. Kinh phí). | Dates, progress, report period, evidence, typed adjustment impact (incl. funding change), extension end date, dossier, funding figures and documents. | Milestone/report/adjustment/extension/acceptance/funding/liquidation and approval-routing APIs. | Submitted versions lock; CV appraises and drafts the tờ trình; GĐ or PGĐ-KH signs adjustment/extension/acceptance council; GĐ alone signs liquidation; no Phòng KHQS role decides; PI withdraws when no eligible actor exists. | Loading, due, overdue, invalid, in routing, returned, blocked, success. | Overdue never silently changes project state; the signature applies the change atomically; all decisions, funding changes and evidence are traceable. |
| S12 Task list / task detail / create-edit task | Create and update linked/standalone work. | Creators, managers, assignees, collaborators. | `/tasks`, `/tasks/:id`, `/tasks/new` | Linked record, owner, collaborators, priority, due, state, evidence. | Task APIs and linked-record authorization. | Task cannot widen linked-record access. | Loading, empty/no-match, validation, denied, overdue, success. | All task states use named transitions; completion/cancellation requires permitted action and audit. |
| S13 File upload / file preview-download / file history | Upload, view/download, replace, and inspect history. | Authorized record viewers/managers. | `/records/:id/files` and detail tabs. | Name/type/size/uploader/time/version/status/effective date. | Files/related-documents APIs; private MinIO. | Reauthorize metadata/content; no direct object URL. | Selecting, validating, uploading/scanning, retry, denied, superseded, deleted. | Replace creates a version; download is audited where required; protected review files remain hidden. |
| S14 Global search | Search core and supporting records. | All authenticated users in scope. | `/search` and local list filters. | Query, tabs, facets, state/unit/person/date, cursor. | Scoped search endpoint. | Auth before result/count/facet/suggestion. | Idle, typing, loading, no match, error, success. | Unauthorized records never affect count/facet/suggestion; result detail re-authorizes. |
| S15 Reports and export | Preview and export scoped operational data. | Every role except QT within its scope (PGĐ-TD aggregate funding only); QT only for administrative data. | `/reports`, report result/history. | Definition, parameters, filters, source versions, job status. | Report/run/export job APIs. | Exact export action; reauthorize job/download. | Parameter error, queued, progress, unavailable, error, success. | Excel/PDF result has expiry and audit; required source failure is not shown as complete. |
| S16 User management / roles and permissions / catalog management / audit log | Manage platform and inspect authorized audit. | System admin; authorized audit viewer. | `/users`, `/roles`, `/catalogs`, `/system-logs` | Accounts, role/scope, catalog values, actor/action/time/outcome. | Admin and audit APIs. | Admin business-data boundary; redacted immutable audit. | Loading, empty, validation, denied, success. | Exactly one role; changes are audited; secrets/conflict sources/raw tokens never display. |

## Reusable component implementation tasks

| Component task | Purpose | Used by | Required states | Accessibility and permission/security behavior |
| --- | --- | --- | --- | --- |
| C01 App shell | Stable responsive workspace. | All authenticated screens. | Loading, route pending, session expired, error. | Landmarks/skip link/focus; route guard is not the only security boundary. |
| C02 Sidebar navigation | Role/module navigation. | All screens. | Expanded, collapsed, drawer, active, scoped badge. | Labeled icons and keyboard access; items reflect capability but direct route remains protected. |
| C03 Header | Search, notifications, account/system role/scope. | All authenticated screens. | Loading, notification count, menu, session expiry. | Current system role is not record role; no protected data in badges. |
| C04 Breadcrumb/page header | Context and next action. | Detail/list/form screens. | Parent missing, long label, loading. | Semantic navigation and one `h1`; route is not an access grant. |
| C05 Data table | Dense desktop list. | Proposals, projects, tasks, users, reports, audit. | Skeleton, empty, error, sort, selected, pagination, mobile card. | Semantic headers/keyboard actions; rows/counts are scoped. |
| C06 Filter bar | Query and filter records. | Lists, search, reports. | Draft, applied, clear, loading, invalid, mobile drawer. | Labels, URL state, Apply/Clear; cannot widen backend scope. |
| C07 Search input | Search global/local records. | Search, lists, header. | Idle, typing, debounced/loading, no results, error, clear, keyboard submit. | `type=search`, accessible name, live result count; suggestions are scoped. |
| C08 Status badge | Consistent state/risk display. | All record lists/details. | Known, unknown fallback, overdue/risk, compact. | Text+icon, never color only; unknown is not guessed. |
| C09 Permission-aware action button | Render primary workflow action. | All mutation screens. | Allowed, loading, success, disabled reason, stale retry, confirm. | Native button and described reason; backend rechecks every mutation. |
| C10 Action menu | Render secondary actions. | Detail/list rows, export/history/file actions. | Open/close, disabled reason, destructive confirmation. | Keyboard menu semantics; hide only when disclosure/security requires it. |
| C11 Form section | Group long structured input. | Proposal, project, report, task, dossier. | Expanded/collapsed, complete/incomplete, locked, field/server error. | Heading/label/error association; field lock follows capability, not inferred role. |
| C12 Stepper | Show lifecycle/readiness progress. | Proposal, project, dossier. | Current, completed, blocked, skipped/not applicable. | Announces current step; completion never implies backend transition. |
| C13 File upload | Attach evidence through shared files module. | Proposal/project/task/report/document. | Idle, selecting, validating, uploading, scanning, success, retry, rejected, locked. | Touch/keyboard upload; no MinIO URL; API checks upload/download. |
| C14 File preview/download row | Show safe file metadata/action. | Record files and history. | Preview supported/unavailable, download, denied, superseded, deleted. | Accessible filename/type/size; download is authorized and audited. |
| C15 Timeline/activity log | Trace workflow/business history. | Record details, profiles, audit. | Loading, empty, ordered, redacted, paginated. | Semantic list/localized time; disclosure-safe actor/details. |
| C16 Comment/note box | Capture reasons, comments, and notes. | Supplement, review, decision, task. | Draft, count, validation, read-only, server error. | Labeled input/error; state/role controls editability. |
| C17 Approval decision panel | Safe authority decision. | Proposal/project/acceptance decisions. | Eligible, blocked, confirm, processing, success, error. | Reject reason required; focus-safe confirmation; no stale decision. |
| C18 Reviewer score form | Structured rubric. | Reviewer/council/ethics evaluation. | Draft, calculated, incomplete, locked, deadline warning, error. | Numeric constraints, criterion labels, own-assignment disclosure only. |
| C19 KPI card | Show one scoped metric. | Dashboard/My Work. | Loading, value, zero, unavailable, stale, error. | Label/value relation; link announces destination/filter; no hidden count. |
| C20 Alert list | Show urgent/due/overdue signals. | Dashboard/My Work/notifications. | Empty, loading, severity, dismiss only if policy allows. | Icon plus text/severity; no protected review details. |
| C21 Empty state | Explain no data and one valid next action. | Lists, sections, dashboards. | No records, no match, not applicable, awaiting upstream action. | Clear explanation; action is capability-controlled. |
| C22 Error state | Explain recovery path. | All lists/forms/sections. | Retry, validation correction, forbidden, stale, unavailable. | `role=alert`; no raw exception or sensitive identifier. |
| C23 Confirmation dialog | Confirm consequential action. | Submit, approve, reject, file/task/intake actions. | Open/focus, cancel, confirm/loading, success/error. | Focus trap/return and explicit consequence; full-screen on long mobile content. |
| C24 Toast/notification | Communicate completed result. | All mutations and notifications. | Success, warning, error, dismiss, persistent link. | `aria-live`; not sole error explanation; no sensitive data. |
| C25 Pagination | Navigate scoped result pages. | Lists, audit, reports. | First/next/previous/last, disabled/loading, context mismatch. | Labeled navigation/current page; cursor retains scope/asOf/version. |
| C26 Tabs | Separate detail sections. | Overview, files, workflow, history, reviews, reports. | Active, loading, error, hidden by disclosure, unsaved guard. | Keyboard tab semantics; existence follows disclosure. |
| C27 Drawer/modal | Filters, contextual details, short forms. | Mobile filters, action details, confirmations. | Open/close, loading, validation, unsaved changes. | Escape/focus trap/one modal level; scroll containment. |

## Workflow-state implementation matrix

The states below map onto the D-033 topic lifecycle (9 steps, 2 phases) through
the single table in `architecture.md` → "Topic Lifecycle Step Mapping (D-033)".
Stories that display the lifecycle use those steps; open lifecycle stories and
AC deltas are proposed in `planning-artifacts/sprint-change-proposal-2026-10-24.md`.

The canonical persisted/derived state names below must be implemented as status
metadata, allowed/blocked action rules, validation, audit events, and required
notification hooks. Overdue is a flag/reminder unless explicitly listed as a
state.

### Proposal states

| State | UI/backend task | Allowed/disabled action work | Audit/notification/edge cases |
| --- | --- | --- | --- |
| Draft | Editable sections, readiness, version badge. | Current PI (any role except QT/NNB) edits/submits; non-PI users are read-only except separately authorized file actions; review/approval disabled. | Create/update audit; empty required fields permitted only for save draft. |
| Submitted | Locked snapshot, responsible CV (auto-assigned by segment) or "Chưa có người phụ trách", pending-check queue. | TB¹/assigned CV³ check/supplement; TP¹/TB¹ assign unmatched records; PI read-only except withdraw/edit requests decided by the assigned CV³. | Submit/check/auto-assignment audit (actor `System`); no post-submit overwrite. |
| Pending check | TB/CV queue/checklist and next-owner strip. | Check complete or supplement; assignment/approval disabled. | Checklist version/audit; stale, conflict, closed-intake edge cases. |
| Needs supplement | Missing items, reason, due date, response CTA. | PI revises working version/resubmits; final actions disabled. | Immutable request, reminder, overdue response flag. |
| Eligible | Derived readiness/eligibility display. | QT-configured council roles (default TP¹/TB¹, D-035) may invite/assign when policy permits; PI and BGĐ cannot decide. | Checklist result audit; never a bypass state. |
| In review | Assignment progress, invitations and reviewer own work. | Accepted evaluator submits; TP¹/TB¹/CV³ monitor and aggregate when ready; raw reviews hidden; PI and reviewers see no action log. | Assignment/evaluation/conflict audit; inactive assignment edge case. |
| Pending result aggregation | Counts/missing/late reviews and synthesis form. | TP¹/TB¹/CV³ aggregate/finalize and draft the decision-package tờ trình; council secretary drafts synthesis/minutes; GĐ decision disabled. | Backend totals and readiness audit; source failure blocks completion. |
| Pending approval | Decision package (routed through `HEAD_REVIEW`) and due date. | GĐ alone approves/rejects topic + funding; all others disabled with reason. | Decision confirmation; conflict, stale version, and wrong-state rejection. |
| Approved | Final decision and project-creation-pending cue. | Assigned CV³ explicitly creates the project; proposal read-only. | Approval and project creation are separate events. |
| Rejected | Final read-only package and permitted reason/history. | No edit/submit/approve unless explicit future policy. | Immutable decision; no hidden reopen button. |

### Approval routing states (tờ trình)

Applies to every `approval_submissions` kind: `EVALUATION_COUNCIL`,
`DECISION_PACKAGE`, `IRB_COUNCIL`, `IRB_CERTIFICATE`, `ACCEPTANCE_COUNCIL`,
`PROJECT_EXTENSION`, `PROJECT_ADJUSTMENT`, `LIQUIDATION`. Signer is `DIRECTOR`
for `DECISION_PACKAGE` and `LIQUIDATION`, otherwise `DIRECTOR_OR_SCIENCE_DEPUTY`.

| State (stage / status) | UI/backend task | Allowed/disabled action work | Audit/notification/edge cases |
| --- | --- | --- | --- |
| `BOARD_REVIEW` / `PENDING` | TB review inbox with the drafted tờ trình and source record. | TB¹ forwards to TP or returns to the author with a mandatory reason; TB never reviews a tờ trình it authored. A TB-authored submission skips this stage; a TP-authored one still passes it. | Submit/forward/return audit; next-step notification; one open submission per kind and subject. |
| `HEAD_REVIEW` / `PENDING` | TP approval inbox. | TP¹ approves to BGĐ or returns to the author with a reason; no self-review; PP has no step. | Approve/return audit; notification to the signer. |
| `LEADERSHIP` / `PENDING` | Signature/decision queue for the signer of the kind. | GĐ (`DIRECTOR`) or GĐ/PGĐ-KH (`DIRECTOR_OR_SCIENCE_DEPUTY`) signs or returns; conflicted signer is denied. | Sign audit; the signature applies the source change atomically. |
| `CLOSED` / `APPROVED` | Read-only signed result on the source record. | No further step; source record shows the applied outcome. | Immutable step history visible by scope; PI sees own record's step history only. |
| `RETURNED` | Author's correction queue with the return reason. | Author corrects and resubmits; no step is skipped on resubmission. | Return reason retained in history. |
| `REJECTED` / `CANCELLED` | Terminal read-only submission. | No further step. | Who may reject or cancel is defined by the routing implementation (open point; see Open Questions). |

### Project tracking states and derived/child-record flags

| State | UI/backend task | Allowed/disabled action work | Audit/notification/edge cases |
| --- | --- | --- | --- |
| Tracking initialized | Setup checklist and source link. | Assigned CV³ confirms code/milestones/report calendar; TP¹/TB¹ assign the project officer; progress/acceptance waits. | Explicit creation/copy audit. |
| In progress | Progress, milestones, reports, tasks, files. | Participants update assigned work; members cannot change authority/membership/final state. | Changes and evidence audited. |
| Report due | Due banner and report CTA/queue. | PI submits; assigned CV³ reviews/follows up (no tờ trình). | Reminder/submission audit; does not imply acceptance. |
| Delayed | Missed item, owner, risk, next action. | Reminder/escalate/update/request adjustment. | Derived overdue flag; never auto-pause/reject/close. |
| Pending adjustment (request flag) | Request impact (incl. funding change), CV appraisal, routing stage and signature. | PI submits or withdraws a typed milestone/scope-plan/membership/funding change; assigned CV³ appraises and drafts the `PROJECT_ADJUSTMENT` tờ trình; TB → TP route; GĐ or PGĐ-KH signs. No Phòng KHQS role decides. If no eligible step actor or conflict-free signer exists, the PI withdraws. | Direct controlled-field edits disabled after activation; duration/end-date increase is not an adjustment; the signature applies the change atomically; old code states `under_staff_review` must be reconciled with routing. |
| Pending extension (request flag) | Requested/current end date, CV appraisal, routing stage and signature. | PI submits or withdraws a later end date; assigned CV³ appraises and drafts the `PROJECT_EXTENSION` tờ trình; TB → TP route; GĐ or PGĐ-KH signs. Same no-eligible-actor withdrawal rule. | Direct end-date edits disabled; no extension applies before the signature; old code states `under_staff_validation` / `ready_for_head_decision` must be reconciled with routing. |
| Pending acceptance | Dossier readiness and assignment progress. | PI submits; assigned CV³ checks, prepares the acceptance council and drafts the `ACCEPTANCE_COUNCIL` tờ trình; GĐ or PGĐ-KH signs the council; evaluator evaluates. | Version/assignment audit; missing evidence blocks. |
| Under acceptance | Evaluation/aggregation/decision workspace. | Assigned evaluator/CV/signer actions by capability. | Conflict/disclosure checks; no completion before decision. |
| Completed | Final outputs and closed timeline. | Read/report/export; normal edits disabled; assigned CV³ drafts the `LIQUIDATION` tờ trình, signed by GĐ only. | Completion decision immutable; formal reopen only if later policy exists. |
| Paused | Reason, effective date, next review date. | Authorized resume/policy action; normal progress may be limited. | Pause/resume reason audited; no silent deadline reset. |

### Task states

| State | UI/backend task | Allowed/disabled action work | Audit/notification/edge cases |
| --- | --- | --- | --- |
| New | Owner, due, linked record, unstarted indicator. | Creator assigns; assignee accepts where supported. | Create/assign audit; no premature completion evidence. |
| Accepted | Acknowledgement and due date. | Assignee updates progress/status; manager controls reassign/cancel. | Acceptance audit. |
| In progress | Progress and latest update. | Assignee updates work/evidence; linked workflow unchanged. | Status/evidence audit. |
| Waiting for response | Waiting-on person/source and follow-up date. | Follow-up note/reminder; completion blocked until required response. | Reminder/follow-up audit. |
| Waiting for result approval | Submitted result and approver. | Authorized approver reviews; assignee cannot self-approve where separated. | Review audit and disclosure. |
| Completed | Completion date/evidence/history. | Read; reopen only explicit policy action. | Completion audit; normal edit disabled. |
| Overdue | Danger flag plus original due date/owner. | Update/complete/request extension/reassign where allowed. | Reminder/overdue event; no auto-cancel or linked transition. |
| Cancelled | Reason and history. | Read; restore only explicit policy action. | Cancellation reason/audit required. |

## MVP prioritization and dependency order

1. `[MVP]` Epic 1 foundation and Epic 2 identity/authorization facts.
2. `[MVP]` Epic 3 intake/proposal (incl. responsible-CV auto-assignment after the
   segment catalog) and Epic 4 check, assignment, evaluation, aggregation, approval
   routing, BGĐ signature and GĐ approval. Legacy order: 1.11 → 1.12 → 4.7 → 5.9 →
   (5.10, 5.11, 6.11, 6.12) → 11.6, 12.6.
3. `[MVP]` Epic 5 project initialization/tracking, Epic 6 basic tasks, Epic 7
   permission-checked files/history.
4. `[MVP]` Epic 8 role-aware dashboard/My Work/core alerts and Epic 9 core
   search/filter/report/export.
5. `[MVP]` Epic 10 important audit, in-app notifications, reminder hooks, and
   accessibility/security hardening for the core flows.
6. `[Should have]` Supporting seminar/student research and council/ethics
   slices, richer related documents, and broader cross-module reporting remain
   in the Phase 1 business scope and use the same contracts.
7. `[Later / non-MVP]` Advanced report builder, saved filters, complex charts,
   every-format preview, delegated approval, public portal, SSO/LDAP/OIDC/MFA,
   SMS, external integrations, digital signature, and native mobile workflows.

## Open Questions / Product Decisions Needed

- How is a BGĐ signer's or TP/TB's organization scope granted or revoked? (Signer
  per procedure is settled by matrix §7.4.)
- Is BGĐ approval or signature ever delegable? Approval delegation remains out of MVP
  unless its own future contract is explicitly approved. Proposal submission
  is PI-only and has no delegation path.
- Is preview required for any specific file format in MVP, or is authorized
  upload/download sufficient?
- Are saved filters required in MVP for any named operational queue?
- Must reports run synchronously within the request, or asynchronously with a
  status/expiry lifecycle for larger exports?
- Which notification channels apply to each event: in-app only, email, or both?
- Which dashboard charts, if any, are MVP-critical beyond KPI cards and action
  queues?
- Which named screens require mobile optimization beyond responsive desktop-first
  behavior in MVP?
- Is the audit log visible to every system administrator, or only to a narrower
  explicitly authorized audit-viewer capability?
- Seminar permissions: the matrix does not cover them; Epic 8 seminar stories stay
  unchanged until decided.
- Roster readiness "exactly two reviewers and at least three committee members"
  (Story 5.3) is not in the matrix; kept as-is.
- May BGĐ, PP or TB read other users' scientific CVs (Story 13.1)? The matrix
  gives profile management only to QT/TP/CV.
- Segment taxonomy values (level and nature) and who may set an approval
  submission to `REJECTED` or `CANCELLED` are not fixed by the matrix; take them
  from the `tuan/DocManS` routing implementation when ported.

## Traceability

| Requirement area | UX screen/component | Epic | Story/task | MVP priority |
| --- | --- | --- | --- | --- |
| Authentication | S01 Login, S02 Password, C01 App shell | Epic 1 | 1.1, S01-S02 | MVP |
| Dashboard | S03 Dashboard/My Work, C19 KPI card, C20 Alert list | Epic 8 | 8.1-8.4, S03 | MVP |
| Proposal intake | S04-S07, C11 Form section, C12 Stepper | Epic 3 | 3.1-3.4, S04-S07 | MVP |
| Completeness check | S07 Submit confirmation / supplement request / completeness check | Epic 4 | 4.1, S07 | MVP |
| Supplement request | S07, C16 Comment/note box, C23 Confirmation dialog | Epics 3-4 | 3.3, 4.1, S07 | MVP |
| Responsible CV and segments (FR72) | S07, S16 | Epics 2-3 | 2.5, 3.6 (legacy 1.12, 4.7) | MVP |
| Post-submission withdraw/edit/reopen (FR76) | S07, C23 Confirmation dialog | Epic 3 | 3.7 (legacy 4.8) | MVP |
| Reviewer assignment | S08 Reviewer assignment / reviewer evaluation, C18 Reviewer score form | Epic 4 | 4.2, S08 (legacy 5.11) | MVP |
| Reviewer evaluation | S08, C18 Reviewer score form | Epic 4 | 4.3, S08 | MVP |
| Approval routing (FR71) | S09 routing inbox, C15 Timeline/activity log | Epic 4 | 4.5, S09 (legacy 5.9) | MVP |
| BGĐ signature and GĐ decision (FR73, FR20-21) | S09, C17 Approval decision panel | Epic 4 | 4.4, 4.6, S09 (legacy 5.10) | MVP |
| Project tracking | S10-S11, C08 Status badge, C15 Timeline/activity log | Epic 5 | 5.1-5.5, S10-S11 (legacy 6.11) | MVP |
| Funding metadata and liquidation (FR74) | S11, S15 | Epic 5 | 5.7, S11 (legacy 6.12) | MVP |
| Two-way anonymity (FR77) | S05, S08, C15, C26 | Epic 7 | 7.3 (legacy 3.6) | MVP |
| Per-role work queues (FR78) | S03, C19-C20 | Epic 8 | 8.2, 8.6 (legacy 11.6, 12.6) | MVP |
| Task management | S12 Task list / task detail / create-edit task | Epic 6 | 6.1-6.3, S12 | MVP |
| File management | S13 File upload / file preview-download / file history, C13-C14 | Epic 7 | 7.1-7.3, S13 | MVP |
| Search/reporting | S14 Global search, S15 Reports and export, C06-C07, C25 | Epic 9 | 9.1-9.3, S14-S15 | MVP |
| Administration | S16 User management / roles and permissions / catalog management / audit log, C05 | Epic 2 | 2.1-2.5, S16 (legacy 1.11, 2.7, 2.8) | MVP |
| Audit log | S16, C15 Timeline/activity log | Epic 10 | 10.1, S16 | MVP |

## Legacy FR decomposition retained for traceability

### Epic 1: Truy cập hệ thống và quản trị phân quyền hợp nhất

Quản trị viên có thể vận hành tài khoản, vai trò hệ thống, phạm vi tổ chức,
quan hệ theo hồ sơ, ủy quyền và cấu hình dùng chung; người dùng đăng nhập vào
một không gian làm việc duy nhất với quyền do backend quyết định.

**FRs covered:** FR1, FR2, FR3, FR4, FR4a, FR5, FR6, FR6a, FR6b, FR6c, FR6d, FR6e, FR7, FR8, FR72 (Story 1.12).

### Epic 2: Hồ sơ nhà khoa học và định danh quan hệ

Người có thẩm quyền có thể quản lý hồ sơ nhà khoa học, liên kết tài khoản và
lịch sử tham gia, tìm kiếm đúng phạm vi và ngăn xung đột lợi ích ngay từ nguồn
định danh.

**FRs covered:** FR65, FR66, FR67, FR67a, FR68, FR69, FR75, FR79.

### Epic 3: Tệp nghiệp vụ, lịch sử và kiểm toán

Người dùng có thể làm việc an toàn với tệp, lịch sử và audit của hồ sơ trong
phạm vi được phép, với metadata và phiên bản có khả năng truy vết.

**FRs covered:** FR36, FR37, FR38, FR39, FR40, FR77.

### Epic 4: Tiếp nhận và nộp đề xuất nghiên cứu

TP và CV có thể mở đợt tiếp nhận; chủ nhiệm (mọi vai trò trừ QT/NNB) có thể lập,
kiểm tra và nộp một đề xuất đầy đủ cùng tệp và lịch sử nộp; hệ thống tự động giao
CV phụ trách theo mảng và CV phụ trách xử lý yêu cầu rút/sửa sau nộp.

**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR72 (Story 4.7), FR76.

### Epic 5: Kiểm tra, đánh giá và phê duyệt đề xuất

Đề xuất đã nộp có thể đi trọn luồng bổ sung, đánh giá độc lập, tổng hợp, tờ trình
qua Phòng KHQS (CV → TB → TP → BGĐ), BGĐ ký thành lập hội đồng và GĐ quyết định đề
tài cùng kinh phí, với trạng thái, phân quyền và che giấu thông tin đúng chính sách.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR19a, FR20, FR21, FR22, FR71, FR73.

### Epic 6: Theo dõi và nghiệm thu đề tài đã phê duyệt

Golden Flow 4 refinement: [Project Execution contract](../docs/contracts/project-execution.md).
Implementation stories remain 6.x (the earlier product grouping calls this Epic 5).
Stories 6.1–6.7 and execution/history portions of 6.10 form this vertical slice;
6.8–6.9 acceptance/councils remain deferred. The assigned proposal CV creates the
project; TP¹/TB¹ separately assign the project CV, who confirms setup. GĐ's topic +
funding approval is the proposal gate before execution; after activation, the
assigned CV³ owns progress-report review/acceptance (no tờ trình) and appraises
Project Adjustment and Project Extension requests, which go through approval
routing (TB → TP) and are signed by GĐ or PGĐ-KH (Story 6.11). Funding metadata
and liquidation (signed by GĐ only) are Story 6.12. No Phòng KHQS role decides an
adjustment or extension.

> Role names and decision rights in the done and in-flight stories of this epic
> predate the 10-role model; see `docs/permission-matrix.md`. The cross-story ACs
> below belong to in-flight Stories 6.1–6.7 and are retained unchanged (decision
> 2026-10-18: keep AC + delta story); their Staff adjustment and Head extension
> decision rights are superseded by Story 6.11 (CV appraisal → routing → GĐ or
> PGĐ-KH signs).

**Cross-story acceptance criteria:**

- **Given** a confirmed execution project, **when** its active PI submits a report,
  **then** the submitted revision and pinned evidence are immutable; **when** assigned
  Staff returns it, **then** correction/resubmission creates a new revision.
- **Given** a submitted Project Adjustment within the typed milestone/scope-plan/
  governed-membership scope, **when** assigned project Staff reviews it, **then**
  that Staff member alone approves or rejects it and approval applies the typed
  change atomically; Head and Leadership decision actions are denied.
- **Given** a submitted Project Extension with a requested end date later than the
  current end date, **when** assigned Staff validates/prepares it, **then** a
  scoped, unconflicted Head alone approves or rejects it and Leadership decision
  actions are denied.
- **Given** rejection, stale context, duplicate terminal decision, inactive actor,
  prohibited conflict or missing authority, **when** mutation is attempted, **then**
  no project deadline/plan changes and the backend returns the existing denial contract.
- **Given** a missed deadline, **when** monitoring runs, **then** overdue is derived
  and visible only within authorized scope, without changing project state.
- **Given** a project participant or expired/revoked officer, **when** they attempt
  administrative, adjustment, extension or final-decision actions, **then** unrelated
  relationships do not supply those grants; generic status changes and approved-field
  overwrites fail.
- **Given** each material transition/evidence change, **when** it commits, **then**
  append-only audit/history records actor/time/object/action/result/correlation and
  relevant versions atomically; UI actions consume backend capabilities/denials.
- **Given** seeded approved/prepared/executing projects, upcoming/overdue items,
  draft/submitted reports and pending extension/adjustment, **when** the authorized
  demo actors exercise the flow, **then** creation, activation, reporting, Staff
  monitoring, Staff adjustment decisions and Head extension decisions can be
  verified without relying on seed identities in policy.


Chủ nhiệm, thành viên, CV phụ trách, TB/TP (bước tờ trình) và người ký BGĐ có thể
quản lý tiến độ, báo cáo, điều chỉnh, gia hạn, kinh phí, hồ sơ nghiệm thu, thanh lý
và quyết định cuối của đề tài.

**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR27a, FR28, FR29, FR30, FR30a, FR30b, FR73, FR74.

### Epic 7: Giao việc và theo dõi thực hiện

Người dùng có thể tạo, giao, phối hợp và hoàn tất công việc độc lập hoặc gắn với
hồ sơ nghiệp vụ, đồng thời nhận biết việc sắp đến hạn và quá hạn.

**FRs covered:** FR31, FR32, FR33, FR34, FR35.

### Epic 8: Quản lý seminar và nghiên cứu sinh viên

CV có thể quản lý kế hoạch, mốc, điều chỉnh, sản phẩm, kết quả và lịch sử của
seminar hoặc hoạt động nghiên cứu sinh viên; đề tài sinh viên NCKH do CV/NCV đăng
ký với tư cách giảng viên hướng dẫn và CV¹ duyệt, quản lý, hoàn thành (Story 8.6).

**FRs covered:** FR50, FR51, FR52, FR53.

### Epic 9: Quản lý văn bản liên quan

Người dùng có thẩm quyền có thể đăng ký, liên kết, thay thế và truy xuất văn bản
theo hiệu lực, phiên bản và phạm vi dữ liệu.

**FRs covered:** FR54, FR55, FR56, FR57.

### Epic 10: Hội đồng và hồ sơ đạo đức

Người được QT cấu hình thành lập hội đồng (mặc định TP¹/TB¹, D-035), CV³/TB¹/TP¹
lập tờ trình (D-036), chủ nhiệm, thư ký hội đồng, thành viên hội đồng/IRB và người
ký BGĐ (GĐ hoặc PGĐ-KH) có thể xử lý kế hoạch hội đồng hoặc hồ sơ đạo đức (IRB) trọn
vòng đời với đánh giá, tờ trình và chữ ký đúng phân công.

**FRs covered:** FR58, FR59, FR60, FR61, FR62, FR63, FR64, FR73.

### Epic 11: Thông báo, nhắc việc và khu “Của tôi”

Mỗi người dùng nhận được thông báo và nhắc việc đúng quyền, đồng thời có một
khu làm việc cá nhân hợp nhất cho hồ sơ tham gia và hành động đang chờ.

**FRs covered:** FR41, FR42, FR43, FR44, FR78.

### Epic 12: Dashboard, tìm kiếm, báo cáo và xuất dữ liệu

Người dùng có thể tìm kiếm, theo dõi chỉ số, đi đến hồ sơ nguồn và xuất báo cáo
trong đúng phạm vi được phép trên tất cả phân hệ đã hoàn thành.

**FRs covered:** FR45, FR45a, FR46, FR47, FR48, FR49, FR74 (Story 12.6).

### Epic 13: Lý lịch khoa học (BM-06)

Nhà khoa học lập, cập nhật, xem và in lý lịch khoa học chuẩn BM-06 ngay trên
Hồ sơ của tôi; người quản lý có thẩm quyền trong phạm vi xem được; dữ liệu nhạy
cảm được bảo vệ và thay đổi được truy vết.

**FRs covered:** FR70.

## Epic 1: Truy cập hệ thống và quản trị phân quyền hợp nhất

Quản trị viên có thể vận hành tài khoản, vai trò hệ thống, phạm vi tổ chức,
quan hệ theo hồ sơ, ủy quyền và cấu hình dùng chung; người dùng đăng nhập vào
một không gian làm việc duy nhất với quyền do backend quyết định.

> Role names and decision rights in the done and in-flight stories of this epic predate the 10-role model; see `docs/permission-matrix.md`. Stories 1.1–1.9 are done and keep their text; the 10-role registry, account migration and segments are delta Stories 1.11 and 1.12.

### Story 1.1: Khởi tạo workspace Nx và khung ứng dụng nội bộ [FR4, FR5]

As a người dùng nội bộ,
I want một khung ứng dụng responsive với ranh giới truy cập rõ ràng,
So that tôi có thể sử dụng các phân hệ được phép trên máy tính và thiết bị di động.

**Acceptance Criteria:**

**Given** repository chưa có workspace triển khai
**When** story nền tảng được thực hiện
**Then** workspace được khởi tạo từ starter đã chọn bằng `npx create-nx-workspace@latest docmansystem --template=nrwl/empty-template --workspaces`
**And** chỉ tạo web/API/shared-package/config tối thiểu cần cho story, không tạo trước entity của các domain tương lai.

**Given** ứng dụng web và API được khởi động trong môi trường phase 1
**When** người dùng mở khu vực nội bộ
**Then** hệ thống cung cấp sidebar hoặc điều hướng thu gọn, topbar, breadcrumb và vùng nội dung thống nhất
**And** bố cục không tràn ngang toàn trang tại 360px, 768px, 1024px và 1440px.

**Given** project context và UX guideline
**When** theme và component nền được cấu hình
**Then** giao diện dùng dark green `#145A37`, navigation `#0F3F2A`, light surfaces, sans-serif typography và một icon set thống nhất
**And** không dùng heavy gradient, glassmorphism, emoji icon, hero hoặc decoration không có giá trị nghiệp vụ.

**Given** một route hoặc API được đánh dấu là được bảo vệ
**When** request không có phiên hợp lệ
**Then** backend từ chối với mã xác thực ổn định
**And** web chuyển về luồng đăng nhập mà không hiển thị dữ liệu được bảo vệ.

**Given** workspace được build và cấu hình cho môi trường triển khai
**When** quality/security gates chạy
**Then** TypeScript strict và build web/API/shared packages thành công
**And** authenticated traffic yêu cầu encrypted transport ngoài môi trường local được kiểm soát.

**Given** trạng thái loading, rỗng hoặc lỗi
**When** khung ứng dụng hiển thị trạng thái đó
**Then** thông tin có text dễ hiểu, focus phù hợp và không phụ thuộc vào màu
**And** các điều khiển chính có accessible name và vùng bấm phù hợp.

### Story 1.2: Đăng nhập, đăng xuất và quản lý phiên nội bộ [FR4]

As a người dùng nội bộ,
I want đăng nhập và đăng xuất bằng tài khoản cục bộ,
So that tôi có một phiên làm việc an toàn trong hệ thống.

**Acceptance Criteria:**

**Given** tài khoản đang hoạt động và thông tin đăng nhập hợp lệ
**When** người dùng đăng nhập
**Then** hệ thống tạo phiên gắn với đúng user ID và vai trò hệ thống hiện hành
**And** ghi audit đăng nhập thành công mà không lưu mật khẩu hoặc token.

**Given** tài khoản đã kích hoạt có email hợp lệ và chưa có username
**When** người dùng đăng nhập bằng email và mật khẩu
**Then** hệ thống tạo phiên bình thường cho tài khoản đó.

**Given** tài khoản có system role `EXTERNAL_RESEARCHER_USER`
**When** đăng nhập thành công
**Then** session giữ đúng role external và không tự tạo PI, member, reviewer hoặc secretary relationship.

**Given** thông tin đăng nhập sai, tài khoản bị khóa hoặc bị vô hiệu hóa
**When** người dùng đăng nhập
**Then** hệ thống từ chối mà không tiết lộ chi tiết có thể dùng để dò tài khoản
**And** không tạo phiên hoặc quyền truy cập một phần.

**Given** người dùng đang có phiên hợp lệ
**When** họ đăng xuất hoặc phiên hết hạn
**Then** phiên không còn sử dụng được cho request tiếp theo
**And** sự kiện đăng xuất/hết hạn được xử lý nhất quán trên web và API.

### Story 1.3: Quản trị vòng đời tài khoản người dùng [FR1]

As a quản trị viên hệ thống,
I want tạo, sửa, kích hoạt, vô hiệu hóa và khóa tài khoản,
So that chỉ người dùng nội bộ hợp lệ có thể truy cập RTMS.

**Acceptance Criteria:**

**Given** quản trị viên có quyền quản lý người dùng
**When** họ tạo hoặc cập nhật một tài khoản với dữ liệu hợp lệ
**Then** backend lưu dữ liệu đã được DTO validation
**And** audit ghi actor, target, hành động, thời gian và thay đổi đã được lược bỏ dữ liệu nhạy cảm.

**Given** người thực hiện không phải quản trị viên
**When** họ gọi API quản trị tài khoản hoặc mở màn hình tương ứng
**Then** backend từ chối `ACTION_NOT_GRANTED`
**And** frontend không cung cấp hành động có thể thực thi.

**Given** một tài khoản đang có phiên
**When** quản trị viên khóa hoặc vô hiệu hóa tài khoản
**Then** các request được bảo vệ sau đó bị từ chối
**And** tác vụ chạy nền thay mặt tài khoản đó bị hủy theo hợp đồng công việc nền.

**Given** quản trị viên cấp `EXTERNAL_RESEARCHER_USER`
**When** tài khoản được lưu
**Then** tài khoản chỉ nhận quyền external theo policy và không xuất hiện các capability quản trị hoặc quyết định cuối.

**Given** Quản lý khoa học hoặc Thư ký khoa học có scope được cấp
**When** họ tạo hoặc quản lý một external researcher account
**Then** account chỉ được dùng trong các record/assignment được cấp
**And** thao tác quản trị này không cấp quyền PI, reviewer, secretary hoặc approval ngoài context.

### Story 1.4: Một vai trò hệ thống, phạm vi tổ chức và chuyển đổi dữ liệu cũ [FR2, FR3, FR6]

As a quản trị viên hệ thống,
I want mỗi tài khoản có đúng một vai trò hệ thống và phạm vi tổ chức rõ ràng,
So that quyền toàn hệ thống không bị cộng dồn với vai trò nghiệp vụ theo hồ sơ.

**Acceptance Criteria:**

**Given** một tài khoản được tạo hoặc cập nhật
**When** quản trị viên gán vai trò hệ thống
**Then** chỉ một trong bảy giá trị `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`, `RESEARCH_OVERSIGHT_AUTHORITY`, `RESEARCHER_INTERNAL_USER`, `EXTERNAL_RESEARCHER_USER` được hoạt động
**And** persistence và service boundary đều ngăn nhiều vai trò hệ thống đồng thời.

**Given** dữ liệu cũ chứa global PI, reviewer, council member hoặc nhiều role assignment
**When** migration được chạy
**Then** mỗi tài khoản được ánh xạ sang một vai trò hệ thống hợp lệ và quan hệ nghiệp vụ được chuyển sang nguồn hồ sơ tương ứng
**And** schema/data change đi qua Prisma migration đã được kiểm thử, còn cơ chế cũ không cấp quyền song song.

**Given** target record thuộc một đơn vị
**When** backend đánh giá organization scope
**Then** chỉ giao của tập organization ID của actor với organization ID của target hoặc cross-unit grant rõ ràng mới được chấp nhận
**And** hệ thống không tự suy diễn quyền theo cây đơn vị.

**Given** actor là `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD` hoặc `SCIENTIFIC_MANAGEMENT_STAFF`
**When** actor yêu cầu dữ liệu nghiệp vụ
**Then** `SYSTEM_ADMIN` không được cấp quyền ngầm
**And** Head chỉ xem proposal/project trong scope được cấp; Staff cần officer assignment
hiện hành cho management access, còn participation được xét độc lập; cả hai chịu state,
conflict/disclosure và không có quyền quyết định cuối từ role quản lý.

**Given** migration hoặc dữ liệu vai trò không thể giải quyết đơn nghĩa
**When** tài khoản thực hiện hành động được bảo vệ
**Then** request fail closed với mã context phù hợp
**And** migration tạo báo cáo các bản ghi cần xử lý thay vì chọn vai trò tùy ý.

**Given** tài khoản có `EXTERNAL_RESEARCHER_USER`
**When** policy đánh giá một proposal/project/review
**Then** chỉ relationship hoặc assignment đang hoạt động trên đúng record mới có thể đóng góp quyền
**And** system role external không thay thế context đó.

### Story 1.5: Đổi mật khẩu và đặt lại mật khẩu có kiểm soát [FR4a]

As a người dùng nội bộ,
I want đổi mật khẩu hoặc hoàn tất yêu cầu đặt lại được quản trị viên khởi tạo,
So that tôi có thể khôi phục truy cập mà không làm lộ bí mật.

**Acceptance Criteria:**

**Given** người dùng đã đăng nhập và cung cấp đúng mật khẩu hiện tại
**When** mật khẩu mới đạt chính sách
**Then** hệ thống thay đổi mật khẩu của chính tài khoản đó
**And** vô hiệu hóa thông tin phiên/reset cũ theo chính sách bảo mật.

**Given** mật khẩu hiện tại sai hoặc mật khẩu mới không đạt chính sách
**When** người dùng gửi yêu cầu
**Then** backend từ chối với thông báo có thể sửa được
**And** không thay đổi password hash hay trạng thái phiên.

**Given** quản trị viên khởi tạo đặt lại mật khẩu
**When** người dùng dùng token hợp lệ trước khi hết hạn
**Then** họ đặt được mật khẩu mới đúng một lần
**And** token không được lưu plaintext, không thể tái sử dụng và mọi bước quan trọng đều được audit.

**Given** tài khoản researcher ở trạng thái `PENDING_ACTIVATION`
**When** người dùng mở link kích hoạt còn hạn 48 giờ và thiết lập mật khẩu khớp xác nhận
**Then** token được đánh dấu đã dùng, tài khoản chuyển `ACTIVE`, và token không thể tái sử dụng.

### Story 1.6: Quản lý danh mục và cấu hình vận hành dùng chung [FR7, FR8]

As a quản trị viên hệ thống,
I want quản lý danh mục, tham số và mẫu thông báo dùng chung,
So that các workflow sử dụng dữ liệu tham chiếu nhất quán.

**Acceptance Criteria:**

**Given** quản trị viên mở một danh mục được hỗ trợ
**When** họ tạo, cập nhật, kích hoạt, ngừng dùng hoặc soft-delete một giá trị hợp lệ
**Then** thay đổi được validate và áp dụng theo quy tắc danh mục
**And** hồ sơ lịch sử không bị mất tham chiếu.

**Given** quản trị viên cập nhật tham số phase 1 hoặc mẫu thông báo
**When** cấu hình vượt validation hoặc chứa placeholder không hợp lệ
**Then** backend từ chối toàn bộ thay đổi
**And** trả lỗi gắn với trường cần sửa.

**Given** người không có quyền quản trị
**When** họ truy cập catalog/config API
**Then** backend từ chối
**And** mọi thay đổi thành công đều tạo audit record.

### Story 1.7: Hợp đồng phân quyền và bộ đánh giá policy dùng chung [FR5, FR6]

As a chủ sở hữu nghiệp vụ,
I want mọi điểm truy cập dùng cùng hợp đồng phân quyền backend,
So that cùng một ngữ cảnh luôn cho cùng một quyết định an toàn.

**Acceptance Criteria:**

**Given** Head oversight, Staff management responsibility or a participation/review/council/task relationship
**When** policy evaluates the exact record/action
**Then** the backend retains the access basis and applies role + scope + relationship/assignment + state + applicable delegation + conflict
**And** a Staff participation read never grants management actions; missing/ambiguous context fails closed.

**Given** một request được bảo vệ
**When** policy bắt đầu đánh giá
**Then** một `AuthorizationContextV1` được tạo với duy nhất một `asOf` UTC từ transaction clock
**And** mọi resolver nhận cùng actor, target, action và `asOf`.

**Given** các resolver trả về role, organization, relationship, assignment, delegation, state và conflict context
**When** policy tổng hợp kết quả
**Then** `RESOLVED_EMPTY` và `NOT_APPLICABLE` không tự cấp quyền
**And** `UNRESOLVED`, `STALE` hoặc `AMBIGUOUS` fail closed bằng mã V1 tương ứng.

**Given** nhiều điều kiện từ chối cùng xảy ra
**When** policy chọn mã chính
**Then** mã được chọn theo đúng thứ tự `AuthorizationDecisionCodeV1`
**And** mọi rule outcome vẫn được ghi trong `AuthorizationAuditV1`.

**Given** một mutation cung cấp context-version token cũ
**When** owning service so sánh token trong transaction ghi
**Then** không có thay đổi nghiệp vụ nào được lưu
**And** trả `CONTEXT_VERSION_MISMATCH` để client tải lại trước khi thử lại.

### Story 1.8: Capability response và giao diện không suy diễn quyền [FR6c]

As a người dùng tham gia hồ sơ,
I want giao diện hiển thị các quan hệ và hành động do backend tính,
So that tôi hiểu mình có thể hoặc không thể làm gì trên hồ sơ hiện tại.

**Acceptance Criteria:**

**Given** a Staff actor can view a record only through participation or review
**When** capabilities are projected
**Then** the response identifies that relationship and omits Scientific Management administrative grants
**And** Head oversight shows authorized current responsible Staff/unassigned information without disclosing hidden review assignments.

**Given** backend trả record hoặc list item được bảo vệ
**When** actor có một hoặc nhiều quan hệ trên record
**Then** response tuân thủ `ViewerAuthorizationV1` và giữ mọi quan hệ bảo mật liên quan của chính actor
**And** allowed/blocked actions dùng exact `PermissionActionV1`, mã V1 và lý do dễ hiểu.

**Given** actor vừa có quan hệ cho phép vừa bị conflict hoặc state guard chặn
**When** UI hiển thị hành động
**Then** hành động vẫn hiện nhưng bị vô hiệu hóa với lý do backend
**And** UI không chọn “vai trò cao nhất”, không cộng quyền và không tự tính lại policy.

**Given** capability chứa schema version hoặc code không được hỗ trợ
**When** client xử lý response
**Then** client fail closed cho hành động được bảo vệ
**And** hiển thị trạng thái cần tải lại/hỗ trợ thay vì đoán quyền.

**Given** cùng record xuất hiện ở list và detail
**When** không có thay đổi context version
**Then** nhãn quan hệ, allowed actions và blocked actions nhất quán
**And** trạng thái không dựa riêng vào màu.

**Given** actor là `EXTERNAL_RESEARCHER_USER` có một draft section được phân công
**When** capability được dựng
**Then** chỉ action trên section/file được cấp là allowed và PI, member, objective, budget, status, submit cùng action quyết định là blocked với lý do backend.

### Story 1.9: Vòng đời quan hệ theo hồ sơ và giới hạn thư ký khoa học [FR6a, FR6d, FR6e]

As a người dùng được phân công trên hồ sơ,
I want quyền của tôi bắt đầu và kết thúc đúng theo quan hệ thực tế,
So that quan hệ cũ hoặc chức danh thư ký không cấp quyền ngoài nhiệm vụ.

**Acceptance Criteria:**

**Given** `PROPOSAL_MANAGEMENT_OFFICER` or `PROJECT_MANAGEMENT_OFFICER` changes
**When** an explicitly authorized actor assigns, reassigns or revokes it
**Then** at most one active primary Staff officer exists per record, including concurrent requests
**And** reassignment atomically ends the old relationship and creates its successor with preserved history, actor/time/reason and audit.

**Given** an officer assignment ends but a valid participation/review relationship remains
**When** access is re-evaluated
**Then** management visibility/actions end immediately and only the independent relationship may grant access
**And** zero officers is unassigned, while unresolved context fails closed.

**Given** một quan hệ tham gia hoặc phân công có status và effective interval
**When** `effectiveFrom <= asOf < effectiveUntil` và status là `ACTIVE`
**Then** quan hệ có thể đóng góp các hành động đã đăng ký
**And** tại thời điểm hết hạn, đình chỉ hoặc thu hồi, quyền dừng ngay lập tức.

**Given** source domain cung cấp quan hệ cho policy
**When** shared authorization gọi fact-provider port
**Then** source domain vẫn sở hữu dữ liệu, version và lifecycle
**And** shared policy không đọc trực tiếp domain persistence hoặc lưu một generic authority table thay thế.

**Given** actor có nhiều loại quan hệ hợp lệ trên cùng record
**When** policy và UI xử lý record
**Then** mọi quan hệ được bảo tồn và action chỉ được cộng sau khi áp dụng toàn bộ denial
**And** quan hệ cùng loại chồng lấn bị từ chối theo registry multiplicity.

**Given** actor là `TOPIC_SECRETARY` đang hoạt động của record
**When** họ thao tác meeting material, minutes, file, task, tracking hoặc draft summary đã được cấp
**Then** backend cho phép action hành chính tương ứng
**And** reviewer assignment, scoring, membership change, approval, rejection và final decision vẫn bị chặn.

**Given** actor chỉ có system role `EXTERNAL_RESEARCHER_USER` nhưng không có relationship/assignment trên record
**When** họ gọi detail, file hoặc mutation endpoint
**Then** backend fail closed và không lộ metadata của record.

### Story 1.11: Registry mười vai trò và chuyển đổi tài khoản [FR2]

As a quản trị viên hệ thống (QT),
I want hệ thống dùng đúng mười vai trò của ma trận phân quyền và chuyển đổi tài khoản cũ có kiểm soát,
So that mỗi tài khoản giữ đúng một vai trò hiện hành mà không ai được cấp hoặc mất quyền do đoán sai.

> Trạng thái 2026-10-18: commit 0a39db3 đã giao registry mười mã và migration `20261016500000` (HEAD → TP, STAFF → CV, CHECK mười giá trị). Phần còn lại: phân loại từng tài khoản `RESEARCH_OVERSIGHT_AUTHORITY` cũ, báo cáo tài khoản mơ hồ, ràng buộc một người giữ TB và audit gán vai trò/chức danh.

**Acceptance Criteria:**

**Given** registry vai trò hệ thống
**When** session, API và UI đọc danh sách vai trò
**Then** chỉ có mười mã: `SYSTEM_ADMIN`, `LEADERSHIP_APPROVAL_AUTHORITY`, `SCIENCE_DEPUTY_DIRECTOR`, `RESEARCH_OVERSIGHT_AUTHORITY`, `RESEARCH_MANAGEMENT_HEAD`, `RESEARCH_MANAGEMENT_DEPUTY_HEAD`, `RESEARCH_BOARD_HEAD`, `RESEARCH_MANAGEMENT_STAFF`, `RESEARCHER_INTERNAL_USER`, `EXTERNAL_RESEARCHER_USER`
**And** mã cũ `SCIENTIFIC_MANAGEMENT_HEAD` / `SCIENTIFIC_MANAGEMENT_STAFF` không còn cấp quyền nào.

**Given** tài khoản đang giữ `SCIENTIFIC_MANAGEMENT_HEAD` hoặc `SCIENTIFIC_MANAGEMENT_STAFF`
**When** migration chạy
**Then** HEAD chuyển thành `RESEARCH_MANAGEMENT_HEAD` (TP) và STAFF chuyển thành `RESEARCH_MANAGEMENT_STAFF` (CV) trong một forward migration mới
**And** migration đã áp dụng trước đó không bị sửa; scope, quan hệ hồ sơ và lịch sử được giữ nguyên.

**Given** tài khoản đang giữ `RESEARCH_OVERSIGHT_AUTHORITY` theo nghĩa cũ (Phó Giám đốc phụ trách khoa học)
**When** migration chạy
**Then** hệ thống không tự đoán vai trò mới
**And** tài khoản được đưa vào báo cáo để QT phân loại từng người thành `SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH) hoặc `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD).

**Given** tài khoản có dữ liệu vai trò mơ hồ hoặc không khớp mười giá trị
**When** migration hoặc session đánh giá
**Then** tài khoản được báo cáo để xử lý thủ công và mọi hành động được bảo vệ fail closed
**And** không cấp quyền song song giữa mã cũ và mã mới.

**Given** QT gán vai trò `RESEARCH_BOARD_HEAD` (TB)
**When** đã có một tài khoản active khác giữ TB
**Then** backend từ chối vì TB chỉ có một người giữ
**And** tài khoản PP, TB và PGĐ-TD được tạo mới, không suy ra từ tài khoản cũ.

**Given** QT gán vai trò, scope hoặc chức danh hiển thị theo đơn vị (Trưởng khoa, Chủ nhiệm Bộ môn, …)
**When** thay đổi được lưu
**Then** audit ghi actor, tài khoản đích, vai trò, scope, chức danh và thời điểm
**And** chức danh đơn vị chỉ để hiển thị, không cấp quyền.

### Story 1.12: Danh mục mảng và giao mảng cho CV [FR72]

As a Trưởng phòng KHQS (TP),
I want quản lý danh mục mảng (cấp + tính chất) và giao mảng cho từng CV,
So that hồ sơ nộp vào được tự động giao đúng chuyên viên phụ trách.

**Acceptance Criteria:**

**Given** TP có unit scope
**When** TP tạo, cập nhật hoặc ngừng dùng một mảng gồm cấp và tính chất
**Then** backend validate và lưu mảng với version
**And** giá trị phân loại cấp và tính chất lấy từ danh mục được cấu hình, không hard-code trong story này.

**Given** TP giao, đổi hoặc thu hồi mảng cho một CV active
**When** thay đổi được lưu
**Then** liên kết CV–mảng có trạng thái và hiệu lực, lịch sử cũ được giữ
**And** audit ghi actor, CV, mảng (cấp/tính chất) và thời điểm.

**Given** actor là QT, BGĐ, PP, TB, CV, NCV hoặc NNB
**When** họ cố tạo mảng hoặc giao mảng cho CV
**Then** backend từ chối vì chỉ TP giao mảng
**And** TB và CV chỉ được xem mảng trong phạm vi được phép.

**Given** một CV bị ngừng hoạt động hoặc đổi vai trò
**When** auto-assignment đánh giá ứng viên
**Then** liên kết mảng của tài khoản đó không còn được dùng
**And** hồ sơ đang giao không tự chuyển mà cần TP¹/TB¹ giao lại có audit *(cần xác nhận)*.

## Epic 2: Hồ sơ nhà khoa học và định danh quan hệ

Người có thẩm quyền có thể quản lý hồ sơ nhà khoa học, liên kết tài khoản và
lịch sử tham gia, tìm kiếm đúng phạm vi và ngăn xung đột lợi ích ngay từ nguồn
định danh.

> Role names and decision rights in the done and in-flight stories of this epic predate the 10-role model; see `docs/permission-matrix.md`. Story 2.1 (in review) keeps its ACs; the QT/TP¹/CV¹ profile-manager delta is Story 2.8 and the duplicate-merge decision is Story 2.7.

### Story 2.1: Tạo và duy trì hồ sơ nhà khoa học [FR65]

As a người quản lý hồ sơ nhà khoa học,
I want tạo và cập nhật hồ sơ học thuật độc lập với tài khoản đăng nhập,
So that hệ thống quản lý được cả nhà khoa học đã và chưa có tài khoản.

**Acceptance Criteria:**

**Given** người dùng có quyền quản lý hồ sơ trong phạm vi đơn vị
**When** họ tạo hồ sơ với họ tên, đơn vị, học hàm/học vị, chức danh, liên hệ, lĩnh vực và từ khóa chuyên môn hợp lệ
**Then** hệ thống lưu một researcher profile có trạng thái hoạt động
**And** không bắt buộc phải tạo user account.

**Given** người dùng tạo hồ sơ INTERNAL
**When** họ lưu với email hợp lệ
**Then** hệ thống mặc định tạo và liên kết tài khoản `PENDING_ACTIVATION` với role `RESEARCHER_INTERNAL_USER`
**And** gửi email kích hoạt mà không tạo hoặc gửi mật khẩu tạm thời.

**Given** người dùng tạo hồ sơ EXTERNAL
**When** checkbox `Tạo tài khoản truy cập hệ thống` không được chọn
**Then** hệ thống chỉ lưu ResearcherProfile và không tạo UserAccount.

**Given** người dùng tạo hồ sơ EXTERNAL
**When** checkbox `Tạo tài khoản truy cập hệ thống` được chọn
**Then** email trở thành bắt buộc và hệ thống tạo/liên kết tài khoản `PENDING_ACTIVATION` với role `EXTERNAL_RESEARCHER_USER`.

**Given** hồ sơ có dấu hiệu trùng định danh hoặc thông tin nhân thân quan trọng
**When** người dùng lưu hồ sơ
**Then** hệ thống cảnh báo các ứng viên trùng trong phạm vi họ được xem
**And** không tự động gộp hoặc tiết lộ hồ sơ ngoài phạm vi.

**Given** người dùng ngoài organization scope hoặc không có quyền quản lý
**When** họ tạo, sửa, kích hoạt hoặc ngừng hoạt động hồ sơ
**Then** backend từ chối
**And** không làm lộ dữ liệu hồ sơ qua lỗi hoặc response.

**Given** hồ sơ được cập nhật trạng thái hoặc thông tin quan trọng
**When** mutation hoàn tất
**Then** thay đổi dùng DTO validation và operation có tên rõ ràng
**And** audit ghi actor, target, context và before/after đã lược bỏ dữ liệu nhạy cảm.

### Story 2.2: Liên kết hồ sơ nhà khoa học với tài khoản [FR66]

As a người quản lý hồ sơ (QT trong platform scope, TP¹ hoặc CV¹),
I want liên kết đúng hồ sơ nhà khoa học với đúng tài khoản,
So that quan hệ nghiệp vụ có thể tham chiếu một định danh thống nhất mà không biến hồ sơ thành vai trò hệ thống.

**Acceptance Criteria:**

**Given** hồ sơ nhà khoa học và tài khoản đều tồn tại trong phạm vi cho phép của QT, TP¹ hoặc CV¹
**When** người quản lý tạo liên kết
**Then** liên kết được lưu với trạng thái, effective interval và version
**And** không thay đổi vai trò hệ thống hoặc tự cấp bất kỳ record action nào.

**Given** tài khoản hoặc hồ sơ đã có một liên kết hoạt động không tương thích
**When** người quản lý cố tạo liên kết trùng
**Then** backend từ chối bằng lỗi nghiệp vụ rõ ràng
**And** không tự động thay thế liên kết hiện có.

**Given** tài khoản liên kết đang `PENDING_ACTIVATION`
**When** người quản lý gửi lại kích hoạt
**Then** token chưa dùng trước đó bị vô hiệu hóa và email kích hoạt mới chỉ chứa link đặt mật khẩu dùng một lần, có hạn đúng 48 giờ, được phát hành
**And** không tạo hoặc gửi mật khẩu tạm thời.

**Given** actor là TB, PP, BGĐ, NCV hoặc NNB không có quyền quản lý hồ sơ
**When** họ tạo, sửa hoặc hủy liên kết hồ sơ–tài khoản
**Then** backend từ chối mà không lộ dữ liệu hồ sơ ngoài phạm vi.

**Given** nhà nghiên cứu đã kích hoạt tài khoản
**When** họ đặt username duy nhất trong My Profile
**Then** username được lưu cho tài khoản đang liên kết và có thể dùng để đăng nhập cùng mật khẩu như email.

**Given** liên kết bị đình chỉ, kết thúc hoặc sửa sai
**When** operation vòng đời được thực hiện
**Then** lịch sử cũ được bảo tồn bằng successor/audit record
**And** thay đổi có hiệu lực theo cùng quy tắc UTC half-open của authorization.

**Given** tài khoản bị vô hiệu hóa
**When** hồ sơ nhà khoa học được truy vấn
**Then** hồ sơ học thuật vẫn tồn tại theo quyền dữ liệu
**And** tài khoản không còn được dùng làm actor cho hành động được bảo vệ.

### Story 2.3: Lịch sử tham gia từ nguồn nghiệp vụ có thẩm quyền [FR67]

As a người xem hồ sơ nhà khoa học được phép,
I want xem lịch sử tham gia được tổng hợp từ các phân hệ nguồn,
So that tôi có bức tranh đúng mà không dùng bản sao lịch sử để cấp quyền.

**Acceptance Criteria:**

**Given** một source domain đã vượt integration gate và có quan hệ với researcher profile
**When** màn hình hồ sơ yêu cầu lịch sử tham gia
**Then** hệ thống gọi authorized query contract của source tại cùng request-wide `asOf`
**And** trả domain, record, loại quan hệ, trạng thái và effective interval trong phạm vi người xem.

**Given** một source domain chưa được đăng ký hoặc chưa contract-complete
**When** hồ sơ được truy vấn
**Then** hệ thống không suy diễn quan hệ từ generic link hoặc dữ liệu tên người
**And** nguồn đó không được quảng bá là đã bao phủ trong participation history.

**Given** một enabled source trả unresolved, stale hoặc failure
**When** hệ thống tổng hợp lịch sử
**Then** toàn bộ aggregation fail closed với mã context tương ứng
**And** không trả lịch sử hoặc tổng số một phần có thể gây hiểu nhầm.

**Given** lịch sử có reviewer, council hoặc ethics assignment được bảo vệ
**When** actor không thuộc audience được phép
**Then** assignment và review metadata bị loại theo disclosure matrix
**And** researcher history không trở thành nguồn authorization cho mutation.

### Story 2.4: Kiểm tra xung đột lợi ích trước khi phân công [FR67a]

As a TP¹, TB¹ hoặc CV³ phụ trách hồ sơ,
I want kiểm tra xung đột trước khi gán vai trò nhạy cảm,
So that không xảy ra tự đánh giá, tự phê duyệt hoặc thư ký ra quyết định trái thẩm quyền.

**Acceptance Criteria:**

**Given** a participant is proposed as responsible officer (CV), reviewer, evaluation/acceptance/IRB council member, tờ trình reviewer/approver (TB/TP step) or BGĐ signer, or a current holder is proposed as participant
**When** assignment/participation is created or changed, and again when the protected action executes
**Then** the same-record conflict denies the mutation; reviewer/final-decision conflict for the same round and mutually exclusive council positions also deny
**And** an unrelated record's legitimate relationship neither blocks participation nor grants management access.

**Given** actor được đề xuất làm CV phụ trách, reviewer, council member, IRB member, secretary, người rà soát/duyệt tờ trình (bước TB/TP) hoặc người ký BGĐ
**When** source domain gọi conflict preflight với target record
**Then** service đánh giá mọi quan hệ tham gia đang hoạt động của actor trên chính record
**And** trả decision code, reason và context version mà không chọn một “vai trò cao nhất”.

**Given** actor là PI, `TOPIC_MEMBER` hoặc team secretary của record
**When** họ được phân công review, bước tờ trình, chữ ký hoặc approval cho record đó
**Then** backend từ chối `CONFLICT_DENIED`
**And** không tạo assignment dù actor có system role hoặc quan hệ khác cho phép.

**Given** actor là `TOPIC_SECRETARY` của record
**When** họ được giao scoring, reviewer assignment, approval, rejection hoặc final decision
**Then** backend từ chối theo conflict/non-delegable policy
**And** các action hành chính hợp lệ của thư ký không bị loại bỏ.

**Given** cùng một nhà khoa học tham gia hai record khác nhau
**When** conflict chỉ tồn tại trên một record
**Then** denial chỉ áp dụng cho record đó
**And** record còn lại được đánh giá độc lập theo context của chính nó.

**Given** candidate đã có một vị trí active trong nhóm chair, council secretary,
council member hoặc reviewer/council reviewer của cùng evaluation context
**When** preflight hoặc mutation đề xuất cùng vị trí hay vị trí khác có thời gian chồng lấn
**Then** backend từ chối theo compatibility/multiplicity definition chuẩn
**And** assignment ở record/council/round khác không tạo conflict.

**Given** preflight từng trả allowed
**When** source participation, vị trí/interval hoặc context version thay đổi trước mutation
**Then** authoritative mutation đánh giá lại và từ chối stale/current denial, không ghi một phần
**And** bulk, import, direct API và administrative path không được bỏ qua policy này.

### Story 2.5: Tìm kiếm và xem danh bạ nhà khoa học theo phạm vi [FR68]

As a người quản lý hồ sơ (QT, TP¹, CV¹) hoặc người dùng được phép tìm ứng viên,
I want tìm kiếm nhà khoa học theo tên, đơn vị, lĩnh vực và chuyên môn,
So that tôi có thể tìm đúng người cho nhu cầu nghiệp vụ trong phạm vi được giao.

**Acceptance Criteria:**

**Given** actor có organization/data scope
**When** họ tìm theo tên, đơn vị, lĩnh vực, expertise keyword hoặc trạng thái
**Then** kết quả, facet và tổng số chỉ được tính từ hồ sơ được phép xem
**And** việc không có kết quả không tiết lộ sự tồn tại của hồ sơ ngoài phạm vi.

**Given** danh sách hiển thị trên desktop, tablet hoặc mobile
**When** viewport thay đổi
**Then** desktop dùng bảng, mobile dùng card/contained scroll phù hợp
**And** không có full-page horizontal scroll, trạng thái chỉ báo bằng text/icon và màu.

**Given** actor mở một hồ sơ từ kết quả tìm kiếm
**When** detail được tải
**Then** UI hiển thị thông tin học thuật, trạng thái tài khoản liên kết và participation history được phép
**And** system role được trình bày tách biệt khỏi mọi record relationship.

### Story 2.6: Timeline và audit hồ sơ nhà khoa học [FR69]

As a người có trách nhiệm kiểm tra,
I want xem timeline thay đổi và liên kết của hồ sơ nhà khoa học,
So that tôi có thể truy vết ai đã thay đổi thông tin hoặc quan hệ nào.

**Acceptance Criteria:**

**Given** hồ sơ có các thay đổi identity, status, account link hoặc source participation link
**When** người có quyền mở timeline
**Then** các event được sắp theo thời gian với actor, action, target, source và context cần thiết
**And** correction không xóa vật lý lịch sử cũ.

**Given** audit chứa dữ liệu nhạy cảm hoặc assignment bị hạn chế
**When** actor chỉ có quyền xem lịch sử nghiệp vụ thông thường
**Then** response lược bỏ protected identity, conflict source và review details
**And** audit viewer chuyên trách mới có thể xem mức chi tiết được chính sách cho phép.

**Given** actor không có quyền xem hồ sơ hoặc audit tương ứng
**When** họ truy vấn timeline trực tiếp
**Then** backend từ chối mà không trả event count hoặc metadata
**And** export/history endpoint áp dụng cùng policy với detail view.

**Given** một thay đổi hồ sơ thành công
**When** audit append thất bại trong transaction bắt buộc
**Then** mutation không được hoàn tất một phần
**And** hệ thống trả lỗi có correlation ID để hỗ trợ xử lý.

### Story 2.7: Cảnh báo hồ sơ trùng và TB/TP quyết định gộp [FR75]

As a TB¹ hoặc TP¹,
I want nhận cảnh báo hồ sơ nhà khoa học trùng và quyết định gộp,
So that mỗi nhà khoa học có một định danh thống nhất mà lịch sử không bị mất.

**Acceptance Criteria:**

**Given** QT, TP¹ hoặc CV¹ tạo hoặc sửa hồ sơ có dấu hiệu trùng định danh
**When** họ xác nhận cảnh báo trùng
**Then** hệ thống tạo một cảnh báo trùng có audit
**And** TB¹ và TP¹ trong phạm vi nhận thông báo.

**Given** TB¹ hoặc TP¹ mở cảnh báo
**When** họ quyết định gộp hoặc không gộp, kèm lý do
**Then** quyết định được ghi với actor, hồ sơ liên quan và thời điểm
**And** khi gộp, liên kết tài khoản, quan hệ tham gia và lý lịch khoa học được giữ lịch sử, không xóa vật lý hồ sơ cũ.

**Given** actor là QT, CV, PP, BGĐ, NCV hoặc NNB
**When** họ cố quyết định gộp
**Then** backend từ chối vì chỉ TB/TP quyết định
**And** QT, TP và CV vẫn được nêu cảnh báo.

**Given** hai hồ sơ có tài khoản liên kết active xung đột hoặc quan hệ đang dùng trong phân công
**When** gộp được yêu cầu
**Then** backend kiểm tra lại conflict và liên kết, từ chối nếu không an toàn
**And** không tạo hai liên kết active cho một tài khoản.

### Story 2.8: Delta cho 2.1: người quản lý hồ sơ QT/TP¹/CV¹ [FR65]

As a người quản lý hồ sơ nhà khoa học (QT trong platform scope, TP¹ hoặc CV¹),
I want quyền quản lý hồ sơ theo mô hình mười vai trò,
So that Story 2.1 (đang review, giữ nguyên AC) vận hành đúng ma trận phân quyền mới.

**Acceptance Criteria:**

**Given** actor là QT, TP¹ hoặc CV¹
**When** họ tạo, sửa, kích hoạt/ngừng hồ sơ hoặc tạo/liên kết/hủy liên kết tài khoản trong phạm vi
**Then** backend cho phép theo đúng scope được cấp
**And** audit ghi actor, hồ sơ, hành động và context.

**Given** actor là TB, PP, GĐ, PGĐ-KH, PGĐ-TD, NCV hoặc NNB
**When** họ gọi thao tác quản lý hồ sơ của người khác
**Then** backend từ chối
**And** họ vẫn tự cập nhật lý lịch khoa học của mình qua My Profile.

**Given** dữ liệu và seed đang dùng mã vai trò cũ cho người quản lý hồ sơ
**When** Story 1.11 đã chuyển đổi tài khoản
**Then** quyền quản lý hồ sơ dùng `RESEARCH_MANAGEMENT_HEAD` và `RESEARCH_MANAGEMENT_STAFF`
**And** không mã cũ nào còn cấp quyền quản lý hồ sơ.

**Given** hồ sơ được cấp tài khoản
**When** email kích hoạt được gửi
**Then** email chỉ chứa link đặt mật khẩu dùng một lần có hạn 48 giờ
**And** không tạo, gửi hoặc lưu mật khẩu tạm thời.

## Epic 3: Tệp nghiệp vụ, lịch sử và kiểm toán

Người dùng có thể làm việc an toàn với tệp, lịch sử và audit của hồ sơ trong
phạm vi được phép, với metadata và phiên bản có khả năng truy vết.

### Story 3.1: Tải lên và truy cập tệp qua hồ sơ nguồn [FR36]

As a người dùng có quyền trên hồ sơ nghiệp vụ,
I want tải lên, xem và tải xuống tệp thông qua hồ sơ nguồn,
So that nội dung tệp luôn được bảo vệ bởi cùng policy với hồ sơ.

**Acceptance Criteria:**

**Given** actor có exact upload action trên target record
**When** họ tải lên tệp đúng loại, kích thước và association rule
**Then** binary được lưu trong MinIO và metadata được lưu trong PostgreSQL
**And** file record gắn với target domain, target record, uploader, thời gian và context version.

**Given** actor không có quyền, target context unresolved hoặc file không đạt validation
**When** upload được gửi
**Then** backend từ chối trước khi tạo association sử dụng được
**And** không để lại business record hoặc object mồ côi có thể truy cập.

**Given** actor yêu cầu xem metadata, preview hoặc download
**When** file service xử lý request
**Then** service tải authorization facts từ owning domain và đánh giá policy tại thời điểm request
**And** object key hoặc URL MinIO không được dùng như authorization token.

**Given** file thuộc review material bị hạn chế disclosure
**When** PI, member hoặc secretary yêu cầu trước disclosure state
**Then** cả metadata và nội dung bị loại hoặc từ chối theo disclosure matrix
**And** response không tiết lộ tên file, người tải hoặc sự tồn tại của bản nội bộ.

### Story 3.2: Metadata, phiên bản, thay thế và soft delete tệp [FR37]

As a người dùng được phép quản lý tệp,
I want thay thế hoặc ngừng sử dụng tệp mà vẫn giữ lịch sử,
So that hồ sơ luôn truy vết được phiên bản đã dùng.

**Acceptance Criteria:**

**Given** actor có exact replace action và file hiện hành
**When** họ tải bản thay thế hợp lệ
**Then** hệ thống tạo version mới và đánh dấu quan hệ thay thế
**And** version cũ vẫn còn trong history nhưng không được trình bày là hiện hành.

**Given** actor có exact delete action
**When** họ xóa một file record quan trọng
**Then** hệ thống soft-delete metadata và chặn truy cập thông thường
**And** không xóa vật lý lịch sử cần cho audit nếu retention policy chưa cho phép.

**Given** hai request cùng thay thế một version
**When** request sau dùng context/version token cũ
**Then** backend trả `CONTEXT_VERSION_MISMATCH`
**And** không tạo hai current versions.

**Given** UI hiển thị danh sách tệp
**When** actor có quyền xem
**Then** mỗi mục có tên, loại, dung lượng, uploader, thời gian, version và trạng thái
**And** download/replace/delete chỉ hiện theo `ViewerAuthorizationV1`.

### Story 3.3: Timeline workflow và lịch sử hồ sơ nghiệp vụ [FR38]

As a người tham gia hồ sơ được phép,
I want xem timeline trạng thái và hành động nghiệp vụ,
So that tôi biết hồ sơ đã đi qua các bước nào và cần làm gì tiếp theo.

**Acceptance Criteria:**

**Given** source record có state transition, submission, supplement, assignment, decision, file hoặc task event
**When** detail view yêu cầu timeline
**Then** owning domain trả các event đã được phân quyền theo thứ tự thời gian
**And** mỗi event có loại, thời gian, actor đã được phép hiển thị, trạng thái và context liên quan.

**Given** một event chứa reviewer identity, raw score, comment hoặc conflict source
**When** viewer không thuộc audience nội bộ được phép
**Then** event được lược bỏ hoặc chuyển thành trạng thái tổng quát theo disclosure matrix
**And** timeline không để lộ dữ liệu qua title, count hoặc attachment.

**Given** viewer là PI hoặc reviewer của record (ẩn danh hai chiều)
**When** họ yêu cầu timeline hoặc action log của record
**Then** backend không trả action log của record cho họ
**And** PI chỉ thấy trạng thái và lịch sử bước tờ trình của chính hồ sơ mình, không có danh tính reviewer.

**Given** source domain trả stale, unresolved hoặc version mismatch
**When** timeline được tải
**Then** toàn bộ timeline tương ứng fail closed
**And** UI hiển thị lỗi có thể tải lại thay vì trộn dữ liệu cũ và mới.

**Given** timeline hiển thị trên mobile hoặc desktop
**When** người dùng điều hướng bằng bàn phím hoặc screen reader
**Then** thứ tự event và nhãn trạng thái có semantics rõ
**And** thông tin truy vết quan trọng không bị giấu chỉ trong tooltip.

### Story 3.4: Ghi audit cho hành động quan trọng [FR39]

As a người chịu trách nhiệm quản trị,
I want mọi hành động quan trọng tạo audit event nhất quán,
So that hệ thống có bằng chứng về ai đã làm gì và dựa trên quyền nào.

**Acceptance Criteria:**

**Given** một critical action được khai báo trong registry
**When** action thành công hoặc bị từ chối vì policy
**Then** hệ thống append `AuthorizationAuditV1` với event/correlation ID, actor, target, exact action, request-wide `asOf`, policy/schema version, context versions và decision
**And** lưu rule outcomes cần thiết mà không ghi password, token hoặc payload nhạy cảm thô.

**Given** action chạy qua background job
**When** side effect được thực hiện hoặc hủy
**Then** audit ghi service principal, initiating/on-behalf-of actor và lý do hiện hành
**And** phân biệt rõ action người dùng với `SERVICE_ONLY` action.

**Given** business mutation yêu cầu audit trong cùng transaction
**When** audit append thất bại
**Then** mutation rollback hoặc được đưa vào cơ chế transactional outbox đã được kiến trúc chấp thuận
**And** không có trạng thái nghiệp vụ thành công nhưng mất audit bắt buộc.

**Given** tờ trình được submit, forward, return, approve hoặc sign, hoặc CV phụ trách được giao/giao lại/thu hồi (thủ công hoặc tự động theo mảng)
**When** action hoàn tất
**Then** audit ghi actor (hoặc `System` cho tự động giao), tờ trình/record, loại thủ tục, bước, quyết định, lý do, mảng khớp và thời điểm theo matrix §11
**And** các event gán mảng cho CV, thay đổi kinh phí và thanh lý cũng được audit.

**Given** audit có before/after values
**When** event được ghi
**Then** dữ liệu được redaction theo loại trường và audience
**And** audit record là append-only, không bị chỉnh sửa để che thay đổi cũ.

### Story 3.5: Tra cứu audit và lịch sử theo thẩm quyền [FR40]

As a quản trị viên hoặc người phụ trách nghiệp vụ được phép,
I want tìm và xem audit theo phạm vi trách nhiệm,
So that tôi có thể điều tra hoặc đối chiếu một hành động mà không thấy dữ liệu ngoài quyền.

**Acceptance Criteria:**

**Given** actor có audit-view action và organization/data scope
**When** họ lọc theo thời gian, actor, target, action, decision code hoặc correlation ID
**Then** backend chỉ trả audit event trong scope
**And** total count, facet và pagination không tính bản ghi ngoài quyền.

**Given** actor có quyền xem history nghiệp vụ nhưng không có quyền xem audit bảo mật
**When** họ mở detail record
**Then** UI chỉ trả timeline mức nghiệp vụ đã redaction
**And** không cung cấp rule outcomes, conflict source hoặc hidden assignment.

**Given** actor mở một audit event
**When** event chứa context versions và decision
**Then** UI trình bày primary code, reason, target, action và correlation ID dễ hiểu
**And** protected before/after fields tiếp tục tuân thủ redaction.

**Given** actor không có quyền hoặc truy vấn target ngoài scope
**When** họ gọi audit/history API trực tiếp
**Then** backend từ chối mà không tiết lộ event existence hoặc count
**And** hành vi được kiểm thử cho allowed, denied và incomplete-context cases.

**Given** actor là PI hoặc reviewer của record
**When** họ gọi audit/action-log API của record đó
**Then** backend từ chối theo ẩn danh hai chiều
**And** cùng bộ lọc áp dụng cho list, detail, file và export.

### Story 3.6: Ẩn danh hai chiều và danh tính reviewer cho TB/TP [FR77]

As a TB¹ hoặc TP¹,
I want xem danh tính reviewer trên hồ sơ trong phạm vi trong khi chủ nhiệm và reviewer không thấy nhật ký hành động,
So that đánh giá giữ ẩn danh hai chiều mà người điều phối vẫn kiểm soát được phân công.

**Acceptance Criteria:**

**Given** viewer là PI, thành viên đề tài hoặc reviewer của record
**When** họ gọi list, detail, file, history, notification hoặc export
**Then** action log của record và danh tính reviewer bị loại khỏi response
**And** không lộ qua count, tên file, metadata hay tiêu đề thông báo.

**Given** viewer là TB¹ hoặc TP¹ có unit scope trên record
**When** họ mở danh sách phân công hoặc đánh giá
**Then** họ thấy danh tính reviewer
**And** quyền này không mở raw score/comment ngoài mức disclosure đã được định nghĩa.

**Given** viewer là reviewer khác trên cùng record
**When** họ yêu cầu danh tính hoặc đánh giá của reviewer khác
**Then** backend từ chối
**And** quyết định áp dụng giống nhau trên list, detail, file và export.

**Given** policy ẩn danh đổi giữa lúc tải danh sách và lúc xuất file
**When** export chạy
**Then** export re-authorize và áp dụng bộ lọc hiện hành
**And** không chứa cột danh tính hoặc action log bị cấm.

### Story 3.7: Vòng đời đề tài 9 bước và timeline xuyên hồ sơ [D-033, FR38]

As a người tham gia hoặc quản lý đề tài,
I want xem đề tài đang ở bước nào trong 9 bước và lịch sử từng bước,
So that mọi người cùng hiểu tiến trình theo một mô hình vòng đời duy nhất.

Phụ thuộc Stories 3.3, 6.1, 6.10. Bước được suy ra theo bảng
`architecture.md` → "Topic Lifecycle Step Mapping (D-033)".

**Acceptance Criteria:**

**Given** viewer được đọc proposal hoặc đề tài đã phê duyệt
**When** detail được tải
**Then** backend trả bước suy ra (1–9) và giai đoạn theo bảng ánh xạ; UI stepper hiển thị 2 giai đoạn "Giai đoạn đề xuất", "Giai đoạn thực hiện và kết thúc" và 9 bước, đánh dấu bước 5 và 9 là quyết định chính thức
**And** không lưu trường bước riêng và client không tự suy bước từ status thô.

**Given** đề tài đã phê duyệt có proposal nguồn
**When** timeline được tải
**Then** lịch sử proposal (bước 1–5) và lịch sử đề tài (bước 6–9) hiển thị trong một danh sách có thứ tự, mỗi event gắn bước của nó
**And** disclosure giống Stories 3.3 và 6.10; event bị ẩn không lộ qua bước hay số đếm.

**Given** proposal bị từ chối
**When** stepper hiển thị
**Then** vòng đời kết thúc ở bước 5 kèm kết quả từ chối
**And** proposal đã phê duyệt chưa có đề tài hiển thị bước 5 hoàn tất, bước 6 đang chờ.

**Given** proposal có yêu cầu bổ sung và nộp lại
**When** stepper và timeline hiển thị
**Then** hồ sơ quay về bước 2 và vào lại bước 3
**And** không hiển thị bước lùi nào khác; vòng lặp của bản ghi con (tờ trình trả lại, bổ sung báo cáo/điều chỉnh/gia hạn/hồ sơ nghiệm thu) nằm trong bước hiện tại.

## Epic 4: Tiếp nhận và nộp đề xuất nghiên cứu

TP và CV có thể mở đợt tiếp nhận; chủ nhiệm (mọi vai trò trừ QT/NNB) có thể lập,
kiểm tra và nộp một đề xuất đầy đủ cùng tệp và lịch sử nộp; hệ thống tự động giao
CV phụ trách theo mảng và CV phụ trách xử lý yêu cầu rút/sửa sau nộp.

### Story 4.1: Tạo và quản lý đợt tiếp nhận đề xuất [FR9]

As a TP hoặc CV,
I want cấu hình đợt tiếp nhận với thời hạn và bộ hồ sơ bắt buộc,
So that chủ nhiệm biết khi nào và cần nộp những gì.

**Acceptance Criteria:**

**Given** TP hoặc CV vận hành đợt tiếp nhận theo capability/scope riêng
**When** xem đề xuất hoặc số liệu của đợt
**Then** quyền quản lý đợt không cấp quyền quản lý mọi hồ sơ nộp; quyền xem và số liệu đề xuất theo unit scope của TP/TB/PP, CV³ phụ trách hoặc quan hệ tham gia.

**Given** TP hoặc CV có quyền trong organization scope
**When** họ tạo đợt với tên, thời gian, phạm vi áp dụng, loại đề xuất, checklist và gói tệp bắt buộc
**Then** backend lưu đợt đã validate
**And** trả capability cho các action cập nhật, kích hoạt hoặc kết thúc.

**Given** thời gian đợt không hợp lệ hoặc xung đột với quy tắc cấu hình
**When** TP hoặc CV lưu
**Then** toàn bộ mutation bị từ chối với lỗi gắn đúng trường
**And** không tạo đợt có trạng thái một phần.

**Given** actor ngoài scope hoặc không phải TP/CV (kể cả QT, BGĐ, PP, TB, NCV, NNB)
**When** họ tạo, sửa, mở hoặc đóng đợt
**Then** backend từ chối theo policy
**And** audit ghi kết quả từ chối mà không lộ dữ liệu ngoài phạm vi.

**Given** đợt đang mở
**When** người dùng liệt kê đợt tiếp nhận
**Then** mọi vai trò trừ QT và NNB thấy đợt áp dụng cho mình
**And** QT và NNB không thấy đợt nào.

**Given** đợt đang mở
**When** thời hạn hoặc trạng thái thay đổi
**Then** proposal mới và proposal nháp được đánh giá theo trạng thái hiện hành
**And** thay đổi được audit cùng before/after và context version.

### Story 4.2: Tạo đề xuất nháp và thiết lập quan hệ tham gia [FR10, FR11]

As a chủ nhiệm đề xuất,
I want tạo một đề xuất nháp và khai báo nhóm tham gia,
So that trách nhiệm và quyền của từng người được xác định trên đúng hồ sơ.

**Acceptance Criteria:**

**Given** a draft proposal exists without a responsible CV
**When** TP, TB or CV queries it
**Then** TP/TB see it within unit scope; a CV has no management access until assigned (auto-assignment happens only on submit/resubmit, Story 4.7)
**And** legitimate PI/team/review access is evaluated independently; draft creation never assigns an officer.

**Given** actor giữ bất kỳ vai trò nào trừ QT/NNB, có researcher profile liên kết và đợt tiếp nhận đang cho phép lập hồ sơ
**When** họ tạo proposal draft
**Then** proposal được tạo với actor là `PROPOSAL_PI` đang hoạt động
**And** capability cho phép PI tiếp tục chỉnh sửa trong trạng thái nháp.

**Given** actor có system role `EXTERNAL_RESEARCHER_USER` hoặc `SYSTEM_ADMIN`
**When** họ cố tạo proposal draft
**Then** backend từ chối vì NNB và QT không bao giờ là PI
**And** không tạo proposal, relationship hoặc file side effect.

**Given** PI thêm `TOPIC_MEMBER` hoặc `TOPIC_SECRETARY` hợp lệ
**When** quan hệ được lưu
**Then** source proposal sở hữu type, status, effective interval và relationship version
**And** không thêm global role hoặc thay đổi system role của người tham gia.

**Given** một quan hệ bị trùng, chồng lấn sai multiplicity hoặc ngoài organization rule
**When** PI cập nhật danh sách
**Then** backend từ chối thay đổi không hợp lệ
**And** giữ nguyên roster và context version cũ.

**Given** quan hệ bị đình chỉ, kết thúc hoặc thu hồi
**When** người đó mở proposal
**Then** capability dừng cấp action ngay tại request-wide `asOf`
**And** lịch sử tham gia vẫn được bảo tồn và audit.

### Story 4.3: Nhập và cộng tác trên thông tin đề xuất có cấu trúc [FR11]

As a chủ nhiệm đề xuất,
I want nhập và lưu thông tin chuyên môn theo từng phần,
So that hồ sơ có thể được hoàn thiện dần trước khi nộp.

**Acceptance Criteria:**

**Given** proposal ở trạng thái nháp hoặc trạng thái cho phép sửa
**When** PI cập nhật tiêu đề, lĩnh vực, đơn vị, thời gian, mục tiêu, tóm tắt nội dung và kinh phí dự kiến
**Then** backend validate và lưu atomically
**And** response trả field errors hoặc capability mới theo state hiện hành.

**Given** `TOPIC_MEMBER` có responsibility/action được cấp rõ ràng
**When** họ sửa phần được giao
**Then** backend chỉ cho phép các field/section nằm trong action đó
**And** từ chối thay đổi ngoài phạm vi mà không ảnh hưởng phần hợp lệ đã lưu trước đó.

**Given** external researcher có draft contribution được phân công
**When** họ sửa proposal
**Then** backend chỉ lưu section/field được giao và file đóng góp được phép
**And** PI, roster, objective, budget, status và submit vẫn bị chặn.

**Given** `TOPIC_SECRETARY` đang hoạt động
**When** họ cập nhật dữ liệu hành chính, meeting material, tracking hoặc draft summary được cấp
**Then** action hợp lệ được lưu và audit
**And** họ không thể tự thay đổi roster nhạy cảm, nộp thay PI, đánh giá hoặc quyết định.

**Given** actor có nhiều quan hệ trên proposal
**When** detail được tải
**Then** UI hiển thị mọi quan hệ của actor và action từ backend
**And** không yêu cầu chuyển vai trò hoặc suy ra quyền cao nhất.

### Story 4.4: Đính kèm và quản lý tệp đề xuất [FR12]

As a chủ nhiệm hoặc người đóng góp được phép,
I want tải lên và quản lý tệp của đề xuất,
So that bộ hồ sơ có đủ tài liệu và vẫn được bảo vệ theo quan hệ của tôi.

**Acceptance Criteria:**

**Given** actor có exact file action trên proposal
**When** họ upload tệp đúng loại, kích thước và loại tài liệu
**Then** request đi qua shared files module
**And** metadata gắn proposal ID, document type, uploader, version và context version.

**Given** member chỉ được cấp contribution-file action
**When** họ tải tệp minh chứng vào loại được phép
**Then** upload thành công
**And** replace/delete/submit action không tự động được cộng thêm.

**Given** external researcher có contribution-file action được cấp trên draft
**When** họ tải file
**Then** upload chỉ được phép trong association/type đã cấp
**And** file action không mở rộng quyền đọc/sửa proposal hoặc quyền submit.

**Given** actor không liên quan, quan hệ hết hạn hoặc context unresolved
**When** họ biết file ID và gọi metadata/download trực tiếp
**Then** backend fail closed
**And** không trả tên file, object key hoặc dấu hiệu tồn tại.

### Story 4.5: Kiểm tra mức độ sẵn sàng trước khi nộp [FR13]

As a chủ nhiệm đề xuất,
I want biết chính xác hồ sơ còn thiếu gì,
So that tôi có thể hoàn thiện dữ liệu trước khi nộp chính thức.

**Acceptance Criteria:**

**Given** proposal draft thuộc một intake period
**When** PI chạy readiness check
**Then** backend kiểm tra field bắt buộc, roster, checklist, file type/version và trạng thái đợt
**And** trả danh sách lỗi gắn với section/tệp có thể sửa.

**Given** hồ sơ thiếu dữ liệu hoặc tệp bắt buộc
**When** PI cố nộp
**Then** submission bị từ chối atomically
**And** proposal vẫn ở trạng thái nháp với lỗi rõ ràng.

**Given** checklist hoặc cấu hình đợt thay đổi
**When** readiness được chạy lại
**Then** hệ thống dùng version cấu hình hiện hành phù hợp với quy tắc đợt
**And** không dựa vào kết quả readiness đã cache quá hạn.

**Given** actor chỉ có quyền sửa/tệp nhưng không phải PI hiện tại
**When** họ chạy readiness hoặc cố nộp
**Then** họ có thể xem lỗi trong phạm vi tệp/dữ liệu được phép nhưng không thể submit
**And** UI hiển thị submit bị chặn với lý do backend.

**Given** actor là `EXTERNAL_RESEARCHER_USER`
**When** họ chạy readiness hoặc cố submit proposal
**Then** chỉ phần readiness được disclosure cho section được giao nếu policy cho phép
**And** action submit luôn bị chặn vì external không phải PI hiện tại.

### Story 4.6: Nộp chính thức và xem lịch sử nộp đề xuất [FR14]

As a chủ nhiệm đề xuất,
I want nộp chính thức và nhận bằng chứng về lần nộp,
So that tôi biết hồ sơ đã vào quy trình tiếp nhận.

**Acceptance Criteria:**

**Given** proposal đạt readiness, đợt đang nhận và actor là PI hiện tại (mọi vai trò trừ QT/NNB)
**When** actor xác nhận nộp
**Then** owning service re-authorize và chuyển state trong cùng transaction
**And** tạo submission-history event với actor, thời gian, version hồ sơ và bộ tệp.

**Given** actor là delegate, secretary, member, người quản lý không phải PI của hồ sơ (TP/PP/TB/CV/BGĐ) hoặc external researcher
**When** actor cố nộp proposal
**Then** backend từ chối trước mutation
**And** không tạo submission event hoặc delegated capability.

**Given** hai request nộp đồng thời hoặc context/state version đã đổi
**When** mutation được thực thi
**Then** chỉ một transition hợp lệ thành công
**And** request còn lại nhận state/version mismatch mà không tạo lịch sử trùng.

**Given** proposal đã nộp
**When** PI hoặc người tham gia được phép xem detail
**Then** timeline hiển thị trạng thái, thời điểm và phiên bản nộp
**And** edit/submit actions bị khóa hoặc mở lại chỉ theo state machine và capability backend.

**Given** actor là `EXTERNAL_RESEARCHER_USER`
**When** họ cố submit hoặc resubmit proposal
**Then** backend từ chối dù actor có profile link, cùng đơn vị hoặc draft relationship
**And** không tạo submission history hoặc đổi trạng thái.

### Story 4.7: Tự động giao CV phụ trách theo mảng khi nộp [FR72]

As a TP¹,
I want hệ thống tự động giao một CV phụ trách theo mảng khi đề xuất được nộp hoặc nộp lại,
So that mỗi hồ sơ có người xử lý ngay và tôi chỉ phải giao tay các hồ sơ không khớp mảng.

**Acceptance Criteria:**

**Given** đề xuất chuyển sang `submitted` hoặc `resubmitted` và chưa có CV phụ trách active
**When** auto-assignment chạy (service-only, audit actor `System`)
**Then** hệ thống chọn đúng một CV active có mảng khớp cấp và tính chất của đề xuất: mảng cụ thể hơn được ưu tiên, nếu bằng nhau chọn CV đang phụ trách ít hồ sơ active hơn
**And** quan hệ `PROPOSAL_MANAGEMENT_OFFICER` và audit (mảng khớp, CV mới, thời điểm) được ghi cùng transaction với việc nộp.

**Given** không CV active nào khớp mảng
**When** auto-assignment chạy
**Then** hồ sơ ở trạng thái chưa giao và hiển thị "Chưa có người phụ trách" cho TP
**And** việc nộp vẫn thành công, không giao cho CV ngẫu nhiên.

**Given** hồ sơ đã có CV phụ trách active khi nộp lại
**When** auto-assignment đánh giá
**Then** CV hiện tại được giữ nguyên
**And** không tạo hai CV phụ trách active.

**Given** TP¹ hoặc TB¹ giao, giao lại hoặc thu hồi CV phụ trách
**When** thay đổi được lưu
**Then** CV cũ kết thúc atomically, lịch sử và lý do được giữ, audit ghi actor, CV cũ/mới
**And** CV mới không được là PI, thành viên, reviewer hoặc người có conflict trên hồ sơ.

**Given** CV cũ sau khi bị thay
**When** họ cố thao tác trên hồ sơ
**Then** backend từ chối vì phân công trong quá khứ không cấp quyền
**And** hai yêu cầu giao đồng thời không thể tạo hai CV phụ trách.

### Story 4.8: Rút, sửa sau nộp và mở lại do CV phụ trách [FR76]

As a chủ nhiệm đề xuất,
I want gửi yêu cầu rút hoặc sửa hồ sơ sau khi đã nộp và để CV phụ trách xử lý,
So that hồ sơ đã nộp không bị ghi đè mà vẫn có đường điều chỉnh chính thức.

**Acceptance Criteria:**

**Given** đề xuất đã nộp và actor là PI hiện tại
**When** PI gửi yêu cầu rút hoặc yêu cầu sửa kèm lý do
**Then** yêu cầu được lưu với version hồ sơ và audit
**And** phiên bản đã nộp không thay đổi trước khi có quyết định.

**Given** yêu cầu rút hoặc sửa đang chờ
**When** CV³ phụ trách chấp thuận hoặc từ chối kèm lý do
**Then** quyết định áp dụng atomically (rút hồ sơ hoặc mở phạm vi sửa được chấp thuận) với history/audit
**And** PI nhận thông báo kết quả.

**Given** hồ sơ ở trạng thái cho phép mở lại
**When** CV³ phụ trách mở lại với lý do bắt buộc
**Then** hồ sơ chuyển trạng thái theo state machine và audit ghi actor, lý do, trạng thái trước/sau
**And** thiếu lý do thì backend từ chối.

**Given** hồ sơ được mở lại
**When** bước vòng đời D-033 được suy ra
**Then** hồ sơ quay về bước 2 (Hồ sơ đề xuất) theo D-034
**And** PI nộp lại thì hồ sơ vào lại bước 3 như vòng bổ sung.

**Given** actor là TP, TB, PP, BGĐ, QT, CV không phụ trách hồ sơ, thành viên hoặc reviewer
**When** họ cố duyệt yêu cầu hoặc mở lại
**Then** backend từ chối
**And** CV phụ trách là PI hoặc thành viên của chính hồ sơ cũng bị từ chối do conflict.

**Given** hồ sơ chưa có CV phụ trách ("Chưa có người phụ trách")
**When** PI gửi yêu cầu
**Then** yêu cầu được lưu và chờ đến khi TP¹/TB¹ giao CV *(cần xác nhận)*
**And** không ai khác được duyệt thay.

## Epic 5: Kiểm tra, đánh giá và phê duyệt đề xuất

Đề xuất đã nộp có thể đi trọn luồng bổ sung, đánh giá độc lập, tổng hợp và ra
quyết định với trạng thái, phân quyền và che giấu thông tin đúng chính sách.

> Role names and decision rights in the done and in-flight stories of this epic
> predate the 10-role model; see `docs/permission-matrix.md`. Story 5.3 (in review)
> keeps its ACs; its 10-role delta is Story 5.11.

**Refinement 2026-10-18 (replaces 2026-09-21):** Completeness and supplement belong
to TB¹/CV³ (never TP); reviewer/council assignment and synthesis belong to
TP¹/TB¹/CV³; the council secretary drafts synthesis/minutes without scoring; the
finalized package reaches GĐ only through approval routing (Story 5.9); GĐ or
PGĐ-KH signs the evaluation council establishment and GĐ alone decides topic +
funding (Story 5.10). Explicit synthesis finalization before submission is kept.
Proposal Review & Approval uses Stories 5.1–5.2 → 5.3 (+ delta 5.11) → 5.4 → 5.5 →
5.9 → 5.10 → 5.7 → 5.8; 5.9 precedes 5.10, 5.11, 6.11 and 6.12. Story 5.6 is
independent and not a prerequisite. See the scoped
[implementation plan](implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md)
for current-code evidence, dependencies and verification gates.
`REVIEWER` denotes an effective proposal assignment, never a new system role.
Canonical persisted states are `submitted` / `resubmitted` → `under_review`
→ `ready_for_approval` → `approved` | `rejected`; `PENDING_APPROVAL` in older
planning text means `ready_for_approval`, not another database state.
All criteria below inherit the authorization baseline and Authorization Contracts V1:
current actor/context inside the mutation transaction, minimum disclosure on every
read surface, append-only evidence/audit, and backend-calculated capabilities.

### Story 5.1: Kiểm tra tính đầy đủ và yêu cầu bổ sung [FR15]

As a TB¹ hoặc CV³ phụ trách hồ sơ,
I want kiểm tra hồ sơ đã nộp và yêu cầu bổ sung có hạn xử lý,
So that hồ sơ chỉ vào đánh giá khi đáp ứng điều kiện hành chính.

**Acceptance Criteria:**

**Given** TB or CV requests completeness checking or a supplement on a proposal
**When** the action executes
**Then** TB needs unit scope (¹) and CV needs the effective `PROPOSAL_MANAGEMENT_OFFICER` assignment (³), plus current state/context and no participation conflict
**And** TP, PP, BGĐ, QT or a CV's participation alone cannot grant that action.

**Given** proposal is `submitted` or `resubmitted` and within TB's unit scope or assigned to the CV
**When** TB hoặc CV phụ trách mở completeness review
**Then** họ xem được structured data, submission package, checklist và file được phép
**And** capability chỉ mở các action hợp lệ với state hiện hành.

**Given** TB hoặc CV phụ trách đã xác nhận đầy đủ cho phiên bản nộp hiện tại
**When** họ xem lại hoặc gửi lại action xác nhận
**Then** nút xác nhận bị disabled với lý do và backend từ chối thao tác lặp
**And** một phiên bản nộp lại mới được phép xác nhận đúng một lần.

**Given** hồ sơ thiếu hoặc không hợp lệ
**When** TB hoặc CV phụ trách gửi yêu cầu bổ sung với lý do và hạn
**Then** proposal chuyển sang `SUPPLEMENT_REQUESTED` atomically
**And** tạo history, audit và notification cho PI mà không kèm dữ liệu nội bộ không cần thiết.

**Given** actor là PI, member, secretary, TP, CV không phụ trách hồ sơ hoặc người ngoài scope
**When** họ cố tạo/đóng completeness review không được cấp
**Then** backend từ chối
**And** UI hiển thị blocked action với lý do thay vì mở form có thể gửi.

**Given** request state/version đã cũ
**When** TB hoặc CV phụ trách gửi yêu cầu bổ sung
**Then** backend trả state/context-version mismatch
**And** không tạo yêu cầu hoặc notification trùng.

### Story 5.2: Chỉnh sửa theo yêu cầu và nộp lại đề xuất [FR16]

As a chủ nhiệm đề xuất,
I want xem yêu cầu bổ sung, cập nhật hồ sơ và nộp lại,
So that đề xuất có thể tiếp tục quy trình đánh giá.

**Acceptance Criteria:**

**Given** proposal ở `SUPPLEMENT_REQUESTED`
**When** PI mở detail
**Then** họ thấy lý do, hạn, section/tệp cần bổ sung và các action được backend cho phép
**And** không thấy reviewer identity, review content hoặc consolidation nội bộ.

**Given** PI có action edit/file hợp lệ
**When** họ cập nhật nội dung hoặc version tệp được yêu cầu
**Then** thay đổi được lưu với history và audit
**And** không mở quyền sửa các phần bị khóa bởi workflow.

**Given** hồ sơ đáp ứng yêu cầu và PI có `proposal.resubmit`
**When** PI xác nhận nộp lại
**Then** state atomically becomes `resubmitted` and returns to the responsible CV's workflow, awaiting TB¹/CV³ completeness re-check
**And** resubmission grants no review readiness; reviewer assignment is denied until current-submission completeness is confirmed
**And** submission history ghi actor và version bộ hồ sơ.

**Given** quá hạn hoặc relationship hết hiệu lực
**When** actor cố sửa hoặc nộp lại
**Then** backend đánh giá chính sách hiện hành và từ chối nếu không còn action
**And** không dựa vào capability cũ đã hiển thị trên client.

### Story 5.3: Phân công reviewer / thành viên hội đồng từ tài khoản [FR17, FR67a]

As a SCIENTIFIC_MANAGEMENT_HEAD,
I want phân công tài khoản đủ điều kiện trên đề xuất đã kiểm tra đầy đủ,
So that reviewer nhận đúng công việc và hồ sơ bắt đầu đánh giá độc lập.

**Acceptance Criteria:**

**Given** Head searches reviewer candidates or assigns/revokes a review duty
**When** the backend evaluates the request
**Then** it requires `SCIENTIFIC_MANAGEMENT_HEAD`, explicit scope on this proposal and current completeness evidence, in addition to candidate eligibility and conflict checks
**And** changing participant relationships also rechecks existing management/evaluation conflicts; a cached preflight is never authority.

**Given** Head có scope rõ ràng trên đơn vị chủ trì, không conflict và proposal ở
`submitted`, `resubmitted` hoặc `under_review`
**When** tìm candidate hoặc xác nhận phân công
**Then** backend kiểm tra completeness của phiên bản nộp hiện tại, account active,
participation, duplicate, thời gian hiệu lực và context hiện hành
**And** search chỉ trả account ID, display name, username; mutation dùng
`reviewerUserId`, không dùng profile/username selector.

**Given** account active bất kể system role, đơn vị hoặc liên kết Scientist Profile
**When** account không là PI/team secretary/member và không có conflict/duplicate
**Then** Head có thể giao `reviewer` hoặc `committee_member`, kể cả chính mình
nếu đủ điều kiện; linked profile chỉ là provenance nullable, không tự tạo link
**And** assignment cấp quyền đúng proposal dù assignee ngoài scope đơn vị chủ trì.

**Given** phân công đầu tiên hợp lệ
**When** Head xác nhận người, duty và hạn theo ngày
**Then** assignment, `submitted` / `resubmitted` → `under_review`, context version,
history, audit và notification event được lưu atomically
**And** phân công tiếp theo giữ `under_review`; reviewer nhận link vào công việc của mình.

**Given** roster đang được xây dựng hoặc thay đổi đồng thời
**When** thêm hoặc thu hồi assignment
**Then** không cho reviewer thứ ba hoặc account có bất kỳ reviewer/committee
position active/chồng lấn nào trong cùng evaluation context;
readiness cần đúng hai reviewer và ít nhất ba committee members từ các account
khác nhau, cùng đủ submitted reviews (baseline hiện hành)
**And** roster thiếu vẫn ở `under_review`, không tự trình duyệt.

**Given** assignment cần thay thế trong state cho phép
**When** Head thu hồi với lý do không rỗng và context mới nhất
**Then** quyền từ assignment chấm dứt ngay; lịch sử và review đã gửi vẫn giữ;
thay thế bằng revoke-then-assign, không ghi đè người cũ
**And** active reviewer hoặc người đã lưu draft/submit evaluation không thể tự
tổng hợp/quyết định cùng round; persisted evaluation giữ conflict sau thu hồi,
failed conflict attempt giữ failure audit nhưng không tạo assignment.

**Given** account/context không hợp lệ, staff ngoài scope, participant hoặc secretary
không có authority
**When** gọi API trực tiếp hoặc dùng capability cũ
**Then** backend từ chối, không ghi dữ liệu nghiệp vụ một phần; notification không
được phát cho mutation thất bại và không tiết lộ roster cho participant.

**Given** an assigned Staff officer or another non-Head actor
**When** candidate search, assignment, revocation or reassignment is requested
**Then** backend denies the Head-only action regardless of frontend visibility
**And** Staff retains only authorized operational monitoring.

### Story 5.4: Reviewer truy cập và nộp đánh giá của mình [FR18]

As a reviewer được phân công,
I want xem đúng hồ sơ cần thiết và gửi điểm, nhận xét, kiến nghị của mình,
So that tôi hoàn thành nhiệm vụ đánh giá độc lập.

**Acceptance Criteria:**

**Given** reviewer được mời nhưng chưa chấp nhận
**When** họ mở lời mời
**Then** họ chỉ thấy tên đề xuất, vai trò, hạn và người mời
**And** có thể chấp nhận hoặc từ chối (từ chối bắt buộc lý do); thành viên hội đồng chỉ đọc hồ sơ sau khi BGĐ ký quyết định thành lập hội đồng.

**Given** reviewer assignment đã được chấp nhận, đang hoạt động và proposal ở state cho phép
**When** reviewer mở assignment
**Then** họ thấy proposal và file hỗ trợ cần thiết theo minimum disclosure, kể cả hồ sơ ngoài đơn vị của mình
**And** không thấy assignment, danh tính hoặc đánh giá của reviewer khác, cũng như action log của hồ sơ.

**Given** reviewer nhập score, comment và recommendation hợp lệ
**When** họ lưu nháp hoặc submit
**Then** owning service validate scoring criteria và state transition
**And** submit tạo immutable submission version, history và audit.

**Given** reviewer là `EXTERNAL_RESEARCHER_USER` với assignment đang hoạt động
**When** họ mở và gửi review
**Then** họ chỉ thấy package được disclosure cho assignment đó và review của chính mình
**And** không thấy hồ sơ ngoài assignment, review khác hoặc action quyết định.

**Given** assignment hết hạn, bị thu hồi, conflict phát sinh hoặc state đã đóng
**When** reviewer cố xem hoặc sửa
**Then** backend re-evaluate và chặn action thích hợp
**And** capability cũ không tiếp tục cấp quyền.

**Given** PI, member, secretary hoặc unrelated actor biết review ID/file ID
**When** họ gọi endpoint trực tiếp trước disclosure state
**Then** backend từ chối hoặc omits resource theo matrix
**And** không lộ identity, raw score, comment, attachment hoặc existence metadata.

**Given** user có assignment hiệu lực với một trong hai duty, bất kể system role
**When** mở “Đánh giá của tôi” từ navigation/My Work rồi mở proposal
**Then** queue, detail, package, file và own-review cùng một disclosure/authorization policy;
không gọi progress/roster của Phòng KHQS để dựng form; unrelated records không xuất hiện.

**Given** review đang nháp trong `under_review`
**When** lưu nháp nhiều lần rồi submit với rubric đầy đủ, comment, recommendation
và `contextVersion` hiện hành
**Then** mỗi lần lưu trả hoặc tải lại context; submit khóa review, hoàn thành assignment,
ghi history/audit và event cho CV phụ trách, proposal vẫn `under_review`
**And** overdue chỉ là tracking flag; expiry/revocation/conflict mới chặn theo policy;
`revise` là recommendation, không tự mở vòng bổ sung hoặc chuyển trạng thái.

**Given** cùng account còn giữ vai trò Phòng KHQS (TP/PP/TB/CV) hoặc BGĐ, hoặc biết URL của reviewer khác
**When** truy cập roster, progress, submitted-review, supplement history hoặc file
**Then** assignment không nâng disclosure sang dữ liệu nội bộ/phiếu của người khác;
backend bỏ field bị ẩn và từ chối file ngoài package, không chỉ ẩn UI.

### Story 5.5: Theo dõi tiến độ và tổng hợp đánh giá nội bộ [FR19, FR19a]

As a TP¹, TB¹ hoặc CV³ phụ trách hồ sơ,
I want theo dõi công việc đánh giá, tổng hợp các đánh giá đã hoàn tất và chốt bản tổng hợp,
So that gói hồ sơ có thể được lập tờ trình và trình GĐ quyết định qua luồng phê duyệt.

**Acceptance Criteria:**

**Given** TP, TB hoặc CV theo dõi một proposal
**When** progress hoặc operational queue data được yêu cầu
**Then** TP/TB cần unit scope (¹), CV cần current officer assignment (³), và không có conflict
**And** backend trả named assignments, trạng thái lời mời, status, số pending/submitted N/M, deadlines, overdue work,
completion và lý do synthesis còn bị chặn.

**Given** PP, BGĐ, QT, CV không phụ trách hồ sơ hoặc người có quan hệ tham gia/review trên hồ sơ
**When** họ cố lưu, chốt synthesis hoặc lập tờ trình
**Then** backend từ chối và UI không có control ghi được bật.

**Given** TP¹, TB¹ hoặc CV³ không có participation hoặc current/historical review conflict
**When** họ yêu cầu review package hoặc synthesis action
**Then** backend cấp projection submitted-review cần thiết
**And** mọi lần lưu/chốt synthesis cần đủ các review hợp lệ của vòng hiện hành;
evidence thiếu, bị thu hồi, stale hoặc không tương thích không mở được synthesis.

**Given** đúng hai reviewer và ít nhất ba committee member khác nhau đã nộp đủ
review của phiên bản hiện hành (baseline hiện hành)
**When** TP¹/TB¹/CV³ tạo hoặc sửa draft synthesis
**Then** summary ghi actor, revision, source reviews và immutable evidence/audit
**And** không ghi đè review nào và proposal vẫn `under_review`.

**Given** thư ký hội đồng của hồ sơ (note 6)
**When** họ soạn dự thảo tổng hợp hoặc biên bản
**Then** backend cho phép soạn mà không cấp quyền chấm điểm, chốt synthesis hoặc lập tờ trình
**And** dự thảo được ghi history/audit với actor và quan hệ.

**Given** draft synthesis có summary/recommendation hợp lệ và evidence hiện hành
**When** TP¹/TB¹/CV³ chốt synthesis với context hiện hành
**Then** lifecycle của synthesis chuyển finalized với actor/time/revision và audit evidence
**And** chỉ việc chốt không trình proposal và không mở quyết định của GĐ.

**Given** synthesis đã chốt gắn với review package đầy đủ hiện hành
**When** TP¹/TB¹/CV³ lập tờ trình `DECISION_PACKAGE`
**Then** backend kiểm tra lại completeness, roster, submitted reviews, source version, scope/conflict và finalized evidence,
và tạo approval submission theo Story 5.9 (người lập → TB → TP → GĐ; tờ trình do TB lập bắt đầu ở TP)
**And** proposal chỉ tới quyết định của GĐ sau khi submission đã qua `HEAD_REVIEW`; không còn thao tác "trình lãnh đạo" trực tiếp.

**Given** synthesis còn nháp, source evidence đã đổi hoặc context stale
**When** lập tờ trình hoặc quyết định được thực hiện
**Then** backend từ chối mà không ghi một phần hoặc lặp history.

**Given** synthesis đã chốt hoặc đã vào luồng tờ trình
**When** có thao tác sửa thông thường
**Then** bị từ chối; mọi mở lại/sửa đổi sau đó cần workflow được phê duyệt rõ ràng
(ví dụ tờ trình bị trả lại kèm lý do), không ghi đè âm thầm.

**Given** PI/team/secretary hoặc external participant không được phép yêu cầu dữ liệu
**When** synthesis và review material chưa được công bố
**Then** identity/score/comment/synthesis được bảo vệ bị loại khỏi mọi API, file, history,
list/count, export và notification projection.

### Story 5.6: Thư ký khoa học hỗ trợ hành chính cho quy trình đánh giá [FR6d]

As a thư ký khoa học được phân công,
I want chuẩn bị tài liệu họp, biên bản, theo dõi và dự thảo tóm tắt,
So that quy trình đánh giá được hỗ trợ mà không trao quyền chuyên môn hoặc quyết định.

**Acceptance Criteria:**

**Given** `TOPIC_SECRETARY` đang hoạt động
**When** secretary tạo/cập nhật meeting material, minutes, task, tracking note hoặc draft summary được đăng ký
**Then** backend cho phép exact administrative action
**And** history/audit ghi rõ actor và relationship.

**Given** secretary chuẩn bị draft summary
**When** raw review fields không thuộc disclosure của secretary
**Then** service chỉ cung cấp input đã được policy phê duyệt cho action đó
**And** draft không làm lộ reviewer identity hoặc raw content qua file/notification/history.

**Given** secretary cố assign reviewer, submit score, thay membership, consolidate như TP/TB/CV, lập hoặc duyệt tờ trình, approve hoặc reject
**When** request được gửi
**Then** backend từ chối theo action/non-delegable registry
**And** blocked action vẫn hiện với lý do dễ hiểu nếu UX yêu cầu.

**Given** secretary relationship hết hiệu lực
**When** họ mở proposal hoặc gọi action hành chính
**Then** capability bị thu hồi tại request hiện hành
**And** tài liệu đã tạo vẫn được bảo tồn theo quyền của hồ sơ.

**Given** actor là thư ký hội đồng đánh giá của hồ sơ (note 6), khác với `TOPIC_SECRETARY`
**When** họ soạn dự thảo tổng hợp đánh giá hoặc biên bản họp hội đồng
**Then** backend cho phép soạn trong phạm vi hội đồng đó mà không cho chấm điểm
**And** `TOPIC_SECRETARY` không nhận quyền này vì là người tham gia hồ sơ.

### Story 5.7: Lãnh đạo xem hồ sơ trình quyết định [FR20]

As a GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`),
I want xem hồ sơ, lịch sử, bản tổng hợp và lịch sử tờ trình được phép,
So that tôi có đủ căn cứ trước khi ra quyết định.

**Acceptance Criteria:**

**Given** proposal ở `ready_for_approval`, actor là GĐ có scope hợp lệ và tờ trình
`DECISION_PACKAGE` đã qua bước TB và TP (`HEAD_REVIEW`)
**When** họ mở hồ sơ trình
**Then** response gồm proposal version, submission history, supporting files, consolidation và decision capability cần thiết
**And** disclosure chỉ mở dữ liệu đúng duty của actor.

**Given** actor đồng thời là PI, team member, reviewer hoặc `TOPIC_SECRETARY` của proposal
**When** policy đánh giá approval action
**Then** conflict denial thắng system-role/assignment allow
**And** action vẫn hiển thị bị khóa với lý do, không yêu cầu chuyển vai trò.

**Given** actor ngoài assignment hoặc organization scope
**When** họ gọi approval detail/export/file endpoint
**Then** backend từ chối nhất quán
**And** dashboard count không bao gồm proposal đó.

**Given** actor là `EXTERNAL_RESEARCHER_USER`
**When** họ mở decision package hoặc gọi approval action
**Then** họ chỉ nhận phần disclosure được phép nếu có relationship/assignment
**And** không thể approve, reject hoặc thay đổi decision data.

**Given** hồ sơ/consolidation version thay đổi sau khi trang được tải
**When** actor chuẩn bị quyết định
**Then** UI yêu cầu tải lại context
**And** mutation sau đó không thể dùng dữ liệu cũ.

**Given** GĐ có scope rõ ràng, proposal đã được trình qua luồng tờ trình (người lập → TB → TP) và
không có participation/reviewer conflict
**When** mở queue hoặc package
**Then** server lọc queue/count trước khi trả; package dùng đúng submitted proposal,
file versions, submitted reviews và consolidation version đã trình
**And** không chỉ trả attachment count hoặc dùng mutable current data thay evidence.

**Given** actor là PGĐ-KH, PGĐ-TD hoặc GĐ thiếu scope, hồ sơ chưa qua `HEAD_REVIEW` hoặc có conflict
**When** gọi decision package, review-progress, file hoặc queue endpoint
**Then** không trả private package/roster/raw review; route biết trước không vượt quyền;
trên proposal còn được xem qua quan hệ khác chỉ hiện action liên quan disabled với lý do an toàn
**And** reviewer/committee assignment không tự trở thành approval assignment.

### Story 5.8: Phê duyệt, từ chối và công bố kết quả đề xuất [FR21, FR22]

As a GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`),
I want ghi quyết định đề tài cùng kinh phí hợp lệ và công bố mức thông tin được phép,
So that proposal kết thúc quy trình minh bạch mà không lộ phản biện nội bộ.

**Acceptance Criteria:**

**Given** GĐ attempts approve/reject of topic and funding
**When** the backend evaluates the action inside the proposal mutation
**Then** only active `LEADERSHIP_APPROVAL_AUTHORITY` (GĐ) with explicit scope and no
participation/reviewer/council conflict may decide, after current completeness, all required
submitted reviews, finalized synthesis and a `DECISION_PACKAGE` submission that passed TB and TP are rechecked
**And** TP, PP, TB, CV, `SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH), `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD), QT and reviewers have no topic decision authority.


**Given** proposal ở `ready_for_approval`, actor không conflict và có exact decision action
**When** họ approve hoặc reject với dữ liệu bắt buộc
**Then** state transition, decision record, history và audit hoàn tất atomically
**And** action không thể được delegation hoặc secretary relationship cấp.

**Given** request lặp, state không còn hợp lệ hoặc context version mismatch
**When** decision được gửi
**Then** không tạo quyết định thứ hai
**And** trả mã state/version rõ ràng để người dùng tải lại.

**Given** final decision đã có
**When** PI, team member hoặc `TOPIC_SECRETARY` xem kết quả
**Then** họ nhận `PublishedReviewSummaryV1` gồm decision status/date, public summary và required follow-up
**And** reviewer identity, raw score/comment và internal consolidation tiếp tục bị ẩn.

**Given** external researcher có quan hệ được phép xem kết quả
**When** final decision đã có
**Then** họ chỉ nhận `PublishedReviewSummaryV1` hoặc disclosure tương đương
**And** không nhận raw review, conflict source hoặc capability quyết định.

**Given** quyết định thành công
**When** hệ thống phát history, notification hoặc export
**Then** mọi surface dùng cùng disclosure matrix và version quyết định
**And** dashboard/work queue cập nhật theo source state mà không rò rỉ internal review metadata.

**Given** current package/context và exact `proposal.decision.approve` hoặc
`proposal.decision.reject` từ backend
**When** GĐ xác nhận approve (đề tài và kinh phí cùng nhau), hoặc reject với lý do không rỗng
**Then** transaction recheck current account/scope/conflict, readiness và package version,
liên kết decision với evidence đã xem và ghi published summary riêng với internal note
**And** chuyển `ready_for_approval` → `approved` | `rejected` đúng một lần;
không tự tạo approved project, mở vòng review mới hoặc cho reviewer quyết định.

**Given** decision đã commit
**When** gửi thông báo cho PI/người có quyền hoặc tải lại kết quả
**Then** dùng cùng decision version và `PublishedReviewSummaryV1`; public summary/follow-up
là dữ liệu được duyệt để công bố, không sao chép raw comments/internal consolidation
**And** notification retries không lặp business event; lỗi delivery không rollback decision.

### Story 5.9: Luồng tờ trình CV → TB → TP → BGĐ [FR71]

As a CV³ (hoặc TB¹/TP¹) lập tờ trình,
I want trình mọi thủ tục cần BGĐ ký qua một luồng thống nhất qua TB và TP,
So that không thủ tục nào tới Ban giám đốc mà thiếu bước rà soát và duyệt của Phòng KHQS.

**Acceptance Criteria:**

**Given** một thủ tục thuộc tám loại `EVALUATION_COUNCIL`, `DECISION_PACKAGE`, `IRB_COUNCIL`, `IRB_CERTIFICATE`, `ACCEPTANCE_COUNCIL`, `PROJECT_EXTENSION`, `PROJECT_ADJUSTMENT`, `LIQUIDATION`
**When** tác giả có quyền (TP¹, TB¹ hoặc CV³) lập tờ trình
**Then** hệ thống tạo một `approval_submissions` gắn loại, đối tượng nguồn, tác giả và người ký theo loại: `DIRECTOR` cho `DECISION_PACKAGE` và `LIQUIDATION`, `DIRECTOR_OR_SCIENCE_DEPUTY` cho sáu loại còn lại
**And** mỗi loại và đối tượng chỉ có tối đa một submission đang mở.

**Given** tờ trình do CV hoặc TP lập
**When** được trình
**Then** submission bắt đầu ở stage `BOARD_REVIEW` với status `PENDING`
**And** tờ trình do TB lập bắt đầu ở `HEAD_REVIEW`; tờ trình do TP lập vẫn qua bước TB.

**Given** submission ở `BOARD_REVIEW`
**When** TB¹ không phải tác giả rà soát
**Then** TB chuyển sang `HEAD_REVIEW` hoặc trả lại tác giả với lý do bắt buộc
**And** TB không rà soát tờ trình mình lập.

**Given** submission ở `HEAD_REVIEW`
**When** TP¹ không phải tác giả duyệt
**Then** TP chuyển sang `LEADERSHIP` hoặc trả lại tác giả với lý do bắt buộc
**And** PP không có bước nào trong luồng, kể cả khi TP vắng.

**Given** submission ở `LEADERSHIP`
**When** người ký đúng loại (GĐ; hoặc GĐ/PGĐ-KH) không conflict ký
**Then** submission chuyển `CLOSED` / `APPROVED` và thay đổi nguồn được áp dụng atomically trong cùng transaction
**And** người ký là participant, reviewer hoặc thành viên hội đồng trên record bị từ chối.

**Given** bất kỳ actor nào cố bỏ bước, tự rà soát/duyệt tờ trình mình lập, xử lý ngoài unit scope hoặc dùng context cũ
**When** request được gửi
**Then** backend từ chối không ghi một phần
**And** PP, PGĐ-TD, QT, NCV và NNB không có action nào trong luồng.

**Given** mỗi lần submit, forward, return, approve hoặc sign
**When** action hoàn tất
**Then** audit ghi actor, submission, loại thủ tục, bước, quyết định, lý do và thời điểm
**And** người ở bước kế tiếp hoặc tác giả (khi bị trả lại) nhận thông báo; lịch sử bước hiển thị theo scope.

**Given** submission ở trạng thái `RETURNED`, `REJECTED` hoặc `CANCELLED`
**When** người dùng xem hồ sơ nguồn
**Then** trạng thái và lý do hiển thị read-only theo scope
**And** quy tắc ai được đặt `REJECTED`/`CANCELLED` theo bản routing của `tuan/DocManS` khi port (câu hỏi mở).

### Story 5.10: BGĐ ký thành lập hội đồng đánh giá và quyết định đề tài cùng kinh phí [FR73, FR20]

As a GĐ hoặc PGĐ-KH,
I want ký thành lập hội đồng đánh giá sau khi mọi thành viên đã chấp nhận, và (riêng GĐ) quyết định đề tài cùng kinh phí,
So that hội đồng và quyết định cuối có thẩm quyền đúng ma trận ký.

**Acceptance Criteria:**

**Given** hội đồng đánh giá có mọi thành viên đã chấp nhận lời mời
**When** TP¹/TB¹/CV³ lập tờ trình `EVALUATION_COUNCIL`
**Then** submission đi qua Story 5.9
**And** nếu còn thành viên chưa chấp nhận hoặc đã từ chối, backend từ chối lập tờ trình.

**Given** tờ trình `EVALUATION_COUNCIL` ở stage `LEADERSHIP`
**When** GĐ hoặc PGĐ-KH không conflict ký
**Then** hội đồng được thành lập và thành viên đã chấp nhận mới được đọc hồ sơ
**And** audit ghi người ký và thời điểm.

**Given** tờ trình `DECISION_PACKAGE` ở stage `LEADERSHIP`
**When** GĐ phê duyệt hoặc từ chối (lý do bắt buộc khi từ chối)
**Then** đề tài và kinh phí được quyết định cùng nhau qua Story 5.8
**And** PGĐ-KH, PGĐ-TD, TP, PP, TB, CV, QT và reviewer không có quyền quyết định đề tài.

**Given** người ký là PI, thành viên, reviewer hoặc thành viên hội đồng của hồ sơ
**When** họ cố ký hoặc quyết định
**Then** backend từ chối do conflict
**And** action hiển thị bị khóa kèm lý do.

### Story 5.11: Delta cho 5.3: TP¹/TB¹/CV³ phân công, ứng viên ngoài QT, chấp nhận/từ chối [FR17]

As a TP¹, TB¹ hoặc CV³ phụ trách hồ sơ,
I want mời reviewer và thành viên hội đồng từ mọi tài khoản có lý lịch khoa học trừ QT,
So that Story 5.3 (đang review, giữ nguyên AC) vận hành đúng mô hình mười vai trò.

**Acceptance Criteria:**

**Given** proposal đã xác nhận đầy đủ cho phiên bản nộp hiện tại
**When** TP¹, TB¹ hoặc CV³ tìm ứng viên hoặc phân công/thu hồi
**Then** backend cho phép theo scope (TP/TB unit scope, CV chỉ hồ sơ mình phụ trách) cùng các kiểm tra eligibility và conflict của Story 5.3
**And** PP, BGĐ, QT và CV không phụ trách hồ sơ bị từ chối.

**Given** ứng viên là bất kỳ tài khoản active có lý lịch khoa học (GĐ, PGĐ-KH, PGĐ-TD, TP, PP, TB, CV, NCV, NNB)
**When** ứng viên không phải người tham gia hồ sơ và không có conflict
**Then** ứng viên có thể được mời
**And** QT không bao giờ xuất hiện trong danh sách ứng viên.

**Given** người phân công tự chọn chính mình
**When** phân công được xác nhận
**Then** backend từ chối tự phân công theo quy tắc loại trừ cuối matrix §8
**And** quy tắc "kể cả chính mình" của Story 5.3 không còn áp dụng.

**Given** người được mời
**When** họ chấp nhận hoặc từ chối (từ chối bắt buộc lý do)
**Then** quyết định được lưu với history/audit
**And** trước khi chấp nhận họ chỉ thấy tên, vai trò, hạn và người mời; mọi vai trò được mời vào hội đồng đều chấm điểm.

**Given** quy tắc roster "đúng hai reviewer và ít nhất ba committee member" của Story 5.3
**When** delta này được triển khai
**Then** quy tắc được giữ nguyên (câu hỏi mở, chưa có trong matrix)
**And** không thay đổi điều kiện readiness.

## Epic 6: Theo dõi và nghiệm thu đề tài đã phê duyệt

Chủ nhiệm, thành viên, CV phụ trách, TB/TP (bước tờ trình) và người ký BGĐ có thể
quản lý tiến độ, báo cáo, điều chỉnh, gia hạn, kinh phí, hồ sơ nghiệm thu, thanh lý
và quyết định cuối của đề tài.

> Role names and decision rights in the done and in-flight stories of this epic
> predate the 10-role model; see `docs/permission-matrix.md`. In-flight Stories
> 6.1–6.7 and 6.10 keep their ACs; the routed adjustment/extension decision is
> delta Story 6.11 and funding/liquidation is Story 6.12.

### Story 6.1: Khởi tạo đề tài từ proposal được phê duyệt [FR23]

As a chuyên viên quản lý khoa học,
I want khởi tạo hồ sơ đề tài từ proposal đã duyệt,
So that dữ liệu và trách nhiệm được chuyển sang giai đoạn thực hiện có truy vết.

**Acceptance Criteria:**

**Given** Leadership has approved the exact immutable proposal submission/version
**When** the current scoped proposal officer creates a separate project
**Then** use a new `PROJECT_MANAGEMENT_OFFICER`, never shared or automatically copied proposal authority
**And** the project may be unassigned; Staff project management access waits for an effective project assignment. Head independently assigns the project officer, who confirms setup/activation. Creation grants no automatic project authority and execution cannot begin before activation.

**Given** proposal có final decision được phê duyệt và chưa có project tương ứng
**When** chuyên viên khởi tạo project
**Then** hệ thống sao chép dữ liệu nguồn được quy định và lưu source proposal/version
**And** tạo project state ban đầu trong một transaction.

**Given** a preparing project has an independently assigned, active, scoped and
conflict-free project officer
**When** that assigned Staff member confirms setup
**Then** the project changes to the execution state through `project.setup.confirm`
**And** the activation, setup version and audit are committed atomically.

**Given** proposal có owner-derived PI, `TOPIC_MEMBER` và `TOPIC_SECRETARY` đang hoạt động
**When** project được tạo
**Then** quan hệ được ánh xạ sang type project tương ứng với lifecycle/version riêng
**And** không tạo global role hoặc mở rộng quyền ngoài active team responsibility.

**Given** request lặp hoặc source proposal/version không còn hợp lệ
**When** project initialization được gửi
**Then** hệ thống không tạo project trùng
**And** trả kết quả idempotent hoặc context-version mismatch rõ ràng.

**Given** actor ngoài scope hoặc có conflict cấm action
**When** họ cố khởi tạo project
**Then** backend từ chối
**And** không tạo dữ liệu chuyển tiếp hoặc file association một phần.

### Story 6.2: Quản lý thành viên, trách nhiệm, milestone và checkpoint [FR24, FR30a]

As a chủ nhiệm hoặc chuyên viên được phép,
I want xác định thành viên, trách nhiệm và các mốc theo dõi,
So that kế hoạch thực hiện có người chịu trách nhiệm và hạn rõ ràng.

**Acceptance Criteria:**

**Given** project participant or management-officer membership changes
**When** it is saved
**Then** deny participant + management officer on the same project, prevent competing primary officers and preserve assignment history/audit
**And** Staff can still participate on other projects without receiving management actions.

**Given** project ở state cho phép lập kế hoạch
**When** actor có exact manage-plan action tạo milestone/checkpoint với người phụ trách và hạn
**Then** backend validate timeline, assignment và organization rules
**And** lưu project version, history và audit atomically.

**Given** project đã activated và actor muốn đổi governed membership hoặc important
milestone/approved scope-plan
**When** the actor attempts a direct project-field mutation
**Then** backend denies the mutation and requires a typed Project Adjustment request
**And** only the assigned project Staff's approval can apply that request.

**Given** PI/chuyên viên thêm, đình chỉ hoặc kết thúc governed project membership
**When** lifecycle operation được thực hiện after activation
**Then** the direct mutation is denied and a typed Project Adjustment is required;
  after assigned Staff approval, source project status/effective interval changes
  by successor history
**And** quyền của actor thay đổi tại request `asOf` tương ứng.

**Given** topic team member mở detail
**When** relationship đang hoạt động
**Then** họ xem được trách nhiệm, milestone và file hỗ trợ được cấp
**And** không nhận manage-membership, approval hoặc final-decision action mặc định.

**Given** `TOPIC_SECRETARY` đang hoạt động
**When** họ cập nhật tracking, meeting material, minutes, task hoặc draft summary được cấp
**Then** action hành chính được phép và audit
**And** scoring, membership decision, approval/rejection và final decision vẫn bị chặn.

### Story 6.3: Chủ nhiệm nộp báo cáo tiến độ và bằng chứng [FR25]

As a chủ nhiệm đề tài,
I want lập và nộp báo cáo tiến độ kèm bằng chứng,
So that đơn vị quản lý có thể đánh giá tình hình thực hiện.

**Acceptance Criteria:**

**Given** reporting checkpoint đang mở và PI có active relationship
**When** PI tạo/sửa report draft với tiến độ, kết quả, khó khăn, kiến nghị và milestone status
**Then** backend validate dữ liệu theo checkpoint
**And** lưu draft trong đúng project context.

**Given** PI có exact progress-file action
**When** họ upload evidence
**Then** shared files module tạo project/report association và version metadata
**And** grant không mở quyền cho file type hoặc project khác.

**Given** report đạt readiness và actor có `project.report.submit`
**When** họ xác nhận nộp
**Then** report chuyển state atomically, khóa version đã nộp và tạo history/audit
**And** notification source event không chứa dữ liệu ngoài disclosure.

**Given** checkpoint đóng, relationship/grant hết hiệu lực hoặc version cũ
**When** actor cố sửa/nộp
**Then** backend từ chối theo state/context hiện hành
**And** không dựa vào capability đã cache.

### Story 6.4: Thành viên đóng góp tệp và minh chứng trong phạm vi được giao [FR30a, FR30b]

As a thành viên đề tài,
I want tải lên đóng góp hoặc minh chứng cho trách nhiệm của mình,
So that tôi hỗ trợ đề tài mà không có toàn quyền của chủ nhiệm.

**Acceptance Criteria:**

**Given** topic team member có active relationship và responsibility cho milestone
**When** họ upload contribution file thuộc loại được phép
**Then** file gắn với project, responsibility và uploader
**And** history phân biệt contribution với hồ sơ do PI nộp chính thức.

**Given** member không có responsibility hoặc exact file action
**When** họ upload, replace hoặc delete file
**Then** backend từ chối
**And** không để lại metadata/object có thể truy cập.

**Given** member có contribution file của mình
**When** họ chỉnh sửa trước khi PI chốt report theo state cho phép
**Then** capability chỉ mở action đã đăng ký
**And** member không thể submit progress report, adjustment hoặc acceptance dossier thay PI.

**Given** member relationship bị đình chỉ/kết thúc
**When** họ truy cập project/file
**Then** action dừng ngay
**And** đóng góp cũ vẫn được bảo tồn trong project history theo quyền người xem.

### Story 6.5: Rà soát báo cáo và theo dõi chậm tiến độ [FR26, FR29]

As a chuyên viên quản lý khoa học,
I want rà soát báo cáo và nhận biết đề tài chậm hoặc còn tồn đọng,
So that tôi có thể yêu cầu xử lý kịp thời.

**Acceptance Criteria:**

**Given** progress report đã nộp trong scope
**When** chuyên viên review
**Then** họ xem report version, evidence, milestone status và history được phép
**And** có thể chấp nhận, yêu cầu follow-up hoặc ghi unresolved issue theo state machine.

**Given** a submitted report is complete enough for administrative acceptance
**When** the current assigned project Staff confirms review
**Then** `project.report.accept` records Staff acceptance and returns the
  report to the active execution record
**And** Leadership has no report-approval action and project acceptance is not implied.

**Given** milestone/report quá hạn, sắp đến hạn hoặc chờ hành động
**When** project authorized query được gọi
**Then** source project tính flags từ deadline/state hiện hành
**And** trả versioned authorized result để Epic 11–12 tích hợp sau này.

**Given** PI/member/secretary xem issue hoặc review outcome
**When** disclosure áp dụng
**Then** họ chỉ thấy feedback/follow-up được phép cho project
**And** không thấy internal management note bị hạn chế.

**Given** một enabled project query không giải quyết được scope/state
**When** list/count được yêu cầu
**Then** source fail closed
**And** không trả một phần count hoặc record ngoài quyền.

### Story 6.6: Gửi yêu cầu điều chỉnh hoặc gia hạn [FR27]

As a chủ nhiệm đề tài,
I want gửi yêu cầu điều chỉnh hoặc gia hạn có căn cứ,
So that thay đổi kế hoạch được xem xét chính thức.

**Acceptance Criteria:**

**Given** project ở state cho phép và PI có active relationship
**When** PI tạo request với loại thay đổi, lý do, dữ liệu before/proposed và tệp hỗ trợ
**Then** backend lưu draft có version
**And** không thay đổi project plan hiện hành trước quyết định.

**Given** the requested change is an important milestone, approved scope/plan or
governed membership change
**When** PI submits a Project Adjustment
**Then** the request enters `submitted`; assigned Staff moves it to `under_staff_review`, carrying typed before/proposed
  values, the source project version and pinned evidence
**And** a duration or end-date increase is rejected as the wrong request type and
  must be submitted through Project Extension.

**Given** PI submits a Project Extension with a requested end date later than the
current effective end date
**When** the request passes readiness
**Then** it enters `submitted`; assigned Staff validates it into `under_staff_validation` without changing the project end date
**And** the request records the exact source project version and immutable evidence.

**Given** request đạt readiness và actor có exact submit action
**When** PI hợp lệ nộp
**Then** request chuyển state atomically và ghi actor context
**And** source project phát history/audit/notification event.

**Given** member hoặc secretary cố gửi request
**When** họ cố gửi request
**Then** backend từ chối với blocked reason
**And** quyền đóng góp tệp/draft được cấp không tự biến thành submit.

**Given** có request đang xử lý không tương thích
**When** actor tạo request mới
**Then** backend áp dụng uniqueness/state rule và từ chối xung đột
**And** không ghi đè request hiện hữu.

**Given** an adjustment or extension has a stale project/request version, missing
evidence, inactive actor or unresolved conflict
**When** submission is attempted
**Then** backend denies the mutation and applies no project-field change
**And** the denial is audited without creating a partial request.

### Story 6.7: Quyết định điều chỉnh hoặc gia hạn [FR28]

As a project-management decision actor,
I want the correct scoped Staff or Head to approve or reject the request type,
So that project changes use the documented separation of duties.

**Acceptance Criteria:**

**Given** a submitted Project Adjustment is in `under_staff_review`
**When** the current assigned, scoped, unconflicted project Staff opens it
**Then** they receive `project.adjustment.review` and the before/proposed values,
  reason, files and history needed for the decision
**And** `project.adjustment.approve` or `project.adjustment.reject` is the only
  final decision path for that request.

**Given** a submitted Project Extension is in `under_staff_validation`
**When** the current assigned Staff validates and prepares a complete package
**Then** the request moves to `ready_for_head_decision` with the source project and
  request versions retained
**And** Staff never has an extension final-decision action; only Head decides.

**Given** actor là PI, member, secretary, Leadership, an unassigned Staff member,
or has conflict on the project
**When** họ cố quyết định
**Then** conflict/non-delegable denial thắng mọi allow khác
**And** action hiển thị bị khóa với lý do.

**Given** assigned Staff approves a Project Adjustment with current versions
**When** the decision transaction succeeds
**Then** request and the typed project plan/milestone/membership change are updated atomically
**And** history/audit records before/after, actor and decision reason.

**Given** scoped, unconflicted Head approves a Project Extension with current versions
**When** the decision transaction succeeds
**Then** request and effective project end date/version are updated atomically
**And** history/audit records before/after, actor and decision reason.

**Given** Leadership attempts to approve/reject an adjustment or extension
**When** the request is in any processing or decision state
**Then** backend returns `ACTION_NOT_GRANTED` and leaves the request and project unchanged.

**Given** assigned Staff rejects an adjustment, Head rejects an extension, or context đã đổi
**When** decision được gửi
**Then** reject chỉ đổi request state và không thay project plan, hoặc mismatch từ chối toàn bộ
**And** không tạo nhiều final decisions.

### Story 6.8: Chuẩn bị và nộp hồ sơ nghiệm thu hoặc đánh giá cuối [FR27a]

As a chủ nhiệm đề tài,
I want chuẩn bị và nộp hồ sơ nghiệm thu đầy đủ,
So that đề tài có thể được xem xét kết thúc theo quy trình.

**Acceptance Criteria:**

**Given** project đạt state/điều kiện cho phép lập hồ sơ nghiệm thu
**When** PI tạo dossier với kết quả, sản phẩm, báo cáo tổng kết, đối chiếu milestone và tệp bắt buộc
**Then** dossier draft được gắn project/version
**And** shared files module áp dụng association và disclosure riêng của acceptance dossier.

**Given** dossier nghiệm thu (bước 8, D-033)
**When** kết quả được ghi nhận
**Then** nghiệm thu sản phẩm, cơ sở, cấp trên đều qua một hội đồng nghiệm thu đề tài duy nhất (D-034)
**And** không có bản ghi hay quy trình nghiệm thu riêng cho từng cấp.

**Given** member có responsibility/action đóng góp
**When** họ cung cấp product/evidence
**Then** đóng góp được lưu và truy vết
**And** chỉ PI có exact submit action mới được nộp dossier.

**Given** readiness check phát hiện milestone, dữ liệu hoặc tệp còn thiếu
**When** PI cố nộp
**Then** submission bị từ chối với lỗi theo section
**And** project/dossier không chuyển state một phần.

**Given** hồ sơ đầy đủ và actor có quyền
**When** PI xác nhận nộp
**Then** dossier chuyển state atomically, khóa submitted version và tạo history/audit
**And** không tạo bất kỳ approval/final-decision authority cho PI; CV phụ trách nhận việc chuẩn bị hội đồng nghiệm thu.

### Story 6.9: Rà soát và ghi nhận kết quả nghiệm thu hoặc đánh giá cuối [FR28]

As a CV³ phụ trách đề tài, TB/TP ở bước tờ trình hoặc GĐ/PGĐ-KH ký,
I want rà soát hồ sơ nghiệm thu, lập hội đồng nghiệm thu qua tờ trình và ghi nhận kết quả nghiệm thu,
So that kết quả cuối của đề tài có căn cứ và không bị tự phê duyệt.

> D-033: kết quả nghiệm thu thuộc bước 8, không phải một trong hai quyết định chính
> thức (bước 5 và 9). Quy tắc thẩm quyền và chữ ký dưới đây giữ nguyên.
> D-034: một hội đồng nghiệm thu đề tài; chủ tịch hội đồng đánh dấu kết quả.

**Acceptance Criteria:**

**Given** a participant is selected for evaluation/acceptance council or final decision on the same project
**When** assignment changes or the protected evaluation/decision executes
**Then** conflict denies; same-round reviewer/final-decision and mutually exclusive council positions are also checked
**And** TP/TB/CV management visibility or Academy-wide project view cannot bypass these rules or BGĐ signature authority.

**Given** dossier đã nộp
**When** CV³ phụ trách completeness review
**Then** họ có thể yêu cầu bổ sung, hoặc mời thành viên hội đồng nghiệm thu (mọi vai trò trừ QT, không phải người tham gia) và sau khi mọi thành viên chấp nhận thì lập tờ trình `ACCEPTANCE_COUNCIL`
**And** state/history/notification thay đổi atomically.

**Given** tờ trình `ACCEPTANCE_COUNCIL` đã qua TB và TP
**When** GĐ hoặc PGĐ-KH không conflict ký thành lập hội đồng nghiệm thu
**Then** hội đồng được thành lập và thành viên mới được đọc dossier
**And** chữ ký không do TP, TB, CV, PP hay PGĐ-TD thực hiện.

**Given** actor có final-review/acceptance decision assignment và không conflict
**When** họ xem dossier
**Then** họ nhận data, file, project history và capability đúng duty
**And** version thay đổi buộc tải lại trước decision.

**Given** actor là PI, topic team member, `TOPIC_SECRETARY` hoặc chỉ có delegation
**When** họ cố approve/reject/finalize
**Then** backend từ chối do conflict/non-delegable policy
**And** không có đường API hoặc UI khác vượt chặn.

**Given** hội đồng nghiệm thu đã đánh giá và chủ tịch hội đồng không conflict
**When** chủ tịch đánh dấu kết quả
**Then** đạt chuyển đề tài sang `Accepted`, không đạt chuyển sang `Failed` (D-034)
**And** thành viên khác của hội đồng, CV, TB, TP hay người tham gia đề tài không đánh dấu thay.

**Given** actor hợp lệ ghi decision
**When** transaction thành công
**Then** decision, dossier state và project state cập nhật nhất quán
**And** audit/history/notification dùng cùng published-result disclosure.

### Story 6.10: Trạng thái, lịch sử và truy vấn được phân quyền của đề tài [FR29, FR30]

As a người tham gia hoặc quản lý đề tài,
I want danh sách và chi tiết phản ánh đúng trạng thái, vai trò và việc cần làm,
So that các tích hợp sau có nguồn dữ liệu hoàn chỉnh và an toàn.

**Acceptance Criteria:**

**Given** a Head, assigned Staff, participation-only Staff or revoked officer queries project data
**When** list/detail/search/count/facets/dashboard/reports/export/notifications/files/history are produced
**Then** each surface uses the same current access basis, scope and disclosure; denied records contribute no metadata or totals.

**Given** actor truy vấn project list/detail
**When** source project đánh giá context
**Then** response có project state, viewer relationships, allowed/blocked actions, deadlines và authorized summary
**And** PI/member/secretary/staff mỗi người chỉ thấy trường đúng policy.

**Given** project trải qua milestone, report, adjustment hoặc acceptance transition
**When** timeline được tải
**Then** event có source/context version và disclosure phù hợp
**And** state chỉ thay đổi qua named application actions.

**Given** file, reminder, search, dashboard, report hoặc personal-work consumer muốn tích hợp
**When** project source được đánh giá contract-complete
**Then** canonical provider/consumer fixtures cho allow, denial, lifecycle, disclosure, failure và version mismatch đều pass
**And** consumer không truy cập trực tiếp project tables.

**Given** source query gặp unresolved/stale/partial context
**When** consumer yêu cầu list hoặc count
**Then** source trả canonical failure code
**And** không cung cấp partial data có thể làm sai queue hoặc dashboard.

### Story 6.11: Delta GF4: điều chỉnh/gia hạn qua tờ trình, GĐ hoặc PGĐ-KH ký [FR28, FR73]

As a CV³ phụ trách đề tài,
I want thẩm định yêu cầu điều chỉnh hoặc gia hạn và trình qua luồng tờ trình để GĐ hoặc PGĐ-KH ký,
So that thay đổi kế hoạch đề tài có đúng người ký thay cho đường quyết định Staff/Head của Stories 6.6–6.7.

**Acceptance Criteria:**

**Given** PI đã nộp Project Adjustment (mốc, phạm vi/kế hoạch, thành viên, có hoặc không đổi kinh phí) hoặc Project Extension (ngày kết thúc muộn hơn)
**When** CV³ phụ trách thẩm định
**Then** CV ghi kết quả thẩm định và lập tờ trình `PROJECT_ADJUSTMENT` hoặc `PROJECT_EXTENSION` qua Story 5.9
**And** thẩm định tự nó không áp dụng thay đổi nào cho đề tài.

**Given** tờ trình đã qua TB và TP và ở stage `LEADERSHIP`
**When** GĐ hoặc PGĐ-KH không conflict ký
**Then** request và thay đổi đề tài (kế hoạch/mốc/thành viên/kinh phí, hoặc ngày kết thúc và version) được áp dụng atomically
**And** history/audit ghi trước/sau, người ký và thời điểm.

**Given** CV, TP, TB, PP, PGĐ-TD, QT, PI, thành viên hoặc reviewer
**When** họ cố phê duyệt hoặc từ chối cuối cùng một điều chỉnh/gia hạn
**Then** backend trả `ACTION_NOT_GRANTED` hoặc conflict denial và không thay đổi request hay đề tài
**And** đường quyết định cuối của Staff (điều chỉnh) và Head (gia hạn) trong Stories 6.6–6.7 bị thay thế.

**Given** không có actor đủ điều kiện ở bước TB/TP hoặc không có người ký GĐ/PGĐ-KH không conflict
**When** request không thể được quyết định
**Then** PI rút request theo đường rút hiện có (`project.adjustment.withdraw`, `project.extension.withdraw`) để giải phóng đề tài
**And** quy tắc này được hiển thị cho PI kèm lý do bị chặn.

**Given** tên trạng thái cũ `under_staff_review`, `under_staff_validation`, `ready_for_head_decision`
**When** delta được triển khai
**Then** các trạng thái này được đối chiếu với giai đoạn và trạng thái routing (matrix §6)
**And** story không tự đặt tên trạng thái mới; tên cuối cùng theo quyết định của Architect.

### Story 6.12: Kinh phí dạng metadata và thanh lý [FR74]

As a GĐ, TP/TB hoặc CV³ phụ trách đề tài,
I want ghi nhận số liệu cấp, giải ngân, quyết toán kinh phí kèm tài liệu và trình thanh lý,
So that kinh phí đề tài truy vết được mà không biến hệ thống thành sổ kế toán.

> D-033: số liệu cấp, giải ngân, quyết toán thuộc bước 7 (Thực hiện); thanh lý và
> đóng đề tài thuộc bước 9, quyết định chính thức do GĐ ký.

**Acceptance Criteria:**

**Given** đề tài đang thực hiện
**When** GĐ, TP/TB (toàn Học viện) hoặc CV³ phụ trách ghi số liệu cấp, giải ngân hoặc quyết toán kèm tài liệu
**Then** backend lưu metadata có version và audit (actor, đề tài, số tiền/tài liệu, thời điểm)
**And** không có sổ cái, thanh toán, ngân hàng hay tích hợp ERP.

**Given** người xem kinh phí theo đề tài
**When** dữ liệu được trả
**Then** GĐ, PGĐ-KH, TP, TB xem tất cả; CV chỉ đề tài phụ trách; PP, PI và thành viên chỉ đề tài mình tham gia
**And** PGĐ-TD chỉ thấy số liệu tổng hợp, cột kinh phí từng đề tài để trống.

**Given** PGĐ-KH, PGĐ-TD, PP, QT, PI hoặc thành viên
**When** họ cố sửa số liệu kinh phí
**Then** backend từ chối
**And** thay đổi kinh phí qua điều chỉnh đề tài đi theo Story 6.11.

**Given** đề tài đủ điều kiện thanh lý
**When** CV³ phụ trách lập biên bản thanh lý và trình tờ trình `LIQUIDATION`
**Then** submission đi qua TB → TP theo Story 5.9 và chỉ GĐ được ký
**And** PGĐ-KH không ký thanh lý; chữ ký áp dụng kết quả thanh lý atomically với audit.

**Given** tờ trình `LIQUIDATION` của đề tài `Accepted` hoặc `Failed` được GĐ ký
**When** transaction thành công
**Then** đề tài chuyển `Closed` atomically cùng kết quả thanh lý, history và audit (bước 9)
**And** đề tài `Failed` vẫn được đóng (D-034); không đường nào khác đóng đề tài.

## Epic 7: Giao việc và theo dõi thực hiện

Người dùng có thể tạo, giao, phối hợp và hoàn tất công việc độc lập hoặc gắn với
hồ sơ nghiệp vụ, đồng thời nhận biết việc sắp đến hạn và quá hạn.

### Story 7.1: Tạo công việc độc lập hoặc liên kết hồ sơ [FR31]

As a người dùng được phép giao việc,
I want tạo task độc lập hoặc gắn task với hồ sơ nghiệp vụ,
So that công việc có mục tiêu, người chịu trách nhiệm và ngữ cảnh rõ ràng.

**Acceptance Criteria:**

**Given** actor có `task.create` hoặc exact task action trên source record
**When** họ tạo task với tiêu đề, mô tả, priority, due date và optional source link
**Then** backend validate task và source association
**And** lưu task, source/context version và creator atomically.

**Given** task được liên kết proposal, project, report, meeting hoặc workflow event
**When** association được tạo
**Then** owning source xác nhận record tồn tại và actor có quyền tạo task trong context đó
**And** task không dùng direct foreign identifier như một quyền truy cập.

**Given** `TOPIC_SECRETARY` có exact administrative task action trên record
**When** họ tạo task hành chính trong record đó
**Then** task được tạo và audit
**And** action không cấp quyền sửa membership, review hoặc decision của source record.

**Given** actor ngoài source scope hoặc source context unresolved
**When** họ cố tạo linked task
**Then** backend fail closed
**And** không tạo task độc lập bị mất liên kết để né policy.

**Given** actor là QT hoặc BGĐ (GĐ, PGĐ-KH, PGĐ-TD)
**When** họ cố tạo task
**Then** backend từ chối vì QT/BGĐ không tạo task
**And** TP/TB/CV chỉ tạo task trong phạm vi của mình (CV trên hồ sơ mình phụ trách), PI trong đề tài của mình.

### Story 7.2: Phân công và quản lý vòng đời người thực hiện [FR32]

As a người giao việc,
I want phân công người chịu trách nhiệm và cộng tác viên với thời hạn hiệu lực,
So that quyền trên task phản ánh đúng người đang thực hiện.

**Acceptance Criteria:**

**Given** candidate là user active và nằm trong assignment rule
**When** owner tạo `TASK_ASSIGNEE` hoặc collaborator relationship
**Then** task source lưu status, effective interval và relationship version
**And** capability của candidate chỉ áp dụng trên task đó.

**Given** task liên kết source record có dữ liệu hạn chế
**When** candidate được phân công
**Then** assignment preflight kiểm tra candidate có minimum source context cần thiết
**And** task không làm lộ file hoặc nội dung source ngoài disclosure.

**Given** assignment bị đình chỉ, kết thúc hoặc thu hồi
**When** assignee truy cập task
**Then** update actions dừng ngay theo request-wide `asOf`
**And** history assignment vẫn được bảo tồn.

**Given** assignment cùng loại chồng lấn hoặc candidate không hợp lệ
**When** người giao việc xác nhận
**Then** backend từ chối và giữ nguyên version hiện hành
**And** không gửi notification assignment thành công.

### Story 7.3: Cập nhật tiến độ và trạng thái công việc [FR33, FR35]

As a người được giao việc,
I want cập nhật tiến độ, ghi chú và trạng thái task,
So that người giao việc biết tình hình thực hiện.

**Acceptance Criteria:**

**Given** assignee relationship đang hoạt động
**When** assignee cập nhật progress, note hoặc transition được phép
**Then** task state machine validate transition
**And** lưu state/history/audit trong một transaction.

**Given** collaborator chỉ có action đóng góp
**When** họ thêm note hoặc progress update được cấp
**Then** backend cho phép phần đóng góp
**And** không cho reassign, cancel hoặc mark-complete nếu action đó không được cấp.

**Given** transition không hợp lệ, task đã đổi version hoặc assignment hết hiệu lực
**When** actor gửi mutation
**Then** backend từ chối với state/context code thích hợp
**And** không lưu progress hoặc history một phần.

**Given** task hoàn thành hoặc bị hủy
**When** detail/list được tải
**Then** allowed/blocked actions phản ánh state mới
**And** trạng thái được truyền đạt bằng text/icon, không chỉ bằng màu.

### Story 7.4: Tệp và minh chứng hoàn thành công việc [FR33]

As a người thực hiện task,
I want đính kèm minh chứng hoàn thành,
So that kết quả công việc có thể được kiểm tra và truy vết.

**Acceptance Criteria:**

**Given** assignee/collaborator có exact task-file action
**When** họ upload evidence hợp lệ
**Then** shared files module tạo task association, uploader, version và context metadata
**And** permission được kiểm tra lại ở upload, metadata, preview và download.

**Given** task liên kết source record có disclosure hạn chế
**When** evidence chứa hoặc tham chiếu source material
**Then** file policy lấy giao của task action và source disclosure
**And** task assignment không tự mở dữ liệu source bị cấm.

**Given** actor cố replace/delete evidence của người khác
**When** capability không có exact action
**Then** backend từ chối
**And** không dựa vào ownership tên file hoặc object key.

**Given** task được hoàn thành
**When** required evidence rule áp dụng
**Then** state transition kiểm tra evidence/version trước khi hoàn tất
**And** thiếu evidence làm transition fail atomically với lỗi có thể sửa.

### Story 7.5: Danh sách việc sắp hạn, quá hạn và contract tích hợp [FR34]

As a người thực hiện hoặc quản lý công việc,
I want thấy việc sắp đến hạn và quá hạn trong phạm vi của mình,
So that tôi có thể ưu tiên xử lý đúng lúc.

**Acceptance Criteria:**

**Given** actor truy vấn task list
**When** họ lọc theo assignee, source, priority, state hoặc due date
**Then** backend chỉ trả task được phép và tính upcoming/overdue từ authoritative time
**And** total count/facet không bao gồm task ngoài scope.

**Given** task bị blocked vì source conflict hoặc disclosure
**When** task list/detail được trả
**Then** hành động bị khóa với canonical code/reason
**And** metadata source bị giới hạn theo policy.

**Given** notification, reminder, dashboard hoặc personal-work consumer tích hợp task
**When** task source được công bố contract-complete
**Then** authorized query DTO, context version, lifecycle, failure và consumer fixtures đều pass
**And** consumer không đọc trực tiếp task/assignment tables.

**Given** task source unresolved, stale hoặc partial
**When** consumer yêu cầu list/count
**Then** source fail closed bằng canonical code
**And** không tạo queue/count một phần hoặc notification sai người.

## Epic 8: Quản lý seminar và nghiên cứu sinh viên

CV có thể quản lý kế hoạch, mốc, điều chỉnh, sản phẩm, kết quả và lịch sử của
seminar hoặc hoạt động nghiên cứu sinh viên; đề tài sinh viên NCKH do CV/NCV đăng
ký với tư cách giảng viên hướng dẫn và CV¹ duyệt, quản lý, hoàn thành (Story 8.6).

### Story 8.1: Tạo hoặc nhập bản ghi hoạt động đã được phê duyệt [FR50]

As a CV (chuyên viên QLKH),
I want tạo hoặc nhập seminar/nghiên cứu sinh viên từ quyết định nguồn,
So that hoạt động được theo dõi với đơn vị, người tham gia và căn cứ rõ ràng.

**Acceptance Criteria:**

**Given** actor có quyền trong organization scope
**When** họ tạo/import record với loại hoạt động, tên, đơn vị, lịch, phạm vi và source-decision metadata
**Then** backend validate và tạo record ở controlled initial state
**And** lưu source reference/version để chống nhập trùng.

**Given** danh sách người phụ trách và tham gia được cung cấp
**When** record được tạo
**Then** source domain tạo typed relationships có status/effective interval
**And** không tạo global role hoặc quyền ngoài record.

**Given** source reference đã tồn tại hoặc payload import không đơn nghĩa
**When** CV xác nhận
**Then** hệ thống từ chối duplicate/ambiguous record
**And** cung cấp báo cáo lỗi mà không tạo dữ liệu một phần.

**Given** actor ngoài scope hoặc context không giải quyết được
**When** họ tạo/import
**Then** backend fail closed
**And** audit ghi kết quả mà không lộ record ngoài quyền.

### Story 8.2: Quản lý kế hoạch, mốc, tài liệu và ghi chú hành chính [FR51]

As a CV hoặc người phụ trách được phép,
I want duy trì kế hoạch và các mốc của hoạt động,
So that lịch thực hiện và tài liệu hỗ trợ luôn cập nhật.

**Acceptance Criteria:**

**Given** record ở state cho phép lập kế hoạch
**When** actor có exact manage-plan action tạo/cập nhật milestone, schedule, responsibility hoặc administrative note
**Then** backend validate timeline và relationship
**And** lưu state-independent plan version, history và audit.

**Given** actor tải source decision, plan hoặc supporting document
**When** file hợp lệ
**Then** shared files module tạo association theo loại hoạt động
**And** upload/download/replace/delete đều kiểm tra policy nguồn tại thời điểm request.

**Given** participant chỉ có action xem hoặc đóng góp được cấp
**When** họ mở record
**Then** capability chỉ trả các milestone/tệp/field trong phạm vi
**And** không mở manage-participant hoặc administrative decision action.

**Given** official related-document registry chưa được tích hợp
**When** record cần lưu căn cứ hiện tại
**Then** source file/reference vẫn hoạt động độc lập và có truy vết
**And** không yêu cầu Epic 9 tương lai để hoàn thành story này.

### Story 8.3: Ghi nhận điều chỉnh, kinh phí, sản phẩm và kết quả [FR52]

As a CV hoặc người phụ trách được phép,
I want ghi nhận thay đổi, kinh phí và đầu ra của hoạt động,
So that kết quả thực tế có thể đối chiếu với kế hoạch.

**Acceptance Criteria:**

**Given** actor có exact edit action và record ở state phù hợp
**When** họ tạo adjustment với reason và before/proposed values
**Then** adjustment có lifecycle/version riêng
**And** current plan chỉ đổi qua named apply/approve operation đã đăng ký.

**Given** actor cập nhật budget metadata, product hoặc outcome
**When** dữ liệu hợp lệ
**Then** backend lưu theo clear domain DTO và source record version
**And** file minh chứng đi qua shared files module.

**Given** participant không có responsibility/action tương ứng
**When** họ sửa budget, adjustment hoặc outcome
**Then** backend từ chối
**And** quyền xem/đóng góp khác không bị suy diễn thành quyền quản trị.

**Given** mutation gặp state/context-version mismatch
**When** request được thực thi
**Then** không có plan/product/outcome thay đổi một phần
**And** client được yêu cầu tải lại trước khi thử lại.

### Story 8.4: Điều khiển trạng thái và xem lịch sử hoạt động [FR53]

As a người quản lý hoặc tham gia được phép,
I want trạng thái và timeline phản ánh đúng tiến trình hoạt động,
So that tôi biết việc đã hoàn tất và bước tiếp theo.

**Acceptance Criteria:**

**Given** một seminar/student-research record
**When** actor thực hiện transition được phép
**Then** state machine kiểm tra role, scope, relationship, state và required data
**And** transition/history/audit hoàn tất atomically.

**Given** transition không nằm trong state machine hoặc actor không có action
**When** request được gửi
**Then** backend từ chối
**And** direct status field update không được hỗ trợ.

**Given** người dùng mở timeline
**When** event history được tải
**Then** event có actor, time, action, before/after summary, file/reference và context version được phép
**And** dữ liệu ngoài scope hoặc nhạy cảm được redaction.

**Given** UI hiển thị trạng thái trên desktop/mobile
**When** record thay đổi
**Then** label, text/icon và next-action capability cập nhật nhất quán
**And** không phụ thuộc riêng vào màu hoặc tooltip.

### Story 8.5: Danh sách được phân quyền và contract tích hợp hoạt động [FR53]

As a CV hoặc người tham gia,
I want tìm và theo dõi các hoạt động trong phạm vi của mình,
So that reminder, dashboard và báo cáo có nguồn dữ liệu đáng tin cậy.

**Acceptance Criteria:**

**Given** actor truy vấn seminar/student-research list
**When** họ lọc theo loại, đơn vị, participant, state, milestone hoặc date
**Then** source chỉ trả record được phép với authorized count/facet
**And** mỗi item có viewer relationships, allowed/blocked actions và context version.

**Given** milestone sắp hạn, quá hạn hoặc chờ action
**When** source authorized query tính operational flags
**Then** kết quả dùng authoritative time/state
**And** có stable source ID/action cho integrations.

**Given** files, related documents, reminders, search, dashboard, report hoặc personal work tích hợp
**When** source được công bố contract-complete
**Then** lifecycle, disclosure, failure, version và consumer fixtures đều pass
**And** integration chỉ bắt đầu sau source contract, không chỉ sau khi có bảng.

**Given** source unresolved/stale/partial
**When** consumer yêu cầu result/count
**Then** source fail closed
**And** không trả partial aggregation hoặc count sai.

### Story 8.6: Đăng ký và duyệt đề tài sinh viên NCKH [FR50, FR51, FR52, FR53]

As a CV hoặc NCV làm giảng viên hướng dẫn,
I want đăng ký đề tài sinh viên NCKH và để CV¹ duyệt, quản lý, hoàn thành,
So that đề tài sinh viên được theo dõi đúng ma trận §9.6.

**Acceptance Criteria:**

**Given** actor là CV hoặc NCV
**When** họ đăng ký đề tài sinh viên với tư cách giảng viên hướng dẫn
**Then** backend lưu đăng ký của chính họ với audit
**And** QT, BGĐ, TP, PP, TB và NNB không đăng ký được.

**Given** đăng ký đang chờ trong unit scope
**When** CV¹ duyệt, quản lý hoặc hoàn thành đề tài
**Then** trạng thái chuyển theo state machine với history/audit
**And** vai trò khác không có action duyệt, quản lý hoặc hoàn thành.

**Given** seminar records
**When** story này được triển khai
**Then** quyền seminar giữ nguyên như Stories 8.1–8.5
**And** quyền seminar là câu hỏi mở chưa có trong matrix.

## Epic 9: Quản lý văn bản liên quan

Người dùng có thẩm quyền có thể đăng ký, liên kết, thay thế và truy xuất văn bản
theo hiệu lực, phiên bản và phạm vi dữ liệu.

### Story 9.1: Đăng ký văn bản và tệp nội dung [FR54]

As a người quản lý văn bản khoa học (QT, TP, TB hoặc CV),
I want đăng ký văn bản với metadata và bản tệp chính thức,
So that hệ thống có một sổ văn bản thống nhất và có khả năng truy vết.

**Acceptance Criteria:**

**Given** actor có exact document-register action trong organization scope
**When** họ nhập loại, cơ quan ban hành, số/ký hiệu, ngày, hiệu lực, tiêu đề và metadata bắt buộc
**Then** backend validate và tạo document record có controlled initial state
**And** kiểm tra trùng số/ký hiệu theo quy tắc nghiệp vụ.

**Given** actor tải bản nội dung văn bản
**When** file hợp lệ
**Then** shared files module lưu binary/metadata và liên kết version văn bản
**And** object key không được trả như public access path.

**Given** metadata hoặc tệp không hợp lệ
**When** actor xác nhận đăng ký
**Then** hệ thống không tạo current document/version một phần
**And** trả lỗi gắn đúng field/file.

**Given** actor ngoài scope, không có action hoặc không phải QT/TP/TB/CV (BGĐ, PP, NCV, NNB)
**When** họ gọi register API
**Then** backend từ chối
**And** audit không tiết lộ metadata của văn bản ngoài quyền.

### Story 9.2: Liên kết văn bản với hồ sơ nghiệp vụ đã có [FR55]

As a người dùng được phép trên văn bản và hồ sơ nguồn,
I want liên kết văn bản với hồ sơ nghiệp vụ,
So that căn cứ và tài liệu liên quan được truy cập từ đúng ngữ cảnh.

**Acceptance Criteria:**

**Given** document và target proposal/project/task/seminar/student-research/report đều tồn tại
**When** actor có exact link action ở cả document và target context
**Then** hệ thống tạo typed association có source/target version
**And** audit ghi actor, document, target và loại liên kết.

**Given** `TOPIC_SECRETARY` có action liên kết tài liệu hành chính trên assigned record
**When** họ tạo association được phép
**Then** link được tạo
**And** secretary không nhận quyền sửa document master, membership, review hoặc decision.

**Given** actor chỉ có quyền trên một phía hoặc target context unresolved
**When** họ tạo/xóa association
**Then** backend fail closed
**And** không để link tồn tại có thể làm lộ document/target metadata.

**Given** council/ethics domain chưa tồn tại tại Epic 9
**When** document association types được công bố
**Then** Epic 9 chỉ hỗ trợ các source domain đã contract-complete
**And** council/ethics association được thêm trong Epic 10 thay vì tạo dependency tương lai.

### Story 9.3: Quản lý phiên bản, thay thế và trạng thái hiệu lực [FR56]

As a người quản lý văn bản khoa học (QT, TP, TB hoặc CV),
I want thay thế văn bản và quản lý hiệu lực,
So that người dùng nhận biết bản hiện hành, hết hiệu lực hoặc bị thay thế.

**Acceptance Criteria:**

**Given** document hiện hành và actor có replace action
**When** họ tạo version thay thế với lý do/ngày hiệu lực
**Then** hệ thống tạo immutable version mới và predecessor link
**And** chỉ một version được xác định là current theo state/time rule.

**Given** document đến ngày hiệu lực hoặc hết hiệu lực
**When** authoritative time vượt boundary
**Then** status được tính/chuyển theo named operation hoặc job idempotent
**And** list/detail/capability dùng cùng trạng thái.

**Given** hai request thay thế đồng thời
**When** request sau dùng version cũ
**Then** backend trả `CONTEXT_VERSION_MISMATCH`
**And** không tạo hai current versions hoặc association mơ hồ.

**Given** version bị archived, superseded hoặc soft-deleted
**When** lịch sử được xem bởi actor có quyền
**Then** predecessor/successor, actor, time và reason vẫn truy vết được
**And** normal retrieval không trình bày version cũ là hiện hành.

### Story 9.4: Tìm kiếm và truy xuất văn bản theo quyền [FR57]

As a người dùng được phép,
I want tìm văn bản theo metadata, hiệu lực và hồ sơ liên quan,
So that tôi nhanh chóng lấy đúng căn cứ đang áp dụng.

**Acceptance Criteria:**

**Given** actor có document scope
**When** họ tìm theo số/ký hiệu, tiêu đề, loại, cơ quan, ngày, hiệu lực hoặc source link
**Then** backend chỉ trả document/version được phép
**And** count/facet không bao gồm metadata ngoài scope.

**Given** actor mở document từ một source record
**When** cả document và source authorization đều hợp lệ
**Then** họ xem metadata và download/preview action được cấp
**And** source link không mở rộng organization/disclosure scope.

**Given** actor biết document ID, file ID hoặc version ID nhưng không có quyền
**When** họ gọi detail/download API trực tiếp
**Then** backend từ chối
**And** không tiết lộ title, code, file name, issuing authority hoặc existence.

**Given** list hiển thị trên mobile/desktop
**When** viewport thay đổi
**Then** các trường mã, tên, hiệu lực, ngày và action chính vẫn đọc được
**And** status dùng text/icon cùng màu và không làm tràn trang.

### Story 9.5: Nhắc hiệu lực và contract tích hợp văn bản [FR56, FR57]

As a người quản lý văn bản khoa học (QT, TP, TB hoặc CV),
I want phát hiện văn bản sắp hết hiệu lực hoặc thiếu liên kết,
So that các workflow sử dụng căn cứ đúng và được cập nhật kịp thời.

**Acceptance Criteria:**

**Given** document có effective/expiry dates
**When** authorized query được gọi tại request-wide `asOf`
**Then** source trả upcoming-expiry, expired, superseded và missing-link flags
**And** kết quả có stable ID, action, context version và minimum-disclosure label.

**Given** reminder job xử lý văn bản sắp hết hiệu lực
**When** job chạy lại
**Then** output idempotent và chỉ gửi cho audience hiện còn quyền
**And** account/scope/state thay đổi làm notification bị hủy hoặc điều chỉnh.

**Given** search, dashboard, report hoặc personal-work consumer tích hợp
**When** document source được công bố contract-complete
**Then** authorization, lifecycle, file disclosure, failure và consumer fixtures đều pass
**And** consumer không đọc document/link tables trực tiếp.

**Given** source unresolved/stale hoặc một enabled association source thất bại
**When** aggregate list/count được yêu cầu
**Then** hệ thống fail closed bằng canonical context code
**And** không trả partial count hoặc link metadata.

## Epic 10: Hội đồng và hồ sơ đạo đức

Người được QT cấu hình thành lập hội đồng (mặc định TP¹/TB¹, D-035), CV³/TB¹/TP¹
lập tờ trình (D-036), chủ nhiệm, thư ký hội đồng, thành viên hội đồng/IRB và người
ký BGĐ (GĐ hoặc PGĐ-KH) có thể xử lý kế hoạch hội đồng hoặc hồ sơ đạo đức (IRB) trọn
vòng đời với đánh giá, tờ trình và chữ ký đúng phân công.

> Phạm vi hội đồng đánh giá (thẩm định, bước 4 D-033) đã có đặc tả triển khai:
> `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` và các story trong
> `implementation-artifacts/epic-10-councils-and-ethics/`. Phần nghiệm thu và IRB còn backlog.

### Story 10.1: Lập kế hoạch hội đồng, thành viên và căn cứ liên quan [FR58]

As a QT cấu hình và người được cấu hình thành lập hội đồng (mặc định TP¹/TB¹),
I want cấu hình ai được thành lập hội đồng theo từng loại và lập hội đồng (đánh giá, nghiệm thu, IRB) với mục đích, lịch, thành viên và căn cứ,
So that mỗi hội đồng có phạm vi và trách nhiệm được phê chuẩn rõ ràng.

**Acceptance Criteria:**

**Given** QT (`SYSTEM_ADMIN`) mở cửa sổ cấu hình hội đồng
**When** QT cấu hình từng loại hội đồng (`EVALUATION`, `ACCEPTANCE`, `IRB`)
**Then** QT tích chọn role được phép thành lập hội đồng và mời thành viên, và điền số lượng thành viên; mặc định TP (`RESEARCH_MANAGEMENT_HEAD`) và TB (`RESEARCH_BOARD_HEAD`) được tích (D-035)
**And** thay đổi có audit; QT chỉ cấu hình, không tự thành lập hội đồng hay mời thành viên.

**Given** actor có role được tích cho loại hội đồng đó trong organization scope (CV chỉ trên hồ sơ mình phụ trách)
**When** họ tạo plan với purpose, schedule, linked business records và role slots
**Then** backend validate và tạo council ở controlled initial state
**And** lưu source record/context versions cho các liên kết.

**Given** active user accounts có lý lịch khoa học (mọi vai trò trừ QT) được mời cho chair/member/reviewer/secretary roles
**When** assignment preflight chạy
**Then** hệ thống kiểm tra account status, active participation, organization rule,
multiplicity và conflict; linked profile nếu có chỉ là provenance
**And** áp dụng compatibility/multiplicity definition chuẩn cho cùng source record,
council và evaluation round; không tạo assignment khi context unresolved/stale,
candidate xung đột hoặc interval trùng/chồng lấn.

**Given** người được mời vào hội đồng
**When** họ chấp nhận hoặc từ chối (từ chối bắt buộc lý do)
**Then** quyết định được lưu với history/audit
**And** tờ trình thành lập hội đồng (`EVALUATION_COUNCIL`, `ACCEPTANCE_COUNCIL` hoặc `IRB_COUNCIL`) do CV³/TB¹/TP¹ lập (Phòng KHQS lập và trình, không ký — D-036) và chỉ được lập khi mọi thành viên đã chấp nhận; thành viên chỉ đọc hồ sơ sau khi GĐ hoặc PGĐ-KH ký
**And** việc chặn trình khi chưa đủ số lượng thành viên theo cấu hình là đề xuất chờ chủ sản phẩm xác nhận (P2 trong `specs/spec-hoi-dong-tham-dinh.md`).

**Given** legal/administrative document đã tồn tại trong Epic 9
**When** TP¹/TB¹/CV³ có quyền ở cả hai phía tạo council-document association
**Then** typed link được tạo và audit
**And** document scope không bị mở rộng cho unrelated council actors.

**Given** council membership được kích hoạt, đình chỉ, kết thúc hoặc thu hồi
**When** lifecycle operation hoàn tất
**Then** capability thay đổi theo UTC interval/status
**And** history cũ được bảo tồn, không biến role thành global account role.

**Given** một người đổi giữa chair, council secretary, council member và reviewer
**When** vị trí mới được kích hoạt
**Then** vị trí cũ được end/revoke trước, interval active không chồng lấn và history bất biến
**And** hai request đồng thời không thể tạo hai vị trí active trong cùng context.

### Story 10.2: Thư ký khoa học hỗ trợ vận hành hội đồng [FR6d, FR58, FR64]

As a thư ký khoa học của hội đồng,
I want chuẩn bị chương trình, tài liệu, biên bản và theo dõi công việc,
So that hội đồng vận hành đầy đủ mà tôi không có quyền đánh giá hoặc quyết định.

**Acceptance Criteria:**

**Given** `COUNCIL_SCIENTIFIC_SECRETARY` đang hoạt động
**When** secretary tạo/cập nhật agenda, meeting material, minutes, attendance, task, tracking hoặc draft summary được cấp
**Then** exact administrative action được cho phép và audit
**And** file đi qua shared files module với council association.

**Given** secretary cần xem input để lập biên bản/draft
**When** policy xây dựng response
**Then** chỉ dữ liệu được disclosure cho secretary được trả
**And** hidden reviewer identity/raw score/comment không xuất hiện qua API, file hoặc history.

**Given** secretary cố gán reviewer/member, submit evaluation, consolidate chuyên môn, approve, reject hoặc final decision
**When** request được gửi
**Then** backend từ chối theo conflict/non-delegable registry
**And** action bị chặn vẫn có reason rõ trên UI.

**Given** secretary relationship hết hiệu lực
**When** họ mở hội đồng hoặc thao tác
**Then** action hành chính dừng ngay
**And** tài liệu/biên bản cũ vẫn tồn tại theo policy của council.

### Story 10.3: Tạo, hoàn thiện và nộp hồ sơ đạo đức [FR59]

As a chủ nhiệm hoặc CV³ phụ trách hồ sơ,
I want lập hồ sơ đạo đức (IRB) với dữ liệu và tệp bắt buộc,
So that nghiên cứu có thể được hội đồng xem xét chính thức.

**Acceptance Criteria:**

**Given** target proposal/project phù hợp và actor là PI hoặc CV³ phụ trách có exact create action
**When** họ tạo ethics dossier
**Then** dossier lưu source record/version, applicant, organization và initial state
**And** PI relationship được lấy từ source record chứ không từ global role.

**Given** actor nhập structured ethics data và upload attachment
**When** dữ liệu/tệp hợp lệ
**Then** draft được lưu theo section và files module
**And** metadata/file access kiểm tra cả ethics dossier và source disclosure.

**Given** dossier đạt readiness và actor có `ethics-dossier.submit`
**When** PI, CV³ phụ trách hoặc delegate submit hợp lệ xác nhận
**Then** state chuyển atomically và submitted version bị khóa
**And** history/audit ghi actor, grantor context nếu có và source versions.

**Given** member/secretary không có exact submit grant hoặc source relationship hết hiệu lực
**When** họ cố submit
**Then** backend từ chối
**And** quyền đóng góp draft/file không tự biến thành submission authority.

### Story 10.4: Kiểm tra hồ sơ đạo đức và xử lý bổ sung [FR60]

As a TB¹ hoặc CV³ phụ trách hồ sơ,
I want kiểm tra tính đầy đủ và yêu cầu bổ sung hồ sơ đạo đức (IRB),
So that chỉ hồ sơ hợp lệ được đưa vào đánh giá.

**Acceptance Criteria:**

**Given** dossier đã nộp trong scope
**When** TB¹ hoặc CV³ completeness review
**Then** họ xem structured data, checklist, source context và attachment được phép
**And** capability phản ánh state hiện hành.

**Given** hồ sơ thiếu
**When** TB¹ hoặc CV³ tạo supplement request với reason, section/file và due date
**Then** dossier chuyển state atomically
**And** PI nhận notification tối thiểu, history và audit.

**Given** PI cập nhật và resubmit đúng state
**When** readiness đạt
**Then** version mới được khóa và route lại completeness review
**And** prior submitted/supplement versions vẫn truy vết được.

**Given** secretary, council member, TP, PP, BGĐ hoặc actor ngoài scope cố quyết định completeness
**When** request được gửi
**Then** backend từ chối nếu exact action không được cấp
**And** không để administrative role suy diễn thành quyền của TB/CV.

### Story 10.5: Phân công hội đồng và reviewer với eligibility/conflict [FR58, FR61]

As a người được cấu hình thành lập hội đồng và mời thành viên (mặc định TP¹/TB¹, D-035),
I want phân công người đánh giá đủ điều kiện cho hồ sơ,
So that đánh giá độc lập, đúng phạm vi và không có tự đánh giá.

**Acceptance Criteria:**

**Given** dossier/council ở state cho phép assignment
**When** actor có role được QT tích cho loại hội đồng đó chọn candidate từ mọi tài khoản có lý lịch khoa học (không bao giờ là QT)
**Then** preflight kiểm tra active account, active council membership/assignment,
source participation, organization rule và conflict
**And** trả allowed/blocked reason cùng context version.

**Given** candidate là PI, topic team member, `TOPIC_SECRETARY`, người rà soát/duyệt tờ trình hoặc người ký BGĐ có conflict trên source record, hoặc chính actor đang phân công
**When** assignment được xác nhận
**Then** backend từ chối `CONFLICT_DENIED`
**And** không tạo assignment dù candidate giữ system role khác.

**Given** candidate đủ điều kiện
**When** actor được cấu hình mời với exact evaluation duty, deadline và criteria
**Then** source council/ethics tạo lifecycle assignment ở trạng thái chờ chấp nhận; invitee chấp nhận hoặc từ chối kèm lý do
**And** notification/audit không công bố assignment cho participant audience.

**Given** candidate đã có chair, council secretary, council member hoặc
reviewer/council reviewer active trong cùng evaluation context
**When** cùng hoặc khác duty được đề xuất với interval chồng lấn
**Then** preflight và authoritative mutation từ chối stable backend reason theo
compatibility/multiplicity definition chuẩn
**And** role trên source record/council/round không liên quan không bị chặn.

**Given** preflight từng allowed hoặc nhiều assignment được gửi đồng thời
**When** context/roster thay đổi hoặc request tranh chấp cùng candidate/context
**Then** mutation recheck/serialize và chỉ tối đa một vị trí active được commit
**And** position change phải revoke/end assignment cũ trước khi tạo assignment mới.

**Given** assignment action được gọi qua delegation hoặc bởi secretary
**When** request được gửi
**Then** backend từ chối vì action non-delegable
**And** bulk, import, direct API hoặc administrative path phải đi qua cùng owning mutation.

### Story 10.6: Thành viên hội đồng hoặc reviewer nộp đánh giá được phân công [FR61]

As a thành viên hội đồng hoặc reviewer được phân công,
I want xem đúng hồ sơ và nộp đánh giá của mình,
So that tôi hoàn thành trách nhiệm mà không thấy đánh giá của người khác.

**Acceptance Criteria:**

**Given** assignment đang active và workflow state cho phép
**When** reviewer/member mở dossier
**Then** họ thấy source summary, attachment và criteria cần thiết theo duty
**And** không thấy hidden assignment, identity hoặc evaluation của người khác.

**Given** actor nhập score, comment và recommendation hợp lệ
**When** họ lưu nháp/submit
**Then** backend validate criteria và lưu own evaluation version
**And** submitted evaluation được khóa, history/audit đầy đủ.

**Given** assignment hết hạn/thu hồi, conflict phát sinh hoặc state đóng
**When** actor xem/sửa/submit
**Then** policy re-evaluate và chặn action
**And** capability cũ không còn hiệu lực.

**Given** PI/member/secretary/unrelated actor biết evaluation hoặc file ID
**When** họ gọi endpoint trước disclosure
**Then** backend từ chối/omit theo matrix
**And** không lộ identity, score, comment, attachment hoặc count.

### Story 10.7: Theo dõi, tổng hợp và trình kết quả hội đồng [FR62]

As a TP¹, TB¹ hoặc CV³ phụ trách hồ sơ,
I want theo dõi tiến độ và tổng hợp đánh giá hợp lệ,
So that kết luận hội đồng/IRB sẵn sàng được lập tờ trình và trình BGĐ ký.

**Acceptance Criteria:**

**Given** council/ethics record có các assignment trong scope
**When** TP¹/TB¹/CV³ mở progress
**Then** họ thấy status/deadline/completeness được phép của từng assignment
**And** counts dùng cùng authorization/disclosure policy.

**Given** đủ submitted evaluations
**When** TP¹/TB¹/CV³ tạo consolidation (thư ký IRB/hội đồng soạn dự thảo kết luận/biên bản, không chấm điểm)
**Then** summary có version và source evaluation references
**And** raw evaluation không bị chỉnh sửa hoặc mất truy vết.

**Given** kết luận IRB đã chốt
**When** TP¹/TB¹/CV³ lập tờ trình `IRB_CERTIFICATE`
**Then** submission đi qua luồng tờ trình (Story 5.9) tới GĐ hoặc PGĐ-KH ký
**And** không có đường route trực tiếp bỏ qua bước TB hoặc TP.

**Given** evaluation version thay đổi/thu hồi hoặc context mismatch
**When** consolidation được route
**Then** backend từ chối stale consolidation
**And** không chuyển hồ sơ sang approval state.

**Given** PI, participant hoặc secretary xem record
**When** final disclosure chưa xảy ra
**Then** chỉ generic workflow status được trả
**And** raw score/comment/identity/consolidation bị ẩn trên mọi surface.

### Story 10.8: Quyết định hội đồng hoặc hồ sơ đạo đức [FR63]

As a GĐ hoặc PGĐ-KH (người ký BGĐ),
I want ký thành lập hội đồng (đánh giá, nghiệm thu, IRB) và cấp giấy IRB theo workflow,
So that kết quả được ghi nhận hợp lệ và có thể công bố đúng mức.

**Acceptance Criteria:**

**Given** tờ trình của record đã qua TB và TP (`HEAD_REVIEW`) và actor là GĐ hoặc PGĐ-KH có scope hợp lệ
**When** họ mở hồ sơ ký
**Then** response có dossier/council version, allowed internal summary, file và decision capability
**And** context version bao phủ source record và consolidation.

**Given** actor là PI, participant, reviewer hoặc thành viên hội đồng trên chính record, secretary, có conflict, hoặc là TP/PP/TB/CV/PGĐ-TD/QT
**When** họ cố ký hoặc quyết định
**Then** conflict/non-delegable denial thắng mọi allow
**And** UI hiển thị action bị khóa với reason.

**Given** actor hợp lệ gửi decision
**When** state/context còn đúng
**Then** decision, record state, history và audit hoàn tất atomically
**And** không thể lặp decision hoặc dùng delegation.

**Given** final decision đã có
**When** participant audience xem kết quả
**Then** chỉ `PublishedReviewSummaryV1` hoặc approved ethics outcome được trả
**And** reviewer identity/raw score/comment/internal consolidation vẫn bị ẩn.

### Story 10.9: Contract tích hợp hội đồng và hồ sơ đạo đức [FR64]

As a người dùng được phép,
I want hội đồng/đạo đức xuất hiện đúng trong văn bản, nhắc việc, tìm kiếm và dashboard,
So that công việc liên phân hệ đầy đủ nhưng không rò rỉ assignment hoặc đánh giá.

**Acceptance Criteria:**

**Given** council/ethics source đã có lifecycle, authorized query và disclosure
**When** liên kết related document được thêm
**Then** actor phải có exact link action ở cả hai phía
**And** document metadata không mở rộng review/council disclosure.

**Given** assignment, supplement, meeting hoặc decision có deadline/action
**When** source query tạo operational item
**Then** item có stable source ID, exact target action, due date và context version
**And** conflict-blocked item dùng minimum blocked projection.

**Given** reminders, search, dashboard, report hoặc personal work tích hợp
**When** source được công bố contract-complete
**Then** conflict, lifecycle, review disclosure, file, failure, version và consumer fixtures đều pass
**And** consumer không đọc council/ethics tables trực tiếp.

**Given** source hoặc related-document association unresolved/stale/partial
**When** aggregate list/count được yêu cầu
**Then** toàn bộ enabled-source response fail closed
**And** không trả partial count, hidden assignment hoặc internal evaluation metadata.

## Epic 11: Thông báo, nhắc việc và khu “Của tôi”

Mỗi người dùng nhận được thông báo và nhắc việc đúng quyền, đồng thời có một
khu làm việc cá nhân hợp nhất cho hồ sơ tham gia và hành động đang chờ.

### Story 11.1: Thông báo trong ứng dụng theo sự kiện nghiệp vụ [FR41]

As a người dùng nội bộ,
I want nhận thông báo trong ứng dụng cho sự kiện liên quan đến mình,
So that tôi biết có phân công, yêu cầu bổ sung, quyết định hoặc thay đổi cần chú ý.

**Acceptance Criteria:**

**Given** source domain phát sự kiện assignment, supplement, state change, approval request hoặc deadline
**When** notification service xử lý event
**Then** event có stable source ID/version, intended audience, exact target action và idempotency key
**And** duplicate processing không tạo thông báo nghiệp vụ trùng.

**Given** tờ trình được submit, forward, approve hoặc return
**When** notification service xử lý event
**Then** người ở bước kế tiếp (TB, TP hoặc người ký BGĐ của loại thủ tục) hoặc tác giả (khi bị trả lại) nhận thông báo
**And** PP và PGĐ-TD không nhận thông báo yêu cầu hành động tờ trình.

**Given** recipient được xác định từ relationship/assignment
**When** thông báo được materialize hoặc đọc
**Then** service re-evaluate account, organization, relationship, state, conflict và disclosure hiện hành
**And** recipient đã mất quyền không nhận nội dung được bảo vệ.

**Given** event liên quan reviewer/council assignment hoặc internal review
**When** participant audience nhận notification khác trên cùng record
**Then** title/body/link không lộ reviewer identity, raw score/comment hoặc hidden assignment
**And** chỉ generic workflow status được dùng nếu matrix yêu cầu.

**Given** người dùng mở notification
**When** target record còn được phép
**Then** link dẫn đến detail/action đúng source
**And** target endpoint vẫn re-authorize thay vì coi notification là access grant.

### Story 11.2: Email cho sự kiện và kết quả quan trọng [FR42]

As a người dùng nội bộ,
I want nhận email cho các sự kiện quan trọng được cấu hình,
So that tôi không bỏ lỡ công việc khi chưa mở hệ thống.

**Acceptance Criteria:**

**Given** notification type được bật email và recipient hiện còn quyền
**When** email job thực thi
**Then** template/version được validate và nội dung tuân thủ disclosure của source
**And** audit/operational log không ghi secret hoặc review payload thô.

**Given** account bị vô hiệu hóa, relationship/grant hết hạn, conflict phát sinh hoặc source state đổi
**When** queued email chuẩn bị gửi
**Then** job re-authorize current context và hủy/điều chỉnh nội dung nếu không còn hợp lệ
**And** ghi canonical denial/cancellation reason.

**Given** job được retry
**When** cùng idempotency key đã gửi thành công
**Then** hệ thống không gửi email nghiệp vụ trùng
**And** trạng thái delivery vẫn truy vết được.

**Given** email chứa link về hồ sơ
**When** recipient bấm link sau khi quyền đã đổi
**Then** ứng dụng yêu cầu xác thực và re-authorize
**And** email token/link không mở file hoặc record trực tiếp.

### Story 11.3: Nhắc hạn và công việc tồn đọng an toàn [FR43]

As a người có công việc hoặc trách nhiệm đến hạn,
I want nhận nhắc việc đúng lúc,
So that tôi xử lý trước khi quá hạn.

**Acceptance Criteria:**

**Given** source proposal/project/task/activity/document/council/ethics contract-complete
**When** reminder scheduler truy vấn approaching/overdue/pending actions
**Then** mỗi source dùng authoritative time và authorized query contract
**And** item có target action, due date, source/context version và intended actor.

**Given** reminder job chạy theo lịch hoặc retry
**When** `AuthorizationJobEnvelopeV1` được thực thi
**Then** service-principal action và current on-behalf-of authority đều được kiểm tra khi áp dụng
**And** retry không tạo duplicate notification/email outcome.

**Given** actor không còn action do state, lifecycle, conflict hoặc delegation thay đổi
**When** reminder sắp được phát
**Then** side effect bị hủy và audit
**And** không nhắc người dùng về hành động họ không còn được phép thực hiện.

**Given** một enabled source unresolved/stale
**When** reminder batch cần tổng hợp nguồn đó
**Then** batch/partition liên quan fail closed và có cảnh báo vận hành
**And** không coi partial query là một batch hoàn chỉnh.

### Story 11.4: Tổng hợp backend cho khu “Của tôi” [FR44]

As a người dùng nội bộ,
I want một danh sách hợp nhất về hồ sơ và hành động của mình,
So that tôi không cần chuyển vai trò hoặc dò từng phân hệ.

**Acceptance Criteria:**

**Given** người dùng đã xác thực với mọi vai trò trừ QT (QT không có khu “Của tôi”)
**When** personal-work request bắt đầu
**Then** hệ thống tạo một request-wide `asOf` và gọi mọi enabled source contract
**And** mỗi source trả `PersonalWorkEntryV1` đã authorization/disclosure.

**Given** cùng record/action xuất hiện từ nhiều nguồn hoặc quan hệ
**When** aggregation hoàn tất
**Then** entry được de-duplicate theo domain + record + target action
**And** mọi viewer relationship của actor được giữ mà không chọn highest role.

**Given** một enabled source failure, stale, unresolved hoặc version không hỗ trợ
**When** aggregation chạy
**Then** toàn bộ response fail closed với canonical code
**And** không trả partial list, count hoặc cursor.

**Given** response cần phân trang
**When** entries đã được authorization/disclosure
**Then** sort/cursor tuân thủ `PersonalWorkEntryV1` và source versions
**And** version mismatch ở trang tiếp theo buộc tải lại từ trang đầu.

### Story 11.5: Giao diện “Của tôi” và mục bị chặn do xung đột [FR44]

As a người dùng có nhiều quan hệ nghiệp vụ,
I want xem hồ sơ tôi chủ trì, hồ sơ tôi tham gia và việc chờ tôi xử lý,
So that tôi hiểu trách nhiệm của mình trong một workspace duy nhất.

**Acceptance Criteria:**

**Given** personal-work response hợp lệ
**When** trang “Của tôi” hiển thị
**Then** có các nhóm hồ sơ chủ trì, hồ sơ tham gia và việc chờ xử lý với role labels, state, due date và contextual action
**And** trang luôn có trong navigation của mọi vai trò trừ QT (QT không có “Của tôi”), không có role switcher.

**Given** entry bị conflict hoặc denial nhưng actor được phép biết record
**When** UI hiển thị
**Then** entry vẫn hiện ở khu blocked/non-actionable với display label, domain, due date, route, target action và backend code/reason
**And** entry không nằm trong actionable count hoặc enabled queue.

**Given** entry/assignment bị ẩn theo disclosure
**When** list được dựng
**Then** reviewer identity, hidden assignment, score/comment, conflict source và participant identities bị cấm không xuất hiện
**And** blocked presentation chỉ dùng các field V1 được phép.

**Given** viewport mobile/tablet/desktop hoặc người dùng dùng bàn phím/screen reader
**When** tương tác với filter, tab và entry
**Then** layout không tràn trang, focus/labels/counts rõ và trạng thái không chỉ dựa màu
**And** loading/error/empty states phân biệt được whole-response failure với danh sách thực sự rỗng.

### Story 11.6: Hàng đợi công việc theo vai trò [FR78]

As a người dùng mọi vai trò trừ QT,
I want một hàng đợi đúng vai trò của mình,
So that tôi thấy ngay việc chờ tôi rà soát, duyệt, ký, xử lý hoặc chấm điểm.

**Acceptance Criteria:**

**Given** người dùng đăng nhập
**When** hàng đợi công việc được tải
**Then** TB thấy tờ trình chờ rà soát, TP thấy tờ trình chờ duyệt, CV thấy hồ sơ mình phụ trách, GĐ thấy quyết định đề tài/kinh phí và chữ ký, PGĐ-KH thấy chữ ký, reviewer thấy lời mời và đánh giá được giao
**And** QT không có hàng đợi công việc.

**Given** TP mở hàng đợi
**When** có hồ sơ chưa giao CV
**Then** nhóm "Chưa có người phụ trách" hiển thị trong phạm vi
**And** TP có thể giao CV từ đó.

**Given** PP hoặc PGĐ-TD mở hàng đợi
**When** dữ liệu được tải
**Then** chỉ có mục theo dõi, không có hành động duyệt, ký hay tờ trình
**And** PGĐ-TD không thấy kinh phí từng đề tài.

**Given** mục trong hàng đợi bị conflict hoặc state/scope đã đổi
**When** người dùng mở mục
**Then** source endpoint re-authorize và hiển thị blocked với lý do
**And** mục bị chặn không tính vào số đếm actionable.

## Epic 12: Dashboard, tìm kiếm, báo cáo và xuất dữ liệu

Người dùng có thể tìm kiếm, theo dõi chỉ số, đi đến hồ sơ nguồn và xuất báo cáo
trong đúng phạm vi được phép trên tất cả phân hệ đã hoàn thành.

### Story 12.1: Tìm kiếm và lọc xuyên phân hệ theo quyền [FR46]

As a người dùng nội bộ,
I want tìm hồ sơ theo mã, tên, đơn vị, trạng thái, người phụ trách và hạn,
So that tôi nhanh chóng đến đúng bản ghi trong phạm vi của mình.

**Acceptance Criteria:**

**Given** TP or TB filters proposals/projects by responsible CV or unassigned state ("Chưa có người phụ trách")
**When** search, counts or facets run
**Then** proposals include only their unit scope and projects follow the Academy-wide project view
**And** a CV cannot use these filters to discover other CVs' records; participation-only results grant no management actions.

**Given** actor tìm trong proposal, project, activity, council/ethics, document, task hoặc report sources
**When** query được gửi
**Then** mỗi enabled source dùng authorized query contract tại cùng request-wide `asOf`
**And** kết quả chỉ chứa source ID, label, state, role và route được disclosure.

**Given** actor dùng filter/sort theo unit, field, status, assignee, due date hoặc intake period
**When** kết quả được tính
**Then** total/facet/pagination chỉ dựa trên authorized rows
**And** không để lộ hidden assignment, reviewer identity hoặc record ngoài scope.

**Given** một enabled source unresolved/stale/failure
**When** cross-module search chạy
**Then** toàn bộ search response fail closed thay vì giả vờ là kết quả đầy đủ
**And** UI phân biệt lỗi nguồn với trạng thái không có kết quả.

**Given** query thông thường dưới phase 1 load
**When** performance được đo
**Then** ít nhất 95% interaction hoàn tất trong 2 giây
**And** mobile filter dùng drawer/bottom sheet, không tạo full-page horizontal scroll.

### Story 12.2: Dashboard điều hành theo vai trò và phạm vi [FR45]

As a người dùng có dashboard nghiệp vụ (mọi vai trò trừ QT),
I want xem các chỉ số và hàng chờ quan trọng của vai trò mình trong phạm vi,
So that tôi ưu tiên phê duyệt, chữ ký, tờ trình, đề tài chậm, task quá hạn và rủi ro.

**Acceptance Criteria:**

**Given** TP or TB opens the management dashboard
**When** workload, status and deadline widgets load
**Then** they see the current responsible CV and unassigned proposals/projects, filter/group by responsible CV and by nature (Quân sự / Dân sự / Chưa phân loại), and drill down within authorized scope
**And** CV management widgets include only their active officer assignments; participation/review work uses its separate access basis.

**Given** GĐ or PGĐ-KH opens the authority dashboard
**When** widgets load
**Then** GĐ sees topic/funding decision and signature queues and PGĐ-KH sees signature queues only
**And** QT has no business dashboard.

**Given** actor có dashboard action và organization scope
**When** dashboard được tải
**Then** widget lấy dữ liệu từ authorized source contracts cho approvals, delayed projects, overdue tasks, council/ethics queues, activity milestones, document gaps và reports
**And** không có widget nào đọc trực tiếp domain tables hoặc dùng global-role inference.

**Given** actor đồng thời tham gia một record gây conflict
**When** approval/action widget được tính
**Then** record không nằm trong actionable count
**And** nếu policy cho phép biết record, blocked presentation có canonical reason.

**Given** một source của composite widget thất bại
**When** widget được dựng
**Then** widget đó hiển thị unavailable và không trả partial count
**And** widget độc lập khác có thể hiển thị nếu không làm người dùng hiểu nhầm tổng hợp toàn hệ thống.

**Given** widget hiển thị vòng đời đề tài
**When** số liệu được nhóm
**Then** nhóm theo 9 bước và 2 giai đoạn của D-033 (bước suy ra từ Story 3.7)
**And** mỗi số đếm drill-down về hồ sơ nguồn trong cùng scope theo Story 12.3.

**Given** dashboard được đo trong normal phase 1 load
**When** core widgets tải
**Then** ít nhất 95% hoàn tất trong 3 giây
**And** layout responsive/accessibility giữ được priority, labels, focus và không phụ thuộc riêng màu.

### Story 12.3: Drill-down và đối chiếu chỉ số với hồ sơ nguồn [FR47]

As a người xem dashboard hoặc báo cáo,
I want mở đúng danh sách đã tạo nên một chỉ số,
So that tôi kiểm tra được số liệu và thực hiện hành động tại hồ sơ nguồn.

**Acceptance Criteria:**

**Given** một KPI/widget có count
**When** actor chọn drill-down
**Then** hệ thống mở danh sách với cùng filter, `asOf`/source versions và authorization semantics có thể áp dụng
**And** danh sách giải thích filter đang dùng.

**Given** source version thay đổi giữa dashboard và drill-down
**When** danh sách được tải
**Then** hệ thống refresh/recompute và thông báo số liệu đã cập nhật
**And** không duy trì count cũ như một snapshot hiện hành.

**Given** actor mất scope/relationship sau khi dashboard tải
**When** họ mở detail từ drill-down
**Then** source endpoint re-authorize và có thể từ chối
**And** dashboard URL hoặc route không phải access grant.

**Given** count và danh sách không khớp trong cùng source/version
**When** consistency check chạy
**Then** verification thất bại với source/correlation evidence
**And** story/integration không được coi là đạt acceptance.

### Story 12.4: Báo cáo tổng hợp theo phạm vi nghiệp vụ [FR49]

As a người dùng có quyền báo cáo (mọi vai trò trừ QT, trong phạm vi của mình),
I want xem báo cáo theo năm, đơn vị, cấp, lĩnh vực, tính chất, trạng thái, kỳ và phân hệ,
So that tôi đánh giá hoạt động nghiên cứu bằng số liệu có nguồn gốc.

**Acceptance Criteria:**

**Given** management workload reporting is requested
**When** TP or TB groups by responsible CV, unassigned state, workflow status or deadline
**Then** reports use the same authorized record set as list/dashboard
**And** CV reports do not include others' assignments through role alone; PGĐ-TD reports show aggregate funding only.

**Given** actor chọn report definition và filter
**When** report chạy
**Then** từng source query áp dụng current role/scope/relationship/state/conflict/disclosure
**And** summary chỉ tính authorized records và có report/source versions.

**Given** report theo vòng đời đề tài
**When** actor chọn chiều nhóm
**Then** dùng 9 bước và tên 2 giai đoạn của D-033 làm chiều nhóm
**And** không tự gộp, tách hay đổi thứ tự bước.

**Given** report chứa proposal review, council/ethics hoặc personnel data
**When** actor không thuộc internal audience phù hợp
**Then** identity/raw score/comment/hidden assignment bị loại
**And** aggregate nhỏ có nguy cơ suy ra dữ liệu nhạy cảm được ẩn theo policy.

**Given** một required source thất bại hoặc stale
**When** composite report được tính
**Then** report fail closed và không hiển thị partial totals như hoàn chỉnh
**And** UI nêu nguồn/khối dữ liệu chưa khả dụng ở mức không tiết lộ protected metadata.

**Given** actor mở report trên desktop/mobile
**When** bảng/biểu đồ hiển thị
**Then** có text summary, accessible labels và data alternative
**And** chart color không phải phương tiện duy nhất để phân biệt trạng thái.

### Story 12.5: Xuất Excel/PDF có kiểm soát và truy vết [FR48]

As a người dùng được phép xuất dữ liệu,
I want tạo và tải Excel/PDF từ danh sách hoặc báo cáo,
So that tôi sử dụng số liệu ngoài hệ thống mà vẫn đúng phạm vi và có truy vết.

**Acceptance Criteria:**

**Given** management assignment or scope changes after an export request
**When** export is generated or downloaded
**Then** current source authorization is rechecked, including responsible-CV filters, unassigned scope, disclosure and PGĐ-TD aggregate-only funding
**And** stale responsibility does not preserve export access or leak records through totals/history.

**Given** actor có exact export action và filter/report hợp lệ
**When** họ yêu cầu export
**Then** hệ thống tạo `AuthorizationJobEnvelopeV1` với source/context versions và idempotency key
**And** trả queued/progress state mà không chặn request tương tác.

**Given** export job bắt đầu hoặc tiếp tục
**When** current account/scope/relationship/state/disclosure khác context ban đầu
**Then** job re-authorize current authority, hủy hoặc tạo lại snapshot theo policy
**And** không xuất row/column/file metadata không còn được phép.

**Given** export hoàn tất
**When** actor tải file
**Then** download endpoint re-authorize, file có thời hạn và audit actor/filter/report/version
**And** object storage URL không trở thành public authorization token.

**Given** cùng request/job được retry
**When** idempotency key đã có outcome
**Then** hệ thống không tạo duplicate business export ngoài quy tắc
**And** trạng thái success/failure/cancel cùng correlation ID có thể truy vết.


### Story 12.6: Dashboard theo dõi cho PP và PGĐ-TD [FR45, FR74]

As a PP hoặc PGĐ-TD,
I want dashboard theo dõi tiến độ và số lượng trong phạm vi,
So that tôi giám sát được hoạt động nghiên cứu mà không có quyền duyệt, ký hay xem kinh phí vượt phạm vi.

**Acceptance Criteria:**

**Given** PP mở dashboard
**When** widget tải
**Then** PP thấy tiến độ và số lượng đề xuất/đề tài trong unit scope, lọc theo năm, đơn vị, cấp, lĩnh vực và tính chất
**And** kinh phí từng đề tài chỉ hiện cho đề tài PP là PI/thành viên.

**Given** PGĐ-TD mở dashboard, báo cáo hoặc xuất Excel
**When** dữ liệu được tính
**Then** chỉ có số liệu tổng hợp, kể cả kinh phí tổng hợp
**And** cột kinh phí từng đề tài/đề xuất để trống trên dashboard, drill-down và export.

**Given** PP hoặc PGĐ-TD
**When** họ cố duyệt, ký, trình tờ trình hoặc sửa dữ liệu từ dashboard
**Then** không có action nào được cấp
**And** backend từ chối nếu gọi API trực tiếp.

**Given** count trên dashboard và danh sách drill-down
**When** cùng filter và source version
**Then** số liệu khớp và dùng cùng authorization
**And** breakdown theo CV phụ trách có nhóm "chưa giao".

## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](../docs/contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- QT `SYSTEM_ADMIN` (platform scope) and TP¹/CV¹ (`RESEARCH_MANAGEMENT_HEAD` /
  `RESEARCH_MANAGEMENT_STAFF`, unit scope) manage internal/external profiles
  independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when the profile manager (QT, TP or CV) checks `Tạo tài khoản truy cập hệ thống`.
- Every role except QT has a scientific CV and self-updates it through My Profile.
- A duplicate-profile warning (raised by QT, TP¹ or CV¹) is notified to TB¹ and TP¹,
  who decide the merge; history is kept (Story 2.7).
- Activation uses hashed single-use tokens, expires exactly after 48 hours and
  sends only a setup-password link. No temporary password is generated, emailed,
  persisted, returned to the profile manager or placed in audit.
- Login accepts either configured username or account email. Username is optional
  at provisioning, unique when set later by the linked researcher in My Profile,
  and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.

## Epic 13: Lý lịch khoa học (BM-06)

> Role names and decision rights in the done and in-flight stories of this epic predate the 10-role model; see `docs/permission-matrix.md`. Epic 13 is done; Story 13.10 already covers own CV for managers.

Mở rộng Epic 2. Nguồn: [SPEC](specs/spec-scientific-cv/SPEC.md) và
[hợp đồng dữ liệu](specs/spec-scientific-cv/cv-data-contract.md). Tham chiếu hành vi:
`/Users/Super/DocManS-review` (không port nguyên trạng các lỗi đã ghi trong hợp đồng).
Thứ tự thực hiện: 13.1 → 13.2 → 13.3 / 13.4 → 13.5 → 13.6 → 13.7.

### Story 13.1: Hợp đồng dữ liệu lý lịch khoa học, lưu trữ và API [FR70]

As a nhà khoa học,
I want hệ thống lưu lý lịch khoa học có kiểm tra hợp lệ và bảo vệ dữ liệu nhạy cảm,
So that thông tin của tôi đúng chuẩn BM-06 và không bị lộ hoặc ghi đè nhầm.

**Acceptance Criteria:**

**Given** migration mới được áp dụng
**When** hồ sơ chưa có lý lịch được đọc
**Then** `curriculumVitae` là rỗng hợp lệ (`cvSchemaVersion: 1`) và các migration cũ không bị sửa.

**Given** chủ hồ sơ ACTIVE gửi `PATCH /api/v1/researcher-profiles/my-profile` kèm `curriculumVitae`
**When** payload khớp hợp đồng
**Then** hệ thống lưu, tăng `aggregateVersion`, và trả hồ sơ cập nhật.

**Given** payload có khóa lạ, kiểu sai, năm ngoài khoảng, vượt giới hạn dòng/độ dài hoặc thiếu trường bắt buộc của dòng
**When** gửi lên
**Then** API trả 400 với lỗi theo trường và không lưu gì.

**Given** `contextVersion` đã cũ
**When** gửi cập nhật
**Then** API trả 409 `CONTEXT_VERSION_MISMATCH`.

**Given** người quản lý có exact org scope
**When** đọc/sửa lý lịch qua `/:id`
**Then** được phép theo action mới; vai trò lãnh đạo/giám sát, quản lý ngoài scope và SYSTEM_ADMIN ngoài scope bị từ chối.

**Given** danh sách, tìm kiếm, ứng viên reviewer/hội đồng hoặc thông báo
**When** trả hồ sơ
**Then** không chứa trường nhạy cảm (tài khoản ngân hàng, số định danh, SmartCA, đồng ý chia sẻ, ảnh) và không ảnh hưởng eligibility.

**Given** lý lịch được cập nhật
**When** ghi audit và history
**Then** facts chỉ ghi `{section, field, changed}` cho trường nhạy cảm, không ghi giá trị thô; ghi audit lỗi thì rollback thay đổi.

**Given** action mới
**When** đăng ký
**Then** có đồng thời trong `researcher-profile-access.ts`, `packages/permissions` (ts+js) và `docs/contracts/researcher-profile-access.md`.

### Story 13.2: Khung Lý lịch khoa học và tab Thông tin chung [FR70]

As a nhà khoa học,
I want điền thông tin chung của lý lịch trong một biểu mẫu có 5 tab,
So that tôi cập nhật lý lịch ngay trong Hồ sơ của tôi.

**Acceptance Criteria:**

**Given** tôi mở `/my-profile`
**When** trang tải
**Then** thấy tiêu đề "Lý lịch khoa học của tôi", 5 tab (Thông tin chung; Quá trình đào tạo; Quá trình công tác & Kinh nghiệm chuyên môn; Kinh nghiệm & Thành tích nghiên cứu; Xem & In) với số dòng, nút "Xem & In", một nút "Lưu lý lịch khoa học", và khối "Lịch sử thay đổi hồ sơ".

**Given** tab Thông tin chung
**When** hiển thị
**Then** có đủ mục A (loại nhà khoa học, ảnh 3x4 qua URL), B (thông tin cơ bản & công tác), C (học hàm, học vị, lĩnh vực, từ khóa), D (ngoại ngữ thêm/xóa dòng), E (ngân hàng, SmartCA, đồng ý chia sẻ, ghi chú).

**Given** thiếu họ tên, giới tính, số định danh, email, đơn vị hoặc lĩnh vực chính
**When** lưu
**Then** chặn lưu và hiện lỗi cạnh trường; lỗi 400/409 từ API hiển thị đúng trường hoặc yêu cầu tải lại.

**Given** tài khoản đã liên kết
**When** xem loại nhà khoa học
**Then** trường bị khóa theo quy tắc hiện có; người không có quyền sửa thấy chế độ chỉ đọc.

**Given** các breakpoint bắt buộc
**When** hiển thị
**Then** không cuộn ngang toàn trang, có focus rõ và nhãn trường.

### Story 13.3: Quá trình đào tạo và quá trình công tác [FR70]

As a nhà khoa học,
I want khai báo quá trình đào tạo và công tác dạng bảng,
So that lý lịch phản ánh đầy đủ lộ trình học tập và làm việc.

**Acceptance Criteria:**

**Given** tab Quá trình đào tạo
**When** thêm/sửa/xóa dòng (bậc, ngành, cơ sở, năm tốt nghiệp, hình thức, đề tài)
**Then** thứ tự và nội dung được lưu và tải lại đúng; thiếu bậc/ngành/cơ sở bị từ chối ở client và server.

**Given** tab Quá trình công tác
**When** nhập tóm tắt và các dòng (thời gian, cơ quan, chức vụ, lĩnh vực)
**Then** lưu dạng `workHistory.{summary,items}`; thiếu thời gian/cơ quan bị từ chối; dạng mảng cũ của prototype bị từ chối.

**Given** số dòng thay đổi
**When** thêm hoặc xóa
**Then** huy hiệu đếm trên tab cập nhật.

### Story 13.4: Kinh nghiệm và thành tích nghiên cứu [FR70]

As a nhà khoa học,
I want khai báo công bố, sở hữu trí tuệ, giải thưởng và đề tài,
So that lý lịch thể hiện thành tích nghiên cứu mà không nhập trùng dữ liệu.

**Acceptance Criteria:**

**Given** câu hỏi mở về tái sử dụng bảng `publications`/`participations`
**When** bắt đầu story
**Then** quyết định được ghi vào file story trước khi code (spec checkpoint) và mỗi dữ liệu chỉ có một nơi lưu.

**Given** 4 bảng (công bố, sở hữu trí tuệ, giải thưởng, đề tài)
**When** thêm/sửa/xóa dòng
**Then** dữ liệu lưu, tải lại đúng; trường bắt buộc (tiêu đề công bố/SHTT, tên giải, tên đề tài và vai trò) được kiểm tra ở server.

**Given** dữ liệu công bố/tham gia đã có từ Story 2.1/profile completion
**When** mở tab
**Then** hiển thị không trùng lặp và không làm hỏng lịch sử tham gia nguồn có thẩm quyền (Story 2.3).

### Story 13.5: Xem và in lý lịch khoa học BM-06 (VI/EN) [FR70]

As a nhà khoa học hoặc người quản lý có thẩm quyền,
I want xem và in lý lịch theo mẫu BM-06 tiếng Việt và tiếng Anh,
So that tôi có bản chuẩn khổ A4 để nộp.

**Acceptance Criteria:**

**Given** lý lịch đã lưu
**When** mở tab Xem & In
**Then** bản xem dựng từ dữ liệu đã lưu (không phải bản đang sửa), có dấu "MẪU BM-06", ảnh 3x4 và đủ mục thông tin, đào tạo, công tác, nghiên cứu; không in CCCD, ngày/nơi cấp, ngân hàng, SmartCA (quyết định 2026-10-12, xem `specs/spec-scientific-cv/quyet-dinh-va-kiem-thu.md`).

**Given** chuyển VI/EN
**When** bấm nút
**Then** nhãn và tiêu đề đổi ngôn ngữ, dữ liệu giữ nguyên; thiếu dữ liệu hiển thị trống nhất quán.

**Given** bấm in
**When** `window.print()`
**Then** stylesheet in chỉ in giấy A4, ẩn điều hướng và nút.

**Given** người xem không có quyền với hồ sơ
**When** gọi trực tiếp
**Then** không nhận dữ liệu lý lịch.

### Story 13.6: Lịch sử thay đổi lý lịch khoa học [FR70]

As a nhà khoa học hoặc người quản lý có thẩm quyền,
I want xem ai đã đổi phần nào của lý lịch,
So that thay đổi có thể được truy vết mà không lộ dữ liệu nhạy cảm.

**Acceptance Criteria:**

**Given** lý lịch được sửa
**When** mở "Xem lịch sử thay đổi"
**Then** mỗi mục nêu thời điểm, người sửa, loại tác động và danh sách phần/trường đã đổi (đào tạo, công tác, nghiên cứu, thông tin chung).

**Given** trường nhạy cảm đổi
**When** hiển thị lịch sử
**Then** chỉ hiện "đã thay đổi", không hiện giá trị cũ/mới.

**Given** chủ hồ sơ và quản lý trong scope
**When** xem lịch sử
**Then** chủ hồ sơ chỉ thấy các hành động cá nhân; người ngoài phạm vi bị từ chối.

### Story 13.7: Seed lý lịch demo và bỏ dữ liệu giả khi khởi tạo hồ sơ [FR70]

As a nhà phát triển và người kiểm thử,
I want dữ liệu demo đúng hợp đồng và không có dữ liệu cá nhân bịa đặt,
So that các tab hiển thị đầy đủ khi demo và tài khoản thật không bị ghi dữ liệu giả.

**Acceptance Criteria:**

**Given** seed chạy
**When** mở `/my-profile` bằng tài khoản demo (TS. Phạm Anh Tuấn)
**Then** cả 5 tab có dữ liệu và dữ liệu qua được kiểm tra hợp đồng.

**Given** tài khoản nghiên cứu viên chưa có hồ sơ
**When** truy cập `/my-profile` lần đầu
**Then** hồ sơ nếu được tạo chỉ chứa dữ liệu đã biết từ tài khoản, không có số điện thoại, ngày sinh, số định danh hay chức danh bịa.
