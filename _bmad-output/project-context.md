---
title: "Project Context: DocManSystem / RTMS"
project: "DocManSystem"
aliases:
  - "RTMS"
type: "project-context"
status: "active"
created: "2026-04-27T22:24:00+0700"
updated: "2026-06-16T00:00:00+0700"
inputs:
  - "/Users/Super/DocManS/_bmad-output/planning-artifacts/product-brief-DocManSystem.md"
  - "/Users/Super/DocManS/docs/ux-design-guidelines.md"
  - "/Users/Super/DocManS/_bmad-output/detaiHVQY.md"
audience:
  - "BMAD agents"
  - "AI coding agents"
scope: "Planning, architecture, story creation, development, testing, and review guidance"
---

# Project Overview

DocManSystem, also referred to as RTMS, is a greenfield internal web application for managing university-level research topics and scientific project workflows at the Military Medical Academy. Phase 1 is an internal institutional administration system, not a public SaaS product.

The system must prioritize operational clarity over novelty. Primary goals are process digitization, transparency, overdue visibility, controlled approvals, progress tracking, related-document traceability, council/ethics traceability, and executive reporting. The MVP primarily serves scientific management staff, leadership, principal investigators, and reviewer or council roles involved in evaluation workflows.

Core business modules in phase 1:

1. Research proposal intake and approval (OMS)
2. Approved project tracking
3. Seminar and student research tracking
4. Task management
5. Role-based executive dashboard and reports
6. Related-document management
7. Council and ethics management

Key operational scope inside those modules includes:

- intake periods, proposal submission, supplement requests, resubmission, evaluation assignment, scoring, summary, approval, and rejection
- approved-project progress milestones, periodic progress reports, adjustment requests, extensions, acceptance, and final review
- approved seminar and student research records, plans, related documents, adjustments, budget metadata, products, and outcomes
- researcher profiles with academic identity, unit, expertise, account linkage, participation history, and search/reporting support
- task assignment, reminders, overdue tracking, and completion monitoring
- related governing, legal, planning, proposal, project, seminar, and council documents with metadata, effective status, and version context
- council plans, member roles, ethics dossiers, completeness checks, scoring, consolidated evaluation, and approval routing
- executive dashboard views, filtered reporting, Excel export, PDF export, and traceable business history

# Technology Stack

- Frontend: Next.js, React, TypeScript
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache, queue, background jobs: Redis
- File storage: MinIO using S3-compatible APIs
- Styling: Tailwind CSS
- Charts: Recharts or Apache ECharts
- Excel export: ExcelJS
- PDF export: `pdfmake` or `Puppeteer`
- Reverse proxy: Nginx
- Deployment: Docker Compose

Default implementation bias:

- Prefer server-rendered or hybrid-rendered admin pages where appropriate in Next.js.
- Prefer typed API contracts and explicit DTO validation at service boundaries.
- Prefer simple operational infrastructure that fits a modular monolith.

# Architecture Constraints

- Phase 1 architecture is a modular monolith.
- Use one codebase with clear internal module boundaries.
- Do not introduce microservices.
- Do not introduce Kubernetes.
- Do not introduce Elasticsearch or OpenSearch unless explicitly approved later.
- Do not implement SSO, LDAP, OIDC, or MFA in phase 1.
- Architecture must remain extensible enough to support future identity integration later.
- Business logic belongs in backend domain services, not controllers.
- Use clear domain terms in module names, entities, DTOs, events, and permissions.
- Avoid speculative abstraction. Build only what current requirements and stories need.
- Keep infrastructure choices simple and explainable to future maintainers.

Recommended structural bias for future implementation:

- Separate frontend app and backend app if desired operationally, but keep them within one repository and one coordinated delivery unit.
- Model each major business area as an explicit domain module with its own DTOs, services, Prisma access patterns, authorization rules, and tests.
- Treat status transitions as explicit domain operations, not incidental field updates.

# Domain Modules

The phase 1 domain should be organized around these modules:

