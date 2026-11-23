-- Loại đơn vị (Viện, Phòng, Khoa, Bộ môn) và chức danh lãnh đạo đơn vị gắn với tài khoản (chỉ để hiển thị).
ALTER TABLE "organization_units" ADD COLUMN "unit_type" TEXT NOT NULL DEFAULT 'OTHER';

-- Xếp loại đơn vị có sẵn theo tên; quản trị viên sửa lại được.
UPDATE "organization_units" SET "unit_type" = CASE
  WHEN lower("name") LIKE 'viện%' THEN 'INSTITUTE'
  WHEN lower("name") LIKE 'phòng%' THEN 'DEPARTMENT'
  WHEN lower("name") LIKE 'khoa%' THEN 'FACULTY'
  WHEN lower("name") LIKE 'bộ môn%' THEN 'DIVISION'
  ELSE 'OTHER'
END;

ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_unit_type_check"
  CHECK ("unit_type" IN ('INSTITUTE', 'DEPARTMENT', 'FACULTY', 'DIVISION', 'OTHER'));

CREATE TABLE "unit_positions" (
    "id" TEXT NOT NULL,
    "organization_unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position_code" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_positions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_positions_organization_unit_id_user_id_key" ON "unit_positions"("organization_unit_id", "user_id");
CREATE INDEX "unit_positions_user_id_idx" ON "unit_positions"("user_id");

ALTER TABLE "unit_positions" ADD CONSTRAINT "unit_positions_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unit_positions" ADD CONSTRAINT "unit_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unit_positions" ADD CONSTRAINT "unit_positions_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
