---
title: 'Golden Flow 4 — PI withdraws an open change request'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b2367e01101a6595fa407f4422207f8d5a329f70'
context:
  - '{project-root}/docs/contracts/project-execution.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A project allows only one open adjustment/extension request (`REQUEST_ALREADY_OPEN`, service.ts:502), and nothing can close a request except a decision. An abandoned draft, an unanswered supplement request, or an extension that no eligible Head can decide therefore freezes the project.

**Approach:** Implement the user decisions of 2026-10-13. Decisions 3–5 (cancel, milestone maintenance, shortening) were split into deferred-work on 2026-10-14.
- The active PI who created a request can withdraw it at any non-terminal status before a decision. This is a new terminal request status, `withdrawn`, exposed through the new actions `project.adjustment.withdraw` and `project.extension.withdraw`.
- Documentation only:
  - (1) When no active proposal officer exists, Head reassigns the proposal officer on the approved proposal (an existing action with no status gate), and that officer creates the project.
  - (6) An extension cannot be decided when no scoped, unconflicted Head exists. This is a known limitation for the next flow; withdraw unblocks the project.

## Boundaries & Constraints

**Always:**
- The backend is the authority.
- The mutation runs inside `mutate()` with a `contextVersion` check.
- History and audit are written in the same transaction: `projectRequestHistory`, `projectHistory` and `AuditLogService` via `recordRequestAction`.
- Submitted revisions and their evidence stay immutable.
- A required reason is recorded.

**Never:**
- No deletion of requests or revisions.
- Staff, Head, Leadership and members cannot withdraw.
- No changes to the project's approved values.
- No cancel, milestone or end-date work in this spec.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| Withdraw open request | Active PI who is `requesterId`; project `executing` or `paused`; status ∈ draft, submitted, under_staff_review, supplement_requested, under_staff_validation, ready_for_head_decision; reason | status `withdrawn`; history `project.<type>.withdraw` from→to; audit row | — |
| Create after withdraw | The same project's only other request is `withdrawn` | New draft request created | — |
| Wrong actor | Staff, Head, Leadership, member, or a PI who is not the requester | Unchanged | 403 ACTION_NOT_GRANTED |
| Terminal request | approved, rejected or withdrawn | Unchanged | 400 WORKFLOW_STATE_DENIED |
| Wrong type in path | `/requests/extension/:id/withdraw` for an adjustment | Unchanged | 400 WORKFLOW_STATE_DENIED |
| Project not executing/paused | preparing, etc. | Unchanged | 400 WORKFLOW_STATE_DENIED |
| Missing reason or stale contextVersion | — | Unchanged | 400 / 409 CONTEXT_VERSION_MISMATCH |
| Decide after withdraw | Staff/Head approve/reject a withdrawn request | Unchanged | 400 WORKFLOW_STATE_DENIED (existing status check) |

</frozen-after-approval>

## Code Map

- `apps/api/src/approved-projects/approved-projects.service.ts`:
  - `:502` — the terminal list for `REQUEST_ALREADY_OPEN` gains `withdrawn`.
  - Reuse `findRequest` (:521), `recordRequestAction` (:707), and `assertProjectPi(actor, project, false)` (:327) plus an explicit executing|paused check.
  - The `paused` constant does not exist yet; use `PROJECT_STATUSES.paused`.
  - Add `withdrawRequest(actor, projectId, type, input)` and check `request.requesterId === actor.id`.
- `apps/api/src/approved-projects/project-capability-v1.ts`:
  - Add the two actions to `PROJECT_ACTIONS`.
  - Denial: allowed when `isPi` and status ∈ executing|paused. Do not derive this from `canPi`, which is executing-only.
  - When `input.request` is given, also require a matching type, a non-terminal status and requester === actor.
  - `loadAuthorized` (:105) passes no request, so per-request checks live in the service and the UI.
