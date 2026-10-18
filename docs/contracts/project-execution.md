# Golden Flow 4 — Project Execution

Status: implementation in progress, 2026-09-23. This contract is the reconciled Golden
Flow 4 authority and execution boundary. It is normative for the Phase 2
implementation; acceptance/council/closure remains a later flow.

> Synced to [`permission-matrix.md`](../permission-matrix.md) (10 system roles,
> 18/10/2026; §7 and §9.5 govern on conflict). The `DocManS` branch code still ships
> the former 7 roles until `tuan/DocManS` merges.

## Source and scope

Use baseline §§2.1, 4.4, Authorization Contracts V1, the permission matrix and
Epic 6 stories 6.1–6.7/6.10. The earlier product grouping calls project tracking
“Epic 5”; implementation story identifiers remain 6.x. Archives are not policy.

`PROJECT_PI` in the requested business flow means the existing project-scoped
`TOPIC_PI` relationship. Preserve that executable relationship identifier; do
not add a duplicate relationship or system role. Use the ten system roles of the
permission matrix §2: QT `SYSTEM_ADMIN`, GĐ `LEADERSHIP_APPROVAL_AUTHORITY`, PGĐ-KH
`SCIENCE_DEPUTY_DIRECTOR`, PGĐ-TD `RESEARCH_OVERSIGHT_AUTHORITY`, TP
`RESEARCH_MANAGEMENT_HEAD`, PP `RESEARCH_MANAGEMENT_DEPUTY_HEAD`, TB
`RESEARCH_BOARD_HEAD`, CV `RESEARCH_MANAGEMENT_STAFF`, NCV `RESEARCHER_INTERNAL_USER`,
NNB `EXTERNAL_RESEARCHER_USER` (renamed from the former `SCIENTIFIC_MANAGEMENT_HEAD` /
`SCIENTIFIC_MANAGEMENT_STAFF`). GĐ alone approves the source proposal and signs
liquidation; GĐ or PGĐ-KH signs extension, adjustment (no funding change) and the
acceptance council. PGĐ-TD and PP only monitor and sign or route nothing.

The slice is GĐ-approved proposal → explicit project creation → TP¹/TB¹ project
officer (CV) assignment → assigned CV activation → execution/milestones →
reports/evidence and CV monitoring → adjustment/extension appraised by the assigned
CV and routed by tờ trình (TB → TP → GĐ or PGĐ-KH signs) → continued execution.
Acceptance dossiers, acceptance councils (signed by GĐ or PGĐ-KH), final acceptance,
liquidation (CV drafts → TB → TP → GĐ only signs) and closure are next flow work.
Their business states remain documented, not exposed as bypass APIs.

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
TP or TB, within unit scope, assigns/reassigns/revokes the project officer (a CV)
explicitly. Unassigned is valid. At most one current primary officer; reassignment
ends the predecessor and retains its history. Only an active, scoped, conflict-free
CV is eligible.

PI sees the approved scope, members, deadlines, milestones and permitted history.
Members/secretaries receive only exact relationship/responsibility grants,
including permitted evidence contributions, never formal PI submission or approval.
Members (NCV/NNB) update progress only on milestones they are responsible for.
The assigned CV configures initial milestones/checkpoints and their responsible
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
The assigned CV begins administrative review and records acceptance or requests
supplementation (`supplement_requested`) with a reason and response deadline; no
tờ trình is needed.
Only active PI can revise and resubmit. A return creates a new editable revision;
resubmission returns to `submitted`. The earlier submitted content and evidence
remain immutable; when the correction draft is created, the returned revision
becomes terminal `superseded` and the new revision links to it (`supersedesReportId`). Administrative acceptance records a report, not scientific
project acceptance, scope approval or authorization to change deadlines.

Adjustment and extension follow the same authority flow: the PI submits (or
withdraws); the assigned CV appraises, may request supplementation, and drafts a
tờ trình; TB reviews and forwards to TP or returns to the author; TP approves and
forwards to BGĐ or returns; GĐ or PGĐ-KH signs. Only the signature applies the
change. Neither the CV, TB nor TP decides the request. An adjustment with a funding
change is outside this slice.

Code still carries the former state names: adjustment `draft` → `submitted` →
`under_staff_review` → `approved` / `rejected`; extension `draft` → `submitted` →
`under_staff_validation` → `ready_for_head_decision` → `approved` / `rejected`; both
with `supplement_requested`, a new PI revision when required, and terminal
`withdrawn` (requester PI, before a decision). These names belong to the former
Staff/Head decision flow and must be reconciled with the tờ trình routing
implemented on `tuan/DocManS`; they are not removed here. There is no arbitrary
status-setting endpoint.

Withdrawal (both request types): the active PI who is the requester may withdraw a
request in any non-terminal status (`draft`, `submitted`, `under_staff_review`,
`supplement_requested`, `under_staff_validation`, `ready_for_head_decision`) while
the project is executing or paused, with a required reason. `withdrawn` is terminal
like `approved`/`rejected`: it cannot be decided, edited or resumed, and it no longer
counts as the one open request, so the PI can create a new one. Withdrawal changes no
approved project value; submitted revisions and evidence are kept unchanged.

