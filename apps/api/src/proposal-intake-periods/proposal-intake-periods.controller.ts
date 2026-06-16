import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import {
  createProposalIntakePeriodPipe,
  listProposalIntakePeriodsQueryPipe,
  updateProposalIntakePeriodPipe,
  type CreateProposalIntakePeriodDto,
  type ListProposalIntakePeriodsQueryDto,
  type UpdateProposalIntakePeriodDto
} from "./proposal-intake-periods.dto.js";
import { ProposalIntakePeriodsService } from "./proposal-intake-periods.service.js";

@Controller("api/v1/proposal-intake-periods")
@UseGuards(SessionAuthGuard)
export class ProposalIntakePeriodsController {
  constructor(private readonly intakePeriodsService: ProposalIntakePeriodsService) {}

  @Get()
  async listPeriods(@Req() request: RequestWithCurrentUser, @Query(listProposalIntakePeriodsQueryPipe) query: ListProposalIntakePeriodsQueryDto) {
    return { intakePeriods: await this.intakePeriodsService.listPeriods(request.currentUser!, query) };
  }

  @Post()
  async createPeriod(@Req() request: RequestWithCurrentUser, @Body(createProposalIntakePeriodPipe) body: CreateProposalIntakePeriodDto) {
    return { intakePeriod: await this.intakePeriodsService.createPeriod(request.currentUser!, body) };
  }

  @Patch(":id")
  async updatePeriod(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateProposalIntakePeriodPipe) body: UpdateProposalIntakePeriodDto
  ) {
    return { intakePeriod: await this.intakePeriodsService.updatePeriod(request.currentUser!, id, body) };
  }

  @Post(":id/open")
  async openPeriod(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { intakePeriod: await this.intakePeriodsService.openPeriod(request.currentUser!, id) };
  }

  @Post(":id/close")
  async closePeriod(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { intakePeriod: await this.intakePeriodsService.closePeriod(request.currentUser!, id) };
  }
}
