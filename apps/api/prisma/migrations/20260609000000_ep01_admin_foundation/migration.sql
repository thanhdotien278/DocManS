CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_units" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parent_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_organization_scopes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_unit_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_organization_scopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_items" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_parameters" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_parameters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_templates" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "organization_units_code_key" ON "organization_units"("code");
CREATE INDEX "organization_units_parent_id_idx" ON "organization_units"("parent_id");
CREATE UNIQUE INDEX "user_role_assignments_user_id_role_id_key" ON "user_role_assignments"("user_id", "role_id");
CREATE INDEX "user_role_assignments_role_id_idx" ON "user_role_assignments"("role_id");
CREATE UNIQUE INDEX "user_organization_scopes_user_id_organization_unit_id_key" ON "user_organization_scopes"("user_id", "organization_unit_id");
CREATE INDEX "user_organization_scopes_organization_unit_id_idx" ON "user_organization_scopes"("organization_unit_id");
CREATE UNIQUE INDEX "catalog_items_type_code_key" ON "catalog_items"("type", "code");
CREATE INDEX "catalog_items_type_idx" ON "catalog_items"("type");
CREATE INDEX "catalog_items_deleted_at_idx" ON "catalog_items"("deleted_at");
CREATE UNIQUE INDEX "system_parameters_key_key" ON "system_parameters"("key");
CREATE UNIQUE INDEX "notification_templates_key_key" ON "notification_templates"("key");

ALTER TABLE "organization_units"
  ADD CONSTRAINT "organization_units_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "organization_units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_organization_scopes"
  ADD CONSTRAINT "user_organization_scopes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_organization_scopes"
  ADD CONSTRAINT "user_organization_scopes_organization_unit_id_fkey"
  FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "roles" ("id", "code", "label", "description", "updated_at")
VALUES
  ('role-system-admin', 'system-admin', 'Quản trị hệ thống', 'Toàn quyền quản trị nền tảng', CURRENT_TIMESTAMP),
  ('role-leadership', 'leadership', 'Lãnh đạo', 'Phê duyệt và theo dõi điều hành', CURRENT_TIMESTAMP),
  ('role-scientific-management', 'scientific-management', 'Chuyên viên quản lý khoa học', 'Vận hành nghiệp vụ quản lý khoa học', CURRENT_TIMESTAMP),
  ('role-principal-investigator', 'principal-investigator', 'Chủ nhiệm đề tài', 'Tạo và theo dõi hồ sơ đề tài', CURRENT_TIMESTAMP),
  ('role-reviewer', 'reviewer', 'Reviewer/Hội đồng', 'Đánh giá hồ sơ được phân công', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "organization_units" ("id", "code", "name", "updated_at")
VALUES
  ('org-hvqy', 'HVQY', 'Học viện Quân y', CURRENT_TIMESTAMP),
  ('org-bgq', 'BGD', 'Ban Giám Đốc', CURRENT_TIMESTAMP),
  ('org-khti', 'KHTI', 'Khoa Toán - Tin học', CURRENT_TIMESTAMP),
  ('org-khqs', 'KHQS', 'Phòng KHQS', CURRENT_TIMESTAMP),
  ('org-bqlkhqs', 'BQLKHQS', 'Ban Quản lý KHQS', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "user_role_assignments" ("id", "user_id", "role_id", "is_primary")
SELECT 'ura-' || u."id", u."id", r."id", true
FROM "users" u
JOIN "roles" r ON r."code" = u."role"
ON CONFLICT ("user_id", "role_id") DO NOTHING;

INSERT INTO "user_organization_scopes" ("id", "user_id", "organization_unit_id", "is_primary")
SELECT 'uos-' || u."id", u."id", ou."id", true
FROM "users" u
JOIN "organization_units" ou ON ou."name" = u."unit"
ON CONFLICT ("user_id", "organization_unit_id") DO NOTHING;
