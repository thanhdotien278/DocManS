# DocManS Domain Context

DocManS is the internal research-management system for the Military Medical
Academy. It manages research proposals from intake through decision, the
approved projects that follow, and the supporting records needed to operate
those processes. `DocManS` is the canonical system name; `RTMS` is a legacy
alias and must not introduce a separate domain or permission model.

This document defines durable domain language and invariants. It is not a
roadmap, architecture, permission matrix, or status report. For detailed
policy and current workflow rules, use the linked normative documents.

## Domain vocabulary

| Term | Meaning |
| --- | --- |
| **Account** | An authenticated system identity. An account has one active system role at a time and may be locked or inactive without erasing history. |
| **Researcher profile** | The scientific identity record for a person. It can exist without an account; each account has at most one current profile link, including inactive profiles. |
| **Organization scope** | The explicitly granted institutional/unit boundary within which an actor may operate. Scope is not inferred from a related unit, a parent/child unit, or another record. |
| **Business record** | A domain aggregate such as a proposal, project, council, ethics dossier, task, or related document. Its authorization is evaluated in its own context. |
| **Proposal** | A research submission moving through intake, checking, evaluation, and final decision. A proposal is distinct from an approved project. |
| **Approved project** | A managed research project created by scientific management after approval of a proposal. It receives new project relationships; it does not reuse proposal relationships as mutable shared data. |
| **Intake period** | The controlled window that determines whether eligible internal researchers may create and submit proposals. Closing it stops new submissions, not processing of submitted proposals. |
| **Relationship** | A record-scoped participation fact, such as proposal PI/team secretary/team member or approved-topic PI/team secretary/team member. It has a lifecycle and grants no authority outside its owning record. |
| **Assignment** | A record-scoped duty, such as proposal/project management officer, reviewer, council member, ethics reviewer, or task assignee. It grants only the actions and disclosure needed for that assignment. |
| **Delegation** | A time-bounded, approved grant for an exact action on one record where the owning contract permits delegation. It is not a general substitute for role, relationship, assignment, or decision authority; proposal submission is PI-only and non-delegable. |
| **Workflow state** | The controlled lifecycle state of a business record. A state transition is a domain action, not an unrestricted field update. |
| **Version** | An immutable business or file revision retained as evidence. Replacing or correcting creates a new version rather than overwriting a submitted, reviewed, or decided artifact. |
| **Related document** | A governed, legal, planning, or supporting document with metadata, effective status, and version context. It is not an authorization bypass for the record it references. |
| **Audit event** | An immutable accountability record for a material action, including actor, time, target, action, and required reason/context. |

## Stable relationships

- An account may hold many relationships and assignments, but each is effective
  only for its own record and validity period.
- A proposal has one accountable PI derived from `ownerId`. Its active team has
  only `TOPIC_SECRETARY` and `TOPIC_MEMBER` rows, with at most one secretary;
  the PI is not duplicated as a team row. Reviewers and council participants
  are separate assignments; none is an account-level role.
- An approved project is created deliberately from an approved proposal. Its
  participants are copied or assigned as new project relationships and may
  diverge from the proposal thereafter.
- A task is linked to a business record. Task assignment never grants more
  access than the linked record permits.
- Files, notifications, dashboard items, search results, counts, facets,
  exports, and history are views or derivatives of business records. They do
  not create or widen access to their source record.
- A council, ethics dossier, review, and related document remain separate
  aggregates even when they concern the same proposal or project.

## Authorization language

