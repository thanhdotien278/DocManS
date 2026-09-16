import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  getAssignmentRoleLabel,
  getRecommendationLabel,
  normalizeAssignmentRole,
  REVIEW_ASSIGNMENT_STATUS,
  REVIEW_ASSIGNMENT_STATUS_LABELS,
  REVIEW_STATUS
} from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { normalizeParticipationRole } from "../proposals-shared/proposal-participation.js";
import { PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS, REVIEWER_ASSIGNABLE_STATUSES } from "../proposals-shared/proposal-workflow.js";
import {
  assertCanReadEvaluation,
  assertProposalStatus,
  assertScientificManagementScope,
  findEvaluationProposal,
  updateProposalStatusGuarded,
  type EvaluationProposalRecord,
  type ProposalReviewRecord,
  type ReviewAssignmentRecord
} from "./proposal-evaluation-support.js";

type ReviewerCandidate = {
  id: string;
  username: string | null;
  displayName: string;
  status: string;
  unit: string;
  researcherProfileId: string | null;
};

const ASSIGNMENT_INCLUDE = {
  reviewer: { select: { displayName: true, username: true, unit: true } },
  assignedBy: { select: { displayName: true } }
};

/**
 * ST-3.2 — reviewer and committee assignment.
 *
 * Assignment is the only thing that grants a reviewer access to a proposal: the `reviewer` account
 * role by itself grants nothing (AC-ST-3.2-02). Every assignment runs through the ST-3.0 conflict
 * primitive first, so the proposal PI / topic secretary / team participant can never be assigned to their own proposal
 * (AC-ST-3.2-04).
 */
