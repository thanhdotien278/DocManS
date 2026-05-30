## Deferred from: code review of story-1.2-auth-session (2026-05-29)

- Dashboard fixture data remains leadership-scoped instead of role/scope aware. Deferred because this is a pre-existing demo/dashboard limitation outside the narrow Story 1.2 auth/session scope.
- Rate limiting is in-memory and per-process. Deferred because Story 1.2 only required minimum local rate protection; persistent distributed throttling belongs later hardening.
- Cookie-authenticated state-changing endpoints do not document or enforce an explicit CSRF strategy beyond SameSite/CORS. Deferred as a security-hardening decision for the next auth hardening slice.
- HTTP/Prisma integration coverage is still mostly manual rather than automated. Deferred because current review ran manual API checks against live Postgres; automated integration tests can be added in a later QA slice.
- Seed password hashes use deterministic development salts. Deferred because these are seed-only development accounts; production credential lifecycle is out of current story scope.
