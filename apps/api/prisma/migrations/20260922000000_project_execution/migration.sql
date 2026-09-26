CREATE TABLE "approved_projects" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "proposal_id" TEXT NOT NULL,
    "source_submission_event_id" TEXT NOT NULL,
    "source_decision_id" TEXT NOT NULL,
    "host_organization_unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope_snapshot" JSONB NOT NULL,
    "plan_snapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'preparing',
    "start_date" DATE,
    "end_date" DATE,
    "aggregate_version" INTEGER NOT NULL DEFAULT 0,
    "relationship_version" INTEGER NOT NULL DEFAULT 0,
    "conflict_version" INTEGER NOT NULL DEFAULT 0,
    "delegation_version" INTEGER NOT NULL DEFAULT 0,
    "authorization_context_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "confirmed_by_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approved_projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approved_projects_code_key" ON "approved_projects"("code");
CREATE UNIQUE INDEX "approved_projects_proposal_id_key" ON "approved_projects"("proposal_id");
CREATE INDEX "approved_projects_host_organization_unit_id_status_idx" ON "approved_projects"("host_organization_unit_id", "status");
CREATE INDEX "approved_projects_status_end_date_idx" ON "approved_projects"("status", "end_date");

ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_source_submission_event_id_fkey"
  FOREIGN KEY ("source_submission_event_id") REFERENCES "proposal_submission_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_source_decision_id_fkey"
  FOREIGN KEY ("source_decision_id") REFERENCES "proposal_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_host_organization_unit_id_fkey"
  FOREIGN KEY ("host_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_confirmed_by_id_fkey"
  FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_status_check"
  CHECK ("status" IN ('preparing', 'executing', 'paused', 'pending_acceptance', 'accepted', 'failed', 'closed'));
ALTER TABLE "approved_projects" ADD CONSTRAINT "approved_projects_date_check"
  CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date");

CREATE TABLE "approved_project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "source_member_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "participation_role" TEXT NOT NULL DEFAULT 'TOPIC_MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approved_project_members_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approved_project_members_project_id_status_effective_until_idx" ON "approved_project_members"("project_id", "status", "effective_until");
CREATE INDEX "approved_project_members_user_id_status_effective_until_idx" ON "approved_project_members"("user_id", "status", "effective_until");
ALTER TABLE "approved_project_members" ADD CONSTRAINT "approved_project_members_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_project_members" ADD CONSTRAINT "approved_project_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_project_members" ADD CONSTRAINT "approved_project_members_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approved_project_members" ADD CONSTRAINT "approved_project_members_interval_check"
  CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from");

CREATE TABLE "project_management_officers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "officer_user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "reason" TEXT,
    "assignment_context_version" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_management_officers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_management_officers_project_id_status_effective_until_idx" ON "project_management_officers"("project_id", "status", "effective_until");
CREATE INDEX "project_management_officers_officer_user_id_status_effective_until_idx" ON "project_management_officers"("officer_user_id", "status", "effective_until");
CREATE UNIQUE INDEX "project_management_officers_one_active_primary_idx" ON "project_management_officers"("project_id") WHERE "status" = 'ACTIVE';
ALTER TABLE "project_management_officers" ADD CONSTRAINT "project_management_officers_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_management_officers" ADD CONSTRAINT "project_management_officers_officer_user_id_fkey"
  FOREIGN KEY ("officer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_management_officers" ADD CONSTRAINT "project_management_officers_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_management_officers" ADD CONSTRAINT "project_management_officers_status_check"
  CHECK ("status" IN ('ACTIVE', 'ENDED', 'REVOKED'));
ALTER TABLE "project_management_officers" ADD CONSTRAINT "project_management_officers_interval_check"
  CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from");

CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "responsible_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_milestones_project_id_due_date_idx" ON "project_milestones"("project_id", "due_date");
CREATE INDEX "project_milestones_responsible_member_id_idx" ON "project_milestones"("responsible_member_id");
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_responsible_member_id_fkey"
  FOREIGN KEY ("responsible_member_id") REFERENCES "approved_project_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_checkpoints" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "title" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_checkpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_checkpoints_project_id_due_date_idx" ON "project_checkpoints"("project_id", "due_date");
ALTER TABLE "project_checkpoints" ADD CONSTRAINT "project_checkpoints_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_checkpoints" ADD CONSTRAINT "project_checkpoints_milestone_id_fkey"
  FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_report_revisions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "checkpoint_id" TEXT,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reporting_period_start" DATE,
    "reporting_period_end" DATE,
    "deadline" DATE,
    "progress_results" TEXT NOT NULL,
    "issues_recommendations" TEXT,
    "milestone_context" JSONB,
    "author_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "review_reason" TEXT,
    "response_deadline" DATE,
    "submitted_at" TIMESTAMP(3),
    "submitted_context_version" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_report_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_report_revisions_project_id_revision_key" ON "project_report_revisions"("project_id", "revision");
CREATE INDEX "project_report_revisions_project_id_status_idx" ON "project_report_revisions"("project_id", "status");
CREATE INDEX "project_report_revisions_checkpoint_id_status_idx" ON "project_report_revisions"("checkpoint_id", "status");
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_checkpoint_id_fkey"
  FOREIGN KEY ("checkpoint_id") REFERENCES "project_checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_report_revisions" ADD CONSTRAINT "project_report_revisions_status_check"
  CHECK ("status" IN ('draft', 'submitted', 'under_review', 'supplement_requested', 'accepted'));

CREATE TABLE "project_report_evidence" (
    "id" TEXT NOT NULL,
    "report_revision_id" TEXT NOT NULL,
    "file_record_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_report_evidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_report_evidence_report_revision_id_file_record_id_key" ON "project_report_evidence"("report_revision_id", "file_record_id");
ALTER TABLE "project_report_evidence" ADD CONSTRAINT "project_report_evidence_report_revision_id_fkey"
  FOREIGN KEY ("report_revision_id") REFERENCES "project_report_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_report_evidence" ADD CONSTRAINT "project_report_evidence_file_record_id_fkey"
  FOREIGN KEY ("file_record_id") REFERENCES "file_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_requests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "requester_id" TEXT NOT NULL,
    "current_values" JSONB NOT NULL,
    "proposed_values" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "submitted_context_version" JSONB,
    "appraisal" JSONB,
    "decision_note" TEXT,
    "response_deadline" DATE,
    "decision_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "prepared_by_id" TEXT,
    "prepared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_requests_project_id_request_type_status_idx" ON "project_requests"("project_id", "request_type", "status");
CREATE INDEX "project_requests_requester_id_status_idx" ON "project_requests"("requester_id", "status");
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_decision_by_id_fkey"
  FOREIGN KEY ("decision_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_prepared_by_id_fkey"
  FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_type_check"
  CHECK ("request_type" IN ('adjustment', 'extension'));
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_status_check"
  CHECK ("status" IN ('draft', 'submitted', 'under_staff_review', 'supplement_requested', 'under_staff_validation', 'ready_for_head_decision', 'approved', 'rejected'));

CREATE TABLE "project_request_revisions" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "current_values" JSONB NOT NULL,
    "proposed_values" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "context_version" JSONB,
    "created_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_request_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_request_revisions_request_id_revision_key" ON "project_request_revisions"("request_id", "revision");
ALTER TABLE "project_request_revisions" ADD CONSTRAINT "project_request_revisions_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_request_revisions" ADD CONSTRAINT "project_request_revisions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_request_evidence" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "request_revision_id" TEXT NOT NULL,
    "file_record_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_request_evidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_request_evidence_request_revision_id_file_record_id_key" ON "project_request_evidence"("request_revision_id", "file_record_id");
CREATE INDEX "project_request_evidence_request_id_idx" ON "project_request_evidence"("request_id");
ALTER TABLE "project_request_evidence" ADD CONSTRAINT "project_request_evidence_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_request_evidence" ADD CONSTRAINT "project_request_evidence_request_revision_id_fkey"
  FOREIGN KEY ("request_revision_id") REFERENCES "project_request_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_request_evidence" ADD CONSTRAINT "project_request_evidence_file_record_id_fkey"
  FOREIGN KEY ("file_record_id") REFERENCES "file_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_request_history" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "reason" TEXT,
    "before_facts" JSONB,
    "after_facts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_request_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_request_history_request_id_created_at_idx" ON "project_request_history"("request_id", "created_at");
ALTER TABLE "project_request_history" ADD CONSTRAINT "project_request_history_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "project_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_request_history" ADD CONSTRAINT "project_request_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_history" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "reason" TEXT,
    "request_id" TEXT,
    "before_facts" JSONB,
    "after_facts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_history_project_id_created_at_idx" ON "project_history"("project_id", "created_at");
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION check_project_record_links() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'project_milestones' THEN
    IF NEW.responsible_member_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM approved_project_members WHERE id = NEW.responsible_member_id AND project_id = NEW.project_id) THEN
      RAISE EXCEPTION 'milestone responsibility must belong to its project';
    END IF;
  ELSIF TG_TABLE_NAME = 'project_checkpoints' THEN
    IF NEW.milestone_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_milestones WHERE id = NEW.milestone_id AND project_id = NEW.project_id) THEN
      RAISE EXCEPTION 'checkpoint milestone must belong to its project';
    END IF;
  ELSIF TG_TABLE_NAME = 'project_report_revisions' THEN
    IF NEW.checkpoint_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_checkpoints WHERE id = NEW.checkpoint_id AND project_id = NEW.project_id) THEN
      RAISE EXCEPTION 'report checkpoint must belong to its project';
    END IF;
  ELSIF TG_TABLE_NAME = 'project_report_evidence' THEN
    IF NOT EXISTS (
      SELECT 1 FROM project_report_revisions r JOIN file_records f ON f.id = NEW.file_record_id
      WHERE r.id = NEW.report_revision_id AND r.status <> 'draft' AND f.related_entity_type = 'approved_project' AND f.related_entity_id = r.project_id
    ) THEN RAISE EXCEPTION 'report evidence must belong to the submitted project revision'; END IF;
  ELSIF TG_TABLE_NAME = 'project_request_evidence' THEN
    IF NOT EXISTS (
      SELECT 1 FROM project_request_revisions v JOIN project_requests q ON q.id = v.request_id
      JOIN file_records f ON f.id = NEW.file_record_id
      WHERE v.id = NEW.request_revision_id AND v.status = 'submitted' AND q.id = NEW.request_id
        AND f.related_entity_type = 'approved_project' AND f.related_entity_id = q.project_id
    ) THEN RAISE EXCEPTION 'request evidence must belong to the submitted project revision'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_milestone_link_scope BEFORE INSERT OR UPDATE ON "project_milestones" FOR EACH ROW EXECUTE FUNCTION check_project_record_links();
CREATE TRIGGER project_checkpoint_link_scope BEFORE INSERT OR UPDATE ON "project_checkpoints" FOR EACH ROW EXECUTE FUNCTION check_project_record_links();
CREATE TRIGGER project_report_link_scope BEFORE INSERT OR UPDATE ON "project_report_revisions" FOR EACH ROW EXECUTE FUNCTION check_project_record_links();
CREATE TRIGGER project_report_evidence_link_scope BEFORE INSERT OR UPDATE ON "project_report_evidence" FOR EACH ROW EXECUTE FUNCTION check_project_record_links();
CREATE TRIGGER project_request_evidence_link_scope BEFORE INSERT OR UPDATE ON "project_request_evidence" FOR EACH ROW EXECUTE FUNCTION check_project_record_links();

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
    NEW.submitted_context_version IS DISTINCT FROM OLD.submitted_context_version
  ) THEN
    RAISE EXCEPTION 'submitted project report revisions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_report_revisions_submitted_immutable
  BEFORE UPDATE OR DELETE ON "project_report_revisions"
  FOR EACH ROW EXECUTE FUNCTION protect_project_report_revision();

