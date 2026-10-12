---
title: 'Story 13.6 — CV change history'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '0abf74211d4509a17d8baea7c0ee0c51aaeca5b7'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CV edits already reach `ResearcherProfileHistory` as redacted `afterFacts.cvChanges` markers, but the UI prints raw `section.field` paths, publication-only edits show no CV summary, and the owner has no history view at all since the block was removed from the CV workspace (commit 0a345b4: "Story 13.6 must place CV history elsewhere").

**Approach:** Frontend only, no API or migration change. Render CV changes as Vietnamese section-level summaries (Tab 1 field labels, "2. Quá trình đào tạo", "3. Quá trình công tác…", "4. Kinh nghiệm & Thành tích nghiên cứu", "Ghi chú hồ sơ"; "Công bố khoa học" when before/after publications differ); sensitive fields (portrait, ID, bank, SmartCA, consent) show only "đã thay đổi, giá trị được ẩn"; unknown keys fall back to the raw key. A "Lịch sử thay đổi" button in the CV workspace header (next to "Xem & In Lý lịch khoa học"), shown only when `researcher-profile.history.read` is allowed, opens a read-only right-side Drawer (`Dialog` + `cv-drawer-dialog`) that loads `GET /:id/history` for the shown profile and lists entries (time · action · CV summary). The manager panel "Lịch sử" tab keeps its detail and uses the same labelled summary. Placement decided 2026-10-13 (user delegated the question to Codex gpt-6-astra/high, which confirmed it: keeps the five tabs, works for owner and manager).

</frozen-after-approval>

## Implementation Notes

- `scientific-cv/cv-history.tsx`: label maps, `HistoryChanges` (section-level summary of profile fields, `cvChanges` markers, publications/participations) and read-only `CvHistoryDrawer` (`Dialog` + `cv-drawer-dialog`, no `CvDrawer` because that one carries save semantics; drops late responses on close). `HistoryFacts` no longer prints raw `section.field`.
- `cv-workspace.tsx`: header "Lịch sử thay đổi" button gated on `researcher-profile.history.read`; Drawer closed on profile reload. `researcher-profiles-panel.tsx`: "Lịch sử" tab renders `HistoryChanges` above the Trước/Sau detail. `globals.css`: `.cv-history-list` spacing.
- Publication/participation diffs ignore `createdAt`/`updatedAt`/`updatedById`, because `syncPublications` rewrites every row on save. Keys missing on either side (older entries) count as unknown, not changed.
- Test: extended "edits CV education and work history…" in `tests/researcher-profiles-ui-source.test.mjs` (fails on the baseline). Real-app check on `/my-profile` (owner): Drawer loads 22 entries with redacted sensitive labels, Escape closes and returns focus. Manager panel was not browser-checked.

## Review Triage Log

- Blind Hunter: missing key on one side reads as changed (medium): patched.
- `managementOrganizationUnitId` change not summarised (low): patched, label "Đơn vị quản lý".
- Publications show as changed on every save via `updatedAt` (medium, confirmed in `syncPublications`): patched.
- `scientistType` label dead (low): patched (deleted). `ol` for a newest-first feed (low): patched to `ul`. Unused export (low): patched.
- Tab 1 profile-column labels lack the "1. Thông tin chung" prefix (low): rejected. Those columns are also edited from the manager profile form, not only Tab 1.
- Empty summary for CREATE/ACCOUNT_* entries (low): rejected. Time · action is the whole fact.
- 100-entry cap and no actor shown (low): rejected. Pre-existing API behaviour, not in story scope.
- Drawer loading/error paths untested (low): rejected per test-audit policy. The behaviour was checked in the real app.
- Spec incomplete / status not `review` (false): finalized in this step. "Codex approval" is valid: the user asked for questions to go to Codex for this story.

