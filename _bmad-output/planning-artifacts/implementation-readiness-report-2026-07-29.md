---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
filesIncluded:
  prd:
    - /Users/Super/DocManS/_bmad-output/prd.md
  architecture:
    - /Users/Super/DocManS/_bmad-output/architecture.md
  epicsAndStories:
    - /Users/Super/DocManS/_bmad-output/epics-and-stories.md
  supportingEpicsAndStories:
    - /Users/Super/DocManS/docs/stories-notes-vi/epics-and-stories.md
  ux:
    - /Users/Super/DocManS/docs/ux-design-guidelines.md
  permissionSource:
    - /Users/Super/DocManS/phan-quyen-trong-de-tai-khoa-hoc.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-29
**Project:** DocManSystem

## Document Discovery

### Documents selected for assessment

- PRD: `_bmad-output/prd.md`
- Architecture: `_bmad-output/architecture.md`
- Canonical epics and stories: `_bmad-output/epics-and-stories.md`
- Supporting Vietnamese story notes: `docs/stories-notes-vi/epics-and-stories.md`
- UX design: `docs/ux-design-guidelines.md`
- Permission source: `phan-quyen-trong-de-tai-khoa-hoc.md`

No sharded versions were found. The similarly named Vietnamese epics and
stories document is treated as supporting material, not as the canonical
planning artifact.

## PRD Analysis

### Functional Requirements

