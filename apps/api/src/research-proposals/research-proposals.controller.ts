import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import {
  createResearchProposalDraftPipe,
  requestProposalSupplementPipe,
  proposalMutationPipe,
  assignProposalManagementOfficerPipe,
  revokeProposalManagementOfficerPipe,
  type AssignProposalManagementOfficerDto,
  type RevokeProposalManagementOfficerDto,
  updateResearchProposalDraftPipe,
  type CreateResearchProposalDraftDto,
  type RequestProposalSupplementDto,
  type UpdateResearchProposalDraftDto,
  type ProposalMutationDto
} from "./research-proposals.dto.js";
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
  async createDraft(@Req() request: RequestWithCurrentUser, @Body(createResearchProposalDraftPipe) body: CreateResearchProposalDraftDto) {
    return { proposal: await this.proposalsService.createDraft(request.currentUser!, body) };
  }

  @Get("catalogs")
  async catalogs() {
    return { items: await this.proposalsService.listCatalogs() };
  }

  @Get(":id")
  async getProposal(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { proposal: await this.proposalsService.getProposal(request.currentUser!, id) };
  }

  @Patch(":id")
  async updateDraft(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateResearchProposalDraftPipe) body: UpdateResearchProposalDraftDto
  ) {
    return { proposal: await this.proposalsService.updateDraft(request.currentUser!, id, body) };
  }

  @Get(":id/readiness")
  async getReadiness(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { readiness: await this.proposalsService.getReadiness(request.currentUser!, id) };
  }

  @Post(":id/submit")
  async submitProposal(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(proposalMutationPipe) body: ProposalMutationDto) {
    return { proposal: await this.proposalsService.submitProposal(request.currentUser!, id, body) };
  }

  @Post(":id/supplement-requests")
  async requestSupplement(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(requestProposalSupplementPipe) body: RequestProposalSupplementDto
  ) {
    return { proposal: await this.proposalsService.requestSupplement(request.currentUser!, id, body) };
  }

  @Post(":id/checks/complete")
  async completeCheck(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return { proposal: await this.proposalsService.completeCheck(request.currentUser!, id, body ?? {}) };
  }

  @Post(":id/resubmit")
  async resubmitProposal(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(proposalMutationPipe) body: ProposalMutationDto) {
    return { proposal: await this.proposalsService.resubmitProposal(request.currentUser!, id, body) };
  }

  @Get(":id/history")
  async listHistory(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { history: await this.proposalsService.listHistory(request.currentUser!, id) };
  }

  @Get(":id/management-officer-candidates")
  async managementOfficerCandidates(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { users: await this.proposalsService.listManagementOfficerCandidates(request.currentUser!, id) };
  }

  @Post(":id/management-officer")
  async assignManagementOfficer(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(assignProposalManagementOfficerPipe) body: AssignProposalManagementOfficerDto
  ) {
    return { managementOfficer: await this.proposalsService.assignManagementOfficer(request.currentUser!, id, body) };
  }

  @Post(":id/management-officer/revoke")
  async revokeManagementOfficer(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(revokeProposalManagementOfficerPipe) body: RevokeProposalManagementOfficerDto
  ) {
    return { managementOfficer: await this.proposalsService.revokeManagementOfficer(request.currentUser!, id, body) };
  }
}
