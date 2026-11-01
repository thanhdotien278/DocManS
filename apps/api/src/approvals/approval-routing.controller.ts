import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards, type PipeTransform } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { ApprovalStage } from "../proposals-shared/approval-routing.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { ApprovalRoutingService } from "./approval-routing.service.js";

type ApprovalActionBody = { expectedStage: ApprovalStage; note: unknown };

const STAGES = ["BOARD_REVIEW", "HEAD_REVIEW", "LEADERSHIP"];

/** `expectedStage` là bước người dùng đang xem; thiếu thì từ chối (không xử lý theo context không rõ). */
export const approvalActionPipe: PipeTransform<unknown, ApprovalActionBody> = {
  transform(value) {
    const body = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    if (typeof body.expectedStage !== "string" || !STAGES.includes(body.expectedStage)) throw new BadRequestException({ code: "APPROVAL_CONTEXT_REQUIRED", message: "Thiếu bước tờ trình đang xem." });
    return { expectedStage: body.expectedStage as ApprovalStage, note: body.note };
  }
};

/** Tờ trình qua Phòng KHQS theo hồ sơ nguồn. Hàng chờ/inbox thuộc Story 11.6. */
@Controller("api/v1/approval-submissions")
@UseGuards(SessionAuthGuard)
export class ApprovalRoutingController {
  constructor(private readonly routing: ApprovalRoutingService) {}

  @Get("subject")
  async forSubject(@Req() request: RequestWithCurrentUser, @Query("type") type: string, @Query("id") id: string) {
    return this.routing.forSubject(request.currentUser!, type, id);
  }

  @Post(":id/advance")
  async advance(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(approvalActionPipe) body: ApprovalActionBody) {
    return { submission: await this.routing.advance(request.currentUser!, id, body) };
  }

  @Post(":id/return")
  async returnToAuthor(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(approvalActionPipe) body: ApprovalActionBody) {
    return { submission: await this.routing.returnToAuthor(request.currentUser!, id, body) };
  }
}
