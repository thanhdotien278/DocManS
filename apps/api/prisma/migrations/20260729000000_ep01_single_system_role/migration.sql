ALTER TABLE "users" ADD COLUMN "system_role" TEXT;

CREATE TABLE "system_role_migration_issues" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "roles" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_role_migration_issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_role_migration_issues_user_id_key" ON "system_role_migration_issues"("user_id");
ALTER TABLE "system_role_migration_issues" ADD CONSTRAINT "system_role_migration_issues_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

WITH assignments AS (
  SELECT ura."user_id",
    array_agg(DISTINCT r."code" ORDER BY r."code") FILTER (WHERE r."status" = 'active') AS active_codes,
    count(*) AS assignment_count
  FROM "user_role_assignments" ura
  JOIN "roles" r ON r."id" = ura."role_id"
  GROUP BY ura."user_id"
), resolved AS (
  SELECT u."id", CASE
    WHEN a.assignment_count IS NULL THEN ARRAY[u."role"]
    ELSE COALESCE(a.active_codes, ARRAY[]::TEXT[])
  END AS codes
  FROM "users" u
  LEFT JOIN assignments a ON a."user_id" = u."id"
)
INSERT INTO "system_role_migration_issues" ("id", "user_id", "roles", "reason")
SELECT 'srmi-' || "id", "id", to_jsonb(codes), 'Multiple or unknown active legacy roles require manual resolution.'
FROM resolved
WHERE cardinality(codes) <> 1 OR codes[1] NOT IN ('system-admin', 'scientific-management', 'leadership', 'principal-investigator', 'reviewer');

WITH assignments AS (
  SELECT ura."user_id",
    array_agg(DISTINCT r."code" ORDER BY r."code") FILTER (WHERE r."status" = 'active') AS active_codes,
    count(*) AS assignment_count
  FROM "user_role_assignments" ura
  JOIN "roles" r ON r."id" = ura."role_id"
  GROUP BY ura."user_id"
), resolved AS (
  SELECT u."id", CASE
    WHEN a.assignment_count IS NULL THEN ARRAY[u."role"]
    ELSE COALESCE(a.active_codes, ARRAY[]::TEXT[])
  END AS codes
  FROM "users" u
  LEFT JOIN assignments a ON a."user_id" = u."id"
)
UPDATE "users" u
SET "system_role" = CASE resolved.codes[1]
  WHEN 'system-admin' THEN 'SYSTEM_ADMIN'
  WHEN 'scientific-management' THEN 'SCIENTIFIC_MANAGEMENT_STAFF'
  WHEN 'leadership' THEN 'LEADERSHIP_APPROVAL_AUTHORITY'
  WHEN 'principal-investigator' THEN 'RESEARCHER_INTERNAL_USER'
  WHEN 'reviewer' THEN 'RESEARCHER_INTERNAL_USER'
END
FROM resolved
WHERE resolved."id" = u."id"
  AND NOT EXISTS (SELECT 1 FROM "system_role_migration_issues" issue WHERE issue."user_id" = u."id");

UPDATE "users" u
SET "status" = 'disabled', "system_role" = NULL
WHERE EXISTS (SELECT 1 FROM "system_role_migration_issues" issue WHERE issue."user_id" = u."id");

ALTER TABLE "users" ADD CONSTRAINT "users_system_role_check"
  CHECK ("system_role" IS NULL OR "system_role" IN ('SYSTEM_ADMIN', 'SCIENTIFIC_MANAGEMENT_STAFF', 'LEADERSHIP_APPROVAL_AUTHORITY', 'RESEARCHER_INTERNAL_USER'));
ALTER TABLE "users" ADD CONSTRAINT "users_active_system_role_check"
  CHECK ("status" <> 'active' OR "system_role" IS NOT NULL);
