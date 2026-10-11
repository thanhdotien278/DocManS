# CV data contract (v1)

Source of the shape: `DocManS-review/apps/api/src/researcher-profiles/researcher-profiles.dto.ts:5-84`, corrected for validation. Stored as `researcher_profiles.curriculum_vitae` (JSONB, nullable) plus `cvSchemaVersion: 1` inside the document. Required marks below are enforced **server-side**; unknown keys rejected. Dates ISO `YYYY-MM-DD`; years integers 1900–2100 (graduation 1950–2100).

## Tab 1 — `personalInfo`

| Field | Req | Notes |
|---|---|---|
| avatarUrl | no | `http(s)://` or `/path` URL, or a cropped 300×400 `data:image/(jpeg\|png\|webp);base64,…` (≤ 400 000 chars, excluded from the 256 KB document budget); served to the owner at `GET my-profile/avatar` |
| gender | yes | enum Nam/Nữ/Khác |
| birthDate, birthPlace, nationality | no | |
| idNumber | yes | SENSITIVE (CCCD/passport) |
| idIssueDate, idIssuePlace | no | SENSITIVE |
| englishAcademicTitle | no | e.g. "Prof. Dr." |
| contactAddress | no | |
| organization | yes | free text unit as on the CV; managed unit stays `managementOrganizationUnitId` |
| bankAccount, bankName, bankBranch | no | SENSITIVE |
| smartCaSerial | no | SENSITIVE |
| shareDataAgreement | yes | boolean, default true; SENSITIVE (consent) |
| languages[] | no | `{language (req), proficiency, certificate}` |

Scientist type is not stored in the CV: it is derived from `profileType` (INTERNAL = trong Học viện, EXTERNAL = ngoài Học viện). A legacy `scientistType` key is accepted and discarded.
Existing profile columns (name, email, phone, position, military rank, rank/degree catalogs, research fields, expertise keywords) stay on the profile and are **not** duplicated into the JSON.
Tab 1 also carries free-text `note` ("Ghi chú hồ sơ").

## Tab 2 — `educationHistory[]`
degreeLevel (req, enum Đại học … Sau tiến sĩ), major (req), institution (req), graduationYear, trainingMode (enum), thesisTitle.

## Tab 3 — `workHistory`
`summary` (text) and `items[]`: period (req), organization (req), position, workField. (The review seed wrongly used an array; reject that shape.)

## Tab 4 — `researchExperience`
- Profile `publications[]` (not a JSON researchExperience key): title (req), authors, publicationYear, venue, issnIsbn, doi, classification, proofUrl, notes — stored only in `researcher_profile_publications`. PATCH sends the full list only when changed; omitted saved rows are hard-deleted in the same transaction. INACTIVE rows are hidden and sent back unchanged.
- intellectualProperty[]: title (req), authors, issueYear, patentNumber, issueAgency, proofUrl, notes.
- awards[]: name (req), awardYear, endYear, grantingAgency, proofUrl, notes.
- projects[]: projectTitle (req), managementAgency, code, role (req), period, status, notes — stored only in `curriculumVitae.researchExperience.projects` (no migration).

Non-SUPERSEDED profile `participations` are read-only on Tab 4 (title, role, level, dates, status); they are already declared in the researcher profile and must not be re-entered.
Publication classification options: ISI/Scopus, Quốc tế khác, Trong nước (HĐGSNN), Báo cáo hội nghị, Sách/Chuyên khảo, Khác. Project role options: Chủ nhiệm, Thư ký, Thành viên chính, Thành viên. Project status options: Đang thực hiện, Đã nghiệm thu, Tạm dừng. These are free text; unknown stored values remain visible. Year dropdowns run from current year down to 1950.

## Limits
Each list ≤ 200 rows; each string ≤ 1000 (notes ≤ 4000); document ≤ 256 KB.

## Redaction classes
- SENSITIVE fields above: omitted from list/search/candidate/notification projections; history/audit facts record `{section, field, changed: true}` only.
- Everything else in the CV: owner + scoped managers; audit facts may include non-sensitive values.

## Known review-repo defects not to port
Seed keys ≠ UI/DTO keys; `workHistory` as array; CV in audit facts in plaintext; consent unused; fake data in `ensureProfileForResearcher`; publications stored twice; CV edits invisible in history UI.
