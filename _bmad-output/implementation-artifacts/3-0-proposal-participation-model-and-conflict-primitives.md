# Story 3.0: Proposal participation model and conflict-of-interest primitives

## Status

done

## Epic

EP-03: Bo Sung, Danh Gia Va Phe Duyet De Tai

## Story

As a scientific management staff member and platform maintainer,
I want proposal participation to be linked to real user accounts and exposed as a per-record role,
So that conflict-of-interest rules become evaluable and every screen can state the viewer's role on that specific proposal.

## Source Traceability

- Source story: `_bmad-output/epics-and-stories.md` -> `ST-3.0: Proposal participation model and conflict-of-interest primitives`
- Origin: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-26.md`
- Use Case IDs: `UC-300-A`, `UC-300-B`
- Functional requirements: `FR6a`, `FR67a`, `FR38`, `FR39`
- Non-functional requirements: `NFR7`, `NFR8`
- UX design requirements: `UX-DR24`, `UX-DR26`, `UX-DR27`
- Permission source: `docs/permission-matrix.md`

## Scope

- Link proposal participants to user accounts where an account exists.
- Resolve the current user's participation role for a given proposal.
- Return that role and the derived capability flags through the proposal API.
- Provide one reusable conflict-policy primitive.
- Prisma migration.
- Continue to support participants who have no system account.

## Explicitly Out of Scope

- Cross-module personal work hub (ST-7.4).
- Council and ethics participation (EP-10).
- Researcher-profile linkage (EP-11).
- Assigning multiple account-level system roles to one user.
- Reviewer assignment (ST-3.2), scoring (ST-3.3), consolidation (ST-3.4), approval (ST-3.5).

## Acceptance Criteria

### AC-ST-3.0-01: Participation resolves to an account

Given a proposal that records participants,
When a participant who holds a system account is saved,
Then the participation record stores a resolved reference to that user account,
And participants without a system account remain valid as descriptive entries.

### AC-ST-3.0-02: Response states the record role

Given a user opens a proposal they are related to,
When the proposal detail or list response is produced,
Then the response states that user's participation role on that specific proposal,
And the role is derived from the record relationship rather than the account-level system role.

### AC-ST-3.0-03: Unrelated user has no record role

Given a user has no relationship to a proposal,
When they retrieve it within their permitted data scope,
Then the response reports no participation role,
And no participation-derived permission is granted.

### AC-ST-3.0-04: Conflict primitive reports participation conflicts

Given a candidate is the principal investigator, a participant, or the secretary on a proposal,
When the conflict-policy primitive is evaluated for that candidate and that proposal,
Then it reports a conflict,
And reviewer assignment and approval decisions can block the action consistently through one shared rule.

### AC-ST-3.0-05: Participation changes are audited

Given participation on a proposal changes,
When a participant is added, replaced, or removed,
Then the change is captured in audit history with actor and target record.

## Confirmed Design Decisions

Both were raised as deviations during implementation and confirmed by the product owner on
2026-07-27. Reuse this shape for project participation (EP-04) and council membership (EP-10).

**1. A canonical `participation_role` column in addition to the `user_id` reference.**
TN-ST-3.0-01 asks only for the user reference. A second normalised column was added because
AC-ST-3.0-04 has to distinguish the secretary from an ordinary member, and "thu ky" cannot be
detected reliably from the free-text descriptive label (casing, diacritics, "Thu ky khoa hoc").
The code is written at intake time by `normalizeParticipationRole`, which accepts both the canonical
codes and the Vietnamese labels. Anything unrecognised falls back to `member`, which still triggers
the conflict rule - so a misclassification errs toward blocking, never toward permitting.

**2. Record-scoped read for linked participants in `canReadProposal`.**
Without it VER-ST-3.0-03 ("verify the per-record participation role returned for owner, participant,
and unrelated users") is not demonstrable, because a linked participant could not retrieve the
proposal at all. The grant is bounded to the single record the participation was resolved from and
is read-only: `canEdit`, `canSubmit` and file upload still require ownership, so AUTH-ST-3.0-02
holds. Read access for leadership, reviewers and council members remains out of scope and belongs to
ST-3.3 and ST-3.5, as recorded in the sprint change proposal's carried-forward items.

## Delivered Implementation

### Data model

`ProposalMember` (`proposal_members`) gains two columns; the descriptive columns are unchanged so
external participants stay valid (TN-ST-3.0-01):

- `user_id TEXT NULL` -> FK to `users(id)`, `ON DELETE SET NULL` so removing an account degrades the
  row to a descriptive external participant rather than deleting the participation record.
- `participation_role TEXT NOT NULL DEFAULT 'member'` -> canonical code
  (`principal-investigator` | `secretary` | `member`).

Migration: `apps/api/prisma/migrations/20260726000000_st_30_proposal_participation/migration.sql`.
It backfills `participation_role` from the Vietnamese label already captured at intake, so rows
created before ST-3.0 classify the same way new rows do. Unmatched rows keep the `member` default,
which still triggers the conflict rule.

### Backend surface for ST-3.2 and ST-3.5

Pure policy: `apps/api/src/proposals-shared/proposal-participation.ts`

- `normalizeParticipationRole(value)` -> canonical code; accepts codes and Vietnamese labels.
- `resolveProposalParticipation({ userId, proposal, members })` -> `ProposalParticipation`
  with `role`, `label`, `roles[]`, `labels[]`, `isOwner`, `isParticipant`. Returns `unknown`
  (not `none`) when context cannot be read.
- `evaluateProposalConflict(participation)` -> `{ conflicted, role, reasonCode, reason, viewerMessage }`.
  `reasonCode` is `no-conflict` | `participation` | `unresolved`. `reason` is neutral (audit and
  assignment screens); `viewerMessage` is second person (UX-DR27).

Injectable service: `apps/api/src/research-proposals/proposal-participation.service.ts`, exported
from `ResearchProposalsModule`.

- `resolveForProposal(userId, proposal, members?)`
- `resolveForProposals(userId, proposals)` -> `Map<proposalId, ProposalParticipation>` (one query)
- `evaluateConflict(candidateUserId, proposalId)` -> the primitive ST-3.2 and ST-3.5 must call
- `resolveMemberAccounts(members)` -> resolves `userId`/`username` to an account id

Fail-closed behaviour (TN-ST-3.0-03): a missing candidate, a missing proposal, or a database error
all return `conflicted: true` with `reasonCode: 'unresolved'`.

### API responses

Both the list and detail proposal responses now carry `viewerParticipation`:

```json
{
  "role": "principal-investigator",
  "label": "Chu nhiem",
  "roles": ["principal-investigator"],
  "labels": ["Chu nhiem"],
  "isOwner": true,
  "isParticipant": true,
  "conflict": { "conflicted": true, "reasonCode": "participation", "reason": "...", "message": "..." }
}
```

Detail `members[]` entries carry `userId`, `isAccountLinked`, `participationRole` and
`participationRoleLabel`. Member input accepts an optional `userId` or `username`; naming an
account that does not exist rejects the whole write rather than saving the participant unlinked.

### Authorization

`canReadProposal(user, proposal, participation?)` takes the resolved participation as an optional
argument. A linked participant reads the one proposal they participate in and nothing else; the
grant is record-scoped and never widens account-level authority (AUTH-ST-3.0-02). Omitting the
argument keeps the pre-ST-3.0 behaviour, which is the fail-closed direction. Edit and submit rights
are unchanged: participation does not confer them (AUTH-ST-3.0-01).

`FilesService.assertCanRead` resolves participation the same way, so the proposal read and the file
read agree. Without that, a participant would see the attachment list on the proposal detail and get
403 on every download. Upload still requires ownership, so participation grants file read only.

### Audit

- `link-proposal-participant` - one entry per newly linked account, with `linkedUserId`,
  `participationRole` and the participant name.
- `update-proposal-participation` - one entry per participation replace, with `previousCount`,
  `nextCount`, `linkedUserIds` and `unlinkedUserIds`.

Both target entity `proposal-participation` with the proposal id.

### Frontend

- `ParticipationBadge` (`apps/web/src/components/ui/participation-badge.tsx`) states the record role
  using the taxonomy in `docs/ux-design-guidelines.md` section 15.
- Proposal list: a "Vai tro cua toi" column (table) and badge (mobile card) per row - UX-DR26.
- Proposal detail: viewer role at the top of the record, other roles on the same record listed
  beneath it, the conflict reason shown as a visible warning rather than hidden - UX-DR26, UX-DR27.
- Participation list on the detail screen shows each participant's role label and whether they are
  account-linked or external.
- `toShellAccount` no longer discards the `roles` array.

## Review Findings Fixed

An adversarial review pass raised eleven candidate defects; three survived verification and were
fixed in this story:

1. `FilesService.assertCanRead` still called `assertCanReadProposal` without participation, so a
   linked participant could see the attachment list but every download returned 403. Participation
   is now threaded into the files read path, and `ProposalParticipationService` is registered in
   `FilesModule`. Regression test: "lets a linked participant download the attachments they can
   already see on the proposal".
2. `createDraft` resolved member accounts *after* committing the proposal row, so a member naming an
   unknown account left an orphan draft with no `create-proposal-draft` audit entry. Resolution now
   runs before the write, matching `updateDraft`. Regression test: "rejects a participant naming an
   account that does not exist without persisting a draft".
3. On the detail screen the "Tài khoản hệ thống" input was a no-op once a member was linked: the
   form echoed the stored `userId`, which takes precedence over `username`, so corrections were
   silently discarded and unlinking was impossible. `updateMember` now clears the echoed `userId`
   when the account field is edited.

## Test and Verification Checklist

Automated: `tests/proposals-st30.test.mjs` (12 tests). Full suite `npm test` passes 71/71;
`npm run typecheck` and `npm run build:web` pass.

- VER-ST-3.0-01: link a participant to an existing account and verify the reference resolves - covered.
- VER-ST-3.0-02: save an external participant without an account and verify it remains valid - covered.
- VER-ST-3.0-03: per-record participation role for owner, participant, and unrelated users - covered
  for both the detail and the list response.
- VER-ST-3.0-04: conflict primitive reports a conflict for principal investigator, participant, and
  secretary - covered, plus the no-conflict and fail-closed paths.
- VER-ST-3.0-05: audit entries for participation changes - covered for link, replace and unlink.

Manual: a PI creating a draft can name a member by username and see the link confirmed on the
detail screen; an external participant with no username still saves.

## Done Definition

- Proposal participation resolves to a user account where an account exists, and external
  participants without accounts still save.
- The proposal API returns the current user's record-scoped role, and the UI states it on both list
  and detail.
- One shared conflict primitive backs both reviewer assignment and approval decisions, and fails
  closed when participation context cannot be resolved.
- `AC-ST-3.2-04` and `AC-ST-3.5-04` are demonstrably testable: ST-3.2 and ST-3.5 call
  `ProposalParticipationService.evaluateConflict(candidateUserId, proposalId)` and block on
  `conflicted`.
