import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  assertCanEditProposalDraft,
  assertCanReadProposal,
  assertHasOrganizationScope,
  assertPrincipalInvestigator,
  canReadProposal,
  intakeAppliesToUser,
  isIntakeOpenForSubmission,
  isPrincipalInvestigator,
  isScientificManagement,
  isSystemAdmin
} from "../proposals-shared/proposal-access.js";
import type { ProposalMemberInput, ProposalMissingItem } from "../proposals-shared/proposal-types.js";
import {
  assertDateRange,
  normalizeRequiredPackage,
  readBudgetMetadata,
  readDate,
  readMembers,
  readOptionalCode,
  readOptionalDate,
  readOptionalText,
  readText
} from "../proposals-shared/proposal-validation.js";

type IntakePeriodRecord = {
  id: string;
  code: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  applicableOrganizationUnitId: string | null;
  requiredPackage: unknown;
};

type ResearchProposalRecord = {
  id: string;
  code: string | null;
  intakePeriodId: string;
  ownerId: string;
  hostOrganizationUnitId: string;
  researchFieldCode: string | null;
  proposalTypeCode: string | null;
  title: string;
  objectives: string | null;
  summary: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budgetMetadata: unknown;
  status: string;
  submittedAt: Date | null;
  submittedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProposalMemberRecord = ProposalMemberInput & {
  id: string;
  proposalId: string;
  createdAt: Date;
};

type ProposalAttachmentRecord = {
  id: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  proposalId?: string;
  filePurpose?: string;
  requirementCode?: string;
  originalFileName?: string;
  fileName?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProposalSubmissionEventRecord = {
  id: string;
  proposalId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  submittedAt: Date;
  note: string | null;
};

@Injectable()
export class ResearchProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async listProposals(actor: SafeUserContext) {
    const records = (await this.prisma.researchProposal.findMany({
      orderBy: { createdAt: "desc" }
    })) as ResearchProposalRecord[];

    return records.filter((proposal) => canReadProposal(actor, proposal)).map((proposal) => this.toProposalResponse(proposal, actor));
  }

  async getProposal(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    assertCanReadProposal(actor, proposal);
    return this.toProposalDetailResponse(proposal, undefined, actor);
  }

  async createDraft(actor: SafeUserContext, input: Record<string, unknown>) {
    const pi = assertPrincipalInvestigator(actor);
    const intakePeriodId = readText(input.intakePeriodId, "intakePeriodId", 80);
    const hostOrganizationUnitId = readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
    assertHasOrganizationScope(pi, hostOrganizationUnitId);

    const intake = await this.findIntakePeriod(intakePeriodId);
    this.assertIntakeEligibleForProposal(pi, intake);

    const startDate = readOptionalDate(input.startDate, "startDate");
    const endDate = readOptionalDate(input.endDate, "endDate");
    if (startDate && endDate) {
      assertDateRange(startDate, endDate);
    }

    const members = readMembers(input.members);
    const proposal = (await this.prisma.researchProposal.create({
      data: {
        intakePeriodId,
        ownerId: pi.id,
        hostOrganizationUnitId,
        title: readText(input.title, "title", 260),
        researchFieldCode: readOptionalCode(input.researchFieldCode, "researchFieldCode"),
        proposalTypeCode: readOptionalCode(input.proposalTypeCode, "proposalTypeCode"),
        objectives: readOptionalText(input.objectives, "objectives", 3000),
        summary: readOptionalText(input.summary, "summary", 3000),
        startDate,
        endDate,
        budgetMetadata: readBudgetMetadata(input.budgetMetadata),
        status: "draft"
      } as never
    })) as ResearchProposalRecord;

    if (members?.length) {
      await this.replaceMembers(proposal.id, members);
    }

    await this.auditLog.record({
      action: "create-proposal-draft",
      result: "success",
      actorId: pi.id,
      targetEntity: "research-proposal",
      targetEntityId: proposal.id,
      username: pi.username
    });

    return this.toProposalDetailResponse(proposal, members, pi);
  }

  async updateDraft(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await this.findProposal(proposalId);
    assertCanEditProposalDraft(actor, proposal);
    this.assertEditableDraft(proposal);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      data.title = readText(input.title, "title", 260);
    }
    if (input.hostOrganizationUnitId !== undefined) {
      const hostOrganizationUnitId = readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
      assertHasOrganizationScope(actor, hostOrganizationUnitId);
      data.hostOrganizationUnitId = hostOrganizationUnitId;
    }
    if (input.researchFieldCode !== undefined) {
      data.researchFieldCode = readOptionalCode(input.researchFieldCode, "researchFieldCode") ?? null;
    }
    if (input.proposalTypeCode !== undefined) {
      data.proposalTypeCode = readOptionalCode(input.proposalTypeCode, "proposalTypeCode") ?? null;
    }
    if (input.objectives !== undefined) {
      data.objectives = readOptionalText(input.objectives, "objectives", 3000) ?? null;
    }
    if (input.summary !== undefined) {
      data.summary = readOptionalText(input.summary, "summary", 3000) ?? null;
    }
    if (input.startDate !== undefined) {
      data.startDate = readOptionalDate(input.startDate, "startDate") ?? null;
    }
    if (input.endDate !== undefined) {
      data.endDate = readOptionalDate(input.endDate, "endDate") ?? null;
    }
    if (input.budgetMetadata !== undefined) {
      data.budgetMetadata = readBudgetMetadata(input.budgetMetadata) ?? null;
    }

    const startDate = data.startDate instanceof Date || data.startDate === null ? data.startDate : proposal.startDate;
    const endDate = data.endDate instanceof Date || data.endDate === null ? data.endDate : proposal.endDate;
    if (startDate && endDate) {
      assertDateRange(startDate, endDate);
    }

    const members = readMembers(input.members);
    const updated = (await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: data as never
    })) as ResearchProposalRecord;

    if (members) {
      await this.replaceMembers(proposalId, members);
    }

    await this.auditLog.record({
      action: "update-proposal-draft",
      result: "success",
      actorId: actor.id,
      targetEntity: "research-proposal",
      targetEntityId: proposalId,
      username: actor.username
    });

    return this.toProposalDetailResponse(updated, members, actor);
  }

  async listAttachments(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    assertCanReadProposal(actor, proposal);
    return this.findAttachments(proposalId);
  }

  async getReadiness(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    assertCanReadProposal(actor, proposal);
    return this.computeReadiness(proposal);
  }

  async submitProposal(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    assertCanEditProposalDraft(actor, proposal);
    this.assertEditableDraft(proposal);

    const intake = await this.findIntakePeriod(proposal.intakePeriodId);
    this.assertIntakeEligibleForProposal(actor, intake);

    const readiness = await this.computeReadiness(proposal);
    if (!readiness.ready) {
      throw new BadRequestException({
        message: "Hồ sơ chưa đủ điều kiện nộp chính thức.",
        missingFields: readiness.missingFields,
        missingFiles: readiness.missingFiles
      });
    }

    const submittedAt = new Date();
    const submitted = (await this.prisma.$transaction(async (tx) => {
      const updated = (await tx.researchProposal.update({
        where: { id: proposalId },
        data: {
          status: "submitted",
          submittedAt,
          submittedById: actor.id
        } as never
      })) as ResearchProposalRecord;

      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: actor.id,
          fromStatus: "draft",
          toStatus: "submitted",
          submittedAt,
          note: "PI nộp hồ sơ chính thức"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "submit-proposal",
          result: "success",
          actorId: actor.id,
          targetEntity: "research-proposal",
          targetEntityId: proposalId,
          username: actor.username
        }
      });

      return updated;
    })) as unknown as ResearchProposalRecord;

    return this.toProposalDetailResponse(submitted, undefined, actor);
  }

  async listHistory(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    assertCanReadProposal(actor, proposal);
    const records = (await this.prisma.proposalSubmissionEvent.findMany({
      where: { proposalId },
      orderBy: { submittedAt: "asc" }
    })) as ProposalSubmissionEventRecord[];

    return records.map((record) => this.toHistoryResponse(record));
  }

  private async findProposal(proposalId: string) {
    const proposal = (await this.prisma.researchProposal.findUnique({
      where: { id: proposalId }
    })) as ResearchProposalRecord | null;

    if (!proposal) {
      throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
    }

    return proposal;
  }

  private async findIntakePeriod(intakePeriodId: string) {
    const intake = (await this.prisma.proposalIntakePeriod.findUnique({
      where: { id: intakePeriodId }
    })) as IntakePeriodRecord | null;

    if (!intake) {
      throw new BadRequestException({ message: "Đợt tiếp nhận không hợp lệ." });
    }

    return intake;
  }

  private assertIntakeEligibleForProposal(actor: SafeUserContext, intake: IntakePeriodRecord) {
    if (!isIntakeOpenForSubmission(intake) || !intakeAppliesToUser(intake, actor)) {
      throw new BadRequestException({ message: "Đợt tiếp nhận không còn mở hoặc không áp dụng cho người dùng hiện hành." });
    }
  }

  private assertEditableDraft(proposal: ResearchProposalRecord) {
    if (proposal.status !== "draft") {
      throw new BadRequestException({ message: "Hồ sơ đã nộp không còn được sửa trong bước này." });
    }
  }

  private async replaceMembers(proposalId: string, members: ProposalMemberInput[]) {
    await this.prisma.proposalMember.deleteMany({ where: { proposalId } });
    if (members.length) {
      await this.prisma.proposalMember.createMany({
        data: members.map((member) => ({ proposalId, ...member }))
      });
    }
  }

  private async findMembers(proposalId: string) {
    return (await this.prisma.proposalMember.findMany({
      where: { proposalId },
      orderBy: { createdAt: "asc" }
    })) as ProposalMemberRecord[];
  }

  private async findAttachments(proposalId: string) {
    const records = (await this.prisma.fileRecord.findMany({
      where: { relatedEntityType: "research_proposal", relatedEntityId: proposalId, status: "active", deletedAt: null },
      orderBy: { createdAt: "asc" }
    })) as ProposalAttachmentRecord[];
    return records.map((attachment) => this.toAttachmentResponse(attachment));
  }

  private async getRequiredPackageForProposal(proposal: ResearchProposalRecord) {
    const intake = await this.findIntakePeriod(proposal.intakePeriodId);
    return normalizeRequiredPackage(intake.requiredPackage);
  }

  private async computeReadiness(proposal: ResearchProposalRecord) {
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);
    const attachments = await this.findAttachments(proposal.id);
    const members = await this.findMembers(proposal.id);
    const missingFields = this.getMissingFields(proposal, members);
    const missingFiles = requiredPackage
      .filter((item) => !attachments.some((attachment) => attachment.requirementCode === item.code))
      .map((item) => ({ code: item.code, label: item.label }));

    return {
      ready: missingFields.length === 0 && missingFiles.length === 0,
      missingFields,
      missingFiles
    };
  }

  private getMissingFields(proposal: ResearchProposalRecord, members: ProposalMemberRecord[]): ProposalMissingItem[] {
    const missing: ProposalMissingItem[] = [];
    const budget = proposal.budgetMetadata as { amount?: unknown } | null | undefined;

    if (!proposal.title) {
      missing.push({ code: "title", label: "Tên đề tài" });
    }
    if (!proposal.hostOrganizationUnitId) {
      missing.push({ code: "host-organization-unit", label: "Đơn vị chủ trì" });
    }
    if (!proposal.researchFieldCode) {
      missing.push({ code: "research-field", label: "Lĩnh vực nghiên cứu" });
    }
    if (!proposal.proposalTypeCode) {
      missing.push({ code: "proposal-type", label: "Loại đề tài" });
    }
    if (!proposal.startDate || !proposal.endDate || proposal.endDate.getTime() <= proposal.startDate.getTime()) {
      missing.push({ code: "timeline", label: "Thời gian thực hiện hợp lệ" });
    }
    if (!proposal.objectives) {
      missing.push({ code: "objectives", label: "Mục tiêu nghiên cứu" });
    }
    if (!proposal.summary) {
      missing.push({ code: "summary", label: "Tóm tắt đề tài" });
    }
    if (!budget || typeof budget.amount !== "number" || budget.amount <= 0) {
      missing.push({ code: "budget", label: "Kinh phí dự kiến" });
    }
    if (members.length === 0) {
      missing.push({ code: "members", label: "Chủ nhiệm/thành viên thực hiện" });
    }

    return missing;
  }

  private async toProposalDetailResponse(proposal: ResearchProposalRecord, providedMembers?: ProposalMemberInput[], actor?: SafeUserContext) {
    const members = providedMembers ?? (await this.findMembers(proposal.id));
    const attachments = await this.findAttachments(proposal.id);
    const history = await this.listHistoryForProposal(proposal.id);
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);

    return {
      ...this.toProposalResponse(proposal, actor),
      members,
      attachments,
      history,
      requiredPackage
    };
  }

  private toProposalResponse(proposal: ResearchProposalRecord, actor?: SafeUserContext) {
    const canEditDraft = Boolean(actor && proposal.status === "draft" && isPrincipalInvestigator(actor) && proposal.ownerId === actor.id);

    return {
      id: proposal.id,
      code: proposal.code ?? "",
      intakePeriodId: proposal.intakePeriodId,
      ownerId: proposal.ownerId,
      hostOrganizationUnitId: proposal.hostOrganizationUnitId,
      researchFieldCode: proposal.researchFieldCode ?? "",
      proposalTypeCode: proposal.proposalTypeCode ?? "",
      title: proposal.title,
      objectives: proposal.objectives ?? "",
      summary: proposal.summary ?? "",
      startDate: proposal.startDate?.toISOString() ?? "",
      endDate: proposal.endDate?.toISOString() ?? "",
      budgetMetadata: proposal.budgetMetadata ?? {},
      status: proposal.status,
      submittedAt: proposal.submittedAt?.toISOString() ?? "",
      submittedById: proposal.submittedById ?? "",
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
      canEdit: canEditDraft,
      canSubmit: canEditDraft
    };
  }

  private toAttachmentResponse(attachment: ProposalAttachmentRecord) {
    return {
      id: attachment.id,
      proposalId: attachment.proposalId ?? attachment.relatedEntityId ?? "",
      relatedEntityType: attachment.relatedEntityType ?? "research_proposal",
      relatedEntityId: attachment.relatedEntityId ?? attachment.proposalId ?? "",
      filePurpose: attachment.filePurpose ?? attachment.requirementCode ?? "",
      requirementCode: attachment.requirementCode ?? attachment.filePurpose ?? "",
      fileName: attachment.fileName ?? attachment.originalFileName ?? "",
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedById: attachment.uploadedById,
      status: attachment.status,
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString()
    };
  }

  private async listHistoryForProposal(proposalId: string) {
    const records = (await this.prisma.proposalSubmissionEvent.findMany({
      where: { proposalId },
      orderBy: { submittedAt: "asc" }
    })) as ProposalSubmissionEventRecord[];

    return records.map((record) => this.toHistoryResponse(record));
  }

  private toHistoryResponse(record: ProposalSubmissionEventRecord) {
    return {
      id: record.id,
      proposalId: record.proposalId,
      actorId: record.actorId,
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      submittedAt: record.submittedAt.toISOString(),
      note: record.note ?? ""
    };
  }
}
