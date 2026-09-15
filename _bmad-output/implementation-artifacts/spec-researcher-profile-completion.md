---
title: Complete researcher profiles and optional account onboarding
type: feature
created: 2026-09-15
status: done
route: dispatch
baseline_commit: 2c44d99df3910a3bc785026465b0249416763127
review_loop_iteration: 0
context:
  - /Users/Super/DocManS/AGENTS.md
  - /Users/Super/DocManS/CONTEXT.md
---

<frozen-after-approval reason="Explicit user request authorizes complete implementation and documentation updates">

## Intent

Complete internal/external Researcher Profile management and optional account onboarding through mandatory password change to My Profile. Profiles remain scientific identities independent of authentication accounts. Deliver working backend, UI, migration, and consistent governing documentation.

## Boundaries & Constraints

Always preserve exact granted organization scopes, backend capabilities, validation, audit atomicity, one active system role, and existing proposal/reviewer authority. Permit SYSTEM_ADMIN and SCIENTIFIC_MANAGEMENT_STAFF to manage profiles in explicit scope. Staff may provision/reset only researcher accounts, choosing internal/external role from profile type and an explicitly granted scope; no arbitrary elevated role/scope input. Admin account administration remains the existing admin surface. Account linking must not silently change roles/scopes. Profiles can be accountless, including external profiles. A unique nullable linkedUserId enforces one current account per profile and one profile per account, including inactive records. Unlink preserves history and immediately ends My Profile access. Existing review assignments remain source-owned.

Never write or modify tests, disclose passwords in API/UI/logs/audits, persist plaintext credentials, infer operational authority from self-reported participation, hard-delete participation history, or refactor unrelated functionality. Current user instructions supersede conflicting historic documentation. No real credential emails to people during verification. Keep local secrets out of output and tracked files.

## Acceptance Criteria

