import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  getRecommendationLabel,
  REVIEW_ASSIGNMENT_STATUS,
  REVIEW_MAX_TOTAL_SCORE,
  REVIEW_RECOMMENDATIONS,
  REVIEW_RECOMMENDATION_LABELS,
  REVIEW_STATUS,
  type ReviewRecommendation
} from "../proposals-shared/proposal-review-access.js";
import { CONSOLIDATABLE_STATUSES, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import {
  assertCanReadEvaluation,
  assertProposalStatus,
  assertScientificManagementScope,
  findEvaluationProposal,
  resolveActorConflict,
  updateProposalStatusGuarded,
  type EvaluationSummaryRecord,
  type ProposalReviewRecord,
  type ReviewAssignmentRecord
} from "./proposal-evaluation-support.js";
import { ProposalReviewAssignmentsService } from "./proposal-review-assignments.service.js";
import { ProposalReviewsService } from "./proposal-reviews.service.js";

export const EVALUATION_SUMMARY_STATUS = {
  draft: "draft",
  readyForApproval: "ready_for_approval"
} as const;

/**
 * ST-3.4 — staff monitoring of review completion and the consolidated outcome.
 *
 * The consolidated summary is the only thing that can move a proposal to `ready_for_approval`, so
 * the ST-3.5 decision queue can never contain a proposal nobody consolidated (AC-ST-3.4-02).
 */
@Injectable()
export class ProposalEvaluationSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly assignments: ProposalReviewAssignmentsService,
    private readonly reviews: ProposalReviewsService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService
  ) {}

  /** AC-ST-3.4-01. Staff and leadership read; reviewers and PIs never see the panel roster. */
  async getReviewProgress(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertCanReadEvaluation(actor, proposal);

    const assignmentRecords = await this.assignments.findAssignments(proposalId);
    const reviewRecords = await this.assignments.findReviews(proposalId);
    const summary = await this.findSummary(proposalId);

    return {
      proposalId,
      proposalStatus: proposal.status,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      ...this.summarizeProgress(assignmentRecords, reviewRecords),
      assignments: assignmentRecords.map((assignment) => this.assignments.toAssignmentResponse(assignment, reviewRecords)),
      reviews: reviewRecords
        .filter((review) => review.status === REVIEW_STATUS.submitted)
        .map((review) => this.reviews.toSubmittedReviewResponse(review)),
      evaluationSummary: this.toSummaryResponse(summary),
      recommendations: REVIEW_RECOMMENDATIONS.map((code) => ({ code, label: REVIEW_RECOMMENDATION_LABELS[code] }))
    };
  }

  /**
   * AC-ST-3.4-02 / AC-ST-3.4-03. Saving the summary and marking it ready are one operation with an
   * explicit `markReady` flag, so a draft consolidation cannot drift into an approval-ready state
   * as a side effect of an ordinary save.
   */
  async saveEvaluationSummary(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementScope(actor, proposal);
    assertProposalStatus(proposal, CONSOLIDATABLE_STATUSES, "Chỉ hồ sơ đang đánh giá hoặc chờ phê duyệt mới được tổng hợp kết quả.");

    // AC-ST-3.4-03 read through the conflict lens: a staff member who participates in the proposal
    // or was assigned to review it must not be the one who writes its consolidated outcome.
    const conflict = await resolveActorConflict(
      { participation: this.participation, reviewAccess: this.reviewAccess },
      actor?.id,
      proposalId
    );
    if (conflict.conflicted) {
      await this.auditLog.record({
        action: "consolidate-evaluation",
        result: "failure",
        actorId: actor.id,
        targetEntity: "proposal-evaluation-summary",
        targetEntityId: proposalId,
        username: actor.username,
        reason: JSON.stringify({ proposalId, reasonCode: conflict.reasonCode, reason: conflict.reason })
      });
      throw new BadRequestException({ message: conflict.viewerMessage, reasonCode: conflict.reasonCode });
    }

    const summaryText = this.readSummaryText(input.summary);
    const recommendation = this.readRecommendation(input.recommendation);
    const markReady = input.markReady === true || input.markReady === "true";

    const assignmentRecords = await this.assignments.findAssignments(proposalId);
    const reviewRecords = await this.assignments.findReviews(proposalId);
    const progress = this.summarizeProgress(assignmentRecords, reviewRecords);

    if (markReady && !progress.allReviewsSubmitted) {
      throw new BadRequestException({
        message: "Chưa thể chuyển sang chờ phê duyệt: còn phiếu đánh giá chưa gửi.",
        pendingReviewers: progress.pendingReviewers
      });
    }

    const existing = await this.findSummary(proposalId);
    const now = new Date();
    const nextStatus = markReady ? EVALUATION_SUMMARY_STATUS.readyForApproval : existing?.status ?? EVALUATION_SUMMARY_STATUS.draft;

    const saved = (await this.prisma.$transaction(async (tx) => {
      const record = existing
        ? ((await tx.proposalEvaluationSummary.update({
            where: { id: existing.id },
            data: {
              summary: summaryText,
              recommendation,
              status: nextStatus,
              updatedById: actor.id,
              markedReadyAt: markReady ? existing.markedReadyAt ?? now : existing.markedReadyAt
            } as never
          })) as EvaluationSummaryRecord)
        : ((await tx.proposalEvaluationSummary.create({
            data: {
              proposalId,
              summary: summaryText,
              recommendation,
              status: nextStatus,
              createdById: actor.id,
              updatedById: actor.id,
              markedReadyAt: markReady ? now : null
            } as never
          })) as EvaluationSummaryRecord);

      const movesToReady = markReady && proposal.status !== PROPOSAL_STATUS.readyForApproval;
      if (movesToReady) {
        await updateProposalStatusGuarded(tx, proposalId, proposal.status, PROPOSAL_STATUS.readyForApproval);

        // Any still-open assignment is closed with the round, so a revoked-but-unreviewed reviewer
        // does not keep write access to a proposal that has left the evaluation phase.
        await tx.proposalReviewAssignment.updateMany({
          where: { proposalId, status: REVIEW_ASSIGNMENT_STATUS.assigned },
          data: { status: REVIEW_ASSIGNMENT_STATUS.completed, completedAt: now } as never
        });

        await tx.proposalSubmissionEvent.create({
          data: {
            proposalId,
            actorId: actor.id,
            fromStatus: proposal.status,
            toStatus: PROPOSAL_STATUS.readyForApproval,
            submittedAt: now,
            note: "Chuyên viên tổng hợp kết quả đánh giá và chuyển hồ sơ sang chờ phê duyệt"
          } as never
        });
      }

      await tx.auditLog.create({
        data: {
          action: movesToReady ? "mark-ready-for-approval" : "consolidate-evaluation",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-evaluation-summary",
          targetEntityId: record.id,
          username: actor.username,
          reason: JSON.stringify({
            proposalId,
            recommendation,
            summaryLength: summaryText.length,
            submittedReviews: progress.submittedCount,
            totalAssignments: progress.activeAssignmentCount,
            fromStatus: proposal.status,
            toStatus: movesToReady ? PROPOSAL_STATUS.readyForApproval : proposal.status
          })
        }
      });

      return record;
    })) as unknown as EvaluationSummaryRecord;

    return {
      evaluationSummary: this.toSummaryResponse(saved),
      proposalStatus: markReady ? PROPOSAL_STATUS.readyForApproval : proposal.status
    };
  }

  async findSummary(proposalId: string) {
    return (await this.prisma.proposalEvaluationSummary.findFirst({
      where: { proposalId },
      include: { updatedBy: { select: { displayName: true } } }
    })) as EvaluationSummaryRecord | null;
  }

  toSummaryResponse(summary: EvaluationSummaryRecord | null) {
    if (!summary) {
      return null;
    }

    return {
      id: summary.id,
      proposalId: summary.proposalId,
      summary: summary.summary,
      recommendation: summary.recommendation,
      recommendationLabel: getRecommendationLabel(summary.recommendation),
      status: summary.status,
      statusLabel: summary.status === EVALUATION_SUMMARY_STATUS.readyForApproval ? "Đã chuyển chờ phê duyệt" : "Bản nháp tổng hợp",
      createdById: summary.createdById,
      updatedById: summary.updatedById,
      updatedByDisplayName: summary.updatedBy?.displayName ?? "",
      markedReadyAt: summary.markedReadyAt?.toISOString() ?? "",
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString()
    };
  }

  /**
   * Completion is measured against assignments that are still part of the round: a revoked
   * assignment must not hold the proposal back, and a completed one counts as done.
   */
  summarizeProgress(assignments: ReviewAssignmentRecord[], reviews: ProposalReviewRecord[]) {
    const active = assignments.filter((assignment) => assignment.status !== REVIEW_ASSIGNMENT_STATUS.revoked);
    const submitted = reviews.filter((review) => review.status === REVIEW_STATUS.submitted);
    const submittedAssignmentIds = new Set(submitted.map((review) => review.assignmentId));
    const pending = active.filter((assignment) => !submittedAssignmentIds.has(assignment.id));
    const scored = submitted.map((review) => review.totalScore).filter((score): score is number => typeof score === "number");

    return {
      activeAssignmentCount: active.length,
      submittedCount: submitted.filter((review) => active.some((assignment) => assignment.id === review.assignmentId)).length,
      pendingCount: pending.length,
      pendingReviewers: pending.map((assignment) => ({
        assignmentId: assignment.id,
        reviewerUserId: assignment.reviewerUserId,
        reviewerDisplayName: assignment.reviewer?.displayName ?? ""
      })),
      allReviewsSubmitted: active.length > 0 && pending.length === 0,
      averageTotalScore: scored.length ? Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10 : null,
      maxTotalScore: REVIEW_MAX_TOTAL_SCORE
    };
  }

  private readSummaryText(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException({ message: "Nhập nội dung tổng hợp kết quả đánh giá." });
    }

    const trimmed = value.trim();
    if (trimmed.length > 5000) {
      throw new BadRequestException({ message: "Nội dung tổng hợp không được vượt quá 5000 ký tự." });
    }

    return trimmed;
  }

  private readRecommendation(value: unknown) {
    if (typeof value !== "string" || !REVIEW_RECOMMENDATIONS.includes(value as ReviewRecommendation)) {
      throw new BadRequestException({ message: "Chọn kết luận tổng hợp hợp lệ." });
    }

    return value;
  }
}
