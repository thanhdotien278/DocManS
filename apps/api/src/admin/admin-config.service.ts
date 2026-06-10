import { Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readCode, readText } from "./admin-access.js";

type SystemParameterInput = {
  key?: unknown;
  value?: unknown;
  label?: unknown;
};

type NotificationTemplateInput = {
  key?: unknown;
  subject?: unknown;
  body?: unknown;
};

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async listSystemParameters() {
    return this.prisma.systemParameter.findMany({
      orderBy: { key: "asc" }
    });
  }

  async updateSystemParameter(actor: SafeUserContext, input: SystemParameterInput) {
    const key = readCode(input.key, "key");
    const value = readText(input.value, "value", 1000);
    const label = readText(input.label, "label");

    const parameter = await this.prisma.systemParameter.upsert({
      where: { key },
      update: { value, label },
      create: { key, value, label }
    });

    await this.auditLog.record({
      action: "update-system-parameter",
      result: "success",
      actorId: actor.id,
      targetEntity: "system-parameter",
      targetEntityId: parameter.id,
      username: actor.username
    });

    return parameter;
  }

  async listNotificationTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { key: "asc" }
    });
  }

  async updateNotificationTemplate(actor: SafeUserContext, input: NotificationTemplateInput) {
    const key = readCode(input.key, "key");
    const subject = readText(input.subject, "subject", 200);
    const body = readText(input.body, "body", 4000);

    const template = await this.prisma.notificationTemplate.upsert({
      where: { key },
      update: { subject, body, status: "active" },
      create: { key, subject, body, status: "active" }
    });

    await this.auditLog.record({
      action: "update-notification-template",
      result: "success",
      actorId: actor.id,
      targetEntity: "notification-template",
      targetEntityId: template.id,
      username: actor.username
    });

    return template;
  }
}
