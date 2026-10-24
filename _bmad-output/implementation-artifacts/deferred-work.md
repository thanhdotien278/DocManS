# Deferred work

> **10-role vocabulary (2026-10-18; `docs/permission-matrix.md`, §7 wins):** where entries below say Head read TP (or TB for review/assignment actions), Staff/"chuyên viên" read CV (acts only on its assigned records), and Leadership read GĐ (topic + funding, liquidation) or GĐ/PGĐ-KH (other signatures). Code identifiers and seeded account names quoted below describe the code as shipped on `DocManS`, which still has the earlier decision paths until stories 1.11 and 6.11.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for mandatory-change/session-version auth regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for account provisioning, linkage, SMTP failure/resend regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for My Profile ownership and administrative-field rejection regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for publication/participation validation and revision regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for researcher-profile migration/backfill/constraint regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for researcher profile API client browser regression cases.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.

- source_spec: `spec-researcher-profile-completion.md`
  summary: Automated coverage for existing auth/profile test fixtures that still encode earlier contracts.
  evidence: User explicitly prohibited writing or modifying tests; current release used static, disposable-database, HTTP, SMTP and browser verification.
- source_spec: `/Users/Super/DocManS/_bmad-output/implementation-artifacts/spec-fix-missing-researcher-profile-migration.md`
  summary: Add a real-PostgreSQL regression check that applies the researcher-profile completion migration and executes the profile-list query.
  evidence: Existing fake-Prisma and migration tests do not fail if `profile_type` is omitted; this verification gap predates the operational database reset.
- source_spec: `/Users/Super/DocManS/_bmad-output/implementation-artifacts/spec-fix-missing-researcher-profile-migration.md`
  summary: Add persistent post-seed assertions for all external researcher account organization scopes.
  evidence: Direct verification passed for external1, external2, and external3, but no normal automated test detects a future skipped or mis-keyed external scope.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Add a conflict-state projection to the leadership decision queue.
  evidence: The queue is server-scoped by authority and organization, while package and decision mutations still fail closed on conflicts; a per-row conflict read is deferred to avoid a second authorization projection.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Add composite persistence constraints tying review evidence IDs to the same proposal.
  evidence: Current-event and proposal binding are enforced in service reads and package snapshots; composite foreign keys require a wider schema migration.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Extend database append-only protection to summary and decision JSON evidence columns.
  evidence: Submitted review rows and submission events are protected in this slice; broader direct-SQL JSON immutability is a separate persistence hardening task.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Replace stale repository transaction fixtures and add full service-level approve/reject mutation coverage.
  evidence: The repository suite still fails before assertions on stale `tx.user.findUnique` and related mocks; focused boundary and queue tests pass.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Run full browser acceptance for both terminal outcomes and disclosure scenarios.
  evidence: API/web builds and focused checks pass, but the local browser/DB acceptance path was not available for this run.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Add dedicated service-level leadership disclosure assertions.
  evidence: Reviewer identity, raw scores and comments are removed from the leadership projection and legacy history actor names are redacted; a fixture-driven assertion is deferred with the existing stale mocks.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Re-run the migration and submitted-review trigger against disposable PostgreSQL.
  evidence: `npm run prisma:deploy` was attempted against the configured local database and Prisma returned only `Error: Schema engine error:`; no reset or reseed was performed.

- source_spec: `spec-proposal-review-approval-golden-flow.md`
  summary: Add browser or mock-fetch coverage for the decision request body.
  evidence: The typed client sends note, packageRevision and contextVersion; a dedicated browser/mock-fetch test is deferred until the local browser path is available.

## Deferred from: code review (2026-09-26)

