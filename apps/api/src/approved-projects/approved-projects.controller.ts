import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { assignProjectOfficerPipe, createProjectPipe, projectDecisionPipe, projectFundingPipe, projectLiquidationPipe, projectMutationPipe, projectReportPipe, projectReportReviewPipe, projectReportSubmissionPipe, projectRequestPipe, projectWithdrawPipe, readRequestType, revokeProjectOfficerPipe } from "./approved-projects.dto.js";
import { ApprovedProjectsService } from "./approved-projects.service.js";

function filters(value: Record<string, string>) {
  const parse = (input?: string) => input === undefined ? undefined : input === "true" ? true : input === "false" ? false : (() => { throw new BadRequestException({ message: "Bộ lọc không hợp lệ." }); })();
  return { overdue: parse(value.overdue), approaching: parse(value.approaching) };
}

@Controller("api/v1/projects")
@UseGuards(SessionAuthGuard)
export class ApprovedProjectsController {
  constructor(private readonly projects: ApprovedProjectsService) {}

  @Get()
  async list(@Req() req: RequestWithCurrentUser, @Query() query: Record<string, string>) { return { projects: await this.projects.listProjects(req.currentUser!, filters(query)) }; }

  @Get("funding/summary")
  async fundingSummary(@Req() req: RequestWithCurrentUser) { return { summary: await this.projects.fundingSummary(req.currentUser!) }; }

  @Get("monitor")
  async monitor(@Req() req: RequestWithCurrentUser, @Query() query: Record<string, string>) { return { projects: await this.projects.listMonitoring(req.currentUser!, filters(query)) }; }

  @Post()
  async create(@Req() req: RequestWithCurrentUser, @Body(createProjectPipe) body: any) { return { project: await this.projects.createFromApprovedProposal(req.currentUser!, body.proposalId, body) }; }

  @Get(":id")
  async detail(@Req() req: RequestWithCurrentUser, @Param("id") id: string) { return { project: await this.projects.getProject(req.currentUser!, id) }; }

  @Get(":id/officer-candidates")
  async candidates(@Req() req: RequestWithCurrentUser, @Param("id") id: string) { return { users: await this.projects.listOfficerCandidates(req.currentUser!, id) }; }

  @Post(":id/officer")
  async assign(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(assignProjectOfficerPipe) body: any) { return { officer: await this.projects.assignOfficer(req.currentUser!, id, body) }; }

  @Post(":id/officer/revoke")
  async revoke(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(revokeProjectOfficerPipe) body: any) { return { officer: await this.projects.revokeOfficer(req.currentUser!, id, body) }; }

  @Post(":id/setup")
  async setup(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body() body: any) { return { setup: await this.projects.configureSetup(req.currentUser!, id, body ?? {}) }; }

  @Post(":id/setup/confirm")
  async confirm(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(projectMutationPipe) body: any) { return { project: await this.projects.confirmSetup(req.currentUser!, id, body) }; }

  @Post(":id/reports")
  async draftReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(projectReportPipe) body: any) { return { report: await this.projects.createReportDraft(req.currentUser!, id, body) }; }

  @Patch(":id/reports/:reportId")
  async editReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("reportId") reportId: string, @Body(projectReportPipe) body: any) { return { report: await this.projects.updateReportDraft(req.currentUser!, id, { ...body, reportId }) }; }

  @Post(":id/reports/:reportId/submit")
  async submitReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("reportId") reportId: string, @Body(projectReportSubmissionPipe) body: any) { return { report: await this.projects.submitReport(req.currentUser!, id, { ...body, reportId }) }; }

  @Post(":id/reports/:reportId/review")
  async reviewReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("reportId") reportId: string, @Body(projectDecisionPipe) body: any) { return { report: await this.projects.reviewReport(req.currentUser!, id, { ...body, reportId }) }; }

  @Post(":id/reports/:reportId/supplement")
  async supplementReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("reportId") reportId: string, @Body(projectReportReviewPipe) body: any) { return { report: await this.projects.requestReportSupplement(req.currentUser!, id, { ...body, reportId }) }; }

  @Post(":id/reports/:reportId/accept")
  async acceptReport(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("reportId") reportId: string, @Body(projectDecisionPipe) body: any) { return { report: await this.projects.acceptReport(req.currentUser!, id, { ...body, reportId }) }; }

  @Post(":id/requests/:type")
  async draftRequest(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Body(projectRequestPipe) body: any) { const kind = readRequestType(type); return { request: kind === "adjustment" ? await this.projects.createAdjustment(req.currentUser!, id, body) : await this.projects.createExtension(req.currentUser!, id, body) }; }

  @Patch(":id/requests/:type/:requestId")
  async editRequest(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectRequestPipe) body: any) { return { request: await this.projects.editRequestDraft(req.currentUser!, id, readRequestType(type), { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/submit")
  async submitRequest(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectReportSubmissionPipe) body: any) { return { request: await this.projects.submitRequest(req.currentUser!, id, readRequestType(type), { ...body, requestId }) }; }

  @Post(":id/requests/adjustment/:requestId/review")
  async reviewAdjustment(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.reviewAdjustment(req.currentUser!, id, { ...body, requestId }) }; }

  @Post(":id/requests/extension/:requestId/validate")
  async validateExtension(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.validateExtension(req.currentUser!, id, { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/prepare")
  async prepare(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.prepareRequest(req.currentUser!, id, readRequestType(type), { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/supplement")
  async supplementRequest(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.requestSupplement(req.currentUser!, id, readRequestType(type), { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/approve")
  async approve(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.decideRequest(req.currentUser!, id, readRequestType(type), "approve", { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/reject")
  async reject(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectDecisionPipe) body: any) { return { request: await this.projects.decideRequest(req.currentUser!, id, readRequestType(type), "reject", { ...body, requestId }) }; }

  @Post(":id/requests/:type/:requestId/withdraw")
  async withdraw(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("type") type: string, @Param("requestId") requestId: string, @Body(projectWithdrawPipe) body: any) { return { request: await this.projects.withdrawRequest(req.currentUser!, id, readRequestType(type), { ...body, requestId }) }; }

  @Get(":id/funding")
  async funding(@Req() req: RequestWithCurrentUser, @Param("id") id: string) { return { funding: await this.projects.getFunding(req.currentUser!, id) }; }

  @Post(":id/funding")
  async recordFunding(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(projectFundingPipe) body: any) { return { funding: await this.projects.recordFunding(req.currentUser!, id, body) }; }

  @Post(":id/liquidation")
  async submitLiquidation(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Body(projectLiquidationPipe) body: any) { return { liquidation: await this.projects.submitLiquidation(req.currentUser!, id, body) }; }

  @Post(":id/liquidation/:liquidationId/approve")
  async approveLiquidation(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("liquidationId") liquidationId: string, @Body(projectDecisionPipe) body: any) { return { liquidation: await this.projects.decideLiquidation(req.currentUser!, id, "approve", { ...body, liquidationId }) }; }

  @Post(":id/liquidation/:liquidationId/reject")
  async rejectLiquidation(@Req() req: RequestWithCurrentUser, @Param("id") id: string, @Param("liquidationId") liquidationId: string, @Body(projectDecisionPipe) body: any) { return { liquidation: await this.projects.decideLiquidation(req.currentUser!, id, "reject", { ...body, liquidationId }) }; }
}
