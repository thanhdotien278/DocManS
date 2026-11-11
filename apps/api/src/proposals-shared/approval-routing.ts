import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { notifyUsers } from "../notifications/notification-events.js";
import { recordParticipantWaiver, resolveManagerConflict, type ParticipantWaiverActor } from "../proposal-evaluations/proposal-evaluation-support.js";
import { participantPolicyFor, readParticipantPolicy } from "./participant-policy.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  isLeadership,
  isResearchBoardHead,
  isResearchManagementDeputyHead,
  isResearchManagementHead,
  isResearchManagementStaff,
  isScienceDeputyDirector
} from "./proposal-access.js";
import { ProposalReviewAccessService } from "./proposal-review-access.service.js";

/**
 * Luồng tờ trình qua Phòng KHQS (Story 5.9, D-037). Một nguồn quy tắc cho mọi thủ tục cần Ban giám đốc ký:
 *   người lập (CV/TB/TP) → BOARD_REVIEW (TB rà soát) → HEAD_REVIEW (TP duyệt) → LEADERSHIP (BGĐ ký) → CLOSED.
 * TB lập thì bắt đầu ở HEAD_REVIEW; CV và TP lập bắt đầu ở BOARD_REVIEW; TP lập thì TB chuyển thẳng LEADERSHIP. Không bỏ bước, không tự rà soát.
 * TB/TP chỉ chuyển tiếp hoặc trả lại (RETURNED, bắt buộc lý do); chỉ người ký ở LEADERSHIP được APPROVED/REJECTED.
 * Các story sau gọi các hàm này trong transaction nghiệp vụ của mình: `tx` là client transaction.
 */

export const APPROVAL_KINDS = [
  "EVALUATION_COUNCIL",
  "DECISION_PACKAGE",
  "IRB_COUNCIL",
  "IRB_CERTIFICATE",
  "ACCEPTANCE_COUNCIL",
  "PROJECT_EXTENSION",
  "PROJECT_ADJUSTMENT",
  "LIQUIDATION"
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];
export type ApprovalSigner = "DIRECTOR" | "DIRECTOR_OR_SCIENCE_DEPUTY";
export type ApprovalStage = "BOARD_REVIEW" | "HEAD_REVIEW" | "LEADERSHIP" | "CLOSED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "CANCELLED";

export const APPROVAL_KIND_LABELS: Record<ApprovalKind, string> = {
  EVALUATION_COUNCIL: "Thành lập hội đồng đánh giá",
  DECISION_PACKAGE: "Phê duyệt đề tài và kinh phí",
  IRB_COUNCIL: "Thành lập hội đồng đạo đức (IRB)",
  IRB_CERTIFICATE: "Cấp Giấy chứng nhận đạo đức (IRB)",
  ACCEPTANCE_COUNCIL: "Thành lập hội đồng nghiệm thu",
  PROJECT_EXTENSION: "Gia hạn đề tài",
  PROJECT_ADJUSTMENT: "Điều chỉnh đề tài",
  LIQUIDATION: "Thanh lý hợp đồng"
};

export const APPROVAL_SIGNERS: Record<ApprovalKind, ApprovalSigner> = {
  EVALUATION_COUNCIL: "DIRECTOR_OR_SCIENCE_DEPUTY",
  DECISION_PACKAGE: "DIRECTOR",
  IRB_COUNCIL: "DIRECTOR_OR_SCIENCE_DEPUTY",
  IRB_CERTIFICATE: "DIRECTOR_OR_SCIENCE_DEPUTY",
  ACCEPTANCE_COUNCIL: "DIRECTOR_OR_SCIENCE_DEPUTY",
  PROJECT_EXTENSION: "DIRECTOR_OR_SCIENCE_DEPUTY",
  PROJECT_ADJUSTMENT: "DIRECTOR_OR_SCIENCE_DEPUTY",
  LIQUIDATION: "DIRECTOR"
};

