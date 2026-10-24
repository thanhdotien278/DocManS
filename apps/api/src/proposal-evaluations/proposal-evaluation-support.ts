import { REVIEW_ASSIGNMENT_ROLE_LABELS, REVIEW_ASSIGNMENT_STATUS, REVIEW_STATUS, REVIEW_MAX_TOTAL_SCORE, isScoringRole, normalizeAssignmentRole, type ReviewAssignmentRole } from "../proposals-shared/proposal-review-access.js";
import { EVALUATION_COUNCIL_STRUCTURE, canFormCouncil, readCouncilFormationConfig, type CouncilFormationConfig } from "../proposals-shared/council-formation.js";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertHasOrganizationScope, isLeadership, isResearchBoardHead, isScienceDeputyDirector, isResearchManagementDeputyHead, isResearchOversightAuthority, isResearchManagementHead, isResearchManagementStaff } from "../proposals-shared/proposal-access.js";
import type { ProposalConflictDecision } from "../proposals-shared/proposal-participation.js";
import { isWorkflowVisibleStatus, PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import { proposalContextVersion } from "../proposals-shared/proposal-mutation.js";

/** The proposal fields every EP-03 evaluation operation needs. */
export type EvaluationProposalRecord = {
  id: string;
  code: string | null;
  title: string;
  ownerId: string;
  hostOrganizationUnitId: string;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorizationRelationshipVersion: number;
  authorizationConflictVersion: number;
  authorizationDelegationVersion: number;
};

export type ReviewAssignmentRecord = {
  id: string;
  proposalId: string;
  reviewerUserId: string;
  researcherProfileId: string | null;
  assignmentRole: string;
  status: string;
  assignedById: string;
  assignedAt: Date;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  dueDate: Date | null;
  revokedAt: Date | null;
  completedAt: Date | null;
  reviewedSubmissionEventId: string | null;
  invitationStatus?: string;
  respondedAt?: Date | null;
  declineReason?: string | null;
  councilEstablishedAt?: Date | null;
  reviewer?: { displayName: string; username: string | null; unit: string; status?: string } | null;
  assignedBy?: { displayName: string } | null;
};

/** The same effective roster is used for progress and frozen package evidence. */
export function filterCurrentRoundAssignments(assignments: ReviewAssignmentRecord[], submissionEventId: string, asOf = new Date()) {
  return assignments.filter((assignment) => assignment.reviewedSubmissionEventId === submissionEventId &&
    ["assigned", "completed"].includes(assignment.status) &&
    (!assignment.effectiveFrom || assignment.effectiveFrom <= asOf) &&
    (!assignment.effectiveUntil || assignment.effectiveUntil > asOf) &&
    assignment.reviewer?.status === "active");
}

export type ProposalReviewRecord = {
  id: string;
  proposalId: string;
  assignmentId: string;
  reviewerUserId: string;
  status: string;
  scoreData: unknown;
  totalScore: number | null;
  comment: string | null;
  recommendation: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submissionEventId: string | null;
  contextVersion: unknown;
  evidenceSnapshot: unknown;
  reviewer?: { displayName: string } | null;
};

export type EvaluationSummaryRecord = {
  id: string;
  proposalId: string;
  summary: string;
  recommendation: string;
  status: string;
  createdById: string;
  updatedById: string;
  markedReadyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
  contextVersion: unknown;
  evidenceSnapshot: unknown;
  updatedBy?: { displayName: string } | null;
};

export type ProposalDecisionRecord = {
  id: string;
  proposalId: string;
  decision: string;
  note: string | null;
  decidedById: string;
  decidedAt: Date;
  fromStatus: string;
  toStatus: string;
  packageRevision: number | null;
  contextVersion: unknown;
  packageSnapshot: unknown;
  publicSummary: unknown;
  decidedBy?: { displayName: string } | null;
};

export type ProposalSubmissionEvidence = {
  eventId: string;
  submittedAt: Date;
  submissionVersion: string;
  contextVersion: ReturnType<typeof proposalContextVersion>;
  snapshot: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function findEvaluationProposal(prisma: PrismaService, proposalId: string) {
  const proposal = (await prisma.researchProposal.findUnique({
    where: { id: proposalId }
  })) as EvaluationProposalRecord | null;

  if (!proposal) {
    throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
  }

  return proposal;
}

/**
 * Resolves the immutable submission event that the current evaluation round is reviewing. A round
 * without a persisted submission event is not safe to evaluate: callers must fail closed instead
 * of guessing which attachment/member snapshot a review referred to.
 */
export async function findCurrentSubmissionEvidence(prisma: Pick<PrismaService, "proposalSubmissionEvent">, proposal: EvaluationProposalRecord): Promise<ProposalSubmissionEvidence> {
  if (!proposal.submittedAt) {
    throw new BadRequestException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được lần nộp hiện tại." });
  }

  const events = await prisma.proposalSubmissionEvent.findMany({
    where: { proposalId: proposal.id, toStatus: { in: ["submitted", "resubmitted"] }, submittedAt: { gte: proposal.submittedAt } },
    orderBy: { submittedAt: "desc" },
    select: { id: true, submittedAt: true, snapshot: true }
  });
  // Completeness checks retain the submitted status, but are not submission snapshots.
  const event = events.find((candidate) => isRecord(candidate.snapshot) && !candidate.snapshot.kind &&
    Array.isArray(candidate.snapshot.members) && Array.isArray(candidate.snapshot.attachments) &&
    Array.isArray(candidate.snapshot.requiredPackage));
  if (!event) {
    throw new BadRequestException({ code: "CONTEXT_UNRESOLVED", message: "Không xác định được bằng chứng lần nộp hiện tại." });
  }
  if (!isRecord(event.snapshot) || !Array.isArray(event.snapshot.members) || !Array.isArray(event.snapshot.attachments) || !Array.isArray(event.snapshot.requiredPackage)) {
    throw new BadRequestException({ code: "CONTEXT_UNRESOLVED", message: "Bằng chứng lần nộp hiện tại không hợp lệ." });
  }

  return {
    eventId: event.id,
    submittedAt: event.submittedAt,
    submissionVersion: event.id,
    contextVersion: proposalContextVersion(proposal),
    snapshot: event.snapshot
  };
}

/** Every protected evaluation mutation must be tied to a successful completeness check for the
 * exact submission event it is about to consume. A check from an earlier resubmission is never
 * sufficient, even when the proposal status is otherwise eligible. */
export async function assertCurrentCompletenessEvidence(
  prisma: Pick<PrismaService, "proposalSubmissionEvent">,
  proposal: EvaluationProposalRecord
) {
  const submissionEvidence = await findCurrentSubmissionEvidence(prisma, proposal);
  const checks = await prisma.proposalSubmissionEvent.findMany({
    where: {
      proposalId: proposal.id,
      submittedAt: { gte: submissionEvidence.submittedAt },
      snapshot: { path: ["kind"], equals: "completeness_check" }
    },
    select: { snapshot: true }
  });
  const valid = checks.some((event) => {
    const snapshot = event.snapshot as { readiness?: { ready?: unknown }; submissionEventId?: unknown } | null;
    return snapshot?.submissionEventId === submissionEvidence.eventId && snapshot?.readiness?.ready === true;
  });
  if (!valid) {
    throw new BadRequestException({ message: "Cần xác nhận hồ sơ đầy đủ cho đúng phiên bản hiện tại trước khi tiếp tục vòng đánh giá." });
  }
  return submissionEvidence;
}

/**
 * Staff authority for EP-03 operations. Scientific management is scoped to the units it operates,
 * so an in-scope check runs on every consolidation and assignment action (AC-ST-3.2-01,
 * AC-ST-3.4-03) rather than only on the first one.
 */
export async function assertScientificManagementScope(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  if (!actor || !isResearchManagementStaff(actor)) {
    throw new ForbiddenException({ message: "Chỉ chuyên viên quản lý khoa học được phân công cho hồ sơ mới được thực hiện thao tác này." });
  }

  assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
  const current = await prisma.proposalManagementOfficer.findFirst({
    where: {
      proposalId: proposal.id,
      officerUserId: actor.id,
      status: "ACTIVE",
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }]
    },
    select: { id: true }
  });
  if (!current) {
    throw new ForbiddenException({ message: "Bạn không còn là chuyên viên phụ trách hồ sơ này." });
  }
  const conflict = await resolveActorConflict({ participation: new ProposalParticipationService(prisma), reviewAccess: new ProposalReviewAccessService(prisma) }, actor.id, proposal.id);
  if (conflict.conflicted) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: conflict.viewerMessage });
  return actor;
}