- `auth`
- `users`
- `roles`
- `organizations`
- `catalogs`
- `research-proposals`
- `proposal-intake-periods`
- `proposal-evaluations`
- `approvals`
- `approved-projects`
- `progress-milestones`
- `progress-reports`
- `adjustment-requests`
- `acceptance`
- `final-review`
- `seminars`
- `student-research`
- `related-documents`
- `councils`
- `ethics-dossiers`
- `council-evaluations`
- `researcher-profiles`
- `tasks`
- `notifications`
- `files`
- `audit-logs`
- `dashboard`
- `reports`

Module boundaries should be explicit. Avoid generic “system”, “common business”, or catch-all service layers that hide domain ownership.

Primary business roles to preserve across planning and implementation:

- system administrators
- scientific management staff
- leadership or approvers
- principal investigators
- project members
- reviewers
- council members

# Authorization And Security Rules

- Role-based authorization is mandatory.
- Data-scope authorization by unit or organization is mandatory.
- State-based authorization is required wherever business status affects allowed actions.
- Dashboard queries must always respect both role and data scope.
- Report exports, search results, and list views must always respect both role and data scope.
- Seminar, student research, related-document, council, ethics-dossier, and researcher-profile access must use the same backend-enforced role/scope/state rules as proposals and approved projects.
- File upload and download operations must always enforce permission checks.
- Never trust frontend authorization. The backend must enforce all permissions.
- Backend validation is mandatory and must not rely only on frontend validation.
- Use NestJS DTOs and validation pipes for input validation.
- Use least privilege by default for new endpoints, services, and file access flows.
- Sensitive actions must fail closed if authorization context is incomplete or ambiguous.
- Avoid leaking unauthorized records through search, dashboard totals, exports, logs, or file metadata.

Data-scope rules must be explicit in design and stories:

- users must be linked to organization or unit scope where applicable
- staff and leaders must only see proposals, projects, seminars, student research activities, related documents, councils, ethics dossiers, researcher profiles, tasks, dashboard items, and reports within their permitted scope unless granted broader authority
- cross-unit visibility must never be assumed; it must be granted by role and rule
- reviewer and council access should be constrained to assigned records and required context only

Phase 1 identity boundary:

- Local application authentication is acceptable for phase 1.
- Do not build external identity provider integrations in phase 1.
- Do not design phase 1 assumptions that make future SSO integration impossible.

# Audit Logging Rules

Every important business action must create an audit log. Audit logs are not optional metadata; they are part of core business accountability.

Mandatory audit-log actions:

- login
- logout
- change password
- initiate password reset
- complete password reset
- create
- update
- soft delete
- submit proposal
- request supplement
- resubmit proposal
- assign reviewer
- submit score and review comment
- approve
- reject
- register related document
- replace related document
- submit ethics dossier
- request ethics supplement
- assign council reviewer
- submit council score and comment
- update council decision
- create or update researcher profile
- link researcher profile to user account
- link researcher profile to business record
- create task
- assign task
- update task status
- upload important file
- download important file

Audit-log implementation rules:

- Capture actor, timestamp, action type, target entity, target entity id, and minimum useful context.
- Include before and after state when feasible for important updates.
- Do not log secrets, passwords, raw tokens, or unsafe sensitive payloads.
- Audit logs must be queryable enough to support business traceability and review.
- If a story adds a critical business action, the story must explicitly define whether an audit log is required.
- Audit logs should support timeline-style display in business detail screens when appropriate.

# File Management Rules

- All important business files must be linked to a domain record and a permission model.
- Upload and download must check authorization every time.
- Important files should preserve traceable metadata such as uploader, timestamp, type, related entity, and version context where relevant.
- Important file records should support soft delete where business records require recoverability.
- Do not allow file access by direct object key alone without permission enforcement.
- File validation must check allowed type, size, and required association rules.
- File replacement flows should preserve enough history for auditability where the business workflow requires it.
- Preview support is desirable for common file types when practical, but may not bypass permission checks.

