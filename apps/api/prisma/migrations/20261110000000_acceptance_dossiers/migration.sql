-- Story 6.8 (D-033, D-034): hồ sơ nghiệm thu gắn đề tài đã duyệt và các phiên bản đã nộp (bất biến).
-- CreateTable
CREATE TABLE "acceptance_dossiers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sections" JSONB NOT NULL,
    "source_context" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "submitted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_dossier_submissions" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "actor_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_dossier_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_dossiers_project_id_key" ON "acceptance_dossiers"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_dossier_submissions_dossier_id_version_key" ON "acceptance_dossier_submissions"("dossier_id", "version");

-- AddForeignKey
ALTER TABLE "acceptance_dossiers" ADD CONSTRAINT "acceptance_dossiers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_dossiers" ADD CONSTRAINT "acceptance_dossiers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_dossiers" ADD CONSTRAINT "acceptance_dossiers_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_dossier_submissions" ADD CONSTRAINT "acceptance_dossier_submissions_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "acceptance_dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_dossier_submissions" ADD CONSTRAINT "acceptance_dossier_submissions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