DocManS distinguishes **system roles** from **record-scoped relationships and
assignments**. The ten system roles ([permission matrix](docs/permission-matrix.md) §2) are
`SYSTEM_ADMIN` (QT), `LEADERSHIP_APPROVAL_AUTHORITY` (GĐ), `SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH),
`RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD, monitoring only), `RESEARCH_MANAGEMENT_HEAD` (TP),
`RESEARCH_MANAGEMENT_DEPUTY_HEAD` (PP), `RESEARCH_BOARD_HEAD` (TB), `RESEARCH_MANAGEMENT_STAFF` (CV),
`RESEARCHER_INTERNAL_USER` (NCV) and `EXTERNAL_RESEARCHER_USER` (NNB). Submissions route as a
tờ trình CV → TB → TP → BGĐ; only GĐ approves topic, funding and liquidation. The code on the
`DocManS` branch still ships the former seven roles (`SCIENTIFIC_MANAGEMENT_HEAD`,
`SCIENTIFIC_MANAGEMENT_STAFF` instead of TP/CV, without PGĐ-KH, PP, TB) until `tuan/DocManS`
is merged.

System roles describe account-level responsibility; they do not automatically
grant access to every business record. Record access is derived from the exact
action, organization scope, active relationship or assignment, workflow state,
conflict-of-interest rules, delegation only where the owning contract permits,
and disclosure policy. Proposal creation, submission, and resubmission are
PI-only and never use delegation.
`SYSTEM_ADMIN` administrative authority is not business approval authority.
`EXTERNAL_RESEARCHER_USER` is an account role with no implicit PI, team,
reviewer, or cross-record access.

An authorization decision must use one coherent, current context for the
request and mutation. Missing, stale, ambiguous, inactive, expired, revoked,
or unsupported context denies access. The backend is authoritative; UI
capability data is explanatory only and cannot grant an action.

### Research management responsibility

TP (`RESEARCH_MANAGEMENT_HEAD`) and TB (`RESEARCH_BOARD_HEAD`) see proposals in their unit
scope and every project in the Academy, with responsible-CV, unassigned, workload and
status/deadline filters. PP only monitors. Disclosure and conflict still apply.
CV (`RESEARCH_MANAGEMENT_STAFF`) management visibility requires an effective `PROPOSAL_MANAGEMENT_OFFICER` or
`PROJECT_MANAGEMENT_OFFICER` on the exact record plus explicit scope. Each record
has at most one active primary officer; assignment/reassignment/revocation preserves
history and audit. Project management responsibility is independent of its proposal.

A CV may access other records through legitimate participation/review/council/task
relationships, which grant no management actions. Backend
capabilities must distinguish this access basis; revocation removes only the relevant
grant. Unassigned is a valid state; missing/ambiguous context fails closed.
Independent intake/profile scope does not widen proposal/project access. The system
auto-assigns a CV by segment on submission; TP/TB assign/reassign/revoke the officer.
TB¹ or the assigned CV³ checks completeness (never TP). TP¹, TB¹ or the assigned CV³
assign reviewers/councils and prepare synthesis; the tờ trình routes CV → TB → TP → BGĐ.
GĐ alone decides topic + funding and liquidation; GĐ or PGĐ-KH sign councils, IRB,
extensions and adjustments. PGĐ-TD and PP only monitor. Oversight never bypasses disclosure.
Proposal implementation is operational; project relationships remain a contract until the
approved-project backend is implemented (baseline §2.1).

## Workflow vocabulary

Golden Flow 4 is specified in the [Project Execution contract](docs/contracts/project-execution.md).
It preserves project-scoped `TOPIC_PI` (the requested `PROJECT_PI`). The assigned CV
reviews/accepts reports without a tờ trình. Adjustments (with or without funding change)
and extensions: the PI submits, the assigned CV appraises and drafts the tờ trình, TB
reviews, TP approves, and GĐ or PGĐ-KH signs. GĐ alone approves the source proposal and
liquidation. Submitted revisions/evidence are immutable; overdue is derived, never a project
state. The assigned proposal CV creates; TP or TB independently assigns the project CV, who
confirms setup. Controlled fields change only through the appropriate approved request.
Acceptance/council implementation belongs to the next flow.

- **Draft** is editable working content; **submitted** content is the formal
  version under process and is not silently edited.
