import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { ResearchProposalsService } from "./research-proposals.service.js";

@Controller("api/v1/research-proposals")
@UseGuards(SessionAuthGuard)
export class ProposalAttachmentsController {
  constructor(private readonly proposalsService: ResearchProposalsService) {}

  @Get(":id/attachments")
  async listAttachments(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { attachments: await this.proposalsService.listAttachments(request.currentUser!, id) };
  }

  @Post(":id/attachments")
  async createAttachment(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return { attachment: await this.proposalsService.createAttachment(request.currentUser!, id, body) };
  }
}
