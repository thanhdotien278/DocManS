---
title: 'Seed researcher test accounts'
type: 'chore'
created: '2026-09-12'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Local development needs representative internal- and external-researcher accounts, and `patuan` must use the documented default password.

**Approach:** Add three accounts for each researcher system role to the Prisma seed with deterministic scrypt hashes for password `1234`, and list the credentials in the local-only `users.md` file.

</frozen-after-approval>

## Implementation Notes

- Added `researcher1`–`researcher3` as `RESEARCHER_INTERNAL_USER` accounts scoped to Khoa Toán - Tin học.
- Added `external1`–`external3` as `EXTERNAL_RESEARCHER_USER` accounts with unit `Đơn vị ngoài`; no implicit organization scope was added.
- Existing `patuan` hash already derives from password `1234`, so no hash text change was necessary; reseeding still upserts that value.
- Verified seed syntax, all seven researcher/patuan hashes against `1234`, and the six new credential rows in `users.md`.
- Blind-hunter review was started but timed out without returning findings; no review findings were available to triage.
