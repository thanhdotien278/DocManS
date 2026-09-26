# Permission Matrix - DocManSystem / RTMS

> **Approved decision baseline:** [`docs/authorization-core-business-baseline.md`](./authorization-core-business-baseline.md)
> is the latest product decision record for system roles, record-scoped roles,
> workflow and core business behavior. This matrix remains the detailed
> implementation matrix; any conflicting assumption must be reconciled against
> the baseline before coding.

## 1. Purpose

This document is the detailed phase 1 permission matrix for DocManSystem / RTMS.
It defines role-based, data-scope, state-based, and audit expectations for
implementation, review, testing, and QA. The approved product decisions are
maintained in the linked baseline so that future UX and code work has one
explicit decision source.

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

### Scientific Management Head / Truong phong quan ly khoa hoc

- System role: `SCIENTIFIC_MANAGEMENT_HEAD`, distinct from leadership authority.
- Can view all proposals/projects within explicitly authorized Scientific Management
  scope, including current responsible Staff, unassigned records, workload, status
  and deadlines; filter/group by responsible Staff.
- Head assigns/reassigns/revokes officers, assigns/reassigns/revokes reviewer and
  committee positions, drafts/finalizes synthesis, submits eligible completed
  proposal packages, and finally approves/rejects Project Extension requests in
  Golden Flow 4. Head does not approve Project Adjustment requests.

### Scientific Management Staff / Chuyen vien quan ly khoa hoc

- Main responsibility: operate proposal intake, completeness review, reviewer
  monitoring, approved-project follow-up, reminders, and operational reporting.
- Staff can monitor named reviewer/council assignments, deadlines, pending work and
  backend-derived blockers on assigned proposals. Reviewer assignment, synthesis,
  finalization and proposal package submission belong to the scoped Head. Assigned
  project Staff reviews/accepts progress reports and finally approves/rejects
  Project Adjustment requests.
- Default management scope: only proposals/projects with an effective
  `PROPOSAL_MANAGEMENT_OFFICER` / `PROJECT_MANAGEMENT_OFFICER` assignment to this
  Staff account, plus explicitly granted organization scope. Never institution-wide
  from role alone. Intake/profile operations retain their separate scope rules.
- Staff can access other records through valid PI/member/secretary/reviewer/council/
  task relationships, with only that relationship's actions and disclosure.
- Neither Staff nor Head has proposal final approval authority from this management
  role. Golden Flow 4 grants assigned Staff final Project Adjustment decisions and
  scoped Head final Project Extension decisions only.

### Leadership / Approval Authority / Lanh dao / Nguoi phe duyet

- Main responsibility: review decision-ready proposals before project execution and
  monitor authorized project information. Project Adjustment and Project Extension
  decisions are outside this role in Golden Flow 4.
- Default data scope: approval authority scope and permitted organization/unit
  scope.
- Important limits: proposal approval actions must follow workflow state rules and
  cannot bypass required review, consolidation, or history; Leadership cannot
  approve/reject Project Adjustment or Project Extension requests.

### Research Oversight Authority / Pho Giam doc phu trach NCKH

- Institutional proposal/project oversight inside explicit scopes, read-only unless an
  independent PI/member/reviewer relationship grants its own action.
- Internal researcher eligibility includes draft creation and PI edit/submit/resubmit.
- Deny all role-derived final proposal/rejection, council establishment, funding and acceptance decisions.
- Only operational review counts/status/deadlines are disclosed from oversight. Sensitive
  identity, scores, comments and internal consolidation require separate disclosure authority.

### External Researcher User / Nha nghien cuu ben ngoai

- Main responsibility: work only on explicitly related records, approved-topic/task
  contributions, or assigned review work.
- Default data scope: explicit record relationship or assignment scope only.
- Important limits: cannot create or formally submit proposals, edit submitted
  versions, change PI/members/objective/budget/status, assign users, or make a
  final decision. This account-level role never replaces a record relationship.

### Record-scoped business personas

The following headings are business relationships/personas, not account-level
system roles. A user with one of the seven system roles may hold one or more of
these relationships on different records.

#### Principal Investigator / Chu nhiem de tai

- Main responsibility: create proposal drafts, submit proposals, respond to
  supplement requests, track approved projects, submit progress reports, and
  request adjustments or extensions.
- Default data scope: own proposal and approved-topic scope. Proposal creation,
  submission, and resubmission remain PI-only.
- Important limits: cannot edit submitted proposals unless the workflow state
  allows supplement, resubmission, or another explicit domain action.

#### Topic Team Member / Thanh vien de tai

- Main responsibility: participate in proposal or approved-topic work, view
  permitted information, update assigned work, and contribute evidence/files.
- Default data scope: `TOPIC_MEMBER` participation scope and task
  assignee/collaborator scope.
- Important limits: cannot access projects, files, reports, or tasks outside
  participation or assignment scope.

#### Reviewer / Committee Member / Reviewer / Hoi dong

- Main responsibility: access assigned proposal/review records, submit scores,
  comments, recommendations, and participate in controlled evaluation or
  acceptance workflows.
- Default data scope: reviewer assignment scope.
- Important limits: cannot see unassigned proposals and cannot change another
  reviewer or committee member's review.

### Record-Scoped Participation And Assignment Roles

