-- Publication type (Bài báo khoa học, Báo cáo hội nghị, Sách/Chuyên khảo, Khác); nullable so existing rows stay valid.
ALTER TABLE "researcher_profile_publications" ADD COLUMN "publication_type" TEXT;
