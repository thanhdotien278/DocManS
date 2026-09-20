---
name: DocManSystem authorization contracts
type: normative-architecture-companion
schemaVersion: v1
status: final
created: 2026-07-29
updated: 2026-09-20
owner: packages/permissions
---

# Authorization Contracts V1

This companion is normative for AD-2 through AD-14. The
`packages/permissions` package owns the executable schemas, enums, fixtures,
and compatibility tests. Source domains provide facts through ports and may
not redefine these contracts.

## 1. Request-Wide Evaluation Context

Every protected request creates one `AuthorizationContextV1`. `asOf` is read
once from the database transaction clock and is passed unchanged to every
resolver, capability projection, source query, job authorization, and audit
event.

```text
AuthorizationContextV1
  schemaVersion: "v1"
  requestId: UUID
  correlationId: string
  asOf: UTC instant
  subject:
    actorUserId: UUID
    systemRole: SystemRoleV1
    organizationIds: UUID[]
    accountStatus: "ACTIVE" | "INACTIVE"
  target:
    domain: DomainCodeV1
    recordId: UUID
    organizationId: UUID
    aggregateVersion: non-negative integer
  action: PermissionActionV1
  dimensions:
    systemRole | organizationScope | relationships | assignment |
    delegation | workflowState | conflict:
      resolution: "RESOLVED_VALUE" | "RESOLVED_EMPTY" |
                  "NOT_APPLICABLE" | "UNRESOLVED" |
                  "STALE" | "AMBIGUOUS"
      source: string
      sourceVersion: string
      observedAt: UTC instant
```

`RESOLVED_EMPTY` and `NOT_APPLICABLE` contribute no allow. `UNRESOLVED`,
`STALE`, and `AMBIGUOUS` deny. No resolver obtains a second `asOf`.

## 2. Canonical Decision Registry

`AuthorizationDecisionCodeV1` has this deterministic primary-code order:

1. `UNAUTHENTICATED`
2. `ACCOUNT_INACTIVE`
3. `CONTRACT_VERSION_UNSUPPORTED`
4. `CONTRACT_CODE_UNKNOWN`
5. `CONTEXT_UNRESOLVED`
6. `CONTEXT_STALE`
7. `CONTEXT_AMBIGUOUS`
8. `CONTEXT_VERSION_MISMATCH`
9. `ORG_SCOPE_DENIED`
10. `RELATIONSHIP_INACTIVE`
11. `WORKFLOW_STATE_DENIED`
12. `CONFLICT_DENIED`
13. `DELEGATION_INVALID`
14. `ACTION_NOT_GRANTED`
15. `ALLOWED`

All evaluated rule outcomes are audited, but the lowest-numbered applicable
denial is the primary API/UI code. Unknown versions or codes map to
`CONTRACT_VERSION_UNSUPPORTED` or `CONTRACT_CODE_UNKNOWN`; clients must not
guess a fallback permission.

Assignment/conflict responses additionally expose one stable, minimum-disclosure
`reasonCode`. These reason codes do not replace the primary decision ordering:

| Stable `reasonCode` | Primary decision code | Meaning |
| --- | --- | --- |
| `SOURCE_PARTICIPATION_CONFLICT` | `CONFLICT_DENIED` | Candidate is proposal/topic PI, topic member or topic secretary on the source record. |
| `INCOMPATIBLE_COUNCIL_POSITION` | `CONFLICT_DENIED` | A different mutually exclusive evaluation-position interval would overlap for the candidate in this context. |
| `DUPLICATE_OR_OVERLAPPING_ASSIGNMENT` | `CONFLICT_DENIED` | A duplicate interval for the same evaluation position would overlap for the candidate in this context. |
| `REVIEWER_DECISION_CONFLICT` | `CONFLICT_DENIED` | Candidate submitted/recorded an evaluation and therefore cannot make the final decision for that record and round. |
| `STALE_ASSIGNMENT_CONTEXT` | `CONTEXT_VERSION_MISMATCH` | Candidate, source, council/round or assignment context changed after the evaluated version. |

Public reasons must not identify another protected participant or disclose the
underlying relationship. Unknown reason codes fail closed under the existing
contract-version/code rules.

`AuthorizationReasonCodeV1` is the five-value registry above.
`BlockedActionV1` adds `reasonCode?: AuthorizationReasonCodeV1`; assignment and
final-decision conflict/staleness responses must populate it, while other V1
blocked actions may omit it. This additive field does not change primary-code
precedence; executable schemas and fixtures must reject unknown reason values.

