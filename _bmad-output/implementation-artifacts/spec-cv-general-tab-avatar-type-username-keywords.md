---
title: 'CV Tab 1 refinements: portrait upload & crop, derived scientist type, fixed username, keyword chips'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_commit: 'a1fca7c90a64420e9114befc6457f45dc88d2510'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/stories/13-2-cv-shell-and-general-tab.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On `/my-profile` Tab 1 the portrait is a raw URL text box, the researcher picks their own scientist type, can rename their login username, and types research keywords as one comma string. The user wants: upload + self-crop to 3x4 (also shown as the header avatar), scientist type fixed by the account's user type, username fixed, and keywords shown as hashtag bubbles.

**Approach:** Client-side upload and 3x4 crop (canvas) stored as a small JPEG data URL in the existing `curriculumVitae.personalInfo.avatarUrl`; a tiny owner endpoint serves it as an image for the header. Scientist type shows only Internal vs External, read-only from `profileType` (which maps 1:1 to the role: EXTERNAL ⇔ EXTERNAL_RESEARCHER_USER); the BM-06 domestic/foreign choice is dropped. Username is read-only for the owner; HEAD/STAFF/admin managers set it on the same Tab 1. Keywords become a chip input. Renegotiates SPEC non-goal "Portrait file upload" (user request 2026-10-11).

**Decisions (2026-10-11):** only Internal/External, no Domestic/Foreign (user: original wording was a mistake); add manager username setter; profileType stays locked after account link (unchanged); keep all four changes in one spec.

## Boundaries & Constraints

**Always:**
- Avatar: "Tải ảnh lên" button (accept jpeg/png/webp, ≤ 5 MB source) opens a crop dialog with a fixed 3:4 frame, drag to pan, zoom slider, "Áp dụng"/"Hủy"; output 300×400 JPEG data URL into the draft; persisted by the existing "Lưu lý lịch khoa học". Keep "Xóa ảnh". The URL text input is removed.
- Server accepts `avatarUrl` as `http(s)://`, `/path`, or `data:image/(jpeg|png|webp);base64,…` up to 400 000 chars; other values 400 on `curriculumVitae.personalInfo.avatarUrl`.
- `GET /api/v1/researcher-profiles/my-profile/avatar` (session guard): decodes the owner's data-URL avatar and returns bytes with its whitelisted image content type, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-cache`; 404 when none or not a data URL.
- Header (`app-shell.tsx`) shows that image cropped round in the existing avatar circle when the user has `researcherProfileId`; falls back to initials on error. After a successful CV save the header refreshes (cache-busting key).
- Scientist type: read-only text from `profile.profileType`: INTERNAL → "Nhà khoa học trong Học viện", EXTERNAL → "Nhà khoa học ngoài Học viện", hint "Do Phòng QLKH xác định theo loại tài khoản". `personalInfo.scientistType` leaves the CV contract: the client stops sending it, the server accepts and discards it (old payloads/seed), strips it from stored CVs on write, and no longer runs `assertScientistTypeLocked`. `cv-data-contract.md` row updated.
- Username: owner sees "Tên đăng nhập" read-only (value or "Chưa cấp", hint "Do quản trị/Phòng QLKH cấp"); `updateMyProfilePipe` rejects `username` (400 `administrativeFields`); the self username write in the service is removed.
- Manager username setter: in the manager CV workspace (`target` = profile id) Tab 1 shows an editable "Tên đăng nhập" when the profile has a linked account and the form is editable; save sends `username` on `PATCH :id`. Server: `updateResearcherProfilePipe` accepts `username` (same `optionalUsername` rule); allowed only with the existing `researcher-profile.update` authorization, a linked account, `linkedUserId !== actor.id`, and linked role RESEARCHER_INTERNAL_USER or EXTERNAL_RESEARCHER_USER (else 403); unique on `usernameKey` (409 on clash, field error on username); audit `change-username` as today. No new permission action.
- Keywords: typing `,` or Enter commits the trimmed text as a chip `#keyword` with × remove; Backspace on empty input removes the last chip; duplicates ignored; on save any pending text is committed. Stored as `expertiseKeywords: string[]` (unchanged API).

