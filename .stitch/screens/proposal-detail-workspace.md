# Screen

Proposal Detail Workspace (`/proposals/:id`), desktop-first at 1440px.

# Purpose

Provide a disclosure-filtered record workspace for reading, permitted editing, readiness, files, workflow activity, and history. Source: `docs/ux-ui-spec.md` §3.4.

# Primary users

Any backend-authorized proposal viewer: relationship participant, scoped staff, assigned reviewer, or authority under disclosure rules.

# Entry points

Proposal List, My Work, review/approval queues, and direct accessible record links.

# Relevant source files

`docs/authorization-core-business-baseline.md`; `docs/permission-matrix.md`; `_bmad-output/architecture.md`; `docs/ux-ui-spec.md`; `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`.

# Business state/context

The detail response supplies disclosure-filtered data, capability response, context version, history, and allowed tabs. Submitted versions are locked; supplement and resubmission are named workflow operations. Source: `docs/ux-ui-spec.md` §3.4.

# Viewer relationship

Show returned relationship badge(s) and record scope/context line. The account’s system role is not a record role.

# Required information

Code/title/status; managing unit; PI; intake; due flag; next action; summary; participants; workflow; files; related records; history/audit; only permitted review/decision material. Source: `docs/ux-ui-spec.md` §5.3.

# Allowed actions

Render only actions from `allowedActions`; include draft edit/save, file actions, readiness, submit/resubmit, supplement request, review, or decision only when supplied by backend capability.

# Blocked actions and explanation behavior

For a visible record, keep relevant blocked actions disabled with safe returned reason. Context mismatch offers refresh before retry. Do not expose protected conflict or review material.

# Main layout

Breadcrumb; title/code/status; relationship and scope line; next-action strip; summary grid; tabs/sections; optional contextual right panel for next action/readiness/due date/blocked reason/related task.

# Components

Page header; status/relationship badges; context-refresh notice; sectioned form/read-only fields; readiness checklist; required-file list; timeline/audit; capability-aware action bar; accessible tab/section navigation.

# Loading state

Header and dossier skeleton; never substitute detail content.

# Empty state

Section-specific empty states only for permitted sections (for example, no attachments yet); do not claim the record is globally empty.

# Error state

One safe response for unavailable/not-found/unauthorized record access; retry only for transient loading failures.

# Permission/denial state

Omit undisclosed tabs; disable visible blocked actions with explanation; stale authorization context requires reload.

# Validation

Draft field validation and readiness are separate. Backend validates required files/fields and version token for mutations.

# Responsive behavior

1440: primary workspace plus optional right panel. 1024/768: stack inspector after main record content. 430/390: full-width sections, sticky actions that do not cover focused input, long flows as pages/sheets.

# Accessibility requirements

Semantic breadcrumbs/headings; keyboard tab/section navigation; programmatic state/error announcements; labelled controls; color-independent readiness/status; visible focus.

# Wireframe reference

No standalone current wireframe located; use `docs/ux-ui-spec.md` §5.3.

# Existing UI reference

`apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`; `apps/web/src/components/ui/{timeline,section-card,status-badge}.tsx`.

# Stitch generation instructions

Generate a formal dossier workspace with a strong record header, readiness/action rail, sectioned content, files, and history. Demonstrate disabled explained actions and a context-refresh notice, but no fabricated permissions or protected review information. Keep it dense, calm, and structurally responsive.

# Acceptance checklist

- [ ] Header contains record identity, status, relationship, scope/context, and next action.
- [ ] Visible actions are capability-driven and blocked actions explain safely.
- [ ] Submitted/read-only and stale-context states are clear.
- [ ] Sections match disclosed record data only.
- [ ] The right panel becomes stacked without losing critical content.
