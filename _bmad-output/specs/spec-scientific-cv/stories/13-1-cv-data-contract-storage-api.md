---
title: 'Story 13.1 — CV data contract, storage and API'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_commit: '43b2154c740b0851431ada348a87918768b5d7af'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

> Role names and decision rights here predate the 10-role model (2026-10-18); see `docs/permission-matrix.md`.

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Researcher profiles have no scientific CV (BM-06). Stories 13.2–13.7 need a validated, versioned, access-controlled CV document behind the existing profile API.

**Approach:** Add nullable JSONB `curriculum_vitae` to `researcher_profiles` (new migration) validated by a strict server pipe against `cv-data-contract.md`; read/write it through existing `/my-profile` and `/:id` endpoints under new actions; redact sensitive fields in audit/history.

Decisions (2026-10-11, user):
- Tab 4 publications stay in `researcher_profile_publications`; the same migration adds nullable `issn_isbn`, `classification`, `proof_url` and the publication pipe accepts them. The CV's `researchExperience` has only `intellectualProperty`, `awards`, `projects`; `researchExperience.publications` is rejected.
- No encryption at rest; redaction in projections/audit/history only.

## Boundaries & Constraints

**Always:**
- New actions `researcher-profile.cv.read`, `researcher-profile.cv.update`, registered in `researcher-profile-access.ts`, `packages/permissions/src/index.ts` + `index.js`, and `docs/contracts/researcher-profile-access.md`. Granted to the owner (ACTIVE profile linked to actor) and to the 3 manager roles with exact org scope only.
- `curriculumVitae` appears in the profile response only when `cv.read` is allowed; absent CV reads as `{ cvSchemaVersion: 1 }`.
- `PATCH` replaces the whole CV document; it bumps `aggregateVersion` through the existing optimistic-lock path (stale → 409 `CONTEXT_VERSION_MISMATCH`).
- Validation: unknown keys rejected at every level; field-level 400 errors with dotted paths (`curriculumVitae.educationHistory.0.major`); contract limits (≤200 rows/list, strings ≤1000, notes/summary ≤4000, document ≤256 KB, years 1900–2100, graduation 1950–2100, ISO dates); `workHistory` must be an object; if `personalInfo` is present its required fields (scientistType, gender, idNumber, organization, shareDataAgreement) are enforced; required row fields per contract.
- `scientistType` (`DOMESTIC`|`FOREIGN`) cannot change once stored while the profile has a linked account (400 on that field).
- Audit and history facts carry the CV with sensitive fields removed, plus `cvChanges: [{ section, field, changed: true }]` for every changed CV field (top-level personalInfo fields individually; other sections by section name). Audit failure rolls back.
- History for owners (`listHistory` personal filter) passes `curriculumVitae` and `cvChanges` through.

