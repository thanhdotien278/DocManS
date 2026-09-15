---
name: DocManSystem authorization contracts
type: normative-architecture-companion
schemaVersion: v1
status: final
created: 2026-07-29
updated: 2026-07-29
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

## 3. Relationship Type Registry

The following V1 relationship types are canonical:

| Type | Owner | Same actor + record multiplicity | Composition |
| --- | --- | --- | --- |
| `PROPOSAL_PI` | proposal | one | additive subject to denials |
| `TOPIC_PI` | approved topic | one | additive subject to denials |
| `TOPIC_SECRETARY` | proposal or approved topic | at most one active per record | administrative actions only |
| `TOPIC_MEMBER` | proposal or approved topic | additive subject to denials | member-default actions only |
| `REVIEWER_ASSIGNMENT` | review owner | one per evaluation assignment | own assignment only |
| `COUNCIL_MEMBER` | council | one per council | assigned council only |
| `COUNCIL_SCIENTIFIC_SECRETARY` | council | one per council | administrative actions only |
| `ETHICS_REVIEWER_ASSIGNMENT` | ethics | one per assignment | own assignment only |
| `TASK_ASSIGNEE` | task | one per task | assigned task only |

All active types are preserved; there is no “highest relationship.” Additive
actions are unioned only after every denial is evaluated. A future relationship
type or multiplicity change requires a registry version change and fixtures.

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
another user's assignment, conflict source, or undisclosed review material.

## 7. Review Disclosure Matrix

| Audience/state | Identity | Raw score/comment | Consolidation | Allowed response |
| --- | --- | --- | --- | --- |
| PI/team member/team secretary before final disclosure | hidden | hidden | hidden | generic workflow status only |
| Same audiences after final decision | hidden | hidden | hidden | `PublishedReviewSummaryV1` only |
| Assigned reviewer | own identity only | own submitted/draft material only | hidden | own assignment DTO |
| Assigned scientific-management staff | visible as required | visible as required | visible as required | operational internal DTO |
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

## 12. Proposal Scientist Profile assignment binding

`GET /research-proposals/:id/assignable-reviewers?q=` returns `{ profiles }` only,
with eligible `id`, `fullName` and minimal linked-account display context. It is
restricted to unconflicted, scoped scientific management in assignable states.
`POST /research-proposals/:id/review-assignments` requires `researcherProfileId`
and the current proposal `contextVersion`; accepts `assignmentRole` (`reviewer`
or `committee_member`, default reviewer), optional UTC effective dates/deadline.
Account ID/username inputs do not select an assignee and are rejected. The backend
derives the existing linked account from the active profile and rechecks all
baseline eligibility rules within `runProposalMutation` before creating evidence.
The revoke endpoint retains its `note` plus `contextVersion` payload.

Persist a nullable source-profile foreign key for legacy compatibility; require
it for all new application assignments. Do not infer/backfill historical identity.
Include profile/account/role in operational assignment audit and preserve the
existing disclosure projections; no new global role/action is introduced.


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
