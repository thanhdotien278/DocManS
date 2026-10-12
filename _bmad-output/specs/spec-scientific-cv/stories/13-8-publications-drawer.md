---
title: 'Story 13.8 — CV publications list with add/edit Drawer'
type: 'feature'
created: '2026-10-12'
status: 'done'
baseline_commit: 'dad923f45f1e5e0600b860f28dde25510f5fa2dd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/stories/13-4-research-experience-and-achievements.md'
  - '{project-root}/docs/ux-ui-spec.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tab 4 "Công bố khoa học" is a 9-column inline-editable table that is hard to scan and edit; secondary fields crowd the main view, and there is no separate Type field.

**Approach:** Replace it with a read-only list (Tên công bố, Tác giả, Năm, Loại, Tạp chí/Hội nghị, DOI, Minh chứng, Thao tác) plus one right-side Drawer form for add and edit, built on the house `Dialog` (`form-dialog`). Add a nullable `publicationType` column.

Decisions (user, 2026-10-12):
- **Evidence = existing `proofUrl` link** (field in Drawer, "Xem" link in list). Real file upload/preview/download is deferred (`deferred-work.md`): the files API supports only proposals/projects and a new publication has no id until the CV PATCH. Requirement "evidence upload" is therefore only partly met.
- **New `publicationType`** (nullable text, migration, DTO, contract). Type options: Bài báo khoa học, Báo cáo hội nghị, Sách/Chuyên khảo, Khác. `classification` keeps its 13.4 options and stored values.
- **Authors (user, 2026-10-12):** the list has a Tác giả column showing each author as a bubble. In the Drawer, Tác giả is a tag input: typing a comma (or Enter/blur) turns the typed name into a bubble; Backspace on empty input or the bubble's × removes it. Stored unchanged as the existing `authors` string, names joined by ", " (no schema change); legacy values are split on commas/semicolons for display.
- **Drawer "Lưu" applies to the in-page draft only**; the existing "Lưu lý lịch khoa học" PATCH commits it (single save, one contextVersion).

## Boundaries & Constraints

**Always:**
- List shows ACTIVE draft rows only; INACTIVE pass-through, "send only if changed" and hard-delete-by-omission in `cv-workspace.tsx`/service stay as in 13.4.
- Drawer fields: Tên công bố * (only required field), Loại công bố, Năm công bố (year dropdown as 13.3), Tạp chí/Hội nghị/NXB, Tác giả (bubble tag input), ISSN/ISBN, DOI, Phân loại, Minh chứng (URL), Ghi chú. Saved rows lacking year/venue stay editable.
- Delete uses an accessible confirmation `Dialog` opened from the row (not inside the Drawer) and says the row is removed when the CV is saved.
- Drawer: focus trap, Escape/X/Hủy close, labelled title, focus returns to the opener, inline "discard changes?" prompt when dirty, inline field errors with `aria-describedby`.
- Without edit permission the list and links render, with no Add/Edit/Delete. Evidence and DOI links use `target="_blank" rel="noopener noreferrer"`, never embedded.
- Add button sits in the section header; row Edit/Delete are compact icon buttons with `aria-label`; table scrolls horizontally on narrow screens and the Drawer is full width on mobile.

