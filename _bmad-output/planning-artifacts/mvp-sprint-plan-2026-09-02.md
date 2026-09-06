---
title: DocManS MVP Sprint Plan
date: 2026-09-02
status: planning-baseline
readiness: Conditionally Ready
cadence: 2 weeks
authority: current UX, current architecture, authorization baseline, permission matrix, readiness report
---

# DocManS MVP Sprint Plan

## 1. Sprint Planning Overview

**MVP delivery goal.** Deliver a safe, demonstrable proposal path: an authorized
user enters a responsive authenticated workspace, a scoped intake is read, an
eligible PI creates and edits a draft, and every protected result/action is
backend-authorized, explainable, and audited.

**Readiness and implication.** The 2026-09-02 readiness assessment is
**Conditionally Ready**: planning and foundation/proposal implementation may
proceed. Approval, exports, notifications, and expanded domains remain planned
but cannot enter implementation until their listed decisions and V1 contracts
are recorded.

| Planning rule | Decision |
| --- | --- |
| Cadence | Two-week sprints. Sprint 0 is readiness-only; Sprint 1 is a small vertical foundation/proposal slice. |
| Decision authority | Current `docs/ux-ui-spec.md`, `docs/diagrams/current-architecture.md`, authorization baseline, permission matrix, Authorization Contracts V1, and readiness report. |
| Superseded statements | Do not use historical four-role or Redis statements for implementation decisions. The deployed scope has no Redis unless accepted current architecture restores it. |
| Role baseline | Five system roles: `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_STAFF`, `LEADERSHIP`, `EXTERNAL_RESEARCHER_USER`, and `RESEARCHER_USER`; record relationships add context but do not replace system roles. |
| Security boundary | Browser uses the NestJS API only. PostgreSQL/MinIO are private; UI capability data is not authorization. |
| MVP included | Foundation, identity/scope facts, proposal intake/draft/read, staff check/supplement, assignment/evaluation foundations, proposal result/decision subject to authority gate, project initialization/basic tracking, tasks/files, scoped operational views, and core hardening as each slice lands. |
| Deferred/non-MVP | SSO/MFA, native mobile, approval delegation, advanced reports/charts, broad exports, SMS/external integrations, complex preview, and any non-proposal domain without its V1 contract. |

### Conditional gates

1. Only `proposal.submit` delegation is currently permitted. Approval/rejection,
reviewer assignment, review/scoring, participation changes, and final decisions
are non-delegable unless the baseline is changed explicitly.
2. Leadership authority by organization level is required before decision work.
3. Export processing/preview, notification channel per event, dashboard chart
scope, mobile-critical screens, and audit-view holders require product decisions.
4. Before any project, task, report, council, ethics, document, or seminar
domain work: define named V1 actions, `contextVersion`, fact resolver,
transition service, audit events, disclosure rules, and allow/deny fixtures.

## 2. Canonical-to-Legacy Cross-Reference

Canonical task IDs below are delivery tasks, not legacy Story IDs. In
particular, canonical **3.2 is not legacy Story 3.2**.

