---
title: 'Story 13.3 — CV education history and work history tabs'
type: 'feature'
created: '2026-10-11'
status: 'done'
baseline_commit: 'e34b1e0'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-scientific-cv/cv-data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tabs 2 and 3 of the scientific CV workspace are placeholders, so researchers cannot record education or work history (API already validates both since 13.1).

**Approach:** Replace the two placeholders with editable row tables built on `CvRowTable`, saved by the existing single "Lưu lý lịch khoa học" PATCH. Education rows: degreeLevel*, major*, institution*, graduationYear, trainingMode, thesisTitle. Work tab: `workHistory.summary` textarea plus items period*, organization*, position, workField. Decided options (from the review repo): degreeLevel = Đại học, Thạc sĩ, Tiến sĩ, Bác sĩ nội trú, Bác sĩ CKII, Bác sĩ CKI, Sau tiến sĩ; trainingMode = Chính quy, Vừa làm vừa học, Liên kết quốc tế, Khác. Client blocks save when a row lacks its required fields (error shown on the tab, tab switched and focused); API 400 `educationHistory[...]`/`workHistory...` errors surface on the same tab. Tab badges already count saved rows. Old array-shaped `workHistory` is never produced; server already rejects it.

</frozen-after-approval>

## Implementation Notes

- Draft state lives in `cv-workspace.tsx` (`educationHistory`, `workSummary`, `workItems`); `cvFromDraft` writes `educationHistory` and `workHistory` back, preserving the null-vs-delete convention for untouched sections.
- Tab badges for tabs 2–3 count draft rows (story AC: update on add/remove). `CvRowTable` selects show an unknown saved value as an extra option instead of rendering blank.
- Files: `scientific-cv/cv-history-tabs.tsx` (new), `cv-workspace.tsx`, `cv-row-table.tsx`, `tests/researcher-profiles-ui-source.test.mjs`.
- Verified in the real app (account patuan): blank row blocked with no PATCH; saved education + work summary/items reload correctly.

## Review Triage Log

| # | Source | Finding | Verdict | Route / evidence |
|---|---|---|---|---|
| 1 | blind | tab badges ignore draft rows | medium | patch — story AC requires update on add/remove |
| 2 | blind | unknown saved degree/mode renders blank | medium | patch — row table adds the stored value as an option |
| 3 | blind | no client caps for 200 rows / 1000 chars | low | reject — API 400 still surfaces on the tab; rarely hit |
| 4 | blind | tab-level (not per-row) errors; focus lands on first input | low | reject — matches 13.2 pattern |
| 5 | blind | blank added row blocks save | low | reject — message names the required fields |
| 6 | blind | changeDraft loosely typed | low | reject — keys are literals from typed tab components |
| 7 | blind | source-grep test only | medium (unverified) | defer — no web runtime harness; policy forbids test-only seams |
| 8 | blind | firstErrorTab priority / unmapped sections | low | reject — 13.4 adds its own mapping |
