#!/usr/bin/env bash
# Cảnh báo chứng chỉ TLS sắp hết hạn (dùng cho triển khai on-premise có Let's Encrypt hoặc CA nội bộ).
#
#   ./scripts/check-cert-expiry.sh
#   CERT_WARN_DAYS=30 ./scripts/check-cert-expiry.sh /duong/dan/fullchain.pem
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT="${1:-$SCRIPT_DIR/../nginx/ssl/fullchain.pem}"
WARN_DAYS="${CERT_WARN_DAYS:-21}"

log() { echo "[$(date '+%F %T')] $*"; }

[[ -s "$CERT" ]] || { log "LỖI: không tìm thấy chứng chỉ $CERT"; exit 2; }
END_DATE="$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)"
SUBJECT="$(openssl x509 -subject -noout -in "$CERT")"

if openssl x509 -checkend $((WARN_DAYS * 86400)) -noout -in "$CERT" >/dev/null; then
  log "OK: $SUBJECT còn hạn tới $END_DATE"
else
  log "CẢNH BÁO: $SUBJECT hết hạn trong dưới $WARN_DAYS ngày ($END_DATE)."
  exit 1
fi
