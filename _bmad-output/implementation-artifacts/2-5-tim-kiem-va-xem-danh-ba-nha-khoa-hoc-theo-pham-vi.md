---
baseline_commit: 2ae8c3e
---

# Story 2.5: Tìm kiếm và xem danh bạ nhà khoa học theo phạm vi

Status: ready-for-dev

## Story

As a người dùng được phép,
I want tìm kiếm nhà khoa học theo tên, đơn vị, lĩnh vực và chuyên môn,
so that tôi có thể tìm đúng người cho nhu cầu nghiệp vụ trong phạm vi được giao.

## Acceptance Criteria

1. **Search only the authorized universe.** Given an authenticated actor with exact organization/data scope, when they search by normalized name, organization ID, active research-field code, normalized expertise keyword, profile status, or an enabled participation attribute, then the backend applies authorization before rows, totals, and facets. No result, count, facet, timing-specific error, or filter option reveals an out-of-scope profile.
2. **Use bounded deterministic query semantics.** Given valid filters, page size, and sort, when the list is requested, then the API returns a consistent `items/page/pageSize/total/facets` envelope, bounded page size, documented contains/exact matching, and stable sorting with profile ID as final tie-breaker. Duplicate rows from multiple keywords, fields, links, or participation entries are removed before paging and counting.
3. **Keep base directory usable when optional sources are unavailable.** Given only profile-owned filters are requested, when a future participation source is disabled, then scoped profile search still works and does not claim that source is covered. Given an enabled participation filter/detail section is requested and that source is unresolved/stale/fails, then the requested enriched response fails closed with no partial participation-derived result or count.
4. **Apply field-level disclosure consistently.** Given a profile is visible, when a list or detail DTO is built, then list items omit contact data, linked-account system role, hidden assignment identity, review material, and conflict source unless the audience has an explicit field permission. Detail uses the same base scope predicate as list/direct URL and omits protected fields rather than returning them as `null`.
5. **Compose detail without conflating identities.** Given an actor opens a visible profile, when detail loads, then it presents permitted academic data, profile status, management organization/display affiliation, permitted account-link status, enabled participation history, and backend-derived viewer authorization. Account system role, profile identity, and every record relationship are separately labelled; the UI never selects a “highest relationship.”
6. **Fail protected clients closed.** Given a response has an unknown capability schema/action/decision code or lacks required context, when the web client parses it, then protected actions remain disabled and a refresh/error state is shown. A list/detail capability response is descriptive; every mutation continues to re-authorize.
7. **Meet responsive and accessible directory behavior.** Given the directory is used at `360`, `390`, `430`, `768`, `1024`, or `1440` px, when viewport and filters change, then desktop uses a readable table, mobile uses cards or contained horizontal scrolling, no full-page horizontal scroll appears, applied filters are visible/clearable, and loading/empty/error states are present. Controls have accessible names, keyboard-visible focus, approximately 44 px touch targets, and status uses text/icon plus color.
8. **Meet normal query performance without new infrastructure.** Given representative indexed data and a normal authenticated directory/detail query, when measured in the agreed test/UAT environment, then 95% complete within the PRD's two-second target. The implementation uses PostgreSQL indexes and bounded queries; it does not introduce Elasticsearch/OpenSearch or leak data through a global cache.

## Tasks / Subtasks

- [ ] Task 1: Finalize the scoped directory/detail API contract (AC: 1-6, 8)
  - [ ] Define filter, sort, pagination, facet, list item, detail, account-link projection, participation enrichment, and viewer-authorization DTOs with runtime/client fail-closed validation where protected fields/actions are involved.
  - [ ] Add exact `researcher-profile.search` and use the existing read/history actions for detail sections. Document page-size maximum, matching semantics, stable sort keys, and error envelope.
  - [ ] Define a single reusable profile-scope predicate used by items, count, facets, and direct detail. Do not derive scope from `User.unit` or post-filter an unscoped result.

