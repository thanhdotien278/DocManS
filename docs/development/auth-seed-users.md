# Development Auth Accounts

Story 1.2 uses Prisma-seeded internal accounts for local development until Story 1.3 introduces user, role, and organization management screens.

These credentials are for local development only.

| Username | Password | Role | Unit |
| --- | --- | --- | --- |
| `admin` | `Admin@12345` | Quản trị hệ thống | Khoa Toán - Tin học |
| `tvtien` | `1234` | Giám Đốc | Ban Giám Đốc |
| `nmphuong` | `Nmphuong@12345` | Trưởng phòng | Phòng KHQS |
| `patuan` | `1234` | Chủ nhiệm đề tài | Khoa Toán - Tin học |
| `nmtrung` | `1234` | Thành viên Hội đồng | Ban Quản lý KHQS |
| `hdtien1` | `1234` | Chuyên viên | Phòng KHQS |
| `hdtien2` | `1234` | Chuyên viên | Phòng KHQS |

The seed file stores precomputed `scrypt` password hashes only. Plaintext credentials are documented here for local development and are not returned through auth endpoints.

Local database setup:

```bash
docker compose up -d postgres
npm run db:setup
```

`docker compose up api` runs the same setup path before starting the NestJS API, so a fresh local database receives the Epic 1 auth/session/audit migration and seed users automatically.

Troubleshooting:

- If the browser reports `Failed to fetch` while calling `http://localhost:4000/api/v1/auth/me`, confirm the API container is running with `docker compose ps` and start it with `docker compose up -d api`.
- A healthy unauthenticated API should return `200` from `http://localhost:4000/api/v1/health` and `401` from `http://localhost:4000/api/v1/auth/me`.