- FR1: System administrators can create, update, activate, deactivate, and lock user accounts.
- FR2: System administrators can assign one or more roles to a user.
- FR3: System administrators can associate users with an organizational unit and other scope-defining organizational attributes.
- FR4: The system can authenticate users and establish a role-aware session for authorized access.
- FR4a: Authenticated users can change their own password, and authorized administrators can initiate a controlled password reset flow for internal users.
- FR5: The system can enforce role-based access rules across all protected capabilities.
- FR6: The system can enforce organization-scope or unit-scope access rules across proposals, projects, seminars, student research activities, councils, ethics dossiers, related documents, tasks, files, dashboards, and reports.
- FR6a: The system can distinguish account-level system roles from record-scoped participation or assignment roles, including principal investigator, project member, scientific secretary, reviewer, council member, and ethics reviewer, so those roles only grant permissions within the specific proposal, project, council, review, ethics dossier, task, or related record context.
- FR7: System administrators can manage shared catalogs required by business workflows, including organizational units, research fields, proposal types, statuses, priorities, report types, product types, forms, checklists, and scoring criteria.
- FR8: System administrators can configure system parameters, notification templates, and selected workflow-supporting settings required for phase 1 operations.
- FR9: Scientific management staff can create and manage proposal intake periods with dates, applicability rules, and required submission packages.
- FR10: Principal investigators can create a proposal draft, save progress, and submit a proposal formally within an applicable intake period.
- FR11: Principal investigators can enter structured proposal information including title, field, host unit, participants, timeline, objectives, content summary, and proposed budget metadata.
- FR12: Principal investigators can upload required proposal attachments and supporting documents to a proposal record.
- FR13: The system can validate required proposal data and required file conditions before formal submission.
- FR14: The system can record proposal submission history, including timestamps and submission state changes.
- FR15: Scientific management staff can review proposal completeness and request supplements with a stated reason and due date.
- FR16: Principal investigators can view supplement requests, revise proposal content or attachments, and resubmit the proposal.
- FR17: Scientific management staff can assign reviewers or committee participants to proposals according to the workflow.
- FR18: Reviewers and committee members can access assigned proposals and submit scores, comments, and recommendations.
- FR19: Scientific management staff can monitor review progress and consolidate evaluation outcomes.
- FR20: Leadership or approval authority can review proposal history, evaluation outputs, and supporting files before making an approval decision.
- FR21: Leadership or approval authority can approve, reject, or otherwise disposition a proposal according to workflow rules.
- FR22: The system can treat proposal statuses as controlled states and restrict actions based on current proposal state.
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
- FR44: The system can present user-specific work queues showing items waiting for the current user’s attention.
- FR45: Leadership and scientific management staff can access role-based dashboards showing waiting approvals, delayed projects, overdue tasks, council or ethics queues, seminar or student research milestones, document status gaps, upcoming reports, and summary indicators within authorized scope.
- FR46: Users can search and filter proposals, projects, seminar records, student research records, council records, document records, tasks, and reports by relevant business attributes such as code, title, unit, field, status, assignee, due date, and intake period.
- FR47: The system can provide traceable detail views that connect dashboard indicators and list results to the underlying workflow records.
- FR48: Authorized users can export designated lists and reports to Excel or PDF according to business needs and permission rules.
- FR49: The system can produce role-scoped reporting views and summary outputs by unit, field, status, reporting period, module type, and related administrative dimensions.
- FR50: Scientific management staff can create or import approved seminar and student research records with responsible unit, participants, schedule, scope, and source decision metadata.
- FR51: Scientific management staff can maintain plans, related documents, milestones, and administrative notes for approved seminars and student research activities.
- FR52: Authorized users can record adjustment requests, budget metadata, products, and outcomes for seminars and student research activities.
- FR53: The system can treat seminar and student research statuses as controlled states, expose role-scoped lists, and preserve history for important changes.
- FR54: Authorized users can register governing, legal, planning, proposal, project, seminar, council, and other related documents with document type, issuing authority, code, date, effective status, and metadata.
- FR55: Authorized users can link related documents to proposals, approved projects, seminars, student research activities, councils, ethics dossiers, tasks, and reports.
- FR56: The system can preserve version or replacement history for important related documents and distinguish current, expired, superseded, and archived document states.
- FR57: The system can provide role-scoped search, filtering, and retrieval of related documents without exposing file metadata or document content outside authorized scope.
- FR58: Scientific management staff can create and manage council plans with purpose, schedule, member roles, related legal documents, and linked business records.
- FR59: Principal investigators or authorized staff can create, complete, and submit ethics dossiers with required structured data and attachments.
- FR60: Scientific management staff can review ethics dossier completeness, request supplements, and track resubmissions.
- FR61: Council members or assigned reviewers can access assigned ethics dossiers or council records and submit scores, comments, and recommendations.
- FR62: Scientific management staff can monitor council review progress, consolidate evaluation outcomes, and route records for approval.
- FR63: Leadership or approval authority can approve, reject, or otherwise decide council or ethics records according to workflow rules.
- FR64: The system can treat council and ethics workflow statuses as controlled states with role-scoped dashboards, reports, history, notifications, and audit logs.
- FR65: Authorized users can create and maintain researcher profiles with identity, academic rank or degree, title, contact details, organization, research fields, expertise keywords, and active status.
- FR66: Authorized users can link researcher profiles to user accounts where applicable while still allowing profile records for researchers who do not yet have system login accounts.
- FR67: Authorized users can associate researcher profiles with proposals, approved projects, seminars, student research activities, councils, ethics dossiers, reviews, publications, products, and tasks where relevant.
- FR67a: The system can enforce conflict-of-interest and separation-of-duty rules when assigning participation, reviewer, council, secretary, or approval roles, including blocking self-review, self-approval, and unauthorized secretary decision actions within the same business record.
- FR68: Users can search and filter researcher profiles by name, unit, field, expertise, status, participation history, and other authorized business attributes.
- FR69: The system can preserve researcher profile history and audit important profile changes according to role and data-scope permissions.

**Total FRs: 74**

### Non-Functional Requirements

