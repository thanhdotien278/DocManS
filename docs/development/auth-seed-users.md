# Development Auth Accounts

Story 1.2 uses Prisma-seeded internal accounts for local development until Story 1.3 introduces user, role, and organization management screens.

These credentials are for local development only. All seeded accounts share the password `1234`.

| Username | Password | Role | Unit |
| --- | --- | --- | --- |
| `admin` | `1234` | Quản trị hệ thống | Khoa Toán - Tin học |
| `tvtien` | `1234` | Giám Đốc | Ban Giám Đốc |
| `nmphuong` | `1234` | Trưởng phòng | Phòng KHQS |
| `patuan` | `1234` | Chủ nhiệm đề tài | Khoa Toán - Tin học |
| `nmtrung` | `1234` | Thành viên Hội đồng | Ban Quản lý KHQS |
| `hdtien1` | `1234` | Chuyên viên | Phòng KHQS |
| `hdtien2` | `1234` | Chuyên viên | Phòng KHQS |

The seed file stores precomputed `scrypt` password hashes only. Plaintext credentials are documented here for local development and are not returned through auth endpoints.

## Organization scopes

The `Unit` column above is each account's home unit. Backend authorization checks the account's
**organization scopes**, which are not always just that one unit.

The three scientific-management accounts (`nmphuong`, `hdtien1`, `hdtien2`) are additionally scoped
to `org-khti` (Khoa Toán - Tin học) and `org-bqlkhqs` (Ban Quản lý KHQS), because staff operate the
intake, supplement, reviewer-assignment and consolidation flows for the units they oversee rather
than only for their own department. Without those extra scopes the seeded PI (`patuan`, Khoa Toán -
Tin học) files proposals no seeded staff account may act on, and the EP-02/EP-03 demo stalls at the
first scope-checked staff action.

| Username | Organization scopes |
| --- | --- |
| `admin` | `org-khti` |
| `tvtien` | `org-bgq` |
| `nmphuong`, `hdtien1`, `hdtien2` | `org-khqs`, `org-khti`, `org-bqlkhqs` |
| `patuan` | `org-khti` |
| `nmtrung` | `org-bqlkhqs` |

Leadership (`tvtien`) does not need a matching organization scope to read or decide a proposal:
approval authority is evaluated from the `leadership` role plus the proposal's workflow state, and
reviewers read only the proposals they were explicitly assigned to.

Local database setup:

```bash
docker compose up -d postgres
npm run db:setup
```

`docker compose up api` runs the same setup path before starting the NestJS API, so a fresh local database receives the Epic 1 auth/session/audit migration and seed users automatically.

Troubleshooting:

- If the browser reports `Failed to fetch` while calling `http://localhost:4000/api/v1/auth/me`, confirm the API container is running with `docker compose ps` and start it with `docker compose up -d api`.
- A healthy unauthenticated API should return `200` from `http://localhost:4000/api/v1/health` and `401` from `http://localhost:4000/api/v1/auth/me`.