**Never:** change `CvRowTable` or the IP/awards/projects sections, the files API, other tabs, or the print layout.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Add | Fill title, Lưu in Drawer | Row appended to list, banner "chưa lưu" active; CV save persists incl. `publicationType` | N/A |
| Edit | Open row, change year, Lưu | That row updated in draft only | N/A |
| Blank title | Lưu with empty title | Drawer stays open, error under title | client |
| Bad URL | proofUrl "abc" | Server 400 `publications.N.proofUrl` shown above list; draft kept | API 400 |
| Authors | Type "A. Nguyễn," then "B. Trần" + Enter | Two bubbles; saved as "A. Nguyễn, B. Trần"; list shows two bubbles | Duplicates/blank ignored |
| Delete | Confirm in dialog | Row leaves list; hard-deleted on CV save | Cancel keeps row |
| Legacy row | No type, old classification | Shows "—" / old value; editable | N/A |
| Read-only viewer | No `cv.update` | List + links only | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/researcher-profiles/scientific-cv/cv-research-tab.tsx` -- publications `CvRowTable` (lines ~42-60) swapped for the new section; `years`, `classifications`, `replaceRow` live here.
- `scientific-cv/cv-publications-section.tsx` (new) -- list, Drawer form, delete confirm; props `rows`, `editable`, `error`, `onChange(rows)`.
- `apps/web/src/components/ui/dialog.tsx` + `globals.css` `.form-dialog` (right-aligned) -- reuse; add narrow-screen/Drawer width rules only.
- `scientific-cv/cv-workspace.tsx:57,243,290` -- draft, title validation, changed-only PATCH; keep logic, `publicationType` rides along.
- `apps/api/prisma/schema.prisma:273`, new migration after `20261012000000_hvqy_organization_units` -- `publication_type TEXT`.
- `researcher-profiles.dto.ts:25,207`, `researcher-profiles.service.ts:46,568`, `apps/web/src/lib/researcher-profiles-api.ts:6` -- add `publicationType`.
- `cv-print-tab.tsx:146` -- unchanged.
- Docs: `cv-data-contract.md:33,39`, `SPEC.md:64`, `docs/contracts/researcher-profile-access.md:56`, `docs/ux-ui-spec.md` (CV publications entry), `docs/ux-design-guidelines.md` if a drawer rule is needed.
- Tests: `tests/researcher-profiles.test.mjs:~380-437`, `tests/researcher-profiles-ui-source.test.mjs:~116-140`.

## Tasks & Acceptance

**Execution:**
- [x] Docs above -- update first (publicationType, Drawer UX, evidence-as-link, deferred upload).
- [x] `schema.prisma` + migration + `dto.ts` + `service.ts` + `researcher-profiles-api.ts` -- `publicationType`.
- [x] `cv-publications-section.tsx` (new), `cv-research-tab.tsx`, `globals.css` -- list, Drawer, delete dialog, responsive.
- [x] Extend the two existing test files only: type persisted/round-trip; Tab 4 renders the list, no inline inputs, Add/Edit hidden when read-only.

**Acceptance Criteria:**
- Given the owner on Tab 4, when they add and edit a publication in the Drawer and save the CV, then a reload shows the same rows with Type.
- Given a viewer without `researcher-profile.cv.update`, then no Add/Edit/Delete controls appear.

## Implementation Notes

- Backend: nullable `publication_type` (migration `20261012010000_cv_publication_type`), DTO/service/API type carry it as free text (options are UI-only, like `classification`). New `cv-publications-section.tsx` replaces the publications `CvRowTable`; `CvRowTable` and the other three sections are untouched. Drawer uses the house `Dialog`; delete confirm is a second `Dialog` opened from the row. Authors are stored as the existing `authors` string joined by ", "; legacy values are split on `,`/`;` and de-duplicated when the Drawer opens.
- Verification: `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` 24/24; `npm run typecheck` clean. Real-app check (seed researcher on :3000, API :4000 with the migration applied): blank-title block, add with author bubbles, CV save and reload round-trip incl. publicationType, edit prefill, discard prompt, delete confirm and save, 375px full-width Drawer without horizontal scroll, no nested forms. Not run: keyboard-only pass, upload (deferred).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | edge | Drawer `<form>` is nested in the workspace form; its submit bubbles and the CV PATCH fires on every Lưu | high | patch — first `stopPropagation`; the real-app run still showed a hydration error and a page reload from the nested `<form>`, so the Drawer now has no `<form>` (Lưu is a button; Enter in single-line fields submits) |
| 2 | edge | After delete the opener row is gone, focus drops to body | medium | patch — focus the Add button after delete |
| 3 | edge | Legacy duplicate authors give duplicate bubbles/keys | low | patch — de-duplicate in `formOf` |
| 4 | edge | Backspace during IME composition can remove a bubble | low | patch — `isComposing` guard |
| 5 | blind | Discard prompt sits below the fold on mobile | medium | patch — moved to the top of the form |
| 6 | verif-gap | `javascript:` DOI/proofUrl fallback unpinned | medium | patch — one negative render assertion |
| 7 | verif-gap, edge | Drawer submit/authors/delete have no executing test | medium | defer — needs a DOM harness; logged in deferred-work.md |
| 8 | blind | List shows no Phân loại, `publicationType` not printed in BM-06 | low | reject — user chose the columns; print is out of scope; value stays in the Drawer |
| 9 | blind, edge | Legacy authors re-joined on first Lưu; names with commas unsupported | low | reject — requested comma-to-bubble behaviour, stated in spec |
| 10 | edge | No client URL/length/200-row guard | low | reject — spec routes bad URL to the server banner; guards add complexity |
| 11 | blind | Dialog reuses `cv-cropper-dialog` class, index-based `deleting`, duplicate Escape handler, stale `years`, duplicated constants | low | reject — cosmetic, no named harm |
| 12 | blind | `publicationType` not validated against options | low | reject — same free-text convention as `classification` |
| 13 | edge | `editable` flipping during save while Drawer open | low | reject — modal blocks the save button |
| 14 | blind | Tracking inconsistent (sprint-status, task boxes) | low | patch — synced at completion |

## Verification

**Commands:**
- `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` -- pass.
- `npm run typecheck` -- no errors.

**Manual checks:**
- Real app: add, edit, delete, reload; keyboard-only Drawer use; 375px width.
