# Finalized authorization delivery — 2026-09-21

## Implemented model

The existing operational proposal features now distinguish these seven account roles:
`SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF`,
`LEADERSHIP_APPROVAL_AUTHORITY`, `RESEARCH_OVERSIGHT_AUTHORITY`,
`RESEARCHER_INTERNAL_USER`, `EXTERNAL_RESEARCHER_USER`.

- Head: explicit-scope visibility, officer assignment/reassignment/revocation, officer workload filter, operational progress, Staff summaries and eligible completed-package submission; no final decisions.
- Staff: proposal management requires an effective primary officer assignment and explicit scope. Participation/review access never confers management actions.
- Director: explicit leadership-scope oversight and eligible, conflict-free final decisions after completed review/consolidation. Protected decision packages require routing to leadership.
- Deputy: internal researcher eligibility plus explicit institutional read-only oversight. No role-derived management or final decisions. PI/member/reviewer relationships are evaluated independently.
- Review identities, raw scores, comments and internal summaries are omitted from Deputy/Director operational progress. Head receives a Staff summary only without conflict; raw individual reviews remain restricted.
- Assignment and protected mutation paths recheck current actor, scope, conflicts, workflow and context version. Retained review activity remains a conflict after revocation. Participant updates reject current officers and conflicting reviewers.

## Persistence and seed

Migration: `apps/api/prisma/migrations/20260921000000_proposal_management_officers/migration.sql`.
It expands the users role CHECK and adds `proposal_management_officers`, foreign keys,
status/interval constraints and a partial unique index allowing one ACTIVE primary officer
per proposal. Reassignment ends the previous row; revocation retains it. Actor/reason/time
and context are retained in assignment history and transactional audit.
`PROPOSAL_MANAGEMENT_OFFICER` is persisted. `PROJECT_MANAGEMENT_OFFICER` is a shared
contract only because the approved scope excludes a new project backend.
Existing proposals are not automatically assigned.

| Demo username | System role |
| --- | --- |
| nmphuong | SCIENTIFIC_MANAGEMENT_HEAD |
| hdtien1, hdtien2 | SCIENTIFIC_MANAGEMENT_STAFF |
| tvtien | LEADERSHIP_APPROVAL_AUTHORITY |
| vndinh | RESEARCH_OVERSIGHT_AUTHORITY |

`vndinh` is Thiếu tướng PGS. TS. Vũ Nhất Định, linked to an INTERNAL researcher profile.
The seed uses the existing local/demo-only credential policy; see `auth-seed-users.md`.
Institutional demo scopes are explicit grants, not inferred organization hierarchy.

## Verification evidence

- Prisma formatting, validation and generation completed; latest validation passed.
- New migration deployed locally; 23 migrations, database up to date.
- Seed completed; role mappings, Deputy profile linkage and explicit scopes verified.
- All five listed accounts authenticated on a temporary API. Both unassigned Staff accounts saw zero proposals; Head, Director and Deputy saw the existing scoped proposal.
- Deputy operational progress omitted identities/raw scores/pending reviewer identities/internal summary; review roster and decision-package endpoints returned 403.
- Eight assertions exercised officer assignment, stale-context denial, reassignment, revoked visibility, single active row, retained history and audit in a transaction; all writes were rolled back.
- `npm run typecheck` and `npm run build` passed (API and production web build, 23 routes).
- Existing `tests/authorization-v1.test.mjs`: 15 passed, 2 failed. Existing fixtures omit newly required review/officer context and expect the previous denial reasons. No tests were added or modified.
- Existing system-role migration integration check passed against a disposable database schema.
- Compiled DTO/capability checks passed for context-only Head package submission and denial of Deputy management/decision capabilities, including when the Deputy participates.
- Final review fixed expired-duty conflict handling and standalone history redaction; compiled assertions for expired/unexpired duties and retained review evidence passed.
- `git diff --check` passed; test files are unchanged.
- No full browser acceptance run or complete test-suite pass is claimed. Final workflow acceptance remains for the user.

## Coverage limits

