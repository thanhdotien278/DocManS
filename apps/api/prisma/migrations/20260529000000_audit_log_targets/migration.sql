ALTER TABLE "audit_logs"
  ADD COLUMN "target_entity" TEXT,
  ADD COLUMN "target_entity_id" TEXT;

CREATE INDEX "audit_logs_target_entity_target_entity_id_idx"
  ON "audit_logs"("target_entity", "target_entity_id");