/**
 * Read access to the evaluation surfaces (assignment roster, review progress, submitted reviews).
 *
 * Staff read inside their organization scope only — the read side has to be scoped as tightly as
 * the write side, or out-of-scope staff could read every reviewer's name and score for a unit they
 * do not operate. Leadership reads require an explicit organization scope. Section 7.4 of the permission matrix gives the system administrator `None` for
 * these actions, so an admin role is not accepted here.
 */
export function assertScientificManagementHeadScope(actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  if (!actor || !isResearchManagementHead(actor)) {
    throw new ForbiddenException({ message: "Chỉ Trưởng phòng quản lý khoa học được thực hiện nghiệp vụ phân công và tổng hợp hồ sơ." });
  }
  assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
  return actor;
}

/**
 * Quyền ghi tổng hợp/chốt/lập tờ trình gói đánh giá: TP¹/TB¹ trong unit scope, CV³ là cán bộ phụ trách hiện hành;
 * TP/TB/CV đều không được xung đột (CV kiểm tra ở đây, TP/TB ở từng thao tác). PP, BGĐ, QT và CV không phụ trách bị từ chối.
 */
export async function assertProposalManagementWriteScope(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  if (actor && (isResearchManagementHead(actor) || isResearchBoardHead(actor))) {
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    return actor; // xung đột do từng thao tác tổng hợp kiểm tra tiếp bằng resolver đã tiêm
  }
  if (actor && isResearchManagementStaff(actor)) return assertScientificManagementScope(prisma, actor, proposal);
  throw new ForbiddenException({ message: "Chỉ Trưởng phòng, Trưởng ban hoặc Chuyên viên phụ trách hồ sơ mới được tổng hợp và lập tờ trình." });
}

