---
title: "Source Reconciliation: Scientist Record-Scoped Authorization"
source: "/Users/Super/DocManS/phan-quyen-trong-de-tai-khoa-hoc.md"
target: "/Users/Super/DocManS/_bmad-output/prd.md"
date: "2026-07-29"
status: "complete"
---

# Source Reconciliation: Scientist Record-Scoped Authorization

## Reconciliation Verdict

The PRD substantially covers the source policy at the product-requirement level.
Its strongest coverage is the separation of account-level and record-level
roles, backend-derived effective permission, fail-closed authorization,
scientific-secretary boundaries, conflict-of-interest controls, delegation,
multi-role UX, and executable permission acceptance scenarios.

The remaining gaps are narrower but security-relevant: lifecycle validity for
participation relationships, an explicit co-investigator role, visibility of
internal reviews to proposal participants, and a fully bounded delegation
policy for “act on behalf of” operations. Two terminology or policy tensions
also remain inside the PRD.

## Source Ideas Covered by the PRD

| ID | Source expectation | PRD coverage | Assessment |
|---|---|---|---|
| C01 | A researcher profile, login account, system role, and record participation role are separate concepts. | FR2, FR6a, FR65-FR67; Role-Based Access Requirements. | Fully covered. |
| C02 | PI, project member, scientific secretary, reviewer, council member, and ethics reviewer must not automatically be global roles. | FR2 requires one account-level system role and assigns these permissions through record-scoped relationships; FR6a repeats the boundary. | Fully covered, subject to conflict X01 below. |
| C03 | The same person may have different roles on different proposals, projects, reviews, and councils. | Journey 7; FR6a; Permission Scenario Acceptance for multi-record relationships and unrelated records. | Fully covered. |
| C04 | A researcher profile may exist without a login account. | FR66 explicitly allows researcher profiles without system login accounts. | Fully covered. |
| C05 | Researcher profiles must link to proposals, projects, councils, reviews, tasks, and other business records. | FR67 enumerates proposals, projects, seminars, student research, councils, ethics dossiers, reviews, publications, products, and tasks. | Fully covered. |
| C06 | Proposal/project participation, reviewer assignment, and council membership are distinct business relationships. | FR6a, FR17-FR18, FR58-FR62, FR67, and the authorized personnel-and-roles UX requirement distinguish these relationships. | Covered at capability level. Exact table names and columns from the source are architecture details rather than missing PRD requirements. |
| C07 | Effective permission combines system role, organization scope, record participation, assignment, workflow state, and conflict policy. | Data-Scope Authorization Requirements state the complete formula, including conflict policy. NFR7-NFR8 require backend enforcement and fail-closed behavior. | Fully covered. |
| C08 | The backend, not the frontend, determines record-specific permissions. | FR6c requires backend-calculated relationships, allowed actions, blocked actions, and denial reasons; UX requirements prohibit local role inference. | Fully covered. |
| C09 | A PI can draft, edit, upload, submit, respond to supplements, track an approved project, report progress, request adjustment/extension, and submit an acceptance dossier. | FR10-FR16, FR23-FR27a, FR30, and PI permission acceptance scenarios. | Fully covered. |
| C10 | A PI cannot self-review, self-approve, or make final decisions merely because of another role. | FR67a; Governance Acceptance; Permission Scenario Acceptance for self-review and authority-participant conflicts. | Fully covered. |
| C11 | A project member has narrower access: view assigned project context, update assigned work, and contribute permitted evidence/files. | FR30a-FR30b, FR31-FR33, Project Member persona, and the member permission acceptance scenario. | Fully covered. |
| C12 | A project member cannot formally submit, change official membership, request adjustment/extension, approve, or decide without a separate action-specific grant. | Role-Based Access Requirements and the member permission acceptance scenario explicitly deny these actions. | Fully covered. |
| C13 | Scientific secretary is a proposal/project/council-scoped relationship, not a system-wide administrator role. | Journey 7, FR6a, FR6d, Role-Based Access Requirements, and secretary acceptance scenarios. | Fully covered. |
| C14 | A secretary may maintain delegated administrative data, meetings, minutes, documents, tasks, tracking, and draft summaries but cannot score or make final decisions. | FR6d and Role-Based Access Requirements enumerate both the allowed administrative surface and prohibited decision authority. | Fully covered for the default secretary boundary; delegated submission is addressed under X02. |
| C15 | Reviewer and council access is assignment-scoped and limited to assigned records, necessary files, and the reviewer’s own review unless policy permits more. | FR18, FR61, Role-Based Access Requirements, and the reviewer permission acceptance scenario. | Fully covered. |
| C16 | Reviewer cannot edit the PI’s dossier, see all records, see other reviewers’ reviews by default, or make the final approval decision. | Assigned-item restrictions, own-review restriction, leadership-only proposal decision requirements, and negative acceptance scenarios cover these boundaries. | Fully covered, except participant visibility policy in G03. |
| C17 | Conflict rules must block PI self-review, participant review where disallowed, secretary decision authority, leadership self-approval, and conflicting council assignments. | FR67a; Role-Based Access Requirements; Governance Acceptance; multiple Given/When/Then permission scenarios. | Fully covered. |
| C18 | A role held on an unrelated record must neither widen nor restrict permission on the current record. | Permission Scenario Acceptance explicitly tests reviewer or secretary relationships on unrelated records. | Fully covered. |
| C19 | Conflict or missing authorization context must fail closed. | Data-Scope Authorization Requirements, NFR8, and the stable-denial permission scenario. | Fully covered. |
| C20 | Explicit delegation must be record-specific, action-specific, time-bounded, revocable, auditable, state-aware, and unable to bypass conflicts. | FR6b; Role-Based Access Requirements; Data-Scope Authorization Requirements; delegation acceptance scenario. | Fully covered as a generic delegation mechanism; grant policy remains open in G04. |
| C21 | The UI should not force a global role switch when a person holds multiple record roles. | UX requirements define one unified workspace, navigation by account role, actions by record relationship, and explicitly prohibit a global role switcher. | Fully covered. |
| C22 | Lists and detail pages must show the user’s role on the current record and all security-relevant relationships. | UX requirements require record-role labels, all relationships, backend-derived allowed/blocked actions, and denial reasons. | Fully covered. |
| C23 | Researcher details should expose account linkage, owned/participating records, secretary assignments, councils, reviews, tasks, participation history, and audit history. | The researcher-profile UX requirement enumerates all of these views. | Fully covered at information-architecture level. |
| C24 | Proposal/project/council/ethics details should show personnel and their distinct roles. | The business-record detail UX requirement distinguishes PI, members, scientific secretary, reviewers, chair, council secretary, and council members. | Fully covered. |
| C25 | Conflict-blocked actions should be understandable to the user. | UX requires blocked conflict actions to remain visible and disabled with a plain-language reason; FR6c provides backend denial reasons. | Fully covered. |
| C26 | Unit-wide dashboards belong to scientific management staff and leadership within authorized scope. | FR45 and Dashboard and Reporting Requirements enforce role- and scope-filtered dashboards. | Fully covered. |
| C27 | Important relationship, permission, file, workflow, and decision actions must be auditable. | FR39-FR40, Audit-Log Requirements, Governance Acceptance, and NFR9 provide explicit audit coverage. | Fully covered. |