- NFR1: Standard authenticated list views, detail pages, and common workflow actions shall return user-visible results within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR2: Dashboard views shall present core widgets and counts within 3 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR3: Search and filter interactions on primary administrative lists shall complete within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions, as verified by test instrumentation or controlled performance testing.
- NFR4: Heavy operations such as exports, reminder batches, and derived reporting workloads shall provide visible progress, queued status, or completion feedback and shall not block normal interactive request handling, as verified by workflow testing under concurrent usage scenarios.
- NFR5: All authenticated traffic shall require encrypted transport in deployment environments, verified by environment configuration review and transport-layer access tests.
- NFR6: Passwords, credentials, and session-related secrets shall never be stored or transmitted in plaintext application flows, verified by security review and automated or manual inspection of relevant authentication paths.
- NFR7: Authorization shall be enforced on the backend for all protected operations, including dashboards, reports, search, exports, workflow actions, file access, and history views, verified by endpoint and service-level authorization tests for allowed and denied cases.
- NFR8: The system shall fail closed when authorization scope, participation role, assignment scope, conflict policy, or state-based permission context cannot be resolved safely, verified by negative-path tests.
- NFR9: Audit-log records for critical actions shall be queryable by authorized users within the product or operational support tooling and verifiable during audit-log acceptance testing.
- NFR10: Critical workflow actions such as submission, supplement request, approval decision, task status change, and key file-linking operations shall either complete successfully with consistent state changes or fail without partial business-state persistence, verified by integration testing.
- NFR11: Reminder, notification, and background processing flows shall be safe to retry without causing inconsistent state and should avoid duplicate business outcomes where the same trigger is reprocessed, verified by retry-path testing for affected jobs.
- NFR12: Important business records shall support soft delete where defined by product rules, verified by record lifecycle tests that confirm recoverability and traceability expectations.
- NFR13: Every schema change shall be versioned through a Prisma migration and validated through migration execution in controlled development or test environments.
- NFR14: Core phase 1 workflows shall meet WCAG AA expectations for labels, focus visibility, keyboard navigation, readable status communication, and error feedback, verified by accessibility review and manual keyboard checks on affected flows.
- NFR15: Responsive versions of core workflows shall preserve accessibility behavior rather than treating accessibility as desktop-only, verified across desktop and mobile/tablet layouts for affected screens.
- NFR16: Status communication shall not depend on color alone and shall include text or icon reinforcement, verified by design review and UI verification of affected status components.
- NFR17: The phase 1 solution shall preserve modular-monolith boundaries so major business areas remain separable in code, testing, and review, verified by architecture and code review.
- NFR18: Business logic shall remain centralized in backend service layers rather than being fragmented across controllers or frontend-only flows, verified by code review of implemented stories.
- NFR19: New code introduced under this PRD shall maintain TypeScript strictness, explicit DTO validation, and clear domain naming, verified by build, test, and code review gates.
- NFR20: New functionality shall be implemented in a way that supports story-sized testing, review, and rollback of changes without broad unrelated refactoring, verified during story review and implementation readiness checks.

**Total NFRs: 20**

### Additional Requirements

- Authorization must combine system role, organization scope, record participation role, assignment scope, workflow state, and conflict policy, and must fail closed when the context is incomplete or ambiguous.
- Principal investigator, project member, scientific secretary, reviewer, council member, and ethics reviewer are record-scoped participation or assignment roles unless explicitly configured otherwise.
- Conflict-of-interest checks apply before sensitive assignments and decisions, including self-review, self-approval, secretary overreach, council membership, project adjustments, and council or ethics approval.
- Search results, dashboard totals, exports, notifications, history, and file metadata must follow the same authorization scope as record detail views.
- Critical actions require audit records containing actor, action, timestamp, target, and sufficient business context.
- Important files require record association, authorization on every operation, validation, metadata, and version traceability.
- Proposal, approved-project, task, seminar/student-research, council, ethics, and related-document states must be controlled workflows rather than free-form fields.
- Notifications and reminders are backend-driven phase 1 requirements and must respect authorization.
- Core UX must support the specified responsive breakpoints, WCAG AA essentials, explicit record-role labels, a unified workspace without global role switching, and visible disabled actions with conflict reasons.
- Phase 1 remains an internal modular-monolith application without public submission, SSO, MFA, digital signatures, SMS, a workflow engine, Elasticsearch/OpenSearch, microservices, or Kubernetes.

### PRD Completeness Assessment

The PRD is strong at the product-requirement level: it contains 74 stable
functional requirement identifiers, 20 measurable non-functional requirements,
six user journeys, cross-cutting authorization and governance rules, and
portfolio-level acceptance criteria. Record-scoped participation, conflict of
interest, fail-closed behavior, role-labelled UX, file security, auditability,
and scope-filtered reporting are explicitly represented.

The PRD is not yet sufficient by itself to prove implementation readiness.
Its user journeys are broad end-to-end narratives rather than an exhaustive set
of permission use cases, and most acceptance criteria are release-level rather
than independently testable scenarios for every role, record relationship,
workflow state, and action. Those are expected to be decomposed and verified
against the canonical epics and stories in the following steps.

## Epic Coverage Validation

### Coverage Matrix

The full requirement text is preserved in the PRD Analysis section above.

