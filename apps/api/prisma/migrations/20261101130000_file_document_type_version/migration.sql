-- AlterTable
ALTER TABLE "file_records" ADD COLUMN "document_type" TEXT, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Backfill: loại tài liệu = mục đích tệp; version theo thứ tự tạo trong cùng (thực thể, loại)
UPDATE "file_records" SET "document_type" = "file_purpose";
UPDATE "file_records" f SET "version" = r.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "related_entity_type", "related_entity_id", "file_purpose" ORDER BY "created_at", "id") AS rn
  FROM "file_records"
) r
WHERE f."id" = r."id";

ALTER TABLE "file_records" ALTER COLUMN "document_type" SET NOT NULL;
