# DocManS UX/UI Specification

**Status:** Implementation-ready product specification
**Scope:** Phase 1 responsive web application
**Audience:** Product, UX/UI, frontend, backend, QA, and implementation agents
**Updated:** 2026-08-30

This document defines how DocManS should work at the interface level. It is a
behavioral and implementation contract, not a React component implementation or
a visual-only mockup.

## 0. Source of truth and implementation boundaries

The following sources were inspected before writing this specification:

- [`requirements.md`](../requirements.md)
- [`users.md`](../users.md)
- [`docs/authorization-core-business-baseline.md`](authorization-core-business-baseline.md)
- [`_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`](../_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md)
- [`docs/user-flows.md`](user-flows.md)
- [`docs/ux-design-guidelines.md`](ux-design-guidelines.md)
- [`_bmad-output/user-interface-workspaces-docmansystem.md`](../_bmad-output/user-interface-workspaces-docmansystem.md)
- [`README.md`](../README.md)
- Existing web shell, routes, shared UI components, status metadata, UI tokens,
  and proposal/review panels under `apps/web/src`.

When this document conflicts with a business or authorization rule, the
authorization baseline and technical authorization contract win. The UI never
grants permission; it only renders the backend capability response.

### Current implementation baseline

The web application already has a Next.js app shell, role-based navigation for
four implemented roles, proposal list/detail/review/decision panels, account
administration panels, responsive list patterns, shared status badges, KPI
cards, filters, breadcrumbs, timelines, and UI tokens. The target UX must reuse
those patterns.

The product baseline contains five active system roles:

| System role | UI meaning |
| --- | --- |
| `SYSTEM_ADMIN` | Platform foundation administration only |
| `SCIENTIFIC_MANAGEMENT_STAFF` | Academy-wide scientific operations within policy and workflow |
| `LEADERSHIP_APPROVAL_AUTHORITY` | Decision work for records presented within authority scope |
| `RESEARCHER_INTERNAL_USER` | Researcher-owned and related records |
| `EXTERNAL_RESEARCHER_USER` | Only explicitly related records and assigned draft/review work |

PI, project member, scientific secretary, reviewer, council member, ethics
reviewer, and task assignee are record-scoped relationships or assignments, not
additional global roles. A user may have one system role and several different
record relationships at the same time.

The current frontend fixture/navigation layer does not yet represent every
baseline role or every business module. Frontend synchronization, API coverage,
fixtures, and tests are implementation work derived from this specification;
this document does not silently redefine that gap.

The current architecture is Browser → Next.js Web App → NestJS API →
PostgreSQL/Prisma and private MinIO. The browser never accesses PostgreSQL or
MinIO directly. Reminders and overdue checks use the PostgreSQL-backed
Scheduled Job / Background Worker. Redis is not part of the current
implementation and is intentionally not required by this specification.

## 1. Product UX goals

### 1.1 Main users and outcomes

| User | Must accomplish quickly |
| --- | --- |
| System administrator | Maintain accounts, one active system role per account, organization scope, catalogs, configuration, and operational audit views without gaining implicit business-data access. |
| Scientific management staff | Open/close intake periods, check completeness, request supplements, assign reviewers after conflict checks, monitor evaluations, consolidate results, create approved projects, track reports, and produce scoped reports. |
| Leadership / approval authority | See only decision-ready records, understand evidence and history quickly, approve or reject with the required reason, and monitor high-level operational risk. |
| Principal investigator / internal researcher | Create a draft, complete required sections, upload evidence, submit, respond to supplements, track an approved project, submit reports, and request adjustments or acceptance. |
| Project member | See only related project information, responsibilities, permitted files, milestones, tasks, and contribution evidence. |
| Reviewer / committee member | Work from assigned records only, read the permitted review package, complete a structured score form, submit once, and see submission status without seeing unrelated reviews. |
| External researcher | Contribute only to assigned draft sections or assigned review work; never create or submit a proposal or change protected fields. |

### 1.2 Definition of good UX

Good UX in DocManS means that a user can answer these questions on every
protected record without guessing:

1. What is this record and what is its current state?
2. What is my relationship or assignment to it?
3. What can I do now, and what is the next valid action?
4. Who is waiting for whom, and what is the due date?
5. Which version, file, review, or decision is authoritative?
6. What was changed, by whom, and when?

The interface prioritizes clarity, traceability, role-aware actions, low
cognitive load, safe permission/file handling, and short paths to the next
valid business action.

### 1.3 Product principles

- **State before decoration:** status, owner, due date, next action, and risk are
  visible before secondary metadata.
- **Explain the boundary:** a blocked action is shown with a plain-language
  reason when the record itself is already visible; unauthorized records remain
  undiscoverable.
- **One workspace, contextual authority:** navigation follows the system role;
  actions inside a record follow relationships, assignment, workflow state,
  delegation, scope, and conflict policy.
- **Version-safe editing:** submitted versions, reviews, decisions, and
  assessment files are not overwritten.
- **Trace every consequential action:** important actions end with a visible
  result and an audit event.
- **Progressive disclosure:** show an operational summary first, then details,
  evidence, history, and audit context in stable sections or tabs.
- **Data density without noise:** tables and queues are compact, scannable, and
  filterable; cards are used where mobile readability requires them.
- **Backend is authoritative:** UI capability data is advisory and must be
  rechecked by the API at mutation time.

## 2. Information architecture and sitemap

### 2.1 App-level sitemap

```text
Authentication
├── Login
├── Change password
└── Controlled password reset

Dashboard and My Work
├── Role-aware dashboard
├── My work / personal queue
├── Notifications
└── Global search

Research proposals / OMS
├── Intake periods
├── Proposal list
├── Proposal detail workspace
├── Create/edit proposal
├── Submit confirmation
├── Supplement request
├── Staff completeness check
├── Reviewer assignment
├── Reviewer evaluation
├── Result aggregation
└── Leadership decision

Approved projects
├── Project list / tracking overview
├── Project detail
├── Progress milestones
├── Periodic reports
├── Adjustment / extension requests
├── Acceptance / final review
└── Related tasks and files

Tasks
├── Task list
├── Task detail
└── Create/edit task

Files and records
├── File upload
├── File preview/download
├── File version history
├── Related documents
└── Activity / business history

Search and reports
├── Global search results
├── Report catalog
├── Report parameters and preview
└── Export history / result

Administration
├── Users and accounts
├── Roles and permission policy
├── Organization units and scope
├── Catalogs
├── System settings and notification templates
└── Audit log
```

### 2.2 Navigation rules

- Sidebar items are filtered by the active system role and backend-supported
  module capabilities.
- The sidebar never acts as the only security boundary. Direct route access
  still receives an authorization-scoped response.
- `My Work` is available to every authenticated user, including leadership and
  users who are also PI/member/reviewer on individual records.
- A record may appear in several contextual queues, but its detail page is one
  canonical workspace.
