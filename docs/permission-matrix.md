# Permission Matrix - DocManSystem / RTMS

## 1. Purpose

This document is the canonical phase 1 permission matrix for DocManSystem / RTMS.
It defines role-based, data-scope, state-based, and audit expectations for
implementation, review, testing, and QA.

Use this document as the source of truth when implementing backend policies,
API guards, UI action visibility, dashboard queries, export queries, file access
flows, workflow transitions, and authorization test cases.

If PRD, requirements, story scope, roles, or workflow states change, this
document must be updated in the same change set.

## 2. Canonical Roles

### System Administrator / Quan tri he thong

- Main responsibility: manage accounts, roles, organization scopes, shared
  catalogs, system configuration, and operational traceability support.
- Default data scope: all system scope for administrative data.
- Important limits: administrative power does not automatically grant business
  approval authority unless that authority is explicitly assigned by policy.

### Scientific Management Staff / Chuyen vien quan ly khoa hoc

- Main responsibility: operate proposal intake, completeness review, reviewer
  coordination, evaluation consolidation, approved-project follow-up, reminders,
  and operational reporting.
- Default data scope: organization, unit, assigned staff, or workflow scope.
- Important limits: cannot make leadership approval decisions unless explicitly
  authorized for that decision type.

### Leadership / Approval Authority / Lanh dao / Nguoi phe duyet

- Main responsibility: review decision-ready proposals, projects, reports, and
  dashboard signals; approve, reject, or decide workflow actions under authority.
- Default data scope: approval authority scope and permitted organization/unit
  scope.
- Important limits: approval actions must follow workflow state rules and cannot
  bypass required review, consolidation, or history.

### Principal Investigator / Chu nhiem de tai

- Main responsibility: create proposal drafts, submit proposals, respond to
  supplement requests, track approved projects, submit progress reports, and
  request adjustments or extensions.
- Default data scope: own proposal/project scope and delegated proposal/project
  scope where explicitly granted.
- Important limits: cannot edit submitted proposals unless the workflow state
  allows supplement, resubmission, or another explicit domain action.

### Project Member / Thanh vien de tai

- Main responsibility: participate in approved-project work, view permitted
  project information, update assigned work, and contribute evidence or files.
- Default data scope: project participation scope and task
  assignee/collaborator scope.
- Important limits: cannot access projects, files, reports, or tasks outside
  participation or assignment scope.

### Reviewer / Committee Member / Reviewer / Hoi dong

- Main responsibility: access assigned proposal/review records, submit scores,
  comments, recommendations, and participate in controlled evaluation or
  acceptance workflows.
- Default data scope: reviewer assignment scope.
- Important limits: cannot see unassigned proposals and cannot change another
  reviewer or committee member's review.

### Record-Scoped Participation And Assignment Roles

The canonical roles above are account-level system roles or broad personas for
planning and UX. Scientific work roles such as principal investigator, project
member, scientific secretary, reviewer, council chair, council secretary,
council member, and ethics reviewer must be resolved in the context of a
specific proposal, project, council, ethics dossier, review, task, or related
business record.

Do not grant global access by assigning `PI`, `PROJECT_MEMBER`,
`SCIENTIFIC_SECRETARY`, `REVIEWER`, or similar participation labels directly to
a user account unless a separate system-role policy explicitly defines that
meaning. Backend authorization must calculate effective permission from system
role, organization/unit scope, record participation role, assignment scope,
workflow state, and conflict policy.

Common record-scoped roles:

| Role Type | Examples | Scope Boundary | Important Limits |
| --- | --- | --- | --- |
| Proposal participation | Principal investigator, proposal member, scientific secretary | One proposal | Does not grant access to unrelated proposals. |
| Project participation | Principal investigator, co-investigator, project member, scientific secretary | One approved project | Member/secretary permissions depend on delegation and workflow state. |
| Review assignment | Reviewer, committee reviewer | One proposal, ethics dossier, or review package | Assignment-scoped only; no access to unassigned records. |
| Council membership | Chair, secretary, member, reviewer | One council | Council secretary cannot approve/reject unless separately authorized by policy. |
| Task assignment | Owner, assignee, collaborator | One task and linked record | Task access still depends on linked-record permission. |

