import { FilesInterceptor } from "@nestjs/platform-express";
import { buildContentDisposition } from "../modules/files/files.controller.js";
import { streamToBuffer } from "../modules/files/files.service.js";
import type { IntakeTemplateUpload } from "./proposal-intake-periods.service.js";
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors, UseGuards } from "@nestjs/common";
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

  @Get("options")
  async options(@Req() request: RequestWithCurrentUser) { return this.intakePeriodsService.options(request.currentUser!); }

  @Get()
  async listPeriods(@Req() request: RequestWithCurrentUser, @Query(listProposalIntakePeriodsQueryPipe) query: ListProposalIntakePeriodsQueryDto) {
    return { intakePeriods: await this.intakePeriodsService.listPeriods(request.currentUser!, query) };
  }

  @Post()
  @UseInterceptors(FilesInterceptor("files"))
  async createPeriod(@Req() request: RequestWithCurrentUser, @Body(createProposalIntakePeriodPipe) body: CreateProposalIntakePeriodDto, @UploadedFiles() files: IntakeTemplateUpload[] = []) {
    return { intakePeriod: await this.intakePeriodsService.createPeriod(request.currentUser!, body, files) };
  }

  @Patch(":id")
  @UseInterceptors(FilesInterceptor("files"))
  async updatePeriod(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateProposalIntakePeriodPipe) body: UpdateProposalIntakePeriodDto,
    @UploadedFiles() files: IntakeTemplateUpload[] = []
  ) {
    return { intakePeriod: await this.intakePeriodsService.updatePeriod(request.currentUser!, id, body, files) };
  }

  @Get(":id/templates/:fileId")
  async downloadTemplate(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Param("fileId") fileId: string, @Res() response: { setHeader(name: string, value: string): void; send(content: Buffer): void }) {
    const file = await this.intakePeriodsService.downloadTemplate(request.currentUser!, id, fileId);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", buildContentDisposition(file.fileName));
    response.send(await streamToBuffer(file.content));
  }

  @Post(":id/open")
  async openPeriod(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return { intakePeriod: await this.intakePeriodsService.openPeriod(request.currentUser!, id, body ?? {}) };
  }

  @Post(":id/close")
  async closePeriod(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return { intakePeriod: await this.intakePeriodsService.closePeriod(request.currentUser!, id, body ?? {}) };
  }
}