## File Module Pull-Forward Rule

- Starting from ST-2.3A, all important business file upload, metadata view, download, replace, and delete flows must go through the shared `files` module.
- Domain modules may define business meaning and permission policy for their records, but must not directly access MinIO.
- MinIO object keys are internal implementation details and must not be used as authorization tokens or exposed as direct access paths.
- PostgreSQL stores file metadata; MinIO stores file binary content.
- File access must always enforce backend authorization based on actor, role, organization/data scope, related entity, and workflow state where applicable.
- File actions must create audit logs when they are business-important.
- New modules that need file attachments must integrate with the shared files module instead of adding separate upload implementations.

# Notification And Reminder Rules

- Notifications are part of phase 1 scope and should not be treated as optional polish.
- Support in-app notifications for important business events.
- Support email notifications for important business events where specified in requirements.
- Reminder workflows must cover approaching deadlines, overdue tasks, overdue reports, supplement requests, new evaluation assignments, approval requests, seminar or student research milestones, council or ethics review deadlines, document effective-date checks where relevant, and relevant state changes.
- Notification delivery must respect role, data scope, and record-level permissions.
- Background reminder jobs should be idempotent and safe to retry.
- Notification templates and trigger rules should be configurable at a simple administrative level where practical, without introducing a workflow engine.
- Dashboard urgency, reminders, and notifications must remain consistent with underlying business state.

# UX/UI Rules

- Use an institutional admin dashboard style.
- The product must feel official, professional, academic, and suitable for the Military Medical Academy context.
- Primary color should be dark green.
- Prefer `#145A37` as the primary color and `#0F3F2A` for darker navigation surfaces unless later design-system decisions override within the same visual direction.
- Use white and light gray-green surfaces.
- Use gold only as a restrained accent.
- Prefer the documented light neutral surfaces and restrained border-driven visual hierarchy over heavy shadows.
- Avoid startup SaaS styling, heavy gradients, glassmorphism, emoji icons, large hero banners, and decorative illustrations.
- Desktop layout should use sidebar navigation.
- Mobile and tablet layouts should convert sidebar behavior into drawer, compact navigation, or equivalent constrained navigation.
- Topbar should preserve quick access to search, notifications, account context, and current role.
- Breadcrumbs are required on important detail screens.
- Mobile and tablet responsive behavior is mandatory from the start.
- Important screens must support `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`.
- Prefer tables on desktop and card lists or contained horizontal scrolling on mobile.
- Do not allow full-page horizontal scrolling on mobile.
- Forms must use clear sections, inline validation, loading states, success states, and error states.
- Long forms should be designed for section clarity and may require sticky action bars on mobile for primary actions.
- Important actions such as submit, approve, reject, request supplement, and delete must require confirmation.
- Status must never rely on color alone; always pair status color with text labels or icons.
- Accessibility target is WCAG AA for core workflows.
- The UI should prioritize tasks to be handled, business status visibility, and decision support before visual decoration.
- Typography should stay in a practical sans-serif family, preferably aligned with the academy website if one already exists.
- Use one consistent icon set such as Lucide or Heroicons.
- Avoid repeating institutional logos or ceremonial imagery across business screens.

# Data And State-Management Rules

- Proposal status and approved-project status must be modeled as controlled state machines.
- Status transitions must happen through explicit domain operations, not arbitrary field edits.
- Task status and key approval-related statuses should also be treated as controlled state flows where business logic depends on them.
- Seminar/student research statuses, related-document lifecycle states, council statuses, and ethics-dossier statuses must be modeled as controlled states wherever business rules depend on them.
- Researcher profile active/inactive status and important participation links must be changed through explicit operations where auditability matters.
- Soft delete should be used for important business records where recovery and traceability matter.
- Do not change database schema without a Prisma migration.
- Use Prisma migrations for all schema changes.
- Database naming, Prisma models, DTOs, and service names must use clear domain language.
- Avoid duplicating source-of-truth state across modules unless synchronization rules are explicit.
- Dashboard and reporting aggregates must be derived with the current user’s authorization and data scope in mind.
- Background jobs that send reminders or compute derived reporting data must remain idempotent where practical.
- Important business screens should expose timeline or history views where state progression and accountability matter.

