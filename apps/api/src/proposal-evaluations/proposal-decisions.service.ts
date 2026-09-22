import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import { DECIDABLE_STATUSES, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import {
  assertApprovalAuthority,
  filterCurrentRoundAssignments,
  assertCanReadEvaluation,
  assertCurrentCompletenessEvidence,
  assertProposalStatus,
  findEvaluationProposal,
  resolveActorConflict,
  updateProposalStatusGuarded,
  type EvaluationProposalRecord,
  type ProposalDecisionRecord
} from "./proposal-evaluation-support.js";
import { ProposalEvaluationSummaryService } from "./proposal-evaluation-summary.service.js";
import { ProposalReviewAssignmentsService } from "./proposal-review-assignments.service.js";
import { ProposalReviewsService } from "./proposal-reviews.service.js";

export const PROPOSAL_DECISIONS = {
  approved: "approved",
  rejected: "rejected"
} as const;

export type ProposalDecisionCode = (typeof PROPOSAL_DECISIONS)[keyof typeof PROPOSAL_DECISIONS];

const DECISION_TARGET_STATUS: Record<ProposalDecisionCode, string> = {
  approved: PROPOSAL_STATUS.approved,
  rejected: PROPOSAL_STATUS.rejected
};

const DECISION_LABELS: Record<string, string> = {
  approved: "Phê duyệt",
  rejected: "Không phê duyệt"
};

/**
 * ST-3.5 — the leadership approval decision.
 *
 * Authority, workflow state and conflict are all checked in the same service path, so no caller can
 * satisfy two of the three and skip the last (AC-ST-3.5-02, AC-ST-3.5-03, AC-ST-3.5-04). The
 * conflict check reuses the ST-3.0 primitive and additionally blocks an authority who reviewed the
 * proposal, which is a conflict the participation primitive alone cannot see.
 */
@Injectable()
export class ProposalDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService,
    private readonly assignments: ProposalReviewAssignmentsService,
    private readonly reviews: ProposalReviewsService,
    private readonly summaries: ProposalEvaluationSummaryService
  ) {}

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, proposalId: string, context: unknown, work: (service: ProposalDecisionsService, currentActor: SafeUserContext) => Promise<T>) {
    return runProposalMutation(this.prisma, actor, proposalId, context, async (tx, currentActor) => {
      const audit = new AuditLogService(tx);
      const participation = new ProposalParticipationService(tx);
      const access = new ProposalReviewAccessService(tx);
      const assignments = new ProposalReviewAssignmentsService(tx, audit, participation, access);
      const reviews = new ProposalReviewsService(tx, audit, access, participation);
      const summaries = new ProposalEvaluationSummaryService(tx, audit, assignments, reviews, participation, access);
      const service = new ProposalDecisionsService(tx, audit, participation, access, assignments, reviews, summaries);
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  /** AC-ST-3.5-01 — everything the authority needs in one authority-scoped read model. */
  async getDecisionPackage(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertApprovalAuthority(actor);
    // Same workflow gate as `canReadProposal`: a draft belongs to its owner, so the decision package
    // must not become a side channel that reports an unsubmitted proposal's existence.
    await assertCanReadEvaluation(this.prisma, actor, proposal);
    const conflict = await this.resolveDecisionConflict(actor, proposal);
    if (conflict.conflicted || ![PROPOSAL_STATUS.readyForApproval, PROPOSAL_STATUS.approved, PROPOSAL_STATUS.rejected].includes(proposal.status as never)) {
      throw new ForbiddenException({ message: "Chỉ được xem gói đánh giá đã trình lãnh đạo khi không có xung đột lợi ích." });
    }

    const [assignmentRecords, reviewRecords, summary, decisions, attachments, history] = await Promise.all([
      this.assignments.findCurrentRoundAssignments(proposal),
      this.assignments.findCurrentRoundReviews(proposal),
      this.summaries.findSummary(proposalId),
      this.findDecisions(proposalId),
      this.prisma.fileRecord.findMany({
        where: { relatedEntityType: "research_proposal", relatedEntityId: proposalId, status: "active", deletedAt: null },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.proposalSubmissionEvent.findMany({
        where: { proposalId },
        orderBy: { submittedAt: "asc" },
        include: { actor: { select: { displayName: true } } }
      })
    ]);

    const { pendingReviewers, averageTotalScore, ...publicProgress } = this.summaries.summarizeProgress(assignmentRecords, reviewRecords);
    return {
      proposalId,
      proposalStatus: proposal.status,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      canDecide: (DECIDABLE_STATUSES as string[]).includes(proposal.status) && !conflict.conflicted && summary?.status === "ready_for_approval" && publicProgress.allReviewsSubmitted,
      conflict,
      progress: publicProgress,
      // Leadership receives the routed aggregate and decision history, but reviewer identity,
      // raw scores and confidential comments remain hidden unless a future policy explicitly grants
      // that disclosure.
      reviews: [],
      evaluationSummary: this.summaries.toSummaryResponse(summary),
      packageRevision: summary?.revision ?? 0,
      disclosure: { protectedReviewData: "REDACTED" },
      decisions: decisions.map((decision) => this.toDecisionResponse(decision)),
      attachmentCount: (attachments as unknown[]).length,
      history: (
        history as Array<{
          id: string;
          fromStatus: string;
          toStatus: string;
          submittedAt: Date;
          note: string | null;
          snapshot?: unknown;
          actor?: { displayName: string } | null;
        }>
      ).map((event) => ({
        // Do not expose reviewer identity through the leadership history projection.
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        submittedAt: event.submittedAt.toISOString(),
        actorDisplayName: ((event.snapshot as { kind?: string } | null | undefined)?.kind === "review_submitted" || (event.fromStatus === "under_review" && event.toStatus === "under_review")) ? "" : event.actor?.displayName ?? "",
        note: event.note ?? ""
      }))
    };
  }

  /** AC-ST-3.5-02. Status, decision record, history and audit are written in one transaction. */
  async decide(actor: SafeUserContext, proposalId: string, decision: ProposalDecisionCode, input: Record<string, unknown> = {}): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, currentActor) => service.decide(currentActor, proposalId, decision, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertApprovalAuthority(actor);
    await assertCanReadEvaluation(this.prisma, actor, proposal);
    assertProposalStatus(proposal, DECIDABLE_STATUSES, "Chỉ hồ sơ ở trạng thái chờ phê duyệt mới được quyết định.");

    const conflict = await this.resolveDecisionConflict(actor, proposal);
    if (conflict.conflicted) {
      await this.auditLog.record({
        action: decision === PROPOSAL_DECISIONS.approved ? "approve-proposal" : "reject-proposal",
        result: "failure",
        actorId: actor.id,
        targetEntity: "proposal-decision",
        targetEntityId: proposalId,
        username: actor.username,
        reason: JSON.stringify({ proposalId, reasonCode: conflict.reasonCode, reason: conflict.reason })
      });

      throw new BadRequestException({ message: conflict.viewerMessage, reasonCode: conflict.reasonCode });
    }

    const summary = await this.summaries.findSummary(proposalId);
    const packageRevision = Number(input.packageRevision);
    const currentEvidence = await assertCurrentCompletenessEvidence(this.prisma, proposal);
    const packageSnapshot = summary?.evidenceSnapshot as { lifecycle?: unknown; submissionEventId?: unknown } | null | undefined;
    if (!summary || summary.revision !== packageRevision || !summary.evidenceSnapshot || packageSnapshot?.lifecycle !== "finalized" || packageSnapshot?.submissionEventId !== currentEvidence.eventId) {
      throw new BadRequestException({ code: "PACKAGE_CONTEXT_MISMATCH", message: "Gói đánh giá đã thay đổi. Vui lòng tải lại trước khi quyết định." });
    }
    const progress = this.summaries.summarizeProgress(await this.assignments.findCurrentRoundAssignments(proposal), await this.assignments.findCurrentRoundReviews(proposal));
    if (summary?.status !== "ready_for_approval" || !progress.allReviewsSubmitted) throw new BadRequestException({ message: "Gói đánh giá chưa đủ điều kiện quyết định." });
    const note = this.readNote(input.note, { required: decision === PROPOSAL_DECISIONS.rejected });
    const toStatus = DECISION_TARGET_STATUS[decision];
    const decidedAt = new Date();

    const created = (await this.prisma.$transaction(async (tx) => {
      const currentSummary = await tx.proposalEvaluationSummary.findUnique({ where: { id: summary.id } });
      const currentAssignments = await tx.proposalReviewAssignment.findMany({ where: { proposalId }, include: { reviewer: true } });
      const currentReviews = await tx.proposalReview.findMany({ where: { proposalId } });
      const currentEvidence = await assertCurrentCompletenessEvidence(tx, proposal);
      const currentPackageSnapshot = currentSummary?.evidenceSnapshot as { lifecycle?: unknown; submissionEventId?: unknown; assignmentIds?: unknown; reviewIds?: unknown } | null | undefined;
      const roundAssignments = filterCurrentRoundAssignments(currentAssignments, currentEvidence.eventId);
      const roundReviews = currentReviews.filter((review) => review.submissionEventId === currentEvidence.eventId && roundAssignments.some((assignment) => assignment.id === review.assignmentId));
      const currentProgress = this.summaries.summarizeProgress(roundAssignments, roundReviews);
      const currentAssignmentIds = roundAssignments.map((assignment) => assignment.id).sort();
      const currentReviewIds = roundReviews.filter((review) => review.status === "submitted").map((review) => review.id).sort();
      const evidenceAssignmentIds = Array.isArray(currentPackageSnapshot?.assignmentIds) ? currentPackageSnapshot.assignmentIds.filter((id): id is string => typeof id === "string").sort() : [];
      const evidenceReviewIds = Array.isArray(currentPackageSnapshot?.reviewIds) ? currentPackageSnapshot.reviewIds.filter((id): id is string => typeof id === "string").sort() : [];
      if (!currentSummary || currentSummary.status !== "ready_for_approval" || currentSummary.revision !== packageRevision || !currentSummary.evidenceSnapshot || currentPackageSnapshot?.lifecycle !== "finalized" || currentPackageSnapshot?.submissionEventId !== currentEvidence.eventId || JSON.stringify(evidenceAssignmentIds) !== JSON.stringify(currentAssignmentIds) || JSON.stringify(evidenceReviewIds) !== JSON.stringify(currentReviewIds) || !currentProgress.allReviewsSubmitted) {
        throw new BadRequestException({ code: "PACKAGE_CONTEXT_MISMATCH", message: "Gói đánh giá đã thay đổi. Vui lòng tải lại trước khi quyết định." });
      }

      // Conditional on the status and package revision we validated, so two authorities deciding at once cannot both win.
      await updateProposalStatusGuarded(tx, proposalId, proposal.status, toStatus);

      const record = (await tx.proposalDecision.create({
        data: {
          proposalId,
          decision,
          note,
          decidedById: actor.id,
          decidedAt,
          fromStatus: proposal.status,
          toStatus,
          packageRevision,
          contextVersion: input.contextVersion,
          packageSnapshot: currentSummary.evidenceSnapshot,
          publicSummary: input.publicSummary ? { text: String(input.publicSummary), requiredFollowUp: input.requiredFollowUp ? String(input.requiredFollowUp) : "" } : null
        } as never,
        // Included so the response names the deciding authority, matching what `findDecisions`
        // returns on a later read of the same record.
        include: { decidedBy: { select: { displayName: true } } }
      })) as ProposalDecisionRecord;

      await tx.proposalSubmissionEvent.create({
        data: {
          proposalId,
          actorId: actor.id,
          fromStatus: proposal.status,
          toStatus,
          submittedAt: decidedAt,
          snapshot: {
            kind: "proposal_decision",
            schemaVersion: "proposal-decision-evidence.v1",
            decision,
            packageRevision,
            packageSnapshot: currentSummary.evidenceSnapshot,
            contextVersion: input.contextVersion
          },
          note: decision === PROPOSAL_DECISIONS.approved ? "Lãnh đạo phê duyệt hồ sơ" : "Lãnh đạo không phê duyệt hồ sơ"
        } as never
      });

      await tx.auditLog.create({
        data: {
          action: decision === PROPOSAL_DECISIONS.approved ? "approve-proposal" : "reject-proposal",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-decision",
          targetEntityId: record.id,
          username: actor.username,
          reason: JSON.stringify({ proposalId, decision, fromStatus: proposal.status, toStatus, packageRevision, hasNote: Boolean(note) })
        }
      });

      return record;
    })) as unknown as ProposalDecisionRecord;

    return {
      decision: this.toDecisionResponse(created),
      proposalStatus: toStatus,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[toStatus] ?? toStatus
    };
  }

  async findDecisions(proposalId: string) {
    return (await this.prisma.proposalDecision.findMany({
      where: { proposalId },
      orderBy: { decidedAt: "asc" },
      include: { decidedBy: { select: { displayName: true } } }
    })) as ProposalDecisionRecord[];
  }

  /**
   * AC-ST-3.5-04. Participation conflicts come from the ST-3.0 primitive; a review assignment on the
   * same proposal is the additional conflict, since an authority who scored the proposal would
   * otherwise be judging their own review. Shared with ST-3.4 consolidation.
   */
  private resolveDecisionConflict(actor: SafeUserContext, proposal: EvaluationProposalRecord) {
    return resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor?.id, proposal.id);
  }

  private readNote(value: unknown, options: { required: boolean }) {
    const note = typeof value === "string" ? value.trim() : "";

    if (!note) {
      if (options.required) {
        throw new BadRequestException({ message: "Nhập lý do khi không phê duyệt hồ sơ." });
      }
      return null;
    }

    if (note.length > 2000) {
      throw new BadRequestException({ message: "Ý kiến quyết định không được vượt quá 2000 ký tự." });
    }

    return note;
  }

  private toDecisionResponse(decision: ProposalDecisionRecord) {
    return {
      id: decision.id,
      proposalId: decision.proposalId,
      decision: decision.decision,
      decisionLabel: DECISION_LABELS[decision.decision] ?? decision.decision,
      note: decision.note ?? "",
      decidedById: decision.decidedById,
      decidedByDisplayName: decision.decidedBy?.displayName ?? "",
      decidedAt: decision.decidedAt.toISOString(),
      fromStatus: decision.fromStatus,
      toStatus: decision.toStatus,
      publicSummary: (decision.publicSummary as { text?: unknown } | null)?.text ?? "",
      requiredFollowUp: (decision.publicSummary as { requiredFollowUp?: unknown } | null)?.requiredFollowUp ?? ""
    };
  }
}
