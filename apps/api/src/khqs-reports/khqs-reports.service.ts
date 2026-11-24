import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  isLeadership,
  isResearchBoardHead,
  isResearchManagementHead,
  isScienceDeputyDirector
} from "../proposals-shared/proposal-access.js";
import { buildKhqsWorkbook } from "./khqs-report-excel.js";
import {
  buildTables,
  managementFacts,
  managementSuggestion,
  nextPeriodLabel,
  parsePeriod,
  periodBounds,
  periodLabel,
  projectLevel,
  readManualTables,
  readNarrative,
  REPORT_LEVELS,
  storedManualTables,
  storedNarrative,
  type KhqsPeriod,
  type ReportProjectSource
} from "./khqs-report.js";

/** Trạng thái còn đang thực hiện: luôn vào báo cáo dù đã quá ngày kết thúc. */
const ACTIVE_STATUSES = ["executing", "paused", "pending_acceptance"];

/**
 * Xem, xuất báo cáo: Ban giám đốc (Giám đốc, Phó GĐ phụ trách Khoa học), Trưởng phòng KHQS, Trưởng ban QLKH.
 * Cả 4 vai trò này đều có phạm vi toàn Học viện và được xem kinh phí từng đề tài theo ma trận phân quyền.
 * Sửa nội dung, biểu nhập tay: Trưởng phòng KHQS, Trưởng ban QLKH.
 */
export function canReadKhqsReport(actor?: SafeUserContext) {
  return isLeadership(actor) || isScienceDeputyDirector(actor) || isResearchManagementHead(actor) || isResearchBoardHead(actor);
}

export function canEditKhqsReport(actor?: SafeUserContext) {
  return isResearchManagementHead(actor) || isResearchBoardHead(actor);
}

