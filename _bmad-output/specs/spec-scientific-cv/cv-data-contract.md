# CV data contract (v1)

Source of the shape: `DocManS-review/apps/api/src/researcher-profiles/researcher-profiles.dto.ts:5-84`, corrected for validation. Stored as `researcher_profiles.curriculum_vitae` (JSONB, nullable) plus `cvSchemaVersion: 1` inside the document. Required marks below are enforced **server-side**; unknown keys rejected. Dates ISO `YYYY-MM-DD`; years integers 1900–2100 (graduation 1950–2100).

## Tab 1 — `personalInfo`

| Field | Req | Notes |
|---|---|---|
| avatarUrl | no | URL/path string, max 2048, no upload |
| scientistType | yes | `DOMESTIC` \| `FOREIGN`; mirrors `profileType`, locked once an account is linked |
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

Existing profile columns (name, email, phone, position, military rank, rank/degree catalogs, research fields, expertise keywords) stay on the profile and are **not** duplicated into the JSON.
Tab 1 also carries free-text `note` ("Ghi chú hồ sơ").

## Tab 2 — `educationHistory[]`
degreeLevel (req, enum Đại học … Sau tiến sĩ), major (req), institution (req), graduationYear, trainingMode (enum), thesisTitle.

## Tab 3 — `workHistory`
`summary` (text) and `items[]`: period (req), organization (req), position, workField. (The review seed wrongly used an array; reject that shape.)

## Tab 4 — `researchExperience`
- publications[]: title (req), authors, publicationYear, venue, issnIsbn, classification, proofUrl, notes — storage per story 13.4.
- intellectualProperty[]: title (req), authors, issueYear, patentNumber, issueAgency, proofUrl, notes.
- awards[]: name (req), awardYear, endYear, grantingAgency, proofUrl, notes.
- projects[]: projectTitle (req), managementAgency, code, role (req), period, status, notes — storage per story 13.4.

## Limits
Each list ≤ 200 rows; each string ≤ 1000 (notes ≤ 4000); document ≤ 256 KB.

## Redaction classes
- SENSITIVE fields above: omitted from list/search/candidate/notification projections; history/audit facts record `{section, field, changed: true}` only.
- Everything else in the CV: owner + scoped managers; audit facts may include non-sensitive values.

## Known review-repo defects not to port
Seed keys ≠ UI/DTO keys; `workHistory` as array; CV in audit facts in plaintext; consent unused; fake data in `ensureProfileForResearcher`; publications stored twice; CV edits invisible in history UI.
