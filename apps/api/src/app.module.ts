import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AdminModule } from "./admin/admin.module.js";
import { ApprovalsModule } from "./approvals/approvals.module.js";
import { ApprovedProjectsModule } from "./approved-projects/approved-projects.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ConferencesModule } from "./conferences/conferences.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { HealthController } from "./infrastructure/health/health.controller.js";
import { MinioObjectStorageService } from "./infrastructure/minio/minio-object-storage.service.js";
import { AppExceptionFilter } from "./infrastructure/observability/app-exception.filter.js";
import { PrismaService } from "./infrastructure/prisma/prisma.service.js";
import { FilesModule } from "./modules/files/files.module.js";
import { KhqsReportsModule } from "./khqs-reports/khqs-reports.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { ProposalEvaluationsModule } from "./proposal-evaluations/proposal-evaluations.module.js";
import { RegistrationModule } from "./registration/registration.module.js";
import { ProposalIntakePeriodsModule } from "./proposal-intake-periods/proposal-intake-periods.module.js";
import { ResearchProposalsModule } from "./research-proposals/research-proposals.module.js";
import { StudentResearchModule } from "./student-research/student-research.module.js";
import { ScientificDocumentsModule } from "./scientific-documents/scientific-documents.module.js";
import { ResearcherProfilesModule } from "./researcher-profiles/researcher-profiles.module.js";

@Module({
  imports: [AuthModule, AdminModule, ApprovalsModule, ApprovedProjectsModule, ConferencesModule, DashboardModule, FilesModule, KhqsReportsModule, NotificationsModule, ProposalIntakePeriodsModule, ResearchProposalsModule, ProposalEvaluationsModule, ResearcherProfilesModule, RegistrationModule, ScientificDocumentsModule, StudentResearchModule],
  controllers: [HealthController],
  providers: [PrismaService, MinioObjectStorageService, { provide: APP_FILTER, useClass: AppExceptionFilter }]
})
export class AppModule {}
