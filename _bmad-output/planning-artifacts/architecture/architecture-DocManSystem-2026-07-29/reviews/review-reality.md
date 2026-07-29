# Reality and Technology-Freshness Review

**Target:** `ARCHITECTURE-SPINE.md`
**Lens:** Verify that committed decisions are grounded in current project
reality, an explicit source decision, or current external evidence rather than
being asserted from model knowledge. Check named technologies, versions, and
starter defaults when present.
**Review date:** 2026-07-29
**Verdict:** **CONDITIONAL PASS**

The spine does not bind a new library, framework, version, vendor, or starter
default. Its feature-level decisions are traceable to the current PRD, the
user-supplied scientist-permission policy, and the inherited modular-monolith
architecture. Therefore no web-current technology claim needs validation in
this artifact. The remaining reality problem is presentation: `[ADOPTED]`,
`status: final`, and the unqualified Structural Seed can be read as saying the
rules and paths already exist, while the current codebase implements only a
proposal-specific subset and still contradicts the target account-role model.

## What Was Checked

- The three sources declared in the spine exist and contain the stated product
  and architecture decisions.
- The current repository structure, Prisma schema, authentication types/store,
  shared permission package, proposal participation policy, reviewer
  assignment policy, and dependency manifest were inspected.
- Every AD and convention was classified as:
  - inherited and observed in the current project;
  - adopted from an explicit current planning source but not yet implemented;
  - partially implemented; or
  - unsupported by current code.
- Technology freshness was scoped to claims actually made by this spine. The
  broader `architecture.md` technology stack was not silently re-bound because
  this update intentionally introduces no new technology decision.

## Decision Reality Matrix

| Item | Source / reality evidence | Classification | Review |
| --- | --- | --- | --- |
| Design paradigm | The active project context fixes a phase-1 modular monolith and explicit domain modules; the repository has one workspace with `apps/*` and `packages/*`. | Inherited and observed at repository level | Grounded. “Policy-enforced” is a target strengthening, not a fully implemented current state. |
| AD-1 Account Role Cardinality | PRD FR2 and the supplied permission document explicitly choose one system role plus record relationships. | Adopted product decision; contradicted by current implementation | Valid target, not current reality. The code still permits multiple active `UserRoleAssignment` rows and treats PI/reviewer/council-member as account roles. |
| AD-2 Complete Authorization Context | PRD FR6/FR6a–e and the supplied permission document define role, organization, participation, assignment, state, delegation, and conflict inputs. | Adopted product decision; partially implemented for proposals | Grounded as a requirement. Current generic policy evaluates only actor, `roles[]`, organization scope, and a small resource/action subset. |
| AD-3 Deny Precedence | PRD authorization rules and conflict scenarios explicitly require fail-closed conflict/state/scope precedence. | Adopted product decision; partially implemented for proposal conflict paths | Grounded. Proposal participation and reviewer/approval conflict code provides current evidence for part of the rule. |
| AD-4 Domain-Owned Relationships | The supplied permission document proposes distinct proposal/project/council/review relationships; the project context requires explicit domain modules. | Adopted product decision; partially implemented | Grounded. Proposal participation and review assignment are real; project, council, ethics, task, researcher-profile lifecycle ownership is still future work. |
| AD-5 Explicit Delegation | PRD FR6b and delegation requirements define approval, action scope, validity, revocation, audit, source-authority continuity, and non-delegable decisions/reviews. | Adopted product decision; not implemented | Grounded in an explicit current source, not model knowledge. No delegation model or module exists in the inspected code. |
| AD-6 Server Capability Contract | PRD FR6c and permission UX requirements define relationships, allowed/blocked actions, codes, and reasons. | Adopted product decision; not implemented as a shared contract | Grounded in an explicit source. The current shared permission result is only `{ allowed, reason }`; no common capability projection exists. |
| AD-7 Conflict-Safe Personal Work | PRD requires a personal work area and independently authorized entries; the source architecture defines the conflict-filtered read model. | Adopted product/architecture decision; not implemented | Grounded, but it is a target. The proposed personal-work module path is absent. |
| AD-8 Dependency Ordering | The source architecture explicitly orders identity/participation before conflict-sensitive and aggregate integrations. | Adopted delivery decision | Grounded and technology-neutral. |
| Consistency conventions | The PRD and architecture specify relationship lifecycle, stable denials, capability projection, backend mutation enforcement, and audit context. | Adopted target conventions; mixed implementation coverage | Grounded, but current proposal relationships do not yet consistently have status plus effective dates. |
| Structural Seed | `packages/permissions/` exists; the other three listed paths do not. Existing authorization code currently lives under `apps/api/src/permissions/` and proposal-specific seams. | Mostly proposed structure, not observed structure | Must be labelled as proposed or reconciled to the existing layout. |

