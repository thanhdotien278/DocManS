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
workflowType: "prd"
documentCounts:
  productBriefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 2
outputFile: "/Users/Super/DocManS/_bmad-output/prd.md"
created: "2026-04-27T22:31:49+0700"
updated: "2026-06-16T00:00:00+0700"
releaseMode: "single-release"
classification:
  projectType: "web_app"
  domain: "edtech + scientific administration"
  complexity: "high"
  projectContext: "greenfield"
---

# Product Requirements Document - DocManSystem

**Author:** ThanhDaika
**Date:** 2026-04-27

## Executive Summary

DocManSystem, also referred to as RTMS, is a greenfield internal web application for the Military Medical Academy to manage the full lifecycle of university-level research topics and scientific project workflows. The product replaces fragmented handling through spreadsheets, email, disconnected files, and manual coordination with a single role-aware system that supports proposal intake, evaluation, approval, approved-project tracking, task execution, notifications, reminders, and executive reporting. The core business goal is not superficial digitization; it is to make workflow state, accountability, deadlines, and decision bottlenecks visible and controllable across the academy’s scientific management process.

Phase 1 targets six major user roles: system administrator, scientific management staff, leadership or approval authority, principal investigator, project member, and reviewer or committee member. The product must preserve complex internal workflows rather than flatten them. It must support controlled state transitions, organization-scoped data access, role-based and state-based permissions, mandatory audit logging for critical actions, file traceability, and dashboard views filtered by the current user’s authority. The first release scope must cover the seven work items listed in `detaiHVQY.md` section 2.1 through 2.7: OMS proposal management, approved-project tracking, seminar and student research tracking, task management, executive dashboard, related-document management, and council/ethics management.

This PRD assumes a modular-monolith phase 1 architecture and a strict implementation boundary: no microservices, no external identity integration in phase 1, no workflow engine, no deep financial subsystem, and no public submission portal. The expected operational outcome is a measurable reduction in incomplete proposal records, a strong increase in overdue visibility, faster reporting preparation, and a more auditable and disciplined research administration process.

### What Makes This Special

RTMS is differentiated by deep fit with institutional research administration rather than generic project management. Its value comes from encoding the actual business workflow of academic research topic intake, multi-role evaluation, approval, progress monitoring, adjustment handling, acceptance, and reporting in a way that exposes current state, next action, responsible actor, and audit history. Users should experience the system as an operational control surface for research management, not just a repository of forms and files.

The core insight is that the academy’s main pain is not lack of data entry tools but lack of controlled workflow visibility and decision support. RTMS therefore treats authorization, state machines, reminders, dashboards, and audit logs as first-class product requirements, not secondary technical concerns. This makes the product materially better than ad hoc combinations of office tools or generic admin dashboards that cannot enforce business rules or expose accountability clearly.

## Project Classification

- **Project Type:** Internal web application
- **Domain:** Education-adjacent scientific research administration
- **Complexity:** High, due to multi-role workflows, approval states, scoped authorization, traceable files, notifications, and executive reporting
- **Project Context:** Greenfield

## Success Criteria

### User Success

- Scientific management staff can open an intake period, receive proposals, check completeness, request supplements, assign reviewers, summarize evaluation outcomes, and route proposals to approval without relying on external spreadsheets or ad hoc trackers.
- Leadership can immediately see waiting approvals, overdue work, delayed projects, and unit-level summary metrics from role-scoped dashboard views.
- Principal investigators can submit proposals, understand current status, respond to supplement requests, track approved project milestones, and submit periodic reports without needing manual email follow-up to know what happens next.
- Reviewers and committee members can access only assigned proposals, submit scores and review comments, and complete evaluation work within a controlled and traceable workflow.
- Scientific management staff can manage approved seminars, student research activities, related governing documents, council plans, and ethics dossiers without keeping parallel spreadsheets outside the system.
- Scientific management staff can maintain researcher profiles and reuse them across proposals, projects, seminars, councils, reviews, and reports instead of repeatedly entering scientist information.
- Users experience clear confirmation, error handling, and next-step guidance on important actions such as submit, approve, reject, request supplement, upload files, and update progress.

### Business Success

