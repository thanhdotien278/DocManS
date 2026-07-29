# Adversarial Review — Record-Scoped Authorization Architecture Spine

## Review Target

`ARCHITECTURE-SPINE.md`, status `final`, updated 2026-07-29.

The test applied here is stricter than internal consistency: can two downstream
teams obey every adopted architecture decision literally and still produce
components that cannot safely interoperate? The answer is yes.

## Two Literal-Compliant but Incompatible Implementations

### Unit A — Synchronous Domain Gateway

Unit A implements project and proposal authorization as follows:

- The project/proposal modules are the only stores for typed relationships.
  Researcher history is a live authorized view assembled by querying those
  stores; the researcher module stores identity only.
- A central policy function evaluates a fixed sequence:
  organization scope, relationship lifecycle, workflow state, conflict, then
  additive allows. It returns the first denial encountered.
- Relationship timestamps are UTC instants with a half-open interval:
  `effectiveFrom <= now < effectiveUntil`. A null end means unbounded.
- Every delegated mutation synchronously loads the grant and the delegator's
  current source relationship in the same request. Delegated action identifiers
  are namespaced strings such as `project.document.update`.
- Capabilities use arrays of strings and blocked-action objects:

  ```json
  {
    "viewerRelationships": [
      {
        "type": "PROJECT_PI",
        "status": "ACTIVE",
        "effectiveFrom": "2026-07-01T00:00:00Z",
        "effectiveUntil": null
      }
    ],
    "allowedActions": ["project.document.update"],
    "blockedActions": [
      {
        "action": "project.decision.approve",
        "code": "CONFLICT_DENY",
        "reason": "Bạn có xung đột lợi ích."
      }
    ],
    "evaluatedContextRef": "project:123:revision:17"
  }
  ```

- Personal work performs live fan-out to each source domain. Every returned
  entry is re-authorized at request time. Conflicted entries are absent from
  `actionableItems` and represented only by minimal records in a separate
  `suppressedItems` collection so that an explanation is preserved.
- Unit A waits for each source-domain contract before adding that source to the
  hub and treats a missing response as missing context, hence deny.

This obeys AD-1 through AD-8: it has one system role, complete contextual
evaluation, deny precedence, domain-owned relationships, explicit delegation,
server capabilities with mutation re-evaluation, conflict-safe personal work,
and dependency ordering.

### Unit B — Event-Projected Domain Adapter

Unit B implements council and review authorization as follows:

- Council/review modules remain authoritative for relationships and publish
  versioned events. The researcher module owns an authorized-history projection
  copied from those events. It calls the copy shared researcher data, while
  never treating it as the authority for a mutation.
- Policy predicates run in parallel. If more than one denial exists, Unit B
  chooses a reason using the fixed local order conflict, lifecycle, state,
  organization scope; only after there are no denials are allows unioned.
- Relationship effective values are institution-local civil dates with closed
  intervals: `effectiveFrom <= today <= effectiveUntil`. A null end means
  unbounded. The status must also be `ACTIVE`.
- List/detail capabilities and personal-work entries use event projections.
  Mutations synchronously reload the source relationship, current delegation,
  workflow state, and conflict state before executing. Missing projection or
  source context denies access. Delegated actions are structured pairs such as
  `{ "resource": "DOCUMENT", "verb": "UPDATE" }`.
- Capabilities use maps and structured action objects:

  ```json
  {
    "viewerRelationships": {
      "COUNCIL_MEMBER": {
        "status": "ACTIVE",
        "validOn": "2026-08-01"
      }
    },
    "allowedActions": [
      {
        "resource": "DOCUMENT",
        "verb": "UPDATE"
      }
    ],
    "blockedActions": {
      "DECISION:APPROVE": {
        "code": "ORG_SCOPE_DENY",
        "reason": "Ngoài phạm vi đơn vị."
      }
    },
    "evaluatedContextRef": {
      "recordVersion": 17,
      "projectionOffset": 9812
    }
  }
  ```

