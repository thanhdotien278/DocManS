---
title: 'Story 13.9 — Read-only tables with add/edit Drawer for all CV list sections'
type: 'refactor'
created: '2026-10-12'
status: 'done'
baseline_commit: '2c33b7661be522d1ba75fe65957cc5aa13ed3788'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/stories/13-8-publications-drawer.md'
  - '{project-root}/docs/ux-ui-spec.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Six Scientific CV list sections still use inline-editable rows (`CvRowTable`). Only Publications (13.8) uses the read-only table + Drawer pattern, so the CV is inconsistent, the tables are wide and validation errors appear above the table instead of next to the field.

**Approach:** Turn `CvRowTable` into the 13.8 pattern: a read-only table plus a right-side Drawer for add/edit plus a delete-confirm Dialog. Move the Drawer frame and delete dialog out of `cv-publications-section.tsx` into shared components that both use. This supersedes 13.8's "never change CvRowTable/IP/awards/projects".

Sections and table columns (other fields only in the Drawer; no new fields):
- Tab 1 D Ngoại ngữ: Ngoại ngữ, Mức độ, Chứng chỉ.
- Tab 2 Quá trình đào tạo: Bậc đào tạo, Ngành, Cơ sở đào tạo, Năm (start–graduation).
- Tab 3 Quá trình công tác: Thời gian, Cơ quan/Đơn vị, Chức vụ.
- Tab 4 Sở hữu trí tuệ: Tên, Số bằng, Năm cấp, Minh chứng (link). Giải thưởng: Tên, Năm, Cơ quan trao tặng, Minh chứng. Nhiệm vụ: Tên, Vai trò, Thời gian, Tình trạng.
- Publications: keep 13.8 columns and fields; only adopt the shared shell.
- Profile participations on Tab 4 stay read-only (no CRUD).
- Manager profile form `/researcher-profiles` (decided 2026-10-12, user: include). Công bố: Tên, Năm, Tạp chí, Trạng thái (Hiển thị/Lưu lịch sử); DOI, Tác giả, Ghi chú only in the Drawer. Quá trình tham gia: Tên đề tài, Vai trò, Cấp, Trạng thái, Từ ngày–Đến ngày; Ghi chú only in the Drawer. Its rule stays: only unsaved rows (no `id`) can be deleted; saved rows change status instead. "Lưu hồ sơ" commits.

## Boundaries & Constraints

**Always:**
- The section header holds the title and a top-right "+ Thêm…" button; rows have compact Pencil/Trash icon buttons with `aria-label`. Without edit permission (CV: `researcher-profile.cv.update`; panel: its existing `editable`) or while saving, no Add/Edit/Delete controls and no Drawer render. When `canDelete(row)` is false the Trash icon is hidden. After a delete, focus goes to the section's Add button.
- Drawer: labelled fields, required marked `*`, inline errors with `aria-describedby` and focus to the first invalid field, discard prompt when dirty, Escape/X/Hủy close, focus returns to the opener. There is no `<form>` and every button is `type="button"`, because the Drawer sits inside the CV/panel form; the Drawer root calls `preventDefault()` on every Enter in a single-line input (so the outer form never submits) and saves only when not composing. Drawer selects keep an off-list saved value selectable. Drawer "Lưu" updates the in-page draft only; "Lưu lý lịch khoa học" commits it.
- Drawer rules mirror the server and the workspace pre-save checks (no new rules): `maxLength` per field as the DTO (CV text 1000, notes 4000; participation title 500, role 240, notes 1000); year selects 1950→current (panel publication year stays a number input 1800–2200); required fields (language; degree level, major, institution; period, organization; IP title; award name; project title, role; panel publication title; participation title, role, level), education start ≤ graduation year, participation start ≤ end date, and `proofUrl` gets `withScheme` and must be http(s) or site-relative.
- The Drawer saves `{...original, ...changed}`: only keys whose form value differs from the opening value are written (blank → `null`, years → `Number`). An unchanged save leaves the row identical (no unsaved banner, no superseded participation version) and fields the Drawer does not show are kept.
- Accepted residual: legacy invalid rows and server 400s still surface as the CV section alert (workspace) or the panel's top error, since the Drawer prevents new invalid rows. Loading state stays the existing save/status line; the Drawer adds no spinner.
- Empty state is a single table row; tables scroll horizontally on narrow screens; the Drawer is full width at ≤767px (existing CSS rule).

