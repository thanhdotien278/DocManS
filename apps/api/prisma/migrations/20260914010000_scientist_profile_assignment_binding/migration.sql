-- Preserve legacy assignment rows while recording the source scientist profile for new writes.
-- Historical profile identity is intentionally not inferred or backfilled.
ALTER TABLE "proposal_review_assignments"
  ADD COLUMN "researcher_profile_id" TEXT;

CREATE INDEX "proposal_review_assignments_researcher_profile_id_idx"
  ON "proposal_review_assignments"("researcher_profile_id");

ALTER TABLE "proposal_review_assignments"
  ADD CONSTRAINT "proposal_review_assignments_researcher_profile_id_fkey"
  FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
