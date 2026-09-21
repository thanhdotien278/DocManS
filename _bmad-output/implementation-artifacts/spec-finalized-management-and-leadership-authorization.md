---
title: 'Finalized Scientific Management and Leadership Authorization'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'fc30696223e78ff36e1434a531fd955365b069c6'
review_loop_iteration: 0
context:
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/authorization-core-business-baseline.md'
  - '{project-root}/docs/permission-matrix.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Runtime roles still omit Scientific Management Head and Research Oversight Authority. Staff currently receives scope-wide proposal access, although current documentation requires an active record-level management assignment. Leadership oversight, final decisions and researcher participation need independent authorization reasons.

**Approach:** Reconcile canonical policy with the finalized seven-role model, then update shared contracts, persistence, assignment lifecycle, backend enforcement, capability-driven frontend and local demo identities together. Preserve existing architecture and disclosure boundaries.

## Boundaries & Constraints

**Always:** One active system role; explicit organization scopes; independently evaluated relationships; current workflow/conflict/disclosure checks; backend authority; transactional history and audit; one active primary officer per record. Head assigns/reassigns/revokes responsibility and has management oversight, never final approval. Staff administrative actions require their effective officer assignment. Director has oversight plus eligible final decisions. Deputy Director has internal-researcher eligibility plus read-only institutional oversight, never role-derived management or final decisions.

**Never:** Convert PI/reviewer/council/task responsibilities into account roles; inherit scope from organization hierarchy; automatically assign existing records to preserve broad Staff access; expose confidential reviews through oversight; rewrite historical migrations; build accounting/payments; refactor unrelated modules. Do not create or modify test files, per the user's latest instruction. Preserve unrelated `skills-lock.json`.

**Approved scope decision (2026-09-21):** User chose option 1. Implement the model throughout existing operational features. Reconcile project/council/dashboard/search/reporting/notification contracts and design requirements, explicitly documenting absent backend capabilities. Do not create a project subsystem or orphan project assignments. `PROJECT_MANAGEMENT_OFFICER` remains a shared contract requirement until its owning domain exists. Existing proposal features must work end-to-end, including Head officer controls, staff assignment restrictions and Deputy participation. Existing independent intake/profile management remains available to Head as Scientific Management; do not conflate this with proposal actions. Head may review existing staff summaries and submit eligible completed packages to leadership; routine reviewer assignment/consolidation remains assigned Staff work. Existing unassigned records remain unassigned for Head to allocate. Institutional demo oversight uses explicit organization grants. Funding monitoring uses only existing proposal budget metadata; approved/used/remaining project funding is unavailable.

## I/O & Edge-Case Matrix

| Given | When | Then |
| --- | --- | --- |
| Scoped Head | Reading records or changing officers | All managed-scope records visible; assignment actions require current scope, state and conflict checks |
| Staff with active officer assignment | Managing that record | Existing management actions allowed only within scope and workflow |
| Staff with participation/review only | Reading or acting | Only independent relationship capabilities; no administrative grant |
| Director without conflict | Deciding eligible package | Final approval/rejection allowed only after mandatory review stages |
| Director participating/reviewing | Attempting final decision | Deny |
| Deputy Director | Reading unrelated scoped records | Oversight read only; omit protected reviewer details |
| Deputy Director as PI/member | Performing researcher actions | Apply the relationship's capabilities independently of oversight |
| Competing officer assignments | Creating/reassigning | At most one active primary officer; retained previous rows and atomic audit |
| Missing or ambiguous authority/conflict | Protected action | Fail closed |

</frozen-after-approval>

## Code Map

- `packages/permissions/src/{system-roles.js,system-roles.d.ts,index.ts,index.js}` — canonical runtime/types, actions, relationship vocabulary and policy evaluation; keep runtime/type definitions synchronized.
- `apps/api/src/proposals-shared/{proposal-access.ts,proposal-participation.ts,proposal-review-access.ts,proposal-review-access.service.ts,proposal-mutation.ts}` — record visibility, conflicts, source relationships, disclosure and serialized mutation context.
- `apps/api/src/permissions/{authorization-v1.service.ts,proposal-capability-v1.ts}` — authorization context and UI capability projection; currently contains direct Staff/Internal Researcher checks.
- `apps/api/src/research-proposals/research-proposals.service.ts` and `research-proposals.controller.ts` — list/detail, content/files/history and operational actions; reuse current routes and mutation guards.
- `apps/api/src/proposal-evaluations/` — assignment, reviews, consolidation and final decisions; apply officer checks at every management boundary without broadening disclosure.
- `apps/api/prisma/schema.prisma`, `migrations/`, `seed.mjs` — string-valued system roles, proposal relationships and demo seed; no project aggregate exists.
- `apps/web/src/lib/{session.ts,navigation.ts,research-proposals-api.ts}` and `components/research-proposals/` — labels, navigation and capability consumers.
- `apps/web/src/app/dashboard/page.tsx` — currently hardcodes a Director showcase fixture; not an authenticated operational dashboard.
- `docs/development/auth-seed-users.md` — local/demo identity documentation.

