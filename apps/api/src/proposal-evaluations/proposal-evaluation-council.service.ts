import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { APPROVAL_STAGE_LABELS, assertReadyForLeadership, canSignApproval, closeApprovalSubmission, openApprovalSubmission, type ApprovalKey } from "../proposals-shared/approval-routing.js";
import { INVITATION_STATUS_LABELS, getAssignmentRoleLabel, normalizeAssignmentRole } from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { proposalContextVersion, runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { isWorkflowVisibleStatus } from "../proposals-shared/proposal-workflow.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  assertCurrentCompletenessEvidence,
  assertProposalManagementWriteScope,
  assertProposalStatus,
  filterCurrentRoundAssignments,
  findCurrentSubmissionEvidence,
  findEvaluationProposal,
  resolveActorConflict,
  summarizeReviewProgress,
  type EvaluationProposalRecord,
  type ReviewAssignmentRecord
} from "./proposal-evaluation-support.js";

const councilKey = (proposalId: string): ApprovalKey => ({ kind: "EVALUATION_COUNCIL", subjectType: "proposal", subjectId: proposalId });
const COUNCIL_SIGNER = "DIRECTOR_OR_SCIENCE_DEPUTY";

/** Chặn lập/ký khi danh sách chưa đủ: đúng 2 phản biện, ít nhất 3 thành viên hội đồng, mọi người đã chấp nhận. */
export function councilRosterBlockers(roster: ReviewAssignmentRecord[]) {
  const blockers = [...summarizeReviewProgress(roster, []).readinessReasons.filter((reason) => !reason.startsWith("Còn "))];
  const invited = roster.filter((row) => (row.invitationStatus ?? "accepted") === "invited").length;
  const declined = roster.filter((row) => row.invitationStatus === "declined").length;
  if (declined) blockers.push(`${declined} thành viên đã từ chối: thu hồi phân công và mời người khác.`);
  if (invited) blockers.push(`${invited} thành viên chưa chấp nhận lời mời.`);
  return blockers;
}

