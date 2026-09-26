import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { getOrganizationScopeIds, isLeadership, isResearchOversightAuthority, isScientificManagementHead, isScientificManagementStaff } from "../proposals-shared/proposal-access.js";
import { isRelationshipActiveAt } from "../proposals-shared/proposal-participation.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { assertProposalContext } from "../proposals-shared/proposal-mutation.js";
import { projectContextVersion, projectViewerAuthorizationV1, PROJECT_STATUSES, type ProjectOfficerFact } from "./project-capability-v1.js";

const PREPARING = PROJECT_STATUSES.preparing;
const EXECUTING = PROJECT_STATUSES.executing;
const REPORT_DRAFT = "draft";
const REPORT_SUBMITTED = "submitted";
const REPORT_UNDER_REVIEW = "under_review";
const REPORT_SUPPLEMENT = "supplement_requested";
const REPORT_ACCEPTED = "accepted";
const ADJUSTMENT = "adjustment";
const EXTENSION = "extension";

type AnyRecord = Record<string, any>;

const PROJECT_INCLUDE = {
  proposal: { select: { id: true, ownerId: true, title: true, status: true, startDate: true, endDate: true, budgetMetadata: true, owner: { select: { displayName: true, username: true } } } },
  hostOrganizationUnit: { select: { id: true, code: true, name: true } },
  members: { include: { user: { select: { id: true, displayName: true, username: true, status: true } } }, orderBy: { createdAt: "asc" } },
  managementOfficers: { include: { officer: { select: { id: true, displayName: true, username: true, status: true, systemRole: true, unit: true } }, assignedBy: { select: { displayName: true } } }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] },
  milestones: { orderBy: [{ dueDate: "asc" }, { position: "asc" }] },
  checkpoints: { orderBy: { dueDate: "asc" } },
  reports: { include: { evidence: { include: { fileRecord: true } }, checkpoint: true, author: { select: { displayName: true, username: true } }, reviewedBy: { select: { displayName: true, username: true } } }, orderBy: [{ revision: "desc" }] },
  requests: { include: { revisions: { orderBy: { revision: "desc" } }, evidence: { include: { fileRecord: true } }, requester: { select: { displayName: true, username: true } }, decisionBy: { select: { displayName: true, username: true } }, preparedBy: { select: { displayName: true, username: true } } }, orderBy: { createdAt: "desc" } },
  history: { orderBy: { createdAt: "desc" } }
};

