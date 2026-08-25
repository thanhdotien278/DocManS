---
baseline_commit: 2ae8c3e
---

# Story 2.6: Timeline và audit hồ sơ nhà khoa học

Status: ready-for-dev

## Story

As a người có trách nhiệm kiểm tra,
I want xem timeline thay đổi và liên kết của hồ sơ nhà khoa học,
so that tôi có thể truy vết ai đã thay đổi thông tin hoặc quan hệ nào.

## Acceptance Criteria

1. **Separate business timeline from privileged audit.** Given a profile has create/update/status, account-link lifecycle, or source participation events, when an authorized ordinary viewer opens the timeline, then the API returns a redacted business-event projection. Only an actor with exact `researcher-profile.audit.read` and required organization/audit scope may request privileged audit detail; normal timeline permission never implies audit-detail permission.
2. **Use an append-only versioned event contract.** Given visible events from profile, account-link, and enabled source providers, when timeline pages are composed, then each event has stable event ID, source domain, target, action/type, occurred/recorded time, permitted actor label, correlation ID, context version, and redaction-safe summary. Events sort by `occurredAt` descending then stable event ID and corrections create successor events without modifying/deleting prior events.
3. **Keep source ownership and whole-response integrity.** Given participation lifecycle events belong to proposal or a future source domain, when the profile timeline is queried, then the researcher module calls the authorized source-history contract at the same request-wide `asOf`; it does not copy those events into an authoritative profile table. An enabled source's unresolved/stale/failure state fails the requested combined timeline with no partial events/count/cursor.
4. **Apply disclosure before counts and serialization.** Given events contain contact PII, reviewer identity, raw score/comment, hidden assignment, protected actor identity, or conflict source, when an ordinary timeline or export-compatible projection is built, then protected fields are omitted according to the disclosure matrix before count/page construction. They are not returned as `null` or embedded in a free-text `reason`.
5. **Deny without metadata leakage.** Given an actor lacks profile visibility, timeline permission, privileged audit permission, or exact organization scope, when they query the endpoint directly, then the backend returns the canonical denial/not-found posture without event count, source count, cursor, first/last timestamp, actor name, or target metadata. Detail, timeline, and any future export use the same base policy.
6. **Make required audit writes transactional.** Given a profile or account-link mutation from Stories 2.1-2.2, when the required append-only audit write fails, then the owning mutation/version change rolls back and the error returns a correlation ID. Source-domain mutations retain the same responsibility in their owning transaction; this story must not paper over earlier non-atomic writes with an after-the-fact timeline record.
7. **Use stable pagination and invalidate stale cursors.** Given a timeline cursor was issued, when profile/link/source context version changes before the next page, then the endpoint returns `CONTEXT_VERSION_MISMATCH` and requires a fresh first page. The cursor carries `asOf`, last sort tuple, profile/link version, and every enabled source version.
8. **Provide an accessible responsive timeline UI.** Given a permitted user opens profile history at the required six breakpoints, when timeline data loads, is empty, fails, is redacted, or pages, then the UI uses semantic headings/list structure, readable actor/action/time/source labels, text status, visible focus, and no hidden critical history behind tooltip-only interactions or full-page horizontal scrolling.

## Tasks / Subtasks

- [ ] Task 1: Finalize the shared audit/event storage seam (AC: 1-7)
  - [ ] Reuse and minimally extend `AuditLog`/`AuditLogService` for correlation ID, source, structured redaction-safe context/before-after data, target/context version, and disclosure classification if Stories 2.1-2.2 have not already added the required fields.
  - [ ] Keep one generic append-only audit store for future Epic 3 generalization; do not create a researcher-only audit engine or store raw sensitive context in `reason` JSON.
  - [ ] Add exact `researcher-profile.timeline.read` and `researcher-profile.audit.read` plus runtime compatibility fixtures and explicit policy/scope rules.