- Detail pages always expose a breadcrumb back to the filtered list or queue
  that opened them.
- Do not create a “switch role” control. The user does not choose which role to
  impersonate. The record displays the viewer's resolved relationships.

## 3. Screen inventory

### 3.1 Shared screen contract

Every authenticated screen has these regions, in this order:

1. Breadcrumb, where a parent context exists.
2. Eyebrow/module label and page title.
3. One-sentence purpose or current scope.
4. Primary action area, only for actions returned as allowed.
5. Search/filter region where the screen is a list or queue.
6. Main data region.
7. Stable loading, empty, error, and permission states.

Every protected API response used by a screen should provide, as applicable,
`allowedActions`, `blockedActions` with canonical code/reason, viewer
relationships, `contextVersion`, `evaluatedAsOf`, and the minimum disclosed
data. The UI must retain the context version for mutations and ask the user to
refresh after `CONTEXT_VERSION_MISMATCH`.

### 3.2 Authentication and account screens

| Screen / route | Roles | Purpose and data | Actions and states | Validation and API needs |
| --- | --- | --- | --- | --- |
| Login `/login` | Unauthenticated | Username, password, institutional identity message, session protection note. | Submit; show loading without duplicate submit; invalid credentials as a generic error; locked/inactive account as a safe account-state message; API/network error with retry. | Required username/password, no paste blocking, no secret in URL/logs. `POST /auth/login`; return safe session/account context and audit login. |
| Change password `/change-password` | Authenticated | Current password, new password, confirmation, password policy hint. | Save; clear success state; keep form on failure; expired session returns to login with a reason. | Current password required; new password policy; confirmation match; do not reveal which credential check failed. `POST /auth/change-password`; audit success/failure as policy permits. |
| Controlled reset `/password-reset` | User with administrator-issued reset context | Reset token/code, new password, confirmation, expiry notice. | Submit once; expired/used token is terminal with support route; success routes to login. | Token never displayed after submission; password policy and match. `POST /auth/password-reset`; audit initiation and completion; no public self-registration. |

### 3.3 Dashboard and work screens

| Screen / route | Roles | Purpose and data | Actions and states | Validation and API needs |
| --- | --- | --- | --- | --- |
| Role-aware dashboard `/dashboard` | All authenticated roles | KPI cards, urgent queue, upcoming/overdue items, relevant charts, and quick actions. Every card is scoped and drillable. | Open the filtered source list; quick-create only when allowed; refresh. Empty dashboard says there are no items in the current scope, not that the system has no data. | No client-side counts; `GET /dashboard?asOf=...` returns scoped cards, queues, allowed drill-down routes, and disclosure-safe labels. |
| My Work `/my-work` | All authenticated roles | Owned proposals/projects, participations, assignments, tasks, reports, and action-needed entries with relationship label, status, due date, route, and target action. | Open item; perform allowed action; blocked entries remain visible only when the record label is already authorized, with reason. | Backend de-duplicates and orders entries; no client merging of unauthorized lists. `GET /me/work`; fail whole response on unresolved source context. |
| Notifications `/notifications` | All authenticated roles | In-app workflow events, assignment, supplement, decision, deadline and overdue notices. | Open related record; mark read only if supported by contract; filter unread/type/date. | Notification does not grant access and contains minimum disclosure. `GET /notifications`; record opening rechecks authorization. |

### 3.4 Proposal intake, review, and decision screens

| Screen / route | Roles | Purpose and main data | Empty/loading/error/denied behavior; actions | Validation and API needs |
| --- | --- | --- | --- | --- |
| Intake periods `/intakes` | Staff; assigned scientific secretary | Intake name/code, dates, scope, required package, status, proposal count, deadline flags. | Staff creates/edits/opens/closes within policy. Empty state offers “Tạo đợt tiếp nhận” only when allowed. Closed intake is read-only for configuration and blocks new proposals. | Start < end; scope is Academy-wide or explicit units; required package non-empty. `GET/POST/PATCH /proposal-intake-periods`; state changes are explicit and audited. |
| Proposal list `/proposals` and `/my-proposals` | Staff, authorized secretaries, internal researchers, related participants | Code, title, PI, managing unit, field, intake, status, submitted date, due/risk flag, viewer relationship. | Filters persist in URL; list skeleton matches table; no-results distinguishes “no matches” from “no accessible records”; denied detail is not revealed. Staff can create/manage; PI can create only when an applicable intake exists; external cannot create. | Search/filter/sort are server-side and authorization-scoped. `GET /research-proposals`; counts/facets use the same scope. |
| Proposal detail `/proposals/:id` | Authorized viewer by relationship/assignment/scope | Header: code/title/status, managing unit, PI, intake, due flag, viewer relationship, next action. Sections: summary, participants, timeline, files, workflow actions, reviews/decision according to disclosure. | Loading skeleton; not-found and unauthorized use a safe response; stale context offers refresh; forbidden action remains disabled with reason when the record is visible. | `GET /research-proposals/:id` returns disclosure-filtered detail, capability response, version token, history, and allowed tabs. |
| Create/edit proposal `/proposals/new`, `/proposals/:id/edit` | Internal PI; delegated submitter only for eligible submit action; assigned external/member for assigned draft sections | Sectioned form: intake, title/type/field, managing unit, PI/members, dates, objectives/content, budget metadata, required files, readiness summary. | Save draft at any time when allowed; section completion indicators; submitted/locked version opens read-only; external sees only assigned fields; conflict or scope denial is explained. | Required fields and files; date range; non-negative budget; member/account uniqueness; PI cannot be changed by external/member. `POST/PATCH /research-proposals/:id`; backend validation and draft audit. |
| Submit confirmation `/proposals/:id/submit` | PI or valid `proposal.submit` delegate | Final readiness checklist, version number, intake deadline, file summary, responsibility statement, immutable-version warning. | Confirm submit; cancel returns to edit; success shows timestamp and next state; failure keeps draft and lists correctable issues. | Readiness is backend-calculated. `POST /research-proposals/:id/submit` with context token; audit actor and delegation context; no direct status PATCH. |
| Supplement request `/proposals/:id/supplement` | Staff or assigned secretary | Locked proposal snapshot, missing items, reason, response due date, instructions, prior requests. | Save/send request only while requestable; sent request becomes immutable history; empty state is not applicable. | Reason and due date required; due date must be future and within policy. `POST /research-proposals/:id/supplement-requests`; status becomes `supplement_requested` only through domain operation. |
| Staff check `/proposals/:id/check` | Staff or assigned secretary | Completeness checklist, field/file evidence, eligibility/readiness result, warnings, reviewer readiness, previous supplement history. | Mark complete/eligible or request supplement; each failed item has a correction path; conflict and stale context disable mutation. | Checklist version, required package, and decision are backend-owned. `GET /checks`, `POST /checks/complete`, `POST /supplement-requests`; audit result and reason. |
| Reviewer assignment `/proposals/:id/assignments` | Staff with assignment authority | Candidate researcher profile, assignment role, conflict result, effective dates, deadline, current assignments, assignment history. | Search candidate; run conflict check; assign, change, revoke, or complete assignment where allowed. Conflict result blocks assign and displays safe reason; never reveals protected conflict source to the wrong audience. | Candidate must be active and in permitted scope; no PI/member/conflicted reviewer; dates valid; assignment deadline valid. `GET /assignable-reviewers`, `POST/PATCH /review-assignments`; audit all changes. |
| Reviewer evaluation `/reviews/:assignmentId` | Assigned reviewer/council member/ethics reviewer for own assignment | Authorized review package, rubric criteria, score inputs, total, comment, recommendation, due date, assignment status. | Save draft; submit once; after submit fields lock and a correction creates a controlled new review version if policy permits. Reviewer cannot see another review or consolidation. | Score within criterion range; all required criteria; comment/recommendation requirements; submit confirmation. `GET/PATCH/POST /review-assignments/:id/evaluation`; audit draft/submit and lock version. |
| Result aggregation `/proposals/:id/aggregation` | Staff | Submitted-review count, expected count, allowed review material, calculated totals, missing/late reviews, staff summary, recommendation, readiness for leadership. | Save aggregation while consolidatable; mark ready only when required reviews/conditions pass; no raw review data shown to unauthorized viewers. | No manual total outside backend calculation; summary required; all assignment/context versions checked. `GET/PATCH/POST /aggregations`; transition to `ready_for_approval` is explicit and audited. |
| Leadership decision `/proposals/:id/decision` | Leadership authority with eligible decision capability | Decision package: proposal snapshot, evaluation summary, permitted reviews, files, workflow timeline, conflict indicator, current status. | Approve or reject with confirmation. Reject requires reason. Conflict or wrong state leaves buttons visible but disabled with reason. Success shows decision and routes to read-only detail. | Decision only in `ready_for_approval`; no content editing; reject note required; backend rechecks state, conflict, scope, and version. `GET /decision-package`; `POST /decisions`; audit decision. |

