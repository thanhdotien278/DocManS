-- Liên kết thành viên hồ sơ đề xuất với hồ sơ nhà khoa học (chọn từ danh mục).
ALTER TABLE "proposal_members" ADD COLUMN "researcher_profile_id" TEXT;
CREATE INDEX "proposal_members_researcher_profile_id_idx" ON "proposal_members"("researcher_profile_id");
ALTER TABLE "proposal_members" ADD CONSTRAINT "proposal_members_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
