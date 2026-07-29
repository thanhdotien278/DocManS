# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DocManSystem (RTMS) is an internal research-management platform for the Vietnam Military Medical University (Học viện Quân y). The product UI and most domain text are in **Vietnamese** — match the surrounding language when editing user-facing strings, labels, and error messages.

It is an **Nx + npm-workspaces monorepo**:

- `apps/web` — Next.js 15 / React 19 App Router frontend (port 3000)
- `apps/api` — NestJS 11 backend (port 4000, base path `/api/v1`)
- `packages/*` — shared TypeScript libraries imported via `@rtms/*` aliases: `contracts` (shared types/workflow enums), `permissions` (authorization policy), `validation`, `ui-tokens` (palette)

## Commands

```bash
# First-time / schema changes — requires a running Postgres (see Data layer)
npm run db:setup          # prisma generate + migrate deploy + seed

# Dev (two terminals)
npm run dev:api           # tsc-compiles apps/api -> dist/, then runs node dist/apps/api/main.js
npm run dev:web           # next dev

# Quality gates
npm test                  # build:api, then node --test on tests/*.test.mjs
npm run typecheck         # tsc --noEmit for web + api
npm run lint              # ALIAS for typecheck — there is no ESLint in this repo

# Build
npm run build             # build:web (next build) + build:api (tsc)
```

Run a **single test file** (build the API first — most tests import compiled output from `dist/`):

```bash
npm run build:api && node --test tests/auth-api.test.mjs
```

`node --test --test-name-pattern "<regex>"` filters by test name.

If Nx CLI commands fail with a daemon `EPERM` in a sandbox, prefix with `NX_DAEMON=false`.

## Architecture notes that span multiple files

**API build/run is plain `tsc`, not the Nest CLI.** `apps/api` compiles to `dist/apps/api/**` and runs with `node`. Consequences:
- The API is **ESM** — TypeScript source uses `.js` import specifiers even when importing `.ts` files (e.g. `import { AuthService } from "./auth.service.js"`). Keep this convention or the runtime import breaks.
- **Tests run against `dist/`, not source.** `tests/*.test.mjs` are Node's built-in test runner and import from `../dist/apps/api/...`, so you must `build:api` before they reflect your changes (`npm test` does this for you). A few tests instead read source files as text to assert on structure/policy.

**Auth is opaque server-side sessions, NOT JWT** (see `CONTEXT.md` for the enforced domain vocabulary). Login (`POST /api/v1/auth/login`) verifies a scrypt hash (`apps/api/src/auth/password.service.ts`, format `scrypt:<salt>:<key>`), creates a `Session` row, and sets an httpOnly cookie `rtms_session` holding the session id (12h TTL). `SessionAuthGuard` reads that cookie on protected routes and attaches `request.currentUser`. There are no client-held tokens.

**The web app enforces auth in two layers**, both of which call the API's `/auth/me`:
1. `apps/web/src/middleware.ts` — redirects to `/login` when the session cookie is missing or invalid (server-side, on every non-asset request).
2. `SessionProvider` + `AppShell` (`apps/web/src/components/`) — client-side re-check that also drives the redirect and gates the shell UI.
Because the web app authenticates against the real API, **the API and a seeded database must be running** for the web app to work past the login screen.

**Fixtures are deliberately isolated.** UI-only/demo data lives under `apps/web/src/fixtures` and must not leak into `apps/web/src/lib`. The smoke test (`tests/smoke.test.mjs`) actively asserts this separation and that permissions stay fail-closed.

**Authorization is fail-closed and exists in two places.** `packages/permissions/src/index.ts` (shared) and `apps/api/src/permissions/permission-policy.ts` (API copy) both default to `allowed: false`; keep them in sync. Roles: `system-admin`, `scientific-management`, `leadership`, `principal-investigator`, `reviewer`, `council-member`. The authoritative role/action breakdown is `docs/permission-matrix.md`.

**Proposal workflow is a status state machine.** `ResearchProposal.status` moves `draft → submitted → supplement_requested → …` inside DB transactions in `apps/api/src/research-proposals/research-proposals.service.ts`; every transition writes a `ProposalSubmissionEvent` and an `AuditLog` row. `packages/contracts` defines the broader `WorkflowStatus` union used by the UI.

## Data layer

Prisma 7 with the **pg adapter** (`@prisma/adapter-pg`) against PostgreSQL; `DATABASE_URL` is required (no default in code). Schema: `apps/api/prisma/schema.prisma` (columns use snake_case via `@map`). Migrations under `apps/api/prisma/migrations` are **hand-authored SQL** named by epic/story (e.g. `..._ep02_proposal_intake_submission`). File uploads (`FileRecord`, `ProposalAttachment`) are stored in **MinIO** (`apps/api/src/infrastructure/minio`, `modules/files`).

Start Postgres + MinIO for local work via `docker compose up -d postgres minio`, then `npm run db:setup`. Seeded demo accounts (`docs/development/auth-seed-users.md`) all share the password `1234`; `admin` is the system-admin.

## Working conventions

- Development is organized into **epics/stories** (BMAD workflow). Migrations, feature modules, branches, commits (`feat(st-2.4): …`, `EP-03`), and `docs/story-logs`, `docs/sprints`, `docs/stories-notes-vi` follow this naming. Check those docs for the intent behind a feature.
- **Issues/PRDs live in GitHub Issues** for `thanhdotien278/DocManS`; use the `gh` CLI (`docs/agents/issue-tracker.md`). Triage labels: `docs/agents/triage-labels.md`.
- `AGENTS.md` holds behavioral guidelines (think before coding, simplicity first, surgical changes, goal-driven verification) — follow them; they take precedence for style/scope decisions.
- Config: strict TypeScript from `tsconfig.base.json`; path aliases `@rtms/*` (packages) and `@/*` (`apps/web/src`). Env template: `.env.example`.
