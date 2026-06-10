CREATE TABLE "proposal_intake_periods" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "applicable_organization_unit_id" TEXT,
  "required_package" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposal_intake_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "research_proposals" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "intake_period_id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "host_organization_unit_id" TEXT NOT NULL,
  "research_field_code" TEXT,
  "proposal_type_code" TEXT,
  "title" TEXT NOT NULL,
  "objectives" TEXT,
  "summary" TEXT,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "budget_metadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "submitted_at" TIMESTAMP(3),
  "submitted_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "research_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposal_members" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proposal_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposal_attachments" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "requirement_code" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposal_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposal_submission_events" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "from_status" TEXT NOT NULL,
  "to_status" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "proposal_submission_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposal_intake_periods_code_key" ON "proposal_intake_periods"("code");
CREATE INDEX "proposal_intake_periods_status_idx" ON "proposal_intake_periods"("status");
CREATE INDEX "proposal_intake_periods_applicable_organization_unit_id_idx" ON "proposal_intake_periods"("applicable_organization_unit_id");

CREATE UNIQUE INDEX "research_proposals_code_key" ON "research_proposals"("code");
CREATE INDEX "research_proposals_intake_period_id_idx" ON "research_proposals"("intake_period_id");
CREATE INDEX "research_proposals_owner_id_idx" ON "research_proposals"("owner_id");
CREATE INDEX "research_proposals_host_organization_unit_id_idx" ON "research_proposals"("host_organization_unit_id");
CREATE INDEX "research_proposals_status_idx" ON "research_proposals"("status");

CREATE INDEX "proposal_members_proposal_id_idx" ON "proposal_members"("proposal_id");
CREATE INDEX "proposal_attachments_proposal_id_idx" ON "proposal_attachments"("proposal_id");
CREATE INDEX "proposal_attachments_uploaded_by_id_idx" ON "proposal_attachments"("uploaded_by_id");
CREATE INDEX "proposal_attachments_requirement_code_idx" ON "proposal_attachments"("requirement_code");
CREATE INDEX "proposal_submission_events_proposal_id_idx" ON "proposal_submission_events"("proposal_id");
CREATE INDEX "proposal_submission_events_actor_id_idx" ON "proposal_submission_events"("actor_id");

ALTER TABLE "proposal_intake_periods"
  ADD CONSTRAINT "proposal_intake_periods_applicable_organization_unit_id_fkey"
  FOREIGN KEY ("applicable_organization_unit_id") REFERENCES "organization_units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "research_proposals"
  ADD CONSTRAINT "research_proposals_intake_period_id_fkey"
  FOREIGN KEY ("intake_period_id") REFERENCES "proposal_intake_periods"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "research_proposals"
  ADD CONSTRAINT "research_proposals_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "research_proposals"
  ADD CONSTRAINT "research_proposals_host_organization_unit_id_fkey"
  FOREIGN KEY ("host_organization_unit_id") REFERENCES "organization_units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "research_proposals"
  ADD CONSTRAINT "research_proposals_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_attachments"
  ADD CONSTRAINT "proposal_attachments_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_attachments"
  ADD CONSTRAINT "proposal_attachments_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_submission_events"
  ADD CONSTRAINT "proposal_submission_events_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_submission_events"
  ADD CONSTRAINT "proposal_submission_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