| FR | PRD capability | Epic / story coverage | Status |
| --- | --- | --- | --- |
| FR1 | User account lifecycle | EP-01 / ST-1.3 | Covered; traceability ID drift |
| FR2 | Assign roles to users | EP-01 / ST-1.3 | Covered; traceability ID drift |
| FR3 | Associate users with organization scope | EP-01 / ST-1.3 | Covered; traceability ID drift |
| FR4 | Authenticate and establish role-aware session | EP-01 / ST-1.2 | Covered; traceability ID drift |
| FR4a | Change and controlled reset of password | EP-01 / ST-1.5 | Covered |
| FR5 | Enforce role-based access | EP-01 / ST-1.3, ST-1.4 | Covered; traceability ID drift |
| FR6 | Enforce organization/unit scope | EP-01 / ST-1.3, ST-1.4 and domain stories | Covered; traceability text drift |
| FR6a | Separate system roles from record roles | EP-03 / ST-3.0; EP-07 / ST-7.4; EP-11 / ST-11.3 | Covered; inventory wording drift |
| FR7 | Shared catalogs | EP-01 / ST-1.4 | Covered |
| FR8 | System parameters and notification templates | EP-01 / ST-1.4; EP-06 / ST-6.2 | Covered |
| FR9 | Proposal intake periods | EP-02 / ST-2.1 | Covered |
| FR10 | Draft, save, and submit proposal | EP-02 / ST-2.2, ST-2.4 | Covered |
| FR11 | Structured proposal data | EP-02 / ST-2.2 | Covered |
| FR12 | Proposal attachments | EP-02 / ST-2.3A, ST-2.3 | Covered |
| FR13 | Pre-submission validation | EP-02 / ST-2.3A, ST-2.3 | Covered |
| FR14 | Submission history | EP-02 / ST-2.4 | Covered |
| FR15 | Completeness review and supplement request | EP-03 / ST-3.1 | Covered |
| FR16 | Revise and resubmit | EP-03 / ST-3.1 | Covered |
| FR17 | Reviewer assignment | EP-03 / ST-3.2 | Covered |
| FR18 | Reviewer scoring and comments | EP-03 / ST-3.3 | Covered |
| FR19 | Review monitoring and consolidation | EP-03 / ST-3.4 | Covered |
| FR20 | Approval package review | EP-03 / ST-3.5 | Covered |
| FR21 | Proposal decision | EP-03 / ST-3.5 | Covered |
| FR22 | Controlled proposal states | EP-02 / ST-2.4; EP-03 / ST-3.1, ST-3.5 | Covered |
| FR23 | Create approved project | EP-03 / ST-3.5; EP-04 / ST-4.1 | Covered |
| FR24 | Project milestones and checkpoints | EP-04 / ST-4.2 | Covered |
| FR25 | Progress reports and evidence | EP-04 / ST-4.3 | Covered |
| FR26 | Progress review and follow-up | EP-04 / ST-4.4 | Covered |
| FR27 | Adjustment and extension request | EP-04 / ST-4.5 | Covered |
| FR28 | Adjustment, extension, acceptance and final-review decisions | EP-04 / ST-4.6, ST-4.7 | Covered |
| FR29 | Delay and deadline indicators | EP-04 / ST-4.4 | Covered |
| FR30 | Controlled project states | EP-04 / ST-4.1, ST-4.2, ST-4.5, ST-4.6, ST-4.7 | Covered |
| FR30a | Project-member view | EP-04 / ST-4.1, ST-4.2 | Covered |
| FR30b | Project-member evidence upload | EP-04 / ST-4.3 | Covered |
| FR31 | Linked or standalone tasks | EP-05 / ST-5.1 | Covered |
| FR32 | Task assignment | EP-05 / ST-5.1 | Covered |
| FR33 | Task progress and completion evidence | EP-05 / ST-5.2 | Covered |
| FR34 | Task overdue/upcoming indicators | EP-05 / ST-5.2 | Covered |
| FR35 | Controlled task states | EP-05 / ST-5.2 | Covered |
| FR36 | Permission-controlled file operations | EP-02 / ST-2.3A, ST-2.3; EP-05 / ST-5.3 and domain stories | Covered |
| FR37 | File metadata and traceability | EP-02 / ST-2.3A, ST-2.3; EP-05 / ST-5.3 and domain stories | Covered |
| FR38 | Workflow and record history | EP-05 / ST-5.4 and domain stories | Covered |
| FR39 | Critical-action audit logs | EP-05 / ST-5.4 and domain stories | Covered |
| FR40 | Authorized audit/history inspection | EP-05 / ST-5.4 | Covered |
| FR41 | In-app notifications | EP-06 / ST-6.1 | Covered |
| FR42 | Email notifications | EP-06 / ST-6.2 | Covered |
| FR43 | Deadline reminders | EP-06 / ST-6.3 | Covered |
| FR44 | User work queues | EP-06 / ST-6.1, ST-6.3 | Covered |
| FR45 | Role-scoped dashboards | EP-07 / ST-7.2; domain dashboard hooks | Covered |
| FR46 | Search and filtering | EP-07 / ST-7.1; EP-11 / ST-11.3 | Covered |
| FR47 | Traceable drill-down | EP-07 / ST-7.1, ST-7.2 and domain stories | Covered |
| FR48 | Excel/PDF export | EP-07 / ST-7.3 | Covered |
| FR49 | Scoped reporting | EP-07 / ST-7.3 and domain reporting hooks | Covered |
| FR50 | Seminar/student-research record creation | EP-08 / ST-8.1 | Covered |
| FR51 | Seminar/student-research tracking data | EP-08 / ST-8.2 | Covered |
| FR52 | Seminar/student-research adjustments and outcomes | EP-08 / ST-8.2 | Covered |
| FR53 | Controlled seminar/student-research states | EP-08 / ST-8.1, ST-8.3 | Covered |
| FR54 | Related-document registry | EP-09 / ST-9.1 | Covered |
| FR55 | Link documents to business records | EP-09 / ST-9.2 | Covered |
| FR56 | Document replacement/version states | EP-09 / ST-9.1, ST-9.3 | Covered |
| FR57 | Scoped document retrieval | EP-09 / ST-9.1, ST-9.3 | Covered |
| FR58 | Council plans and member roles | EP-10 / ST-10.1, ST-10.3 | Covered |
| FR59 | Ethics dossier preparation/submission | EP-10 / ST-10.2 | Covered |
| FR60 | Ethics completeness and supplements | EP-10 / ST-10.3 | Covered |
| FR61 | Council/reviewer scoring | EP-10 / ST-10.3, ST-10.4 | Covered |
| FR62 | Council review consolidation | EP-10 / ST-10.5 | Covered |
| FR63 | Council/ethics decision | EP-10 / ST-10.6 | Covered |
| FR64 | Controlled council/ethics workflow | EP-10 / ST-10.4, ST-10.5, ST-10.6 | Covered |
| FR65 | Researcher profiles | EP-11 / ST-11.1 | Covered |
| FR66 | Researcher-profile/account linkage | EP-11 / ST-11.2 | Covered |
| FR67 | Researcher/business-record linkage | EP-11 / ST-11.3 | Covered |
| FR67a | Conflict of interest and separation of duty | EP-03 / ST-3.0, ST-3.2, ST-3.5; EP-10 / ST-10.1, ST-10.3, ST-10.6; EP-11 / ST-11.3 | Covered |
| FR68 | Researcher search/filter | EP-11 / ST-11.3 | Covered |
| FR69 | Researcher history/audit | EP-11 / ST-11.1, ST-11.3 | Covered |

