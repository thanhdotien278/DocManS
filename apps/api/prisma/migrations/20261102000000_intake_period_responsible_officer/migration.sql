-- AlterTable
ALTER TABLE "proposal_intake_periods" ADD COLUMN     "responsible_officer_assigned_at" TIMESTAMP(3),
ADD COLUMN     "responsible_officer_assigned_by_id" TEXT,
ADD COLUMN     "responsible_officer_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "proposal_intake_periods" ADD CONSTRAINT "proposal_intake_periods_responsible_officer_user_id_fkey" FOREIGN KEY ("responsible_officer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

