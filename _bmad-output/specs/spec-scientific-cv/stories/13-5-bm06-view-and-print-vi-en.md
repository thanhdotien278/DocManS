---
title: 'Story 13.5 — BM-06 view and print (VI/EN)'
type: 'feature'
created: '2026-10-12'
status: 'done'
baseline_commit: 'aebd354f6381ba02b0fa631583ec57b5cfbde9b8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tab 5 "Xem & In Lý lịch khoa học" is a placeholder, so owners and scoped managers cannot view or print the CV as an A4 BM-06 document in Vietnamese or English (CAP-4, epics.md Story 13.5).

**Approach:** Port the review repo's BM-06 print layout (`DocManS-review/.../researcher-profiles-panel.tsx:1722-2300`, CSS `themes/science-profile.css:176-350,463-500`) as one data-driven component with a VI/EN label table, rendered from the saved `profile` (never the draft), plus a print stylesheet that prints only the A4 paper.

Decisions (planning, 2026-10-12):
- Sensitive fields: ID number/issue date/place, bank account/name/branch and SmartCA serial are printed when present — epics.md 13.5 AC requires "ngân hàng/SmartCA"; viewers are already limited to owner + scoped managers by `researcher-profile.cv.read`.
- Missing data prints "—" consistently (epics AC "thiếu dữ liệu hiển thị trống nhất quán"). Do NOT port the review's invented fallbacks ("Học viện Quân y", gender "Nam", "Việt Nam", "Chính quy", "Cục Sở hữu trí tuệ", "Sử dụng tốt"/"Fluent", "Đã nghiệm thu").
- English layout covers every section the Vietnamese one does (the review's EN dropped IP, awards, note). Data values are printed as stored (not translated); only labels/titles change.

## Boundaries & Constraints

**Always:**
- Sections: header (MẪU BM-06 / FORM BM-06 mark, national motto, title), I general info with 3x4 photo box (`personalInfo.avatarUrl`, else empty box), II education (degree, major, institution, start–graduation year, training mode), III work summary + items, IV.1 ACTIVE publications (authors, year, title, venue, ISSN/ISBN + DOI, classification, proof URL), IV.2 intellectual property, IV.3 awards (year–endYear), IV.4 CV `projects` then non-SUPERSEDED participations (level labels and ACTIVE = Đang tham gia / INACTIVE = Đã kết thúc as Tab 4), V note (only when present), VI commitment, signature blocks with full name.
- General info: full name (upper case), birth date/gender/birthplace/nationality, ID + issue date/place, military rank/position, academic rank/degree/title (EN also `englishAcademicTitle`), organization (`personalInfo.organization`, else `externalAffiliation`, else `managementOrganization.name`), address, phone/email, research fields, keywords, languages, bank + SmartCA row only when present.
- ISO dates are formatted by splitting the string (`YYYY-MM-DD` → `DD/MM/YYYY`), never `new Date()`.
- A `.no-print` note says the view shows saved data; when the draft differs from the saved profile it also says unsaved edits are not shown.
- Without `researcher-profile.cv.read` (no `curriculumVitae` in the payload) Tab 5 shows a message and no CV content.
- Print: only the paper prints, A4 portrait via a named page (`page: cv` / `@page cv`), app chrome, tabs, buttons, messages and save row hidden; on screen the paper scrolls horizontally inside its container on narrow viewports.

**Never:** change the API, permissions, or the manager panel's existing "preview" tab and `.profile-print-preview` rules; add a bare `@page` rule; add server-side PDF; port `science-profile.css` or inline styles wholesale.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Saved only | Saved name "A", draft edited to "B" | Paper shows "A"; unsaved-edits note shown | N/A |
| Toggle EN | Click English | Labels/titles English, same data, IP/awards present | N/A |
| Empty CV | `{cvSchemaVersion: 1}` | All sections render with "—" / empty-section line, no invented values | N/A |
| No cv.read | Payload lacks `curriculumVitae` | Message, no CV fields | N/A |
| Print | `window.print()` | Only A4 paper printed | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx` -- `tab === "print"` renders `PlaceholderTab`; replace with `<CvPrintTab profile={profile} catalogs={catalogs} dirty={...} />`, delete `PlaceholderTab`. Dirty = `JSON.stringify(draft) !== JSON.stringify(draftFromProfile(profile))`. Header "Xem & In" button already switches tab.
- `scientific-cv/cv-research-tab.tsx:26` `levels` -- export and reuse in the print tab.
- New `scientific-cv/cv-print-tab.tsx` -- `CvPrintTab`, VI/EN toggle (`useState`), print button (`window.print()`), label table, section tables.
- `apps/web/src/lib/researcher-profiles-api.ts` -- `ResearcherProfile`, CV types (reuse; research fields via `profile.researchFields`, rank/degree via `profile.academicRank/academicDegree`).
- `apps/web/src/app/globals.css` -- add `.cv-print*`/`.cv-paper*` screen rules after `.cv-workspace` (~2081) and a `body:has(.cv-paper)` print block modelled on the `.profile-print-preview` block (~2100); existing global print rules already hide `button`/`.button`/`.section-header` and strip `.section-card`.
- API needs no change: GET returns `curriculumVitae` (incl. avatarUrl) only with `researcher-profile.cv.read` (`researcher-profiles.service.ts:726`); 13.1 tests already cover the denial.
- `tests/researcher-profiles-ui-source.test.mjs` -- `loadFixture` + `renderToStaticMarkup` pattern (~133); stub `react.useState` to render EN.

## Tasks & Acceptance

**Execution:**
- [x] `scientific-cv/cv-print-tab.tsx` (new) + `cv-research-tab.tsx` (export `levels`) -- BM-06 VI/EN layout from saved profile.
- [x] `scientific-cv/cv-workspace.tsx` -- wire Tab 5, dirty note input, remove placeholder.
- [x] `apps/web/src/app/globals.css` -- paper screen styles + A4 print block.
- [x] `tests/researcher-profiles-ui-source.test.mjs` -- one `it`: render VI (MẪU BM-06, saved values, ACTIVE-only publications, "—" without invented defaults, bank/SmartCA), render EN (FORM BM-06, IP + awards present), no-cv.read message; workspace passes `profile` to `CvPrintTab`.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 13-5 line only.

**Acceptance Criteria:**
- Given an owner with a saved CV, when they open Tab 5, then the A4 paper shows all sections with the 3x4 photo and the "MẪU BM-06" mark.
- Given a scoped manager on the manager panel CV tab, when they open Tab 5, then they see the same paper.

## Verification

**Commands:**
- `node --test tests/researcher-profiles-ui-source.test.mjs` -- pass.
- `npm run typecheck` -- no errors.

**Manual checks:**
- Real app as `patuan`: Tab 5 VI/EN toggle; print preview (or a Playwright PDF, if available) shows one A4 portrait document without app chrome.

## Implementation Notes

- `CvPrintTab` renders one layout from a VI/EN label table (no duplicated JSX branch), from the saved `profile` only; Tab 4 `levels` exported and reused. Missing values print "—", empty sections print an italic empty line; no review fallbacks ported. Dates split from ISO. Bank/SmartCA row only when any of the four values exists. Without `curriculumVitae` the tab returns only a message.
- Deviation from Code Map: no `catalogs` prop — every value resolves from `profile` (rank/degree/research fields), so the prop would be unused.
- Code Map claimed global print rules already hide buttons/section headers; they do not exist in `globals.css`. The new print block instead hides every element that is not the paper or one of its ancestors (`body:has(.cv-paper) :has(.cv-paper) > :not(:has(.cv-paper)):not(.cv-paper)`) and strips ancestor padding/borders, so it works on `/my-profile` and the manager panel without a selector list. Named page `@page cv` (A4 portrait, 20/15/20/25 mm); no bare `@page`; `.profile-print-preview` rules untouched.
- Verification: `node --test tests/researcher-profiles-ui-source.test.mjs` 8/8; `npm run typecheck` clean. Real app on :3000 — patuan Tab 5 VI and EN render, toggle does not submit the form; headless Chrome `page.pdf` (print media, `preferCSSPageSize`) as patuan (VI and EN) and as nmphuong via the manager panel CV tab: A4 portrait (594.96 x 841.92 pt), first page starts with "MẪU BM-06", no app chrome/tabs/buttons/notes in the PDF text; sparse CV spills signatures onto page 2. At 375px the document has no horizontal scroll and the paper frame scrolls (focusable region). Saved-only check in the real app: clicking Tabs 1–4 without edits shows no unsaved note; editing Họ và tên on Tab 1 keeps the saved name on the paper and shows the note (reloaded, nothing saved). Portrait `<img>` covered by the unit fixture only; a real portrait was not printed. `tests/docmans-ux-migration.test.mjs` / `files-route.test.mjs` have the same 4 failures on the baseline (stash-verified), unrelated.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | blind, edge | EN paper prints Vietnamese participation level/status labels | medium | patch — derived enum labels are labels; EN equivalents added to the label table, VI keeps Tab 4 strings |
| 2 | blind, edge | One-sided year/date ranges print a lone value | low | patch — print "—" for the missing side |
| 3 | blind | Photo box prints "Ảnh 3x4" caption; spec says empty box | low | patch — box rendered empty |
| 4 | blind, verif-gap | `no-print` class matches no rule | low | patch — class removed; `:has` print rule already hides the note |
| 5 | blind | VI/EN toggle not grouped for screen readers | low | patch — `role="group"` + label |
| 6 | edge | Long unbroken row values can overflow A4 width | low | patch — `overflow-wrap: anywhere` |
| 7 | verif-gap | englishAcademicTitle EN-only, level/INACTIVE labels, empty photo, one-sided range untested | medium (verified gap) | patch — assertions added to the existing `it` |
| 8 | blind | Workspace regex pins the exact dirty expression | low | patch — loosened |
| 9 | verif-gap | `dirty` flag only checked by source regex | medium (verified gap) | defer — needs a workspace render harness (fetch/effect stubs); real-app check recorded in notes |
| 10 | edge | Typing then clearing an absent optional row field makes `dirty` true | low | reject — note only advises saving; fix adds normalization |
| 11 | blind, edge | sprint-status diff changes the 13-7 line | false | 13-7 change predates this story (dirty tree at start); not part of this change and not committed with it |
| 12 | blind, edge | Section V / row 12 omitted when empty → numbering skips | low | reject — frozen intent says "V note (only when present)", bank row only when present (epics) |
| 13 | blind | No assertion on print CSS | low | reject — static CSS; verified by headless PDF |
| 14 | blind | Print allowed while dirty | low | reject — warning shown next to the toolbar; guard adds branches |
| 15 | blind | EN dates DD/MM/YYYY | low | reject — consistent with source form; cosmetic |
| 16 | edge | Invalid avatarUrl → broken image | false | server DTO only accepts http(s), `/path` or data:image URLs |
| 17 | edge | Empty required strings print blank cells | false | server rejects empty required row fields (13.3/13.4 DTO) |
| 18 | edge | Print rules need `:has()` (old Firefox) | low | reject — existing print rules already rely on `:has()` |
| 19 | edge | Organization falls back to management unit | false | fallback order is specified in Boundaries; `personalInfo.organization` is required so fallback is rare |
