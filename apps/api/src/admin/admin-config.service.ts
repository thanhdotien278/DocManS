import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  COUNCIL_FORMATION_SELECTABLE_ROLES,
  COUNCIL_MEMBER_COUNT_RANGE,
  COUNCIL_ROLE_LABELS,
  COUNCIL_TYPES,
  COUNCIL_TYPE_LABELS,
  councilFormationKey,
  DEFAULT_COUNCIL_FORMATION,
  isCouncilType,
  parseCouncilFormationValue,
  type CouncilType
} from "../proposals-shared/council-formation.js";
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

const SYSTEM_PARAMETER_RULES = {
  session_timeout_minutes: {
    validate(value: string) {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 15 || parsed > 1440) {
        throw new BadRequestException({ message: "value phải là số phút từ 15 đến 1440." });
      }

      return String(parsed);
    }
  }
} as const;

const NOTIFICATION_TEMPLATE_RULES = {
  user_created: {
    placeholders: new Set(["username", "displayName"])
  },
  researcher_account_activation: {
    placeholders: new Set(["displayName", "activationUrl", "expiresAt"])
  }
} as const;

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
    const councilType = key.startsWith("council_formation.") ? key.slice("council_formation.".length) : undefined;
    if (councilType !== undefined) {
      if (!isCouncilType(councilType)) throw new BadRequestException({ message: "key không thuộc tham số phase 1 được hỗ trợ." });
      const parsed = parseCouncilFormationValue(councilType, readText(input.value, "value", 1000));
      readText(input.label, "label");
      return this.saveCouncilFormation(actor, councilType, parsed);
    }
    const value = this.readSystemParameterValue(key, input.value);
    const label = readText(input.label, "label");

    return this.prisma.$transaction(async (tx) => {
      const parameter = await tx.systemParameter.upsert({
        where: { key },
        update: { value, label },
        create: { key, value, label }
      });

      await this.auditLog.record(
        {
          action: "update-system-parameter",
          result: "success",
          actorId: actor.id,
          targetEntity: "system-parameter",
          targetEntityId: parameter.id,
          username: actor.username
        },
        tx
      );

      return parameter;
    });
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
    this.validateTemplatePlaceholders(key, subject, body);

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.notificationTemplate.upsert({
        where: { key },
        update: { subject, body },
        create: { key, subject, body, status: "active" }
      });

      await this.auditLog.record(
        {
          action: "update-notification-template",
          result: "success",
          actorId: actor.id,
          targetEntity: "notification-template",
          targetEntityId: template.id,
          username: actor.username
        },
        tx
      );

      return template;
    });
  }

  private readSystemParameterValue(key: string, value: unknown) {
    const rule = SYSTEM_PARAMETER_RULES[key as keyof typeof SYSTEM_PARAMETER_RULES];
    if (!rule) {
      throw new BadRequestException({ message: "key không thuộc tham số phase 1 được hỗ trợ." });
    }

    return rule.validate(readText(value, "value", 1000));
  }

  async listCouncilFormation() {
    const rows = await this.prisma.systemParameter.findMany({ where: { key: { startsWith: "council_formation." } } });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return {
      configs: COUNCIL_TYPES.map((type) => toCouncilConfigView(type, byKey.get(councilFormationKey(type)))),
      selectableRoles: COUNCIL_FORMATION_SELECTABLE_ROLES.map((code) => ({ code, label: COUNCIL_ROLE_LABELS[code] }))
    };
  }

  async updateCouncilFormation(actor: SafeUserContext, councilType: string, input: { allowedRoles?: unknown; memberCount?: unknown }) {
    if (!isCouncilType(councilType)) throw new NotFoundException({ message: "Loại hội đồng không tồn tại." });
    const parsed = parseCouncilFormationValue(councilType, { allowedRoles: input?.allowedRoles, memberCount: input?.memberCount });
    return { config: toCouncilConfigView(councilType, await this.saveCouncilFormation(actor, councilType, parsed)) };
  }

  private async saveCouncilFormation(actor: SafeUserContext, type: CouncilType, parsed: { allowedRoles: string[]; memberCount: number }) {
    const key = councilFormationKey(type);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.systemParameter.findUnique({ where: { key } });
      const value = JSON.stringify(parsed);
      const label = `Cấu hình thành lập ${COUNCIL_TYPE_LABELS[type]}`;
      const row = await tx.systemParameter.upsert({ where: { key }, update: { value, label }, create: { key, value, label } });
      await this.auditLog.record(
        {
          action: "update-council-formation-config",
          result: "success",
          actorId: actor.id,
          targetEntity: "system-parameter",
          targetEntityId: row.id,
          username: actor.username,
          beforeFacts: { councilType: type, ...(before ? safeParse(type, before.value) : { allowedRoles: DEFAULT_ROLES(type), memberCount: DEFAULT_COUNT(type) }) },
          afterFacts: { councilType: type, ...parsed }
        },
        tx
      );
      return row;
    });
  }

  private validateTemplatePlaceholders(key: string, subject: string, body: string) {
    const rule = NOTIFICATION_TEMPLATE_RULES[key as keyof typeof NOTIFICATION_TEMPLATE_RULES];
    if (!rule) {
      throw new BadRequestException({ message: "key không thuộc mẫu thông báo phase 1 được hỗ trợ." });
    }

    for (const field of [
      ["subject", subject],
      ["body", body]
    ] as const) {
      const invalid = findUnsupportedPlaceholders(field[1], rule.placeholders);
      if (invalid.length > 0) {
        throw new BadRequestException({ message: `${field[0]} chứa placeholder không hỗ trợ: ${invalid.join(", ")}.` });
      }
    }
  }
}

function DEFAULT_ROLES(type: CouncilType) {
  return DEFAULT_COUNCIL_FORMATION[type].allowedRoles;
}
function DEFAULT_COUNT(type: CouncilType) {
  return DEFAULT_COUNCIL_FORMATION[type].memberCount;
}

function safeParse(type: CouncilType, raw: string): Record<string, unknown> {
  try {
    return parseCouncilFormationValue(type, raw);
  } catch {
    return { raw };
  }
}

function toCouncilConfigView(type: CouncilType, row?: { value: string; updatedAt: Date }) {
  const range = COUNCIL_MEMBER_COUNT_RANGE[type];
  const parsed = row ? safeParse(type, row.value) : DEFAULT_COUNCIL_FORMATION[type];
  return {
    councilType: type,
    councilTypeLabel: COUNCIL_TYPE_LABELS[type],
    allowedRoles: parsed.allowedRoles ?? DEFAULT_ROLES(type),
    memberCount: parsed.memberCount ?? DEFAULT_COUNT(type),
    minMemberCount: range.min,
    maxMemberCount: range.max,
    enforced: type === "EVALUATION",
    isDefault: !row,
    updatedAt: row ? row.updatedAt.toISOString() : null
  };
}

function findUnsupportedPlaceholders(value: string, allowed: ReadonlySet<string>) {
  const invalid = new Set<string>();
  const pattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  for (const match of value.matchAll(pattern)) {
    const placeholder = match[1];
    if (!allowed.has(placeholder)) {
      invalid.add(placeholder);
    }
  }

  return [...invalid];
}
