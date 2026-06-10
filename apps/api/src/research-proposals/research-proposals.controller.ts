import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { ResearchProposalsService } from "./research-proposals.service.js";

@Controller("api/v1/research-proposals")
@UseGuards(SessionAuthGuard)
export class ResearchProposalsController {
  constructor(private readonly proposalsService: ResearchProposalsService) {}

  @Get()
  async listProposals(@Req() request: RequestWithCurrentUser) {
    return { proposals: await this.proposalsService.listProposals(request.currentUser!) };
  }

  @Post()
  async createDraft(@Req() request: RequestWithCurrentUser, @Body() body: Record<string, unknown>) {
    return { proposal: await this.proposalsService.createDraft(request.currentUser!, body) };
  }

  @Get(":id")
  async getProposal(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { proposal: await this.proposalsService.getProposal(request.currentUser!, id) };
  }

  @Patch(":id")
  async updateDraft(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return { proposal: await this.proposalsService.updateDraft(request.currentUser!, id, body) };
  }

  @Get(":id/readiness")
  async getReadiness(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { readiness: await this.proposalsService.getReadiness(request.currentUser!, id) };
  }

  @Post(":id/submit")
  async submitProposal(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { proposal: await this.proposalsService.submitProposal(request.currentUser!, id) };
  }

  @Get(":id/history")
  async listHistory(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { history: await this.proposalsService.listHistory(request.currentUser!, id) };
  }
}
