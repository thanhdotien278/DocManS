import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { buildContentDisposition } from "../modules/files/files.controller.js";
import { sendObjectContent, type ObjectContentResponse } from "../modules/files/send-object-content.js";
import { uploadInterceptorOptions } from "../modules/files/upload-limits.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import {
  closeTopicPipe, createPeriodPipe, createTopicPipe, studentProfilePipe, documentPurposePipe, memberPipe, rejectTopicPipe, topicDeadlinePipe, topicFilePurposePipe, updatePeriodPipe, updateTopicPipe,
  type CreateTopicDto, type DocumentPurpose, type PeriodDto, type StudentProfileDto, type TopicDto, type TopicFilePurpose, type UpdatePeriodDto
} from "./student-research.dto.js";
import { StudentResearchService, type StudentResearchUpload } from "./student-research.service.js";

// Enforced while the body streams in, so an oversized upload is never buffered in memory.
const SINGLE_FILE = () => FileInterceptor("file", uploadInterceptorOptions());

@Controller("api/v1/student-research")
@UseGuards(SessionAuthGuard)
export class StudentResearchController {
  constructor(private readonly service: StudentResearchService) {}

  @Get()
  overview(@Req() request: RequestWithCurrentUser) { return this.service.overview(request.currentUser!); }

  @Get("profile")
  profile(@Req() request: RequestWithCurrentUser) { return this.service.getProfile(request.currentUser!); }

  @Put("profile")
  saveProfile(@Req() request: RequestWithCurrentUser, @Body(studentProfilePipe) body: StudentProfileDto) { return this.service.saveProfile(request.currentUser!, body); }

  @Get("officer-candidates")
  async officerCandidates(@Req() request: RequestWithCurrentUser) { return { users: await this.service.officerCandidates(request.currentUser!) }; }

  @Post("periods")
  createPeriod(@Req() request: RequestWithCurrentUser, @Body(createPeriodPipe) body: PeriodDto) { return this.service.createPeriod(request.currentUser!, body); }

  @Patch("periods/:id")
  updatePeriod(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updatePeriodPipe) body: UpdatePeriodDto) { return this.service.updatePeriod(request.currentUser!, id, body); }

  @Post("periods/:id/templates")
  @UseInterceptors(SINGLE_FILE())
  uploadTemplate(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(documentPurposePipe) purpose: DocumentPurpose, @UploadedFile() file?: StudentResearchUpload) {
    return this.service.uploadTemplate(request.currentUser!, id, purpose, file);
  }

  @Post("topics")
  @UseInterceptors(SINGLE_FILE())
  createTopic(@Req() request: RequestWithCurrentUser, @Body(createTopicPipe) body: CreateTopicDto, @UploadedFile() file?: StudentResearchUpload) {
    return this.service.createTopic(request.currentUser!, body, file);
  }

  @Patch("topics/:id")
  updateTopic(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateTopicPipe) body: TopicDto) { return this.service.updateTopic(request.currentUser!, id, body); }

  @Post("topics/:id/members")
  addMember(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(memberPipe) body: { identifier: string }) { return this.service.addMember(request.currentUser!, id, body.identifier); }

  @Delete("topics/:id/members/:memberId")
  removeMember(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Param("memberId") memberId: string) { return this.service.removeMember(request.currentUser!, id, memberId); }

  @Post("topics/:id/approve")
  approve(@Req() request: RequestWithCurrentUser, @Param("id") id: string) { return this.service.decide(request.currentUser!, id, { approve: true }); }

  @Post("topics/:id/reject")
  reject(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(rejectTopicPipe) body: { reason: string }) { return this.service.decide(request.currentUser!, id, { approve: false, reason: body.reason }); }

  @Patch("topics/:id/deadline")
  setDeadline(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(topicDeadlinePipe) body: { deadlineOverride: Date | null }) { return this.service.setTopicDeadline(request.currentUser!, id, body.deadlineOverride); }

  @Post("topics/:id/close")
  close(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(closeTopicPipe) body: { score: number; award: string | null }) { return this.service.closeTopic(request.currentUser!, id, body); }

  @Post("topics/:id/files")
  @UseInterceptors(SINGLE_FILE())
  uploadTopicFile(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(topicFilePurposePipe) purpose: TopicFilePurpose, @UploadedFile() file?: StudentResearchUpload) {
    return this.service.uploadTopicFile(request.currentUser!, id, purpose, file);
  }

  @Get("files/:fileId")
  async download(@Req() request: RequestWithCurrentUser, @Param("fileId") fileId: string, @Res() response: ObjectContentResponse) {
    const file = await this.service.download(request.currentUser!, fileId);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", buildContentDisposition(file.fileName));
    await sendObjectContent(response, file.content);
  }
}
