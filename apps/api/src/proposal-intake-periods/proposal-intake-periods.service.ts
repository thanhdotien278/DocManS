import { randomUUID } from "node:crypto";
import { MinioObjectStorageService } from "../infrastructure/minio/minio-object-storage.service.js";
import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  assertHasOrganizationScope,
  assertCanManageIntakePeriods,
  getOrganizationScopeIds,
  intakeAppliesToUser,
  isIntakeOpenForSubmission,
  isInternalResearcherEligible,
  isResearchManagement,
  isResearchManagementHead,
} from "../proposals-shared/proposal-access.js";
import { ProposalManagementOfficerService, replaceProposalManagementOfficer } from "../proposals-shared/proposal-management-officer.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { PROPOSAL_STATUS } from "../proposals-shared/proposal-workflow.js";
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

export type IntakeTemplateUpload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

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
  responsibleOfficerUserId?: string | null;
  responsibleOfficerAssignedById?: string | null;
  responsibleOfficer?: OfficerNameRow | null;
  createdAt: Date;
  updatedAt: Date;
};

type OfficerNameRow = { id: string; displayName: string; researcherProfile?: { fullName: string } | null };
const OFFICER_NAME_SELECT = { id: true, displayName: true, researcherProfile: { select: { fullName: true } } };
const PERIOD_INCLUDE = { responsibleOfficer: { select: OFFICER_NAME_SELECT } };
// Tên hiển thị lấy từ hồ sơ khoa học như các màn hồ sơ đề xuất.
const officerName = (user: OfficerNameRow | null | undefined) => user?.researcherProfile?.fullName || user?.displayName || "";