**Never:**
- Edit existing migrations; copy the review repo's passthrough object validation; write sensitive values (bankAccount, bankName, bankBranch, idNumber, idIssueDate, idIssuePlace, smartCaSerial, shareDataAgreement, avatarUrl) to audit/history/list/search/duplicate/candidate projections.
- Change reviewer/council eligibility, candidate queries, or the seven-role model; build UI (13.2+).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty CV read | profile with null column | `curriculumVitae: { cvSchemaVersion: 1 }` | N/A |
| Valid save | owner PATCH my-profile with full CV | saved, version +1, response returns CV | N/A |
| Unknown key | `personalInfo.foo` | 400, field `curriculumVitae.personalInfo.foo` | nothing saved |
| Legacy shape | `workHistory: []` | 400 on `curriculumVitae.workHistory` | nothing saved |
| Missing row field | education row without `major` | 400 on that row path | nothing saved |
| Stale version | old contextVersion | 409 `CONTEXT_VERSION_MISMATCH` | nothing saved |
| Sensitive edit | bankAccount changed | facts contain `{section:"personalInfo",field:"bankAccount",changed:true}`, no value | N/A |
| Out of scope | staff of other org GET `/:id` | 403 (existing) | no CV data |
| Leadership role | PATCH `/:id` with CV | 403 | nothing saved |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma:209` -- `ResearcherProfile`; add `curriculumVitae Json? @map("curriculum_vitae")`. `:273` `ResearcherProfilePublication`; add `issnIsbn`, `classification`, `proofUrl` (nullable String).
- `apps/api/prisma/migrations/` -- add `20261011000000_researcher_scientific_cv/migration.sql` (ALTER TABLE only).
- `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` -- reuse `invalid`/`text`/`optionalDate`/`record` style; add `curriculumVitae` validator + types; accept it in `updateResearcherProfilePipe` and the `updateMyProfilePipe` allow-list; extend `publication()` with the 3 new fields. Field errors may need a helper that takes a path.
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts` -- `ProfileWithRelations` (+curriculumVitae, publication fields); `updateData` (write CV); `updateProfile` (require `cv.update` when CV present); `updateMyProfile` `safeInput` (pass CV); `auditFacts` (redacted CV); add cvChanges diff into history/audit afterFacts; `listHistory` personal whitelist; `toResponse` (CV gated on cv.read); `publicationCreateData` (+3 fields). `listProfiles`/`findDuplicateCandidates` already project explicit fields — keep.
- `apps/api/src/researcher-profiles/researcher-profile-access.ts` -- add actions; owner grant list alongside `history.read`.
- `packages/permissions/src/index.ts:73`, `index.js:70` -- register actions.
- `docs/contracts/researcher-profile-access.md` -- document actions, CV contract pointer, redaction (sections "API contract", "Audit and privacy").
- `tests/researcher-profiles.test.mjs` -- extend existing describe; has fake Prisma and `profile()` fixture.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` + new migration -- add CV column and publication columns -- storage.
- [x] `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` -- strict CV validator, publication fields -- CAP-5.
- [x] `apps/api/src/researcher-profiles/researcher-profile-access.ts`, `packages/permissions/src/index.{ts,js}`, `docs/contracts/researcher-profile-access.md` -- new actions -- access constraint.
- [x] `apps/api/src/researcher-profiles/researcher-profiles.service.ts` -- persist, gate, redact, diff -- CAP-5/CAP-6.
- [x] `tests/researcher-profiles.test.mjs` -- cover every I/O matrix row (empty read, valid save, unknown key, legacy workHistory array, missing row field with path, stale 409, sensitive edit → redacted facts + cvChanges, out-of-scope 403, leadership 403) plus projection granting cv actions to owner/scoped staff only; prefer table-driven cases inside the existing describe.

**Acceptance Criteria:**
- Given a manager with exact scope, when GET `/:id`, then response includes `curriculumVitae` and `viewerAuthorization.allowedActions` includes both cv actions.
- Given `listProfiles`, when called, then rows contain no `curriculumVitae`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | blind, edge | publicationYear narrowed to 1900–2100 breaks re-save of legacy rows | medium | patch — panel re-sends all publications; restore 1800–2200 |
| 2 | blind | avatarUrl/proofUrl accept javascript:/data: | medium | patch — rendered as href/src in 13.2+; restrict to http(s) or /path |
| 3 | blind | cvEnum skips NFC so NFD "Nữ" rejected | low | patch — direct one-line correction |
| 4 | vgap, blind | scientistType lock untested on updateMyProfile | medium | patch — extend existing lock test |
| 5 | blind, edge, vgap | express imported but undeclared dependency | low | defer — resolves via @nestjs/platform-express today; declaring it changes lockfile |
| 6 | vgap | 4 MB body limit not covered by HTTP test | medium (unverified) | defer — no HTTP harness in repo |
| 7 | blind | 4 MB below theoretical worst case | low | reject — needs ~200 maximal Vietnamese rows; unlikely |
| 8 | blind | CV null branches dead / cannot clear CV | low | reject — whole-doc replace with empty `{cvSchemaVersion:1}` clears it |
| 9 | blind | lock error when PATCH omits personalInfo | low | reject — removing stored type is a change; message accurate enough |
| 10 | edge | linked profile with no stored type can set any type first | false | spec: lock applies "once stored" |
| 11 | edge | create pipe silently drops curriculumVitae | low | reject — create pipe ignores unknown keys pre-existing |
| 12 | edge | birth/issue date range, award endYear<awardYear | low | reject — not in contract; unlikely |
| 13 | edge | full CV returned to cv.read holders | false | spec: owner + scoped managers see sensitive fields; redaction is for audit/list |
| 14 | blind | web Publication type lacks new fields / `?? null` on omit | low | reject — UI is 13.4 scope; `?? null` matches existing field pattern |
| 15 | blind | birthDate etc. kept in audit | false | matches contract redaction classes |
| 16 | blind | no-op save writes history | low | reject — pre-existing behavior for all profile updates |
| 17 | blind | leadership test doesn't reach cv.update check | low | reject — grants identical today; no reachable regression |

## Verification

**Commands:**
- `npm run prisma:generate && npm run typecheck` -- expected: no errors
- `npm run build:api && node --test tests/researcher-profiles.test.mjs` -- expected: all pass