- Reduce proposal returns caused by missing required documents or incorrect submission packages, with the improvement target to be baselined during pilot/UAT because no reliable pre-system baseline is currently available.
- Ensure 100 percent visibility of waiting approvals, overdue tasks, overdue reports, and delayed projects in role-appropriate dashboard views.
- Improve scientific management staff reporting preparation time for routine executive summaries, with the target to be baselined during pilot/UAT.
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
- Role-based dashboard and reporting for scientific management staff and leadership, including waiting items, risk indicators, delayed work, and summary metrics by unit, field, status, and reporting cycle.
- Related-document management for governing, legal, planning, proposal, project, seminar, and council documents with metadata, version context, effective status, and permission-checked access.
- Council and ethics management, including council plans, member roles, ethics dossier submission, completeness review, scoring, consolidation, and approval routing.
- Researcher profile management, including scientist identity, academic information, unit, expertise, account linkage, participation links, search, history, and auditability.
- Role-based and scope-based authorization, audit logs, file management, in-app notifications, email notifications for important events, and export capabilities for core Excel/PDF reporting needs.

### Growth Features (Post-MVP)

- Richer analytics and longitudinal performance reporting across units, research areas, and academic periods.
- More advanced administrative configurability for templates, scoring criteria, notification rules, and reporting packs.
- Broader participation support for project members beyond the minimal phase 1 responsibilities.
- Improved convenience features such as richer previews, bulk operations, and more refined reviewer workload balancing.

### Vision (Future)

- Institution-wide research operations platform extending beyond the first managing unit.
- Deeper integration with identity, digital approval, and additional internal systems when later approved.
- Proactive risk detection and more advanced decision-support capabilities for research governance.

## User Journeys

### Journey 1: Scientific Management Staff Runs A Proposal Intake Cycle

Lan is a scientific management staff member preparing a new intake period for school-level research proposals. Today she coordinates the process through spreadsheets, email threads, and paper-based follow-up, which makes it hard to know which proposals are complete, who still owes feedback, and which approvals are stuck.

In RTMS, she creates an intake period, configures required documents, opens the submission window, and monitors incoming proposals from a single operational view. As submissions arrive, she checks completeness, requests supplements where needed, assigns reviewers by field, monitors review progress, records summary outcomes, and routes qualified proposals to approval. The climax of her journey is not proposal creation; it is operational control. She can see which records are waiting, which are overdue, and which actor owns the next step.

If something goes wrong, such as an incomplete resubmission or a late reviewer, Lan needs visible recovery tools: supplement history, due-date reminders, review status tracking, and clear escalation paths. The journey succeeds when she can run the whole intake cycle without maintaining shadow trackers outside the system.

### Journey 2: Principal Investigator Submits A Proposal And Recovers From A Supplement Request

Dr. Minh is a principal investigator submitting a new research proposal. His current pain is not only document preparation but uncertainty after submission. He often does not know whether the package is complete, what has been reviewed, or how to respond when changes are requested.

In RTMS, he creates a draft proposal, fills structured sections, uploads required files, saves progress, and submits formally. After submission, he receives a supplement request with a clear explanation of missing or incorrect content, a due date, and traceable status history. He revises the proposal, uploads updated files, and resubmits without losing prior context.

The turning point is that the system makes the workflow legible. Instead of asking staff for updates, he can see current status, required next action, and key dates. The journey succeeds when proposal submission and correction are controlled, transparent, and bounded by clear validation and status rules.

### Journey 3: Reviewer Or Committee Member Completes An Evaluation

Dr. Hoa is assigned as a reviewer for proposals relevant to her expertise. In the current process, assignments and materials may arrive through scattered channels, and review progress is hard to track centrally.

In RTMS, she receives an assignment notification, accesses only the proposals assigned to her, reviews the submission package, enters scores and review comments against defined criteria, and completes her evaluation within a controlled deadline. She must be able to distinguish draft evaluation work from submitted evaluation results and must not see unrelated proposals or reviews beyond her authorization scope.

The journey succeeds when review work is confidential, scoped, timely, and traceable, and when scientific management staff can immediately see completion status without manual chasing.

### Journey 4: Leadership Reviews Pending Decisions And Uses The Dashboard To Act

Colonel An is a leadership user who does not need operational detail first; he needs an accurate picture of what requires approval or intervention. In the current process, this view comes late and often only after manual summary preparation.

