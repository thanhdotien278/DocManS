-- Danh sách tác giả lưu theo từng phiên bản nộp (bất biến), không chỉ trên báo cáo.
ALTER TABLE "conference_paper_versions" ADD COLUMN "authors" JSONB NOT NULL DEFAULT '[]';

-- Phiên bản đã có: lấy danh sách tác giả hiện tại của báo cáo (giá trị tốt nhất còn lại).
UPDATE "conference_paper_versions" v SET "authors" = p."authors" FROM "conference_papers" p WHERE p."id" = v."paper_id";
