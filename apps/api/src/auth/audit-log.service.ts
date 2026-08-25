import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import type { AuditAction, AuditLogRecord, AuditResult } from "./auth.types.js";

type AuditLogInput = {
  action: AuditAction;
  result: AuditResult;
  actorId?: string;
  targetEntity?: string;
  targetEntityId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  correlationId?: string;
  beforeFacts?: Record<string, unknown>;
  afterFacts?: Record<string, unknown>;
};

type AuditLogClient = { auditLog: { create: Prisma.TransactionClient["auditLog"]["create"] } };

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput, client: AuditLogClient = this.prisma) {
    const record = await client.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        targetEntity: input.targetEntity,
        targetEntityId: input.targetEntityId,
        username: input.username,
        result: input.result,
        ip: input.ip,
        userAgent: input.userAgent,
        reason: input.reason,
        correlationId: input.correlationId,
        beforeFacts: input.beforeFacts,
        afterFacts: input.afterFacts
      } as never
    });

    return {
      id: record.id,
      action: record.action as AuditAction,
      actorId: record.actorId ?? undefined,
      targetEntity: record.targetEntity ?? undefined,
      targetEntityId: record.targetEntityId ?? undefined,
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
      targetEntity: record.targetEntity ?? undefined,
      targetEntityId: record.targetEntityId ?? undefined,
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
