# Deferred work

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

- **No creation fallback when no active proposal officer exists.** Contract + spec require the current scoped proposal officer to create the project; if that assignment is revoked/expired before creation, nobody can create (Head can only assign project officers). Needs a decision on a fallback creator (e.g., Head or a re-assigned proposal officer).
- **Open request permanently blocks all new requests.** `REQUEST_ALREADY_OPEN` (approved-projects.service.ts:501) rejects any new request while one is non-terminal, and no withdraw/cancel/expire path exists in contract or code. A stale draft or abandoned supplement_requested request freezes the project. Needs a withdraw or force-close action defined.
- **No authority path for routine milestone/checkpoint maintenance post-activation.** FR24/Story 6.2 require ongoing milestone maintenance, but the contract scopes `project.setup.configure` to preparing and only "important milestone" changes route through adjustment — "important" is never defined, and code restricts adjustment milestone changes to `isImportant` milestones (service.ts:661). Ordinary milestones have no permitted edit path.
- **No request path for shortening duration/end date.** Adjustments forbid end-date keys (EXTENSION_REQUIRED, service.ts:471-472) and extensions require a *later* end date (service.ts:494). Early completion or reduced timeline is impossible through any documented workflow. Needs a policy decision.
- **Extension undecidable when all scoped Heads are conflicted/inactive.** Only a scoped, unconflicted Head can decide (service.ts:623-624); no escalation or delegated-decider path exists, and a stuck `ready_for_head_decision` request blocks all future requests. Needs an escalation policy.
- **No abandon/cancel exit for a preparing project.** The state machine (architecture.md Approved Project State Machine) has no transition out of `preparing` except confirm; a wrongly created project persists forever. Needs a terminal transition or named retire action and owner.

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
  summary: CV workspace save logic (INACTIVE publication re-append, cvFromDraft researchExperience assembly, apiField/errorTabsOf routing) has only source-regex tests; add an executed workspace render/save harness.
  evidence: verification-gap review 13.4 — removing the INACTIVE append would hard-delete hidden publications with no failing executed test; module-private helpers and AGENTS.md ban on test-only exports block a cheap unit test.
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