| Canonical epic/task | Legacy reference | FR/NFR | UX screen/component | Dependency / numbering note |
| --- | --- | --- | --- | --- |
| 1.1 Auth/session | 1.2, 1.5 | FR4, FR4a; NFR5-8 | S01-S02, C01 | Canonical Epic 1 maps to legacy Epic 1. |
| 1.2 App shell/navigation | 1.1, 1.8 | FR4-6c; NFR14-16 | C01, sidebar, header, breadcrumbs | Capability drives actions, not sidebar visibility alone. |
| 1.3 Capability/denial states | 1.7, 1.8 | FR5-6c; NFR7-8 | shared contract, C05/C23 | Requires `ViewerAuthorizationV1` and `contextVersion`. |
| 2.1 Accounts/role/org | 1.3, 1.4 | FR1-3, FR6; NFR7,13 | S16, C05 | Exactly one active system role; exact org intersection. |
| 2.2 Catalogs | 1.6 | FR7-8 | S16 | Only values needed for intake/draft are Sprint 1 scope. |
| 3.1 Intake read/list | 4.1 | FR9; NFR1,3,7 | S04, C06-C07 | Canonical proposal Epic 3 maps to legacy Epic 4. |
| 3.2 Draft + participation | 4.2, 4.3 | FR10-11; NFR7,10,19 | S05-S06, C11-C12 | Not legacy 3.2 (which is file versioning). |
| 3.3 Proposal files/readiness/submit | 4.4-4.6, legacy 3.1 | FR12-14; NFR7,10,12 | S06-S07, C13-C14 | Submit delegation only after exact V1 check. |
| 4.1 Staff check/supplement | 5.1-5.2 | FR15-16; NFR7,10 | S07, C16/C23 | Sprint 3; named transition/audit required. |
| 4.2-4.3 Assignment/evaluation | 5.3-5.4 | FR17-18, FR68-69 | S08, C18 | Assigned-reviewer-only disclosure and conflict gate. |
| 4.4-4.5 Aggregation/approval | 5.5-5.8 | FR19-22; NFR4,7-10 | S09, C17 | Leadership authority gate; never a delegated approval. |
| 5 Project tracking | 6.1-6.10 | FR23-30b | S10-S11 | Requires a project V1 capability/transition contract first. |
| 6 Tasks | 7.1-7.5 | FR31-35 | S12 | Requires task V1 actions and relationship facts first. |
| 7 Files/history | 3.1-3.3, 9.1-9.5 | FR36-39,54-57 | S13, C13-C15 | Shared files module; object keys never authorize access. |
| 8-9 Dashboard/search/reports | 11.3-11.5, 12.1-12.5 | FR43-49 | S03, S14-S15 | Report/export and chart decisions gate work. |
| 10 Cross-cutting/supporting tracks | 3.4-3.5, 11.1-11.2, 8.1-10.9 | FR40-44,50-64 | audit/notification + supporting screens | Split by domain; do not schedule Epic 10 as one block. |

## 3. Sprint Plan Summary

| Sprint | Theme / main outcome | Canonical epics | Legacy stories | Demo value | Entry / exit criteria | Major gate |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Planning alignment and readiness fixes | cross-cutting | planning tasks | One authoritative, testable Sprint 1 backlog | Sources reconciled → tracker, capability, NFR, DoD and decision artifacts accepted | None; no feature code. |
| 1 | Foundation + intake/draft/read slice | 1, 2, 3 | 1.1-1.8; 4.1-4.3 | Login, role-aware shell, scoped intake list/detail, PI draft saved/read | Sprint 0 complete → allow/deny, audit, responsive/keyboard evidence passes | Seed/org/role facts and proposal V1 contract. |
| 2 | Complete proposal create/edit/submit + scoped list | 3, 7, 10 | 4.2-4.6; 3.1,3.4 | A valid PI submits an immutable proposal version | Sprint 1 stable → draft/readiness/submit transaction and file checks pass | File contract; only `proposal.submit` delegation. |
| 3 | Staff check, supplement, resubmission | 4, 10 | 5.1-5.2; 3.4-3.5 | Staff requests supplement; PI repairs and resubmits | Sprint 2 submit path accepted → named transitions/audit/disclosure pass | Supplement notification channel if notifications are included. |
| 4 | Reviewer assignment and evaluation foundations | 2, 4, 10 | 2.3-2.6; 5.3-5.4 | Staff assigns eligible reviewer; reviewer submits own evaluation | Conflict/relationship contracts and reviewer fixture suite pass | Reviewer disclosure/eligibility contract. |
| 5 | Aggregation and approval | 4 | 5.5-5.8 | Authorized leadership sees decision-ready proposal | Evaluation flow accepted → authority scope and decision audit pass | Leadership authority; no approval delegation. |
| 6 | Approved-project initialization + progress basics | 5 | 6.1-6.5,6.10 | Approved proposal becomes a scoped tracked project | Project V1 actions/resolver/transition/audit fixtures accepted | Project capability contract. |
| 7 | Tasks + file hardening | 6, 7, 10 | 7.1-7.5; 3.1-3.5 | Assigned task and authorized file evidence work safely | Task/file V1 contracts and direct-download denial tests pass | Task/file disclosure contracts. |
| 8 | Scoped dashboard, search, reports, audit hardening | 8, 9, 10 | 11.1-11.5; 12.1-12.5 | Users find authorized work and audit evidence | Source-domain contracts complete → scoped count/search/audit tests pass | Charts, export mode, notifications, audit viewers. |
| 9 | Stabilization, accessibility, documentation | all MVP slices | selected accepted stories | Release-candidate MVP UAT | All MVP evidence captured → regression, WCAG, responsive, migration and recovery checks pass | No new scope. |