### 3.5 Approved project and tracking screens

| Screen / route | Roles | Purpose and main data | States and actions | Validation and API needs |
| --- | --- | --- | --- | --- |
| Project tracking overview `/projects` and `/my-projects` | Staff, leadership within scope, PI, members, secretary | Project code/source proposal, PI, unit, state, completion %, next milestone/report, risk flags, overdue flags, viewer relationship. | Staff creates/confirm project from an approved proposal; PI/member opens related projects; leadership sees authorized summaries. No automatic project creation after approval. | Server-side filters and derived risk flags. `GET /approved-projects`; `POST /approved-projects/from-proposal/:id` with explicit confirmation and audit. |
| Project detail `/projects/:id` | Authorized participant/staff/authority | Project summary, source proposal link, participants, milestones, reports, adjustment/extension, acceptance, tasks, files, timeline. | Read/write sections are individually capability-controlled. Unauthorized tabs are omitted; visible blocked actions explain why. | `GET /approved-projects/:id` returns disclosure-scoped tabs and capability data; mutation uses aggregate version. |
| Progress milestones `/projects/:id/milestones` | Staff; project PI/secretary/member where assigned | Planned milestone, owner, target date, completion %, evidence, dependency, actual date, status/risk. | Add/edit only in permitted project state and relationship; overdue is a flag and reminder, not an automatic workflow transition. | Date ordering; completion 0–100; owner must be related/authorized; evidence linked through files module. `GET/POST/PATCH /milestones`; audit changes. |
| Periodic reports `/projects/:id/reports` | PI, authorized delegate, staff, leadership review authority | Reporting period, due date, progress, difficulties, outputs, evidence, readiness, review outcome. | PI saves draft/submits; staff reviews and requests follow-up; leadership decides only when workflow requires it. Submitted report version locks. | Period must belong to project and not overlap; required fields/files; submit confirmation. `GET/POST/PATCH /progress-reports`; explicit review/follow-up operations and audit. |
| Adjustment/extension `/projects/:id/adjustments` | PI submits; staff assesses; leadership decides when required | Request type, affected milestones/budget/time, rationale, evidence, assessment, decision status. | PI can draft/submit; staff can assess; authority action is separate. Approved request updates the project only through domain operation. | Rationale and impact required; extension end date after current end; no direct project mutation from form. `POST /adjustment-requests`, staff assessment and authority decision endpoints; audit. |
| Acceptance/final review `/projects/:id/acceptance` | PI submits; staff prepares; assigned panel/reviewer evaluates; leadership decides when required | Final outputs, acceptance dossier checklist, evidence, assigned evaluation, aggregate result, decision. | Readiness check precedes submit; assigned evaluator sees only package; submitted dossier locks; failed/incomplete dossier shows correction list. | Required final files/fields; all assigned evaluations before aggregation; conflict and disclosure rules match proposal review. `GET/POST /acceptance`; assignment/evaluation/aggregation/decision operations are separate. |

### 3.6 Task, file, search, report, and administration screens

