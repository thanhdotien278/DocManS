# Good-Spine Rubric Review

**Artifact:** `ARCHITECTURE-SPINE.md`
**Review lens:** BMad Architecture reviewer gate — Good-spine checklist
**Initial verdict (superseded by the re-review below):** **Needs revision
before it is build-safe.** The first-pass findings are retained as audit
history.

## Re-review After Remediation — 2026-07-29

**Verdict:** **PASS for GS-01 through GS-06; no remaining blocker from the
original rubric review.** Deterministic lint still passes with 0 findings.

| Prior finding | Result | Remediation verified |
| --- | --- | --- |
| GS-01 — brownfield contradiction | **Resolved** | `Reality Baseline` now distinguishes adopted target from implemented reality; AD-12 binds the role/session/schema/seed/permission migration; `Proposed Structural Seed` requires consolidation of current seams and forbids a parallel policy system. |
| GS-02 — incomplete delegation contract | **Resolved** | AD-5 now binds current-action-holder initiation, staff approval, active/unrevoked interval, retained source authority, exact versioned actions, no chains/wildcards, and the complete non-delegable set. |
| GS-03 — disclosure left under Deferred | **Resolved** | AD-11 makes the restricted phase-1 disclosure policy binding across every protected projection; Deferred now covers only future approved widening. |
| GS-04 — empty versus unresolved context | **Resolved** | AD-2 explicitly separates `resolved(value)`, `resolved(empty)`, `unresolved/error`, and `not-applicable`; only failed, stale, ambiguous, or unresolved applicable context fails closed. |
| GS-05 — conflicted queue visibility | **Resolved** | AD-7 excludes conflicted items from actionable counts/enabled queues while retaining a minimal blocked presentation with backend code and reason. |
| GS-06 — silent operational envelope | **Resolved** | `Inherited Operational Constraint` binds the full architecture's deployment, monitoring, backup, and environment model and prohibits environment-specific policy variation or bypass. |

**Remaining blockers:** none within the requested GS-01..GS-06 re-review scope.
The historical findings below are retained as the audit trail of the first
gate.

## Gate Evidence

- Deterministic lint: **PASS** — 0 findings.
- Primary requirements checked: PRD `FR2`, `FR6a`–`FR6e`, role/data-scope requirements, and `AC-PERM-01`–`AC-PERM-13`.
- Brownfield checks: current auth role loading, Prisma account-role shape, shared permissions contract, and current API module layout.
- Full architecture consulted for the existing authorization, delegation, deployment, and directory decisions.

## Findings

### Critical

#### GS-01 — `[ADOPTED]` account-role invariant contradicts the current brownfield authority model

**Rubric clauses:** ratifies rather than contradicts a brownfield codebase; fixes real divergence points; Rule is enforceable.
**Spine evidence:** `AD-1` declares exactly one active system role and record-scopes PI/reviewer/council roles (`ARCHITECTURE-SPINE.md:55-60`); the structural seed places policy composition under `apps/api/src/common/authorization/` and new modules under `apps/api/src/modules/` (`:128-135`).
**Brownfield evidence:** `AuthStore` reads multiple active `roleAssignments`, returns a `roles[]` collection, and still accepts `principal-investigator`, `reviewer`, and `council-member` as account roles (`apps/api/src/auth/auth.store.ts:121-171`). Prisma allows multiple `UserRoleAssignment` rows per user and still carries legacy `User.role`/`roleLabel` fields (`apps/api/prisma/schema.prisma:9-24,73-84`). The shared permission package likewise defines those business roles as `UserRole` values and evaluates `roles[]` (`packages/permissions/src/index.ts:1-7,33-52`). The current API convention also uses `apps/api/src/permissions/` and top-level feature folders rather than the structural-seed paths.

**Why this blocks convergence:** one story can implement the spine literally while another can extend the current `roles[]` policy, and both can appear locally consistent. The `[ADOPTED]` tag incorrectly presents a target migration as existing reality.

