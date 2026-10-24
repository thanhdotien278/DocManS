---
id: SPEC-scientific-cv
companions: [cv-data-contract.md]
sources: []
---

> Role names and decision rights here predate the 10-role model (2026-10-18); see `docs/permission-matrix.md`.

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Lý lịch khoa học (BM-06)

## Why

A mandate and a gap: the Academy needs each researcher's scientific CV in the standardized BM-06 form (aligned with the national Cổng thông tin KH&CN, STM – Bộ KH&CN, and Học viện Quân y). `/Users/Super/DocManS` has only a thin researcher profile (contact, rank, fields, publications, participations) and no CV. `/Users/Super/DocManS-review` already prototypes the feature as an unvalidated JSON blob in a monolithic panel, with defects (seed/UI shape mismatch, plaintext sensitive data in audit, fabricated demo data). This spec ports the behavior into the main product on its established researcher-profile, authorization, and audit foundations.

## Capabilities

- **CAP-1**
  - **intent:** A researcher edits Tab 1 "Thông tin chung" of their own CV: portrait (3x4 upload + crop), scientist type (read-only, derived from profileType: internal/external to the Academy), identity and work info, academic title/degree, research fields and keywords, languages, bank account, SmartCA serial, data-sharing consent, notes.
  - **success:** Saving through `/my-profile` persists every field; reload shows the same values; missing required fields (name, gender, ID number, email, unit, main research field) block save with field-level messages.
- **CAP-2**
  - **intent:** A researcher maintains education history (Tab 2) and work history with summary (Tab 3) as add/remove/edit rows.
  - **success:** Rows round-trip through save and reload in order; rows missing required fields (degree level, major, institution; period, organization) are rejected server-side; tab badges show row counts.
- **CAP-3**
  - **intent:** A researcher maintains research experience (Tab 4): publications, intellectual property, awards, projects.
  - **success:** Each list round-trips; required row fields enforced server-side; a datum is stored once, not duplicated across CV and existing profile publications/participations.
- **CAP-4**
  - **intent:** The owner, and managers with exact org scope, view and print the CV in BM-06 Vietnamese and English layouts (Tab 5).
  - **success:** Print view on A4 renders all sections from saved data (not unsaved edits), shows a "MẪU BM-06" mark, and toggles VI/EN; a user without view permission gets no CV data.
- **CAP-5**
  - **intent:** The server validates the CV against a versioned contract and protects against lost updates.
  - **success:** Malformed or out-of-range CV payloads return field-level 400s; a stale `contextVersion` returns 409 `CONTEXT_VERSION_MISMATCH`; unknown keys are rejected.
- **CAP-6**
  - **intent:** CV changes appear in the profile change history, and sensitive CV fields are disclosed only to authorized viewers.
  - **success:** An edit to bank/ID/SmartCA/consent yields a history and audit entry naming the changed section/field without plaintext values; owner and scoped managers see the entry; reviewer/council candidate lists, search results, and list views never contain sensitive CV fields.
- **CAP-7**
  - **intent:** Seed and bootstrap data exercise the real CV contract without inventing personal data.
  - **success:** The seeded demo researcher's CV populates all five tabs and validates against the contract; first access to `/my-profile` for an account without a profile never writes fabricated personal values.

## Constraints

- Build on the existing `researcher-profiles` module, `/api/v1/researcher-profiles/my-profile` endpoints, `aggregateVersion`/`contextVersion`, `ResearcherProfileHistory`, and shared audit; schema change is a new migration only.
- Access: owner (ACTIVE profile linked to their account) and SYSTEM_ADMIN / SCIENTIFIC_MANAGEMENT_HEAD / STAFF with exact organization-unit scope. Leadership and oversight roles gain nothing; the backend recomputes capability and the UI follows `viewerAuthorization`.
- Sensitive fields (bank account/name/branch, ID number/issue date/place, SmartCA serial, consent, portrait) are excluded from list, search, candidate, and notification projections and are never written in plaintext to audit or history facts.
- New permission actions are registered in all three places: `researcher-profile-access.ts`, `packages/permissions` (ts and js), and `docs/contracts/researcher-profile-access.md`.
- CV data must not alter reviewer/council eligibility or candidate ordering.
- The UI is split into per-tab components with shared row-table primitives; the review repo's single 2.5k-line panel is not ported. Visual output follows the shipped screenshot (5 tabs, A–E sections on Tab 1, single "Lưu lý lịch khoa học" save, "Xem & In Lý lịch khoa học" entry, change-history block).
- Storage is one versioned `curriculumVitae` JSON document on the profile; the shape is defined in `cv-data-contract.md`.

## Non-goals

- Portrait file storage in MinIO/files module (file handling is Epic 3); a client-cropped 300×400 JPEG data URL in `avatarUrl` is allowed (decided 2026-10-11).
- Server-side PDF/DOCX generation; browser print of the A4 view is the output.
- Sync or export to Cổng thông tin KH&CN, or any enforcement beyond recording the consent flag.
- CV approval, signature, or versioned-snapshot workflow.
- Importing CV data from external sources or other modules.
- Changes to account provisioning, reviewer/council eligibility, or the seven-role model.

## Success signal

A researcher signs in, completes all five tabs of their CV, saves, prints a correct A4 BM-06 in Vietnamese and English, and sees the change in history without any sensitive value exposed; a scoped manager sees the same CV; an out-of-scope user and reviewer/council candidate lists see none of it.

## Assumptions

- Tab 4 publications stay in `researcher_profile_publications`; a supplied PATCH list is the full list, deleting omitted saved rows transactionally. INACTIVE publications are hidden in Tab 4 and sent back unchanged. Projects, intellectual property and awards live only in `curriculumVitae.researchExperience`; non-SUPERSEDED profile participations are shown read-only with status, are already declared in the researcher profile, and must not be re-entered (decided 2026-10-12, story 13.4). Tab 4 publications are a read-only list edited through one right-side Drawer (story 13.8): the Drawer applies to the in-page draft, the CV save commits it; a nullable `publicationType` was added; evidence stays the `proofUrl` link (file upload deferred). Story 13.9 applies the same read-only table + Drawer + delete-confirm pattern to every CV list section and to the manager profile form's publications and participations lists (no API or contract change).
- Portrait is a URL/path string or a client-cropped image data URL (see `cv-data-contract.md`); the owner's data-URL portrait is also the header avatar.
- Tab 1 section A is two equal columns (single stacked column below 640px): left, the 3:4 portrait with Tải ảnh lên / Xóa ảnh and one compact format hint (JPG, PNG, WebP, max 5MB); right, only a read-only card for the derived scientist type ("Nhà khoa học trong Học viện (Internal researcher)" / "Nhà khoa học ngoài Học viện (External researcher)"). No explanatory paragraphs; upload, crop, confirm-before-delete, validation and permissions are unchanged (decided 2026-10-12).
- Redaction in audit/projection (not encryption at rest) meets the baseline unless the first open question is answered otherwise.

## Open Questions

- Must bank, ID number, and SmartCA be encrypted at rest?
- Is `shareDataAgreement` consumed by any flow (export to the national portal), or recorded only?
- Is server-side PDF export required?
- Which BM-06 fields are mandatory beyond name, gender, ID number, email, unit, main research field?