## Tasks & Acceptance

**Execution:**
- [x] Reconcile `requirements.md`, `README.md`, `CONTEXT.md`, `docs/authorization-core-business-baseline.md`, `docs/permission-matrix.md`, `docs/user-flows.md`, UX documents and `AUTHORIZATION-CONTRACTS.md`; replace obsolete decisions, not merely append amendments.
- [x] Reconcile `_bmad-output/{prd.md,epics.md,project-context.md,architecture.md}` and affected Epic 1/4/5/6/10/11/12 planning artifacts, including duplicate role lists and diagrams. Distinguish requirements from implemented coverage.
- [x] Update shared role/action/relationship contracts and directly affected account/profile eligibility, UI labels and navigation.
- [x] Add proposal officer persistence and a new migration with foreign keys, lifecycle history and database enforcement of one active primary officer. Project persistence is out of this approved scope; update its shared contract only.
- [x] Add capability-guarded officer assignment/reassignment/revocation and UI controls; preserve actor/effective interval/reason/audit and context versions atomically. Check conflicts in both assignment and participant changes.
- [x] Apply the same access predicate and disclosure to every implemented record-derived surface; expose explicit access reasons. Preserve separate researcher, review, management and decision capabilities.
- [x] Update `seed.mjs`: `nmphuong` Head; `hdtien1`/`hdtien2` Staff; `tvtien` Director; `vndinh` Deputy Director with linked internal profile, explicit institutional scopes and existing demo-only credential policy. Never silently reassign existing operational records.

**Acceptance Criteria:**
- Given all seven roles, when authentication and capability resolution run, then each role is recognized and grants only its defined authority.
- Given officer revocation, when any protected record surface is requested, then management access ends while independent legitimate relationships remain effective.
- Given oversight access, when review data is serialized, then identities/raw scores/confidential comments remain governed by existing disclosure policy.
- Given completed delivery, when documentation and runtime coverage are compared, then no fixture or backlog feature is represented as implemented authorization.

## Implementation Notes

Investigation baseline: `fc30696223e78ff36e1434a531fd955365b069c6`. Working tree initially contained only unrelated untracked `skills-lock.json`. Existing Head documentation explicitly marks implementation pending. Current proposal funding consists of `budgetMetadata`; no actual-expenditure model was found. No runtime files or database state changed during investigation. User approved option 1; proceed with existing-feature implementation. Do not write or modify tests; use typecheck/build, existing checks where compatible, migration/seed validation and report remaining manual verification honestly.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Resolution/evidence |
| --- | --- | --- |
| Expired review rows without review evidence retain conflicts | medium | Patched conflict reads and officer candidate/assignment queries to exclude expired duties. Future duties still overlap an indefinite officer assignment; persisted reviews still block incompatible actions. |
| History route differs from reviewer detail redaction | medium | Patched history route to reuse the same history projection and remove actor identity for reviewer-only access. Review-submission identities remain suppressed for oversight by the shared serializer. |
| Officer lifecycle must deny all finalized statuses | false | No approved requirement reserves officer responsibility to open evaluation states. Changing administrative responsibility does not reopen a proposal or permit closed-state evaluation writes; existing workflow guards still apply to those actions. Inventing a terminal-state ban would exclude legitimate responsibility maintenance. |


## Verification

- Prisma format/validate/generate; inspect migration status before applying the new migration to local development data.
- Run the existing local seed and verify role mappings, profile linkage and `vndinh` authentication without logging credentials/tokens.
- `npm run typecheck` and relevant existing build/check commands; no test files added or modified. Report incompatible existing test expectations honestly rather than changing tests.
- `git diff --check`; inspect changed scope and reconcile active role enumerations.
- Final report must identify files, schema/migration, roles/relationships, demo mappings, enforced rules, updated docs, actual verification and remaining coverage limitations.

Verification results and coverage limits: `docs/development/finalized-authorization-delivery.md`. Final typecheck/API build and whitespace check passed after review patches. No test files changed.