/** Assignment rosters are operational reads for scoped Head/Board Head and assigned Staff. */
export async function assertReviewAssignmentReadScope(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  if (isResearchManagementHead(actor)) return assertScientificManagementHeadScope(actor, proposal);
  if (actor && isResearchBoardHead(actor)) {
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    return actor;
  }
  if (isResearchManagementStaff(actor)) return assertScientificManagementScope(prisma, actor, proposal);
  throw new ForbiddenException({ message: "Không có quyền xem phân công đánh giá của hồ sơ này." });
}

/** Shared read gate for evaluation progress. Staff require the active officer relationship;
 * Head, Deputy and Director require an explicit organization scope. */
export async function assertEvaluationReadScope(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  if (!actor) throw new ForbiddenException({ message: "Không có quyền xem thông tin đánh giá của hồ sơ này." });
  if (isLeadership(actor) || isResearchManagementHead(actor) || isResearchBoardHead(actor) || isResearchOversightAuthority(actor) || isScienceDeputyDirector(actor) || isResearchManagementDeputyHead(actor)) {
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    return actor;
  }
  if (isResearchManagementStaff(actor)) {
    await assertScientificManagementScope(prisma, actor, proposal);
    return actor;
  }
  throw new ForbiddenException({ message: "Không có quyền xem thông tin đánh giá của hồ sơ này." });
}

export async function assertCanReadEvaluation(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  // A draft has no evaluation to read, and `canReadProposal` keeps drafts private to their owner.
  // Gating here too stops the evaluation read models from becoming a side channel that reports a
  // draft's existence and attachment count to a viewer the proposal read itself would refuse.
  if (!isWorkflowVisibleStatus(proposal.status)) {
    throw new ForbiddenException({ message: "Không có quyền xem thông tin đánh giá của hồ sơ này." });
  }

  return assertEvaluationReadScope(prisma, actor, proposal);
}

type ConflictResolvers = {
  participation: { evaluateConflict(userId: string | undefined | null, proposalId: string): Promise<ProposalConflictDecision> };
  reviewAccess: {
    resolveForProposal(userId: string | undefined, proposalId: string): Promise<{ isAssignedReviewer: boolean }>;
    resolveConflictForProposal?(userId: string | undefined, proposalId: string): Promise<{ isAssignedReviewer: boolean; hasPersistedReview: boolean; unresolved: boolean }>;
  };
};

