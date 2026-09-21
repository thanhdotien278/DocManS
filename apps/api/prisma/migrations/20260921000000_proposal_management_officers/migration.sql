ALTER TABLE "users" DROP CONSTRAINT "users_system_role_check";
ALTER TABLE "users" ADD CONSTRAINT "users_system_role_check"
  CHECK ("system_role" IS NULL OR "system_role" IN (
    'SYSTEM_ADMIN', 'SCIENTIFIC_MANAGEMENT_HEAD', 'SCIENTIFIC_MANAGEMENT_STAFF',
    'LEADERSHIP_APPROVAL_AUTHORITY', 'RESEARCH_OVERSIGHT_AUTHORITY',
    'RESEARCHER_INTERNAL_USER', 'EXTERNAL_RESEARCHER_USER'
  ));

CREATE TABLE "proposal_management_officers" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "officer_user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "reason" TEXT,
    "assignment_context_version" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_management_officers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_management_officers_proposal_id_status_effective_until_idx"
    ON "proposal_management_officers"("proposal_id", "status", "effective_until");

CREATE INDEX "proposal_management_officers_officer_user_id_status_effective_until_idx"
    ON "proposal_management_officers"("officer_user_id", "status", "effective_until");

CREATE UNIQUE INDEX "proposal_management_officers_one_active_primary_idx"
    ON "proposal_management_officers"("proposal_id")
    WHERE "status" = 'ACTIVE';

ALTER TABLE "proposal_management_officers"
    ADD CONSTRAINT "proposal_management_officers_proposal_id_fkey"
    FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_management_officers"
    ADD CONSTRAINT "proposal_management_officers_officer_user_id_fkey"
    FOREIGN KEY ("officer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_management_officers"
    ADD CONSTRAINT "proposal_management_officers_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_management_officers"
    ADD CONSTRAINT "proposal_management_officers_status_check"
      CHECK ("status" IN ('ACTIVE', 'ENDED', 'REVOKED')),
    ADD CONSTRAINT "proposal_management_officers_interval_check"
      CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from");
