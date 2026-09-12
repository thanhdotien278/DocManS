---
title: 'Complete proposal intake through review'
type: 'feature'
created: '2026-09-11'
status: 'complete'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e534ad62503ca60cb1539d32f3a3f302e82bb6e9'
context:
  - '/Users/Super/DocManS/CONTEXT.md'
  - '/Users/Super/DocManS/docs/authorization-core-business-baseline.md'
  - '/Users/Super/DocManS/_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md'
  - '/Users/Super/DocManS/docs/ux-ui-spec.md'
---

<frozen-after-approval reason="user explicitly authorized end-to-end implementation">

## Intent

**Problem:** Existing intake, proposal and evaluation screens and APIs implement much of the flow but leave evidence preservation, mutation context checks and operational controls incomplete.

**Approach:** Complete the existing intake-to-review workflow using existing NestJS services, Prisma models, authorization helpers, Next.js panels and API clients. Implement intake management; proposal creation, editing, readiness validation, formal submission, completeness review, supplement requests and resubmission; reviewer or committee-member assignment and assigned evaluation. The user's direct instruction authorizes implementation of this complete scope.

## Boundaries & Constraints

**Always:** Follow source precedence: approved business baseline, authorization contracts, permission matrix, current architecture and UX. Backend authorization is record-scoped and fail-closed. Preserve submitted content and files, active relationship history, disclosure boundaries, conflict checks, exact approved proposal.submit delegation, UTC timing, atomic mutation and audit. Preserve current canonical states and existing reviewer/committee-member assignment representation. Resolve implementation detail by reading current callers.

**Never:** Write or modify tests (explicit user requirement overriding skill defaults). Do not add unrelated project, leadership decision, council administration or notification infrastructure. Do not add dependencies, refactor unrelated code, modify normative policy documents, deploy, push, or mutate live business data. Add schema migrations only for required persistent data and do not apply them to a live database. Existing tests may be run unchanged; report obsolete expectations rather than weakening security for test doubles.

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-intake-periods/` and matching web panel/API client already support CRUD/open/close; currently closed configuration remains editable, timestamps are reduced to dates, scope is raw single-unit ID, package row controls and backend capabilities need inspection.
- `apps/api/src/research-proposals/research-proposals.service.ts` holds create/update/readiness/submit/supplement/resubmit. Updates, membership replacement and audit are not one transaction; most operations lack token comparison. Submission events have no content snapshot. Resubmit lacks delegated input. Reuse membership conflict and context-version primitives.
- `apps/api/src/permissions/authorization-v1.service.ts`, `proposal-delegation-v1.ts`, `proposal-capability-v1.ts`, and `proposals-shared/` contain policy and concurrency helpers. Capability responses must match mutation-time checks.
- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts` implements reviewer and committee_member assignment/revocation/queue/package. It lacks scoped candidate search and transaction-time context/conflict/deadline checks. `proposal-reviews.service.ts` implements rubric evaluation; retain submitted locks.
- `apps/api/prisma/schema.prisma` has proposal, intake, submission-event, supplement, assignment and file records. Reuse these, adding immutable snapshot storage and completeness evidence with one scoped migration where necessary.
- `apps/api/src/modules/files/files.service.ts` governs proposal files; snapshot references must preserve access to submitted evidence and replacements must never overwrite binaries.
- `apps/web/src/components/research-proposals/` already has list, detail editor, evaluation panel and review form. Current detail editor only presents the first member. API helpers send tokens in some places but backend ignores most. Reuse controls and confirmations; no new design system.

## Tasks & Acceptance

**Execution:**
- [x] Intake service/DTO/controller, schema if needed, matching web client/panel: complete validated scope and package editing, exact timestamps, closed-state guards, audited atomic changes and backend action availability. Honor explicit selected units and Academy-wide scope without inferring unit ancestry.
- [x] Proposal service/DTO/controller and shared capability helpers: enforce current context in transactions; atomically validate/write/audit; preserve submission snapshots and package/file evidence; implement completeness result and supplement due-date validation; support authorized resubmit after intake closure and exact delegated submission.
- [x] Assignment service/DTO/controller and review service: complete scoped active candidate search/preflight, assign/revoke including committee role, current account/profile and conflict checks, valid deadlines/effective dates, preserved history and correct queue/package disclosure. Reuse authorization primitives.
- [x] Web proposal/intake/evaluation API clients and panels: wire all implemented endpoints and context tokens, multi-member editing, completeness controls, candidate selection and assignment history, immutable revision history, clear readiness/errors/locked states, valid confirmations and duplicate-submit prevention.
- [x] Verify builds, Prisma schema and focused existing checks without changing tests. Review the final diff for scope, authorization, evidence and frontend/backend consistency.

**Acceptance Criteria:**
- Given authorized staff, when managing an intake, then valid scope/package/timestamps persist and closing blocks new submissions while submitted proposals continue processing.
- Given an eligible internal PI and open applicable intake, when creating/editing and validating a proposal, then readiness identifies missing fields/files and valid formal submission records immutable content and actor/time.
- Given submitted content, when authorized staff records completeness or requests supplements with a future deadline, then evidence/history are retained; PI edits a working revision and resubmits a new immutable version.
- Given an exact approved active delegation, when submitting or resubmitting, then all current authority, scope, state and context rules still apply.
- Given authorized unconflicted staff, when assigning an eligible active reviewer or committee member, then the assignment grants only that package; duplicates, inactive profiles, self-assignment, conflict, invalid dates and stale context deny without partial writes.
- Given assigned evaluation, when saving/submitting, then only the assignee can act and a submitted review locks; PI and unrelated users do not receive hidden review data.
- Given missing/stale context or unauthorized actors, when protected reads or writes occur, then backend denies safely and the UI shows corrective feedback without granting authority.

## Implementation Notes

Initial working tree clean; initial npm run typecheck passed. User explicitly requested complete implementation and no test edits; no extra approval gate is introduced.

## Spec Change Log

## Review Triage Log

## Verification

- `npm run typecheck` and `npm run build` passed for the final implementation. Prisma schema validation and generation passed; `git diff --check` passed.
- Applied all migrations to an isolated PostgreSQL database. Exercised intake creation/open/close; proposal create/edit/readiness/submit; supplement/edit/resubmit after intake closure; immutable versions and files; completeness confirmation; committee-member assignment; reviewer draft/submit locks; assignment revocation and immediate access removal.
- Exercised exact approved delegated submission and resubmission with disposable grants. Checked missing/stale context rejection, PI denial of reviewer rosters, and reviewer file disclosure. Verified transactional draft file upload, metadata update and deletion with refreshed context.
- Browser verification covered staff login, intake controls, proposal list/detail, catalog selection, immutable revision history, assignment status and history. Fixed the catalog authorization mismatch found during browser verification and the member-editor grid layout.
- Existing focused suites passed 83 checks before implementation. No tests were written or modified; no post-change suite pass is claimed. Runtime assertions used disposable records rather than changing test files.
- Removed the isolated database and object-storage bucket and stopped verification servers. The main database was not migrated. Apply the included migration through the normal deployment process.

## Review outcome

Reviewed changed paths for scope, disclosure and transaction consistency. Reused existing committee-member assignment representation; no separate council-management subsystem was added. No dependencies, unrelated features, commits or publication were introduced.
