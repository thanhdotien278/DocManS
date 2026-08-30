---
baseline_commit: 2ae8c3e
---

# Story 2.3: Lịch sử tham gia từ nguồn nghiệp vụ có thẩm quyền

Status: ready-for-dev

## Story

As a người xem hồ sơ nhà khoa học được phép,
I want xem lịch sử tham gia được tổng hợp từ các phân hệ nguồn,
so that tôi có bức tranh đúng mà không dùng bản sao lịch sử để cấp quyền.

## Acceptance Criteria

1. **Use a versioned source-owned query contract.** Given the proposal domain has passed the integration gate and stores an explicit `researcherProfileId` on its typed relationship, when an authorized profile-history request is made, then the aggregator queries the proposal provider using one database/request-wide `asOf` and receives completeness, source/context version, observation time, domain, stable record ID, visible label/route, relationship type/status, and half-open effective interval.
2. **Enable only contract-complete sources.** Given proposal is the initial enabled source and project, seminar, student-research, council, ethics, review, publication, product, and task providers are not yet contract-complete, when history or coverage metadata is returned, then only proposal contributes entries/counts. Future sources remain explicitly not integrated/disabled and are not advertised as covered merely because a table or adapter exists.
3. **Never infer or copy authority.** Given a proposal participant has only `userId`, username, or free-text name and no deterministic explicit profile relationship, when migration or aggregation runs, then the system does not guess a profile or create a generic authoritative link. Exact active profile-account links may be used for deterministic backfill; unresolved rows remain unassociated and reportable. The history read model is never consumed to authorize a mutation.
4. **Fail the whole requested aggregation closed.** Given any enabled source returns unresolved, stale, ambiguous, unsupported-contract, or failure state, when history, a participation filter, total, or next page is requested, then the whole requested response fails with the canonical context code. It returns no partial entries, counts, facets, source-success flags, or cursor.
5. **Apply authorization and disclosure before aggregation.** Given participation includes protected review/council/ethics facts, when an actor lacks the required audience, then identity, assignment, score/comment, conflict source, and protected metadata are omitted before de-duplication/counting. Omitted fields are absent, not `null`, and a direct source/history URL follows the same policy as profile detail.
6. **Constrain external researcher history.** Given the actor is `EXTERNAL_RESEARCHER_USER`, when participation history is requested, then only explicitly related records and assignments are returned with minimum disclosure; the history response never grants draft, review, file, or decision authority.
7. **Provide deterministic pagination and version invalidation.** Given multiple visible entries, when pages are requested, then entries are sorted by effective/occurred time descending, then domain and stable source ID; duplicates are removed only by the documented source-domain key. The cursor carries `asOf`, last sort tuple, enabled-source versions, and profile context version; any mismatch returns `CONTEXT_VERSION_MISMATCH` and requires a fresh first page.
8. **Preserve source corrections and boundaries.** Given a source relationship is ended or corrected with a successor, when history is queried after the source commits, then both the historical interval and current successor are represented according to disclosure rules without rewriting the source history. Exact start/end/revocation boundary tests use the same database UTC instant.

## Tasks / Subtasks

- [ ] Task 1: Define the shared authorized participation query contract (AC: 1-7)
  - [ ] Add a V1 runtime-validated source request/result, completeness state, entry DTO, coverage metadata, source registry entry, page cursor, and compatibility fixtures in the shared contract owner.
  - [ ] Add exact `researcher-profile.participation-history.read`; keep source relationship IDs/types domain-owned and reject unknown contract versions/codes.
  - [ ] Define deterministic sorting, de-duplication, pagination, enabled-source failure, and minimum-disclosure rules in executable fixtures rather than prose-only constants.

