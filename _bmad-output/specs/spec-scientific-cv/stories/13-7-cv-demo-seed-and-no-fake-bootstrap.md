---
title: 'Story 13.7 — CV demo seed and no fabricated bootstrap'
type: 'feature'
created: '2026-10-12'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No seeded account has a scientific CV, so the CV tabs cannot be demoed or exercised against the real contract (CAP-7). The review repo's `ensureProfileForResearcher` invented personal data on first `/my-profile` access, and that defect must not be ported.

**Approach:** Store one demo CV as a JSON file next to `apps/api/prisma/seed.mjs` (loaded like `hvqy-organization-units.json`). After the profile-create loop, the seed writes it to the demo researcher `patuan` (`profile-user-pi`), but only when that profile's `curriculumVitae` is null. It reads first, then updates, and bumps `aggregateVersion`. In the same guarded step it fills the Tab 1 required profile columns that are still null (`contactEmail` and its key), so saving with no edits is not blocked. User edits are never overwritten, and a second run changes nothing.

Rules for the JSON:
- `cvSchemaVersion: 1`
- `personalInfo` with languages
- `educationHistory` with `startYear` and exact enum strings
- `workHistory` as `{summary, items}`
- `researchExperience` containing only `intellectualProperty` and `awards`
- no `scientistType`, `thesisTitle` or `avatarUrl`
- sensitive values are obviously demo values

Decision (user, 2026-10-12): proceed before 13-4. Publications and projects are not seeded into the CV while 13-4's single-store question is open, so "all five tabs" is partial for Tab 4 until 13-4.

Bootstrap: `getMyProfile` and `updateMyProfile` already return 403 for an account without an ACTIVE linked profile and write nothing. Nothing on the web (load is read-only) or in auth/admin creates a profile on first access. Verified, no code change; lock it with one regression assertion.

Tests, in `tests/researcher-profiles.test.mjs`:
- Run the demo JSON through the real `updateMyProfilePipe` and `deepEqual` the parsed `curriculumVitae` against the JSON, so a dropped key fails.
- Extend the existing denial test: a user with no linked profile calling `getMyProfile` or `updateMyProfile` gets `ForbiddenException`, and the store records no profile, audit, or history writes.

</frozen-after-approval>

## Implementation Notes


- Deviation (user, 2026-10-13): the demo CVs target `int2` (`profile-user-researcher2`, INTERNAL) and `ex1` (`profile-user-external1`, EXTERNAL) instead of `patuan`. The frozen Intent above is unchanged.
- `apps/api/prisma/demo-cvs.json` holds one entry per profile id: `contactEmail` and `curriculumVitae` (Tab 1–3 plus `intellectualProperty` and `awards`; no publications or projects, pending 13-4). Sensitive values are `DEMO-*`; emails are `*.demo@example.invalid`.
- `seed.mjs` writes an entry only while that profile's `curriculumVitae` is null, fills `contactEmail` only when null, and bumps `aggregateVersion`. Verified against the local DB: first run wrote both, second run changed nothing.
- Tests in `tests/researcher-profiles.test.mjs`: demo JSON round-trips through `updateMyProfilePipe` unchanged; the existing denial test now also asserts `getMyProfile`/`updateMyProfile` for an unlinked account return 403 with no profile, history or audit writes.