## 3. Permission Legend

| Permission | Meaning |
| --- | --- |
| None | No access. |
| Read | View list, detail, metadata, or status where scope allows. |
| Create | Create a new record or draft in an allowed workflow state. |
| Update | Edit an existing record in an allowed workflow state. |
| Submit | Formally submit a draft, report, request, score, or comment. |
| Review | Review completeness, progress, evidence, scores, or business context. |
| Assign | Assign reviewers, committee members, task owners, or collaborators. |
| Approve/Reject | Make an authority decision that changes workflow outcome. |
| Manage | Full operational management for the capability within allowed scope. |
| Export | Generate or download report/export output within allowed scope. |
| Audit/View History | View workflow history, audit logs, or timeline records where allowed. |

## 4. Scope Rules

| Scope Rule | Definition |
| --- | --- |
| All system scope | The role can access the capability across the system where this does not violate a business-decision boundary. |
| Organization/unit scope | Access is limited to permitted organization or unit boundaries. |
| Assigned staff scope | Access is limited to records assigned to or operated by the scientific management staff user. |
| Approval authority scope | Access is limited to records the leadership or approval authority is allowed to decide or inspect. |
| Own proposal/project scope | Access is limited to proposals or projects owned by the principal investigator. |
| Proposal participation scope | Access is limited to proposals where the user has a valid proposal participation role such as PI, member, or scientific secretary. |
| Project participation scope | Access is limited to approved projects where the user participates. |
| Reviewer assignment scope | Access is limited to proposals, reviews, or committee work assigned to the reviewer or committee member. |
| Council membership scope | Access is limited to councils, council records, or ethics dossiers where the user has a valid council membership or assignment. |
| Task assignee/collaborator scope | Access is limited to tasks where the user is owner, assignee, collaborator, creator, or otherwise explicitly authorized. |
| Conflict policy scope | Access or assignment is denied when the actor has a conflicting role on the same business record, such as PI self-review or authority self-approval. |

## 5. State Rules

| State Rule | Authorization Meaning |
| --- | --- |
| Draft | Draft content may be created or updated only by the owner or explicitly authorized delegate. |
| Open intake | New proposal drafts or submissions may be accepted when intake rules match user scope. |
| Closed intake | New submissions are blocked; read access remains scope-controlled. |
| Submitted | Proposal is locked from normal draft edits and moves into controlled review workflow. |
| Needs supplement | PI may revise only the requested content or files allowed by workflow. |
| Resubmitted | Proposal returns to controlled staff/review workflow after PI response. |
| Under review | Assigned reviewers can perform review actions; unrelated users cannot access review material. |
| Ready for approval | Approval authority can decide; non-authority users cannot approve or reject. |
| Approved | Approved-project creation or tracking may begin through explicit domain actions. |
| Rejected | Decision history remains visible by scope; normal workflow actions stop unless policy allows appeal or reopen. |
| Active project | Project tracking, milestone, evidence, report, and task actions follow project participation and staff scope. |
| Delayed project | Follow-up, escalation, dashboard, and report actions remain scope-controlled. |
| Waiting report | PI or permitted project member may submit required progress evidence. |
| Waiting decision | Staff, leadership, or authority may review/decide according to action type. |
| Completed/accepted | Records are mostly read-only except history, reporting, and explicitly allowed archival actions. |
| Task open/in progress/completed/cancelled | Task action availability depends on current task state, assignee/collaborator scope, and linked-record permission. |

## 6. High-Level Role Matrix

