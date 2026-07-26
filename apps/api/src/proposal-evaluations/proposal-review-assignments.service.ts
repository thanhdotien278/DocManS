import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
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
  username: string;
  displayName: string;
  status: string;
  role: string;
  unit: string;
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
 * primitive first, so PI / secretary / participant can never be assigned to their own proposal
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

  async listAssignments(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertCanReadEvaluation(actor, proposal);
    const assignments = await this.findAssignments(proposalId);
    const reviews = await this.findReviews(proposalId);
    return assignments.map((assignment) => this.toAssignmentResponse(assignment, reviews));
  }

  /**
   * AC-ST-3.2-01. The candidate is validated in this order — account, conflict, duplicate — so a
   * conflicted candidate is reported as a conflict rather than as "already assigned", and no
   * assignment row, history entry or audit entry is written when any check fails (AC-ST-3.2-04).
   */
  async assignReviewer(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Chỉ hồ sơ đã nộp hoặc đang đánh giá mới được phân công người đánh giá.");

    const candidate = await this.resolveReviewerCandidate(input);
    const assignmentRole = normalizeAssignmentRole(input.assignmentRole);
    const dueDate = this.readOptionalDueDate(input.dueDate);

    // Staff assigning themselves would let one person review and then consolidate their own review.
    // The participation primitive cannot see this, because assigning staff hold no participation row.
    if (candidate.id === actor.id) {
      throw new BadRequestException({ message: "Không thể tự phân công mình đánh giá hồ sơ do mình điều phối." });
    }

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
          reasonCode: conflict.reasonCode,
          reason: conflict.reason
        })
      });

      throw new BadRequestException({
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

    const assignedAt = new Date();
    const movesToUnderReview = proposal.status !== PROPOSAL_STATUS.underReview;

    const created = (await this.runAssignmentTransaction(candidate.displayName, () =>
      this.prisma.$transaction(async (tx) => {
        const assignment = (await tx.proposalReviewAssignment.create({
          data: {
            proposalId,
            reviewerUserId: candidate.id,
            assignmentRole,
            status: REVIEW_ASSIGNMENT_STATUS.assigned,
            assignedById: actor.id,
            assignedAt,
            dueDate
          } as never,
          include: ASSIGNMENT_INCLUDE
        })) as ReviewAssignmentRecord;

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
  async revokeAssignment(actor: SafeUserContext, proposalId: string, assignmentId: string, input: Record<string, unknown> = {}) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép thay đổi phân công đánh giá.");

    const assignment = await this.findAssignmentById(proposalId, assignmentId);
    if (assignment.status !== REVIEW_ASSIGNMENT_STATUS.assigned) {
      throw new BadRequestException({
        message: "Phân công này không còn hiệu lực."
      });
    }

    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 2000) : "";
    const revokedAt = new Date();

    const updated = (await this.prisma.$transaction(async (tx) => {
      const record = (await tx.proposalReviewAssignment.update({
        where: { id: assignmentId },
        data: { status: REVIEW_ASSIGNMENT_STATUS.revoked, revokedAt } as never,
        include: ASSIGNMENT_INCLUDE
      })) as ReviewAssignmentRecord;

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

    return assignments.map((assignment) => {
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
    if (!access.isAssignedReviewer) {
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
          organization: string;
        }>
      ).map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
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
        uploaderDisplayName: attachment.uploadedBy?.displayName ?? "",
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
        actorDisplayName: event.actor?.displayName ?? "",
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

  private async resolveReviewerCandidate(input: Record<string, unknown>): Promise<ReviewerCandidate> {
    const reviewerUserId = typeof input.reviewerUserId === "string" ? input.reviewerUserId.trim() : "";
    const username = typeof input.reviewerUsername === "string" ? input.reviewerUsername.trim().toLowerCase() : "";

    if (!reviewerUserId && !username) {
      throw new BadRequestException({
        message: "Chọn người đánh giá bằng tài khoản hệ thống."
      });
    }

    const candidate = (await this.prisma.user.findFirst({
      where: reviewerUserId ? { id: reviewerUserId } : { usernameKey: username },
      select: {
        id: true,
        username: true,
        displayName: true,
        status: true,
        role: true,
        unit: true
      }
    })) as ReviewerCandidate | null;

    if (!candidate) {
      throw new BadRequestException({
        message: "Không tìm thấy tài khoản người đánh giá."
      });
    }

    if (candidate.status !== "active") {
      throw new BadRequestException({
        message: `Tài khoản ${candidate.displayName} không còn hoạt động.`
      });
    }

    return candidate;
  }

  private readOptionalDueDate(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({ message: "Hạn đánh giá không hợp lệ." });
    }

    return parsed;
  }
}