### Missing Requirements

No PRD functional requirement is wholly absent from the epic/story backlog.
However, the traceability inventory is not reliable for FR1-FR6a:

- FR1-FR4 and FR5 are assigned old meanings in the epic requirements
  inventory. Their capabilities are implemented by EP-01 stories, but the
  story traceability labels point to the prior numbering.
- FR6 combines role, organization, and state authorization in the epic
  inventory, while the current PRD separates role authorization into FR5 and
  organization scope into FR6.
- FR6a is substantively aligned, but the epic inventory shortens the complete
  list of target record contexts from the PRD.

This is a **high-priority traceability defect**, not a missing-capability
defect. It can cause tests, commits, and story handoffs to claim the wrong PRD
requirement. The canonical epic requirements inventory, FR Coverage Map, EP-01
coverage declaration, and ST-1.2 through ST-1.4 traceability labels must be
realigned to the current PRD before implementation is considered fully ready.

### Coverage Statistics

- Total PRD FRs: 74
- Capabilities represented by at least one epic/story: 74
- Capability coverage: 100%
- FR identifiers with exact inventory text alignment: 67
- FR identifiers with drifted inventory text: 7
- Exact identifier alignment: 90.5%
- Wholly missing FRs: 0

## UX Alignment Assessment

### UX Document Status

Found: `docs/ux-design-guidelines.md`.

The document covers the institutional visual direction, responsive navigation,
data tables, long forms, dashboard actionability, status communication,
timeline/history, file interactions, navigation, accessibility, multi-role
users, record-scoped roles, a unified personal area, and visible conflict
reasons.

