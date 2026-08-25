import { Controller, Get, Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { FilesModule } from "./modules/files/files.module.js";
import { ProposalEvaluationsModule } from "./proposal-evaluations/proposal-evaluations.module.js";
import { ProposalIntakePeriodsModule } from "./proposal-intake-periods/proposal-intake-periods.module.js";
import { ResearchProposalsModule } from "./research-proposals/research-proposals.module.js";
import { DelegationsModule } from "./delegations/delegations.module.js";
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
  imports: [AuthModule, AdminModule, FilesModule, ProposalIntakePeriodsModule, ResearchProposalsModule, ProposalEvaluationsModule, DelegationsModule, ResearcherProfilesModule],
  controllers: [HealthController]
})
export class AppModule {}
