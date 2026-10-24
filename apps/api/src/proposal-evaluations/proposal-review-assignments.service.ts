import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  getAssignmentRoleLabel,
  getRecommendationLabel,
  normalizeAssignmentRole,
  isScoringRole,
  grantsReviewAccess,
  REVIEW_ASSIGNMENT_STATUS,
  REVIEW_ASSIGNMENT_STATUS_LABELS,
  INVITATION_STATUS_LABELS,
  REVIEW_STATUS
} from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { EVALUATION_COUNCIL_STRUCTURE, type CouncilFormationConfig } from "../proposals-shared/council-formation.js";
import { normalizeParticipationRole } from "../proposals-shared/proposal-participation.js";
import { isWorkflowVisibleStatus, PROPOSAL_STATUS, PROPOSAL_STATUS_LABELS, REVIEWER_ASSIGNABLE_STATUSES } from "../proposals-shared/proposal-workflow.js";
import {
  assertProposalStatus,
  filterCurrentRoundAssignments,
  assertCurrentCompletenessEvidence,
  assertReviewAssignmentReadScope,
  assertCanFormCouncil,
  findCurrentSubmissionEvidence,
  findEvaluationProposal,
  resolveActorConflict,
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
  systemRole: string | null;
};

const ASSIGNMENT_INCLUDE = {
  reviewer: { select: { displayName: true, username: true, unit: true, status: true } },
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

  async candidates(actor: SafeUserContext, proposalId: string, query: unknown = "", position?: unknown) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const config = await assertCanFormCouncil(this.prisma, actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép phân công đánh giá.");
    if (typeof query !== "string") {
      throw new BadRequestException({ message: "Từ khóa tìm kiếm người đánh giá không hợp lệ." });
    }
    const role = position === undefined || position === "" ? null : normalizeAssignmentRole(position);
    if (position !== undefined && position !== "" && !role) throw new BadRequestException({ message: "Vị trí hội đồng không hợp lệ." });
    const actorConflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (actorConflict.conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: actorConflict.viewerMessage });
    await this.assertCompletenessEvidence(proposal);
    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const roster = filterCurrentRoundAssignments(await this.findAssignments(proposalId), submissionEvidence.eventId);
    if (role && (this.positionFull(roster, role, config) || roster.length >= config.memberCount)) return { users: [] };
    const actedIds = await this.routingActorIds(proposalId, submissionEvidence.eventId);
    const soleHolderIds = await this.routingSoleHolderIds(proposal);
    const search = query.trim().slice(0, 100);
    // ponytail: scans matching accounts for 50 eligible results; paginate if the directory grows large.
    const accounts = await this.prisma.user.findMany({
      where: {
        status: "active",
        // Ứng viên: mọi tài khoản active có lý lịch khoa học, trừ QT và chính người phân công (Story 5.11).
        systemRole: { not: "SYSTEM_ADMIN" },
        researcherProfile: { isNot: null },
        id: { not: actor.id },
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
      if (actedIds.has(account.id) || soleHolderIds.has(account.id)) continue;
      const conflict = await this.participation.evaluateConflict(account.id, proposalId);
      const assigned = await this.findLiveAssignment(proposalId, account.id, submissionEvidence.eventId);
      const managementOfficer = await this.prisma.proposalManagementOfficer.findFirst({
        where: { proposalId, officerUserId: account.id, status: "ACTIVE" },
        select: { id: true }
      });
      if (!conflict.conflicted && !assigned && !managementOfficer) {
        users.push(account);
        if (users.length === 50) break;
      }
    }
    return { users };
  }

  private positionFull(roster: ReviewAssignmentRecord[], role: string, config: CouncilFormationConfig) {
    const required = EVALUATION_COUNCIL_STRUCTURE(config.memberCount) as Record<string, number>;
    return roster.filter((row) => (normalizeAssignmentRole(row.assignmentRole) ?? "reviewer") === role).length >= (required[role] ?? 0);
  }

  /** P6/#7: người đã chuyển, duyệt, ký hoặc trả lại tờ trình hội đồng của vòng này. */
  private async routingActorIds(proposalId: string, roundId: string) {
    const steps = await this.prisma.approvalStep.findMany({
      where: { action: { in: ["FORWARD", "APPROVE", "REJECT", "RETURN"] }, submission: { kind: "EVALUATION_COUNCIL", subjectType: "proposal", subjectId: proposalId, subjectRef: roundId } },
      select: { actorId: true }
    });
    return new Set(steps.map((step) => step.actorId));
  }

  /**
   * P6/#8: ứng viên là người duy nhất không xung đột có thể giữ bước TB, bước TP (trong đơn vị chủ trì) hoặc người ký (GĐ/PGĐ-KH):
   * mời họ sẽ làm tờ trình hội đồng không còn ai xử lý.
   */
  private async routingSoleHolderIds(proposal: EvaluationProposalRecord) {
    const scoped = { organizationScopes: { some: { organizationUnitId: proposal.hostOrganizationUnitId } } };
    const groups = [
      { systemRole: "RESEARCH_BOARD_HEAD", ...scoped },
      { systemRole: "RESEARCH_MANAGEMENT_HEAD", ...scoped },
      { systemRole: { in: ["LEADERSHIP_APPROVAL_AUTHORITY", "SCIENCE_DEPUTY_DIRECTOR"] } }
    ];
    const sole = new Set<string>();
    for (const where of groups) {
      const users = await this.prisma.user.findMany({ where: { status: "active", ...where }, select: { id: true } });
      const free: string[] = [];
      for (const user of users) {
        if (!(await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, user.id, proposal.id)).conflicted) free.push(user.id);
      }
      if (free.length === 1) sole.add(free[0]!);
    }
    return sole;
  }

  async listAssignments(actor: SafeUserContext, proposalId: string) {
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertReviewAssignmentReadScope(this.prisma, actor, proposal);
    if (!isWorkflowVisibleStatus(proposal.status)) throw new ForbiddenException();
    if ((await this.participation.evaluateConflict(actor.id, proposalId)).conflicted) throw new ForbiddenException({ message: "Không được xem dữ liệu phản biện của hồ sơ mình tham gia." });
    const assignments = await this.findCurrentRoundAssignments(proposal);
    // Người được mời (kể cả chưa chấp nhận) không đọc phiếu của người khác.
    const isInvitee = assignments.some((assignment) => assignment.reviewerUserId === actor.id);
    const reviews = isInvitee ? [] : await this.findReviews(proposalId);
    return assignments.map((assignment) => this.toAssignmentResponse(assignment, reviews));
  }

  /**
   * AC-ST-3.2-01. The selected account is rechecked in the mutation
   * transaction before conflict and duplicate checks, so a stale candidate cannot create a grant.
   */
  async assignReviewer(actor: SafeUserContext, proposalId: string, input: Record<string, unknown>): Promise<any> {
    if (!this.transactional) {
      const result = await this.mutate(actor, proposalId, input.contextVersion, (s, a) => s.assignReviewer(a, proposalId, input));
      // A rejection returned (not thrown) commits only its failure audit; throw after that transaction commits.
      if (result instanceof HttpException) throw result;
      return result;
    }
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    const config = await assertCanFormCouncil(this.prisma, actor, proposal);
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Chỉ hồ sơ đã nộp hoặc đang đánh giá mới được phân công người đánh giá.");
    const actorConflict = await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId);
    if (actorConflict.conflicted) {
      throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người đang tham gia hồ sơ không thể phân công người đánh giá." });
    }

    await this.assertCompletenessEvidence(proposal);
    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const assignmentRole = normalizeAssignmentRole(input.assignmentRole);
    if (!assignmentRole) throw new BadRequestException({ code: "INVALID_ASSIGNMENT_ROLE", message: "Chọn vị trí trong hội đồng." });
    const candidate = await this.resolveReviewerCandidate(input, actor.id);
    const dueDate = this.readOptionalDueDate(input.dueDate);
    const effectiveFrom = input.effectiveFrom ? new Date(String(input.effectiveFrom)) : new Date();
    const effectiveUntil = input.effectiveUntil ? new Date(String(input.effectiveUntil)) : null;
    if (!Number.isFinite(effectiveFrom.getTime()) || (effectiveUntil && (!Number.isFinite(effectiveUntil.getTime()) || effectiveUntil <= effectiveFrom || effectiveUntil <= new Date())) || (dueDate && dueDate < effectiveFrom)) throw new BadRequestException({ message: "Thời gian hiệu lực và hạn đánh giá không hợp lệ." });
    const councilRound = submissionEvidence.eventId;
    const reject = async (code: string, message: string, reasonCode?: string) => {
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
          councilRound,
          contextVersion: input.contextVersion,
          effectiveFrom: effectiveFrom.toISOString(),
          effectiveUntil: effectiveUntil?.toISOString() ?? null,
          reasonCode: reasonCode ?? code,
          code,
          reason: message
        })
      });
      return new BadRequestException({ code, message, ...(reasonCode ? { reasonCode } : {}) });
    };

    // 4. PI / thành viên / thư ký đề tài.
    const conflict = await this.participation.evaluateConflict(candidate.id, proposalId);
    if (conflict.conflicted) return reject("CONFLICT_DENIED", `Không thể phân công ${candidate.displayName}: ${conflict.reason}`, conflict.reasonCode);
    // 5. CV phụ trách hồ sơ.
    const managementOfficer = await this.prisma.proposalManagementOfficer.findFirst({
      where: { proposalId, officerUserId: candidate.id, status: "ACTIVE" },
      select: { id: true }
    });
    if (managementOfficer) return reject("CONFLICT_DENIED", "Không thể phân công cán bộ đang phụ trách hồ sơ làm thành viên hội đồng.", "management_officer");

    // 6. Một người một vị trí trong một vòng. Mọi hàng chưa thu hồi đều chặn (kể cả đã gửi phiếu).
    const roster = filterCurrentRoundAssignments(await this.findAssignments(proposalId), councilRound);
    const existing = roster.find((row) => row.reviewerUserId === candidate.id);
    if (existing) {
      return (normalizeAssignmentRole(existing.assignmentRole) ?? "reviewer") === assignmentRole
        ? reject("DUPLICATE_OR_OVERLAPPING_ASSIGNMENT", `${candidate.displayName} đã giữ vị trí này trong hội đồng.`)
        : reject("INCOMPATIBLE_COUNCIL_POSITION", `${candidate.displayName} đã giữ một vị trí khác trong hội đồng.`);
    }
    const staleRound = await this.prisma.proposalReviewAssignment.findFirst({ where: { proposalId, reviewerUserId: candidate.id, status: REVIEW_ASSIGNMENT_STATUS.assigned }, select: { id: true } });
    if (staleRound) return reject("PREVIOUS_ROUND_ASSIGNMENT_ACTIVE", `Còn phân công vòng trước của ${candidate.displayName} chưa thu hồi.`);
    // 7. Đã xử lý tờ trình hội đồng của vòng này.
    if ((await this.routingActorIds(proposalId, councilRound)).has(candidate.id)) {
      return reject("ROUTING_ACTOR_CONFLICT", `${candidate.displayName} đã xử lý tờ trình thành lập hội đồng của vòng này.`);
    }
    // 8. Người giữ bước bắt buộc duy nhất.
    if ((await this.routingSoleHolderIds(proposal)).has(candidate.id)) {
      return reject("ROUTING_ACTOR_UNAVAILABLE", `${candidate.displayName} là người duy nhất xử lý một bước của tờ trình hội đồng nên không thể làm thành viên.`);
    }
    // 11 (kiểm trước 9/10: hội đồng đủ người mới trình ký được, nên khi đang trình thì lỗi đúng là "đang trình").
    await this.assertNoPendingCouncil(proposalId, councilRound);
    await this.assertSummaryOpen(proposalId);
    // 9, 10. Cơ cấu và số lượng.
    if (this.positionFull(roster, assignmentRole, config)) return reject("COUNCIL_POSITION_FULL", "Vị trí này đã đủ người theo cơ cấu hội đồng.");
    if (roster.length >= config.memberCount) return reject("COUNCIL_SIZE_EXCEEDED", `Hội đồng đã đủ ${config.memberCount} thành viên.`);

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
            invitationStatus: "invited",
            assignedById: actor.id,
            assignedAt,
            effectiveFrom,
            effectiveUntil,
            dueDate,
            reviewedSubmissionEventId: councilRound
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
              note: "Người có quyền thành lập hội đồng mở vòng đánh giá và mời thành viên"
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
              councilRound,
              invitationStatus: "invited",
              contextVersion: input.contextVersion,
              effectiveFrom: effectiveFrom.toISOString(),
              effectiveUntil: effectiveUntil?.toISOString() ?? null,
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
    const proposal = await findEvaluationProposal(this.prisma, proposalId);
    await assertCanFormCouncil(this.prisma, actor, proposal);
    if ((await resolveActorConflict({ participation: this.participation, reviewAccess: this.reviewAccess }, actor.id, proposalId)).conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia không được thay đổi phân công." });
    assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép thay đổi phân công đánh giá.");
    await this.assertCompletenessEvidence(proposal);
    const assignment = await this.findAssignmentById(proposalId, assignmentId);
    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    await this.assertNoPendingCouncil(proposalId, submissionEvidence.eventId);
    await this.assertSummaryOpen(proposalId);
    if (assignment.reviewedSubmissionEventId && assignment.reviewedSubmissionEventId !== submissionEvidence.eventId) {
      throw new BadRequestException({ code: "STALE_ASSIGNMENT_CONTEXT", message: "Phân công thuộc phiên bản nộp cũ của hồ sơ." });
    }
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
            assignmentRole: normalizeAssignmentRole(assignment.assignmentRole) ?? "reviewer",
            councilRound: submissionEvidence.eventId,
            contextVersion: input.contextVersion,
            effectiveFrom: (assignment.effectiveFrom ?? assignment.assignedAt).toISOString(),
            effectiveUntil: revokedAt.toISOString(),
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
    const asOf = new Date();
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
            hostOrganizationUnitId: true,
            updatedAt: true,
            authorizationRelationshipVersion: true,
            authorizationConflictVersion: true,
            authorizationDelegationVersion: true
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

    const visible: typeof assignments = [];
    const preview: typeof assignments = [];
    for (const assignment of assignments) {
      const proposal = assignment.proposal as EvaluationProposalRecord;
      let currentSubmissionEventId = "";
      try {
        currentSubmissionEventId = (await findCurrentSubmissionEvidence(this.prisma, proposal)).eventId;
      } catch {
        continue;
      }
      if (assignment.reviewedSubmissionEventId !== currentSubmissionEventId) continue;
      if (!isWorkflowVisibleStatus(assignment.proposal?.status ?? "") || (await this.participation.evaluateConflict(actor.id, assignment.proposalId)).conflicted) continue;
      if (!grantsReviewAccess(assignment)) {
        preview.push(assignment);
        continue;
      }
      const access = await this.reviewAccess.resolveForProposal(actor.id, assignment.proposalId, asOf);
      if (access.isAssignedReviewer && access.assignmentId === assignment.id) visible.push(assignment);
    }
    // Trước khi chấp nhận và trước khi BGĐ ký hội đồng: chỉ tên hồ sơ, vai trò, hạn và người mời (Story 5.11).
    const previews = preview.map((assignment) => ({
      id: assignment.id,
      proposalId: assignment.proposalId,
      access: "preview" as const,
      assignmentRole: normalizeAssignmentRole(assignment.assignmentRole) ?? "reviewer",
      assignmentRoleLabel: getAssignmentRoleLabel(assignment.assignmentRole),
      invitationStatus: assignment.invitationStatus ?? "accepted",
      invitationStatusLabel: INVITATION_STATUS_LABELS[assignment.invitationStatus ?? "accepted"] ?? "",
      dueDate: assignment.dueDate?.toISOString() ?? "",
      assignedByDisplayName: assignment.assignedBy?.displayName ?? "",
      proposal: { title: assignment.proposal?.title ?? "" }
    }));
    const granted = visible.map((assignment) => {
      const review = reviews.find((item) => item.assignmentId === assignment.id);
      return {
        id: assignment.id,
        proposalId: assignment.proposalId,
        access: "granted" as const,
        invitationStatus: "accepted",
        assignmentRole: normalizeAssignmentRole(assignment.assignmentRole) ?? "reviewer",
        assignmentRoleLabel: getAssignmentRoleLabel(assignment.assignmentRole),
        scoring: isScoringRole(assignment.assignmentRole),
        status: assignment.status,
        statusLabel: REVIEW_ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
        effectiveFrom: (assignment.effectiveFrom ?? assignment.assignedAt).toISOString(),
        effectiveUntil: assignment.effectiveUntil?.toISOString() ?? "",
        dueDate: assignment.dueDate?.toISOString() ?? "",
        completedAt: assignment.completedAt?.toISOString() ?? "",
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
    return [...previews, ...granted];
  }

  /**
   * Story 5.11. Người được mời chấp nhận hoặc từ chối (từ chối bắt buộc lý do). Người mời không có
   * contextVersion nên không dùng context của hồ sơ; cập nhật có điều kiện trên hàng còn `invited`
   * dưới khóa hồ sơ, nên không thắng cuộc đua với thu hồi hoặc ký hội đồng.
   */
  async respondToInvitation(actor: SafeUserContext, proposalId: string, assignmentId: string, input: Record<string, unknown> = {}) {
    if (input.decision !== "accept" && input.decision !== "decline") throw new BadRequestException({ message: "Chọn chấp nhận hoặc từ chối lời mời." });
    const accepting = input.decision === "accept";
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 2000) : "";
    if (!accepting && !reason) throw new BadRequestException({ code: "DECLINE_REASON_REQUIRED", message: "Nhập lý do từ chối lời mời." });

    const updated = await this.prisma.$transaction(async (client) => {
      const tx = client as unknown as PrismaService;
      await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
      const proposal = await findEvaluationProposal(tx, proposalId);
      assertProposalStatus(proposal, REVIEWER_ASSIGNABLE_STATUSES, "Hồ sơ không ở trạng thái cho phép trả lời lời mời.");
      const assignment = (await tx.proposalReviewAssignment.findUnique({ where: { id: assignmentId }, include: ASSIGNMENT_INCLUDE })) as ReviewAssignmentRecord | null;
      // Người khác nhận NotFound như hàng không tồn tại: không lộ ai được mời.
      if (!assignment || assignment.proposalId !== proposalId || assignment.reviewerUserId !== actor.id) throw new NotFoundException({ message: "Không tìm thấy lời mời." });
      const evidence = await findCurrentSubmissionEvidence(tx, proposal);
      if (assignment.reviewedSubmissionEventId !== evidence.eventId) throw new BadRequestException({ code: "STALE_ASSIGNMENT_CONTEXT", message: "Lời mời thuộc phiên bản nộp cũ của hồ sơ." });
      if (assignment.status !== REVIEW_ASSIGNMENT_STATUS.assigned || (assignment.invitationStatus ?? "accepted") !== "invited") {
        throw new BadRequestException({ code: "INVITATION_NOT_PENDING", message: "Lời mời đã được trả lời hoặc không còn hiệu lực." });
      }
      if ((await new ProposalParticipationService(tx).evaluateConflict(actor.id, proposalId)).conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia hồ sơ không thể nhận lời mời đánh giá." });
      const respondedAt = await readTransactionClockV1(tx);
      const invitationStatus = accepting ? "accepted" : "declined";
      const moved = await tx.proposalReviewAssignment.updateMany({
        where: { id: assignmentId, status: REVIEW_ASSIGNMENT_STATUS.assigned, invitationStatus: "invited" },
        data: { invitationStatus, respondedAt, declineReason: accepting ? null : reason } as never
      });
      if (moved.count !== 1) throw new BadRequestException({ code: "INVITATION_NOT_PENDING", message: "Lời mời đã được trả lời hoặc không còn hiệu lực." });
      await tx.researchProposal.update({
        where: { id: proposalId },
        data: { authorizationRelationshipVersion: { increment: 1 }, authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: respondedAt } as never
      });
      await tx.auditLog.create({
        data: {
          action: accepting ? "accept-review-invitation" : "decline-review-invitation",
          result: "success",
          actorId: actor.id,
          targetEntity: "proposal-review-assignment",
          targetEntityId: assignmentId,
          username: actor.username,
          reason: JSON.stringify({ proposalId, assignmentRole: normalizeAssignmentRole(assignment.assignmentRole) ?? "reviewer", fromInvitationStatus: "invited", toInvitationStatus: invitationStatus, reason: accepting ? null : reason })
        }
      });
      return { id: assignmentId, proposalId, invitationStatus, respondedAt };
    });
    return { id: updated.id, proposalId: updated.proposalId, invitationStatus: updated.invitationStatus, invitationStatusLabel: INVITATION_STATUS_LABELS[updated.invitationStatus], respondedAt: updated.respondedAt.toISOString() };
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
    const submissionEvidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const assignment = await this.findAssignmentById(proposalId, access.assignmentId ?? "");
    const now = new Date();
    if (
      assignment.reviewedSubmissionEventId !== submissionEvidence.eventId ||
      ![REVIEW_ASSIGNMENT_STATUS.assigned, REVIEW_ASSIGNMENT_STATUS.completed].includes(assignment.status as never) ||
      assignment.effectiveFrom > now ||
      (assignment.effectiveUntil && assignment.effectiveUntil <= now)
    ) {
      throw new ForbiddenException({ code: "STALE_ASSIGNMENT_CONTEXT", message: "Phân công không còn gắn với phiên bản nộp hiện tại của hồ sơ." });
    }
    assertProposalStatus(proposal, ["submitted", "resubmitted", "under_review", "ready_for_approval", "approved", "rejected"], "Hồ sơ không ở trạng thái cho phép xem gói đánh giá.");

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
      scoring: isScoringRole(access.assignmentRole),
      assignmentRoleLabel: getAssignmentRoleLabel(access.assignmentRole),
      contextVersion: submissionEvidence.contextVersion,
      submissionEvidence: {
        eventId: submissionEvidence.eventId,
        submittedAt: submissionEvidence.submittedAt.toISOString(),
        submissionVersion: submissionEvidence.submissionVersion
      },
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

  async findCurrentRoundAssignments(proposal: EvaluationProposalRecord) {
    const evidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const assignments = await this.findAssignments(proposal.id);
    return filterCurrentRoundAssignments(assignments, evidence.eventId);
  }

  async findCurrentRoundReviews(proposal: EvaluationProposalRecord) {
    const evidence = await findCurrentSubmissionEvidence(this.prisma, proposal);
    const assignments = await this.findCurrentRoundAssignments(proposal);
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    const reviews = await this.findReviews(proposal.id);
    return reviews.filter((review) => assignmentIds.has(review.assignmentId) && review.submissionEventId === evidence.eventId);
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
      assignmentRole: normalizeAssignmentRole(assignment.assignmentRole) ?? "reviewer",
      assignmentRoleLabel: getAssignmentRoleLabel(assignment.assignmentRole),
      scoring: isScoringRole(assignment.assignmentRole),
      status: assignment.status,
      statusLabel: REVIEW_ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status,
      invitationStatus: assignment.invitationStatus ?? "accepted",
      invitationStatusLabel: INVITATION_STATUS_LABELS[assignment.invitationStatus ?? "accepted"] ?? "",
      respondedAt: assignment.respondedAt?.toISOString() ?? "",
      declineReason: assignment.declineReason ?? "",
      councilEstablishedAt: assignment.councilEstablishedAt?.toISOString() ?? "",
      assignedById: assignment.assignedById,
      assignedByDisplayName: assignment.assignedBy?.displayName ?? "",
      assignedAt: assignment.assignedAt.toISOString(),
      effectiveFrom: (assignment.effectiveFrom ?? assignment.assignedAt).toISOString(),
      effectiveUntil: assignment.effectiveUntil?.toISOString() ?? "",
      dueDate: assignment.dueDate?.toISOString() ?? "",
      revokedAt: assignment.revokedAt?.toISOString() ?? "",
      completedAt: assignment.completedAt?.toISOString() ?? "",
      isOverdue: Boolean(assignment.dueDate && assignment.dueDate < new Date() && review?.status !== REVIEW_STATUS.submitted && ["assigned", "completed"].includes(assignment.status)),
      reviewStatus: review?.status ?? "",
      reviewSubmittedAt: review?.submittedAt?.toISOString() ?? "",
      reviewTotalScore: review?.status === REVIEW_STATUS.submitted ? (review.totalScore ?? null) : null,
      reviewRecommendation: review?.status === REVIEW_STATUS.submitted ? (review.recommendation ?? "") : "",
      reviewRecommendationLabel: review?.status === REVIEW_STATUS.submitted ? getRecommendationLabel(review.recommendation) : ""
    };
  }

  /** Any assignment that still counts — i.e. anything not revoked. */
  async findLiveAssignment(proposalId: string, reviewerUserId: string, reviewedSubmissionEventId?: string) {
    const assignments = (await this.prisma.proposalReviewAssignment.findMany({
      where: {
        proposalId,
        reviewerUserId,
        ...(reviewedSubmissionEventId ? { reviewedSubmissionEventId } : {}),
        status: {
          in: [REVIEW_ASSIGNMENT_STATUS.assigned, REVIEW_ASSIGNMENT_STATUS.completed]
        }
      }
    })) as ReviewAssignmentRecord[];
    const asOf = new Date();
    return assignments.find((assignment) =>
      (!assignment.effectiveFrom || assignment.effectiveFrom <= asOf) &&
      (!assignment.effectiveUntil || assignment.effectiveUntil > asOf)
    ) ?? null;
  }

  /**
   * The proposal lock serializes the duplicate check and write. The partial unique index is a
   * second persistence guard; translate its violation into the same safe domain error.
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

  /** Danh sách đang trình BGĐ ký thì không đổi: bản ký phải đúng bản đã duyệt. Tờ trình gắn theo vòng. */
  private async assertNoPendingCouncil(proposalId: string, roundId: string) {
    const pending = await this.prisma.approvalSubmission.findFirst({ where: { kind: "EVALUATION_COUNCIL", subjectType: "proposal", subjectId: proposalId, subjectRef: roundId, status: "PENDING" }, select: { id: true } });
    if (pending) throw new BadRequestException({ code: "COUNCIL_SUBMISSION_PENDING", message: "Đang có tờ trình hội đồng chờ duyệt. Trả lại tờ trình trước khi đổi danh sách." });
  }

  /** P8: chỉ được mời/thu hồi khi tổng hợp chưa chốt. */
  private async assertSummaryOpen(proposalId: string) {
    const summary = await this.prisma.proposalEvaluationSummary.findFirst({ where: { proposalId }, select: { status: true } });
    if (summary && summary.status !== "draft") throw new BadRequestException({ code: "EVALUATION_SUMMARY_FINALIZED", message: "Bản tổng hợp đã chốt, không thể đổi danh sách hội đồng." });
  }

  private async assertCompletenessEvidence(proposal: EvaluationProposalRecord) {
    await assertCurrentCompletenessEvidence(this.prisma, proposal);
  }

  private async resolveReviewerCandidate(input: Record<string, unknown>, actorId: string): Promise<ReviewerCandidate> {
    if (Object.prototype.hasOwnProperty.call(input, "researcherProfileId") || Object.prototype.hasOwnProperty.call(input, "reviewerUsername")) {
      throw new BadRequestException({ message: "Chọn người đánh giá bằng tài khoản." });
    }
    const reviewerUserId = typeof input.reviewerUserId === "string" ? input.reviewerUserId.trim() : "";
    if (!reviewerUserId || reviewerUserId.length > 80) {
      throw new BadRequestException({ message: "Chọn tài khoản người đánh giá." });
    }
    if (reviewerUserId === actorId) {
      throw new BadRequestException({ code: "SELF_ASSIGNMENT_DENIED", message: "Không thể tự phân công chính mình làm người đánh giá." });
    }
    await this.prisma.$queryRaw`SELECT id FROM users WHERE id = ${reviewerUserId} FOR SHARE`;
    const account = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { id: true, username: true, displayName: true, status: true, unit: true, systemRole: true, researcherProfile: { select: { id: true } } }
    });
    if (!account || account.status !== "active") {
      throw new BadRequestException({ code: "CANDIDATE_NOT_ELIGIBLE", message: "Tài khoản không hoạt động hoặc không tồn tại." });
    }
    if (account.systemRole === "SYSTEM_ADMIN" || !account.researcherProfile) {
      throw new BadRequestException({ code: "CANDIDATE_NOT_ELIGIBLE", message: "Chỉ mời được tài khoản đang hoạt động có lý lịch khoa học (không gồm Quản trị hệ thống)." });
    }
    const { researcherProfile, ...user } = account;
    return { ...user, researcherProfileId: researcherProfile.id };
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
