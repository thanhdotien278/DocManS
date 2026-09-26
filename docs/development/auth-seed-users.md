# Local development and demo accounts

These identities and credentials are **local/demo only**, not production identity data.
All seeded accounts use the existing local password `1234`; the seed stores scrypt hashes.
Run `npm run db:setup` for a new local database, or `npm run prisma:seed` after migrations.

| Username | System role | Demo responsibility |
| --- | --- | --- |
| `admin` | `SYSTEM_ADMIN` | Platform administration; no implicit business approval |
| `nmphuong` | `SCIENTIFIC_MANAGEMENT_HEAD` | Trưởng phòng KHQS: scoped portfolio, officer assignment/reassignment/revocation, summary review and eligible package submission |
| `hdtien1`, `hdtien2` | `SCIENTIFIC_MANAGEMENT_STAFF` | Trợ lý/Chuyên viên KHQS: manage only proposals actively assigned to that account |
| `tvtien` | `LEADERSHIP_APPROVAL_AUTHORITY` | Giám đốc: oversight plus eligible final decisions, subject to conflicts |
| `vndinh` | `RESEARCH_OVERSIGHT_AUTHORITY` | Thiếu tướng PGS. TS. Vũ Nhất Định — Phó Giám đốc phụ trách NCKH; read-only institutional oversight plus independent researcher capabilities |
| `patuan`, `nmtrung`, `researcher1`, `researcher2`, `researcher3` | `RESEARCHER_INTERNAL_USER` | Researcher accounts; PI/member/reviewer/council responsibilities come from record relationships |
| `external1`, `external2`, `external3` | `EXTERNAL_RESEARCHER_USER` | Assigned external research/review work only |

Check `apps/api/prisma/seed.mjs` for the complete current seed identity list. Titles shown
in demo content are not system roles. Each account retains exactly one active system role.
`vndinh` links to an active INTERNAL researcher profile with the supplied name, military
rank, academic title and position; that profile does not grant management or decision power.

## Scope and management assignment

Home unit is not organization scope. `SCIENTIFIC_MANAGEMENT_HEAD`,
`LEADERSHIP_APPROVAL_AUTHORITY` and `RESEARCH_OVERSIGHT_AUTHORITY` have explicit grants
for all nine seeded internal units (`org-hvqy`, `org-bgq`, `org-khti`, `org-khqs`,
`org-bqlkhqs`, `org-k30`, `org-k81`, `org-k82`, `org-k84`). No organization-tree inheritance
is assumed. Staff has its existing seven-unit scope, but scope alone no longer grants
proposal visibility or management actions. An effective `PROPOSAL_MANAGEMENT_OFFICER`
assignment on that exact proposal is also required.

Existing proposals remain unassigned after migration/seed. Sign in as `nmphuong`, open an
in-scope proposal and explicitly assign eligible Staff with a reason. Reassignment/revocation
retains lifecycle history and audit. Staff participation/review on other records is evaluated
independently; it never supplies administrative actions. Conflicting participants/reviewers
cannot be assigned management responsibility. Do not create automatic officers to preserve
older broad Staff access.

A `LEADERSHIP_APPROVAL_AUTHORITY` user who is already a participant/reviewer retains the corresponding conflict and
cannot make the final decision. `vndinh` can read institutional records but receives no final
approval/rejection actions. As PI of an eligible own proposal, the same account can create,
edit and submit through ordinary researcher rules. Sensitive reviewer data remains protected.

`PROJECT_MANAGEMENT_OFFICER` and project oversight are contract requirements until the
approved-project backend exists. Current dashboards are showcase/demo data. Funding is
requested proposal metadata; actual expenditure/remaining project funding is not implemented.

## Local startup

Follow the mutually exclusive host-run or all-Docker setup in the root README. The API
command builds once; restart it after API source changes. Migration/seed does not refresh
an already running API process. A healthy unauthenticated API returns HTTP 200 at
`/api/v1/health` and HTTP 401 at `/api/v1/auth/me`.
