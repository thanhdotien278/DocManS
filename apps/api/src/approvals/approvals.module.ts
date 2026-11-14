import { Module } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ApprovalRoutingController } from "./approval-routing.controller.js";
import { ApprovalRoutingService } from "./approval-routing.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ApprovalRoutingController],
  providers: [PrismaService, AuditLogService, ApprovalRoutingService]
})
export class ApprovalsModule {}
