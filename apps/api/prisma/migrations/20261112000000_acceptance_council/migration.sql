-- Story 6.9 (D-034): thành viên hội đồng nghiệm thu gắn đề tài đã duyệt.
-- CreateTable
CREATE TABLE "acceptance_council_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "council_role" TEXT NOT NULL,
    "invitation_status" TEXT NOT NULL DEFAULT 'invited',
    "decline_reason" TEXT,
    "revoke_reason" TEXT,
    "invited_by_id" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "council_established_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_council_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acceptance_council_members_project_id_idx" ON "acceptance_council_members"("project_id");

-- CreateIndex
CREATE INDEX "acceptance_council_members_user_id_idx" ON "acceptance_council_members"("user_id");

-- AddForeignKey
ALTER TABLE "acceptance_council_members" ADD CONSTRAINT "acceptance_council_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "approved_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_council_members" ADD CONSTRAINT "acceptance_council_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_council_members" ADD CONSTRAINT "acceptance_council_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
