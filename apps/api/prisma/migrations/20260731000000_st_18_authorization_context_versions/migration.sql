-- ST-1.8: source-owned counters make authorization context changes observable even when a
-- relationship is replaced with another relationship set of the same cardinality.
ALTER TABLE "research_proposals"
  ADD COLUMN "authorization_relationship_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "authorization_conflict_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "authorization_context_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