- **No creation fallback when no active proposal officer exists.** Contract + spec require the current scoped proposal officer to create the project; if that assignment is revoked/expired before creation, nobody can create (Head can only assign project officers). Needs a decision on a fallback creator (e.g., Head or a re-assigned proposal officer). **Documented 2026-10-14 (spec-gf4-deferred-gaps):** Head reassigns the proposal officer on the approved proposal (existing action, no status gate) and that officer creates the project; see project-execution contract §Approved decisions. **10-role model:** TP¹/TB¹ reassign the proposal CV (matrix §9.5); the "no eligible actor" case is covered by the PI-withdraws rule below.
- **Open request permanently blocks all new requests.** `REQUEST_ALREADY_OPEN` (approved-projects.service.ts:502) rejects any new request while one is non-terminal, and no withdraw/cancel/expire path exists in contract or code. A stale draft or abandoned supplement_requested request freezes the project. Needs a withdraw or force-close action defined. **Resolved 2026-10-14 (spec-gf4-deferred-gaps):** requester PI withdraws any non-terminal request (`project.adjustment.withdraw` / `project.extension.withdraw`, terminal status `withdrawn`), which frees the project for a new request.
- **No authority path for routine milestone/checkpoint maintenance post-activation.** FR24/Story 6.2 require ongoing milestone maintenance, but the contract scopes `project.setup.configure` to preparing and only "important milestone" changes route through adjustment — "important" is never defined, and code restricts adjustment milestone changes to `isImportant` milestones (service.ts:661). Ordinary milestones have no permitted edit path. → planned: see split entry from spec-gf4-deferred-gaps.md (2026-10-14)
- **No request path for shortening duration/end date.** Adjustments forbid end-date keys (EXTENSION_REQUIRED, service.ts:471-472) and extensions require a *later* end date (service.ts:494). Early completion or reduced timeline is impossible through any documented workflow. Needs a policy decision. → planned: see split entry from spec-gf4-deferred-gaps.md (2026-10-14)
- **Extension undecidable when all scoped Heads are conflicted/inactive.** Only a scoped, unconflicted Head can decide (service.ts:623-624); no escalation or delegated-decider path exists, and a stuck `ready_for_head_decision` request blocks all future requests. Needs an escalation policy. **Documented 2026-10-14 (spec-gf4-deferred-gaps):** known limitation for the next flow; the requester PI can withdraw the stuck request to unblock the project. **Settled by matrix §7.3 (2026-10-18):** if no eligible TB/TP step actor or conflict-free GĐ/PGĐ-KH signer exists, the PI withdraws the request (story 6.11 adds only this rule to routing).
- **No abandon/cancel exit for a preparing project.** The state machine (architecture.md Approved Project State Machine) has no transition out of `preparing` except confirm; a wrongly created project persists forever. Needs a terminal transition or named retire action and owner. → planned: see split entry from spec-gf4-deferred-gaps.md (2026-10-14)

- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-1-cv-data-contract-storage-api.md`
  summary: Declare `express` as a direct dependency (or switch to a Nest-native scoped body parser) for the researcher-profiles 4 MB JSON limit in apps/api/src/main.ts.
  evidence: main.ts imports json/Router from express with @ts-ignore; express is only transitive via @nestjs/platform-express.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-1-cv-data-contract-storage-api.md`
  summary: Add an HTTP-level check that a >100 KB PATCH to /api/v1/researcher-profiles/my-profile is not rejected with 413.
  evidence: medium, unverified — no test boots the Nest app over HTTP; removing the parser line would pass all tests.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-2-cv-shell-and-general-tab.md`
  summary: Owners cannot edit publications/participations from /my-profile until Story 13.4 fills CV Tab 4.
  evidence: my-profile now renders ScientificCvWorkspace; Tab 4 is a placeholder per 13.2 spec.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-2-cv-shell-and-general-tab.md`
  summary: Add a web runtime test harness to cover cvFromDraft section preservation, ProfileRequestError 409/400 mapping and required-field save blocking.
  evidence: medium, unverified — only source-text regex tests exist for apps/web; a regression dropping CV sections on Tab 1 save would pass.

