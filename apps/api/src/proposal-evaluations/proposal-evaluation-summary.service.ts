import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import { isScientificManagementHead, isScientificManagementStaff } from "../proposals-shared/proposal-access.js";
import {
  getRecommendationLabel,
  REVIEW_ASSIGNMENT_STATUS,
  REVIEW_MAX_TOTAL_SCORE,
  REVIEW_RECOMMENDATIONS,
  REVIEW_RECOMMENDATION_LABELS,
  REVIEW_STATUS,
  type ReviewRecommendation
} from "../proposals-shared/proposal-review-access.js";
import { CONSOLIDATABLE_STATUSES, isWorkflowVisibleStatus, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import {
  assertProposalStatus,
  assertEvaluationReadScope,
  assertScientificManagementHeadScope,
  assertScientificManagementScope,
  findCurrentSubmissionEvidence,
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

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, proposalId: string, context: unknown, work: (service: ProposalEvaluationSummaryService, currentActor: SafeUserContext) => Promise<T>) {
    return runProposalMutation(this.prisma, actor, proposalId, context, async (tx, currentActor) => {
      const service = new ProposalEvaluationSummaryService(
        tx,
        new AuditLogService(tx),
        new ProposalReviewAssignmentsService(tx, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx)),
        new ProposalReviewsService(tx, new AuditLogService(tx), new ProposalReviewAccessService(tx), new ProposalParticipationService(tx)),
        new ProposalParticipationService(tx),
        new ProposalReviewAccessService(tx)
      );
      service.transactional = true;
      const result = await work(service, currentActor);
      await tx.researchProposal.update({ where: { id: proposalId }, data: { authorizationContextUpdatedAt: new Date() } });
      return result;
    });
  }

  /** Operational progress is for scoped staff without a same-proposal review duty. */
  async getReviewProgress(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertEvaluationReadScope(this.prisma, actor, proposal);
    if (!isWorkflowVisibleStatus(proposal.status)) throw new ForbiddenException();
    const conflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (isScientificManagementStaff(actor) && conflict.conflicted) throw new ForbiddenException({ message: conflict.viewerMessage });
    const assignmentRecords = await this.assignments.findCurrentRoundAssignments(proposal);
    const reviewRecords = await this.assignments.findCurrentRoundReviews(proposal);
    const summary = await this.findSummary(proposalId);
    const progress = this.summarizeProgress(assignmentRecords, reviewRecords);
    if (!isScientificManagementStaff(actor)) {
      const { pendingReviewers, averageTotalScore, ...operationalProgress } = progress;
      return {
        proposalId,
        proposalStatus: proposal.status,
        proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
        ...operationalProgress,
        assignments: [],
        reviews: [],
        ...(isScientificManagementHead(actor) && !conflict.conflicted ? { evaluationSummary: this.toSummaryResponse(summary) } : {}),
        reviewDeadlines: assignmentRecords.filter((assignment) => ["assigned", "completed"].includes(assignment.status)).map((assignment) => ({ role: assignment.assignmentRole, status: assignment.status, dueDate: assignment.dueDate?.toISOString() ?? null })),
        recommendations: []
      };
    }
    return {
      proposalId,
      proposalStatus: proposal.status,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      ...progress,
      assignments: assignmentRecords.map((assignment) => this.assignments.toAssignmentResponse(assignment, reviewRecords)),
      reviews: reviewRecords.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => this.reviews.toSubmittedReviewResponse(review)),
      evaluationSummary: this.toSummaryResponse(summary),
      recommendations: REVIEW_RECOMMENDATIONS.map((code) => ({ code, label: REVIEW_RECOMMENDATION_LABELS[code] }))
    };
  }

  /**
   * AC-ST-3.4-02 / AC-ST-3.4-03. Saving the summary and marking it ready are one operation with an
   * explicit `markReady` flag, so a draft consolidation cannot drift into an approval-ready state
   * as a side effect of an ordinary save.
   */
  async saveEvaluationSummary(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.saveEvaluationSummary(currentActor, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertScientificManagementScope(this.prisma, actor, proposal);
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
    if (proposal.status === PROPOSAL_STATUS.readyForApproval) {
      throw new BadRequestException({ message: "Gói đánh giá đã trình lãnh đạo và không còn được chỉnh sửa." });
    }

    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const assignmentRecords = await this.assignments.findCurrentRoundAssignments(proposal);
    const reviewRecords = await this.assignments.findCurrentRoundReviews(proposal);
    const progress = this.summarizeProgress(assignmentRecords, reviewRecords);

    if (markReady && !progress.allReviewsSubmitted) {
      throw new BadRequestException({
        message: "Chưa thể chuyển sang chờ phê duyệt: cần đúng 2 người phản biện, ít nhất 3 thành viên hội đồng và đầy đủ phiếu đánh giá.",
        pendingReviewers: progress.pendingReviewers
      });
    }

    const existing = await this.findSummary(proposalId);
    const now = new Date();
    const nextStatus = markReady ? EVALUATION_SUMMARY_STATUS.readyForApproval : existing?.status ?? EVALUATION_SUMMARY_STATUS.draft;

    const saved = (await this.prisma.$transaction(async (tx) => {
      if (markReady) {
        await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
        const currentAssignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId } }) as ReviewAssignmentRecord[];
        const currentReviews = await tx.proposalReview.findMany({ where: { proposalId } }) as ProposalReviewRecord[];
        const currentProgress = this.summarizeProgress(
          currentAssignments.filter((assignment) => assignment.reviewedSubmissionEventId === submissionEvidence.eventId),
          currentReviews.filter((review) => review.submissionEventId === submissionEvidence.eventId)
        );
        if (!currentProgress.allReviewsSubmitted) {
          throw new BadRequestException({ message: "Phân công đã thay đổi: cần đúng 2 người phản biện, ít nhất 3 thành viên hội đồng và đầy đủ phiếu đánh giá." });
        }
      }
      const revision = (existing?.revision ?? 0) + 1;
      const evidenceSnapshot = {
        kind: "evaluation_package",
        schemaVersion: "proposal-evaluation-package.v1",
        revision,
        submissionEventId: submissionEvidence.eventId,
        assignmentIds: assignmentRecords.map((assignment) => assignment.id),
        reviewIds: reviewRecords.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => review.id),
        summary: summaryText,
        recommendation,
        capturedAt: now.toISOString()
      };
      const record = existing
        ? ((await tx.proposalEvaluationSummary.update({
            where: { id: existing.id },
            data: {
              summary: summaryText,
              recommendation,
              status: nextStatus,
              updatedById: actor.id,
              markedReadyAt: markReady ? existing.markedReadyAt ?? now : existing.markedReadyAt,
              revision,
              contextVersion: input.contextVersion,
              evidenceSnapshot
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
              markedReadyAt: markReady ? now : null,
              revision,
              contextVersion: input.contextVersion,
              evidenceSnapshot
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
        await tx.researchProposal.update({
          where: { id: proposalId },
          data: {
          authorizationRelationshipVersion: { increment: 1 },
          authorizationDelegationVersion: { increment: 1 },
            authorizationContextUpdatedAt: now
          } as never
        });

        await tx.proposalSubmissionEvent.create({
          data: {
            proposalId,
            actorId: actor.id,
            fromStatus: proposal.status,
            toStatus: PROPOSAL_STATUS.readyForApproval,
            submittedAt: now,
            snapshot: evidenceSnapshot,
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

  /** Head review gate: submit an already-completed Staff summary without editing its content. */
  async submitCompletedPackage(actor: SafeUserContext, proposalId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.submitCompletedPackage(currentActor, proposalId, input));

    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementHeadScope(actor, proposal);
    assertProposalStatus(proposal, [PROPOSAL_STATUS.underReview], "Chỉ hồ sơ đang đánh giá mới được trình gói hoàn tất.");

    const conflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (conflict.conflicted) throw new BadRequestException({ message: conflict.viewerMessage, reasonCode: conflict.reasonCode });

    const existing = await this.findSummary(proposalId);
    if (!existing || existing.status !== EVALUATION_SUMMARY_STATUS.draft) {
      throw new BadRequestException({ message: "Chưa có bản tổng hợp của chuyên viên để trình lãnh đạo." });
    }
    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const progress = this.summarizeProgress(await this.assignments.findCurrentRoundAssignments(proposal), await this.assignments.findCurrentRoundReviews(proposal));
    if (!progress.allReviewsSubmitted) {
      throw new BadRequestException({ message: "Gói đánh giá chưa hoàn tất, chưa thể trình lãnh đạo.", pendingCount: progress.pendingCount });
    }

    const now = await readTransactionClockV1(this.prisma);
    const saved = (await this.prisma.$transaction(async (tx) => {
      const currentSummary = await tx.proposalEvaluationSummary.findUnique({ where: { id: existing.id } });
      if (!currentSummary || currentSummary.status !== EVALUATION_SUMMARY_STATUS.draft) throw new BadRequestException({ message: "Bản tổng hợp đã được thay đổi. Vui lòng tải lại hồ sơ." });
      const currentAssignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId } }) as ReviewAssignmentRecord[];
      const currentReviews = await tx.proposalReview.findMany({ where: { proposalId } }) as ProposalReviewRecord[];
      const currentProgress = this.summarizeProgress(
        currentAssignments.filter((assignment) => assignment.reviewedSubmissionEventId === submissionEvidence.eventId),
        currentReviews.filter((review) => review.submissionEventId === submissionEvidence.eventId)
      );
      if (!currentProgress.allReviewsSubmitted) throw new BadRequestException({ message: "Phân công đã thay đổi: gói đánh giá chưa hoàn tất." });
      const statusUpdate = await tx.researchProposal.updateMany({ where: { id: proposalId, status: PROPOSAL_STATUS.underReview }, data: { status: PROPOSAL_STATUS.readyForApproval, authorizationRelationshipVersion: { increment: 1 }, authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } as never });
      if (statusUpdate.count !== 1) throw new BadRequestException({ message: "Trạng thái hồ sơ vừa thay đổi. Vui lòng tải lại hồ sơ." });
      const revision = (currentSummary.revision ?? 0) + 1;
      const evidenceSnapshot = {
        kind: "evaluation_package",
        schemaVersion: "proposal-evaluation-package.v1",
        revision,
        submissionEventId: submissionEvidence.eventId,
        assignmentIds: currentAssignments.filter((assignment) => assignment.reviewedSubmissionEventId === submissionEvidence.eventId).map((assignment) => assignment.id),
        reviewIds: currentReviews.filter((review) => review.submissionEventId === submissionEvidence.eventId && review.status === REVIEW_STATUS.submitted).map((review) => review.id),
        summary: currentSummary.summary,
        recommendation: currentSummary.recommendation,
        capturedAt: now.toISOString()
      };
      const record = (await tx.proposalEvaluationSummary.update({ where: { id: existing.id }, data: { status: EVALUATION_SUMMARY_STATUS.readyForApproval, updatedById: actor.id, markedReadyAt: now, revision, contextVersion: input.contextVersion, evidenceSnapshot } as never, include: { updatedBy: { select: { displayName: true } } } })) as EvaluationSummaryRecord;
      await tx.proposalReviewAssignment.updateMany({ where: { proposalId, reviewedSubmissionEventId: submissionEvidence.eventId, status: REVIEW_ASSIGNMENT_STATUS.assigned }, data: { status: REVIEW_ASSIGNMENT_STATUS.completed, completedAt: now } as never });
      await tx.proposalSubmissionEvent.create({ data: { proposalId, actorId: actor.id, fromStatus: PROPOSAL_STATUS.underReview, toStatus: PROPOSAL_STATUS.readyForApproval, submittedAt: now, snapshot: evidenceSnapshot, note: "Trưởng phòng kiểm tra và trình gói đánh giá đã hoàn tất tới lãnh đạo" } as never });
      await tx.auditLog.create({ data: { action: "submit-evaluation-package", result: "success", actorId: actor.id, targetEntity: "proposal-evaluation-summary", targetEntityId: record.id, username: actor.username, reason: JSON.stringify({ proposalId, sourceSummaryUpdatedById: existing.updatedById, submittedReviews: currentProgress.submittedCount, fromStatus: PROPOSAL_STATUS.underReview, toStatus: PROPOSAL_STATUS.readyForApproval }) } });
      return record;
    })) as unknown as EvaluationSummaryRecord;

    return { evaluationSummary: this.toSummaryResponse(saved), proposalStatus: PROPOSAL_STATUS.readyForApproval };
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
      revision: summary.revision ?? 0,
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
    const active = assignments.filter((assignment) => assignment.status === REVIEW_ASSIGNMENT_STATUS.assigned || assignment.status === REVIEW_ASSIGNMENT_STATUS.completed);
    const reviewerCount = new Set(active.filter((assignment) => assignment.assignmentRole === "reviewer").map((assignment) => assignment.reviewerUserId)).size;
    const committeeMemberCount = new Set(active.filter((assignment) => assignment.assignmentRole === "committee_member").map((assignment) => assignment.reviewerUserId)).size;
    const assignmentRequirementsMet = reviewerCount === 2 && committeeMemberCount >= 3;
    const activeIds = new Set(active.map((assignment) => assignment.id));
    const submitted = reviews.filter((review) => review.status === REVIEW_STATUS.submitted && activeIds.has(review.assignmentId));
    const submittedAssignmentIds = new Set(submitted.map((review) => review.assignmentId));
    const pending = active.filter((assignment) => !submittedAssignmentIds.has(assignment.id));
    const scored = submitted.map((review) => review.totalScore).filter((score): score is number => typeof score === "number");

    return {
      activeAssignmentCount: active.length,
      reviewerCount,
      committeeMemberCount,
      assignmentRequirementsMet,
      submittedCount: submitted.length,
      pendingCount: pending.length,
      pendingReviewers: pending.map((assignment) => ({
        assignmentId: assignment.id,
        reviewerUserId: assignment.reviewerUserId,
        reviewerDisplayName: assignment.reviewer?.displayName ?? ""
      })),
      allReviewsSubmitted: assignmentRequirementsMet && pending.length === 0,
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
