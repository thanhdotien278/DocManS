-- Story 5.6: cho phép thêm tệp hành chính đánh giá (MEETING_MATERIAL, COUNCIL_MINUTES) khi hồ sơ under_review.
-- Chỉ nới INSERT. Tệp hành chính không bao giờ được UPDATE (kể cả xóa mềm), ở mọi trạng thái.
-- Thêm tệp hành chính không đổi context của hồ sơ, để không làm hỏng form đang mở của reviewer, thư ký, quản lý.
-- Quyền theo vai trò do backend kiểm tra.
CREATE OR REPLACE FUNCTION protect_proposal_file_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE proposal_state TEXT;
DECLARE evaluation_insert BOOLEAN;
BEGIN
  IF NEW.related_entity_type = 'research_proposal' THEN
    SELECT status INTO proposal_state FROM research_proposals WHERE id = NEW.related_entity_id FOR UPDATE;
    evaluation_insert := TG_OP = 'INSERT' AND proposal_state = 'under_review' AND NEW.file_purpose IN ('MEETING_MATERIAL', 'COUNCIL_MINUTES');
    IF proposal_state NOT IN ('draft', 'supplement_requested') AND NOT evaluation_insert THEN
      RAISE EXCEPTION 'Submitted proposal files are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.file_purpose IN ('MEETING_MATERIAL', 'COUNCIL_MINUTES') THEN
      RAISE EXCEPTION 'Submitted proposal files are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND EXISTS (
      SELECT 1 FROM proposal_submission_events e WHERE e.proposal_id = OLD.related_entity_id
      AND e.snapshot->'attachments' @> jsonb_build_array(jsonb_build_object('id', OLD.id))
    ) THEN RAISE EXCEPTION 'Submitted evidence cannot be changed'; END IF;
    IF NOT evaluation_insert THEN
      UPDATE research_proposals SET updated_at = clock_timestamp(), authorization_context_updated_at = clock_timestamp() WHERE id = NEW.related_entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