export const APPROVAL_SIGNER_LABELS: Record<ApprovalSigner, string> = {
  DIRECTOR: "Giám đốc",
  DIRECTOR_OR_SCIENCE_DEPUTY: "Giám đốc hoặc Phó GĐ phụ trách Khoa học"
};

export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  BOARD_REVIEW: "Chờ Trưởng ban QLKH rà soát",
  HEAD_REVIEW: "Chờ Trưởng phòng KHQS duyệt",
  LEADERSHIP: "Chờ Ban giám đốc ký",
  CLOSED: "Đã kết thúc"
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Đang trình",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Không phê duyệt",
  RETURNED: "Bị trả lại",
  CANCELLED: "Đã thay bằng tờ trình mới"
};

export type ApprovalSubjectType = "proposal" | "project";
export type ApprovalKey = { kind: ApprovalKind; subjectType: ApprovalSubjectType; subjectId: string; subjectRef?: string };
export type ApprovalSubmissionRow = {
  id: string;
  kind: ApprovalKind;
  subjectType: ApprovalSubjectType;
  subjectId: string;
  subjectRef: string;
  title: string;
  hostOrganizationUnitId: string;
  stage: ApprovalStage;
  status: ApprovalStatus;
  signer: ApprovalSigner;
  submittedById: string;
  /** Vai trò của tác giả lúc lập (không đổi theo tài khoản về sau). */
  authorRole: string;
  lastNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

const MAX_NOTE = 2000;

function keyWhere(key: ApprovalKey) {
  return { kind: key.kind, subjectType: key.subjectType, subjectId: key.subjectId, subjectRef: key.subjectRef ?? "" };
}

/** Ghi chú/lý do: bắt buộc và không rỗng khi `required` (trả lại, từ chối). */
export function readApprovalNote(value: unknown, required: boolean) {
  if (value !== undefined && value !== null && typeof value !== "string") throw new BadRequestException({ message: "Ghi chú không hợp lệ." });
  const trimmed = (value ?? "").trim();
  if (required && !trimmed) throw new BadRequestException({ code: "APPROVAL_REASON_REQUIRED", message: "Nhập lý do." });
  if (trimmed.length > MAX_NOTE) throw new BadRequestException({ message: `Ghi chú tối đa ${MAX_NOTE} ký tự.` });
  return trimmed || null;
}

/** BGĐ ký toàn Học viện: GĐ mọi thủ tục; PGĐ-KH chỉ thủ tục `DIRECTOR_OR_SCIENCE_DEPUTY`. */
export function canSignApproval(actor: SafeUserContext | undefined, signer: ApprovalSigner) {
  return isLeadership(actor) || (signer === "DIRECTOR_OR_SCIENCE_DEPUTY" && isScienceDeputyDirector(actor));
}

/** Người xem được hồ sơ trình nội bộ: cán bộ Phòng KHQS và BGĐ, không giới hạn theo đơn vị. */
export function canViewApproval(actor: SafeUserContext | undefined, row: Pick<ApprovalSubmissionRow, "hostOrganizationUnitId">) {
  if (!actor) return false;
  if (isLeadership(actor) || isScienceDeputyDirector(actor)) return true;
  const internal = isResearchManagementStaff(actor) || isResearchBoardHead(actor) || isResearchManagementHead(actor) || isResearchManagementDeputyHead(actor);
  return internal;
}

/**
 * Xung đột lợi ích trên bản ghi nguồn: participant/reviewer của hồ sơ, thành viên đề tài.
 * D-041 phần 2: "Phụ trách" bật cho vai trò của `actor` bỏ qua xung đột do tham gia (xung đột phản biện vẫn chặn);
 * `operation` (chỉ mutation) ghi audit `participant-waiver-used` khi dùng ngoại lệ.
 */
export async function actorConflicted(tx: Prisma.TransactionClient, actor: ParticipantWaiverActor, row: Pick<ApprovalSubmissionRow, "subjectType" | "subjectId"> & { kind?: string }, operation?: string) {
  const prisma = tx as unknown as PrismaService;
  if (row.subjectType === "proposal") {
    const decision = await resolveManagerConflict(prisma, { participation: new ProposalParticipationService(prisma), reviewAccess: new ProposalReviewAccessService(prisma) }, actor, row.subjectId, operation);
    return decision.conflicted;
  }
  // Story 6.9: người có ghế hội đồng nghiệm thu không xử lý tờ trình thành lập chính hội đồng đó (không áp "Phụ trách").
  if (row.kind === "ACCEPTANCE_COUNCIL" && await tx.acceptanceCouncilMember.findFirst({ where: { projectId: row.subjectId, userId: actor.id, invitationStatus: { in: ["invited", "accepted"] } }, select: { id: true } })) return true;
  const now = new Date();
  const member = await tx.approvedProjectMember.findFirst({
    where: { projectId: row.subjectId, userId: actor.id, status: "ACTIVE", effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
    select: { id: true }
  });
  if (!member) return false;
  if (!participantPolicyFor(actor, await readParticipantPolicy(prisma)).manage) return true;
  if (operation) await recordParticipantWaiver(prisma, actor, { entity: "approved-project", id: row.subjectId }, operation);
  return false;
}

/** Đúng người, đúng bước, không phải tác giả, không xung đột. Ném lỗi nếu không được xử lý. `operation` chỉ truyền khi thực sự chuyển bước. */
async function assertStageActor(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow, operation?: string) {
  const allowed = row.stage === "BOARD_REVIEW" ? isResearchBoardHead(actor) : row.stage === "HEAD_REVIEW" ? isResearchManagementHead(actor) : false;
  if (!allowed) throw new ForbiddenException({ code: "APPROVAL_STAGE_DENIED", message: `Tờ trình đang ở bước "${APPROVAL_STAGE_LABELS[row.stage]}"; bạn không xử lý bước này.` });
  if (row.submittedById === actor.id) throw new ForbiddenException({ code: "APPROVAL_SELF_REVIEW", message: "Không tự rà soát tờ trình do chính mình lập." });
  if (await actorConflicted(tx, actor, row, operation)) throw new ForbiddenException({ code: "APPROVAL_CONFLICT", message: "Bạn có xung đột lợi ích với hồ sơ này." });
}

/** Hành động backend cho phép trên tờ trình này (UI chỉ hiển thị, không suy diễn quyền). */
export async function resolveApprovalActions(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow) {
  if (row.status !== "PENDING") return { advance: false, return: false };
  const allowed = await assertStageActor(tx, actor, row).then(() => true, () => false);
  return { advance: allowed, return: allowed };
}

async function loadPending(tx: Prisma.TransactionClient, id: string, expectedStage: ApprovalStage) {
  const row = (await tx.approvalSubmission.findUnique({ where: { id } })) as ApprovalSubmissionRow | null;
  if (!row) throw new NotFoundException({ message: "Không tìm thấy tờ trình." });
  if (row.status !== "PENDING") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Tờ trình đã được xử lý, bị trả lại hoặc đã thay bằng tờ trình mới." });
  if (row.stage !== expectedStage) throw new ConflictException({ code: "APPROVAL_CONTEXT_STALE", message: "Tờ trình đã chuyển bước. Vui lòng tải lại." });
  return row;
}

/** Chuyển bước/đóng bằng điều kiện trên stage hiện tại: không ghi một phần khi đồng thời hoặc context cũ. */
async function transition(tx: Prisma.TransactionClient, row: ApprovalSubmissionRow, data: Prisma.ApprovalSubmissionUpdateManyMutationInput) {
  const moved = await tx.approvalSubmission.updateMany({ where: { id: row.id, status: "PENDING", stage: row.stage }, data });
  if (moved.count !== 1) throw new ConflictException({ code: "APPROVAL_CONTEXT_STALE", message: "Tờ trình vừa thay đổi. Vui lòng tải lại." });
}

async function recordStep(
  tx: Prisma.TransactionClient,
  actor: SafeUserContext,
  row: ApprovalSubmissionRow,
  step: { action: string; stage: ApprovalStage; note: string | null; toStage: ApprovalStage; toStatus: ApprovalStatus; auditAction: string }
) {
  await tx.approvalStep.create({ data: { submissionId: row.id, stage: step.stage, action: step.action, actorId: actor.id, note: step.note } });
  await tx.auditLog.create({
    data: {
      action: step.auditAction,
      result: "success",
      actorId: actor.id,
      username: actor.username,
      targetEntity: "approval-submission",
      targetEntityId: row.id,
      reason: step.note ?? undefined,
      beforeFacts: { stage: row.stage, status: row.status },
      afterFacts: { stage: step.toStage, status: step.toStatus, decision: step.action, kind: row.kind, subjectType: row.subjectType, subjectId: row.subjectId, submittedById: row.submittedById }
    } as never
  });
  // Bước đã được xử lý: việc "chờ xử lý" cũ của tờ trình này (kể cả của TP còn lại) không còn treo chưa đọc.
  await tx.userNotification.updateMany({ where: { sourceType: "approval", sourceId: row.id, type: "approval.action-required", readAt: null }, data: { readAt: new Date() } });
  // CANCEL đi qua đây cả khi lập lại tờ trình (`cancelPendingApprovals`): không thông báo.
  if (step.action !== "CANCEL") await notifyApprovalStep(tx, actor, row, step);
}

/** Người xử lý bước kế tiếp theo nơi tờ trình **đến**. PP và PGĐ-TD chỉ theo dõi nên không bao giờ nhận. */
const STAGE_ROLES: Partial<Record<ApprovalStage, string[]>> = {
  BOARD_REVIEW: ["RESEARCH_BOARD_HEAD"],
  HEAD_REVIEW: ["RESEARCH_MANAGEMENT_HEAD"],
  LEADERSHIP: ["LEADERSHIP_APPROVAL_AUTHORITY"]
};

const CLOSED_TITLES: Partial<Record<ApprovalStatus, string>> = { RETURNED: "Tờ trình bị trả lại", APPROVED: "Tờ trình đã được ký duyệt", REJECTED: "Tờ trình không được phê duyệt" };

/** Story 11.1: không chép ghi chú/lý do vào thông báo; người nhận mở link, trang đích tự kiểm tra quyền. */
async function notifyApprovalStep(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow, step: { action: string; stage: ApprovalStage; toStage: ApprovalStage; toStatus: ApprovalStatus }) {
  const base = {
    sourceType: "approval" as const,
    sourceId: row.id,
    idempotencyKey: `approval:${row.id}:${step.action}:${step.stage}`,
    link: row.subjectType === "project" ? `/projects/${row.subjectId}` : `/proposals/${row.subjectId}`
  };
  const kindLabel = APPROVAL_KIND_LABELS[row.kind] ?? row.kind;
  const closedTitle = CLOSED_TITLES[step.toStatus];
  if (closedTitle) {
    await notifyUsers(tx, { ...base, userIds: [row.submittedById], exclude: [actor.id], type: `approval.${step.toStatus.toLowerCase()}`, title: closedTitle, body: `${kindLabel}: ${row.title}` });
    return;
  }
  const roles = [...(STAGE_ROLES[step.toStage] ?? [])];
  if (step.toStage === "LEADERSHIP" && row.signer === "DIRECTOR_OR_SCIENCE_DEPUTY") roles.push("SCIENCE_DEPUTY_DIRECTOR");
  if (!roles.length) return;
  const candidates = await tx.user.findMany({ where: { systemRole: { in: roles }, status: "active", id: { notIn: [actor.id, row.submittedById] } }, select: { id: true, systemRole: true } });
  const recipients: string[] = [];
  for (const candidate of candidates) if (!(await actorConflicted(tx, candidate, row))) recipients.push(candidate.id);
  await notifyUsers(tx, { ...base, userIds: recipients, exclude: [actor.id, row.submittedById], type: "approval.action-required", title: `Tờ trình chờ xử lý: ${kindLabel}`, body: `${row.title} — ${APPROVAL_STAGE_LABELS[step.toStage]}` });
}

/** Hủy tờ trình PENDING của (kind, subject, ref): lập lại (D-037) hoặc người nộp rút yêu cầu nguồn. */
export async function cancelPendingApprovals(tx: Prisma.TransactionClient, actor: SafeUserContext, key: ApprovalKey, note: string) {
  const pending = (await tx.approvalSubmission.findMany({ where: { ...keyWhere(key), status: "PENDING" } })) as ApprovalSubmissionRow[];
  for (const old of pending) {
    await tx.approvalSubmission.update({ where: { id: old.id }, data: { status: "CANCELLED", stage: "CLOSED", closedAt: new Date() } });
    await recordStep(tx, actor, old, { action: "CANCEL", stage: old.stage, note, toStage: "CLOSED", toStatus: "CANCELLED", auditAction: "cancel-approval-submission" });
  }
}

/**
 * Lập tờ trình. Tác giả phải là CV/TB/TP trong scope đơn vị chủ quản. Tờ trình PENDING cũ của cùng
 * (kind, subject) chuyển CANCELLED/CLOSED trong cùng transaction (D-037).
 */
export async function openApprovalSubmission(
  tx: Prisma.TransactionClient,
  actor: SafeUserContext,
  key: ApprovalKey,
  input: { title: string; hostOrganizationUnitId: string; note?: string | null }
) {
  if (!isResearchManagementStaff(actor) && !isResearchBoardHead(actor) && !isResearchManagementHead(actor)) {
    throw new ForbiddenException({ code: "APPROVAL_AUTHOR_DENIED", message: "Chỉ Chuyên viên, Trưởng ban QLKH hoặc Trưởng phòng KHQS được lập tờ trình." });
  }
  const note = readApprovalNote(input.note, false);
  const stage: ApprovalStage = isResearchBoardHead(actor) ? "HEAD_REVIEW" : "BOARD_REVIEW";
  await cancelPendingApprovals(tx, actor, key, "Thay bằng tờ trình mới");
  const created = (await tx.approvalSubmission.create({
    data: { ...keyWhere(key), title: input.title.slice(0, 500), hostOrganizationUnitId: input.hostOrganizationUnitId, stage, status: "PENDING", signer: APPROVAL_SIGNERS[key.kind], submittedById: actor.id, authorRole: actor.systemRole ?? "", lastNote: note }
  })) as ApprovalSubmissionRow;
  await recordStep(tx, actor, { ...created, stage: stage, status: "PENDING" }, { action: "SUBMIT", stage, note, toStage: stage, toStatus: "PENDING", auditAction: "submit-approval-submission" });
  return created;
}

/** TB: BOARD_REVIEW → HEAD_REVIEW. TP: HEAD_REVIEW → LEADERSHIP. `expectedStage` là context mà người dùng đã xem. */
export async function advanceApprovalSubmission(tx: Prisma.TransactionClient, actor: SafeUserContext, id: string, input: { expectedStage: ApprovalStage; note?: string | null }) {
  const note = readApprovalNote(input.note, false);
  const row = await loadPending(tx, id, input.expectedStage);
  await assertStageActor(tx, actor, row, "advance-approval-submission");
  // TP lập tờ trình thì việc lập đã là duyệt của TP: TB chuyển thẳng LEADERSHIP (D-037).
  const next: ApprovalStage = row.stage === "BOARD_REVIEW" && row.authorRole !== "RESEARCH_MANAGEMENT_HEAD" ? "HEAD_REVIEW" : "LEADERSHIP";
  await transition(tx, row, { stage: next, lastNote: note ?? row.lastNote });
  await recordStep(tx, actor, row, { action: row.stage === "BOARD_REVIEW" ? "FORWARD" : "APPROVE", stage: row.stage, note, toStage: next, toStatus: "PENDING", auditAction: row.stage === "BOARD_REVIEW" ? "forward-approval-submission" : "approve-approval-submission" });
  return { ...row, stage: next };
}

/** TB/TP trả lại tác giả; lý do bắt buộc. Nguồn quay về trạng thái sửa được (xem `revertSourceOnReturn`). */
export async function returnApprovalSubmission(tx: Prisma.TransactionClient, actor: SafeUserContext, id: string, input: { expectedStage: ApprovalStage; note: unknown }) {
  const note = readApprovalNote(input.note, true)!;
  const row = await loadPending(tx, id, input.expectedStage);
  await assertStageActor(tx, actor, row, "return-approval-submission");
  await closeRow(tx, actor, row, "RETURNED", note, row.stage);
  return { ...row, status: "RETURNED" as const, stage: "CLOSED" as const };
}

async function closeRow(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow, decision: "APPROVED" | "REJECTED" | "RETURNED", note: string | null, stepStage: ApprovalStage) {
  await transition(tx, row, { status: decision, stage: "CLOSED", closedAt: new Date(), lastNote: note ?? row.lastNote });
  const action = decision === "APPROVED" ? "APPROVE" : decision === "REJECTED" ? "REJECT" : "RETURN";
  await recordStep(tx, actor, row, { action, stage: stepStage, note, toStage: "CLOSED", toStatus: decision, auditAction: `${action.toLowerCase()}-approval-submission` });
  if (decision === "RETURNED") await revertSourceOnReturn(tx, actor, row, note ?? "");
}

/**
 * Trả lại thì nguồn về trạng thái sửa được: `DECISION_PACKAGE` (gói đánh giá → "đã chốt", hồ sơ → `under_review`);
 * `PROJECT_ADJUSTMENT`/`PROJECT_EXTENSION` (Story 6.11, yêu cầu về bước CV thẩm định); `LIQUIDATION` (Story 6.12, biên bản về nháp).
 * Các loại khác do story lập tờ trình tương ứng xử lý (5.5 hội đồng, 10.7–10.8 IRB/nghiệm thu).
 */
async function revertSourceOnReturn(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow, note: string) {
  if (row.kind === "PROJECT_ADJUSTMENT" || row.kind === "PROJECT_EXTENSION") return revertProjectRequest(tx, actor, row, note);
  if (row.kind === "LIQUIDATION") {
    // Cập nhật có điều kiện: đường trả lại của TB/TP không giữ khóa đề tài.
    const moved = await tx.projectLiquidation.updateMany({ where: { id: row.subjectRef, status: "SUBMITTED" }, data: { status: "DRAFT" } });
    if (moved.count) await tx.projectHistory.create({ data: { projectId: row.subjectId, actorId: actor.id, action: "project.liquidation.return", fromStatus: "SUBMITTED", toStatus: "DRAFT", reason: note, afterFacts: { liquidationId: row.subjectRef } } });
    return;
  }
  if (row.kind !== "DECISION_PACKAGE") return;
  const moved = await tx.researchProposal.updateMany({ where: { id: row.subjectId, status: "ready_for_approval" }, data: { status: "under_review", authorizationContextUpdatedAt: new Date() } });
  if (!moved.count) return;
  await tx.proposalEvaluationSummary.updateMany({ where: { proposalId: row.subjectId, status: "ready_for_approval" }, data: { status: "finalized", markedReadyAt: null } });
  await tx.proposalSubmissionEvent.create({ data: { proposalId: row.subjectId, actorId: actor.id, fromStatus: "ready_for_approval", toStatus: "under_review", submittedAt: new Date(), note: `Tờ trình bị trả lại: ${note}` } });
}

/** Yêu cầu điều chỉnh/gia hạn: ready_for_head_decision (đã trình) → bước CV thẩm định của loại đó, CV sửa rồi trình lại. */
async function revertProjectRequest(tx: Prisma.TransactionClient, actor: SafeUserContext, row: ApprovalSubmissionRow, note: string) {
  const back = row.kind === "PROJECT_ADJUSTMENT" ? "under_staff_review" : "under_staff_validation";
  const moved = await tx.projectRequest.updateMany({ where: { id: row.subjectRef, projectId: row.subjectId, status: "ready_for_head_decision" }, data: { status: back, preparedById: null, preparedAt: null } });
  if (!moved.count) return;
  const requestType = row.kind === "PROJECT_ADJUSTMENT" ? "adjustment" : "extension";
  const action = `project.${requestType}.return`;
  await tx.projectRequestHistory.create({ data: { requestId: row.subjectRef, actorId: actor.id, action, fromStatus: "ready_for_head_decision", toStatus: back, reason: note } });
  await tx.projectHistory.create({ data: { projectId: row.subjectId, actorId: actor.id, action, requestId: row.subjectRef, fromStatus: "ready_for_head_decision", toStatus: back, reason: note } });
}

/**
 * Cổng cho story ký: tờ trình PENDING của thủ tục phải đang ở LEADERSHIP, người ký đúng loại, không xung đột.
 * Không có tờ trình thì từ chối (không còn đường ký tắt).
 */
export async function assertReadyForLeadership(tx: Prisma.TransactionClient, actor: SafeUserContext, key: ApprovalKey) {
  const pending = (await tx.approvalSubmission.findFirst({ where: { ...keyWhere(key), status: "PENDING" } })) as ApprovalSubmissionRow | null;
  if (!pending) throw new BadRequestException({ code: "APPROVAL_NOT_READY", message: "Chưa có tờ trình đang chờ Ban giám đốc cho thủ tục này." });
  if (pending.stage !== "LEADERSHIP") throw new BadRequestException({ code: "APPROVAL_NOT_READY", message: `Tờ trình chưa tới Ban giám đốc: ${APPROVAL_STAGE_LABELS[pending.stage]}.` });
  if (!canSignApproval(actor, pending.signer)) {
    throw new ForbiddenException({ code: "APPROVAL_SIGNER_DENIED", message: pending.signer === "DIRECTOR" ? "Thủ tục này do Giám đốc ký." : "Thủ tục này do Giám đốc hoặc Phó GĐ phụ trách Khoa học ký." });
  }
  if (await actorConflicted(tx, actor, pending)) throw new ForbiddenException({ code: "APPROVAL_CONFLICT", message: "Người ký có xung đột lợi ích với hồ sơ này." });
  return pending;
}

/**
 * BGĐ quyết định: APPROVED, REJECTED (lý do bắt buộc, chỉ ở LEADERSHIP) hoặc RETURNED (lý do bắt buộc).
 * Gọi trong cùng transaction áp dụng thay đổi nguồn để cả hai commit/rollback cùng nhau.
 */
export async function closeApprovalSubmission(tx: Prisma.TransactionClient, actor: SafeUserContext, key: ApprovalKey, decision: "APPROVED" | "REJECTED" | "RETURNED", note?: unknown) {
  const reason = readApprovalNote(note, decision !== "APPROVED");
  const row = await assertReadyForLeadership(tx, actor, key);
  await closeRow(tx, actor, row, decision, reason, "LEADERSHIP");
  return { ...row, status: decision, stage: "CLOSED" as const };
}

/** Tờ trình đang mở theo đối tượng (để story khác ẩn/hiện thao tác theo bước). */
export async function pendingApprovalStages(tx: Prisma.TransactionClient, subjectType: ApprovalSubjectType, subjectIds: string[]) {
  const result = new Map<string, Partial<Record<ApprovalKind, { stage: ApprovalStage; subjectRef: string; signer: ApprovalSigner }>>>();
  if (!subjectIds.length) return result;
  const rows = (await tx.approvalSubmission.findMany({ where: { subjectType, subjectId: { in: subjectIds }, status: "PENDING" } })) as ApprovalSubmissionRow[];
  for (const row of rows) {
    const entry = result.get(row.subjectId) ?? {};
    entry[row.kind] = { stage: row.stage, subjectRef: row.subjectRef, signer: row.signer };
    result.set(row.subjectId, entry);
  }
  return result;
}