| Capability Group | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User, role, organization administration | Manage | None | None | None | None | None | All system scope | Any | Yes |
| Shared catalogs and configuration | Manage | Read | Read | Read where needed | Read where needed | Read where needed | All system scope | Any | Yes for changes |
| Proposal intake period management | Manage | Manage | Read | Read applicable | None | None | Organization/unit scope | Draft, open intake, closed intake | Yes |
| Proposal draft creation and editing | None | Read scoped | Read scoped | Create/Update own | Update if delegated participant or secretary | None | Own proposal/project scope, proposal participation scope | Draft | Yes |
| Proposal attachment upload/view/download | Read scoped | Read scoped | Read scoped | Create/Read own | Create/Read if delegated participant or secretary | Read assigned | Record-level scope | Draft, needs supplement, under review | Yes for important file actions |
| Proposal formal submission | None | None | None | Submit own | Submit if explicitly delegated by policy | None | Own proposal/project scope, proposal participation scope | Draft, open intake | Yes |
| Proposal completeness review | None | Review | Read | Read own | Read if participating | None | Organization/unit scope | Submitted, resubmitted | Yes when decision affects workflow |
| Supplement request | None | Submit request | Read | Read/respond | Read if participating | None | Organization/unit scope | Submitted, needs supplement | Yes |
| Proposal resubmission | None | Read | Read | Submit own | Submit if delegated | None | Own proposal/project scope | Needs supplement | Yes |
| Reviewer/committee assignment | None | Assign with conflict check | Read | None | None | Read assigned | Organization/unit scope, reviewer assignment scope, conflict policy scope | Submitted, under review | Yes |
| Reviewer scoring and comments | None | Read/Review | Read | None unless policy allows result view | None | Review/Submit assigned | Reviewer assignment scope | Under review | Yes |
| Evaluation consolidation | None | Review/Update | Read | None | None | None | Organization/unit scope | Under review, ready for approval | Yes |
| Approval/rejection decision | None | Prepare/Read | Approve/Reject with conflict check | Read result | Read result if participating | None | Approval authority scope, conflict policy scope | Ready for approval | Yes |
| Approved project creation | None | Create/Manage | Read | Read own | Read if participating | None | Organization/unit scope | Approved | Yes |
| Milestone/checkpoint management | None | Manage | Read/Review | Read/Update own allowed items | Read assigned or secretary-delegated items | None | Organization/unit scope, project participation scope | Active project | Yes for changes |
| Progress report submission | None | Read/Review | Read | Submit own | Submit contribution if permitted or secretary-delegated | None | Own proposal/project scope, project participation scope | Waiting report, active project | Yes |
| Project evidence upload | Read scoped | Read/Review | Read scoped | Create own | Create assigned or secretary-delegated | None | Project participation scope | Active project, waiting report | Yes |
| Progress report review/follow-up | None | Review/Update | Read/Decide if authorized | Read/respond | Read/respond assigned | None | Organization/unit scope | Waiting decision, delayed project | Yes |
| Adjustment/extension request | None | Read/Review | Read/Decide if authorized | Create/Submit own | None | None | Own proposal/project scope | Active project, delayed project | Yes |
| Adjustment/extension decision | None | Review/Prepare | Approve/Reject with conflict check | Read result | Read result if participating | None | Approval authority scope, conflict policy scope | Waiting decision | Yes |
| Acceptance/final review | None | Review/Prepare | Approve/Reject with conflict check | Read/Submit required context | Read assigned | Review if assigned | Approval authority scope, reviewer assignment scope, conflict policy scope | Waiting decision, completed/accepted | Yes |
| Task creation and assignment | Read scoped | Create/Assign | Create/Assign in authority scope | Create in own project or secretary-delegated scope | None unless delegated | None | Task assignee/collaborator scope, linked record scope, conflict policy scope | Task open/in progress/completed/cancelled | Yes |
| Task status/progress update | Read scoped | Update scoped | Review scoped | Update own/assigned | Update assigned | None | Task assignee/collaborator scope | Task open/in progress/completed/cancelled | Yes |
| File replace/version history | Read scoped | Update scoped | Read scoped | Update own allowed files | Update assigned allowed files | Read assigned | Record-level scope | State-dependent | Yes |
| Workflow history/timeline view | Audit/View History | Audit/View History scoped | Audit/View History scoped | Read own | Read participating | Read assigned | Same as source record | Any | No for read unless policy requires |
| Audit log search/view | Audit/View History | Audit/View History scoped if authorized | Audit/View History scoped if authorized | None | None | None | All system scope, organization/unit scope | Any | No for read unless policy requires |
| In-app notifications | Manage templates | Read own/manage operational events | Read own | Read own | Read own | Read own | User-specific scope | Any | No for read |
| Email notifications | Manage templates | Trigger by workflow | Receive | Receive | Receive | Receive | Recipient permission scope | Any | Operational trace recommended |
| Reminder jobs/work queue | Manage configuration | Manage scoped queues | Read scoped queues | Read own queue | Read own queue | Read own queue | Role, scope, assignment | Any | Operational trace recommended |
| Dashboard view | Read all/admin dashboard | Read scoped dashboard | Read authority dashboard | Read own/project dashboard | Read assigned/project dashboard | Read assigned review dashboard | Role and data scope | Any | No for read |
| Search/filter | Read scoped | Read scoped | Read scoped | Read own | Read participating | Read assigned | Role and data scope | Any | No for read |
| Report export Excel/PDF | Export all allowed reports | Export scoped reports | Export authority reports | Export own/project reports if allowed | Export assigned data if allowed | Export assigned reviews if allowed | Role and data scope | Any | Yes for export |