- [ ] Task 2: Define profile timeline providers and DTOs (AC: 1-5, 7)
  - [ ] Define a versioned business-event DTO, privileged audit DTO, provider completeness/version contract, deterministic order, cursor, redaction matrix, and event taxonomy for profile create/update/status, link create/suspend/end/correct, and source relationship lifecycle.
  - [ ] Implement profile/link event projection from shared audit records and source-participation event projection through Story 2.3's provider boundary. Do not query another domain's persistence directly.
  - [ ] Apply profile visibility, requested timeline/audit action, exact scope, and field-level disclosure before event count/page serialization.

- [ ] Task 3: Implement protected timeline endpoints and UI (AC: 1-5, 7-8)
  - [ ] Add `GET /api/v1/researcher-profiles/:id/timeline` and a separately authorized audit-detail mode/endpoint; validate cursor/page size and return the canonical error envelope with correlation ID.
  - [ ] Add a researcher-profile timeline component using the existing shared `Timeline` primitive, with loading/empty/error/stale-refresh/redaction/pagination states and breadcrumb/detail integration.
  - [ ] Keep future export out of scope. If an export consumer is later added, require it to call the same authorized projection rather than query `AuditLog` directly.

- [ ] Task 4: Verify append-only integrity, atomicity, disclosure, and UX (AC: 1-8)
  - [ ] Test every required event type, deterministic same-time ordering, successor correction, cursor invalidation, source failure with no partial metadata, and preservation of historical rows.
  - [ ] Test ordinary versus privileged audiences for PII/reviewer/conflict/actor redaction, direct endpoint denial with no count/timestamps, and detail/timeline policy parity.
  - [ ] Inject audit insert failure into profile/link mutations and prove business/version writes roll back with correlation ID; test source owners' atomic contract fixtures.
  - [ ] Add browser/manual evidence for semantic labels, focus, readable mobile timeline, loading/empty/error states, and all required viewports; run focused tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Dependencies and Epic 3 boundary

- Stories 2.1-2.3 are hard dependencies. They must already write atomic audit facts and expose source versions; Story 2.6 makes them queryable as researcher-specific projections.
- Epic 3 owns broader files/history/audit platform evolution. This story may pull forward only the minimum shared audit fields/query seam required for researcher profiles and must leave it reusable, not duplicate it.
- Business timeline and privileged authorization audit are different products. A useful human-readable event is not permission to see full rule outcomes or hidden identities.

### Existing seams to update and preserve

- Extend `apps/api/src/auth/audit-log.service.ts`, `auth.types.ts`, and Prisma `AuditLog` only as needed. Its `record(input, client)` signature already supports transaction-bound writes; use the transaction client.
- Reuse `apps/web/src/components/ui/timeline.tsx` and profile detail feature components. Do not create a second global timeline primitive.
- Source event ownership remains with proposal/project/council/etc. The profile timeline is an authorized composition over provider contracts.

### Disclosure and integrity guardrails

- Never place raw contact fields, reviewer identity, scores/comments, hidden assignments, conflict sources, tokens, or secrets into unstructured audit strings.
- Before/after values are field-allowlisted and redacted at write/projection boundaries. General timeline views cannot reconstruct protected values from event type, count, or actor metadata.
- Audit/timeline rows are append-only. Retention/export policy beyond the researcher feature remains Epic 3 scope.

### References

- [Source: _bmad-output/epics.md#Story 2.6]
- [Source: _bmad-output/prd.md#FR69, Audit-Log Requirements, Governance Acceptance, UX Requirements, and NFRs]
- [Source: _bmad-output/project-context.md#Audit Logging Rules, Authorization And Security Rules, and UX/UI Rules]
- [Source: _bmad-output/architecture.md#Audit-Log Pattern, Mutation Job and Audit Contract, AD-11, AD-13, and Operational Support Ownership]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Review Disclosure Matrix, Audit Contract, and Integration Gate and Fixtures]
- [Source: docs/ux-design-guidelines.md#Status Timeline And History]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted with business-timeline/audit separation, shared append-only storage, provider ownership, redaction, cursor invalidation, and Epic 3 boundary.

### Completion Notes List

- Ultimate context-engine analysis completed; timeline composition, privileged audit, atomic writes, and disclosure are implementation-ready.

### File List
