---
title: 'Fix missing researcher profile database migration'
type: 'bugfix'
created: '2026-09-15'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: e1a0113856c9aa1a8713a124f70c44193b7051ae
context:
  - /Users/Super/DocManS/CONTEXT.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The researcher-profile list fails with Prisma `P2022` because the application selects `researcher_profiles.profile_type`, while the local `docmansystem` database has not applied migration `20260915000000_researcher_profile_completion`.

**Approach:** Reset only the local `docmansystem` database, apply every repository migration from scratch, run the current seed data, and verify the researcher-profile list succeeds.

## Boundaries & Constraints

**Always:** Target only PostgreSQL database `docmansystem` at `localhost:5432`. Preserve the user's existing `apps/api/prisma/seed.mjs` modification and unpushed `e1a0113` commit; use that current seed file when repopulating data.

**Never:** Drop another database, alter migration SQL, edit application/seed code, or mutate Git history. The database-only `20260906000000_researcher_identity_links` entry may disappear with the reset because it is not part of the repository migration set.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Existing local database | `docmansystem` contains divergent migration history and local data | Drop/recreate it and apply all 21 repository migrations | Stop on any reset or migration failure |
| Seed | Empty migrated database | Current `apps/api/prisma/seed.mjs` completes successfully | Stop and report the failing seed step |
| Runtime verification | API lists researcher profiles after migration | No `P2022`; endpoint returns its normal authorized response | Capture the remaining server error without changing unrelated code |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- maps `ResearcherProfile.profileType` to the missing `profile_type` column.
- `apps/api/prisma/migrations/20260915000000_researcher_profile_completion/migration.sql` -- reviewed additive migration that adds `profile_type` and the rest of the completed profile/account schema; apply unchanged.
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts` -- failing `findMany` consumer; no source edit is expected.
- `apps/api/prisma/seed.mjs` -- pre-existing user modification; preserve untouched.

## Tasks & Acceptance

**Execution:**
- [x] Local PostgreSQL schema -- inspect migration divergence and identify overlap from the database-only migration.
- [x] Local `docmansystem` database -- reset and apply all repository migrations.
- [x] `apps/api/prisma/seed.mjs` -- run the current seed data unchanged.
- [x] Local API -- verify migration status and researcher-profile list behavior.

**Acceptance Criteria:**
- Given the current divergent migration history, when the reset completes, then all 21 repository migrations are applied in order with no pending migration or database-only history entry.
- Given the running researcher-profile page, when its list request is retried, then PostgreSQL no longer reports missing `researcher_profiles.profile_type`.
- Given the dirty worktree and ahead commit, when the repair completes, then neither is modified.

## Implementation Notes

- Preflight found none of the researcher-profile completion objects or its migration-history row.
- Applying the unchanged migration stopped on its first statement because the database-only `20260906000000_researcher_identity_links` migration already created all five credential columns on `users`, `sessions`, and `password_reset_tokens`. The completion SQL was not recorded as applied; its researcher-profile columns and tables remain absent.
- The human replaced the isolated-reconciliation approach with an explicit local database reset and reseed request.
- `prisma migrate reset --force` reset only local database `docmansystem` and applied all 21 repository migrations successfully. `npm run prisma:seed` completed and produced 13 users; the current seed intentionally produced zero researcher profiles.
- Prisma reports the schema up to date. A read-only Prisma `ResearcherProfile` query succeeded, and PostgreSQL contains `researcher_profiles_profile_type_check`.
- The Brave researcher-profile page was reloaded and displayed its normal zero-profile state without the `Internal server error` banner or Prisma `P2022`.
- A read-only post-seed check confirmed `external1`, `external2`, and `external3` each have the active `org-external` / `EXT` scope.
- Git remained `ahead 1`; the pre-existing `apps/api/prisma/seed.mjs` edit was unchanged and unstaged.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence and route |
| --- | --- | --- |
| Blind 1: destructive commands rely on ambient database URL | false | Prisma printed and confirmed `docmansystem` at `localhost:5432` immediately before reset; the resolved target matched the approved invariant. |
| Blind 2: zero profiles leave legacy-row migration paths unexercised | medium | True coverage gap in the pre-existing migration, but the requested operation intentionally rebuilt an empty database and changed no migration code. Deferred as pre-existing verification debt. |
| Blind 3: browser empty state does not prove list success | false | The panel renders the error banner whenever either list or catalog loading rejects; the reloaded page had no banner, and a direct Prisma profile query also succeeded. |
| Blind 4: `org-external` conflicts with the no-seed-edit boundary | false | The seed edit predates this repair, appears separately in the baseline diff, and the spec explicitly preserves and uses the current user-owned seed unchanged. |
| Blind 5: Git status does not prove preserved commit/seed content | false | Baseline and final HEAD remained `e1a0113856c9aa1a8713a124f70c44193b7051ae`; the before/after diff for `seed.mjs` remained the same one-line `org-external` addition. |
| Blind 6: empty Spec Change Log omits the human reset decision | false | Spec Change Log is reserved for review loop amendments; the human-requested approach change and rationale are recorded in the frozen intent and Implementation Notes. |
| Edge 1: conflicting existing `org-external` ID/code can break seed | false | The approved flow reset the database before seeding, so no existing organization row could reach this conflict; the seed edit is also pre-existing. |
| Gap 1: no automated real-database profile-list migration test | medium | Existing tests do not detect omission of the completion migration at the live list boundary. This predates the operational reset and is deferred rather than expanding a database repair into test development. |
| Gap 2: no automated assertion for seeded external scopes | medium | Current data was verified directly for all three external accounts, but the seed path lacks persistent regression coverage. This pre-existing user seed change is deferred. |

## Verification

**Commands:**
- `npx prisma migrate reset --force --schema apps/api/prisma/schema.prisma` -- expected: `docmansystem` reset and all repository migrations applied.
- `npm run prisma:seed` -- expected: current seed completes successfully.
- `npx prisma migrate status --schema apps/api/prisma/schema.prisma` -- expected: database schema is up to date.
- Read-only schema query -- expected: `researcher_profiles.profile_type` and its constraint exist.
- Researcher-profile list request or browser reload -- expected: no Prisma `P2022` for `profile_type`.
- `git status --short --branch` -- expected: only the pre-existing seed modification and ahead commit remain.
