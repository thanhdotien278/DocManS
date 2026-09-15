# Researcher profiles, account access and My Profile

Effective 2026-09-15. This contract implements the explicitly requested completion
of FR65–FR69 and researcher account onboarding. It supersedes older Story 2.1
field exclusions and the future-only classification of researcher email onboarding.

## Identity and authority

- `ResearcherProfile` is a scientific identity independent of `User` (Account).
  A profile may have no account. Nullable unique `linkedUserId` is the current
  one-to-one link, including inactive profiles/accounts. Ended link rows preserve
  history; `ResearcherProfileAccountLink` has at most one ACTIVE row on each side.
- Active `SYSTEM_ADMIN` and `SCIENTIFIC_MANAGEMENT_STAFF` manage profiles only in
  explicitly granted active organization scopes. This administrative permission
  does not grant proposal editing, review, approval or access to unrelated records.
- Managers create, view, update, search/filter/page, activate/deactivate profiles,
  inspect history and use the System Account / Access section. Profiles require
  name, managing organization, type (INTERNAL/EXTERNAL; default INTERNAL) and at
  least one active research-field catalog value. Contact fields are optional.
- Profile fields: full name, phone, contact email, management organization,
  organization/affiliation, academic title and degree, display title, position,
  military rank, expertise keywords/research fields, status, notes, publications,
  and self-reported project participation. Blank optional fields clear saved values.
- Academic title/degree and research fields reuse existing catalogs. Changing the
  management organization is not supported by ordinary edits. Type changes are
  blocked while linked, requiring deliberate unlink/correction/relink.
- Linked active accounts can view/update only their own active profile through
  My Profile. Personal/contact, academic, position/rank, expertise, publication
  and participation fields are editable. Self requests containing type, status,
  management scope, account IDs, roles or other administrative fields are rejected.
  Changing a contact email never changes account credentials or their destination.
- Linking requires an active unlinked researcher account of the matching
  internal/external role and explicit scope on the profile organization. It never
  changes existing account roles/scopes. Managers cannot link/reset themselves;
  staff cannot manage elevated account credentials. Existing elevated account
  administration remains in the SYSTEM_ADMIN account-management interface.
  SYSTEM_ADMIN may detach a legacy elevated-account link to repair identity linkage;
  this never changes that account, its credentials, role or scope.

## Publications and participation history

Publications record title, venue, year, DOI, authors, status and notes. Participation
records title/project, role, level (`ACADEMY_INSTITUTIONAL`, `MINISTRY`, `OTHER`),
start/end dates, ACTIVE/INACTIVE status and notes. Dates are ISO calendar dates in
the API and native date inputs in the UI; impossible dates and end-before-start
are rejected. Entries are explicitly SELF_REPORTED and grant no business access.
An ended participation uses INACTIVE. A correction marks the previous row
SUPERSEDED and creates a successor; the earlier values remain accessible. Unchanged
rows do not create new revisions. Publications can be inactivated, and before/after
snapshots preserve corrections. There is no hard-delete endpoint.

Operational proposal/project/reviewer participation remains source-owned and
unchanged. Self-reported entries never claim to be verified source-domain history,
create assignments, resolve conflicts, or authorize access. Existing operational
history is retained in its source; unimplemented source aggregations remain future
work, not invented data. Self history contains personal/scientific facts only, excluding account linkage and
administrative metadata. Profile history exposes the latest 100 entries; retained
participation revisions remain in profile detail. History is append-only with a DB
update/delete guard, and is scoped to managers or the currently linked researcher.

## Account provisioning and credentials

1. Staff/admin saves a profile and enters/confirms the researcher's email in the
   System Account / Access section. Account creation is always optional.
2. Provisioning creates Account, matching researcher role, the profile's explicit
   organization scope, current link, linkage history, delivery metadata and safe
   audit in one transaction. The username defaults to the email (maximum 128
   characters); staff can specify a valid distinct username.
3. A cryptographically random temporary password is scrypt-hashed on Account.
   `mustChangePassword` is true. `credentialEmail` belongs to Account, separately
   from researcher-editable contact email. No plaintext password is persisted,
   returned by API, displayed to staff, or put in logs/audit/delivery records.
4. SMTP sends the login URL, username and temporary password. Only this initial or
   authorized replacement credential email contains the temporary plaintext secret.
   Remote SMTP requires TLS; application production login must use HTTPS.
5. Login establishes a restricted session. Until a distinct policy-compliant new
   password is set, the shared API guard allows only session inspection and password
   change; logout remains available. Middleware and app shell enforce the same UX.
