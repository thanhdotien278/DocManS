-- GF4: a supplement correction supersedes the returned report revision (existing rows are not backfilled).
ALTER TABLE "project_report_revisions" DROP CONSTRAINT "project_report_revisions_status_check";
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_status_check"
  CHECK ("status" IN ('draft', 'submitted', 'under_review', 'supplement_requested', 'accepted', 'superseded'));

ALTER TABLE "project_report_revisions" ADD COLUMN "supersedes_report_id" TEXT;
CREATE UNIQUE INDEX "project_report_revisions_supersedes_report_id_key" ON "project_report_revisions"("supersedes_report_id");
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_supersedes_report_id_fkey"
  FOREIGN KEY ("supersedes_report_id") REFERENCES "project_report_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The supersedes link is part of the submitted content; status may still advance.
CREATE OR REPLACE FUNCTION protect_project_report_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'submitted project report revisions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' AND (
    NEW.project_id IS DISTINCT FROM OLD.project_id OR
    NEW.checkpoint_id IS DISTINCT FROM OLD.checkpoint_id OR
    NEW.revision IS DISTINCT FROM OLD.revision OR
    NEW.reporting_period_start IS DISTINCT FROM OLD.reporting_period_start OR
    NEW.reporting_period_end IS DISTINCT FROM OLD.reporting_period_end OR
    NEW.deadline IS DISTINCT FROM OLD.deadline OR
    NEW.progress_results IS DISTINCT FROM OLD.progress_results OR
    NEW.issues_recommendations IS DISTINCT FROM OLD.issues_recommendations OR
    NEW.milestone_context IS DISTINCT FROM OLD.milestone_context OR
    NEW.author_id IS DISTINCT FROM OLD.author_id OR
    NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR
    NEW.submitted_context_version IS DISTINCT FROM OLD.submitted_context_version OR
    NEW.supersedes_report_id IS DISTINCT FROM OLD.supersedes_report_id
  ) THEN
    RAISE EXCEPTION 'submitted project report revisions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