@Injectable()
export class KhqsReportsService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  private assertRead(actor?: SafeUserContext): asserts actor is SafeUserContext {
    if (!actor?.id || !canReadKhqsReport(actor)) {
      throw new ForbiddenException({
        code: "ACTION_NOT_GRANTED",
        message: "Chỉ Ban giám đốc, Trưởng phòng KHQS và Trưởng ban QLKH được xem báo cáo công tác KHQS."
      });
    }
  }

  /**
   * Đề tài trong kỳ: bắt đầu trước khi hết kỳ và (còn đang thực hiện, kết thúc trong/sau kỳ, hoặc nghiệm thu/thanh lý trong/sau kỳ).
   * Chỉ chọn các trường cần cho biểu; lọc kỳ ngay trong truy vấn DB.
   */
  async loadProjects(actor: SafeUserContext, year: number, period: KhqsPeriod): Promise<ReportProjectSource[]> {
    this.assertRead(actor);
    const { start, end } = periodBounds(year, period);
    const where: Prisma.ApprovedProjectWhereInput = {
      status: { not: "preparing" },
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: end } }] },
        {
          OR: [
            { status: { in: ACTIVE_STATUSES } },
            { endDate: { gte: start } },
            { liquidations: { some: { status: "SIGNED", decidedAt: { gte: start } } } },
            { history: { some: { action: "project.acceptance.result", createdAt: { gte: start } } } }
          ]
        }
      ]
    };
    const rows: ReportProjectSource[] = await this.prisma.approvedProject.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        scopeSnapshot: true,
        hostOrganizationUnitId: true,
        hostOrganizationUnit: { select: { name: true } },
        proposal: { select: { proposalTypeCode: true } },
        members: {
          where: { participationRole: "TOPIC_PI" },
          select: { name: true, participationRole: true, status: true, effectiveUntil: true, user: { select: { displayName: true } } }
        },
        fundingRecords: {
          where: { kind: { in: ["GRANT", "DISBURSEMENT"] } },
          orderBy: { version: "asc" },
          select: { entryId: true, version: true, kind: true, amount: true, recordedOn: true }
        },
        requests: {
          where: { requestType: "extension", status: "approved" },
          select: { requestType: true, status: true, currentValues: true, proposedValues: true, decidedAt: true }
        },
        reports: {
          where: { status: { not: "draft" }, submittedAt: { not: null } },
          orderBy: { revision: "desc" },
          take: 1,
          select: { status: true, revision: true, progressResults: true, issuesRecommendations: true, submittedAt: true }
        },
        history: {
          where: { action: "project.acceptance.result" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { action: true, toStatus: true, createdAt: true }
        },
        liquidations: {
          where: { status: "SIGNED" },
          orderBy: { decidedAt: "desc" },
          take: 1,
          select: { status: true, decidedAt: true, liquidationNumber: true }
        }
      }
    });
    return rows.filter((project) => REPORT_LEVELS.includes(projectLevel(project) ?? ""));
  }

  private findStored(year: number, period: KhqsPeriod) {
    return this.prisma.khqsPeriodicReport.findUnique({
      where: { year_period: { year, period } },
      include: { updatedBy: { select: { displayName: true } } }
    });
  }

  async get(actor: SafeUserContext | undefined, yearRaw: unknown, periodRaw: unknown) {
    this.assertRead(actor);
    const { year, period } = parsePeriod(yearRaw, periodRaw);
    const now = new Date();
    const [projects, stored] = await Promise.all([this.loadProjects(actor, year, period), this.findStored(year, period)]);
    const manual = storedManualTables(stored?.manualTables);
    const facts = managementFacts(projects, year, period);
    return {
      year,
      period,
      periodLabel: periodLabel(year, period),
      nextPeriodLabel: nextPeriodLabel(year, period),
      generatedAt: now.toISOString(),
      canEdit: canEditKhqsReport(actor),
      version: stored?.version ?? 0,
      updatedAt: stored?.updatedAt?.toISOString?.() ?? null,
      updatedByName: stored?.updatedBy?.displayName ?? null,
      narrative: storedNarrative(stored?.narrative),
      manual: { kq3: manual.kq3, kq4: manual.kq4, kq6: manual.kq6 },
      overrides: manual.overrides,
      tables: buildTables(projects, year, period, manual.overrides, now),
      facts,
      suggestions: { management: managementSuggestion(facts, year, period) }
    };
  }

  /** Lưu cả kỳ một lần; `version` là phiên bản người sửa đã mở, khác phiên bản hiện tại → 409 (đã có người lưu trước). */
  async save(actor: SafeUserContext | undefined, yearRaw: unknown, periodRaw: unknown, body: unknown) {
    this.assertRead(actor);
    if (!canEditKhqsReport(actor)) {
      throw new ForbiddenException({
        code: "ACTION_NOT_GRANTED",
        message: "Chỉ Trưởng phòng KHQS và Trưởng ban QLKH được sửa báo cáo công tác KHQS."
      });
    }
    const { year, period } = parsePeriod(yearRaw, periodRaw);
    const input = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
    const version = typeof input.version === "number" && Number.isInteger(input.version) && input.version >= 0 ? input.version : -1;
    const narrative = readNarrative(input.narrative ?? {});
    const manualTables = readManualTables({ ...(input.manual && typeof input.manual === "object" ? input.manual : {}), overrides: input.overrides ?? {} });
    const stale = () => new ConflictException({ code: "KHQS_REPORT_STALE", message: "Báo cáo vừa được người khác lưu. Tải lại để xem bản mới trước khi sửa tiếp." });
    const data = {
      narrative: narrative as Prisma.InputJsonObject,
      manualTables: manualTables satisfies Prisma.InputJsonObject,
      updatedById: actor.id
    };

    const existing = await this.prisma.khqsPeriodicReport.findUnique({ where: { year_period: { year, period } }, select: { id: true, version: true } });
    if (existing) {
      if (existing.version !== version) throw stale();
      const updated = await this.prisma.khqsPeriodicReport.updateMany({ where: { id: existing.id, version }, data: { ...data, version: { increment: 1 } } });
      if (updated.count !== 1) throw stale();
    } else {
      if (version !== 0) throw stale();
      try {
        await this.prisma.khqsPeriodicReport.create({ data: { year, period, ...data, version: 1 } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw stale();
        throw error;
      }
    }
    await this.auditLog.record({
      action: "khqs-report-save",
      result: "success",
      actorId: actor.id,
      username: actor.username,
      targetEntity: "khqs-periodic-report",
      targetEntityId: `${year}-${period}`,
      afterFacts: {
        year,
        period,
        kq3: manualTables.kq3.length,
        kq4: manualTables.kq4.length,
        kq6: manualTables.kq6.length,
        overrides: Object.keys(manualTables.overrides).length
      }
    });
    return this.get(actor, String(year), period);
  }

  async exportExcel(actor: SafeUserContext | undefined, yearRaw: unknown, periodRaw: unknown) {
    this.assertRead(actor);
    const report = await this.get(actor, yearRaw, periodRaw);
    const buffer = await buildKhqsWorkbook({
      year: report.year,
      period: report.period,
      tables: report.tables,
      manual: { ...report.manual, overrides: report.overrides }
    });
    await this.auditLog.record({
      action: "khqs-report-export",
      result: "success",
      actorId: actor.id,
      username: actor.username,
      targetEntity: "khqs-periodic-report",
      targetEntityId: `${report.year}-${report.period}`,
      afterFacts: {
        format: "xlsx",
        kq1: report.tables.kq1.length,
        kq2: report.tables.kq2.reduce((total, section) => total + section.rows.length, 0)
      }
    });
    return { buffer, fileName: `Bao_cao_KHQS_${report.period === "H1" ? "6_thang" : "nam"}_${report.year}.xlsx` };
  }
}
