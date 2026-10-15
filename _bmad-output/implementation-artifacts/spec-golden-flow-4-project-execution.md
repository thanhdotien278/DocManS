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

### Review Findings

Code review 2026-10-14, batch 1 (backend: commits e226d7d + 7d8d277). Layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor. Batch 2 (frontend) is pending.

- [x] [Review][Patch] (decided 2026-10-14: compare only the baseline values the request depends on — endDate for extension; touched scope/plan/milestones/members for adjustment) Unrelated aggregateVersion bumps stale open requests — `acceptReport` (checkpoint completion) bumps `aggregateVersion`, and `decideRequest` rejects any version drift (service.ts:634), so accepting a progress report blocks deciding an already reviewed or prepared request until a supplement round-trip. The contract only requires re-review when an *affected* baseline changes.
- [x] [Review][Patch] (decided 2026-10-14: API returns per-item allowedActions for each request and report; UI uses them instead of hard-coded status lists) Per-request/per-report capability is never computed — `loadAuthorized` (service.ts:105) passes no `request`/`report`, so `viewerAuthorization` grants e.g. `project.report.accept` and `project.*.withdraw` regardless of item status, and the UI re-implements status rules with hard-coded lists.
- [x] [Review][Patch] (decided 2026-10-14: migration adds report status 'superseded' + supersedes link; the old revision becomes superseded when its correction is created; a second edit of the old revision is denied) Answered supplement leaves the old report revision `supplement_requested` forever — `updateReportDraft` (service.ts:395) creates a new draft on every edit of the old revision, with no superseded status or link, so repeated edits create duplicate drafts and monitoring shows an open supplement.
- [x] [Review][Patch] Draft edits lack audit — `updateReportDraft` writes no AuditLog row; `editRequestDraft` writes neither projectHistory nor AuditLog [apps/api/src/approved-projects/approved-projects.service.ts:381]
- [x] [Review][Patch] Adjustment that reassigns a milestone and ends its old member in one request is rejected — the membership check reads the stale in-memory `project.milestones` [apps/api/src/approved-projects/approved-projects.service.ts:698]
- [x] [Review][Patch] Item due today is flagged overdue all day — the DATE (UTC midnight) is compared with `now` [apps/api/src/approved-projects/approved-projects.service.ts:148]
- [x] [Review][Patch] Overdue ignores submission — a checkpoint whose report was submitted on time stays overdue until accepted [apps/api/src/approved-projects/approved-projects.service.ts:146]
- [x] [Review][Patch] `approaching` is not gated by active status (finished projects with nearby or past deadlines) [apps/api/src/approved-projects/approved-projects.service.ts:149]
- [x] [Review][Patch] Setup can be confirmed with no milestones or checkpoints [apps/api/src/approved-projects/approved-projects.service.ts:241]
- [x] [Review][Patch] Checkpoint dueDate in setup is not bounded by project start/end (milestones are) [apps/api/src/approved-projects/approved-projects.service.ts:272]
- [x] [Review][Patch] Changing a draft's checkpoint keeps the old checkpoint's deadline [apps/api/src/approved-projects/approved-projects.service.ts:396]
- [x] [Review][Patch] An empty report (progressResults "") can be submitted and becomes immutable [apps/api/src/approved-projects/approved-projects.service.ts:403]
- [x] [Review][Patch] PI does not receive the return reason (`reviewReason` only for Staff/Head) [apps/api/src/approved-projects/approved-projects.service.ts:170]
- [x] [Review][Patch] Edited request draft keeps creation-time `currentValues` while refreshing its context version, so the audit "before" can be stale [apps/api/src/approved-projects/approved-projects.service.ts:534]
- [x] [Review][Patch] Approving an extension leaves `planSnapshot.endDate` stale [apps/api/src/approved-projects/approved-projects.service.ts:636]
- [x] [Review][Patch] `project.extension.request-supplement` is blocked without request context, so the UI never shows the extension supplement button [apps/api/src/approved-projects/project-capability-v1.ts:133]
- [x] [Review][Patch] `revokeOfficer` overwrites the assignment reason with the revoke reason [apps/api/src/approved-projects/approved-projects.service.ts:319]
- [x] [Review][Patch] Stale-draft submit message tells the PI to create a new request, which `REQUEST_ALREADY_OPEN` blocks; it should point to edit or withdraw [apps/api/src/approved-projects/approved-projects.service.ts:550]
- [ ] [Review][Patch] (partial 2026-10-14: 13 fake-Prisma service tests + 1 throwaway-schema PG migration test added; files-service project branches still untested) GF4 service flows and DB guarantees are untested. Missing service tests: create, report submit/accept, adjustment and extension approve/reject with side effects, conflict denials, paused withdraw, withdraw pipe. Missing real-PG tests (system-role-migration harness): GF4 migrations, triggers, the `withdrawn` CHECK. Missing files-service project branches [tests/]
- [x] [Review][Defer] Two active TOPIC_PI rows possible if a source snapshot member carries TOPIC_PI; no partial unique index [apps/api/src/approved-projects/approved-projects.service.ts:215] — deferred: maybe-false, would be medium; settle by checking whether proposal members can carry participationRole TOPIC_PI
- [x] [Review][Defer] `listProjects` has no pagination and deep-loads every candidate project about 3 times [apps/api/src/approved-projects/approved-projects.service.ts:110] — deferred: scale issue, not reachable at current data size
- [x] [Review][Defer] Supplement `responseDeadline` is stored but never enforced or surfaced as overdue [apps/api/src/approved-projects/approved-projects.service.ts:599] — deferred: needs a policy for late responses
- [x] [Review][Defer] PI actions depend on host-org scope, not only on active TOPIC_PI membership [apps/api/src/approved-projects/project-capability-v1.ts:69] — deferred: policy confirmation needed