## 7. Detailed Module Permission Matrix

### 7.1 Identity, Roles, Organizations

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create user account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Update user account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Activate/deactivate or lock account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Assign role to user | Manage | None | None | None | None | None | All system scope | Any | Yes | FR2, Story 1.3 |
| Assign organization/unit scope | Manage | None | None | None | None | None | All system scope | Any | Yes | FR3, FR6, Story 1.3 |
| Load role-aware session context | Manage | Read own context | Read own context | Read own context | Read own context | Read own context | Current user scope | Any | No | FR4, FR5, FR6 |

### 7.2 Catalogs And Configuration

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View shared catalogs | Read | Read | Read | Read where needed | Read where needed | Read where needed | Role and data scope | Any | No | FR7, Story 1.4 |
| Create/update catalog item | Manage | None | None | None | None | None | All system scope | Any | Yes | FR7, Story 1.4 |
| Soft delete catalog item | Manage | None | None | None | None | None | All system scope | Any | Yes | FR7, Story 1.4 |
| Configure system parameters | Manage | None | None | None | None | None | All system scope | Any | Yes | FR8, Story 1.4 |
| Configure notification templates | Manage | None | None | None | None | None | All system scope | Any | Yes | FR8, FR41-FR43, Story 1.4 |
| Evaluate permission primitive | Manage | Read policy result | Read policy result | Read policy result | Read policy result | Read policy result | Role, scope, and state context | Any | No | FR6, FR6a, NFR7, NFR8, Story 1.4 |

### 7.3 Proposal Intake And Submission

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create intake period | Manage | Create | Read | None | None | None | Organization/unit scope | Draft | Yes | FR9, Story 2.1 |
| Update intake period | Manage | Update | Read | None | None | None | Organization/unit scope | Draft, open intake | Yes | FR9, Story 2.1 |
| Open intake period | Manage | Update | Read | Read applicable | None | None | Organization/unit scope | Draft, open intake | Yes | FR9, Story 2.1 |
| Close intake period | Manage | Update | Read | Read applicable | None | None | Organization/unit scope | Open intake, closed intake | Yes | FR9, Story 2.1 |
| List applicable intake periods | Read | Read scoped | Read scoped | Read applicable | None | None | Role and organization/unit scope | Open intake | No | FR9, Story 2.1 |
| Create proposal draft | None | None | None | Create own | Create if explicitly delegated | None | Own proposal/project scope | Open intake, draft | Yes | FR10, Story 2.2 |
| Update proposal draft | None | Read scoped | Read scoped | Update own | Update if delegated | None | Own proposal/project scope | Draft | Yes | FR10, FR11, Story 2.2 |
| Upload proposal attachment | Read scoped | Read scoped | Read scoped | Create own | Create if delegated | None | Own proposal/project scope | Draft, needs supplement | Yes | FR12, FR36, Story 2.3 |
| View/download proposal attachment | Read scoped | Read scoped | Read scoped | Read own | Read if participating | Read assigned | Record-level scope | Any allowed proposal state | Yes for important downloads | FR12, FR36, Story 2.3 |
| Check submission readiness | None | Read scoped | Read scoped | Read own | Read if delegated | None | Own proposal/project scope | Draft | No | FR13, Story 2.3 |
| Submit proposal formally | None | None | None | Submit own | Submit if delegated | None | Own proposal/project scope | Draft, open intake | Yes | FR14, FR22, Story 2.4 |
| View submission history | Audit/View History scoped | Audit/View History scoped | Audit/View History scoped | Read own | Read if participating | Read assigned if policy allows | Same as proposal scope | Submitted or later | No | FR14, FR38, Story 2.4 |