const REVIEWER_CONFLICT: ProposalConflictDecision = {
  conflicted: true,
  role: "unknown",
  reasonCode: "participation",
  reason: "Người dùng được phân công đánh giá hồ sơ này.",
  viewerMessage: "Bạn được phân công đánh giá hồ sơ này nên không thể tự quyết định hoặc tổng hợp kết quả."
};

const UNRESOLVED_CONFLICT: ProposalConflictDecision = {
  conflicted: true,
  role: "unknown",
  reasonCode: "unresolved",
  reason: "Không xác định được lịch sử phản biện của người dùng với hồ sơ này.",
  viewerMessage: "Không xác định được lịch sử phản biện của bạn nên thao tác bị chặn để bảo đảm an toàn."
};

/**
 * The conflict rule shared by the approval decision (ST-3.5) and staff consolidation (ST-3.4).
 *
 * It is the ST-3.0 participation primitive plus a reviewer assignment on the same proposal: someone
 * who scored the proposal must not then be the one who consolidates or decides on their own review.
 */
export async function resolveActorConflict(
  resolvers: ConflictResolvers,
  actorId: string | undefined,
  proposalId: string
): Promise<ProposalConflictDecision> {
  const participationConflict = await resolvers.participation.evaluateConflict(actorId, proposalId);
  if (participationConflict.conflicted) {
    return participationConflict;
  }

  const access = resolvers.reviewAccess.resolveConflictForProposal
    ? await resolvers.reviewAccess.resolveConflictForProposal(actorId, proposalId)
    : { isAssignedReviewer: false, hasPersistedReview: false, unresolved: true };
  if (access.unresolved) return UNRESOLVED_CONFLICT;
  return access.isAssignedReviewer || access.hasPersistedReview ? REVIEWER_CONFLICT : participationConflict;
}

/**
 * Approval authority for ST-3.5. A system administrator role alone does not imply business
 * approval authority — the permission matrix states that explicitly, so it is not accepted here.
 */
export function assertApprovalAuthority(actor: SafeUserContext | undefined) {
  if (!actor || !isLeadership(actor)) {
    throw new ForbiddenException({ message: "Chỉ lãnh đạo có thẩm quyền mới được quyết định phê duyệt hồ sơ." });
  }

  return actor;
}

type StatusUpdateClient = {
  researchProposal: { updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }> };
};

/**
 * Optimistic-concurrency guard for a workflow transition.
 *
 * Every EP-03 operation reads the proposal, validates against the status it read, then writes. Two
 * requests interleaving between the read and the write would both pass validation — which is how a
 * proposal could be approved and rejected at once, or receive its "opened the round" transition
 * twice. Making the write conditional on the status still being `fromStatus` means the second
 * writer updates zero rows and its whole transaction is rolled back.
 */
export async function updateProposalStatusGuarded(
  tx: StatusUpdateClient,
  proposalId: string,
  fromStatus: string,
  toStatus: string
) {
  const result = await tx.researchProposal.updateMany({
    where: { id: proposalId, status: fromStatus },
    data: { status: toStatus }
  });

  if (result.count === 0) {
    throw new BadRequestException({ message: "Trạng thái hồ sơ vừa thay đổi. Tải lại hồ sơ và thử lại." });
  }
}

export function assertProposalStatus(proposal: EvaluationProposalRecord, allowed: readonly string[], message: string) {
  if (!allowed.includes(proposal.status)) {
    throw new BadRequestException({
      message,
      currentStatus: proposal.status,
      currentStatusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status
    });
  }
}

/** Hội đồng đã thành lập: có thành viên và mọi thành viên có `councilEstablishedAt` (thiếu trường coi là đã thành lập, như `grantsReviewAccess`). */
export function isCouncilEstablished(roster: Array<Pick<ReviewAssignmentRecord, "councilEstablishedAt">>) {
  return roster.length > 0 && roster.every((row) => row.councilEstablishedAt !== null);
}

