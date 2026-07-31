-- ST-1.9: proposal remains the relationship source of truth. Existing membership is active from
-- its recorded creation instant; lifecycle rows are retained instead of being physically deleted.
ALTER TABLE "proposal_members"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "effective_from" TIMESTAMP(3),
  ADD COLUMN "effective_until" TIMESTAMP(3);

UPDATE "proposal_members"
SET "effective_from" = "created_at"
WHERE "effective_from" IS NULL;

ALTER TABLE "proposal_members"
  ALTER COLUMN "effective_from" SET NOT NULL,
  ALTER COLUMN "effective_from" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "proposal_members_proposal_id_user_id_participation_role_status_idx"
  ON "proposal_members"("proposal_id", "user_id", "participation_role", "status");

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_active_actor_type_interval_excl"
  EXCLUDE USING gist (
    "proposal_id" WITH =,
    "user_id" WITH =,
    "participation_role" WITH =,
    tsrange("effective_from", COALESCE("effective_until", 'infinity'::timestamp), '[)') WITH &&
  )
  WHERE ("status" = 'ACTIVE' AND "user_id" IS NOT NULL);

ALTER TABLE "proposal_review_assignments"
  ADD COLUMN "effective_from" TIMESTAMP(3),
  ADD COLUMN "effective_until" TIMESTAMP(3);

UPDATE "proposal_review_assignments"
SET "effective_from" = "assigned_at"
WHERE "effective_from" IS NULL;

ALTER TABLE "proposal_review_assignments"
  ALTER COLUMN "effective_from" SET NOT NULL,
  ALTER COLUMN "effective_from" SET DEFAULT CURRENT_TIMESTAMP;