| Screen / route | Roles | Purpose and main data | States and actions | Validation and API needs |
| --- | --- | --- | --- | --- |
| Task list `/tasks` or `/my-tasks` | Authorized task creators, assignees, staff, leadership summaries | Task code/title, linked record, assignee, priority, due date, progress, status, risk. | Filter by state/priority/assignee/due date; create when allowed; assignee updates own task/evidence; overdue is visible and does not auto-close or alter the linked business workflow. | `GET /tasks` uses linked-record authorization too; counts/export are scoped. Pagination and stable sort required. |
| Task detail `/tasks/:id` | Authorized linked-record viewer or assignee | Description, linked record, owner/collaborators, due date, status, progress, notes, evidence, history. | Update only allowed fields; linked-record permission is never exceeded by task permission; cancel/complete requires confirmation where policy says so. | State transition endpoint, optimistic concurrency token, evidence through files module, audit create/assign/status/evidence. |
| Create/edit task `/tasks/new`, `/tasks/:id/edit` | Authorized creator/manager; assignee for permitted fields | Title, linked record/event, owner, collaborators, priority, dates, description, checklist/evidence. | Save draft/create; edit allowed fields by role; deleted/cancelled tasks remain traceable. | Title, due date, valid linked-record reference, assignee relation, priority enum. `POST/PATCH /tasks`; backend authorization and audit. |
| File upload and history `/records/:id/files` | Record-authorized users; upload/replace/delete only when capability allows | File type/name, size, uploader, timestamp, version, record section, preview/download action, scan/upload status. | Upload progress; retry failed upload; preview/download is a fresh authorized request; replace creates a new version; soft delete only where allowed; no direct object URL. | Extension/MIME/size, required association, safe filename, malware/content scan outcome as supported. `POST /files`, `GET /files/:id/download`, `POST /files/:id/replace`; MinIO is private and API-enforced. |
| Global search `/search` | All authenticated users, scoped results | Tabs for proposals, projects, tasks, reports, seminars/student research, councils, documents; code/title/person/unit/status/date facets. | Search-as-submit or debounced with cancellation; empty result distinguishes no match; hidden records never appear in count/facet/suggestion. | `GET /search` with server-side authorization, same `asOf`, facets, cursor/page; export uses same query scope. |
| Reports `/reports` | Staff and leadership per report capability; admin only if explicitly granted | Report catalog, parameters, scoped preview, chart/table, applied filters, generation/export status. | Required filters before generation; no data preview while unauthorized; Excel/PDF generation shows progress and result; export errors are retryable. | `GET /reports`, `POST /reports/:id/run`, export endpoint with policy/version/filter snapshot; audit export. |
| Users `/users` | System admin | Account, name, active state, locked state, one active system role, unit/scope, linked researcher profile. | Create/update/activate/deactivate/lock/reset; role/scope change requires confirmation and impact warning. Admin does not see business records merely by opening this screen. | Unique username, exactly one active role, valid scope, account/profile link constraints. `GET/POST/PATCH /admin/users`; audit all changes. |
| Roles and permissions `/roles` | System admin; read-only policy view for authorized operators | Canonical roles, capabilities, scopes, non-delegable actions, policy version; record relationships are explained separately. | Edit only platform policy settings supported by backend; no ad hoc wildcard permission; show effective date/version. | Unknown role/action cannot be guessed by client. `GET/PATCH /admin/roles` only if policy allows; every policy change is versioned/audited. |
| Catalogs `/catalogs` | System admin; delegated staff read/use as needed | Units, fields, proposal types, priorities, report/product types, forms, checklists, score criteria, statuses. | Create/update/activate/deactivate; historical values remain resolvable for old records; destructive actions are soft and warned. | Code uniqueness, label required, no deactivation if referenced without replacement policy. `GET/POST/PATCH /admin/catalogs`; version history and audit. |
| Audit log `/system-logs` | System admin and explicitly authorized audit viewers | Actor, UTC timestamp, target, action, outcome/decision code, correlation ID, redacted before/after, policy/context versions. | Filter by actor/action/module/date/result; open safe event detail; no secret/raw token/conflict-source leakage; immutable read-only view. | `GET /audit-logs` with audit-view authorization, pagination, stable cursor, redaction policy, and export only if allowed. |

## 4. Role-based dashboard design

Dashboard data must be generated by backend-scoped queries. A KPI is not valid
if its numerator, denominator, drill-down, export, or tooltip includes a record
the viewer cannot access.

| Dashboard persona | KPI cards | Work queue and alerts | Quick actions and summaries | Hide/prohibit |
| --- | --- | --- | --- | --- |
| System administrator | Active/locked accounts, pending account changes, catalog/config warnings, audit review queue. | Incomplete account scope, pending activation, failed notification/configuration checks, audit anomalies if authorized. | Manage users, roles, units, catalogs, settings, audit. Small trend of platform operations only. | Proposal/project content, reviewer identity, scores, approval queues, and business data by default. |
| Scientific management staff | New submissions, pending checks, supplements awaiting response, reviews pending/overdue, ready for approval, delayed projects, reports due. | Prioritize by due date and risk: submitted checks, missing reviewer submissions, aggregation, overdue milestones/reports, adjustment/acceptance preparation. | Open intake, proposal queue, assignment queue, create project from approved proposal, open reports, run operational report. Pipeline summary by intake/unit/field within staff business scope. | Final approval action unless separate authority is returned; conflict source and undisclosed review material outside policy. |
| Leadership | Ready-for-decision records, overdue decision queue, delayed projects, reports/acceptance needing authority, high-priority risks. | Decision queue with due date, evidence completeness, conflict indicator, previous decision history; alerts are concise and action-oriented. | Open decision package, approve/reject eligible record, open scoped executive report. Trend by unit/field/status/time. | Editing proposal content, assigning reviewers, raw data outside decision disclosure, records not in approval scope, conflicted records. |
| Principal investigator / internal researcher | Drafts, submitted proposals, supplement requests, active projects, reports due, tasks due/overdue. | “Cần tôi xử lý”: incomplete draft, response deadline, report deadline, adjustment/acceptance request status, assigned tasks. | Create draft when intake allows, open my proposals, submit supplement, submit report, open my tasks. Progress summaries for owned/related projects. | Unrelated proposals/projects, reviewer identity/raw review material before disclosure, staff-only aggregation, decision controls. |
| Project member | Related projects, assigned milestones, assigned tasks, evidence awaiting upload, contribution deadlines. | Tasks and evidence explicitly assigned to the member; project alerts only at permitted disclosure level. | Open assigned project section, update task, upload permitted evidence. | PI-only submission controls, membership changes, protected files, unrelated records, final decisions. |
| Reviewer / committee member | Assigned evaluations, due/overdue reviews, draft evaluations, upcoming council sessions if assigned. | Assignment queue sorted by due date and status; show “đã gửi” and “đang soạn”. | Open assigned review package, save draft, submit evaluation. | Unassigned records, other reviewers' scores/comments, aggregation, leadership decision, conflict source. |

All dashboards include a scope line in the header, a last-evaluated timestamp
when useful, and a link to the source list. A no-data state says “Không có dữ
liệu trong phạm vi hiện tại” rather than implying the system is empty.

## 5. Core layout and navigation

### 5.1 App shell

- **Desktop (≥1024px):** dark-green sidebar, main content pane, topbar, and
  optional contextual right panel on record workspaces.
- **Tablet (768–1023px):** compact or collapsible sidebar; preserve topbar
  search, notifications, account context, and current role.
- **Mobile (360–767px):** sidebar becomes a drawer opened by a labeled menu
  button. Long forms and decision packages are full-screen pages or bottom
  sheets, not narrow dialogs.
- Background is `#F7FAF8`; panels are white with restrained borders. Use the
  existing `packages/ui-tokens` palette: primary `#145A37`, dark `#0F3F2A`, soft
  `#EAF5EF`, gold `#D6A51E`, text `#10251B`/`#52665A`, border `#DDE8E1`.
- Border-driven hierarchy is preferred over heavy shadows. Border radius should
  remain small, normally no more than 8px.

### 5.2 Sidebar

The sidebar groups navigation by job rather than exposing every domain object:

- Dashboard / My Work
- Proposals / Intake / Review (staff)
- Approvals (leadership)
- Projects / Reports / Tasks
- Researcher profiles and administration where authorized
- Search, notifications, reports, and audit

The active item has text, icon, and visible state; icons are never the sole
label. Badge counts are scoped actionable counts, not raw database totals.

### 5.3 Header and page composition

The topbar contains, in order of priority: menu, institutional identity,
global search, notifications, current account name, current system role, unit
scope, change-password, and logout. The current system role must not be shown as
the viewer's role on the current record.

