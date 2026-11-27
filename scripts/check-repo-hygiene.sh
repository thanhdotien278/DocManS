#!/usr/bin/env bash
# Chặn việc commit dữ liệu nhạy cảm hoặc file không thuộc mã nguồn vào repo.
# Chạy trong CI (job "hygiene") và có thể chạy tay trước khi commit:
#   ./scripts/check-repo-hygiene.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
MAX_FILE_BYTES=$((5 * 1024 * 1024))
failures=0

fail() {
  echo "::error::$1"
  failures=$((failures + 1))
}

file_count=0
while IFS= read -r -d '' file; do
  file_count=$((file_count + 1))
  lower=$(printf '%s' "$file" | tr '[:upper:]' '[:lower:]')

  # 1. Thư mục chứa tài liệu nội bộ, báo cáo, dữ liệu tạm hoặc bản sao lưu (ngoại lệ tài liệu đã theo dõi sẵn).
  case "$file" in
    output/documents/DocManS_Checklist_kiem_thu_Proposal_Review_Approval.docx|output/documents/DocManS_Huong_dan_kiem_thu_Ly_lich_khoa_hoc_Admin_Head_Staff.docx)
      ;;
    reports/*|output/*|tmp/*|backups/*)
      fail "Không được commit thư mục nội bộ: $file"; continue ;;
  esac

  # 2. Bí mật và khoá.
  case "$lower" in
    .env|.env.*|*/.env|*/.env.*)
      case "$lower" in
        .env.example|.env.prod.example|.env.production.example|*/.env.example) ;;
        *) fail "File môi trường chứa bí mật: $file" ;;
      esac ;;
    *.pem|*.key|*.p12|*.pfx|*id_rsa*|*id_ed25519*)
      fail "File khoá/chứng chỉ: $file" ;;
  esac

  # 3. Bản dump cơ sở dữ liệu (SQL chỉ được phép trong thư mục migration của Prisma).
  case "$lower" in
    *.dump|*.bak|*.sqlite|*.db)
      fail "Bản sao dữ liệu: $file" ;;
    *.sql)
      [[ "$file" == apps/api/prisma/migrations/* ]] || fail "File SQL ngoài thư mục migration: $file" ;;
  esac

  # 4. Tài liệu văn phòng/PDF mới (bỏ qua tài liệu tham chiếu đã theo dõi sẵn).
  case "$lower" in
    docs/ma_tran-phan-qquyen-docmans.pdf|output/documents/docmans_checklist_kiem_thu_proposal_review_approval.docx|output/documents/docmans_huong_dan_kiem_thu_ly_lich_khoa_hoc_admin_head_staff.docx)
      ;;
    *.pdf|*.doc|*.docx|*.xls|*.xlsx|*.ppt|*.pptx)
      fail "Tài liệu văn phòng/PDF không nên nằm trong repo mã nguồn: $file" ;;
  esac

  # 5. File quá lớn (trừ snapshot mẫu chuẩn phục vụ seed).
  if [[ -f "$file" && "$file" != apps/api/prisma/snapshot/* ]]; then
    size=$(wc -c < "$file")
    if (( size > MAX_FILE_BYTES )); then
      fail "File lớn hơn 5 MB ($((size / 1024 / 1024)) MB): $file"
    fi
  fi
done < <(git ls-files -z)

# 6. Số định danh cá nhân dạng CCCD (12 chữ số bắt đầu bằng 0) trong mã nguồn, seed, test, fixture.
cccd_hits=$(git grep -nIE '(^|[^0-9A-Za-z])0[0-9]{11}([^0-9A-Za-z]|$)' -- \
  'apps/**' 'packages/**' 'tests/**' 'scripts/**' ':(exclude)**/migrations/**' \
  ':(exclude)tests/researcher-profiles-ui-source.test.mjs' || true)
if [[ -n "$cccd_hits" ]]; then
  while IFS= read -r line; do fail "Chuỗi giống số CCCD (12 chữ số): $line"; done <<< "$cccd_hits"
fi

# 7. Khoá bí mật dán thẳng vào mã.
secret_hits=$(git grep -nIE -- '-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{32,}' -- \
  ':(exclude)scripts/check-repo-hygiene.sh' || true)
if [[ -n "$secret_hits" ]]; then
  while IFS= read -r line; do fail "Có vẻ là khoá bí mật: $line"; done <<< "$secret_hits"
fi

if (( failures > 0 )); then
  echo "Kiểm tra vệ sinh repo: $failures lỗi."
  exit 1
fi
echo "Kiểm tra vệ sinh repo: đạt (${file_count} file)."