### UX ↔ PRD Alignment

**Aligned:**

- Both require an institutional dark-green admin interface rather than a
  decorative SaaS presentation.
- Both require responsive dashboard, list, detail, form, approval, task, and
  progress flows at the principal mobile, tablet, and desktop breakpoints.
- Both require confirmation and visible feedback for important actions.
- Both require WCAG AA essentials, status communication that does not rely on
  color alone, and traceable timeline/history presentation.
- Both require one unified workspace, explicit record-scoped role labels, no
  global role switcher, a common personal work area, and visible disabled
  actions with plain-language conflict reasons.

**Alignment issues:**

1. **High — account-level role cardinality is contradictory.** PRD FR2 says an
   administrator can assign one or more roles to a user. UX section 15 says the
   system-role axis has exactly one role per person and navigation follows that
   single role. A deterministic rule is needed: either one primary system role
   plus secondary grants, or multiple system roles with an explicit,
   non-switching navigation/permission composition policy.
2. **High — “highest record role” is unsafe without a precedence rule.** UX
   section 15 says that when a user has multiple relationships on one record,
   the UI displays the relationship with the highest permission. PRD conflict
   rules require separation of duty and may make the most important fact a
   disqualifying relationship, not the most permissive relationship. The UI
   must display all relevant relationships and derive capabilities from the
   backend conflict result rather than infer a highest role locally.
3. **Medium — UX is pattern-complete but not permission-scenario complete.**
   The UX guideline does not enumerate action visibility/disabled behavior for
   every record type, state, and record relationship. The permission source
   document must therefore supply these testable use cases and acceptance
   criteria.

### UX ↔ Architecture Alignment

**Supported by architecture:**

- Next.js App Router feature organization, shared shell, sidebar, topbar, and
  breadcrumbs.
- Server-driven, role-aware dashboards and scope-aware drill-down.
- Sectioned forms, explicit workflow actions, desktop tables, mobile-adapted
  lists/cards, and no full-page mobile horizontal scrolling.
- Shared components for tables, forms, status, timeline, and charts.
- Backend authorization, DTO validation, workflow services, audit logging,
  notifications, file services, and performance-sensitive query services.

**Architecture gaps:**

1. **Critical — the authorization decision model is stale.** The architecture
   defines authorization as role + organization/data scope + state, and its
   fail-closed rule adds assignment scope. It does not make record
   participation role and conflict policy mandatory inputs, even though the
   PRD and UX require them. This leaves self-review, self-approval, secretary
   overreach, and conflicting multi-relationship behavior under-specified.
2. **High — no explicit capability response contract.** UX requires the
   backend to return the viewer’s record roles, allowed actions, blocked
   actions, and human-readable conflict reasons. The architecture has shared
   permissions and error patterns, but no response contract or policy-result
   shape for these fields.
3. **High — the unified personal work area is absent from the structure and
   requirements mapping.** The architecture defines dashboards and
   notifications, but does not identify the personal work hub, its
   cross-module authorized query boundary, or its conflict-filtered action
   queue.
4. **Medium — accessibility implementation details are incomplete.** The
   architecture recognizes WCAG AA and responsive UI but does not preserve UX
   requirements such as `aria-live`, `prefers-reduced-motion`, minimum mobile
   touch targets, and visible disabled-action explanations as implementation
   invariants.

### Warnings

- The architecture's existing “READY FOR IMPLEMENTATION” conclusion predates
  or does not incorporate the complete record-scoped permission and conflict
  rules now present in the PRD, UX guideline, and permission source.
- Do not implement permission-sensitive UI from account-level roles alone.
  Backend policy output must remain the source of truth for record roles and
  action capabilities.

## Epic Quality Review

The canonical backlog contains 11 epics, 49 stories, 134 acceptance criteria,
58 explicit authorization requirements, and 205 verification checks.

### Epic-Level Assessment

