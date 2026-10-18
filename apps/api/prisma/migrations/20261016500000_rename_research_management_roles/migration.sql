-- 10 vai trò theo docs/permission-matrix.md (mục 2): đổi tên TP/CV như nhánh tuan/DocManS
-- (20261009100000_rename_research_management_roles) và thêm PP, TB, PGĐ-KH như
-- 20261017000000_role_hierarchy. Chạy lại an toàn.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_system_role_check";

UPDATE "users" SET "system_role" = 'RESEARCH_MANAGEMENT_STAFF' WHERE "system_role" = 'SCIENTIFIC_MANAGEMENT_STAFF';
UPDATE "users" SET "system_role" = 'RESEARCH_MANAGEMENT_HEAD'  WHERE "system_role" = 'SCIENTIFIC_MANAGEMENT_HEAD';

ALTER TABLE "users" ADD CONSTRAINT "users_system_role_check"
  CHECK ("system_role" IS NULL OR "system_role" IN (
    'SYSTEM_ADMIN', 'RESEARCH_MANAGEMENT_HEAD', 'RESEARCH_MANAGEMENT_DEPUTY_HEAD', 'RESEARCH_BOARD_HEAD',
    'RESEARCH_MANAGEMENT_STAFF', 'LEADERSHIP_APPROVAL_AUTHORITY', 'SCIENCE_DEPUTY_DIRECTOR',
    'RESEARCH_OVERSIGHT_AUTHORITY',
    'RESEARCHER_INTERNAL_USER', 'EXTERNAL_RESEARCHER_USER'
  ));
