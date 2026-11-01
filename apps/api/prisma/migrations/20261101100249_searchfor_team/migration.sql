/*
  Warnings:

  - You are about to drop the `legacy_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `legacy_user_role_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "legacy_user_role_assignments" DROP CONSTRAINT "user_role_assignments_role_id_fkey";

-- DropForeignKey
ALTER TABLE "legacy_user_role_assignments" DROP CONSTRAINT "user_role_assignments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_attachments" DROP CONSTRAINT "proposal_attachments_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_decisions" DROP CONSTRAINT "proposal_decisions_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_evaluation_summaries" DROP CONSTRAINT "proposal_evaluation_summaries_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_members" DROP CONSTRAINT "proposal_members_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_review_assignments" DROP CONSTRAINT "proposal_review_assignments_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_reviews" DROP CONSTRAINT "proposal_reviews_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_reviews" DROP CONSTRAINT "proposal_reviews_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_submission_events" DROP CONSTRAINT "proposal_submission_events_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "proposal_supplement_requests" DROP CONSTRAINT "proposal_supplement_requests_proposal_id_fkey";

-- DropForeignKey
ALTER TABLE "researcher_profiles" DROP CONSTRAINT "researcher_profiles_linked_user_id_fkey";

-- DropIndex
DROP INDEX "proposal_review_assignments_submission_event_id_idx";

-- DropIndex
DROP INDEX "proposal_reviews_submission_event_id_idx";

-- AlterTable
ALTER TABLE "proposal_evaluation_summaries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "proposal_members" ALTER COLUMN "participation_role" SET DEFAULT 'TOPIC_MEMBER';

-- AlterTable
ALTER TABLE "proposal_review_assignments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "proposal_reviews" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "legacy_roles";

-- DropTable
DROP TABLE "legacy_user_role_assignments";

-- RenameForeignKey
ALTER TABLE "researcher_profile_expertise_keywords" RENAME CONSTRAINT "researcher_profile_expertise_keywords_profile_fkey" TO "researcher_profile_expertise_keywords_researcher_profile_i_fkey";

-- RenameForeignKey
ALTER TABLE "researcher_profile_fields" RENAME CONSTRAINT "researcher_profile_fields_profile_fkey" TO "researcher_profile_fields_researcher_profile_id_fkey";

-- AddForeignKey
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_members" ADD CONSTRAINT "proposal_members_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_attachments" ADD CONSTRAINT "proposal_attachments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_submission_events" ADD CONSTRAINT "proposal_submission_events_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_supplement_requests" ADD CONSTRAINT "proposal_supplement_requests_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_review_assignments" ADD CONSTRAINT "proposal_review_assignments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "proposal_reviews_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "proposal_reviews_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "proposal_review_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_evaluation_summaries" ADD CONSTRAINT "proposal_evaluation_summaries_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_decisions" ADD CONSTRAINT "proposal_decisions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "research_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "project_management_officers_officer_user_id_status_effective_un" RENAME TO "project_management_officers_officer_user_id_status_effectiv_idx";

-- RenameIndex
ALTER INDEX "project_management_officers_project_id_status_effective_until_i" RENAME TO "project_management_officers_project_id_status_effective_unt_idx";

-- RenameIndex
ALTER INDEX "proposal_management_officers_officer_user_id_status_effective_u" RENAME TO "proposal_management_officers_officer_user_id_status_effecti_idx";

-- RenameIndex
ALTER INDEX "proposal_management_officers_proposal_id_status_effective_until" RENAME TO "proposal_management_officers_proposal_id_status_effective_u_idx";

-- RenameIndex
ALTER INDEX "proposal_members_proposal_id_user_id_participation_role_status_" RENAME TO "proposal_members_proposal_id_user_id_participation_role_sta_idx";

-- RenameIndex
ALTER INDEX "researcher_profile_expertise_keywords_profile_key_key" RENAME TO "researcher_profile_expertise_keywords_researcher_profile_id_key";

-- RenameIndex
ALTER INDEX "researcher_profile_fields_profile_catalog_key" RENAME TO "researcher_profile_fields_researcher_profile_id_catalog_ite_key";

-- RenameIndex
ALTER INDEX "researcher_profiles_management_organization_unit_id_status_full" RENAME TO "researcher_profiles_management_organization_unit_id_status__idx";