The seven canonical account roles are `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD`,
`SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`, `RESEARCH_OVERSIGHT_AUTHORITY`,
`RESEARCHER_INTERNAL_USER`, and `EXTERNAL_RESEARCHER_USER`. Scientific work roles such
as `PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER`, reviewer,
council chair, council secretary, council member, and ethics reviewer must be
resolved in the context of a specific proposal, approved topic, council, ethics
dossier, review, task, or related business record. A proposal has one
`PROPOSAL_PI` derived from `ownerId`; its team contains only
`TOPIC_SECRETARY` and `TOPIC_MEMBER`.

Do not grant global access by assigning `PROPOSAL_PI`, `TOPIC_PI`,
`TOPIC_MEMBER`, `TOPIC_SECRETARY`, `REVIEWER`, or similar participation labels
directly to a user account. Backend authorization must calculate effective
permission from system role, organization/unit scope, record participation
role, assignment scope, workflow state, and conflict policy.

Common record-scoped roles:

| Role Type | Examples | Scope Boundary | Important Limits |
| --- | --- | --- | --- |
| Management responsibility | `PROPOSAL_MANAGEMENT_OFFICER`, `PROJECT_MANAGEMENT_OFFICER` | One proposal/project | At most one active primary Staff officer per record; history/audit retained on assign/reassign/revoke. |
| Proposal participation | `PROPOSAL_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | One proposal | Does not grant access to unrelated proposals; PI is derived from `ownerId`. |
| Approved-topic participation | `TOPIC_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | One approved topic | Team permissions depend on active relationship and workflow state. |
| Review assignment | Reviewer, committee reviewer | One proposal, ethics dossier, or review package | Assignment-scoped only; no access to unassigned records. |
| Council membership | Chair, secretary, member, reviewer | One council | Council secretary cannot approve/reject unless separately authorized by policy. |
| Task assignment | Owner, assignee, collaborator | One task and linked record | Task access still depends on linked-record permission. |

## 3. External Researcher User Overlay

The detailed matrices below retain PI, topic-team, and reviewer columns as
compact record-context shorthand. Apply this overlay to every row in addition
to the seven account-level system roles:

| Capability | `EXTERNAL_RESEARCHER_USER` rule |
| --- | --- |
| Authentication and account context | May sign in only while active; the session exposes the external system role and never invents PI/member/reviewer authority. |
| Profile and account administration | No user, role, scope, profile, account-link, catalog, or configuration management. A profile may exist independently of login. |
| Proposal discovery and detail | Read only proposals with an explicit active relationship or assignment, using the record disclosure rules. Same unit, name, or another record relationship does not grant access. |
| Proposal draft | Read only when an explicit relationship permits; no create, edit, submit, or resubmit authority. |
| Submission and decisions | No proposal creation, formal submission, resubmission, reviewer assignment, consolidation, approval, rejection, reopen, or final decision. |
| Review work | Read and submit only an explicitly assigned review package, subject to assignment lifecycle and disclosure. No unassigned records, other reviewers' work, reviewer assignment, or same-record decision. |
| Project, task, and file work | Read or contribute only where a separate active record relationship/assignment grants the exact action. Task/file access never widens linked-record scope. |
| Dashboard, search, export, notification, and history | Include only records already visible through the same relationship/assignment policy; no privileged audit, hidden conflict source, reviewer identity, raw review, or out-of-scope metadata. |

The backend rechecks role, scope, relationship/assignment, workflow state,
conflict, and any applicable delegation contract at mutation time. Proposal
creation, submission, and resubmission never use delegation. UI capability data
never grants an action by itself.

## 4. Permission Legend

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

## 5. Scope Rules

| Scope Rule | Definition |
| --- | --- |
| All system scope | The role can access the capability across the system where this does not violate a business-decision boundary. |
| Organization/unit scope | Access is limited to permitted organization or unit boundaries. |
| Assigned staff scope | Management access requires an effective `PROPOSAL_MANAGEMENT_OFFICER` or `PROJECT_MANAGEMENT_OFFICER` on the exact record plus explicit organization scope; operating on a record in the past is not a grant. |
| Head oversight scope | All proposals/projects within explicitly authorized Scientific Management scope, subject to conflict/disclosure; not final-decision or blanket mutation authority. |
| Approval authority scope | Access is limited to records the leadership or approval authority is allowed to decide or inspect. |
| Own proposal/topic scope | Access is limited to proposals or approved topics owned by the principal investigator. |
| Proposal participation scope | Access is limited to proposals where the user has an active `PROPOSAL_PI`, `TOPIC_MEMBER`, or `TOPIC_SECRETARY` relationship. |
| Approved-topic participation scope | Access is limited to approved topics where the user has an active `TOPIC_PI`, `TOPIC_MEMBER`, or `TOPIC_SECRETARY` relationship. |
| Reviewer assignment scope | Access is limited to proposals, reviews, or committee work assigned to the reviewer or committee member. |
| Council membership scope | Access is limited to councils, council records, or ethics dossiers where the user has a valid council membership or assignment. |
| Task assignee/collaborator scope | Access is limited to tasks where the user is owner, assignee, collaborator, creator, or otherwise explicitly authorized. |
| Conflict policy scope | Access or assignment is denied when the actor has a conflicting role on the same business record, such as PI self-review or authority self-approval. |

## 6. State Rules