- Personal work consumes domain events into a read model. Each projected entry
  is independently authorized using projected context on every hub read;
  mutations still re-authorize against source domains. Conflicted entries stay
  in `allItems` with `actionable: false` and a reason, while
  `actionableItems` filters them out.
- Unit B starts projection integration only after the corresponding source
  domain and event contract exist.

This also obeys AD-1 through AD-8 literally. Domain stores remain authoritative,
all required context is evaluated or missing context denies, all denials beat
allows, delegation is explicit and revalidated for mutation, the server supplies
capabilities, personal-work entries are independently authorized, and source
dependencies precede consumers.

## Concrete Interoperability Failures

| Scenario | Unit A result | Unit B result | Failure |
| --- | --- | --- | --- |
| Relationship ends on `2026-08-01` and action occurs during that date | Invalid at the end instant under a half-open UTC interval | Valid through the local civil date under a closed interval | Same relationship grants different authority |
| Actor is both outside organization scope and conflicted | `ORG_SCOPE_DENY` because scope is evaluated first | `CONFLICT_DENY` because conflict denial is selected first | Stable code, explanation, audit, and UI behavior diverge |
| Delegated document update is passed between modules | Expects `project.document.update` | Expects `{resource:"DOCUMENT", verb:"UPDATE"}` | Grant cannot be interpreted consistently |
| Capability from one module is consumed by shared web code | Arrays of action strings and blocked objects | Structured allowed actions and a blocked-action map | One common client cannot parse both DTOs without inference |
| Relationship correction is committed in a source domain | Live history changes immediately | History changes after event projection catches up | The same authorized-history request returns conflicting facts |
| Conflict is added immediately before opening Personal Work | Item appears only in `suppressedItems` with minimal metadata | Existing projected item remains in `allItems` with metadata and `actionable:false` | Count, disclosure, and explanation contracts diverge |
| Delegator authority is revoked after a capability read | Capability can immediately disappear | Projected capability can remain until the event arrives; mutation later denies | UI promise and command result conflict for an undefined period |

The architecture currently gives no contract by which either unit can reject
the other implementation as non-conforming.

## Findings

- Shared data ownership is internally ambiguous: AD-4 says source domains own
  typed relationships and lifecycle, while researcher profiles provide shared
  identity and authorized history, but it never says whether authorized history
  is a live query, a source-owned view, a researcher-owned projection, or a
  separately governed data product. Define authoritative fields, permitted
  replicas, correction propagation, deletion behavior, freshness, and the rule
  that a replica cannot authorize a mutation.

- Deny precedence is specified only between denials and additive allows. It does
  not define the precedence among simultaneous scope, lifecycle, state, and
  conflict denials, despite requiring one stable code and plain-language reason.
  Define a canonical decision lattice or ordered rule list and require every
  policy entry point and capability projection to select the same primary code.

- Relationship lifecycle lacks a canonical temporal model. “Status plus
  effective dates” leaves timestamp versus civil date, timezone, inclusive end
  versus exclusive end, null bounds, precision, future activation, and
  retroactive correction undefined. Publish one interval convention and an
  explicit `asOf` rule shared by APIs, jobs, projections, tests, and audit.

- Relationship lifecycle also lacks transition invariants. Nothing prevents
  overlapping active relationships of the same type, reactivation after
  revocation, physical deletion, or contradictory status and dates. Define the
  allowed state machine, uniqueness/overlap constraints, immutable history
  requirements, and which transition wins when status and interval disagree.

- Delegation has no canonical action vocabulary. “Action-specific” can be
  implemented as a free-form string, domain enum, resource/verb pair, route
  name, or wildcard hierarchy, so a grant created by governance need not be
  understood by a target domain. Define namespaced action identifiers, their
  versioning, whether descendants or wildcards exist, and exact-match rules.

