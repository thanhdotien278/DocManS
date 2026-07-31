import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  getRecommendationLabel,
  REVIEW_MAX_TOTAL_SCORE,
  REVIEW_RECOMMENDATIONS,
  REVIEW_RECOMMENDATION_LABELS,
  REVIEW_SCORE_CRITERIA,
  REVIEW_STATUS,
  toScoreDataObject,
  validateReviewScores,
  type ReviewRecommendation
} from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { REVIEW_SUBMITTABLE_STATUSES } from "../proposals-shared/proposal-workflow.js";
import {
  assertProposalStatus,
  findEvaluationProposal,
  type EvaluationProposalRecord,
  type ProposalReviewRecord
} from "./proposal-evaluation-support.js";

/**
 * ST-3.3 — reviewer scoring and comments.
 *
 * Every operation here is scoped to the caller's own assignment: the review row is addressed by
 * `assignmentId`, never by a reviewer id taken from the request, so there is no endpoint shape that
 * could reach another reviewer's review (AC-ST-3.3-01, AC-ST-3.3-04).
 */
@Injectable()
export class ProposalReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly reviewAccess: ProposalReviewAccessService
  ) {}

  /** The rubric the reviewer form renders. Fixed in code by design — ST-3.3 rules out a builder. */
  getScoreCriteria() {
    return {
      criteria: REVIEW_SCORE_CRITERIA.map((criterion) => ({ ...criterion })),
      maxTotalScore: REVIEW_MAX_TOTAL_SCORE,
      recommendations: REVIEW_RECOMMENDATIONS.map((code) => ({ code, label: REVIEW_RECOMMENDATION_LABELS[code] }))
    };
  }

  async getMyReview(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const assignmentId = await this.assertAssigned(actor, proposalId);
    const review = await this.findReviewByAssignment(assignmentId);

    return {
      ...this.toReviewResponse(review, assignmentId, actor.id),
      canEdit: this.canWriteReview(proposal, review),
      ...this.getScoreCriteria()
    };
  }

  /**
   * AC-ST-3.3-02 rejects an incomplete *submit*; a draft save deliberately accepts partial scores so
   * a reviewer can stop halfway. Anything that is present is still range-checked, so a draft can
   * never hold a score the rubric would reject.
   */
  async saveMyReview(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const assignmentId = await this.assertAssigned(actor, proposalId);
    assertProposalStatus(proposal, REVIEW_SUBMITTABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép nhập kết quả đánh giá.");

    const existing = await this.findReviewByAssignment(assignmentId);
    this.assertReviewIsOpen(existing);

    // A field that is present replaces what was stored; a field that is absent keeps it. Reading an
    // omitted field as "empty" would let a partial payload silently erase work already saved.
    const { scoreData, totalScore } =
      input.scoreData === undefined
        ? this.readScores(existing?.scoreData ?? {}, { partial: true })
        : this.readScores(input.scoreData, { partial: true });
    const comment = input.comment === undefined ? existing?.comment ?? "" : this.readComment(input.comment);
    const recommendation =
      input.recommendation === undefined
        ? existing?.recommendation ?? null
        : this.readRecommendation(input.recommendation, { required: false });

    const saved = await this.upsertReview(assignmentId, {
      proposalId,
      reviewerUserId: actor.id,
      status: REVIEW_STATUS.draft,
      scoreData,
      totalScore,
      comment,
      recommendation
    });

    return {
      ...this.toReviewResponse(saved, assignmentId, actor.id),
      canEdit: true,
      ...this.getScoreCriteria()
    };
  }

  /**
   * AC-ST-3.3-01 / AC-ST-3.3-03. Submitting completes the assignment and writes the audit entry;
   * a draft save writes none, matching "audit logging must happen on submit, not just on save".
   */
  async submitMyReview(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const assignmentId = await this.assertAssigned(actor, proposalId);
    assertProposalStatus(proposal, REVIEW_SUBMITTABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép gửi kết quả đánh giá.");

    const existing = await this.findReviewByAssignment(assignmentId);
    this.assertReviewIsOpen(existing);

    // Fall back to whatever the draft already holds, so submit works from the stored review as well
    // as from a full form payload.
    const scoreSource = input.scoreData ?? existing?.scoreData ?? {};
    const { scoreData, totalScore, fieldErrors } = this.readScores(scoreSource, { partial: false });
    const comment = this.readComment(input.comment ?? existing?.comment ?? "");
    const recommendationValue = input.recommendation ?? existing?.recommendation ?? "";

    const errors: Record<string, string> = { ...fieldErrors };
    if (!comment) {
      errors.comment = "Nhập nhận xét đánh giá.";
    }

    let recommendation: string | null = null;
    try {
      recommendation = this.readRecommendation(recommendationValue, { required: true });
    } catch {
      errors.recommendation = "Chọn kết luận đề nghị.";
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: "Phiếu đánh giá chưa hợp lệ.", fieldErrors: errors });
    }

    const submittedAt = new Date();
    const submitted = (await this.prisma.$transaction(async (tx) => {
      const review = existing
        ? ((await tx.proposalReview.update({
            where: { id: existing.id },
            data: {
              status: REVIEW_STATUS.submitted,
              scoreData,
              totalScore,
              comment,
              recommendation,
              submittedAt
            } as never
          })) as ProposalReviewRecord)
        : ((await tx.proposalReview.create({
            data: {
              proposalId,
              assignmentId,
              reviewerUserId: actor.id,
              status: REVIEW_STATUS.submitted,
              scoreData,
              totalScore,
              comment,
              recommendation,
              submittedAt
            } as never
          })) as ProposalReviewRecord);

      await tx.proposalReviewAssignment.update({
        where: { id: assignmentId },
        data: { status: "completed", completedAt: submittedAt } as never
      });

      await tx.researchProposal.update({
        where: { id: proposalId },
        data: {
          authorizationRelationshipVersion: { increment: 1 },
          authorizationContextUpdatedAt: submittedAt
        } as never
      });

      // AC-ST-3.3-03: staff read review completion from the proposal timeline, so the submission is
      // a workflow event and not only a row in proposal_reviews.
      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: actor.id,
          fromStatus: proposal.status,
          toStatus: proposal.status,
          submittedAt,
          note: "Người đánh giá gửi phiếu chấm điểm và nhận xét"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: "submit-score-and-review-comment",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-review",
          targetEntityId: review.id,
          username: actor.username,
          reason: JSON.stringify({ proposalId, assignmentId, totalScore, recommendation })
        }
      });

      return review;
    })) as unknown as ProposalReviewRecord;

    return {
      ...this.toReviewResponse(submitted, assignmentId, actor.id),
      canEdit: false,
      ...this.getScoreCriteria()
    };
  }

  /** Staff/leadership read of submitted reviews for consolidation (ST-3.4) and decisions (ST-3.5). */
  toSubmittedReviewResponse(review: ProposalReviewRecord) {
    return {
      id: review.id,
      proposalId: review.proposalId,
      assignmentId: review.assignmentId,
      reviewerUserId: review.reviewerUserId,
      reviewerDisplayName: review.reviewer?.displayName ?? "",
      status: review.status,
      scoreData: (review.scoreData as Record<string, number> | null) ?? {},
      totalScore: review.totalScore ?? null,
      maxTotalScore: REVIEW_MAX_TOTAL_SCORE,
      comment: review.comment ?? "",
      recommendation: review.recommendation ?? "",
      recommendationLabel: getRecommendationLabel(review.recommendation),
      submittedAt: review.submittedAt?.toISOString() ?? ""
    };
  }

  private async assertAssigned(actor: SafeUserContext, proposalId: string) {
    const access = await this.reviewAccess.resolveForProposal(actor?.id, proposalId);
    if (!access.isAssignedReviewer) {
      throw new ForbiddenException({ message: "Bạn không được phân công đánh giá hồ sơ này." });
    }

    return access.assignmentId;
  }

  private assertReviewIsOpen(review: ProposalReviewRecord | null) {
    // Submitted reviews are immutable; ST-3.3 leaves any reopen policy to a later explicit story.
    if (review?.status === REVIEW_STATUS.submitted) {
      throw new BadRequestException({ message: "Phiếu đánh giá đã gửi và không còn được chỉnh sửa." });
    }
  }

  private canWriteReview(proposal: EvaluationProposalRecord, review: ProposalReviewRecord | null) {
    return (REVIEW_SUBMITTABLE_STATUSES as string[]).includes(proposal.status) && review?.status !== REVIEW_STATUS.submitted;
  }

  private async findReviewByAssignment(assignmentId: string) {
    return (await this.prisma.proposalReview.findFirst({
      where: { assignmentId },
      include: { reviewer: { select: { displayName: true } } }
    })) as ProposalReviewRecord | null;
  }

  private async upsertReview(
    assignmentId: string,
    data: {
      proposalId: string;
      reviewerUserId: string;
      status: string;
      scoreData: Record<string, number>;
      totalScore: number;
      comment: string;
      recommendation: string | null;
    }
  ) {
    const existing = await this.findReviewByAssignment(assignmentId);
    if (existing) {
      return (await this.prisma.proposalReview.update({
        where: { id: existing.id },
        data: {
          scoreData: data.scoreData,
          totalScore: data.totalScore,
          comment: data.comment,
          recommendation: data.recommendation
        } as never
      })) as ProposalReviewRecord;
    }

    return (await this.prisma.proposalReview.create({
      data: { assignmentId, ...data } as never
    })) as ProposalReviewRecord;
  }

  private readScores(value: unknown, options: { partial: boolean }) {
    const { entries, totalScore, errors } = validateReviewScores(value);

    if (!options.partial && errors.length > 0) {
      return {
        scoreData: toScoreDataObject(entries),
        totalScore,
        fieldErrors: { scoreData: errors.join(" ") }
      };
    }

    // A partial save still refuses an out-of-range number: "missing" is fine, "invalid" is not.
    if (options.partial) {
      const rangeErrors = errors.filter((error) => error.includes("phải là số nguyên"));
      if (rangeErrors.length > 0) {
        throw new BadRequestException({ message: "Điểm đánh giá không hợp lệ.", fieldErrors: { scoreData: rangeErrors.join(" ") } });
      }
    }

    return { scoreData: toScoreDataObject(entries), totalScore, fieldErrors: {} as Record<string, string> };
  }

  private readComment(value: unknown) {
    if (typeof value !== "string") {
      return "";
    }

    const trimmed = value.trim();
    if (trimmed.length > 5000) {
      throw new BadRequestException({ message: "Nhận xét không được vượt quá 5000 ký tự." });
    }

    return trimmed;
  }

  private readRecommendation(value: unknown, options: { required: boolean }) {
    if (value === undefined || value === null || value === "") {
      if (options.required) {
        throw new BadRequestException({ message: "Chọn kết luận đề nghị." });
      }
      return null;
    }

    if (typeof value !== "string" || !REVIEW_RECOMMENDATIONS.includes(value as ReviewRecommendation)) {
      throw new BadRequestException({ message: "Kết luận đề nghị không hợp lệ." });
    }

    return value;
  }

  private toReviewResponse(review: ProposalReviewRecord | null, assignmentId: string, reviewerUserId: string) {
    if (!review) {
      return {
        id: "",
        assignmentId,
        reviewerUserId,
        status: REVIEW_STATUS.draft,
        scoreData: {} as Record<string, number>,
        totalScore: null as number | null,
        comment: "",
        recommendation: "",
        recommendationLabel: "",
        submittedAt: ""
      };
    }

    return {
      id: review.id,
      assignmentId,
      reviewerUserId: review.reviewerUserId,
      status: review.status,
      scoreData: (review.scoreData as Record<string, number> | null) ?? {},
      totalScore: review.totalScore ?? null,
      comment: review.comment ?? "",
      recommendation: review.recommendation ?? "",
      recommendationLabel: getRecommendationLabel(review.recommendation),
      submittedAt: review.submittedAt?.toISOString() ?? ""
    };
  }
}