Record pages use:

1. Breadcrumb.
2. Record title/code and status badge.
3. Viewer relationship badge and scope/context line.
4. Next-action strip with capability-aware actions.
5. Summary grid.
6. Tabs or sections: overview, participants, workflow, files, related records,
   history/audit, and role-specific work.

The optional right panel is reserved for “what needs attention”: next action,
due date, blocked reason, checklist progress, and related task. It must not be
the only place where a critical decision or audit history can be found.

### 5.4 Filters and responsive behavior

- Desktop filters are inline above a table; applied filters appear as removable
  chips.
- Mobile filters open in a labeled drawer/bottom sheet with **Apply** and
  **Clear**; the current filter summary remains visible on the list.
- Desktop tables become card lists on mobile. If a table must scroll, scrolling
  is contained inside the table region; the page itself never gains horizontal
  scrolling.
- Minimum mobile target size is approximately 44px. Sticky action bars must not
  cover content or the focused field.
- Test the key surfaces at `360`, `390`, `430`, `768`, `1024`, and `1440px`.

## 6. Reusable component specification

The existing shared components (`PageHeader`, `FilterBar`, `KpiCard`,
`StatusBadge`, `Timeline`, `AlertList`, `EmptyState`, `SectionCard`,
`Breadcrumb`, and `ParticipationBadge`) are the starting vocabulary. New
components should extend these patterns only when a repeated need exists.

| Component | Purpose / use | Required states and behavior | Accessibility and security |
| --- | --- | --- | --- |
| Data table | Dense desktop list for proposals, projects, tasks, users, reports, audit. | Loading skeleton, empty, error, pagination, selected row, sort, responsive card alternative; row click is not the only action. | Semantic table headers, keyboard row actions, accessible sort labels; rows and counts come from scoped API only. |
| Filter bar | Keyword, select, date, status, unit, assignee, intake filters on lists. | Draft filter values, applied values, clear-all, loading, invalid date range, mobile drawer. | Labels for every control; URL/deep-link state; filters never widen backend scope. |
| Search input | Global and local record search. | Idle, typing, debounced/loading, no results, error, clear, keyboard submit. | `type=search`, accessible name, live result count; suggestions omit unauthorized records. |
| Status badge | State text plus icon/tone on every record. | Known status, unknown status fallback, overdue/risk overlay, compact mobile. | Text and icon, never color alone; unknown status is a visible safe fallback, not guessed. |
| Permission-aware action button | Primary workflow action. | Allowed, loading, success, disabled with reason, stale-context retry. | Native button, reason in adjacent text or described-by; backend rechecks every mutation. |
| Action menu | Secondary actions such as history, export, request, soft delete. | Open/close, disabled item with reason where appropriate, destructive confirmation. | Keyboard menu semantics; hidden items are only hidden when disclosure/security requires it. |
| Form section | Groups long proposal/project/report/task fields. | Expanded/collapsed, complete/incomplete, locked/read-only, field errors, server error. | Heading hierarchy, labels, error association, no paste blocking; fields disabled based on field capability, not just role. |
| Stepper | Proposal lifecycle/readiness or dossier progress. | Current, completed, blocked, skipped/not applicable; clicking completed step preserves context. | State text plus icon; announces current step; do not imply a transition occurred until backend confirms. |
| File upload | Attach required/supporting/evidence files through shared files module. | Idle, selecting, validating, uploading, scanning, success, retryable failure, rejected, locked version. | Keyboard and touch upload; filename/size/type announced; no direct MinIO URL; permission check on upload and download. |
| File preview/download row | Show safe file metadata and available action. | Preview supported, preview unavailable, download, denied, superseded, deleted/retained history. | Accessible filename/type/size; download is an API action with authorization and audit. |
| Timeline/activity log | Workflow history and business traceability. | Loading, empty, ordered events, redacted event, pagination. | Semantic list, timestamp machine-readable and localized; display only disclosure-safe actor/detail. |
| Comment/note box | Supplement reason, review comment, decision note, task note. | Draft, character count, validation, read-only after submit, server error. | Label and error association; avoid sensitive data guidance; role/state determines editability. |
| Approval decision panel | Leadership decision package or authority decision for adjustment/acceptance. | Eligible, blocked by state/conflict, approve, reject, confirmation, processing, success, error. | Confirmation states consequence; reject reason required; no decision if context changed. |
| Reviewer score form | Structured rubric input for assigned evaluator. | Draft, calculated total, incomplete, submitted/locked, deadline warning, error. | Numeric input constraints, labels per criterion, keyboard operation, own-assignment disclosure only. |
| KPI card | One scoped metric with optional trend and drill-down. | Loading, value, zero, unavailable, stale, error. | Label/value relationship; links announce destination/filter; no hidden records behind count. |
| Alert list | Urgent queue of due, overdue, conflict, and required-action signals. | Empty, loading, severity, dismiss only if notification policy allows. | Icon plus text/severity; no alert contains protected review details. |
| Empty state | Explain why a list/section has no data and offer one valid next action. | No records, no matches, not applicable, awaiting upstream action. | Clear heading and explanation; action is capability-controlled. |
| Error state | Recoverable load/mutation failure. | Retry, validation correction, forbidden, stale context, service unavailable. | `role=alert` for actionable failures; no raw exception or sensitive identifiers. |
| Confirmation dialog | Submit, approve, reject, close intake, replace file, soft delete, lock. | Open/focus, cancel, confirm/loading, success/error; mobile full-screen when long. | Focus trap and return focus; explicit consequence and required reason. |
| Toast/notification | Short result after a completed action. | Success, warning, error, dismiss, persistent link to detail. | `aria-live`; do not use toast as the sole error explanation; no sensitive data. |
| Pagination | Page/cursor navigation for lists and audit. | First/next/previous/last where supported, disabled/loading, context mismatch. | Labeled navigation and current page; cursor retains server scope/asOf/version. |
| Tabs | Separate overview, files, workflow, history, reviews, reports. | Active, loading, error, hidden/omitted due to disclosure, unsaved-change guard. | Keyboard tab semantics; tab existence follows disclosure, content follows authorization. |
| Drawer/modal | Filters, contextual details, short forms, mobile actions. | Open/close, loading, validation, unsaved changes, one modal level maximum. | Focus trap, Escape, labeled title, scroll containment; never use modal to hide critical history. |

## 7. Business states and UI behavior

### 7.1 Proposal states

The labels below are product-facing states. Where a requested UX label is a
derived view rather than a canonical persisted state, the mapping is explicit.