- `packages/permissions/src/index.ts` and `index.js` -- add both actions next to `project.*.reject`.
- `apps/api/src/approved-projects/approved-projects.controller.ts` -- add `POST :id/requests/:type/:requestId/withdraw` with `readRequestType`.
- `apps/api/src/approved-projects/approved-projects.dto.ts` -- a body pipe that requires `reason` (1–2000) and `contextVersion`. Reuse the existing pipe if one already enforces this, e.g. the one used by revoke/reject.
- New migration `apps/api/prisma/migrations/20261014000000_project_request_withdrawn/migration.sql` -- DROP and re-ADD `project_requests_status_check` (original at migration.sql:228) with `withdrawn`. No Prisma schema change, since status is TEXT.
- The withdrawn draft's `project_request_revisions` row stays `draft`. The service never edits a withdrawn request.
- `apps/web/src/components/projects/project-detail.tsx` (request card around :110) -- add a "Rút yêu cầu" button with a reason prompt and confirm. Show it only when `canProject("project.<type>.withdraw")`, the item status is non-terminal, and `item.requester` is the viewer. The backend denial is shown via the existing `notice`.
- `apps/web/src/lib/projects-api.ts` -- reuse `projectAction`. No new function unless typing needs one.
- `apps/api/prisma/seed.mjs:503` -- the seeded `gf4-demo-extension` (ready_for_head_decision) is the withdraw demo. No change.
- `tests/project-execution-capability.test.mjs` -- extend it.
- Docs:
  - `docs/contracts/project-execution.md` (§Controlled changes, §Capabilities, §Approved decisions): request lifecycle plus decisions 1 and 6.
  - `docs/permission-matrix.md`: the 2 actions.
  - `deferred-work.md`: mark the 2026-09-26 items "open request blocks", "no creation fallback" and "extension undecidable" resolved or documented.
- Close-out:
  - Original GF4 spec: Verification section and status.
  - `sprint-status.yaml` epic-6 keys, reconciled with `epic-06-approved-project-tracking/sprint-plan.md`.

## Tasks & Acceptance

**Execution:**
- [x] Migration -- extend the request status CHECK -- the DB accepts `withdrawn`.
- [x] Capability file + permissions package -- 2 actions -- the UI and backend agree.
- [x] Service + controller + DTO -- `withdrawRequest` and the open-check fix -- unblocks the project.
- [x] `project-detail.tsx` -- capability-gated withdraw control -- demonstrable.
- [x] `tests/project-execution-capability.test.mjs` -- PI allowed in executing and paused; PI denied in preparing; Staff, Head and Leadership denied; a different requester and a terminal request are denied when a request is given -- regression protection.
- [x] Docs, deferred-work, close-out.

**Acceptance Criteria:**
- Given a withdrawn request, when history is read, then the append-only request and project history plus audit show the actor, reason and from→to status, and the submitted revision and evidence are unchanged.
- Given a stale UI capability, when withdraw is posted, then the backend rejects it and the UI shows the denial.

## Implementation Notes

