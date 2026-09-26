---
title: 'Golden Flow 4 — Project Execution'
type: 'feature'
created: '2026-09-22'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: a7dc9c40e6a5e1148ee4d6a8fae635523daff37f
context:
  - '{project-root}/docs/contracts/project-execution.md'
  - '{project-root}/docs/authorization-core-business-baseline.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Make an approved proposal an explicitly confirmed research project whose PI submits
immutable progress evidence and assigned Staff monitors deadlines. Assigned Staff
reviews and finally decides normal adjustments; Head finally decides extensions
after Staff validation/preparation. Leadership only approved the source proposal.
Request lifecycles/actions are specified by the execution contract.

## Boundaries & Constraints

Complete canonical documentation first. Preserve seven system roles, `TOPIC_PI`
as the canonical project relationship, exact officer scope, separation of duties,
backend capabilities, immutable submitted revisions, transactional audit and derived
overdue flags. Reuse existing auth/files/audit/UI infrastructure. Never commit/push,
copy proposal officer authority, add arbitrary status setters or implement acceptance,
councils, final review, financial systems or a notification framework.

## I/O & Edge-Case Matrix

| Scenario | Input / state | Expected behavior | Error handling |
| --- | --- | --- | --- |
| Create | Approved proposal/version and authorized actor | One preparing project, independent relationships, immutable source link | Reject duplicate/stale/unapproved source |
| Report | Active PI and ready draft | Submitted immutable revision/evidence | Reject non-PI, inactive actor, closed checkpoint |
| Return | Assigned Staff reviewing report | Reason/deadline; new PI revision on correction | Never overwrite submitted content |
| Request | Active PI, before/proposed change | Separate submitted extension/adjustment | No direct approved-field edits |
| Adjustment decision | Staff-reviewed request | Assigned scoped Staff approves/rejects | Deny Head/Leadership/nonofficer/self/conflict/stale/duplicate |
| Extension decision | Staff-prepared extension | Scoped Head approves/rejects | Deny Staff/Leadership/unprepared/self/conflict/stale/duplicate |
| Extension bypass | Adjustment increases end date | Reject; use extension workflow | No project changes |
| Apply | Approved extension/adjustment | Atomic decision, plan change and audit | Rejection leaves plan unchanged |
| Monitor | Past deadline | Authorized overdue flag/filter | No project state transition |

Creation decision (user, 2026-09-22): current scoped proposal officer creates the
preparing project; Head independently assigns its officer; assigned scoped project
Staff confirms setup. Creation grants no automatic project officer relationship.
User correction: controlled scope/plan/milestone/membership adjustments are finally decided by assigned Staff. End-date increase is exclusively
an extension, finally decided by Head after Staff preparation. Leadership has no
execution-change decision. Submitted request revisions and before/proposed values
are immutable; stale approved baselines require new review/preparation.

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma`: proposal snapshots/decisions and generic AuditLog;
  no project models/enums exist. `apps/api/prisma/seed.mjs` has all seven demo roles.
- `apps/api/src/proposals-shared/proposal-mutation.ts`: reuse transaction/actor/lock
  pattern, not proposal-specific target resolution.
- `apps/api/src/permissions/proposal-capability-v1.ts`, `packages/permissions/src/index.ts`:
  existing capability contract/registry; no project actions yet.
- `apps/api/src/modules/files/files.service.ts`, `files.dto.ts`, `files.module.ts`:
  shared MinIO/file versions, currently proposal-only; extend authorization and locks.
- `apps/api/src/auth/audit-log.service.ts`: reuse transactional audit fields.
- `apps/api/src/notifications/mail.service.ts`: activation email only, no workflow reminders.
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`,
  `apps/web/src/lib/research-proposals-api.ts`: reuse capability/UI/error patterns.

## Tasks & Acceptance

**Execution:**
- [x] Canonical documents and `docs/contracts/project-execution.md`: settle questions,
  reconcile related contradictions and complete the documentation gate.
- [x] `apps/api/prisma/schema.prisma`, scoped migration: add project/members/officers,
  milestones/checkpoints, report/request revisions and decision/evidence links;
  enforce uniqueness, immutable submissions and atomic controlled decisions.
- [x] `apps/api/src/approved-projects/`, `apps/api/src/app.module.ts`: implement named
  setup, relationship, report, monitoring, adjustment Staff review/decision and
  extension Staff preparation/Head decision actions.
- [x] `packages/permissions/src/index.ts`, `apps/api/src/permissions/`: register exact
  project capabilities and resolve current scope/relationship/state/conflict versions.
- [x] `apps/api/src/modules/files/`: extend existing association authorization for
  project evidence, preserving pinned versions on every generic mutation route.
- [x] `apps/web/src/app/projects/`, `apps/web/src/app/my-projects/`,
  `apps/web/src/components/projects/`, `apps/web/src/lib/projects-api.ts`:
  implement responsive execution/monitoring/adjustment review/extension decision workspaces.
- [x] `apps/api/prisma/seed.mjs`: approved source, executing project, milestones,
  upcoming/overdue checkpoint, draft/submitted reports, pending requests and actors.
- [x] `tests/project-execution-capability.test.mjs`, focused database/browser checks: cover all
  twenty requested scenarios with corrected Staff adjustment and Head extension
  decision actors, plus Leadership denial and capability allow/block responses.

**Acceptance Criteria:**
- Given an approved source, when authorized creation/confirmation runs, then source
  version/decision remain traceable and project grants are independent.
- Given a submitted revision, when PI corrects after return, then old content and
  evidence remain unchanged and a new revision enters review.
- Given current Staff assignment/scope, when monitoring runs, then only authorized
  records/counts/evidence appear and overdue never changes project state.
- Given Staff review of adjustment or preparation of extension, when assigned Staff
  decides adjustment or scoped Head decides extension, then approval atomically
  applies the change; all other actors, bypasses and duplicate decisions are denied.
- Given inactive accounts, expired grants or conflicts, when any protected action
  runs, then backend denial overrides cached UI capabilities.
- Given seeded scenarios, when the end-to-end flow runs, then capability-driven UI,
  immutable revisions and audit can be demonstrated with required checks passing.

## Implementation Notes

Authority questions resolved by user. Documentation gate completed; user explicitly
authorized implementation after reconciliation.
Baseline typecheck passed; full suite: 119 pass, 55 fail, 1 skip of 175; existing failures
logged at /tmp/docmans-gf4-baseline-tests.log. Local database: 24 migrations current.

## Spec Change Log

## Review Triage Log

## Verification

- `git diff --check` and local Markdown link/contradiction checks for documentation.
- `npx prisma validate --schema apps/api/prisma/schema.prisma`, migration validation
  against a disposable database, then authorized local migration/seed.
- `npm run prisma:seed`, `npm run typecheck`, `npm run build:api`.
- `node --test tests/project-execution-capability.test.mjs`, relevant regression/integration and
  existing frontend checks, `npm test`, `npm run build`.
- Browser demonstration: PI report → Staff; PI adjustment → Staff decision; PI
  extension → Staff preparation → Head decision; Leadership and other denied paths.