## Remaining Gaps

### G01 — Participation and membership validity lifecycle is not explicit

The source model gives project participation `start_date`, `end_date`, and
`is_active`, and gives review assignments a status and due date. The PRD
defines validity and revocation for delegation grants, but it does not state
equivalent activation, expiration, suspension, or revocation semantics for
proposal participation, project participation, or council membership.
Consequently, the PRD does not yet make it testable that an ended participation
relationship immediately stops granting access.

### G02 — Co-investigator is not explicitly preserved as a distinct record role

The source distinguishes `CO_INVESTIGATOR` from `PROJECT_MEMBER`. The PRD
consistently names principal investigator and project member, but does not say
whether co-investigator is a separate role with separate capabilities or an
alias/subtype of project member. This leaves role catalog behavior and
authorization expectations incomplete if the institution uses both terms.

### G03 — PI and participant visibility of internal evaluation material is unresolved

The source explicitly says a PI should not see internal reviews unless policy
allows it. The PRD clearly limits a reviewer to their own review and grants
staff/leadership access to evaluation outputs, but it does not explicitly state
what a PI, project member, or secretary may see before and after an evaluation
or decision. No acceptance scenario verifies that internal scores, other
reviewers’ identities, comments, or consolidated outcomes remain hidden from
proposal participants until the applicable disclosure state or policy.