- Delegation validity is underspecified at boundaries. The document omits
  grant start/end interval semantics, timezone, approval effective time,
  revocation behavior, whether the delegate and delegator must remain active
  accounts, whether organization scope must still intersect, and whether
  delegation chains are forbidden. Define a complete validity predicate
  evaluated at the mutation's authoritative time.

- “Source authority must remain active” does not identify the consistency
  mechanism. A synchronous lookup, transactionally maintained local copy, and
  eventually consistent event projection can all claim compliance while
  disagreeing after revocation. State which decisions require authoritative
  reads, set a maximum permitted projection age for read-only capability
  surfaces, and fail closed when that freshness cannot be proved.

- Non-delegable “decision and review actions” is not a usable boundary. Uploading
  a review file, editing a draft review, submitting it, recording a decision,
  signing minutes, and publishing an outcome can be classified differently by
  different modules. Publish a deny-by-default registry of non-delegable action
  identifiers and assign ownership for updating it.

- The capability response is a semantic wish list rather than a DTO contract.
  Field names, types, cardinality, action identifier format, blocked-action
  representation, relationship redaction, ordering, nullability, schema
  version, and unknown-code behavior are absent. Define and version one shared
  schema in `packages/permissions`, including compatibility rules for clients
  and source modules.

- The required relationship disclosure in a capability response can itself
  leak protected participation or conflict facts. “Record relationships” does
  not state whether the server returns all relationships, only the viewer's
  relationships, redacted types, or the relationship facts that affected the
  decision. Define a minimum-disclosure projection per audience and forbid
  capability DTOs from exposing hidden assignments or conflict sources.

- Mutation re-evaluation does not close the time-of-check/time-of-use gap.
  Loading policy context and then mutating state can permit an action after a
  relationship, delegation, workflow state, or conflict fact changes
  concurrently. Require the owning service to bind authorization and mutation
  to one transaction or validated record/context versions and define the retry
  or denial result on version mismatch.

- Stable decision codes have no canonical registry or composition rule.
  Independent domains can emit `CONFLICT`, `CONFLICT_DENY`,
  `REVIEWER_CONFLICT`, or reuse a code with different meaning, defeating shared
  UI explanations, tests, metrics, and audit. Define namespaced codes,
  ownership, deprecation rules, default client handling, and the one code chosen
  when several denials apply.

- Personal-work “independently authorize every entry” does not say whether the
  check uses source-authoritative context, projected context, or a previously
  issued capability. Nor does it define freshness, invalidation, partial-source
  failure, pagination under post-filtering, or whether stale entries must
  disappear. Define a read-model consistency contract and fail-closed behavior
  that preserves stable pagination without counting unauthorized items.

- “Remove conflicted items from actionable queues while preserving an
  explanation” leaves the disclosure surface undefined. Keeping a full
  non-actionable item, returning a minimal suppression marker, or exposing only
  an aggregate explanation all comply but reveal different amounts of
  information. Specify the permitted metadata, location of the explanation,
  count semantics, and whether the existence of a conflicted assignment may be
  disclosed.

- Cross-module personal-work actions have no end-to-end command contract.
  A hub entry needs a stable source identifier, record version, capability
  revision, target action identifier, route, and stale-command behavior;
  otherwise a projected item from one domain cannot safely invoke its owning
  service. Define the shared entry envelope and require the source mutation to
  reject stale context deterministically.

- Organization scope and assignment scope are named as required inputs but not
  modeled. The architecture does not define hierarchy, inherited membership,
  cross-unit records, multi-organization actors, record organization changes,
  or the intersection between assignment and organization scope. Define the
  normalized scope facts and exact intersection algorithm before domains
  implement their own versions.

- “Missing context fails closed” does not distinguish absent facts from failed
  dependencies, stale projections, intentionally inapplicable context, or an
  empty relationship set. Without typed completeness, one domain can deny valid
  users during an outage while another treats an empty result as complete.
  Define a context envelope with source, version, observed time, completeness
  status, and typed `not-applicable` values.

