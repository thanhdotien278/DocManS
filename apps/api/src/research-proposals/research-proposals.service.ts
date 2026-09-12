import { proposalContextVersion, runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
// @ts-ignore The runtime package is JavaScript; its TypeScript source entry supplies this contract.
import { isContextVersionTokenV1, type ContextVersionTokenV1 } from "@rtms/permissions";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
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
  isRelationshipActiveAt,
  normalizeParticipationRole,
  type ProposalParticipation
} from "../proposals-shared/proposal-participation.js";
import { getAssignmentRoleLabel, type ProposalReviewAccess } from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import type { ProposalMemberPersistInput, ProposalMissingItem } from "../proposals-shared/proposal-types.js";
import { ProposalParticipationService } from "./proposal-participation.service.js";
import { projectProposalViewerAuthorizationV1 } from "../permissions/proposal-capability-v1.js";
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
  applicableOrganizationUnitIds: string[];
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
  authorizationRelationshipVersion: number;
  authorizationConflictVersion: number;
  authorizationDelegationVersion: number;
  authorizationContextUpdatedAt: Date;
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
  status: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
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
  snapshot?: unknown;
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

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, id: string | null, context: unknown, work: (service: ResearchProposalsService, currentActor: SafeUserContext) => Promise<T>): Promise<T> {
    return runProposalMutation(this.prisma, actor, id, context, async (tx, currentActor) => {
      const service = new ResearchProposalsService(tx, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx));
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  async listProposals(actor: SafeUserContext) {
    const asOf = new Date();
    const records = (await this.prisma.researchProposal.findMany({
      orderBy: { createdAt: "desc" }
    })) as ResearchProposalRecord[];

    const [participationByProposal, reviewAccessByProposal] = await Promise.all([
      this.participation.resolveForProposals(actor?.id, records, asOf),
      this.reviewAccess.resolveForProposals(
        actor?.id,
        records.map((proposal) => proposal.id),
        asOf
      )
    ]);

    const delegatedIds = new Set<string>();
    for (const proposal of records) if ((await this.availableDelegations(actor, proposal)).length) delegatedIds.add(proposal.id);
    return records
      .filter((proposal) => delegatedIds.has(proposal.id) || canReadProposal(actor, proposal, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id)))
      .map((proposal) =>
        this.toProposalResponse(proposal, actor, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id))
      );
  }

  async getProposal(actor: SafeUserContext, proposalId: string) {
    const asOf = new Date();
    const proposal = await this.findProposal(proposalId);
    const [participation, reviewAccess] = await Promise.all([
      this.participation.resolveForProposal(actor?.id, proposal, undefined, asOf),
      this.reviewAccess.resolveForProposal(actor?.id, proposalId, asOf)
    ]);
    if (!(await this.availableDelegations(actor, proposal)).length) assertCanReadProposal(actor, proposal, participation, reviewAccess);
    return this.toProposalDetailResponse(proposal, actor, participation, reviewAccess);
  }

  async createDraft(actor: SafeUserContext, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, null, undefined, (service, a) => service.createDraft(a, input));
    const pi = assertCanCreateProposalDraft(actor);
    await this.validateCatalogs(input);
    const intakePeriodId = readText(input.intakePeriodId, "intakePeriodId", 80);
    const hostOrganizationUnitId = readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
    assertHasOrganizationScope(pi, hostOrganizationUnitId);

    const intake = await this.findIntakePeriod(intakePeriodId);
    this.assertIntakeEligibleForProposal(pi, intake);
    this.assertIntakeUnit(intake, hostOrganizationUnitId);

    const startDate = readOptionalDate(input.startDate, "startDate");
    const endDate = readOptionalDate(input.endDate, "endDate");
    if (startDate && endDate) {
      assertDateRange(startDate, endDate);
    }

    const members = readMembers(input.members);
    // Account resolution runs before the write so an unknown account rejects the whole create
    // rather than leaving a committed draft behind with no audit entry.
    const resolvedMembers = members?.length ? await this.participation.resolveMemberAccounts(members) : undefined;
    let proposal = (await this.prisma.researchProposal.create({
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
      proposal = await this.findProposal(proposal.id);
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

  async updateDraft(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.updateDraft(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    this.assertCanMutateProposalContent(actor, proposal);
    await this.validateCatalogs(input);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      data.title = readText(input.title, "title", 260);
    }
    if (input.hostOrganizationUnitId !== undefined) {
      const hostOrganizationUnitId = readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
      assertHasOrganizationScope(actor, hostOrganizationUnitId);
      this.assertIntakeUnit(await this.findIntakePeriod(proposal.intakePeriodId), hostOrganizationUnitId);
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
    const expectedContextVersion = resolvedMembers ? this.readProposalContextVersion(input.contextVersion, proposalId) : undefined;
    if (resolvedMembers) {
      await this.replaceMembers(proposalId, resolvedMembers, actor, expectedContextVersion);
    }
    const updated = (await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: data as never
    })) as ResearchProposalRecord;

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
    return (await this.getProposal(actor, proposalId)).attachments;
  }

  async getReadiness(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    await this.assertReadableProposal(actor, proposal);
    return this.computeReadiness(proposal);
  }

  async submitProposal(actor: SafeUserContext, proposalId: string, delegatedInput: { delegationId?: string; contextVersion?: unknown } = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, delegatedInput.contextVersion, (service, a) => service.submitProposal(a, proposalId, delegatedInput));
    const proposal = await this.findProposal(proposalId);
    this.assertEditableDraft(proposal);
    const delegated = delegatedInput.delegationId ? await this.resolveDelegatedAction(actor, proposal, delegatedInput.delegationId, "proposal.submit", delegatedInput.contextVersion) : false;
    const pi = delegated ? actor : this.assertCanMutateProposalDraft(actor, proposal);

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
      if (delegated) await this.resolveDelegatedAction(actor, proposal, delegatedInput.delegationId!, "proposal.submit", delegatedInput.contextVersion, tx);
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
          snapshot: await this.submissionSnapshot(proposal),
          note: delegated ? "Nộp hồ sơ theo ủy quyền hành động" : "PI nộp hồ sơ chính thức"
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

  private async availableDelegations(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    if (!["draft", "supplement_requested"].includes(proposal.status) || proposal.ownerId === actor.id) return [];
    const grants = await this.prisma.proposalDelegation.findMany({ where: { proposalId: proposal.id, delegateUserId: actor.id, status: "ACTIVE" } });
    const valid: Array<{ id: string }> = [];
    for (const grant of grants) {
      try { await this.resolveDelegatedAction(actor, proposal, grant.id, "proposal.submit", proposalContextVersion(proposal)); valid.push({ id: grant.id }); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    return valid;
  }

  private async resolveDelegatedAction(actor: SafeUserContext, proposal: ResearchProposalRecord, delegationId: string, action: string, expectedContext: unknown, client: any = this.prisma) {
    if (!expectedContext || typeof expectedContext !== "object") throw new ForbiddenException({ message: "Thiếu contextVersion cho hành động được ủy quyền.", code: "CONTEXT_VERSION_MISMATCH" });
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    const grant = await client.proposalDelegation.findUnique({ where: { id: delegationId }, include: { grantor: true } });
    const now = new Date();
    const actions = Array.isArray(grant?.actionIds) ? grant.actionIds : [];
    const sourceActive = grant?.grantor.status === "active" && grant.grantor.systemRole === "RESEARCHER_INTERNAL_USER" && actor.systemRole === "RESEARCHER_INTERNAL_USER" && grant.grantorUserId === proposal.ownerId && Boolean(await client.userOrganizationScope.findFirst({ where: { userId: grant.grantorUserId, organizationUnitId: proposal.hostOrganizationUnitId } }));
    const valid = Boolean(grant && grant.proposalId === proposal.id && grant.delegateUserId === actor.id && grant.status === "ACTIVE" && grant.approvedAt && grant.approverUserId && grant.approverUserId !== grant.grantorUserId && grant.approverUserId !== actor.id && !grant.revokedAt && grant.targetOrganizationUnitId === proposal.hostOrganizationUnitId && actions.length === 1 && actions[0] === action && grant.startsAt <= now && (!grant.endsAt || now < grant.endsAt) && sourceActive);
    if (!valid) throw new ForbiddenException({ message: "Ủy quyền cho hành động này không hợp lệ.", code: "DELEGATION_INVALID" });
    const current = { domain: "proposal", recordId: proposal.id, aggregateVersion: proposal.updatedAt.getTime(), relationshipVersion: proposal.authorizationRelationshipVersion, conflictVersion: proposal.authorizationConflictVersion, delegationVersion: proposal.authorizationDelegationVersion, policyVersion: "v1" };
    if (!Object.entries(current).every(([key, value]) => (expectedContext as Record<string, unknown>)[key] === value)) throw new ForbiddenException({ message: "Dữ liệu phân quyền đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH" });
    return true;
  }

  async requestSupplement(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.requestSupplement(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    this.assertCanRequestSupplement(actor, proposal);
    if (!["submitted", "resubmitted"].includes(proposal.status)) {
      throw new BadRequestException({ message: "Chỉ hồ sơ đã nộp hoặc nộp lại mới được yêu cầu bổ sung ở bước này." });
    }

    const reason = readText(input.reason, "reason", 2000);
    const dueDate = readDate(input.dueDate, "dueDate");
    const requestedAt = new Date();
    if (dueDate <= requestedAt) throw new BadRequestException({ message: "Hạn bổ sung phải ở tương lai." });
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (participation.isParticipant && !participation.roles.includes("secretary")) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được tự kiểm tra hồ sơ." });
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
          snapshot: await this.submissionSnapshot(proposal),
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

  async resubmitProposal(actor: SafeUserContext, proposalId: string, input: { delegationId?: string; contextVersion?: unknown } = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.resubmitProposal(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    if (proposal.status !== "supplement_requested") throw new BadRequestException({ message: "Hồ sơ không đang chờ bổ sung." });
    const pi = input.delegationId && await this.resolveDelegatedAction(actor, proposal, input.delegationId, "proposal.submit", input.contextVersion) ? actor : this.assertCanResubmitSupplement(actor, proposal);
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
          snapshot: await this.submissionSnapshot(proposal),
          note: "Nộp lại hồ sơ sau yêu cầu bổ sung"
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

  async listCatalogs() {
    return this.prisma.catalogItem.findMany({ where: { status: "active", deletedAt: null, type: { in: ["research-field", "proposal-type"] } }, select: { id: true, type: true, code: true, name: true, status: true }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  }

  private async validateCatalogs(input: Record<string, unknown>) {
    for (const [field, type] of [["researchFieldCode", "research-field"], ["proposalTypeCode", "proposal-type"]]) {
      const code = input[field!];
      if (typeof code === "string" && code.trim() && !await this.prisma.catalogItem.findFirst({ where: { type, code: code.trim(), status: "active", deletedAt: null } })) throw new BadRequestException({ message: "Lĩnh vực hoặc loại đề tài không còn hợp lệ." });
    }
  }

  private assertIntakeUnit(intake: IntakePeriodRecord, unitId: string) {
    const ids = intake.applicableOrganizationUnitIds?.length ? intake.applicableOrganizationUnitIds : intake.applicableOrganizationUnitId ? [intake.applicableOrganizationUnitId] : [];
    if (ids.length && !ids.includes(unitId)) throw new BadRequestException({ message: "Đơn vị chủ trì không thuộc phạm vi đợt tiếp nhận." });
  }

  private async submissionSnapshot(proposal: ResearchProposalRecord) {
    const { ownerId, id, title, researchFieldCode, proposalTypeCode, objectives, summary, startDate, endDate, budgetMetadata, hostOrganizationUnitId } = proposal;
    return JSON.parse(JSON.stringify({ id, ownerId, title, researchFieldCode, proposalTypeCode, objectives, summary, startDate, endDate, budgetMetadata, hostOrganizationUnitId,
      members: (await this.findMembers(proposal.id)).filter((m) => isRelationshipActiveAt(m, new Date())).map((m) => this.toMemberResponse(m)),
      attachments: await this.findAttachments(proposal.id), requiredPackage: await this.getRequiredPackageForProposal(proposal) }));
  }

  async completeCheck(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.completeCheck(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    this.assertCanRequestSupplement(actor, proposal);
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (participation.isParticipant && !participation.roles.includes("secretary")) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được tự kiểm tra hồ sơ." });
    if (!["submitted", "resubmitted"].includes(proposal.status)) throw new BadRequestException({ message: "Hồ sơ không ở bước kiểm tra đầy đủ." });
    const readiness = await this.computeReadiness(proposal);
    if (!readiness.ready) throw new BadRequestException({ message: "Hồ sơ chưa đầy đủ.", ...readiness });
    await this.prisma.proposalSubmissionEvent.create({ data: { proposalId, actorId: actor.id, fromStatus: proposal.status, toStatus: proposal.status, note: "Đã kiểm tra hồ sơ đầy đủ", snapshot: { kind: "completeness_check", readiness, note: readOptionalText(input.note, "note", 2000) ?? "" } } });
    await this.prisma.researchProposal.update({ where: { id: proposalId }, data: { authorizationContextUpdatedAt: new Date() } });
    await this.auditLog.record({ action: "check-proposal-completeness", result: "success", actorId: actor.id, targetEntity: "research-proposal", targetEntityId: proposalId });
    return this.getProposal(actor, proposalId);
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
    assertCanCreateProposalDraft(actor);
    const pi = assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(pi, proposal.hostOrganizationUnitId);
    this.assertEditableDraft(proposal);
    return pi;
  }

  private assertCanMutateProposalContent(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    assertCanCreateProposalDraft(actor);
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
    assertCanCreateProposalDraft(actor);
    const pi = assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(pi, proposal.hostOrganizationUnitId);
    if (proposal.status !== "supplement_requested") {
      throw new BadRequestException({ message: "Chỉ hồ sơ đang chờ bổ sung mới được nộp lại." });
    }
    return pi;
  }

  /**
   * Synchronises the current participation set without deleting history. Rows removed from the
   * draft end at one UTC instant; re-adding the same actor+role creates a successor row.
   */
  private async replaceMembers(
    proposalId: string,
    members: ProposalMemberPersistInput[],
    actor: SafeUserContext,
    expectedContextVersion?: ContextVersionTokenV1
  ) {
    const proposal = await this.findProposal(proposalId);
    const principalInvestigators = members.filter((member) => normalizeParticipationRole(member.participationRole ?? member.role) === "principal-investigator");
    if (principalInvestigators.length > 1 || principalInvestigators.some((member) => member.userId && member.userId !== proposal.ownerId)) throw new BadRequestException({ message: "Hồ sơ chỉ có một chủ nhiệm chịu trách nhiệm, là người tạo hồ sơ." });
    let previous: ProposalMemberRecord[] = [];
    const nextUserIds = new Set(members.map((member) => member.userId).filter((value): value is string => Boolean(value)));
    const key = (member: { userId?: string | null; participationRole?: string | null; name: string; role: string; organization: string }) =>
      `${member.userId ?? `external:${member.name}:${member.organization}`}:${normalizeParticipationRole(member.participationRole ?? member.role)}`;
    const desiredKeys = members.map((member) => key(member));
    if (new Set(desiredKeys).size !== desiredKeys.length) {
      throw new BadRequestException({ message: "Không thể lưu quan hệ trùng loại trên cùng hồ sơ." });
    }
    const desired = new Map(members.map((member, index) => [desiredKeys[index]!, member]));
    let active: ProposalMemberRecord[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        const changedAt = await readTransactionClockV1(tx);
        previous = (await tx.proposalMember.findMany({ where: { proposalId } })) as ProposalMemberRecord[];
        active = previous.filter((member) => member.status === "ACTIVE" && (!member.effectiveUntil || member.effectiveUntil > changedAt));
        const activeByKey = new Map(active.map((member) => [key(member), member]));
        const sameMember = (current: ProposalMemberRecord, next: ProposalMemberPersistInput) =>
          current.name === next.name && current.role === next.role && current.organization === next.organization && current.userId === next.userId;
        const ending = active.filter((member) => {
          const next = desired.get(key(member));
          return !next || !sameMember(member, next);
        });
        const creating = [...desired]
          .filter(([memberKey, member]) => {
            const current = activeByKey.get(memberKey);
            return !current || !sameMember(current, member);
          })
          .map(([, member]) => member);
        for (const member of ending) {
          await tx.proposalMember.updateMany({
            where: { id: member.id, status: "ACTIVE" },
            data: { status: "ENDED", effectiveUntil: changedAt }
          } as never);
        }
        if (creating.length) {
          await tx.proposalMember.createMany({
            data: creating.map((member) => ({ proposalId, ...member, status: "ACTIVE", effectiveFrom: changedAt, effectiveUntil: null }))
          } as never);
        }
        // A submitted membership payload is an authorization-context refresh even when its
        // canonical set is unchanged; invalidate a capability obtained before this mutation.
        const contextUpdate = await tx.researchProposal.updateMany({
          where: {
            id: proposalId,
            ...(expectedContextVersion
              ? {
                  authorizationRelationshipVersion: expectedContextVersion.relationshipVersion,
                  authorizationConflictVersion: expectedContextVersion.conflictVersion
                }
              : {})
          },
          data: {
            authorizationRelationshipVersion: { increment: 1 },
            authorizationDelegationVersion: { increment: 1 },
            authorizationConflictVersion: { increment: 1 },
            authorizationContextUpdatedAt: changedAt
          } as never
        });
        if (expectedContextVersion && contextUpdate.count !== 1) {
          throw new ConflictException({
            message: "Dữ liệu phân quyền đã thay đổi. Vui lòng tải lại trước khi thử lại.",
            code: "CONTEXT_VERSION_MISMATCH"
          });
        }
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002" || (error as { meta?: { code?: string } })?.meta?.code === "23P01") {
        throw new BadRequestException({ message: "Không thể lưu quan hệ trùng hoặc chồng lấn trên cùng hồ sơ." });
      }
      throw error;
    }

    const previousUserIds = new Set(previous.map((member) => member.userId).filter((value): value is string => Boolean(value)));

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
        previousCount: active.length,
        nextCount: members.length,
        linkedUserIds: [...nextUserIds].filter((userId) => !previousUserIds.has(userId)),
        unlinkedUserIds: [...previousUserIds].filter((userId) => !nextUserIds.has(userId))
      })
    });
  }

  private readProposalContextVersion(value: unknown, proposalId: string): ContextVersionTokenV1 {
    if (!isContextVersionTokenV1(value)) {
      throw new BadRequestException({ message: "Thiếu hoặc không hợp lệ contextVersion của hồ sơ." });
    }
    const contextVersion = value as ContextVersionTokenV1;
    if (contextVersion.domain !== "proposal" || contextVersion.recordId !== proposalId || contextVersion.policyVersion !== "v1") {
      throw new BadRequestException({ message: "Thiếu hoặc không hợp lệ contextVersion của hồ sơ." });
    }
    return contextVersion;
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
    const evidence = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId }, select: { snapshot: true } });
    const locked = new Set(evidence.flatMap((e) => ((e.snapshot as { attachments?: Array<{ id: string }> } | null)?.attachments ?? []).map((file) => file.id)));
    return records.map((attachment) => this.toAttachmentResponse(attachment, { canMutate: options.canMutate && !locked.has(attachment.id) }));
  }

  private async getRequiredPackageForProposal(proposal: ResearchProposalRecord) {
    if (proposal.status !== "draft") {
      const events = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId: proposal.id }, orderBy: { submittedAt: "asc" }, select: { snapshot: true } });
      const locked = events.map((e) => (e.snapshot as { requiredPackage?: unknown } | null)?.requiredPackage).find(Boolean);
      if (locked) return normalizeRequiredPackage(locked);
    }
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
    const members = (await this.findMembers(proposal.id)).filter((member) => isRelationshipActiveAt(member, new Date()));
    const missingFields = this.getMissingFields(proposal, members);
    const missingFiles = requiredPackage
      .filter((item) => !attachments.some((attachment) => attachment.requirementCode === item.code && item.allowedMimeTypes.includes(attachment.mimeType) && attachment.sizeBytes <= item.maxSizeMb * 1024 * 1024))
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
    if (!budget || typeof budget.amount !== "number" || budget.amount < 0) {
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
    const attachments = await this.findAttachments(proposal.id, { canMutate: this.canMutateProposalFiles(actor, proposal, participation) });
    const history = await this.listHistoryForProposal(proposal.id);
    const supplementRequests = await this.listSupplementRequestsForProposal(proposal.id);
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);

    const availableDelegations = actor ? await this.availableDelegations(actor, proposal) : [];
    const response = this.toProposalResponse(proposal, actor, participation, reviewAccess);
    if (availableDelegations.length && response.viewerAuthorization) {
      response.viewerAuthorization.allowedActions = [...new Set([...response.viewerAuthorization.allowedActions, "proposal.read", "proposal.submit", "file.read"])].sort() as typeof response.viewerAuthorization.allowedActions;
      response.viewerAuthorization.blockedActions = response.viewerAuthorization.blockedActions.filter((a: { action: string }) => !["proposal.read", "proposal.submit", "file.read"].includes(a.action));
    }
    const versions = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId: proposal.id, toStatus: { in: ["submitted", "resubmitted"] } }, orderBy: { submittedAt: "asc" }, select: { id: true, submittedAt: true, snapshot: true } });
    return {
      ...response,
      availableDelegations,
      versions: reviewAccess.isAssignedReviewer && !participation.isParticipant ? [] : versions.filter((v) => v.snapshot && !(v.snapshot as { kind?: string }).kind).map((v, index) => ({ id: v.id, version: index + 1, submittedAt: v.submittedAt.toISOString(), content: v.snapshot })),
      members: members.map((member) => reviewAccess.isAssignedReviewer && !participation.isParticipant ? { id: member.id, name: member.name, role: member.role, organization: member.organization } : this.toMemberResponse(member)),
      attachments: reviewAccess.isAssignedReviewer && !participation.isParticipant ? attachments.map(({ uploadedById, uploaderDisplayName, ...file }) => file) : attachments,
      history: reviewAccess.isAssignedReviewer && !participation.isParticipant ? history.map(({ actorId, actorDisplayName, ...event }) => event) : history,
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
      participationRoleLabel: getParticipationRoleLabel(participationRole),
      status: member.status,
      effectiveFrom: member.effectiveFrom.toISOString(),
      effectiveUntil: member.effectiveUntil?.toISOString() ?? ""
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
    if (!(await this.availableDelegations(actor, proposal)).length) assertCanReadProposal(actor, proposal, participation, reviewAccess);
    return participation;
  }

  private canMutateProposalFiles(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord, participation?: ProposalParticipation) {
    if (
      !actor || actor.systemRole !== "RESEARCHER_INTERNAL_USER" ||
      (proposal.status !== "draft" && proposal.status !== "supplement_requested")
    ) {
      return false;
    }

    const isSecretary = participation?.roles.includes("secretary") ?? false;
    if (proposal.ownerId !== actor.id && !isSecretary) return false;

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
    const canRead = canReadProposal(actor, proposal, participation, reviewAccess);
    const viewerAuthorization = actor
      ? projectProposalViewerAuthorizationV1({
          actor,
          proposal,
          participation,
          reviewAccess,
          canRead,
          canEdit: canEditDraft,
          canManageFiles: this.canMutateProposalFiles(actor, proposal, participation)
        })
      : undefined;

    return {
      viewerAuthorization,
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
      ...(reviewAccess?.isAssignedReviewer && !participation?.isParticipant ? {} : { ownerId: proposal.ownerId }),
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
      ...(reviewAccess?.isAssignedReviewer && !participation?.isParticipant ? {} : { submittedById: proposal.submittedById ?? "" }),
      createdAt: proposal.createdAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
      canEdit: canEditDraft,
      canSubmit: canEditDraft
    };
  }

  private canEditProposalDraft(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord) {
    if (
      !actor || actor.systemRole !== "RESEARCHER_INTERNAL_USER" ||
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
      actorId: record.fromStatus === "under_review" && record.toStatus === "under_review" ? undefined : record.actorId,
      actorDisplayName: record.fromStatus === "under_review" && record.toStatus === "under_review" ? "" : record.actor?.displayName ?? "",
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      submittedAt: record.submittedAt.toISOString(),
      note: record.note ?? ""
    };
  }
}