Reports include project/checkpoint, reporting period/deadline, progress/results,
issues/recommendations, milestone context, author, revision and pinned evidence.
Requests include project, type, requester, current/proposed values, reason,
submitted context/version, evidence, appraisal, decision, decidedBy/decidedAt,
status and append-only history. Extension records current and requested end date;
requested end must be later. Adjustment records typed before/proposed changes,
not unrestricted JSON patches to project fields.

## Controlled changes and decisions

No PI or CV direct edit of approved duration/end date, important milestones,
approved scope/plan or governed project membership after activation. These use
first-class requests. Administrative monitoring records observations, checks,
clarification requests and routing; it cannot rewrite approved fields or submitted
content. An adjustment may contain only the documented controlled adjustment
scope: important milestone changes, approved scope/plan changes, and governed
membership changes. A duration increase or any requested end-date increase is an
extension and must use the extension workflow; it cannot be disguised as an
adjustment.

Appraisal, tờ trình steps and signatures recheck current actor/account, organization
scope, active relationships, assignments, conflict, tờ trình step, workflow and
project/request versions within the mutation transaction. Self-decision and
participant decisions are denied regardless of additional relationships: a PI,
member or reviewer of the project never appraises, routes or signs its requests.
No tờ trình skips a step; TB/TP never review a tờ trình they authored. Project
signing authority grants no proposal, council or acceptance decision rights. PP,
PGĐ-TD and QT cannot appraise, route or sign either request.
The GĐ or PGĐ-KH signature atomically records the decision, applies only the
submitted typed change (for an extension: changes the effective end date and
increments project version) and audits before/after. Rejection leaves the plan
unchanged. Reject stale/conflicting requests and safely reject duplicate terminal
decisions. A project allows one open request at a time; only a decision or the
requester PI's withdrawal closes it. CV, TB, TP, BGĐ, PP, PGĐ-TD and members cannot
withdraw. Changing an affected approved baseline requires a fresh request review;
never apply stale deltas.
The affected baseline is only what the request depends on (`currentValues`): the end
date for an extension; the touched scope/plan keys, touched milestones and, for
membership changes, the active member set for an adjustment. Unrelated changes such as
report acceptance or officer reassignment do not stale an open request.

## Deadlines, files, audit and disclosure

**OVERDUE IS A DERIVED TRACKING FLAG, NOT A PROJECT WORKFLOW STATE.**
Derive overdue from effective deadline, current time and completion/submission
facts. An unresolved past-due milestone/report remains visible with its original
deadline. A deadline miss never rejects, pauses, closes or advances a project.
Use repository date-only conventions for calendar-day inputs. Approaching/overdue
filters, counts and detail use the same authorized source query. An item is
approaching when its nearest open deadline falls within 14 days. A deadline is a UTC
calendar day and is overdue only after that day has ended; a checkpoint with a
submitted, under-review or accepted report is not an open deadline. Only preparing,
executing or paused projects are flagged.

Evidence references immutable file versions and exact report/request revisions.
Reuse shared upload/finalize/download/version infrastructure and reauthorize every
operation. Submission pins evidence; replacement cannot change a pinned snapshot,
including through generic file routes. Resubmission creates new evidence links.
Reject wrong-record, missing, unfinalized or otherwise unusable evidence.

Append-only transactional history/audit covers creation/activation, relationships,
milestone changes, draft/evidence changes, submission/resubmission, supplementation,
validation/preparation, review/appraisal, tờ trình steps, signatures, resulting
plan/deadline changes and any supported project transition. Use
actor/time/object/action/result/request and correlation conventions with
policy/context versions; preserve denial audit too.

