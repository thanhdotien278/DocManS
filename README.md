# RTMS Monorepo

Baseline implementation for the Research Topic Management System (RTMS).

## Structure

- `apps/web`: Next.js internal portal
- `apps/api`: NestJS API
- `packages/shared-types`: shared enums, DTOs, contracts, seeds
- `infra`: Docker, environment, bootstrap scripts

## Core capabilities in this baseline

- Modular monolith scaffolding for OMS, project tracking, tasks, dashboard
- Shared domain contracts for roles, statuses, notifications, and aggregates
- NestJS modules with sample endpoints, RBAC guard hooks, audit trail hooks, and event publishing
- Next.js internal portal with role-aware navigation and dashboard views
- Prisma schema covering the RTMS phase-1 domain
- Docker Compose stack for PostgreSQL, Redis, MinIO, API, and Web

## Quick start

1. Copy environment files from `infra/env`.
2. Install dependencies at repo root with `npm install`.
3. Build the shared contract package with `npm run build:shared`.
4. Start infrastructure with `docker compose -f infra/docker/docker-compose.yml up -d postgres redis minio`.
5. Generate Prisma client with `npm run db:generate`.
6. Start the API with `npm run dev:api`.
7. Start the web app with `npm run dev:web`.

## Notes

- Authentication is currently bootstrapped with a mock internal login flow and header-based role simulation for local development.
- OMS approval automatically creates a linked research project in the in-memory service layer to demonstrate the intended workflow before persistence wiring is completed.
- The Prisma schema is ready for real persistence integration, but the service layer currently uses deterministic seed data so the app can render immediately.
- Next.js production build is blocked when the workspace lives under a path containing `!` because webpack rejects that character in absolute paths. In this workspace, move the repo to a path without `!` before running `next build`.
