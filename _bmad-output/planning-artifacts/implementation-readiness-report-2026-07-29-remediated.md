---
workflow: bmad-check-implementation-readiness
scope: scientist record-scoped authorization and dependent backlog
status: READY_FOR_SPRINT_PLANNING
baselineReport: /Users/Super/DocManS/_bmad-output/planning-artifacts/implementation-readiness-report-2026-07-29.md
validated: 2026-07-29
---

# Implementation Readiness — Remediated Result

## Final Assessment

**READY FOR SPRINT PLANNING** for the scientist record-scoped authorization
scope and every dependent workflow covered by the updated backlog.

The original readiness baseline was **NOT READY** with 22 findings. All
permission-related critical/high gaps and forward-dependency defects identified
by that baseline have been corrected in the PRD, architecture, normative
authorization contracts, epics, stories, and acceptance criteria.

Institutional governance approval of the scientist-permission policy remains a
production/UAT sign-off gate. It does not block backlog planning or
implementation against the product-owner-approved policy.

## Quantitative Result

| Measure | Baseline | Remediated |
| --- | ---: | ---: |
| PRD functional requirements | 74 | 79 |
| Exact FR-to-epic coverage | 67/74 | 79/79 |
| Epics | 11 | 12 |
| Stories | 49 | 79 |
| Acceptance scenarios | 134 | 313 |
| Story headings with direct FR traceability | not complete | 79/79 |
| Architecture reviewer blockers | 3 reviewer clusters | 0 |
| Architecture spine lint findings | n/a | 0 |
| Forward epic/story dependencies found | multiple | 0 |

## What Was Already Sufficient

- The original product scope covered all main research-administration domains.
- The existing backlog already contained usable proposal, project, task, file,
  notification, dashboard, seminar/student-research, document, council/ethics,
  and researcher-profile workflows.
- Backend authorization, organization scope, workflow state, audit, files,
  responsive UX, and accessibility were already recognized as cross-cutting
  requirements.
- Existing proposal participation and conflict work provided a useful
  brownfield seam for the target model.

## Gaps Corrected

### PRD

- Fixed the account/system-role versus record-relationship distinction.
- Added exactly one active system role and record-scoped PI,
  co-investigator/member, scientific-secretary, reviewer, council, ethics, and
  task relationships.
- Added explicit delegation governance, capability responses, relationship
  lifecycle, scientific-secretary positive/negative authority, review
  disclosure, co-investigator defaults, and PI acceptance-dossier submission.
- Added permission acceptance scenarios for multi-record roles, PI/member/
  secretary/reviewer cases, conflict, unrelated records, delegation,
  fail-closed behavior, lifecycle, disclosure, and governance.

### Architecture

- Added one ordered authorization context and deterministic denial registry.
- Added a brownfield migration constraint for legacy multi-role/global
  business-role data and existing permission seams.
- Added UTC half-open lifecycle semantics, exact action/delegation contracts,
  atomic context-version checking, job principals, append-only audit,
  minimum-disclosure capability/personal-work DTOs, and integration gates.
- Added a normative `AUTHORIZATION-CONTRACTS.md` companion.
- Passed deterministic lint and rubric, reality/currentness, and adversarial
  reviewer gates with no remaining blocker.

### Epics And Stories

- Reordered researcher identity before conflict-sensitive council/ethics work.
- Moved the shared file foundation before consuming domain workflows; every
  domain now adds its own file association in its owning story.
- Moved council/ethics document integration into the council epic rather than
  making the document epic depend on a future domain.
- Added positive scientific-secretary stories for proposal, project, and
  council contexts with explicit decision/review exclusions.
- Added PI acceptance-dossier preparation/submission before authority review
  and final decision.
- Added explicit member contribution and file boundaries.
- Added authorized source-query contracts before reminders, personal work,
  dashboard, search, report, and export aggregation.
- Added whole-response fail-closed aggregation, blocked-item presentation,
  stable counts/cursors, review disclosure, lifecycle boundaries, delegation,
  and conflict tests.

## Coverage Gates

| Gate | Result |
| --- | --- |
| PRD permission model is internally consistent | PASS |
| Every FR maps to an epic | PASS — 79/79 |
| Every FR is referenced by at least one story | PASS — 79/79 |
| Every story has user value and Given/When/Then AC | PASS — 79/79 |
| NFR coverage is evidenced | PASS — 20/20 |
| UX requirement coverage is evidenced | PASS — 18/18 |
| No story depends on a future story in its epic | PASS |
| No epic requires a future domain to function | PASS |
| Shared file/policy churn has explicit owner/adapter boundaries | PASS |
| Review identities/internal material follow one disclosure matrix | PASS |
| Conflict and delegation cannot be bypassed by role union | PASS |
| Canonical backlog source is unambiguous | PASS |

## Canonical Planning Sources

- PRD: `_bmad-output/prd.md`
- Architecture: `_bmad-output/architecture.md`
- Authorization spine:
  `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md`
- Normative authorization contracts:
  `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`
- Canonical epics/stories: `_bmad-output/epics.md`
- Epic/story validation:
  `_bmad-output/planning-artifacts/epics-validation-report-2026-07-29.md`

The former `_bmad-output/epics-and-stories.md` now points to the canonical
backlog. Its prior contents are preserved under `_bmad-output/archive/` for
historical comparison only.

## Recommended Next BMAD Workflow

Run sprint planning from `_bmad-output/epics.md`, starting with the brownfield
authorization migration and contract foundation in Epic 1. Do not implement
from the archived backlog.
