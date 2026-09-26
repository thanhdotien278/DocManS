# Golden Flow 4 — Project Execution

Status: implementation in progress, 2026-09-23. This contract is the reconciled Golden
Flow 4 authority and execution boundary. It is normative for the Phase 2
implementation; acceptance/council/closure remains a later flow.

## Source and scope

Use baseline §§2.1, 4.4, Authorization Contracts V1, the permission matrix and
Epic 6 stories 6.1–6.7/6.10. The earlier product grouping calls project tracking
“Epic 5”; implementation story identifiers remain 6.x. Archives are not policy.

`PROJECT_PI` in the requested business flow means the existing project-scoped
`TOPIC_PI` relationship. Preserve that executable relationship identifier; do
not add a duplicate relationship or system role. Preserve all seven system roles.
`LEADERSHIP` means `LEADERSHIP_APPROVAL_AUTHORITY` for the proposal approval gate;
`RESEARCH_OVERSIGHT_AUTHORITY` has no final decision capability.

The slice is Leadership-approved proposal → explicit project creation → Head
officer assignment → assigned project Staff activation → execution/milestones →
reports/evidence and Staff monitoring → Staff-approved adjustments or
Head-approved extensions → continued execution.
Acceptance dossiers, acceptance councils, final acceptance and closure are next
flow work. Their business states remain documented, not exposed as bypass APIs.

## Creation, relationships and activation

Require an approved final proposal decision and its exact immutable submitted
version. Retain proposal ID, approved version/submission ID and decision ID;
never reinterpret the latest mutable proposal as the approved snapshot. Create
at most one project per proposal. Creation and source links, new project
relationships, history and audit are atomic. Duplicate creation must safely
return the existing authorized result or reject, never create a second project.

Copy approved PI/team data into independent project relationships; never share
mutable rows or copy proposal management authority. Initial state is “Chuẩn bị
triển khai”; confirmed setup moves to “Đang thực hiện” by a named domain action.
Head assigns/reassigns/revokes the project officer explicitly. Unassigned is valid.
At most one current primary officer; reassignment ends the predecessor and
retains its history. Only active, scoped, conflict-free Staff is eligible.

PI sees the approved scope, members, deadlines, milestones and permitted history.
Members/secretaries receive only exact relationship/responsibility grants,
including permitted evidence contributions, never formal PI submission or approval.
Assigned Staff configures initial milestones/checkpoints and their responsible
project member before confirming setup. A member's contribution upload requires
an active responsibility for an open milestone; members can change only their
own unsubmitted contribution files.
Enforce both directions of participant/management/evaluation incompatibility,
including overlapping effective intervals and concurrent assignment requests.

## Project and child lifecycles

Project business states remain “Chuẩn bị triển khai” → “Đang thực hiện”, with
optional “Tạm dừng” ↔ “Đang thực hiện”, then later “Chờ nghiệm thu” → “Đã nghiệm
thu” / “Không đạt” → “Đóng/lưu trữ”. No project enum exists in current Prisma;
map these once at implementation time, without duplicate label-based states.

Progress report lifecycle: `draft` → `submitted` → `under_review` → `accepted`.
Assigned Staff begins administrative review and records acceptance or requests
supplementation (`supplement_requested`) with a reason and response deadline.
Only active PI can revise and resubmit. A return creates a new editable revision;
resubmission returns to `submitted`. The earlier submitted content and evidence
remain immutable. Administrative acceptance records a report, not scientific
project acceptance, scope approval or authorization to change deadlines.

Adjustment lifecycle: `draft` → `submitted` → `under_staff_review` →
`approved` / `rejected`, with `supplement_requested` and PI resubmission as
needed. Assigned project Staff validates, reviews and makes the final decision.
There is no Head appraisal or Leadership decision stage for an adjustment.

Extension lifecycle: `draft` → `submitted` → `under_staff_validation` →
`ready_for_head_decision` → `approved` / `rejected`, with supplementation and a
new PI revision when required. Assigned project Staff performs administrative
validation and prepares the package; only the scoped, unconflicted Head makes the
final decision. Leadership has no extension decision action. There is no
arbitrary status-setting endpoint.