@Injectable()
export class ProposalIntakePeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly storage: MinioObjectStorageService = new MinioObjectStorageService()
  ) {}

  private transactional = false;
  private uploadedKeys: string[] = [];

  private async mutate<T>(action: string, actor: SafeUserContext, periodId: string | null, expected: unknown, work: (service: ProposalIntakePeriodsService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    const uploadedKeys: string[] = [];
    try {
      return await runProposalMutation(this.prisma, actor, null, undefined, async (tx, currentActor) => {
        // Kiểm tra quyền trước khi khóa/đọc đợt để actor không có quyền không nhận 404/409 làm lộ đợt.
        assertCanManageIntakePeriods(currentActor);
        if (periodId) {
          await tx.$queryRaw`SELECT id FROM proposal_intake_periods WHERE id = ${periodId} FOR UPDATE`;
          const period = await tx.proposalIntakePeriod.findUnique({ where: { id: periodId } });
          if (!period) throw new NotFoundException({ message: "Không tìm thấy đợt tiếp nhận." });
          if (expected !== period.updatedAt.toISOString()) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Đợt tiếp nhận đã thay đổi. Vui lòng tải lại." });
        }
        const service = new ProposalIntakePeriodsService(tx, new AuditLogService(tx), this.storage);
        service.transactional = true;
        service.uploadedKeys = uploadedKeys;
        return work(service, currentActor);
      });
    } catch (error) {
      await Promise.allSettled(uploadedKeys.map((key) => this.storage.deleteObject(key)));
      // Giao dịch đã rollback nên audit từ chối phải ghi ngoài giao dịch.
      if (error instanceof ForbiddenException) {
        await this.auditLog.record({ action, result: "failure", actorId: actor.id, targetEntity: "proposal-intake-period", targetEntityId: periodId ?? undefined, username: actor.username, reason: String((error.getResponse() as { code?: unknown })?.code ?? "ACTION_NOT_GRANTED") }).catch(() => undefined);
      }
      const prismaError = error as { code?: string; meta?: { target?: unknown } };
      if (prismaError.code === "P2002" && [prismaError.meta?.target].flat().some((target) => /(^|_)code(_|$)/.test(String(target)))) throw new ConflictException({ code: "INTAKE_CODE_EXISTS", field: "code", message: "Mã đợt tiếp nhận đã tồn tại." });
      throw error;
    }
  }

  private async readTemplatePackage(actor: SafeUserContext, periodId: string, value: unknown, files: IntakeTemplateUpload[]) {
    const items = readRequiredPackage(value);
    const raw = value as Record<string, unknown>[];
    const used = new Set<number>();
    if (new Set(items.map((item) => item.code)).size !== items.length) throw new BadRequestException({ message: "Mã tệp bị trùng." });
    for (const [index, item] of items.entries()) {
      const uploadIndex = raw[index].uploadIndex;
      if (uploadIndex !== undefined) {
        if (!Number.isInteger(uploadIndex) || used.has(uploadIndex as number) || !files[uploadIndex as number]) throw new BadRequestException({ message: "File tải lên không hợp lệ." });
        used.add(uploadIndex as number);
        const file = files[uploadIndex as number];
        const name = readText(item.fileName ?? file.originalname, "fileName", 255);
        const mime = name.toLowerCase().endsWith(".pdf") ? "application/pdf" : name.toLowerCase().endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "";
        if (!mime || file.mimetype !== mime || !file.size || file.buffer.length !== file.size) throw new BadRequestException({ message: "Vui lòng chọn file DOCX hoặc PDF hợp lệ." });
        const id = randomUUID();
        const objectKey = `intake-templates/${periodId}/${id}`;
        await this.storage.putObject({ objectKey, content: file.buffer, mimeType: mime, sizeBytes: file.size });
        this.uploadedKeys.push(objectKey);
        await this.prisma.fileRecord.create({ data: {
          id, relatedEntityType: "proposal_intake_period", relatedEntityId: periodId, filePurpose: item.code, documentType: item.code,
          originalFileName: name, description: item.description, mimeType: mime, sizeBytes: file.size,
          storageBucket: process.env.MINIO_BUCKET_NAME ?? "rtms-files", storageObjectKey: objectKey,
          uploadedById: actor.id, status: "active"
        } });
        item.templateFileId = id;
        item.fileName = name;
      } else if (item.templateFileId) {
        const file = await this.prisma.fileRecord.findFirst({ where: { id: item.templateFileId, relatedEntityType: "proposal_intake_period", relatedEntityId: periodId, status: "active", deletedAt: null } });
        if (!file) throw new BadRequestException({ message: "File mẫu không thuộc đợt tiếp nhận này." });
        item.fileName = file.originalFileName;
      }
      if (item.templateFileId) {
        item.allowedMimeTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        item.maxSizeMb = null;
      }
    }
    if (used.size !== files.length) throw new BadRequestException({ message: "Có file tải lên chưa được gắn với miêu tả." });
    return items;
  }

  async downloadTemplate(actor: SafeUserContext, periodId: string, fileId: string) {
    const periods = await this.listPeriods(actor);
    const period = periods.find((item) => item.id === periodId);
    if (!period || !period.requiredPackage.some((item) => item.templateFileId === fileId)) throw new NotFoundException({ message: "Không tìm thấy file mẫu." });
    const file = await this.prisma.fileRecord.findFirst({ where: { id: fileId, relatedEntityType: "proposal_intake_period", relatedEntityId: periodId, status: "active", deletedAt: null } });
    if (!file) throw new NotFoundException({ message: "Không tìm thấy file mẫu." });
    const content = await this.storage.getObject(file.storageObjectKey);
    await this.auditLog.record({ action: "download-intake-template", result: "success", actorId: actor.id, targetEntity: "file-record", targetEntityId: file.id });
    return { content, fileName: file.originalFileName, mimeType: file.mimeType };
  }

  async options(actor: SafeUserContext) {
    if (!isResearchManagement(actor) && !isInternalResearcherEligible(actor)) throw new ForbiddenException();
    const ids = actor.organizationScopes.map((s) => s.id);
    return { canCreate: isResearchManagement(actor), canChooseOfficer: isResearchManagementHead(actor), organizationUnits: await this.prisma.organizationUnit.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }) };
  }

  private officerCandidateWhere(actor: SafeUserContext) {
    return { status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF", organizationScopes: { some: { organizationUnitId: { in: getOrganizationScopeIds(actor) } } } };
  }

  async officerCandidates(actor: SafeUserContext) {
    if (!isResearchManagementHead(actor)) throw new ForbiddenException({ message: "Chỉ trưởng phòng được chọn chuyên viên phụ trách đợt." });
    const users = (await this.prisma.user.findMany({ where: this.officerCandidateWhere(actor), select: OFFICER_NAME_SELECT })) as OfficerNameRow[];
    return users.map((user) => ({ id: user.id, displayName: officerName(user) })).sort((a, b) => a.displayName.localeCompare(b.displayName, "vi") || a.id.localeCompare(b.id));
  }

  /** undefined = không đổi. Chỉ TP được đổi; CV gửi giá trị khác hiện tại bị 403. */
  private async readResponsibleOfficer(actor: SafeUserContext, value: unknown, current: string | null, status: string) {
    if (value === undefined) return undefined;
    const next = readOptionalText(value, "responsibleOfficerUserId", 120) ?? null;
    if (next === current) return undefined;
    if (!isResearchManagementHead(actor)) throw new ForbiddenException({ message: "Chỉ trưởng phòng được chọn chuyên viên phụ trách đợt." });
    if (next === null) {
      if (status === "open") throw new BadRequestException({ message: "Đợt đang mở phải có chuyên viên phụ trách." });
      return null;
    }
    const officer = await this.prisma.user.findFirst({ where: { id: next, ...this.officerCandidateWhere(actor) }, select: { id: true } });
    if (!officer) throw new BadRequestException({ message: "Chuyên viên phụ trách phải là chuyên viên đang hoạt động trong phạm vi quản lý." });
    return next;
  }

  /** Quyết định 2026-11-01: chuyển hồ sơ đã nộp đang do CV cũ của đợt phụ trách hoặc chưa có CV; hồ sơ giao riêng giữ nguyên. */
  private async transferProposalOfficers(actor: SafeUserContext, periodId: string, oldOfficerUserId: string | null, newOfficerUserId: string) {
    await this.prisma.$queryRaw`SELECT id FROM research_proposals WHERE intake_period_id = ${periodId} FOR UPDATE`;
    const now = await readTransactionClockV1(this.prisma);
    const officers = new ProposalManagementOfficerService(this.prisma);
    // Hồ sơ nháp không có CV (Story 4.2); hồ sơ đã kết thúc giữ CV cũ (người dùng chốt 2026-11-02).
    const proposals = await this.prisma.researchProposal.findMany({ where: { intakePeriodId: periodId, status: { notIn: [PROPOSAL_STATUS.draft, PROPOSAL_STATUS.approved, PROPOSAL_STATUS.rejected] } }, select: { id: true } });
    const moved: string[] = [];
    for (const { id } of proposals) {
      const current = await officers.resolveForProposal(id, now);
      if (!current.resolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được cán bộ quản lý hiện tại của hồ sơ trong đợt." });
      const currentUserId = current.officer?.officerUserId ?? null;
      if (currentUserId !== null && currentUserId !== oldOfficerUserId) continue;
      await replaceProposalManagementOfficer(this.prisma, { proposalId: id, officerUserId: newOfficerUserId, assignedById: actor.id, reason: "Đổi chuyên viên phụ trách đợt tiếp nhận", now });
      moved.push(id);
    }
    return moved;
  }

  private async readUnits(actor: SafeUserContext, value: unknown) {
    if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim()) || new Set(value).size !== value.length) throw new BadRequestException({ message: "Phạm vi đơn vị không hợp lệ." });
    for (const id of value as string[]) assertHasOrganizationScope(actor, id);
    if (await this.prisma.organizationUnit.count({ where: { id: { in: value as string[] }, status: "active" } }) !== value.length) throw new BadRequestException({ message: "Đơn vị không còn hoạt động." });
    return value as string[];
  }

  async listPeriods(actor: SafeUserContext, filters: Record<string, unknown> = {}) {
    if (!isResearchManagement(actor) && !isInternalResearcherEligible(actor)) {
      throw new ForbiddenException({ message: "Không có quyền xem đợt tiếp nhận." });
    }

    const records = (await this.prisma.proposalIntakePeriod.findMany({
      orderBy: { startsAt: "desc" },
      include: PERIOD_INCLUDE
    })) as IntakePeriodRecord[];
    const statusFilter = typeof filters.status === "string" ? filters.status : "";

    if (isResearchManagement(actor)) {
      return records
        .filter((record) => intakeAppliesToUser(record, actor))
        .filter((record) => !statusFilter || this.effectiveStatus(record) === statusFilter || record.status === statusFilter)
        .map((record) => this.toResponse(record, actor));
    }

    if (isInternalResearcherEligible(actor)) {
      return records
        .filter((record) => isIntakeOpenForSubmission(record) && intakeAppliesToUser(record, actor))
        .map((record) => this.toResponse(record, actor));
    }

    throw new ForbiddenException({ message: "Không có quyền xem đợt tiếp nhận." });
  }

  async createPeriod(actor: SafeUserContext, input: Record<string, unknown>, files: IntakeTemplateUpload[] = []): Promise<any> {
    if (!this.transactional) return this.mutate("create-proposal-intake-period", actor, null, undefined, (s, a) => s.createPeriod(a, input, files));
    assertCanManageIntakePeriods(actor);
    const applicableOrganizationUnitId = readOptionalText(input.applicableOrganizationUnitId, "applicableOrganizationUnitId", 80);
    if (applicableOrganizationUnitId) {
      assertHasOrganizationScope(actor, applicableOrganizationUnitId);
    }

    const startsAt = readDate(input.startsAt, "startsAt");
    const endsAt = readDate(input.endsAt, "endsAt");
    assertDateRange(startsAt, endsAt);

    const periodId = randomUUID();
    const responsibleOfficerUserId = (await this.readResponsibleOfficer(actor, input.responsibleOfficerUserId, null, "draft")) ?? null;
    const requiredPackage = await this.readTemplatePackage(actor, periodId, input.requiredPackage, files);
    const period = (await this.prisma.proposalIntakePeriod.create({
      data: {
        id: periodId,
        code: readCode(input.code, "code"),
        title: readText(input.title, "title", 220),
        description: readOptionalText(input.description, "description", 1000),
        startsAt,
        endsAt,
        status: "draft",
        applicableOrganizationUnitId,
        applicableOrganizationUnitIds: await this.readUnits(actor, input.applicableOrganizationUnitIds ?? []),
        requiredPackage,
        ...(responsibleOfficerUserId ? { responsibleOfficerUserId, responsibleOfficerAssignedById: actor.id, responsibleOfficerAssignedAt: new Date() } : {})
      },
      include: PERIOD_INCLUDE
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "create-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username,
      reason: this.auditReason(null, period)
    });

    return this.toResponse(period, actor);
  }

  async updatePeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown>, files: IntakeTemplateUpload[] = []): Promise<any> {
    if (!this.transactional) return this.mutate("update-proposal-intake-period", actor, periodId, input.contextVersion, (s, a) => s.updatePeriod(a, periodId, input, files));
    assertCanManageIntakePeriods(actor);

    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    if (existing.status === "closed") throw new BadRequestException({ message: "Đợt đã đóng không được chỉnh sửa." });
    const data: Record<string, unknown> = {};
    const oldOfficerUserId = existing.responsibleOfficerUserId ?? null;
    const newOfficerUserId = await this.readResponsibleOfficer(actor, input.responsibleOfficerUserId, oldOfficerUserId, existing.status);
    if (newOfficerUserId !== undefined) Object.assign(data, { responsibleOfficerUserId: newOfficerUserId, responsibleOfficerAssignedById: newOfficerUserId ? actor.id : null, responsibleOfficerAssignedAt: newOfficerUserId ? new Date() : null });
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
      data.requiredPackage = await this.readTemplatePackage(actor, periodId, input.requiredPackage, files);
    }

    const startsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
    const endsAt = data.endsAt instanceof Date ? data.endsAt : existing.endsAt;
    assertDateRange(startsAt, endsAt);

    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data,
      include: PERIOD_INCLUDE
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "update-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username,
      reason: this.auditReason(existing, period)
    });

    if (newOfficerUserId) {
      const movedProposalIds = await this.transferProposalOfficers(actor, periodId, oldOfficerUserId, newOfficerUserId);
      await this.auditLog.record({
        action: "change-intake-period-responsible-officer",
        result: "success",
        actorId: actor.id,
        targetEntity: "proposal-intake-period",
        targetEntityId: period.id,
        username: actor.username,
        reason: JSON.stringify({ oldOfficerUserId, newOfficerUserId, movedProposalIds })
      });
    }

    return this.toResponse(period, actor);
  }

  async openPeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate("open-proposal-intake-period", actor, periodId, input.contextVersion, (s, a) => s.openPeriod(a, periodId, input));
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);
    if (existing.status === "closed" || existing.endsAt <= new Date()) throw new BadRequestException({ message: "Không thể mở đợt đã đóng hoặc hết hạn." });
    if (existing.status === "open") throw new BadRequestException({ message: "Đợt tiếp nhận đang mở." });
    assertDateRange(existing.startsAt, existing.endsAt);

    if (normalizeRequiredPackage(existing.requiredPackage).length === 0) {
      throw new BadRequestException({ message: "Cần cấu hình danh sách tệp bắt buộc trước khi mở đợt tiếp nhận." });
    }

    // D-038: đợt mở luôn có CV. TP phải chọn trước; CV mở đợt chưa có CV thì thành CV của đợt.
    const selfAssign = !existing.responsibleOfficerUserId;
    if (selfAssign && isResearchManagementHead(actor)) throw new BadRequestException({ message: "Cần chọn chuyên viên phụ trách trước khi mở đợt." });
    if (!selfAssign && !(await this.prisma.user.findFirst({ where: { id: existing.responsibleOfficerUserId!, status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" }, select: { id: true } }))) {
      throw new BadRequestException({ message: "Chuyên viên phụ trách không còn hoạt động, cần chọn lại trước khi mở đợt." });
    }

    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data: selfAssign ? { status: "open", responsibleOfficerUserId: actor.id, responsibleOfficerAssignedById: null, responsibleOfficerAssignedAt: new Date() } : { status: "open" },
      include: PERIOD_INCLUDE
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "open-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username,
      reason: this.auditReason(existing, period)
    });
    if (selfAssign) {
      await this.auditLog.record({
        action: "assign-intake-period-responsible-officer",
        result: "success",
        targetEntity: "proposal-intake-period",
        targetEntityId: period.id,
        reason: JSON.stringify({ officerUserId: actor.id, trigger: "open-proposal-intake-period", openedByUserId: actor.id, openedByUsername: actor.username })
      });
    }

    return this.toResponse(period, actor);
  }

  async closePeriod(actor: SafeUserContext, periodId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate("close-proposal-intake-period", actor, periodId, input.contextVersion, (s, a) => s.closePeriod(a, periodId, input));
    assertCanManageIntakePeriods(actor);
    const existing = await this.findPeriod(periodId);
    this.assertIntakeScope(actor, existing);

    if (existing.status !== "open") throw new BadRequestException({ message: "Chỉ đợt đang mở mới được đóng." });
    const period = (await this.prisma.proposalIntakePeriod.update({
      where: { id: periodId },
      data: { status: "closed" },
      include: PERIOD_INCLUDE
    })) as IntakePeriodRecord;

    await this.auditLog.record({
      action: "close-proposal-intake-period",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-intake-period",
      targetEntityId: period.id,
      username: actor.username,
      reason: this.auditReason(existing, period)
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

  private auditReason(before: IntakePeriodRecord | null, after: IntakePeriodRecord) {
    const snapshot = (p: IntakePeriodRecord | null) => p && { code: p.code, title: p.title, startsAt: p.startsAt, endsAt: p.endsAt, status: p.status, applicableOrganizationUnitIds: p.applicableOrganizationUnitIds, requiredPackage: p.requiredPackage, responsibleOfficerUserId: p.responsibleOfficerUserId ?? null };
    return JSON.stringify({ before: snapshot(before), after: snapshot(after), contextVersion: after.updatedAt.toISOString() });
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
      capabilities: { canEdit: isResearchManagement(actor) && period.status !== "closed", canOpen: isResearchManagement(actor) && period.status === "draft" && period.endsAt > new Date(), canClose: isResearchManagement(actor) && period.status === "open", canCreateProposal: isInternalResearcherEligible(actor) && Boolean(actor.researcherProfileId) && isIntakeOpenForSubmission(period) && intakeAppliesToUser(period, actor) },
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
      // Chỉ phòng QLKH thấy CV của đợt; hiển thị cho PI thuộc phần việc khác.
      responsibleOfficer: isResearchManagement(actor) && period.responsibleOfficerUserId ? { userId: period.responsibleOfficerUserId, displayName: officerName(period.responsibleOfficer) } : null,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString()
    };
  }
}
