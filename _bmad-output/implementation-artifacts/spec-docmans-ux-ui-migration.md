---
title: 'Adopt the standalone DocManS UX/UI system'
type: 'feature'
created: '2026-09-26'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: e226d7d5e86284c86329fb4ed471219668cec897
context:
  - '{project-root}/docs/ux-design-guidelines.md'
  - '{project-root}/docs/ux-ui-spec.md'
  - '{project-root}/docs/authorization-core-business-baseline.md'
  - '{project-root}/docs/contracts/project-execution.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** DocManS has a correct, newer business and authorization implementation but an inconsistent legacy presentation layer. The improved temporary checkout demonstrates a coherent institutional visual system, yet it also contains stale roles, unsupported fields, mock routes, and business assumptions that cannot become canonical.

**Approach:** Make the canonical UX documents standalone, classify every extra field, then migrate presentation in reviewable layers: shared tokens/primitives, the two-row responsive shell, and current API-backed screens. Reuse visual structure only; keep current data, workflow, capability, disclosure, audit, and project-execution contracts.

## Boundaries & Constraints

**Always:** Preserve the seven account roles, record-scoped relationships/assignments, backend `allowedActions`/`blockedActions`/reasons/context versions, fail-closed disclosure, immutable submitted evidence, current APIs, and Golden Flow 4 authority. Keep the app buildable after each batch. Category A fields may be exposed; B fields may be derived; C requires canonical documentation before cross-layer implementation; D is excluded; E remains unimplemented without blocking unrelated migration.

**Never:** Retain canonical documentation, imports, links, comments, symlinks, scripts, aliases, or runtime/build dependencies on the temporary checkout or `docs/ui-reference`. Do not copy reference role checks, APIs, DTOs, form schemas, mock values, workflow logic, unsupported routes, or database fields. Do not weaken backend authorization, replace current feature components wholesale, add schema columns for visual parity, or refactor unrelated modules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Shell | Authenticated current account | Institutional two-row desktop header; compact route-resetting mobile navigation; current canonical items | Missing session retains existing safe session/password-change states |
| Capability action | Visible record with allowed or blocked action | Allowed action works; disclosed blocked action is disabled with backend reason | Unauthorized sections/records remain omitted; stale context requests refresh |
| Extra reference field | Field absent from current contract | Classified A/B/C/D/E before implementation | D/E excluded; C stops only that field until canonicalized |
| Dense screen | 360–1440px viewport | Local table overflow or equivalent mobile cards; no page overflow; keyboard access retained | Loading, empty, error and validation remain visible |
| Reference deletion | Temporary checkout and UI reference directory unavailable | Canonical docs, typecheck, build and runtime imports remain unaffected | Any remaining dependency is a release blocker |

</frozen-after-approval>

## Code Map

- `docs/ux-design-guidelines.md`, `docs/ux-ui-spec.md` -- rewrite migration provenance into direct standalone DocManS requirements; preserve current authority corrections.
- `_bmad-output/implementation-artifacts/docmans-ux-field-audit.md` -- A/B/C/D/E mapping with DB/API/authorization impact and implementation decision.
- `apps/web/src/app/globals.css` -- existing token and feature-style hub; migrate selectively rather than replacing newer proposal/project rules.
- `apps/web/src/app/layout.tsx`, `apps/web/src/components/layout/{app-shell,mobile-nav,nav-link}.tsx` -- mounted shell, session states and canonical navigation; replace sidebar composition, not business navigation data.
- `apps/web/src/components/ui/` -- most reference primitives are structurally identical; restyle and add only missing semantic primitives such as native dialog/tabs.
- `apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx`, `apps/web/src/lib/researcher-profiles-api.ts` -- keep current canonical fields/API; adopt tabbed hierarchy and derive a printable summary only from existing data.
- `apps/web/src/components/{admin,proposal-intake-periods,research-proposals,projects}/`, `apps/web/src/app/` -- retain current business components; gain coherent presentation through shared shell/tokens and focused markup fixes.
- `apps/web/src/fixtures/shell-context.ts`, `apps/web/src/lib/navigation.ts` -- current seven-role/module source; do not import stale temporary fixtures or unit-label authorization heuristics.
- `tests/*ui-source.test.mjs`, existing auth/proposal/project tests -- preserve and extend only where a small persistent source/behavior check protects migrated semantics.

## Tasks & Acceptance

**Execution:**
- [x] Canonical UX docs -- remove temporary provenance and express all adopted rules directly; verify forbidden terms/links are absent.
- [x] Field-audit artifact -- classify profile and other extra fields; implement no C/E field without its gate.
- [x] Shared web foundation -- align tokens, typography, spacing, controls, cards, tables, tabs, feedback states, dialogs and responsive/print behavior with no new dependency.
- [x] Shell/navigation -- implement two-row desktop header, skip link, current-user context, active route state and compact mobile menu using current navigation/session contracts.
- [x] Current screens -- migrate dashboard, profile, proposals, reviews, projects, intake and administration via shared patterns; add tabbed/printable researcher presentation using only A/B fields.
- [x] Independence and verification -- remove all canonical source dependencies on the temporary locations; run source checks, typecheck, focused tests, production build and browser checks at representative breakpoints/roles.

**Acceptance Criteria:**
- Given the temporary sources are deleted, when canonical docs and the web app are checked, then no import/link/config/comment dependency remains and the UX documents still fully define the system.
- Given current users and records, when migrated screens load and mutate, then the same APIs, fields, capabilities, denial reasons, workflow outcomes and audit-sensitive boundaries remain in force.
- Given desktop and mobile widths, when key list/detail/form/profile/project screens render, then the shared visual system is coherent, page overflow is absent, and primary keyboard/focus/status semantics remain usable.
- Given the field audit, when implementation is reviewed, then A/B implementations are traceable, no D/E field is added, and every C field has a prior canonical source and complete cross-layer propagation.

## Implementation Notes

No irreversible database or external action was performed. The user requested that the prior UX-document edits be reverted before migration continued; the restored `HEAD` versions were verified to be standalone and free of the prohibited provenance, so they remain unchanged.

## Spec Change Log

- 2026-09-26: Implemented the field audit, shared shell/foundation, profile tabs and print view, list-first proposal creation, native form drawers, responsive/accessibility fixes, and capability-only management-officer visibility.

## Review Triage Log

## Verification

**Commands:**
- `git diff --check` and canonical-source provenance/symlink searches -- passed; the two restored UX documents match `HEAD` and production source has no dependency on either temporary location.
- `npm run typecheck` -- passed.
- `node --test tests/docmans-ux-migration.test.mjs tests/proposal-capability-ui-source.test.mjs tests/project-execution-capability.test.mjs` -- passed, 15/15.
- `npm run build` -- passed; web generated 27 routes and the API/Prisma build completed.
- `npm test` with local database access -- 130 passed, 53 failed, 1 skipped. Failures are existing stale assertions/mocks, led by five-role/model-list expectations and proposal mocks without `tx.user.findUnique`; no test was weakened.
- Playwright CLI against the local web/API -- passed desktop admin and researcher shells, live users/profiles/proposals/create-route loads, modal Escape/focus restoration, profile arrow-key tabs/print preview, route-resetting mobile navigation, and 390 px page-overflow check (`scrollWidth === innerWidth`).