## Scientific Management role and access contract — 2026-09-21 target

The canonical system-role set is `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD`,
`SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP_APPROVAL_AUTHORITY`,
`RESEARCHER_INTERNAL_USER`, `EXTERNAL_RESEARCHER_USER`, with one active role per account.
Head sees all proposals/projects within explicitly authorized Scientific Management
scope, including current officer, unassigned records, officer filters/groups and
workload/status/deadlines. Neither Head nor Staff is leadership final approval authority.
Head visibility alone does not grant operational mutations or unrestricted review data.

Staff management reads/actions require an effective officer relationship on the exact
proposal/project and granted scope. PI/member/secretary/reviewer/council/task access
is an independent basis with its own action and disclosure set. The policy/projection
must distinguish these bases; a generic allowed-read flag must not authorize management.
The existing `systemRole`, `viewerRelationships` and per-action decision dimensions
must explain the result without inventing a highest relationship.

Management reassignment atomically ends the old interval and records the new officer;
at most one primary officer may be effective per record, including concurrent writes.
Retain old/new account IDs, effective intervals, actor, time, reason and audit. Zero
active officers resolves as unassigned; unresolved/ambiguous context denies. Revocation,
role/scope changes or expiry end the management grant immediately and invalidate stale
context, while unrelated legitimate participation is re-evaluated independently.

Participant + management officer/reviewer/evaluation or acceptance council/final decision
is prohibited on the same source record. Check assignments and changes to participation
in either order, and repeat on the protected action. The existing same-round reviewer/
final-decision and mutually exclusive council-position rules also apply. Head with a
participation conflict cannot use oversight to obtain undisclosed review material.

Use identical current authorization and disclosure for list, detail, search, count/facets,
dashboard, reports/export, notifications, files and workflow/business history; filters
and drill-down cannot widen the result. Officer identity for Head oversight is an
explicit management projection, never blanket disclosure of review/council assignments.

These are target contract changes. Before implementation, version the affected role/
relationship registries and consumers; decide exact officer-grant actions/actors and
Head operational actions per baseline §2.1. Do not silently treat legacy V1 clients or
role-only policies as compliant, or grant unknown actions while those decisions are open.

## 3. Relationship Type Registry

The following V1 relationship types are canonical:

| Type | Owner | Same actor + record multiplicity | Composition |
| --- | --- | --- | --- |
| `PROPOSAL_MANAGEMENT_OFFICER` | proposal | at most one active primary officer per record (across all actors) | Staff management actions only with scope, state and no conflict |
| `PROJECT_MANAGEMENT_OFFICER` | approved project | at most one active primary officer per record (across all actors) | Staff management actions only with scope, state and no conflict |
| `PROPOSAL_PI` | proposal | one | additive subject to denials |
| `TOPIC_PI` | approved topic | one | additive subject to denials |
| `TOPIC_SECRETARY` | proposal or approved topic | at most one active per record | administrative actions only |
| `TOPIC_MEMBER` | proposal or approved topic | additive subject to denials | member-default actions only |
| `REVIEWER_ASSIGNMENT` | evaluation context | at most one active mutually exclusive evaluation position per actor + context | own assignment only |
| `COUNCIL_MEMBER` | evaluation context | at most one active mutually exclusive evaluation position per actor + context | assigned council only |
| `COUNCIL_SCIENTIFIC_SECRETARY` | evaluation context | at most one active mutually exclusive evaluation position per actor + context | administrative actions only |
| `ETHICS_REVIEWER_ASSIGNMENT` | ethics | one per assignment | own assignment only |
| `TASK_ASSIGNEE` | task | one per task | assigned task only |

All active types are preserved; there is no “highest relationship.” Additive
actions are unioned only after every denial is evaluated. A future relationship
type or multiplicity change requires a registry version change and fixtures.

`COUNCIL_CHAIR`, `COUNCIL_SECRETARY` / `COUNCIL_SCIENTIFIC_SECRETARY`,
`COUNCIL_MEMBER`, and `REVIEWER` / `COUNCIL_REVIEWER` form one mutually
exclusive evaluation-position group. The canonical compatibility matrix,
context key and lifecycle rules are owned by
`docs/authorization-core-business-baseline.md#evaluation-position-compatibility-and-multiplicity`;
source domains map their persisted role names to this group rather than define
local compatibility rules.