| State | User sees | Allowed actions | Disabled actions and reason | Warning / audit |
| --- | --- | --- | --- | --- |
| Draft (`draft`) | Editable sections, readiness progress, unsaved/saved indicator, draft version. | PI edits/submits; permitted member/external edits assigned sections; valid delegate may submit. | Review/approve/aggregate unavailable: proposal has not entered formal workflow. | Warn before submit that the version will lock; audit create/update. |
| Submitted / pending check (`submitted`) | Locked submitted snapshot, “Đã nộp / Chờ kiểm tra”, submission time, next owner staff. | Staff checks; staff may request supplement in this state; PI reads and may request permitted post-submit action. | PI edit/submit disabled: submitted version is locked; reviewer assignment waits for check/policy. | Submission and check actions audit actor, version, and context. |
| Needs supplement (`supplement_requested`) | Missing-item list, reason, due date, response action, prior version. | PI edits working revision and resubmits; staff reads request/history. | Final review/approval disabled until a valid resubmission/check; no endless direct status edits. | Request reason/due date and resubmission are immutable history. |
| Eligible (`eligible`, derived) | Completeness/check result “Đủ điều kiện”, checklist evidence, ready-for-assignment cue. | Staff can proceed to assignment when the canonical workflow permits. | PI cannot approve/assign; leadership cannot decide before aggregation. | Eligibility/check result and checklist version audited; not a bypass state. |
| Resubmitted (`resubmitted`) | New version marker, prior locked version link, staff check queue. | Staff checks and assigns according to policy. | PI cannot overwrite old submitted version; reviewer cannot act until under review. | New revision/resubmission audited with source version. |
| In review (`under_review`) | Assignment progress, own reviewer action if applicable, due dates; disclosure-filtered reviews. | Assigned reviewer evaluates; staff monitors/assigns within allowed state; staff consolidates when rules permit. | PI/member cannot see raw reviews; unrelated users denied; reviewer cannot see another assignment. | Assignment, score draft/submit, revocation, and conflict events audited. |
| Pending result aggregation (`under_review`, derived queue) | Submitted/expected review counts, missing/late list for staff, consolidation CTA. | Staff saves aggregation and completes it when required conditions pass. | Leadership decision disabled until aggregation is complete and record is ready. | Aggregation calculation and summary audited. |
| Pending approval (`ready_for_approval`) | Decision package, summary, allowed review disclosure, decision due date. | Leadership approves/rejects if authority, scope, state, conflict, and version pass. | Staff cannot final-approve; PI/member/reviewer cannot decide; conflicted authority blocked. | Approve/reject requires confirmation; rejection reason required; immutable decision. |
| Approved (`approved`) | Final decision, decision date, source proposal, “project creation pending” unless project exists. | Staff explicitly creates/confirms approved project; authorized users read final disclosure. | No proposal content edit or direct state mutation; no automatic project creation assumed. | Approval and project creation are separate audit events. |
| Rejected (`rejected`) | Decision reason permitted by disclosure, final state, history, read-only package. | Read history; any later request must use an explicit policy-supported flow. | Edit/submit/approve disabled because the decision is final unless a formal reopen policy exists. | Decision retained; do not delete or overwrite rejected version. |

Overdue is a flag and reminder, not a proposal state transition. Withdrawal,
post-submission edit, and reopen are explicit actions/requests with separate
permissions and audit events; there is no generic bypass-state button.

### 7.2 Approved-project tracking states

| State / flag | User sees | Allowed actions | Disabled actions and reason | Warning / audit |
| --- | --- | --- | --- | --- |
| Tracking initialized / prepared | Source proposal, copied PI/member relationships, setup checklist. | Staff confirms project, defines milestones/report calendar. | Progress reporting/acceptance cannot start before project setup is confirmed. | Explicit project creation/confirmation and relationship copy audited. |
| In progress | Completion %, milestones, next report, tasks, evidence. | Staff/authorized participants update assigned work; PI submits reports/requests. | Members cannot change project authority, membership, budget, or final state. | Milestone, task, evidence, and report events audited. |
| Report due | Due banner and report CTA for PI; staff queue for review. | PI saves/submits report; staff reviews/follows up. | Final acceptance is not implied by a due report. | Reminder and submission/follow-up audit. |
| Delayed | Overdue flag, missed milestone/report, owner, suggested next action. | Staff may remind/escalate; authorized user may update or request adjustment. | System must not auto-pause, reject, or close the project. | Reminder/escalation audited; overdue flag is derived. |
| Under adjustment | Request detail, impact, assessment, decision status. | PI edits/submits request; staff assesses; authority decides when required. | Direct project date/budget/status edit disabled while request is pending. | Request and decision history retained. |
| Paused | Pause reason, effective date, next review date. | Authorized staff/authority can resume or take policy-supported action. | Normal progress entry may be limited by policy; no silent deadline reset. | Pause/resume reason and actor audited. |
| Pending acceptance / under acceptance | Final dossier readiness, assignments, evaluation progress. | PI submits dossier; staff prepares; assigned evaluators evaluate; staff aggregates. | Project cannot be completed before required decision. | Dossier/version/assignment events audited. |
| Completed | Acceptance result, final outputs, closed timeline. | Read, report, export, archive where allowed. | Normal project edit and new evidence additions disabled unless formal reopen. | Completion/acceptance decision immutable. |

### 7.3 Task states

| State | User sees | Allowed actions | Disabled actions and reason | Warning / audit |
| --- | --- | --- | --- | --- |
| New | Unstarted task, owner, due date, linked record. | Creator assigns; assignee accepts/updates where supported. | Completion evidence unavailable until work begins if policy requires. | Create/assign audit. |
| Accepted | Assignee acknowledgement and due date. | Assignee updates progress/status/notes. | Reassign/cancel only by authorized manager. | Acceptance audit where supported. |
| In progress | Progress and latest update. | Assignee updates work/evidence; manager monitors. | Linked record workflow remains unchanged by task update. | Status/evidence audit. |
| Waiting for response | Waiting-on label, person/source, next follow-up date. | Assignee or manager adds follow-up and notes. | Task cannot be marked complete without required response/evidence. | Follow-up reminder/audit. |
| Waiting for result approval | Submitted evidence/result and approving party. | Authorized approver reviews task result. | Assignee cannot self-approve if policy separates duties. | Result review audit. |
| Completed | Completion date, evidence, linked history. | Read; reopen only by explicit permitted action. | Normal edit disabled to preserve traceability. | Completion audit. |
| Overdue | Red danger flag plus original due date and current owner. | Update, complete, request extension/reassign if authorized. | No automatic cancellation or linked workflow transition. | Reminder/overdue event; due date changes audited. |
| Cancelled | Cancel reason and history. | Read; restore only if explicitly supported. | Update/complete disabled because task is cancelled. | Cancellation audit and reason required. |

## 8. Key user flows as UX specifications

All flows begin with a backend-scoped read and end with a mutation-time
authorization check. Notifications are in-app first and email where the
requirements specify it; notifications never substitute for access control.

### Flow 1 — Login and session expiry

1. User opens `/login` and submits credentials.
2. API authenticates, resolves account status, active system role, organization
   scope, and safe session context; login is audited.
