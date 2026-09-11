---
name: DocManS Institutional Administration
status: draft
sources:
  - docs/ux-design-guidelines.md
  - docs/ux-ui-spec.md
  - apps/web/src/app/globals.css
  - apps/web/src/components/layout/app-shell.tsx
  - apps/web/src/components/layout/sidebar.tsx
  - apps/web/src/components/layout/mobile-nav.tsx
updated: 2026-09-07
---

## Brand & Style

DocManS is an institutional, data-first administrative workspace for the Military Medical Academy. It should be calm, official, and legible during long review sessions. Prefer information hierarchy, borders, and whitespace over visual novelty. Do not use hero banners, gradients, glassmorphism, decorative SaaS widgets, or excessive shadows.

## Colors

- Canvas: `#F7FAF8`; working surface: `#FFFFFF`; muted/inset surface: `#F2F7F4`.
- Institutional primary: `#145A37`; dark navigation: `#0F3F2A`; soft selected/hover surface: `#EAF5EF`.
- Text: `#10251B` primary and `#52665A` secondary; border: `#DDE8E1`.
- Gold `#D6A51E` is a restrained institutional accent and focus treatment, never decoration.
- Semantic statuses stay text-labelled and use the existing success/warning/info/danger treatment. Never convey state by color alone.

## Typography

Use the existing Noto Sans / Source Sans 3 hierarchy in Stitch: clear Vietnamese support, compact data labels, and readable body text. Use sentence-case labels unless an existing component calls for its compact label treatment. Titles are functional rather than editorial; preserve dense but scannable tables.

## Layout & Spacing

Use an 8px rhythm with 4px micro-spacing. At desktop, retain the app shell: persistent dark-green sidebar, topbar, and a light content pane. Record workspaces may use a contextual right panel for next action, readiness, due date, blocked reason, and related task; never place a critical decision or audit record only there.

Keep a 1440px maximum content width. At 1440px, data tables and primary/secondary panels may sit side by side. From 1024px, retain the desktop shell; from 768–1023px, compact/collapse the sidebar while preserving topbar account/scope context; from 360–767px, use a labelled drawer/menu and one-column content. At 430px and 390px, replace wide tables with record cards and use full-page or bottom-sheet flows for long forms and confirmations. Do not allow page-level horizontal scrolling.

## Elevation & Depth

Use white panels with 1px sage borders. Border-driven hierarchy wins over heavy shadow; any shadow is an ambient, low-opacity support cue, never a floating SaaS effect. Overlays and topbars use opaque/light surfaces rather than translucent blur. Keep radii small (4–8px); status labels may remain pills because they are metadata, not containers.

## Shapes

Inputs, buttons, cards, dialogs, and drawers use small, consistent rounding. Interactive controls must retain visible focus styling and must not rely on icon-only labelling.

## Components

- **Shell and navigation:** Use the current desktop sidebar, topbar, active route state, and labelled mobile menu/drawer. Current system role is account context, not the user's record relationship.
- **Buttons:** Primary action is forest green; minimum height 42px. Secondary actions are white with sage border. Destructive actions remain visually distinct. Keep the existing gold focus ring. Disabled but visible protected actions include the backend-provided denial reason.
- **Inputs and forms:** Clear persistent labels, inline validation, required-state indication, and field-level error copy. Standard controls are at least 42px high. Use native date fields unless a source requires otherwise.
- **Tables and filters:** Desktop filters are inline above a table; selected filters are removable chips. Use the existing 52px standard desktop row and 40px compact-ledger density where appropriate. Mobile filters open in a labelled drawer/bottom sheet with Apply and Clear. Tables reflow into cards on mobile.
- **Cards and metadata:** Reuse `SectionCard`, summary grids, `StatusBadge`, relationship badges, and `PageHeader` patterns from `apps/web/src/components/ui`; panels use white, 1px sage border, 8px radius, and optional low-opacity ambient shadow.
- **Status and authorization:** Render viewer relationship, `allowedActions`, `blockedActions`, context freshness, and safe denial reason returned by the backend. Never derive access from role, unit, or a visible record.
- **Timeline/history:** Use chronological, auditable event rows; show only disclosure-filtered information.
- **Dialogs/drawers:** Confirmation is for consequential state transitions. Preserve the editable draft and show correctable errors when a submit attempt fails.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Preserve the existing administrative shell and data density | Redesign mature patterns for novelty |
| Show visible, explained blocked actions when the record is already visible | Hide a denial as though the record does not exist |
| Use backend-provided capability and context state | Infer authority from role labels |
| Keep accessible labelled controls and keyboard focus | Use icon-only navigation or color-only status |
| Use responsive card representations for tables | Force desktop tables into narrow mobile viewports |
