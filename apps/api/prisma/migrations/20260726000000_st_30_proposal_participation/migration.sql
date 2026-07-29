-- ST-3.0: link proposal participation to user accounts and store a canonical participation role.
-- The descriptive columns (name, role, organization) are kept so participants without a system
-- account remain valid entries (AC-ST-3.0-01, TN-ST-3.0-01).

ALTER TABLE "proposal_members"
  ADD COLUMN "user_id" TEXT;

ALTER TABLE "proposal_members"
  ADD COLUMN "participation_role" TEXT NOT NULL DEFAULT 'member';

-- Backfill the canonical role from the descriptive Vietnamese label captured at intake, so rows
-- created before ST-3.0 classify the same way normalizeParticipationRole() classifies new ones.
-- Rows that match nothing keep the 'member' default, which still triggers the conflict rule.
UPDATE "proposal_members"
  SET "participation_role" = 'principal-investigator'
  WHERE "role" ILIKE '%chủ nhiệm%' OR "role" ILIKE '%chu nhiem%';

UPDATE "proposal_members"
  SET "participation_role" = 'secretary'
  WHERE "participation_role" = 'member'
    AND ("role" ILIKE '%thư ký%' OR "role" ILIKE '%thu ky%');

CREATE INDEX "proposal_members_user_id_idx" ON "proposal_members"("user_id");
CREATE INDEX "proposal_members_participation_role_idx" ON "proposal_members"("participation_role");

-- ON DELETE SET NULL: removing an account must not delete the participation record, because the
-- descriptive entry stays valid as an external participant.
ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
