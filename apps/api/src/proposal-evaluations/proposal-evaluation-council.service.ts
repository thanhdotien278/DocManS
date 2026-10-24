import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { APPROVAL_STAGE_LABELS, APPROVAL_STATUS_LABELS, assertReadyForLeadership, canSignApproval, closeApprovalSubmission, openApprovalSubmission, type ApprovalKey } from "../proposals-shared/approval-routing.js";
import { EVALUATION_COUNCIL_STRUCTURE, readCouncilFormationConfig } from "../proposals-shared/council-formation.js";
import {
  INVITATION_STATUS_LABELS,
  REVIEW_MAX_TOTAL_SCORE,
  REVIEW_STATUS,
  getAssignmentRoleLabel,
  getRecommendationLabel,
  isScoringRole,
  normalizeAssignmentRole,
  type ReviewAssignmentRole
} from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { proposalContextVersion, runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { isWorkflowVisibleStatus } from "../proposals-shared/proposal-workflow.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  assertCurrentCompletenessEvidence,
  assertProposalManagementWriteScope,
  assertProposalStatus,
  councilRosterBlockers,
  filterCurrentRoundAssignments,
  findCurrentSubmissionEvidence,
  findEvaluationProposal,
  isCouncilEstablished,
  resolveActorConflict,
  resolveCouncilFormationPermission,
  type EvaluationProposalRecord,
  type ProposalReviewRecord,
  type ReviewAssignmentRecord
} from "./proposal-evaluation-support.js";

/** Tờ trình hội đồng gắn theo vòng nộp: nộp lại hồ sơ sinh hội đồng và tờ trình mới (spec §3.4). */
const councilKey = (proposalId: string, roundId: string): ApprovalKey => ({ kind: "EVALUATION_COUNCIL", subjectType: "proposal", subjectId: proposalId, subjectRef: roundId });
const COUNCIL_SIGNER = "DIRECTOR_OR_SCIENCE_DEPUTY";
const COUNCIL_POSITIONS: ReviewAssignmentRole[] = ["council_chair", "reviewer", "committee_member", "council_secretary"];
const COUNCIL_STATUS_LABELS = { NOT_APPLICABLE: "Chưa áp dụng", FORMING: "Đang lập", READY_TO_SUBMIT: "Sẵn sàng trình", IN_APPROVAL: "Đang trình ký", ESTABLISHED: "Đã thành lập" } as const;
type CouncilStatus = keyof typeof COUNCIL_STATUS_LABELS;
const SUMMARY_STATUS_LABELS: Record<string, string> = { draft: "Bản nháp tổng hợp", finalized: "Đã chốt bản tổng hợp", ready_for_approval: "Đã chuyển chờ phê duyệt" };

/**
 * Hội đồng đánh giá = các hàng phân công của vòng hiện tại (không có model hội đồng riêng, spec §3.1).
 * Người có quyền theo cấu hình Admin (D-035) mời; CV³/TB¹/TP¹ lập tờ trình EVALUATION_COUNCIL khi đủ cơ cấu và mọi người đã nhận lời;
 * GĐ/PGĐ-KH ký trong cùng transaction đánh dấu `councilEstablishedAt`, và chỉ từ đó thành viên đã chấp nhận mới đọc được hồ sơ.
 * Trạng thái hội đồng là trạng thái suy ra, không lưu cột riêng.
 */
