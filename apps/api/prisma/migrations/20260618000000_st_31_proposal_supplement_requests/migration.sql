CREATE TABLE "proposal_supplement_requests" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'open',

  CONSTRAINT "proposal_supplement_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_supplement_requests_proposal_id_idx" ON "proposal_supplement_requests"("proposal_id");
CREATE INDEX "proposal_supplement_requests_actor_id_idx" ON "proposal_supplement_requests"("actor_id");
CREATE INDEX "proposal_supplement_requests_status_idx" ON "proposal_supplement_requests"("status");

ALTER TABLE "proposal_supplement_requests"
  ADD CONSTRAINT "proposal_supplement_requests_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_supplement_requests"
  ADD CONSTRAINT "proposal_supplement_requests_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
