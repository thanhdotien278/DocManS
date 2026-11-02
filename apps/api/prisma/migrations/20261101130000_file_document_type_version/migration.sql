-- AlterTable
ALTER TABLE "file_records" ADD COLUMN IF NOT EXISTS "document_type" TEXT, ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- Trigger bảo vệ bằng chứng hồ sơ đã nộp chặn UPDATE; tắt tạm khi backfill (chỉ thêm metadata, không đổi nội dung tệp).
ALTER TABLE "file_records" DISABLE TRIGGER proposal_file_evidence;

-- Backfill: loại tài liệu = mục đích tệp; version theo thứ tự tạo trong cùng (thực thể, loại)
UPDATE "file_records" SET "document_type" = "file_purpose";
UPDATE "file_records" f SET "version" = r.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "related_entity_type", "related_entity_id", "file_purpose" ORDER BY "created_at", "id") AS rn
  FROM "file_records"
) r
WHERE f."id" = r."id";

ALTER TABLE "file_records" ENABLE TRIGGER proposal_file_evidence;

ALTER TABLE "file_records" ALTER COLUMN "document_type" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "file_records_entity_doctype_idx" ON "file_records"("related_entity_type", "related_entity_id", "document_type");