```text
EvaluationContextKeyV1
  sourceDomain: DomainCodeV1
  sourceRecordId: UUID
  evaluationContextId: UUID

EvaluationPositionV1
  COUNCIL_CHAIR | COUNCIL_SECRETARY | COUNCIL_MEMBER |
  REVIEWER
```

The context key is mandatory and source-owned. Persisted
`COUNCIL_SCIENTIFIC_SECRETARY` maps to `COUNCIL_SECRETARY`;
`committee_member` maps to `COUNCIL_MEMBER`; `reviewer` /
`REVIEWER_ASSIGNMENT` maps to `REVIEWER`; a council-specific reviewer maps to
`REVIEWER`. `COUNCIL_REVIEWER` is a domain label, not an additional V1
position. Aliases do not create additional compatible slots. Evaluation
intervals are half-open `[effectiveFrom, effectiveUntil)`; `assigned` and
`completed` remain current-round rows for multiplicity until revoked/ended or
round closure.

For proposal endpoints, the source resolves the current immutable
`evaluationContextId` and its aggregate/version token from the proposal inside
the same mutation transaction; the resolved context key is included in the
authorization audit and compared on write. Council/ethics endpoints must carry
the explicit context ID and version in their mutation token. A missing or
changed context ID/version returns `STALE_ASSIGNMENT_CONTEXT` and cannot be
treated as a valid proposal-context check.

## 4. Exact Action and Delegation Boundary

`PermissionActionV1` values are lowercase namespaced strings owned by
`packages/permissions`, for example `project.progress-report.edit`.
Matching is exact. Proposal creation, submission, and resubmission are
owner-only internal-PI mutations and are not delegation targets. V1 exposes no
proposal delegation grant or delegable proposal action.

The non-delegable V1 registry includes reviewer/council assignment, evaluation
submission and scoring, reviewer-identity disclosure, participation/membership
change, grant approval, business approval/rejection, and all final-decision
actions. Unknown actions are non-delegable by default. Any future delegation in
another domain requires a separately approved, record-bounded contract with no
wildcards or delegation chains before executable schemas or endpoints are added.

## 5. Context Version and Atomic Mutation

```text
ContextVersionTokenV1
  domain: DomainCodeV1
  recordId: UUID
  aggregateVersion: non-negative integer
  relationshipVersion: non-negative integer
  conflictVersion: non-negative integer
  delegationVersion: non-negative integer
  policyVersion: string
```

The owning service reads and compares the token in the same transaction that
writes the mutation. A mismatch returns `CONTEXT_VERSION_MISMATCH`; the client
must refresh and explicitly retry. Multi-record actions carry one token per
record and compare all tokens before any write.

## 6. Viewer Authorization Contract

```text
ViewerAuthorizationV1
  schemaVersion: "v1"
  systemRole: SystemRoleV1
  viewerRelationships:
    type: RelationshipTypeV1
    status: "ACTIVE" | "INACTIVE"
    effectiveFrom: UTC instant
    effectiveUntil: UTC instant | null
  allowedActions: sorted unique PermissionActionV1[]
  blockedActions:
    action: PermissionActionV1
    code: AuthorizationDecisionCodeV1
    reason: string
  policyVersion: string
  evaluatedAsOf: UTC instant
  contextVersion: ContextVersionTokenV1
```

Arrays are sorted by canonical ID. The DTO contains only the viewer's own
relationships and minimum facts needed to explain the result. It never exposes
another user's hidden review assignment, conflict source, or undisclosed review material.
An authorized management projection may expose the current responsible Staff member
or unassigned state to Head within scope; this is separate from `viewerRelationships`.
Expose only the officer identifier/display label needed for responsibility tracking,
not private profile/contact data or hidden evaluation duties.

For proposal workflow projections, `allowedActions` and `blockedActions` are
record-scoped and fail closed. A blocked action with `ACTION_NOT_GRANTED` is
irrelevant to the viewer and the client must omit its entire workflow section.
`CONFLICT_DENIED` and `WORKFLOW_STATE_DENIED` describe a relevant action that
must remain disabled with the server reason. `proposal.review.submit` requires
an active `ProposalReviewAssignment` for the exact proposal and current review
round; account role or an assignment on another proposal is insufficient.
`proposal.review.assign` and staff consolidation/routing require
`SCIENTIFIC_MANAGEMENT_STAFF` plus an effective `PROPOSAL_MANAGEMENT_OFFICER`,
explicit scope and capability on that proposal. Head oversight is a read basis,
not an automatic grant of these operations. Final
`proposal.decision.approve`/`proposal.decision.reject` require
`LEADERSHIP_APPROVAL_AUTHORITY` and the ready-for-approval state with no conflict;
`SYSTEM_ADMIN` has no implicit business workflow capability. Researcher profile
responses never embed proposal review/assignment/approval sections.

