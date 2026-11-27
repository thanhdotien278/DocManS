#!/usr/bin/env bash
# Sao lưu PostgreSQL và MinIO của bản triển khai docker-compose.prod.yml.
#
#   ./scripts/backup.sh                       # dùng .env.prod (hoặc .env.production), lưu vào ./backups
#   ENV_FILE=/etc/docmans.env BACKUP_DIR=/mnt/backup ./scripts/backup.sh
#
# Đặt lịch (cron, 01:30 hằng ngày):
#   30 1 * * * cd /opt/docmans && ./scripts/backup.sh >> /var/log/docmans-backup.log 2>&1
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
if [[ -z "${ENV_FILE:-}" ]]; then
  if [[ -f "$PROJECT_DIR/.env.prod" ]]; then
    ENV_FILE="$PROJECT_DIR/.env.prod"
  else
    ENV_FILE="$PROJECT_DIR/.env.production"
  fi
fi
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MINIO_BACKUP_IMAGE="${MINIO_BACKUP_IMAGE:-nginx:1.27-alpine}"
STAMP="$(date +%Y%m%d_%H%M%S)"
TARGET="$BACKUP_DIR/$STAMP"

log() { echo "[$(date '+%F %T')] $*"; }
trap 'log "LỖI: sao lưu thất bại ở dòng $LINENO"; rm -rf "$TARGET"' ERR

[[ -f "$ENV_FILE" ]] || { log "Không tìm thấy $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a
POSTGRES_USER="${POSTGRES_USER:-docmansystem}"
POSTGRES_DB="${POSTGRES_DB:-docmansystem}"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

mkdir -p "$TARGET"
chmod 700 "$BACKUP_DIR" "$TARGET"

log "Sao lưu PostgreSQL ($POSTGRES_DB)..."
compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner > "$TARGET/postgres.dump"
compose exec -T postgres pg_restore --list < "$TARGET/postgres.dump" > /dev/null

MINIO_CONTAINER="$(compose ps -q minio)"
[[ -n "$MINIO_CONTAINER" ]] || { log "Container minio không chạy"; exit 1; }
log "Sao lưu MinIO..."
docker run --rm --volumes-from "$MINIO_CONTAINER":ro -v "$TARGET":/backup "$MINIO_BACKUP_IMAGE" \
  tar -czf /backup/minio-data.tar.gz -C /data .
tar -tzf "$TARGET/minio-data.tar.gz" > /dev/null

( cd "$TARGET" && sha256sum postgres.dump minio-data.tar.gz > SHA256SUMS )

log "Hoàn tất: $TARGET ($(du -sh "$TARGET" | cut -f1))"

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '[0-9]*_[0-9]*' -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} +