### 7.4 Proposal Review, Supplement And Approval

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review proposal completeness | None | Review | Read scoped | Read own | Read if participating | None | Organization/unit scope | Submitted, resubmitted | Yes when state changes | FR15, Story 3.1 |
| Request supplement | None | Submit request | Read scoped | Read own request | Read if participating | None | Organization/unit scope | Submitted, needs supplement | Yes | FR15, Story 3.1 |
| Respond to supplement request | None | Read scoped | Read scoped | Update/Submit own | Update if delegated | None | Own proposal/project scope | Needs supplement | Yes | FR16, Story 3.1 |
| Assign reviewer or committee member | None | Assign with conflict check | Read scoped | None | None | Read assigned after assignment | Organization/unit scope, reviewer assignment scope, conflict policy scope | Submitted, under review | Yes | FR17, FR67a, Story 3.2 |
| Change reviewer assignment | None | Assign with conflict check | Read scoped | None | None | Read assigned after assignment | Organization/unit scope, reviewer assignment scope, conflict policy scope | Under review | Yes | FR17, FR67a, Story 3.2 |
| Access assigned review package | None | Read scoped | Read scoped | None | None | Read assigned | Reviewer assignment scope | Under review | No | FR18, Story 3.2 |
| Submit score/comment/recommendation | None | Read/Review | Read scoped | None | None | Review/Submit assigned | Reviewer assignment scope | Under review | Yes | FR18, Story 3.3 |
| Consolidate evaluation outcome | None | Review/Update | Read scoped | None | None | None | Organization/unit scope | Under review, ready for approval | Yes | FR19, Story 3.4 |
| View evaluation output before decision | None | Read scoped | Read authority scoped | None unless policy allows result view | None unless participating view is allowed | Read own submitted review | Approval authority scope, reviewer assignment scope | Ready for approval | No | FR20, Story 3.5 |
| Approve/reject proposal | None | None | Approve/Reject with conflict check | Read result | Read result if participating | None | Approval authority scope, conflict policy scope | Ready for approval | Yes | FR21, FR22, FR67a, Story 3.5 |

#### 7.4.1 Implemented Read-Scope Decisions (EP-03)

These resolve the "read scoped" cells above into the concrete rules the backend enforces. They are
recorded here because each one widens who may read a proposal, and the rule must be reviewable next
to the matrix it implements.

| Rule | Decision | Where |
| --- | --- | --- |
| Reviewer read | Granted only by an `assigned` or `completed` `ProposalReviewAssignment` row on that one proposal, and only while the proposal is in the formal workflow. The `reviewer` account role grants nothing by itself; a revoked assignment stops granting immediately. | `canReadProposal`, `ProposalReviewAccessService` |
| Reviewer file read | Resolved by the same assignment lookup as the proposal read, so the attachment list and the download agree. Upload still requires proposal ownership. | `FilesService.assertCanRead` |
| Leadership read | Granted for any proposal that has entered the formal workflow, i.e. every state except `draft`. Leadership does not need a matching organization scope; drafts stay private to their owner until formal submission. | `canReadProposal` |
| Approval authority | The `leadership` role only. A system administrator role does not imply business approval authority, per section 2. | `assertApprovalAuthority` |
| Staff evaluation actions | `scientific-management` **and** an organization scope covering the proposal's host unit, re-checked on every assignment and consolidation action. | `assertScientificManagementScope` |
| Decision conflict | The shared ST-3.0 participation primitive, plus a reviewer assignment on the same proposal — an authority who scored the proposal cannot then decide it. | `ProposalDecisionsService.resolveDecisionConflict` |

Workflow states used by EP-03: `submitted` / `resubmitted` -> `under_review` (first reviewer
assignment) -> `ready_for_approval` (staff consolidation marked ready) -> `approved` | `rejected`
(leadership decision). The allowed states per action are declared once in
`apps/api/src/proposals-shared/proposal-workflow.ts`.

