---
title: 'Repair researcher profile and navigation access'
type: 'bugfix'
created: '2026-10-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Fix the linked-profile error for local internal researchers and provide external
researchers the same navigation tabs as internal researchers. Preserve backend
authorization. Seed missing demo profiles without replacing existing profiles or
reversing administrative unlink/deactivation decisions. Use the researcher
dashboard for both researcher roles.

</frozen-after-approval>

## Implementation Notes

- Confirmed eight seeded researcher accounts lack profiles in the live local DB;
  migrations include the scientific CV migration. Other linked accounts are valid.
- Preserve pre-existing username edits in seed.mjs and auth-seed-users.md.
- Footprint: create-only seed profile/link/history block, shared navigation getter,
  researcher dashboard branch, focused UI regression and seed documentation.
- No migrations, new dependencies, permission grants or credential changes.
- Apply only the new seed block locally, without rerunning unrelated seed updates.
- Verify own-profile HTTP reads for all eight accounts, repeat-run preservation,
  external menu parity and dashboard selection, and typecheck.

- Browser follow-through exposed a denied intake request blocking external users'
  proposal list. The existing panel now skips that request for external researchers;
  backend creation restrictions and capability checks remain unchanged.
- Validation: typecheck passed; profile UI tests 4/4; existing profile contract
  tests 15/15 against the available compiled API; seed syntax and diff checks passed.
- Reproduced the empty external navigation on HEAD before the fix.
- Live local repair created eight missing profiles. API login, own profile and
  profile catalogs succeeded for int1-int3, ex1-ex3, patuan and nmtrung.
- Assert-based local DB check verified repeat-run equality, unchanged accounts
  and previous profiles, and preservation of inactive/unlinked states in a rolled-back
  transaction. Only the new profile seed block was applied, not the full seed.
- Isolated browser contexts verified int1/ex1 scientific CV loads, eight equal tabs,
  researcher dashboard, and proposal lists without failed API requests. External
  creation stayed hidden; eligible internal creation remained visible.
- Full suite and production build were not run. Dashboard values remain pre-existing
  demonstration data; several tabs retain their existing placeholder implementation.

## Review Triage Log

- Low, patched: clarified that seed creates only missing profiles without prior links.
- Low, rejected: seed CREATE history deliberately identifies the account link and seed
  reason. It is not a normal manager action; append-only existing history is preserved.
  Expanding seed history to match the production audit subsystem is outside this repair.
- Low, rejected: dashboard is explicitly labeled demonstration data on the page for
  every role. No unauthorized database records are returned. Account-scoped dashboard
  implementation would expand the task beyond menu/profile repairs.
- Low, patched: assert complete equality of the researcher dashboard snapshots.
- Low, rejected: the intake guard has an assert-based browser self-check for external
  and internal users (no failed API requests; correct creation visibility). A mocked
  component test would duplicate that proof; the coverage limitation is recorded here.
- Low, rejected: overlapping full seed runs are not a supported workflow; uniqueness
  constraints fail closed. Existing seed operations also assume serial execution.
