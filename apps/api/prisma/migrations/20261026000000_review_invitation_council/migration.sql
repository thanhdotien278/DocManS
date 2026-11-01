-- Story 5.11/5.10: lời mời chấp nhận/từ chối và hội đồng đánh giá do BGĐ ký thành lập.
-- Hội đồng = danh sách phân công của vòng hiện tại; không có model hội đồng riêng.
ALTER TABLE "proposal_review_assignments"
  ADD COLUMN "invitation_status" TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN "responded_at" TIMESTAMP(3),
  ADD COLUMN "decline_reason" TEXT,
  ADD COLUMN "council_established_at" TIMESTAMP(3);

-- Dữ liệu cũ: phân công trước thay đổi này coi như đã chấp nhận và hội đồng đã thành lập, để người đánh giá đang làm dở không mất quyền truy cập.
UPDATE "proposal_review_assignments" SET "council_established_at" = "assigned_at";

-- Phân công mới bắt đầu ở trạng thái "đã mời".
ALTER TABLE "proposal_review_assignments" ALTER COLUMN "invitation_status" SET DEFAULT 'invited';
ALTER TABLE "proposal_review_assignments"
  ADD CONSTRAINT "proposal_review_assignments_invitation_status_check" CHECK ("invitation_status" IN ('invited', 'accepted', 'declined'));