**Disposition:** **Discuss, then fix.** Either:

1. ratify the current model and defer the one-role migration explicitly; or
2. keep the target model, remove the misleading `[ADOPTED]` posture, and add a binding migration/compatibility invariant covering role data, seed data, session DTOs, shared permission types, navigation, and module-path ownership. Mark the structural paths as target paths with a transition rule, or change them to the current repository convention.

### High

#### GS-02 — Delegation validity does not bind the grant initiator, complete lifecycle, or the full non-delegable set

**Rubric clauses:** covers source capabilities; Rule actually prevents its stated divergence.
**Spine evidence:** `AD-5` requires a staff-approved, action-specific, time-bounded grant whose source authority remains active, and makes “decision and review actions” non-delegable (`ARCHITECTURE-SPINE.md:86-92`).
**PRD evidence:** `FR6b` requires the grant to be initiated by the actor who currently holds the action and to carry grantor, approver, status, and revocation semantics (`prd.md:385`). The detailed policy makes reviewer assignment, scoring, membership changes, approval, rejection, and final decisions non-delegable (`prd.md:554-566`), while `AC-PERM-13` explicitly rejects self-granted and unapproved grants (`prd.md:716-720`).

**Why this permits divergence:** a domain can satisfy `AD-5` with a grant created by staff, or treat membership changes/reviewer assignment as delegable because they are not clearly “decision and review actions.” Revoked and not-yet-approved states are also not explicitly part of the validity predicate.

**Disposition:** **Autofix.** Expand `AD-5` so a valid grant must be initiated by the current action holder, approved by authorized scientific-management staff, active/unrevoked and within effective dates, and rejected immediately when source authority ends. Enumerate or reference a single shared non-delegable action set that includes reviewer assignment, scoring, membership changes, approval, rejection, and final decisions.

#### GS-03 — The default review-disclosure policy is placed under Deferred without a binding phase-1 rule

**Rubric clauses:** nothing under Deferred could let two units diverge; covers source capabilities.
**Spine evidence:** the only disclosure statement says institution-specific disclosure beyond a “default restricted policy” is deferred (`ARCHITECTURE-SPINE.md:150-155`), but no invariant defines that default.
**PRD evidence:** the phase-1 rule is explicit: PI/member/secretary users cannot see reviewer identities, raw scores, reviewer comments, or consolidated material before the configured disclosure state; after final decision, only the policy-approved summary is visible by default (`prd.md:533-542`, `AC-PERM-12` at `:711-715`).

**Why this permits divergence:** proposal, council, ethics, file, list, and notification stories can choose different fields and disclosure timing while all claiming to follow the deferred item.

**Disposition:** **Autofix.** Add an adopted disclosure invariant that binds list/detail DTOs, files, exports, notifications, dashboards, and history. Keep only future institution-specific widening under Deferred, behind a versioned policy decision.

#### GS-04 — “Missing context fails closed” does not distinguish unresolved context from a resolved-empty optional relationship

**Rubric clauses:** Rule is enforceable and prevents its stated divergence.
**Spine evidence:** `AD-2` says every protected flow evaluates all listed dimensions and that missing context fails closed (`ARCHITECTURE-SPINE.md:62-69`). The relationship convention only states that inactive relationships grant nothing (`:119-126`).

**Why this permits divergence:** for an action that needs no delegation or assignment, one resolver may return “none” and allow the base relationship, while another may treat the absent grant/assignment as missing context and deny the request. Conversely, a resolver failure can be silently normalized to an empty result, weakening fail-closed behavior.

**Disposition:** **Autofix.** Define the resolver contract: each applicable dimension must return `resolved(value|empty)` or `unresolved/error`; resolved-empty contributes no allow, while unresolved/ambiguous context denies. Require the policy to distinguish these states in tests and stable decision codes.

### Medium