Rejected:
- false — Expired ACTIVE officer row causes P2002 on reassign: no code path leaves an ACTIVE row with a past `effectiveUntil` (revoke → REVOKED, reassign → ENDED).
- low — Snapshot without title or member name gives a 500: submission readiness guarantees these fields; unlikely.
- low — Report review/accept on a non-executing project: no transition out of executing/paused exists in GF4.
- low — `POST :id/setup` has no pipe (string contextVersion, raw facts in audit): the web client sends an object; adding a pipe adds surface.
- low — Duplicate evidence ids rejected: the UI uses checkboxes, so duplicates cannot occur.
- low — DTO rejects a one-day report period and PATCH requires progressResults: an edge case; the UI always sends the field.
- low — `project_history.request_id` lacks an FK: the fix needs a migration and nothing writes bad ids.
- low — App clock for member `effectiveFrom`, and no active-unit check on an added member: negligible drift.
- low — Service typed as `any`: style; no named failing caller.
- low — Source link columns not DB-immutable: no update path exists.
- low — Seed has only one pending request: the demo covers adjustment via the UI/API flow.
- low — `downloadFile` canEdit now false for submitted proposal files: matches the attachment lock semantics.
- low — Capability ignores the evaluation conflict for Staff/Head: backend denial wins per AC5.

Code review 2026-10-14, batch 2 (frontend: GF4 web files, working tree vs e226d7d^, including the batch-1 D2 UI changes).