### 7.5 Approved Project Tracking

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create approved project from approved proposal | None | Create | Read | Read own | Read if participating | None | Organization/unit scope | Approved | Yes | FR23, Story 4.1 |
| View approved project detail | Read scoped | Read/Manage scoped | Read authority scoped | Read own | Read participating | Read if explicitly assigned | Organization/unit scope, project participation scope | Active project or later | No | FR30a, Story 4.1 |
| Create/update milestones | None | Manage | Read scoped | Read own | Read assigned | None | Organization/unit scope | Active project | Yes | FR24, Story 4.2 |
| Manage project members | None | Manage with conflict check | Read scoped | Read own | Read own participation | None | Organization/unit scope, conflict policy scope | Active project | Yes | FR24, FR30a, FR67a, Story 4.2 |
| Submit progress report | None | Read/Review | Read scoped | Submit own | Submit contribution if permitted | None | Own proposal/project scope, project participation scope | Waiting report, active project | Yes | FR25, Story 4.3 |
| Upload project evidence | Read scoped | Read/Review | Read scoped | Create own | Create assigned | None | Project participation scope | Waiting report, active project | Yes | FR25, FR30b, FR36, Story 4.3 |
| Review progress report | None | Review/Update | Read/Decide if authorized | Read own | Read participating | None | Organization/unit scope | Waiting decision, delayed project | Yes when follow-up changes state | FR26, Story 4.4 |
| Request adjustment or extension | None | Read/Review | Read scoped | Create/Submit own | None unless delegated | None | Own proposal/project scope | Active project, delayed project | Yes | FR27, Story 4.5 |
| Decide adjustment, extension, acceptance, or final review | None | Review/Prepare | Approve/Reject with conflict check | Read result | Read result if participating | Review if assigned | Approval authority scope, conflict policy scope | Waiting decision, completed/accepted | Yes | FR28, FR67a, Story 4.5 |
| Identify delayed projects and deadlines | Read scoped | Read/Review scoped | Read authority scoped | Read own | Read participating | None | Role and data scope | Delayed project, waiting report | No | FR29 |

### 7.6 Tasks

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create standalone task | Read scoped | Create | Create in authority scope | Create in own project scope | None unless delegated | None | Role and data scope | Task open | Yes | FR31, Story 5.1 |
| Create task linked to proposal/project/report/event | Read scoped | Create | Create in authority scope | Create in own project or secretary-delegated scope | None unless delegated | None unless explicitly assigned workflow | Linked record scope, proposal/project participation scope | Task open | Yes | FR31, Story 5.1 |
| Assign task owner/collaborators | Read scoped | Assign | Assign in authority scope | Assign within own project scope if allowed | None unless delegated | None | Task assignee/collaborator scope, linked record scope, conflict policy scope | Task open/in progress | Yes | FR32, Story 5.1 |
| Update task status/progress/notes | Read scoped | Update scoped | Review scoped | Update own/assigned | Update assigned | None unless task assigned | Task assignee/collaborator scope | Task open/in progress/completed/cancelled | Yes | FR33, Story 5.2 |
| Attach task completion evidence | Read scoped | Update scoped | Read scoped | Update own/assigned | Update assigned | None unless task assigned | Task assignee/collaborator scope | Task open/in progress | Yes for important files | FR33, FR36, Story 5.2 |
| View overdue/upcoming tasks | Read scoped | Read scoped | Read authority scoped | Read own/assigned | Read assigned | Read assigned if applicable | Role and data scope | Task open/in progress | No | FR34 |

### 7.7 Files

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Upload important business file | Read scoped | Create scoped | Create if workflow allows | Create own | Create assigned | Create assigned review file if workflow allows | Record-level scope | State-dependent | Yes | FR36, FR37 |
| Replace important business file | Read scoped | Update scoped | Update if workflow allows | Update own allowed files | Update assigned allowed files | Update assigned review file if workflow allows | Record-level scope | State-dependent | Yes | FR36, FR37 |
| View file metadata | Read scoped | Read scoped | Read scoped | Read own | Read participating | Read assigned | Record-level scope | Any allowed source state | No | FR36, FR37 |
| Download important business file | Read scoped | Read scoped | Read scoped | Read own | Read participating | Read assigned | Record-level scope | Any allowed source state | Yes | FR36, File Attachment Requirements |
| Soft delete file | Manage if policy allows | Update scoped if policy allows | None unless authority action allows | Update own allowed files | None unless delegated | None | Record-level scope | State-dependent | Yes | FR36, FR37 |

