import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  assertHasOrganizationScope,
  assertCanManageIntakePeriods,
  intakeAppliesToUser,
  isIntakeOpenForSubmission,
  isResearcherInternalUser,
  isScientificManagement,
} from "../proposals-shared/proposal-access.js";
import type { IntakeStatus } from "../proposals-shared/proposal-types.js";
import {
  assertDateRange,
  normalizeRequiredPackage,
  readCode,
  readDate,
  readOptionalText,
  readRequiredPackage,
  readText
} from "../proposals-shared/proposal-validation.js";

type IntakePeriodRecord = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  applicableOrganizationUnitId: string | null;
  requiredPackage: unknown;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProposalIntakePeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async listPeriods(actor: SafeUserContext, filters: Record<string, unknown> = {}) {
    if (!isScientificManagement(actor) && !isResearcherInternalUser(actor)) {
      throw new ForbiddenException({ message: "Không có quyền xem đợt tiếp nhận." });
    }

    const records = (await this.prisma.proposalIntakePeriod.findMany({
      orderBy: { startsAt: "desc" }
    })) as IntakePeriodRecord[];
    const statusFilter = typeof filters.status === "string" ? filters.status : "";

    if (isScientificManagement(actor)) {
      return records
        .filter((record) => intakeAppliesToUser(record, actor))
        .filter((record) => !statusFilter || this.effectiveStatus(record) === statusFilter || record.status === statusFilter)
        .map((record) => this.toResponse(record));
    }

    if (isResearcherInternalUser(actor)) {
      return records
        .filter((record) => isIntakeOpenForSubmission(record) && intakeAppliesToUser(record, actor))
        .map((record) => this.toResponse(record));
    }

    throw new ForbiddenException({ message: "Không có quyền xem đợt tiếp nhận." });
  }

  async createPeriod(actor: SafeUserContext, input: Record<string, unknown>) {
    assertCanManageIntakePeriods(actor);
    const applicableOrganizationUnitId = readOptionalText(input.applicableOrganizationUnitId, "applicableOrganizationUnitId", 80);
    if (applicableOrganizationUnitId) {
      assertHasOrganizationScope(actor, applicableOrganizationUnitId);
    }

    const startsAt = readDate(input.startsAt, "startsAt");
    const endsAt = readDate(input.endsAt, "endsAt");
    assertDateRange(startsAt, endsAt);

    const period = (await this.prisma.proposalIntakePeriod.create({
      data: {
        code: readCode(input.code, "code"),
        title: readText(input.title, "title", 220),
        description: readOptionalText(input.description, "description", 1000),
        startsAt,
        endsAt,
        status: "draft",
        applicableOrganizationUnitId,
        requiredPackage: readRequiredPackage(input.requiredPackage)
      }
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "create-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username
    });

    return this.toResponse(period);
  }

  async updatePeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown>) {
    assertCanManageIntakePeriods(actor);

    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    const data: Record<string, unknown> = {};

    if (input.code !== undefined) {
      data.code = readCode(input.code, "code");
    }
    if (input.title !== undefined) {
      data.title = readText(input.title, "title", 220);
    }
    if (input.description !== undefined) {
      data.description = readOptionalText(input.description, "description", 1000) ?? null;
    }
    if (input.startsAt !== undefined) {
      data.startsAt = readDate(input.startsAt, "startsAt");
    }
    if (input.endsAt !== undefined) {
      data.endsAt = readDate(input.endsAt, "endsAt");
    }
    if (input.applicableOrganizationUnitId !== undefined) {
      const applicableOrganizationUnitId = readOptionalText(input.applicableOrganizationUnitId, "applicableOrganizationUnitId", 80);
      if (applicableOrganizationUnitId) {
        assertHasOrganizationScope(actor, applicableOrganizationUnitId);
      }
      data.applicableOrganizationUnitId = applicableOrganizationUnitId ?? null;
    }
    if (input.requiredPackage !== undefined) {
      data.requiredPackage = readRequiredPackage(input.requiredPackage);
    }

    const startsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
    const endsAt = data.endsAt instanceof Date ? data.endsAt : existing.endsAt;
    assertDateRange(startsAt, endsAt);

    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "update-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username
    });

    return this.toResponse(period);
  }

  async openPeriod(actor: SafeUserContext, periodId: string) {
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    assertDateRange(existing.startsAt, existing.endsAt);

    if (normalizeRequiredPackage(existing.requiredPackage).length === 0) {
      throw new BadRequestException({ message: "Cần cấu hình danh sách tệp bắt buộc trước khi mở đợt tiếp nhận." });
    }

    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data: { status: "open" }
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "open-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username
    });

    return this.toResponse(period);
  }

  async closePeriod(actor: SafeUserContext, periodId: string) {
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);

    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data: { status: "closed" }
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "close-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username
    });

    return this.toResponse(period);
  }

  async findEligiblePeriodForProposal(actor: SafeUserContext, periodId: string) {
    const period = await this.findPeriod(periodId);

    if (!isIntakeOpenForSubmission(period) || !intakeAppliesToUser(period, actor)) {
      throw new BadRequestException({ message: "Đợt tiếp nhận không còn mở hoặc không áp dụng cho người dùng hiện hành." });
    }

    return period;
  }

  async findPeriod(periodId: string) {
    const period = (await this.prisma.proposalIntakePeriod.findUnique({
      where: { id: periodId }
    })) as IntakePeriodRecord | null;

    if (!period) {
      throw new NotFoundException({ message: "Không tìm thấy đợt tiếp nhận." });
    }

    return period;
  }

  private assertIntakeScope(actor: SafeUserContext, period: IntakePeriodRecord) {
    if (!intakeAppliesToUser(period, actor)) {
      throw new ForbiddenException({ message: "Không có quyền thao tác trong phạm vi đơn vị này." });
    }
  }

  private effectiveStatus(period: IntakePeriodRecord): IntakeStatus {
    if (period.status === "open" && !isIntakeOpenForSubmission(period)) {
      return "expired";
    }

    if (period.status === "draft" || period.status === "open" || period.status === "closed") {
      return period.status;
    }

    return "closed";
  }

  private toResponse(period: IntakePeriodRecord) {
    return {
      id: period.id,
      code: period.code,
      title: period.title,
      description: period.description ?? "",
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
      status: this.effectiveStatus(period),
      applicableOrganizationUnitId: period.applicableOrganizationUnitId ?? "",
      requiredPackage: normalizeRequiredPackage(period.requiredPackage),
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString()
    };
  }
}