- [ ] Task 2: Make proposal the first explicit researcher-profile source (AC: 1-3, 5, 7)
  - [ ] Add nullable `researcherProfileId` to the proposal-owned participant relationship and its indexes/foreign key. The proposal domain remains lifecycle/authority owner.
  - [ ] Backfill only where `ProposalMember.userId` resolves through exactly one active, compatible profile-account link at the migration's authoritative time. Keep free-text, missing, and ambiguous rows unlinked; emit a deterministic migration/report surface rather than guessing.
  - [ ] Update future proposal participation create/correct operations to accept and validate an explicit profile identity while preserving account linkage only when a protected actor is needed.
  - [ ] Implement the proposal source provider behind an explicit port and pass producer/consumer fixtures before marking it enabled.

- [ ] Task 3: Implement the profile-owned aggregator (AC: 1-7)
  - [ ] Add a query service and `/api/v1/researcher-profiles/:id/participation-history` endpoint that first authorizes profile visibility, reads one database `asOf`, calls every enabled provider, and applies disclosure before count/de-duplication.
  - [ ] Return the documented page envelope and coverage metadata. Do not directly query proposal persistence from the researcher-profile module; inject the source query port.
  - [ ] Reject stale cursors/source versions and all enabled-source incomplete states with the canonical error envelope and correlation ID.

- [ ] Task 4: Add the participation section to profile detail as a reusable consumer (AC: 2, 4-6)
  - [ ] Render only enabled-source coverage and permitted entries with text relationship badges, source, record link, status, and interval.
  - [ ] Provide loading, empty, failure, stale-refresh, and pagination states; do not render partial data after an enabled-source failure.

- [ ] Task 5: Validate the integration gate and regression boundary (AC: 1-7)
  - [ ] Test exact/missing/ambiguous migration links, no name inference, proposal provider allow/empty/inactive/correction behavior, all completeness failures, unknown versions, and one request-wide `asOf`.
  - [ ] Test external-researcher minimum disclosure, disclosure before totals, hidden reviewer fields, source failure with no partial count, deterministic pages, duplicate keys, cursor invalidation, and proof that history cannot authorize a mutation.
  - [ ] Run focused producer/consumer fixtures, PostgreSQL tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Scope and dependency decisions

- Stories 2.1 and 2.2 are hard dependencies. The initial Done boundary is one fully contract-complete proposal source plus an extensible registry; do not implement future domain tables/adapters in this story.
- FR67's write ownership remains in each source domain. Story 2.3 owns the shared query contract and aggregation, not proposal/project/council membership mutation authority.
- `researcher_participation_links`, if introduced later as an index, is rebuildable and read-only. It must never become the source for authorization, conflict checks, or correction.
- Proposal rows with no explicit profile link are not silently attributed. This prevents same-name scientists and account changes from corrupting history.

### Existing seams to update and preserve

- Extend `ProposalMember` rather than creating a parallel generic participation table. Preserve its status/effective interval and Story 1.9 lifecycle rules.
- Reuse `ProposalParticipationService` as the proposal-owned provider boundary and the shared V1 context/version conventions in `packages/permissions`.
- The researcher-profile feature consumes the provider port; it does not import proposal Prisma models or issue cross-domain writes.

### Performance and disclosure

- Use indexed source queries and bounded page sizes. No Elasticsearch/OpenSearch is permitted in phase 1.
- Target the PRD's normal authenticated list/detail response budget. Performance never justifies partial results or pre-authorization counts.
- The restricted review disclosure matrix applies to history, search, files, exports, notifications, and timeline identically.

### References

- [Source: _bmad-output/epics.md#Story 2.3]
- [Source: _bmad-output/prd.md#FR67, UX Requirements, Permission Scenario Acceptance, and NFRs]
- [Source: _bmad-output/architecture.md#AD-4, AD-8, AD-9, AD-14, Shared read-model invariant, and Researcher Profile Ownership]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md#Request-Wide Evaluation Context, Review Disclosure Matrix, and Integration Gate and Fixtures]
- [Source: _bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted with proposal as the only initial enabled source and explicit integration-gate, migration, disclosure, failure, and pagination contracts.

### Completion Notes List

- Ultimate context-engine analysis completed; authoritative source ownership and the no-generic-authority boundary are explicit.

### File List