In RTMS, he opens a role-based dashboard and immediately sees pending approvals, overdue tasks, delayed projects, upcoming reports, and summary indicators by unit or field. From those signals, he can drill into filtered lists, inspect the relevant proposal or project history, review supporting documents, and approve, reject, or request follow-up according to authority.

The critical moment is when dashboard information supports action instead of decoration. The journey succeeds when leadership can move directly from signal to decision with confidence that the underlying data reflects current authorization scope and real workflow state.

### Journey 5: System Administrator Investigates Access, Audit, And Configuration Issues

Huy is a system administrator responsible for accounts, roles, shared catalogs, and operational traceability. He is not the main business operator, but he is essential when access rules fail, a record appears inconsistent, or a team needs new configuration.

In RTMS, he manages user accounts, role assignments, organizational mappings, shared catalogs, notification settings, and system parameters. When an incident occurs, such as a user reporting missing access or a dispute over who approved a record, he uses audit logs and system history to investigate safely without altering business content improperly.

This journey succeeds when administration is controlled, traceable, and separated from business authority, allowing support and investigation without weakening security or accountability.

### Journey 6: Scientific Management Staff Tracks Seminars, Student Research, Documents, And Councils

Mai is a scientific management staff member responsible for records that are adjacent to proposal and project management: approved seminars, student research activities, related legal or governing documents, council plans, and ethics dossiers. In the current process, these records may be tracked separately from proposals and projects, which weakens reporting and makes it difficult to know which plan, decision, document, or council action is current.

In RTMS, she creates or imports approved seminar and student research records, maintains plans and related documents, records adjustments, tracks budget metadata and products, registers official documents with effective status, links documents to the relevant business records, prepares council plans, receives ethics dossiers, assigns council reviewers, consolidates scores, and routes decisions for approval. The journey succeeds when these adjacent research administration records are traceable, permission-controlled, and visible in the same operational reporting surface as proposals, projects, and tasks.

### Journey Requirements Summary

These journeys require the system to support:

- structured proposal intake periods, submission flows, supplement cycles, reviewer assignment, scoring, approval routing, and history visibility
- role-aware dashboards that lead to filtered operational lists and decision screens
- scoped access to proposals, projects, reviews, tasks, files, and reports based on role, organization, assignment, and state
- notifications and reminders for assignments, supplement requests, approvals, due dates, overdue items, and reporting milestones
- auditable file upload, replacement, viewing, and download flows linked to business records
- seminar, student research, related-document, council, and ethics-dossier records aligned with the same authorization, history, notification, and reporting rules
- configuration and support capabilities for administrators without collapsing business authorization boundaries

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

- scientific management staff runs intake, review coordination, approval routing, project follow-up, and reporting
- scientific management staff manages seminars, student research activities, related documents, council plans, and ethics dossiers
- scientific management staff maintains researcher profiles and links scientists to business records
- principal investigator submits and maintains proposals and approved-project progress records
- reviewer or committee member evaluates assigned proposals and contributes to controlled review workflows
- leadership monitors dashboard signals and acts on approvals, delays, risks, and reports
- system administrator manages accounts, roles, catalogs, and traceability support

**Must-Have Capabilities:**

- proposal intake periods, proposal draft/save/submit, completeness checks, supplement requests, resubmission, evaluation assignment, scoring, approval, rejection, and workflow history
- approved-project records, milestones, progress reports, delay tracking, adjustment requests, extensions, acceptance, and final review
- seminar and student research records, plans, documents, adjustments, budget metadata, products, and status tracking
- task creation, assignment, prioritization, due dates, reminders, status updates, overdue indicators, and linkage to proposals or projects
- role-based dashboards, filtered work queues, operational alerts, and reporting/export for key administrative and leadership use cases
- related-document registry with document type, issuing authority, effective status, version context, and links to proposals, projects, seminars, councils, and tasks
- council and ethics workflows covering council planning, member assignment, ethics dossier submission, completeness checks, scoring, consolidation, and approval routing
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
- FR2: System administrators can assign one or more roles to a user.
- FR3: System administrators can associate users with an organizational unit and other scope-defining organizational attributes.
- FR4: The system can authenticate users and establish a role-aware session for authorized access.
- FR4a: Authenticated users can change their own password, and authorized administrators can initiate a controlled password reset flow for internal users.
- FR5: The system can enforce role-based access rules across all protected capabilities.
- FR6: The system can enforce organization-scope or unit-scope access rules across proposals, projects, seminars, student research activities, councils, ethics dossiers, related documents, tasks, files, dashboards, and reports.
- FR6a: The system can distinguish account-level system roles from record-scoped participation or assignment roles, including principal investigator, project member, scientific secretary, reviewer, council member, and ethics reviewer, so those roles only grant permissions within the specific proposal, project, council, review, ethics dossier, task, or related record context.