| State Rule | Authorization Meaning |
| --- | --- |
| Draft | Proposal draft content may be created or updated only by the current internal PI; no team member, secretary, staff user, external researcher, or delegate can create or submit it. |
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
| Waiting report submission (derived flag) | Active project PI submits the formal report; members may contribute evidence only through an explicit relationship capability. |
| Report under review | Assigned project Staff reviews, accepts, or requests supplementation; Leadership only monitors permitted summaries. |
| Pending adjustment | Active `TOPIC_PI` submits a typed milestone/scope-plan/membership request; assigned project Staff reviews and approves/rejects. Head and Leadership decision actions are denied. |
| Pending extension | Active `TOPIC_PI` submits a later end-date request; assigned project Staff validates/prepares, then scoped Head approves/rejects. Leadership decision actions are denied. |
| Completed/accepted | Records are mostly read-only except history, reporting, and explicitly allowed archival actions. |
| Task open/in progress/completed/cancelled | Task action availability depends on current task state, assignee/collaborator scope, and linked-record permission. |

## 7. High-Level Role Matrix

| Capability Group | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User, role, organization administration | Manage | None | None | None | None | None | All system scope | Any | Yes |
| Shared catalogs and configuration | Manage | Read | Read | Read where needed | Read where needed | Read where needed | All system scope | Any | Yes for changes |
| Proposal intake period management | Manage | Manage | Read | Read applicable | None | None | Organization/unit scope | Draft, open intake, closed intake | Yes |
| Proposal draft creation and editing | None | Read scoped | Read scoped | Create/Update own | None | None | Own proposal scope | Draft | Yes |
| Proposal attachment upload/view/download | Read scoped | Read scoped | Read scoped | Create/Read own | Secretary: Create/Read; Member: Read | Read assigned | Record-level scope | Draft, needs supplement, under review | Yes for important file actions |
| Proposal formal submission | None | None | None | Submit own | None | None | Own proposal/topic scope | Draft, open intake | Yes |
| Proposal completeness review | None | Review | Read | Read own | Read if participating | None | Organization/unit scope | Submitted, resubmitted | Yes when decision affects workflow |
| Supplement request | None | Submit request | Read | Read/respond | Read if participating | None | Organization/unit scope | Submitted, needs supplement | Yes |
| Proposal resubmission | None | Read | Read | Submit own | None | None | Own proposal/topic scope | Needs supplement | Yes |
| Reviewer/committee assignment | None | Assign with conflict check | Read | None | None | Read assigned | Proposal capability, organization/unit scope, reviewer assignment scope, conflict policy scope | Submitted, resubmitted, under review | Yes |
| Reviewer scoring and comments | None | Read/Review | Read | None unless policy allows result view | None | Review/Submit assigned | Reviewer assignment scope | Under review | Yes |
| Evaluation consolidation / Trình phê duyệt | None | Review/Update and send completed dossier to leadership | Read | None | None | None | Proposal capability, organization/unit scope, conflict policy scope | Under review, ready for approval | Yes |
| Approval/rejection decision | None | Read only; no final decision action | Approve/Reject with conflict check | Read result | Read result if participating | None | Approval authority scope, conflict policy scope | Ready for approval | Yes |
| Approved project creation | None | Create/Manage | Read | Read own | Read if participating | None | Organization/unit scope | Approved | Yes |
| Milestone/checkpoint management | None | Manage | Read/Review | Read/Update own allowed items | Read assigned or team-secretary-scoped items | None | Organization/unit scope, approved-topic participation scope | Active project | Yes for changes |
| Progress report submission | None | Read/Review | Read | Submit own | Evidence contribution only; no formal submission | None | Own proposal/topic scope, approved-topic participation scope | Waiting report, active project | Yes |
| Project evidence upload | Read scoped | Read/Review | Read scoped | Create own | Create assigned team evidence | None | Approved-topic participation scope | Active project, waiting report | Yes |
| Progress report review/follow-up | None | Review/Accept/Request supplement | Read/Monitor | Read/respond | Read/respond assigned | None | Assigned project-officer scope | Submitted report, delayed project | Yes |
| Project Adjustment request | None | Read/Review | Read/Monitor | Create/Submit own | None | None | Own approved-topic scope | Active project | Yes |
| Project Adjustment decision | None | Approve/Reject with conflict check | None; Head may monitor only | Read result | Read result if participating | None | Assigned project-officer scope | `under_staff_review` | Yes |
| Project Extension request | None | Read/Validate/Prepare | Read/Monitor | Create/Submit own | None | None | Own approved-topic scope | Active project | Yes |
| Project Extension decision | None | Read result | Approve/Reject with conflict check | Read result | Read result if participating | None | Head Scientific Management scope, conflict policy scope | `ready_for_head_decision` | Yes |
| Acceptance/final review | None | Review/Prepare | Approve/Reject with conflict check | Read/Submit required context | Read assigned | Review if assigned | Approval authority scope, reviewer assignment scope, conflict policy scope | Waiting decision, completed/accepted | Yes |
| Task creation and assignment | Read scoped | Create/Assign | Create/Assign in authority scope | Create in own topic or team-scoped scope | None unless explicitly assigned | None | Task assignee/collaborator scope, linked record scope, conflict policy scope | Task open/in progress/completed/cancelled | Yes |
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

### Scientific Management rules for every matrix row

The Staff column in sections 7–8 is a conditional operational grant: for a
proposal/project or its derivatives it always requires the current officer
assignment and explicit scope. Participation/review/council access uses its own
column; it cannot satisfy the Staff administrative grant. A revoked officer with
another valid relationship retains only that relationship's allowed access.
Independent intake, profile and other-domain actions retain their existing exact
capability/scope checks and grant no proposal/project visibility. Head does not
inherit the Staff column; Deputy never inherits Director decision cells. Apply this Head/Staff matrix:

