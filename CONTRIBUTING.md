# Contributing to DocManS

Thank you for helping improve DocManS. Code, documentation, workflow feedback, bug reports, translations, and accessibility reviews are all welcome.

## Before you start

- Search existing [issues](https://github.com/thanhdotien278/DocManS/issues) first.
- For anything larger than a small fix, open an issue describing the institutional workflow, the expected outcome, and the roles involved. Workflow and permission changes affect every deployment, so agree on the approach before writing code.
- Never post real research data, personal data, credentials, or deployment details (hostnames, IPs, secrets) in issues, pull requests, screenshots, or test fixtures.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.

## Development setup

Follow **Getting Started** in the [README](README.md). In short:

```bash
npm ci
cp .env.example .env
docker compose up -d postgres minio
npm run db:setup
npm run dev:api   # rebuilds once and runs; rerun after every API edit
npm run dev:web   # http://localhost:3000
```

Seeded local accounts are listed in [docs/development/auth-seed-users.md](docs/development/auth-seed-users.md).

## Project conventions

DocManS is an npm/Nx monorepo: `apps/api` (NestJS 11, Prisma 7, PostgreSQL, MinIO) and `apps/web` (Next.js 15, React 19). A few rules that are easy to miss:

- **API imports:** every relative import in `apps/api/src` needs an explicit `.js` extension, and the API cannot import `@rtms/*` workspace packages. `packages/permissions` is mirrored by hand in `apps/api/src/permissions/permission-policy.ts`; keep both in sync.
- **Validation:** request validation uses hand-written `PipeTransform` objects with Vietnamese error messages, not class-validator. Follow the existing pipes in the module you touch.
- **Authorization:** business rules live in the `assertCan*` helpers. If you change a role, scope, or workflow rule, update [docs/permission-matrix.md](docs/permission-matrix.md) in the same pull request.
- **Database:** add a Prisma migration with `npm run prisma:migrate`. Adding or renaming a model also requires updating the model list asserted in `tests/smoke.test.mjs`.
- **Web UI:** no Tailwind or CSS-in-JS; use the tokens and classes in `apps/web/src/app/globals.css` and follow [docs/ux-design-guidelines.md](docs/ux-design-guidelines.md). All user-facing copy is Vietnamese.
- **Domain terms:** use the vocabulary in [CONTEXT.md](CONTEXT.md).

## Before opening a pull request

```bash
npm run typecheck
npm test
npm run build
```

All three must pass. Service tests run without a database using fake Prisma objects; if you add a Prisma call to a service, extend the fakes in the matching test file.

## Pull requests

1. Branch from `DocManS` using a prefix such as `feat/`, `fix/`, `docs/`, or `chore/`.
2. Keep each pull request to one concern and match the style of the surrounding code.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) messages, for example `fix(projects): ...` or `docs(readme): ...`.
4. In the description, explain what changed, why, and how you verified it. Include screenshots for UI changes, using seeded data only.
5. Add an entry under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