Sequencing deliberately puts staff check before reviewer/approval and project
tracking after approval. It keeps canonical Epic 10 as small cross-cutting
stories, never a single sprint block.

## 4. Detailed Sprint 0 Story Map

| ID / title | Source and description | Deliverable / AC | Dependencies | Owner / size | Done evidence |
| --- | --- | --- | --- | --- | --- |
| S0-01 Canonical tracker | Readiness §§ Epic Coverage; epics consolidation map. Map each selected Sprint 1 item once. | Cross-reference table exists and names canonical + legacy IDs; no ambiguous `3.2`. | Current epics | Docs / S | Reviewer confirms all Sprint 1 rows map. |
| S0-02 Source precedence | Readiness Document Discovery and UX §0. Record governing sources. | One precedence note; current architecture/UX wins conflicts. | S0-01 | Docs / XS | Plan review finds no historic source used as authority. |
| S0-03 Current architecture boundary | Current architecture + readiness. Confirm deployed path and Redis exclusion. | Architecture note says browser → API → PostgreSQL/private MinIO; no Redis task. | S0-02 | Architect / XS | Architecture owner sign-off. |
| S0-04 Five-role confirmation | Permission matrix §§2-3. Confirm role/scoped-persona model and negative rules. | Seed/fixture role matrix for Sprint 1. | S0-02 | Product + backend / S | Five active roles and expected scoped actors recorded. |
| S0-05 Migration/test environment | Readiness recommendation; NFR13. Verify database, migration and test route before feature work. | Reproducible environment checklist. | Existing local stack | Backend + QA / S | Migration applies; targeted auth/proposal test command recorded. |
| S0-06 Capability checklist | Authorization Contracts §§1-6,11. | Reusable per-domain checklist: exact action, facts, resolver, context token, denials, disclosure, audit, fixtures. | S0-04 | Architect / S | Sprint 1 proposal contract checked item-by-item. |
| S0-07 Sprint 1 product decisions | Readiness required decisions. Resolve only decisions needed for intake/draft/read. | Decision log: intake scope, authorized creator, minimum fields, file scope, demo users. | S0-01 | Product / S | Product owner records decisions or explicitly removes gated story. |
| S0-08 Definition of Done template | NFR17-20 and UX shared contract. | Per-story DoD template mandates AC, tests, audit, accessibility, responsive, migration/API evidence. | S0-06 | QA + docs / XS | Template attached to every Sprint 1 story. |
| S0-09 NFR evidence checklist | PRD NFR1-20. | Checklist maps measurable/inspectable evidence to stories; no unverifiable blanket claim. | S0-08 | QA / S | Sprint 1 evidence columns are populated. |
| S0-10 Acceptance-criteria format | Legacy stories + UX flows. | Given/When/Then format requiring allowed and denied paths, not role-only UI checks. | S0-06 | Product + QA / XS | Every Sprint 1 story has executable AC. |
| S0-11 Issue metadata | `docs/agents/triage-labels.md`. | Recommend GitHub issue fields: canonical ref, legacy ref, FR/NFR, domain, gate, evidence links; labels `ready-for-agent`, `needs-info`, `ready-for-human`. | S0-01 | PM / XS | A sample issue template is reviewed; no issue creation required. |

## 5. Detailed Sprint 1 Story Map

Sprint 1 is intentionally small: it proves the shared boundary once, then
delivers the first proposal slice. “Done” means the listed evidence exists;
it does not mean a role-only UI appears to work. **Priority for every Sprint 1
row is MVP**; Later/Should-have work remains in the gated outline.

