-- Ảnh chụp sức khoẻ đề tài theo tuần; chỉ ghi thêm (chặn UPDATE/DELETE), idempotent theo (project_id, snapshot_date).
CREATE TABLE "project_health_snapshots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "project_id" TEXT NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "project_status" TEXT NOT NULL,
  "health" TEXT NOT NULL,
  "planned_percent" DECIMAL(5,2) NOT NULL,
  "actual_percent" DECIMAL(5,2) NOT NULL,
  "spi" DECIMAL(6,3) NOT NULL,
  "total_milestones" INTEGER NOT NULL DEFAULT 0,
  "completed_milestones" INTEGER NOT NULL DEFAULT 0,
  "overdue_milestones" INTEGER NOT NULL DEFAULT 0,
  "max_days_overdue" INTEGER NOT NULL DEFAULT 0,
  "late_reports" INTEGER NOT NULL DEFAULT 0,
  "approved_budget" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "disbursed_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_health_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_health_snapshots_health_check" CHECK ("health" IN ('on_track', 'at_risk', 'delayed', 'completed')),
  CONSTRAINT "project_health_snapshots_non_negative_check" CHECK (
    "planned_percent" >= 0 AND "planned_percent" <= 100 AND
    "actual_percent" >= 0 AND "actual_percent" <= 100 AND
    "spi" >= 0 AND
    "total_milestones" >= 0 AND "completed_milestones" >= 0 AND "overdue_milestones" >= 0 AND
    "max_days_overdue" >= 0 AND "late_reports" >= 0 AND
    "approved_budget" >= 0 AND "disbursed_amount" >= 0
  )
);

CREATE UNIQUE INDEX "project_health_snapshots_project_id_snapshot_date_key"
  ON "project_health_snapshots"("project_id", "snapshot_date");
CREATE INDEX "project_health_snapshots_snapshot_date_idx"
  ON "project_health_snapshots"("snapshot_date");

ALTER TABLE "project_health_snapshots"
  ADD CONSTRAINT "project_health_snapshots_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_project_health_snapshots() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'project_health_snapshots is append-only';
END;
$$;

CREATE TRIGGER project_health_snapshots_append_only
  BEFORE UPDATE OR DELETE ON "project_health_snapshots"
  FOR EACH ROW EXECUTE FUNCTION protect_project_health_snapshots();
