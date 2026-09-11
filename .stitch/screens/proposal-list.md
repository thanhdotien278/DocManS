# Screen

Proposal List (`/proposals`, `/my-proposals`), desktop-first at 1440px.

# Purpose

Let authorized viewers find only authorized proposals and open an already-discoverable record. Source: `docs/ux-ui-spec.md` §3.4.

# Primary users

Staff, authorized secretaries, internal researchers, and related participants. External researchers do not create proposals. Source: `docs/ux-ui-spec.md` §3.4; `docs/permission-matrix.md` §8.3.

# Entry points

Sidebar Proposals/My Proposals; scoped work-queue links; post-save return from draft creation.

# Relevant source files

`docs/authorization-core-business-baseline.md`; `docs/permission-matrix.md`; `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`; `docs/ux-ui-spec.md`; `docs/ux-design-guidelines.md`; `apps/web/src/components/research-proposals/research-proposals-panel.tsx`.

# Business state/context

Proposal state is backend-owned. List, count, facet, sort, and detail discovery must use the same authorization scope. Sources: `docs/ux-ui-spec.md` §3.4; `_bmad-output/architecture.md` capability contract.

# Viewer relationship

Render the backend-supplied relationship label per record where disclosed (PI/member/scientific secretary/reviewer assignment); never reinterpret it as a global role.

# Required information

Code, title, PI, managing unit, field, intake, status, submitted date, due/risk flag, and viewer relationship where disclosed. Source: `docs/ux-ui-spec.md` §3.4.

# Allowed actions

Open an accessible record. Offer Create only when a backend-applicable intake/capability allows it; do not offer it to external researchers. Source: `docs/permission-matrix.md` §8.3.

# Blocked actions and explanation behavior

Never render an inaccessible record, count, facet, suggestion, or denied detail. For a visible record, an otherwise blocked action is disabled with the returned safe reason.

# Main layout

Shell, page header/scope line, inline filter bar, result count, desktop table, and mobile card list. Preserve scoped active-item navigation.

# Components

Search; server-scoped filters/sort; removable applied-filter chips; status badge; relationship badge; loading skeleton; empty state; record link; capability-gated Create action.

# Loading state

Table-shaped skeleton preserving column structure; do not show stale or fabricated records.

# Empty state

Distinguish “no matching results” from “no accessible records.” Offer “Create draft” only if returned capability and intake state allow it.

# Error state

Inline retry-safe load failure. Do not reveal whether a specific inaccessible proposal exists.

# Permission/denial state

Safe not-found/unauthorized response for direct detail navigation; list itself remains disclosure scoped.

# Validation

Filters/sort are URL-persistent and server-authorized. Client validation is not an authorization decision.

# Responsive behavior

1440/1024: inline filters and table. 768: compact filters and table region. 430/390: labelled filter sheet with Apply/Clear, active filter summary, stacked proposal cards, no page-level horizontal scroll.

# Accessibility requirements

Persistent labels; semantic table headers; keyboard-operable filters and links; visible focus; text labels alongside status color; 44px mobile targets.

# Wireframe reference

No standalone current wireframe located; use `docs/ux-ui-spec.md` §3.4 and its core layout rules.

# Existing UI reference

`apps/web/src/components/research-proposals/research-proposals-panel.tsx`; `apps/web/src/components/ui/{filter-bar,status-badge,empty-state}.tsx`.

# Stitch generation instructions

Generate an institutional admin proposal register, not a marketing dashboard. At 1440px show the current shell, a scope line, filters, capability-gated Create Draft action, and a dense accessible table. Include only illustrative non-sensitive data. Make the layout derive cleanly to card-list mobile variants; no gradients, hero, glass, or unrelated widgets.

# Acceptance checklist

- [ ] Uses the existing institutional shell and data-first table language.
- [ ] Includes all required disclosed columns and relationship/status labels.
- [ ] Does not imply client-side authorization or discovery of inaccessible records.
- [ ] Has explicit loading, empty, error, and safe denial states.
- [ ] Is derivable at 1024, 768, 430, and 390px.
