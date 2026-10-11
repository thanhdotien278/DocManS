---
title: 'Story 13.2 — CV shell and "Thông tin chung" tab'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_commit: '269b7ced1d74930d8a999f7a1eb265aa32d61e0c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 13.1 shipped the CV API, but researchers have no UI to fill their BM-06 CV; `/my-profile` still shows the thin profile form.

**Approach:** Build a reusable CV workspace (5 tabs with row counts, one save, contextVersion handling, change-history block) and Tab 1 sections A–E matching the user's screenshot. `/my-profile` renders it for the owner; the manager panel shows it for a selected profile when `researcher-profile.cv.read` is allowed. Tabs 2–5 render placeholders that 13.3–13.5 replace.

Field mapping (decided): A = `cv.personalInfo.avatarUrl` (URL input + 3x4 preview) and `scientistType` radio (Trong nước = DOMESTIC / Nước ngoài = FOREIGN). B = Họ và tên* `fullName`, Giới tính* `gender` (Nam/Nữ/Khác), Ngày sinh `birthDate`, Nơi sinh `birthPlace`, Quốc gia/Quốc tịch `nationality`, Mã định danh* `idNumber`, Ngày cấp `idIssueDate`, Nơi cấp `idIssuePlace`, Cơ quan/Đơn vị công tác cụ thể `externalAffiliation`, Chức vụ hiện tại `position`, Quân hàm `militaryRank`, Chức danh khoa học khác `title`, Điện thoại di động `contactPhone`, Email* `contactEmail`, Địa chỉ liên hệ `contactAddress`, Đơn vị quản lý / Đơn vị công tác* `personalInfo.organization` (free text, hint as screenshot), Tên đăng nhập `username` (owner only, kept from the old form). C = Học hàm/Học vị (existing catalog selects), Học hàm học vị (Tiếng Anh) `englishAcademicTitle`, Ngành/Lĩnh vực chính* `researchFieldIds` (existing multi-select picker), Từ khóa `expertiseKeywords`. D = `languages` row table (Ngoại ngữ*, Mức độ Tốt/Khá/Trung bình, Chứng chỉ). E = bank account/name/branch, SmartCA serial, `shareDataAgreement` radio (default Đồng ý), Ghi chú hồ sơ `cv.note`.

## Boundaries & Constraints

**Always:**
- One "Lưu lý lịch khoa học" PATCH sends changed profile columns plus the whole `curriculumVitae` (`personalInfo` always included; other CV sections passed through unchanged from the loaded document) with the current `contextVersion`.
- Client blocks save when fullName, gender, idNumber, contactEmail, organization, or ≥1 research field is missing, showing the message next to the field. API 400 `errors[].field` (e.g. `curriculumVitae.personalInfo.idNumber`) maps to the same field; 409 `CONTEXT_VERSION_MISMATCH` shows a reload prompt that reloads the profile.
- Editable only when `viewerAuthorization.allowedActions` has `researcher-profile.cv.update` and (`self.update` for owner | `update` for manager); otherwise the whole form is read-only. `scientistType` is disabled when the profile has an account and a stored value.
- Tab labels: "1. Thông tin chung", "2. Quá trình đào tạo", "3. Quá trình công tác & Kinh nghiệm chuyên môn", "4. Kinh nghiệm & Thành tích nghiên cứu", "5. Xem & In Lý lịch khoa học"; tabs 2–4 show a count badge (education rows; work items; IP+awards+projects+active publications). Header "Lý lịch khoa học của tôi" (owner) or the profile name (manager), subtitle "Chuẩn hóa theo Cổng thông tin Khoa học & Công nghệ Quốc gia (STM - Bộ KH&CN) & Học viện Quân y", button "Xem & In Lý lịch khoa học" selects tab 5. Below the card: "Lịch sử thay đổi hồ sơ" with "Xem lịch sử thay đổi" reusing the existing history request/rendering.
- Accessible tabs (roles, arrow keys like the existing panel), labelled inputs, visible focus, no page-level horizontal scroll (row tables scroll inside `.table-wrap`).

**Never:** Port the review repo's monolithic panel; fabricate default personal values; add dependencies; change API code; touch tabs 2–5 content beyond placeholders.

</frozen-after-approval>

## Code Map

