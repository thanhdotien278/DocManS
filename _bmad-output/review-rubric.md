# PRD Quality Review — DocManSystem

## Overall verdict

The PRD has a strong product thesis, explicit phase boundaries, named multi-stakeholder journeys, and unusually concrete permission scenarios—especially for record-scoped roles, delegation, conflict policy, and fail-closed behavior. It is not yet fully ready to drive implementation across all seven phase-1 modules: the account-role taxonomy still has an unresolved edge, success measures are not decision-grade, and most FRs lack directly traceable acceptance consequences or defined workflow state models.

## Decision-readiness — adequate

The central decisions are visible rather than buried: the product is an internal operational control surface (§ Executive Summary), phase 1 is a single release containing seven named work items (§ Project Scoping), and explicit exclusions are consolidated (§ Phase 1 Out-Of-Scope). The permission reconciliation is also decision-oriented: one active system role, record-scoped relationships, explicit delegation, conflict blocking, backend-derived capabilities, and fail-closed behavior are stated across FR2/FR6a–FR6d and the permission acceptance scenarios.

However, a decision-maker still cannot close the authorization model or confidently commit the full release without resolving two points below. The decision log says PI, member, secretary, reviewer, and council roles “remain record-scoped,” while the PRD leaves open whether any may also be configured as an account-level role. The full seven-module release is also asserted against a generic team-capability assumption rather than an explicit feasibility gate or fallback decision.

### Findings

- **high** Account-level role vocabulary remains open (§ Identity, Users, Roles, And Organizations — FR2; § Role-Based Access Requirements) — FR2 says PI/member/secretary/reviewer/council permissions come from record relationships, but the later clause “unless explicitly configured as an account-level system role for another purpose” reopens the boundary, and the allowed account-level role values are never enumerated. This weakens the otherwise precise one-active-role decision and leaves navigation/authorization behavior underspecified for researcher accounts. *Fix:* Enumerate the phase-1 account-level system roles, identify the default researcher-facing role, and remove or narrowly define the exception.
- **medium** Single-release commitment lacks a feasibility decision gate (§ Project Scoping — Strategy & Philosophy) — The PRD commits all seven major modules and says resource pressure should remove only convenience features, while “Resource Requirements” merely assumes a capable full-stack team. It does not state the capacity, dependency, or readiness condition under which the release commitment remains valid. *Fix:* Add a release-readiness decision with minimum team/capacity assumptions, critical module dependencies, and the authorized fallback if those assumptions fail.

## Substance over theater — adequate

The vision is product-specific: “operational control surface” is carried through queues, state transitions, authorization, reminders, dashboards, and audit history (§ Executive Summary; § What Makes This Special). The seven named journeys drive concrete capabilities and permission outcomes, especially the scientific-secretary journey and its matching FRs and acceptance scenarios. NFRs are generally more specific than boilerplate, with measurable response-time percentiles, backend authorization coverage, retry behavior, and verification methods.

Some architecture-level statements—modular monolith, Prisma migrations, MinIO, backend service layers—sit in the PRD, but they function as explicit constraints rather than decorative claims. The short persona catalog mostly restates journey actors, yet those actors remain load-bearing for authorization and therefore do not amount to persona theater.

### Findings

_No material findings._

## Strategic coherence — thin

The strategic thesis is coherent: the problem is fragmented workflow visibility and accountability, and the proposed features consistently emphasize controlled state, next action, responsible actor, and auditability (§ Executive Summary; § What Makes This Special). The product scope and user journeys largely serve that thesis.

The weakness is validation and prioritization. Three business outcomes defer their targets until pilot/UAT, success measures have no stable IDs or measurement windows, and no counter-metrics are named. Meanwhile, the MVP is defined as every committed module in one release; the PRD distinguishes must-have from convenience features but does not prioritize among must-haves or show which capabilities most directly prove the thesis.

### Findings

