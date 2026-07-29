---
workflow: bmad-create-epics-and-stories
validationStep: 4
status: PASS
validated: 2026-07-29
artifact: /Users/Super/DocManS/_bmad-output/epics.md
---

# Epic and Story Final Validation

## Outcome

**PASS.** The epic/story artifact is complete enough to proceed to sprint
planning and story implementation. No uncovered FR, missing story structure,
placeholder, forward dependency, or implementation-readiness blocker remains
in the validated planning scope.

## Coverage Evidence

| Check | Result |
| --- | --- |
| Functional requirements in inventory | 79 |
| FRs mapped to an epic | 79/79 |
| FRs referenced directly by story headings | 79/79 |
| Epics | 12 |
| Stories | 79 |
| Given/When/Then acceptance scenarios | 313 |
| Stories missing user-story form | 0 |
| Stories missing acceptance criteria | 0 |
| Unresolved template placeholders | 0 |
| Story-numbering gaps | 0 |
| Markdown diff-check findings | 0 |

## NFR Coverage

| NFR area | Primary story evidence |
| --- | --- |
| NFR1, NFR3 — list/search latency | Story 12.1 |
| NFR2 — dashboard latency | Story 12.2 |
| NFR4 — queued heavy work | Story 12.5 |
| NFR5 — encrypted transport | Story 1.1 |
| NFR6 — secret/password handling | Stories 1.2, 1.5 |
| NFR7, NFR8 — backend authorization/fail closed | Stories 1.7–1.10 and domain stories |
| NFR9 — queryable audit | Stories 3.4–3.5 |
| NFR10 — atomic workflow operations | Submission, decision, transition, and file stories |
| NFR11 — retry/idempotency | Stories 11.1–11.3, 12.5 |
| NFR12 — soft delete/traceability | Stories 2.1, 3.2, 9.3 |
| NFR13 — Prisma migrations | Story 1.4 and entity-owning stories |
| NFR14–NFR16 — accessibility/responsive/status | Stories 1.1, 2.5, 3.3, 11.5, 12.1–12.4 |
| NFR17–NFR19 — modularity/backend business logic/strict TS | Stories 1.1, 1.7 and every source-domain contract story |
| NFR20 — story-sized change/review | All 79 stories; 160–338 words per story block |

## UX Requirement Coverage

| UX requirement | Primary story evidence |
| --- | --- |
| UX-DR1, UX-DR16 — institutional visual system and iconography | Story 1.1 |
| UX-DR2, UX-DR3 — shell, navigation, breadcrumbs, breakpoints | Story 1.1 |
| UX-DR4 — responsive tables/cards | Stories 2.5, 9.4, 12.1 |
| UX-DR5 — forms, validation, confirmations and feedback | Proposal, project, ethics, task, and document mutation stories |
| UX-DR6 — text/icon status and first-class states | Stories 1.1, 7.3, 8.4, 11.5 |
| UX-DR7, UX-DR18 — backend capability and all relationships | Stories 1.8–1.9 |
| UX-DR8 — visible disabled conflict actions | Stories 1.8, 5.7, 10.8, 11.5 |
| UX-DR9 — unified workspace/no role switch | Stories 1.8, 11.5 |
| UX-DR10 — personal work | Stories 11.4–11.5 |
| UX-DR11 — operational dashboards | Story 12.2 |
| UX-DR12 — timeline/history/current state | Stories 3.3 and domain transition stories |
| UX-DR13 — file metadata/version/actions | Stories 3.1–3.2 |
| UX-DR14 — search/filter/navigation | Stories 12.1, 12.3 |
| UX-DR15 — WCAG AA essentials | Stories 1.1, 2.5, 3.3, 11.5, 12.1–12.4 |
| UX-DR17 — review disclosure on every surface | Stories 5.3–5.8 and 10.5–10.9 |

## Architecture Validation

- Story 1.1 uses the selected Nx starter command and creates only the minimum
  workspace/web/API/shared-package foundation.
- Entity/schema work is introduced by the first story that needs that domain;
  no story creates all phase-1 tables up front.
- Story 1.4 owns the brownfield system-role migration and requires a tested
  Prisma migration.
- Stories 1.7–1.10 implement the normative authorization contracts before
  source-domain adoption.
- Source domains own relationship/state data and expose authorized ports; the
  shared permission layer does not own domain persistence.
- File, audit, notification, job, capability, disclosure, and context-version
  behavior matches `ARCHITECTURE-SPINE.md` and
  `AUTHORIZATION-CONTRACTS.md`.

## Dependency Validation

- Epic flow is monotonic: access/governance → researcher identity → files/audit
  → proposal → project/task/activity/document → council/ethics → notification
  and personal work → dashboard/search/report/export.
- No story requires a later story in the same epic.
- Epic 9 links only source domains already available; council/ethics document
  integration is correctly added in Epic 10.
- Each domain adds its own file association and authorized integration
  contract; no domain waits for a future generic file story.
- Personal work and dashboard/report aggregation occur only after all enabled
  source contracts exist.

## File-Churn Assessment

Repeated contact with shared authorization, files, audit, and contract packages
is intentional and bounded:

- Epics 1 and 3 own shared contracts/providers.
- Each business epic owns only its domain adapter, association policy, and
  canonical consumer fixtures.
- Aggregator epics consume versioned source contracts and do not reopen domain
  persistence.

Consolidating these business epics would exceed single-agent context and erase
meaningful workflow, disclosure, and conflict boundaries.

## Corrections Made During Validation

1. Added direct FR references to every story heading.
2. Updated Story 1.1 to use the architecture-selected Nx starter.
3. Added explicit institutional theme/icon, responsive, TypeScript strict, and
   encrypted-transport acceptance gates.
4. Added the tested Prisma-migration gate to the brownfield role migration.

## Remaining Non-Blocking Gate

Institutional governance approval of the scientist-permission policy remains a
production/UAT sign-off item as recorded in the architecture. It does not block
story planning or implementation against the product-owner-approved policy.