| Capability | `SCIENTIFIC_MANAGEMENT_HEAD` | `SCIENTIFIC_MANAGEMENT_STAFF` |
| --- | --- | --- |
| Proposal/project list, detail, search | All within authorized Scientific Management scope, with disclosure/conflict limits | Management view only for own active officer assignments; other reads via independent legitimate relationships |
| Responsible officer / unassigned state | See current responsible Staff or unassigned; filter/group by officer | Own management responsibility only; no unassigned queue or other Staff workload through role alone |
| Workload, status, deadlines, counts/facets, dashboard, reports/export | Authorized-scope aggregates, same record filters for drill-down/export | Management aggregates only for own assignments; participation/review queues retain their own access basis |
| Assign/reassign/revoke primary officer | Head capability plus scope, current context and no conflict | Deny; no self-assignment or assignment of other officers |
| Completeness, reviewer monitoring, synthesis, project administration | Assign/reassign/revoke reviewers and council members; draft/finalize/submit eligible proposal synthesis packages; manage project officers; final Project Extension decision with exact scope/conflict checks | Completeness and named review-progress monitoring; progress-report review/accept/supplement; final Project Adjustment decision with exact project-officer assignment, scope, state and no conflict |
| Final approve/reject | Proposal decision: deny from Head role; Project Extension: approve/reject in `ready_for_head_decision`; Project Adjustment: deny | Proposal decision: deny from Staff role; Project Adjustment: approve/reject in `under_staff_review`; Project Extension: deny |
| Notifications, files and workflow/business history | Re-authorize source record and disclosure for every surface | Same; officer revocation ends management access immediately, independent participation remains |

A participant cannot simultaneously be the management officer, reviewer, evaluation/
acceptance council member or final decision actor on the same record. Reviewer and
final decision in the same round, and mutually exclusive council positions, are
also denied. Check on assignment creation/change, participant changes and again on
protected action execution. Reassignment must atomically end the prior officer,
preserve history/audit and prevent competing primary officers. Zero officers is a
valid unassigned state; unresolved officer context is a fail-closed error.

Validation must cover Head in/out of scope, assigned/unassigned/revoked Staff,
Staff with participation only, both orders of conflicting assignments, concurrent
reassignment, same-round decision conflict, and identical filtering across all required
surfaces (including files and workflow/business history).

## 8. Detailed Module Permission Matrix

### 8.1 Identity, Roles, Organizations

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create user account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Update user account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Activate/deactivate or lock account | Manage | None | None | None | None | None | All system scope | Any | Yes | FR1, Story 1.3 |
| Assign role to user | Manage | None | None | None | None | None | All system scope | Any | Yes | FR2, Story 1.3 |
| Assign organization/unit scope | Manage | None | None | None | None | None | All system scope | Any | Yes | FR3, FR6, Story 1.3 |
| Load role-aware session context | Manage | Read own context | Read own context | Read own context | Read own context | Read own context | Current user scope | Any | No | FR4, FR5, FR6 |

### 8.2 Catalogs And Configuration

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View shared catalogs | Read | Read | Read | Read where needed | Read where needed | Read where needed | Role and data scope | Any | No | FR7, Story 1.4 |
| Create/update catalog item | Manage | None | None | None | None | None | All system scope | Any | Yes | FR7, Story 1.4 |
| Soft delete catalog item | Manage | None | None | None | None | None | All system scope | Any | Yes | FR7, Story 1.4 |
| Configure system parameters | Manage | None | None | None | None | None | All system scope | Any | Yes | FR8, Story 1.4 |
| Configure notification templates | Manage | None | None | None | None | None | All system scope | Any | Yes | FR8, FR41-FR43, Story 1.4 |
| Evaluate permission primitive | Manage | Read policy result | Read policy result | Read policy result | Read policy result | Read policy result | Role, scope, and state context | Any | No | FR6, FR6a, NFR7, NFR8, Story 1.4 |

### 8.3 Proposal Intake And Submission

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create intake period | Manage | Create | Read | None | None | None | Organization/unit scope | Draft | Yes | FR9, Story 2.1 |
| Update intake period | Manage | Update | Read | None | None | None | Organization/unit scope | Draft, open intake | Yes | FR9, Story 2.1 |
| Open intake period | Manage | Update | Read | Read applicable | None | None | Organization/unit scope | Draft, open intake | Yes | FR9, Story 2.1 |
| Close intake period | Manage | Update | Read | Read applicable | None | None | Organization/unit scope | Open intake, closed intake | Yes | FR9, Story 2.1 |
| List applicable intake periods | Read | Read scoped | Read scoped | Read applicable | None | None | Role and organization/unit scope | Open intake | No | FR9, Story 2.1 |
| Create proposal draft | None | None | None | Create own | None | None | Own proposal scope | Open intake, draft | Yes | FR10, Story 2.2 |
| Update proposal draft | None | Read scoped | Read scoped | Update own | None | None | Own proposal scope | Draft | Yes | FR10, FR11, Story 2.2 |
| Upload proposal attachment | Read scoped | Read scoped | Read scoped | Create own | Secretary: Create; Member: None | None | Proposal relationship scope | Draft, needs supplement | Yes | FR12, FR36, Story 2.3 |
| View/download proposal attachment | Read scoped | Read scoped | Read scoped | Read own | Read if participating | Read assigned | Record-level scope | Any allowed proposal state | Yes for important downloads | FR12, FR36, Story 2.3 |
| Check submission readiness | None | Read scoped | Read scoped | Read own | Read if participating | None | Own proposal/topic scope | Draft | No | FR13, Story 2.3 |
| Submit proposal formally | None | None | None | Submit own | None | None | Own proposal scope; omit the submit section for non-PI viewers | Draft, open intake | Yes | FR14, FR22, Story 2.4 |
| View submission history | Audit/View History scoped | Audit/View History scoped | Audit/View History scoped | Read own | Read if participating | Read assigned if policy allows | Same as proposal scope | Submitted or later | No | FR14, FR38, Story 2.4 |