Reports include project/checkpoint, reporting period/deadline, progress/results,
issues/recommendations, milestone context, author, revision and pinned evidence.
Requests include project, type, requester, current/proposed values, reason,
submitted context/version, evidence, appraisal, decision, decidedBy/decidedAt,
status and append-only history. Extension records current and requested end date;
requested end must be later. Adjustment records typed before/proposed changes,
not unrestricted JSON patches to project fields.

## Controlled changes and decisions

No PI or Staff direct edit of approved duration/end date, important milestones,
approved scope/plan or governed project membership after activation. These use
first-class requests. Administrative monitoring records observations, checks,
clarification requests and routing; it cannot rewrite approved fields or submitted
content. An adjustment may contain only the documented controlled adjustment
scope: important milestone changes, approved scope/plan changes, and governed
membership changes. A duration increase or any requested end-date increase is an
extension and must use the extension workflow; it cannot be disguised as an
adjustment.

Decisions recheck current actor/account, organization scope, active relationships,
assignments, conflict, workflow and project/request versions within the mutation
transaction. Self-decision and participant final decisions are denied regardless
of additional relationships. Staff adjustment authority and Head extension authority grant no proposal,
council or acceptance decision rights. `LEADERSHIP_APPROVAL_AUTHORITY` and
`RESEARCH_OVERSIGHT_AUTHORITY` cannot decide either request.
Staff adjustment approval atomically applies only the submitted typed change and
audits before/after. Head extension approval atomically records the decision,
changes the effective end date, increments project version and audits
before/after. Rejection leaves the plan unchanged. Reject stale/conflicting
requests and safely reject duplicate terminal decisions. Changing an affected
approved baseline requires a fresh request review; never apply stale deltas.

## Deadlines, files, audit and disclosure

**OVERDUE IS A DERIVED TRACKING FLAG, NOT A PROJECT WORKFLOW STATE.**
Derive overdue from effective deadline, current time and completion/submission
facts. An unresolved past-due milestone/report remains visible with its original
deadline. A deadline miss never rejects, pauses, closes or advances a project.
Use repository date-only conventions for calendar-day inputs. Approaching/overdue
filters, counts and detail use the same authorized source query. An item is
approaching when its nearest open deadline falls within 14 days.

Evidence references immutable file versions and exact report/request revisions.
Reuse shared upload/finalize/download/version infrastructure and reauthorize every
operation. Submission pins evidence; replacement cannot change a pinned snapshot,
including through generic file routes. Resubmission creates new evidence links.
Reject wrong-record, missing, unfinalized or otherwise unusable evidence.

Append-only transactional history/audit covers creation/activation, relationships,
milestone changes, draft/evidence changes, submission/resubmission, supplementation,
validation/preparation, review/appraisal, decisions, resulting plan/deadline changes and
any supported project transition. Use actor/time/object/action/result/request and
correlation conventions with policy/context versions; preserve denial audit too.

Staff sees management records only with exact current project officer assignment
AND explicit scope. Head sees scoped cases, including unassigned records. Leadership
and `RESEARCH_OVERSIGHT_AUTHORITY` operational oversight does not disclose private appraisal material.
Only eligible decision actors receive a complete submitted decision package.
PI/members receive permitted feedback, not confidential management notes.
Apply these rules equally to files, history, lists, filters, counts and queues.

No working workflow-notification backend exists; current mail handles account
activation only. Record source
history for later integration; do not claim reminder delivery or build a second
notification framework in this slice.

## Capabilities and UX

Extend Authorization Contracts V1, not a second policy engine. Register named
project read/monitor/setup/officer actions, report draft/submit/review/supplement
and request-specific actions:

| Action | Authority / state |
| --- | --- |
| `project.read`, `project.monitor`, `project.history.read` | Scoped active PI/participant, assigned project Staff, Head, Leadership or Oversight; the granted subset follows each role's disclosure |
| `project.officer.assign`, `project.officer.revoke` | Scoped, conflict-free Head |
| `project.setup.configure`, `project.setup.confirm` | Assigned scoped Staff; preparing project |
| `project.evidence.contribute` | Active PI, or active member/secretary responsible for an open milestone during execution |
| `project.report.draft`, `project.report.submit` | Active PI; own draft revision during execution |
| `project.report.review`, `project.report.request-supplement` | Assigned scoped Staff; submitted/under_review |
| `project.report.accept` | Assigned scoped Staff; under_review |
| `project.adjustment.create`, `project.adjustment.edit-draft`, `project.adjustment.submit` | Active PI; own draft/returned revision during execution |
| `project.adjustment.review` | Assigned scoped Staff; submitted |
| `project.adjustment.request-supplement` | Assigned scoped Staff; submitted/under_staff_review |
| `project.adjustment.approve`, `project.adjustment.reject` | Assigned scoped Staff; under_staff_review |
| `project.extension.create`, `project.extension.edit-draft`, `project.extension.submit` | Active PI; own draft/returned revision during execution |
| `project.extension.validate` | Assigned scoped Staff; submitted → under_staff_validation |
| `project.extension.prepare` | Assigned scoped Staff; under_staff_validation → ready_for_head_decision |
| `project.extension.request-supplement` | Assigned Staff during validation or Head on prepared package |
| `project.extension.approve`, `project.extension.reject` | Scoped Head; ready_for_head_decision |

Head cannot decide adjustments; Staff cannot decide extensions;
`LEADERSHIP_APPROVAL_AUTHORITY` and `RESEARCH_OVERSIGHT_AUTHORITY` cannot decide either.
Enforce these denials in capabilities and direct APIs.
Use existing `allowedActions`, `blockedActions`, denial reasons and context tokens.
Account lock, inactive/expired/revoked relationship and missing/ambiguous context
remove mutation grants immediately. Backend is authoritative at mutation time.

Reuse `/projects`, `/my-projects` and `/projects/:id` patterns and current components:

| Workspace | Required content/actions |
| --- | --- |
| PI | My Projects, source/approved scope, members, milestones/timeline, deadlines, reports and immutable revisions, evidence upload, extension/adjustment forms, status/history |
| Assigned Staff | Monitoring list, approaching/overdue filters, reporting calendar, submitted evidence, report review/supplementation, adjustment review/approve/reject, extension validation/preparation |
| Head | Scoped/unassigned/officer views, officer management, prepared extension queue/package, appraisal and approve/reject/return |
| Leadership | Read-only authorized project monitoring; no execution decision queue or decision actions |

Show loading, empty, error, denied and stale-context states. Consequential actions
require accessible confirmation. Disabled actions explain backend denials. Use
responsive existing tables/cards/dialogs, keyboard/focus support and native date
inputs. React must not derive authority from a role or relationship string.

## Approved decisions and documentation gate

- Current scoped proposal Staff creates the preparing project from the approved
  immutable source. Creation grants no project authority. Head independently assigns
  project Staff, who confirms setup/activation. No automatic officer copy.
- Assigned scoped project Staff reviews and finally approves/rejects normal
  adjustments. Controlled changes apply only on the named Staff approval action.
- Assigned scoped Staff validates/prepares extensions; scoped unconflicted Head
  finally approves/rejects them. Only Head approval changes the extended end date.
- Leadership approval is the source proposal gate only. Leadership may monitor
  authorized project information but cannot decide execution changes/extensions.
- These user-approved rules replace the earlier Head-appraisal/Leadership-decision
  assumption. No authority question remains. Acceptance/councils remain next flow.

## Acceptance checks

Given a reviewed adjustment, when assigned Staff approves, then changes and audit
commit atomically; Head, Leadership and unrelated Staff are denied. Given a prepared
extension, when Head approves, then deadline and decision commit atomically; Staff,
Leadership and unprepared decisions are denied. Given rejection, no project field
changes. Given an adjustment extending end date, reject it and require the extension
workflow. Preserve all self/conflict/inactive/stale/duplicate denial and immutable
evidence checks. Enforce participant/management/reviewer/council incompatibility in
both assignment directions. Existing acceptance assignment workflows remain deferred.
