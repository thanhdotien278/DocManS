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
