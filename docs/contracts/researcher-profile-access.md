# Researcher profiles, account access and My Profile

Effective 2026-09-15. This contract implements the explicitly requested completion
of FR65–FR69 and researcher account onboarding. It supersedes older Story 2.1
field exclusions and the future-only classification of researcher email onboarding.

## Proposal/project boundary — 2026-09-21

Existing Staff profile/account capabilities remain separately scoped and do not grant
proposal/project management visibility. Head is explicitly included in scoped profile management; oversight roles do not inherit
profile management actions. Staff management requires the active `PROPOSAL_MANAGEMENT_OFFICER` /
`PROJECT_MANAGEMENT_OFFICER`; self-reported participation is not an assignment.
Baseline §2.1 governs officer lifecycle, conflict checks and finalized role decisions.

## Identity and authority

- `ResearcherProfile` is a scientific identity independent of `User` (Account).
  A profile may have no account. Nullable unique `linkedUserId` is the current
  one-to-one link, including inactive profiles/accounts. Ended link rows preserve
  history; `ResearcherProfileAccountLink` has at most one ACTIVE row on each side.
- Active `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD` and `SCIENTIFIC_MANAGEMENT_STAFF` manage profiles only in
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

## Account provisioning and activation

1. Creating an INTERNAL profile provisions access by default. Email is required,
   and the system creates a linked `PENDING_ACTIVATION` account with
   `RESEARCHER_INTERNAL_USER`.
2. Creating an EXTERNAL profile does not create an account unless staff/admin checks
   `Tạo tài khoản truy cập hệ thống`. When checked, email is required and the linked
   account uses `EXTERNAL_RESEARCHER_USER`.
3. Provisioning creates Account, matching researcher role, the profile's explicit
   organization scope, current link, linkage history, delivery metadata, a hashed
   single-use activation token and safe audit in one transaction. No username is
   required and no username is synthesized from email.
4. Activation tokens expire exactly 48 hours after issue. Issuing or resending a
   token invalidates previous unused activation tokens for that account. Tokens are
   never stored plaintext, returned in ordinary APIs, or written to audit/log records.
5. SMTP sends an activation link to the account email. The link opens
   `Thiết lập mật khẩu`, where password and confirmation are required. Completing
   activation marks the token used, stores the password hash, activates the account,
   increments credential version and allows normal login. Invalid, expired or used
   tokens fail closed and leave the account pending.
6. Login accepts either configured username or account email with the same password.
   Disabled/inactive/pending accounts cannot log in. A newly activated account can
   log in with email immediately even when no username is set.
7. A linked researcher may set/change their own username from My Profile. Username
   is optional, unique when present, validated server-side and never changes account
   email, system role, organization scope or profile linkage.

Mail configuration is validated before provisioning or resending activation. A send
failure after commit retains the pending account/link and records UNKNOWN (or
PENDING if interrupted); it does not claim delivery. Staff can resend activation,
which issues a fresh token and invalidates previous unused tokens. ACCEPTED means
the SMTP server accepted the message, not that it reached the inbox. There is no
plaintext outbox, automatic retry or token retrieval endpoint. Only fixed error
codes are recorded; transport exception text is discarded.

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
| POST `/:id/account` | email, contextVersion | pending safe account, delivery status and activation expiry; never password/token |
| POST `/:id/account/link` | userId, optional reason, contextVersion | profile |
| POST `/:id/account/unlink` | reason, contextVersion | profile; ends link, immediate My Profile denial |
| POST `/:id/account/resend-activation` (alias: `/reset`) | email, optional reason, contextVersion | activation resend delivery status and expiry for pending accounts; never password/token |

Profile context uses domain `researcher-profile`, exact recordId, aggregateVersion,
policyVersion `v1`, and zero relationship/conflict/delegation versions. Link and
activation issuance mutations increment aggregateVersion. Backend `allowedActions`
and `blockedActions` govern UI controls; navigation itself grants no authority.

## Audit and privacy

Audit covers profile create/update/status; account provisioning; linkage/end;
activation email issue/resend; activation complete; username change; account
disable/reactivate through the user lifecycle; SMTP acceptance/failure; login.
Required success audit and profile history commit with their database mutation. History
contains bounded scientific/contact before/after facts and is not a public directory.
List/search/count use identical organization constraints. Credential email is
manager-confirmed and is never silently taken from a self-service contact edit.

## Deployment and compatibility

Apply `20260916000000_researcher_account_activation` after the existing researcher
profile completion migration. Existing usernames remain intact; username becomes
nullable for pending researcher accounts. Existing exact links are preserved and
recorded as observed at migration (original linkage time unknown). Profiles linked
to external-role accounts are typed EXTERNAL; other pre-existing profiles default
INTERNAL and may need a manager's correction. No identity is inferred from names or
email.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional `SMTP_USER` /
`SMTP_PASSWORD`, `SMTP_SECURE` and `ACCOUNT_LOGIN_URL`. SMTP credentials stay in the
runtime secret environment, never source control. Local-only SMTP may omit TLS for
an isolated inbox; HTTP login URLs are accepted only outside production. Template
`researcher_account_activation` reuses NotificationTemplate; the activation link is
appended even when the template prose is customized.

No tests are added or changed at the user's explicit instruction. Verification
results and deployment limitations belong in the completion implementation artifact.