3. User lands on `/dashboard` with the role-aware navigation and scope line.
4. If a protected request returns session expiry, preserve the intended route in
   memory only, show “Phiên làm việc đã hết hạn. Đăng nhập lại để tiếp tục.”,
   and return to login.
5. After re-login, return only to a safe route and reload its authorization
   context; never replay a stale mutation automatically.

Failure/edge cases: invalid credentials use a generic message; locked/inactive
accounts cannot enter; network failure keeps the form and offers retry.

### Flow 2 — Create and submit proposal

1. PI opens an applicable intake period and selects **Tạo bản nháp**.
2. Form loads required package, field catalogs, scope, and capability response.
3. PI completes sections, saves draft, and uploads files through the files
   module; each save reports success or retains unsaved input on error.
4. Readiness panel identifies missing fields/files without claiming eligibility
   until the backend confirms it.
5. PI selects **Nộp chính thức** and sees version, deadline, responsibility,
   and locked-version warning.
6. PI confirms; API validates readiness, intake, relationship, scope, conflict,
   state, and context version atomically.
7. Success shows submission timestamp and `Đã nộp / Chờ kiểm tra`; staff receives
   a scoped notification and audit event.

Failure: missing data returns field/section errors; stale context asks refresh;
closed intake blocks new submission; API denial leaves the draft intact.

### Flow 3 — Staff checks and requests supplement

1. Staff opens the pending-check queue from dashboard or proposal list.
2. Check screen shows the locked version, checklist, files, and prior history.
3. Staff marks each item complete or records a missing item.
4. If incomplete, staff must enter a clear reason and due date, then confirms
   **Yêu cầu bổ sung**.
5. API records the request, changes the workflow through the domain operation,
   sends the PI a notification/email as configured, and writes audit.
6. Staff sees the request in history and the next owner as PI.

No generic “edit status” action is offered. A conflict, stale context, or
non-requestable state disables the action with the backend reason.

### Flow 4 — PI resubmits supplement

1. PI opens the supplement notification or My Work item.
2. The request panel shows each reason, due date, and linked section/file.
3. PI opens a new working revision; the prior submitted version remains read-only.
4. PI edits permitted content, replaces files through versioned upload, and
   checks readiness.
5. PI confirms **Nộp lại**; API validates the request/version and creates the
   resubmitted version.
6. Staff receives the next queue item and the PI sees `Đã nộp lại`.

The UI must not offer an endless supplement loop when the canonical state does
not allow another request.

### Flow 5 — Staff assigns reviewer

1. Staff opens a checked/eligible proposal and chooses **Phân công**.
2. Candidate search shows only active profiles/accounts and minimum permitted
   identity data.
3. Staff selects a candidate, assignment role, effective dates, and deadline.
4. API runs conflict and scope checks and returns a safe result.
5. Conflict blocks confirmation and explains the safe denial reason without
   exposing the conflict source to an unauthorized user.
6. Staff confirms; assignment is created, candidate is notified, and the event
   is audited.

Changing or revoking an assignment uses the same explicit operation and keeps
the prior assignment in history.

### Flow 6 — Reviewer submits evaluation

1. Reviewer opens the assigned item from My Work.
2. The page shows only the permitted package and own assignment information.
3. Reviewer enters rubric scores, comment, and recommendation; total is
   calculated by the backend contract and reflected in the form.
4. Reviewer may save a draft while assignment/state/deadline policy allows.
5. Reviewer chooses **Gửi phiếu đánh giá**, reviews the lock warning, and confirms.
6. API rechecks assignment, state, conflict, context version, and rubric; then
   locks the submitted evaluation, notifies staff, and audits.

After submission, the reviewer cannot edit the same version and cannot view
other reviewers' content.

### Flow 7 — Staff aggregates results

1. Staff opens the aggregation queue.
2. Screen shows required/received review counts, late/missing assignments, and
   disclosure-safe evaluation material.
3. Staff enters the structured summary and recommendation; totals remain
   backend-calculated.
4. If required conditions pass, staff confirms **Chuyển trình phê duyệt**.
5. API changes to `ready_for_approval`, creates the audit event, and notifies
   eligible leadership.

If a review is missing or context is stale, the transition remains disabled with
the exact corrective condition.

### Flow 8 — Leadership approves or rejects

1. Leadership opens the decision queue and selects a ready record.
2. Decision package loads proposal snapshot, permitted files, evaluation summary,
   history, and conflict indicator.
3. Leadership reviews evidence without edit controls.
4. **Phê duyệt** opens a consequence confirmation; **Không phê duyệt** requires
   a reason before confirmation.
5. API rechecks authority, scope, conflict, state, version, and disclosure.
6. Success shows the immutable decision and next step: staff must explicitly
   create/confirm the approved project.

The system never creates the project merely because the approve button succeeded.

### Flow 9 — Approved proposal becomes tracked project

1. Staff opens an approved proposal and chooses **Tạo đề tài từ hồ sơ**.
2. A setup page shows copied source fields and the new project relationships,
   clearly stating that later project changes do not edit the proposal.
3. Staff completes project code, dates, milestones, report checkpoints, and
   required setup data.
4. Staff confirms creation; API creates the project explicitly and audits the
   source link and copied relationships.
5. Project opens in tracking-initialized state with a setup checklist.

### Flow 10 — PI submits periodic report

1. PI opens a due report from My Work or the project detail page.
2. System displays period, due date, milestone progress, difficulties, outputs,
   and required evidence.
3. PI saves a draft, uploads evidence, and runs readiness check.
4. PI confirms submission; version locks and staff receives a review item.
5. Staff reviews and either records accepted follow-up or requests clarification.

Overdue display triggers reminders but never silently changes the project state.

### Flow 11 — Staff/leadership reviews progress

1. Staff opens the project risk queue and filters delayed/due items.
2. Project summary shows milestone variance, report state, tasks, evidence, and
   adjustment requests.
3. Staff records a follow-up, reminder, or assessment using an explicit action.
4. If leadership authority is required, staff prepares a decision package and
   routes it to the scoped leadership queue.
5. Leadership reviews and decides only through the applicable authority action.

### Flow 12 — Task created from a record

1. Authorized user selects **Tạo nhiệm vụ** from a proposal/project/report or
   the global task list.
2. Form inherits the linked record and shows the viewer's relationship.
3. User enters title, assignee, collaborators, due date, priority, and outcome.
4. API checks task authority and linked-record access before creation.
5. Assignee receives a scoped notification and sees the task in My Work.
6. Status/evidence updates remain within task permission and do not bypass the
   linked record's workflow.

### Flow 13 — File upload/download with permission control

1. User opens the authorized record's Files section and chooses an allowed
   category.
2. UI validates extension/MIME/size and required association before upload.
3. API authorizes the upload, stores metadata in PostgreSQL and binary content
   in private MinIO, and returns safe metadata/status.
