---
title: 'Reviewer and Council Assignment Completion'
type: 'bugfix'
created: '2026-09-15'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="User authorized documentation-first implementation">

## Intent

Complete the existing staff reviewer/council assignment feature with minimal
changes. Preserve its profile-based candidates, scope/conflict/context checks,
workflow eligibility, record-scoped access, and retained history. Fix the
candidate-conflict failure audit being rolled back with the rejection, enforce
the required revoke note at the API boundary, and display existing assignment
lifecycle evidence separately from review status in the staff table.

</frozen-after-approval>

## Implementation Notes

- Investigation confirmed the core feature already exists in commit
  `2c44d99df3910a3bc785026465b0249416763127`; no new assignment model, role,
  endpoint, or migration is needed.
- Updated the authorization baseline, executable contract documentation and UX
  before implementation. Reuse the existing transaction, audit and response fields.
- Verify both duty types, allowed/denied assignment, conflict failure audit,
  revocation history and cross-record access with an isolated PostgreSQL check;
  never run this fixture against the application database.
- Baseline API build passed. Existing EP03 suite fails all 25 tests before edits,
  primarily because old mocks lack `tx.user.findUnique`; preserve those fixtures.
- Implemented conflict rejection after its audit transaction commits, required
  revoke-note validation, and existing lifecycle/actor fields in the staff table.
- API/web production builds and typecheck passed; 20 existing authorization and
  relationship checks passed. Two new checks passed, including real PostgreSQL
  candidate discovery, both duties, conflict audit retention without mutation,
  completeness, stale context, inactive candidate, cross-record package denial,
  and revoked package denial with retained assignment history.
- PostgreSQL verification used a newly created disposable database populated
  from the current Prisma schema and removed afterward. The application database
  was unchanged. This validates runtime behavior, not migration deployment.
- Browser visual verification was not performed.

## Review Triage Log

- Independent Blind Hunter review inspected the changed files and new regression
  check; no confirmed regression or missing behavior in the scoped diff.
  No additional review layers were configured. No findings deferred.
