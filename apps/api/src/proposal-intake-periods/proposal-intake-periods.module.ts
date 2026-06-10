import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ProposalIntakePeriodsController } from "./proposal-intake-periods.controller.js";
import { ProposalIntakePeriodsService } from "./proposal-intake-periods.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ProposalIntakePeriodsController],
  providers: [ProposalIntakePeriodsService, AuditLogService, PrismaService],
  exports: [ProposalIntakePeriodsService]
})
export class ProposalIntakePeriodsModule {}
