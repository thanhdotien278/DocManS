import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { assertSystemAdmin, type RequestWithCurrentUser } from "./admin-access.js";
import { adminRequestPipe } from "./admin-request.pipe.js";
import { AdminConfigService } from "./admin-config.service.js";

const systemParameterPipe = adminRequestPipe({
  key: { maxLength: 80 },
  value: { maxLength: 1000 },
  label: { maxLength: 160 }
});
const notificationTemplatePipe = adminRequestPipe({
  key: { maxLength: 80 },
  subject: { maxLength: 200 },
  body: { maxLength: 4000 }
});

@Controller("api/v1/config")
@UseGuards(SessionAuthGuard)
export class AdminConfigController {
  constructor(private readonly configService: AdminConfigService) {}

  @Get("system-parameters")
  async listSystemParameters(@Req() request: RequestWithCurrentUser) {
    assertSystemAdmin(request.currentUser);
    return { parameters: await this.configService.listSystemParameters() };
  }

  @Put("system-parameters")
  async updateSystemParameter(@Req() request: RequestWithCurrentUser, @Body(systemParameterPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { parameter: await this.configService.updateSystemParameter(actor, body as Record<string, unknown>) };
  }

  @Get("notification-templates")
  async listNotificationTemplates(@Req() request: RequestWithCurrentUser) {
    assertSystemAdmin(request.currentUser);
    return { templates: await this.configService.listNotificationTemplates() };
  }

  @Put("notification-templates")
  async updateNotificationTemplate(@Req() request: RequestWithCurrentUser, @Body(notificationTemplatePipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { template: await this.configService.updateNotificationTemplate(actor, body as Record<string, unknown>) };
  }
}