- Given either researcher type, when authorized staff/admin creates or edits a profile, then name, phone/email, organization/affiliation, academic title/degree, position, military rank, fields/expertise, status, notes, publications, and participation records are available and validated; account creation is optional.
- Given project participation, when recorded or corrected, then project/title, role, level (Academy/institutional, Ministry, other), dates/status and notes are retained with accessible revision history. Self-reported history is labeled and grants no rights; existing source records remain authoritative.
- Given a scoped manager, when searching/filtering/paging profiles or viewing history, then only authorized records/counts and permitted contact/link information are returned; inactive records remain visible to managers.
- Given an unlinked profile and supplied email, when account creation succeeds, then account plus explicit role/scope and link are atomic; a cryptographically random temporary password is hashed and emailed, with mandatory-change state on the Account. Missing mail configuration fails safely; failed/uncertain delivery is audited and visible with an authorized new-credential resend path. Never claim inbox delivery from SMTP acceptance.
- Given an eligible unlinked account, when an authorized manager links it, then uniqueness, scope, role restrictions and current versions are checked transactionally. Unlink/reset require reason and audit; staff cannot link/reset elevated accounts or change their own authority.
- Given a temporary credential, when login succeeds, then only session/logout/password-change functions work until a distinct policy-compliant new password is set. Backend guard blocks every normal protected endpoint. Change/reset invalidates old sessions/reset tokens and protects against racing stale credential writes; first-login change has atomic audit.
- Given an active linked account, when My Profile is used, then only its own linked profile is viewable/editable. Reject administrative/link/status/type/role/scope inputs; own contact, academic, position/rank, expertise, publication and participation fields are editable. Missing/inactive/stale links deny safely. Self profile edits never alter login email/role/scope.
- Given every material action, when committed, then audit records actor/time/target and safe change evidence for profile, link, account creation, temporary issuance/reset/delivery, and first password change.

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma`: User authentication; ResearcherProfile already has nullable unique linkedUserId. There is no current researcher-profile link/history service despite historical docs. Extend existing model; add migration without rewriting older migrations.
- `apps/api/src/researcher-profiles/`: CRUD DTO/service/controller, scoped access projection, and module. Reuse normalization, catalog validation, optimistic aggregateVersion and transactional AuditLogService. Existing optional-field clearing and empty expertise handling need correction for requested editing.
- `apps/api/src/auth/`: scrypt PasswordService, session AuthStore/guard, password-policy pipes, controller and safe contexts. `apps/api/src/admin/admin-users.service.ts` is another caller of reset. Read all callers before changing shared behavior.
- `apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx`, `apps/web/src/lib/researcher-profiles-api.ts`: extend existing Vietnamese form; add account access and publications/participation editing/history; consume backend capability data.
- `apps/web/src/components/auth/{session-provider,login-form,password-forms}.tsx`, `apps/web/src/lib/session.ts`, `apps/web/src/components/layout/app-shell.tsx`, `apps/web/src/fixtures/shell-context.ts`: first-change routing and My Profile navigation; add `/my-profile` page reusing profile editor where practical.
- `packages/permissions/src/index.{ts,js}`: maintain matching action registries for new capabilities.
- No mail sender exists; NotificationTemplate is configured through admin-config. Use configured SMTP with Nodemailer (no installed SMTP library), bounded timeout, TLS for nonlocal delivery, safe errors, env placeholders. SMTP is the default pending user provider choice. Native APIs do not implement SMTP. Reuse template convention without persisting rendered secrets.

## Tasks & Acceptance

- [x] `apps/api/prisma/`, auth/researcher modules and permission registry: implement schema, validated profile/history/link/account API, guarded authentication and atomic safe audit.
- [x] `apps/web/src/`: complete manager and My Profile UI, pagination/filters, detail/history, account operations, safe first-change navigation.
- [x] `.env.example`, dependency manifests, runtime documentation: document SMTP setup and failure/resend behavior, migration compatibility.
- [x] `requirements.md`, `CONTEXT.md`, `docs/{authorization-core-business-baseline,permission-matrix,user-flows,ux-ui-spec}.md`, `_bmad-output/{prd,epics,architecture}.md`, architecture `AUTHORIZATION-CONTRACTS.md`, applicable Epic 1/2 stories and this artifact: replace conflicting rules and describe actual behavior. Add concise API/data contract if needed and link it from owning docs. Preserve unrelated content.
- [x] Run existing static/build checks and focused existing tests if useful; no test files are written or modified. Record exact verification limits and migration/email status.

## Implementation Notes

User authorization covers this entire feature and documentation updates; no intermediate approval required. Execute changes sequentially and do not delegate implementation further. Database and UI verification may be performed by the coordinating agent after implementation. Do not deploy migrations to the user's primary database or send live emails merely to verify; use disposable local resources.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence and resolution |
| --- | --- | --- |
| Blind 1: candidate state | medium | Active/unlinked state was missing from discovery. Added the same state check as link execution. |
| Blind 2: admin unlink of elevated account | false | Unlink changes only the profile relationship, never elevated account credentials/role/scope. It is necessary to repair legacy links and explicitly authorized for SYSTEM_ADMIN. Clarified the contract. |
| Blind 3: self history link race | medium | History used an earlier profile read. Added active/current-link predicates directly to the history query. |
| Blind 4: scope revocation race | medium | User lock serialized user administration, but organization deactivation was independent. Added shared locks on the exact organization and scope rows until mutation commit. |
| Blind 5: production HTTP login URL | medium | Localhost HTTP was accepted in production. Restricted that exception to nonproduction environments. |
| Blind 6: malformed credential recipient | high | The permissive contact-style regex allowed address punctuation that Nodemailer interprets specially. Credential email now validates a single conventional mailbox with DNS-style domain labels. |
| Blind 7: reset mail preflight action | false | Current role policy grants both actions; no reset-only policy configuration exists. Passed the actual action anyway to keep preflight aligned with the named operation. |
| Blind 8: stale request hashing | medium | Stale requests reached scrypt before transaction checks. Hashing now follows locked state/version/role validation. |
| Blind 9: oversized directory projection | medium | Directory loaded all retained children. Replaced it with identity/status/account/capability summaries and a matching web type. |
| Blind 10: ignored sourceRecordId | low | Caller-provided source linkage was silently discarded. Reject non-null sourceRecordId for self-reported input. |
| Blind 11: mismatched reset role | medium | Reset accepted either researcher role after an admin role change. Both execution and capability projection now require the role matching profileType. |
| Blind 12: administrative self-history facts | medium | Self history returned full manager snapshots. Added a personal/scientific allowlist and omitted actor/reason/admin metadata. |
| Edge 1: reset after session/user reads | false | A reset occurring after the read does not invalidate the read's authorization point retroactively; a lock released before response has the same boundary. Subsequent requests compare current credential versions; session creation and profile writes revalidate under locks. |
| Edge 2: source-owned child id | false | This new table has no operational source writer or migrated source rows. Every creation is hardcoded SELF_REPORTED; operational history remains in separate source models. No reachable source-owned row can be superseded here. |
| Edge 3: mail header CR/LF | false | Installed Nodemailer MimeNode._encodeHeaderValue removes CR/LF before header encoding; the claimed header injection is already prevented by the SMTP library. |
| Gap 1: auth regression coverage | medium | Existing fixtures omit credential versions and mandatory-change state. No test edits per user; verified both researcher onboarding flows, protected-route denial, old-password/session rejection and atomic audit against disposable PostgreSQL. Automated coverage deferred. |
| Gap 2: provisioning/mail regression coverage | medium | No persistent behavioral tests for new account routes. Local HTTP/SMTP checks covered creation, uniqueness, relink, reset, UNKNOWN timeout and successful resend, with no response/audit secret exposure. Automated coverage deferred. |
| Gap 3: self-access regression coverage | medium | No persistent self-route tests. Runtime checks covered other-profile/directory/admin-field/inactive/stale denials and successful own updates. Automated coverage deferred. |
| Gap 4: child history regression coverage | medium | No persistent child-history tests. Runtime checks verified invalid calendar date rejection and retained SUPERSEDED predecessor. Automated coverage deferred. |
| Gap 5: migration regression coverage | medium | Existing migration harness predates this migration. All 21 migrations applied to disposable PostgreSQL; immutable-history UPDATE was rejected. No primary database deployment. Automated migration coverage deferred. |
| Gap 6: API client regression coverage | medium | Existing web checks inspect source text only. Production build and browser flows verify real list/detail/self routes and form rendering. Automated client coverage deferred. |
| Gap other: stale existing test contracts | medium | Existing admin-denial expectation and AuthStore fixtures use the old contracts. Left untouched under the explicit no-test-change instruction; full legacy suite is not claimed passing. |
| Local browser: missing mobile directory | medium | Shared CSS hides tables below the mobile breakpoint. Restored the existing mobile-list/list-card convention and verified visible actions without horizontal page overflow. |

## Verification

Completed on 2026-09-15:

- `npm run typecheck`, `npm run build:api`, Prisma generation/validation and `git diff --check` passed. `npm run build:web` passed in an isolated copy, preserving the user's running development build.
- All 21 migrations applied successfully to disposable PostgreSQL database `docmans_profile_check_20260915`. The history trigger rejected UPDATE. The primary database was not migrated.
- Synthetic internal and external researchers completed account creation, local credential-email receipt, restricted login, distinct first-password change and subsequent My Profile access. Old sessions and passwords were rejected after reset/change. Profile records remained independent of Account credentials.
- Direct HTTP checks passed for accountless creation, admin/staff scoped access, required/malformed email, invalid date, deactivate/reactivate, retained participation successor/predecessor, create/link/unlink/reset/resend, duplicate-account link rejection, inactive/other-profile/directory/admin-field/stale self denials, privacy projections and mutation scope locks.
- Local SMTP timeout produced UNKNOWN without a credential in the response. Resend after recovery produced ACCEPTED. Audit counts covered profile/account/link/issuance/reset/delivery and first-password-change; generated-account hashes were scrypt and no temporary-password values appeared in audit facts. Production HTTP login URL configuration was rejected.
- Real browser: staff login/list/detail/account section; 390px mobile cards with visible actions and no horizontal page overflow; 1440px detail; temporary-password session redirected to password change with only logout available and normal navigation hidden; My Profile personal edit saved successfully; stale browser edit showed 409 and succeeded after reload. Browser/API hosts were aligned in the isolated preview after an initial localhost mismatch.
- Three independent review layers completed. Every finding is triaged above; concrete implementation fixes were verified. Existing automated tests were not written, modified or run; stale fixtures and missing persistent regression coverage are recorded in `deferred-work.md`.

Deployment boundary: production needs the additive migration and configured SMTP/HTTPS login URL. No real credential email was sent. Temporary local verification resources are cleaned up at completion. No deployment or push is part of this change.