## Findings

### HIGH-1 — The spine does not state the boundary between adopted target and implemented reality

**Evidence**

- The artifact is `status: final`, and all eight decisions are marked
  `[ADOPTED]`.
- AD-1 says each account has exactly one active system role
  (`ARCHITECTURE-SPINE.md:55-60`).
- Current `InternalUserRole` still contains `principal-investigator`,
  `reviewer`, and `council-member`, while `InternalUser` carries both a primary
  `role` and `roles[]` (`apps/api/src/auth/auth.types.ts:4-24`).
- The auth store accepts all active role assignments and returns them as
  `roles[]` (`apps/api/src/auth/auth.store.ts:121-160`).

**Why it matters**

A builder can reasonably interpret `[ADOPTED]` as “ratified by current code” or
“already enforced.” That would conceal a migration boundary and make subsequent
stories combine the old global-role model with the new record-scoped model.

**Recommended resolution**

Add a short reality-baseline statement to the spine:

> This spine is the adopted target contract for new and migrated authorization
> work. `[ADOPTED]` means accepted from the named planning sources, not already
> implemented. Current proposal authorization is partial; legacy global
> business-role and multi-role structures must be migrated or retired by the
> identity/participation foundation work.

This is a documentation fix, not a new architecture decision.

### HIGH-2 — AD-1 needs an explicit brownfield transition constraint

**Evidence**

- Prisma stores both `User.role` and an unconstrained one-to-many
  `UserRoleAssignment[]` (`apps/api/prisma/schema.prisma:9-24,73-84`).
- The unique constraint is only `(userId, roleId)`, so it does not enforce one
  active system role.
- The shared permission package defines PI, reviewer, and council member as
  global `UserRole` values and accepts `roles?: UserRole[]`
  (`packages/permissions/src/index.ts:1-7,33-40`).
- The new PRD and AD-1 intentionally require the opposite.

**Why it matters**

This is not merely “not implemented yet”; it is existing data and API shape
that directly conflicts with the adopted invariant. AD-8 says foundations come
first but does not tell builders what must be reconciled. Two stories could each
obey AD-1 prospectively while leaving different legacy authorities active.

**Recommended resolution**

Bind the foundation/migration story to:

1. define the four canonical account-level system-role constants;
2. remove business roles from authentication and generic permission types;
3. choose one source of truth between `User.role` and role-assignment rows;
4. migrate existing PI/reviewer/council-member accounts to the correct system
   role plus record relationships; and
5. enforce cardinality at both persistence and service boundaries.

If the exact migration mechanics are intentionally story-level, add this as a
reality constraint or Deferred item with the required completion condition,
without prescribing SQL in the spine.

### HIGH-3 — Structural Seed is presented as current shape although most paths are absent

**Evidence**

- The seed lists:
  - `apps/api/src/common/authorization/`
  - `apps/api/src/modules/delegations/`
  - `apps/api/src/modules/personal-work/`
  - `packages/permissions/`
- Only `packages/permissions/` currently exists.
- Current shared authorization code is under `apps/api/src/permissions/`, and
  current record-specific authorization seams are under
  `apps/api/src/proposals-shared/` and proposal services.
- The existing `packages/permissions/` contract does not contain the decision
  codes or capability shape required by AD-6.

**Why it matters**

An unqualified path list looks like a reality-checked repository map. A builder
may create a second authorization seam instead of migrating the existing one,
or assume the existing package already satisfies AD-6.

**Recommended resolution**