| Epic | User-value focus | Independence | Assessment |
| --- | --- | --- | --- |
| EP-01 | Access, administration, and platform foundation | Standalone | Acceptable; ST-1.1 is technical but required by the selected starter architecture |
| EP-02 | Proposal intake and submission | Uses EP-01 | Good |
| EP-03 | Supplement, review, and approval | Uses EP-01/02 | Good after ST-3.0 was placed before conflict-sensitive stories |
| EP-04 | Approved-project execution | Uses earlier proposal/file foundation | Partial; project evidence depends on file support not clearly delivered until later |
| EP-05 | Tasks, files, history, audit | Uses earlier platform | Partial; ST-5.2 uses task files before ST-5.3 expands file support |
| EP-06 | Notifications, reminders, queues | Claims later-module reminders | Not independent from EP-08/09/10 |
| EP-07 | Search, dashboards, reports, personal hub | Claims later-module data and participation | Not independent from EP-08/09/10/11 |
| EP-08 | Seminar/student research | Uses platform/reporting patterns | Good if reporting hooks are integrated after domain delivery |
| EP-09 | Related documents | Links to council records delivered in EP-10 | Partial forward dependency |
| EP-10 | Councils and ethics | Architecture says it depends on researcher profiles | Invalid ordering because EP-11 follows it |
| EP-11 | Researcher profiles and participation links | Supplies identity/participation data needed earlier | Valuable, but sequenced too late |

### Critical Violations

1. **EP-10 depends on future EP-11.** Architecture explicitly states that
   council and ethics workflows depend on researcher profiles. ST-10.1,
   ST-10.3, and ST-10.6 require conflict checks against participant,
   reviewer, council, and secretary relationships, while profile/account and
   cross-record participation linkage are not delivered until ST-11.2 and
   ST-11.3.
   - Remediation: move the minimum researcher-profile/account/participation
     foundation before EP-10, or move EP-11 before EP-10.
2. **EP-07 contains explicit forward dependencies.** ST-7.1 and ST-7.2 claim
   search/dashboard support for seminars, student research, documents,
   councils, and ethics before those domains are delivered. ST-7.4 states that
   non-proposal participation is delivered by later owning epics.
   - Remediation: make EP-07 incremental over domains already delivered, then
     add integration stories after EP-08 through EP-11; alternatively move the
     consolidated EP-07 after all source domains.
3. **EP-06 claims reminder coverage for later domains without stories.** PRD
   reminders include seminar/student-research milestones, council/ethics
   deadlines, and document effective dates. ST-6.3 only specifies supplement,
   review, project-report, and task deadlines.
   - Remediation: add later-domain reminder integration stories after the
     corresponding domain epics.

### Major Issues

1. **File-service ordering is ambiguous.** ST-2.3A implements only
   `research_proposal` associations. ST-4.3 needs project/progress-report
   evidence and ST-5.2 needs task evidence before ST-5.3 expands the files
   service across those entity types.
   - Remediation: require each earlier domain story to extend the shared files
     module for its own entity, or move the required entity support into a
     preceding file-platform story.
2. **Several stories are too broad for one independently reviewable outcome:**
   - ST-1.4 combines permission primitives, catalogs, configuration, templates,
     backend services, and reusable administration UI.
   - ST-5.3 standardizes cross-module files, replacement history, permissions,
     broader associations, preview, UI, and audit lookup.
   - ST-6.3 combines the reminder engine with the multi-module personal work
     queue.
   - ST-7.1, ST-7.2, and ST-7.3 each span most application modules.
   - ST-8.2 combines plans, documents, milestones, adjustments, budget,
     products, outcomes, files, and history.
   - ST-10.3 combines a supplement/resubmission workflow with council
     assignment.
   - ST-11.3 combines participation links across many domains, search/filter,
     participation history, authorization, and conflict integration.
   - Remediation: split by coherent user outcome and domain integration.
3. **Scientific-secretary use cases are materially incomplete.** The permission
   source grants record-scoped secretary capabilities for administrative data,
   meeting materials, minutes, tasks, deadline tracking, and draft
   consolidation. The backlog only models secretary participation and blocks
   secretary decisions; it does not deliver or test the positive secretary
   workflows.
   - Remediation: add explicit proposal/project secretary and council secretary
     stories or acceptance criteria, with record/council scope and clear
     separation from final decisions.
4. **Delegated actions are undefined.** Multiple stories say “or an authorized
   delegate” while no delegation entity, grant scope, expiry, revocation,
   audit, or fail-closed rule exists.
   - Remediation: either define a minimal auditable record-scoped delegation
     policy or remove delegated actions from phase 1 and deny them by default.
