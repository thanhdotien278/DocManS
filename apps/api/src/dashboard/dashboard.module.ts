import { Module } from "@nestjs/common";
import { ApprovedProjectsModule } from "../approved-projects/approved-projects.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ResearchProposalsModule } from "../research-proposals/research-proposals.module.js";
import { DashboardAnalyticsService } from "./dashboard-analytics.service.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardExportService } from "./dashboard-export.service.js";
import { DashboardService } from "./dashboard.service.js";
import { ProjectHealthSnapshotService } from "./project-health-snapshot.service.js";

@Module({
  imports: [AuthModule, ApprovedProjectsModule, ResearchProposalsModule],
  controllers: [DashboardController],
  providers: [
    PrismaService,
    AuditLogService,
    ProjectHealthSnapshotService,
    DashboardService,
    DashboardAnalyticsService,
    DashboardExportService
  ],
  exports: [
    ProjectHealthSnapshotService,
    DashboardService,
    DashboardAnalyticsService,
    DashboardExportService
  ]
})
export class DashboardModule {}