| ID / story (priority) | Canonical / legacy / FR-NFR | User story and scope | UX / API / data | Permission, workflow, audit, notification | AC and tests | Depends / size / owner / demo evidence |
| --- | --- | --- | --- | --- | --- | --- |
| S1-01 Auth session | C1.1; L1.2,1.5; FR4,4a; NFR5-8,19 | As an authenticated user, I want a safe session so I can enter only my workspace. Login/logout/session expiry/password change; controlled reset only if the existing route is ready. | S01-S02; login, logout, `/auth/me`; account/session data. | Fail closed inactive/invalid accounts; audit login/logout/password events; no notification. | Given valid active account, when logging in, then session and safe account context return. Given invalid/inactive account, then no partial access/disclosure. Keyboard + generic error test. | Existing auth baseline / M / full-stack. Demo login, expiry, denied direct route; API and audit test evidence. |
| S1-02 App shell | C1.2; L1.1,1.8; FR4-6c; NFR14-16 | As a user, I want a responsive shell so I can navigate authorized areas. | App shell, sidebar, header, breadcrumb, account context; no new design system. | Sidebar is advisory; no audit/notification. | Given each viewport 360-1440, when navigation opens, then no full-page horizontal scroll and drawer is labeled. Given keyboard navigation, then focus order/escape work. | S1-01 / M / frontend. Responsive screenshots + keyboard checklist. |
| S1-03 Capability and denial contract | C1.3-1.4; L1.7,1.8; FR5,6c; NFR7-8,10 | As a user, I want allowed and blocked actions explained so I know the next valid step. | Shared `ViewerAuthorizationV1`, `allowedActions`, `blockedActions`, reason, `contextVersion`; loading/empty/error/forbidden/stale/confirmation states. | Backend re-authorizes mutation atomically; unresolved/stale context denies; audit selected decision for protected action. | Given an allowed action, when context token matches, then action is offered and succeeds. Given scope/state/stale denial, then data/action is omitted or reason is safe and mutation fails. | S1-01 / M / full-stack. Contract + allow/deny/cross-scope/context-mismatch tests. |
| S1-04 Account/role/org facts | C2.1; L1.3,1.4; FR1-3,6; NFR7,13,19 | As an admin, I want exact account role and organization facts so proposal access is scoped correctly. | S16 minimum admin view/API; user, exactly-one role, organization scope records. | `SYSTEM_ADMIN` has no implicit proposal access; exact org intersection; audit changes. | Given a role/scope change, when saved, then it is validated/audited. Given a cross-scope actor, then proposal list/read is denied. | S0-04 / M / backend. Migration + scope negative tests + audit. |
| S1-05 Intake catalog/read | C2.2 + C3.1; L1.6,4.1; FR7-9; NFR1,3,7,19 | As an eligible user, I want to see open intakes in my scope so I can start a proposal. | S04 list/detail; scoped list/filter/read endpoints; intake/category data. | Only eligible/scope-visible intake data disclosed; read capability returned; read audit only if policy marks it important. | Given an open eligible intake, when listed, then it is visible within 2s target. Given closed/out-of-scope intake, then it is absent/denied. Loading/empty/error states tested. | S1-03,S1-04 / M / full-stack. Scoped list performance sample + cross-scope test. |
| S1-06 Create draft + PI relationship | C3.2; L4.2; FR10-11; NFR7,10,19 | As an eligible PI, I want to create a draft so I can begin a proposal. | S05; create-draft endpoint; proposal, intake link, `PROPOSAL_PI`, aggregate/context version. | Named `proposal.draft.create`; eligibility/scope checks; audit create; draft state only; no notification. | Given eligible PI/open intake, when creating, then draft and PI relationship are atomic. Given external researcher/unrelated user, then create is denied. | S1-05 / M / backend. Transaction, allowed/denied, audit tests; demo draft appears. |
| S1-07 Edit/read structured draft | C3.2; L4.3; FR11; NFR1,7,10,14-16,19 | As the draft PI, I want to edit and reread required proposal fields so I can prepare it. | S06, C11-C12; detail/read/update APIs; structured draft fields and version. | Exact `proposal.draft.read/edit`; context token required; draft-only transition; audit create/update; no notification. | Given PI draft with matching token, when saving valid fields, then only draft updates. Given stale token/non-member, then save/read fails safely. Inline validation, loading/error, keyboard, responsive tests. | S1-06 / M / full-stack. API + UI evidence, audit and stale-token checks. |
| S1-08 Scoped proposal list/detail | C3.1-3.2; L4.1-4.3; FR9-11; NFR1,3,7,8 | As staff or a participating PI, I want a scoped proposal list/detail so I can find authorized work. | S04-S06, C06-C07/C08; list/detail/capability responses. | Org + active relationship intersection; omission rather than null placeholders; no reviewer data. | Given staff in scope or active PI, when listing/detailing, then only permitted minimum data appears. Given cross-scope/unrelated actor, then no record/count leak. | S1-03,S1-06 / M / full-stack. List/detail/cross-scope/count disclosure tests. |
| S1-09 Draft workflow + audit timeline | C10 slice; L3.3-3.4; FR39-40; NFR9-10 | As an authorized operator, I want draft history so I can trace consequential changes. | C15; append-only audit/event storage and safe timeline API for draft create/edit. | Audit actor, UTC/as-of, target, exact action, context version, redacted before/after and decision code; no broad audit viewer yet. | Given create/edit, when it succeeds or is denied, then required audit event exists. Given unauthorized viewer, then protected audit data is denied. | S1-06,S1-07 / S / backend. Audit query + redaction/denial test. |
| S1-10 State and accessibility hardening | C1.4/C23; L1.8; FR6c; NFR14-16,20 | As a keyboard or small-screen user, I want every Sprint 1 state understandable and usable. | Shared loading, empty, error, permission-denied, inline validation, accessible dialogs, text/icon status. | Never show an unauthorized record merely to explain a denial; confirmation is reserved for irreversible actions, none added speculatively. | Given each Sprint 1 screen, when loading/empty/error/denied, then state has text, accessible name and focus behavior; no color-only status. | S1-02,S1-05-S1-08 / S / frontend + QA. Manual keyboard matrix and viewport evidence. |
| S1-11 Seed/demo alignment | Cross-cutting; L1.3-1.4; FR1-6; NFR7,20 | As a reviewer, I want deterministic demo actors so access evidence is repeatable. | Seed/demo documentation and fixtures for five roles plus in/out-of-scope PI. | No credentials in plan/logs; fixtures encode role, org, relationship and expected denial. | Given fixture set, when each scenario runs, then expected allowed/denied result is reproducible. | S0-04 / S / QA + backend. Fixture inventory and test output. |

