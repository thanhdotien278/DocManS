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
| **Researcher profile** | The scientific identity record for a person. It can exist without an account; an active account is linked to at most one active profile. |
| **Organization scope** | The explicitly granted institutional/unit boundary within which an actor may operate. Scope is not inferred from a related unit, a parent/child unit, or another record. |
| **Business record** | A domain aggregate such as a proposal, project, council, ethics dossier, task, or related document. Its authorization is evaluated in its own context. |
| **Proposal** | A research submission moving through intake, checking, evaluation, and final decision. A proposal is distinct from an approved project. |
| **Approved project** | A managed research project created by scientific management after approval of a proposal. It receives new project relationships; it does not reuse proposal relationships as mutable shared data. |
| **Intake period** | The controlled window that determines whether eligible internal researchers may create and submit proposals. Closing it stops new submissions, not processing of submitted proposals. |
| **Relationship** | A record-scoped participation fact, such as proposal PI/member/secretary or project PI/member/secretary. It has a lifecycle and grants no authority outside its owning record. |
| **Assignment** | A record-scoped duty, such as reviewer, council member, ethics reviewer, or task assignee. It grants only the actions and disclosure needed for that assignment. |
| **Delegation** | A time-bounded, approved grant for an exact action on one record. It is not a general substitute for role, relationship, assignment, or decision authority. |
| **Workflow state** | The controlled lifecycle state of a business record. A state transition is a domain action, not an unrestricted field update. |
| **Version** | An immutable business or file revision retained as evidence. Replacing or correcting creates a new version rather than overwriting a submitted, reviewed, or decided artifact. |
| **Related document** | A governed, legal, planning, or supporting document with metadata, effective status, and version context. It is not an authorization bypass for the record it references. |
| **Audit event** | An immutable accountability record for a material action, including actor, time, target, action, and required reason/context. |

## Stable relationships

- An account may hold many relationships and assignments, but each is effective
  only for its own record and validity period.
- A proposal has one accountable PI. Proposal members, secretaries, reviewers,
  and council participants are separate relationships or assignments; none is
  an account-level role.
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
assignments**. The active system roles are `SYSTEM_ADMIN`,
`SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`,
`RESEARCHER_INTERNAL_USER`, and `EXTERNAL_RESEARCHER_USER`.

System roles describe account-level responsibility; they do not automatically
grant access to every business record. Record access is derived from the exact
action, organization scope, active relationship or assignment, workflow state,
conflict-of-interest rules, delegation where permitted, and disclosure policy.
`SYSTEM_ADMIN` administrative authority is not business approval authority.
`EXTERNAL_RESEARCHER_USER` is an account role with no implicit PI, member,
reviewer, or cross-record access.

An authorization decision must use one coherent, current context for the
request and mutation. Missing, stale, ambiguous, inactive, expired, revoked,
or unsupported context denies access. The backend is authoritative; UI
capability data is explanatory only and cannot grant an action.

## Workflow vocabulary

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
3. Preserve separation of duties and conflicts of interest: participation in a
   record never authorizes review or final decision on that same matter, and a
   reviewer does not make its final decision.
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
