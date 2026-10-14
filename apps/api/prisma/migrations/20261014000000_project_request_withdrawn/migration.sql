-- GF4: PI may withdraw an open adjustment/extension request (terminal status).
ALTER TABLE "project_requests" DROP CONSTRAINT "project_requests_status_check";
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_status_check"
  CHECK ("status" IN ('draft', 'submitted', 'under_staff_review', 'supplement_requested', 'under_staff_validation', 'ready_for_head_decision', 'approved', 'rejected', 'withdrawn'));
