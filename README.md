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