- Shared `TERMINAL_REQUEST_STATUSES` (approved, rejected, withdrawn) in `project-capability-v1.ts` feeds both the capability and the `REQUEST_ALREADY_OPEN` check.
- New `projectWithdrawPipe` (reason 1–2000 required); the revoke pipe caps at 1000 and the decision pipe's reason is optional, so neither fit.
- Detailed request payload now carries `requesterId`; the UI compares it with the active TOPIC_PI member id (withdraw is only granted to the active PI). Withdraw sets no decision fields.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | verification-gap, blind | `withdrawRequest` service guards and the create-after-withdraw path have no automated test | medium | No test imports the service (`rg` over `tests/`) | patch |
| 2 | verification-gap | Nothing asserts that the detail payload includes `requesterId`, so the UI button could vanish silently | medium | The field is optional in the web type; no test reads the payload | patch (folded into #1) |
| 3 | verification-gap | The `withdrawn` CHECK migration is verified only manually | medium | No DB-backed migration test harness exists in the repo | defer |
| 4 | blind | No positive capability case for `project.adjustment.withdraw` | low | The test only asserts denials for adjustment | patch |
| 5 | edge, blind | A withdrawn card still shows the supplement deadline | low | The card renders `responseDeadline` regardless of status | patch |
| 6 | blind | The contract lifecycle lines omit `withdrawn` | low | They are stale against the new terminal state | patch |
| 7 | blind | Redundant reason check without an error code | low | `projectWithdrawPipe` already requires the reason (`readText`) | patch |
| 8 | blind | deferred-work has a stale line reference, and the split items are not cross-linked | low | `:501` → `:502`; the old 09-26 entries are not linked | patch |
| 9 | edge, blind | If the PI is replaced, a request created by the old PI can never be withdrawn | maybe-false | No PI-change path exists in GF4: an adjustment cannot end `TOPIC_PI` (service.ts:698), and the PI is created with `effectiveUntil` null. It becomes a trap once a PI-change flow is added | defer |
| 10 | blind, verification-gap | The capability uses `ownerId` while the service uses the active PI member | false | `loadAuthorized` (:102,105) sets `ownerId` to the active `TOPIC_PI` member's `userId` | reject |
| 11 | edge | The UI uses `status==="ACTIVE"` while the backend uses effective dates | low | The button is also gated on the backend capability; any divergence is cosmetic and unlikely | reject |
| 12 | edge | `evidenceIds` is not cleared after a withdraw | low | The selection stays visible in checkboxes the user controls; files are project-scoped | reject |
| 13 | blind | The UI repeats the terminal list instead of a shared constant / `as const` | low | No shared web/api status type exists; the fix adds a shared surface | reject |
| 14 | blind | `window.prompt` UX and no client-side length check | low | Works; the backend enforces the 2000-character limit. A textarea refactor is extra complexity | reject |
| 15 | blind | The sprint-status change is broad and not reconciled | false | `epic-06…/sprint-plan.md` already lists 6.1–6.7 and 6.10 as `in-progress` | reject |
| 16 | blind | The browser check was not run | — | It is a verification step, not a code defect; it runs in step-05 | n/a |

## Verification

**Commands:**
- `npx prisma validate --schema apps/api/prisma/schema.prisma` -- valid
- Hand-written migration applied first to a disposable DB (`prisma migrate deploy`), then to the local dev DB with `npm run prisma:deploy`. Never `migrate dev` or reset. Then `npm run prisma:seed`.
- `npm run typecheck` && `npm run build` -- pass
- `node --test tests/project-execution-capability.test.mjs` -- all pass
- `npm test` -- no new failures vs the baseline (2026-10-13 clean tree: 202 tests, 147 pass, 54 fail, 1 skip; scratchpad `baseline-tests.log`)

**Manual checks:**
- Browser: the original GF4 paths (PI report → Staff; adjustment → Staff decision; extension → Staff prepare → Head decision; Leadership denied), then PI withdraws an open request, creates a new one, and the denials are confirmed.

**Results (2026-10-14):**
- `npx prisma validate` -- valid. Migration applied to disposable DB `gf4_withdraw_tmp` (then dropped), then `npm run prisma:deploy` and `npm run prisma:seed` on local dev -- ok. No other status CHECK touches request history tables.
- `npm run typecheck`, `npm run build` -- pass.
- `node --test tests/project-execution-capability.test.mjs` -- 5/5 pass.
- `npm test` -- 203 tests, 148 pass, 54 fail, 1 skip; failing set identical to `baseline-tests.log`.
- HTTP smoke on a temporary API instance (port 4019) against seeded `gf4-demo-extension`: Head/Staff withdraw 403; missing reason 400; stale contextVersion 409; wrong type 400; PI withdraw 201 → `withdrawn`; repeat 400; Head approve of withdrawn 400; revision stays `submitted`; request/project history `ready_for_head_decision→withdrawn` with reason; audit row `project.extension.withdraw` success; new extension draft created 201.
- Side effect: local dev demo `gf4-demo-extension` is now `withdrawn` (re-seeding skips an existing project). The new extension created after the withdraw was then moved through the real endpoints (PI submit → Staff validate → Staff prepare), so the demo again has a `ready_for_head_decision` extension for the Head decision and withdraw demos.
- Browser manual checks -- NOT RUN.
