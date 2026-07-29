-- EP-03 (ST-3.2 .. ST-3.5): reviewer assignment, reviewer scoring, staff consolidation and the
-- leadership decision. Every table is proposal-scoped; none of them grants access by account role.

-- ST-3.2 -------------------------------------------------------------------------------------
CREATE TABLE "proposal_review_assignments" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "reviewer_user_id" TEXT NOT NULL,
  "assignment_role" TEXT NOT NULL DEFAULT 'reviewer',
  "status" TEXT NOT NULL DEFAULT 'assigned',
  "assigned_by_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "due_date" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "proposal_review_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_review_assignments_proposal_id_idx" ON "proposal_review_assignments"("proposal_id");
CREATE INDEX "proposal_review_assignments_reviewer_user_id_idx" ON "proposal_review_assignments"("reviewer_user_id");
CREATE INDEX "proposal_review_assignments_status_idx" ON "proposal_review_assignments"("status");

-- Revoked assignments stay as history (AC-ST-3.2-03), so the uniqueness rule can only cover the
-- live ones: a reviewer holds at most one active assignment per proposal, and may be re-assigned
-- after a revoke without the earlier row being rewritten.
CREATE UNIQUE INDEX "proposal_review_assignments_active_reviewer_key"
  ON "proposal_review_assignments"("proposal_id", "reviewer_user_id")
  WHERE "status" = 'assigned';

ALTER TABLE "proposal_review_assignments"
  ADD CONSTRAINT "proposal_review_assignments_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_review_assignments"
  ADD CONSTRAINT "proposal_review_assignments_reviewer_user_id_fkey"
  FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_review_assignments"
  ADD CONSTRAINT "proposal_review_assignments_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ST-3.3 -------------------------------------------------------------------------------------
CREATE TABLE "proposal_reviews" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "reviewer_user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "score_data" JSONB,
  "total_score" INTEGER,
  "comment" TEXT,
  "recommendation" TEXT,
  "submitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "proposal_reviews_pkey" PRIMARY KEY ("id")
);

-- One review per assignment, so a reviewer can never write over another reviewer's row
-- (AC-ST-3.3-01) and a re-assignment starts a fresh review.
CREATE UNIQUE INDEX "proposal_reviews_assignment_id_key" ON "proposal_reviews"("assignment_id");
CREATE INDEX "proposal_reviews_proposal_id_idx" ON "proposal_reviews"("proposal_id");
CREATE INDEX "proposal_reviews_reviewer_user_id_idx" ON "proposal_reviews"("reviewer_user_id");
CREATE INDEX "proposal_reviews_status_idx" ON "proposal_reviews"("status");

ALTER TABLE "proposal_reviews"
  ADD CONSTRAINT "proposal_reviews_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_reviews"
  ADD CONSTRAINT "proposal_reviews_assignment_id_fkey"
  FOREIGN KEY ("assignment_id") REFERENCES "proposal_review_assignments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_reviews"
  ADD CONSTRAINT "proposal_reviews_reviewer_user_id_fkey"
  FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ST-3.4 -------------------------------------------------------------------------------------
CREATE TABLE "proposal_evaluation_summaries" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_by_id" TEXT NOT NULL,
  "updated_by_id" TEXT NOT NULL,
  "marked_ready_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "proposal_evaluation_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposal_evaluation_summaries_proposal_id_key" ON "proposal_evaluation_summaries"("proposal_id");
CREATE INDEX "proposal_evaluation_summaries_status_idx" ON "proposal_evaluation_summaries"("status");

ALTER TABLE "proposal_evaluation_summaries"
  ADD CONSTRAINT "proposal_evaluation_summaries_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_evaluation_summaries"
  ADD CONSTRAINT "proposal_evaluation_summaries_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "proposal_evaluation_summaries"
  ADD CONSTRAINT "proposal_evaluation_summaries_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ST-3.5 -------------------------------------------------------------------------------------
CREATE TABLE "proposal_decisions" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "note" TEXT,
  "decided_by_id" TEXT NOT NULL,
  "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "from_status" TEXT NOT NULL,
  "to_status" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "proposal_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_decisions_proposal_id_idx" ON "proposal_decisions"("proposal_id");
CREATE INDEX "proposal_decisions_decided_by_id_idx" ON "proposal_decisions"("decided_by_id");
CREATE INDEX "proposal_decisions_decision_idx" ON "proposal_decisions"("decision");

ALTER TABLE "proposal_decisions"
  ADD CONSTRAINT "proposal_decisions_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_decisions"
  ADD CONSTRAINT "proposal_decisions_decided_by_id_fkey"
  FOREIGN KEY ("decided_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
