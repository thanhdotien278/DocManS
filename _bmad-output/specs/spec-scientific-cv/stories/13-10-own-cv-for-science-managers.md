---
title: 'Story 13.10 — Own scientific CV for science-management staff'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'a078d538f23ccab3518f7e7a23d2b0820443e6c0'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/docs/contracts/researcher-profile-access.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/stories/13-7-cv-demo-seed-and-no-fake-bootstrap.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `SCIENTIFIC_MANAGEMENT_HEAD` and `SCIENTIFIC_MANAGEMENT_STAFF` accounts have no "Lý lịch khoa học" entry. They also have no way to get a linked researcher profile: the link flow only accepts researcher-role accounts. So they cannot maintain their own scientific CV (user request, 2026-10-13).

**Approach:** Reuse `/my-profile` and the existing manager link flow. Do not auto-create profiles: 13.7 stands, and GET/PATCH `my-profile` never creates one.
- Add the "Lý lịch khoa học" nav entry to HEAD and STAFF.
- An active `SYSTEM_ADMIN` may link an active HEAD/STAFF account to an INTERNAL profile in that account's scope. Managers still link only researcher-role accounts, and nobody can link themselves. This keeps elevated-account administration with SYSTEM_ADMIN, as the contract says.
- A linked owner can never activate or deactivate their own profile, in the API or in `allowedActions`.
- The demo seed links `nmphuong`, `hdtien1` and `hdtien2` to INTERNAL profiles, created like `vndinh`'s: only name and unit, nothing invented.
- Decided 2026-10-13. The user delegated the decision to Codex gpt-6-astra/high, which chose the manager link flow over self-service. It was narrowed to SYSTEM_ADMIN per `researcher-profile-access.md:46-52`.

## Boundaries & Constraints

**Always:** Role and self checks happen server-side, in both `accountCandidates` and `linkResearcherAccount`. Every link writes audit and history as today. The contract doc is updated.

**Elevated-linked profiles (decided 2026-10-13 after review; Codex gpt-6-astra/high confirmed):** when the linked account is HEAD/STAFF, the manager-write actions (update, activate, deactivate, cv.update, publication.manage, participation.manage) go only to an in-scope SYSTEM_ADMIN. Scoped managers keep read, cv.read and history.read. The owner keeps their self/cv/history grants via `/my-profile`. The rule is enforced in the projection and in `updateProfile`/`setStatus`, before and inside the transaction. HEAD/STAFF post-login landing stays `/dashboard`.

**Never:** Profile creation on access. Changing account roles or scopes. Nav entries for LEADERSHIP/OVERSIGHT. Changes to reviewer/council eligibility.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin links HEAD | SYSTEM_ADMIN, INTERNAL profile, HEAD account in scope | listed as candidate; link succeeds | N/A |
| Staff links HEAD | STAFF manager, same | not listed | link → 409 Conflict |
| HEAD on EXTERNAL profile | SYSTEM_ADMIN, EXTERNAL profile | not listed | 409 |
| Peer edits elevated profile | STAFF in scope of a HEAD-linked profile | update/activate/deactivate/cv.update/publication.manage/participation.manage absent; updateProfile/setStatus → 403 | 403 |
| Self deactivate | linked HEAD owner in scope of own profile | `deactivate`/`activate` absent from allowedActions | 403 |

</frozen-after-approval>

## Code Map