**Never:** change API, DTO, contract shape, print tab, the panel's save/permission logic; add dependencies or new test files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Add | Fill required fields, Lưu | Row appended, unsaved banner; CV save persists | N/A |
| Missing required | Lưu with blank Cơ sở đào tạo | Drawer stays open, error under that field | client |
| Year order | Start 2020, graduation 2018 | Error under Năm tốt nghiệp | client |
| Bad link | Minh chứng "javascript:x" | Error under Minh chứng | client |
| Edit unchanged | Open, Lưu | Draft unchanged | N/A |
| Delete | Confirm | Row gone from draft; Cancel keeps it | N/A |
| Read-only | No `cv.update` | Table only, no controls | N/A |

</frozen-after-approval>

## Code Map

- `scientific-cv/cv-row-table.tsx` -- rewrite as read-only table + Drawer + delete Dialog; also export `CvDrawer` (frame: header, X, discard prompt, Enter-to-save with IME guard, Lưu/Hủy) and `CvDeleteDialog`. Drop the `CvRowEditing` context. Column config gains `required`, `table?: false`, `type: "url" | "date"`; `maxLength`, `cell?(row)` for merged/label cells (education years, participation dates, level/status labels); props add `canDelete?(row)` and `validate?(row)` for cross-field rules.
- `scientific-cv/cv-publications-section.tsx:124-191` -- swap its inline Drawer frame and delete Dialog for the shared ones; field body and authors input unchanged. Move `withScheme` and `SAFE_LINK` into `cv-row-table.tsx` (avoids an import cycle); update every importer (`rg withScheme apps`).
- `cv-general-tab.tsx:222-227` (dirty tree, surgical edit), `cv-history-tabs.tsx`, `cv-research-tab.tsx` -- pass `title`, `onChange(rows)`, `editable`, `error`, `newRow`; drop `replaceRow`/`removeRow` helpers.
- `cv-workspace.tsx:11,170,193,303,345,359` -- remove `editingRows` and the Provider; keep `validate()` and `fieldKeyOf`.
- `researcher-profiles-panel.tsx:115-116,178-199` -- replace both fieldset lists and `publicationField`/`participationField` with `CvRowTable` (`editable={editable && !busy}`, `canDelete={(row) => !row.id}`). It sits inside the profile `<form>`/`<fieldset>`, same no-nested-form rule. Preview tab unchanged.
- `globals.css:2133-2159` -- reuse `.form-dialog`, `.cv-drawer-dialog`, `.icon-button`; add only what the header needs.
- Docs: `docs/ux-ui-spec.md:857` (generalise to all CV list sections), `SPEC.md` Assumptions, `stories.yaml`, `sprint-status.yaml` key `13-9-cv-list-sections-drawer`.
- Tests: `tests/researcher-profiles-ui-source.test.mjs:56-75,110-160,172` -- update `<th>TT</th>`, `Xóa dòng`, `disabled={!editable}` count, `Sửa dòng 1`, the all-disabled loop; add Dialog/lucide mocks to the `cv-row-table` fixtures (:133, :172) and a `./cv-row-table` mock to the publications fixture (:134).

## Tasks & Acceptance

**Execution:**
- [x] Docs -- update `ux-ui-spec.md`, `SPEC.md`, `stories.yaml`, sprint status first.
- [x] `cv-row-table.tsx` -- new component + shared Drawer/delete dialog.
- [x] `cv-publications-section.tsx` -- use the shared shell.
- [x] Tab callers and `cv-workspace.tsx` -- new props, remove `CvRowEditing`.
- [x] Tests -- extend existing: read-only table, header Add, icon labels, no inputs in table, read-only hides controls.

**Acceptance Criteria:**
- Given the owner, when they add, edit and delete rows in each of the seven CV sections and the two panel lists and save the CV, then a reload shows the same data.
- Given a viewer without `researcher-profile.cv.update` (CV) or without panel edit rights, then no list shows Add/Edit/Delete.
- Given the panel, when Enter is pressed in a Drawer input, then the profile is not saved.