@Injectable()
export class ProposalEvaluationCouncilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService
  ) {}

  private transactional = false;

  private mutate<T>(actor: SafeUserContext, proposalId: string, context: unknown, work: (service: ProposalEvaluationCouncilService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    return runProposalMutation(this.prisma, actor, proposalId, context, async (tx, currentActor) => {
      const service = new ProposalEvaluationCouncilService(tx, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx));
      service.transactional = true;
      return work(service, currentActor);
    });
  }

  private async currentRoster(proposal: EvaluationProposalRecord, roundId: string) {
    const rows = (await this.prisma.proposalReviewAssignment.findMany({
      where: { proposalId: proposal.id },
      orderBy: { assignedAt: "asc" },
      include: { reviewer: { select: { displayName: true, username: true, unit: true, status: true } }, assignedBy: { select: { displayName: true } } }
    })) as unknown as ReviewAssignmentRecord[];
    return filterCurrentRoundAssignments(rows, roundId);
  }

  private async actorConflicted(actorId: string, proposalId: string) {
    return resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actorId, proposalId);
  }

  private async tryRound(proposal: EvaluationProposalRecord) {
    try {
      return await findCurrentSubmissionEvidence(this.prisma, proposal);
    } catch {
      return null;
    }
  }

  /** Trạng thái hội đồng cho màn hình: backend quyết định nút nào được bấm và lý do khóa (spec §8.3). */
  async getCouncil(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const formation = await resolveCouncilFormationPermission(this.prisma, actor, proposal);
    const isManager = await assertProposalManagementWriteScope(this.prisma, actor, proposal).then(() => true, () => false);
    const isSigner = canSignApproval(actor, COUNCIL_SIGNER);
    if ((!formation.decision.allowed && !isManager && !isSigner) || !isWorkflowVisibleStatus(proposal.status)) throw new ForbiddenException({ message: "Không có quyền xem hội đồng đánh giá của hồ sơ này." });

    const { config } = formation;
    const structure = EVALUATION_COUNCIL_STRUCTURE(config.memberCount);
    const round = await this.tryRound(proposal);
    const roundId = round?.eventId ?? "";
    const completeness = round ? await assertCurrentCompletenessEvidence(this.prisma, proposal).then(() => true, () => false) : false;
    const applicable = ["submitted", "resubmitted", "under_review"].includes(proposal.status) && completeness;
    const conflict = await this.actorConflicted(actor.id, proposalId);
    const roster = applicable ? await this.currentRoster(proposal, roundId) : [];
    const established = isCouncilEstablished(roster);
    const legacyRound = roster.length > 0 && !roster.some((row) => ["council_chair", "council_secretary"].includes(normalizeAssignmentRole(row.assignmentRole) ?? "reviewer"));
    const blockers = legacyRound && established ? [] : councilRosterBlockers(roster, config.memberCount);
    const pending = roundId ? await this.prisma.approvalSubmission.findFirst({ where: { ...councilKey(proposalId, roundId), status: "PENDING" }, select: { id: true } }) : null;
    const latest = roundId ? await this.prisma.approvalSubmission.findFirst({ where: { ...councilKey(proposalId, roundId), status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, include: { submittedBy: { select: { displayName: true } } } }) : null;
    const status: CouncilStatus = !applicable ? "NOT_APPLICABLE" : pending ? "IN_APPROVAL" : established ? "ESTABLISHED" : blockers.length === 0 ? "READY_TO_SUBMIT" : "FORMING";
    const summary = applicable ? await this.prisma.proposalEvaluationSummary.findFirst({ where: { proposalId }, select: { status: true } }) : null;
    const summaryOpen = !summary || summary.status === "draft";

    const atLeadership = Boolean(pending && latest?.stage === "LEADERSHIP");
    const editable = status === "FORMING" || status === "READY_TO_SUBMIT" || status === "ESTABLISHED";
    const full = roster.length >= config.memberCount;
    const formationAllowed = formation.decision.allowed;
    const inviteBlockedReason = conflict.conflicted ? conflict.viewerMessage
      : !formationAllowed ? (formation.decision as { reason: string }).reason
      : !applicable ? "Hồ sơ chưa ở giai đoạn thành lập hội đồng."
      : status === "IN_APPROVAL" ? "Danh sách bị khóa trong khi trình ký. Trả lại tờ trình để thay đổi."
      : !summaryOpen ? "Bản tổng hợp đã chốt, không thể đổi danh sách hội đồng."
      : full ? `Hội đồng đã đủ ${config.memberCount} thành viên.` : "";
    const canRevokeNow = !conflict.conflicted && formationAllowed && applicable && editable && summaryOpen && roster.length > 0;
    const submitBlockedReason = conflict.conflicted ? conflict.viewerMessage
      : !isManager ? "Chỉ Trưởng phòng, Trưởng ban hoặc Chuyên viên phụ trách hồ sơ được lập tờ trình hội đồng."
      : !applicable ? "Hồ sơ chưa ở giai đoạn thành lập hội đồng."
      : status === "IN_APPROVAL" ? "Đang có tờ trình chờ duyệt."
      : status === "ESTABLISHED" ? "Hội đồng đã được thành lập."
      : blockers[0] ?? "";
    const signBlockedReason = !isSigner ? "" : conflict.conflicted ? conflict.viewerMessage
      : !pending ? "Chưa có tờ trình hội đồng."
      : !atLeadership ? `Tờ trình chưa tới Ban giám đốc: ${APPROVAL_STAGE_LABELS[latest!.stage as keyof typeof APPROVAL_STAGE_LABELS] ?? latest!.stage}.`
      : blockers[0] ?? "";
    const viewer = {
      canInvite: !inviteBlockedReason && editable,
      inviteBlockedReason,
      canRevoke: canRevokeNow,
      canSubmit: !submitBlockedReason && status === "READY_TO_SUBMIT",
      submitBlockedReason,
      canSign: isSigner && !signBlockedReason,
      canReturn: isSigner && atLeadership && !conflict.conflicted,
      signBlockedReason
    };

    // Người xung đột vẫn nhận 200 nhưng không thấy danh sách, tiến độ hay tờ trình.
    const visible = conflict.conflicted ? [] : roster;
    const establishedAt = status === "ESTABLISHED" ? roster.map((row) => row.councilEstablishedAt?.getTime() ?? 0).reduce((max, time) => Math.max(max, time), 0) : 0;
    return {
      contextVersion: proposalContextVersion(proposal),
      roundId,
      status,
      statusLabel: COUNCIL_STATUS_LABELS[status],
      legacyRound,
      config: { memberCount: config.memberCount, structure },
      slots: COUNCIL_POSITIONS.map((position) => {
        const rows = visible.filter((row) => (normalizeAssignmentRole(row.assignmentRole) ?? "reviewer") === position);
        return { position, positionLabel: getAssignmentRoleLabel(position), required: structure[position], filled: rows.length, accepted: rows.filter((row) => (row.invitationStatus ?? "accepted") === "accepted").length };
      }),
      blockers: conflict.conflicted ? [] : blockers,
      viewer,
      approval: conflict.conflicted || !latest ? null : { id: latest.id, stage: latest.stage, stageLabel: APPROVAL_STAGE_LABELS[latest.stage as keyof typeof APPROVAL_STAGE_LABELS] ?? latest.stage, status: latest.status, statusLabel: APPROVAL_STATUS_LABELS[latest.status as keyof typeof APPROVAL_STATUS_LABELS] ?? latest.status, submittedByName: latest.submittedBy?.displayName ?? "", lastNote: latest.lastNote ?? "" },
      establishedAt: establishedAt ? new Date(establishedAt).toISOString() : "",
      members: visible.map((row) => {
        const position = normalizeAssignmentRole(row.assignmentRole) ?? "reviewer";
        return {
          assignmentId: row.id,
          reviewerUserId: row.reviewerUserId,
          displayName: row.reviewer?.displayName ?? "",
          username: row.reviewer?.username ?? "",
          unit: row.reviewer?.unit ?? "",
          assignmentRole: position,
          assignmentRoleLabel: getAssignmentRoleLabel(position),
          scoring: isScoringRole(position),
          invitationStatus: row.invitationStatus ?? "accepted",
          invitationStatusLabel: INVITATION_STATUS_LABELS[row.invitationStatus ?? "accepted"] ?? "",
          declineReason: row.declineReason ?? "",
          respondedAt: row.respondedAt?.toISOString() ?? "",
          dueDate: row.dueDate?.toISOString() ?? "",
          assignedByDisplayName: row.assignedBy?.displayName ?? "",
          councilEstablishedAt: row.councilEstablishedAt?.toISOString() ?? ""
        };
      })
    };
  }

  /**
   * Lập tờ trình EVALUATION_COUNCIL (qua Story 5.9). Chỉ khi đủ số lượng/cơ cấu và mọi thành viên đã nhận lời (P2).
   * Tờ trình bổ sung (P8) cho thành viên mới của hội đồng đã thành lập cũng đi qua đây.
   */
  async submitCouncil(actor: SafeUserContext, proposalId: string, input: { contextVersion: unknown; note?: string }): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, current) => service.submitCouncil(current, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertProposalManagementWriteScope(this.prisma, actor, proposal);
    assertProposalStatus(proposal, ["under_review"], "Chỉ hồ sơ đang đánh giá mới lập tờ trình hội đồng.");
    const conflict = await this.actorConflicted(actor.id, proposalId);
    if (conflict.conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: conflict.viewerMessage });
    const evidence = await assertCurrentCompletenessEvidence(this.prisma, proposal);
    const roster = await this.currentRoster(proposal, evidence.eventId);
    if (isCouncilEstablished(roster)) throw new BadRequestException({ code: "COUNCIL_ALREADY_ESTABLISHED", message: "Hội đồng đã được thành lập." });
    const config = await readCouncilFormationConfig(this.prisma, "EVALUATION");
    const blockers = councilRosterBlockers(roster, config.memberCount);
    if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Chưa thể lập tờ trình hội đồng: ${blockers.join(" ")}`, blockers });
    const submission = await openApprovalSubmission(this.prisma as never, actor, councilKey(proposalId, evidence.eventId), { title: `Hội đồng đánh giá: ${proposal.title}`, hostOrganizationUnitId: proposal.hostOrganizationUnitId, note: input.note });
    return { submissionId: submission.id, stage: submission.stage };
  }

  /** GĐ/PGĐ-KH ký (thành lập hội đồng) hoặc trả lại. Trả lại không đổi gì ở danh sách phân công. */
  async decideCouncil(actor: SafeUserContext, proposalId: string, input: { decision: "sign" | "return"; note?: string; contextVersion: unknown }): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, current) => service.decideCouncil(current, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertProposalStatus(proposal, ["under_review"], "Chỉ hồ sơ đang đánh giá mới ký hội đồng.");
    const evidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const key = councilKey(proposalId, evidence.eventId);
    const pending = await assertReadyForLeadership(this.prisma as never, actor, key);
    if (input.decision === "return") {
      await closeApprovalSubmission(this.prisma as never, actor, key, "RETURNED", input.note);
      return { submissionId: pending.id, status: "RETURNED" };
    }
    // Danh sách và cấu hình có thể đã đổi giữa lúc lập và lúc ký: kiểm tra lại trong chính transaction ký.
    const roster = await this.currentRoster(proposal, evidence.eventId);
    const config = await readCouncilFormationConfig(this.prisma, "EVALUATION");
    const blockers = councilRosterBlockers(roster, config.memberCount);
    if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Không thể ký: ${blockers.join(" ")}`, blockers });
    await closeApprovalSubmission(this.prisma as never, actor, key, "APPROVED", input.note);
    const establishedAt = await readTransactionClockV1(this.prisma);
    const moved = await this.prisma.proposalReviewAssignment.updateMany({ where: { id: { in: roster.map((row) => row.id) }, councilEstablishedAt: null }, data: { councilEstablishedAt: establishedAt } as never });
    await this.prisma.researchProposal.update({
      where: { id: proposalId },
      data: { authorizationRelationshipVersion: { increment: 1 }, authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: establishedAt } as never
    });
    await this.auditLog.record({
      action: "establish-evaluation-council",
      result: "success",
      actorId: actor.id,
      targetEntity: "research-proposal",
      targetEntityId: proposalId,
      username: actor.username,
      reason: JSON.stringify({ proposalId, approvalSubmissionId: pending.id, councilRound: evidence.eventId, supplement: moved.count < roster.length, assignmentIds: roster.map((row) => row.id), establishedAt: establishedAt.toISOString(), newlyEstablished: moved.count })
    });
    return { submissionId: pending.id, status: "APPROVED", establishedAt: establishedAt.toISOString() };
  }

  /**
   * Thư ký (đã nhận lời, hội đồng đã thành lập) xem tiến độ và các phiếu đã gửi ẩn danh (P7): chỉ nhãn "Phiếu N",
   * không có tên, tài khoản, mã phân công hay vai trò người chấm.
   */
  async getSecretaryReviews(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const access = await this.reviewAccess.resolveForProposal(actor?.id, proposalId);
    if (!access.isAssignedReviewer || access.assignmentRole !== "council_secretary" || (await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) {
      throw new ForbiddenException({ code: "COUNCIL_SECRETARY_ONLY", message: "Chỉ thư ký hội đồng đã được thành lập mới xem được nội dung này." });
    }
    assertProposalStatus(proposal, ["under_review", "ready_for_approval", "approved", "rejected"], "Hồ sơ không ở giai đoạn xem phiếu đánh giá.");
    const evidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const roster = await this.currentRoster(proposal, evidence.eventId);
    if (!roster.some((row) => row.id === access.assignmentId)) throw new ForbiddenException({ code: "STALE_ASSIGNMENT_CONTEXT", message: "Phân công không còn gắn với phiên bản nộp hiện tại của hồ sơ." });
    const scoringIds = roster.filter((row) => isScoringRole(row.assignmentRole)).map((row) => row.id);
    const submitted = (await this.prisma.proposalReview.findMany({
      where: { proposalId, submissionEventId: evidence.eventId, status: REVIEW_STATUS.submitted, assignmentId: { in: scoringIds } },
      orderBy: { submittedAt: "asc" }
    })) as ProposalReviewRecord[];
    const scores = submitted.map((review) => review.totalScore).filter((score): score is number => typeof score === "number");
    const summary = await this.prisma.proposalEvaluationSummary.findFirst({ where: { proposalId }, include: { updatedBy: { select: { displayName: true } } } });
    return {
      reviews: submitted.map((review, index) => ({
        label: `Phiếu ${index + 1}`,
        totalScore: review.totalScore ?? null,
        maxTotalScore: REVIEW_MAX_TOTAL_SCORE,
        scoreData: (review.scoreData as Record<string, number> | null) ?? {},
        recommendation: review.recommendation ?? "",
        recommendationLabel: getRecommendationLabel(review.recommendation),
        comment: review.comment ?? "",
        submittedAt: review.submittedAt?.toISOString() ?? ""
      })),
      progress: {
        scoringMemberCount: scoringIds.length,
        submittedCount: submitted.length,
        pendingCount: scoringIds.length - submitted.length,
        averageTotalScore: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null
      },
      // Bổ sung ngoài §8.1: thư ký cần đọc lại bản nháp đã lưu (và biết khi đã chốt) để soạn tiếp.
      evaluationSummary: summary ? { status: summary.status, statusLabel: SUMMARY_STATUS_LABELS[summary.status] ?? summary.status, summary: summary.summary, recommendation: summary.recommendation, recommendationLabel: getRecommendationLabel(summary.recommendation), updatedByDisplayName: summary.updatedBy?.displayName ?? "", updatedAt: summary.updatedAt.toISOString() } : null
    };
  }
}
