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
  REVIEW_RECOMMENDATIONS,
  REVIEW_RECOMMENDATION_LABELS,
  REVIEW_STATUS,
  type ReviewRecommendation
} from "../proposals-shared/proposal-review-access.js";
import { isWorkflowVisibleStatus, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import {
  assertProposalStatus,
  filterCurrentRoundAssignments,
  summarizeReviewProgress,
  assertCurrentCompletenessEvidence,
  assertEvaluationReadScope,
  assertScientificManagementHeadScope,
  findCurrentSubmissionEvidence,
  findEvaluationProposal,
  resolveActorConflict,
  type EvaluationSummaryRecord,
  type ProposalReviewRecord,
  type ReviewAssignmentRecord
} from "./proposal-evaluation-support.js";
import { ProposalReviewAssignmentsService } from "./proposal-review-assignments.service.js";
import { ProposalReviewsService } from "./proposal-reviews.service.js";

export const EVALUATION_SUMMARY_STATUS = {
  draft: "draft",
  finalized: "finalized",
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
        assignments: isScientificManagementHead(actor) && !conflict.conflicted ? assignmentRecords.map((assignment) => this.assignments.toAssignmentResponse(assignment, reviewRecords)) : [],
        reviews: isScientificManagementHead(actor) && !conflict.conflicted ? reviewRecords.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => this.reviews.toSubmittedReviewResponse(review)) : [],
        ...(isScientificManagementHead(actor) && !conflict.conflicted ? { evaluationSummary: this.toSummaryResponse(summary) } : {}),
        reviewDeadlines: assignmentRecords.filter((assignment) => ["assigned", "completed"].includes(assignment.status)).map((assignment) => ({ role: assignment.assignmentRole, status: assignment.status, dueDate: assignment.dueDate?.toISOString() ?? null })),
        recommendations: REVIEW_RECOMMENDATIONS.map((code) => ({ code, label: REVIEW_RECOMMENDATION_LABELS[code] }))
      };
    }
    return {
      proposalId,
      proposalStatus: proposal.status,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      ...progress,
      assignments: assignmentRecords.map((assignment) => this.assignments.toAssignmentResponse(assignment, reviewRecords)),
      reviews: reviewRecords.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => this.reviews.toSubmittedReviewResponse(review)),
      recommendations: REVIEW_RECOMMENDATIONS.map((code) => ({ code, label: REVIEW_RECOMMENDATION_LABELS[code] }))
    };
  }

  /** Head-only synthesis draft. A draft is allowed to change, but never routes the proposal. */
  async saveEvaluationSummary(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.saveEvaluationSummary(currentActor, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementHeadScope(actor, proposal);
    assertProposalStatus(proposal, [PROPOSAL_STATUS.underReview], "Chỉ hồ sơ đang đánh giá mới được soạn tổng hợp kết quả.");
    this.assertNoSynthesisBypass(input);
    await this.assertSynthesisActorIsEligible(actor, proposalId);
    const summaryText = this.readSummaryText(input.summary);
    const recommendation = this.readRecommendation(input.recommendation);
    const submissionEvidence = await assertCurrentCompletenessEvidence(this.prisma, proposal);
    const assignmentRecords = await this.assignments.findCurrentRoundAssignments(proposal);
    const reviewRecords = await this.assignments.findCurrentRoundReviews(proposal);
    const progress = this.summarizeProgress(assignmentRecords, reviewRecords);
    this.assertCompleteCurrentRound(progress);

    const existing = await this.findSummary(proposalId);
    if (existing && existing.status !== EVALUATION_SUMMARY_STATUS.draft) {
      throw new BadRequestException({ message: "Bản tổng hợp đã chốt hoặc đã trình lãnh đạo, không còn được chỉnh sửa." });
    }

    const saved = (await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
      const currentAssignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId }, include: { reviewer: { select: { status: true, displayName: true, username: true, unit: true } } } }) as ReviewAssignmentRecord[];
      const currentReviews = await tx.proposalReview.findMany({ where: { proposalId } }) as ProposalReviewRecord[];
      const currentRoundAssignments = filterCurrentRoundAssignments(currentAssignments, submissionEvidence.eventId);
      const currentRoundReviews = currentReviews.filter((review) => review.submissionEventId === submissionEvidence.eventId && currentRoundAssignments.some((assignment) => assignment.id === review.assignmentId));
      const currentProgress = this.summarizeProgress(currentRoundAssignments, currentRoundReviews);
      this.assertCompleteCurrentRound(currentProgress);
      const currentSummary = existing ? await tx.proposalEvaluationSummary.findUnique({ where: { id: existing.id } }) : null;
      if (currentSummary && currentSummary.status !== EVALUATION_SUMMARY_STATUS.draft) {
        throw new BadRequestException({ message: "Bản tổng hợp đã được thay đổi. Vui lòng tải lại hồ sơ." });
      }
      const now = await readTransactionClockV1(tx);
      const revision = (currentSummary?.revision ?? existing?.revision ?? 0) + 1;
      const evidenceSnapshot = {
        kind: "evaluation_package",
        schemaVersion: "proposal-evaluation-package.v1",
        lifecycle: EVALUATION_SUMMARY_STATUS.draft,
        revision,
        submissionEventId: submissionEvidence.eventId,
        assignmentIds: currentRoundAssignments.map((assignment) => assignment.id),
        reviewIds: currentRoundReviews.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => review.id),
        summary: summaryText,
        recommendation,
        capturedAt: now.toISOString()
      };
      const existingSummary = currentSummary ?? existing;
      const record = existingSummary
        ? ((await tx.proposalEvaluationSummary.update({
            where: { id: existingSummary.id },
            data: {
              summary: summaryText,
              recommendation,
              status: EVALUATION_SUMMARY_STATUS.draft,
              updatedById: actor.id,
              markedReadyAt: null,
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
              status: EVALUATION_SUMMARY_STATUS.draft,
              createdById: actor.id,
              updatedById: actor.id,
              markedReadyAt: null,
              revision,
              contextVersion: input.contextVersion,
              evidenceSnapshot
            } as never
          })) as EvaluationSummaryRecord);

      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: actor.id,
          fromStatus: proposal.status,
          toStatus: proposal.status,
          submittedAt: now,
          snapshot: { ...evidenceSnapshot, kind: "evaluation_summary_draft" },
          note: "Trưởng phòng lưu bản nháp tổng hợp đánh giá"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "draft-evaluation-summary",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-evaluation-summary",
          targetEntityId: record.id,
          username: actor.username,
          reason: JSON.stringify({
            proposalId,
            recommendation,
            summaryLength: summaryText.length,
            submittedReviews: currentProgress.submittedCount,
            totalAssignments: currentProgress.activeAssignmentCount,
            fromStatus: proposal.status,
            toStatus: proposal.status,
            revision
          })
        }
      });

      return record;
    })) as unknown as EvaluationSummaryRecord;

    return {
      evaluationSummary: this.toSummaryResponse(saved),
      proposalStatus: proposal.status
    };
  }

  /** Freeze the current complete review round. This records a separate lifecycle event. */
  async finalizeEvaluationSummary(actor: SafeUserContext, proposalId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.finalizeEvaluationSummary(currentActor, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementHeadScope(actor, proposal);
    assertProposalStatus(proposal, [PROPOSAL_STATUS.underReview], "Chỉ hồ sơ đang đánh giá mới được chốt bản tổng hợp.");
    await this.assertSynthesisActorIsEligible(actor, proposalId);
    const existing = await this.findSummary(proposalId);
    if (!existing || existing.status !== EVALUATION_SUMMARY_STATUS.draft) throw new BadRequestException({ message: "Cần lưu bản nháp tổng hợp trước khi chốt." });
    const submissionEvidence = await assertCurrentCompletenessEvidence(this.prisma, proposal);

    const finalized = (await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
      const currentSummary = await tx.proposalEvaluationSummary.findUnique({ where: { id: existing.id } });
      if (!currentSummary || currentSummary.status !== EVALUATION_SUMMARY_STATUS.draft) throw new BadRequestException({ message: "Bản nháp đã được thay đổi. Vui lòng tải lại hồ sơ." });
      const assignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId }, include: { reviewer: { select: { status: true, displayName: true, username: true, unit: true } } } }) as ReviewAssignmentRecord[];
      const reviews = await tx.proposalReview.findMany({ where: { proposalId } }) as ProposalReviewRecord[];
      const currentAssignments = filterCurrentRoundAssignments(assignments, submissionEvidence.eventId);
      const currentReviews = reviews.filter((review) => review.submissionEventId === submissionEvidence.eventId && currentAssignments.some((assignment) => assignment.id === review.assignmentId));
      const progress = this.summarizeProgress(currentAssignments, currentReviews);
      this.assertCompleteCurrentRound(progress);
      const draftEvidence = currentSummary.evidenceSnapshot as Record<string, unknown> | null;
      if (!draftEvidence || draftEvidence.submissionEventId !== submissionEvidence.eventId || !this.sameEvidenceIds(draftEvidence, currentAssignments, currentReviews)) {
        throw new BadRequestException({ code: "PACKAGE_CONTEXT_MISMATCH", message: "Phiếu đánh giá đã thay đổi. Cần lưu lại bản nháp tổng hợp trước khi chốt." });
      }
      const now = await readTransactionClockV1(tx);
      const revision = (currentSummary.revision ?? 0) + 1;
      const evidenceSnapshot = {
        ...(currentSummary.evidenceSnapshot as Record<string, unknown> | null ?? {}),
        kind: "evaluation_package",
        schemaVersion: "proposal-evaluation-package.v1",
        lifecycle: EVALUATION_SUMMARY_STATUS.finalized,
        revision,
        submissionEventId: submissionEvidence.eventId,
        assignmentIds: currentAssignments.map((assignment) => assignment.id),
        reviewIds: currentReviews.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => review.id),
        summary: currentSummary.summary,
        recommendation: currentSummary.recommendation,
        finalizedById: actor.id,
        finalizedAt: now.toISOString(),
        capturedAt: now.toISOString()
      };
      const record = (await tx.proposalEvaluationSummary.update({ where: { id: existing.id }, data: { status: EVALUATION_SUMMARY_STATUS.finalized, updatedById: actor.id, revision, contextVersion: input.contextVersion, evidenceSnapshot } as never, include: { updatedBy: { select: { displayName: true } } } })) as EvaluationSummaryRecord;
      await tx.proposalSubmissionEvent.create({ data: { proposalId, actorId: actor.id, fromStatus: proposal.status, toStatus: proposal.status, submittedAt: now, snapshot: { ...evidenceSnapshot, kind: "evaluation_summary_finalized" }, note: "Trưởng phòng chốt bản tổng hợp đánh giá" } as never });
      await tx.auditLog.create({ data: { action: "finalize-evaluation-summary", result: "success", actorId: actor.id, targetEntity: "proposal-evaluation-summary", targetEntityId: record.id, username: actor.username, reason: JSON.stringify({ proposalId, revision, submissionEventId: submissionEvidence.eventId }) } });
      return record;
    })) as unknown as EvaluationSummaryRecord;

    return { evaluationSummary: this.toSummaryResponse(finalized), proposalStatus: proposal.status };
  }

  /** Head review gate: submit an already-finalized Head summary without editing its content. */
  async submitCompletedPackage(actor: SafeUserContext, proposalId: string, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.submitCompletedPackage(currentActor, proposalId, input));

    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertScientificManagementHeadScope(actor, proposal);
    assertProposalStatus(proposal, [PROPOSAL_STATUS.underReview], "Chỉ hồ sơ đang đánh giá mới được trình gói hoàn tất.");

    const conflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (conflict.conflicted) throw new BadRequestException({ message: conflict.viewerMessage, reasonCode: conflict.reasonCode });

    const existing = await this.findSummary(proposalId);
    if (!existing || existing.status !== EVALUATION_SUMMARY_STATUS.finalized) {
      throw new BadRequestException({ message: "Bản tổng hợp phải được Trưởng phòng chốt trước khi trình lãnh đạo." });
    }
    const submissionEvidence = await assertCurrentCompletenessEvidence(this.prisma, proposal);
    const finalizedEvidence = existing.evidenceSnapshot as { lifecycle?: unknown; submissionEventId?: unknown } | null | undefined;
    if (finalizedEvidence?.lifecycle !== EVALUATION_SUMMARY_STATUS.finalized || finalizedEvidence.submissionEventId !== submissionEvidence.eventId) {
      throw new BadRequestException({ code: "PACKAGE_CONTEXT_MISMATCH", message: "Bản tổng hợp đã chốt không còn gắn với phiên bản nộp hiện tại." });
    }
    const progress = this.summarizeProgress(await this.assignments.findCurrentRoundAssignments(proposal), await this.assignments.findCurrentRoundReviews(proposal));
    if (!progress.allReviewsSubmitted) {
      throw new BadRequestException({ message: "Gói đánh giá chưa hoàn tất, chưa thể trình lãnh đạo.", pendingCount: progress.pendingCount });
    }

    const now = await readTransactionClockV1(this.prisma);
    const saved = (await this.prisma.$transaction(async (tx) => {
      const currentSummary = await tx.proposalEvaluationSummary.findUnique({ where: { id: existing.id } });
      if (!currentSummary || currentSummary.status !== EVALUATION_SUMMARY_STATUS.finalized) throw new BadRequestException({ message: "Bản tổng hợp đã được thay đổi. Vui lòng tải lại hồ sơ." });
      const currentEvidence = await findCurrentSubmissionEvidence(tx, proposal);
      const currentAssignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId }, include: { reviewer: { select: { status: true, displayName: true, username: true, unit: true } } } }) as ReviewAssignmentRecord[];
      const currentReviews = await tx.proposalReview.findMany({ where: { proposalId } }) as ProposalReviewRecord[];
      const roundAssignments = filterCurrentRoundAssignments(currentAssignments, currentEvidence.eventId);
      const roundReviews = currentReviews.filter((review) => review.submissionEventId === currentEvidence.eventId && roundAssignments.some((assignment) => assignment.id === review.assignmentId));
      const finalizedEvidence = currentSummary.evidenceSnapshot as Record<string, unknown> | null | undefined;
      if (!finalizedEvidence || finalizedEvidence.lifecycle !== EVALUATION_SUMMARY_STATUS.finalized || finalizedEvidence.submissionEventId !== currentEvidence.eventId || !this.sameEvidenceIds(finalizedEvidence, roundAssignments, roundReviews)) {
        throw new BadRequestException({ code: "PACKAGE_CONTEXT_MISMATCH", message: "Bản tổng hợp đã chốt không còn gắn với phiên bản nộp hiện tại." });
      }
      const currentProgress = this.summarizeProgress(
        roundAssignments,
        roundReviews
      );
      if (!currentProgress.allReviewsSubmitted) throw new BadRequestException({ message: "Phân công đã thay đổi: gói đánh giá chưa hoàn tất." });
      const statusUpdate = await tx.researchProposal.updateMany({ where: { id: proposalId, status: PROPOSAL_STATUS.underReview }, data: { status: PROPOSAL_STATUS.readyForApproval, authorizationRelationshipVersion: { increment: 1 }, authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } as never });
      if (statusUpdate.count !== 1) throw new BadRequestException({ message: "Trạng thái hồ sơ vừa thay đổi. Vui lòng tải lại hồ sơ." });
      const record = (await tx.proposalEvaluationSummary.update({ where: { id: existing.id }, data: { status: EVALUATION_SUMMARY_STATUS.readyForApproval, updatedById: actor.id, markedReadyAt: now } as never, include: { updatedBy: { select: { displayName: true } } } })) as EvaluationSummaryRecord;
      await tx.proposalReviewAssignment.updateMany({ where: { proposalId, reviewedSubmissionEventId: currentEvidence.eventId, status: REVIEW_ASSIGNMENT_STATUS.assigned }, data: { status: REVIEW_ASSIGNMENT_STATUS.completed, completedAt: now } as never });
      await tx.proposalSubmissionEvent.create({ data: { proposalId, actorId: actor.id, fromStatus: PROPOSAL_STATUS.underReview, toStatus: PROPOSAL_STATUS.readyForApproval, submittedAt: now, snapshot: { kind: "evaluation_package_submitted", schemaVersion: "proposal-evaluation-package.v1", revision: currentSummary.revision, submissionEventId: currentEvidence.eventId, finalizedEvidence }, note: "Trưởng phòng trình gói đánh giá đã chốt tới lãnh đạo" } as never });
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
      statusLabel: summary.status === EVALUATION_SUMMARY_STATUS.readyForApproval ? "Đã chuyển chờ phê duyệt" : summary.status === EVALUATION_SUMMARY_STATUS.finalized ? "Đã chốt bản tổng hợp" : "Bản nháp tổng hợp",
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
    return summarizeReviewProgress(assignments, reviews);
  }

  private assertCompleteCurrentRound(progress: ReturnType<ProposalEvaluationSummaryService["summarizeProgress"]>) {
    if (!progress.allReviewsSubmitted) {
      throw new BadRequestException({
        message: "Chưa thể chốt gói đánh giá: cần đúng 2 người phản biện, ít nhất 3 thành viên hội đồng và đầy đủ phiếu đánh giá.",
        pendingReviewers: progress.pendingReviewers
      });
    }
  }

  private sameEvidenceIds(evidence: Record<string, unknown>, assignments: ReviewAssignmentRecord[], reviews: ProposalReviewRecord[]) {
    const ids = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").sort() : [];
    return JSON.stringify(ids(evidence.assignmentIds)) === JSON.stringify(assignments.map((assignment) => assignment.id).sort()) &&
      JSON.stringify(ids(evidence.reviewIds)) === JSON.stringify(reviews.filter((review) => review.status === REVIEW_STATUS.submitted).map((review) => review.id).sort());
  }

  private async assertSynthesisActorIsEligible(actor: SafeUserContext, proposalId: string) {
    const conflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (conflict.conflicted) {
      throw new BadRequestException({ message: conflict.viewerMessage, reasonCode: conflict.reasonCode });
    }
  }

  private assertNoSynthesisBypass(input: Record<string, unknown>) {
    if (input.markReady === true || input.markReady === "true") {
      throw new BadRequestException({ message: "Lưu nháp, chốt và trình phê duyệt là các thao tác riêng biệt." });
    }
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
