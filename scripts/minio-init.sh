#!/bin/sh
# Khởi tạo MinIO cho DocManS: tạo bucket idempotent và (khi cấu hình MINIO_APP_ACCESS_KEY khác root)
# tạo tài khoản ứng dụng chỉ có quyền đọc/ghi/xoá trong đúng bucket hệ thống.
set -eu

: "${MINIO_ROOT_USER:?thiếu MINIO_ROOT_USER}"
: "${MINIO_ROOT_PASSWORD:?thiếu MINIO_ROOT_PASSWORD}"
: "${MINIO_BUCKET_NAME:?thiếu MINIO_BUCKET_NAME}"
MINIO_APP_ACCESS_KEY="${MINIO_APP_ACCESS_KEY:-$MINIO_ROOT_USER}"
MINIO_APP_SECRET_KEY="${MINIO_APP_SECRET_KEY:-$MINIO_ROOT_PASSWORD}"
MINIO_URL="${MINIO_URL:-http://minio:9000}"
POLICY="docmans-app"

mc alias set docmans "$MINIO_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing "docmans/$MINIO_BUCKET_NAME"

if [ "$MINIO_APP_ACCESS_KEY" = "$MINIO_ROOT_USER" ]; then
  echo "MinIO sẵn sàng: bucket $MINIO_BUCKET_NAME (dùng cấu hình access key mặc định; nên tách MINIO_APP_ACCESS_KEY riêng)."
  exit 0
fi

cat > /tmp/docmans-app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:GetBucketLocation", "s3:ListBucket"], "Resource": ["arn:aws:s3:::${MINIO_BUCKET_NAME}"] },
    { "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], "Resource": ["arn:aws:s3:::${MINIO_BUCKET_NAME}/*"] }
  ]
}
EOF
mc admin policy create docmans "$POLICY" /tmp/docmans-app-policy.json
mc admin user add docmans "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY"

USER_INFO="$(mc admin user info docmans "$MINIO_APP_ACCESS_KEY" --json)"
case "$USER_INFO" in
  *'"policyName":"'*"$POLICY"*) echo "Chính sách $POLICY đã gắn với tài khoản ứng dụng." ;;
  *) mc admin policy attach docmans "$POLICY" --user "$MINIO_APP_ACCESS_KEY" ;;
esac

echo "MinIO sẵn sàng: bucket $MINIO_BUCKET_NAME, tài khoản ứng dụng có quyền giới hạn."
