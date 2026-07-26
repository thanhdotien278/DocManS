# DocManSystem

DocManSystem is an Nx workspace for the RTMS internal research-management platform.

## Story 1.1 Foundation Scope

Story 1.1 establishes the repository foundation only:

- Next.js web app in `apps/web`
- NestJS API app in `apps/api`
- shared TypeScript packages for contracts, validation, permissions, and UI tokens
- strict TypeScript checks and basic build/test scripts
- Docker Compose and Nginx deployment skeletons
- institutional admin app shell aligned with the approved UX direction

Authentication, real session management, database schema, Prisma migrations, Redis, MinIO, notification jobs, and business workflows start in later stories.

The current visual screens are preserved as UI shell/reference pages and use isolated frontend fixture data under `apps/web/src/fixtures`. Story 1.2 can replace the neutral shell context with backend-backed authentication without removing route-protection workarounds first.

## Verification

Use the root scripts for Story 1.1 checks:

```bash
npm test
npm run lint
npm run build
```

`npm run lint` currently runs TypeScript static checks for the workspace. ESLint can be introduced in a later quality/tooling story if the team wants rule-based linting beyond strict TypeScript.

Nx project files are present, but some sandboxed environments may block the Nx daemon socket. If direct Nx CLI commands fail with daemon `EPERM`, rerun them with daemon disabled, for example:

```bash
NX_DAEMON=false npx nx show projects
```
# DocManS

DocManS is an RTMS workspace for the Vietnam Military Medical University context. It currently contains:

- A `Next.js` web application in `apps/web`
- A `NestJS` API placeholder in `apps/api`
- Shared workspace packages in `packages/*`
- BMAD project artifacts and configuration in `_bmad` and `_bmad-output`

At this stage, the web app is the primary deliverable. The API currently exposes a simple health endpoint and does not require a database.

## Tech Stack

- `Node.js 22`
- `npm`
- `Nx`
- `Next.js 15`
- `React 19`
- `NestJS 11`
- `TypeScript`

## Project Structure

```text
apps/
  web/        Next.js frontend
  api/        NestJS API
packages/     Shared packages
tests/        Workspace smoke tests
_bmad/        BMAD configuration
docs/         Project documentation
reports/      Reference files and screenshots
```

## Prerequisites

- `Node.js >= 22`
- `npm >= 10`

Check your versions:

```bash
node -v
npm -v
```

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Default values:

```env
NEXT_PUBLIC_APP_NAME="RTMS"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
API_PORT=4000
```

## Install Dependencies

If dependencies are not installed yet:

```bash
npm install
```

## Run the Project Locally

Open two terminals.

Terminal 1: start the API

```bash
npm run dev:api
```

The API listens on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/v1/health
```

Terminal 2: start the web app

```bash
npm run dev:web
```

The web app runs at:

```text
http://localhost:3000
```

## Run with Docker Compose

Start all services:

```bash
docker compose up
```

Available endpoints:

- `http://localhost:3000` for the web app
- `http://localhost:4000/api/v1/health` for the API
- `http://localhost:8080` through Nginx

Stop services:

```bash
docker compose down
```

## Build

Build both applications:

```bash
npm run build
```

Or build them separately:

```bash
npm run build:web
npm run build:api
```

## Test and Type Check

Run smoke tests:

```bash
npm test
```

Run type checks:

```bash
npm run typecheck
```

## Demo Login

The web app authenticates against the API (`POST /api/v1/auth/login`) using Prisma-seeded
accounts, so the **API and database must be running** (see [Environment Setup](#environment-setup)
and `npm run db:setup`).

Open:

```text
http://localhost:3000/login
```

Sign in with a username below. **All seeded accounts share the password `1234`** (local development only).

| Role | Username | Password |
| --- | --- | --- |
| System admin | `admin` | `1234` |
| Leadership (Giám Đốc) | `tvtien` | `1234` |
| Scientific management | `nmphuong` | `1234` |
| Principal investigator | `patuan` | `1234` |
| Reviewer | `nmtrung` | `1234` |
| Staff | `hdtien1`, `hdtien2` | `1234` |

See [`docs/development/auth-seed-users.md`](docs/development/auth-seed-users.md) for the full list and troubleshooting.

## Main Routes

- `/login`
- `/dashboard`
- `/proposals`
- `/proposals/[id]`
- `/tasks`

Additional routes are role-aware and are driven by the authenticated session (`apps/web/src/lib/session.ts`, backed by the API `/auth` endpoints).

## Available Scripts

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run build:web
npm run build:api
npm run lint
npm run typecheck
npm test
```

## Notes

- The API (NestJS) exposes auth/session, admin, and research-proposal endpoints backed by PostgreSQL via Prisma.
- Authentication uses server-side sessions (HTTP-only cookie) validated by the API against seeded accounts.
- The repository also contains BMAD documentation and planning artifacts for product and UX work.