/**
 * Story 5.10: hội đồng đánh giá = danh sách phân công của vòng hiện tại (không có model hội đồng riêng).
 * TP¹/TB¹/CV³ lập tờ trình EVALUATION_COUNCIL sau khi mọi thành viên chấp nhận; GĐ/PGĐ-KH ký trong cùng
 * transaction đánh dấu `councilEstablishedAt`, và chỉ từ đó thành viên đã chấp nhận mới đọc được hồ sơ.
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

  private async currentRoster(proposal: EvaluationProposalRecord) {
    const evidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const rows = (await this.prisma.proposalReviewAssignment.findMany({
      where: { proposalId: proposal.id },
      orderBy: { assignedAt: "asc" },
      include: { reviewer: { select: { displayName: true, username: true, unit: true, status: true } } }
    })) as unknown as ReviewAssignmentRecord[];
    return filterCurrentRoundAssignments(rows, evidence.eventId);
  }

  private async actorConflicted(actorId: string, proposalId: string) {
    return resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actorId, proposalId);
  }

  /** Trạng thái hội đồng cho màn hình: backend quyết định nút nào được bấm và lý do khóa. */
  async getCouncil(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const isManager = await assertProposalManagementWriteScope(this.prisma, actor, proposal).then(() => true, () => false);
    const isSigner = canSignApproval(actor, COUNCIL_SIGNER);
    if ((!isManager && !isSigner) || !isWorkflowVisibleStatus(proposal.status)) throw new ForbiddenException({ message: "Không có quyền xem hội đồng đánh giá của hồ sơ này." });

    const conflict = await this.actorConflicted(actor.id, proposalId);
    const base = { contextVersion: proposalContextVersion(proposal), canOpen: false, canSign: false, canReturn: false, blockedReason: "", members: [] as unknown[], approval: null as unknown, established: false };
    if (conflict.conflicted) return { ...base, blockedReason: conflict.viewerMessage };

    const roster = proposal.status === "under_review" ? await this.currentRoster(proposal) : [];
    const established = roster.length > 0 && roster.every((row) => row.councilEstablishedAt);
    const blockers = councilRosterBlockers(roster);
    const pending = await this.prisma.approvalSubmission.findFirst({ where: { ...councilKey(proposalId), subjectRef: "", status: "PENDING" }, include: { submittedBy: { select: { displayName: true } } } });
    const atLeadership = pending?.stage === "LEADERSHIP";
    const reasonOpen = proposal.status !== "under_review" ? "Hồ sơ không ở giai đoạn đánh giá." : established ? "Hội đồng đã được thành lập." : pending ? "Đang có tờ trình chờ duyệt." : blockers[0] ?? "";
    const reasonSign = !pending ? "Chưa có tờ trình hội đồng." : !atLeadership ? `Tờ trình chưa tới Ban giám đốc: ${APPROVAL_STAGE_LABELS[pending.stage as keyof typeof APPROVAL_STAGE_LABELS]}.` : blockers[0] ?? "";
    return {
      ...base,
      canOpen: isManager && !reasonOpen,
      canSign: isSigner && !reasonSign,
      canReturn: isSigner && atLeadership,
      blockedReason: isSigner && !isManager ? reasonSign : reasonOpen,
      established,
      approval: pending ? { id: pending.id, stage: pending.stage, stageLabel: APPROVAL_STAGE_LABELS[pending.stage as keyof typeof APPROVAL_STAGE_LABELS] ?? pending.stage, submittedByName: pending.submittedBy?.displayName ?? "" } : null,
      members: roster.map((row) => ({
        assignmentId: row.id,
        displayName: row.reviewer?.displayName ?? "",
        assignmentRole: normalizeAssignmentRole(row.assignmentRole),
        assignmentRoleLabel: getAssignmentRoleLabel(row.assignmentRole),
        invitationStatus: row.invitationStatus ?? "accepted",
        invitationStatusLabel: INVITATION_STATUS_LABELS[row.invitationStatus ?? "accepted"] ?? "",
        declineReason: row.declineReason ?? "",
        dueDate: row.dueDate?.toISOString() ?? "",
        councilEstablishedAt: row.councilEstablishedAt?.toISOString() ?? ""
      }))
    };
  }

  /** Lập tờ trình EVALUATION_COUNCIL (qua Story 5.9). Từ chối khi còn thành viên chưa chấp nhận hoặc đã từ chối. */
  async submitCouncil(actor: SafeUserContext, proposalId: string, input: { contextVersion: unknown; note?: string }): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, current) => service.submitCouncil(current, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertProposalManagementWriteScope(this.prisma, actor, proposal);
    assertProposalStatus(proposal, ["under_review"], "Chỉ hồ sơ đang đánh giá mới lập tờ trình hội đồng.");
    const conflict = await this.actorConflicted(actor.id, proposalId);
    if (conflict.conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: conflict.viewerMessage });
    await assertCurrentCompletenessEvidence(this.prisma, proposal);
    const roster = await this.currentRoster(proposal);
    if (roster.length && roster.every((row) => row.councilEstablishedAt)) throw new BadRequestException({ code: "COUNCIL_ALREADY_ESTABLISHED", message: "Hội đồng đã được thành lập." });
    const blockers = councilRosterBlockers(roster);
    if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Chưa thể lập tờ trình hội đồng: ${blockers.join(" ")}`, blockers });
    const submission = await openApprovalSubmission(this.prisma as never, actor, councilKey(proposalId), { title: `Hội đồng đánh giá: ${proposal.title}`, hostOrganizationUnitId: proposal.hostOrganizationUnitId, note: input.note });
    return { submissionId: submission.id, stage: submission.stage };
  }

  /** GĐ/PGĐ-KH ký (thành lập hội đồng) hoặc trả lại. Trả lại không đổi gì ở danh sách phân công. */
  async decideCouncil(actor: SafeUserContext, proposalId: string, input: { decision: "sign" | "return"; note?: string; contextVersion: unknown }): Promise<any> {
    if (!this.transactional) return this.mutate(actor, proposalId, input.contextVersion, (service, current) => service.decideCouncil(current, proposalId, input));
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    assertProposalStatus(proposal, ["under_review"], "Chỉ hồ sơ đang đánh giá mới ký hội đồng.");
    const pending = await assertReadyForLeadership(this.prisma as never, actor, councilKey(proposalId));
    if (input.decision === "return") {
      await closeApprovalSubmission(this.prisma as never, actor, councilKey(proposalId), "RETURNED", input.note);
      return { submissionId: pending.id, status: "RETURNED" };
    }
    // Danh sách có thể đã đổi giữa lúc lập và lúc ký: kiểm tra lại trong chính transaction ký.
    const roster = await this.currentRoster(proposal);
    const blockers = councilRosterBlockers(roster);
    if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Không thể ký: ${blockers.join(" ")}`, blockers });
    await closeApprovalSubmission(this.prisma as never, actor, councilKey(proposalId), "APPROVED", input.note);
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
      reason: JSON.stringify({ proposalId, approvalSubmissionId: pending.id, assignmentIds: roster.map((row) => row.id), establishedAt: establishedAt.toISOString(), newlyEstablished: moved.count })
    });
    return { submissionId: pending.id, status: "APPROVED", establishedAt: establishedAt.toISOString() };
  }
}