CREATE OR REPLACE FUNCTION protect_project_request_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'submitted project request revisions are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_request_revisions_submitted_immutable
  BEFORE UPDATE OR DELETE ON "project_request_revisions"
  FOR EACH ROW EXECUTE FUNCTION protect_project_request_revision();

CREATE OR REPLACE FUNCTION protect_project_evidence_link() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'submitted project evidence links are immutable';
END;
$$;
CREATE TRIGGER project_report_evidence_immutable
  BEFORE UPDATE OR DELETE ON "project_report_evidence"
  FOR EACH ROW EXECUTE FUNCTION protect_project_evidence_link();
CREATE TRIGGER project_request_evidence_immutable
  BEFORE UPDATE OR DELETE ON "project_request_evidence"
  FOR EACH ROW EXECUTE FUNCTION protect_project_evidence_link();

CREATE OR REPLACE FUNCTION protect_pinned_project_file() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "project_report_evidence" WHERE "file_record_id" = OLD.id)
     OR EXISTS (SELECT 1 FROM "project_request_evidence" WHERE "file_record_id" = OLD.id) THEN
    RAISE EXCEPTION 'submitted project evidence files are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER project_files_pinned_immutable
  BEFORE UPDATE OR DELETE ON "file_records"
  FOR EACH ROW EXECUTE FUNCTION protect_pinned_project_file();

CREATE OR REPLACE FUNCTION protect_project_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'project history is append-only';
END;
$$;
CREATE TRIGGER project_history_append_only
  BEFORE UPDATE OR DELETE ON "project_history"
  FOR EACH ROW EXECUTE FUNCTION protect_project_history();
CREATE TRIGGER project_request_history_append_only
  BEFORE UPDATE OR DELETE ON "project_request_history"
  FOR EACH ROW EXECUTE FUNCTION protect_project_history();