### Shared Catalogs And Configuration

- FR7: System administrators can manage shared catalogs required by business workflows, including organizational units, research fields, proposal types, statuses, priorities, report types, product types, forms, checklists, and scoring criteria.
- FR8: System administrators can configure system parameters, notification templates, and selected workflow-supporting settings required for phase 1 operations.

### Research Proposal Intake And Submission

- FR9: Scientific management staff can create and manage proposal intake periods with dates, applicability rules, and required submission packages.
- FR10: Principal investigators can create a proposal draft, save progress, and submit a proposal formally within an applicable intake period.
- FR11: Principal investigators can enter structured proposal information including title, field, host unit, participants, timeline, objectives, content summary, and proposed budget metadata.
- FR12: Principal investigators can upload required proposal attachments and supporting documents to a proposal record.
- FR13: The system can validate required proposal data and required file conditions before formal submission.
- FR14: The system can record proposal submission history, including timestamps and submission state changes.

### Proposal Review, Supplement, And Approval Workflow

- FR15: Scientific management staff can review proposal completeness and request supplements with a stated reason and due date.
- FR16: Principal investigators can view supplement requests, revise proposal content or attachments, and resubmit the proposal.
- FR17: Scientific management staff can assign reviewers or committee participants to proposals according to the workflow.
- FR18: Reviewers and committee members can access assigned proposals and submit scores, comments, and recommendations.
- FR19: Scientific management staff can monitor review progress and consolidate evaluation outcomes.
- FR20: Leadership or approval authority can review proposal history, evaluation outputs, and supporting files before making an approval decision.
- FR21: Leadership or approval authority can approve, reject, or otherwise disposition a proposal according to workflow rules.
- FR22: The system can treat proposal statuses as controlled states and restrict actions based on current proposal state.

### Approved Project Tracking

- FR23: The system can create an approved-project record from an approved proposal while preserving relevant source data.
- FR24: Scientific management staff and authorized project participants can define and maintain project milestones and planned reporting checkpoints.
- FR25: Principal investigators can submit periodic progress reports and supporting evidence for approved projects.
- FR26: Scientific management staff can review project progress reports, request follow-up where needed, and track unresolved issues.
- FR27: Principal investigators can submit adjustment or extension requests for approved projects.
- FR28: Leadership or authorized staff can review and decide on adjustment, extension, acceptance, and final-review actions according to workflow rules.
- FR29: The system can identify delayed projects, upcoming deadlines, and projects waiting for administrative action.
- FR30: The system can treat approved-project workflow states as controlled states and restrict actions based on current project state.
- FR30a: Project members can view approved projects they participate in, including assigned responsibilities, relevant milestones, and permitted supporting files.
- FR30b: Project members can upload permitted contribution files or evidence within the scope granted to them for an approved project.

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

### Notifications, Reminders, And Work Queues

- FR41: The system can create in-app notifications for important business events such as assignment, supplement request, approval request, state change, and deadline-related events.
- FR42: The system can send email notifications for important business events and reminders defined in phase 1 scope.
- FR43: The system can generate reminders for approaching deadlines, overdue reports, overdue tasks, and pending workflow actions.
- FR44: The system can present user-specific work queues showing items waiting for the current user’s attention.

### Dashboard, Search, And Reporting

- FR45: Leadership and scientific management staff can access role-based dashboards showing waiting approvals, delayed projects, overdue tasks, council or ethics queues, seminar or student research milestones, document status gaps, upcoming reports, and summary indicators within authorized scope.
- FR46: Users can search and filter proposals, projects, seminar records, student research records, council records, document records, tasks, and reports by relevant business attributes such as code, title, unit, field, status, assignee, due date, and intake period.
- FR47: The system can provide traceable detail views that connect dashboard indicators and list results to the underlying workflow records.
- FR48: Authorized users can export designated lists and reports to Excel or PDF according to business needs and permission rules.
- FR49: The system can produce role-scoped reporting views and summary outputs by unit, field, status, reporting period, module type, and related administrative dimensions.

