# DocManS

**DocManS** is an open-source platform for managing research and scientific projects. It gives universities, hospitals, research institutes, and academic organizations a practical foundation for managing proposals, reviews, workflow decisions, research teams, files, permissions, and administration in one place.

Originally shaped by real university workflows, DocManS is designed to be adapted by any institution that needs transparent, accountable research administration. It is free to use, inspect, modify, and contribute to under the MIT License.

## Why DocManS?

Research administration often depends on disconnected spreadsheets, email threads, shared folders, and informal approval processes. That makes it harder to understand a proposal's status, maintain a reliable review trail, apply access rules consistently, and hand work over when staff roles change.

DocManS brings these activities into a single, self-hosted application. It helps institutions model their own intake periods and workflow while keeping access decisions tied to organizational scope, record ownership, team participation, reviewer assignment, and workflow state.

### Open Source Commitment

DocManS is intended to be a useful community project, not institution-specific software. The source code is public under the MIT License, and the project welcomes feedback, deployments, documentation improvements, and code contributions from research organizations and individual contributors.

## Features

- **Research proposal lifecycle** — create drafts, validate readiness, submit, request supplements, resubmit, and retain workflow history.
- **Review and decision support** — assign reviewers, collect evaluations, and support structured proposal decisions.
- **Role- and scope-aware access** — authorize actions using system roles, organization scope, ownership, project participation, reviewer assignments, and workflow state.
- **PI-owned proposal submission** — restrict proposal creation, submission, and resubmission to the internal-researcher PI.
- **Researcher profiles and teams** — manage researcher-facing information and proposal participation.
- **Files and object storage** — attach approved file types to research records using S3-compatible MinIO storage.
- **Administration** — manage users, organization structures, catalogs, and configuration through the API and web application.
- **Auditability** — record important authentication and workflow actions for traceability.
- **Local development support** — provide seeded development data, Docker Compose services, Prisma migrations, and repeatable scripts.

## Architecture Overview

DocManS is an Nx workspace with separate web and API applications. The web application communicates with the API over HTTP. The API applies authentication, authorization, validation, workflow rules, and audit logging before it accesses PostgreSQL or object storage.

```text
Browser
  │
  ├── Next.js web application
  │       │
  │       └── NestJS API
  │              ├── PostgreSQL via Prisma
  │              ├── MinIO object storage
  │              └── Session, authorization, workflow, and audit services
  │
  └── Optional Nginx reverse proxy
```

The authorization model is intentionally record-aware: a broad platform role alone does not automatically grant access to institutional research data.

The seven system roles separate Scientific Management Head (scoped oversight and officer
assignment), Scientific Management Staff (assigned-record management), Director (oversight and
eligible final decisions), Deputy Director (researcher participation plus read-only institutional
oversight), system administrator, internal researcher and external researcher. Proposal management
officer history is persisted; project officer relationships and institutional reporting remain
contracts until their backend domains exist. Dashboard showcase values are demo data. Funding
currently covers requested proposal metadata, not actual expenditure or accounting.

Local accounts: `nmphuong` (Head), `hdtien1`/`hdtien2` (Staff), `tvtien` (Director), `vndinh`
(Deputy Director). See [local demo accounts](docs/development/auth-seed-users.md). Existing
proposals remain unassigned until Head explicitly assigns Staff; organization scope alone no
longer gives Staff management access.


## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16, Prisma |
| Object storage | MinIO (S3-compatible) |
| Infrastructure | Docker Compose, Nginx, Node.js 22 |
| Workspace | Nx, npm |

## Screenshots

Screenshots and workflow examples are welcome. Add images here that show the dashboard, proposal workspace, review queue, and administrative views without exposing sensitive research or personal data.

## Getting Started

### Prerequisites

- Git
- [Node.js 22 LTS](https://nodejs.org/en/download) (22.12 or later in the 22.x series) and npm 10 or later for running the applications on your machine
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/) for Windows, macOS, or Linux, or Docker Engine with the Compose plugin on Linux

