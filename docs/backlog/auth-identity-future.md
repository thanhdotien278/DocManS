# Future account identity work

## Implemented researcher onboarding (2026-09-15)

Scoped SYSTEM_ADMIN and SCIENTIFIC_MANAGEMENT_STAFF can create/link researcher
accounts, email generated temporary credentials and require a first-login password
change; authorized reset/resend uses a fresh credential and audit. Accounts remain
separate from profiles. See [current contract](../contracts/researcher-profile-access.md).
General system-admin account creation and controlled single-use reset remain.

## Still future

Public self-registration, self-service forgot-password, independently verified
contact ownership, bulk account onboarding and external identity providers require
separate requirements. Manager confirmation of a recipient email is not a claim
that the application has independently verified mailbox ownership.