6. Password change atomically updates the hash/credential version, clears the flag,
   revokes sessions/reset tokens and writes first-password-change audit. The user
   signs in with the new password and lands on My Profile. Session credential versions
   prevent an older in-flight login from reviving a reset credential.
7. Authorized reset/resend requires a reason, current contextVersion and explicit
   recipient email confirmation. It issues a fresh credential, revokes old sessions
   and tokens, and repeats the mandatory-change flow. Existing general admin reset
   remains available and uses single-use, version-bound tokens.

Mail configuration is validated before changing credentials. A send failure after
commit retains the account/link and records UNKNOWN (or PENDING if interrupted);
it does not claim delivery. Staff can issue a new temporary credential to retry.
ACCEPTED means the SMTP server accepted the message, not that it reached the inbox.
There is no plaintext outbox, automatic retry or credential retrieval endpoint.
Only fixed error codes are recorded; transport exception text is discarded.

## API contract (base `/api/v1/researcher-profiles`)

All routes require an active authenticated session that has completed password
change. Mutations validate body fields and contextVersion, recheck authorization
inside the transaction and append audit. Unique conflicts return 409; unauthorized
access returns 403; invalid input returns 400; missing mail configuration returns
503. Profile status is changed only by named actions.

| Method/path | Input | Response |
| --- | --- | --- |
| GET `/` | keyword, profileType, status, organizationUnitId, researchFieldId, page, pageSize | scoped identity/status/account summaries and capabilities, organizationOptions, total, page, pageSize, canCreate; detail/contact/history loaded separately |
| GET `/catalogs` | none | active fields, academic ranks/degrees for managers or linked researcher |
| POST `/` | profile fields; optional publications/participations; confirmDuplicate | profile or scoped duplicate warning requiring explicit confirmation |
| GET `/:id` | none | profile with permitted account/delivery metadata and viewerAuthorization |
| PATCH `/:id` | editable manager fields + contextVersion | updated profile and context |
| POST `/:id/activate`, `/:id/deactivate` | contextVersion | profile; history preserved |
| GET `/my-profile` | no caller-selected account/profile ID | own linked active profile |
| PATCH `/my-profile` | allowlisted personal/scientific fields + contextVersion | own updated profile |
| GET `/:id/history` | none | latest 100 authorized history entries |
| GET `/:id/account-candidates` | keyword | up to 50 matching unlinked accounts, minimum identity |
| POST `/:id/account` | email, optional username, contextVersion | safe account, delivery status; never password |
| POST `/:id/account/link` | userId, optional reason, contextVersion | profile |
| POST `/:id/account/unlink` | reason, contextVersion | profile; ends link, immediate My Profile denial |
| POST `/:id/account/reset` | email, reason, contextVersion | delivery status; never password |

Profile context uses domain `researcher-profile`, exact recordId, aggregateVersion,
policyVersion `v1`, and zero relationship/conflict/delegation versions. Link and
credential issuance mutations increment aggregateVersion. Backend `allowedActions`
and `blockedActions` govern UI controls; navigation itself grants no authority.

## Audit and privacy

Audit covers profile create/update/status; account creation; linkage/end; credential
issuance/reset; SMTP acceptance/failure; login; first-password-change. Required
success audit and profile history commit with their database mutation. History
contains bounded scientific/contact before/after facts and is not a public directory.
List/search/count use identical organization constraints. Credential email is
manager-confirmed and is never silently taken from a self-service contact edit.

## Deployment and compatibility

Apply `20260915000000_researcher_profile_completion` through normal Prisma migrate
deploy. Existing accounts default to no mandatory change; sessions/tokens default
credential version zero. Existing exact links are preserved and recorded as observed
at migration (original linkage time unknown). Profiles linked to external-role
accounts are typed EXTERNAL; other pre-existing profiles default INTERNAL and may
need a manager's correction. No identity is inferred from names or email.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional `SMTP_USER` /
`SMTP_PASSWORD`, `SMTP_SECURE` and `ACCOUNT_LOGIN_URL`. SMTP credentials stay in the
runtime secret environment, never source control. Local-only SMTP may omit TLS for
an isolated inbox; HTTP login URLs are accepted only outside production. Templates `researcher_account_created` and
`researcher_account_reset` reuse NotificationTemplate; mandatory login information
is appended even when the template prose is customized.

No tests are added or changed at the user's explicit instruction. Verification
results and deployment limitations belong in the completion implementation artifact.