### Seminar And Student Research Tracking

- FR50: Scientific management staff can create or import approved seminar and student research records with responsible unit, participants, schedule, scope, and source decision metadata.
- FR51: Scientific management staff can maintain plans, related documents, milestones, and administrative notes for approved seminars and student research activities.
- FR52: Authorized users can record adjustment requests, budget metadata, products, and outcomes for seminars and student research activities.
- FR53: The system can treat seminar and student research statuses as controlled states, expose role-scoped lists, and preserve history for important changes.

### Related Document Management

- FR54: Authorized users can register governing, legal, planning, proposal, project, seminar, council, and other related documents with document type, issuing authority, code, date, effective status, and metadata.
- FR55: Authorized users can link related documents to proposals, approved projects, seminars, student research activities, councils, ethics dossiers, tasks, and reports.
- FR56: The system can preserve version or replacement history for important related documents and distinguish current, expired, superseded, and archived document states.
- FR57: The system can provide role-scoped search, filtering, and retrieval of related documents without exposing file metadata or document content outside authorized scope.

### Council And Ethics Management

- FR58: Scientific management staff can create and manage council plans with purpose, schedule, member roles, related legal documents, and linked business records.
- FR59: Principal investigators or authorized staff can create, complete, and submit ethics dossiers with required structured data and attachments.
- FR60: Scientific management staff can review ethics dossier completeness, request supplements, and track resubmissions.
- FR61: Council members or assigned reviewers can access assigned ethics dossiers or council records and submit scores, comments, and recommendations.
- FR62: Scientific management staff can monitor council review progress, consolidate evaluation outcomes, and route records for approval.
- FR63: Leadership or approval authority can approve, reject, or otherwise decide council or ethics records according to workflow rules.
- FR64: The system can treat council and ethics workflow statuses as controlled states with role-scoped dashboards, reports, history, notifications, and audit logs.

### Researcher Profile Management

- FR65: Authorized users can create and maintain researcher profiles with identity, academic rank or degree, title, contact details, organization, research fields, expertise keywords, and active status.
- FR66: Authorized users can link researcher profiles to user accounts where applicable while still allowing profile records for researchers who do not yet have system login accounts.
- FR67: Authorized users can associate researcher profiles with proposals, approved projects, seminars, student research activities, councils, ethics dossiers, reviews, publications, products, and tasks where relevant.
- FR67a: The system can enforce conflict-of-interest and separation-of-duty rules when assigning participation, reviewer, council, secretary, or approval roles, including blocking self-review, self-approval, and unauthorized secretary decision actions within the same business record.
- FR68: Users can search and filter researcher profiles by name, unit, field, expertise, status, participation history, and other authorized business attributes.
- FR69: The system can preserve researcher profile history and audit important profile changes according to role and data-scope permissions.

## User Personas

### System Administrator

Maintains accounts, roles, organizational mappings, shared catalogs, configuration, and operational traceability. Needs controlled administrative power without bypassing business authority.

### Scientific Management Staff

Runs the end-to-end operational workflow for intake, review coordination, approvals, project follow-up, seminar and student research tracking, related documents, council operations, reminders, and reporting. This is the most workflow-intensive persona in phase 1.

### Leadership / Approval Authority

Needs role-scoped visibility into approvals, overdue items, risky projects, council or ethics decisions, and summary metrics, with the ability to review records and make formal decisions.

### Principal Investigator

Creates proposals, responds to supplement requests, tracks project progress, submits reports, and requests adjustments or extensions.

### Project Member

Participates in approved-project work, receives assigned tasks, contributes evidence or files within granted scope, and monitors responsibilities related to the project. May have a researcher profile linked to their system user when they are part of the scientific personnel directory.

### Reviewer / Committee Member

Accesses assigned proposals, ethics dossiers, council records, or review records, submits scores and comments, and participates in controlled evaluation or acceptance workflows.

## Role-Based Access Requirements

