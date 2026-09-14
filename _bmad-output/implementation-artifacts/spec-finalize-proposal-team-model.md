---
title: 'Finalize proposal and topic team model'
type: 'refactor'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '25c604894ab85e3be605e43ab2a47c54db17f9b5'
context:
  - '/Users/Super/DocManS/CONTEXT.md'
  - '/Users/Super/DocManS/docs/authorization-core-business-baseline.md'
  - '/Users/Super/DocManS/_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** DocManS currently permits exact-record delegated proposal submission and represents proposal/topic participation with conflicting PI, co-investigator, member, and secretary role families across persistence, APIs, UI, contracts, trackers, and active source documents.

**Approach:** Make the proposal owner the one immutable PI, require that PI to be an active `RESEARCHER_INTERNAL_USER` for creation and every submission/resubmission, restrict team rows to `TOPIC_SECRETARY` and `TOPIC_MEMBER` with at most one active secretary, remove proposal-submission delegation, and align all non-archived authoritative documents and design sources.

## Boundaries & Constraints

**Always:** Preserve backend-authoritative, record-scoped, fail-closed authorization; preserve submitted versions, audit, relationship lifecycle, organization scope, conflict rules, and unrelated assignment roles. Use `PROPOSAL_PI` for the proposal owner, `TOPIC_PI` for the approved-topic owner, and only `TOPIC_SECRETARY`/`TOPIC_MEMBER` for team rows. Migrate current active data safely: end redundant PI-as-member rows, normalize secretary/member/co-investigator rows to the two team roles, and enforce the secretary cardinality at service and database boundaries.

