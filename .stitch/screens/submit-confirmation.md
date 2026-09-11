# Screen

Submit Confirmation (`/proposals/:id/submit`), a consequential final review before formal submission.

# Purpose

Let an authorized PI or exact-record approved `proposal.submit` delegate confirm formal submission only after backend-calculated readiness passes. Source: `docs/ux-ui-spec.md` §3.4.

# Primary users

PI; valid `proposal.submit` delegate only. Source: `docs/authorization-core-business-baseline.md`; `docs/permission-matrix.md` §8.3.

# Entry points

Submit action from an eligible draft/edit workspace.

# Relevant source files

`docs/authorization-core-business-baseline.md`; `docs/permission-matrix.md`; `_bmad-output/architecture.md`; `docs/ux-ui-spec.md`; `docs/user-flows.md`.

# Business state/context

Submission is a named backend operation, not a status edit. It locks an immutable version and is audited with actor/delegation context. The backend rechecks readiness and context version. Sources: `_bmad-output/architecture.md`; `docs/ux-ui-spec.md`.

# Viewer relationship

Identify PI or returned delegated submit authority without representing delegation as a global role.

# Required information

Final readiness checklist; version number; intake deadline; file summary; responsibility statement; immutable-version warning. Source: `docs/ux-ui-spec.md` §3.4.

# Allowed actions

Confirm submit only when returned action/capability and readiness permit it; Cancel returns to edit without mutation.

# Blocked actions and explanation behavior

When the record is visible but submit is blocked, show the backend safe reason and missing readiness items. Context mismatch requests refresh. No submit affordance for unauthorized viewers.

# Main layout

Full-page confirmation on narrow screens; concise confirmation panel or dialog on desktop. Put readiness and immutable-warning content before the destructive/consequential primary action.

# Components

Record identity/status; actor/delegation context; readiness checklist; missing-item correction links; file summary; version/deadline metadata; responsibility acknowledgement if returned/required; Cancel and Confirm controls.

# Loading state

Confirmation skeleton while readiness/capability loads; Confirm disabled until both resolve.

# Empty state

Not applicable: this surface always concerns one accessible proposal.

# Error state

Keep draft intact; show correctable missing fields/files from backend and route to their relevant edit section. Do not falsely show a submitted state.

# Permission/denial state

Safe unavailable response for inaccessible record; visible denied submit uses disabled control with reason only when record disclosure allows.

# Validation

Readiness is backend-calculated. Submit sends the context token; no direct status PATCH. Audit includes actor and applicable delegation context.

# Responsive behavior

1440/1024: contained confirmation panel beside an optional summary. 768/430/390: full-page or bottom-sheet confirmation, full-width actions, clear return-to-edit path.

# Accessibility requirements

Consequence and immutable warning announced before confirmation; keyboard focus order follows evidence then actions; dialog/sheet focus management; no color-only readiness information.

# Wireframe reference

No standalone current wireframe located; use `docs/ux-ui-spec.md` §3.4.

# Existing UI reference

`apps/web/src/components/research-proposals/proposal-detail-workspace.tsx` (current confirmation/readiness behavior); `apps/web/src/components/ui/status-badge.tsx`.

# Stitch generation instructions

Generate a sober institutional submission review, not a generic success modal. Show a complete readiness checklist, version, deadline, files, responsible actor context, immutable warning, and a secondary return-to-edit action. Include a blocked/missing-readiness state structurally, without fabricating rules.

# Acceptance checklist

- [ ] Makes formal submission a separate, consequential operation.
- [ ] Displays only documented confirmation information.
- [ ] Explains missing readiness/context issues without discarding draft work.
- [ ] Does not imply delegation beyond exact `proposal.submit` authority.
- [ ] Uses full-page/sheet behavior on narrow screens.