Rename the section to **Proposed Structural Seed** and add a one-line
reconciliation rule:

> Consolidate or migrate the existing `apps/api/src/permissions/`,
> `apps/api/src/proposals-shared/`, and `packages/permissions/` seams; do not
> create a parallel policy system.

Alternatively, choose paths that match the current repository convention after
an explicit implementation-layout decision.

### MEDIUM-1 — Source adoption is proven, but institutional policy approval is not identified

**Evidence**

- The supplied permission document frequently uses recommendation language
  (“nên”), while the PRD and spine convert the recommendations into mandatory
  rules.
- The conversion is traceable and consistent, but the spine does not identify
  whether the source is an approved institutional policy, a product-owner
  decision, or a design proposal.

**Why it matters**

Non-delegable actions, reviewer disclosure, and separation-of-duty rules are
governance decisions. They do not need web research, but they may need an
institutional approver before implementation is treated as policy-complete.

**Recommended resolution**

If the user-supplied file is the product owner's accepted decision, record that
fact in the decision log or source metadata. Otherwise mark those governance
rules as requiring Academy policy-owner confirmation before production/UAT
sign-off. Do not replace them with generic industry assumptions.

## Technology and Starter Check

**Result: PASS / not applicable to new decisions.**

- The spine names no framework, library, vendor, version, starter command, or
  starter default.
- “Policy-enforced modular monolith,” API DTOs, web UI, and application services
  are architecture concepts, not version-sensitive product claims.
- The repository manifest confirms the inherited TypeScript web/API workspace
  exists, but those package versions are deliberately not rebound by this
  feature-level spine.
- The source `architecture.md` contains broader versioned stack statements,
  including a frontend version that may drift from the current manifest. That
  source-level issue does not enter this spine because no Next.js or starter
  decision is repeated here. If the broader architecture is separately
  finalized, it should receive its own version/currentness review.

No internet lookup is needed to validate this spine as written. Adding a
technology or starter decision later would reopen this gate and require live
official-source verification.

## Initial Gate Recommendation — Superseded by Re-review Below

Do not reject the authorization direction: all eight ADs are traceable to
current explicit inputs and none appears invented from training data. Before
handoff, apply the three clarity/reconciliation fixes above so the artifact
cannot be mistaken for an already-implemented architecture. Record whether the
scientist-permission file is an approved product-policy decision or still
requires institutional governance confirmation.

## Re-review After Remediation — 2026-07-29

**Verdict:** **PASS — no remaining blocker in the requested reality-check
scope.**

- **Target versus current boundary: resolved.** The spine now states that it is
  the adopted target contract, defines `[ADOPTED]` as source acceptance rather
  than implementation status, and names the current multi-role/global-role and
  proposal-seam reality (`ARCHITECTURE-SPINE.md:30-36`). The full architecture
  carries the same baseline.
- **Brownfield migration: resolved.** AD-12 binds Prisma role data, seeds,
  auth/session DTOs, permission types, navigation, existing seams, and dependent
  stories. It requires one system-role source of truth, legacy account
  migration, persistence/service cardinality enforcement, and seam
  consolidation before dependent work
  (`ARCHITECTURE-SPINE.md:171-181`). The full architecture also places this work
  in the implementation sequence.
- **Structural seed: resolved.** The section is explicitly titled **Proposed
  Structural Seed** and requires existing `apps/api/src/permissions/`,
  `apps/api/src/proposals-shared/`, and `packages/permissions/` seams to be
  consolidated or migrated rather than duplicated
  (`ARCHITECTURE-SPINE.md:216-228`). The broader target tree carries the same
  warning.
- **Policy provenance: resolved for planning, correctly gated for
  production/UAT.** The scientist-permission file is explicitly treated as the
  product owner's accepted planning policy, while institutional governance
  approval remains a production/UAT sign-off item
  (`ARCHITECTURE-SPINE.md:250-259`). Widening restricted-review disclosure
  requires a future institution-approved, versioned policy.

**Remaining blockers:** None for architecture handoff under this lens.
Institutional governance approval remains an intentional production/UAT gate,
not an unresolved architecture-source assertion.