### 8.4 Proposal Review, Supplement And Approval

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review proposal completeness | None | Review | Read scoped | Read own | Read if participating | None | Organization/unit scope | Submitted, resubmitted; once per current submitted version | Yes when state changes | FR15, Story 3.1 |
| Request supplement | None | Submit request | Read scoped | Read own request | Read if participating | None | Organization/unit scope | Submitted, needs supplement; due date is a whole calendar day | Yes | FR15, Story 3.1 |
| Respond to supplement request | None | Read scoped | Read scoped | Update/Submit own | None | None | Own proposal scope | Needs supplement | Yes | FR16, Story 3.1 |
| Assign reviewer or committee member | None | Assigned officer: assign with conflict/exclusivity check | Operational counts/status only | None | None | Read assigned after assignment | Organization/unit scope plus source-record/evaluation-context compatibility and multiplicity | Submitted, resubmitted, under review | Yes | FR17, FR67a, Story 3.2 |
| Change reviewer assignment | None | Assigned officer: revoke/end then assign with conflict/exclusivity check | Operational counts/status only | None | None | Read assigned after assignment | Same owning mutation and non-overlapping interval rules as initial assignment | Under review | Yes | FR17, FR67a, Story 3.2 |
| Access assigned review package | None | Only through independent reviewer assignment | Only through independent reviewer assignment | None | None | Read assigned | Reviewer assignment scope | Under review | No | FR18, Story 3.2 |
| Submit score/comment/recommendation | None | Only through independent reviewer assignment | Only through independent reviewer assignment | None | None | Review/Submit assigned | Reviewer assignment scope | Under review | Yes | FR18, Story 3.3 |
| Consolidate evaluation outcome | None | Assigned officer: review/update without conflict | Operational counts/status; decision package only after routing | None | None | None | Organization/unit scope | Under review, ready for approval | Yes | FR19, Story 3.4 |
| View evaluation output before decision | None | Read scoped | Read authority scoped | None unless policy allows result view | None unless participating view is allowed | Read own submitted review | Approval authority scope, reviewer assignment scope | Ready for approval | No | FR20, Story 3.5 |
| Approve/reject proposal | None | None | Approve/Reject with conflict check | Read result | Read result if participating | None | Approval authority scope, conflict policy scope | Ready for approval | Yes | FR21, FR22, FR67a, Story 3.5 |

Assignment and decision cells above inherit the single authoritative
compatibility/multiplicity matrix and stable reason codes from
`docs/authorization-core-business-baseline.md#evaluation-position-compatibility-and-multiplicity`.
Candidate filtering is explanatory; single, bulk, import, direct-API and
administrative writes must re-evaluate that policy inside the owning mutation.

#### 8.4.1 Read-Scope Contract and Legacy EP-03 Alignment

These resolve the "read scoped" cells against the current authorization baseline.
Legacy EP-03 code does not yet enforce every rule below; see the
[Proposal Review & Approval plan](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md)
for the implementation gaps. This table is a contract, not a completion claim.

| Rule | Decision | Where |
| --- | --- | --- |
| Reviewer read | Granted only by an `assigned` or `completed` `ProposalReviewAssignment` row on that one proposal, and only while the proposal is in the formal workflow. The `reviewer` account role grants nothing by itself; a revoked assignment stops granting immediately. | `canReadProposal`, `ProposalReviewAccessService` |
| Reviewer file read | Resolved by the same assignment lookup as the proposal read, so the attachment list and the download agree. Upload still requires proposal ownership. | `FilesService.assertCanRead` |
| Leadership decision-package read | Requires explicitly granted authority scope, a routed proposal and no participation/reviewer conflict; role alone is insufficient. Other proposal reads require their own valid record context and disclosure. No implicit Academy-wide or organization-tree bypass. | Shared proposal/evaluation/file authorization; Story 5.7 |
| Approval authority | `LEADERSHIP_APPROVAL_AUTHORITY` plus explicit decision scope, routed record, current context, ready state and no conflict. System administrator and reviewer/committee assignments grant no final decision authority. | Shared capability and decision mutation; Story 5.8 |
| Head evaluation actions | `SCIENTIFIC_MANAGEMENT_HEAD` and explicit host scope, current completeness, no conflict; synthesis additionally requires all current required reviews. | `assertScientificManagementHeadScope`, `assertCurrentCompletenessEvidence` |
| Decision/consolidation conflict | Participation and reviewer conflicts override role/scope. An active evaluation position blocks the same-round decision; any persisted draft/submitted evaluation retains that conflict after assignment revocation/expiry. An ended assignment with no persisted evaluation creates no lasting conflict. | Shared conflict resolver; Stories 5.5, 5.7, 5.8 |

