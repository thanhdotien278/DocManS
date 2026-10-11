---
title: 'Story 13.4 — CV research experience and achievements tab'
type: 'feature'
created: '2026-10-12'
status: 'done'
baseline_commit: '23903522a83df81b61c604dbbf17034eb0801fbc'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tab 4 "Kinh nghiệm & Thành tích nghiên cứu" of the CV workspace is a placeholder, so researchers cannot record publications, intellectual property, awards or projects (CAP-3), and owners lost publication editing when 13.2 replaced the old form.

**Approach:** Replace the placeholder with four `CvRowTable` sections saved by the existing single "Lưu lý lịch khoa học" PATCH, each datum in exactly one store, with client and server row errors surfacing on Tab 4.

Decisions (user, 2026-10-12):
- **Projects are CV-only** (`curriculumVitae.researchExperience.projects`, already validated since 13.1; no migration). Below the projects table, Tab 4 shows the profile's non-SUPERSEDED `participations` read-only (title, role, level, dates, status: ACTIVE = Đang tham gia, INACTIVE = Đã kết thúc) with a neutral note that they are already declared in the researcher profile and must not be re-entered (no claim that Phòng QLKH recorded or verified them). _(Amended by user 2026-10-12 after review: ended participations are INACTIVE per the access contract, and all rows are self-reported.)_
- **Publications stay in `researcher_profile_publications`** (13.1). "Xóa" on a saved publication **hard-deletes** it: when a PATCH carries `publications`, that array is the profile's full list and saved rows whose id is absent are deleted in the same transaction. INACTIVE rows are not shown on Tab 4 but are sent back unchanged so they survive.
- **Option lists** (stored as free text; an unknown stored value still displays): publication classification = ISI/Scopus, Quốc tế khác, Trong nước (HĐGSNN), Báo cáo hội nghị, Sách/Chuyên khảo, Khác; project role = Chủ nhiệm, Thư ký, Thành viên chính, Thành viên; project status = Đang thực hiện, Đã nghiệm thu, Tạm dừng; year columns = dropdown current year → 1950 as in 13.3.

## Boundaries & Constraints