### 7.8 Audit Logs And Workflow History

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View workflow history on business record | Audit/View History scoped | Audit/View History scoped | Audit/View History scoped | Read own | Read participating | Read assigned | Same as source record scope | Any | No | FR38, FR40 |
| Search audit logs | Audit/View History | Audit/View History if authorized | Audit/View History if authorized | None | None | None | All system scope, organization/unit scope | Any | No for read | FR39, FR40 |
| Export audit logs | Export | Export if authorized | Export if authorized | None | None | None | All system scope, organization/unit scope | Any | Yes or operational trace | FR39, FR40 |
| Create audit record from domain action | System generated | System generated | System generated | System generated | System generated | System generated | Same as source action | Same as source action | Yes | Audit-Log Requirements |

### 7.9 Notifications, Reminders And Work Queues

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Receive in-app notification | Read own | Read own | Read own | Read own | Read own | Read own | User-specific scope | Any | No | FR41 |
| Generate workflow notification | Manage templates/config | Trigger by scoped workflow | Trigger by authority workflow | Trigger by own workflow actions | Trigger by assigned workflow actions | Trigger by assigned review workflow | Recipient permission scope | State-dependent | Operational trace recommended | FR41 |
| Send email notification | Manage templates/config | Trigger by scoped workflow | Trigger by authority workflow | Trigger by own workflow actions | Trigger by assigned workflow actions | Trigger by assigned review workflow | Recipient permission scope | State-dependent | Operational trace recommended | FR42 |
| Generate reminders | Manage configuration | Manage scoped reminders | Read/act scoped reminders | Read own reminders | Read own reminders | Read own reminders | Role and data scope | Waiting report, delayed project, task open/in progress | Operational trace recommended | FR43 |
| View work queue | Read scoped | Read scoped | Read authority scoped | Read own | Read own/assigned | Read assigned review queue | Role, scope, assignment | Any | No | FR44 |

### 7.10 Dashboard, Search, Reports And Export

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Project Member | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View role-based dashboard | Read all/admin dashboard | Read scoped dashboard | Read authority dashboard | Read own/project dashboard | Read assigned/project dashboard | Read assigned review dashboard | Role and data scope | Any | No | FR45, Story 7.2 |
| Drill down from dashboard widget | Read scoped | Read scoped | Read authority scoped | Read own | Read assigned/participating | Read assigned | Same as target record scope | Any | No | FR47, Story 7.2 |
| Search/filter operational records | Read scoped | Read scoped | Read authority scoped | Read own | Read participating/assigned | Read assigned | Role and data scope | Any | No | FR46, Story 7.1 |
| View report | Read scoped | Read scoped | Read authority scoped | Read own if report supports it | Read assigned if report supports it | Read assigned if report supports it | Role and data scope | Any | No | FR49, Story 7.3 |
| Export Excel/PDF | Export scoped | Export scoped | Export authority scoped | Export own if allowed | Export assigned if allowed | Export assigned if allowed | Role and data scope | Any | Yes | FR48, Story 7.3 |

## 8. Critical Negative Rules

- Frontend-only authorization is not sufficient.
- Backend must enforce every protected action.
- Users must not see cross-unit data unless explicitly permitted.
- Reviewer / Committee Member must not access unassigned proposals.
- Reviewer, committee member, or council member assignment must be denied when
  conflict policy identifies the candidate as PI, project/proposal participant,
  scientific secretary, or another excluded role on the same business record.
- Principal Investigator must not edit submitted proposals unless workflow state
  allows supplement, resubmission, or another explicit domain action.
