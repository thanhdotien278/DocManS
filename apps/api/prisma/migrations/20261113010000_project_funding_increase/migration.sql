-- Đề nghị nâng kinh phí đề tài (quy tắc 2026-11-13): kinh phí được cấp chỉ tăng khi GĐ ký đề nghị.
CREATE TABLE "project_funding_increases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "file_record_ids" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "funding_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_funding_increases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_funding_increases_status_check" CHECK ("status" IN ('SUBMITTED', 'RETURNED', 'REJECTED', 'SIGNED')),
    CONSTRAINT "project_funding_increases_amount_check" CHECK ("amount" > 0)
);
CREATE INDEX "project_funding_increases_project_id_status_idx" ON "project_funding_increases"("project_id", "status");
-- Mỗi đề tài chỉ có một đề nghị đang trình.
CREATE UNIQUE INDEX "project_funding_increases_one_pending" ON "project_funding_increases"("project_id") WHERE "status" = 'SUBMITTED';
ALTER TABLE "project_funding_increases" ADD CONSTRAINT "project_funding_increases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_funding_increases" ADD CONSTRAINT "project_funding_increases_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_submissions" DROP CONSTRAINT "approval_submissions_kind_check";
ALTER TABLE "approval_submissions" ADD CONSTRAINT "approval_submissions_kind_check" CHECK ("kind" IN ('EVALUATION_COUNCIL', 'DECISION_PACKAGE', 'IRB_COUNCIL', 'IRB_CERTIFICATE', 'ACCEPTANCE_COUNCIL', 'PROJECT_EXTENSION', 'PROJECT_ADJUSTMENT', 'LIQUIDATION', 'FUNDING_INCREASE'));