**Never:** Permit a non-PI, external researcher, secretary, member, staff user, or delegate to create, submit, or resubmit a proposal. Do not add features, dependencies, tests, global roles, generic team abstractions, or edit archived/historical migrations, completed implementation evidence, review reports, or existing tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | Active internal researcher in an applicable intake | Proposal is created with actor as its sole PI; team contains only secretary/member rows | Other roles or invalid team codes are rejected with no write |
| Team update | Zero or more members and zero/one secretary | Active team is saved with canonical codes and lifecycle history | More than one secretary, PI/co-PI, or unknown role is rejected atomically |
| Submit/resubmit | Current internal PI, valid state/readiness/context | Immutable submission event records the PI as actor | Any non-PI or delegation input is denied/invalid and causes no mutation |
| Legacy data | Existing proposal roles/delegations | Active team data is normalized and obsolete delegation storage is removed by migration | Migration stops on unresolved multiple-secretary data rather than choosing silently |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma`, new story-scoped migration -- remove `ProposalDelegation`, normalize active team roles, and add database role/cardinality enforcement; keep generic context-token compatibility unless no caller requires it.
- `packages/permissions/src/index.ts` and `index.js` -- synchronize canonical relationship types and remove proposal-submit delegation action/grant exports that have no remaining caller.
- `apps/api/src/app.module.ts`, `apps/api/src/delegations/`, `apps/api/src/permissions/proposal-delegation-v1.ts` -- remove the proposal delegation feature and module wiring.
- `apps/api/src/proposals-shared/` and `apps/api/src/research-proposals/` -- centralize strict team-role parsing, owner-derived PI participation, one-secretary validation, and PI-only submit/resubmit; remove delegated DTO/service response paths.
- `apps/web/src/lib/research-proposals-api.ts` and proposal components -- send/display only canonical team roles, show PI separately as the creator/owner, and stop sending or consuming delegation IDs.
- `CONTEXT.md`, `requirements.md`, `phan-quyen-trong-de-tai-khoa-hoc.md`, `docs/`, `_bmad-output/{prd.md,epics.md,architecture.md}`, active architecture/planning/tracker artifacts, and `.stitch/` proposal sources -- replace contradictory role/delegation rules while leaving explicitly historical/archive/review evidence unchanged.

## Tasks & Acceptance

**Execution:**
- [x] Update persistence and shared executable contracts, including a reversible source-controlled migration for current data and removal of live proposal delegation endpoints.
- [x] Update API authorization, DTO validation, response projection, readiness, and proposal/team lifecycle logic around the existing owner/member seams.
- [x] Update web proposal creation/detail/team/submission surfaces and shared API types without introducing a new UI subsystem.
- [x] Update every affected active normative, architecture, PRD, epic/story/tracker, user-flow, UX, diagram, and Stitch source; archive the superseded active delegation story and remove it from active tracking.

**Acceptance Criteria:**
- Given any proposal, when its authority and team are resolved, then exactly one PI is derived from `ownerId`, the PI is not a team row, and active team rows contain at most one `TOPIC_SECRETARY` plus any number of `TOPIC_MEMBER` rows.
- Given creation, submission, or resubmission, when the actor is not the current internal PI, then the backend denies before mutation and no delegated path or capability widens access.
- Given active source documents and executable registries are searched, when obsolete proposal/project member families and proposal-submit delegation are queried, then remaining matches are limited to intentional historical/archive/test/migration evidence.

## Implementation Notes

- Proposal ownership now supplies the sole PI; persisted team rows accept only `TOPIC_SECRETARY` and `TOPIC_MEMBER`, with one active secretary enforced in the service and database.
- Proposal delegation endpoints, storage, capability widening, DTO inputs, and UI use were removed. Generic delegation language remains only for separately approved future domains.
- Active product, authorization, architecture, workflow, UX, tracker, and Stitch sources were aligned; historical migrations, archived artifacts, and completed review evidence were left unchanged.

## Spec Change Log

- 2026-09-14: Implemented and reviewed the finalized proposal/team model; archived the superseded proposal-delegation story.

## Review Triage Log

| ID | Verdict | Route | Evidence |
|---|---|---|---|
| B1 | false | reject | Removing the obsolete proposal-delegation table is an explicit requirement; immutable proposal submission and audit records are stored separately and are not deleted by this migration. |
| B2 | medium | patch | The migration's `ELSE TOPIC_MEMBER` branch would silently coerce an unrecognized legacy value; add a fail-fast precheck for values outside the known PI, secretary, and member families. |
| B3 | high | patch | Secretary detection does not recognize `TOPIC_SECRETARY` or plain `secretary` when present only in `role`, so duplicate detection and normalization can miss them. |
| B4 | medium | patch | The unique index keys on `status = 'ACTIVE'`, while expired rows may still retain that status and block a valid secretary insert. |
| B5 | medium | patch | Ending a legacy PI row with `COALESCE` preserves a future `effective_until`, leaving it active after migration under interval-based resolution. |
| B6 | false | reject | Creation and submission enforce a live internal-researcher owner at runtime; rewriting or rejecting historical proposal owners is not required by the finalized team-role migration. |
| B7 | false | reject | The migration removes owner PI rows and the only live team writer rejects the owner; adding a cross-table trigger would duplicate the demonstrated write boundary. |
| B8 | medium | patch | Active UX text says members can edit proposal drafts, but the proposal service intentionally authorizes the internal PI owner only; align the text instead of widening authorization. |
| B9 | medium | patch | Active requirements say all members can upload proposal files, while the file service permits the internal PI or internal secretary only; align the documents to the executable rule. |
| B10 | high | patch | The direct proposal upload path checks participation but lacks the internal-researcher system-role guard used by the capability resolver, allowing an external secretary record to widen access. |
| B11 | medium | patch | Active documents grant the secretary completeness and supplement actions, but those transitions are staff-only in the workflow service; align the documents. |
| B12 | medium | patch | Active UX text includes the secretary as an intake viewer, while intake access is limited to staff and internal researchers; align the UX source. |
| B13 | high | patch | Active UX text says staff can create proposals, directly contradicting the finalized PI-only creation rule; change it to staff workflow management. |
| B14 | low | patch | Reviewer responses can omit owner identity, so the unconditional PI card renders blank; hide the card when neither owner field is available. |
| B15 | false | reject | The proposal UI does not consume approved-topic participation and therefore does not need a `TOPIC_PI` badge or response branch in this change. |
| B16 | false | reject | `PROJECT_*` participation codes were conflicting legacy names; planned project/topic models now use the canonical `TOPIC_*` vocabulary and no live code depends on the removed codes. |
| B17 | low | patch | The permission-matrix column still says `Project Member`, which exposes the obsolete vocabulary in an active source-of-truth document. |
| B18 | high | patch | Active tests import deleted delegation modules and assert removed role codes, so the repository's normal test command cannot verify the new model. |
| B19 | false | reject | Empty implementation-note sections and `in-review` status describe the workflow's current state and are completed by this review, not product defects. |
| V1 | high | patch | Verification found stale delegation tests and build output can mask deleted modules; remove obsolete tests and run the suite from a clean build output. |
| V2 | high | patch | Existing proposal authorization fixtures still use removed role codes, leaving the canonical two-role and PI-only boundaries without reliable regression coverage. |
| V3 | medium | patch | The existing migration integration test does not include the new migration, so its normalization and constraints are not exercised. |
| V4 | medium | patch | The status-only secretary index conflicts with expired rows that remain `ACTIVE`; normalize stale rows in migration and replacement logic before enforcing cardinality. |

## Verification

**Commands:**
- `npm run typecheck` -- passed.
- `npm run build` -- passed for production web and API builds.
- `npx prisma validate --schema apps/api/prisma/schema.prisma` -- passed.
- `node --test tests/authorization-v1.test.mjs tests/relationship-lifecycle-v1.test.mjs tests/smoke.test.mjs tests/proposal-capability-ui-source.test.mjs` -- passed, 33 tests.
- `node --test --test-name-pattern='normalizes only canonical|derives the PI only' tests/proposals-st30.test.mjs` -- passed, 2 tests.
- `node --test tests/system-role-migration.test.mjs` -- passed against local PostgreSQL after applying the new migration fixture.
- `git diff --check` and targeted `rg` audits over tracked non-historical code/docs -- passed; remaining legacy matches are table/entity names or completed historical evidence.
- `npm test` -- build and 109 tests passed; 48 existing proposal-harness/source-check tests still fail because their fake transaction client lacks current actor/catalog/context collaborators and one pre-existing upload-source assertion is stale. The focused model and migration checks above pass.
