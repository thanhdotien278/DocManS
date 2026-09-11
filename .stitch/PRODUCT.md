# DocManS design-facing product context

## Purpose

DocManS manages Military Medical Academy research proposals from controlled intake through review and decision, then into a distinct approved-project lifecycle. It is a governed workspace, not a generic document repository. Source: `CONTEXT.md`, `docs/authorization-core-business-baseline.md`.

## Users and relationships

System roles govern platform functions; record-scoped relationships and assignments govern business-record visibility and actions. Relevant proposal relationships include PI, member, scientific secretary, and reviewer assignment. An external researcher can work only on assigned draft/review material and cannot create or formally submit a proposal. Sources: `docs/permission-matrix.md`, `docs/ux-ui-spec.md`.

## Authorization philosophy

The backend is authoritative and fail-closed. A visible record must render the returned `allowedActions`, `blockedActions`, denial reason, viewer relationship, and context version. A system role never independently grants a business-record action; a denied record must not become discoverable through list, count, facet, or design example. Sources: `docs/authorization-core-business-baseline.md`, `_bmad-output/architecture.md`.

## Core information architecture

The shell groups navigation by work: Dashboard/My Work; Proposals/Intake/Review; Approvals; Projects/Reports/Tasks; profiles and administration when authorized; Search, notifications, reports, and audit. Proposal surfaces begin with a list, then a record workspace with summary, participants, workflow, files, related records, history/audit, and disclosure-filtered role-specific work. Source: `docs/ux-ui-spec.md`.

## Proposal workflow

A PI may create and edit a draft in an applicable open intake. The backend calculates readiness; formal submission is an explicit audited operation that creates an immutable submitted version. A supplement request returns the proposal to a controlled correction/resubmission flow. Delegation is exact-record and only for `proposal.submit` once approved. Sources: `docs/authorization-core-business-baseline.md`, `docs/permission-matrix.md`, `docs/user-flows.md`.

## Terms

Use the project vocabulary: proposal, approved project, intake period, PI, relationship, assignment, version, draft, submitted, supplement request, readiness, and audit. Do not use relationship labels as global roles. Source: `CONTEXT.md`.

## Responsive targets

Design desktop first at 1440px, with consistent derivations for 1024px, 768px, 430px, and 390px. The web workspace is desktop-first, while tables, filters, long forms, and confirmations must remain operable on small screens. Source: `docs/ux-ui-spec.md`.