- `apps/web/src/fixtures/shell-context.ts:278-297` -- `navigationByRole` HEAD/STAFF arrays; add `{ href: "/my-profile", label: "Lý lịch khoa học", icon: UserRoundSearch }` after Dashboard.
- `apps/api/src/researcher-profiles/researcher-profile-access.ts` -- add a `linkableAccountRoles(actor, profileType)` helper used by both service callers; in `projectResearcherProfileAuthorization` deny activate/deactivate when `own`.
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts:368-375` (`accountCandidates`, `systemRole` filter → `{ in: roles }`), `:412-414` (`linkResearcherAccount` expectedRole check), `:241` (`setStatus`: reject when `current.linkedUserId === actor.id`).
- `apps/api/prisma/seed.mjs:246` -- after the `vndinh` profile upsert, upsert `profile-staff-nmphuong` / `-hdtien1` / `-hdtien2` (INTERNAL, ACTIVE, primary unit, displayName), only when the user has no other linked profile.
- `docs/contracts/researcher-profile-access.md:46-52` -- document the SYSTEM_ADMIN elevated-link rule and the self status guard.
- Unchanged: `/my-profile` page, `ScientificCvWorkspace`, the unlink rule (an admin already detaches elevated links), GET/PATCH my-profile.

## Tasks & Acceptance

**Execution:**
- [x] `shell-context.ts` -- nav entries -- user request.
- [x] `researcher-profile-access.ts` + `researcher-profiles.service.ts` -- linkable roles + self status guard -- server-side rule.
- [x] `seed.mjs` -- demo links -- demo accounts reach their CV.
- [x] `researcher-profile-access.md` -- contract.
- [x] `tests/researcher-profiles.test.mjs` -- extend "fails closed outside scope…" with the self-status case and the linkable-roles matrix; extend the UI source navigation test for the HEAD/STAFF entry.

**Acceptance Criteria:**
- Given seeded `nmphuong`, when they open "Lý lịch khoa học", then their own CV loads and saves.
- Given an account with no linked profile, when `/my-profile` loads, then the existing 403 message shows and nothing is created.

## Implementation Notes

- The seed is create-only: it skips a user who has, or ever had, a profile link, so it never overwrites edits or undoes an admin's unlink. It creates the profile, an account-link row and a CREATE history row. Name and unit only.
- Self status guard keyed on `linkedUserId === actor.id` (also covers an INACTIVE own profile). `deniesElevatedLinkedWrite` is shared by the projection, `updateProfile` and `setStatus`.
- `login-form.tsx`: HEAD/STAFF land on `/dashboard` even with a linked profile, otherwise the seed link would have moved their landing to `/my-profile`.
- Verified: 26/26 tests in the two spec'd files and web `tsc`. Seed run twice is idempotent. Real app: `nmphuong` lands on `/dashboard`, the nav shows "Lý lịch khoa học", and `/my-profile` loads their CV. The local API process on :4000 was not restarted, so the new API guards were checked by tests only.

## Review Triage Log

- Blind 1 / Edge 1: peer managers edit, deactivate or rename a HEAD/STAFF-linked profile (high; `updateProfile` writes `displayName`, service ~217). Intent gap resolved by a delegated Codex decision, then patched.
- Blind 2: owner edits own profile through the manager path (medium). Same root cause and fix as above.
- Verification-gap 1 / Blind 3: link boundary tested only through the helper (medium). Patched with service-level link tests.
- Blind 4: setStatus test may pass for the wrong reason (low; the verification-gap reviewer showed it fails without the guard). Patched cheaply: it now asserts the message.
- Blind 5: login redirect not in spec (low). It was added by the orchestrator to keep the HEAD/STAFF landing, and is recorded in the frozen decision. Verified in the real app; no runtime web test harness exists (verification-gap 2, deferred).
- Blind 6 / Edge 2: seed crashes if a user or unit goes missing (low; seed-only, static user list). Rejected.
- Blind 7 / Edge 3: seed does not restore an admin-unlinked demo link (false as a defect). Create-only on purpose, so an admin's unlink is never undone. Missing link `status` relies on the schema default (low, cosmetic). Rejected.
- Blind 8: story notes incomplete (false). Finalized in step 5.
- Blind 9: unlinked HEAD/STAFF see a nav entry that returns the existing 403 message (low). Rejected: the user asked for the entry, and the 403 copy already says the linked profile is missing.
- Blind 9b: icon is the same as the neighbouring entry (low, cosmetic). Rejected; researchers already use it.
- Blind 10: `linkableAccountRoles` comment says "active" (low). Patched (deleted). Role-list duplication elsewhere is pre-existing; rejected.
- Verification-gap 3: seed outcome only checked manually (low). Rejected: the implementer re-ran the seed twice, and `nmphuong` was checked in the browser.

## Spec Change Log

- Review loop 1: Blind and Edge reviewers found that a linked HEAD/STAFF profile can be edited, deactivated or renamed (`updateProfile` writes `displayName`) by any in-scope peer manager, and by the owner through the manager path. Amended: the elevated-linked rule (frozen, with a delegated Codex decision), a matrix row, and the post-login landing. Known-bad state avoided: STAFF renaming or deactivating their HEAD. KEEP: nav entries, `linkableAccountRoles` and both service call sites, the self status guard, the create-only seed, the contract text, and the login-form landing. The code was kept rather than reverted: the amendment only adds a guard, and re-deriving would reproduce the same diff.

## Verification

**Commands:**
- `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` -- expected: all pass.
- `(cd apps/web && npx tsc --noEmit -p .)` -- expected: clean.

**Manual checks:**
- Re-run the seed, then sign in as `nmphuong`: the nav shows "Lý lịch khoa học" and `/my-profile` loads the CV.