- The architecture does not define principals for jobs, reminders,
  notifications, exports, and background projections even though AD-2 binds
  them. Forcing an account system role onto service execution can violate AD-1;
  borrowing the initiating user's current rights can change queued outcomes.
  Define actor-on-behalf-of semantics, captured versus current authorization
  context, cancellation after revocation, and audit identity for asynchronous
  work.

- The audit convention lists fields but omits event identity, before/after
  values, policy/schema version, evaluated context versions, correlation ID,
  append-only guarantees, and redaction. Two compliant units cannot reconstruct
  why their decisions differed. Define a versioned audit event contract that
  records the selected denial and the complete set of evaluated rule outcomes
  without leaking protected facts.

- AD-8 orders domains before integrations but does not define what “source
  domain exists” means. A database table, API, event stream, capability DTO, and
  versioned lifecycle contract are materially different readiness thresholds.
  Define contract-complete entry criteria and consumer contract tests for every
  source before file, search, dashboard, report, and personal-work integration
  may start.

- The structural seed names packages but leaves dependency direction
  unenforced. Shared policy composition can import domain persistence models, or
  domains can import and reinterpret shared policy internals, both matching the
  directory sketch while creating cycles and duplicate authority. Define ports
  for domain fact providers, prohibit shared authorization from owning domain
  data, and add architecture tests for dependency direction.

## Verdict

The spine expresses the intended safety posture, but it is not yet a
build-substrate contract. Its decisions constrain broad behavior without fixing
the shared representations, temporal semantics, ordering, consistency, and
integration boundaries needed for independent teams to interoperate. The two
implementations above both satisfy every adopted AD literally and still
disagree on authorization outcomes, delegation interpretation, capability
parsing, history freshness, and personal-work disclosure. The document should
not remain `status: final` until these contracts are made normative or delegated
to named, versioned companion specifications.

## Re-review After Remediation — Remaining Build-Safety Blockers

The added AD-9 through AD-14 and revised conventions close the original broad
ambiguities, but two literal-compliant units can still diverge materially:

- Unit A captures one request-wide `asOf`, treats any source failure as a whole
  request failure, scopes delegation to one record, authorizes a job as the
  initiating actor, denies a disclosure-sensitive resource as a whole, and
  declares integration readiness using its own provider tests.
- Unit B lets each source resolver obtain its own database `asOf`, omits only
  entries from a failed source, scopes delegation to every record on which the
  holder currently has the exact action, authorizes a job as a service
  principal against current record context, redacts fields rather than denying
  the resource, and declares readiness using its own consumer tests.

Both can satisfy the current wording, yet they return different decisions,
records, counts, job effects, and client payloads. The remaining blockers are:

- AD-10 names five versioned registries but does not define their schemas,
  assign a concrete owner, or reference a normative companion artifact. Until
  the actual field/type/cardinality definitions and compatibility fixtures
  exist, two domains can publish incompatible `ViewerAuthorizationV1` or
  `PersonalWorkEntryV1` objects while claiming the same registry name.

- AD-3 has a deterministic order only for listed business denials. AD-2 and
  AD-10 also require failure on unresolved, error, stale, ambiguous, unknown
  version, and unknown code conditions, but none of those conditions has a
  canonical decision code or mapping to the ordered list. Different entry
  points can therefore select `RELATIONSHIP_INACTIVE`,
  `DELEGATION_INVALID`, or `ACTION_NOT_GRANTED` for the same incomplete
  context.

- AD-9 does not require one request-wide `asOf` to be generated once and passed
  to all resolvers. Independently reading the database server's UTC instant is
  compliant but can cross an activation, expiry, or revocation boundary during
  one decision or query-on-read aggregation. The contract must carry a single
  authoritative `asOf` through policy, domain resolvers, capability DTO, jobs,
  and audit.