**Never:** Add dependencies; new DB columns/migrations; MinIO/files-module changes; change profileType locking or role sync; touch Tabs 2–5. Existing URL avatars (e.g. seeded `/logo.png`) still render in Tab 1 but the header shows initials for them (intended).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload | 4000×3000 png | crop dialog; Áp dụng → 300×400 preview; save persists; header shows it | N/A |
| Bad file | .pdf or 8 MB image | not opened | inline error under portrait |
| Tampered avatar | `javascript:` or 1 MB data URL in PATCH | 400 | field error on avatar |
| No avatar | header load | initials shown | img onError fallback |
| Self username | PATCH my-profile with `username` | 400 `administrativeFields` | N/A |
| Manager username | HEAD in scope PATCH :id `username: "nva"` on linked researcher | saved; owner sees it read-only | taken → 409 shown on field; no account → 400 |
| Keywords | "ung thư, nội soi," | two chips `#ung thư`, `#nội soi` | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/researcher-profiles/scientific-cv/cv-general-tab.tsx:69-86,108,129` -- section A (portrait + scientist type), username field, keyword input. Reuse `multi-select-chip` classes for chips.
- `apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx:19-42,100,114,157,208,245-261` -- draft mapping: `expertiseKeywords` becomes `string[]`; drop `scientistType`; send `username` only when manager and changed; pass `profile.profileType` and `profile.account`; dispatch header refresh after save.
- New `apps/web/src/components/researcher-profiles/scientific-cv/cv-portrait-cropper.tsx` -- dialog (`<dialog>` or existing modal pattern), canvas crop.
- `apps/web/src/components/layout/app-shell.tsx:48` -- avatar span; `apps/web/src/lib/session.ts:5-48` has `researcherProfileId`.
- `apps/web/src/app/globals.css` -- `.avatar img`, cropper, keyword chip input.
- `apps/api/src/researcher-profiles/researcher-profiles.dto.ts:188 (safeUrl), 350-361 (cvPersonalInfo), 549-553 (updateMyProfilePipe)` -- avatar rule, scientistType optional, drop username from self-update.
- `apps/api/src/researcher-profiles/researcher-profiles.service.ts:209,309,664-669` -- remove `assertScientistTypeLocked`; manager `updateProfile` (~line 200-230) gains username write mirroring the self path at 318-324; role guard like `researcher-profile-access.ts:56`.
- `_bmad-output/specs/spec-scientific-cv/cv-data-contract.md:10` -- scientistType row removed (note: derived from profileType).
- `apps/api/prisma/seed*.mjs` -- drop `scientistType` from seeded CVs if present.
- `apps/api/src/researcher-profiles/researcher-profiles.controller.ts:27` -- add `GET my-profile/avatar` before `:id` routes.
- `tests/researcher-profiles.test.mjs`, `tests/researcher-profiles-ui-source.test.mjs` -- extend existing tests; any test sending self `username` must change.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/researcher-profiles/researcher-profiles.dto.ts` -- avatar data-URL rule, scientistType accepted-and-dropped, self username rejected, manager username accepted.
- [x] `apps/api/src/researcher-profiles/researcher-profiles.service.ts`, `.controller.ts` -- drop scientistType lock; move username write to manager update; avatar endpoint.
- [x] `apps/web/src/components/researcher-profiles/scientific-cv/*` -- cropper, section A, read-only username, keyword chips.
- [x] `apps/web/src/components/layout/app-shell.tsx`, `globals.css` -- header avatar image.
- [x] `tests/researcher-profiles.test.mjs` -- extend: self username 400; data-URL avatar accepted and served by `my-profile/avatar`; `scientistType` stripped; manager username set + clash 409 + non-researcher target 403.

**Acceptance Criteria:**
- Given an owner with a saved avatar, when any page loads, then the header circle shows the portrait.
- Given an EXTERNAL profile, when Tab 1 renders, then "Nhà khoa học ngoài Học viện" shows read-only with no radio.

## Implementation Notes

- `avatarUrl` is excluded from the 256 KB CV document budget (it has its own 400 000-char cap), otherwise a legal portrait could fail the document limit.
- Manager username errors carry `errors[].field = "username"` (409 clash, 400 no account) so the workspace shows them on the field.
- The header refreshes on a `researcher-avatar-updated` window event dispatched after an owner save.
- `tests/docmans-ux-migration.test.mjs` "derives the printable researcher view…" already fails at the baseline commit (asserts the API client contains no `curriculumVitae`); not touched.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | blind | cropper pan pointer-only, no keyboard | medium | patch — accessibility; arrow keys on focusable frame |
| 2 | edge (x2 claim) | manager username field editable for non-researcher/self accounts → 403 fails whole save | medium | patch — show editable only for researcher roles |
| 3 | edge | plain URL avatar accepted up to 400k chars | low | patch — direct cap 2048 for non-data values |
| 4 | edge | protocol-relative `//host` passes path branch | low | patch — direct regex fix |
| 5 | vgap, blind | mergeKeywords untested; near-duplicates hit keywordKey unique → 500 | medium | patch — dedupe by normalizeResearcherKey server-side + test |
| 6 | blind, edge | legacy URL avatars 404 in header | false | spec Never: intended, initials shown |
| 7 | blind | portrait not shown in print/profile views | false | Tab 5 print is Story 13.5 (backlog); hint pre-existing |
| 8 | blind | legacy scientistType reported as change on first save | low | reject — one-time, path-only history entry |
| 9 | blind, edge | manager can clear username to null | low | reject — deliberate manager action; email login remains |
| 10 | blind, edge | concurrent same-username → P2002 500 | low | reject — rare race, fix adds error mapping |
| 11 | blind | manager without cv.update cannot set username | low | reject — HEAD/STAFF hold both actions |
| 12 | blind | data URL bytes not magic-checked | low | reject — whitelisted type + nosniff, owner-only route |
| 13 | blind | 404 per page load for users without portrait | low | reject — spec design, onError fallback |
| 14 | blind | sized spread copies CV / no exact boundary test | low | reject — negligible |
| 15 | edge | 403 carries no errors[] field | low | reject — unreachable after #2 |
| 16 | edge | manager editing own profile via admin route: header stale | low | reject — refreshes on reload |
| 17 | vgap | client username payload rule only source-tested | medium (unverified) | defer — payload built in component; no web runtime harness |
| 18 | vgap | getMyAvatar inactive-profile guard untested | low | reject — owner-only exposure |

## Design Notes

Data URL instead of MinIO: 300×400 JPEG ≈ 30–50 KB, the researcher-profiles route already allows 4 MB JSON, `avatarUrl` is already redacted from list/search/audit projections, and the future BM-06 print view can use it directly in `<img>`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `node --test tests/researcher-profiles.test.mjs tests/researcher-profiles-ui-source.test.mjs` -- expected: pass
- `npm run build:web` -- expected: succeeds

**Manual checks:**
- Real app at `/my-profile`: upload, crop, save, reload, header avatar; keyword chips; username disabled.
