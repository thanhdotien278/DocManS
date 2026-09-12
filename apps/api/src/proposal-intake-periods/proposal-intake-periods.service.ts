import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
  applicableOrganizationUnitIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProposalIntakePeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, periodId: string | null, expected: unknown, work: (service: ProposalIntakePeriodsService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    return runProposalMutation(this.prisma, actor, null, undefined, async (tx, currentActor) => {
      if (periodId) {
        await tx.$queryRaw`SELECT id FROM proposal_intake_periods WHERE id = ${periodId} FOR UPDATE`;
        const period = await tx.proposalIntakePeriod.findUnique({ where: { id: periodId } });
        if (!period) throw new NotFoundException({ message: "Không tìm thấy đợt tiếp nhận." });
        if (expected !== period.updatedAt.toISOString()) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Đợt tiếp nhận đã thay đổi. Vui lòng tải lại." });
      }
      const service = new ProposalIntakePeriodsService(tx, new AuditLogService(tx));
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  async options(actor: SafeUserContext) {
    if (!isScientificManagement(actor) && !isResearcherInternalUser(actor)) throw new ForbiddenException();
    const ids = actor.organizationScopes.map((s) => s.id);
    return { canCreate: isScientificManagement(actor), organizationUnits: await this.prisma.organizationUnit.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }) };
  }

  private async readUnits(actor: SafeUserContext, value: unknown) {
    if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim()) || new Set(value).size !== value.length) throw new BadRequestException({ message: "Phạm vi đơn vị không hợp lệ." });
    for (const id of value as string[]) assertHasOrganizationScope(actor, id);
    if (await this.prisma.organizationUnit.count({ where: { id: { in: value as string[] }, status: "active" } }) !== value.length) throw new BadRequestException({ message: "Đơn vị không còn hoạt động." });
    return value as string[];
  }

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
        .map((record) => this.toResponse(record, actor));
    }

    if (isResearcherInternalUser(actor)) {
      return records
        .filter((record) => isIntakeOpenForSubmission(record) && intakeAppliesToUser(record, actor))
        .map((record) => this.toResponse(record, actor));
    }

    throw new ForbiddenException({ message: "Không có quyền xem đợt tiếp nhận." });
  }

  async createPeriod(actor: SafeUserContext, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, null, undefined, (s, a) => s.createPeriod(a, input));
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
        applicableOrganizationUnitIds: await this.readUnits(actor, input.applicableOrganizationUnitIds ?? []),
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

    return this.toResponse(period, actor);
  }

  async updatePeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, periodId, input.contextVersion, (s, a) => s.updatePeriod(a, periodId, input));
    assertCanManageIntakePeriods(actor);

    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    if (existing.status === "closed") throw new BadRequestException({ message: "Đợt đã đóng không được chỉnh sửa." });
    const data: Record<string, unknown> = {};
    if (input.applicableOrganizationUnitIds !== undefined) { data.applicableOrganizationUnitIds = await this.readUnits(actor, input.applicableOrganizationUnitIds); data.applicableOrganizationUnitId = null; }

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

    return this.toResponse(period, actor);
  }

  async openPeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, periodId, input.contextVersion, (s, a) => s.openPeriod(a, periodId, input));
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    if (existing.status === "closed" || existing.endsAt <= new Date()) throw new BadRequestException({ message: "Không thể mở đợt đã đóng hoặc hết hạn." });
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

    return this.toResponse(period, actor);
  }

  async closePeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, periodId, input.contextVersion, (s, a) => s.closePeriod(a, periodId, input));
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);

    if (existing.status !== "open") throw new BadRequestException({ message: "Chỉ đợt đang mở mới được đóng." });
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

    return this.toResponse(period, actor);
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
    if (period.status === "open" && period.endsAt < new Date()) {
      return "expired";
    }

    if (period.status === "draft" || period.status === "open" || period.status === "closed") {
      return period.status;
    }

    return "closed";
  }

  private toResponse(period: IntakePeriodRecord, actor: SafeUserContext) {
    return {
      contextVersion: period.updatedAt.toISOString(),
      capabilities: { canEdit: isScientificManagement(actor) && period.status !== "closed", canOpen: isScientificManagement(actor) && period.status === "draft" && period.endsAt > new Date(), canClose: isScientificManagement(actor) && period.status === "open", canCreateProposal: isResearcherInternalUser(actor) && isIntakeOpenForSubmission(period) && intakeAppliesToUser(period, actor) },
      applicableOrganizationUnitIds: period.applicableOrganizationUnitIds?.length ? period.applicableOrganizationUnitIds : period.applicableOrganizationUnitId ? [period.applicableOrganizationUnitId] : [],
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