5. **Acceptance criteria do not fully encode the permission matrix.** Many
   authorization requirements appear only as prose. Important negative cases
   from the source are missing as ACs: member cannot formally submit, member
   cannot request adjustments, PI/member cannot change official membership,
   reviewer cannot see other reviews, secretary cannot act outside the
   assigned record/council, and leadership conflict must override account
   authority.
   - Remediation: add Given/When/Then criteria for allowed, denied, wrong-state,
     wrong-scope, conflicting-role, and ambiguous-context cases.
6. **Reviewer file and review visibility are underspecified.** ST-3.2 grants
   proposal access and ST-3.3 grants review entry, but does not explicitly
   define which supporting files are visible or whether a submitted reviewer
   may reopen/view their own review under policy.
7. **UI coverage from the permission source is incomplete.** There are no
   acceptance criteria for the researcher participation tabs, the
   “Nhân sự & vai trò” record panel, display of all simultaneous
   relationships, or action capability reasons returned by the backend.

### Minor Concerns

- Story language mixes English and Vietnamese. This does not block
  implementation, but stable domain vocabulary would reduce handoff drift.
- Some acceptance criteria contain multiple independently failing outcomes in
  one case; splitting them would improve test naming and failure diagnosis.
- ST-3.5 traces FR23 while its out-of-scope section says approved-project
  creation is deferred to ST-4.1. Traceability should point FR23 primarily to
  ST-4.1.
- ST-7.4 traces FR55 and FR56, which concern related documents and version
  history, but its scope is the personal work hub. Those links should be
  reviewed.

### Positive Findings

- All stories have stable use-case IDs, acceptance criteria, authorization
  notes, audit treatment, and verification checklists.
- Most acceptance criteria use clear Given/When/Then structure.
- Database entities are generally introduced when first needed rather than
  creating the whole schema in advance.
- The architecture starter is correctly represented by ST-1.1.
- Proposal conflict primitives are sequenced before reviewer assignment and
  approval decisions inside EP-03.

## Summary and Recommendations

### Overall Readiness Status

**NOT READY**

The artefacts describe all 74 PRD functional requirements at least
nominally, and the backlog has unusually strong baseline structure. However,
implementation is not safe to continue as a complete permission design while
requirement identifiers are drifted, the architecture omits mandatory
record-participation/conflict inputs, later-domain dependencies run backward,
and key scientific-secretary and denial scenarios have no testable acceptance
criteria.

### Critical Issues Requiring Immediate Action

1. Update the architecture authorization invariant to require system role,
   organization scope, record participation role, assignment scope, workflow
   state, conflict policy, and fail-closed handling in every sensitive
   decision.
2. Correct epic sequencing and dependencies:
   - deliver researcher profile/account/participation foundations before
     council and ethics conflict enforcement;
   - move or split consolidated search, dashboard, reminder, and personal-hub
     work so it follows the domain records it aggregates;
   - remove forward dependency on later file-entity support.
3. Add positive, record-scoped scientific-secretary use cases for
   proposal/project and council work, while preserving explicit prohibitions
   on review and final decisions.
4. Convert the permission matrix into testable allowed/denied acceptance
   criteria for PI, member, secretary, reviewer, staff, and leadership across
   correct scope, wrong scope, correct state, wrong state, conflict, and
   unresolved-context cases.
5. Realign FR1-FR6a in the epic inventory, coverage map, EP-01 declaration,
   and story traceability to the current PRD before using FR IDs in
   implementation or tests.

### Recommended Next Steps

1. Reconcile the permission source into PRD business rules and acceptance
   criteria, resolving system-role cardinality and delegation policy.
2. Amend the architecture with an explicit effective-permission decision
   contract and an authorized capability response for record-role labels,
   allowed actions, blocked actions, and human-readable reasons.
3. Reorder or split epics to eliminate all forward dependencies.
4. Split oversized stories and add missing secretary, delegation,
   reviewer-visibility, personnel-panel, and participation-history scenarios.
5. Regenerate the FR-to-story traceability map and verify exact identifier
   equality against the PRD.
6. Run this readiness assessment again; readiness should be upgraded only when
   there are no critical dependency or authorization-model gaps.

### Final Note

This assessment records 22 findings across five categories: requirement
traceability, PRD/UX consistency, architecture alignment, epic dependency
quality, and story/use-case/acceptance-criteria completeness. The most useful
finding is that the main problem is not missing feature names: it is incomplete
and sometimes stale executable specification of who may do what, on which
record, in which state, and under which conflict rule.

**Assessment date:** 2026-07-29
**Assessor:** Codex using BMAD Implementation Readiness
