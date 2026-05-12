# Development Auth Accounts

Story 1.2 uses Prisma-seeded internal accounts for local development until Story 1.3 introduces user, role, and organization management screens.

These credentials are for local development only.

| Username | Password | Role | Unit |
| --- | --- | --- | --- |
| `admin` | `Admin@12345` | Quản trị hệ thống | Khoa Toán - Tin học |
| `leadership` | `Leadership@12345` | Giám Đốc | Ban Giám Đốc |
| `staff` | `Staff@12345` | Trưởng phòng | Phòng KHQS |
| `pi` | `Pi@12345` | Chủ nhiệm đề tài | Khoa Toán - Tin học |
| `reviewer` | `Reviewer@12345` | Thành viên Hội đồng | Ban Quản lý KHQS |

The seed file stores precomputed `scrypt` password hashes only. Plaintext credentials are documented here for local development and are not returned through auth endpoints.

Local database setup:

```bash
docker compose up -d postgres
npm run prisma:migrate
npm run prisma:seed
```
