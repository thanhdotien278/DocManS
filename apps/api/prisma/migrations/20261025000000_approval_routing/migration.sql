-- Tờ trình qua Phòng KHQS: người lập → Trưởng ban QLKH → Trưởng phòng → Ban giám đốc (Story 5.9, D-035).
CREATE TABLE "approval_submissions" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "subject_ref" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "host_organization_unit_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signer" TEXT NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "last_note" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_submissions_kind_check" CHECK ("kind" IN ('EVALUATION_COUNCIL', 'DECISION_PACKAGE', 'IRB_COUNCIL', 'IRB_CERTIFICATE', 'ACCEPTANCE_COUNCIL', 'PROJECT_EXTENSION', 'PROJECT_ADJUSTMENT', 'LIQUIDATION')),
    CONSTRAINT "approval_submissions_stage_check" CHECK ("stage" IN ('BOARD_REVIEW', 'HEAD_REVIEW', 'LEADERSHIP', 'CLOSED')),
    CONSTRAINT "approval_submissions_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED')),
    CONSTRAINT "approval_submissions_signer_check" CHECK ("signer" IN ('DIRECTOR', 'DIRECTOR_OR_SCIENCE_DEPUTY'))
);

CREATE INDEX "approval_submissions_subject_type_subject_id_kind_idx" ON "approval_submissions"("subject_type", "subject_id", "kind");
CREATE INDEX "approval_submissions_stage_status_idx" ON "approval_submissions"("stage", "status");
-- Mỗi thủ tục của một đối tượng chỉ có một hồ sơ trình đang mở.
CREATE UNIQUE INDEX "approval_submissions_one_pending" ON "approval_submissions"("kind", "subject_type", "subject_id", "subject_ref") WHERE "status" = 'PENDING';

ALTER TABLE "approval_submissions" ADD CONSTRAINT "approval_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_steps_submission_id_idx" ON "approval_steps"("submission_id");
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "approval_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