# Testing Rules

- Every story must include acceptance criteria.
- Every story must include automated tests or explicit manual verification steps.
- Authorization behavior must be tested or manually verified.
- Audit-log behavior must be tested or manually verified.
- File permission behavior must be tested or manually verified.
- Notification and reminder behavior must be tested or manually verified when a story affects triggers, recipients, or delivery rules.
- State transition behavior must be tested or manually verified for affected modules.
- Export behavior should be tested or manually verified when a story affects Excel or PDF output.
- Responsive behavior must be tested or manually verified for affected primary screens at the required breakpoints.
- Accessibility essentials such as labels, focus visibility, keyboard reachability, and error feedback must be tested or manually verified for affected flows.
- Tests should stay scoped to the story and its direct risks.
- Do not merge or finalize stories without a smallest reliable verification path.

# Story Implementation Rules

- TypeScript strict mode is expected.
- Avoid `any` unless justified in code comments.
- Keep controllers thin and move business rules into backend services.
- Keep frontend components reusable but not over-abstracted.
- Each story should be small, testable, reviewable, and scoped to one coherent outcome.
- Do not implement features outside the current story scope.
- Do not refactor unrelated code during a story unless explicitly required.
- Prefer simple designs that fully satisfy current business needs.
- If a story touches authorization, audit logs, state transitions, files, or schema changes, those concerns must be addressed explicitly in implementation and review notes.
- If a story touches notifications, reminders, dashboards, reports, or exports, those concerns must be addressed explicitly in implementation and review notes.

# Do Not Rules

- Do not introduce microservices.
- Do not introduce Kubernetes.
- Do not introduce Elasticsearch or OpenSearch without explicit approval.
- Do not add SSO, LDAP, OIDC, or MFA in phase 1.
- Do not bypass backend validation.
- Do not trust frontend-only permission checks.
- Do not update important business records with hard delete by default.
- Do not treat status fields as free-form values.
- Do not expose dashboard data outside the current user’s role and organization scope.
- Do not expose report exports, search results, file metadata, related-document metadata, council records, ethics dossiers, or notification content outside the current user’s scope.
- Do not add features beyond the active story.
- Do not over-engineer shared abstractions before repeated need is proven.
- Do not modify database schema without a Prisma migration.
- Do not ship file access flows without authorization enforcement and traceability.
- Do not treat notifications or reminders as purely frontend behavior when business correctness depends on backend state.

# Review Checklist For Future Agents

Use this checklist during PRD writing, architecture, story drafting, implementation, testing, and code review:

- Does the work stay within phase 1 modular monolith constraints?
- Does it preserve clear domain boundaries and use domain-specific names?
- Does it enforce role-based, organization-scope, and state-based authorization where applicable?
- Does it ensure dashboard and reporting data respect current-user scope?
- Does it preserve notification and reminder behavior that matches business deadlines and state changes?
- Does it create required audit logs for the business actions it introduces or changes?
- Does it enforce file permissions for upload and download flows?
- Does it model proposal and project statuses as controlled transitions?
- Does it also model task, seminar/student research, related-document, council/ethics, and approval-related statuses explicitly where needed?
- Does it use backend validation with DTOs and validation pipes?
- Does every schema change include a Prisma migration?
- Does the UI remain consistent with the institutional dashboard style and responsive breakpoints?
- Does the UI preserve breadcrumb, search, notification, and action-priority patterns from the context?
- Does the UI avoid decorative patterns that conflict with the academy context?
- Does the UI preserve accessibility basics including labels, focus states, semantic controls, and readable status communication?
- Does the work include tests or explicit manual verification steps?
- Does the work avoid scope creep and over-implementation beyond the story?