- source_spec: `_bmad-output/implementation-artifacts/spec-cv-general-tab-avatar-type-username-keywords.md`
  summary: The CV workspace's username payload rule (owner never sends, manager sends only on change) is only checked by a source-text test.
  evidence: Payload is built inside the React component; no web runtime harness exists to execute it. A regression would make every owner CV save 400 on administrativeFields.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-4-research-experience-and-achievements.md`
  summary: syncPublications updates every sent row, resetting updatedById/updatedAt on unchanged (incl. hidden INACTIVE) publications; skip unchanged rows like syncParticipations does.
  evidence: researcher-profiles.service.ts syncPublications calls update for every row with an id; pre-existing, now hit on every Tab 4 publication save.

- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-5-bm06-view-and-print-vi-en.md`
  summary: The CV workspace's `dirty` flag (unsaved-edits note on Tab 5) is only verified by a source regex, not a rendered workspace test.
  evidence: tests/researcher-profiles-ui-source.test.mjs never renders ScientificCvWorkspace; a drift between draftFromProfile and the draft state would show the note permanently without failing tests.

- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-8-publications-drawer.md`
  summary: Real evidence file upload/preview/download for researcher-profile publications (files API entity type, authz, publication-to-file link).
  evidence: Split from the publications Drawer refactor (2026-10-12). The files module only supports research_proposal/approved_project and a new publication has no id until the CV PATCH; the Drawer ships with the existing proofUrl link instead.

- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-8-publications-drawer.md`
  summary: Add a DOM test harness to cover the publications Drawer interactions (add/edit keeps id and status, author bubbles, delete removes the right row, discard prompt).
  evidence: verification-gap review 13.8 — the repo has no jsdom/browser harness, `Dialog` is stubbed in the UI test, and AGENTS.md forbids test-only production seams; only static rendering is tested.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-9-cv-list-sections-drawer.md`
  summary: Automated tests for the shared CvRowTable Drawer interactions (required/year-order/URL errors, unchanged save, delete confirm, Enter not submitting the outer form).
  evidence: Same gap as 13.8 — no jsdom/browser harness in the repo; these matrix rows were verified only in the real app; static rendering is tested.
- source_spec: `_bmad-output/specs/spec-scientific-cv/stories/13-10-own-cv-for-science-managers.md`
  summary: Post-login landing (TP/CV management roles → /dashboard, linked researchers → /my-profile) in login-form.tsx has no automated test.
  evidence: The repo has only source-text tests for web components and no runtime harness, so inverting `managesScience` would ship undetected; verified manually on 2026-10-13.

- source_spec: `_bmad-output/implementation-artifacts/spec-header-chip-cv-identity.md`
  summary: Add a DB-backed check for AuthStore.findProfileDisplay (ACTIVE-only filter, rank/degree codes, CV organization path).
  evidence: auth tests use a fake store, so dropping the status filter or renaming a column would pass every test; the SQL was only run by hand against local Postgres.

- source_spec: `_bmad-output/implementation-artifacts/spec-gf4-deferred-gaps.md`
  summary: GF4 — scoped Head cancels a `preparing` project (terminal `cancelled`, required reason, officer ENDED, versions bumped) and the same approved proposal can seed a new project (drop `approved_projects_proposal_id_key`, partial unique index `WHERE status <> 'cancelled'`, 1:N Prisma relation, project-list source filter ignores cancelled, `approaching` gated by active status, officer assign/revoke denied when cancelled).
  evidence: User decision 2026-10-13; split from the GF4 gaps spec on 2026-10-14 to keep each spec reviewable. Review notes: Head member → ACTION_NOT_GRANTED, evaluator conflict → CONFLICT_DENIED; ProposalManagementOfficer untouched.

- source_spec: `_bmad-output/implementation-artifacts/spec-gf4-deferred-gaps.md`
  summary: GF4 — assigned Staff edits non-important, non-completed milestones (title/description/dueDate/responsibleMemberId, null allowed; never isImportant/status/position) and open checkpoints not linked to an important milestone (title/dueDate) while executing/paused; dates within [startDate, endDate]; relationshipVersion bumped when responsibility changes.
  evidence: User decision 2026-10-13; split on 2026-10-14. A direct edit bumps aggregateVersion, so pending requests fail decision with CONTEXT_VERSION_MISMATCH; recovery is request-supplement → PI resubmit.

- source_spec: `_bmad-output/implementation-artifacts/spec-gf4-deferred-gaps.md`
  summary: GF4 — an adjustment may shorten `endDate` (YYYY-MM-DD, earlier than the non-null current date, ≥ startDate); Staff approval also sets `planSnapshot.endDate`; reject when any open milestone/checkpoint or non-accepted report period ends after the new date (re-queried after applying the request's milestoneChanges, which are validated against the new date); add endDate to adjustment currentValues; all 4 `assertAdjustmentValues` callers take `project`.
  evidence: User decision 2026-10-13; split on 2026-10-14. Increases stay extension-only (EXTENSION_REQUIRED).

- source_spec: `_bmad-output/implementation-artifacts/spec-gf4-deferred-gaps.md`
  summary: Add a DB-backed check that the `project_requests_status_check` migration accepts `withdrawn`.
  evidence: Service tests use an in-memory Prisma fake that does not enforce CHECK constraints; the migration was verified only by a manual deploy to a disposable DB plus an HTTP smoke run (2026-10-14).

- source_spec: `_bmad-output/implementation-artifacts/spec-gf4-deferred-gaps.md`
  summary: When a PI-change flow is introduced, let the current active PI (or Staff) close requests created by the previous PI.
  evidence: Withdraw requires requesterId === actor; unreachable today because no GF4 path ends or replaces TOPIC_PI (adjustment cannot end TOPIC_PI, service.ts:698), but a future PI change would recreate the frozen-project problem.

## Deferred from: code review of spec-golden-flow-4-project-execution.md (2026-10-14)

- Two active TOPIC_PI rows are possible if a source snapshot member carries TOPIC_PI (createFromApprovedProposal, service.ts:215; no partial unique index). Unverified (maybe-false, would be medium): check whether proposal members can carry participationRole TOPIC_PI.
- `listProjects` has no pagination and deep-loads every candidate project about 3 times (service.ts:110); a scale issue.
- Supplement `responseDeadline` (report and request) is stored but never enforced or surfaced as overdue; needs a late-response policy.
- PI actions depend on host-org scope as well as active TOPIC_PI membership (project-capability-v1.ts:69); confirm the policy.
- (code review batch 2, frontend) Staff/Head workspaces lack the contract's reporting calendar, unassigned/officer views and prepared-extension queue; `GET /projects/monitor` is unused by the web client.
- (code review batch 2, frontend) The project setup form creates only one milestone+checkpoint; multi-milestone setup UI is missing.
- (code review batch 2, frontend) No executed test for the UI action→route mapping (`requestAction`, `canItem` in project-detail.tsx); the repo has no component or e2e harness for apps/web.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: Adjustment requests stored with the pre-batch-1 full-snapshot `currentValues` can never be decided (CONTEXT_VERSION_MISMATCH).
  evidence: `decideRequest`/`submitRequest` compare against the new narrow baseline; settle by checking for in-flight adjustments in any real DB or backfilling.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: `requestBaseline` checks member activity with the wall clock instead of the transaction clock.
  evidence: approved-projects.service.ts requestBaseline uses `new Date()`; a natural effectiveUntil expiry can stale a request.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: Setup milestones are not bounded by the project start date (checkpoints are).
  evidence: configureSetup checks milestone dueDate against endDate only.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: `protect_project_report_revision` trigger lets a non-draft report be set back to `draft` and then edited.
  evidence: Trigger guards content only while OLD.status <> 'draft' and never guards status; unverified against the real DB.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: Legacy `supplement_requested` reports with an existing correction are not backfilled to `superseded`.
  evidence: Migration 20261015000000 adds the status without a backfill.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: Overdue flag persists after an on-time submit when a milestone shares the checkpoint's due date.
  evidence: toProjectResponse removes reported checkpoints but not their milestones from deadlines.
- source_spec: `_bmad-output/implementation-artifacts/spec-golden-flow-4-project-execution.md`
  summary: Accepting a report may stale a pending adjustment that touches the completed milestone (maybe-false).
  evidence: Milestone baseline includes status; needs a service test on a touched milestone.
