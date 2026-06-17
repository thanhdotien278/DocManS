CREATE TABLE "file_records" (
  "id" TEXT NOT NULL,
  "related_entity_type" TEXT NOT NULL,
  "related_entity_id" TEXT NOT NULL,
  "file_purpose" TEXT NOT NULL,
  "original_file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_bucket" TEXT NOT NULL,
  "storage_object_key" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "file_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "file_records_related_entity_type_related_entity_id_idx" ON "file_records"("related_entity_type", "related_entity_id");
CREATE INDEX "file_records_uploaded_by_id_idx" ON "file_records"("uploaded_by_id");
CREATE INDEX "file_records_file_purpose_idx" ON "file_records"("file_purpose");
CREATE INDEX "file_records_status_idx" ON "file_records"("status");
CREATE INDEX "file_records_deleted_at_idx" ON "file_records"("deleted_at");

ALTER TABLE "file_records" ADD CONSTRAINT "file_records_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