## Implementation Notes

- `CvRowTable` is now a read-only table + Drawer + delete dialog and exports `CvDrawer`, `CvDeleteDialog`, `withScheme`, `SAFE_LINK`; `CvRowEditing` is gone. Column config: `required`, `table: false`, `header` (short table header; defaults to the label without " *"), `cell`, `type: "url" | "date"`, `maxLength`, `min`/`max` (panel publication year). Props: `title`, `hint`, `onChange(rows)`, `newRow`, `editable`, `error`, `canDelete`, `validate` (cross-field, keyed by field), `commitLabel` ("Lưu hồ sơ" in the panel).
- Drawer save writes only changed keys onto the original row; validation runs in JS (no `<form>`, so no native constraints). Enter at the Drawer root is ignored when a child already called `preventDefault` (the publications authors tag input), replacing the id special case.
- Required selects show a disabled "Chọn" placeholder. Panel publication/participation `status` is marked required because the server rejects a null status (not a new rule).
- Publications kept their own field body; only the Drawer frame and delete dialog are shared. Added the Drawer rules it lacked: `proofUrl` is checked against `SAFE_LINK` after `withScheme` with an inline error under Minh chứng, and text inputs carry the DTO `maxLength` (1000; notes 4000).
- Verification: `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` 24/24; `npm run typecheck` clean. Real app (owner `patuan`, :3000/:4000): Tab 1 add language via Enter (no PATCH, Drawer closes, focus on Add), required error + focus, edit + discard prompt + focus return; Tab 2 required + year-order errors under the fields, add, CV save, reload round-trip, delete confirm (focus to Add), save; Tab 4 IP `javascript:x` error under Minh chứng and `example.org/p` stored as `https://example.org/p`; 375px Drawer full width without horizontal scroll; no console errors. Publications: Enter in the authors input adds a bubble and keeps the Drawer open, Enter in the title saves the draft, `javascript:x` proof link is blocked with the inline error, delete Cancel keeps the row (not saved). Edit-unchanged on an education row leaves Tab 5 without the unsaved note (a real change shows it). Test rows were removed and saved again; residue on patuan's local profile: `personalInfo.languages: []` (key was absent) and two extra CV history entries. Not run: Tab 3 and award/project saves (same component), manager panel in the real app (needs a manager login), Escape via a real keyboard (the automation key did not reach the dialog; a dispatched Escape keydown showed the discard prompt).

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | edge | Legacy scheme-less `proofUrl` blocks Drawer save on an untouched field | medium | patch — validation now applies `withScheme` before `SAFE_LINK` |
| 2 | blind | Number error prints "từ undefined đến undefined" without min/max | low | patch — fallback message |
| 3 | edge | Discard prompt stays after the form is reverted clean | low | patch — shown only while dirty |
| 4 | blind | Delete text implies a server delete for unsaved panel rows | low | patch — neutral wording |
| 5 | verif-gap, blind | Drawer save/validation/Enter guard not executed by any test | medium | defer — no DOM harness (deferred-work.md) |
| 6 | blind | Manager panel, Tab 3, awards, projects and real-keyboard Escape not run in the real app | medium | defer — panel needs a manager login; same component verified on Tabs 1, 2, 4 |
| 7 | edge | `SAFE_LINK` rejects `//host` that server `safeUrl` accepts | low | reject — pre-existing 13.8 rule, unlikely in practice |
| 8 | blind | Brittle prop-order regexes and Proxy lucide mock | low | reject — no named harm |
| 9 | all three | Diff includes pre-existing uncommitted Tab 1 work (`otherResearchFields` DTO/contract/print, nationality default "Việt Nam", removed `cv-title` input, section A redesign) | n/a | out of story — the user's work in the tree before 13.9 (user chose to build on top); reported to the user, not changed |

## Verification

**Commands:**
- `npm run build:api && node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` -- pass.
- `npm run typecheck` -- no errors.

**Manual checks:**
- Real app: one add/edit/delete/save/reload per tab; Drawer Lưu fires no PATCH; 375px width; keyboard Escape/focus return.
