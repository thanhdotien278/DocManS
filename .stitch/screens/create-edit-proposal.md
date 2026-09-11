# Screen

Create/Edit Proposal (`/proposals/new`, `/proposals/:id/edit`), desktop-first at 1440px.

# Purpose

Capture a proposal draft in a controlled intake, support repeat saves, show completion/readiness, and preserve read-only submitted versions. Source: `docs/ux-ui-spec.md` §3.4.

# Primary users

Internal PI; assigned external/member only for assigned draft sections; a submit delegate only for its eligible submit action. Source: `docs/ux-ui-spec.md` §3.4.

# Entry points

Capability-gated Create Draft from Proposal List; Edit from an accessible draft workspace; supplement correction flow.

# Relevant source files

`docs/permission-matrix.md` §8.3–8.4; `docs/ux-ui-spec.md` §3.4; `apps/web/src/components/research-proposals/{research-proposals-panel,proposal-detail-workspace}.tsx`.

# Business state/context

Draft can be saved while incomplete. Formal submission is separate and only in draft/open-intake state. Submitted content locks. External users cannot create/submit or change protected fields. Sources: `docs/permission-matrix.md`; `docs/ux-ui-spec.md`.

# Viewer relationship

Display returned record relationship and capability context. Do not let a member/external relationship appear to grant PI authority.

# Required information

Intake; title/type/field; managing unit; PI/members; dates; objectives/content; budget metadata; required files; readiness summary. Source: `docs/ux-ui-spec.md` §3.4.

# Allowed actions

Save draft/assigned fields and allowed file actions only when backend returns action capability. The submit button routes to Submit Confirmation, never patches status directly.

# Blocked actions and explanation behavior

Disable restricted fields/actions with returned explanation where record disclosure permits; read-only submitted view explains lock state. Missing capability means no editable affordance.

# Main layout

Header with state/context; sectioned form; persistent readiness summary; required-files panel; local save action; submit route only when allowed. On desktop, readiness may sit beside the form; mobile places it in document flow.

# Components

Section headings; labelled native date fields; multi-line content fields; budget input; participant controls; file list/upload; section completion indicators; inline field errors; save status; readiness list.

# Loading state

Form skeleton on edit; never prefill inaccessible or stale values.

# Empty state

New proposal begins with empty allowed fields and applicable intake selection. If no intake is applicable, present a safe unavailable state rather than an improvised request workflow.

# Error state

Keep user-entered draft data on failed save when possible; show field/server errors near their cause. Do not treat readiness failure as a submission success.

# Permission/denial state

Read-only lock, section-level restriction, scope/conflict denial, and stale context each retain a clear explanation without exposing confidential rationale.

# Validation

Required fields/files, dates, non-negative budget, member/account uniqueness, and PI-protected fields follow backend validation. Client feedback may assist but never replaces it.

# Responsive behavior

1440: grouped form sections and adjacent readiness. 1024/768: two-column subgroups collapse. 430/390: one column, full-width actions, no narrow modal for long input, sticky save only if it does not obscure focus.

# Accessibility requirements

Visible labels, required/error semantics, focus to first invalid field, keyboard file controls, date inputs, readable validation summary, 44px mobile controls.

# Wireframe reference

No standalone current wireframe located; use `docs/ux-ui-spec.md` §3.4.

# Existing UI reference

`apps/web/src/components/research-proposals/research-proposals-panel.tsx`; `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`.

# Stitch generation instructions

Generate a disciplined sectioned form that foregrounds completion and readiness without inventing fields. Make draft save distinct from formal submission. Demonstrate field/section states and a small required-file list; retain institutional form density and responsive stacking.

# Acceptance checklist

- [ ] Includes only documented proposal fields and required-file/readiness concepts.
- [ ] Draft save is distinct from formal submission.
- [ ] External/member restrictions and submitted lock are represented safely.
- [ ] Validates/explains date, budget, member, file, and readiness failures.
- [ ] Remains usable at all requested breakpoints.
