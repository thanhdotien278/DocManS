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
| `PROPOSAL_CO_INVESTIGATOR` | proposal | one | member-default actions only |
| `PROPOSAL_MEMBER` | proposal | one | additive subject to denials |
| `PROPOSAL_SCIENTIFIC_SECRETARY` | proposal | one | administrative actions only |
| `PROJECT_PI` | project | one | additive subject to denials |
| `PROJECT_CO_INVESTIGATOR` | project | one | member-default actions only |
| `PROJECT_MEMBER` | project | one | additive subject to denials |
| `PROJECT_SCIENTIFIC_SECRETARY` | project | one | administrative actions only |
| `REVIEWER_ASSIGNMENT` | review owner | one per evaluation assignment | own assignment only |
| `COUNCIL_MEMBER` | council | one per council | assigned council only |
| `COUNCIL_SCIENTIFIC_SECRETARY` | council | one per council | administrative actions only |
| `ETHICS_REVIEWER_ASSIGNMENT` | ethics | one per assignment | own assignment only |
| `TASK_ASSIGNEE` | task | one per task | assigned task only |

All active types are preserved; there is no “highest relationship.” Additive
actions are unioned only after every denial is evaluated. A future relationship
type or multiplicity change requires a registry version change and fixtures.

## 4. Exact Action and Delegation Contract

`PermissionActionV1` values are lowercase namespaced strings owned by
`packages/permissions`, for example `project.progress-report.edit`.
Matching is exact. Wildcards, prefix inheritance, and delegation chains are
forbidden.

```text
DelegationGrantV1
  schemaVersion: "v1"
  grantId: UUID
  grantorUserId: UUID
  delegateUserId: UUID
  approverUserId: UUID
  targetDomain: DomainCodeV1
  targetRecordId: UUID
  targetOrganizationId: UUID
  actionIds: non-empty PermissionActionV1[]
  sourceAuthorityVersion: ContextVersionTokenV1
  startsAt: UTC instant
  endsAt: UTC instant | null
  status: "PENDING_APPROVAL" | "ACTIVE" | "REVOKED" | "EXPIRED" | "REJECTED"
  approvedAt: UTC instant | null
  revokedAt: UTC instant | null
  reason: string
```

A collection-wide grant is not valid in V1. The grantor must currently hold
every action on the one target record. Approval requires
`delegation.grant.approve`, the
`SCIENTIFIC_MANAGEMENT_STAFF` system role, organization-scope intersection
with the target, and a different approver from the grantor. Self-approval is
forbidden. The delegate cannot redelegate.

The non-delegable V1 registry includes reviewer/council assignment, evaluation
submission and scoring, reviewer-identity disclosure, participation/membership
change, grant approval, business approval/rejection, and all final-decision
actions. Unknown actions are non-delegable by default.

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
| PI/co-investigator/member/secretary before final disclosure | hidden | hidden | hidden | generic workflow status only |
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
- delegation initiation, self-approval denial, expiry, revocation, scope,
  non-delegable actions, and source-authority loss;
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