4. UI shows progress, scan/result state, uploader, time, and version.
5. Preview/download makes a new API request; the API authorizes again and audits
   important access.
6. Replace creates a new version; old assessment/evidence files remain traceable.

No object key or direct MinIO URL is exposed as a permission token.

### Flow 14 — Search and filter proposal/project/task records

1. User enters a code/title/person/unit term in global or local search.
2. UI sends a cancellable, server-side query with filters, sort, page/cursor,
   and the current context where applicable.
3. API applies authorization before result, count, facet, suggestion, or export.
4. Result cards/table rows show code, title, status, due/risk, relationship, and
   allowed next action.
5. User opens a result; detail authorization is evaluated again.
6. Export, if allowed, uses the exact filter/scope snapshot and records an audit
   event.

## 9. Forms and validation rules

### 9.1 General form behavior

- Mark required fields with text and `*`; provide a short legend at the form
  start. Do not rely on color alone.
- Validate obvious field format on blur and validate the full section when the
  user leaves it or submits. Do not interrupt typing with aggressive validation.
- Preserve entered values after server errors. Scroll/focus to the first invalid
  field and announce the error.
- **Save draft** is non-terminal and may leave required fields incomplete.
  **Submit** is terminal for that version and requires backend readiness.
- Disable only the fields the capability response locks. A disabled field must
  have an explanation when its lock is not obvious from state.
- Show save/submission progress and prevent duplicate mutation requests.
- Confirm consequential actions: submit, approve, reject, request supplement,
  replace/delete file, close intake, cancel task, pause/resume, and final
  acceptance.

### 9.2 Proposal and project fields

- Title, type, field, managing unit, PI, dates, objective/content summary, and
  required package fields are required according to the active form/checklist
  version.
- PI and protected participant fields are editable only by the authorized
  relationship/action. External researchers can edit only assigned draft parts.
- Start date must not be after end date. Milestone/report dates must fall within
  the project policy window unless a valid adjustment exists.
- A unit selector contains only units the actor may use for the intake/record;
  a cooperating unit does not grant scope.
- Member selection must prevent duplicate active relationships and must show the
  relationship label separately from the account system role.

### 9.3 File validation

- Validate required association, extension/MIME, configured maximum size, file
  name safety, and duplicate/version behavior before upload.
- Show the exact failed rule and how to correct it.
- Upload success is not the same as business acceptance; readiness checks decide
  whether the file satisfies the package.
- Failed uploads remain retryable where safe; partially uploaded or unscanned
  files cannot satisfy readiness.

### 9.4 Date and deadline validation

- Store and compare timestamps in UTC; display local institutional time with a
  clear date/time format.
- Date-only fields must state whether the deadline is inclusive.
- A due date cannot precede its start/assignment/request date.
- Intake end dates, report periods, assignment effective ranges, and extension
  dates are validated against the current backend policy, not only the browser
  clock.
- Overdue is computed from the authoritative time and shown as a flag.

### 9.5 Budget and number formatting

- Budget inputs accept digits and a decimal separator appropriate to the locale,
  but normalize to a numeric value before API submission.
- Display Vietnamese grouping (for example `1.250.000`) with a currency label;
  do not store formatted strings as the numeric source.
- Reject negative, non-finite, or out-of-range values; show the field-level
  message near the input.
- Totals and derived amounts are calculated by the backend when they affect
  workflow or reporting.

## 10. Accessibility, content, and security floor

- Target WCAG 2.2 AA for primary flows.
- Use semantic landmarks, one `h1` per page, ordered headings, labels, visible
  focus, keyboard navigation, and a skip link to `#main-content`.
- Every async state uses an appropriate live region; loading text does not
  replace the page title or trap focus.
- Focus moves into a dialog and returns to its trigger. Escape closes the top
  layer. Modal stacking is limited to one level.
- Do not block paste. Support text zoom and `prefers-reduced-motion`.
- Use Lucide or the existing icon set; no emoji as control icons.
- Status always has text and icon, not color alone. Red/amber states also have
  concise action-oriented copy.
- Avoid exposing reviewer identity, raw score/comment, conflict source, hidden
  files, or unauthorized participant data through labels, tooltips, counts,
  notifications, search, export, history, or HTML source.
- Never trust a hidden or disabled control as authorization. Every API mutation,
  detail read, list, search, count, facet, dashboard, export, notification, and
  file operation is backend-enforced.

## 11. Frontend/backend delivery contract

### 11.1 Frontend responsibilities

- Render only data and actions returned for the current viewer/context.
- Preserve `contextVersion` and send it with mutations.
- Use canonical status/action labels; do not infer transitions from button
  visibility.
- Provide all shared states: loading, empty, no-match, error, forbidden,
  blocked-with-reason, stale-context, success, and locked/read-only.
- Keep URL filters/pagination shareable where disclosure permits.
- Keep submitted versions and file history visible as read-only traceability.

### 11.2 Backend/API responsibilities

The backend owns these contracts:

- `ViewerAuthorizationV1` for system role, viewer relationships, allowed and
  blocked actions, policy version, evaluated time, and context version.
- Same authorization context for detail/list/search/count/facet/dashboard/export,
  notification, and file metadata/content.
- Explicit domain operations for submit, supplement, resubmit, assign, evaluate,
  aggregate, approve, reject, create project, report submit, adjustment,
  acceptance, and task/file actions.
- Atomic mutation-time authorization and context-version checks; return
  `CONTEXT_VERSION_MISMATCH` for refresh/retry rather than silently applying a
  stale action.
- Disclosure-filtered DTOs: hidden values are omitted, not returned as null
  placeholders.
- Append-only audit for consequential actions with actor, target, action, time,
  outcome, context/policy version, and redacted before/after values.

### 11.3 QA acceptance matrix

For each screen and mutation, test at least:

- allowed actor with correct role/scope/relationship/state;
- same system role without the required record relationship;
- valid relationship with an invalid workflow state;
- conflict-blocked actor;
- inactive/locked account or inactive assignment;
- stale/ambiguous/missing context;
- reviewer/PI disclosure before and after final decision;
- mobile layouts at the required breakpoints;
- keyboard and screen-reader behavior for the primary flow;
- audit output and notification disclosure;
- file permission on upload, preview, download, replace, and soft delete;
- search/count/facet/dashboard/export consistency with the detail authorization.

## 12. Out of scope for this specification

- React component implementation, visual mockup files, or a new design system.
- Public self-registration, public proposal portal, SSO/LDAP/OIDC/MFA, SMS,
  digital signatures, mobile-native applications, microservices, workflow
  engines, Elasticsearch/OpenSearch, and deep financial integration.
- Redis or any cache/queue infrastructure not already part of the current
  implementation.

The next implementation step is to turn each screen row and flow into frontend
and backend stories while preserving the authorization baseline and the
mutation/audit contracts above.
