-- Story 6.12: kinh phí dạng metadata và thanh lý (D-033, D-034). Không sổ cái, thanh toán hay tích hợp kế toán.
CREATE TABLE "project_funding_records" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "recorded_on" DATE NOT NULL,
    "note" TEXT,
    "file_record_ids" TEXT[],
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_funding_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_funding_records_kind_check" CHECK ("kind" IN ('GRANT', 'DISBURSEMENT', 'SETTLEMENT')),
    CONSTRAINT "project_funding_records_amount_check" CHECK ("amount" >= 0)
);
CREATE UNIQUE INDEX "project_funding_records_entry_id_version_key" ON "project_funding_records"("entry_id", "version");
CREATE INDEX "project_funding_records_project_id_kind_idx" ON "project_funding_records"("project_id", "kind");
ALTER TABLE "project_funding_records" ADD CONSTRAINT "project_funding_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_funding_records" ADD CONSTRAINT "project_funding_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_liquidations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "file_record_ids" TEXT[],
    "outcome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_liquidations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_liquidations_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'SIGNED', 'REJECTED')),
    CONSTRAINT "project_liquidations_outcome_check" CHECK ("outcome" IN ('accepted', 'failed'))
);
CREATE INDEX "project_liquidations_project_id_status_idx" ON "project_liquidations"("project_id", "status");
-- Mỗi đề tài chỉ có một biên bản đang lập, đang trình hoặc đã ký.
CREATE UNIQUE INDEX "project_liquidations_one_active" ON "project_liquidations"("project_id") WHERE "status" IN ('DRAFT', 'SUBMITTED', 'SIGNED');
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
