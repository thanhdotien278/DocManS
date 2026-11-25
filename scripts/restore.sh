#!/usr/bin/env bash
# Khôi phục một bản sao lưu do scripts/backup.sh tạo ra.
#
#   ./scripts/restore.sh backups/20261009_013000
#   SKIP_SAFETY_BACKUP=1 ./scripts/restore.sh <thư mục>
#
# CẢNH BÁO: GHI ĐÈ toàn bộ cơ sở dữ liệu và tệp hiện tại.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}"
MINIO_BACKUP_IMAGE="${MINIO_BACKUP_IMAGE:-nginx:1.27-alpine}"
if [[ -z "${ENV_FILE:-}" ]]; then
  if [[ -f "$PROJECT_DIR/.env.prod" ]]; then
    ENV_FILE="$PROJECT_DIR/.env.prod"
  else
    ENV_FILE="$PROJECT_DIR/.env.production"
  fi
fi
SOURCE="${1:?Cách dùng: $0 <thư mục backup>}"
SOURCE="$(cd "$SOURCE" && pwd)"

log() { echo "[$(date '+%F %T')] $*"; }

[[ -f "$ENV_FILE" ]] || { log "Không tìm thấy $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a
POSTGRES_USER="${POSTGRES_USER:-docmansystem}"
POSTGRES_DB="${POSTGRES_DB:-docmansystem}"
compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

log "Kiểm tra checksum..."
( cd "$SOURCE" && sha256sum -c SHA256SUMS )

read -r -p "Ghi đè dữ liệu hiện tại bằng bản $SOURCE? Gõ 'KHOI PHUC' để tiếp tục: " answer
[[ "$answer" == "KHOI PHUC" ]] || { log "Đã huỷ."; exit 1; }

if [[ "${SKIP_SAFETY_BACKUP:-}" != "1" ]]; then
  log "Sao lưu dữ liệu hiện tại trước khi ghi đè..."
  ENV_FILE="$ENV_FILE" COMPOSE_FILE="$COMPOSE_FILE" MINIO_BACKUP_IMAGE="$MINIO_BACKUP_IMAGE" RETENTION_DAYS=36500 "$SCRIPT_DIR/backup.sh" || {
    log "Không sao lưu được dữ liệu hiện tại. Kiểm tra stack đang chạy, hoặc chạy lại với SKIP_SAFETY_BACKUP=1."
    exit 1
  }
fi

log "Dừng ứng dụng và đảm bảo postgres đang chạy..."
compose stop cloudflared nginx web api || true
compose up -d --wait postgres

log "Khôi phục PostgreSQL (drop schema + nạp lại trong cùng một transaction)..."
compose exec -T postgres sh -c 'set -e
  trap "rm -f /tmp/restore.sql /tmp/restore-body.sql" EXIT
  pg_restore --no-owner --no-acl -f /tmp/restore-body.sql
  {
    echo "DROP SCHEMA IF EXISTS public CASCADE;"
    echo "CREATE SCHEMA public;"
    cat /tmp/restore-body.sql
  } > /tmp/restore.sql
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction -q -f /tmp/restore.sql' < "$SOURCE/postgres.dump"

log "Khôi phục MinIO..."
compose stop minio
MINIO_CONTAINER="$(compose ps -aq minio)"
docker run --rm --volumes-from "$MINIO_CONTAINER" -v "$SOURCE":/backup:ro "$MINIO_BACKUP_IMAGE" sh -c 'set -e
  rm -rf /data/.restore && mkdir /data/.restore
  tar -xzf /backup/minio-data.tar.gz -C /data/.restore
  find /data -mindepth 1 -maxdepth 1 ! -name .restore -exec rm -rf {} +
  find /data/.restore -mindepth 1 -maxdepth 1 -exec mv {} /data/ \;
  rmdir /data/.restore'

log "Khởi động lại..."
compose up -d
log "Hoàn tất. Kiểm tra: đăng nhập, mở một hồ sơ, tải xuống một tệp đính kèm."
