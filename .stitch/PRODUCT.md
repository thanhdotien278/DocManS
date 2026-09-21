# DocManS design-facing product context

## Purpose

DocManS manages Military Medical Academy research proposals from controlled intake through review and decision, then into a distinct approved-project lifecycle. It is a governed workspace, not a generic document repository. Source: `CONTEXT.md`, `docs/authorization-core-business-baseline.md`.

## Users and relationships

`SCIENTIFIC_MANAGEMENT_HEAD` sees all proposals/projects in explicit Scientific
Management scope, current responsible Staff/unassigned state, officer filters/groups
and workload/status/deadlines. `SCIENTIFIC_MANAGEMENT_STAFF` management requires the
exact active `PROPOSAL_MANAGEMENT_OFFICER` / `PROJECT_MANAGEMENT_OFFICER`; other
PI/member/secretary/reviewer/council/task access supplies no management action. Head
is not leadership decision authority and oversight does not imply operational powers.
Head assigns/reassigns/revokes officers and submits completed Staff packages. Director combines
oversight with eligible final decisions; Deputy combines internal researcher eligibility with
read-only institutional oversight. Use finalized baseline §2.1; preserve conflict/disclosure,
one active primary officer, audited assignment history and consistent surface filtering.

System roles govern platform functions; record-scoped relationships and assignments govern business-record visibility and actions. A proposal has one `PROPOSAL_PI` from `ownerId` and only `TOPIC_SECRETARY`/`TOPIC_MEMBER` team rows; approved topics use `TOPIC_PI` plus the same team roles. An external researcher can work only on related approved-topic/task material or an assigned review and cannot create, edit, or formally submit a proposal. Sources: `docs/permission-matrix.md`, `docs/ux-ui-spec.md`.

## Authorization philosophy

The backend is authoritative and fail-closed. A visible record must render the returned `allowedActions`, `blockedActions`, denial reason, viewer relationship, and context version. A system role never independently grants a business-record action; a denied record must not become discoverable through list, count, facet, or design example. Sources: `docs/authorization-core-business-baseline.md`, `_bmad-output/architecture.md`.

## Core information architecture

The shell groups navigation by work: Dashboard/My Work; Proposals/Intake/Review; Approvals; Projects/Reports/Tasks; profiles and administration when authorized; Search, notifications, reports, and audit. Proposal surfaces begin with a list, then a record workspace with summary, participants, workflow, files, related records, history/audit, and disclosure-filtered role-specific work. Source: `docs/ux-ui-spec.md`.

## Proposal workflow

A current internal PI may create and edit a draft in an applicable open intake. The backend calculates readiness; formal submission is an explicit audited operation that creates an immutable submitted version. A supplement request returns the proposal to a controlled correction/resubmission flow. Proposal creation, submission, and resubmission are PI-only and never delegated. Sources: `docs/authorization-core-business-baseline.md`, `docs/permission-matrix.md`, `docs/user-flows.md`.

## Terms

Use the project vocabulary: proposal, approved project, intake period, PI, relationship, assignment, version, draft, submitted, supplement request, readiness, and audit. Do not use relationship labels as global roles. Source: `CONTEXT.md`.

## Responsive targets

Design desktop first at 1440px, with consistent derivations for 1024px, 768px, 430px, and 390px. The web workspace is desktop-first, while tables, filters, long forms, and confirmations must remain operable on small screens. Source: `docs/ux-ui-spec.md`.

Project, dashboard/reporting and notification backends without existing sources remain planned.
Current dashboard fixtures are demo-only. Funding uses available proposal budget metadata only.
