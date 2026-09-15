-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credential_email" TEXT,
ADD COLUMN     "credential_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "credential_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "credential_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "researcher_profiles" ADD COLUMN     "military_rank" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "profile_type" TEXT NOT NULL DEFAULT 'INTERNAL';

-- CreateTable
CREATE TABLE "researcher_profile_account_links" (
    "id" TEXT NOT NULL,
    "researcher_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_profile_account_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher_profile_publications" (
    "id" TEXT NOT NULL,
    "researcher_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT,
    "publication_year" INTEGER,
    "doi" TEXT,
    "authors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "researcher_profile_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher_profile_participations" (
    "id" TEXT NOT NULL,
    "researcher_profile_id" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "participation_role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
    "source_record_id" TEXT,
    "supersedes_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "researcher_profile_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher_profile_history" (
    "id" TEXT NOT NULL,
    "researcher_profile_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "before_facts" JSONB,
    "after_facts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_profile_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_credential_deliveries" (
    "id" TEXT NOT NULL,
    "researcher_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_credential_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "researcher_profile_account_links_researcher_profile_id_stat_idx" ON "researcher_profile_account_links"("researcher_profile_id", "status", "effective_until");

-- CreateIndex
CREATE INDEX "researcher_profile_account_links_user_id_status_effective_u_idx" ON "researcher_profile_account_links"("user_id", "status", "effective_until");

-- CreateIndex
CREATE INDEX "researcher_profile_publications_researcher_profile_id_statu_idx" ON "researcher_profile_publications"("researcher_profile_id", "status", "publication_year");

-- CreateIndex
CREATE INDEX "researcher_profile_participations_researcher_profile_id_sta_idx" ON "researcher_profile_participations"("researcher_profile_id", "status", "starts_on");

-- CreateIndex
CREATE INDEX "researcher_profile_participations_supersedes_id_idx" ON "researcher_profile_participations"("supersedes_id");

-- CreateIndex
CREATE INDEX "researcher_profile_history_researcher_profile_id_created_at_idx" ON "researcher_profile_history"("researcher_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "account_credential_deliveries_researcher_profile_id_created_idx" ON "account_credential_deliveries"("researcher_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "account_credential_deliveries_user_id_created_at_idx" ON "account_credential_deliveries"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "researcher_profile_account_links" ADD CONSTRAINT "researcher_profile_account_links_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_account_links" ADD CONSTRAINT "researcher_profile_account_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_account_links" ADD CONSTRAINT "researcher_profile_account_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_publications" ADD CONSTRAINT "researcher_profile_publications_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_participations" ADD CONSTRAINT "researcher_profile_participations_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_history" ADD CONSTRAINT "researcher_profile_history_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_profile_history" ADD CONSTRAINT "researcher_profile_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_credential_deliveries" ADD CONSTRAINT "account_credential_deliveries_researcher_profile_id_fkey" FOREIGN KEY ("researcher_profile_id") REFERENCES "researcher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_credential_deliveries" ADD CONSTRAINT "account_credential_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX researcher_profile_account_links_active_profile_key ON researcher_profile_account_links(researcher_profile_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX researcher_profile_account_links_active_user_key ON researcher_profile_account_links(user_id) WHERE status = 'ACTIVE';
ALTER TABLE researcher_profiles ADD CONSTRAINT researcher_profiles_profile_type_check CHECK (profile_type IN ('INTERNAL', 'EXTERNAL'));
UPDATE researcher_profiles p SET profile_type = 'EXTERNAL' FROM users u WHERE p.linked_user_id = u.id AND u.system_role = 'EXTERNAL_RESEARCHER_USER';
INSERT INTO researcher_profile_account_links(id, researcher_profile_id, user_id, status, effective_from, reason, created_by_id)
SELECT 'migration-' || id, id, linked_user_id, 'ACTIVE', CURRENT_TIMESTAMP, 'Existing link observed at migration; earlier linkage date unknown', updated_by_id FROM researcher_profiles WHERE linked_user_id IS NOT NULL;
CREATE FUNCTION preserve_researcher_profile_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Researcher profile history is immutable'; END;
$$;
CREATE TRIGGER researcher_profile_history_immutable BEFORE UPDATE OR DELETE ON researcher_profile_history FOR EACH ROW EXECUTE FUNCTION preserve_researcher_profile_history();
