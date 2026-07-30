import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  assertCanEditProposalDraft,
  assertCanReadProposal,
  assertHasOrganizationScope,
  assertCanCreateProposalDraft,
  canReadProposal,
  intakeAppliesToUser,
  isIntakeOpenForSubmission,
  isScientificManagement,
  isSystemAdmin
} from "../proposals-shared/proposal-access.js";
import {
  evaluateProposalConflict,
  getParticipationRoleLabel,
  normalizeParticipationRole,
  type ProposalParticipation
} from "../proposals-shared/proposal-participation.js";
import { getAssignmentRoleLabel, type ProposalReviewAccess } from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import type { ProposalMemberPersistInput, ProposalMissingItem } from "../proposals-shared/proposal-types.js";
import { ProposalParticipationService } from "./proposal-participation.service.js";
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

type ProposalMemberRecord = {
  id: string;
  proposalId: string;
  name: string;
  role: string;
  organization: string;
  userId: string | null;
  participationRole: string | null;
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
  description?: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy?: {
    displayName: string;
  } | null;
};

type ProposalSubmissionEventRecord = {
  id: string;
  proposalId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  submittedAt: Date;
  note: string | null;
  actor?: {
    displayName: string;
  } | null;
};

type ProposalSupplementRequestRecord = {
  id: string;
  proposalId: string;
  actorId: string;
  reason: string;
  dueDate: Date;
  requestedAt: Date;
  resolvedAt: Date | null;
  status: string;
  actor?: {
    displayName: string;
  } | null;
};