### Sprint 1 Definition of Done

Each committed story has: reviewed Given/When/Then AC; backend allow and deny
coverage; cross-scope check where relevant; DTO validation; `contextVersion`
check on mutations; required append-only audit; accessible loading/empty/error/
denied state; responsive/keyboard check for affected UI; migration/test proof
where data changes; `git diff --check`; and a short demo/evidence link.

## 6. Later Sprint Outline and Gates

| Sprint | Goal / candidate stories | Required decision and V1 contract | Risks / do not begin until |
| --- | --- | --- | --- |
| 2 | Proposal files, readiness, immutable submit/history; scoped proposal list refinement. | Proposal file-download authorization, file metadata/disclosure, submission transition/audit, exact `proposal.submit` delegation rules. | Do not expose direct MinIO links or permit any delegation chain. |
| 3 | Staff completeness check, supplement request, PI resubmission. | Proposal check/supplement/resubmit actions, state resolver, audit and notification decision. | Do not implement status PATCHes or notification delivery without channel decision. |
| 4 | Reviewer assignment, conflict check, assigned-reviewer evaluation. | Reviewer assignment/evaluation capability, eligibility/conflict resolver, disclosure fixtures. | Do not reveal reviewer identity/raw scores or give unassigned reviewers access. |
| 5 | Aggregate results and approval/rejection. | Leadership authority by organization, decision payload/disclosure, decision audit; explicit baseline change if delegation is requested. | Do not start approval until authority is approved; never implement delegated approval by assumption. |
| 6 | Initialize approved project and basic milestones/progress. | Project actions, context version, fact resolver, transition service, audit events, allow/deny tests. | Do not create a project automatically outside the named approved transition. |
| 7 | Tasks and file hardening. | Task/file V1 action registries, assignee/record scope, download authorization, audit/disclosure fixtures. | Do not allow object-key access or task status bypass. |
| 8 | Dashboards, search, reports, audit-view hardening. | Dashboard chart MVP scope; report/export processing mode; audit-view holders; source contracts for every queried domain. | Do not return partial cross-domain counts; do not start exports before mode/retention decision. |
| 9 | Release stabilization and documentation. | Mobile-critical screen list; UAT/recovery acceptance. | Do not add seminar, student-research, related-document, council, or ethics work without each domain's V1 contract. |

Supporting domains (project/task/report/council/ethics and seminar/student
research) are planned, but are not silently pulled into active MVP sprints.
Each needs its own capability contract before its first UI/API slice.