Project view: GĐ, PGĐ-KH, TP and TB see every project in the Academy, including
unassigned records; PP and PGĐ-TD see unit-scope projects read-only; a CV reads
unit-scope projects but operates only with the exact current project officer
assignment. Per-project funding: GĐ, PGĐ-KH, TP, TB all; assigned CV; PI/members and
PP only on projects where they are PI/member; PGĐ-TD aggregate only. Funding
management, disbursement and settlement: GĐ, TP and TB Academy-wide, assigned CV.
Private appraisal material is disclosed only to the assigned CV and the tờ trình
chain (TB, TP, signer) of that request; monitoring roles do not receive it.
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
| `project.read`, `project.monitor`, `project.history.read` | Active PI/participant; assigned CV; GĐ, PGĐ-KH, TP, TB Academy-wide; PP, PGĐ-TD and unassigned CV in unit scope; the granted subset follows each role's disclosure |
| `project.officer.assign`, `project.officer.revoke` | Scoped, conflict-free TP or TB |
| `project.setup.configure`, `project.setup.confirm` | Assigned scoped CV; preparing project |
| `project.evidence.contribute` | Active PI, or active member/secretary responsible for an open milestone during execution |
| `project.report.draft`, `project.report.submit` | Active PI; own draft revision during execution |
| `project.report.review`, `project.report.request-supplement` | Assigned scoped CV; submitted/under_review |
| `project.report.accept` | Assigned scoped CV; under_review |
| `project.adjustment.create`, `project.adjustment.edit-draft`, `project.adjustment.submit` | Active PI; own draft/returned revision during execution |
| `project.adjustment.review`, `project.adjustment.request-supplement` | Assigned scoped CV (appraisal, tờ trình draft) |
| `project.adjustment.approve`, `project.adjustment.reject` | GĐ or PGĐ-KH signer, after TB → TP routing |
| `project.extension.create`, `project.extension.edit-draft`, `project.extension.submit` | Active PI; own draft/returned revision during execution |
| `project.extension.validate`, `project.extension.prepare`, `project.extension.request-supplement` | Assigned scoped CV (appraisal, tờ trình draft) |
| `project.extension.approve`, `project.extension.reject` | GĐ or PGĐ-KH signer, after TB → TP routing |
| `project.adjustment.withdraw`, `project.extension.withdraw` | Active PI who is the requester; project executing/paused; request non-terminal; required reason → `withdrawn` |

TB and TP steps use the tờ trình routing actions on `tuan/DocManS`; the state
preconditions above follow the former state names until that reconciliation.
CV, TB and TP cannot sign; PP, PGĐ-TD and QT cannot appraise, route or sign.
Enforce these denials in capabilities and direct APIs.
Use existing `allowedActions`, `blockedActions`, denial reasons and context tokens.
Account lock, inactive/expired/revoked relationship and missing/ambiguous context
remove mutation grants immediately. Backend is authoritative at mutation time.

Reuse `/projects`, `/my-projects` and `/projects/:id` patterns and current components:

| Workspace | Required content/actions |
| --- | --- |
| PI | My Projects, source/approved scope, members, milestones/timeline, deadlines, reports and immutable revisions, evidence upload, extension/adjustment forms, status/history |
| Member | Own projects, milestones they are responsible for, progress updates, evidence contribution |
| Assigned CV | Monitoring list, approaching/overdue filters, reporting calendar, submitted evidence, report review/supplementation, adjustment/extension appraisal and tờ trình drafting |
| TB / TP | Academy-wide and unassigned project views, officer management; TB tờ trình review queue, TP approval queue |
| GĐ / PGĐ-KH | Academy-wide monitoring; signature queue for extension/adjustment (and, later, acceptance council); GĐ also liquidation |
| PP / PGĐ-TD | Read-only unit-scope monitoring; PGĐ-TD aggregate funding only; no queues or decision actions |

Show loading, empty, error, denied and stale-context states. Consequential actions
require accessible confirmation. Disabled actions explain backend denials. Use
responsive existing tables/cards/dialogs, keyboard/focus support and native date
inputs. React must not derive authority from a role or relationship string.

## Approved decisions and documentation gate

- Current scoped proposal officer (CV) creates the preparing project from the approved
  immutable source. Creation grants no project authority. TP or TB independently
  assigns the project officer (CV), who confirms setup/activation. No automatic
  officer copy.
- Decision 18/10/2026 (10 roles): adjustment and extension are appraised by the
  assigned CV, routed by tờ trình TB → TP and signed by GĐ or PGĐ-KH; the signature
  alone applies the change. This supersedes the earlier rules that Staff finally
  approves adjustments and Head finally approves extensions.
- GĐ approval is the source proposal gate. GĐ alone signs liquidation; GĐ or PGĐ-KH
  signs the acceptance council. PP and PGĐ-TD only monitor.
- Decision 2026-10-13 (withdraw): the requesting active PI may withdraw an open
  adjustment/extension request (terminal `withdrawn`); this unblocks the project.
- Decision 2026-10-13 (no proposal officer): when no active proposal officer exists,
  TP or TB reassigns the proposal officer on the approved proposal (existing action,
  no status gate) and that officer creates the project. No other fallback creator.
- Undecidable request: a request cannot progress when there is no eligible in-scope
  TB/TP step actor or no conflict-free signer. The requester PI withdraws the request
  to unblock the project. *(Carried over from the former Head rule; not defined in
  `permission-matrix.md` §7 — pending product decision.)*
- Acceptance/councils remain next flow.

## Acceptance checks

Given an appraised adjustment or extension routed TB → TP, when GĐ or PGĐ-KH signs,
then the change (or new end date), decision and audit commit atomically; CV, TB, TP,
PP, PGĐ-TD, unrelated CV and unrouted or step-skipping signatures are denied. Given
rejection, no project field changes. Given an adjustment extending end date, reject
it and require the extension workflow. Preserve all self/conflict/inactive/stale/
duplicate denial and immutable evidence checks. Enforce participant/management/
reviewer/council incompatibility in both assignment directions. Existing acceptance
assignment workflows remain deferred.
