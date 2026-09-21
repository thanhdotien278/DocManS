import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
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
  getOrganizationScopeIds,
  isLeadership,
  isInternalResearcherEligible,
  isScientificManagementHead,
  isScientificManagementStaff,
  intakeAppliesToUser,
  isIntakeOpenForSubmission,
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
import { MANAGEMENT_OFFICER_STATUS, ProposalManagementOfficerService, type ProposalManagementOfficer, type ProposalManagementOfficerResolution } from "../proposals-shared/proposal-management-officer.service.js";
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
  owner?: { displayName: string } | null;
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
    private readonly reviewAccess: ProposalReviewAccessService,
    private readonly managementOfficers: ProposalManagementOfficerService
  ) {}

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, id: string | null, context: unknown, work: (service: ResearchProposalsService, currentActor: SafeUserContext) => Promise<T>): Promise<T> {
    return runProposalMutation(this.prisma, actor, id, context, async (tx, currentActor) => {
      const service = new ResearchProposalsService(tx, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx), new ProposalManagementOfficerService(tx));
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  async listProposals(actor: SafeUserContext) {
    const records = (await this.prisma.researchProposal.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { displayName: true } } }
    })) as ResearchProposalRecord[];
    return this.projectProposalList(actor, records);
  }

  async listDecisionQueue(actor: SafeUserContext) {
    if (!isLeadership(actor)) {
      throw new ForbiddenException({ message: "Chỉ lãnh đạo có thẩm quyền phê duyệt được xem hàng đợi quyết định." });
    }
    const scopeIds = getOrganizationScopeIds(actor);
    if (!scopeIds.length) return [];
    const records = (await this.prisma.researchProposal.findMany({
      where: {
        hostOrganizationUnitId: { in: scopeIds },
        status: { in: ["ready_for_approval", "approved", "rejected"] }
      },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { displayName: true } } }
    })) as ResearchProposalRecord[];
    return this.projectProposalList(actor, records);
  }

  private async projectProposalList(actor: SafeUserContext, records: ResearchProposalRecord[]) {
    const asOf = new Date();

    const [participationByProposal, reviewAccessByProposal, managementOfficerByProposal, completenessEvents] = await Promise.all([
      this.participation.resolveForProposals(actor?.id, records, asOf),
      this.reviewAccess.resolveForProposals(
        actor?.id,
        records.map((proposal) => proposal.id),
        asOf
      ),
      this.managementOfficers.resolveForProposals(records.map((proposal) => proposal.id), asOf),
      this.prisma.proposalSubmissionEvent.findMany({
        where: { proposalId: { in: records.map((proposal) => proposal.id) }, snapshot: { path: ["kind"], equals: "completeness_check" } },
        select: { proposalId: true, submittedAt: true }
      })
    ]);
    const completenessChecked = new Set(completenessEvents.filter((event) => {
      const proposal = records.find((record) => record.id === event.proposalId);
      return proposal?.submittedAt && event.submittedAt >= proposal.submittedAt;
    }).map((event) => event.proposalId));

    return records
      .filter((proposal) => canReadProposal(actor, proposal, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id), managementOfficerByProposal.get(proposal.id)))
      .map((proposal) =>
        this.toProposalResponse(proposal, actor, participationByProposal.get(proposal.id), reviewAccessByProposal.get(proposal.id), completenessChecked.has(proposal.id), managementOfficerByProposal.get(proposal.id))
      );
  }

  async getProposal(actor: SafeUserContext, proposalId: string) {
    const asOf = new Date();
    const proposal = await this.findProposal(proposalId);
    const [participation, reviewAccess, managementOfficer] = await Promise.all([
      this.participation.resolveForProposal(actor?.id, proposal, undefined, asOf),
      this.reviewAccess.resolveForProposal(actor?.id, proposalId, asOf),
      this.managementOfficers.resolveForProposal(proposalId, asOf)
    ]);
    assertCanReadProposal(actor, proposal, participation, reviewAccess, managementOfficer);
    return this.toProposalDetailResponse(proposal, actor, participation, reviewAccess, managementOfficer);
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
      username: pi.username || undefined
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

  async submitProposal(actor: SafeUserContext, proposalId: string, input: { contextVersion?: unknown } = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.submitProposal(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    this.assertEditableDraft(proposal);
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
          snapshot: await this.submissionSnapshot(proposal),
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


  async requestSupplement(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.requestSupplement(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    await this.assertCanRequestSupplement(actor, proposal);
    if (!["submitted", "resubmitted"].includes(proposal.status)) {
      throw new BadRequestException({ message: "Chỉ hồ sơ đã nộp hoặc nộp lại mới được yêu cầu bổ sung ở bước này." });
    }

    const reason = readText(input.reason, "reason", 2000);
    const dueDate = readDate(input.dueDate, "dueDate");
    const requestedAt = new Date();
    if (dueDate <= requestedAt) throw new BadRequestException({ message: "Hạn bổ sung phải ở tương lai." });
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (participation.isParticipant) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được tự kiểm tra hồ sơ." });
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

  async resubmitProposal(actor: SafeUserContext, proposalId: string, input: { contextVersion?: unknown } = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, a) => service.resubmitProposal(a, proposalId, input));
    const proposal = await this.findProposal(proposalId);
    if (proposal.status !== "supplement_requested") throw new BadRequestException({ message: "Hồ sơ không đang chờ bổ sung." });
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
          username: pi.username || undefined,
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
    const participation = await this.assertReadableProposal(actor, proposal);
    const reviewAccess = await this.reviewAccess.resolveForProposal(actor.id, proposalId);
    const history = await this.listHistoryForProposal(proposalId);
    return reviewAccess.isAssignedReviewer && !participation.isParticipant
      ? history.map(({ actorId, actorDisplayName, ...event }) => event)
      : history;
  }

  async listManagementOfficerCandidates(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    this.assertManagementOfficerAuthority(actor, proposal);
    await this.assertNoProposalReviewConflict(actor.id, proposalId, "Người tham gia hoặc người đã phản biện không được phân công cán bộ quản lý cho hồ sơ.");

    const accounts = await this.prisma.user.findMany({
      where: {
        status: "active",
        systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
        organizationScopes: { some: { organizationUnitId: proposal.hostOrganizationUnitId, organizationUnit: { status: "active" } } }
      },
      select: { id: true, username: true, displayName: true, unit: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }]
    });

    const users = [];
    for (const account of accounts) {
      const conflict = await this.participation.evaluateConflict(account.id, proposalId);
      const reviewerAssignment = await this.prisma.proposalReviewAssignment.findFirst({
        where: { proposalId, reviewerUserId: account.id, status: { in: ["assigned", "completed"] }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] },
        select: { id: true }
      });
      const persistedReview = await this.prisma.proposalReview.findFirst({
        where: { proposalId, reviewerUserId: account.id, status: { in: ["draft", "submitted"] } },
        select: { id: true }
      });
      if (!conflict.conflicted && !reviewerAssignment && !persistedReview) users.push(account);
    }

    return users;
  }

  async assignManagementOfficer(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.assignManagementOfficer(currentActor, proposalId, input));

    const proposal = await this.findProposal(proposalId);
    this.assertManagementOfficerAuthority(actor, proposal);
    await this.assertNoProposalReviewConflict(actor.id, proposalId, "Người tham gia hoặc người đã phản biện không được phân công cán bộ quản lý cho hồ sơ.");

    const officerUserId = readText(input.officerUserId, "officerUserId", 120);
    const reason = readText(input.reason, "reason", 2000);
    const now = await readTransactionClockV1(this.prisma);
    const effectiveFrom = now;
    const effectiveUntil: Date | null = null;
    if (officerUserId === actor.id) throw new BadRequestException({ message: "Không thể tự phân công chính mình làm cán bộ quản lý hồ sơ." });

    const candidate = await this.prisma.user.findUnique({
      where: { id: officerUserId },
      include: { organizationScopes: { include: { organizationUnit: true } } }
    });
    if (!candidate || candidate.status !== "active" || candidate.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") {
      throw new BadRequestException({ message: "Cán bộ được chọn phải là tài khoản chuyên viên quản lý khoa học đang hoạt động." });
    }
    if (!candidate.organizationScopes.some((scope) => scope.organizationUnitId === proposal.hostOrganizationUnitId && scope.organizationUnit.status === "active")) {
      throw new ForbiddenException({ message: "Cán bộ được chọn không có phạm vi đơn vị của hồ sơ." });
    }

    const candidateConflict = await this.participation.evaluateConflict(candidate.id, proposalId);
    if (candidateConflict.conflicted) throw new BadRequestException({ code: "CONFLICT_DENIED", message: candidateConflict.reason });
    const candidateReviewer = await this.prisma.proposalReviewAssignment.findFirst({
      where: { proposalId, reviewerUserId: candidate.id, status: { in: ["assigned", "completed"] }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
      select: { id: true }
    });
    const candidateReview = await this.prisma.proposalReview.findFirst({
      where: { proposalId, reviewerUserId: candidate.id, status: { in: ["draft", "submitted"] } },
      select: { id: true }
    });
    if (candidateReviewer || candidateReview) {
      throw new BadRequestException({ code: "CONFLICT_DENIED", message: "Không thể phân công người đã hoặc đang phản biện hồ sơ này." });
    }

    const current = await this.managementOfficers.resolveForProposal(proposalId, now);
    if (!current.resolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được cán bộ quản lý hiện tại." });
    if (current.officer?.officerUserId === officerUserId) throw new BadRequestException({ message: "Cán bộ này đã là người phụ trách hồ sơ." });

    const activeRows = await this.prisma.proposalManagementOfficer.findMany({
      where: { proposalId, status: MANAGEMENT_OFFICER_STATUS.active },
      select: { id: true, effectiveUntil: true }
    });
    for (const row of activeRows) {
      await this.prisma.proposalManagementOfficer.update({
        where: { id: row.id },
        data: {
          status: MANAGEMENT_OFFICER_STATUS.ended,
          effectiveUntil: row.effectiveUntil && row.effectiveUntil <= now ? row.effectiveUntil : now
        }
      });
    }
    const record = await this.prisma.proposalManagementOfficer.create({
      data: {
        proposalId,
        officerUserId,
        assignedById: actor.id,
        status: MANAGEMENT_OFFICER_STATUS.active,
        effectiveFrom,
        effectiveUntil,
        reason,
        assignmentContextVersion: input.contextVersion ?? null
      } as never,
      include: { officer: { select: { id: true, username: true, displayName: true, status: true, systemRole: true, unit: true } }, assignedBy: { select: { displayName: true } } }
    });
    await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: {
        authorizationRelationshipVersion: { increment: 1 },
        authorizationConflictVersion: { increment: 1 },
        authorizationDelegationVersion: { increment: 1 },
        authorizationContextUpdatedAt: now
      } as never
    });
    await this.auditLog.record({
      action: "assign-proposal-management-officer",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-management-officer",
      targetEntityId: record.id,
      username: actor.username,
      reason: JSON.stringify({ proposalId, officerUserId, replacedOfficerUserId: current.officer?.officerUserId ?? null, effectiveFrom: effectiveFrom.toISOString(), effectiveUntil: null, reason, contextVersion: input.contextVersion })
    });

    return this.toManagementOfficerResponse({ resolved: true, officer: record as unknown as ProposalManagementOfficer });
  }

  async revokeManagementOfficer(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.revokeManagementOfficer(currentActor, proposalId, input));

    const proposal = await this.findProposal(proposalId);
    this.assertManagementOfficerAuthority(actor, proposal);
    await this.assertNoProposalReviewConflict(actor.id, proposalId, "Người tham gia hoặc người đã phản biện không được thu hồi cán bộ quản lý cho hồ sơ.");
    const reason = readText(input.reason, "reason", 2000);
    const now = await readTransactionClockV1(this.prisma);
    const current = await this.managementOfficers.resolveForProposal(proposalId, now);
    if (!current.resolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được cán bộ quản lý hiện tại." });
    if (!current.officer) throw new BadRequestException({ message: "Hồ sơ hiện chưa có cán bộ quản lý đang hoạt động." });

    const updated = await this.prisma.proposalManagementOfficer.update({
      where: { id: current.officer.id },
      data: { status: MANAGEMENT_OFFICER_STATUS.revoked, effectiveUntil: now, reason: `${current.officer.reason ?? ""}${current.officer.reason ? " | " : ""}${reason}` },
      include: { officer: { select: { id: true, username: true, displayName: true, status: true, systemRole: true, unit: true } }, assignedBy: { select: { displayName: true } } }
    });
    await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: {
        authorizationRelationshipVersion: { increment: 1 },
        authorizationConflictVersion: { increment: 1 },
        authorizationDelegationVersion: { increment: 1 },
        authorizationContextUpdatedAt: now
      } as never
    });
    await this.auditLog.record({
      action: "revoke-proposal-management-officer",
      result: "success",
      actorId: actor.id,
      targetEntity: "proposal-management-officer",
      targetEntityId: updated.id,
      username: actor.username,
      reason: JSON.stringify({ proposalId, officerUserId: current.officer.officerUserId, reason, contextVersion: input.contextVersion })
    });

    return this.toManagementOfficerResponse({ resolved: true, officer: null });
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
    await this.assertCanRequestSupplement(actor, proposal);
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (participation.isParticipant) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được tự kiểm tra hồ sơ." });
    if (!["submitted", "resubmitted"].includes(proposal.status)) throw new BadRequestException({ message: "Hồ sơ không ở bước kiểm tra đầy đủ." });
    if (!proposal.submittedAt) throw new BadRequestException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được lần nộp hiện tại." });
    if (await this.hasCurrentCompletenessCheck(proposal)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Phiên bản nộp hiện tại đã được xác nhận đầy đủ." });
    const readiness = await this.computeReadiness(proposal);
    if (!readiness.ready) throw new BadRequestException({ message: "Hồ sơ chưa đầy đủ.", ...readiness });
    await this.prisma.proposalSubmissionEvent.create({ data: { proposalId, actorId: actor.id, fromStatus: proposal.status, toStatus: proposal.status, note: "Đã kiểm tra hồ sơ đầy đủ", snapshot: { kind: "completeness_check", readiness, note: readOptionalText(input.note, "note", 2000) ?? "" } } });
    await this.prisma.researchProposal.update({ where: { id: proposalId }, data: { authorizationContextUpdatedAt: new Date() } });
    await this.auditLog.record({ action: "check-proposal-completeness", result: "success", actorId: actor.id, targetEntity: "research-proposal", targetEntityId: proposalId });
    return this.getProposal(actor, proposalId);
  }

  private async findProposal(proposalId: string) {
    const proposal = (await this.prisma.researchProposal.findUnique({
      where: { id: proposalId },
      include: { owner: { select: { displayName: true } } }
    })) as ResearchProposalRecord | null;

    if (!proposal) {
      throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
    }

    return proposal;
  }

  private async hasCurrentCompletenessCheck(proposal: ResearchProposalRecord) {
    if (!proposal.submittedAt) return false;
    return Boolean(await this.prisma.proposalSubmissionEvent.findFirst({
      where: {
        proposalId: proposal.id,
        submittedAt: { gte: proposal.submittedAt },
        snapshot: { path: ["kind"], equals: "completeness_check" }
      },
      select: { id: true }
    }));
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

  private async assertCanRequestSupplement(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    if (!isScientificManagementStaff(actor)) {
      throw new ForbiddenException({ message: "Chỉ chuyên viên phụ trách hồ sơ được yêu cầu bổ sung hồ sơ." });
    }
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    if (!await this.managementOfficers.isCurrentOfficer(proposal.id, actor.id)) {
      throw new ForbiddenException({ message: "Bạn không còn là chuyên viên phụ trách hồ sơ này." });
    }
    await this.assertNoProposalReviewConflict(actor.id, proposal.id, "Người tham gia hoặc đánh giá hồ sơ không được thực hiện nghiệp vụ quản lý hồ sơ.");
  }

  private assertManagementOfficerAuthority(actor: SafeUserContext, proposal: ResearchProposalRecord) {
    if (!isScientificManagementHead(actor)) {
      throw new ForbiddenException({ message: "Chỉ Trưởng phòng quản lý khoa học được phân công hoặc thu hồi cán bộ phụ trách hồ sơ." });
    }
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
  }

  private async assertNoProposalReviewConflict(userId: string, proposalId: string, message: string) {
    const participationConflict = await this.participation.evaluateConflict(userId, proposalId);
    if (participationConflict.conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message });
    const reviewConflict = await this.reviewAccess.resolveConflictForProposal(userId, proposalId);
    if (reviewConflict.unresolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được lịch sử phản biện của người dùng." });
    if (reviewConflict.isAssignedReviewer || reviewConflict.hasPersistedReview) throw new ForbiddenException({ code: "CONFLICT_DENIED", message });
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
    if (members.some((member) => member.userId === proposal.ownerId)) {
      throw new BadRequestException({ message: "Chủ nhiệm được lấy từ ownerId và không được lưu trong danh sách team." });
    }
    const currentManagementOfficer = await this.managementOfficers.resolveForProposal(proposalId);
    if (!currentManagementOfficer.resolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được cán bộ phụ trách hồ sơ." });
    if (currentManagementOfficer.officer && members.some((member) => member.userId === currentManagementOfficer.officer?.officerUserId)) {
      throw new BadRequestException({ code: "CONFLICT_DENIED", message: "Không thể đưa cán bộ đang phụ trách hồ sơ vào nhóm tham gia hồ sơ." });
    }
    if (members.filter((member) => member.participationRole === "TOPIC_SECRETARY").length > 1) {
      throw new BadRequestException({ message: "Mỗi hồ sơ chỉ được có tối đa một TOPIC_SECRETARY." });
    }
    let previous: ProposalMemberRecord[] = [];
    const nextUserIds = new Set(members.map((member) => member.userId).filter((value): value is string => Boolean(value)));
    for (const userId of nextUserIds) {
      const reviewConflict = await this.reviewAccess.resolveConflictForProposal(userId, proposalId);
      if (reviewConflict.unresolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được lịch sử phản biện của thành viên." });
      if (reviewConflict.isAssignedReviewer || reviewConflict.hasPersistedReview) throw new BadRequestException({ code: "CONFLICT_DENIED", message: "Không thể thêm người đang hoặc đã đánh giá hồ sơ vào nhóm tham gia." });
    }
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
        const isCurrentlyActive = (member: ProposalMemberRecord) =>
          member.status === "ACTIVE" &&
          member.effectiveFrom <= changedAt &&
          (!member.effectiveUntil || member.effectiveUntil > changedAt);
        active = previous.filter(isCurrentlyActive);
        const activeByKey = new Map(active.map((member) => [key(member), member]));
        const sameMember = (current: ProposalMemberRecord, next: ProposalMemberPersistInput) =>
          current.name === next.name && current.role === next.role && current.organization === next.organization && current.userId === next.userId && current.participationRole === next.participationRole;
        const ending = previous.filter((member) => {
          if (member.status !== "ACTIVE" || !isCurrentlyActive(member)) return member.status === "ACTIVE";
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
            data: {
              status: "ENDED",
              effectiveUntil: member.effectiveUntil && member.effectiveUntil <= changedAt
                ? member.effectiveUntil
                : member.effectiveFrom > changedAt
                  ? member.effectiveFrom
                  : changedAt
            }
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
      .filter((item) => !attachments.some((attachment) => attachment.requirementCode === item.code && item.allowedMimeTypes.includes(attachment.mimeType) && (item.maxSizeMb === null || attachment.sizeBytes <= item.maxSizeMb * 1024 * 1024)))
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
    return missing;
  }

  private async toProposalDetailResponse(
    proposal: ResearchProposalRecord,
    actor?: SafeUserContext,
    resolvedParticipation?: ProposalParticipation,
    resolvedReviewAccess?: ProposalReviewAccess,
    resolvedManagementOfficer?: ProposalManagementOfficerResolution
  ) {
    const members = await this.findMembers(proposal.id);
    const participation = resolvedParticipation ?? (await this.participation.resolveForProposal(actor?.id, proposal, members));
    const reviewAccess = resolvedReviewAccess ?? (await this.reviewAccess.resolveForProposal(actor?.id, proposal.id));
    const managementOfficer = resolvedManagementOfficer ?? (await this.managementOfficers.resolveForProposal(proposal.id));
    const attachments = await this.findAttachments(proposal.id, { canMutate: this.canMutateProposalFiles(actor, proposal, participation) });
    const history = await this.listHistoryForProposal(proposal.id);
    const supplementRequests = await this.listSupplementRequestsForProposal(proposal.id);
    const requiredPackage = await this.getRequiredPackageForProposal(proposal);
    const completenessCheckCompleted = await this.hasCurrentCompletenessCheck(proposal);
    const managementOfficerHistory = await this.managementOfficers.listHistory(proposal.id);

    const response = this.toProposalResponse(proposal, actor, participation, reviewAccess, completenessCheckCompleted, managementOfficer);
    const versions = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId: proposal.id, toStatus: { in: ["submitted", "resubmitted"] } }, orderBy: { submittedAt: "asc" }, select: { id: true, submittedAt: true, snapshot: true } });
    return {
      ...response,
      versions: reviewAccess.isAssignedReviewer && !participation.isParticipant ? [] : versions.filter((v) => v.snapshot && !(v.snapshot as { kind?: string }).kind).map((v, index) => ({ id: v.id, version: index + 1, submittedAt: v.submittedAt.toISOString(), content: v.snapshot })),
      members: members.map((member) => reviewAccess.isAssignedReviewer && !participation.isParticipant
        ? { id: member.id, name: member.name, role: normalizeParticipationRole(member.participationRole ?? member.role), organization: member.organization }
        : this.toMemberResponse(member)),
      attachments: reviewAccess.isAssignedReviewer && !participation.isParticipant ? attachments.map(({ uploadedById, uploaderDisplayName, ...file }) => file) : attachments,
      history: reviewAccess.isAssignedReviewer && !participation.isParticipant ? history.map(({ actorId, actorDisplayName, ...event }) => event) : history,
      supplementRequests: reviewAccess.isAssignedReviewer && !participation.isParticipant ? [] : supplementRequests,
      managementOfficer: this.toManagementOfficerResponse(managementOfficer, managementOfficerHistory),
      requiredPackage
    };
  }

  private toMemberResponse(member: ProposalMemberRecord) {
    const participationRole = normalizeParticipationRole(member.participationRole ?? member.role);

    return {
      id: member.id,
      name: member.name,
      role: participationRole === "unknown" ? member.role : participationRole,
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
    const [participation, reviewAccess, managementOfficer] = await Promise.all([
      this.participation.resolveForProposal(actor?.id, proposal),
      this.reviewAccess.resolveForProposal(actor?.id, proposal.id),
      this.managementOfficers.resolveForProposal(proposal.id)
    ]);
    assertCanReadProposal(actor, proposal, participation, reviewAccess, managementOfficer);
    return participation;
  }

  private canMutateProposalFiles(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord, participation?: ProposalParticipation) {
    if (
      !actor || !isInternalResearcherEligible(actor) ||
      (proposal.status !== "draft" && proposal.status !== "supplement_requested")
    ) {
      return false;
    }

    const isSecretary = participation?.roles.includes("TOPIC_SECRETARY") ?? false;
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
    reviewAccess?: ProposalReviewAccess,
    completenessCheckCompleted = false,
    managementOfficer?: ProposalManagementOfficerResolution
  ) {
    const canEditDraft = this.canEditProposalDraft(actor, proposal);
    const canRead = canReadProposal(actor, proposal, participation, reviewAccess, managementOfficer);
    const viewerAuthorization = actor
      ? projectProposalViewerAuthorizationV1({
          actor,
          proposal,
          participation,
          reviewAccess,
          managementOfficer,
          canRead,
          canEdit: canEditDraft,
          canManageFiles: this.canMutateProposalFiles(actor, proposal, participation),
          completenessCheckCompleted
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
      ...(reviewAccess?.isAssignedReviewer && !participation?.isParticipant ? {} : { ownerId: proposal.ownerId, ownerDisplayName: proposal.owner?.displayName ?? "" }),
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
      canSubmit: canEditDraft,
      managementOfficer: this.toManagementOfficerResponse(managementOfficer)
    };
  }

  private canEditProposalDraft(actor: SafeUserContext | undefined, proposal: ResearchProposalRecord) {
    if (
      !actor || !isInternalResearcherEligible(actor) ||
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

  private toManagementOfficerResponse(resolution?: ProposalManagementOfficerResolution, history: ProposalManagementOfficer[] = []) {
    if (!resolution) return { resolved: false, current: null, history: [] };
    const officer = resolution.officer;
    return {
      resolved: resolution.resolved,
      current: officer ? {
        id: officer.id,
        officerUserId: officer.officerUserId,
        officerDisplayName: officer.officer?.displayName ?? "",
        officerUsername: officer.officer?.username ?? "",
        status: officer.status,
        effectiveFrom: officer.effectiveFrom.toISOString(),
        effectiveUntil: officer.effectiveUntil?.toISOString() ?? "",
        reason: officer.reason ?? "",
        assignedById: officer.assignedById
      } : null,
      history: history.map((row) => ({
        id: row.id,
        officerUserId: row.officerUserId,
        officerDisplayName: row.officer?.displayName ?? "",
        officerUsername: row.officer?.username ?? "",
        status: row.status,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveUntil: row.effectiveUntil?.toISOString() ?? "",
        reason: row.reason ?? "",
        assignedById: row.assignedById,
        assignedByDisplayName: row.assignedBy?.displayName ?? ""
      }))
    };
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
    const reviewSubmission = (record.snapshot as { kind?: string } | null | undefined)?.kind === "review_submitted";
    return {
      id: record.id,
      proposalId: record.proposalId,
      actorId: reviewSubmission || (record.fromStatus === "under_review" && record.toStatus === "under_review") ? undefined : record.actorId,
      actorDisplayName: reviewSubmission || (record.fromStatus === "under_review" && record.toStatus === "under_review") ? "" : record.actor?.displayName ?? "",
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      submittedAt: record.submittedAt.toISOString(),
      note: record.note ?? ""
    };
  }
}
