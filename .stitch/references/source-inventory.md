# Source inventory and precedence

| Priority | Source | Design use |
| --- | --- | --- |
| 1 | `docs/authorization-core-business-baseline.md` | Business invariants, state machine, delegation, audit semantics |
| 2 | `docs/permission-matrix.md` | Record-scoped roles, scopes, actions, state gating |
| 3 | `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md` and `_bmad-output/architecture.md` | Capability/denial/context contract |
| 4 | `docs/user-flows.md` | Proposal and delegation journeys |
| 5 | `docs/ux-design-guidelines.md` | Interaction, accessibility, responsive rules |
| 6 | `docs/ux-ui-spec.md` | Screen requirements and IA |
| 7 | `_bmad-output/user-interface-workspaces-docmansystem.md` | Workspace/persona context |
| 8 | Current wireframe: no standalone wireframe artifact was located; `docs/ux-ui-spec.md` supplies the current layout reference | Flagged, not invented |
| 9–14 | `requirements.md`, `_bmad-output/prd.md`, `_bmad-output/epics.md`, `CONTEXT.md`, `_bmad-output/architecture.md`, `docs/diagrams/current-architecture.md`, `apps/web/src` | Supporting feasibility, terminology, and mature UI patterns |

## Existing UI reference set

- Shell/navigation: `apps/web/src/components/layout/app-shell.tsx`, `sidebar.tsx`, `mobile-nav.tsx`.
- Visual tokens/responsiveness: `apps/web/src/app/globals.css`.
- Shared primitives: `apps/web/src/components/ui/{page-header,filter-bar,section-card,status-badge,empty-state,timeline}.tsx`.
- Proposal list/create baseline: `apps/web/src/components/research-proposals/research-proposals-panel.tsx`.
- Proposal workspace/edit/readiness/file/history baseline: `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx`.

The current proposal list and detail workspace are mature enough to be visual references. Their behavior is still subordinate to the first three sources above.
