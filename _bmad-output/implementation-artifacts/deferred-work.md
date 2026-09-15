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
