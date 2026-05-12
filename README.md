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

The web app uses local in-memory account profiles. There is no backend authentication yet.

Open:

```text
http://localhost:3000/login
```

How login works:

- Select an access profile
- Use the matching username shown on the form
- Enter any non-empty password

Sample demo accounts:

| Role | Username |
| --- | --- |
| Leadership | `nvm_bgh` |
| Scientific management | `vlan_qlkh` |
| Principal investigator | `patuan_pi` |
| Reviewer | `ttha_reviewer` |
| System admin | `nqbao_admin` |

## Main Routes

- `/login`
- `/dashboard`
- `/proposals`
- `/proposals/[id]`
- `/tasks`

Additional routes are role-aware and are driven by the session profile in `apps/web/src/lib/accounts.ts`.

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

- The API is currently a placeholder service for visual and workflow development.
- Authentication is session-based in the browser and uses seeded local profiles.
- The repository also contains BMAD documentation and planning artifacts for product and UX work.
