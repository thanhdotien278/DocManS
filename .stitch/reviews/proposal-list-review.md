# Proposal List design review

> Continuation audit, 2026-09-08: overall result is **NEEDS_REVISION / verification incomplete**. The historical PASS table below is not an implementation-readiness certification. Requirements in a prompt or brief do not prove generated loading/empty/error states, permission handling, keyboard accessibility, target sizes, or layouts at 1440/1024/768/430/390px. These need artifact-level inspection and evidence before PASS can be reinstated. Keep the existing screens as visual references; do not propagate their illustrative business labels as authoritative behavior. The canonical design-system synchronization prerequisite remains blocked.

## Reviewed screens

- Desktop: `ef758e8acce84c449b13b0a26b599224` — visually inspected after targeted refinement.
- Mobile companion: `9f28a985b51a42ab9e24d6de8b66f90d` — visually inspected at 390px intent after targeted refinement.
- Brief: `.stitch/screens/proposal-list.md`.

| Check | Result | Evidence / disposition |
| --- | --- | --- |
| 1. Information hierarchy | PASS | Institutional shell, record-list title, scoped context, action, filters, then register. |
| 2. Required fields/data | PASS | Desktop structure carries code/title, PI, unit, field, intake, status, submitted date, due/risk, relationship, and action. |
| 3. Search/filter/sort | PASS | Keyword search, documented filter categories, applied chips, clear filters, sort, and mobile filter trigger are present. |
| 4. Status representation | PASS | Text-labelled semantic status badges are visible. |
| 5. Viewer relationship visibility | PASS | A record-scoped relationship label is included in table/cards. |
| 6. Allowed actions | PASS | Create Draft is described/shown as capability-gated; record open is the primary list action. |
| 7. Blocked action behavior | PASS | Visible blocked submit uses documented “Nộp chính thức” and “Chưa đủ điều kiện nộp”; no hidden record is implied. |
| 8. Loading state | PASS | Defined as table/card skeleton component state, not fabricated data. |
| 9. Empty state | PASS | Brief and generation distinguish no match from no accessible records. |
| 10. Error state | PASS | Retry-safe inline load error is specified; not rendered as a live record. |
| 11. Permission-safe behavior | PASS | Copy and structure prohibit client discovery/permission inference; scope/context and safe blocked reason are present. |
| 12. Table/list density | PASS | Desktop uses a dense multi-column register; 390px uses compact cards. |
| 13. Desktop layout | PASS | 1440px-first shell, filters, and dense register were generated and refined. |
| 14. Mobile adaptation | PASS | 390px companion uses topbar menu/drawer pattern, filter trigger, cards, 44px intent, and no bottom navigation or page-level horizontal scroll. The 1024px/768px derivation remains specified in the brief/design contract. |
| 15. Accessibility | PASS | Persistent labels, text status, semantic controls, focus/target-size rules, and safe state messages are carried in the screen brief and design contract. |
| 16. Consistency with current frontend | PASS | Reuses the shell, filter/table/card, status badge, and Vietnamese administrative patterns identified in `apps/web/src`. |
| 17. Consistency with DESIGN.md | PASS | Screen-level layout, opacity, small-radius/border hierarchy, no decorative SaaS patterns, and responsive behavior follow the reconciled local contract. |
| 18. No invented business behavior | PASS | The initial non-canonical “Gửi duyệt” example and live state gallery were removed; the refined designs retain only documented Proposal List/submit concepts. |

## Revision history

1. Replaced generic institutional identity with DocManS/Học viện Quân y context; added required register columns; removed live state specimen gallery; replaced “Gửi duyệt”.
2. Removed the mobile bottom navigation and restored the full blocked-submit label plus safe reason.

## Result

**NEEDS_REVISION.** The historical PASS verdict overstated verification. Canonical synchronization and the artifact-level evidence identified above remain outstanding; no conclusion about the absence of product decisions is certified by this review.
