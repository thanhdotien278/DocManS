# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RTMS ("DocManSystem") — an internal research-management system for Học viện Quân y (Vietnam Military Medical University). Users, roles, business language, and all UI copy are Vietnamese. Domain vocabulary is fixed in `CONTEXT.md`; use those terms (e.g. **Authenticated Session**, not "JWT session").

## Commands

```bash
npm run dev:api          # build API to dist/ then run it (NO watch — rerun after every API edit)
npm run dev:web          # Next.js dev server on :3000
npm test                 # build:api, then node --test tests/*.test.mjs
npm run typecheck        # tsc --noEmit for web + api  (npm run lint is an alias for this)
npm run build            # build:web + build:api

# single test file — must build first, tests import from dist/
npm run build:api && node --test tests/proposals-ep02.test.mjs

# database (Postgres via docker compose)
docker compose up -d postgres minio
npm run db:setup         # prisma generate + migrate deploy + seed
npm run prisma:migrate   # create a new migration during development
```

Full stack: `docker compose up` (postgres, minio, web, api, nginx on :8080). Seeded dev logins are in `docs/development/auth-seed-users.md` (all password `1234`, e.g. `admin`, `patuan`, `nmphuong`).

There is no ESLint and no test runner beyond `node:test`. `npm run lint` runs TypeScript only.

## Architecture

npm workspaces + Nx (`apps/*`, `packages/*`). Nx targets exist but every script is a plain command; Nx adds only caching. If the Nx daemon fails with `EPERM`, use `NX_DAEMON=false npx nx ...`.

### apps/api — NestJS 11, built with plain `tsc`

Compiled with `tsconfig.app.json` (`module: NodeNext`, `rootDir: src`) to `dist/apps/api`. Consequences that bite:

- **Every relative import needs an explicit `.js` extension** (`./auth.service.js`), including type-only imports.
- **The API cannot import `@rtms/*` workspace packages** — `rootDir: src` forbids emitting outside `src`. `packages/permissions` is therefore hand-duplicated at `apps/api/src/permissions/permission-policy.ts`. Keep the two in sync when either changes.
- `npm run dev:api` has no watch mode; every change needs a rebuild.

Module layout: `auth/`, `admin/`, `modules/files/`, `proposal-intake-periods/`, `research-proposals/`, with cross-cutting helpers in `proposals-shared/` and `infrastructure/` (Prisma, MinIO). All feature modules import `AuthModule` and guard controllers with `@UseGuards(SessionAuthGuard)`; the guard attaches `request.currentUser: SafeUserContext`, and controllers pass it explicitly into services (`request.currentUser!`).

**Validation uses hand-written `PipeTransform` object literals, not class-validator.** DTO classes are plain shapes; a sibling `xxxPipe` const does the checking via helpers in `proposals-shared/proposal-validation.ts` and throws `BadRequestException` with a Vietnamese message. Bind it per-parameter: `@Body(createResearchProposalDraftPipe) body: CreateResearchProposalDraftDto`. Tests import these pipes directly.

**Authorization lives in two layers.** `packages/permissions` / `permission-policy.ts` is a coarse fail-closed primitive (only system-admin foundation resources and dashboard reads pass today). The rules that actually gate business endpoints are the `assertCanX` helpers in `proposals-shared/proposal-access.ts` (`assertCanReadProposal`, `assertCanEditProposalDraft`, `assertHasOrganizationScope`, …), which throw `ForbiddenException`. `docs/permission-matrix.md` is the declared source of truth for role/scope/state rules and must be updated in the same change set when workflow or roles change.

Sessions are opaque server rows (`Session` table, 12h TTL) behind an `HttpOnly` `rtms_session` cookie — no JWT. Passwords are `scrypt:<salt>:<hex>` verified with `timingSafeEqual`. Mutations and auth events record through `AuditLogService`.

Prisma 7 with the `@prisma/adapter-pg` driver adapter; `DATABASE_URL` is required and never defaulted. Schema is `camelCase` fields mapped to `snake_case` columns/tables.