/** Chặn lập tờ trình và chặn ký (spec §7.4): cấu trúc §5, rồi lời mời chưa nhận/đã từ chối. */
export function councilRosterBlockers(roster: ReviewAssignmentRecord[], memberCount: number) {
  const required = EVALUATION_COUNCIL_STRUCTURE(memberCount);
  const blockers: string[] = [];
  for (const position of Object.keys(required) as ReviewAssignmentRole[]) {
    const current = roster.filter((row) => (normalizeAssignmentRole(row.assignmentRole) ?? "reviewer") === position).length;
    if (current !== required[position]) blockers.push(`Cần ${required[position]} ${REVIEW_ASSIGNMENT_ROLE_LABELS[position]} (hiện ${current}).`);
  }
  const invited = roster.filter((row) => (row.invitationStatus ?? "accepted") === "invited").length;
  const declined = roster.filter((row) => row.invitationStatus === "declined").length;
  if (invited) blockers.push(`${invited} thành viên chưa chấp nhận lời mời.`);
  if (declined) blockers.push(`${declined} thành viên đã từ chối: thu hồi và mời người khác.`);
  return blockers;
}

/**
 * Tiến độ phiếu: chỉ thành viên chấm (không gồm thư ký) tính vào pending/submitted/average. Sẵn sàng tổng hợp (§7.4):
 * hội đồng đã thành lập và mọi thành viên chấm đã gửi phiếu. Cấu trúc/số lượng chỉ kiểm khi lập tờ trình và ký.
 */
export function summarizeReviewProgress(assignments: ReviewAssignmentRecord[], reviews: ProposalReviewRecord[]) {
  const active = assignments.filter((assignment) => assignment.status === REVIEW_ASSIGNMENT_STATUS.assigned || assignment.status === REVIEW_ASSIGNMENT_STATUS.completed);
  const scoring = active.filter((assignment) => isScoringRole(assignment.assignmentRole));
  const countRole = (role: string) => new Set(active.filter((assignment) => assignment.assignmentRole === role).map((assignment) => assignment.reviewerUserId)).size;
  const reviewerCount = countRole("reviewer");
  const committeeMemberCount = countRole("committee_member");
  const established = isCouncilEstablished(active);
  const assignmentRequirementsMet = established && scoring.length > 0 && new Set(active.map((assignment) => assignment.reviewerUserId)).size === active.length;
  const scoringIds = new Set(scoring.map((assignment) => assignment.id));
  const submitted = reviews.filter((review) => review.status === REVIEW_STATUS.submitted && scoringIds.has(review.assignmentId));
  const submittedAssignmentIds = new Set(submitted.map((review) => review.assignmentId));
  const pending = scoring.filter((assignment) => !submittedAssignmentIds.has(assignment.id));
  const scored = submitted.map((review) => review.totalScore).filter((score): score is number => typeof score === "number");

  return {
    activeAssignmentCount: active.length,
    scoringMemberCount: scoring.length,
    secretaryAssigned: active.some((assignment) => !isScoringRole(assignment.assignmentRole)),
    reviewerCount,
    committeeMemberCount,
    assignmentRequirementsMet,
    submittedCount: submitted.length,
    pendingCount: pending.length,
    overdueCount: pending.filter((assignment) => assignment.dueDate && assignment.dueDate < new Date()).length,
    readinessReasons: [
      ...(!established ? ["Hội đồng chưa được thành lập."] : []),
      ...(pending.length ? [`Còn ${pending.length} phiếu chưa gửi.`] : [])
    ],
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

/**
 * Quyền (a) thành lập hội đồng/mời/thu hồi theo cấu hình Admin (D-035). Một chỗ gọi `canFormCouncil` cho mọi route;
 * CV chỉ được khi đang là cán bộ phụ trách hiện hành.
 */
export async function resolveCouncilFormationPermission(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord) {
  const config = await readCouncilFormationConfig(prisma, "EVALUATION");
  const now = new Date();
  const isActiveOfficer = Boolean(actor && isResearchManagementStaff(actor) && await prisma.proposalManagementOfficer.findFirst({
    where: { proposalId: proposal.id, officerUserId: actor.id, status: "ACTIVE", effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
    select: { id: true }
  }));
  return { config, decision: canFormCouncil(actor, config, proposal, isActiveOfficer) };
}

export async function assertCanFormCouncil(prisma: PrismaService, actor: SafeUserContext | undefined, proposal: EvaluationProposalRecord): Promise<CouncilFormationConfig> {
  const { config, decision } = await resolveCouncilFormationPermission(prisma, actor, proposal);
  if (!decision.allowed) throw new ForbiddenException({ code: decision.code, message: decision.reason });
  return config;
}
