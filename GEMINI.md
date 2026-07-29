# GEMINI.md — project guide and current handoff

Last updated: **2026-07-27**, at the end of Epic 3.

This file is self-contained: it covers what the project is, the conventions that will bite you, and
exactly where the work was left. Read it before touching code.

---

# Part 1 — What this project is

**DocManSystem (RTMS)** is an internal research-management platform for the Vietnam Military Medical
University (Học viện Quân y). The product UI and most domain text are in **Vietnamese** — match the
surrounding language when editing user-facing strings, labels and error messages.

**Nx + npm-workspaces monorepo:**

- `apps/web` — Next.js 15 / React 19 App Router frontend (port 3000)
- `apps/api` — NestJS 11 backend (port 4000, base path `/api/v1`)
- `packages/*` — shared libraries via `@rtms/*`: `contracts`, `permissions`, `validation`, `ui-tokens`

## Commands

```bash
npm run db:setup      # prisma generate + migrate deploy + seed (needs Postgres running)
npm run dev:api       # tsc-compile apps/api -> dist/, then node dist/apps/api/main.js
npm run dev:web       # next dev

npm test              # build:api, then node --test tests/*.test.mjs
npm run typecheck     # tsc --noEmit for web + api
npm run lint          # ALIAS for typecheck — there is no ESLint in this repo
npm run build         # build:web + build:api
```

Single test file (build the API first — tests import compiled output):

```bash
npm run build:api && node --test tests/proposals-ep03.test.mjs
```

## Conventions that will bite you

These are non-obvious and cost time if you miss them:

1. **The API is ESM, built with plain `tsc`, not the Nest CLI.** TypeScript source uses `.js` import
   specifiers even when importing `.ts` files:
   `import { AuthService } from "./auth.service.js"`. Keep this or the runtime import breaks.
2. **Tests run against `dist/`, not source.** `tests/*.test.mjs` use Node's built-in runner and
   import from `../dist/apps/api/...`. You must `npm run build:api` before tests reflect your
   changes (`npm test` does it for you). A few tests instead read source files as text to assert on
   structure or policy — those will fail if you rename things.
3. **Auth is opaque server-side sessions, NOT JWT.** Login verifies a scrypt hash, creates a
   `Session` row, sets an httpOnly cookie `rtms_session` (12h TTL). No client-held tokens. The web
   app authenticates against the real API, so **the API and a seeded DB must be running** for the
   web app to work past the login screen.
4. **Authorization is fail-closed** and lives in two places that must stay in sync:
   `packages/permissions/src/index.ts` and `apps/api/src/permissions/permission-policy.ts`. Both
   default to `allowed: false`. The authoritative role/action breakdown is `docs/permission-matrix.md`
   — treat it as the spec, and update it in the same change set when behaviour changes.
5. **Migrations are hand-authored SQL** under `apps/api/prisma/migrations`, named by epic/story.
   Do not run `prisma migrate dev` and let it generate one.
6. **Fixtures are deliberately isolated.** Demo data under `apps/web/src/fixtures` must not leak into
   `apps/web/src/lib`. `tests/smoke.test.mjs` actively asserts this separation.
7. Development is organised into **epics/stories** (BMAD). Specs live in
   `_bmad-output/implementation-artifacts/`; status in `sprint-status.yaml`. Branches and commits
   follow `feat(st-2.4): …` / `EP-03`.

---

# Part 2 — Where the work was left

## Status

| Epic | Status |
| --- | --- |
| Epic 1 — foundation | done |
| Epic 2 — proposal intake & submission | done |
| **Epic 3 — supplement, evaluation, approval** | **done (this handoff)** |
| Epic 4 — approved-project tracking | backlog ← **next** |
| Epics 5–7 | backlog |

**Open PR:** https://github.com/thanhdotien278/DocManS/pull/11
Branch `chore/demo-seed-password-1234` → `DocManS`. The branch name is leftover from an
already-merged PR #10; its contents are Epic 3.

## What Epic 3 delivers

The full lifecycle from formal submission to a recorded leadership decision:

```
submitted → under_review → ready_for_approval → approved | rejected
                ↑ first reviewer assignment      ↑ staff consolidation   ↑ leadership decision
```

| Story | Delivered |
| --- | --- |
| ST-3.0 | Participants linked to user accounts; viewer's record-scoped role on every proposal response; the one conflict primitive ST-3.2 and ST-3.5 share |
| ST-3.1 | Supplement request + resubmission (this already existed in commit `09f18de`; it was verified and marked done, not rewritten) |
| ST-3.2 | Reviewer/committee assignment, revoke-with-history, reviewer queue, assignment-scoped review package |
| ST-3.3 | Fixed 100-point rubric, draft save, submit with field-level validation, immutable once sent |
| ST-3.4 | Per-reviewer progress, consolidated outcome, explicit `markReady` gated on completion |
| ST-3.5 | Authority-scoped decision package, approve/reject, decision history |

### Where the code is

```
apps/api/src/proposal-evaluations/          # the whole EP-03 module (ST-3.2 … ST-3.5)
apps/api/src/proposals-shared/
  proposal-workflow.ts                      # the status state machine — ONE place
  proposal-review-access.ts                 # pure assignment/scoring policy
  proposal-review-access.service.ts         # "is this user assigned to this proposal"
  proposal-participation.ts / -access.ts    # ST-3.0 participation + the shared read rule
apps/api/prisma/migrations/
  20260726000000_st_30_proposal_participation/
  20260727000000_ep03_proposal_evaluation/
apps/web/src/lib/proposal-evaluations-api.ts
apps/web/src/components/research-proposals/ # 3 new panels + 2 queue panels
apps/web/src/app/my-reviews/ , apps/web/src/app/approvals/
tests/proposals-ep03.test.mjs , tests/helpers/evaluation-prisma.mjs
```

### Design rules you must not accidentally undo

- **Reviewer authority comes only from a `ProposalReviewAssignment` row on that one proposal.** The
  `reviewer` account role grants nothing by itself. A revoked assignment stops granting immediately.
- **Leadership** reads any proposal that has entered the formal workflow — every state except
  `draft` — and does not need a matching organization scope.
- **A system-admin role does not imply business approval authority** (permission matrix §2), and is
  not accepted on the EP-03 evaluation reads either.
- **Staff need `scientific-management` AND organization scope** over the host unit, re-checked on
  every action — reads included, not just writes.
- **Status transitions are guarded** (`updateProposalStatusGuarded`): the write is conditional on the
  status that was validated, so two concurrent requests cannot both win. Don't replace it with a
  plain `update`.
- Every state change writes proposal status + `ProposalSubmissionEvent` + `AuditLog` in **one**
  transaction.

All six read-scope decisions are written up in `docs/permission-matrix.md` §7.4.1. The allowed
states per action are declared once in `proposals-shared/proposal-workflow.ts`.

## Verification status

- `npm test` → **94 pass** (was 71 before this work), `npm run typecheck` and both builds clean
- Full flow driven over HTTP against real Postgres: conflict block → assign → `under_review` →
  score → consolidate → `ready_for_approval` → approve → `approved`, with audit trail and timeline
- Clicked through in a browser as staff, reviewer and leadership; no horizontal overflow at 375px
- An adversarial review raised 37 candidates; 13 survived verification and were fixed. The list is
  in the ST-3.2 story file under "Post-Review Hardening".

---

# Part 3 — Open items

## Decisions that need a human, not an agent

**1. A reviewer's "đề nghị chỉnh sửa, bổ sung" verdict has no return path to the PI.** ⭐ resolve first

A reviewer can recommend revision, but nothing can send the proposal back. Fixing it means widening
`SUPPLEMENT_REQUESTABLE_STATUSES` in `proposals-shared/proposal-workflow.ts` to include
`under_review` — which contradicts **both** a deliberate ST-3.1 test (`tests/proposals-ep02.test.mjs`
asserts a resubmitted proposal cannot be sent back again, preventing an endless supplement loop)
**and** the permission matrix state rule for "Request supplement" (`Submitted, needs supplement`).

