import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { APPROVAL_SIGNERS, APPROVAL_STAGE_LABELS, cancelPendingApprovals, canSignApproval, closeApprovalSubmission, openApprovalSubmission, type ApprovalKind } from "../proposals-shared/approval-routing.js";
import { getOrganizationScopeIds, isLeadership, isResearchBoardHead, isResearchOversightAuthority, isResearchManagementHead, isResearchManagementStaff, isScienceDeputyDirector } from "../proposals-shared/proposal-access.js";
import { isRelationshipActiveAt } from "../proposals-shared/proposal-participation.js";
import { PARTICIPANT_POLICY_ROLE_LABELS, participantPolicyFor, readParticipantPolicy } from "../proposals-shared/participant-policy.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { recordParticipantWaiver } from "../proposal-evaluations/proposal-evaluation-support.js";
import { assertProposalContext, isSerializationFailure } from "../proposals-shared/proposal-mutation.js";
import { FUNDING_KINDS, assertFundingInvariant, fundingTotals, latestFunding, readApprovedBudget, readFundingAmount } from "./project-funding.js";
import { notifyUsers } from "../notifications/notification-events.js";
import { canFormCouncil, readCouncilFormationConfig } from "../proposals-shared/council-formation.js";
import { projectContextVersion, projectViewerAuthorizationV1, PROJECT_STATUSES, TERMINAL_REQUEST_STATUSES, type ProjectOfficerFact } from "./project-capability-v1.js";

const PREPARING = PROJECT_STATUSES.preparing;
const EXECUTING = PROJECT_STATUSES.executing;
const REPORT_DRAFT = "draft";
const REPORT_SUBMITTED = "submitted";
const REPORT_UNDER_REVIEW = "under_review";
const REPORT_SUPPLEMENT = "supplement_requested";
const REPORT_ACCEPTED = "accepted";
const REPORT_SUPERSEDED = "superseded";
const ADJUSTMENT = "adjustment";
const EXTENSION = "extension";
const REQUEST_KIND: Record<string, ApprovalKind> = { [ADJUSTMENT]: "PROJECT_ADJUSTMENT", [EXTENSION]: "PROJECT_EXTENSION" };
// Bước CV thẩm định của từng loại; yêu cầu bị trả lại quay về đây (khớp `revertProjectRequest`).
const APPRAISAL_STATUS: Record<string, string> = { [ADJUSTMENT]: "under_staff_review", [EXTENSION]: "under_staff_validation" };
// Đã trình = có tờ trình PENDING; bước TB/TP/BGĐ đọc từ tờ trình, không đặt tên trạng thái mới.
const SUBMITTED_FOR_SIGNATURE = "ready_for_head_decision";
export const SKIP_CONTEXT = Symbol("skip-context");
const LIQUIDATABLE = [PROJECT_STATUSES.accepted, PROJECT_STATUSES.failed];

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
  history: { orderBy: { createdAt: "desc" } },
  liquidations: { orderBy: { createdAt: "desc" } },
  ethicsDossier: { select: { id: true, status: true, version: true, submittedAt: true } },
  acceptanceDossier: { select: { id: true, status: true, version: true, submittedAt: true } },
  acceptanceCouncilMembers: { include: { user: { select: { id: true, displayName: true, username: true, unit: true, status: true } } }, orderBy: { invitedAt: "asc" } }
};