Download Docker for your operating system, complete the installer, and start Docker Desktop before continuing. On Windows, follow the installer's WSL 2 setup instructions and use a WSL terminal for the commands below. On macOS/Linux, use your terminal. Run all project commands from the repository root.

Check that the tools are available and Docker is running:

```bash
git --version
node --version
npm --version
docker --version
docker compose version
docker info
```

Choose either **Running locally** (Docker for PostgreSQL/MinIO, Node.js on your machine for API/web) or **Docker Deployment** (all services in Docker). Do not run both at once because they use the same ports.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/thanhdotien278/DocManS.git
cd DocManS
npm ci
cp .env.example .env
```

If you already cloned the repository, use the update instructions below instead. Copy `.env.example` only on first setup; keep your existing `.env` when updating. For the all-Docker route, host Node.js/npm and `npm ci` are optional because the containers install dependencies.

### Environment variables

Start with [`.env.example`](.env.example). The local configuration includes these common settings:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | API URL used by the web application |
| `API_PORT` | API listener port |
| `DATABASE_URL` | PostgreSQL connection string |
| `WEB_ORIGIN` | Allowed web origin for the API |
| `MINIO_ENDPOINT`, `MINIO_PORT` | MinIO connection details |
| `MINIO_BUCKET_NAME` | Bucket used for uploaded files |
| `FILE_MAX_UPLOAD_BYTES` | Maximum upload size |
| `FILE_ALLOWED_EXTENSIONS` | Allowed file extensions |

The example values are for local development only. Use institution-managed secrets and secure infrastructure settings in shared or production environments.

### Running locally

1. Download the PostgreSQL and MinIO images, then start the services and wait for PostgreSQL to become healthy:

   ```bash
   docker compose pull postgres minio
   docker compose up -d --wait postgres minio
   docker compose ps
   ```

2. Apply database migrations and seed local development data:

   ```bash
   npm run db:setup
   ```

   This generates the Prisma client, applies pending migrations, and runs the seed script. Use the `localhost` database and MinIO settings from `.env.example` for this route. To rerun only the seed after changing catalogs or development fixtures:

   ```bash
   npm run prisma:seed
   ```

   Seed data is intended for local development and can update existing seeded records; it is not a database restore or a production initialization procedure.

3. In separate terminals, start the API and web application:

   ```bash
   npm run dev:api
   ```

   ```bash
   npm run dev:web
   ```

Open <http://localhost:3000>. The API health endpoint is available at <http://localhost:4000/api/v1/health>.

Keep both terminals open. The API command builds and starts the server without a file watcher; restart it after API changes. Stop each application with `Ctrl+C`, then stop PostgreSQL and MinIO with `docker compose stop postgres minio`.

Development accounts and local troubleshooting notes are documented in [docs/development/auth-seed-users.md](docs/development/auth-seed-users.md). Never use these accounts or their default credentials outside a local development environment.

### Pulling updates

Stop the local API/web processes before updating. Commit or stash your own changes first, then update your current branch from its configured upstream:

```bash
git status
git pull --ff-only
npm ci
docker compose up -d --wait postgres minio
npm run db:setup
```

Compare `.env.example` with your `.env` for newly added settings, then restart `npm run dev:api` and `npm run dev:web` in separate terminals. If Git reports diverged branches, resolve that before continuing; do not discard local changes to force the pull.

### Verification

```bash
npm run typecheck
npm test
npm run build
```

## Docker Deployment

After cloning the repository and creating `.env`, download the images and start the complete local Docker environment with PostgreSQL, MinIO, API, web application, and Nginx:

```bash
docker compose pull
docker compose up -d
docker compose logs -f api web
```

The API container runs `npm install`, `npm run db:setup` (migrations and seed), and then `npm run dev:api` automatically. The web container installs dependencies and starts Next.js. Wait for both applications to start; the first run can take several minutes. `Ctrl+C` exits the log view while containers keep running.

Compose supplies the internal `postgres` and `minio` hostnames for the API, so you do not need to change your host `.env` connection URLs. To rerun only the seed in this route:

```bash
docker compose exec api npm run prisma:seed
```

Available endpoints:

- <http://localhost:3000> — web application
- <http://localhost:4000/api/v1/health> — API health check
- <http://localhost:8080> — web application through Nginx
- <http://localhost:9001> — MinIO Console

Stop the environment with:

```bash
docker compose down
```

This keeps the database and uploaded files in Docker volumes. Do not add `-v` unless you intend to delete that local data.

To pull code updates for the all-Docker route, commit or stash local changes, then run:

```bash
docker compose down
git pull --ff-only
docker compose pull
docker compose up -d
docker compose logs -f api web
```

Check `.env.example` for new settings before starting the containers. The API startup applies migrations and reruns the seed.

### Troubleshooting startup

- **Cannot connect to the Docker daemon:** start Docker Desktop or the Docker Engine service, then retry `docker info`.
- **Port already in use:** stop the conflicting process/container. This setup uses ports `3000`, `4000`, `5432`, `9000`, `9001`, and, for Nginx, `8080`.
- **Database connection fails:** run `docker compose ps` and `docker compose logs postgres`. Host-run commands use `localhost:5432`; commands inside the API container use `postgres:5432`.
- **Migration fails or a database column is missing:** inspect `npm run prisma:deploy` output and `npx prisma migrate status --schema apps/api/prisma/schema.prisma` (prefix with `docker compose exec api` for the Docker route). Resolve the reported migration issue before seeding; do not reset a database containing data you need.
- **Browser shows `Failed to fetch`:** check the API terminal or `docker compose logs api`, then open the API health endpoint above. Confirm `NEXT_PUBLIC_API_BASE_URL` matches the API address.

The provided Compose configuration is a development starting point. Before a production deployment, review secrets, TLS termination, database backups, storage retention, trusted proxy settings, and institution-specific access policies.

## Project Structure

```text
apps/
  web/                    Next.js application
  api/                    NestJS API and Prisma schema