The implementation is coherent for the existing proposal/intake/profile/file/evaluation
surfaces. Approved projects, council-establishment/ethics lifecycles, institutional
reporting/export/search/notification backends remain requirements where no source domain
exists. Dashboard figures are explicitly marked illustrative. Funding remains existing
proposal budget metadata; no expenditure, payments, ledger or accounting subsystem was added.
Canonical baseline, permission matrix, requirements, UX flows, architecture/contracts and
Epic 1/4/5/6/10/11/12 artifacts were reconciled; historical verification records remain historical.

## Changed files

- `.stitch/PRODUCT.md`
- `.stitch/flows/proposal-flow.md`
- `CONTEXT.md`
- `README.md`
- `_bmad-output/architecture.md`
- `_bmad-output/epics.md`
- `_bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md`
- `_bmad-output/implementation-artifacts/epic-01-system-access-and-permissions/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-04-proposal-intake-and-submission/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md`
- `_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-06-approved-project-tracking/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-10-councils-and-ethics/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-11-notifications-and-my-work/sprint-plan.md`
- `_bmad-output/implementation-artifacts/epic-12-dashboard-search-and-reports/sprint-plan.md`
- `_bmad-output/implementation-artifacts/spec-finalized-management-and-leadership-authorization.md`
- `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`
- `_bmad-output/planning-artifacts/mvp-sprint-plan-2026-09-02.md`
- `_bmad-output/prd.md`
- `_bmad-output/project-context.md`
- `apps/api/prisma/migrations/20260921000000_proposal_management_officers/migration.sql`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.mjs`
- `apps/api/src/admin/admin-users.service.ts`
- `apps/api/src/modules/files/files.service.ts`
- `apps/api/src/permissions/proposal-capability-v1.ts`
- `apps/api/src/proposal-evaluations/proposal-decisions.service.ts`
- `apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts`
- `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts`
- `apps/api/src/proposal-evaluations/proposal-evaluations.controller.ts`
- `apps/api/src/proposal-evaluations/proposal-evaluations.dto.ts`
- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts`
- `apps/api/src/proposal-evaluations/proposal-reviews.service.ts`
- `apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts`
- `apps/api/src/proposals-shared/proposal-access.ts`
- `apps/api/src/proposals-shared/proposal-management-officer.service.ts`
- `apps/api/src/proposals-shared/proposal-review-access.service.ts`
- `apps/api/src/proposals-shared/proposal-review-access.ts`
- `apps/api/src/research-proposals/research-proposals.controller.ts`
- `apps/api/src/research-proposals/research-proposals.dto.ts`
- `apps/api/src/research-proposals/research-proposals.module.ts`
- `apps/api/src/research-proposals/research-proposals.service.ts`
- `apps/api/src/researcher-profiles/researcher-profile-access.ts`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/research-proposals/proposal-decision-panel.tsx`
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`
- `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx`
- `apps/web/src/components/research-proposals/proposal-management-officer-panel.tsx`
- `apps/web/src/components/research-proposals/research-proposals-panel.tsx`
- `apps/web/src/fixtures/shell-context.ts`
- `apps/web/src/fixtures/showcase-data.ts`
- `apps/web/src/lib/proposal-evaluations-api.ts`
- `apps/web/src/lib/research-proposals-api.ts`
- `apps/web/src/lib/session.ts`
- `docs/authorization-core-business-baseline.md`
- `docs/contracts/researcher-profile-access.md`
- `docs/development/auth-seed-users.md`
- `docs/diagrams/authorization.md`
- `docs/permission-matrix.md`
- `docs/scientific-management-authorization-update-2026-09-21.md`
- `docs/user-flows.md`
- `docs/ux-design-guidelines.md`
- `docs/ux-ui-spec.md`
- `packages/permissions/src/index.js`
- `packages/permissions/src/index.ts`
- `packages/permissions/src/system-roles.d.ts`
- `packages/permissions/src/system-roles.js`
- `requirements.md`

Unrelated `skills-lock.json` is preserved.