- **high** Success measures cannot yet validate the product thesis (§ Success Criteria — Business Success and Measurable Outcomes) — “Target to be baselined during pilot/UAT” is used for proposal completeness, reporting preparation time, and on-time completion, with no owner, baseline method, target-setting date, or measurement window. The PRD also names no counter-metrics, so faster throughput could be achieved at the cost of review quality, excessive supplement requests, or inappropriate access without being detected. *Fix:* Assign stable SM IDs, owner, formula, baseline window, target-setting deadline, and evaluation window; add counter-metrics for review quality, false/duplicate reminders, authorization denials or leakage, and off-system workaround usage.
- **medium** Must-have scope has no thesis-driven ordering (§ Product Scope — MVP; § Project Scoping — Complete Feature Set) — The release is a broad capability inventory, but it does not identify the minimum end-to-end operational slice, dependency order, or evidence that distinguishes thesis-critical capability from merely committed scope. *Fix:* State a prioritized sequence of end-to-end slices and identify which success metric each slice is expected to move, without removing the committed phase-1 modules.

## Done-ness clarity — thin

The permission work is the strongest part of done-ness: the Given/When/Then scenarios cover multiple relationships, project-member limits, secretary boundaries, reviewer isolation, conflict assignment, self-approval, unrelated-record isolation, delegation expiry/revocation, and fail-closed denial (§ Permission Scenario Acceptance). NFR1–NFR10 and NFR13–NFR16 generally include a verification method.

Outside permissions, most of the 69 numbered FRs use broad verbs such as “manage,” “according to the workflow,” “important,” “relevant,” “designated,” or “where applicable.” The acceptance section proves module presence and high-level workflow enforcement, but it does not define completion for individual FRs or the state machines on which many FRs depend.

### Findings

- **high** Most FRs have no traceable acceptance consequence, and core state models are absent (§ Functional Requirements; § Acceptance Criteria) — The three Core Workflow Acceptance bullets cover entire modules, while FR22, FR30, FR35, FR53, and FR64 require controlled states without naming states, permitted transitions, actors, guards, or terminal conditions. Story authors therefore cannot determine what positive and negative scenarios complete each workflow. *Fix:* Add a compact acceptance catalog keyed to every FR or coherent FR group, plus a state/transition table for proposal, project, task, seminar/student-research, council, and ethics workflows.
- **medium** Product rules behind “important,” “required,” and “designated” are undefined (§ Files, History, And Auditability — FR36–FR40; § Notifications — FR41–FR43; § Dashboard, Search, And Reporting — FR48; § File Attachment Requirements) — The PRD does not identify the allowed file types/sizes, required package rules, designated export set, notification event/recipient/delivery expectations, or retention behavior needed to verify these requirements. *Fix:* Define or reference versioned rule catalogs with phase-1 defaults and acceptance examples for files, exports, notifications, reminders, and retention.
- **medium** Performance thresholds lack a reproducible workload profile (§ Non-Functional Requirements — NFR1–NFR4) — “Normal phase 1 operating conditions” and “concurrent usage scenarios” are not quantified by data volume, concurrent users, request mix, cache state, or measurement boundary. *Fix:* Add a named phase-1 performance profile and specify whether timings are API, server, or user-visible end-to-end measurements.

## Scope honesty — adequate

Scope is unusually explicit for a broad internal system. MVP, growth, future vision, and phase-1 exclusions are separated; no public portal, external identity, digital signatures, SMS, deep accounting, arbitrary workflow engine, search cluster, microservices, or Kubernetes are clearly excluded (§ Product Scope; § Phase 1 Out-Of-Scope). Risks are named directly, and target baselining is honestly acknowledged rather than presented as false precision.

The remaining weakness is open-item discipline. The PRD contains material assumptions but does not mark whether they are confirmed, owned, or scheduled for validation. With a single-release, high-complexity scope, those assumptions can silently become implementation commitments.

### Findings

- **medium** Material assumptions are listed but not controlled (§ Implementation Risks And Assumptions; § Success Criteria; § Browser Matrix) — Acceptance of the modular-monolith approach, local authentication, completeness of input documents, future pilot baselines, and “current versions of major evergreen desktop browsers” have no confirmation status, owner, or revisit condition. There is no Assumptions Index or Open Questions section. *Fix:* Convert each unresolved item to an indexed `[ASSUMPTION: …]` or open question with owner, due/revisit condition, and consequence if false; mark confirmed items as decisions.

