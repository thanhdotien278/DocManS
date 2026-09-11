# Design-system reconciliation

## Scope and authority

Compared canonical Stitch asset `c957155014ff4a7b8a36f601db08d4cc` in project `3965040673492764594` with `.stitch/DESIGN.md`. Repository authority is `docs/ux-ui-spec.md` §5, `docs/ux-design-guidelines.md` §§2–6 and 13, plus the existing frontend patterns cited in `.stitch/references/source-inventory.md`. The reconciled local `DESIGN.md` retains compatible values before synchronization.

| Area | Existing Stitch pattern | Repository / reconciled requirement | Classification | Result |
| --- | --- | --- | --- | --- |
| Canvas sizes | 960×540 design-system instance; 1440px content model | Desktop-first design at 1440px; targets 1024/768/430/390 | MERGE | Retain 1440px design model; generate desktop at 1440px and validate target derivations. |
| Breakpoints | Desktop >1180; tablet 821–1180; mobile <820 | Desktop ≥1024; tablet 768–1023; mobile 360–767 | MUST_ALIGN | Replace with repository breakpoints. |
| Page max-width | 1440px | No conflicting cap; 1440px is required desktop target | PRESERVE_EXISTING | Retain 1440px cap. |
| Sidebar behavior | 276px desktop; 72px compact/drawer tablet; hidden mobile | Persistent desktop; compact/collapsible tablet; labelled drawer mobile | MERGE | Retain widths as implementation-neutral visual guidance; require breakpoint behavior and labelled mobile control. |
| Topbar behavior | Translucent frosted/blur overlay at small sizes | Topbar retains menu, search, notifications, account/scope; no glassmorphism | MUST_ALIGN | Use opaque light topbar; retain content priority. |
| Typography | Noto Sans body/headline, Source Sans 3 labels; 15px body | Sans-serif, Vietnamese readability, 14–16px body; Noto/Source allowed | PRESERVE_EXISTING | Retain hierarchy and sizes. |
| Primary/semantic colors | Forest green/gold and semantic success/warning/info/danger | Exact institutional palette and text-labelled semantics | MERGE | Align canvas/surfaces to `#F7FAF8/#FFFFFF/#F2F7F4`; retain compatible semantic palette and text labels. |
| Spacing | 8pt rhythm; 4px micro-steps; 16–28px gutters | Existing project layout uses an 8px rhythm and responsive gutters | PRESERVE_EXISTING | Retain. |
| Radius | 4/8/12/16/24px token ladder | Normally no more than 8px for panels/controls | MUST_ALIGN | Keep 4/8px operational radii; do not use larger radii for UI containers. |
| Borders/shadows | 1px sage borders plus low-opacity ambient shadows | Border-driven hierarchy; no heavy shadows | MERGE | Retain 1px border and only the low-opacity ambient shadow. |
| Table density | 52px standard rows, 40px compact ledger | Dense but scannable business tables | PRESERVE_EXISTING | Retain and document in local system. |
| Forms | 42px inputs, clear focus, structured labels | Labelled fields, inline errors, native date inputs, accessible focus | MERGE | Retain 42px/focus; add repository validation/accessibility rules. |
| Buttons | 42px green primary, outlined secondary, distinct destructive, gold focus | Same primary/secondary/destructive semantics and clear focus | PRESERVE_EXISTING | Retain. |
| Badges/status | 26px full-pill semantic labels | Status must not rely on color alone | MERGE | Retain geometry/semantic palette; require text label/icon/description. |
| Cards/panels | White, 1px sage border, 8px radius, low shadow | White panels, restrained borders, small radius | PRESERVE_EXISTING | Retain. |
| Drawers/dialogs | Overlay treatment includes blur; mobile behavior not specified | Long mobile flows use full-page/bottom sheet; no glass | MUST_ALIGN | Remove blur/transparency; use opaque modal/sheet and focus management. |
| Responsive navigation | Compact/drawer pattern | Tablet compact/collapsible; mobile labelled menu/drawer; icons never sole label | MERGE | Retain structural pattern, add labelled/accessibility constraint. |
| Responsive tables/lists | Mobile reflows tables to cards | Tablet keeps essential columns; mobile card list or contained table scroll only | MERGE | Retain card reflow; add essential-column and contained-scroll constraints. |
| Mobile sticky actions | No explicit rule | May be sticky for long forms; cannot cover content/focused field | MUST_ALIGN | Add constraint; Proposal List has no sticky action requirement. |
| Accessibility constraints | Focus style included but incomplete | WCAG AA floor, labels, semantic controls, `aria-live`, 44px mobile targets, reduced motion | MUST_ALIGN | Add repository accessibility floor. |

## Outcome

### Continuation verification — 2026-09-08

Signed-in follow-up: canonical project access is confirmed in Brave. Codex's separate browser still redirects to Google sign-in. Opened the existing asset's Edit → DESIGN.md panel; it provides targeted Find/Replace and Save controls. A native clipboard mismatch was detected before saving; those unsaved edits were discarded by reloading. Subsequent direct-field editing was interrupted when Brave's foreground page changed. No Save or Save & Apply was invoked. MCP read-back still reports asset version `1`. Continue in an uninterrupted Stitch browser session, then verify the complete saved asset before generating Proposal Detail.

Re-read the canonical asset with Stitch MCP. A further in-place update using only documented writable theme fields (excluding legacy `font`) returned `Request contains an invalid argument.` Read-back confirms asset version `1` and the complete returned asset are unchanged. The browser fallback shows **Sign In** and **404 / This page doesn't exist or isn't shared with you** for the private canonical project. Browser authentication is required before that fallback can be used.

Synchronization is **BLOCKED**, not complete. Proposal Detail generation is paused at this prerequisite; no replacement asset, project, or new screen was created in this continuation. Existing Material color defaults also differ from the prose palette and must be reconciled, not assumed correct. Existing business examples in the design system are visual examples, not authority for proposal states, readiness rules, or permissions.

The earlier outcome below is historical; generating Proposal List before successful synchronization did not satisfy the requested sequencing gate.

No `DECISION_REQUIRED` items remain. The intended in-place synchronization preserves compatible typography, spacing, component density, buttons, badges, and panels. Stitch rejected two schema-valid `update_design_system` requests with `Request contains an invalid argument`; to honor the no-second-design-system constraint, the canonical asset was not replaced. The generated screens were refined against this reconciliation; the asset-level MUST_ALIGN changes remain a technical synchronization follow-up.
