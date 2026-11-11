import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovedProjectsService } from "../approved-projects/approved-projects.service.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { REGISTRATION_APPROVER_ROLES, type SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { actorConflicted, canViewApproval, type ApprovalSubmissionRow } from "../proposals-shared/approval-routing.js";
import { canReadProposal } from "../proposals-shared/proposal-access.js";
import { ProposalManagementOfficerService } from "../proposals-shared/proposal-management-officer.service.js";
import { REVIEW_ASSIGNMENT_STATUS } from "../proposals-shared/proposal-review-access.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";

// shortcut: lọc quyền trên 200 thông báo mới nhất, không phân trang; thêm cursor khi người dùng tích lũy nhiều hơn.
const SCAN_LIMIT = 200;

type NotificationRow = { id: string; type: string; title: string; body: string; link: string | null; sourceType: string; sourceId: string; readAt: Date | null; createdAt: Date };

/** Story 11.1: thông báo không phải quyền truy cập. Mỗi lần đọc re-authorize theo quyền hiện hành của người xem. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService,
    private readonly managementOfficers: ProposalManagementOfficerService
  ) {}

  async list(actor: SafeUserContext, limit: number) {
    const rows = (await this.prisma.userNotification.findMany({ where: { userId: actor.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: SCAN_LIMIT })) as NotificationRow[];
    const visible = await this.authorized(actor, rows);
    return {
      notifications: visible.slice(0, limit).map((row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, link: row.link, readAt: row.readAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })),
      unreadCount: visible.filter((row) => !row.readAt).length
    };
  }

  async markRead(actor: SafeUserContext, id: string) {
    const updated = await this.prisma.userNotification.updateMany({ where: { id, userId: actor.id }, data: { readAt: new Date() } });
    if (!updated.count) throw new NotFoundException({ message: "Không tìm thấy thông báo." });
    return { ok: true };
  }

  async markAllRead(actor: SafeUserContext) {
    const updated = await this.prisma.userNotification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: updated.count };
  }

  private async authorized(actor: SafeUserContext, rows: NotificationRow[]) {
    const idsOf = (type: string) => [...new Set(rows.filter((row) => row.sourceType === type).map((row) => row.sourceId))];
    const allowed = new Set<string>();
    const asOf = new Date();

    const approvalIds = idsOf("approval");
    if (approvalIds.length) {
      const submissions = (await this.prisma.approvalSubmission.findMany({ where: { id: { in: approvalIds } } })) as unknown as ApprovalSubmissionRow[];
      // Nhiều tờ trình cùng một hồ sơ/đề tài: kiểm tra xung đột một lần cho mỗi đối tượng.
      const conflicts = new Map<string, boolean>();
      for (const submission of submissions) {
        if (!canViewApproval(actor, submission)) continue;
        const subject = `${submission.subjectType}:${submission.subjectId}`;
        if (!conflicts.has(subject)) conflicts.set(subject, await actorConflicted(this.prisma as never, actor, submission));
        if (!conflicts.get(subject)) allowed.add(`approval:${submission.id}`);
      }
    }

    const proposalIds = idsOf("proposal");
    if (proposalIds.length) {
      const proposals = await this.prisma.researchProposal.findMany({ where: { id: { in: proposalIds } }, select: { id: true, ownerId: true, status: true, hostOrganizationUnitId: true, createdAt: true } });
      const ids = proposals.map((proposal) => proposal.id);
      const [participation, reviewAccess, officers] = await Promise.all([
        this.participation.resolveForProposals(actor.id, proposals, asOf),
        this.reviewAccess.resolveForProposals(actor.id, ids, asOf),
        this.managementOfficers.resolveForProposals(ids, asOf)
      ]);
      for (const proposal of proposals) {
        if (canReadProposal(actor, proposal, participation.get(proposal.id), reviewAccess.get(proposal.id), officers.get(proposal.id))) allowed.add(`proposal:${proposal.id}`);
      }
    }

    const assignmentIds = idsOf("review_assignment");
    if (assignmentIds.length) {
      // Như `listMyAssignments`: lời mời bị thu hồi thì thông báo biến mất.
      const assignments = await this.prisma.proposalReviewAssignment.findMany({
        where: { id: { in: assignmentIds }, reviewerUserId: actor.id, status: { in: [REVIEW_ASSIGNMENT_STATUS.assigned, REVIEW_ASSIGNMENT_STATUS.completed] } },
        select: { id: true }
      });
      for (const assignment of assignments) allowed.add(`review_assignment:${assignment.id}`);
    }

    // Như GET hồ sơ đạo đức/nghiệm thu: hiện khi người xem còn quyền đọc hồ sơ trên đề tài nguồn.
    for (const [sourceType, model, readAction] of [["ethics_dossier", "ethicsDossier", "ethics-dossier.read"], ["acceptance_dossier", "acceptanceDossier", "acceptance-dossier.read"]] as const) {
      const dossierIds = idsOf(sourceType);
      if (!dossierIds.length) continue;
      const projects = new ApprovedProjectsService(this.prisma, new AuditLogService(this.prisma));
      const dossiers: Array<{ id: string; projectId: string }> = await (this.prisma[model] as any).findMany({ where: { id: { in: dossierIds } }, select: { id: true, projectId: true } });
      for (const dossier of dossiers) {
        const project = await projects.getProject(actor, dossier.projectId).catch((error) => { if (error instanceof ForbiddenException) return null; throw error; });
        if (project?.viewerAuthorization.allowedActions.includes(readAction)) allowed.add(`${sourceType}:${dossier.id}`);
      }
    }

    // Story 6.9: sourceId là đề tài; hiện khi người xem còn ghế hội đồng (đang mời/đã nhận lời) hoặc còn xem được đề tài.
    const councilProjectIds = idsOf("acceptance_council");
    if (councilProjectIds.length) {
      const projects = new ApprovedProjectsService(this.prisma, new AuditLogService(this.prisma));
      const seats = await this.prisma.acceptanceCouncilMember.findMany({ where: { projectId: { in: councilProjectIds }, userId: actor.id, invitationStatus: { in: ["invited", "accepted"] } }, select: { projectId: true } });
      const seated = new Set(seats.map((seat) => seat.projectId));
      for (const id of councilProjectIds) {
        if (seated.has(id) || await projects.getProject(actor, id).then(() => true, (error) => { if (error instanceof ForbiddenException || error instanceof NotFoundException) return false; throw error; })) allowed.add(`acceptance_council:${id}`);
      }
    }

    // Kinh phí/thanh lý: hiện khi người xem còn xem được đề tài (sourceId kinh phí là đề tài, thanh lý là biên bản).
    const fundingIds = idsOf("project_funding");
    const liquidationIds = idsOf("project_liquidation");
    if (fundingIds.length || liquidationIds.length) {
      const projects = new ApprovedProjectsService(this.prisma, new AuditLogService(this.prisma));
      const liquidations: Array<{ id: string; projectId: string }> = liquidationIds.length ? await this.prisma.projectLiquidation.findMany({ where: { id: { in: liquidationIds } }, select: { id: true, projectId: true } }) : [];
      const visibleProject = new Map<string, boolean>();
      const canView = async (projectId: string) => {
        if (!visibleProject.has(projectId)) visibleProject.set(projectId, !!(await projects.getProject(actor, projectId).catch((error) => { if (error instanceof ForbiddenException || error instanceof NotFoundException) return null; throw error; })));
        return visibleProject.get(projectId)!;
      };
      for (const id of fundingIds) if (await canView(id)) allowed.add(`project_funding:${id}`);
      for (const liquidation of liquidations) if (await canView(liquidation.projectId)) allowed.add(`project_liquidation:${liquidation.id}`);
    }

    // Story 13.11: yêu cầu đăng ký chỉ hiện với người còn quyền duyệt.
    if ((REGISTRATION_APPROVER_ROLES as readonly string[]).includes(actor.systemRole)) for (const id of idsOf("registration_request")) allowed.add(`registration_request:${id}`);

    return rows.filter((row) => allowed.has(`${row.sourceType}:${row.sourceId}`));
  }
}