## 7. Review Disclosure Matrix

| Audience/state | Identity | Raw score/comment | Consolidation | Allowed response |
| --- | --- | --- | --- | --- |
| PI/team member/team secretary before final disclosure | hidden | hidden | hidden | generic workflow status only |
| Same audiences after final decision | hidden | hidden | hidden | `PublishedReviewSummaryV1` only |
| Assigned reviewer | own identity only | own submitted/draft material only | hidden | own assignment DTO |
| Head oversight within authorized scope | Only identities permitted by disclosure policy | Only if specifically permitted by disclosure policy | Only if permitted by disclosure policy | oversight data with current responsible Staff/unassigned state; participation conflicts retain PI/team restrictions |
| Staff with current management-officer assignment and scope, without conflict | visible as required | visible as required | visible as required | operational internal DTO |
| Assigned approval authority/council member | visible only where decision duty requires | visible only where decision duty requires | visible as required | decision-duty DTO |
| Unrelated actor | hidden | hidden | hidden | deny |

```text
PublishedReviewSummaryV1
  schemaVersion: "v1"
  decisionStatus: string
  decisionDate: date
  publicSummary: string
  requiredFollowUp: string[]
```

The matrix applies identically to list/detail fields, file variants, export
columns, notification text, dashboard cards, history, and search indexes.
Hidden fields are omitted and their files denied; they are not returned as
null placeholders. A wider audience, field, or workflow state requires an
institution-approved contract version.

## 8. Personal Work Contract

```text
PersonalWorkEntryV1
  schemaVersion: "v1"
  sourceDomain: DomainCodeV1
  sourceRecordId: UUID
  sourceVersion: non-negative integer
  contextVersion: ContextVersionTokenV1
  displayLabel: string
  dueAt: UTC instant | null
  routeRef: string
  targetAction: PermissionActionV1
  actionable: boolean
  blocked:
    code: AuthorizationDecisionCodeV1
    reason: string
  | null
```

For a conflict-blocked item, the user may see only the record label already
available through their own relationship, domain, due date, route, target
action, and backend code/reason. Reviewer identities, hidden assignments,
scores, comments, conflict sources, and other participant identities are
forbidden.

Each request queries every enabled source contract with the same `asOf`.
Failure, staleness, or unresolved completeness in any enabled source fails the
whole response with the relevant context code; no partial list or count is
returned. After authorization and disclosure, entries are de-duplicated by
`sourceDomain + sourceRecordId + targetAction`, sorted by `dueAt` ascending
with null last, then domain, record ID, and action. Actionable counts exclude
blocked and denied items; blocked items remain in the visible list.

The cursor contains `asOf`, the last sort tuple, and all source versions. A
source-version mismatch returns `CONTEXT_VERSION_MISMATCH` and requires a
fresh first page.

## 9. Background Job Envelope

```text
AuthorizationJobEnvelopeV1
  schemaVersion: "v1"
  jobId: UUID
  servicePrincipal: ServicePrincipalV1
  initiatedByUserId: UUID | null
  onBehalfOfUserId: UUID | null
  targetDomain: DomainCodeV1
  targetRecordId: UUID
  action: PermissionActionV1
  capturedContextVersion: ContextVersionTokenV1
  requestedAt: UTC instant
```

User-triggered jobs require both the service principal's exact execution action
and the current on-behalf-of user's authority at execution time. Account
inactivation, relationship/grant expiry or revocation, conflict, workflow-state
change, or context-version mismatch cancels the protected side effect and
audits the denial. Scheduled system-only jobs are allowed only for actions
explicitly marked `SERVICE_ONLY` in `PermissionActionV1`; they have no borrowed
user authority and cannot make business approval/rejection/final decisions.

## 10. Audit Contract