- The lifecycle multiplicity exception remains open-ended. “Unless that domain
  explicitly permits multiplicity” does not identify where permission is
  registered, what combinations may overlap, or how multiple active
  relationships compose. A normative relationship-type registry must declare
  multiplicity and deterministic composition for every type.

- AD-5 does not define the grant's resource scope. Exact action matching still
  permits both a grant for one record and a grant applying to all current and
  future records on which the delegator holds that action. The grant contract
  must require target domain, target record or explicitly bounded collection,
  organization scope, delegate identity, and source-authority version.

- “Authorized scientific-management staff” is not a resolvable approval rule.
  It can mean a system role, an organization-scoped assignment, a
  record-specific relationship, or a separate approval capability. The
  approval action, organization intersection, separation-of-duties rule, and
  whether the initiator may approve their own grant must be defined in the
  action and policy registries.

- AD-13 does not say whose current authority a delayed job re-evaluates.
  Authorizing the initiating actor, the service principal, or both can each be
  read as “re-authorize current source context,” but produces different effects
  after account suspension, relationship expiry, delegation revocation, or
  workflow transition. A job envelope must define execution authority,
  on-behalf-of semantics, cancellation, and permitted service-principal-only
  actions.

- “Validates context versions atomically” is not executable across source
  domains until a context-version token and comparison protocol are defined.
  Per-row revisions, transaction IDs, aggregate versions, and projection
  offsets are not interchangeable. The shared contract must define token
  provenance, scope, atomic comparison point, mismatch code, and retry rule.

- AD-11 still lacks a normative disclosure matrix and summary schema.
  “Configured disclosure state” and “policy-approved summary” do not identify
  the exact workflow state, audiences, fields, file variants, export columns,
  notification content, or whether a sensitive resource is denied, omitted, or
  returned redacted. Two compliant modules can therefore expose incompatible
  shapes and materially different metadata.

- AD-4 and AD-7 specify query-on-read but not a request-level aggregation
  contract. Cross-source pagination, total counts, stable ordering, duplicate
  identity, per-entry disclosure, and the result of one partial-source failure
  remain undefined. Both whole-request failure and omission of the failed
  source fail closed, but they are not interoperable and provide different
  completeness guarantees.

- The “minimal blocked presentation” in AD-7 is not defined by fields.
  Returning only action/code/reason and returning record ID, title, domain,
  deadline, and route can both be called minimal. The normative
  `PersonalWorkEntryV1` schema must define the exact conflicted-item projection,
  count membership, sort behavior, and forbidden metadata.

- AD-14 lets each source prove readiness with unspecified “consumer contract
  tests.” Without named required consumers, a canonical fixture suite,
  disclosure and failure cases, version matrix, and an accountable gate owner,
  two teams can self-certify mutually incompatible contracts as
  integration-ready.

### Re-review Verdict

The remediation materially improves policy safety, but the spine is still not
independently build-safe. The remaining uncertainty is now concentrated in
missing normative contract artifacts and a small set of unresolved execution
semantics. `status: final` becomes defensible only after the five AD-10
registries, disclosure matrix, delegation/job envelopes, request-wide temporal
context, aggregation failure contract, and canonical integration fixture suite
exist or are referenced as binding companions.

## Companion Closure Re-review — PASS

The normative `AUTHORIZATION-CONTRACTS.md` companion and its binding references
from the spine close all 12 blocker clusters in the preceding re-review
sufficiently for story-level implementation. It fixes one request-wide
`asOf`, complete failure-code ordering, lifecycle multiplicity, record-bounded
delegation and approval authority, context-version comparison, viewer and
personal-work DTOs, disclosure responses, background-job authority,
whole-response aggregation failure, blocked-item fields, and the owned
integration fixture gate.

No remaining build-safety blocker was found within those 12 clusters. The
executable registries and canonical fixtures are implementation deliverables
owned by `packages/permissions`, and AD-14 prevents dependent consumers from
self-certifying before those deliverables pass. This PASS supersedes the prior
conditional-fail verdict for the remediated architecture set.