- Project Member must not access projects they do not participate in.
- Scientific Secretary must not be treated as a global system role and must not
  approve/reject proposals, projects, council records, or ethics dossiers unless
  a separate approval authority rule explicitly grants that decision.
- Approval authority must not self-approve records where the same user is PI,
  project/proposal participant, scientific secretary, reviewer, council member,
  or another conflict role under policy.
- File access must not be granted by object key alone.
- Dashboard, search, export, notification, and audit views must respect role and
  data scope.
- Direct status mutation is forbidden; workflow transitions must go through
  explicit domain actions.
- Sensitive actions must fail closed when role, data scope, participation role,
  assignment scope, conflict policy, or state context cannot be resolved safely.
- Search results, dashboard totals, export files, notifications, audit views, and
  file metadata must not leak unauthorized records.

## 9. Audit Requirements By Action

| Action | Audit Required | Minimum Context |
| --- | --- | --- |
| login | Yes | actor, username, timestamp, result, request context |
| logout | Yes | actor, username, timestamp, result, session context |
| create/update/deactivate user | Yes | actor, target user, action, before/after status where feasible |
| assign role/scope | Yes | actor, target user, role, scope, timestamp |
| create/update/open/close intake period | Yes | actor, intake period id/code, from/to status, timestamp |
| create/update proposal draft | Yes | actor, proposal id, changed section or safe summary, timestamp |
| upload/download/replace important file | Yes | actor, file id, target entity, action, timestamp, safe metadata |
| submit proposal | Yes | actor, proposal id, from/to status, timestamp |
| request supplement | Yes | actor, proposal id, reason, due date, timestamp |
| resubmit proposal | Yes | actor, proposal id, from/to status, timestamp |
| assign reviewer | Yes | actor, proposal id, reviewer/committee member id, timestamp |
| submit score/comment | Yes | actor, proposal id, review id, submitted status, timestamp |
| consolidate evaluation | Yes | actor, proposal id, evaluation summary id, timestamp |
| approve/reject | Yes | actor, target record, decision, from/to status, timestamp, note if provided |
| create approved project | Yes | actor, source proposal id, approved project id, timestamp |
| create/update milestone | Yes | actor, project id, milestone id, before/after state where feasible |
| submit progress report | Yes | actor, project id, report id, reporting period, timestamp |
| create adjustment/extension request | Yes | actor, project id, request id, request type, timestamp |
| approve/reject adjustment/extension | Yes | actor, project id, request id, decision, timestamp |
| create/assign task | Yes | actor, task id, assignee/collaborator ids, linked record, timestamp |
| update task status | Yes | actor, task id, from/to status, timestamp |
| export report | Yes | actor, report type, filters, scope, export format, timestamp |

## 10. Implementation Notes

- This file is the source of truth for phase 1 permission implementation.
- Backend policies must combine system role, organization/unit scope, record
  participation role, assignment scope, project participation, task
  participation, workflow state, and conflict policy.
- Participation roles such as PI, project member, scientific secretary,
  reviewer, council member, and ethics reviewer should be stored on the relevant
  business relationship or assignment record, not inferred from a global user
  role alone.
- Proposal/project participation, review assignment, council membership, ethics
  reviewer assignment, and task assignment may use separate domain models when
  their validation, conflict policy, lifecycle, or audit requirements differ.
- UI button visibility may use this matrix for UX hints, but backend checks are
  mandatory and authoritative.
- Participation must be resolvable from the record to a user account. A
  participation entry stored only as descriptive text cannot be used to evaluate
  conflict policy, and any conflict rule that depends on it is unenforceable
  until that linkage exists.
- The effective participation role for the current user should be returned with
  the record so the UI can state the viewer's role on that record. The UI must
  not derive the record role from the account-level system role.
- When conflict policy denies an action, the denial reason should be available to
  the UI so the blocked control can explain itself rather than disappear.
- API tests and manual QA should include allowed and denied cases for every
  protected capability.
- Dashboard aggregates, search counts, report exports, notifications, and file
  metadata must be tested for cross-scope leakage.
- Permission checks should return a fail-closed result when context is missing or
  ambiguous.
- Legacy roles removed: ADM, LD, VT, TBP, CB, HD, BC. These are replaced by the
  six canonical roles in section 2.