Proposal-detail presentation follows the same projection: the PI receives the edit/submission workspace, while scientific-management staff receive a read-only summary of the proposal, team, schedule, and expected budget. Supplement deadlines and reviewer-assignment effective/deadline values are entered as whole Vietnam calendar days; no hour/minute control is exposed.

Workflow states used by EP-03: `submitted` / `resubmitted` -> `under_review` (first reviewer
assignment) -> `ready_for_approval` (Head explicitly submits finalized synthesis after all required reviews) -> `approved` | `rejected`
(leadership decision). The allowed states per action are declared once in
`apps/api/src/proposals-shared/proposal-workflow.ts`. The proposal detail UI
renders the three review/approval sections only from the current proposal's
capability/assignment result: an `ACTION_NOT_GRANTED` action omits the section,
while conflict/state denials remain visible and disabled with the backend reason.
Researcher profile pages never host these proposal workflow sections.

### 8.5 Approved Project Tracking

Golden Flow 4 is specified in the [Project Execution contract](contracts/project-execution.md).
It preserves project-scoped `TOPIC_PI` (the requested `PROJECT_PI`) and assigned-Staff
monitoring. Leadership approves the proposal before execution only. After activation,
assigned Staff reviews/accepts reports and finally approves/rejects Project Adjustment;
assigned Staff validates/prepares Project Extension and scoped Head finally
approves/rejects it. Leadership has no decision action for either request type.
Submitted revisions and evidence are immutable; overdue is derived, never a project
workflow state. Assigned proposal Staff creates; Head separately assigns project Staff,
who confirms setup. Acceptance/council implementation belongs to the next flow.

Every grant below also requires active account, current context, exact scope,
workflow and conflict checks. Staff means the current project officer; proposal
officer access is not project authority. PI means active `TOPIC_PI`. Admin has no
implicit business grant; Deputy has scoped operational oversight only. Members
receive read/contribution capabilities only where their relationship permits.

| Action | PI | Assigned Staff | Head | Leadership approval authority | State / invariant |
| --- | --- | --- | --- | --- | --- |
| Create/confirm project | None | Current scoped proposal officer creates; independently assigned project officer confirms | Assign project officer separately | Proposal approval precedes this flow; no project action | Approved immutable source; no automatic officer copy |
| Assign/reassign/revoke project officer | None | None | Scoped, conflict-free | None | One current primary officer; history preserved |
| View project/milestones/history | Own permitted data | Assigned scoped data | Scoped, including unassigned | Scoped disclosure | Same filters for list/detail/count/files |
| Monitor deadlines | Own | Assigned scope | Scope | Operational scope | Overdue/report-due are derived flags |
| Plan milestones/members during setup | Read | `project.setup.configure` for initial milestones/checkpoints/responsibilities | Read | Read | Confirm setup before execution; assigned project officer confirms |
| Change controlled plan/membership after activation | Submit typed Project Adjustment | Review and approve/reject | Read/monitor only; no decision | Read/monitor only; no decision | No direct edits; scope is milestones, approved scope/plan, governed membership |
| Create/edit report draft and submit/resubmit | Own | Read submitted only | Permitted read | Permitted read | Submitted revisions/evidence locked; return permits new revision |
| Upload evidence | Own exact file grant | No PI-content overwrite | No PI-content overwrite | Monitoring metadata only | `project.evidence.contribute` for active member/secretary with responsibility for an open milestone; own unsubmitted file only; immutable submitted links |
| Begin report review / record acceptance / request supplement | Read/respond | Administrative review; accept or request supplement | Read/monitor | Read/monitor only | Accepted report does not accept project or change plan |
| Draft/submit Project Adjustment | Own | None | None | None | Typed milestone/scope-plan/membership values; no direct plan change |
| Review/approve/reject Project Adjustment | Read result | Review; approve/reject | Read/monitor; denied decision | Read/monitor; denied decision | `under_staff_review`; Staff approval applies only the typed change atomically |
| Draft/submit Project Extension | Own | None | None | None | Requested end date must be later; no end-date change on submission |
| Validate/prepare Project Extension | None | Assigned scope | Read/monitor | Read/monitor only | `under_staff_validation` → `ready_for_head_decision`; package/evidence retained |
| Approve/reject Project Extension | Read result | Read result | Scoped, conflict-free Head | Denied | `ready_for_head_decision`; Head decision atomically applies end date |

Acceptance/final-review permissions remain in their governing next-flow stories;
Golden Flow 4 introduces no acceptance/council endpoint. All mutations above are
audited. FR23–30b map to implementation Epic 6 stories 6.1–6.7 and 6.10; member
contributions remain distinct from formal PI submission under Story 6.4.

### 8.6 Tasks

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create standalone task | Read scoped | Create | Create in authority scope | Create in own project scope | None unless delegated | None | Role and data scope | Task open | Yes | FR31, Story 5.1 |
| Create task linked to proposal/project/report/event | Read scoped | Create | Create in authority scope | Create in own project or secretary-delegated scope | None unless delegated | None unless explicitly assigned workflow | Linked record scope, proposal/project participation scope | Task open | Yes | FR31, Story 5.1 |
| Assign task owner/collaborators | Read scoped | Assign | Assign in authority scope | Assign within own project scope if allowed | None unless delegated | None | Task assignee/collaborator scope, linked record scope, conflict policy scope | Task open/in progress | Yes | FR32, Story 5.1 |
| Update task status/progress/notes | Read scoped | Update scoped | Review scoped | Update own/assigned | Update assigned | None unless task assigned | Task assignee/collaborator scope | Task open/in progress/completed/cancelled | Yes | FR33, Story 5.2 |
| Attach task completion evidence | Read scoped | Update scoped | Read scoped | Update own/assigned | Update assigned | None unless task assigned | Task assignee/collaborator scope | Task open/in progress | Yes for important files | FR33, FR36, Story 5.2 |
| View overdue/upcoming tasks | Read scoped | Read scoped | Read authority scoped | Read own/assigned | Read assigned | Read assigned if applicable | Role and data scope | Task open/in progress | No | FR34 |

