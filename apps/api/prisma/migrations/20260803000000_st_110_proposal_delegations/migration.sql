-- ST-1.10: proposal-scoped delegation is durable history. Authority remains
-- source-owned by the proposal domain and the aggregate exposes a version token.
ALTER TABLE "research_proposals"
  ADD COLUMN "authorization_delegation_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "proposal_delegations" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "grantor_user_id" TEXT NOT NULL,
  "delegate_user_id" TEXT NOT NULL,
  "approver_user_id" TEXT,
  "target_organization_unit_id" TEXT NOT NULL,
  "action_ids" JSONB NOT NULL,
  "source_authority_version" JSONB NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "approved_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proposal_delegations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "proposal_delegations_interval_valid" CHECK ("ends_at" IS NULL OR "starts_at" < "ends_at"),
  CONSTRAINT "proposal_delegations_grantor_delegate_distinct" CHECK ("grantor_user_id" <> "delegate_user_id"),
  CONSTRAINT "proposal_delegations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "proposal_delegations_grantor_user_id_fkey" FOREIGN KEY ("grantor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "proposal_delegations_delegate_user_id_fkey" FOREIGN KEY ("delegate_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "proposal_delegations_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "proposal_delegations_proposal_id_delegate_user_id_status_idx"
  ON "proposal_delegations"("proposal_id", "delegate_user_id", "status");
CREATE INDEX "proposal_delegations_proposal_id_grantor_user_id_status_idx"
  ON "proposal_delegations"("proposal_id", "grantor_user_id", "status");