## 7. Required Cross-Cutting Stories

The Sprint 1 and later maps schedule these as acceptance requirements, not a
late “hardening” batch:

| Concern | Planned first appearance |
| --- | --- |
| Permission-aware UI, allowed/blocked reason, context version | S1-03 |
| Record-level and organization-scope checks | S1-04 through S1-08 |
| Reviewer assignment-only visibility | Sprint 4 |
| File download authorization | Sprint 2, reinforced Sprint 7 |
| Loading, empty, error, denied states / inline validation | S1-03, S1-07, S1-10 |
| Confirmation for irreversible actions | Sprint 2 submit; later named transitions |
| Important action audit | S1-01, S1-04, S1-06-09; every later mutation |
| Keyboard/dialog accessibility; non-colour status; desktop-first responsiveness | S1-02, S1-10, regression each sprint |
| Seed/demo-user alignment | S1-11 |

## 8. NFR Evidence Plan

| NFR evidence | First story / continuing evidence |
| --- | --- |
| NFR1 list/detail/common action ≤2s, NFR3 search/filter ≤2s | S1-05/S1-08 controlled timing sample; extend to every list/detail. |
| NFR2 dashboard ≤3s | Sprint 8 dashboard measurement. |
| NFR4 non-blocking heavy work | Sprint 5 aggregation and Sprint 8 reports/export workflow test. |
| NFR5-6 encrypted transport/secrets | S1-01 deployment/config and auth-path inspection. |
| NFR7-8 backend authorization/fail closed | S1-03 plus every domain's allow/deny/cross-scope fixtures. |
| NFR9 queryable audit | S1-09 authorized query/redaction check; extend by action. |
| NFR10 atomic transitions | S1-06/S1-07 transaction and context mismatch tests; every named transition. |
| NFR11 retry-safe jobs | When notifications/reminders are approved, not before. |
| NFR12 soft delete | Sprint 2 files and each applicable later record lifecycle. |
| NFR13 migration safety | S0-05 and every schema story: migrate clean DB/test sequence. |
| NFR14-16 WCAG AA, responsive, non-colour status | S1-02/S1-10 keyboard + 360/390/430/768/1024/1440 check; repeat each UI slice. |
| NFR17-19 modular backend logic, strict DTOs | Design/code review for each story; S1-03 contract review. |
| NFR20 story-sized verification | Sprint 0 DoD and evidence links on every completed story. |

## 9. MVP Traceability Matrix

| MVP capability | FR/NFR | Canonical epic | Legacy story |
| --- | --- | --- | --- |
| Authenticated workspace and safe session | FR4,4a; NFR5-8,14-16 | 1 | 1.1,1.2,1.5,1.8 |
| Account, five-role, org-scope facts | FR1-3,6; NFR7,13 | 2 | 1.3,1.4 |
| Intake configuration/read | FR7-9; NFR1,3,7 | 2-3 | 1.6,4.1 |
| Draft proposal, relationship, structured edit/read | FR10-11; NFR7,10,19 | 3 | 4.2,4.3 |
| Proposal files, readiness, submit | FR12-14; NFR7,10,12 | 3,7,10 | 4.4-4.6,3.1,3.4 |
| Staff check/supplement/resubmission | FR15-16; NFR7,10 | 4 | 5.1,5.2 |
| Reviewer assignment/evaluation | FR17-18,68-69; NFR7-10 | 2,4 | 2.3-2.6,5.3-5.4 |
| Aggregation and leadership decision | FR19-22; NFR4,7-10 | 4 | 5.5-5.8 |
| Project initialization/progress | FR23-30b; NFR7-10 | 5 | 6.1-6.10 |
| Task and evidence | FR31-35; NFR7,10,12 | 6,7 | 7.1-7.5,3.1-3.3 |
| Audit/history, scoped search/dashboard/report | FR36-49; NFR1-4,7-9,14-16 | 7-10 | 3.3-3.5,11.1-11.5,12.1-12.5 |

## Planning Handoff

This document is a planning baseline, not a status change. Existing
`_bmad-output/implementation-artifacts/sprint-status.yaml` remains the legacy
implementation tracker and retains its more advanced statuses. Update it only
when implementation/story-artifact evidence changes; do not downgrade it to
match this fresh Sprint 0/Sprint 1 map.
