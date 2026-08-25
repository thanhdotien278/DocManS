CREATE TABLE "researcher_profiles" (
  "id" TEXT NOT NULL,
  "management_organization_unit_id" TEXT NOT NULL,
  "external_affiliation" TEXT,
  "full_name" TEXT NOT NULL,
  "full_name_key" TEXT NOT NULL,
  "academic_rank_catalog_item_id" TEXT,
  "academic_degree_catalog_item_id" TEXT,
  "title" TEXT,
  "contact_email" TEXT,
  "contact_email_key" TEXT,
  "contact_phone" TEXT,
  "contact_phone_key" TEXT,
  "contact_note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "aggregate_version" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" TEXT NOT NULL,
  "updated_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "researcher_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "researcher_profile_fields" (
  "id" TEXT NOT NULL,
  "researcher_profile_id" TEXT NOT NULL,
  "catalog_item_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "researcher_profile_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "researcher_profile_expertise_keywords" (
  "id" TEXT NOT NULL,
  "researcher_profile_id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "keyword_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "researcher_profile_expertise_keywords_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "researcher_profile_fields_profile_catalog_key" ON "researcher_profile_fields"("researcher_profile_id", "catalog_item_id");
CREATE INDEX "researcher_profile_fields_catalog_item_id_idx" ON "researcher_profile_fields"("catalog_item_id");
CREATE UNIQUE INDEX "researcher_profile_expertise_keywords_profile_key_key" ON "researcher_profile_expertise_keywords"("researcher_profile_id", "keyword_key");
CREATE INDEX "researcher_profile_expertise_keywords_keyword_key_idx" ON "researcher_profile_expertise_keywords"("keyword_key");
CREATE INDEX "researcher_profiles_management_organization_unit_id_status_full_name_key_idx" ON "researcher_profiles"("management_organization_unit_id", "status", "full_name_key");
CREATE INDEX "researcher_profiles_contact_email_key_idx" ON "researcher_profiles"("contact_email_key");
CREATE INDEX "researcher_profiles_contact_phone_key_idx" ON "researcher_profiles"("contact_phone_key");

ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_management_organization_unit_id_fkey" FOREIGN KEY ("management_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_academic_rank_catalog_item_id_fkey" FOREIGN KEY ("academic_rank_catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_academic_degree_catalog_item_id_fkey" FOREIGN KEY ("academic_degree_catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "researcher_profile_fields" ADD CONSTRAINT "researcher_profile_fields_profile_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "researcher_profile_fields" ADD CONSTRAINT "researcher_profile_fields_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "researcher_profile_expertise_keywords" ADD CONSTRAINT "researcher_profile_expertise_keywords_profile_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD COLUMN "correlation_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "before_facts" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "after_facts" JSONB;