`AuthorizationAuditV1` is append-only and contains schema/policy version,
event/correlation ID, actor, optional service/on-behalf-of principal, target,
exact action, request-wide `asOf`, context versions, every evaluated rule
outcome, selected primary decision code, and redacted before/after values.
Protected identities and conflict sources are redacted from general audit
views and available only to an explicitly authorized audit viewer.

## 11. Integration Gate and Fixtures

The technical architecture owner owns the gate; the product owner approves
disclosure fixtures. A source domain is contract-complete only when the
canonical fixture suite passes for:

- allow and every V1 denial/failure code;
- resolved-empty versus unresolved context;
- UTC start/end/revocation boundaries using one `asOf`;
- overlapping relationships and multiple different relationship types;
- for any future domain delegation contract: initiation, self-approval denial,
  expiry, revocation, scope, non-delegable actions, and source-authority loss;
- disclosure for every matrix audience across DTO, file, export,
  notification, search, dashboard, and history;
- capability schema compatibility and unknown-version/code denial;
- context-version mismatch and retry behavior;
- personal-work de-duplication, ordering, counts, blocked fields, cursor
  invalidation, and whole-response source failure;
- user-triggered and service-only job authorization/cancellation;
- mutation-time re-authorization and append-only audit output.

Required consumers are the protected record/list APIs, files, exports,
notifications/reminders, search, dashboard/reporting, personal work, and web
permission UI. A table, route, or locally passing provider test alone does not
satisfy the gate.

## 12. Proposal User Account assignment binding

`GET /research-proposals/:id/assignable-reviewers?q=` returns `{ users }` with
eligible account `id`, `displayName`, and `username`. Search matches display name
or username and is restricted to unconflicted Staff with explicit scope and
current `PROPOSAL_MANAGEMENT_OFFICER` on the proposal, in
assignable states with current completeness evidence. Candidates may have any role,
any organization scope and no Scientist Profile. PI/active team participants and
accounts with a live duplicate assignment are excluded.

`POST /research-proposals/:id/review-assignments` requires `reviewerUserId` and the
current proposal `contextVersion`; accepts `assignmentRole` (`reviewer` or
`committee_member`, default reviewer) and optional UTC effective dates/deadline.
Profile ID and username selectors are rejected. Within `runProposalMutation`, lock
and reload the selected active account and recheck participation and other baseline
rules. Store its current linked profile ID if any, otherwise null; never create links.
Self-selection by an otherwise authorized nonparticipant is allowed.

For the current proposal model, `reviewer` maps to `REVIEWER` and
`committee_member` maps to `COUNCIL_MEMBER` in the shared mutually exclusive
evaluation-position group. Candidate search/preflight and the authoritative
mutation apply the same source-participation, position, interval and historical
review/decision checks. Reassignment ends or revokes the old row before the new
row becomes effective, retains immutable history, and rejects stale context or
any concurrent overlap. Bulk/import/admin consumers must call the same owning
mutation; direct persistence is not a supported assignment path.

Review queue, proposal/package/file reads and own review actions rely on the effective
assignment and conflict checks, without assignee role or host-unit scope requirements.
Staff assignment/consolidation requires the active proposal management-officer
relationship and scope; the leadership decision conflict rule
remain unchanged. Revoke retains required nonblank `note` (max 2000 trimmed characters)
and `contextVersion`. Assignment/revocation and audit are atomic; candidate conflict
rejection commits only its failure audit. Preserve historical profile provenance.

## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](../../../../docs/contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- Scoped SYSTEM_ADMIN and SCIENTIFIC_MANAGEMENT_STAFF manage internal/external
  profiles independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- System Account / Access supports optional create-and-link, existing unlinked
  account selection, unlink and authorized credential reset/resend. Linking is
  one-to-one across all current links, including inactive records. Staff can
  provision only matching researcher roles in the profile's explicit scope.
- Staff confirms the recipient email. The system generates and hashes a temporary
  password, sends login information by configured SMTP, and requires a different
  password before any normal authenticated API/UI feature. No plaintext credential
  is persisted, returned to staff or placed in audit. SMTP acceptance is not proof
  of inbox delivery; a failed/uncertain send has an explicit new-credential retry.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields are editable; type, status, linkage and role/scope remain administrative.
  Unlink immediately removes self access. Self-reported history grants no access
  to operational projects/proposals and does not replace source-owned assignments.
- Profile/link/account/credential/first-password-change audit is preserved with
  safe transactional change facts. No test files are written or changed for this
  completion at the user's instruction; verification is recorded in its artifact.
