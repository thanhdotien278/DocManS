## Deferred from: code review of story-1.2-auth-session (2026-05-29)

- Dashboard fixture data remains leadership-scoped instead of role/scope aware. Deferred because this is a pre-existing demo/dashboard limitation outside the narrow Story 1.2 auth/session scope.
- Rate limiting is in-memory and per-process. Deferred because Story 1.2 only required minimum local rate protection; persistent distributed throttling belongs later hardening.
- Cookie-authenticated state-changing endpoints do not document or enforce an explicit CSRF strategy beyond SameSite/CORS. Deferred as a security-hardening decision for the next auth hardening slice.
- HTTP/Prisma integration coverage is still mostly manual rather than automated. Deferred because current review ran manual API checks against live Postgres; automated integration tests can be added in a later QA slice.
- Seed password hashes use deterministic development salts. Deferred because these are seed-only development accounts; production credential lifecycle is out of current story scope.

## Deferred from: EP-03 proposal evaluation and approval (2026-07-27)

- Assignment and decision notifications are not sent. ST-3.2 allowed "a notification hook or minimal
  event surface" instead; the `ProposalSubmissionEvent` rows written by every EP-03 transition are
  that surface, and EP-06 will consume them. No notification module was added here.
- Reviewer expertise matching and automatic reviewer recommendation remain out of scope, as ST-3.2
  states. Assignment is manual by username.
- The scoring rubric is fixed in code (`proposals-shared/proposal-review-access.ts`) rather than
  configurable. ST-3.3 explicitly rules out a rubric builder. Criterion codes match the
  `scoring-criterion` catalog type so a later story can move the table into the catalog without
  changing the stored `scoreData` shape.
- Submitted reviews are immutable and a decided proposal cannot be reopened. Any reopen, appeal or
  re-review policy needs an explicit later story; ST-3.3 and ST-3.5 both defer it.
- Council membership (EP-10) is still absent, so `assignmentRole: committee_member` is a label on an
  individual assignment rather than membership of a constituted council.
- The end-to-end verification of EP-03 ran against live Postgres but with MinIO unavailable, so the
  submitted proposal was inserted directly rather than through the upload/readiness path. The file
  read path for assigned reviewers is covered by `tests/proposals-ep03.test.mjs` against the object
  storage fake, not against a live MinIO.
- The conflict rule can only see participation that is **linked to an account**. A participant saved
  as a descriptive external entry (no `user_id`) who nevertheless holds a system account under a
  different identity would not be detected as conflicted when assigned as reviewer or when deciding.
  This is a boundary of the ST-3.0 participation model, which deliberately keeps unlinked
  participants valid, not a gap introduced by ST-3.2/ST-3.5: naming an account that does not exist
  already rejects the whole write, so a participant is never *silently* unlinked. Closing it fully
  needs researcher-profile linkage (EP-11) or a mandatory account link for internal participants.