- `apps/web/src/app/my-profile/page.tsx` -- swap `ResearcherProfilesPanel self` for the new workspace (`target="my-profile"`).
- `apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx:117-122,141-148` -- tab list; add a "Lý lịch khoa học" tab (when `cv.read` allowed) rendering the workspace with `target={editing.id}`. Reuse its tab keyboard pattern, `HistoryFacts`, `historyActions`, research-field picker markup (lines 162-173). Leave its self branch untouched.
- `apps/web/src/lib/researcher-profiles-api.ts` -- add CV types (mirror `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` `ScientificCurriculumVitae*`), `curriculumVitae` on `ResearcherProfile`/input, publication `issnIsbn|classification|proofUrl`; make `profileRequest` throw an Error subclass carrying `status`, `code`, `errors`.
- New `apps/web/src/components/researcher-profiles/scientific-cv/` -- `cv-workspace.tsx` (load, state, tabs, save, errors, history), `cv-general-tab.tsx` (sections A–E), `cv-row-table.tsx` (generic add/remove/edit row table with TT column and "Xóa" button, reused by 13.3/13.4).
- `apps/web/src/fixtures/shell-context.ts:298` -- add `{ href: "/my-profile", label: "Lý lịch khoa học", icon: UserRoundSearch }` to RESEARCHER_INTERNAL_USER.
- `apps/web/src/app/globals.css` -- only small additions if existing classes (`section-card`, `form-grid two`, `field`, `table-wrap`, `data-table`, `button primary`) do not cover the portrait box/tab badge.
- `tests/researcher-profiles-ui-source.test.mjs` -- existing source-text test pattern.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/lib/researcher-profiles-api.ts` -- CV types, request error detail.
- [x] `apps/web/src/components/researcher-profiles/scientific-cv/*` -- workspace, Tab 1, row table.
- [x] `apps/web/src/app/my-profile/page.tsx`, `researcher-profiles-panel.tsx`, `shell-context.ts` -- mount points and nav.
- [x] `tests/researcher-profiles-ui-source.test.mjs` -- one test asserting the 5 tab labels, "Lưu lý lịch khoa học", the required-field set, use of `researcher-profile.cv.update`, and `CONTEXT_VERSION_MISMATCH` handling in the new files.

**Acceptance Criteria:**
- Given a linked owner, when `/my-profile` loads, then the 5 tabs, sections A–E, single save and history block render with saved values.
- Given missing idNumber, when saving, then no request is sent and the error sits next to "Mã định danh".
- Given a manager in scope, when opening a profile's CV tab, then the same workspace loads via `/:id`; without `cv.update` it is read-only.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | blind | scientistType defaulted from profileType (EXTERNAL→FOREIGN), locks after save | medium | patch — unset until chosen, required |
| 2 | self-review | headings/labels/page title differ from screenshot | medium | patch — spec requires screenshot wording |
| 3 | edge, blind, vgap | blank language rows pass client, raw 400 path shown | low | patch — one validate rule |
| 4 | edge | required values sent untrimmed; whitespace optional saved | low | patch — direct trim |
| 5 | edge | stale history response after reload | low | patch — version guard like loadProfile |
| 6 | edge, blind | avatar preview fetches arbitrary/partial URLs, leaks referrer | medium | patch — render only http(s)// or /path, no-referrer |
| 7 | blind | required fields missing aria-describedby | low | patch — story AC requires labelled errors |
| 8 | edge, blind | owner lost publication/participation editing until 13.4 | medium | defer — spec intent: tabs 2–5 placeholders until 13.3–13.5 |
| 9 | vgap | cvFromDraft/ProfileRequestError/validate only source-text tested | medium (unverified) | defer — no web runtime harness; policy forbids test-only seams |
| 10 | edge | unmapped field errors jump to Tab 1 without inline error | low | reject — banner still shows message; all Tab 1 paths mapped |
| 11 | edge, blind | 409 reload discards edits silently | low | reject — reload is the requested behavior |
| 12 | blind | unsaved draft lost on panel tab switch | low | reject — no dirty-tracking requirement; unlikely loss |
| 13 | blind | self branch of panel now dead | low | reject — spec: leave untouched |
| 14 | blind | history shows raw cvChanges paths | low | reject — Story 13.6 scope |
| 15 | blind | history load sets shared busy | low | reject — brief, harmless |
| 16 | blind | manager tab refetches profile/catalogs | low | reject — one extra request |
| 17 | blind | server field messages not localized | low | reject — API message format pre-existing |

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `node --test tests/researcher-profiles-ui-source.test.mjs` -- expected: pass
- `npm run build:web` -- expected: succeeds
