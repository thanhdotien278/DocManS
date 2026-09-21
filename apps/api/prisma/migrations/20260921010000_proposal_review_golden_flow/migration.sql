ALTER TABLE "proposal_review_assignments"
  ADD COLUMN "reviewed_submission_event_id" TEXT;

ALTER TABLE "proposal_reviews"
  ADD COLUMN "submission_event_id" TEXT,
  ADD COLUMN "context_version" JSONB,
  ADD COLUMN "evidence_snapshot" JSONB;

ALTER TABLE "proposal_evaluation_summaries"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "context_version" JSONB,
  ADD COLUMN "evidence_snapshot" JSONB;

ALTER TABLE "proposal_decisions"
  ADD COLUMN "package_revision" INTEGER,
  ADD COLUMN "context_version" JSONB,
  ADD COLUMN "package_snapshot" JSONB,
  ADD COLUMN "public_summary" JSONB;

-- Preserve the current review round for rows created before the evidence binding existed.
WITH latest_submission AS (
  SELECT DISTINCT ON (proposal_id) proposal_id, id, submitted_at
  FROM "proposal_submission_events"
  WHERE to_status IN ('submitted', 'resubmitted')
  ORDER BY proposal_id, submitted_at DESC
)
UPDATE "proposal_review_assignments" assignment
SET reviewed_submission_event_id = latest_submission.id
FROM latest_submission
WHERE assignment.proposal_id = latest_submission.proposal_id
  AND assignment.assigned_at >= latest_submission.submitted_at
  AND assignment.reviewed_submission_event_id IS NULL;

UPDATE "proposal_reviews" review
SET submission_event_id = assignment.reviewed_submission_event_id
FROM "proposal_review_assignments" assignment
WHERE review.assignment_id = assignment.id
  AND review.submission_event_id IS NULL;

-- Existing routed summaries need the same minimum immutable package evidence as newly routed
-- summaries, otherwise the guarded decision path would strand them after this migration.
UPDATE "proposal_evaluation_summaries" summary
SET revision = 1,
    evidence_snapshot = jsonb_build_object(
      'kind', 'evaluation_package',
      'schemaVersion', 'proposal-evaluation-package.v1',
      'revision', 1,
      'submissionEventId', current_round.event_id,
      'assignmentIds', current_round.assignment_ids,
      'reviewIds', current_round.review_ids
    )
FROM (
  SELECT a.proposal_id,
         a.reviewed_submission_event_id AS event_id,
         jsonb_agg(a.id) AS assignment_ids,
         COALESCE(jsonb_agg(r.id) FILTER (WHERE r.status = 'submitted'), '[]'::jsonb) AS review_ids
  FROM "proposal_review_assignments" a
  LEFT JOIN "proposal_reviews" r ON r.assignment_id = a.id
  WHERE a.reviewed_submission_event_id IS NOT NULL
  GROUP BY a.proposal_id, a.reviewed_submission_event_id
) current_round
WHERE summary.proposal_id = current_round.proposal_id
  AND summary.status = 'ready_for_approval'
  AND summary.evidence_snapshot IS NULL;

CREATE INDEX "proposal_review_assignments_submission_event_id_idx"
  ON "proposal_review_assignments"("reviewed_submission_event_id");

CREATE INDEX "proposal_reviews_submission_event_id_idx"
  ON "proposal_reviews"("submission_event_id");

-- A submitted review is evidence, not an editable draft. The application checks this before every
-- write; the database trigger keeps the invariant true for direct SQL and future code paths too.
CREATE OR REPLACE FUNCTION protect_submitted_proposal_review() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'submitted' THEN
      RAISE EXCEPTION 'submitted proposal reviews are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'submitted' AND (
    NEW.proposal_id IS DISTINCT FROM OLD.proposal_id OR
    NEW.assignment_id IS DISTINCT FROM OLD.assignment_id OR
    NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id OR
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.score_data IS DISTINCT FROM OLD.score_data OR
    NEW.total_score IS DISTINCT FROM OLD.total_score OR
    NEW.comment IS DISTINCT FROM OLD.comment OR
    NEW.recommendation IS DISTINCT FROM OLD.recommendation OR
    NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR
    NEW.submission_event_id IS DISTINCT FROM OLD.submission_event_id OR
    NEW.context_version IS DISTINCT FROM OLD.context_version OR
    NEW.evidence_snapshot IS DISTINCT FROM OLD.evidence_snapshot
  ) THEN
    RAISE EXCEPTION 'submitted proposal reviews are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER proposal_reviews_submitted_immutable
  BEFORE UPDATE ON "proposal_reviews"
  FOR EACH ROW EXECUTE FUNCTION protect_submitted_proposal_review();

CREATE TRIGGER proposal_reviews_submitted_immutable_delete
  BEFORE DELETE ON "proposal_reviews"
  FOR EACH ROW EXECUTE FUNCTION protect_submitted_proposal_review();
