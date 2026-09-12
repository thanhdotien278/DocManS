ALTER TABLE "proposal_intake_periods" ADD COLUMN "applicable_organization_unit_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "proposal_submission_events" ADD COLUMN "snapshot" JSONB;
ALTER TABLE "researcher_profiles" ADD COLUMN "linked_user_id" TEXT REFERENCES "users"("id");
CREATE UNIQUE INDEX "researcher_profiles_linked_user_id_key" ON "researcher_profiles"("linked_user_id");

CREATE FUNCTION protect_proposal_file_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE proposal_state TEXT;
BEGIN
  IF NEW.related_entity_type = 'research_proposal' THEN
    SELECT status INTO proposal_state FROM research_proposals WHERE id = NEW.related_entity_id FOR UPDATE;
    IF proposal_state NOT IN ('draft', 'supplement_requested') THEN
      RAISE EXCEPTION 'Submitted proposal files are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND EXISTS (
      SELECT 1 FROM proposal_submission_events e WHERE e.proposal_id = OLD.related_entity_id
      AND e.snapshot->'attachments' @> jsonb_build_array(jsonb_build_object('id', OLD.id))
    ) THEN RAISE EXCEPTION 'Submitted evidence cannot be changed'; END IF;
    UPDATE research_proposals SET updated_at = clock_timestamp(), authorization_context_updated_at = clock_timestamp() WHERE id = NEW.related_entity_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER proposal_file_evidence BEFORE INSERT OR UPDATE ON file_records FOR EACH ROW EXECUTE FUNCTION protect_proposal_file_evidence();

CREATE FUNCTION preserve_proposal_submission_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Proposal submission evidence is append-only'; END;
$$;
CREATE TRIGGER proposal_submission_evidence BEFORE UPDATE OR DELETE ON proposal_submission_events FOR EACH ROW EXECUTE FUNCTION preserve_proposal_submission_events();
