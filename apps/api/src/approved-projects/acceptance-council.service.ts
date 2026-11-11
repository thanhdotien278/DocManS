import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ACCEPTANCE_DOSSIER_ENTITY_TYPE } from "../modules/files/files.dto.js";
import { notifyUsers } from "../notifications/notification-events.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { recordParticipantWaiver } from "../proposal-evaluations/proposal-evaluation-support.js";
import { APPROVAL_STAGE_LABELS, APPROVAL_STATUS_LABELS, assertReadyForLeadership, closeApprovalSubmission, openApprovalSubmission, type ApprovalKey } from "../proposals-shared/approval-routing.js";
import { canFormCouncil, readCouncilFormationConfig } from "../proposals-shared/council-formation.js";
import { isRelationshipActiveAt } from "../proposals-shared/proposal-participation.js";
import { ApprovedProjectsService, SKIP_CONTEXT } from "./approved-projects.service.js";
import { ethicsCapabilityError as capabilityError } from "./ethics-dossiers.service.js";
import { PROJECT_STATUSES, projectContextVersion } from "./project-capability-v1.js";

type AnyRecord = Record<string, any>;

/** Biên bản họp hội đồng nghiệm thu: chủ tịch tải lên khi hội đồng đã thành lập và chưa có kết quả; kết quả ghim id tệp. */
export const ACCEPTANCE_MINUTES = "ACCEPTANCE_MINUTES";
export const ACCEPTANCE_COUNCIL_ROLES = ["council_chair", "council_secretary", "committee_member"] as const;
export type AcceptanceCouncilRole = (typeof ACCEPTANCE_COUNCIL_ROLES)[number];
const ROLE_LABELS: Record<AcceptanceCouncilRole, string> = { council_chair: "Chủ tịch", council_secretary: "Thư ký", committee_member: "Ủy viên" };
const RESULT_ACTION = "project.acceptance.result";
const councilKey = (projectId: string): ApprovalKey => ({ kind: "ACCEPTANCE_COUNCIL", subjectType: "project", subjectId: projectId });

/** Cơ cấu cố định: 1 chủ tịch, 1 thư ký, còn lại ủy viên; tổng bằng `memberCount` của cấu hình ACCEPTANCE. */
export const ACCEPTANCE_COUNCIL_STRUCTURE = (memberCount: number): Record<AcceptanceCouncilRole, number> => ({ council_chair: 1, council_secretary: 1, committee_member: Math.max(memberCount - 2, 0) });

/** Chặn trình và ký: sai cơ cấu, còn người chưa nhận lời hoặc đã từ chối (phải thu hồi rồi mời người khác). */
export function acceptanceCouncilBlockers(rows: AnyRecord[], memberCount: number) {
  const structure = ACCEPTANCE_COUNCIL_STRUCTURE(memberCount);
  const blockers: string[] = [];
  for (const role of ACCEPTANCE_COUNCIL_ROLES) {
    const count = rows.filter((row) => row.councilRole === role).length;
    if (count !== structure[role]) blockers.push(`Cần ${structure[role]} ${ROLE_LABELS[role]} (hiện ${count}).`);
  }
  const invited = rows.filter((row) => row.invitationStatus === "invited").length;
  const declined = rows.filter((row) => row.invitationStatus === "declined").length;
  if (invited) blockers.push(`${invited} thành viên chưa chấp nhận lời mời.`);
  if (declined) blockers.push(`${declined} thành viên đã từ chối: thu hồi và mời người khác.`);
  return blockers;
}

const liveRows = (project: AnyRecord): AnyRecord[] => (project.acceptanceCouncilMembers ?? []).filter((row: AnyRecord) => row.invitationStatus !== "revoked");
/** Ghế còn hiệu lực (đang mời hoặc đã nhận lời); hàng đã từ chối chỉ chờ thu hồi. */
export const ACCEPTANCE_SEAT_STATUSES = ["invited", "accepted"];
const projectMember = (project: AnyRecord, userId: string) => (project.members ?? []).some((member: AnyRecord) => member.userId === userId && isRelationshipActiveAt(member, new Date()));

/**
 * Story 6.9 (D-034, D-035): một hội đồng nghiệm thu cho mỗi đề tài. Người được cấu hình lập hội đồng mời; khi đủ cơ cấu và mọi người
 * nhận lời thì TP/TB/CV phụ trách trình tờ trình ACCEPTANCE_COUNCIL (TB → TP → GĐ/PGĐ-KH). Ký xong thì thành viên đã nhận lời đọc
 * được hồ sơ; chủ tịch ghi kết quả: đạt → `accepted`, không đạt → `failed`. Mỗi bước một transaction (state, lịch sử, audit, thông báo).
 */