@Injectable()
export class ResearchProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService
  ) {}

  async listProposals(actor: SafeUserContext) {
    const records = (await this.prisma.researchProposal.findMany({
      orderBy: { createdAt: "desc" }
    })) as ResearchProposalRecord[];

    const [participationByProposal, reviewAccessByProposal] = await Promise.all([
      this.participation.resolveForProposals(actor?.id, records),
      this.reviewAccess.resolveForProposals(
        actor?.id,
        records.map((proposal) => proposal.id)
      )
    ]);

    return records
      .filter((proposal) => canReadProposal(actor, proposal, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id)))
      .map((proposal) =>
        this.toProposalResponse(proposal, actor, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id))
      );
  }

  async getProposal(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    const [participation, reviewAccess] = await Promise.all([
      this.participation.resolveForProposal(actor?.id, proposal),
      this.reviewAccess.resolveForProposal(actor?.id, proposalId)
    ]);
    assertCanReadProposal(actor, proposal, participation, reviewAccess);
    return this.toProposalDetailResponse(proposal, actor, participation, reviewAccess);
  }

  async createDraft(actor: SafeUserContext, input: Record<string, unknown>) {
    const pi = assertCanCreateProposalDraft(actor);
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
    // Account resolution runs before the write so an unknown account rejects the whole create
    // rather than leaving a committed draft behind with no audit entry.
    const resolvedMembers = members?.length ? await this.participation.resolveMemberAccounts(members) : undefined;
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

    if (resolvedMembers?.length) {
      await this.replaceMembers(proposal.id, resolvedMembers, pi);
    }

    await this.auditLog.record({
      action: "create-proposal-draft",
      result: "success",
      actorId: pi.id,
      targetEntity: "research-proposal",
      targetEntityId: proposal.id,
      username: pi.username
    });

    return this.toProposalDetailResponse(proposal, pi);
  }

  async updateDraft(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await this.findProposal(proposalId);
    this.assertCanMutateProposalContent(actor, proposal);

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
    // Account resolution runs before the write so an unknown account rejects the whole update.
    const resolvedMembers = members ? await this.participation.resolveMemberAccounts(members) : undefined;
    const updated = (await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: data as never
    })) as ResearchProposalRecord;

    if (resolvedMembers) {
      await this.replaceMembers(proposalId, resolvedMembers, actor);
    }

    await this.auditLog.record({
      action: proposal.status === "supplement_requested" ? "update-proposal-during-supplement" : "update-proposal-draft",
      result: "success",
      actorId: actor.id,
      targetEntity: "research-proposal",
      targetEntityId: proposalId,
      username: actor.username
    });

    return this.toProposalDetailResponse(updated, actor);
  }

  async listAttachments(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    await this.assertReadableProposal(actor, proposal);
    return this.findAttachments(proposalId, { canMutate: this.canMutateProposalFiles(actor, proposal) });
  }

  async getReadiness(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    await this.assertReadableProposal(actor, proposal);
    return this.computeReadiness(proposal);
  }

  async submitProposal(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    const pi = this.assertCanMutateProposalDraft(actor, proposal);

    const intake = await this.findIntakePeriod(proposal.intakePeriodId);
    this.assertIntakeEligibleForProposal(pi, intake);

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
          fromStatus: proposal.status,
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
          username: actor.username,
          reason: JSON.stringify({
            fromStatus: proposal.status,
            toStatus: "submitted",
            readinessReady: readiness.ready,
            missingFields: readiness.missingFields.length,
            missingFiles: readiness.missingFiles.length
          })
        }
      });

      return updated;
    })) as unknown as ResearchProposalRecord;

    return this.toProposalDetailResponse(submitted, actor);
  }

  async requestSupplement(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await this.findProposal(proposalId);
    this.assertCanRequestSupplement(actor, proposal);
    if (proposal.status !== "submitted") {
      throw new BadRequestException({ message: "Chỉ hồ sơ đã nộp chính thức mới được yêu cầu bổ sung ở bước này." });
    }

    const reason = readText(input.reason, "reason", 2000);
    const dueDate = readDate(input.dueDate, "dueDate");
    const requestedAt = new Date();
    const updated = (await this.prisma.$transaction(async (tx) => {
      const record = (await tx.researchProposal.update({
        where: { id: proposalId },
        data: { status: "supplement_requested" } as never
      })) as ResearchProposalRecord;

      await tx.proposalSupplementRequest.create({
        data: {
          proposalId,
          actorId: actor.id,
          reason,
          dueDate,
          requestedAt,
          status: "open"
        } as never
      });

      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: actor.id,
          fromStatus: proposal.status,
          toStatus: "supplement_requested",
          submittedAt: requestedAt,
          note: "Staff yêu cầu bổ sung hồ sơ"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "request-supplement",
          result: "success",
          actorId: actor.id,
          targetEntity: "research-proposal",
          targetEntityId: proposalId,
          username: actor.username,
          reason: JSON.stringify({
            fromStatus: proposal.status,
            toStatus: "supplement_requested",
            dueDate: dueDate.toISOString(),
            reason
          })
        }
      });

      return record;
    })) as unknown as ResearchProposalRecord;

    return this.toProposalDetailResponse(updated, actor);
  }

  async resubmitProposal(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    const pi = this.assertCanResubmitSupplement(actor, proposal);
    const openRequest = await this.findOpenSupplementRequest(proposalId);
    if (!openRequest) {
      throw new BadRequestException({ message: "Không tìm thấy yêu cầu bổ sung đang mở." });
    }

    const readiness = await this.computeReadiness(proposal);
    if (!readiness.ready) {
      throw new BadRequestException({
        message: "Hồ sơ chưa đủ điều kiện nộp lại.",
        missingFields: readiness.missingFields,
        missingFiles: readiness.missingFiles
      });
    }

    const submittedAt = new Date();
    const updated = (await this.prisma.$transaction(async (tx) => {
      const record = (await tx.researchProposal.update({
        where: { id: proposalId },
        data: {
          status: "resubmitted",
          submittedAt,
          submittedById: pi.id
        } as never
      })) as ResearchProposalRecord;

      await tx.proposalSupplementRequest.update({
        where: { id: openRequest.id },
        data: {
          status: "resolved",
          resolvedAt: submittedAt
        } as never
      });

      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: pi.id,
          fromStatus: proposal.status,
          toStatus: "resubmitted",
          submittedAt,
          note: "PI nộp lại hồ sơ sau yêu cầu bổ sung"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "resubmit-proposal",
          result: "success",
          actorId: pi.id,
          targetEntity: "research-proposal",
          targetEntityId: proposalId,
          username: pi.username,
          reason: JSON.stringify({
            fromStatus: proposal.status,
            toStatus: "resubmitted",
            supplementRequestId: openRequest.id,
            readinessReady: readiness.ready,
            missingFields: readiness.missingFields.length,
            missingFiles: readiness.missingFiles.length
          })
        }
      });

      return record;
    })) as unknown as ResearchProposalRecord;

    return this.toProposalDetailResponse(updated, pi);
  }

  async listHistory(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    await this.assertReadableProposal(actor, proposal);
    const records = (await this.prisma.proposalSubmissionEvent.findMany({
      where: { proposalId },
      orderBy: { submittedAt: "asc" },
      include: {
        actor: {
          select: { displayName: true }
        }
      }
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

  private assertCanMutateProposalDraft(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    const pi = assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(pi, proposal.hostOrganizationUnitId);
    this.assertEditableDraft(proposal);
    return pi;
  }

  private assertCanMutateProposalContent(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    const pi = assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(pi, proposal.hostOrganizationUnitId);
    if (proposal.status !== "draft" && proposal.status !== "supplement_requested") {
      throw new BadRequestException({ message: "Hồ sơ không ở trạng thái cho phép chỉnh sửa." });
    }
    return pi;
  }

  private assertCanRequestSupplement(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    if (!isScientificManagement(actor)) {
      throw new ForbiddenException({ message: "Chỉ chuyên viên quản lý khoa học được yêu cầu bổ sung hồ sơ." });
    }
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
  }

  private assertCanResubmitSupplement(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    const pi = assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(pi, proposal.hostOrganizationUnitId);
    if (proposal.status !== "supplement_requested") {
      throw new BadRequestException({ message: "Chỉ hồ sơ đang chờ bổ sung mới được nộp lại." });
    }
    return pi;
  }

  /**
   * Replaces the participation list and records what changed (AUD-ST-3.0-01). Newly linked
   * accounts are audited individually so a participation-to-account link is traceable on its own,
   * not just as part of a bulk edit.
   */
  private async replaceMembers(proposalId: string, members: ProposalMemberPersistInput[], actor: SafeUserContext) {
    const previous = await this.findMembers(proposalId);
    const previousUserIds = new Set(previous.map((member) => member.userId).filter((value): value is string => Boolean(value)));
    const nextUserIds = new Set(members.map((member) => member.userId).filter((value): value is string => Boolean(value)));

    await this.prisma.proposalMember.deleteMany({ where: { proposalId } });
    if (members.length) {
      await this.prisma.proposalMember.createMany({
        data: members.map((member) => ({ proposalId, ...member }))
      });
    }

    for (const member of members) {
      if (member.userId && !previousUserIds.has(member.userId)) {
        await this.auditLog.record({
          action: "link-proposal-participant",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-participation",
          targetEntityId: proposalId,
          username: actor.username,
          reason: JSON.stringify({
            proposalId,
            linkedUserId: member.userId,
            participationRole: member.participationRole,
            name: member.name
          })
        });
      }
    }

    await this.auditLog.record({
      action: "update-proposal-participation",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-participation",
      targetEntityId: proposalId,
      username: actor.username,
      reason: JSON.stringify({
        proposalId,
        previousCount: previous.length,
        nextCount: members.length,
        linkedUserIds: [...nextUserIds].filter((userId) => !previousUserIds.has(userId)),
        unlinkedUserIds: [...previousUserIds].filter((userId) => !nextUserIds.has(userId))
      })
    });
  }

  private async findMembers(proposalId: string) {
    return (await this.prisma.proposalMember.findMany({
      where: { proposalId },
      orderBy: { createdAt: "asc" }
    })) as ProposalMemberRecord[];
  }

  private async findAttachments(proposalId: string, options: { canMutate: boolean } = { canMutate: false }) {
    const records = (await this.prisma.fileRecord.findMany({
      where: { relatedEntityType: "research_proposal", relatedEntityId: proposalId, status: "active", deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        uploadedBy: {
          select: { displayName: true }
        }
      }
    })) as ProposalAttachmentRecord[];
    return records.map((attachment) => this.toAttachmentResponse(attachment, options));
  }

  private async getRequiredPackageForProposal(proposal: ResearchProposalRecord) {
    const intake = await this.findIntakePeriod(proposal.intakePeriodId);
    return normalizeRequiredPackage(intake.requiredPackage);
  }

  private async computeReadiness(proposal: ResearchProposalRecord) {
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);
    const attachments = (await this.findAttachments(proposal.id)).map((attachment) => ({
      ...attachment,
      canEdit: false,
      canDelete: false
    }));
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

  private async toProposalDetailResponse(
    proposal: ResearchProposalRecord,
    actor?: SafeUserContext,
    resolvedParticipation?: ProposalParticipation,
    resolvedReviewAccess?: ProposalReviewAccess
  ) {
    const members = await this.findMembers(proposal.id);
    const participation = resolvedParticipation ?? (await this.participation.resolveForProposal(actor?.id, proposal, members));
    const reviewAccess = resolvedReviewAccess ?? (await this.reviewAccess.resolveForProposal(actor?.id, proposal.id));
    const attachments = await this.findAttachments(proposal.id, { canMutate: this.canMutateProposalFiles(actor, proposal) });
    const history = await this.listHistoryForProposal(proposal.id);
    const supplementRequests = await this.listSupplementRequestsForProposal(proposal.id);
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);

    return {
      ...this.toProposalResponse(proposal, actor, participation, reviewAccess),
      members: members.map((member) => this.toMemberResponse(member)),
      attachments,
      history,
      supplementRequests,
      requiredPackage
    };
  }

  private toMemberResponse(member: ProposalMemberRecord) {
    const participationRole = normalizeParticipationRole(member.participationRole ?? member.role);

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      organization: member.organization,
      userId: member.userId ?? "",
      isAccountLinked: Boolean(member.userId),
      participationRole,
      participationRoleLabel: getParticipationRoleLabel(participationRole)
    };
  }

  /**
   * The viewer's role on this specific record plus the conflict statement behind it, so the UI can
   * state the record role (UX-DR26) and explain a blocked control instead of hiding it (UX-DR27).
   */
  private toViewerParticipation(participation?: ProposalParticipation) {
    const conflict = evaluateProposalConflict(participation);

    return {
      role: participation?.role ?? "unknown",
      label: participation?.label ?? getParticipationRoleLabel("unknown"),
      roles: participation?.roles ?? [],
      labels: participation?.labels ?? [],
      isOwner: participation?.isOwner ?? false,
      isParticipant: participation?.isParticipant ?? false,
      conflict: {
        conflicted: conflict.conflicted,
        reasonCode: conflict.reasonCode,
        reason: conflict.reason,
        message: conflict.viewerMessage
      }
    };
  }

  private async assertReadableProposal(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    const [participation, reviewAccess] = await Promise.all([
      this.participation.resolveForProposal(actor?.id, proposal),
      this.reviewAccess.resolveForProposal(actor?.id, proposal.id)
    ]);
    assertCanReadProposal(actor, proposal, participation, reviewAccess);
    return participation;
  }

  private canMutateProposalFiles(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord) {
    if (
      !actor ||
      (proposal.status !== "draft" && proposal.status !== "supplement_requested") ||
      proposal.ownerId !== actor.id
    ) {
      return false;
    }

    try {
      assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
      return true;
    } catch {
      return false;
    }
  }

  private toProposalResponse(
    proposal: ResearchProposalRecord,
    actor?: SafeUserContext,
    participation?: ProposalParticipation,
    reviewAccess?: ProposalReviewAccess
  ) {
    const canEditDraft = this.canEditProposalDraft(actor, proposal);

    return {
      viewerParticipation: this.toViewerParticipation(participation),
      // EP-03 UI hints. The backend stays authoritative — every evaluation endpoint re-checks
      // authority, workflow state and conflict for itself.
      viewerReviewAssignment: {
        isAssignedReviewer: reviewAccess?.isAssignedReviewer ?? false,
        assignmentId: reviewAccess?.assignmentId ?? "",
        assignmentRole: reviewAccess?.assignmentRole ?? "none",
        assignmentRoleLabel: reviewAccess?.isAssignedReviewer ? getAssignmentRoleLabel(reviewAccess.assignmentRole) : ""
      },
      statusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
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

  private canEditProposalDraft(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord) {
    if (
      !actor ||
      (proposal.status !== "draft" && proposal.status !== "supplement_requested") ||
      proposal.ownerId !== actor.id
    ) {
      return false;
    }

    try {
      assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
      return true;
    } catch {
      return false;
    }
  }

  private toAttachmentResponse(attachment: ProposalAttachmentRecord, options: { canMutate: boolean }) {
    return {
      id: attachment.id,
      proposalId: attachment.proposalId ?? attachment.relatedEntityId ?? "",
      relatedEntityType: attachment.relatedEntityType ?? "research_proposal",
      relatedEntityId: attachment.relatedEntityId ?? attachment.proposalId ?? "",
      filePurpose: attachment.filePurpose ?? attachment.requirementCode ?? "",
      requirementCode: attachment.requirementCode ?? attachment.filePurpose ?? "",
      fileName: attachment.fileName ?? attachment.originalFileName ?? "",
      description: attachment.description ?? null,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedById: attachment.uploadedById,
      uploaderDisplayName: attachment.uploadedBy?.displayName ?? "",
      status: attachment.status,
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString(),
      canEdit: options.canMutate,
      canDelete: options.canMutate
    };
  }

  private async listHistoryForProposal(proposalId: string) {
    const records = (await this.prisma.proposalSubmissionEvent.findMany({
      where: { proposalId },
      orderBy: { submittedAt: "asc" },
      include: {
        actor: {
          select: { displayName: true }
        }
      }
    })) as ProposalSubmissionEventRecord[];

    return records.map((record) => this.toHistoryResponse(record));
  }

  private async findOpenSupplementRequest(proposalId: string) {
    return (await this.prisma.proposalSupplementRequest.findFirst({
      where: { proposalId, status: "open" },
      orderBy: { requestedAt: "desc" }
    })) as ProposalSupplementRequestRecord | null;
  }

  private async listSupplementRequestsForProposal(proposalId: string) {
    const records = (await this.prisma.proposalSupplementRequest.findMany({
      where: { proposalId },
      orderBy: { requestedAt: "asc" },
      include: {
        actor: {
          select: { displayName: true }
        }
      }
    })) as ProposalSupplementRequestRecord[];

    return records.map((record) => this.toSupplementRequestResponse(record));
  }

  private toSupplementRequestResponse(record: ProposalSupplementRequestRecord) {
    return {
      id: record.id,
      proposalId: record.proposalId,
      actorId: record.actorId,
      actorDisplayName: record.actor?.displayName ?? "",
      reason: record.reason,
      dueDate: record.dueDate.toISOString(),
      requestedAt: record.requestedAt.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString() ?? "",
      status: record.status
    };
  }

  private toHistoryResponse(record: ProposalSubmissionEventRecord) {
    return {
      id: record.id,
      proposalId: record.proposalId,
      actorId: record.actorId,
      actorDisplayName: record.actor?.displayName ?? "",
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      submittedAt: record.submittedAt.toISOString(),
      note: record.note ?? ""
    };
  }
}
