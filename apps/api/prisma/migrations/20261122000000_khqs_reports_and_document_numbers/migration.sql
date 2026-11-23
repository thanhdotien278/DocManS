-- Bộ đếm số văn bản nguyên tử theo (scope, year) và bảng báo cáo công tác KHQS định kỳ.
CREATE TABLE "document_number_counters" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_number_counters_pkey" PRIMARY KEY ("scope", "year")
);

CREATE TABLE "khqs_periodic_reports" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "narrative" JSONB NOT NULL DEFAULT '{}',
    "manual_tables" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khqs_periodic_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "khqs_periodic_reports_period_check" CHECK ("period" IN ('H1', 'FY') AND "year" BETWEEN 2000 AND 2100)
);

CREATE UNIQUE INDEX "khqs_periodic_reports_year_period_key" ON "khqs_periodic_reports"("year", "period");
ALTER TABLE "khqs_periodic_reports" ADD CONSTRAINT "khqs_periodic_reports_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Số quyết định cho quyết định phê duyệt và tờ trình hội đồng được ký duyệt.
ALTER TABLE "proposal_decisions" ADD COLUMN "decision_number" TEXT;
CREATE UNIQUE INDEX "proposal_decisions_decision_number_key" ON "proposal_decisions"("decision_number");

ALTER TABLE "approval_submissions" ADD COLUMN "decision_number" TEXT;
CREATE UNIQUE INDEX "approval_submissions_decision_number_key" ON "approval_submissions"("decision_number");

-- Chỉ mục truy vấn báo cáo KHQS theo kỳ và giải ngân.
CREATE INDEX "approved_projects_start_date_idx" ON "approved_projects"("start_date");
CREATE INDEX "project_funding_records_project_id_kind_recorded_on_idx" ON "project_funding_records"("project_id", "kind", "recorded_on");

-- Nạp trước bộ đếm cho các mã hồ sơ đề xuất đã tồn tại theo định dạng YYYY-UNIT-NNN.
INSERT INTO "document_number_counters" ("scope", "year", "last_value")
SELECT
    'proposal-code:' || u.code,
    split_part(p.code, '-', 1)::int,
    MAX(split_part(p.code, '-', 3)::int)
FROM "research_proposals" p
JOIN "organization_units" u ON u.id = p.host_organization_unit_id
WHERE p.code ~ ('^\d{4}-' || u.code || '-\d{3,}$')
GROUP BY u.code, split_part(p.code, '-', 1)::int
ON CONFLICT ("scope", "year") DO UPDATE
SET "last_value" = GREATEST("document_number_counters"."last_value", EXCLUDED."last_value");

-- Cấp bù mã đề xuất cho các hồ sơ đã nộp nhưng chưa có mã (theo thứ tự lần nộp đầu tiên, giờ Việt Nam).
CREATE TEMP TABLE "proposal_code_backfill" AS
WITH first_submission AS (
  SELECT
    p.id,
    u.code AS unit_code,
    COALESCE(
      (SELECT MIN(e.submitted_at) FROM "proposal_submission_events" e WHERE e.proposal_id = p.id AND e.to_status = 'submitted'),
      p.submitted_at
    ) AS submitted_at
  FROM "research_proposals" p
  JOIN "organization_units" u ON u.id = p.host_organization_unit_id
  WHERE p.code IS NULL AND p.submitted_at IS NOT NULL
), dated AS (
  SELECT
    id,
    unit_code,
    submitted_at,
    EXTRACT(YEAR FROM (submitted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS year
  FROM first_submission
), base_offset AS (
  SELECT
    d.id,
    d.unit_code,
    d.year,
    COALESCE(c.last_value, 0) + ROW_NUMBER() OVER (PARTITION BY d.unit_code, d.year ORDER BY d.submitted_at, d.id)::int AS sequence
  FROM dated d
  LEFT JOIN "document_number_counters" c
    ON c.scope = 'proposal-code:' || d.unit_code AND c.year = d.year
)
SELECT id, unit_code, year, sequence FROM base_offset;

UPDATE "research_proposals" p
SET "code" = b.year || '-' || b.unit_code || '-' || lpad(b.sequence::text, 3, '0')
FROM "proposal_code_backfill" b
WHERE p.id = b.id
  AND NOT EXISTS (
    SELECT 1 FROM "research_proposals" other
    WHERE other.code = b.year || '-' || b.unit_code || '-' || lpad(b.sequence::text, 3, '0')
  );

INSERT INTO "document_number_counters" ("scope", "year", "last_value")
SELECT 'proposal-code:' || unit_code, year, MAX(sequence)
FROM "proposal_code_backfill"
GROUP BY unit_code, year
ON CONFLICT ("scope", "year") DO UPDATE
SET "last_value" = GREATEST("document_number_counters"."last_value", EXCLUDED."last_value");

-- Đề tài kế thừa mã của hồ sơ nguồn nếu còn trống và chưa trùng.
UPDATE "approved_projects" ap
SET "code" = p.code
FROM "research_proposals" p
WHERE ap.proposal_id = p.id
  AND ap.code IS NULL
  AND p.code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "approved_projects" other WHERE other.code = p.code);

DROP TABLE "proposal_code_backfill";

-- Nạp bộ đếm biên bản thanh lý từ dữ liệu đã ký để tránh trùng số cũ.
INSERT INTO "document_number_counters" ("scope", "year", "last_value")
SELECT
    'liquidation-minutes',
    split_part("liquidation_number", '/', 3)::int,
    MAX(split_part("liquidation_number", '/', 1)::int)
FROM "project_liquidations"
WHERE "status" = 'SIGNED'
  AND "liquidation_number" ~ '^\d+/BBTL-HVQY/\d{4}$'
GROUP BY split_part("liquidation_number", '/', 3)::int
ON CONFLICT ("scope", "year") DO UPDATE
SET "last_value" = GREATEST("document_number_counters"."last_value", EXCLUDED."last_value");