#### GS-05 — Conflict-safe queue behavior is ambiguous against the visible-disabled UX contract

**Rubric clauses:** Rule is enforceable; covers source capabilities.
**Spine evidence:** `AD-7` says to “remove conflicted items from actionable queues while preserving an explanation” (`ARCHITECTURE-SPINE.md:102-107`).
**PRD evidence:** conflict-blocked actions must remain visible but disabled with a plain-language reason, and a user with overlapping roles must see the conflict without a role switch (`prd.md:625-633`, acceptance scenario at `:692-695`).

**Why this permits divergence:** “remove” can mean omit the item entirely, exclude it only from an actionable count, or move it to a non-actionable section. Only the latter two can reliably preserve an explanation.

**Disposition:** **Autofix.** State that conflicted items are excluded from actionable counts and enabled-action queues but remain visible in a non-actionable/blocked presentation with the backend denial code and reason.

#### GS-06 — The feature spine leaves its operational/environmental relationship entirely implicit

**Rubric clauses:** every dimension owned by the altitude is decided, deferred, or open; especially deployment/environments and operations.
**Evidence:** the feature spine has no inherited-invariants section and no operational or environment entry. The full architecture already fixes separate local/test/staging/production-like configuration and monitoring (`architecture.md`, Infrastructure & Deployment), but the spine only lists that document as a source (`ARCHITECTURE-SPINE.md:20-23`).

**Why this matters:** authorization policy, denial codes, audit behavior, background jobs, and capability projection must not vary by environment or deployable path. A source citation alone is not a binding inheritance statement.

**Disposition:** **Defer explicitly.** Add a terse inherited constraint that the feature introduces no authorization bypass or environment-specific policy variation and inherits the system deployment/monitoring envelope; leave infrastructure details in the full architecture.

## Good-Spine Checklist

| Checklist item | Result | Notes |
| --- | --- | --- |
| Fixes the real divergence points for the level below and misses none | **Partial** | Strong on role context, deny precedence, domain ownership, capability projection, and dependency ordering; gaps remain in brownfield migration, delegation origin/lifecycle, disclosure, and resolver semantics. |
| Every Rule is enforceable and prevents its stated divergence | **Partial** | `AD-1` is not currently true; `AD-2`, `AD-5`, and `AD-7` admit materially different implementations. |
| Nothing under Deferred could let two units diverge | **Fail** | The current default disclosure policy is not actually fixed outside Deferred. |
| Named technology is verified-current | **N/A** | The spine names no versioned technology. Path seeds were checked for brownfield fit instead and do not match current structure. |
| Ratifies rather than contradicts brownfield code | **Fail** | Current auth/session, Prisma, permission types, seed roles, and module paths conflict with the adopted target model. |
| Covers capabilities from the driving spec/PRD | **Partial** | Most bound FRs are represented, but delegation initiation/full non-delegable set and `AC-PERM-12` disclosure are incomplete. |
| Does not weaken an inherited parent spine | **N/A / unclear** | No parent spine is declared; the full architecture is merely listed as a source. |
| Every owned structural dimension is decided, deferred, or open | **Partial** | Operational/environmental inheritance is silent. |

## Positive Observations

- The named paradigm is concise and appropriate: one backend policy composes domain-owned facts, and all protected consumers use it.
- `AD-3`, `AD-4`, `AD-6`, and `AD-8` identify genuine cross-story divergence points and map them cleanly to affected areas.
- The lint-clean `Binds / Prevents / Rule` structure, capability map, and explicit Deferred section make the artifact easy to repair without expanding it into a full architecture document.

## Gate Recommendation

Do not treat the current `status: final` as implementation-ready. Resolve **GS-01** with an explicit migration/ratification decision, then apply the clear fixes for **GS-02** through **GS-05** and add the terse inherited operational constraint from **GS-06**. Re-run deterministic lint and the rubric gate afterward.
