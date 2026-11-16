CREATE TABLE "scientific_documents" (
  "id" TEXT NOT NULL,
  "document_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "issuing_authority" TEXT,
  "issued_date" TIMESTAMP(3),
  "effective_date" TIMESTAMP(3),
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "file_name" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "mime_type" TEXT NOT NULL,
  "storage_object_key" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "scientific_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scientific_documents_category_idx" ON "scientific_documents"("category");
CREATE INDEX "scientific_documents_status_idx" ON "scientific_documents"("status");
CREATE INDEX "scientific_documents_created_by_id_idx" ON "scientific_documents"("created_by_id");
CREATE INDEX "scientific_documents_deleted_at_idx" ON "scientific_documents"("deleted_at");

ALTER TABLE "scientific_documents" ADD CONSTRAINT "scientific_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
