# ST-1.3 Implementation Notes

## Status

Draft for owner review

This file is notes-only. It defines implementation attention points for later work and must not be treated as code-level instruction.

## Create-user defect notes

- Defect ID: `DEF-ST13-USER-CREATE-RESET-NULL`.
- Do not start implementation until the updated UC/AC/Test/Traceability artifacts are approved.
- Verify the actual create-user code path before naming the root cause.
- Current hypothesis only: unsafe form reference or reset call after modal/state unmount may be causing `Cannot read properties of null (reading 'reset')`.
- Expected behavior, not implementation mechanism:
  - Persist user, role assignment and organization scope assignment consistently.
  - Show success feedback and refresh/update the list after successful create.
  - Reset/close create form only when form state/instance is available.
  - Preserve form state where appropriate on validation, API, network or server failure.
  - Never show raw JavaScript/runtime error text to users.
- Backend implementation must remain authoritative for authorization, validation and consistency:
  - Non-admin actors are denied.
  - Duplicate username is blocked.
  - Invalid role or organization scope is rejected.
  - Partial user/role/scope persistence is not allowed.
  - Successful create and assignment changes are audited without secrets.
- UI implementation must remain operational and institutional:
  - Loading, validation, success, empty and error states are explicit.
  - Vietnamese user-facing errors are clear and do not expose stack/runtime details.
  - Responsive checks cover 390px, 768px and 1440px.
  - Accessibility checks cover labels, focus, keyboard submit/cancel and async error announcement.
- Do not log, display, return or audit initial password/secret values after submit.

## Suggested later verification sequence

1. Reproduce `DEF-ST13-USER-CREATE-RESET-NULL` in the current runtime.
2. Identify actual failing create-user path without changing unrelated modules.
3. Add or update the smallest focused tests for `T-ST13-CREATE-001` through `T-ST13-CREATE-014`.
4. Implement the minimal fix that satisfies the approved ACs.
5. Run focused backend, frontend and manual/browser verification before marking ST-1.3 create-user regression resolved.
