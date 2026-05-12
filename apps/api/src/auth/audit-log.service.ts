import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import type { AuditAction, AuditLogRecord, AuditResult } from "./auth.types.js";

type AuditLogInput = {
  action: AuditAction;
  result: AuditResult;
  actorId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    const record = await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        username: input.username,
        result: input.result,
        ip: input.ip,
        userAgent: input.userAgent,
        reason: input.reason
      }
    });

    return {
      id: record.id,
      action: record.action as AuditAction,
      actorId: record.actorId ?? undefined,
      username: record.username ?? undefined,
      timestamp: record.timestamp.toISOString(),
      result: record.result as AuditResult,
      context: {
        ip: record.ip ?? undefined,
        userAgent: record.userAgent ?? undefined,
        reason: record.reason ?? undefined
      }
    };
  }

  async list(): Promise<AuditLogRecord[]> {
    const records = await this.prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100
    });

    return records.map((record) => ({
      id: record.id,
      action: record.action as AuditAction,
      actorId: record.actorId ?? undefined,
      username: record.username ?? undefined,
      timestamp: record.timestamp.toISOString(),
      result: record.result as AuditResult,
      context: {
        ip: record.ip ?? undefined,
        userAgent: record.userAgent ?? undefined,
        reason: record.reason ?? undefined
      }
    }));
  }
}