### 8.7 Files

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Upload important business file | Read scoped | Create scoped | Create if workflow allows | Create own | Create assigned | Create assigned review file if workflow allows | Record-level scope | State-dependent | Yes | FR36, FR37 |
| Replace important business file | Read scoped | Update scoped | Update if workflow allows | Update own allowed files | Update assigned allowed files | Update assigned review file if workflow allows | Record-level scope | State-dependent | Yes | FR36, FR37 |
| View file metadata | Read scoped | Read scoped | Read scoped | Read own | Read participating | Read assigned | Record-level scope | Any allowed source state | No | FR36, FR37 |
| Download important business file | Read scoped | Read scoped | Read scoped | Read own | Read participating | Read assigned | Record-level scope | Any allowed source state | Yes | FR36, File Attachment Requirements |
| Soft delete file | Manage if policy allows | Update scoped if policy allows | None unless authority action allows | Update own allowed files | None unless delegated | None | Record-level scope | State-dependent | Yes | FR36, FR37 |

### 8.8 Audit Logs And Workflow History

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View workflow history on business record | Audit/View History scoped | Audit/View History scoped | Audit/View History scoped | Read own | Read participating | Read assigned | Same as source record scope | Any | No | FR38, FR40 |
| Search audit logs | Audit/View History | Audit/View History if authorized | Audit/View History if authorized | None | None | None | All system scope, organization/unit scope | Any | No for read | FR39, FR40 |
| Export audit logs | Export | Export if authorized | Export if authorized | None | None | None | All system scope, organization/unit scope | Any | Yes or operational trace | FR39, FR40 |
| Create audit record from domain action | System generated | System generated | System generated | System generated | System generated | System generated | Same as source action | Same as source action | Yes | Audit-Log Requirements |

### 8.9 Notifications, Reminders And Work Queues

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Receive in-app notification | Read own | Read own | Read own | Read own | Read own | Read own | User-specific scope | Any | No | FR41 |
| Generate workflow notification | Manage templates/config | Trigger by scoped workflow | Trigger by authority workflow | Trigger by own workflow actions | Trigger by assigned workflow actions | Trigger by assigned review workflow | Recipient permission scope | State-dependent | Operational trace recommended | FR41 |
| Send email notification | Manage templates/config | Trigger by scoped workflow | Trigger by authority workflow | Trigger by own workflow actions | Trigger by assigned workflow actions | Trigger by assigned review workflow | Recipient permission scope | State-dependent | Operational trace recommended | FR42 |
| Generate reminders | Manage configuration | Manage scoped reminders | Read/act scoped reminders | Read own reminders | Read own reminders | Read own reminders | Role and data scope | Waiting report, delayed project, task open/in progress | Operational trace recommended | FR43 |
| View work queue | Read scoped | Read scoped | Read authority scoped | Read own | Read own/assigned | Read assigned review queue | Role, scope, assignment | Any | No | FR44 |

### 8.10 Dashboard, Search, Reports And Export

| Action | System Administrator | Scientific Management Staff | Leadership / Approval Authority | Principal Investigator | Topic Team (Secretary / Member) | Reviewer / Committee Member | Scope Rule | State Rule | Audit Required | Source Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| View role-based dashboard | Read all/admin dashboard | Read scoped dashboard | Read authority dashboard | Read own/project dashboard | Read assigned/project dashboard | Read assigned review dashboard | Role and data scope | Any | No | FR45, Story 7.2 |
| Drill down from dashboard widget | Read scoped | Read scoped | Read authority scoped | Read own | Read assigned/participating | Read assigned | Same as target record scope | Any | No | FR47, Story 7.2 |
| Search/filter operational records | Read scoped | Read scoped | Read authority scoped | Read own | Read participating/assigned | Read assigned | Role and data scope | Any | No | FR46, Story 7.1 |
| View report | Read scoped | Read scoped | Read authority scoped | Read own if report supports it | Read assigned if report supports it | Read assigned if report supports it | Role and data scope | Any | No | FR49, Story 7.3 |
| Export Excel/PDF | Export scoped | Export scoped | Export authority scoped | Export own if allowed | Export assigned if allowed | Export assigned if allowed | Role and data scope | Any | Yes | FR48, Story 7.3 |

## 9. Critical Negative Rules

- Frontend-only authorization is not sufficient.
- Backend must enforce every protected action.
- `EXTERNAL_RESEARCHER_USER` is an account-level role, not a substitute for a
  proposal/topic/review relationship. It is never a global PI, team member,
  reviewer, secretary, or approval role.
- External researchers may update only explicitly assigned approved-topic/task work and
  may review only explicitly assigned review work; they cannot create/edit/submit
  proposals, alter protected fields, assign, or decide finally.
- Users must not see cross-unit data unless explicitly permitted.
- Reviewer / Committee Member must not access unassigned proposals.
- Management officer, reviewer, committee member, or council member assignment must be denied when
  conflict policy identifies the candidate as PI, proposal/topic participant,
  `TOPIC_SECRETARY`, or another excluded role on the same business record.