- [x] [Review][Patch] `/my-projects` is not personal: `mine` only skips proposals, and the same `listProjects()` returns every visible project. Filter to projects whose viewerRelationships include TOPIC_PI/TOPIC_MEMBER/TOPIC_SECRETARY [apps/web/src/components/projects/project-list.tsx:22]
- [x] [Review][Patch] "Tạo đề tài" is shown to anyone who can list approved proposals (Head, Leadership, unassigned Staff) and sends an undefined contextVersion. Gate it on the viewer being the active proposal management officer (from the proposal's viewerRelationships/capability) and guard a missing contextVersion [apps/web/src/components/projects/project-list.tsx:50]
- [x] [Review][Patch] Report correction ("Tạo bản sửa theo yêu cầu") spreads the new-draft form state, so the checkpoint and period are sent as "" and overwrite or reject the item's values. Default to the item's values [apps/web/src/components/projects/project-detail.tsx:109]
- [x] [Review][Patch] Adjustment correction sends `adjustmentValues()` from the shared create form (`{scope:{}}` when untouched), erasing or replacing the PI's proposal. Default to `item.proposedValues` unless the form was edited for that item [apps/web/src/components/projects/project-detail.tsx:115]
- [x] [Review][Patch] One global `evidenceIds` is shared by every report and request, so a file picked or uploaded for one item gets attached to another item's submit. Key the selection by target item [apps/web/src/components/projects/project-detail.tsx:105]
- [x] [Review][Patch] PI cannot edit an existing draft report: every "Lưu bản nháp báo cáo" POSTs a new revision. PATCH the PI's open draft (prefilled) when one exists [apps/web/src/components/projects/project-detail.tsx:106]
- [x] [Review][Patch] Officer revoke records the fixed default reason "Thu hồi phân công". Require a user-entered reason next to the revoke action [apps/web/src/components/projects/project-detail.tsx]
- [x] [Review][Patch] Consequential actions run without confirmation: setup save, start report/adjustment review, extension validate, extension prepare [apps/web/src/components/projects/project-detail.tsx]
- [x] [Review][Patch] Raw codes shown to users: project/report/request status, participationRole, history action, officer as user id. Map them to the Vietnamese business labels and the officer name [apps/web/src/components/projects/project-detail.tsx]
- [x] [Review][Patch] File inputs are not reset after upload and not disabled while busy, so the same file cannot be re-picked after a failure [apps/web/src/components/projects/project-detail.tsx]
- [x] [Review][Patch] Withdraw silently does nothing on an empty or cancelled reason; show a notice [apps/web/src/components/projects/project-detail.tsx]
- [x] [Review][Patch] "Báo cáo chung" sends `checkpointId: ""` instead of omitting it [apps/web/src/components/projects/project-detail.tsx:106]
- [x] [Review][Patch] PI per-item report `allowedActions` (draft → draft+submit; supplement_requested → draft) are not asserted; they alone show the PI's submit/correction buttons [tests/approved-project-service.test.mjs]
- [x] [Review][Defer] Staff/Head workspaces lack the contract's reporting calendar, unassigned/officer views and prepared-extension queue; `GET /projects/monitor` is unused [apps/web/src/components/projects/project-list.tsx] — deferred: UX scope beyond the review fixes
- [x] [Review][Defer] Setup form creates only one milestone+checkpoint [apps/web/src/components/projects/project-detail.tsx] — deferred: multi-milestone setup UI is a feature
- [x] [Review][Defer] No executed test for the UI action→route mapping (`requestAction`, `canItem`) [apps/web/src/components/projects/project-detail.tsx] — deferred: the repo has no component or e2e harness for apps/web

Rejected (batch 2):
- low — Item actions hidden rather than disabled with a reason: consistent with the rest of the page; per-item reasons are not in the payload.
- low — Upload success reported as failure if the follow-up list call throws: rare.
- low — Extension date may equal the current end date or be typed earlier: the backend rejects it with a clear message.
- low — Stale-response race on fast navigation; candidates effect deps: rare.
- low — Filters are client-side only, with limited status options: no reachable statuses missing.
- low — Member-id whitespace or stale id on mode switch: the backend rejects; rare.
- low — Inverted report period not blocked client-side: the backend rejects it with REPORT_PERIOD_INVALID.
- low — Past supplement deadline selectable: the backend rejects it with DEADLINE_INVALID.
- low — Invalid date crashing Intl: the API always returns ISO strings.
- low — No encodeURIComponent on ids: ids are UUIDs or seed ids.
- low — JSON `null` body; `URLSearchParams.size` on old browsers; object summary rendered: not reachable with the current API and browsers.
- false — "Ghi chú xem xét" hidden from roles that need it: every role holding reject/supplement/revoke also holds one of the three gating actions at project level (Staff officer: report.review/adjustment.review; Head: extension.approve).

## Implementation Notes

Authority questions resolved by user. Documentation gate completed; user explicitly
authorized implementation after reconciliation.
Baseline typecheck passed; full suite: 119 pass, 55 fail, 1 skip of 175; existing failures
logged at /tmp/docmans-gf4-baseline-tests.log. Local database: 24 migrations current.

Batch 2 fixes (2026-10-14): report corrections send only the item's own text (the pipe requires
`progressResults`), so the API copies the answered revision's checkpoint and period; the new draft
then prefills the report form for PATCH editing. A PATCH with `checkpointId: null` moves a draft to
"Báo cáo chung". The API now also returns the current officer's `displayName`.

## Spec Change Log

## Review Triage Log

Review of batch-2 fixes (2026-10-14; diff = uncommitted GF4 code vs HEAD, batch 1 + batch 2).

