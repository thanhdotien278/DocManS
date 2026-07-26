import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { REVIEW_STATUS } from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import { DECIDABLE_STATUSES, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import {
  assertApprovalAuthority,
  assertCanReadEvaluation,
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

  /** AC-ST-3.5-01 — everything the authority needs in one authority-scoped read model. */
  async getDecisionPackage(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertApprovalAuthority(actor);
    // Same workflow gate as `canReadProposal`: a draft belongs to its owner, so the decision package
    // must not become a side channel that reports an unsubmitted proposal's existence.
    assertCanReadEvaluation(actor, proposal);

    const [assignmentRecords, reviewRecords, summary, decisions, attachments, history] = await Promise.all([
      this.assignments.findAssignments(proposalId),
      this.assignments.findReviews(proposalId),
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

    const conflict = await this.resolveDecisionConflict(actor, proposal);

    return {
      proposalId,
      proposalStatus: proposal.status,
      proposalStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      canDecide: (DECIDABLE_STATUSES as string[]).includes(proposal.status) && !conflict.conflicted,
      conflict,
      progress: this.summaries.summarizeProgress(assignmentRecords, reviewRecords),
      reviews: reviewRecords
        .filter((review) => review.status === REVIEW_STATUS.submitted)
        .map((review) => this.reviews.toSubmittedReviewResponse(review)),
      evaluationSummary: this.summaries.toSummaryResponse(summary),
      decisions: decisions.map((decision) => this.toDecisionResponse(decision)),
      attachmentCount: (attachments as unknown[]).length,
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

  /** AC-ST-3.5-02. Status, decision record, history and audit are written in one transaction. */
  async decide(actor: SafeUserContext, proposalId: string, decision: ProposalDecisionCode, input: Record<string, unknown> = {}) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertApprovalAuthority(actor);
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

    const note = this.readNote(input.note, { required: decision === PROPOSAL_DECISIONS.rejected });
    const toStatus = DECISION_TARGET_STATUS[decision];
    const decidedAt = new Date();

    const created = (await this.prisma.$transaction(async (tx) => {
      // Conditional on the status we validated, so two authorities deciding at once cannot both win.
      await updateProposalStatusGuarded(tx, proposalId, proposal.status, toStatus);

      const record = (await tx.proposalDecision.create({
        data: {
          proposalId,
          decision,
          note,
          decidedById: actor.id,
          decidedAt,
          fromStatus: proposal.status,
          toStatus
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
          reason: JSON.stringify({ proposalId, decision, fromStatus: proposal.status, toStatus, hasNote: Boolean(note) })
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
      toStatus: decision.toStatus
    };
  }
}