## Downstream usability — thin

The document is sectioned cleanly and can be source-extracted by domain. FR and NFR labels are unique, permission scenarios are concrete, and every journey has a named protagonist. This provides a useful base for UX, architecture, and story generation.

For a chain-top PRD, however, traceability is not stable enough. Journeys and success measures are headings/bullets rather than UJ/SM IDs, acceptance bullets have no IDs, no glossary controls domain terms, and no explicit relationship connects journeys, FRs, acceptance scenarios, and success measures. The alphanumeric insertions FR4a, FR6a–FR6d, FR27a, FR30a–FR30b, and FR67a preserve uniqueness but make automated continuity checks less reliable.

### Findings

- **high** No stable UJ/SM/AC identifiers or requirement-to-acceptance linkage (§ User Journeys; § Success Criteria; § Acceptance Criteria) — Downstream workflows cannot cite an immutable success measure, journey, or acceptance criterion, and cannot prove that every FR is covered without reinterpreting prose. *Fix:* Assign UJ-N, SM-N, and AC-N IDs and add lightweight references from each acceptance criterion to its FR/NFR and journey; preserve existing FR IDs as stable identifiers.
- **medium** No glossary protects authorization and workflow terminology (document-wide) — Terms such as system role, account-level role, record-scoped relationship, participation, assignment, delegation, approval authority, reviewer, committee member, council member, and ethics reviewer carry different security consequences but are not defined in one canonical place. *Fix:* Add a concise glossary with canonical nouns and use those terms consistently across journeys, FRs, UX, and acceptance criteria.

## Shape fit — strong

This is a high-complexity, multi-stakeholder internal web application that feeds UX, architecture, epics, and stories; the PRD appropriately uses named journeys, a capability-oriented FR catalog, explicit governance constraints, UX requirements, and bounded NFRs. The journeys are load-bearing rather than decorative: Lan, Dr. Minh, Dr. Hoa, Colonel An, Huy, Mai, and Dr. Binh each expose different workflow and authorization needs.

The document is long because the product scope and permission model are genuinely broad, not because it was forced into a consumer or marketing template. The dedicated permission scenarios are especially well matched to the risk profile.

### Findings

_No material findings._

## Mechanical notes

- No glossary is present; `DocManSystem` and `RTMS` are declared aliases, but authorization-role nouns need canonical definitions.
- FR IDs are unique but not strictly numeric-contiguous because later additions use suffixes (`FR4a`, `FR6a`–`FR6d`, `FR27a`, `FR30a`–`FR30b`, `FR67a`). NFR1–NFR20 are contiguous.
- Journeys are numbered 1–7 and all have named protagonists, but they are not assigned `UJ-N` IDs. Success criteria and acceptance criteria are not assigned `SM-N` or `AC-N` IDs.
- No inline `[ASSUMPTION]` or `[NOTE FOR PM]` callouts and no Assumptions Index are present, so roundtrip validation cannot be performed.
- The permission decision is almost consistent, but the “unless explicitly configured as an account-level system role for another purpose” clause conflicts with the stronger record-scoped boundary implied by FR2 and decision D-020.
- The frontmatter `updated` date is 2026-07-29, while the visible document `Date` remains 2026-04-27; readers may mistake the latter for the current revision date.

## Resolution note — 2026-07-29

The permission-focused clear fixes from this review were applied after the
review snapshot:

- enumerated the four phase-1 system roles and removed the account-role escape
  hatch for PI/member/secretary/reviewer/council relationships;
- added an authorization glossary and clarified co-investigator semantics;
- added stable `UJ-1` through `UJ-7` and `AC-PERM-01` through
  `AC-PERM-13` identifiers;
- added relationship lifecycle, review-disclosure, and delegation-governance
  requirements and acceptance scenarios;
- changed the visible document metadata to show both created and updated dates.

Broader findings about success-metric baselines, full workflow state catalogs,
performance workload profiles, and release feasibility remain open because
they are outside the permission-source reconciliation scope of this update.
