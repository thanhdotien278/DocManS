#!/usr/bin/env bash
set -euo pipefail

# Auto-update script for May 29: pulls origin/main and rebuilds/restarts only when new commits arrive.
# Usage:
#   ./scripts/deploy-may29.sh           # update only if origin/main has new commits
#   ./scripts/deploy-may29.sh --force   # force rebuild and restart even without new commits

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="${REPO_DIR}/.env.prod"
COMPOSE_FILE="${REPO_DIR}/docker-compose.prod.yml"
LOCK_FILE="/tmp/docmans-deploy.lock"
FORCE="${1:-}"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date -Is)] Another deploy is already running, skipping."
  exit 0
fi

cd "${REPO_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[$(date -Is)] ERROR: ${ENV_FILE} not found. Copy .env.prod.example to .env.prod first." >&2
  exit 1
fi

git fetch origin "${BRANCH}" --quiet

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/${BRANCH}")"

if [[ "${LOCAL_SHA}" == "${REMOTE_SHA}" && "${FORCE}" != "--force" ]]; then
  exit 0
fi

echo "[$(date -Is)] Updating DocManS (${LOCAL_SHA:0:7} -> ${REMOTE_SHA:0:7}) on branch ${BRANCH}..."

git checkout "${BRANCH}" --quiet
git reset --hard "origin/${BRANCH}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

echo "[$(date -Is)] Deploy completed at ${REMOTE_SHA:0:7}."