- Each protected capability must be explicitly mapped to one or more roles.
- Business actions such as proposal submission, supplement request handling, review submission, approval decisions, project follow-up, seminar/student research updates, document registration, ethics dossier submission, council decisions, and report export must be restricted by role.
- Administrator permissions must remain distinct from business-decision permissions.
- Reviewer, council member, and committee access must be limited to assigned items and required supporting context.
- Leadership actions must be limited to authority-specific approval and visibility rules.
- Principal investigator, project member, scientific secretary, reviewer, council member, and ethics reviewer status must be treated as record-scoped participation or assignment context unless explicitly configured as an account-level system role for another purpose.
- Authorization must evaluate conflict-of-interest rules before sensitive assignments or decisions, including reviewer assignment, council membership assignment, proposal approval, project adjustment decisions, and council or ethics approval.

## Data-Scope Authorization Requirements

- Access to proposals, projects, seminars, student research activities, councils, ethics dossiers, researcher profiles, related documents, tasks, dashboards, reports, and files must be restricted by organizational scope where applicable.
- Users must only see records for units, assignments, or approval scopes they are permitted to access.
- Search results, dashboard counts, exports, notification targets, and history views must respect the same data-scope rules as detail pages.
- Cross-unit visibility must be explicit and rule-driven, never implicit.
- Effective permission must be calculated from system role, organization scope, record participation role, assignment scope, workflow state, and conflict policy; missing or ambiguous context must fail closed.

## Audit-Log Requirements

- The system must create audit logs for login, logout, change password, initiate or complete password reset, create, update, soft delete, submit proposal, request supplement, resubmit proposal, assign reviewer, submit score and comment, approve or reject, create task, assign task, update task status, register or replace important related documents, create or update researcher profile, link researcher profile to user account or business record, submit ethics dossier, assign council reviewer, update council decision, upload important file, and download important file.
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
- Leadership dashboards must prioritize pending approvals, delayed projects, overdue tasks, council or ethics decisions, upcoming reports, unit-level summaries, and action-oriented queues.
- Scientific management staff dashboards must prioritize operational backlogs, supplement queues, review progress, seminar/student research milestones, document status gaps, council/ethics queues, reporting deadlines, and unresolved issues.
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
- Accessibility for core workflows must target WCAG AA.

## Acceptance Criteria

### Core Workflow Acceptance

- Proposal intake, supplement, review, approval, approved-project tracking, seminar/student research tracking, task management, related-document management, council/ethics management, notifications, and dashboard/reporting flows are all demonstrably available in phase 1 through test execution or controlled UAT scenarios.
- Proposal, approved-project, seminar/student research, council/ethics, and task states are enforced as controlled workflows rather than free-form edits, verified by positive and negative workflow transition scenarios.
- System administrator, scientific management staff, leadership, principal investigator, project member, reviewer, and council or committee member can each complete at least one primary role journey in verification scenarios without relying on external shadow tracking for the main workflow.

### Governance Acceptance

- Role-based, data-scope, and state-based authorization are enforced on protected operations, verified through role-specific and cross-scope negative test scenarios.
- Participation-role, assignment-scope, and conflict-of-interest authorization are enforced on protected operations, verified through negative scenarios such as PI self-review, leadership self-approval, secretary overreach, and council member access outside assigned records.
- Critical audit-log actions are generated and verifiable for the workflow actions listed in this PRD.
- File access, preview, and file download permissions are enforced and verifiable for authorized and unauthorized cases.

### UX Acceptance

- Core administrative screens work across the required breakpoints of `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`.
- Dashboard, list, detail, and form experiences remain usable and legible on desktop and mobile/tablet layouts without full-page horizontal scrolling on mobile.
- Core workflows satisfy the baseline accessibility expectations stated in this PRD, verified by keyboard navigation checks, visible focus checks, label checks, and status readability checks on affected screens.
- A user who is simultaneously the owner of one proposal, a participant in another, and an approval authority can carry out each responsibility without switching accounts or roles, sees the correct record-scoped role stated on each record, and is blocked with a stated reason from approving a proposal they participate in.

## Phase 1 Out-Of-Scope

- Public internet-facing submission portals
- SSO, LDAP, OIDC, MFA, and other external identity integrations
- Digital signature workflows
- SMS delivery
- Deep financial subsystem integration or accounting-grade disbursement workflows
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
- NFR6: Passwords, credentials, and session-related secrets shall never be stored or transmitted in plaintext application flows, verified by security review and automated or manual inspection of relevant authentication paths.
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
