import { Controller, Get, Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { ApprovalsModule } from "./approvals/approvals.module.js";
import { ApprovedProjectsModule } from "./approved-projects/approved-projects.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
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

@Controller("api/v1/health")
class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "DocManSystem API",
      timestamp: new Date().toISOString()
    };
  }
}

@Module({
  imports: [AuthModule, AdminModule, ApprovalsModule, ApprovedProjectsModule, DashboardModule, FilesModule, KhqsReportsModule, NotificationsModule, ProposalIntakePeriodsModule, ResearchProposalsModule, ProposalEvaluationsModule, ResearcherProfilesModule, RegistrationModule, ScientificDocumentsModule, StudentResearchModule],
  controllers: [HealthController]
})
export class AppModule {}
