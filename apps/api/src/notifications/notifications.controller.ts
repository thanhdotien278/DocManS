import { Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("api/v1/notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: RequestWithCurrentUser, @Query("limit") limit?: string) {
    const parsed = Number.parseInt(limit ?? "", 10);
    return this.notifications.list(request.currentUser!, Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 200) : 50);
  }

  @Post("read-all")
  readAll(@Req() request: RequestWithCurrentUser) {
    return this.notifications.markAllRead(request.currentUser!);
  }

  @Post(":id/read")
  read(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return this.notifications.markRead(request.currentUser!, id);
  }
}