- Principal Investigator must not edit submitted proposals unless workflow state
  allows supplement, resubmission, or another explicit domain action.
- Topic team members must not access approved topics they do not participate in.
- `TOPIC_SECRETARY` must not be treated as a global system role and must not
  approve/reject proposals, approved topics, council records, or ethics
  dossiers unless a separate approval authority rule explicitly grants that decision.
- Approval authority must not self-approve records where the same user is PI,
  topic/proposal participant, `TOPIC_SECRETARY`, reviewer, council member,
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

## 10. Audit Requirements By Action

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
| assign/reassign/revoke management officer | Yes | actor, proposal/project, old/new officer, effective interval, timestamp, reason, context/policy versions; atomic history and assignment |
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

## 11. Implementation Notes

- This file is the source of truth for phase 1 permission implementation.
- Backend policies must combine system role, organization/unit scope, record
  participation role, assignment scope, topic participation, task
  participation, workflow state, and conflict policy.
- Participation roles such as `PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_MEMBER`,
  `TOPIC_SECRETARY`, reviewer, council member, and ethics reviewer should be stored on the relevant
  business relationship or assignment record, not inferred from a global user
  role alone.
- Proposal/topic participation, review assignment, council membership, ethics
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
  seven canonical system roles in section 2; PI, member, secretary, reviewer,
  council, ethics, and task roles remain record-scoped relationships.

## User Account assignment contract

The [Reviewer / Council Assignment contract](authorization-core-business-baseline.md#reviewer--council-assignment-from-user-accounts)
is normative for `proposal.review.assign`, including revocation. Only scoped,
unconflicted Scientific Management Head may search candidates or mutate duties after current-submission completeness confirmation.
Any active user is eligible independently of account role, host-unit scope or
Scientist Profile. Both duties remain proposal-scoped; a reviewer assignment grants
review access across organization boundaries, never final decision authority.

| Operation | Required checks | Evidence / disclosure |
| --- | --- | --- |
| Search eligible accounts | Head role and explicit host scope, assignable state, current completeness evidence, active candidate account, no PI/team conflict or live duplicate | Only account ID, display name, username |
| Assign either duty | Recheck search eligibility, proposal context, effective dates/deadline; self-selection allowed for nonparticipants | Account ID and optional linked profile ID; atomic assignment and audit |
| Read package/files or submit own review | Effective assignment, no participation conflict, applicable state and disclosure; no assignee role/host scope/profile restriction | Own assignment and review only |
| Revoke either duty | Head role and explicit host scope, no actor participation conflict, assignable state, current context, nonblank reason | Retain history and submitted reviews; append audit and immediately end access |

`submitted` and `resubmitted` require current completeness evidence before the
first assignment opens `under_review`. Invalid or unresolved context denies.
Unlinked accounts store null profile provenance; existing provenance remains intact.

## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- Scoped SYSTEM_ADMIN and SCIENTIFIC_MANAGEMENT_STAFF manage internal/external
  profiles independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when staff/admin checks `Tạo tài khoản truy cập hệ thống`.
- Activation uses hashed single-use tokens, expires exactly after 48 hours and
  sends only a setup-password link. No temporary password is generated, emailed,
  persisted, returned to staff or placed in audit.
- Login accepts either configured username or account email. Username is optional
  at provisioning, unique when set later by the linked researcher in My Profile,
  and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.

### Researcher profile action matrix

| Action | SYSTEM_ADMIN / SCIENTIFIC_MANAGEMENT_STAFF | Linked active account | Other account |
| --- | --- | --- | --- |
| Directory/create/read/update/status | Exact granted organization scope | No directory; own profile through My Profile | Deny |
| Publication/participation edits | Exact granted organization scope | Own profile only | Deny |
| Account create/link/unlink/resend activation | Scoped, matching researcher account; email/context/reason as required | Deny | Deny |
| Own username update | Deny unless through explicit support flow | Own active linked account only | Deny |
| Own profile read/update | Own link if present | Current active linked profile; personal allowlist | Deny |
| History | Scope-filtered profile history | Own scientific/profile changes only | Deny |
| Normal features before mandatory change | Deny | Deny | Deny |

These profile permissions do not widen any business-record permission in this matrix.

### Finalized implementation scope — 2026-09-21

The current change implements this model on the existing proposal, intake, researcher-profile,
file and evaluation features. Approved projects, council-establishment/ethics lifecycles,
institutional dashboards, general search/report/export and notification/My Work backends
remain planned where no operational source exists. `PROJECT_MANAGEMENT_OFFICER` is a
contract relationship, not a persisted orphan assignment. Dashboard showcase data is not
an institutional report or proof of authorization. Future source domains must apply the
same current scope, relationship, conflict and disclosure checks before aggregates or drill-down.

Director and Deputy Director require institutional research dashboard views of available
proposal stages, overdue work, active/delayed/reporting-due/acceptance/completed projects,
funding and management workload. Only Director gets eligible proposal decision queues. Project adjustment queues
belong to assigned Staff and extension decision queues to Head. Head gets
responsible-officer/unassigned filters and workload; Staff sees assigned management records.
Proposal funding currently provides `budgetMetadata.amount` (requested funding). Approved,
used and remaining project funding and utilization are unavailable until their source exists;
never infer expenditure or add ledgers, payments, banking, invoices or ERP integration.
