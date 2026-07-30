---
baseline_commit: 0e9c513c759f8ccdcb201527a0f0250a0e8a36f3
---

# Story 1.5: Controlled Password Change and Reset

Status: done

## Story

As an internal user,
I want to change my password or complete an administrator-initiated reset,
so that I can recover access without exposing secrets.

## Acceptance Criteria

1. Given an authenticated user supplies their correct current password, when the new password meets policy, the system changes only that account's password and invalidates all existing sessions and outstanding reset tokens.
2. Given the current password is wrong or the new password does not meet policy, when the user submits the request, the backend returns a Vietnamese, actionable validation error and does not change the password hash, session state, or reset-token state.
3. Given a system administrator initiates a password reset, when the user supplies a valid, unexpired reset token, the user can set a policy-compliant password exactly once. The token is never stored plaintext, cannot be replayed, and every material reset action is audited without a password or raw token.

## Tasks / Subtasks

- [x] Task 1: Add secure password-reset persistence and auth-store primitives (AC: 1, 3)
  - [x] Add a Prisma `PasswordResetToken` model and migration with a one-way token digest, target user, issuing administrator, expiry, use timestamp, and query indexes; never persist the raw token.
  - [x] Add store operations to revoke every active session for one user, invalidate outstanding reset tokens, issue a reset token record, and atomically consume one valid token while updating the password hash.
  - [x] Keep token issuance and consumption race-safe: at most one completion can succeed.
- [x] Task 2: Implement change-password and administrator-initiated reset APIs (AC: 1-3)
  - [x] Define focused request pipes/types and Vietnamese validation messages. The password policy is 12-256 characters with at least one lowercase letter, uppercase letter, digit, and no whitespace.
  - [x] Add `POST /api/v1/auth/change-password`, guarded by `SessionAuthGuard`, for the current user only. Verify the current password before any write; on success revoke all sessions and invalidate reset tokens, then expire the caller cookie.
  - [x] Add a system-admin-only reset-initiation endpoint for a specified user. Generate a cryptographically random token, store only its SHA-256 digest, invalidate prior outstanding tokens for that user, set a 30-minute expiry, and return the raw token exactly once to the administrator for approved out-of-band handoff. Do not introduce email/SMS delivery in this story.
  - [x] Add a public reset-completion endpoint that accepts a token and new password. It must atomically reject invalid, expired, or used tokens; on success set the new hash, consume the token, revoke all sessions, and invalidate any remaining reset tokens.
  - [x] Audit successful and failed password-change, reset-initiation, and reset-completion attempts with actor/target/context only; never log password, raw token, digest, or reset URL.
- [x] Task 3: Provide the minimal operational UI (AC: 1, 3)
  - [x] Add an authenticated password-change form reachable from the existing account menu, with current/new/confirmation fields, inline errors, and redirect to login after successful session invalidation.
  - [x] Add a reset-completion page that accepts the administrator-provided token and new-password confirmation; do not prefill, retain, or display a token after submission.
  - [x] Add an administrator reset action in the existing user-management surface with explicit confirmation and a one-time display of the token/expiry for manual secure handoff.
- [x] Task 4: Add focused regression coverage and validate all boundaries (AC: 1-3)
  - [x] Test password policy, wrong-current-password no-mutation, successful change session/token invalidation, and cookie expiry.
  - [x] Test admin-only initiation, hashed-only persistence, 30-minute expiry, one-time completion, replay/expired rejection, and concurrent consumption safety.
  - [x] Test audit coverage and prove that no audit payload contains password, token, token digest, or reset URL.
  - [x] Run `npm run typecheck`, `npm test`, and `git diff --check`.

### Review Findings

- [x] [Review][Patch] Allow the public reset-completion route through middleware [apps/web/src/middleware.ts:32]
- [x] [Review][Patch] Audit every failed password-change and reset attempt without secret material [apps/api/src/auth/auth.service.ts:110]
- [x] [Review][Patch] Clear the submitted reset token from the browser after every submission attempt [apps/web/src/components/auth/password-forms.tsx:26]
- [x] [Review][Patch] Rate-limit public reset completion before expensive password hashing [apps/api/src/auth/auth.service.ts:127]
- [x] [Review][Patch] Prevent duplicate administrator reset issuance while the first request is pending [apps/web/src/components/admin/admin-users-panel.tsx:168]
- [x] [Review][Patch] Add behavior-level coverage for the new protected/public routes, session/token invalidation, atomic replay/expiry rejection, audit failures, and cookie expiry [tests/auth-api.test.mjs:365]

## Dev Notes

### Scope decisions and security rules

