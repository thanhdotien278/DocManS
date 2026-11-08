import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ProposalManagementOfficerService } from "../proposals-shared/proposal-management-officer.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [PrismaService, ProposalParticipationService, ProposalReviewAccessService, ProposalManagementOfficerService, NotificationsService]
})
export class NotificationsModule {}