- [ ] Task 2: Implement indexed scoped queries (AC: 1-4, 8)
  - [ ] Extend the researcher-profile service/controller for `GET /api/v1/researcher-profiles` and `GET /api/v1/researcher-profiles/:id`; reuse Story 2.1 routes rather than create an admin-only duplicate API.
  - [ ] Query normalized profile/keyword/field columns with exact organization/status predicates, distinct profile IDs, bounded pagination, and deterministic tie-breakers. Add only migration indexes demonstrated by query plans/representative tests.
  - [ ] Calculate list, total, and facets from the same authorized base universe. Resolve optional participation filters through Story 2.3's authorized provider contract and fail only the requested enriched response when an enabled source is incomplete.
  - [ ] Compose detail through account-link and participation query services; do not reach directly into another domain's persistence or expose raw `User`/assignment records.

- [ ] Task 3: Build the production directory and detail UI (AC: 4-7)
  - [ ] Extend the Story 2.1 feature routes/components and `researcher-profiles-api.ts`; reuse shell, breadcrumb, filter bar, empty state, status/participation badges, section cards, and timeline placeholders.
  - [ ] Implement desktop table, mobile cards/contained scroll, filter drawer or compact pattern, applied-filter chips, reset, pagination, loading/empty/error/stale states, and direct detail navigation.
  - [ ] Render account status/system role only for permitted audiences and label it separately from every record relationship. Consume backend capability/denial data without local role inference.

- [ ] Task 4: Verify authorization, query correctness, UX, and performance (AC: 1-8)
  - [ ] Test cross-unit and direct-ID denial/no-existence-leak, inactive profiles, empty result, scoped totals/facets, multiple child rows without duplicate profiles, stable page boundaries, invalid filters/page size, and field-level omission.
  - [ ] Test base search with disabled sources and participation-enriched search/detail with enabled-source failure/staleness/version mismatch; no partial counts or cursor may escape.
  - [ ] Test list/detail capability parity and unknown-contract client failure. Add browser/manual evidence for keyboard, focus, labels, filter states, and all six required viewports.
  - [ ] Record representative query/performance evidence; run focused tests, `npm run typecheck`, `npm test`, and `git diff --check`.

## Dev Notes

### Dependencies and scope boundary

- Story 2.1 supplies profile data/index foundations; 2.2 supplies account-link projection; 2.3 supplies authorized participation enrichment. The base directory must not wait for future domains.
- Advanced cross-module/global search remains Epic 12. This story owns the researcher directory only and may not introduce a search engine or generic global index.
- Default list disclosure should be conservative: academic directory facts and status, not email/phone/system role/reviewer identity.

### Existing seams to reuse

- Reuse the existing route shell, `FilterBar`, `StatusBadge`, `ParticipationBadge`, `EmptyState`, breadcrumb, and responsive CSS patterns. Keep feature components under `apps/web/src/components/researcher-profiles` and client types under `apps/web/src/lib/researcher-profiles-api.ts`.
- Use the App Router paths `/researcher-profiles` and `/researcher-profiles/[id]`; do not add a Pages Router or duplicate API route handler.
- The current admin user list is a useful style reference but is not an authorization/query template: it lacks the required scoped count/facet and profile disclosure contract.

### Search normalization

- Story 2.1 owns deterministic normalized search columns for Vietnamese names and expertise. Search operates on those columns while preserving original display values.
- Apply matching rules consistently to items/count/facets and document whether each filter is contains, prefix, or exact. Avoid database collation assumptions that differ across environments.

### References

- [Source: _bmad-output/epics.md#Story 2.5]
- [Source: _bmad-output/prd.md#FR68, Web Application Specific Requirements, UX Requirements, and NFRs]
- [Source: _bmad-output/project-context.md#UX/UI Rules, Authorization And Security Rules, and Testing Rules]
- [Source: _bmad-output/architecture.md#API Response Formats, Frontend Architecture, AD-6, AD-11, and Project Structure]
- [Source: docs/ux-design-guidelines.md#Responsive UI, Data Tables, Navigation And Search, Accessibility, and Multi-Role Rules]
- [External: https://nextjs.org/docs/app]

## Dev Agent Record

### Agent Model Used

GPT-5.6

### Debug Log References

- 2026-08-11: Contexted with one scoped query universe, deterministic paging, field-level disclosure, optional-source behavior, and responsive/accessibility test requirements.

### Completion Notes List

- Ultimate context-engine analysis completed; search semantics, no-leak totals/facets, detail composition, and UI verification are explicit.

### File List