- **Completeness checking**, **supplement request**, **resubmission**,
  **review assignment**, **evaluation**, **consolidation**, and **final
  decision** are distinct workflow steps with different actors and evidence.
- **Approval** produces eligibility to create an approved project; it does not
  itself create one automatically.
- **Post-submission edit** creates a new working revision after authorized
  handling; **adjustment** is the formal change path for material project or
  proposal changes.
- **Overdue** is a tracking/reminder condition, not an automatic rejection or
  state transition.
- **Reopen**, **withdrawal**, **suspension**, **extension**, and **closure**
  are explicit, auditable domain actions, never a generic workflow bypass.
- **Disclosure** means publication of the minimum review outcome permitted by
  policy. It is distinct from operational access to identities, raw scores,
  comments, or internal consolidation.

## Invariants for implementation and review

1. Evaluate authorization consistently for reads and writes, including lists,
   search, counts, facets, dashboards, exports, notifications, file metadata,
   history, and background work. Do not leak denied records through derived
   data.
2. Enforce every protected operation on the backend at action time. Do not
   infer authority from the client, a display title, organization proximity, or
   access to another record.
3. Preserve separation of duties: a participant cannot simultaneously manage,
   review, evaluate, sit on an evaluation/acceptance council, or decide the same
   record. Reviewers cannot make the final decision for the same round; mutually
   exclusive council positions cannot overlap. Check both directions of assignment/
   participation changes and again at every protected action.
4. Keep workflow transitions explicit, validated, and auditable. A normal
   update must not bypass state, review, approval, disclosure, or reopening
   rules.
5. Preserve business evidence. Do not hard-delete business records,
   relationships, decisions, audits, submitted/reviewed versions, or material
   files; retain history and create a new revision when change is allowed.
6. Check file authorization on every upload, view, download, replacement, and
   deletion. Object keys and direct storage paths are implementation details,
   never bearer authorization.
7. Apply least disclosure. Hidden review information is omitted, not returned
   as a null placeholder; notifications and exports carry only data their
   recipient is already authorized to see.
8. Treat authorization-policy changes as compatibility changes: update the
   governing baseline, detailed matrix, executable contracts, and allow/deny
   tests together.

## Normative detail

Read these only when the task needs their detail; do not duplicate them here:

- [`docs/authorization-core-business-baseline.md`](docs/authorization-core-business-baseline.md)
  — approved product decisions for roles, scope, workflow, retention, and
  disclosure.
- [`docs/permission-matrix.md`](docs/permission-matrix.md) — detailed action
  permissions and test expectations.
- [`_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`](_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md)
  — authorization context, decision, versioning, delegation, and disclosure
  contracts.
- [`docs/user-flows.md`](docs/user-flows.md) — concrete workflow paths and
  state transitions.


## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](docs/contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- QT (platform) and TP¹/CV¹ (unit scope) manage internal/external
  profiles independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- System Account / Access supports optional create-and-link, existing unlinked
  account selection, unlink and authorized credential reset/resend. Linking is
  one-to-one across all current links, including inactive records. TP/CV can
  provision only matching researcher roles in the profile's explicit scope.
- The profile manager confirms the recipient email. The account is created as
  `PENDING_ACTIVATION`; the system emails, by configured SMTP, only a setup-password link
  backed by a hashed single-use token that expires after 48 hours. The link opens
  `Thiết lập mật khẩu`; completing it activates the account. No temporary password is
  generated, emailed, persisted, returned to the profile manager or placed in audit. SMTP
  acceptance is not proof of inbox delivery; a failed/uncertain send offers an explicit
  resend of the activation link, which invalidates earlier unused links.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields are editable; type, status, linkage and role/scope remain administrative.
  Unlink immediately removes self access. Self-reported history grants no access
  to operational projects/proposals and does not replace source-owned assignments.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts. No test files are written or changed for this
  completion at the user's instruction; verification is recorded in its artifact.