### G04 — Delegation governance does not define who may grant each action

The PRD specifies the fields and enforcement behavior of a delegation grant,
but “authorized users” is not reduced to a product policy for:

- who may delegate proposal create/edit/submit, progress-report submission,
  adjustment/extension submission, or council-administration actions;
- whether staff may enter or submit on behalf of a PI;
- whether a secretary may receive submission authority;
- which actions are non-delegable even when the grantor normally has them;
- whether the grantor must hold the delegated action on the same record for the
  entire grant validity period.

The generic acceptance scenario proves mechanics, not the institutional
delegation matrix.

### G05 — Conditional member/staff behaviors from the source matrix are not decided

The source matrix marks limited proposal-draft editing by a member, staff
creation or submission on behalf of a PI, staff adjustment entry, and some
leadership council-management actions as conditional. The PRD does not convert
these conditional cells into explicit allow, deny, or defer decisions. This is
not a gap in the default least-privilege flows, but it remains an unresolved
policy input if those matrix cells are intended for phase 1.

### G06 — Two UX presentation details are only semantically covered

The PRD requires record-role labels, a personal work area, researcher
relationship views, and account context, but it does not explicitly require:

- visual role badges for each person in personnel lists; or
- the topbar/profile summary counts proposed by the source, such as numbers of
  owned projects, participating projects, secretary assignments, and pending
  reviews.

The underlying information is covered, but these exact presentation and summary
behaviors are not acceptance-testable from the PRD.

## Conflicts and Internal Tensions

### X01 — A global-role exception weakens the otherwise strict record-role rule

FR2 and FR6a align with the source by requiring PI, member, secretary, reviewer,
council member, and ethics reviewer permissions to be record-scoped. However,
the Role-Based Access Requirements later say these statuses are record-scoped
“unless explicitly configured as an account-level system role for another
purpose.” The source rejects that escape hatch because a global PI/member/
secretary status can be misread as authority over unrelated records.

This is a normative conflict inside the PRD: the strict rule and the exception
cannot both be the authoritative phase 1 policy without further qualification.

### X02 — Secretary submission by delegation is ambiguous

The source matrix allows a scientific secretary to create or submit a proposal
when explicitly delegated. The PRD’s generic delegation model can be read as
allowing any listed action, but FR6d and the secretary-specific role rules limit
the secretary to administrative fields, meetings, minutes, documents, tasks,
tracking, and draft summaries, and explicitly exclude expanded decision
authority.

It is therefore unclear whether proposal creation/submission is:

- an allowed delegated administrative action;
- outside the secretary role but allowed through a separate delegate
  relationship; or
- prohibited in phase 1.

This ambiguity must not be resolved by frontend behavior or implementation
guesswork.

### X03 — “Major user roles” wording can be mistaken for global authorization roles

The Executive Summary and persona sections describe principal investigator,
project member, and reviewer/committee member as major “user roles.” The
normative requirements later define them as record-scoped relationships.
Although the detailed requirements are clear, the early terminology can lead
downstream epic or story authors to reintroduce them as account-level roles.
This is a terminology tension rather than a missing capability.