Do **not** just widen the constant. It is a product decision: it changes agreed ST-3.1 behaviour and
requires updating the matrix in the same change set.

**2. The conflict rule cannot see participants who are not account-linked.**

Someone recorded as a descriptive external participant who *also* holds a system account under a
different identity is not detected as conflicted. This is a boundary of the ST-3.0 model, which
deliberately keeps unlinked participants valid. Closing it needs researcher-profile linkage (EP-11)
or a mandatory account link for internal participants. Do not "fix" it with name matching.

Both, plus the rest (no notifications — EP-06 will consume the `ProposalSubmissionEvent` rows; no
council model — EP-10; rubric fixed in code by design; reviews immutable with no reopen policy) are
recorded in `_bmad-output/implementation-artifacts/deferred-work.md`.

## Uncommitted in the working tree — do not sweep these into a feature commit

These are unrelated to Epic 3 and were deliberately left alone:

- **`danh_sach_duoc_dan_13.xlsx` is deleted in the working tree.** This deletion was not made as part
  of Epic 3, and the file was added in commit `09f18de`. Check with the repo owner before committing
  or restoring it.
- BMAD installer upgrade 6.8.0 → 6.10.0 under `_bmad/` — 14 files, including a deleted
  `_bmad/scripts/tests/test_resolve_customization.py` and a stray `_bmad/config.toml.bak`
- `.claude/skills/` (46 skills generated by that installer run) and `CLAUDE.md`

---

# Part 4 — Local environment (this machine)

Apple Silicon Mac, **no Docker**. `docker compose` in the README is not usable here.

- Node 22 via Homebrew, **keg-only**: PATH needs `/opt/homebrew/opt/node@22/bin`
- Postgres 16 as a brew service: `brew services start postgresql@16`
- DB/role `docmansystem` / `docmansystem`, matching `DATABASE_URL` in `.env`
- Seeded demo accounts all use password `1234` (see `docs/development/auth-seed-users.md`)

**MinIO is NOT running** (it is a Docker service). Consequence: anything touching file upload or
download fails locally — proposal attachments, and therefore submission-readiness and the
formal-submit path. To exercise a workflow past submission, insert the proposal row directly with
`status = 'submitted'` via psql and drive the rest through the API.

Two traps when scripting against the local stack:

- Running `npm run build:web` while `npm run dev:web` is running corrupts the shared
  `apps/web/.next` directory. The app then hangs on "Đang kiểm tra phiên đăng nhập...". Fix: stop
  dev, `rm -rf apps/web/.next`, restart.
- `psql -tAc "INSERT ... RETURNING id"` returns the id **and** the `INSERT 0 1` status tag. Capture
  with `| head -1`, or every URL you build from it is malformed.

Demo rows currently in the local DB, useful for clicking through the new screens:
`EP03-DEMO-A` (under review) and `EP03-DEMO-B` (approved).

---

# Part 5 — Suggested next step

**Epic 4, story ST-4.1** — create the approved-project record from an approved proposal. That is
exactly where ST-3.5 hands off: ST-3.5 deliberately does *not* create the project record, it only
leaves the proposal in `approved`.

**Note on where the spec lives.** Epic 4 stories are `backlog`, which in this project's workflow
means *"story exists only in the epic file"* — there is **no** `4-1-*.md` in
`_bmad-output/implementation-artifacts/` yet. The source spec is
`_bmad-output/epics-and-stories.md` → `### ST-4.1: Khởi tạo hồ sơ đề tài thực hiện từ proposal đã duyệt`
(around line 1247, with `AC-ST-4.1-01` onward). A context-filled story file is normally generated
from it first (BMAD `bmad-create-story`), which also flips the status to `ready-for-dev`.

Permission matrix row to honour: "Create approved project from approved proposal" —
scientific-management `Create`, state rule `Approved`, audit required, source `FR23, Story 4.1`.

Before starting, decide open item **#1** above — a revision path may belong in the same slice.
