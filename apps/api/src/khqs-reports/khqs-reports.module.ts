import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { KhqsReportsController } from "./khqs-reports.controller.js";
import { KhqsReportsService } from "./khqs-reports.service.js";

@Module({
  imports: [AuthModule],
  controllers: [KhqsReportsController],
  providers: [PrismaService, AuditLogService, KhqsReportsService]
})
export class KhqsReportsModule {}
