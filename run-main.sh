#!/usr/bin/env bash
set -euo pipefail

# Run DocManS main locally:
#   Web: http://localhost:3000
#   API: http://localhost:4000
#   PostgreSQL: localhost:5432 / docmansystem
#   MinIO: localhost:9000

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export DATABASE_URL="postgresql://docmansystem:docmansystem@localhost:5432/docmansystem?schema=public"

export API_PORT="4000"
export WEB_ORIGIN="http://localhost:3000"
export NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
export API_INTERNAL_BASE_URL="http://localhost:4000/api/v1"

export MINIO_ENDPOINT="localhost"
export MINIO_PORT="9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
export MINIO_BUCKET_NAME="rtms-files"
export MINIO_REGION="us-east-1"
export MINIO_USE_SSL="false"

export FILE_MAX_UPLOAD_BYTES="10485760"
export FILE_ALLOWED_EXTENSIONS=".doc,.docx,.pdf,.xls,.xlsx"
export TRUST_PROXY="loopback, linklocal, uniquelocal"

cleanup() {
  echo
  echo "Stopping main API/Web..."
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
  wait "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting DocManS MAIN"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000"
echo "  DB : localhost:5432/docmansystem"
echo

npm run dev:api &
API_PID=$!

npm run dev:web -- -p 3000 &
WEB_PID=$!

wait "$API_PID"