@Injectable()
export class ApprovedProjectsService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  mutate<T>(actor: SafeUserContext, projectId: string, expected: unknown | typeof SKIP_CONTEXT, work: (tx: any, currentActor: SafeUserContext, project: AnyRecord) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
      const currentActor = await this.readCurrentActor(tx, actor.id);
      await tx.$queryRaw`SELECT id FROM approved_projects WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.approvedProject.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
      if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài đã được duyệt." });
      if (expected !== SKIP_CONTEXT) assertProjectContext(expected, project);
      return work(tx, currentActor, project);
    }, { isolationLevel: "Serializable", timeout: 15000 }).catch(async (error: AnyRecord) => {
      const denied = isSerializationFailure(error) || error?.code === "P2002" ? new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" }) : error;
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

  async currentOfficer(tx: any, projectId: string, asOf = new Date()): Promise<ProjectOfficerFact | null> {
    const rows = await tx.projectManagementOfficer.findMany({ where: { projectId, status: "ACTIVE" }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] });
    const active = rows.filter((row: any) => isRelationshipActiveAt(row, asOf));
    if (active.length > 1) throw new ConflictException({ code: "CONTEXT_AMBIGUOUS", message: "Phân công chuyên viên của đề tài không rõ ràng." });
    return active[0] ?? null;
  }

  async assertOfficer(tx: any, actor: SafeUserContext, project: AnyRecord, operation: string) {
    this.assertScope(actor, project);
    await this.assertNotMemberUnlessManaging(tx, actor, project, operation);
    await this.assertNoEvaluationConflict(tx, actor.id, project.proposalId);
    const officer = await this.currentOfficer(tx, project.id);
    if (isResearchManagementStaff(actor) && officer?.officerUserId === actor.id) return officer;
    throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Bạn chưa được phân công quản lý đề tài này." });
  }

  /** D-041 phần 2: thành viên đề tài bị chặn thao tác quản lý, trừ khi vai trò bật "Phụ trách" (ghi audit khi có `operation`). */
  private async assertNotMemberUnlessManaging(tx: any, actor: SafeUserContext, project: AnyRecord, operation?: string) {
    if (!this.activeMember(project, actor.id)) return;
    if (!(await this.participantManage(tx, actor))) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
    if (operation) await recordParticipantWaiver(tx, actor, { entity: "approved-project", id: project.id }, operation);
  }

  private async participantManage(tx: any, actor: { systemRole?: string | null }) {
    return participantPolicyFor(actor, await readParticipantPolicy(tx)).manage;
  }

  async assertNoEvaluationConflict(tx: any, userId: string, proposalId: string) {
    const conflict = await new ProposalReviewAccessService(tx).resolveConflictForProposal(userId, proposalId);
    if (conflict.unresolved) throw new ConflictException({ code: "CONTEXT_UNRESOLVED" });
    if (conflict.isAssignedReviewer || conflict.hasPersistedReview) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
  }

  /**
   * Story 6.9, chỉ cho đường hội đồng nghiệm thu (người không có `project.read`): `dossierReader` mở khi có `acceptance-dossier.read`
   * (thành viên đã nhận lời của hội đồng đã thành lập); `councilSeat` mở khi người xem có ghế hội đồng chưa thu hồi.
   */
  async loadAuthorized(tx: any, actor: SafeUserContext, projectId: string, options: { dossierReader?: boolean; councilSeat?: boolean } = {}) {
    const project = await tx.approvedProject.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
    if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài đã được duyệt." });
    const officer = await this.currentOfficer(tx, projectId);
    const actorMember = (project.members ?? []).find((member: any) => member.userId === actor.id && isRelationshipActiveAt(member, new Date()));
    const projectPi = (project.members ?? []).find((member: any) => member.participationRole === "TOPIC_PI" && isRelationshipActiveAt(member, new Date()));
    const participant = !!actorMember && actorMember.participationRole !== "TOPIC_PI";
    const participantManage = await this.participantManage(tx, actor);
    const responsibleMember = !!actorMember && project.milestones.some((milestone: AnyRecord) => milestone.responsibleMemberId === actorMember.id && milestone.status !== "completed");
    project.pendingApprovals = await tx.approvalSubmission.findMany({ where: { subjectType: "project", subjectId: projectId, status: "PENDING" } });
    const acceptanceCouncil = await this.acceptanceCouncilFacts(tx, actor, project, officer, !!actorMember);
    const authorize = (item: AnyRecord = {}) => projectViewerAuthorizationV1({ actor, project: { ...project, ownerId: projectPi?.userId ?? "" }, projectOfficer: officer, participant: { isParticipant: participant, role: actorMember?.participationRole, effectiveFrom: actorMember?.effectiveFrom?.toISOString?.(), effectiveUntil: actorMember?.effectiveUntil?.toISOString?.() }, responsibleMember, participantManage, acceptanceCouncil, ...item });
    const capability = authorize();
    const readable = capability.allowedActions.includes("project.read") || (options.dossierReader === true && capability.allowedActions.includes("acceptance-dossier.read")) || (options.councilSeat === true && acceptanceCouncil.seat !== null);
    if (!readable) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem đề tài này." });
    return { project, officer, capability, authorize };
  }

  /** Story 6.9: hàng hội đồng nghiệm thu chưa thu hồi. Cấu hình hỏng thì không ai lập được (đọc đề tài không bị 503). */
  private async acceptanceCouncilFacts(tx: any, actor: SafeUserContext, project: AnyRecord, officer: ProjectOfficerFact | null, projectMember: boolean) {
    const rows = (project.acceptanceCouncilMembers ?? []).filter((row: AnyRecord) => row.invitationStatus !== "revoked");
    // Hàng đã từ chối không còn là ghế (không mở quyền xem, chỉ chờ thu hồi).
    const seat = rows.find((row: AnyRecord) => row.userId === actor.id && ["invited", "accepted"].includes(row.invitationStatus));
    const config = await readCouncilFormationConfig(tx, "ACCEPTANCE").catch(() => null);
    const canForm = !!config && canFormCouncil(actor, config, project as { hostOrganizationUnitId: string }, officer?.officerUserId === actor.id).allowed;
    return {
      canForm,
      seat: seat ? { councilRole: seat.councilRole, invitationStatus: seat.invitationStatus } : null,
      established: rows.some((row: AnyRecord) => row.councilEstablishedAt),
      pendingStage: (project.pendingApprovals ?? []).find((row: AnyRecord) => row.kind === "ACCEPTANCE_COUNCIL")?.stage ?? null,
      projectMember
    };
  }

  async listProjects(actor: SafeUserContext, options: { overdue?: boolean; approaching?: boolean } = {}) {
    const scopeIds = getOrganizationScopeIds(actor);
    const where = isAcademyWide(actor) ? {} : scopeIds.length ? { OR: [{ hostOrganizationUnitId: { in: scopeIds } }, { members: { some: { userId: actor.id, status: "ACTIVE" } } }, { proposal: { ownerId: actor.id } }] } : { OR: [{ members: { some: { userId: actor.id, status: "ACTIVE" } } }, { proposal: { ownerId: actor.id } }] };
    const records = await (this.prisma as any).approvedProject.findMany({ where, include: PROJECT_INCLUDE, orderBy: { createdAt: "desc" } });
    const visible = [];
    for (const project of records) {
      try {
        const loaded = await this.loadAuthorized(this.prisma, actor, project.id);
        const response = this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, actor, loaded.authorize);
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
    return this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, actor, loaded.authorize);
  }

  async listMonitoring(actor: SafeUserContext, options: { overdue?: boolean; approaching?: boolean } = {}) {
    if (!(isResearchManagementStaff(actor) || isResearchManagementHead(actor) || isLeadership(actor) || isResearchOversightAuthority(actor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền theo dõi đề tài." });
    return this.listProjects(actor, options);
  }

  private toProjectResponse(project: AnyRecord, capability: AnyRecord, officer: AnyRecord | null, actor?: SafeUserContext, authorize?: (item: AnyRecord) => AnyRecord) {
    const now = new Date();
    const member = (project.members ?? []).find((item: AnyRecord) => item.userId === actor?.id && isRelationshipActiveAt(item, now));
    const isPi = member?.participationRole === "TOPIC_PI";
    const isOfficer = !!actor && isResearchManagementStaff(actor) && officer?.officerUserId === actor.id;
    const isHead = !!actor && isResearchManagementHead(actor);
    const isRouter = !!actor && (isHead || isResearchBoardHead(actor));
    const isSigner = !!actor && (isLeadership(actor) || isScienceDeputyDirector(actor));
    const detailedCases = isPi || isOfficer || isHead;
    // TB/TP rà soát và GĐ/PGĐ-KH ký cần thấy yêu cầu thay đổi (trước/sau, lý do, thẩm định).
    const requestDetail = detailedCases || isRouter || isSigner;
    const reviewer = isOfficer || isRouter || isSigner;
    const pending = new Map<string, AnyRecord>((project.pendingApprovals ?? []).map((row: AnyRecord) => [row.subjectRef, row]));
    // A checkpoint whose report is already submitted no longer counts as an owed deadline.
    const reported = new Set((project.reports ?? []).filter((item: any) => [REPORT_SUBMITTED, REPORT_UNDER_REVIEW, REPORT_ACCEPTED].includes(item.status)).map((item: any) => item.checkpointId));
    const deadlines = [project.endDate, ...(project.checkpoints ?? []).filter((item: any) => item.status !== "completed" && !reported.has(item.id)).map((item: any) => item.dueDate), ...(project.milestones ?? []).filter((item: any) => item.status !== "completed").map((item: any) => item.dueDate)].filter((value): value is Date => value instanceof Date);
    const nearest = deadlines.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const active = [PREPARING, EXECUTING, PROJECT_STATUSES.paused].includes(project.status);
    // Deadlines are UTC calendar days: overdue only once the whole due day has ended.
    const overdue = active && !!nearest && nearest.getTime() + 86400000 <= now.getTime();
    const approaching = active && !!nearest && !overdue && nearest.getTime() - now.getTime() <= 14 * 86400000;
    const itemActions = (item: AnyRecord, prefix: string) => authorize ? authorize(item).allowedActions.filter((action: string) => action.startsWith(prefix) && !action.endsWith(".create")) : [];
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
      // Kinh phí từng đề tài không hiển thị cho PGĐ-TD (chỉ số liệu tổng hợp, Story 6.12).
      scope: actor && isResearchOversightAuthority(actor) ? omitBudget(project.scopeSnapshot) : project.scopeSnapshot,
      plan: project.planSnapshot,
      members: (project.members ?? []).map((member: any) => ({ ...member, effectiveFrom: member.effectiveFrom?.toISOString?.() ?? null, effectiveUntil: member.effectiveUntil?.toISOString?.() ?? null })),
      officer: officer ? { id: officer.id, officerUserId: officer.officerUserId, displayName: (project.managementOfficers ?? []).find((row: AnyRecord) => row.id === officer.id)?.officer?.displayName ?? null, status: officer.status, effectiveFrom: officer.effectiveFrom?.toISOString?.() ?? null, effectiveUntil: officer.effectiveUntil?.toISOString?.() ?? null } : null,
      milestones: project.milestones ?? [],
      checkpoints: project.checkpoints ?? [],
      reports: (project.reports ?? []).map((report: AnyRecord) => detailedCases ? ({
        id: report.id, projectId: report.projectId, checkpointId: report.checkpointId, revision: report.revision, status: report.status,
        reportingPeriodStart: report.reportingPeriodStart?.toISOString?.() ?? null, reportingPeriodEnd: report.reportingPeriodEnd?.toISOString?.() ?? null, deadline: report.deadline?.toISOString?.() ?? null,
        progressResults: report.progressResults, issuesRecommendations: report.issuesRecommendations, milestoneContext: report.milestoneContext, author: report.author,
        reviewedBy: report.reviewedBy, reviewReason: report.reviewReason, supersedesReportId: report.supersedesReportId ?? null,
        responseDeadline: report.responseDeadline?.toISOString?.() ?? null, submittedAt: report.submittedAt?.toISOString?.() ?? null,
        evidence: (report.evidence ?? []).map((item: AnyRecord) => ({ id: item.id, fileRecordId: item.fileRecordId, file: item.fileRecord ? { id: item.fileRecord.id, originalFileName: item.fileRecord.originalFileName, mimeType: item.fileRecord.mimeType, sizeBytes: item.fileRecord.sizeBytes, status: item.fileRecord.status } : null })),
        allowedActions: itemActions({ report: { status: report.status, authorId: report.authorId } }, "project.report.")
      }) : ({ id: report.id, checkpointId: report.checkpointId, status: report.status, revision: report.revision, deadline: report.deadline?.toISOString?.() ?? null, submittedAt: report.submittedAt?.toISOString?.() ?? null, allowedActions: [] })),
      requests: (project.requests ?? []).map((request: AnyRecord) => requestDetail ? ({
        id: request.id, projectId: request.projectId, requestType: request.requestType, status: request.status, revision: request.revision, requesterId: request.requesterId, requester: request.requester,
        currentValues: request.currentValues, proposedValues: request.proposedValues, reason: request.reason, decisionNote: request.decisionNote, responseDeadline: request.responseDeadline?.toISOString?.() ?? null, decidedAt: request.decidedAt?.toISOString?.() ?? null,
        appraisal: reviewer ? request.appraisal : undefined,
        approval: pending.has(request.id) ? { stage: pending.get(request.id)!.stage, stageLabel: APPROVAL_STAGE_LABELS[pending.get(request.id)!.stage as keyof typeof APPROVAL_STAGE_LABELS], signer: pending.get(request.id)!.signer, withdrawNote: "Nếu không có người rà soát hoặc ký phù hợp, PI có thể rút yêu cầu để giải phóng đề tài." } : null,
        preparedAt: request.preparedAt?.toISOString?.() ?? null, preparedBy: request.preparedBy, revisions: request.revisions, evidence: (request.evidence ?? []).map((item: AnyRecord) => ({ id: item.id, requestRevisionId: item.requestRevisionId, fileRecordId: item.fileRecordId, file: item.fileRecord ? { id: item.fileRecord.id, originalFileName: item.fileRecord.originalFileName, mimeType: item.fileRecord.mimeType, sizeBytes: item.fileRecord.sizeBytes, status: item.fileRecord.status } : null })),
        allowedActions: itemActions({ request: { requestType: request.requestType, status: request.status, requesterId: request.requesterId } }, `project.${request.requestType}.`).filter((action: string) => !/\.(approve|reject)$/.test(action) || pending.get(request.id)?.stage === "LEADERSHIP")
      }) : ({ id: request.id, requestType: request.requestType, status: request.status, createdAt: request.createdAt?.toISOString?.() ?? null, decidedAt: request.decidedAt?.toISOString?.() ?? null, allowedActions: [] })),
      history: (project.history ?? []).map((item: AnyRecord) => ({ id: item.id, action: item.action, fromStatus: item.fromStatus, toStatus: item.toStatus, reason: requestDetail ? item.reason : undefined, createdAt: item.createdAt?.toISOString?.() ?? null, beforeFacts: isOfficer || isHead || isRouter || isSigner ? item.beforeFacts : undefined, afterFacts: isOfficer || isHead || isRouter || isSigner ? item.afterFacts : undefined })),
      liquidation: actor ? this.liquidationView(project, actor, officer) : null,
      ethicsDossier: project.ethicsDossier && capability.allowedActions?.includes("ethics-dossier.read") ? { id: project.ethicsDossier.id, status: project.ethicsDossier.status, submittedAt: project.ethicsDossier.submittedAt?.toISOString?.() ?? null } : null,
      acceptanceDossier: project.acceptanceDossier && capability.allowedActions?.includes("acceptance-dossier.read") ? { id: project.acceptanceDossier.id, status: project.acceptanceDossier.status, submittedAt: project.acceptanceDossier.submittedAt?.toISOString?.() ?? null } : null,
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
      if (!isResearchManagementStaff(currentActor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ chuyên viên phụ trách đề xuất mới được tạo đề tài." });
      const proposal = await tx.researchProposal.findUnique({ where: { id: proposalId }, include: { members: true, hostOrganizationUnit: true, owner: { select: { displayName: true, username: true } } } });
      if (!proposal) throw new NotFoundException({ message: "Không tìm thấy đề xuất nguồn." });
      if (proposal.status !== "approved") throw new BadRequestException({ code: "SOURCE_NOT_APPROVED", message: "Đề xuất nguồn chưa được phê duyệt." });
      assertProposalContext(input.contextVersion, proposal);
      this.assertScope(currentActor, { hostOrganizationUnitId: proposal.hostOrganizationUnitId });
      const participation = (proposal.members ?? []).some((member: any) => member.userId === currentActor.id && isRelationshipActiveAt(member, new Date()));
      if (proposal.ownerId === currentActor.id || participation) {
        if (!(await this.participantManage(tx, currentActor))) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia đề xuất không được tạo đề tài nguồn." });
        await recordParticipantWaiver(tx, currentActor, { entity: "research-proposal", id: proposalId }, "create-approved-project");
      }
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
      // Story 6.13: số lãnh đạo chốt khi phê duyệt nằm ở đề xuất hiện tại, không ở snapshot lúc nộp.
      const budgetMetadata = { ...(snapshot.budgetMetadata ?? {}), ...((proposal.budgetMetadata as AnyRecord | null)?.approvedAmount !== undefined ? { approvedAmount: (proposal.budgetMetadata as AnyRecord).approvedAmount } : {}) };
      const approvedBudget = readApprovedBudget(budgetMetadata);
      const project = await tx.approvedProject.create({ data: {
        proposalId,
        sourceSubmissionEventId: submission.id,
        sourceDecisionId: decision.id,
        hostOrganizationUnitId: proposal.hostOrganizationUnitId,
        title: snapshot.title,
        scopeSnapshot: { title: snapshot.title, objectives: snapshot.objectives, summary: snapshot.summary, researchFieldCode: snapshot.researchFieldCode, proposalTypeCode: snapshot.proposalTypeCode, budgetMetadata },
        planSnapshot: { startDate: snapshot.startDate, endDate: snapshot.endDate },
        status: PREPARING,
        startDate: snapshot.startDate ? new Date(snapshot.startDate) : null,
        endDate: snapshot.endDate ? new Date(snapshot.endDate) : null,
        createdById: currentActor.id
      } });
      if (sourceMembers.length) await tx.approvedProjectMember.createMany({ data: sourceMembers.map((member: AnyRecord) => ({ ...member, projectId: project.id })) });
      if (approvedBudget > 0) await tx.projectFundingRecord.create({ data: { projectId: project.id, entryId: randomUUID(), version: 1, kind: "GRANT", amount: approvedBudget, recordedOn: new Date(), note: "Kinh phí được phê duyệt", fileRecordIds: [], recordedById: currentActor.id } });
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
      await this.assertOfficer(tx, currentActor, project, "confirm-setup");
      if (!project.milestones.length && !project.checkpoints.length) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Cần thiết lập ít nhất một mốc hoặc điểm báo cáo trước khi xác nhận." });
      const now = await readTransactionClockV1(tx);
      const updated = await tx.approvedProject.update({ where: { id: project.id }, data: { status: EXECUTING, confirmedAt: now, confirmedById: currentActor.id, aggregateVersion: { increment: 1 }, relationshipVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.setup.confirm", fromStatus: PREPARING, toStatus: EXECUTING, reason: input.reason ?? "Xác nhận thiết lập đề tài", beforeFacts: { status: PREPARING }, afterFacts: { status: EXECUTING } } });
      await new AuditLogService(tx).record({ action: "confirm-approved-project-setup", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, beforeFacts: { status: PREPARING }, afterFacts: { status: EXECUTING } });
      const loaded = await this.loadAuthorized(tx, currentActor, updated.id);
      return this.toProjectResponse(loaded.project, loaded.capability, loaded.officer, currentActor, loaded.authorize);
    });
  }

  async configureSetup(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (project.status !== PREPARING) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      await this.assertOfficer(tx, currentActor, project, "configure-setup");
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
        const dueDate = projectDay(item?.dueDate);
        if (project.startDate && dueDate < project.startDate) throw new BadRequestException({ message: "Hạn điểm báo cáo phải nằm trong thời gian đề tài." });
        if (project.endDate && dueDate > project.endDate) throw new BadRequestException({ code: "EXTENSION_REQUIRED" });
        await tx.projectCheckpoint.create({ data: { projectId: project.id, milestoneId, title: requiredText(item?.title, "title"), dueDate } });
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
    await this.assertHead(this.prisma, actor, loaded.project);
    const officerMayParticipate = await this.participantManage(this.prisma, { systemRole: "RESEARCH_MANAGEMENT_STAFF" });
    const users = await (this.prisma as any).user.findMany({ where: { status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" }, include: { organizationScopes: { include: { organizationUnit: true } } }, orderBy: { displayName: "asc" } });
    const eligible = users.filter((user: any) => user.organizationScopes?.some((scope: any) => scope.organizationUnitId === loaded.project.hostOrganizationUnitId && scope.organizationUnit?.status === "active") && (officerMayParticipate || !(loaded.project.members ?? []).some((member: any) => member.userId === user.id && isRelationshipActiveAt(member, new Date()))));
    const reviewAccess = new ProposalReviewAccessService(this.prisma);
    const checks = await Promise.all(eligible.map((user: AnyRecord) => reviewAccess.resolveConflictForProposal(user.id, loaded.project.proposalId)));
    return eligible.filter((_: AnyRecord, index: number) => !checks[index].unresolved && !checks[index].isAssignedReviewer && !checks[index].hasPersistedReview).map((user: AnyRecord) => ({ id: user.id, username: user.username, displayName: user.displayName, unit: user.unit }));
  }

  async assignOfficer(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertHead(tx, currentActor, project, "assign-project-management-officer");
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      const candidate = await tx.user.findUnique({ where: { id: input.officerUserId }, include: { organizationScopes: { include: { organizationUnit: true } } } });
      if (!candidate || candidate.status !== "active" || candidate.systemRole !== "RESEARCH_MANAGEMENT_STAFF" || !candidate.organizationScopes?.some((scope: any) => scope.organizationUnitId === project.hostOrganizationUnitId && scope.organizationUnit.status === "active")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chuyên viên được chọn không hoạt động hoặc ngoài phạm vi đề tài." });
      if ((project.members ?? []).some((member: any) => member.userId === candidate.id && isRelationshipActiveAt(member, new Date()))) {
        // D-041 phần 2: CV là thành viên được phụ trách khi vai trò CV bật "Phụ trách".
        if (!(await this.participantManage(tx, candidate))) throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Thành viên đề tài không được đồng thời là chuyên viên quản lý." });
        await recordParticipantWaiver(tx, currentActor, { entity: "approved-project", id: project.id }, "assign-participant-as-project-officer");
      }
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
      await this.assertHead(tx, currentActor, project, "revoke-project-management-officer");
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      const current = await this.currentOfficer(tx, project.id);
      if (!current) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa có chuyên viên đang phụ trách." });
      const now = await readTransactionClockV1(tx);
      await tx.projectManagementOfficer.update({ where: { id: (current as AnyRecord).id }, data: { status: "REVOKED", effectiveUntil: now } });
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
    if (project.reports.some((item: AnyRecord) => item.id !== currentId && item.checkpointId === checkpointId && ![REPORT_SUPPLEMENT, REPORT_SUPERSEDED].includes(item.status) && item.reportingPeriodStart && item.reportingPeriodEnd && start <= item.reportingPeriodEnd && end >= item.reportingPeriodStart)) throw new ConflictException({ code: "REPORT_PERIOD_OVERLAP", message: "Kỳ báo cáo trùng với phiên bản đang xử lý." });
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
      if (report.status === REPORT_SUPERSEDED) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Phiên bản này đã có bản sửa; hãy cập nhật bản nháp mới." });
      if (![REPORT_DRAFT, REPORT_SUPPLEMENT].includes(report.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Bản báo cáo đã nộp được giữ nguyên; hãy tạo phiên bản mới sau khi yêu cầu bổ sung." });
      const checkpointId = input.checkpointId === undefined ? report.checkpointId : input.checkpointId;
      const checkpoint = checkpointId ? await tx.projectCheckpoint.findUnique({ where: { id: checkpointId } }) : null;
      if (checkpointId && (!checkpoint || checkpoint.projectId !== project.id || checkpoint.status !== "open")) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      const deadline = checkpoint?.dueDate ?? project.endDate;
      this.assertReportPeriod(project, checkpointId, input.reportingPeriodStart ?? report.reportingPeriodStart, input.reportingPeriodEnd ?? report.reportingPeriodEnd, report.id);
      const now = await readTransactionClockV1(tx);
      const correction = report.status === REPORT_SUPPLEMENT;
      const next = correction
        ? await tx.projectReportRevision.create({ data: { projectId: project.id, checkpointId, revision: await this.nextReportRevision(tx, project.id), status: REPORT_DRAFT, supersedesReportId: report.id, reportingPeriodStart: input.reportingPeriodStart ?? report.reportingPeriodStart, reportingPeriodEnd: input.reportingPeriodEnd ?? report.reportingPeriodEnd, deadline, progressResults: input.progressResults ?? report.progressResults, issuesRecommendations: input.issuesRecommendations ?? report.issuesRecommendations, milestoneContext: input.milestoneContext ?? report.milestoneContext, authorId: currentActor.id, createdAt: now } })
        : await tx.projectReportRevision.update({ where: { id: report.id }, data: { checkpointId, deadline, reportingPeriodStart: input.reportingPeriodStart ?? report.reportingPeriodStart, reportingPeriodEnd: input.reportingPeriodEnd ?? report.reportingPeriodEnd, progressResults: input.progressResults ?? report.progressResults, issuesRecommendations: input.issuesRecommendations ?? report.issuesRecommendations, milestoneContext: input.milestoneContext ?? report.milestoneContext } });
      // The answered revision keeps its content; only its status records that a correction replaced it.
      if (correction) await tx.projectReportRevision.update({ where: { id: report.id }, data: { status: REPORT_SUPERSEDED } });
      const facts = { reportId: next.id, revision: next.revision, supersedesReportId: correction ? report.id : null };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.report.edit-draft", fromStatus: correction ? REPORT_SUPPLEMENT : REPORT_DRAFT, toStatus: REPORT_DRAFT, reason: correction ? "Tạo phiên bản báo cáo sửa theo yêu cầu bổ sung" : "Cập nhật bản nháp báo cáo", afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "edit-project-report-draft", result: "success", actorId: currentActor.id, targetEntity: "project-report-revision", targetEntityId: next.id, username: currentActor.username, beforeFacts: { reportId: report.id, status: report.status }, afterFacts: facts });
      return next;
    });
  }

  async submitReport(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const report = await this.findReport(tx, project, input.reportId);
      if (report.authorId !== currentActor.id || report.status !== REPORT_DRAFT) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ bản nháp của PI mới được nộp." });
      if (report.checkpointId && report.checkpoint?.status !== "open") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Mốc báo cáo đã đóng." });
      if (!report.progressResults?.trim()) throw new BadRequestException({ message: "Cần nhập kết quả và tiến độ trước khi nộp báo cáo." });
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
      await this.assertOfficer(tx, currentActor, project, "review-report");
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
      await this.assertOfficer(tx, currentActor, project, "request-report-supplement");
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
      await this.assertOfficer(tx, currentActor, project, "accept-report");
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

  /** D-041: chặn sớm (khi PI soạn/nộp) người được thêm vào đề tài thuộc vai trò không được làm thành viên; lúc ký vẫn kiểm lại. */
  private async assertAddedMembersMayParticipate(tx: any, values: AnyRecord) {
    const userIds = (values?.membershipChanges ?? []).filter((change: AnyRecord) => change?.action === "add").map((change: AnyRecord) => change.userId);
    if (!userIds.length) return;
    const policy = await readParticipantPolicy(tx);
    const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { systemRole: true } });
    const denied = users.find((user: AnyRecord) => !participantPolicyFor(user, policy).pi);
    if (denied) throw new BadRequestException({ code: "PARTICIPANT_ROLE_DENIED", message: `Vai trò ${(PARTICIPANT_POLICY_ROLE_LABELS as Record<string, string>)[denied.systemRole] ?? denied.systemRole} hiện không được cấu hình làm thành viên đề tài.` });
  }

  private async createRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      if (project.requests.some((request: AnyRecord) => !TERMINAL_REQUEST_STATUSES.includes(request.status))) throw new ConflictException({ code: "REQUEST_ALREADY_OPEN", message: "Đề tài đã có yêu cầu thay đổi chưa kết thúc." });
      const proposedValues = input.proposedValues as AnyRecord;
      if (!proposedValues || typeof proposedValues !== "object" || Array.isArray(proposedValues)) throw new BadRequestException({ message: "proposedValues không hợp lệ." });
      if (requestType === ADJUSTMENT) this.assertAdjustmentValues(proposedValues);
      else this.assertExtensionValues(project, proposedValues);
      if (requestType === ADJUSTMENT) await this.assertAddedMembersMayParticipate(tx, proposedValues);
      const currentValues = requestBaseline(project, requestType, proposedValues);
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
      if (requestType === ADJUSTMENT) await this.assertAddedMembersMayParticipate(tx, proposedValues);
      const currentValues = requestBaseline(project, requestType, proposedValues);
      const nextRevision = request.revision + 1;
      const now = await readTransactionClockV1(tx);
      const revision = await tx.projectRequestRevision.create({ data: { requestId: request.id, revision: nextRevision, status: "draft", currentValues, proposedValues, reason: input.reason, createdById: currentActor.id, createdAt: now } });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "draft", revision: nextRevision, currentValues, proposedValues, reason: input.reason, submittedContextVersion: projectContextVersion(project), appraisal: null, preparedById: null, preparedAt: null, responseDeadline: null } });
      await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: currentActor.id, action: `project.${requestType}.edit-draft`, fromStatus: request.status, toStatus: "draft", reason: input.reason, afterFacts: { revision: nextRevision } } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.${requestType}.edit-draft`, fromStatus: request.status, toStatus: "draft", reason: input.reason, requestId: request.id, afterFacts: { requestId: request.id, revision: nextRevision } } });
      await new AuditLogService(tx).record({ action: `edit-project-${requestType}-draft`, result: "success", actorId: currentActor.id, targetEntity: "project-request", targetEntityId: request.id, username: currentActor.username, reason: input.reason, beforeFacts: { status: request.status, revision: request.revision }, afterFacts: { status: "draft", revision: nextRevision, proposedValues } });
      return { ...updated, revisions: [revision] };
    });
  }

  async submitRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project);
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType || request.requesterId !== currentActor.id || request.status !== "draft") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ bản nháp của PI mới được nộp." });
      const values = request.proposedValues as AnyRecord;
      if (requestType === ADJUSTMENT) this.assertAdjustmentValues(values); else this.assertExtensionValues(project, values);
      if (requestType === ADJUSTMENT) await this.assertAddedMembersMayParticipate(tx, values);
      const currentValues = requestBaseline(project, requestType, values);
      if (!sameBaseline(request.currentValues, currentValues)) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Giá trị đã duyệt liên quan đã thay đổi từ khi soạn bản nháp. Vui lòng sửa bản nháp hoặc rút yêu cầu." });
      const now = await readTransactionClockV1(tx);
      const nextStatus = "submitted";
      const revision = await tx.projectRequestRevision.update({ where: { requestId_revision: { requestId: request.id, revision: request.revision } }, data: { status: "submitted", submittedAt: now, currentValues, contextVersion: projectContextVersion(project) } });
      const files = await this.assertUsableEvidence(tx, project.id, input.evidenceFileIds, request.id);
      if (files.length) await tx.projectRequestEvidence.createMany({ data: files.map((file: AnyRecord) => ({ requestId: request.id, requestRevisionId: revision.id, fileRecordId: file.id })) });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: nextStatus, currentValues, submittedContextVersion: projectContextVersion(project) } });
      await tx.projectRequestHistory.create({ data: { requestId: request.id, actorId: currentActor.id, action: `project.${requestType}.submit`, fromStatus: "draft", toStatus: nextStatus, reason: request.reason, afterFacts: { revision: request.revision, contextVersion: projectContextVersion(project) } } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.${requestType}.submit`, fromStatus: "draft", toStatus: nextStatus, requestId: request.id, afterFacts: { revision: request.revision } } });
      await new AuditLogService(tx).record({ action: `submit-project-${requestType}`, result: "success", actorId: currentActor.id, targetEntity: "project-request", targetEntityId: request.id, username: currentActor.username, afterFacts: { status: nextStatus, revision: request.revision } });
      return { ...updated, revisionRecord: revision };
    });
  }

  async reviewAdjustment(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project, "review-adjustment");
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== ADJUSTMENT || request.status !== "submitted") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "under_staff_review" } });
      await this.recordRequestAction(tx, currentActor, project, request, "review", "under_staff_review", { reason: input.reason ?? null });
      return updated;
    });
  }

  async validateExtension(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project, "validate-extension");
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
      await this.assertOfficer(tx, currentActor, project, "request-supplement");
      // Đã trình thì TB/TP trả lại qua tờ trình; CV chỉ yêu cầu bổ sung trong bước thẩm định.
      if (!["submitted", APPRAISAL_STATUS[requestType]].includes(request.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (!input.reason || !input.responseDeadline) throw new BadRequestException({ message: "Cần lý do và hạn bổ sung." });
      if (new Date(input.responseDeadline).getTime() <= (await readTransactionClockV1(tx)).getTime()) throw new BadRequestException({ code: "DEADLINE_INVALID", message: "Hạn bổ sung phải ở tương lai." });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "supplement_requested", decisionNote: input.reason, responseDeadline: input.responseDeadline } });
      await this.recordRequestAction(tx, currentActor, project, request, "request-supplement", "supplement_requested", { reason: input.reason, responseDeadline: input.responseDeadline });
      return updated;
    });
  }

  /** CV ghi kết quả thẩm định và lập tờ trình qua Story 5.9; thẩm định tự nó không đổi đề tài (Story 6.11). */
  async prepareRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project, "prepare-request");
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType || request.status !== APPRAISAL_STATUS[requestType]) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (typeof input.note !== "string" || !input.note.trim()) throw new BadRequestException({ code: "APPRAISAL_REQUIRED", message: "Cần ghi kết quả thẩm định trước khi lập tờ trình." });
      if (requestType === EXTENSION) this.assertExtensionValues(project, request.proposedValues); else this.assertAdjustmentValues(request.proposedValues);
      const now = await readTransactionClockV1(tx);
      await openApprovalSubmission(tx, currentActor, { kind: REQUEST_KIND[requestType], subjectType: "project", subjectId: project.id, subjectRef: request.id }, { title: `${requestType === EXTENSION ? "Gia hạn" : "Điều chỉnh"} đề tài: ${project.title}`, hostOrganizationUnitId: project.hostOrganizationUnitId });
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: SUBMITTED_FOR_SIGNATURE, preparedById: currentActor.id, preparedAt: now, appraisal: { validationNote: input.note.trim() } } });
      await this.recordRequestAction(tx, currentActor, project, request, "prepare", SUBMITTED_FOR_SIGNATURE, { note: input.note.trim() });
      return updated;
    });
  }

  /** Chữ ký GĐ hoặc PGĐ-KH trên tờ trình đóng tờ trình và áp dụng thay đổi trong cùng transaction (Story 6.11). */
  async decideRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, decision: "approve" | "reject", input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (!canSignApproval(currentActor, APPROVAL_SIGNERS[REQUEST_KIND[requestType]])) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Giám đốc hoặc Phó GĐ phụ trách Khoa học ký yêu cầu này." });
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requestType !== requestType || request.status !== SUBMITTED_FOR_SIGNATURE) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (this.activeMember(project, currentActor.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      if (decision === "reject" && !input.reason) throw new BadRequestException({ message: "Cần lý do từ chối." });
      const submitted = request.revisions.find((revision: AnyRecord) => revision.revision === request.revision);
      if (!submitted || submitted.status !== "submitted") throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" });
      const nextValues = submitted.proposedValues as AnyRecord;
      // Only a change to the values this request depends on makes it stale (not report acceptance or officer reassignment).
      if (!sameBaseline(submitted.currentValues, requestBaseline(project, requestType, nextValues))) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Giá trị đã duyệt liên quan đã thay đổi; yêu cầu cần được bổ sung và xem xét lại." });
      // Cổng tờ trình: đúng bước LEADERSHIP, đúng người ký, không xung đột. Lỗi ở đây rollback toàn bộ.
      await closeApprovalSubmission(tx, currentActor, { kind: REQUEST_KIND[requestType], subjectType: "project", subjectId: project.id, subjectRef: request.id }, decision === "approve" ? "APPROVED" : "REJECTED", input.reason ?? input.note ?? null);
      const endDate = requestType === EXTENSION ? this.assertExtensionValues(project, nextValues) : null;
      const next = endDate ? { endDate, planSnapshot: { ...(project.planSnapshot ?? {}), endDate: endDate.toISOString() } } : this.adjustmentUpdate(project, nextValues);
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

  async withdrawRequest(actor: SafeUserContext, projectId: string, requestType: typeof ADJUSTMENT | typeof EXTENSION, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      this.assertProjectPi(currentActor, project, false);
      if (![EXECUTING, PROJECT_STATUSES.paused].includes(project.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài không ở trạng thái thực hiện hoặc tạm dừng." });
      const request = await this.findRequest(tx, project, input.requestId);
      if (request.requesterId !== currentActor.id) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ PI đã tạo yêu cầu mới được rút yêu cầu." });
      if (request.requestType !== requestType || TERMINAL_REQUEST_STATUSES.includes(request.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Yêu cầu đã kết thúc hoặc không đúng loại." });
      // Revisions and evidence stay untouched; only the request status becomes terminal. Tờ trình đang mở bị hủy (có ghi bước).
      await cancelPendingApprovals(tx, currentActor, { kind: REQUEST_KIND[requestType], subjectType: "project", subjectId: project.id, subjectRef: request.id }, "PI rút yêu cầu");
      const updated = await tx.projectRequest.update({ where: { id: request.id }, data: { status: "withdrawn" } });
      await this.recordRequestAction(tx, currentActor, project, request, "withdraw", "withdrawn", { reason: input.reason });
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
    // Re-read so a milestone reassigned above no longer pins the member it moved away from.
    const milestones = values.membershipChanges ? await tx.projectMilestone.findMany({ where: { projectId: project.id } }) : project.milestones;
    for (const change of values.membershipChanges ?? []) {
      if (!change || typeof change !== "object" || Array.isArray(change)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
      if (change.action === "end" && Object.keys(change).every((key) => ["action", "memberId"].includes(key))) {
        const member = project.members.find((item: AnyRecord) => item.id === change.memberId && item.participationRole !== "TOPIC_PI" && isRelationshipActiveAt(item, now));
        if (!member) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
        if (milestones.some((item: AnyRecord) => item.responsibleMemberId === member.id && item.status !== "completed")) throw new BadRequestException({ code: "MEMBER_RESPONSIBILITY_ACTIVE", message: "Cần chuyển trách nhiệm mốc trước khi kết thúc thành viên." });
        await tx.approvedProjectMember.update({ where: { id: member.id }, data: { status: "ENDED", effectiveUntil: now } });
      } else if (change.action === "add" && Object.keys(change).every((key) => ["action", "userId", "name", "participationRole"].includes(key))) {
        if (!["TOPIC_MEMBER", "TOPIC_SECRETARY"].includes(change.participationRole)) throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
        const user = await tx.user.findUnique({ where: { id: change.userId }, include: { organizationScopes: true } });
        if (!user || user.status !== "active" || !user.organizationScopes.some((scope: AnyRecord) => scope.organizationUnitId === project.hostOrganizationUnitId)) throw new BadRequestException({ code: "MEMBER_INELIGIBLE" });
        // D-041: chỉ chặn người mới thêm; thành viên đang có giữ nguyên.
        if (!participantPolicyFor(user, await readParticipantPolicy(tx)).pi) throw new BadRequestException({ code: "PARTICIPANT_ROLE_DENIED", message: `Vai trò ${(PARTICIPANT_POLICY_ROLE_LABELS as Record<string, string>)[user.systemRole] ?? user.systemRole} hiện không được cấu hình làm thành viên đề tài.` });
        if (project.members.some((item: AnyRecord) => item.userId === user.id && isRelationshipActiveAt(item, now))) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
        // D-041 phần 2: CV phụ trách được làm thành viên khi vai trò của họ bật "Phụ trách".
        if ((await this.currentOfficer(tx, project.id, now))?.officerUserId === user.id) {
          if (!(await this.participantManage(tx, user))) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
          await recordParticipantWaiver(tx, actor, { entity: "approved-project", id: project.id }, "add-officer-as-project-member");
        }
        await this.assertNoEvaluationConflict(tx, user.id, project.proposalId);
        // Tên lấy từ tài khoản được thêm, không lấy `change.name` do người lập yêu cầu gửi.
        await tx.approvedProjectMember.create({ data: { projectId: project.id, userId: user.id, name: user.displayName, role: change.participationRole, participationRole: change.participationRole, status: "ACTIVE", effectiveFrom: now, createdById: actor.id } });
      } else throw new BadRequestException({ code: "ADJUSTMENT_SCOPE_DENIED" });
    }
  }

  // ---- Story 6.12: kinh phí dạng metadata và thanh lý ----

  private liquidationView(project: AnyRecord, actor: SafeUserContext, officer: AnyRecord | null) {
    const latest = (project.liquidations ?? [])[0] ?? null;
    const member = this.activeMember(project, actor.id);
    // Số tiền thanh lý chỉ hiện với người được xem kinh phí đề tài (không PGĐ-TD, không CV ngoài phụ trách).
    const money = (value: unknown) => value === null || value === undefined || !this.canViewFunding(actor, project, officer) ? null : String(value);
    return {
      current: latest ? { id: latest.id, status: latest.status, outcome: latest.outcome, report: latest.report, decisionNote: latest.decisionNote, decidedAt: latest.decidedAt?.toISOString?.() ?? null, recoveredAmount: money(latest.recoveredAmount ?? 0), approvedBudget: money(latest.approvedBudget), totalDisbursed: money(latest.totalDisbursed), totalSettled: money(latest.totalSettled), liquidationNumber: latest.liquidationNumber ?? null, fileRecordIds: latest.fileRecordIds ?? [] } : null,
      eligible: LIQUIDATABLE.includes(project.status),
      canSubmit: isResearchManagementStaff(actor) && officer?.officerUserId === actor.id && LIQUIDATABLE.includes(project.status) && (!latest || ["DRAFT", "REJECTED"].includes(latest.status)),
      canSign: isLeadership(actor) && !member && latest?.status === "SUBMITTED" && (project.pendingApprovals ?? []).some((row: AnyRecord) => row.kind === "LIQUIDATION" && row.stage === "LEADERSHIP"),
      note: LIQUIDATABLE.includes(project.status) ? null : "Chỉ đề tài đã nghiệm thu (Accepted) hoặc không đạt (Failed) mới được thanh lý."
    };
  }

  /** Ai xem được kinh phí từng đề tài: BGĐ-KH, TP, TB toàn Học viện; CV phụ trách; PP/PI/thành viên chỉ đề tài mình tham gia. PGĐ-TD và QT: không. */
  private canViewFunding(actor: SafeUserContext, project: AnyRecord, officer: AnyRecord | null) {
    if (isAcademyWide(actor)) return true;
    if (isResearchManagementStaff(actor)) return officer?.officerUserId === actor.id;
    return !isResearchOversightAuthority(actor) && this.activeMember(project, actor.id);
  }

  /** Ghi kinh phí: GĐ, TP, TB toàn Học viện; CV phụ trách. Không phải PGĐ-KH, PGĐ-TD, PP, QT, PI, thành viên. Người trong đề tài không tự ghi, trừ khi vai trò bật "Phụ trách" (D-041 phần 2). */
  private canWriteFunding(actor: SafeUserContext, project: AnyRecord, officer: AnyRecord | null, participantManage: boolean) {
    const allowed = isLeadership(actor) || isResearchManagementHead(actor) || isResearchBoardHead(actor) || (isResearchManagementStaff(actor) && officer?.officerUserId === actor.id);
    return allowed && (participantManage || !this.activeMember(project, actor.id));
  }

  async getFunding(actor: SafeUserContext, projectId: string) {
    const project = await (this.prisma as any).approvedProject.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
    if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài đã được duyệt." });
    if (isResearchOversightAuthority(actor)) return { restricted: true, records: [], totals: null, canWrite: false };
    const officer = await this.currentOfficer(this.prisma, projectId);
    if (!this.canViewFunding(actor, project, officer)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem kinh phí đề tài này." });
    const rows = await (this.prisma as any).projectFundingRecord.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
    const records = latestFunding<any>(rows).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const manage = await this.participantManage(this.prisma, actor);
    const increases = await (this.prisma as any).projectFundingIncrease.findMany({ where: { projectId }, include: { author: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 20 });
    const pending = increases.find((row: AnyRecord) => row.status === "SUBMITTED");
    const atLeadership = !!pending && !!(await (this.prisma as any).approvalSubmission.findFirst({ where: { kind: "FUNDING_INCREASE", subjectType: "project", subjectId: projectId, subjectRef: pending.id, status: "PENDING", stage: "LEADERSHIP" }, select: { id: true } }));
    const increaseView = {
      items: increases.map((row: AnyRecord) => ({ id: row.id, amount: String(row.amount), reason: row.reason, status: row.status, decisionNote: row.decisionNote, authorName: row.author?.displayName ?? "", fileRecordIds: row.fileRecordIds ?? [], createdAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString?.() ?? null })),
      canPropose: !pending && this.fundingOpen(project) && this.canProposeFundingIncrease(actor, project, officer, manage),
      signableId: pending && atLeadership && isLeadership(actor) && !this.activeMember(project, actor.id) ? pending.id : null
    };
    return { restricted: false, increases: increaseView, records: records.map((row) => ({ entryId: row.entryId, version: row.version, kind: row.kind, amount: String(row.amount), recordedOn: row.recordedOn?.toISOString?.().slice(0, 10) ?? null, note: row.note, fileRecordIds: row.fileRecordIds, recordedById: row.recordedById, createdAt: row.createdAt.toISOString() })), totals: fundingTotals(records), canWrite: this.canWriteFunding(actor, project, officer, manage) };
  }

  /** Số liệu tổng hợp toàn Học viện; không có cột kinh phí từng đề tài. Dành cho vai trò theo dõi (gồm PGĐ-TD). */
  async fundingSummary(actor: SafeUserContext) {
    if (!(isAcademyWide(actor) || isResearchOversightAuthority(actor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem số liệu tổng hợp kinh phí." });
    const rows = await (this.prisma as any).projectFundingRecord.findMany({ orderBy: { createdAt: "asc" } });
    const byProject = new Map<string, AnyRecord[]>();
    for (const row of rows) byProject.set(row.projectId, [...(byProject.get(row.projectId) ?? []), row]);
    const records = [...byProject.values()].flatMap((list) => latestFunding<any>(list).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    return { projectCount: byProject.size, totals: fundingTotals(records) };
  }

  /** Thêm số liệu giải ngân/quyết toán (entryId mới) hoặc phiên bản sửa (entryId cũ). Chỉ thêm, không ghi đè; mỗi lần có history và audit. Không nhận GRANT. */
  async recordFunding(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, SKIP_CONTEXT, async (tx, currentActor, project) => {
      const officer = await this.currentOfficer(tx, project.id);
      if (!this.canWriteFunding(currentActor, project, officer, await this.participantManage(tx, currentActor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Bạn không có quyền ghi số liệu kinh phí của đề tài này." });
      if (this.activeMember(project, currentActor.id)) await recordParticipantWaiver(tx, currentActor, { entity: "approved-project", id: project.id }, "record-project-funding");
      if ([PREPARING, PROJECT_STATUSES.closed].includes(project.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa thực hiện hoặc đã đóng." });
      if (!(FUNDING_KINDS as readonly string[]).includes(input.kind)) throw new BadRequestException({ message: "Loại số liệu kinh phí không hợp lệ." });
      // Quy tắc 2026-11-13: kinh phí được cấp chỉ đổi qua đề nghị nâng kinh phí do GĐ ký (kể cả sửa phiên bản qua entryId, vì entryId phải cùng loại).
      if (input.kind === "GRANT") throw new BadRequestException({ code: "FUNDING_GRANT_REQUIRES_SIGNATURE", message: "Kinh phí được cấp không ghi trực tiếp. Lập đề nghị nâng kinh phí để Giám đốc ký." });
      const amount = readFundingAmount(input.amount);
      const files = await this.assertUsableEvidence(tx, project.id, input.fileRecordIds);
      if (files.some((file: AnyRecord) => file.filePurpose !== "FUNDING_VOUCHER")) throw new BadRequestException({ code: "EVIDENCE_WRONG_RECORD", message: "Chứng từ kinh phí phải là tệp loại chứng từ giải ngân (FUNDING_VOUCHER)." });
      let entryId = randomUUID();
      let version = 1;
      let before: AnyRecord | null = null;
      if (input.entryId) {
        const last = await tx.projectFundingRecord.findFirst({ where: { projectId: project.id, entryId: input.entryId }, orderBy: { version: "desc" } });
        if (!last || last.kind !== input.kind) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Không tìm thấy số liệu cần sửa." });
        entryId = last.entryId; version = last.version + 1; before = { amount: String(last.amount), note: last.note, version: last.version };
      }
      const rows = await tx.projectFundingRecord.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
      const next = latestFunding([...rows, { entryId, version, kind: input.kind, amount, createdAt: new Date() }]);
      assertFundingInvariant(fundingTotals(next));
      const record = await tx.projectFundingRecord.create({ data: { projectId: project.id, entryId, version, kind: input.kind, amount, recordedOn: projectDay(input.recordedOn), note: optionalText(input.note ?? null), fileRecordIds: files.map((file: AnyRecord) => file.id), recordedById: currentActor.id } });
      const after = { kind: input.kind, amount: String(record.amount), version, entryId, fileRecordIds: record.fileRecordIds };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.funding.record", reason: record.note, beforeFacts: before, afterFacts: after } });
      await new AuditLogService(tx).record({ action: "record-project-funding", result: "success", actorId: currentActor.id, targetEntity: "approved-project", targetEntityId: project.id, username: currentActor.username, beforeFacts: before ?? undefined, afterFacts: after });
      await notifyUsers(tx, { userIds: [this.projectPiUserId(project)], exclude: [currentActor.id], type: "project.funding.recorded", title: input.kind === "DISBURSEMENT" ? "Đề tài có đợt giải ngân mới" : "Đề tài có số liệu quyết toán mới", body: `${project.title}: ${amount.toLocaleString("vi-VN")} đ`, link: `/projects/${project.id}`, sourceType: "project_funding", sourceId: project.id, idempotencyKey: `funding:${entryId}:v${version}` });
      return { entryId, version, kind: record.kind, amount: String(record.amount) };
    });
  }

  private fundingOpen(project: AnyRecord) {
    return ![PREPARING, PROJECT_STATUSES.closed].includes(project.status);
  }

  /** Lập đề nghị nâng kinh phí: CV phụ trách hoặc TB (toàn Học viện). Người trong đề tài không tự lập, trừ khi vai trò bật "Phụ trách". */
  private canProposeFundingIncrease(actor: SafeUserContext, project: AnyRecord, officer: AnyRecord | null, participantManage: boolean) {
    const allowed = isResearchBoardHead(actor) || (isResearchManagementStaff(actor) && officer?.officerUserId === actor.id);
    return allowed && (participantManage || !this.activeMember(project, actor.id));
  }

  /** CV phụ trách hoặc TB lập đề nghị và mở tờ trình FUNDING_INCREASE (TB → TP → GĐ; TB lập thì vào thẳng TP). Chưa đổi sổ kinh phí. */
  async submitFundingIncrease(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      const officer = await this.currentOfficer(tx, project.id);
      if (!this.canProposeFundingIncrease(currentActor, project, officer, await this.participantManage(tx, currentActor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Chuyên viên phụ trách hoặc Trưởng ban QLKH được lập đề nghị nâng kinh phí." });
      if (this.activeMember(project, currentActor.id)) await recordParticipantWaiver(tx, currentActor, { entity: "approved-project", id: project.id }, "submit-funding-increase");
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      if (!this.fundingOpen(project)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa thực hiện hoặc đã đóng." });
      const amount = readFundingAmount(input.amount, "Số tiền đề nghị tăng");
      if (amount <= 0) throw new BadRequestException({ code: "FUNDING_INVALID", message: "Số tiền đề nghị tăng phải lớn hơn 0." });
      const reason = requiredText(input.reason, "Lý do");
      const files = await this.assertUsableEvidence(tx, project.id, input.fileRecordIds);
      if (files.some((file: AnyRecord) => file.filePurpose !== "FUNDING_VOUCHER")) throw new BadRequestException({ code: "EVIDENCE_WRONG_RECORD", message: "Chứng từ kinh phí phải là tệp loại chứng từ giải ngân (FUNDING_VOUCHER)." });
      if (await tx.projectFundingIncrease.findFirst({ where: { projectId: project.id, status: "SUBMITTED" }, select: { id: true } })) throw new ConflictException({ code: "FUNDING_INCREASE_EXISTS", message: "Đề tài đang có một đề nghị nâng kinh phí chờ xử lý." });
      const increase = await tx.projectFundingIncrease.create({ data: { projectId: project.id, authorId: currentActor.id, amount, reason, fileRecordIds: files.map((file: AnyRecord) => file.id), status: "SUBMITTED" } });
      await openApprovalSubmission(tx, currentActor, { kind: "FUNDING_INCREASE", subjectType: "project", subjectId: project.id, subjectRef: increase.id }, { title: `Nâng kinh phí đề tài: ${project.title}`, hostOrganizationUnitId: project.hostOrganizationUnitId, note: reason });
      const facts = { increaseId: increase.id, amount: String(increase.amount) };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.funding-increase.submit", toStatus: "SUBMITTED", reason, afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "submit-project-funding-increase", result: "success", actorId: currentActor.id, targetEntity: "project-funding-increase", targetEntityId: increase.id, username: currentActor.username, reason, afterFacts: { projectId: project.id, ...facts } });
      return { id: increase.id, status: increase.status, amount: String(increase.amount) };
    });
  }

  /** Chỉ GĐ ký (PGĐ-KH không). Ký thì tờ trình đóng, đề nghị SIGNED và một dòng GRANT mới được thêm trong cùng transaction; từ chối không đổi sổ. */
  async decideFundingIncrease(actor: SafeUserContext, projectId: string, decision: "approve" | "reject", input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (!isLeadership(currentActor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Đề nghị nâng kinh phí do Giám đốc ký." });
      const increase = await tx.projectFundingIncrease.findFirst({ where: { id: input.increaseId, projectId: project.id } });
      if (!increase || increase.status !== "SUBMITTED" || !this.fundingOpen(project)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề nghị không còn chờ ký hoặc đề tài đã đóng." });
      if (this.activeMember(project, currentActor.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      // Cổng chữ ký: không có tờ trình đang ở bước Ban giám đốc thì ném lỗi trước mọi thay đổi sổ.
      await closeApprovalSubmission(tx, currentActor, { kind: "FUNDING_INCREASE", subjectType: "project", subjectId: project.id, subjectRef: increase.id }, decision === "approve" ? "APPROVED" : "REJECTED", input.reason ?? null);
      const now = await readTransactionClockV1(tx);
      const status = decision === "approve" ? "SIGNED" : "REJECTED";
      const before = await this.currentFundingTotals(tx, project.id);
      let fundingEntryId: string | null = null;
      if (decision === "approve") {
        const files = await this.assertUsableEvidence(tx, project.id, increase.fileRecordIds ?? []);
        fundingEntryId = randomUUID();
        await tx.projectFundingRecord.create({ data: { projectId: project.id, entryId: fundingEntryId, version: 1, kind: "GRANT", amount: increase.amount, recordedOn: projectDay(now.toISOString().slice(0, 10)), note: `Nâng kinh phí (GĐ ký): ${increase.reason}`, fileRecordIds: files.map((file: AnyRecord) => file.id), recordedById: currentActor.id } });
      }
      await tx.projectFundingIncrease.update({ where: { id: increase.id }, data: { status, decidedById: currentActor.id, decidedAt: now, decisionNote: input.reason ?? null, fundingEntryId } });
      const after = { increaseId: increase.id, status, amount: String(increase.amount), fundingEntryId, grantTotal: before.GRANT + (decision === "approve" ? Number(increase.amount) : 0) };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.funding-increase.${decision}`, fromStatus: "SUBMITTED", toStatus: status, reason: input.reason ?? null, beforeFacts: { grantTotal: before.GRANT }, afterFacts: after } });
      await new AuditLogService(tx).record({ action: `${decision}-project-funding-increase`, result: "success", actorId: currentActor.id, targetEntity: "project-funding-increase", targetEntityId: increase.id, username: currentActor.username, reason: input.reason ?? undefined, beforeFacts: { projectId: project.id, status: "SUBMITTED", grantTotal: before.GRANT }, afterFacts: after });
      const officer = await this.currentOfficer(tx, project.id);
      await notifyUsers(tx, { userIds: [this.projectPiUserId(project), officer?.officerUserId, increase.authorId], exclude: [currentActor.id], type: "project.funding-increase.decided", title: decision === "approve" ? "Đề nghị nâng kinh phí đã được ký" : "Đề nghị nâng kinh phí bị từ chối", body: project.title, link: `/projects/${project.id}`, sourceType: "project_funding", sourceId: project.id, idempotencyKey: `funding-increase:${increase.id}:${status}` });
      return { id: increase.id, status, fundingEntryId };
    });
  }

  private projectPiUserId(project: AnyRecord): string | null {
    return (project.members ?? []).find((member: AnyRecord) => member.participationRole === "TOPIC_PI" && member.status === "ACTIVE")?.userId ?? null;
  }

  private async currentFundingTotals(tx: any, projectId: string) {
    const rows = await tx.projectFundingRecord.findMany({ where: { projectId } });
    return fundingTotals(latestFunding<any>(rows));
  }

  /** CV phụ trách lập biên bản thanh lý và trình tờ trình LIQUIDATION (TB → TP → GĐ). Chỉ đề tài Accepted/Failed. */
  async submitLiquidation(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.assertOfficer(tx, currentActor, project, "submit-liquidation");
      if (!LIQUIDATABLE.includes(project.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ đề tài đã nghiệm thu hoặc không đạt mới được thanh lý." });
      const report = requiredText(input.report, "report");
      const recoveredAmount = readFundingAmount(input.recoveredAmount ?? 0, "Số tiền thu hồi");
      const totals = await this.currentFundingTotals(tx, project.id);
      if (recoveredAmount > totals.DISBURSEMENT) throw new BadRequestException({ code: "LIQUIDATION_INVALID", message: `Số tiền thu hồi (${recoveredAmount.toLocaleString("vi-VN")} đ) không được lớn hơn số đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ).` });
      const files = await this.assertUsableEvidence(tx, project.id, input.fileRecordIds);
      const live = (project.liquidations ?? []).find((row: AnyRecord) => ["DRAFT", "SUBMITTED", "SIGNED"].includes(row.status));
      if (live && live.status !== "DRAFT") throw new ConflictException({ code: "LIQUIDATION_EXISTS", message: "Đề tài đã có biên bản thanh lý đang trình hoặc đã ký." });
      const data = { report, recoveredAmount, fileRecordIds: files.map((file: AnyRecord) => file.id), outcome: project.status, status: "SUBMITTED", authorId: currentActor.id };
      const liquidation = live ? await tx.projectLiquidation.update({ where: { id: live.id }, data }) : await tx.projectLiquidation.create({ data: { projectId: project.id, ...data } });
      await openApprovalSubmission(tx, currentActor, { kind: "LIQUIDATION", subjectType: "project", subjectId: project.id, subjectRef: liquidation.id }, { title: `Thanh lý đề tài: ${project.title}`, hostOrganizationUnitId: project.hostOrganizationUnitId });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.liquidation.submit", fromStatus: live ? "DRAFT" : null, toStatus: "SUBMITTED", afterFacts: { liquidationId: liquidation.id, outcome: project.status, recoveredAmount } } });
      await new AuditLogService(tx).record({ action: "submit-project-liquidation", result: "success", actorId: currentActor.id, targetEntity: "project-liquidation", targetEntityId: liquidation.id, username: currentActor.username, afterFacts: { projectId: project.id, outcome: project.status, recoveredAmount } });
      return liquidation;
    });
  }

  /** Chỉ GĐ ký thanh lý (PGĐ-KH không). Ký thì biên bản SIGNED và đề tài Accepted/Failed → Closed trong cùng transaction (D-034). */
  async decideLiquidation(actor: SafeUserContext, projectId: string, decision: "approve" | "reject", input: AnyRecord) {
    return this.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      if (!isLeadership(currentActor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Thanh lý do Giám đốc ký." });
      const liquidation = (project.liquidations ?? []).find((row: AnyRecord) => row.id === input.liquidationId);
      if (!liquidation || liquidation.status !== "SUBMITTED" || !LIQUIDATABLE.includes(project.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED" });
      if (this.activeMember(project, currentActor.id)) throw new ForbiddenException({ code: "CONFLICT_DENIED" });
      await this.assertNoEvaluationConflict(tx, currentActor.id, project.proposalId);
      if (decision === "reject" && !input.reason) throw new BadRequestException({ message: "Cần lý do từ chối." });
      let closing: AnyRecord = {};
      if (decision === "approve") {
        // Số liệu chốt theo sổ ghi tại thời điểm ký; lệch dù 1 đồng cũng không ký được.
        const totals = await this.currentFundingTotals(tx, project.id);
        const recovered = Number(liquidation.recoveredAmount);
        if (totals.SETTLEMENT + recovered !== totals.DISBURSEMENT) throw new BadRequestException({ code: "LIQUIDATION_UNBALANCED", message: `Chưa cân đối kinh phí: đã giải ngân ${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ, đã quyết toán ${totals.SETTLEMENT.toLocaleString("vi-VN")} đ, thu hồi ${recovered.toLocaleString("vi-VN")} đ. Phần chênh lệch phải được quyết toán hoặc thu hồi trước khi ký.` });
        // Năm UTC cho cả nhãn và khoảng đếm, để hai thứ không lệch nhau quanh giao thừa.
        const year = (await readTransactionClockV1(tx)).getUTCFullYear();
        const sequence = (await tx.projectLiquidation.count({ where: { status: "SIGNED", decidedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } })) + 1;
        closing = { approvedBudget: totals.GRANT, totalDisbursed: totals.DISBURSEMENT, totalSettled: totals.SETTLEMENT, liquidationNumber: `${sequence}/BBTL-HVQY/${year}` };
      }
      await closeApprovalSubmission(tx, currentActor, { kind: "LIQUIDATION", subjectType: "project", subjectId: project.id, subjectRef: liquidation.id }, decision === "approve" ? "APPROVED" : "REJECTED", input.reason ?? null);
      const now = await readTransactionClockV1(tx);
      const status = decision === "approve" ? "SIGNED" : "REJECTED";
      const updated = await tx.projectLiquidation.update({ where: { id: liquidation.id }, data: { status, decidedById: currentActor.id, decidedAt: now, decisionNote: input.reason ?? null, ...closing } });
      if (decision === "approve") await tx.approvedProject.update({ where: { id: project.id }, data: { status: PROJECT_STATUSES.closed, aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: `project.liquidation.${decision}`, fromStatus: project.status, toStatus: decision === "approve" ? PROJECT_STATUSES.closed : project.status, reason: input.reason ?? null, beforeFacts: { status: project.status, liquidation: "SUBMITTED" }, afterFacts: { status: decision === "approve" ? PROJECT_STATUSES.closed : project.status, liquidation: status, liquidationId: liquidation.id, liquidationNumber: closing.liquidationNumber ?? null } } });
      await new AuditLogService(tx).record({ action: `${decision}-project-liquidation`, result: "success", actorId: currentActor.id, targetEntity: "project-liquidation", targetEntityId: liquidation.id, username: currentActor.username, reason: input.reason ?? undefined, beforeFacts: { projectStatus: project.status, status: "SUBMITTED" }, afterFacts: { projectStatus: decision === "approve" ? PROJECT_STATUSES.closed : project.status, status, liquidationNumber: closing.liquidationNumber ?? null } });
      const officer = await this.currentOfficer(tx, project.id);
      await notifyUsers(tx, { userIds: [this.projectPiUserId(project), officer?.officerUserId], exclude: [currentActor.id], type: "project.liquidation.decided", title: decision === "approve" ? "Biên bản thanh lý đã được ký" : "Biên bản thanh lý bị từ chối", body: `${project.title}${closing.liquidationNumber ? ` — số ${closing.liquidationNumber}` : ""}`, link: `/projects/${project.id}`, sourceType: "project_liquidation", sourceId: liquidation.id, idempotencyKey: `liquidation:${liquidation.id}:${status}` });
      return updated;
    });
  }

  private async assertHead(tx: any, actor: SafeUserContext, project: AnyRecord, operation?: string) {
    this.assertScope(actor, project);
    if (!isResearchManagementHead(actor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    if (this.activeMember(project, actor.id) && !(await this.participantManage(tx, actor))) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    if (this.activeMember(project, actor.id) && operation) await recordParticipantWaiver(tx, actor, { entity: "approved-project", id: project.id }, operation);
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

function isAcademyWide(actor: SafeUserContext) { return isLeadership(actor) || isScienceDeputyDirector(actor) || isResearchManagementHead(actor) || isResearchBoardHead(actor); }
function omitBudget(scope: AnyRecord | null) { if (!scope) return scope; const { budgetMetadata: _hidden, ...rest } = scope; return rest; }

// The approved values a request depends on: end date for an extension; the touched scope/plan keys,
// touched milestones and (for membership changes) the active member set for an adjustment.
function requestBaseline(project: AnyRecord, requestType: string, values: AnyRecord) {
  if (requestType === EXTENSION) return plainJson({ endDate: project.endDate ?? null });
  const pick = (source: AnyRecord | null, keys: string[]) => Object.fromEntries(keys.map((key) => [key, source?.[key] ?? null]));
  const byId = (left: AnyRecord, right: AnyRecord) => String(left.id).localeCompare(String(right.id));
  const touched = new Set((values.milestoneChanges ?? []).map((change: AnyRecord) => change.id));
  return plainJson({
    ...(values.scope ? { scope: pick(project.scopeSnapshot, Object.keys(values.scope)) } : {}),
    ...(values.plan ? { plan: pick(project.planSnapshot, Object.keys(values.plan)) } : {}),
    ...(values.milestoneChanges ? { milestones: (project.milestones ?? []).filter((item: AnyRecord) => touched.has(item.id)).map((item: AnyRecord) => ({ id: item.id, title: item.title, description: item.description ?? null, dueDate: item.dueDate, responsibleMemberId: item.responsibleMemberId ?? null, status: item.status, isImportant: item.isImportant })).sort(byId) } : {}),
    ...(values.membershipChanges ? { members: (project.members ?? []).filter((item: AnyRecord) => isRelationshipActiveAt(item, new Date())).map((item: AnyRecord) => ({ id: item.id, userId: item.userId ?? null, participationRole: item.participationRole })).sort(byId) } : {})
  });
}

// Stored JSONB reorders keys and turns dates into strings, so compare normalized values.
function plainJson(value: unknown) { return JSON.parse(JSON.stringify(value ?? null)); }
function sameBaseline(stored: unknown, current: unknown) { return isDeepStrictEqual(plainJson(stored), plainJson(current)); }

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