Files: `modules/files` stores uploads in MinIO and metadata in `FileRecord`; the older `ProposalAttachment` table still exists alongside it. Allowed extensions and size cap come from env (`FILE_ALLOWED_EXTENSIONS`, `FILE_MAX_UPLOAD_BYTES`) and MIME type is cross-checked against the extension.

### apps/web — Next.js 15 App Router, React 19

- **No Tailwind, no CSS-in-JS.** One 1700-line `src/app/globals.css` defines CSS custom properties (`--primary: #145a37`, status colors, `--radius`) plus semantic global class names (`section-copy`, `grid two-column`, …). Components use `className` strings against those globals. Tokens are mirrored in `packages/ui-tokens`. `docs/ux-design-guidelines.md` is the binding visual spec (institutional green, data-dense admin style; no gradients/hero banners/emoji).
- **Page/panel split.** `app/*/page.tsx` are server components that render only `Breadcrumb` + `PageHeader` + a `"use client"` panel from `components/<feature>/*-panel.tsx`. Panels own all state and call the API from the browser with `credentials: "include"` through the typed wrappers in `src/lib/*-api.ts`.
- **Two auth layers.** `src/middleware.ts` runs on every non-static path: no `rtms_session` cookie → redirect to `/login`; cookie present → server-side `fetch` of `/auth/me` (via `API_INTERNAL_BASE_URL`, which differs from the browser-facing `NEXT_PUBLIC_API_BASE_URL` under Docker) and redirect if invalid. In the browser, `SessionProvider` re-fetches `/auth/me` and pushes the account into the shell.
- `src/fixtures/shell-context.ts` holds the role → navigation/route-title map and route copy. It is presentation config, not data — real data always comes from the API. `app/[...segments]/page.tsx` is a catch-all that renders a placeholder page for any nav route not yet implemented.

### packages/

`@rtms/contracts` (workflow status union), `@rtms/permissions`, `@rtms/ui-tokens`, `@rtms/validation` — small, source-only (`main` points at `src/index.ts`), consumed by web via tsconfig paths + `transpilePackages` in `next.config.ts`. Not consumed by the API (see above).

## Tests

`tests/*.test.mjs`, `node:test`, no framework. Two distinct styles:

1. **Service tests** (`proposals-ep02`, `admin-foundation`, `auth-api`, `files-route`) import compiled classes from `../dist/apps/api/...` and instantiate them with hand-written fake Prisma/storage/audit objects. No database, no Nest testing module. Adding a Prisma call to a service means extending the fakes in the test file.
2. **Source-assertion guards** (`smoke.test.mjs`, `admin-users-panel-source.test.mjs`) read source files as text and assert on their contents. These will fail on otherwise-valid changes:
   - `smoke.test.mjs` asserts the **exact ordered list of Prisma models** — adding or renaming a model requires updating that assertion.
   - It forbids the words `demo`, `mock`, `mô phỏng`, `giả lập`, `test data` (case-insensitive) anywhere under `apps/web/src`, including comments.
   - It forbids `localStorage`/`document.cookie` in `lib/session.ts`, requires `scrypt` in the password service, and asserts `apps/web/src/lib/accounts.ts` and `lib/app-data.ts` stay absent (the README's mention of `lib/accounts.ts` is stale).

## Planning artifacts

Work is organized as BMAD epics/stories (branches like `EP-03-review-approval-workflow`, `ST-2.4-proposal-submit-history`; commits `feat(st-2.4): ...`). Planning output lives in `_bmad-output/` (`prd.md`, `architecture.md`, `epics-and-stories.md`) with `_bmad/` holding the tool config — BMAD writes Vietnamese. Repo-side docs: `docs/permission-matrix.md`, `docs/ux-design-guidelines.md`, `docs/stories-notes-vi/epics-and-stories.md`, `docs/sprints/`, `docs/story-logs/`.

Issues are tracked in GitHub Issues for `thanhdotien278/DocManS` via `gh` (`docs/agents/issue-tracker.md`); triage labels are `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

`AGENTS.md` carries the standing working agreement: state assumptions before implementing, minimum code that solves the problem, surgical diffs that match surrounding style, and clean up only orphans your own change created.
