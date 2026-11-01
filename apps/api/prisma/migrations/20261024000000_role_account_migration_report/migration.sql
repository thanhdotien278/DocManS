-- Story 1.11: migration tài khoản 7 → 10 vai trò, bước báo cáo + ràng buộc TB.
-- Không tự đoán vai trò: tài khoản giữ RESEARCH_OVERSIGHT_AUTHORITY theo nghĩa cũ (PGĐ phụ trách khoa học)
-- và tài khoản có vai trò ngoài mười giá trị được đưa vào system_role_migration_issues để QT phân loại.
-- Vai trò hiện giữ nguyên (không cấp quyền song song); chạy lại an toàn.
INSERT INTO "system_role_migration_issues" ("id", "user_id", "roles", "reason")
SELECT 'srmi-1-11-' || "id", "id", to_jsonb(ARRAY["system_role"]),
  'Legacy RESEARCH_OVERSIGHT_AUTHORITY: QT phân loại thành SCIENCE_DEPUTY_DIRECTOR (PGĐ-KH) hoặc RESEARCH_OVERSIGHT_AUTHORITY (PGĐ-TD).'
FROM "users"
WHERE "system_role" = 'RESEARCH_OVERSIGHT_AUTHORITY'
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "system_role_migration_issues" ("id", "user_id", "roles", "reason")
SELECT 'srmi-1-11-' || "id", "id", to_jsonb(ARRAY["system_role"]),
  'Vai trò hệ thống không thuộc mười giá trị; cần xử lý thủ công.'
FROM "users"
WHERE "system_role" IS NOT NULL AND "system_role" NOT IN (
  'SYSTEM_ADMIN', 'RESEARCH_MANAGEMENT_HEAD', 'RESEARCH_MANAGEMENT_DEPUTY_HEAD', 'RESEARCH_BOARD_HEAD',
  'RESEARCH_MANAGEMENT_STAFF', 'LEADERSHIP_APPROVAL_AUTHORITY', 'SCIENCE_DEPUTY_DIRECTOR',
  'RESEARCH_OVERSIGHT_AUTHORITY', 'RESEARCHER_INTERNAL_USER', 'EXTERNAL_RESEARCHER_USER')
ON CONFLICT ("user_id") DO NOTHING;

-- TB chỉ có một người active giữ.
CREATE UNIQUE INDEX IF NOT EXISTS "users_single_active_board_head"
  ON "users" ((1)) WHERE "system_role" = 'RESEARCH_BOARD_HEAD' AND "status" = 'active';
