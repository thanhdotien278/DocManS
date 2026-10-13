---
title: 'Header user chip reflects the CV work unit and academic titles'
type: 'bugfix'
created: '2026-10-13'
status: 'done'
baseline_commit: 'ced34d3d7890616481cd541f7aad5a6f1d2bd70c'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The top-right user chip (`app-shell.tsx`) shows `account.name` = `users.display_name` and `account.unit` = the first active organization scope name (`auth.store.ts` `toInternalUser`). When a researcher saves "Đơn vị quản lý / Đơn vị công tác" (`curriculumVitae.personalInfo.organization`) or changes học hàm/học vị (profile `academicRank`/`academicDegree` catalog items), the chip does not change, because neither value feeds it.

**Approach:** `GET /auth/me` adds two display-only fields for a user with an ACTIVE linked researcher profile: the full name prefixed with academic-title abbreviations (e.g. "GS. TS. Nguyễn Minh Phương") and the CV organization. The web shell shows them in the chip and its menu, falling back to today's values. The CV workspace already calls `refreshCurrentUser()` after an owner save, so the chip updates without a reload.

## Boundaries & Constraints

**Always:** Display only. Rank before degree, separated by spaces. A blank or absent CV organization falls back to the scope name. A profile with no rank and no degree shows `fullName` unchanged. Avatar initials stay derived from `displayName`.

Decisions (user, 2026-10-13):
- When the profile has a rank or degree, strip the recognised abbreviation tokens (GS., PGS., TS., ThS., BSCKI., BSCKII.) from `fullName`, then prefix the computed ones. Other words stay: "Thiếu tướng PGS. TS. Vũ Nhất Định" with GS + TS → "GS. TS. Thiếu tướng Vũ Nhất Định".
- Abbreviation by catalog code: `professor`→GS., `associate-professor`→PGS., `doctor`→TS., `master`→ThS., `bscki`→BSCKI., `bsckii`→BSCKII.; `other` and unknown codes add nothing.

**Never:** Change `users.display_name`, `users.unit`, organization scopes, `SafeUserContext`/`request.currentUser`, audit facts, or authorization. Never load the CV JSON in the per-request session guard (it can hold a ~1 MB avatar data URL); only `/auth/me` reads the profile, and only the organization path.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| CV unit set | CV organization "Ban Quản lý KHQS", scope "Khoa Toán - Tin học" | chip unit "Ban Quản lý KHQS" | N/A |
| CV unit blank | organization absent / whitespace | chip unit = scope name | N/A |
| Titles | rank professor, degree doctor, fullName "Nguyễn Minh Phương" | "GS. TS. Nguyễn Minh Phương" | N/A |
| Embedded titles | fullName "TS. Nguyễn Minh Phương", rank professor, degree doctor | "GS. TS. Nguyễn Minh Phương" | N/A |
| Unknown code only | degree `other`, no rank | fullName unchanged | N/A |
| No linked/active profile | admin account, or INACTIVE profile | `/me` has no extra fields; chip unchanged | N/A |
| Owner saves CV | edits unit or rank on `/my-profile`, saves | chip updates after the save's `refreshCurrentUser()` | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/src/auth/auth.controller.ts:45` `me()` -- returns `{ user: request.currentUser }`; make it return the user plus display fields via the service.
- `apps/api/src/auth/auth.service.ts` -- add the display-identity method: abbreviation map, name composition, organization fallback. Keep it pure over the store's row so the fake-store test covers it.
- `apps/api/src/auth/auth.store.ts` -- add a query for the linked ACTIVE profile: `fullName`, rank/degree `code`, and only `curriculum_vitae #>> '{personalInfo,organization}'` (raw SQL or equivalent). Do not touch `findUserById` / `toInternalUser`.
- `apps/web/src/lib/session.ts` -- `CurrentUser` optional fields; `toShellAccount` uses them for `name`/`unit`, with `initials` still from `displayName`.
- `apps/web/src/lib/auth-api.ts` -- `isCurrentUser` already tolerates extra fields; no change expected.
- `apps/web/src/components/layout/app-shell.tsx:52-59` -- already renders `account.name`/`account.unit`; no change expected.
- `cv-workspace.tsx:304` -- owner save already dispatches `refreshCurrentUser()`; no change.
- Seed: `apps/api/prisma/seed.mjs:321-326` catalog codes. Not to be edited (13.7 session owns it).
- `tests/auth-api.test.mjs` -- fake `createAuthStore()` + `new AuthController(service)`; extend for `/me`.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/auth/auth.store.ts` -- profile display query -- one read for `/me` only.
- [x] `apps/api/src/auth/auth.service.ts` + `auth.controller.ts` -- compose fields, `me()` returns them -- single display source.
- [x] `apps/web/src/lib/session.ts` -- map into `ShellAccount.name/unit` -- chip and menu pick them up.
- [x] `tests/auth-api.test.mjs` -- extend with `/me` cases from the I/O matrix (titles, blank unit fallback, no profile).

**Acceptance Criteria:**
- Given a researcher on `/my-profile`, when they change Đơn vị or học hàm/học vị and save, then the chip and its dropdown show the new values without a page reload.
- Given any request other than `/auth/me`, then `request.currentUser` and audit `displayName`/`unit` are unchanged.

## Implementation Notes

- Implemented across `auth.store.ts` (`findProfileDisplay`, raw SQL reading only `curriculum_vitae #>> '{personalInfo,organization}'`), `auth.service.ts` (`getCurrentUserView` + private `composeProfileDisplay`), `auth.controller.ts` (`me()`), and `session.ts` (`displayFullName`/`displayUnit` → `name`/`unit`). `app-shell.tsx` and `cv-workspace.tsx` are unchanged.
- The SQL was run read-only against the local Postgres. Real app check on the 4001/3001 preview as seed user `patuan`: setting Giáo sư and the unit "Phong Thu nghiem Header", then saving, changed the chip and its menu from "TS. Phạm Anh Tuấn / Khoa Toán - Tin học" to "GS. TS. Phạm Anh Tuấn / Phong Thu nghiem Header" without a reload. The values were restored afterwards; two CV history entries remain for that profile.

## Review Triage Log

Inline review (user chose no reviewer subagents, 2026-10-13).

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | edge | Joined or dotless titles ("PGS.TS.", "TS") were not stripped, giving "GS. TS. PGS.TS. …" | medium | patch — `isTitleToken` splits on "."; test added for "PGS.TS Nguyễn Minh Phương" |
| 2 | verif-gap | `findProfileDisplay` SQL (ACTIVE filter, column names) has no executed test; the auth tests use a fake store | low | defer — no DB-backed test harness exists; SQL was run against local Postgres by hand |
| 3 | verif-gap | Owner save → `refreshCurrentUser()` → chip refresh is not covered by an automated test | low | reject — pre-existing call; verified in the real app (see Implementation Notes) |
| 4 | blind | A very long CV organization (up to 1000 chars) could stretch the header chip | low | reject — unlikely in practice; the fix would add CSS outside this change |
| 5 | blind | A name made only of titles ("TS.") renders as just "GS. TS." | low | reject — not a realistic full name |

## Verification

**Commands:**
- `npm run build:api && node --test tests/auth-api.test.mjs` -- expected: pass.
- `npm run typecheck` -- expected: no errors.

**Manual checks:**
- Real app as a researcher: change unit and rank/degree, save, and check the chip.
