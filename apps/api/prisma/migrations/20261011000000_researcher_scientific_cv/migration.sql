ALTER TABLE "researcher_profiles"
  ADD COLUMN "curriculum_vitae" JSONB;

ALTER TABLE "researcher_profile_publications"
  ADD COLUMN "issn_isbn" TEXT,
  ADD COLUMN "classification" TEXT,
  ADD COLUMN "proof_url" TEXT;