@Injectable()
export class ProposalReviewAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService
  ) {}

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, id: string, context: unknown, work: (service: ProposalReviewAssignmentsService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    return runProposalMutation(this.prisma, actor, id, context, async (tx, currentActor) => {
      const service = new ProposalReviewAssignmentsService(tx, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx));
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  async candidates(actor: SafeUserContext, proposalId: string, query: unknown = "") {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép phân công đánh giá.");
    if (typeof query !== "string") {
      throw new BadRequestException({ message: "Từ khóa tìm kiếm người đánh giá không hợp lệ." });
    }
    if ((await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) throw new ForbiddenException();
    await this.assertCompletenessEvidence(proposal);
    const search = query.trim().slice(0, 100);
    // ponytail: scans matching accounts for 50 eligible results; paginate if the directory grows large.
    const accounts = await this.prisma.user.findMany({
      where: {
        status: "active",
        OR: [
          { displayName: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } }
        ]
      },
      select: { id: true, displayName: true, username: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }]
    });
    const users: typeof accounts = [];
    for (const account of accounts) {
      const conflict = await this.participation.evaluateConflict(account.id, proposalId);
      const assigned = await this.findLiveAssignment(proposalId, account.id);
      if (!conflict.conflicted && !assigned) {
        users.push(account);
        if (users.length === 50) break;
      }
    }
    return { users };
  }

  async listAssignments(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertCanReadEvaluation(actor, proposal);
    if ((await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) throw new ForbiddenException({ message: "Không được xem dữ liệu phản biện của hồ sơ mình tham gia." });
    const assignments = await this.findAssignments(proposalId);
    const reviews = await this.findReviews(proposalId);
    return assignments.map((assignment) => this.toAssignmentResponse(assignment, reviews));
  }

  /**
   * AC-ST-3.2-01. The selected account is rechecked in the mutation
   * transaction before conflict and duplicate checks, so a stale candidate cannot create a grant.
   */
  async assignReviewer(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) {
      const result = await this.mutate(actor, proposalId, input.contextVersion, (s, a) => s.assignReviewer(a, proposalId, input));
      // A conflict rejection commits only its failure audit; throw after that transaction commits.
      if (result instanceof BadRequestException) throw result;
      return result;
    }
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Chỉ hồ sơ đã nộp hoặc đang đánh giá mới được phân công người đánh giá.");
    const actorConflict = await this.participation.evaluateConflict(actor.id, proposalId);
    if (actorConflict.conflicted) {
      throw new ForbiddenException({ message: "Người đang tham gia hồ sơ không thể phân công người đánh giá." });
    }

    await this.assertCompletenessEvidence(proposal);
    const candidate = await this.resolveReviewerCandidate(input);
    if (input.assignmentRole !== undefined && !["reviewer", "committee_member"].includes(String(input.assignmentRole))) throw new BadRequestException({ message: "Vai trò phân công không hợp lệ." });
    const assignmentRole = normalizeAssignmentRole(input.assignmentRole);
    const dueDate = this.readOptionalDueDate(input.dueDate);
    const effectiveFrom = input.effectiveFrom ? new Date(String(input.effectiveFrom)) : new Date();
    const effectiveUntil = input.effectiveUntil ? new Date(String(input.effectiveUntil)) : null;
    if (!Number.isFinite(effectiveFrom.getTime()) || (effectiveUntil && (!Number.isFinite(effectiveUntil.getTime()) || effectiveUntil <= effectiveFrom || effectiveUntil <= new Date())) || (dueDate && dueDate < effectiveFrom)) throw new BadRequestException({ message: "Thời gian hiệu lực và hạn đánh giá không hợp lệ." });

    const conflict = await this.participation.evaluateConflict(candidate.id, proposalId);
    if (conflict.conflicted) {
      await this.auditLog.record({
        action: "assign-reviewer",
        result: "failure",
        actorId: actor.id,
        targetEntity: "proposal-review-assignment",
        targetEntityId: proposalId,
        username: actor.username,
        reason: JSON.stringify({
          proposalId,
          candidateUserId: candidate.id,
          researcherProfileId: candidate.researcherProfileId,
          assignmentRole,
          reasonCode: conflict.reasonCode,
          reason: conflict.reason
        })
      });

      return new BadRequestException({
        message: `Không thể phân công ${candidate.displayName}: ${conflict.reason}`,
        reasonCode: conflict.reasonCode
      });
    }

    // Any non-revoked assignment blocks a new one, not just an open one: a reviewer who already
    // submitted holds a `completed` row, and assigning them again would count them twice in the
    // round's progress and ask them for a second review. Re-review needs an explicit later policy.
    const existing = await this.findLiveAssignment(proposalId, candidate.id);
    if (existing) {
      throw new BadRequestException({
        message:
          existing.status === REVIEW_ASSIGNMENT_STATUS.completed
            ? `${candidate.displayName} đã gửi phiếu đánh giá cho hồ sơ này.`
            : `${candidate.displayName} đã được phân công đánh giá hồ sơ này.`
      });
    }

    const movesToUnderReview = proposal.status !== PROPOSAL_STATUS.underReview;

    const created = (await this.runAssignmentTransaction(candidate.displayName, () =>
      this.prisma.$transaction(async (tx) => {
        const assignedAt = await readTransactionClockV1(tx);
        const assignment = (await tx.proposalReviewAssignment.create({
          data: {
            proposalId,
            reviewerUserId: candidate.id,
            researcherProfileId: candidate.researcherProfileId,
            assignmentRole,
            status: REVIEW_ASSIGNMENT_STATUS.assigned,
            assignedById: actor.id,
            assignedAt,
            effectiveFrom,
            effectiveUntil,
            dueDate
          } as never,
          include: ASSIGNMENT_INCLUDE
        })) as ReviewAssignmentRecord;

        await tx.researchProposal.update({
          where: { id: proposalId },
          data: {
            authorizationRelationshipVersion: { increment: 1 },
            authorizationDelegationVersion: { increment: 1 },
            authorizationContextUpdatedAt: assignedAt
          } as never
        });

        // The first assignment is what opens the evaluation phase; later ones join a proposal that is
        // already under review and must not rewrite its status.
        if (movesToUnderReview) {
          await updateProposalStatusGuarded(tx, proposalId, proposal.status, PROPOSAL_STATUS.underReview);

          await tx.proposalSubmissionEvent.create({
            data: {
              proposalId,
              actorId: actor.id,
              fromStatus: proposal.status,
              toStatus: PROPOSAL_STATUS.underReview,
              submittedAt: assignedAt,
              note: "Chuyên viên mở vòng đánh giá và phân công người đánh giá"
            } as never
          });
        }

        await tx.auditLog.create({
          data: {
            action: "assign-reviewer",
            result: "success",
            actorId: actor.id,
            targetEntity: "proposal-review-assignment",
            targetEntityId: assignment.id,
            username: actor.username,
            reason: JSON.stringify({
              proposalId,
              reviewerUserId: candidate.id,
              researcherProfileId: candidate.researcherProfileId,
              reviewerUsername: candidate.username,
              assignmentRole,
              dueDate: dueDate?.toISOString() ?? null,
              fromStatus: proposal.status,
              toStatus: movesToUnderReview ? PROPOSAL_STATUS.underReview : proposal.status
            })
          }
        });

        return assignment;
      })
    )) as unknown as ReviewAssignmentRecord;

    return this.toAssignmentResponse(created, []);
  }

  /**
   * AC-ST-3.2-03. Reassignment is revoke-then-assign: the revoked row keeps its assignedAt, actor
   * and reviewer so assignment history survives, and the reviewer's access stops immediately.
   */
  async revokeAssignment(actor: SafeUserContext, proposalId: string, assignmentId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (s, a) => s.revokeAssignment(a, proposalId, assignmentId, input));
    if ((await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được thay đổi phân công." });
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép thay đổi phân công đánh giá.");

    const assignment = await this.findAssignmentById(proposalId, assignmentId);
    if (assignment.status !== REVIEW_ASSIGNMENT_STATUS.assigned && assignment.status !== REVIEW_ASSIGNMENT_STATUS.completed) {
      throw new BadRequestException({
        message: "Phân công này không còn hiệu lực."
      });
    }

    if (typeof input.reason !== "string" || !input.reason.trim()) throw new BadRequestException({ message: "Nhập lý do thu hồi phân công." });
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 2000) : "";
    const updated = (await this.prisma.$transaction(async (tx) => {
      const revokedAt = await readTransactionClockV1(tx);
      const record = (await tx.proposalReviewAssignment.update({
        where: { id: assignmentId },
        data: { status: REVIEW_ASSIGNMENT_STATUS.revoked, revokedAt, effectiveUntil: revokedAt } as never,
        include: ASSIGNMENT_INCLUDE
      })) as ReviewAssignmentRecord;

      await tx.researchProposal.update({
        where: { id: proposalId },
        data: {
          authorizationRelationshipVersion: { increment: 1 },
          authorizationDelegationVersion: { increment: 1 },
          authorizationContextUpdatedAt: revokedAt
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "change-reviewer-assignment",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-review-assignment",
          targetEntityId: assignmentId,
          username: actor.username,
          reason: JSON.stringify({
            proposalId,
            reviewerUserId: assignment.reviewerUserId,
            researcherProfileId: assignment.researcherProfileId,
            reviewerUsername: assignment.reviewer?.username ?? null,
            assignmentRole: normalizeAssignmentRole(assignment.assignmentRole),
            fromStatus: assignment.status,
            toStatus: REVIEW_ASSIGNMENT_STATUS.revoked,
            reason
          })
        }
      });

      return record;
    })) as unknown as ReviewAssignmentRecord;

    return this.toAssignmentResponse(updated, []);
  }

  /** The reviewer queue: assignment rows only, never a scan of all proposals (AC-ST-3.2-01). */
  async listMyAssignments(actor: SafeUserContext) {
    const assignments = (await this.prisma.proposalReviewAssignment.findMany({
      where: {
        reviewerUserId: actor.id,
        status: {
          in: [REVIEW_ASSIGNMENT_STATUS.assigned, REVIEW_ASSIGNMENT_STATUS.completed]
        }
      },
      orderBy: { assignedAt: "desc" },
      include: {
        ...ASSIGNMENT_INCLUDE,
        proposal: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            submittedAt: true,
            hostOrganizationUnitId: true
          }
        }
      }
    })) as Array<ReviewAssignmentRecord & { proposal: Partial<EvaluationProposalRecord> }>;

    if (assignments.length === 0) {
      return [];
    }

    const reviews = (await this.prisma.proposalReview.findMany({
      where: {
        assignmentId: { in: assignments.map((assignment) => assignment.id) }
      }
    })) as ProposalReviewRecord[];

    const visible = [];
    for (const assignment of assignments) {
      const access = await this.reviewAccess.resolveForProposal(actor.id, assignment.proposalId);
      const conflict = await this.participation.evaluateConflict(actor.id, assignment.proposalId);
      if (access.isAssignedReviewer && !conflict.conflicted) visible.push(assignment);
    }
    return visible.map((assignment) => {
      const review = reviews.find((item) => item.assignmentId === assignment.id);
      return {
        ...this.toAssignmentResponse(assignment, reviews),
        proposal: {
          id: assignment.proposal?.id ?? assignment.proposalId,
          code: assignment.proposal?.code ?? "",
          title: assignment.proposal?.title ?? "",
          status: assignment.proposal?.status ?? "",
          statusLabel: PROPOSAL_STATUS_LABELS[assignment.proposal?.status ?? ""] ?? assignment.proposal?.status ?? "",
          submittedAt: assignment.proposal?.submittedAt?.toISOString() ?? ""
        },
        myReviewStatus: review?.status ?? REVIEW_STATUS.draft,
        myReviewSubmittedAt: review?.submittedAt?.toISOString() ?? ""
      };
    });
  }

  /**
   * AC-ST-3.2-02 — the assigned package. Access is resolved from the assignment record, so an
   * unassigned reviewer gets a plain 403 with no proposal metadata attached to it.
   */
  async getReviewPackage(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const access = await this.reviewAccess.resolveForProposal(actor?.id, proposalId);
    if (!access.isAssignedReviewer || (await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) {
      throw new ForbiddenException({
        message: "Bạn không được phân công đánh giá hồ sơ này."
      });
    }

    const [members, attachments, history] = await Promise.all([
      this.prisma.proposalMember.findMany({
        where: { proposalId },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.fileRecord.findMany({
        where: {
          relatedEntityType: "research_proposal",
          relatedEntityId: proposalId,
          status: "active",
          deletedAt: null
        },
        orderBy: { createdAt: "asc" },
        include: { uploadedBy: { select: { displayName: true } } }
      }),
      this.prisma.proposalSubmissionEvent.findMany({
        where: { proposalId },
        orderBy: { submittedAt: "asc" },
        include: { actor: { select: { displayName: true } } }
      })
    ]);

    const full = (await this.prisma.researchProposal.findUnique({
      where: { id: proposalId }
    })) as
      | (EvaluationProposalRecord & {
          objectives: string | null;
          summary: string | null;
          startDate: Date | null;
          endDate: Date | null;
          budgetMetadata: unknown;
          researchFieldCode: string | null;
          proposalTypeCode: string | null;
        })
      | null;

    return {
      assignmentId: access.assignmentId,
      assignmentRole: access.assignmentRole,
      assignmentRoleLabel: getAssignmentRoleLabel(access.assignmentRole),
      proposal: {
        id: proposal.id,
        code: proposal.code ?? "",
        title: proposal.title,
        status: proposal.status,
        statusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
        objectives: full?.objectives ?? "",
        summary: full?.summary ?? "",
        researchFieldCode: full?.researchFieldCode ?? "",
        proposalTypeCode: full?.proposalTypeCode ?? "",
        startDate: full?.startDate?.toISOString() ?? "",
        endDate: full?.endDate?.toISOString() ?? "",
        budgetMetadata: full?.budgetMetadata ?? {},
        submittedAt: proposal.submittedAt?.toISOString() ?? ""
      },
      // Names and organisations only. Reviewer-facing member data never carries account ids.
      members: (
        members as Array<{
          id: string;
          name: string;
          role: string;
          participationRole?: string | null;
          organization: string;
        }>
      ).map((member) => ({
        id: member.id,
        name: member.name,
        role: normalizeParticipationRole(member.participationRole ?? member.role),
        organization: member.organization
      })),
      attachments: (
        attachments as Array<{
          id: string;
          filePurpose: string;
          originalFileName: string;
          description: string | null;
          mimeType: string;
          sizeBytes: number;
          createdAt: Date;
          uploadedBy?: { displayName: string } | null;
        }>
      ).map((attachment) => ({
        id: attachment.id,
        requirementCode: attachment.filePurpose,
        fileName: attachment.originalFileName,
        description: attachment.description ?? null,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,

        createdAt: attachment.createdAt.toISOString()
      })),
      history: (
        history as Array<{
          id: string;
          fromStatus: string;
          toStatus: string;
          submittedAt: Date;
          note: string | null;
          actor?: { displayName: string } | null;
        }>
      ).map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        submittedAt: event.submittedAt.toISOString(),

        note: event.note ?? ""
      }))
    };
  }

  /** Shared with ST-3.3 and ST-3.4 so "who is assigned" is queried the same way everywhere. */
  async findAssignments(proposalId: string) {
    return (await this.prisma.proposalReviewAssignment.findMany({
      where: { proposalId },
      orderBy: { assignedAt: "asc" },
      include: ASSIGNMENT_INCLUDE
    })) as ReviewAssignmentRecord[];
  }

  async findReviews(proposalId: string) {
    return (await this.prisma.proposalReview.findMany({
      where: { proposalId },
      include: { reviewer: { select: { displayName: true } } }
    })) as ProposalReviewRecord[];
  }

  toAssignmentResponse(assignment: ReviewAssignmentRecord, reviews: ProposalReviewRecord[]) {
    const review = reviews.find((item) => item.assignmentId === assignment.id);

    return {
      id: assignment.id,
      proposalId: assignment.proposalId,
      reviewerUserId: assignment.reviewerUserId,
      researcherProfileId: assignment.researcherProfileId ?? null,
      reviewerDisplayName: assignment.reviewer?.displayName ?? "",
      reviewerUsername: assignment.reviewer?.username ?? "",
      reviewerUnit: assignment.reviewer?.unit ?? "",
      assignmentRole: normalizeAssignmentRole(assignment.assignmentRole),
      assignmentRoleLabel: getAssignmentRoleLabel(assignment.assignmentRole),
      status: assignment.status,
      statusLabel: REVIEW_ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status,
      assignedById: assignment.assignedById,
      assignedByDisplayName: assignment.assignedBy?.displayName ?? "",
      assignedAt: assignment.assignedAt.toISOString(),
      effectiveFrom: (assignment.effectiveFrom ?? assignment.assignedAt).toISOString(),
      effectiveUntil: assignment.effectiveUntil?.toISOString() ?? "",
      dueDate: assignment.dueDate?.toISOString() ?? "",
      revokedAt: assignment.revokedAt?.toISOString() ?? "",
      completedAt: assignment.completedAt?.toISOString() ?? "",
      reviewStatus: review?.status ?? "",
      reviewSubmittedAt: review?.submittedAt?.toISOString() ?? "",
      reviewTotalScore: review?.status === REVIEW_STATUS.submitted ? (review.totalScore ?? null) : null,
      reviewRecommendation: review?.status === REVIEW_STATUS.submitted ? (review.recommendation ?? "") : "",
      reviewRecommendationLabel: review?.status === REVIEW_STATUS.submitted ? getRecommendationLabel(review.recommendation) : ""
    };
  }

  /** Any assignment that still counts — i.e. anything not revoked. */
  async findLiveAssignment(proposalId: string, reviewerUserId: string) {
    return (await this.prisma.proposalReviewAssignment.findFirst({
      where: {
        proposalId,
        reviewerUserId,
        status: {
          in: [REVIEW_ASSIGNMENT_STATUS.assigned, REVIEW_ASSIGNMENT_STATUS.completed]
        }
      }
    })) as ReviewAssignmentRecord | null;
  }

  /**
   * The duplicate check above runs before the transaction, so two concurrent assignments for the
   * same reviewer can both pass it. The partial unique index on `(proposal_id, reviewer_user_id)
   * WHERE status = 'assigned'` is what actually stops the second one — this turns the resulting
   * constraint violation into the same 400 the pre-check would have produced, instead of a 500.
   */
  private async runAssignmentTransaction<T>(candidateName: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new BadRequestException({
          message: `${candidateName} đã được phân công đánh giá hồ sơ này.`
        });
      }
      throw error;
    }
  }

  private async findAssignmentById(proposalId: string, assignmentId: string) {
    const assignment = (await this.prisma.proposalReviewAssignment.findUnique({
      where: { id: assignmentId },
      include: ASSIGNMENT_INCLUDE
    })) as ReviewAssignmentRecord | null;

    if (!assignment || assignment.proposalId !== proposalId) {
      throw new NotFoundException({
        message: "Không tìm thấy phân công đánh giá."
      });
    }

    return assignment;
  }

  private async assertCompletenessEvidence(proposal: EvaluationProposalRecord) {
    if (!["submitted", "resubmitted"].includes(proposal.status)) return;
    if (!proposal.submittedAt) throw new BadRequestException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được lần nộp hiện tại." });

    const check = await this.prisma.proposalSubmissionEvent.findFirst({
      where: {
        proposalId: proposal.id,
        submittedAt: { gte: proposal.submittedAt },
        snapshot: { path: ["kind"], equals: "completeness_check" }
      },
      orderBy: { submittedAt: "desc" }
    });
    if (!check) throw new BadRequestException({ message: "Cần xác nhận hồ sơ đầy đủ trước khi phân công đánh giá." });
  }

  private async resolveReviewerCandidate(input: Record<string, unknown>): Promise<ReviewerCandidate> {
    if (Object.prototype.hasOwnProperty.call(input, "researcherProfileId") || Object.prototype.hasOwnProperty.call(input, "reviewerUsername")) {
      throw new BadRequestException({ message: "Chọn người đánh giá bằng tài khoản." });
    }
    const reviewerUserId = typeof input.reviewerUserId === "string" ? input.reviewerUserId.trim() : "";
    if (!reviewerUserId || reviewerUserId.length > 80) {
      throw new BadRequestException({ message: "Chọn tài khoản người đánh giá." });
    }
    await this.prisma.$queryRaw`SELECT id FROM users WHERE id = ${reviewerUserId} FOR SHARE`;
    const account = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { id: true, username: true, displayName: true, status: true, unit: true, researcherProfile: { select: { id: true } } }
    });
    if (!account || account.status !== "active") {
      throw new BadRequestException({ message: "Tài khoản không hoạt động hoặc không tồn tại." });
    }
    const { researcherProfile, ...user } = account;
    return { ...user, researcherProfileId: researcherProfile?.id ?? null };
  }

  private readOptionalDueDate(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({ message: "Hạn đánh giá không hợp lệ." });
    }

    if (parsed <= new Date()) throw new BadRequestException({ message: "Hạn đánh giá phải ở tương lai." });
    return parsed;
  }
}