@Injectable()
export class ApprovedProjectsService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  private mutate<T>(actor: SafeUserContext, projectId: string, expected: unknown, work: (tx: any, currentActor: SafeUserContext, project: AnyRecord) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
      const currentActor = await this.readCurrentActor(tx, actor.id);
      await tx.$queryRaw`SELECT id FROM approved_projects WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.approvedProject.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
      if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài đã được duyệt." });
      assertProjectContext(expected, project);
      return work(tx, currentActor, project);
    }, { isolationLevel: "Serializable", timeout: 15000 }).catch(async (error: AnyRecord) => {
      const denied = error?.code === "P2034" ? new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" }) : error;
      const evidence = denied as AnyRecord;
      await this.auditLog.record({ action: "project-mutation-denied", result: "failure", actorId: actor.id, targetEntity: "approved-project", targetEntityId: projectId, username: actor.username, reason: evidence?.response?.code ?? evidence?.code ?? "ACTION_NOT_GRANTED" }).catch(() => undefined);
      throw denied;
    });
  }

  private async readCurrentActor(tx: any, actorId: string): Promise<SafeUserContext> {
    const user = await tx.user.findUnique({ where: { id: actorId }, include: { organizationScopes: { include: { organizationUnit: true } } } });
    if (!user || user.status !== "active") throw new ForbiddenException({ code: "ACCOUNT_INACTIVE", message: "Tài khoản hiện không hoạt động." });
    return {
      id: user.id,
      username: user.username ?? "",
      displayName: user.displayName,
      systemRole: user.systemRole as SafeUserContext["systemRole"],
      unit: user.unit,
      organizationScopes: (user.organizationScopes ?? []).filter((scope: any) => scope.organizationUnit?.status === "active").map((scope: any) => ({ id: scope.organizationUnit.id, code: scope.organizationUnit.code, name: scope.organizationUnit.name }))
    };
  }

  private assertScope(actor: SafeUserContext, project: AnyRecord) {
    if (!getOrganizationScopeIds(actor).includes(project.hostOrganizationUnitId)) throw new ForbiddenException({ code: "ORG_SCOPE_DENIED", message: "Không có phạm vi tổ chức phù hợp cho đề tài." });
  }

  private async currentOfficer(tx: any, projectId: string, asOf = new Date()): Promise<ProjectOfficerFact | null> {
    const rows = await tx.projectManagementOfficer.findMany({ where: { projectId, status: "ACTIVE" }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] });
    const active = rows.filter((row: any) => isRelationshipActiveAt(row, asOf));
    if (active.length > 1) throw new ConflictException({ code: "CONTEXT_AMBIGUOUS", message: "Phân công chuyên viên của đề tài không rõ ràng." });
    return active[0] ?? null;
  }

  private async assertOfficer(tx: any, actor: SafeUserContext, project: AnyRecord) {
    this.assertScope(actor, project);
    if (this.activeMember(project, actor.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
    await this.assertNoEvaluationConflict(tx, actor.id, project.proposalId);
    const officer = await this.currentOfficer(tx, project.id);
    if (isScientificManagementStaff(actor) && officer?.officerUserId === actor.id) return officer;
    throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Bạn chưa được phân công quản lý đề tài này." });
  }

  private async assertNoEvaluationConflict(tx: any, userId: string, proposalId: string) {
    const conflict = await new ProposalReviewAccessService(tx).resolveConflictForProposal(userId, proposalId);
    if (conflict.unresolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED" });
    if (conflict.isAssignedReviewer || conflict.hasPersistedReview) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
  }

  private async loadAuthorized(tx: any, actor: SafeUserContext, projectId: string) {
    const project = await tx.approvedProject.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
    if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài đã được duyệt." });
    const officer = await this.currentOfficer(tx, projectId);
    const actorMember = (project.members ?? []).find((member: any) => member.userId === actor.id && isRelationshipActiveAt(member, new Date()));
    const projectPi = (project.members ?? []).find((member: any) => member.participationRole === "TOPIC_PI" && isRelationshipActiveAt(member, new Date()));
    const participant = !!actorMember && actorMember.participationRole !== "TOPIC_PI";
    const responsibleMember = !!actorMember && project.milestones.some((milestone: AnyRecord) => milestone.responsibleMemberId === actorMember.id && milestone.status !== "completed");
    const capability = projectViewerAuthorizationV1({ actor, project: { ...project, ownerId: projectPi?.userId ?? "" }, projectOfficer: officer, participant: { isParticipant: participant, role: actorMember?.participationRole, effectiveFrom: actorMember?.effectiveFrom?.toISOString?.(), effectiveUntil: actorMember?.effectiveUntil?.toISOString?.() }, responsibleMember });
    if (!capability.allowedActions.includes("project.read")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem đề tài này." });
    return { project, officer, capability };
  }

  async listProjects(actor: SafeUserContext, options: { overdue?: boolean; approaching?: boolean } = {}) {
    const scopeIds = getOrganizationScopeIds(actor);
    const where = scopeIds.length ? { OR: [{ hostOrganizationUnitId: { in: scopeIds } }, { members: { some: { userId: actor.id, status: "ACTIVE" } } }, { proposal: { ownerId: actor.id } }] } : { OR: [{ members: { some: { userId: actor.id, status: "ACTIVE" } } }, { proposal: { ownerId: actor.id } }] };
    const records = await (this.prisma as any).approvedProject.findMany({ where, include: PROJECT_INCLUDE, orderBy: { createdAt: "desc" } });
    const visible = [];
    for (const project of records) {
      try {
        const loaded = await this.loadAuthorized(this.prisma, actor, project.id);
        const response = this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, actor);
        if (options.overdue !== undefined && response.overdue !== options.overdue) continue;
        if (options.approaching !== undefined && response.approaching !== options.approaching) continue;
        visible.push(response);
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
      }
    }
    return visible;
  }

  async getProject(actor: SafeUserContext, projectId: string) {
    const loaded = await this.loadAuthorized(this.prisma, actor, projectId);
    return this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, actor);
  }

  async listMonitoring(actor: SafeUserContext, options: { overdue?: boolean; approaching?: boolean } = {}) {
    if (!(isScientificManagementStaff(actor) || isScientificManagementHead(actor) || isLeadership(actor) || isResearchOversightAuthority(actor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền theo dõi đề tài." });
    return this.listProjects(actor, options);
  }

  private toProjectResponse(project: AnyRecord, capability: AnyRecord, officer: AnyRecord | null, actor?: SafeUserContext) {
    const now = new Date();
    const member = (project.members ?? []).find((item: AnyRecord) => item.userId === actor?.id && isRelationshipActiveAt(item, now));
    const isPi = member?.participationRole === "TOPIC_PI";
    const isOfficer = !!actor && isScientificManagementStaff(actor) && officer?.officerUserId === actor.id;
    const isHead = !!actor && isScientificManagementHead(actor);
    const detailedCases = isPi || isOfficer || isHead;
    const deadlines = [project.endDate, ...(project.checkpoints ?? []).filter((item: any) => item.status !== "completed").map((item: any) => item.dueDate), ...(project.milestones ?? []).filter((item: any) => item.status !== "completed").map((item: any) => item.dueDate)].filter((value): value is Date => value instanceof Date);
    const nearest = deadlines.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const overdue = !!nearest && nearest.getTime() < now.getTime() && [PREPARING, EXECUTING, PROJECT_STATUSES.paused].includes(project.status);
    const approaching = !!nearest && !overdue && nearest.getTime() - now.getTime() <= 14 * 86400000;
    return {
      id: project.id,
      code: project.code,
      proposalId: project.proposalId,
      title: project.title,
      status: project.status,
      hostOrganizationUnitId: project.hostOrganizationUnitId,
      hostOrganizationUnit: project.hostOrganizationUnit,
      source: { proposalId: project.proposalId, submissionEventId: project.sourceSubmissionEventId, decisionId: project.sourceDecisionId },
      startDate: project.startDate?.toISOString?.() ?? null,
      endDate: project.endDate?.toISOString?.() ?? null,
      scope: project.scopeSnapshot,
      plan: project.planSnapshot,
      members: (project.members ?? []).map((member: any) => ({ ...member, effectiveFrom: member.effectiveFrom?.toISOString?.() ?? null, effectiveUntil: member.effectiveUntil?.toISOString?.() ?? null })),
      officer: officer ? { id: officer.id, officerUserId: officer.officerUserId, status: officer.status, effectiveFrom: officer.effectiveFrom?.toISOString?.() ?? null, effectiveUntil: officer.effectiveUntil?.toISOString?.() ?? null } : null,
      milestones: project.milestones ?? [],
      checkpoints: project.checkpoints ?? [],
      reports: (project.reports ?? []).map((report: AnyRecord) => detailedCases ? ({
        id: report.id, projectId: report.projectId, checkpointId: report.checkpointId, revision: report.revision, status: report.status,
        reportingPeriodStart: report.reportingPeriodStart?.toISOString?.() ?? null, reportingPeriodEnd: report.reportingPeriodEnd?.toISOString?.() ?? null, deadline: report.deadline?.toISOString?.() ?? null,
        progressResults: report.progressResults, issuesRecommendations: report.issuesRecommendations, milestoneContext: report.milestoneContext, author: report.author,
        reviewedBy: report.reviewedBy, reviewReason: actor && (isScientificManagementStaff(actor) || isScientificManagementHead(actor)) ? report.reviewReason : undefined,
        responseDeadline: report.responseDeadline?.toISOString?.() ?? null, submittedAt: report.submittedAt?.toISOString?.() ?? null,
        evidence: (report.evidence ?? []).map((item: AnyRecord) => ({ id: item.id, fileRecordId: item.fileRecordId, file: item.fileRecord ? { id: item.fileRecord.id, originalFileName: item.fileRecord.originalFileName, mimeType: item.fileRecord.mimeType, sizeBytes: item.fileRecord.sizeBytes, status: item.fileRecord.status } : null }))
      }) : ({ id: report.id, checkpointId: report.checkpointId, status: report.status, revision: report.revision, deadline: report.deadline?.toISOString?.() ?? null, submittedAt: report.submittedAt?.toISOString?.() ?? null })),
      requests: (project.requests ?? []).map((request: AnyRecord) => detailedCases && (!isHead || request.requestType === EXTENSION) ? ({
        id: request.id, projectId: request.projectId, requestType: request.requestType, status: request.status, revision: request.revision, requester: request.requester,
        currentValues: request.currentValues, proposedValues: request.proposedValues, reason: request.reason, decisionNote: request.decisionNote, responseDeadline: request.responseDeadline?.toISOString?.() ?? null, decidedAt: request.decidedAt?.toISOString?.() ?? null,
        appraisal: actor && ((isScientificManagementStaff(actor) && request.requestType === ADJUSTMENT) || (isScientificManagementHead(actor) && request.requestType === EXTENSION)) ? request.appraisal : undefined,
        preparedAt: request.preparedAt?.toISOString?.() ?? null, preparedBy: request.preparedBy, revisions: request.revisions, evidence: (request.evidence ?? []).map((item: AnyRecord) => ({ id: item.id, requestRevisionId: item.requestRevisionId, fileRecordId: item.fileRecordId, file: item.fileRecord ? { id: item.fileRecord.id, originalFileName: item.fileRecord.originalFileName, mimeType: item.fileRecord.mimeType, sizeBytes: item.fileRecord.sizeBytes, status: item.fileRecord.status } : null }))
      }) : ({ id: request.id, requestType: request.requestType, status: request.status, createdAt: request.createdAt?.toISOString?.() ?? null, decidedAt: request.decidedAt?.toISOString?.() ?? null })),
      history: (project.history ?? []).map((item: AnyRecord) => ({ id: item.id, action: item.action, fromStatus: item.fromStatus, toStatus: item.toStatus, reason: detailedCases ? item.reason : undefined, createdAt: item.createdAt?.toISOString?.() ?? null, beforeFacts: isOfficer || isHead ? item.beforeFacts : undefined, afterFacts: isOfficer || isHead ? item.afterFacts : undefined })),
      overdue,
      approaching,
      nearestDeadline: nearest?.toISOString?.() ?? null,
      viewerAuthorization: capability
    };
  }

  async createFromApprovedProposal(actor: SafeUserContext, proposalId: string, input: AnyRecord = {}) {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
      const currentActor = await this.readCurrentActor(tx, actor.id);
      if (!isScientificManagementStaff(currentActor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ chuyên viên phụ trách đề xuất mới được tạo đề tài." });
      const proposal = await tx.researchProposal.findUnique({ where: { id: proposalId }, include: { members: true, hostOrganizationUnit: true, owner: { select: { displayName: true, username: true } } } });
      if (!proposal) throw new NotFoundException({ message: "Không tìm thấy đề xuất nguồn." });
      if (proposal.status !== "approved") throw new BadRequestException({ code: "SOURCE_NOT_APPROVED", message: "Đề xuất nguồn chưa được phê duyệt." });
      assertProposalContext(input.contextVersion, proposal);
      this.assertScope(currentActor, { hostOrganizationUnitId: proposal.hostOrganizationUnitId });
      const participation = (proposal.members ?? []).some((member: any) => member.userId === currentActor.id && isRelationshipActiveAt(member, new Date()));
      if (proposal.ownerId === currentActor.id || participation) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia đề xuất không được tạo đề tài nguồn." });
      const assigned = await tx.proposalManagementOfficer.findMany({ where: { proposalId, officerUserId: currentActor.id, status: "ACTIVE" } });
      if (!assigned.some((row: any) => isRelationshipActiveAt(row, new Date()))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Bạn chưa được phân công phụ trách đề xuất nguồn." });

      const existing = await tx.approvedProject.findUnique({ where: { proposalId }, include: PROJECT_INCLUDE });
      if (existing) {
        return { id: existing.id, proposalId, status: existing.status };
      }
      const decision = await tx.proposalDecision.findFirst({ where: { proposalId, decision: "approved" }, orderBy: { decidedAt: "desc" } });
      const approvedSubmissionId = (decision?.packageSnapshot as AnyRecord | null)?.submissionEventId;
      const submission = approvedSubmissionId ? await tx.proposalSubmissionEvent.findUnique({ where: { id: approvedSubmissionId } }) : null;
      if (!submission || submission.proposalId !== proposalId || !["submitted", "resubmitted"].includes(submission.toStatus) || !decision) throw new BadRequestException({ code: "SOURCE_EVIDENCE_MISSING", message: "Không tìm thấy phiên bản nộp gắn với quyết định phê duyệt." });
      const snapshot = submission.snapshot as AnyRecord | null;
      if (!snapshot || snapshot.id !== proposalId || !snapshot.ownerId || !Array.isArray(snapshot.members)) throw new BadRequestException({ code: "SOURCE_EVIDENCE_MISSING" });

      const sourceMembers = [{ id: randomUUID(), projectId: "", userId: snapshot.ownerId, sourceMemberId: null, name: proposal.owner?.displayName ?? "Chủ nhiệm đề tài", role: "TOPIC_PI", participationRole: "TOPIC_PI", status: "ACTIVE", effectiveFrom: new Date(), effectiveUntil: null, createdById: currentActor.id }, ...snapshot.members.filter((member: AnyRecord) => member.userId !== snapshot.ownerId).map((member: AnyRecord) => ({ id: randomUUID(), projectId: "", userId: member.userId || null, sourceMemberId: member.id ?? null, name: member.name, role: member.role, participationRole: member.participationRole ?? member.role ?? "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(), effectiveUntil: null, createdById: currentActor.id }))];
      const project = await tx.approvedProject.create({ data: {
        proposalId,
        sourceSubmissionEventId: submission.id,
        sourceDecisionId: decision.id,
        hostOrganizationUnitId: proposal.hostOrganizationUnitId,
        title: snapshot.title,
        scopeSnapshot: { title: snapshot.title, objectives: snapshot.objectives, summary: snapshot.summary, researchFieldCode: snapshot.researchFieldCode, proposalTypeCode: snapshot.proposalTypeCode, budgetMetadata: snapshot.budgetMetadata },
        planSnapshot: { startDate: snapshot.startDate, endDate: snapshot.endDate },
        status: PREPARING,
        startDate: snapshot.startDate ? new Date(snapshot.startDate) : null,
        endDate: snapshot.endDate ? new Date(snapshot.endDate) : null,
        createdById: currentActor.id
      } });
      if (sourceMembers.length) await tx.approvedProjectMember.createMany({ data: sourceMembers.map((member: AnyRecord) => ({ ...member, projectId: project.id })) });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.created", fromStatus: null, toStatus: PREPARING, reason: "Tạo từ phiên bản đề xuất đã được phê duyệt", beforeFacts: null, afterFacts: { proposalId, sourceSubmissionEventId: submission.id, sourceDecisionId: decision.id } } });
      await new AuditLogService(tx).record({ action: "create-approved-project", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, reason: JSON.stringify({ proposalId, sourceSubmissionEventId: submission.id, sourceDecisionId: decision.id }) });
      return { id: project.id, proposalId, status: project.status };
    }, { isolationLevel: "Serializable", timeout: 15000 }).catch(async (error: AnyRecord) => {
      const denied = ["P2034", "P2002"].includes(error?.code) ? new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Đề tài đã được tạo hoặc ngữ cảnh đã thay đổi. Vui lòng tải lại." }) : error;
      const evidence = denied as AnyRecord;
      await this.auditLog.record({ action: "create-approved-project", result: "failure", actorId: actor.id, targetEntity: "research-proposal", targetEntityId: proposalId, username: actor.username, reason: evidence?.response?.code ?? evidence?.code ?? "ACTION_NOT_GRANTED" }).catch(() => undefined);
      throw denied;
    });
  }

  async confirmSetup(actor: SafeUserContext, projectId: string, input: AnyRecord = {}) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (project.status !== PREPARING) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài không còn ở trạng thái chuẩn bị triển khai." });
      await this.assertOfficer(tx, currentActor, project);
      const now = await readTransactionClockV1(tx);
      const updated = await tx.approvedProject.update({ where: { id: project.id }, data: { status: EXECUTING, confirmedAt: now, confirmedById: currentActor.id, aggregateVersion: { increment: 1 }, relationshipVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.setup.confirm", fromStatus: PREPARING, toStatus: EXECUTING, reason: input.reason ?? "Xác nhận thiết lập đề tài", beforeFacts: { status: PREPARING }, afterFacts: { status: EXECUTING } } });
      await new AuditLogService(tx).record({ action: "confirm-approved-project-setup", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, beforeFacts: { status: PREPARING }, afterFacts: { status: EXECUTING } });
      const loaded = await this.loadAuthorized(tx, currentActor, updated.id);
      return this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, currentActor);
    });
  }

  async configureSetup(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (project.status !== PREPARING) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      await this.assertOfficer(tx, currentActor, project);
      if (!Array.isArray(input.milestones) || !Array.isArray(input.checkpoints) || input.milestones.length > 100 || input.checkpoints.length > 100) throw new BadRequestException({ message: "Mốc triển khai không hợp lệ." });
      if (project.milestones.length || project.checkpoints.length) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Thiết lập mốc đã được ghi nhận." });
      const milestones = [];
      for (const [position, item] of input.milestones.entries()) {
        const responsibleMember = item?.responsibleMemberId ? project.members.find((member: AnyRecord) => member.id === item.responsibleMemberId && isRelationshipActiveAt(member, new Date())) : null;
        if (item?.responsibleMemberId && !responsibleMember) throw new BadRequestException({ message: "Thành viên phụ trách mốc không hợp lệ." });
        const dueDate = projectDay(item?.dueDate);
        if (project.endDate && dueDate > project.endDate) throw new BadRequestException({ code: "EXTENSION_REQUIRED" });
        const milestone = await tx.projectMilestone.create({ data: { projectId: project.id, title: requiredText(item?.title, "title"), description: optionalText(item?.description ?? null), dueDate, isImportant: item?.isImportant === true, position, responsibleMemberId: responsibleMember?.id ?? null, createdById: currentActor.id } });
        milestones.push(milestone);
      }
      for (const item of input.checkpoints) {
        const milestoneId = item?.milestonePosition === undefined ? null : milestones[item.milestonePosition]?.id;
        if (item?.milestonePosition !== undefined && !milestoneId) throw new BadRequestException({ message: "Mốc liên kết không hợp lệ." });
        await tx.projectCheckpoint.create({ data: { projectId: project.id, milestoneId, title: requiredText(item?.title, "title"), dueDate: projectDay(item?.dueDate) } });
      }
      const now = await readTransactionClockV1(tx);
      await tx.approvedProject.update({ where: { id: project.id }, data: { aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.setup.configure", reason: "Thiết lập mốc thực hiện", afterFacts: { milestones: input.milestones, checkpoints: input.checkpoints } } });
      await new AuditLogService(tx).record({ action: "configure-approved-project", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, afterFacts: { milestones: input.milestones, checkpoints: input.checkpoints } });
      return { milestones, checkpoints: await tx.projectCheckpoint.findMany({ where: { projectId: project.id } }) };
    });
  }

  async listOfficerCandidates(actor: SafeUserContext, projectId: string) {
    const loaded = await this.loadAuthorized(this.prisma, actor, projectId);
    this.assertScope(actor, loaded.project);
    this.assertHead(actor, loaded.project);
    const users = await (this.prisma as any).user.findMany({ where: { status: "active", systemRole: "SCIENTIFIC_MANAGEMENT_STAFF" }, include: { organizationScopes: { include: { organizationUnit: true } } }, orderBy: { displayName: "asc" } });
    const eligible = users.filter((user: any) => user.organizationScopes?.some((scope: any) => scope.organizationUnitId === loaded.project.hostOrganizationUnitId && scope.organizationUnit?.status === "active") && !(loaded.project.members ?? []).some((member: any) => member.userId === user.id && isRelationshipActiveAt(member, new Date())));
    const reviewAccess = new ProposalReviewAccessService(this.prisma);
    const checks = await Promise.all(eligible.map((user: AnyRecord) => reviewAccess.resolveConflictForProposal(user.id, loaded.project.proposalId)));
    return eligible.filter((_: AnyRecord, index: number) => !checks[index].unresolved && !checks[index].isAssignedReviewer && !checks[index].hasPersistedReview).map((user: AnyRecord) => ({ id: user.id, username: user.username, displayName: user.displayName, unit: user.unit }));
  }

  async assignOfficer(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertHead(currentActor, project);
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      const candidate = await tx.user.findUnique({ where: { id: input.officerUserId }, include: { organizationScopes: { include: { organizationUnit: true } } } });
      if (!candidate || candidate.status !== "active" || candidate.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF" || !candidate.organizationScopes?.some((scope: any) => scope.organizationUnitId === project.hostOrganizationUnitId && scope.organizationUnit.status === "active")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chuyên viên được chọn không hoạt động hoặc ngoài phạm vi đề tài." });
      if ((project.members ?? []).some((member: any) => member.userId === candidate.id && isRelationshipActiveAt(member, new Date()))) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Thành viên đề tài không được đồng thời là chuyên viên quản lý." });
      await this.assertNoEvaluationConflict(tx, candidate.id, project.proposalId);
      const now = await readTransactionClockV1(tx);
      const current = await this.currentOfficer(tx, project.id, now);
      if (current) await tx.projectManagementOfficer.update({ where: { id: (current as AnyRecord).id }, data: { status: "ENDED", effectiveUntil: now } });
      const assignment = await tx.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: candidate.id, assignedById: currentActor.id, status: "ACTIVE", effectiveFrom: now, reason: input.reason ?? null, assignmentContextVersion: projectContextVersion(project) } });
      await tx.approvedProject.update({ where: { id: project.id }, data: { relationshipVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.officer.assign", reason: input.reason ?? null, beforeFacts: current ? { officerUserId: current.officerUserId } : { officerUserId: null }, afterFacts: { officerUserId: candidate.id } } });
      await new AuditLogService(tx).record({ action: "assign-project-management-officer", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, reason: input.reason ?? undefined, beforeFacts: current ? { officerUserId: current.officerUserId } : { officerUserId: null }, afterFacts: { officerUserId: candidate.id } });
      return { ...assignment, officer: { id: candidate.id, displayName: candidate.displayName, username: candidate.username } };
    });
  }

  async revokeOfficer(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertHead(currentActor, project);
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      const current = await this.currentOfficer(tx, project.id);
      if (!current) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa có chuyên viên đang phụ trách." });
      const now = await readTransactionClockV1(tx);
      await tx.projectManagementOfficer.update({ where: { id: (current as AnyRecord).id }, data: { status: "REVOKED", effectiveUntil: now, reason: input.reason } });
      await tx.approvedProject.update({ where: { id: project.id }, data: { relationshipVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.officer.revoke", reason: input.reason, beforeFacts: { officerUserId: current.officerUserId }, afterFacts: { officerUserId: null } } });
      await new AuditLogService(tx).record({ action: "revoke-project-management-officer", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, reason: input.reason, beforeFacts: { officerUserId: current.officerUserId }, afterFacts: { officerUserId: null } });
      return { ...current, status: "REVOKED", effectiveUntil: now };
    });
  }

  private assertProjectPi(actor: SafeUserContext, project: AnyRecord, requireExecution = true) {
    this.assertScope(actor, project);
    const member = (project.members ?? []).find((item: AnyRecord) => item.userId === actor.id && item.participationRole === "TOPIC_PI" && isRelationshipActiveAt(item, new Date()));
    if (!member) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ PI hiện hành của đề tài được thực hiện thao tác này." });
    if (requireExecution && project.status !== EXECUTING) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa ở trạng thái thực hiện." });
  }

  private async nextReportRevision(tx: any, projectId: string) {
    const latest = await tx.projectReportRevision.findFirst({ where: { projectId }, orderBy: { revision: "desc" } });
    return (latest?.revision ?? 0) + 1;
  }

  private async findReport(tx: any, project: AnyRecord, reportId: string) {
    const report = await tx.projectReportRevision.findUnique({ where: { id: reportId }, include: { evidence: { include: { fileRecord: true } }, checkpoint: true } });
    if (!report || report.projectId !== project.id) throw new NotFoundException({ message: "Không tìm thấy phiên bản báo cáo của đề tài." });
    return report;
  }

  private assertReportPeriod(project: AnyRecord, checkpointId: string | null, start: Date | null, end: Date | null, currentId?: string) {
    if (!(start instanceof Date) || !(end instanceof Date) || end < start || (project.startDate && start < project.startDate) || (project.endDate && end > project.endDate)) throw new BadRequestException({ code: "REPORT_PERIOD_INVALID", message: "Kỳ báo cáo phải nằm trong thời gian đề tài." });
    if (project.reports.some((item: AnyRecord) => item.id !== currentId && item.checkpointId === checkpointId && ![REPORT_SUPPLEMENT].includes(item.status) && item.reportingPeriodStart && item.reportingPeriodEnd && start <= item.reportingPeriodEnd && end >= item.reportingPeriodStart)) throw new ConflictException({ code: "REPORT_PERIOD_OVERLAP", message: "Kỳ báo cáo trùng với phiên bản đang xử lý." });
  }

  private async assertUsableEvidence(tx: any, projectId: string, fileIds: string[] | undefined, expectedEntityId?: string) {
    if (!fileIds?.length) return [];
    const files = await tx.fileRecord.findMany({ where: { id: { in: fileIds }, status: "active", deletedAt: null } });
    if (files.length !== fileIds.length) throw new BadRequestException({ code: "EVIDENCE_UNUSABLE", message: "Tệp minh chứng không tồn tại, đã xóa hoặc chưa hoàn tất." });
    if (files.some((file: AnyRecord) => file.relatedEntityType !== "approved_project" || file.relatedEntityId !== projectId)) throw new BadRequestException({ code: "EVIDENCE_WRONG_RECORD", message: "Tệp minh chứng không thuộc đúng đề tài." });
    return files;
  }

  async createReportDraft(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      if (input.deadline) throw new BadRequestException({ code: "CONTROLLED_FIELD_DENIED" });
      let checkpoint: AnyRecord | null = null;
      if (input.checkpointId) {
        checkpoint = await tx.projectCheckpoint.findUnique({ where: { id: input.checkpointId } });
        if (!checkpoint || checkpoint.projectId !== project.id || checkpoint.status !== "open") throw new BadRequestException({ message: "Mốc báo cáo không còn mở trong đề tài." });
      }
      this.assertReportPeriod(project, checkpoint?.id ?? null, input.reportingPeriodStart, input.reportingPeriodEnd);
      const now = await readTransactionClockV1(tx);
      const report = await tx.projectReportRevision.create({ data: {
        projectId: project.id, checkpointId: input.checkpointId ?? null, revision: await this.nextReportRevision(tx, project.id), status: REPORT_DRAFT,
        reportingPeriodStart: input.reportingPeriodStart, reportingPeriodEnd: input.reportingPeriodEnd, deadline: checkpoint?.dueDate ?? project.endDate,
        progressResults: input.progressResults ?? "", issuesRecommendations: input.issuesRecommendations ?? null, milestoneContext: input.milestoneContext ?? null,
        authorId: currentActor.id, createdAt: now
      } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.draft", toStatus: REPORT_DRAFT, reason: "Tạo bản nháp báo cáo", afterFacts: { reportId: report.id, revision: report.revision } } });
      await new AuditLogService(tx).record({ action: "draft-project-report", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: report.id, username: currentActor.username });
      return report;
    });
  }

  async updateReportDraft(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (input.deadline) throw new BadRequestException({ code: "CONTROLLED_FIELD_DENIED" });
      if (report.authorId !== currentActor.id) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ tác giả PI được sửa báo cáo." });
      if (![REPORT_DRAFT, REPORT_SUPPLEMENT].includes(report.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Bản báo cáo đã nộp được giữ nguyên; hãy tạo phiên bản mới sau khi yêu cầu bổ sung." });
      const checkpointId = input.checkpointId ?? report.checkpointId;
      if (checkpointId) {
        const checkpoint = await tx.projectCheckpoint.findUnique({ where: { id: checkpointId } });
        if (!checkpoint || checkpoint.projectId !== project.id || checkpoint.status !== "open") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      }
      this.assertReportPeriod(project, checkpointId, input.reportingPeriodStart ?? report.reportingPeriodStart, input.reportingPeriodEnd ?? report.reportingPeriodEnd, report.id);
      const now = await readTransactionClockV1(tx);
      const next = report.status === REPORT_SUPPLEMENT
        ? await tx.projectReportRevision.create({ data: { projectId: project.id, checkpointId, revision: await this.nextReportRevision(tx, project.id), status: REPORT_DRAFT, reportingPeriodStart: input.reportingPeriodStart ?? report.reportingPeriodStart, reportingPeriodEnd: input.reportingPeriodEnd ?? report.reportingPeriodEnd, deadline: report.deadline, progressResults: input.progressResults ?? report.progressResults, issuesRecommendations: input.issuesRecommendations ?? report.issuesRecommendations, milestoneContext: input.milestoneContext ?? report.milestoneContext, authorId: currentActor.id, createdAt: now } })
        : await tx.projectReportRevision.update({ where: { id: report.id }, data: { checkpointId, reportingPeriodStart: input.reportingPeriodStart ?? report.reportingPeriodStart, reportingPeriodEnd: input.reportingPeriodEnd ?? report.reportingPeriodEnd, progressResults: input.progressResults ?? report.progressResults, issuesRecommendations: input.issuesRecommendations ?? report.issuesRecommendations, milestoneContext: input.milestoneContext ?? report.milestoneContext } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.edit-draft", reason: report.status === REPORT_SUPPLEMENT ? "Tạo phiên bản báo cáo sửa theo yêu cầu bổ sung" : "Cập nhật bản nháp báo cáo", afterFacts: { reportId: next.id, revision: next.revision } } });
      return next;
    });
  }

  async submitReport(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (report.authorId !== currentActor.id || report.status !== REPORT_DRAFT) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ bản nháp của PI mới được nộp." });
      if (report.checkpointId && report.checkpoint?.status !== "open") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Mốc báo cáo đã đóng." });
      this.assertReportPeriod(project, report.checkpointId, report.reportingPeriodStart, report.reportingPeriodEnd, report.id);
      const fileIds = Array.isArray(input.evidenceFileIds) ? input.evidenceFileIds : [];
      const files = await this.assertUsableEvidence(tx, project.id, fileIds, report.id);
      const now = await readTransactionClockV1(tx);
      const updated = await tx.projectReportRevision.update({ where: { id: report.id }, data: { status: REPORT_SUBMITTED, submittedAt: now, submittedContextVersion: projectContextVersion(project) } });
      if (files.length) await tx.projectReportEvidence.createMany({ data: files.map((file: AnyRecord) => ({ reportRevisionId: report.id, fileRecordId: file.id })) });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.submit", toStatus: REPORT_SUBMITTED, reason: "PI nộp báo cáo", afterFacts: { reportId: report.id, revision: report.revision, evidenceFileIds: files.map((file: AnyRecord) => file.id) } } });
      await new AuditLogService(tx).record({ action: "submit-project-report", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: report.id, username: currentActor.username, afterFacts: { status: REPORT_SUBMITTED, revision: report.revision, evidenceFileIds: files.map((file: AnyRecord) => file.id) } });
      return updated;
    });
  }

  async reviewReport(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (report.status !== REPORT_SUBMITTED) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Báo cáo chưa ở trạng thái chờ xem xét." });
      const now = await readTransactionClockV1(tx);
      const updated = await tx.projectReportRevision.update({ where: { id: report.id }, data: { status: REPORT_UNDER_REVIEW, reviewedById: currentActor.id } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.review", fromStatus: REPORT_SUBMITTED, toStatus: REPORT_UNDER_REVIEW, reason: input.reason ?? "Bắt đầu xem xét báo cáo", afterFacts: { reportId: report.id } } });
      await new AuditLogService(tx).record({ action: "review-project-report", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: report.id, username: currentActor.username, afterFacts: { status: REPORT_UNDER_REVIEW } });
      return updated;
    });
  }

  async requestReportSupplement(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (![REPORT_SUBMITTED, REPORT_UNDER_REVIEW].includes(report.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Báo cáo không còn ở bước yêu cầu bổ sung." });
      if (!input.reason || !input.responseDeadline) throw new BadRequestException({ message: "Cần lý do và hạn bổ sung." });
      const now = await readTransactionClockV1(tx);
      if (new Date(input.responseDeadline).getTime() <= now.getTime()) throw new BadRequestException({ code: "DEADLINE_INVALID", message: "Hạn bổ sung phải ở tương lai." });
      const updated = await tx.projectReportRevision.update({ where: { id: report.id }, data: { status: REPORT_SUPPLEMENT, reviewedById: currentActor.id, reviewReason: input.reason, responseDeadline: input.responseDeadline ?? null } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.request-supplement", fromStatus: report.status, toStatus: REPORT_SUPPLEMENT, reason: input.reason, afterFacts: { reportId: report.id, responseDeadline: input.responseDeadline ?? null } } });
      await new AuditLogService(tx).record({ action: "request-project-report-supplement", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: report.id, username: currentActor.username, reason: input.reason, afterFacts: { status: REPORT_SUPPLEMENT, responseDeadline: input.responseDeadline ?? null } });
      return updated;
    });
  }

  async acceptReport(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (report.status !== REPORT_UNDER_REVIEW) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Báo cáo phải được xem xét trước khi chấp nhận." });
      const updated = await tx.projectReportRevision.update({ where: { id: report.id }, data: { status: REPORT_ACCEPTED, reviewedById: currentActor.id, reviewReason: input.reason ?? null } });
      if (report.checkpointId) {
        await tx.projectCheckpoint.update({ where: { id: report.checkpointId }, data: { status: "completed" } });
        const checkpoint = await tx.projectCheckpoint.findUnique({ where: { id: report.checkpointId } });
        if (checkpoint?.milestoneId) {
          const remaining = await tx.projectCheckpoint.count({ where: { projectId: project.id, milestoneId: checkpoint.milestoneId, status: { not: "completed" } } });
          if (remaining === 0) await tx.projectMilestone.update({ where: { id: checkpoint.milestoneId }, data: { status: "completed" } });
        }
        await tx.approvedProject.update({ where: { id: project.id }, data: { aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: await readTransactionClockV1(tx) } });
      }
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.accept", fromStatus: REPORT_UNDER_REVIEW, toStatus: REPORT_ACCEPTED, reason: input.reason ?? "Chấp nhận báo cáo hành chính", afterFacts: { reportId: report.id } } });
      await new AuditLogService(tx).record({ action: "accept-project-report", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: report.id, username: currentActor.username, reason: input.reason ?? undefined, afterFacts: { status: REPORT_ACCEPTED } });
      return updated;
    });
  }

  private assertAdjustmentValues(values: AnyRecord) {
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    const forbidden = ["endDate", "end_date", "requestedEndDate", "requested_end_date", "duration", "durationDays"];
    if (forbidden.some((key) => Object.prototype.hasOwnProperty.call(values, key))) throw new BadRequestException({ code: "EXTENSION_REQUIRED", message: "Tăng thời hạn hoặc ngày kết thúc phải dùng quy trình gia hạn." });
    const allowed = ["milestoneChanges", "scope", "plan", "membershipChanges"];
    if (Object.keys(values).some((key) => !allowed.includes(key))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED", message: "Điều chỉnh chỉ được thay đổi mốc quan trọng, phạm vi/kế hoạch hoặc thành viên được quản trị." });
    if (!Object.keys(values).length || [values.scope, values.plan].some((value) => value !== undefined && (!value || typeof value !== "object" || Array.isArray(value)))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    if (values.plan && (Object.keys(values.plan).some((key) => !["methodology", "activities"].includes(key)) || (values.plan.methodology !== undefined && (typeof values.plan.methodology !== "string" || values.plan.methodology.length > 10000)) || (values.plan.activities !== undefined && (!Array.isArray(values.plan.activities) || values.plan.activities.length > 100 || values.plan.activities.some((item: unknown) => typeof item !== "string" || !item.trim() || item.length > 1000))))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    if (values.scope && Object.keys(values.scope).some((key) => !["title", "objectives", "summary", "researchFieldCode", "proposalTypeCode"].includes(key))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    if (values.milestoneChanges !== undefined && (!Array.isArray(values.milestoneChanges) || !values.milestoneChanges.length)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    if (values.membershipChanges !== undefined && (!Array.isArray(values.membershipChanges) || !values.membershipChanges.length)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    for (const change of values.milestoneChanges ?? []) {
      if (!change || typeof change !== "object" || Array.isArray(change) || typeof change.id !== "string" || Object.keys(change).some((key) => !["id", "title", "description", "dueDate", "responsibleMemberId"].includes(key))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
      if (change.dueDate !== undefined) projectDay(change.dueDate);
      if (change.title !== undefined) requiredText(change.title, "title");
    }
    for (const change of values.membershipChanges ?? []) {
      if (!change || typeof change !== "object" || Array.isArray(change) || (change.action === "add" ? Object.keys(change).some((key) => !["action", "userId", "name", "participationRole"].includes(key)) || typeof change.userId !== "string" || !["TOPIC_MEMBER", "TOPIC_SECRETARY"].includes(change.participationRole) : change.action === "end" ? Object.keys(change).some((key) => !["action", "memberId"].includes(key)) || typeof change.memberId !== "string" : true)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    }
  }

  private assertExtensionValues(project: AnyRecord, values: AnyRecord) {
    if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some((key) => key !== "requestedEndDate") || !project.endDate) throw new BadRequestException({ code: "EXTENSION_DATE_INVALID" });
    const raw = values.requestedEndDate ?? values.requested_end_date ?? values.endDate ?? values.end_date;
    const requested = projectDay(raw);
    if (Number.isNaN(requested.valueOf()) || (project.endDate && requested.getTime() <= new Date(project.endDate).getTime())) throw new BadRequestException({ code: "EXTENSION_DATE_INVALID", message: "Ngày kết thúc gia hạn phải sau ngày kết thúc hiện tại." });
    return requested;
  }

  private async createRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      if (project.requests.some((request: AnyRecord) => !["approved", "rejected"].includes(request.status))) throw new ConflictException({ code: "REQUEST_ALREADY_OPEN", message: "Đề tài đã có yêu cầu thay đổi chưa kết thúc." });
      const currentValues = requestType === EXTENSION ? { endDate: project.endDate } : { scope: project.scopeSnapshot, plan: project.planSnapshot, milestones: project.milestones, members: (project.members ?? []).map((member: AnyRecord) => ({ id: member.id, userId: member.userId, name: member.name, role: member.role, participationRole: member.participationRole, status: member.status })) };
      const proposedValues = input.proposedValues as AnyRecord;
      if (!proposedValues || typeof proposedValues !== "object" || Array.isArray(proposedValues)) throw new BadRequestException({ message: "proposedValues không hợp lệ." });
      if (requestType === ADJUSTMENT) this.assertAdjustmentValues(proposedValues);
      else this.assertExtensionValues(project, proposedValues);
      const now = await readTransactionClockV1(tx);
      const request = await tx.projectRequest.create({ data: { projectId: project.id, requestType, status: "draft", revision: 1, requesterId: currentActor.id, currentValues, proposedValues, reason: input.reason, submittedContextVersion: projectContextVersion(project), appraisal: null } });
      const revision = await tx.projectRequestRevision.create({ data: { requestId: request.id, revision: 1, status: "draft", currentValues, proposedValues, reason: input.reason, createdById: currentActor.id, createdAt: now } });
      await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: currentActor.id, action: `project.${requestType}.create`, toStatus: "draft", reason: input.reason, afterFacts: { revision: 1, proposedValues } } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.${requestType}.create`, reason: input.reason, requestId: request.id, afterFacts: { requestId: request.id, revision: 1 } } });
      await new AuditLogService(tx).record({ action: `create-project-${requestType}`, result: "success", actorId: currentActor.id, targetEntity: "project-request", targetEntityId: request.id, username: currentActor.username, reason: input.reason });
      return { ...request, revisions: [revision] };
    });
  }

  async createAdjustment(actor: SafeUserContext, projectId: string, input: AnyRecord) { return this.createRequest(actor, projectId, ADJUSTMENT, input); }
  async createExtension(actor: SafeUserContext, projectId: string, input: AnyRecord) { return this.createRequest(actor, projectId, EXTENSION, input); }

  private async findRequest(tx: any, project: AnyRecord, requestId: string) {
    const request = await tx.projectRequest.findUnique({ where: { id: requestId }, include: { revisions: { orderBy: { revision: "desc" } }, evidence: true } });
    if (!request || request.projectId !== project.id) throw new NotFoundException({ message: "Không tìm thấy yêu cầu của đề tài." });
    return request;
  }

  async editRequestDraft(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType || request.requesterId !== currentActor.id || !["draft", "supplement_requested"].includes(request.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Yêu cầu không còn là bản nháp của PI." });
      const proposedValues = input.proposedValues as AnyRecord;
      if (requestType === ADJUSTMENT) this.assertAdjustmentValues(proposedValues); else this.assertExtensionValues(project, proposedValues);
      const currentValues = request.currentValues;
      const nextRevision = request.revision + 1;
      const now = await readTransactionClockV1(tx);
      const revision = await tx.projectRequestRevision.create({ data: { requestId: request.id, revision: nextRevision, status: "draft", currentValues, proposedValues, reason: input.reason, createdById: currentActor.id, createdAt: now } });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "draft", revision: nextRevision, currentValues, proposedValues, reason: input.reason, submittedContextVersion: projectContextVersion(project), appraisal: null, preparedById: null, preparedAt: null, responseDeadline: null } });
      await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: currentActor.id, action: `project.${requestType}.edit-draft`, fromStatus: request.status, toStatus: "draft", reason: input.reason, afterFacts: { revision: nextRevision } } });
      return { ...updated, revisions: [revision] };
    });
  }

  async submitRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType || request.requesterId !== currentActor.id || request.status !== "draft") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ bản nháp của PI mới được nộp." });
      const draftContext = request.submittedContextVersion as AnyRecord | null;
      if (!draftContext || draftContext.aggregateVersion !== project.aggregateVersion || draftContext.relationshipVersion !== project.relationshipVersion) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Đề tài đã thay đổi từ khi tạo bản nháp. Vui lòng tạo yêu cầu mới." });
      const values = request.proposedValues as AnyRecord;
      if (requestType === ADJUSTMENT) this.assertAdjustmentValues(values); else this.assertExtensionValues(project, values);
      const now = await readTransactionClockV1(tx);
      const nextStatus = "submitted";
      const revision = await tx.projectRequestRevision.update({ where: { requestId_revision: { requestId: request.id, revision: request.revision } }, data: { status: "submitted", submittedAt: now, contextVersion: projectContextVersion(project) } });
      const files = await this.assertUsableEvidence(tx, project.id, input.evidenceFileIds, request.id);
      if (files.length) await tx.projectRequestEvidence.createMany({ data: files.map((file: AnyRecord) => ({ requestId: request.id, requestRevisionId: revision.id, fileRecordId: file.id })) });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: nextStatus, submittedContextVersion: projectContextVersion(project) } });
      await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: currentActor.id, action: `project.${requestType}.submit`, fromStatus: "draft", toStatus: nextStatus, reason: request.reason, afterFacts: { revision: request.revision, contextVersion: projectContextVersion(project) } } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.${requestType}.submit`, fromStatus: "draft", toStatus: nextStatus, requestId: request.id, afterFacts: { revision: request.revision } } });
      await new AuditLogService(tx).record({ action: `submit-project-${requestType}`, result: "success", actorId: currentActor.id, targetEntity: "project-request", targetEntityId: request.id, username: currentActor.username, afterFacts: { status: nextStatus, revision: request.revision } });
      return { ...updated, revisionRecord: revision };
    });
  }

  async reviewAdjustment(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== ADJUSTMENT || request.status !== "submitted") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "under_staff_review" } });
      await this.recordRequestAction(tx, currentActor, project, request, "review", "under_staff_review", { reason: input.reason ?? null });
      return updated;
    });
  }

  async validateExtension(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== EXTENSION || request.status !== "submitted") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      this.assertExtensionValues(project, request.proposedValues);
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "under_staff_validation" } });
      await this.recordRequestAction(tx, currentActor, project, request, "validate", "under_staff_validation", { reason: input.reason ?? null });
      return updated;
    });
  }

  async requestSupplement(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (requestType === ADJUSTMENT || request.status !== "ready_for_head_decision") await this.assertOfficer(tx, currentActor, project);
      else { this.assertHead(currentActor, project); await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId); }
      const allowed = requestType === ADJUSTMENT ? ["submitted", "under_staff_review"] : ["submitted", "under_staff_validation", "ready_for_head_decision"];
      if (!allowed.includes(request.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (!input.reason || !input.responseDeadline) throw new BadRequestException({ message: "Cần lý do và hạn bổ sung." });
      if (new Date(input.responseDeadline).getTime() <= (await readTransactionClockV1(tx)).getTime()) throw new BadRequestException({ code: "DEADLINE_INVALID", message: "Hạn bổ sung phải ở tương lai." });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "supplement_requested", decisionNote: input.reason, responseDeadline: input.responseDeadline } });
      await this.recordRequestAction(tx, currentActor, project, request, "request-supplement", "supplement_requested", { reason: input.reason, responseDeadline: input.responseDeadline });
      return updated;
    });
  }

  async prepareExtension(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== EXTENSION || request.status !== "under_staff_validation") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      this.assertExtensionValues(project, request.proposedValues);
      const now = await readTransactionClockV1(tx);
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "ready_for_head_decision", preparedById: currentActor.id, preparedAt: now, appraisal: { validationNote: input.note ?? "Đã kiểm tra hành chính" } } });
      await this.recordRequestAction(tx, currentActor, project, request, "prepare", "ready_for_head_decision", { note: input.note ?? null });
      return updated;
    });
  }

  async decideRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, decision: "approve" | "reject", input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      const request = await this.findRequest(tx, project, input.requestId);
      const required = requestType === ADJUSTMENT ? "under_staff_review" : "ready_for_head_decision";
      if (request.requestType !== requestType || request.status !== required) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (requestType === ADJUSTMENT) await this.assertOfficer(tx, currentActor, project);
      else {
        this.assertHead(currentActor, project);
        await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
        if (!request.preparedById || !request.preparedAt) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      }
      if (request.requesterId === currentActor.id || this.activeMember(project, currentActor.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
      if (decision === "reject" && !input.reason) throw new BadRequestException({ message: "Cần lý do từ chối." });
      const submitted = request.revisions.find((revision: AnyRecord) => revision.revision === request.revision);
      if (!submitted || submitted.status !== "submitted") throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" });
      const expected = request.submittedContextVersion as AnyRecord;
      if (!expected || expected.aggregateVersion !== project.aggregateVersion || expected.relationshipVersion !== project.relationshipVersion) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" });
      const nextValues = submitted.proposedValues as AnyRecord;
      const next = requestType === ADJUSTMENT ? this.adjustmentUpdate(project, nextValues) : { endDate: this.assertExtensionValues(project, nextValues) };
      const now = await readTransactionClockV1(tx);
      if (decision === "approve") {
        if (requestType === ADJUSTMENT) await this.applyAdjustmentChanges(tx, currentActor, project, nextValues, now);
        await tx.approvedProject.update({ where: { id: project.id }, data: { ...next, aggregateVersion: { increment: 1 }, ...(requestType === ADJUSTMENT && nextValues.membershipChanges ? { relationshipVersion: { increment: 1 } } : {}), authorizationContextUpdatedAt: now } });
      }
      const status = decision === "approve" ? "approved" : "rejected";
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status, decisionById: currentActor.id, decidedAt: now, decisionNote: input.reason ?? input.note ?? null } });
      await this.recordRequestAction(tx, currentActor, project, request, decision, status, { before: request.currentValues, after: decision === "approve" ? nextValues : null, reason: input.reason ?? input.note ?? null });
      return updated;
    });
  }

  private adjustmentUpdate(project: AnyRecord, values: AnyRecord) {
    this.assertAdjustmentValues(values);
    const update: AnyRecord = {};
    if (values.scope) {
      update.scopeSnapshot = { ...project.scopeSnapshot, ...values.scope };
      if (values.scope.title !== undefined) update.title = requiredText(values.scope.title, "title");
    }
    if (values.plan) update.planSnapshot = { ...(project.planSnapshot ?? {}), ...values.plan };
    return update;
  }

  private async applyAdjustmentChanges(tx: any, actor: SafeUserContext, project: AnyRecord, values: AnyRecord, now: Date) {
    for (const change of values.milestoneChanges ?? []) {
      if (!change || typeof change !== "object" || Array.isArray(change) || !change.id || Object.keys(change).some((key) => !["id", "title", "description", "dueDate", "responsibleMemberId"].includes(key))) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
      const milestone = project.milestones.find((item: AnyRecord) => item.id === change.id && item.isImportant);
      if (!milestone) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED", message: "Mốc quan trọng không thuộc đề tài." });
      const data: AnyRecord = {};
      if (change.title !== undefined) data.title = requiredText(change.title, "title");
      if (change.description !== undefined) data.description = optionalText(change.description);
      if (change.responsibleMemberId !== undefined) {
        const member = project.members.find((item: AnyRecord) => item.id === change.responsibleMemberId && isRelationshipActiveAt(item, now));
        if (!member) throw new BadRequestException({ code: "MEMBER_INELIGIBLE" });
        data.responsibleMemberId = member.id;
      }
      if (change.dueDate !== undefined) {
        data.dueDate = projectDay(change.dueDate);
        if (project.endDate && data.dueDate > project.endDate) throw new BadRequestException({ code: "EXTENSION_REQUIRED", message: "Mốc vượt ngày kết thúc đề tài; cần gia hạn trước." });
      }
      if (!Object.keys(data).length) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
      await tx.projectMilestone.update({ where: { id: milestone.id }, data });
    }
    for (const change of values.membershipChanges ?? []) {
      if (!change || typeof change !== "object" || Array.isArray(change)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
      if (change.action === "end" && Object.keys(change).every((key) => ["action", "memberId"].includes(key))) {
        const member = project.members.find((item: AnyRecord) => item.id === change.memberId && item.participationRole !== "TOPIC_PI" && isRelationshipActiveAt(item, now));
        if (!member) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
        if (project.milestones.some((item: AnyRecord) => item.responsibleMemberId === member.id && item.status !== "completed")) throw new BadRequestException({ code: "MEMBER_RESPONSIBILITY_ACTIVE", message: "Cần chuyển trách nhiệm mốc trước khi kết thúc thành viên." });
        await tx.approvedProjectMember.update({ where: { id: member.id }, data: { status: "ENDED", effectiveUntil: now } });
      } else if (change.action === "add" && Object.keys(change).every((key) => ["action", "userId", "name", "participationRole"].includes(key))) {
        if (!["TOPIC_MEMBER", "TOPIC_SECRETARY"].includes(change.participationRole)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
        const user = await tx.user.findUnique({ where: { id: change.userId }, include: { organizationScopes: true } });
        if (!user || user.status !== "active" || !user.organizationScopes.some((scope: AnyRecord) => scope.organizationUnitId === project.hostOrganizationUnitId)) throw new BadRequestException({ code: "MEMBER_INELIGIBLE" });
        if (project.members.some((item: AnyRecord) => item.userId === user.id && isRelationshipActiveAt(item, now)) || (await this.currentOfficer(tx, project.id, now))?.officerUserId === user.id) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
        await this.assertNoEvaluationConflict(tx, user.id, project.proposalId);
        await tx.approvedProjectMember.create({ data: { projectId: project.id, userId: user.id, name: requiredText(change.name, "name"), role: change.participationRole, participationRole: change.participationRole, status: "ACTIVE", effectiveFrom: now, createdById: actor.id } });
      } else throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    }
  }

  private assertHead(actor: SafeUserContext, project: AnyRecord) {
    this.assertScope(actor, project);
    if (!isScientificManagementHead(actor) || this.activeMember(project, actor.id)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
  }

  private activeMember(project: AnyRecord, actorId: string) {
    return (project.members ?? []).some((member: AnyRecord) => member.userId === actorId && isRelationshipActiveAt(member, new Date()));
  }

  private async recordRequestAction(tx: any, actor: SafeUserContext, project: AnyRecord, request: AnyRecord, action: string, toStatus: string, facts: AnyRecord) {
    const name = `project.${request.requestType}.${action}`;
    await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: actor.id, action: name, fromStatus: request.status, toStatus, reason: facts.reason ?? facts.note ?? null, beforeFacts: { status: request.status }, afterFacts: facts } });
    await tx.projectHistory.create({ data: { projectId: project.id, actorId: actor.id, action: name, requestId: request.id, fromStatus: request.status, toStatus, reason: facts.reason ?? facts.note ?? null, beforeFacts: facts.before ?? null, afterFacts: facts.after ?? facts } });
    await new AuditLogService(tx).record({ action: name, result: "success", actorId: actor.id, targetEntity: "project-request", targetEntityId: request.id, username: actor.username, reason: facts.reason ?? facts.note ?? undefined, beforeFacts: facts.before ?? { status: request.status }, afterFacts: facts.after ?? { status: toStatus } });
  }
}

function assertProjectContext(expected: unknown, project: AnyRecord) {
  const current = projectContextVersion(project as any);
  if (!expected || typeof expected !== "object" || Object.entries(current).some(([key, value]) => (expected as AnyRecord)[key] !== value)) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" });
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 1000) throw new BadRequestException({ message: `${field} không hợp lệ.` });
  return value.trim();
}

function optionalText(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 5000) throw new BadRequestException({ message: "Nội dung không hợp lệ." });
  return value.trim() || null;
}

function projectDay(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException({ message: "Ngày không hợp lệ." });
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException({ message: "Ngày không hợp lệ." });
  return date;
}