| Finding | Verdict | Route | Evidence |
| --- | --- | --- | --- |
| Draft PATCH cannot move to "Báo cáo chung" (pipe maps "" to undefined, service uses `??`) | medium | patch (fixed) | Web sends `null`; pipe keeps `null`; service falls back only on `undefined`; test "changing a draft's checkpoint" extended |
| With an open draft, PI cannot create a report for another checkpoint or after its checkpoint closes | medium | patch (fixed) | Added "Lưu thành báo cáo mới" (POST) next to the draft update |
| Accept note shown to PI as "Yêu cầu bổ sung … (hạn Chưa có)" | medium | patch (fixed) | Label now depends on `responseDeadline`; otherwise "Ghi chú xem xét" |
| Withdraw cancel shows the notice | false | reject | Batch-2 item 12 asks for a notice on an empty or cancelled reason |
| `adjustmentDirty` is one flag, not per item | low | reject | One open request at a time; the shared form is the only editor of a correction |
| Legacy adjustment `currentValues` shape blocks decisions | medium (unverified on real data) | defer | Batch 1; dev seed has no in-flight adjustment |
| `requestBaseline` uses wall clock, not tx clock | low | defer | Batch 1 |
| Milestones not bounded by project start date | low | defer | Batch 1 / pre-existing |
| Report immutability trigger allows status back to `draft` | medium (unverified) | defer | Batch 1 migration |
| Legacy `supplement_requested` rows not backfilled to `superseded` | low | defer | Batch 1 migration |
| Overdue persists when a milestone shares the submitted checkpoint's date | low | defer | Batch 1 behaviour |
| Report acceptance can stale an adjustment touching the completed milestone | maybe-false | defer | Batch 1; needs a test on a touched milestone |
| Setup-confirm precondition not in capability | low | reject | Backend message is shown; rare |
| Evidence not carried to a correction | low | reject | PI picks files per submit by design |
| `supersedesReportId` not rendered; per-item actions computed on lists | low | reject | Cosmetic / minor cost |
| No executed web wiring test | — | defer | Already deferred: no apps/web harness |

## Verification

- `git diff --check` and local Markdown link/contradiction checks for documentation.
- `npx prisma validate --schema apps/api/prisma/schema.prisma`, migration validation
  against a disposable database, then authorized local migration/seed.
- `npm run prisma:seed`, `npm run typecheck`, `npm run build:api`.
- `node --test tests/project-execution-capability.test.mjs`, relevant regression/integration and
  existing frontend checks, `npm test`, `npm run build`.
- Browser demonstration: PI report → Staff; PI adjustment → Staff decision; PI
  extension → Staff preparation → Head decision; Leadership and other denied paths.

**Results (2026-10-14, with spec-gf4-deferred-gaps):**
- `npx prisma validate` -- valid. Migration `20261014000000_project_request_withdrawn` applied to a disposable DB (`prisma migrate deploy`), then local dev (`npm run prisma:deploy`); `npm run prisma:seed` -- ok.
- `npm run typecheck`, `npm run build` -- pass.
- `node --test tests/approved-project-withdraw.test.mjs tests/project-execution-capability.test.mjs` -- 8/8 pass.
- `npm test` -- 206 tests, 151 pass, 54 fail, 1 skip; the failing set is identical to the 2026-10-13 baseline (no new failures).
- Demo on local API :4001 / web :3001 with seeded accounts, 2026-10-14:
  - Browser UI: PI withdraw → new extension → submit; Staff validate → prepare; Head approve (end date 21/1/2027 → 31/3/2027); Staff/Head see no withdraw control.
  - Browser-session API calls: PI adjustment → Staff review → approve (scope applied); Staff report accept; Staff withdraw → 403; Leadership has no decide/withdraw actions.
- Known gaps carried in deferred-work.md: cancel of a preparing project, routine milestone maintenance, end-date shortening, Head-conflict escalation; acceptance (6.8–6.9) is the next flow.
- Batch 2 (2026-10-14): typecheck/build pass; 4 GF4 test files 22/22 pass; `npm test` 220/165/54 fail/1 skip (= baseline). Browser on :3001 — PI: labels, officer name, draft PATCH (no new revision), per-item evidence picker, withdraw empty-reason notice, `/my-projects`; Head: no "Tạo đề tài", revoke needs a reason. Not exercised in browser: corrections after a supplement (items 1–2), confirm dialogs, file upload reset.