@Injectable()
export class AcceptanceCouncilService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ApprovedProjectsService) {}

  async getCouncil(actor: SafeUserContext, projectId: string) {
    return this.view(this.prisma, actor, projectId);
  }

  /** Ứng viên: tài khoản đang hoạt động có lý lịch khoa học, không phải QT, không phải thành viên đề tài, chưa có ghế. */
  async candidates(actor: SafeUserContext, projectId: string, query = "") {
    const { project, capability } = await this.projects.loadAuthorized(this.prisma, actor, projectId);
    const denial = capabilityError(capability, "acceptance-council.invite");
    if (denial) throw denial;
    const taken = [...(project.members ?? []).filter((member: AnyRecord) => member.userId && isRelationshipActiveAt(member, new Date())).map((member: AnyRecord) => member.userId), ...liveRows(project).map((row) => row.userId)];
    const q = query.trim().slice(0, 100);
    return (this.prisma as any).user.findMany({
      where: { status: "active", systemRole: { not: "SYSTEM_ADMIN" }, researcherProfile: { isNot: null }, id: { notIn: taken }, ...(q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }] } : {}) },
      select: { id: true, displayName: true, username: true, unit: true, systemRole: true },
      orderBy: { displayName: "asc" },
      take: 50
    });
  }

  async invite(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, current, project) => {
      const config = await this.assertFormation(tx, current, project);
      await this.authorize(tx, current, project.id, "acceptance-council.invite");
      const role = input.councilRole as AcceptanceCouncilRole;
      if (!ACCEPTANCE_COUNCIL_ROLES.includes(role)) throw new BadRequestException({ message: "Chọn vị trí trong hội đồng." });
      const ineligible = (message: string) => new BadRequestException({ code: "COUNCIL_MEMBER_INELIGIBLE", message });
      if (input.userId === current.id) throw ineligible("Người lập hội đồng không tự mời chính mình.");
      const candidate = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, displayName: true, status: true, systemRole: true, researcherProfile: { select: { id: true } } } });
      if (!candidate || candidate.status !== "active" || candidate.systemRole === "SYSTEM_ADMIN" || !candidate.researcherProfile) throw ineligible("Chỉ mời được tài khoản đang hoạt động có lý lịch khoa học (không gồm Quản trị hệ thống).");
      if (projectMember(project, candidate.id)) throw ineligible(`${candidate.displayName} là thành viên đề tài nên không tham gia hội đồng nghiệm thu.`);
      const rows = liveRows(project);
      if (rows.some((row) => row.userId === candidate.id)) throw ineligible(`${candidate.displayName} đã giữ một vị trí trong hội đồng.`);
      if (rows.filter((row) => row.councilRole === role).length >= ACCEPTANCE_COUNCIL_STRUCTURE(config.memberCount)[role]) throw new BadRequestException({ code: "COUNCIL_POSITION_FULL", message: `Vị trí ${ROLE_LABELS[role]} đã đủ người theo cơ cấu hội đồng.` });
      const now = await readTransactionClockV1(tx);
      const member = await tx.acceptanceCouncilMember.create({ data: { projectId: project.id, userId: candidate.id, councilRole: role, invitationStatus: "invited", invitedById: current.id, invitedAt: now } });
      const facts = { memberId: member.id, userId: candidate.id, councilRole: role };
      await this.record(tx, current, project, now, { action: "acceptance-council.invite", toStatus: "invited", facts, audit: "invite-acceptance-council-member", targetId: member.id });
      await notifyUsers(tx, { userIds: [candidate.id], exclude: [current.id], type: "acceptance-council.invited", title: "Lời mời tham gia hội đồng nghiệm thu", body: `${project.title} — ${ROLE_LABELS[role]}`, link: `/projects/${project.id}`, sourceType: "acceptance_council", sourceId: project.id, idempotencyKey: `acceptance-council-invite:${member.id}` });
      return this.view(tx, current, project.id);
    });
  }

  /** Thu hồi bắt buộc lý do; hàng được giữ (status `revoked`) làm lịch sử. */
  async revoke(actor: SafeUserContext, projectId: string, memberId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, current, project) => {
      await this.assertFormation(tx, current, project);
      await this.authorize(tx, current, project.id, "acceptance-council.revoke");
      const row = liveRows(project).find((item) => item.id === memberId);
      if (!row) throw new NotFoundException({ message: "Không tìm thấy thành viên hội đồng." });
      const now = await readTransactionClockV1(tx);
      await tx.acceptanceCouncilMember.update({ where: { id: row.id }, data: { invitationStatus: "revoked", revokeReason: input.reason, revokedAt: now } });
      await this.record(tx, current, project, now, { action: "acceptance-council.revoke", fromStatus: row.invitationStatus, toStatus: "revoked", reason: input.reason, facts: { memberId: row.id, userId: row.userId, councilRole: row.councilRole }, audit: "revoke-acceptance-council-member", targetId: row.id });
      return this.view(tx, current, project.id);
    });
  }

  /**
   * Người được mời nhận lời hoặc từ chối (từ chối bắt buộc lý do). Người được mời không đọc được đề tài nên không có contextVersion:
   * cập nhật có điều kiện trên hàng còn `invited` dưới khóa đề tài (như 5.11).
   */
  async respond(actor: SafeUserContext, projectId: string, memberId: string, input: AnyRecord) {
    const accepting = input.decision === "accept";
    if (!accepting && !input.reason) throw new BadRequestException({ code: "DECLINE_REASON_REQUIRED", message: "Nhập lý do từ chối lời mời." });
    return this.projects.mutate(actor, projectId, SKIP_CONTEXT, async (tx, current, project) => {
      const row = liveRows(project).find((item) => item.id === memberId && item.userId === current.id);
      // Người khác nhận NotFound như hàng không tồn tại: không lộ ai được mời.
      if (!row) throw new NotFoundException({ message: "Không tìm thấy lời mời." });
      await this.authorize(tx, current, project.id, "acceptance-council.respond");
      if (projectMember(project, current.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Thành viên đề tài không thể nhận lời mời hội đồng nghiệm thu." });
      const now = await readTransactionClockV1(tx);
      const invitationStatus = accepting ? "accepted" : "declined";
      const moved = await tx.acceptanceCouncilMember.updateMany({ where: { id: row.id, invitationStatus: "invited" }, data: { invitationStatus, respondedAt: now, declineReason: accepting ? null : input.reason } });
      if (moved.count !== 1) throw new BadRequestException({ code: "INVITATION_NOT_PENDING", message: "Lời mời đã được trả lời hoặc không còn hiệu lực." });
      await this.record(tx, current, project, now, { action: `acceptance-council.${accepting ? "accept" : "decline"}`, fromStatus: "invited", toStatus: invitationStatus, reason: accepting ? null : input.reason, facts: { memberId: row.id, councilRole: row.councilRole }, audit: accepting ? "accept-acceptance-council-invitation" : "decline-acceptance-council-invitation", targetId: row.id });
      await notifyUsers(tx, { userIds: [row.invitedById], exclude: [current.id], type: `acceptance-council.${invitationStatus}`, title: accepting ? "Thành viên đã nhận lời hội đồng nghiệm thu" : "Thành viên từ chối lời mời hội đồng nghiệm thu", body: `${project.title} — ${ROLE_LABELS[row.councilRole as AcceptanceCouncilRole] ?? row.councilRole}`, link: `/projects/${project.id}`, sourceType: "acceptance_council", sourceId: project.id, idempotencyKey: `acceptance-council-${invitationStatus}:${row.id}` });
      // Từ chối thì không còn ghế nên không đọc lại được hội đồng.
      return accepting ? this.view(tx, current, project.id) : { memberId: row.id, invitationStatus };
    });
  }

  /** Lập tờ trình ACCEPTANCE_COUNCIL (Story 5.9) chỉ khi đủ cơ cấu và mọi thành viên đã nhận lời. */
  async submit(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, current, project) => {
      await this.authorize(tx, current, project.id, "acceptance-council.submit");
      const rows = liveRows(project);
      if (rows.some((row) => row.userId === current.id && ACCEPTANCE_SEAT_STATUSES.includes(row.invitationStatus))) throw new ForbiddenException({ code: "APPROVAL_CONFLICT", message: "Thành viên hội đồng không trình tờ trình của chính hội đồng mình." });
      if (projectMember(project, current.id)) await recordParticipantWaiver(tx, current, { entity: "approved-project", id: project.id }, "submit-acceptance-council");
      const config = await readCouncilFormationConfig(tx, "ACCEPTANCE");
      const blockers = acceptanceCouncilBlockers(rows, config.memberCount);
      if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Chưa thể lập tờ trình hội đồng: ${blockers.join(" ")}`, blockers, notAccepted: rows.filter((row) => row.invitationStatus !== "accepted").map((row) => row.id) });
      const submission = await openApprovalSubmission(tx, current, councilKey(project.id), { title: `Hội đồng nghiệm thu: ${project.title}`, hostOrganizationUnitId: project.hostOrganizationUnitId, note: input.note });
      await this.record(tx, current, project, await readTransactionClockV1(tx), { action: "acceptance-council.submit", toStatus: submission.stage, facts: { approvalSubmissionId: submission.id, memberIds: rows.map((row) => row.id) }, audit: "submit-acceptance-council", targetId: submission.id });
      return this.view(tx, current, project.id);
    });
  }

  /**
   * GĐ/PGĐ-KH ký (thành lập hội đồng) hoặc từ chối. Trả lại/từ chối giữ nguyên danh sách: người lập thu hồi/mời thêm rồi trình lại.
   * Ký kiểm tra lại cơ cấu trong chính transaction ký; người ký không thuộc đề tài và không là thành viên hội đồng.
   */
  async decide(actor: SafeUserContext, projectId: string, decision: "approve" | "reject", input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, current, project) => {
      if (project.status !== PROJECT_STATUSES.pendingAcceptance) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài không ở trạng thái chờ nghiệm thu." });
      const key = councilKey(project.id);
      const pending = await assertReadyForLeadership(tx, current, key);
      if (projectMember(project, current.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người ký tham gia đề tài." });
      await this.projects.assertNoEvaluationConflict(tx, current.id, project.proposalId);
      const rows = liveRows(project);
      if (rows.some((row) => row.userId === current.id)) throw new ForbiddenException({ code: "APPROVAL_CONFLICT", message: "Người ký là thành viên hội đồng nghiệm thu." });
      if (decision === "reject") {
        await closeApprovalSubmission(tx, current, key, "REJECTED", input.reason);
        await this.record(tx, current, project, await readTransactionClockV1(tx), { action: "acceptance-council.reject", toStatus: "REJECTED", reason: input.reason, facts: { approvalSubmissionId: pending.id }, audit: "reject-acceptance-council", targetId: pending.id });
        const officer = await this.projects.currentOfficer(tx, project.id);
        await notifyUsers(tx, { userIds: [pending.submittedById, officer?.officerUserId], exclude: [current.id], type: "acceptance-council.rejected", title: "Tờ trình hội đồng nghiệm thu không được phê duyệt", body: project.title, link: `/projects/${project.id}`, sourceType: "acceptance_council", sourceId: project.id, idempotencyKey: `acceptance-council-reject:${pending.id}` });
        return this.view(tx, current, project.id);
      }
      const config = await readCouncilFormationConfig(tx, "ACCEPTANCE");
      const blockers = acceptanceCouncilBlockers(rows, config.memberCount);
      if (blockers.length) throw new BadRequestException({ code: "COUNCIL_NOT_READY", message: `Không thể ký: ${blockers.join(" ")}`, blockers });
      // Thành viên đã nhận lời có thể vừa vào đề tài hoặc bị khóa tài khoản sau khi trình.
      const ineligible = rows.filter((row) => projectMember(project, row.userId) || row.user?.status !== "active");
      if (ineligible.length) throw new BadRequestException({ code: "COUNCIL_MEMBER_INELIGIBLE", message: "Có thành viên hội đồng không còn hợp lệ (thuộc đề tài hoặc tài khoản không hoạt động): thu hồi và mời người khác.", memberIds: ineligible.map((row) => row.id) });
      await closeApprovalSubmission(tx, current, key, "APPROVED", input.note ?? input.reason);
      const now = await readTransactionClockV1(tx);
      await tx.acceptanceCouncilMember.updateMany({ where: { id: { in: rows.map((row) => row.id) }, councilEstablishedAt: null }, data: { councilEstablishedAt: now } });
      await this.record(tx, current, project, now, { action: "acceptance-council.establish", toStatus: "established", facts: { approvalSubmissionId: pending.id, memberIds: rows.map((row) => row.id), establishedAt: now.toISOString() }, audit: "establish-acceptance-council", targetId: pending.id, relationship: true });
      await notifyUsers(tx, { userIds: rows.map((row) => row.userId), exclude: [current.id], type: "acceptance-council.established", title: "Hội đồng nghiệm thu đã được thành lập", body: project.title, link: `/projects/${project.id}/acceptance-dossier`, sourceType: "acceptance_council", sourceId: project.id, idempotencyKey: `acceptance-council-established:${pending.id}` });
      return this.view(tx, current, project.id);
    });
  }

  /** Chủ tịch của hội đồng đã thành lập ghi kết quả (nhận xét và biên bản bắt buộc): `pending_acceptance → accepted|failed`. */
  async recordResult(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, current, project) => {
      // Capability tính lại trong transaction: ghế chủ tịch đã nhận lời, không là thành viên đề tài (không áp "Phụ trách").
      await this.authorize(tx, current, project.id, "acceptance-council.record-result");
      const comment = typeof input.comment === "string" ? input.comment.trim() : "";
      const minutes = project.acceptanceDossier ? await tx.fileRecord.findFirst({ where: { relatedEntityType: ACCEPTANCE_DOSSIER_ENTITY_TYPE, relatedEntityId: project.acceptanceDossier.id, filePurpose: ACCEPTANCE_MINUTES, status: "active", deletedAt: null }, orderBy: { createdAt: "desc" } }) : null;
      const missing = [!comment && "comment", !minutes && "minutes"].filter(Boolean);
      if (missing.length) throw new BadRequestException({ code: "READINESS_INCOMPLETE", message: "Cần nhận xét của hội đồng và biên bản họp hội đồng.", missing });
      if (input.outcome !== "accepted" && input.outcome !== "failed") throw new BadRequestException({ message: "Kết quả nghiệm thu chỉ là đạt (accepted) hoặc không đạt (failed)." });
      const outcome = input.outcome === "accepted" ? PROJECT_STATUSES.accepted : PROJECT_STATUSES.failed;
      const now = await readTransactionClockV1(tx);
      await tx.approvedProject.update({ where: { id: project.id }, data: { status: outcome, aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      const chair = liveRows(project).find((row) => row.userId === current.id)!;
      const facts = { status: outcome, minutesFileId: minutes.id, chairMemberId: chair.id };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: current.id, action: RESULT_ACTION, fromStatus: PROJECT_STATUSES.pendingAcceptance, toStatus: outcome, reason: comment, beforeFacts: { status: PROJECT_STATUSES.pendingAcceptance }, afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "record-acceptance-result", result: "success", actorId: current.id, targetEntity: "approved-project", targetEntityId: project.id, username: current.username, beforeFacts: { status: PROJECT_STATUSES.pendingAcceptance }, afterFacts: facts });
      const officer = await this.projects.currentOfficer(tx, project.id);
      const pi = (project.members ?? []).find((member: AnyRecord) => member.participationRole === "TOPIC_PI" && member.status === "ACTIVE")?.userId;
      const council = liveRows(project).filter((row) => row.invitationStatus === "accepted").map((row) => row.userId);
      await notifyUsers(tx, { userIds: [pi, officer?.officerUserId, ...council], exclude: [current.id], type: "acceptance-council.result", title: outcome === PROJECT_STATUSES.accepted ? "Đề tài đạt nghiệm thu" : "Đề tài không đạt nghiệm thu", body: project.title, link: `/projects/${project.id}`, sourceType: "acceptance_council", sourceId: project.id, idempotencyKey: `acceptance-result:${project.id}` });
      return this.view(tx, current, project.id);
    });
  }

  /** CV chỉ được lập khi đang phụ trách và được tick trong cấu hình; mã lỗi riêng COUNCIL_FORMATION_DENIED (D-035). */
  private async assertFormation(tx: any, actor: SafeUserContext, project: AnyRecord) {
    const config = await readCouncilFormationConfig(tx, "ACCEPTANCE");
    const officer = await this.projects.currentOfficer(tx, project.id);
    const decision = canFormCouncil(actor, config, project as { hostOrganizationUnitId: string }, officer?.officerUserId === actor.id);
    if (!decision.allowed) throw new ForbiddenException({ code: decision.code, message: decision.reason });
    if (projectMember(project, actor.id)) await recordParticipantWaiver(tx, actor, { entity: "approved-project", id: project.id }, "form-acceptance-council");
    return config;
  }

  private async authorize(tx: any, actor: SafeUserContext, projectId: string, action: string) {
    const { capability } = await this.projects.loadAuthorized(tx, actor, projectId, { councilSeat: true });
    const denial = capabilityError(capability, action);
    if (denial) throw denial;
  }

  private async record(tx: any, actor: SafeUserContext, project: AnyRecord, now: Date, step: { action: string; fromStatus?: string; toStatus: string; reason?: string | null; facts: AnyRecord; audit: string; targetId: string; relationship?: boolean }) {
    await tx.approvedProject.update({ where: { id: project.id }, data: { aggregateVersion: { increment: 1 }, ...(step.relationship ? { relationshipVersion: { increment: 1 } } : {}), authorizationContextUpdatedAt: now } });
    await tx.projectHistory.create({ data: { projectId: project.id, actorId: actor.id, action: step.action, fromStatus: step.fromStatus ?? null, toStatus: step.toStatus, reason: step.reason ?? null, afterFacts: step.facts } });
    await new AuditLogService(tx).record({ action: step.audit, result: "success", actorId: actor.id, targetEntity: "acceptance-council", targetEntityId: step.targetId, username: actor.username, reason: step.reason ?? undefined, afterFacts: { projectId: project.id, ...step.facts } });
  }

  /** Người đọc đề tài thấy cả hội đồng và tờ trình; người chỉ có ghế (không đọc đề tài) chỉ thấy ghế của mình. */
  private async view(tx: any, actor: SafeUserContext, projectId: string) {
    const { project, capability } = await this.projects.loadAuthorized(tx, actor, projectId, { councilSeat: true });
    const readsProject = capability.allowedActions.includes("project.read");
    const own = (list: Array<AnyRecord | string>) => list.filter((item) => (typeof item === "string" ? item : item.action).startsWith("acceptance-council."));
    const config = await readCouncilFormationConfig(tx, "ACCEPTANCE");
    const rows: AnyRecord[] = project.acceptanceCouncilMembers ?? [];
    const live = liveRows(project);
    const establishedAt = live.map((row) => row.councilEstablishedAt?.getTime() ?? 0).reduce((max, time) => Math.max(max, time), 0);
    const latest = readsProject ? await tx.approvalSubmission.findFirst({ where: { kind: "ACCEPTANCE_COUNCIL", subjectType: "project", subjectId: projectId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } }) : null;
    const result = await tx.projectHistory.findFirst({ where: { projectId, action: RESULT_ACTION }, orderBy: { createdAt: "desc" } });
    return {
      contextVersion: projectContextVersion(project),
      projectStatus: project.status,
      dossierId: project.acceptanceDossier?.id ?? null,
      config: { memberCount: config.memberCount, structure: ACCEPTANCE_COUNCIL_STRUCTURE(config.memberCount) },
      establishedAt: establishedAt ? new Date(establishedAt).toISOString() : null,
      blockers: readsProject ? acceptanceCouncilBlockers(live, config.memberCount) : [],
      members: (readsProject ? rows : rows.filter((row) => row.userId === actor.id)).map((row) => ({
        id: row.id, userId: row.userId, displayName: row.user?.displayName ?? "", username: row.user?.username ?? "", unit: row.user?.unit ?? "",
        councilRole: row.councilRole, councilRoleLabel: ROLE_LABELS[row.councilRole as AcceptanceCouncilRole] ?? row.councilRole, invitationStatus: row.invitationStatus,
        declineReason: row.declineReason, revokeReason: row.revokeReason, invitedAt: row.invitedAt.toISOString(), respondedAt: row.respondedAt?.toISOString() ?? null,
        revokedAt: row.revokedAt?.toISOString() ?? null, councilEstablishedAt: row.councilEstablishedAt?.toISOString() ?? null
      })),
      approval: latest ? { id: latest.id, stage: latest.stage, stageLabel: APPROVAL_STAGE_LABELS[latest.stage as keyof typeof APPROVAL_STAGE_LABELS] ?? latest.stage, status: latest.status, statusLabel: APPROVAL_STATUS_LABELS[latest.status as keyof typeof APPROVAL_STATUS_LABELS] ?? latest.status, lastNote: latest.lastNote ?? null } : null,
      result: result ? { outcome: result.toStatus, comment: result.reason, minutesFileId: (result.afterFacts as AnyRecord)?.minutesFileId ?? null, recordedAt: result.createdAt.toISOString() } : null,
      allowedActions: own(capability.allowedActions),
      blockedActions: own(capability.blockedActions)
    };
  }
}