packages/
  contracts/              Shared API contracts
  permissions/            Shared permission types
  validation/             Shared validation utilities
  ui-tokens/              Shared UI tokens
docs/                     Project and contributor documentation
_bmad-output/             Planning and implementation artifacts
tests/                    Node.js test suites
docker-compose.yml        Local Docker services
```

## Roadmap

The roadmap is maintained in the repository's planning artifacts and GitHub issues. Current areas of work include:

- Strengthening proposal intake, review, decision, and project lifecycle workflows.
- Expanding user-facing administration and institutional configuration.
- Improving reporting, search, and operational dashboards.
- Increasing test coverage, documentation, accessibility, and deployment guidance.
- Supporting adoption by more research organizations through community feedback.

If your institution has a workflow or integration need, please open an issue before starting a large change so the community can discuss the best shared approach.

## Community and Contributions Welcome

DocManS benefits from the experience of research administrators, clinicians, investigators, reviewers, designers, and software contributors. You do not need to write code to help: workflow feedback, documentation corrections, reproducible bug reports, accessibility reviews, translations, and deployment notes are all valuable contributions.

## Contributing

Contributions are welcome.

1. Search existing issues and discussions before opening a new one.
2. Open an issue for bugs, feature proposals, or questions, including the relevant institutional workflow and expected outcome.
3. For a code change, create a focused branch and keep the pull request scoped to one concern.
4. Run the relevant checks before submitting:

   ```bash
   npm run typecheck
   npm test
   ```

5. Explain what changed, why it is needed, and how you verified it.

Please keep contributions respectful, evidence-based, and mindful of the security and privacy expectations of research organizations.

## Security

Do not report security vulnerabilities in a public issue. Please use [GitHub's private security advisory reporting](https://github.com/thanhdotien278/DocManS/security/advisories/new) when it is available for this repository. Include a clear description, impact assessment, reproduction steps, and any suggested mitigation.

## License

DocManS is licensed under the [MIT License](LICENSE). You may use, modify, and distribute the project under its terms. Third-party dependencies remain subject to their own licenses.

## Acknowledgements

DocManS is informed by the everyday work of research administration teams, investigators, reviewers, and technical staff in academic and healthcare settings. Thank you to everyone who shares workflow feedback, tests the software, improves the documentation, and contributes code.