- This story deliberately supports only administrator-initiated resets. There is no self-service reset request, email/SMS delivery, external identity provider, MFA, or password-history feature.
- Use the existing `PasswordService` scrypt format for password hashes. Add a separate SHA-256 digest helper for opaque reset tokens; do not misuse password hashing as the token lookup key.
- Generate reset tokens with `randomBytes`; return the raw value only from the successful initiation response. Database rows, audit reasons, errors, browser state, logs, and URLs must contain neither raw token nor its digest.
- A password change or completed reset revokes all sessions for the account, including the session that performed the change. The controller must clear the current session cookie; the user must sign in again.
- Use a transaction/conditional update for completion so expiry and one-time use are evaluated at mutation time. On every rejected request, preserve password hash, session state, and reset-token state.
- Use the existing generic login error only for login. Change/reset errors may name the correctable field but must not disclose account existence through reset completion.

### Existing code to extend

- `apps/api/src/auth/password.service.ts` already provides scrypt hashing and safe verification. Preserve its existing hash format and add only narrowly scoped token helpers.
- `apps/api/src/auth/auth.service.ts`, `auth.controller.ts`, and `auth.store.ts` own the `/api/v1/auth` behavior and server sessions. Do not create a second auth module or direct Prisma writes from controllers.
- `apps/api/src/admin/admin-users.controller.ts` and `admin-users.service.ts` already enforce system-administrator account operations. Extend that seam for reset initiation; preserve the existing `assertSystemAdmin` gate.
- `apps/api/src/auth/audit-log.service.ts` must remain the sole audit writer. It accepts safe contextual metadata only.
- `apps/api/prisma/schema.prisma` currently has `User` and `Session` but no reset-token model, so a Prisma migration is required.
- Reuse `apps/web/src/lib/auth-api.ts`, `apps/web/src/components/layout/app-shell.tsx`, and `apps/web/src/components/admin/admin-users-panel.tsx`; match the existing institutional UI, controlled confirmation, and Vietnamese copy.

### Testing requirements

- Follow Node's built-output test pattern in `tests/*.test.mjs`; API code must be built before tests import `dist/apps/api`.
- Extend `tests/auth-api.test.mjs` and `tests/admin-foundation.test.mjs`; add a migration/store test only if needed to prove persistence and atomic consumption.
- Preserve the existing fail-closed behavior for malformed hashes, revoked/expired sessions, inactive users, and invalid system role/scope context.
- Final validation is mandatory: `npm run typecheck`, `npm test`, and `git diff --check`.

### References

- [Source: _bmad-output/epics.md#Story 1.5]
- [Source: _bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md#Dev Notes]
- [Source: _bmad-output/project-context.md#Authorization And Security Rules]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md#AD-1 and AD-12]
- [Source: Node Crypto documentation, randomBytes and createHash]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- Created from the canonical Epic 1 specification, Story 1.4 implementation patterns, current auth/admin seams, and Node crypto documentation.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented scrypt-backed password change and SHA-256-digested, single-use password reset tokens; every successful password update revokes all sessions and outstanding reset tokens.
- Added the system-admin reset initiation action, authenticated change-password and public completion endpoints, safe audit events, and Vietnamese validation.
- Added account-menu, reset-completion, and admin one-time token handoff interfaces without putting the token in a URL.
- Verified `npm run typecheck`, `npm test` (108/108), `git diff --check`, and `npm run prisma:deploy`; the local PostgreSQL migration applied cleanly.

### File List

- _bmad-output/implementation-artifacts/1-5-doi-mat-khau-va-dat-lai-mat-khau-co-kiem-soat.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20260730010000_password_reset_tokens/migration.sql
- apps/api/src/admin/admin-users.controller.ts
- apps/api/src/admin/admin-users.service.ts
- apps/api/src/auth/auth.controller.ts
- apps/api/src/auth/auth.service.ts
- apps/api/src/auth/auth.store.ts
- apps/api/src/auth/password-request.pipe.ts
- apps/api/src/auth/password.service.ts
- apps/web/src/app/change-password/page.tsx
- apps/web/src/app/password-reset/page.tsx
- apps/web/src/components/admin/admin-users-panel.tsx
- apps/web/src/components/auth/password-forms.tsx
- apps/web/src/components/layout/app-shell.tsx
- apps/web/src/lib/admin-api.ts
- apps/web/src/lib/auth-api.ts
- apps/web/src/middleware.ts
- tests/auth-api.test.mjs
- tests/admin-foundation.test.mjs
- tests/smoke.test.mjs

### Change Log

- 2026-07-30: Created implementation-ready Story 1.5 specification.
- 2026-07-30: Implemented controlled password change/reset, validated 108 tests, and moved the story to review.
- 2026-07-30: Addressed six code-review findings; validated 111 tests and completed Story 1.5.
