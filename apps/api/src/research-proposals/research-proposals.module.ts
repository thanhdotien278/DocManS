import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ResearchProposalsController } from "./research-proposals.controller.js";
import { ResearchProposalsService } from "./research-proposals.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ResearchProposalsController],
  providers: [ResearchProposalsService, AuditLogService, PrismaService]
})
export class ResearchProposalsModule {}