**Always:**
- Columns — Publications: Tác giả, Năm công bố, Tên công trình / Bài báo *, Tạp chí / NXB (`venue`), ISSN/ISBN, DOI, Phân loại, Minh chứng (`proofUrl`), Ghi chú. Intellectual property: Tên văn bằng / Sáng chế *, Tác giả, Năm cấp, Số bằng, Cơ quan cấp, Minh chứng, Ghi chú. Awards: Tên giải thưởng / Danh hiệu *, Năm, Đến năm (`endYear`), Cơ quan trao tặng, Minh chứng, Ghi chú. Projects: Tên nhiệm vụ, Chương trình *, Cơ quan quản lý, Mã số, Vai trò *, Thời gian (`period`, text e.g. "2020 - 2023"), Tình trạng, Ghi chú.
- Client blocks save when a row lacks its required field(s); the message sits above that section's table. Error keys `publications`, `intellectualProperty`, `awards`, `projects` map to the `research` tab in `errorTabsOf`/`tabLabels`, so the existing "Chưa lưu… Đi tới 4. Kinh nghiệm & Thành tích nghiên cứu" banner works.
- Server publication errors carry the row path `publications.<index>.<field>`; `apiField` maps `publications…` and `curriculumVitae.researchExperience.<section>…` to the section key (never to Tab 1's `title`).
- `publications` is sent only when the draft differs from the loaded list; `researchExperience` follows the 13.3 null-vs-delete convention in `cvFromDraft`.
- Tab 4 badge counts draft rows: active publications + IP + awards + projects.

**Never:** change the manager panel, participation storage/supersede logic, reviewer/council eligibility, or the migration set; add a publications delete endpoint.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Round trip | Add 1 row in each section, save, reload | All rows return; IP/awards/projects in entry order, publications in the API's year-desc/title order (accepted by user 2026-10-12); publication in `researcher_profile_publications`, others in CV JSON | N/A |
| Delete saved publication | Saved A, B; remove A, save | A deleted from DB; B kept; audit before/after facts list the change | N/A |
| INACTIVE survives | Saved INACTIVE C not shown; save Tab 4 | C still in DB | N/A |
| Blank required | Project row without role | No PATCH; banner names tab 4; error above projects | client |
| Server row error | Publication `proofUrl` "abc" | 400 `publications.0.proofUrl` shown on Tab 4 | API 400 |
| Foreign id | `publications[].id` of another profile | 404, nothing deleted | transaction rollback |

</frozen-after-approval>

## Code Map

- `apps/api/src/researcher-profiles/researcher-profiles.service.ts:602` `syncPublications` -- creates/updates by id only; add delete of profile rows whose id is not in `inputs` (only when `inputs` is defined). Audit facts already serialize publications (:650).
- `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` -- `publications()` (~187)/`publication()` (~203) raise bare field names (`title`, `publicationYear`, `status`); prefix them with `publications.<index>.` (proofUrl already does). `cvResearchExperience` (~466) already validates IP/awards/projects. `updateMyProfilePipe` (~561) already allows `publications`.
- `apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx` -- `CvDraft`, `draftFromProfile`, `cvFromDraft`, `apiField`, `tabLabels`, `errorTabsOf`, `validate`, `save`, `researchCount`, research `PlaceholderTab`.
- `scientific-cv/cv-history-tabs.tsx` -- pattern to copy (`replaceRow`, `removeRow`, `years`); new `scientific-cv/cv-research-tab.tsx` beside it.
- `scientific-cv/cv-row-table.tsx` -- reuse as is.
- `apps/web/src/lib/researcher-profiles-api.ts` -- `Publication`, `Participation`, CV types already present.
- No module outside `researcher-profiles/` reads profile publications/participations.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` -- row-path publication errors.
- [x] `apps/api/src/researcher-profiles/researcher-profiles.service.ts` -- full-list delete in `syncPublications`.
- [x] `apps/web/src/components/researcher-profiles/scientific-cv/cv-research-tab.tsx` (new) + `cv-workspace.tsx` -- Tab 4 sections, read-only participations, draft state, validation, error mapping, badge.
- [x] `tests/researcher-profiles.test.mjs` -- extend the publication test (~415): delete-by-omission, INACTIVE kept, foreign id 404, `publications.0.title` path. `tests/researcher-profiles-ui-source.test.mjs` -- extend for Tab 4 wiring.
- [x] `_bmad-output/specs/spec-scientific-cv/cv-data-contract.md` + `SPEC.md` -- replace "storage per story 13.4" and the Assumptions line with the decisions above.

**Acceptance Criteria:**
- Given the owner on `/my-profile`, when they fill Tab 4 and save, then a reload shows the same rows and the old placeholder is gone.
- Given a viewer without `researcher-profile.cv.update`, when they open Tab 4, then all tables are read-only.

## Implementation Notes

- Implemented Tab 4 as four CvRowTable sections with required-row client validation, draft counts, server errors routed to the research tab, and read-only non-SUPERSEDED profile participations (including INACTIVE, with status). Publications are sent only when their draft changes, with hidden INACTIVE rows carried through unchanged; IP/awards/projects follow the existing absent-vs-empty JSON convention.
- Publication DTO errors now include row paths. syncPublications deletes omitted rows only for a supplied full list, after processing retained/new rows in the existing transaction; audit before/after facts include deletions. No manager panel, participation logic, migrations, eligibility, or other-agent files changed.
- Extended existing API tests for four-section save/read, delete-by-omission, INACTIVE preservation, empty-list deletion, omitted-list preservation, foreign-id rollback, audit facts, and dotted publication errors. Extended the existing UI test for Tab 4 wiring and actual static React rendering of read-only controls, legacy option values, errors, and ACTIVE participation filtering.
- Verification: `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` passed (23/23); `npm run typecheck` passed; `git diff --check` passed. Regression checks against the pre-fix compiled DTO/service failed for the intended title-path and omitted-publication deletion reasons; current compiled files were restored. No command was blocked by sandbox.
- Status PARTIAL: the existing API orders publications by publicationYear descending/title ascending, so arbitrary publication draft insertion order is not preserved on reload. No publication order field exists; changing this storage contract is outside the approved no-migration scope. IP/award/project arrays retain JSON order. Assumption: keep the existing publication sort until this contract conflict is resolved.
- Manual signed-in browser add/remove/save/reload and real PostgreSQL integration checks were not run; API persistence/rollback checks use the existing in-memory Prisma fixture, and static React rendering does not prove browser interactions.


- Orchestrator verification (2026-10-12): build + 23/23 story tests + typecheck pass; real app (patuan, fresh API on :4001): blank project row blocked with no PATCH; publication (whitespace-only authors) + project saved and reloaded with badge 2; removing both and saving hard-deleted the publication and left `projects: []`. Publication-order and participations-filter conflicts resolved by the user (see frozen block / triage). INACTIVE-survives row checked in the real app: an INACTIVE publication seeded via PATCH stayed hidden on Tab 4 (badge 0) and still existed after adding and saving an ACTIVE publication from the UI; test rows cleaned up. Full `tests/*.test.mjs` has 54 failures in suites this diff does not touch (proposals, admin, files, one CV-type assertion in `docmans-ux-migration` that reads an untouched file); not re-run against the baseline.

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | edge, blind | Read-only participations hide INACTIVE (ended) rows; note claims Phòng QLKH recorded self-reported rows | medium | intent_gap → user amended frozen block (show non-SUPERSEDED + status, neutral note); patched in place at user's request instead of revert |
| 2 | codex | Matrix "in order" vs API publication sort (year desc, title) | low | intent_gap → user accepted existing sort; matrix row amended |
| 3 | edge | Whitespace-only optional publication field → opaque 400 | low | patch — send `draft.publications.map(compactRow)` |
| 4 | edge | `docs/contracts/researcher-profile-access.md` still says no hard delete | medium | patch — contract doc updated |
| 5 | blind | Stray blank lines in new UI test | low | patch |
| 6 | verif-gap, blind | INACTIVE re-append, `cvFromDraft` researchExperience assembly, `apiField`/`errorTabsOf` routing only regex-tested | medium (verified gap) | defer — needs a workspace render/save harness; AGENTS.md forbids test-only exports |
| 7 | edge | Server deletes omitted INACTIVE rows; preservation is client-only | low | reject — frozen intent defines full-list semantics; manager panel always sends all rows |
| 8 | blind | Every publication row's `updatedById/updatedAt` rewritten on save, incl. hidden rows | low | defer — pre-existing `syncPublications` update-all behaviour (panel did the same) |
| 9 | blind | Hidden INACTIVE row failing validation blocks save | maybe-false | reject — validation limits unchanged from 13.1, rows were saved under them; would be low |
| 10 | blind, edge | Award `endYear` < `awardYear` accepted | low | reject — rare; fix adds a guard not in contract |
| 11 | blind | No warning that "Xóa" on saved publication hard-deletes | low | reject — user chose hard delete; save is the explicit commit |
| 12 | blind | `years`/`levels` constants duplicated | low | reject — cosmetic |
| 13 | blind | Server-managed fields echoed in publication payload | low | reject — DTO ignores them; no named harm |
| 14 | blind | `errorTabsOf` lists research keys twice | low | reject — cosmetic |
| 15 | edge | 404 with no field errors gives no tab link | low | reject — only stale/foreign ids; contextVersion guards stale |
| 16 | edge | `curriculumVitae.researchExperience` root errors map to general | low | reject — client always sends an object; rare |

## Verification

**Commands:**
- `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` -- all pass.
- `npm run typecheck` -- no errors.

**Manual checks:**
- Real app as a researcher: add/remove rows in all four sections, delete a saved publication, reload.
