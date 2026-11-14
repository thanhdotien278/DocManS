import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ApprovedProjectsService } from "../approved-projects/approved-projects.service.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { canReadProposal } from "../proposals-shared/proposal-access.js";
import { ProposalManagementOfficerService } from "../proposals-shared/proposal-management-officer.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import {
  actorConflicted,
  advanceApprovalSubmission,
  APPROVAL_KIND_LABELS,
  APPROVAL_SIGNER_LABELS,
  APPROVAL_STAGE_LABELS,
  APPROVAL_STATUS_LABELS,
  canViewApproval,
  resolveApprovalActions,
  returnApprovalSubmission,
  type ApprovalStage,
  type ApprovalSubmissionRow
} from "../proposals-shared/approval-routing.js";

type SubmissionWithRelations = ApprovalSubmissionRow & {
  submittedBy?: { displayName: string } | null;
  steps?: Array<{ stage: string; action: string; note: string | null; createdAt: Date; actor?: { displayName: string } | null }>;
};

const INCLUDE = {
  submittedBy: { select: { displayName: true } },
  steps: { include: { actor: { select: { displayName: true } } }, orderBy: { createdAt: "asc" as const } }
};

/** API tờ trình theo hồ sơ nguồn; quy tắc luồng nằm ở proposals-shared/approval-routing.ts. */
@Injectable()
export class ApprovalRoutingService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  /**
   * Lịch sử và trạng thái tờ trình của một hồ sơ/đề tài. Ngoài vai trò, người xem phải đọc được chính hồ sơ/đề tài đó
   * (hoặc là người lập tờ trình) và không xung đột lợi ích. Không đủ quyền thì trả danh sách rỗng, không 403,
   * để không lộ việc hồ sơ có tờ trình hay không.
   */
  async forSubject(actor: SafeUserContext, subjectType: string, subjectId: string) {
    if (subjectType !== "proposal" && subjectType !== "project") throw new BadRequestException({ message: "Loại đối tượng không hợp lệ." });
    if (!subjectId) throw new BadRequestException({ message: "Thiếu mã đối tượng." });
    const rows = (await this.prisma.approvalSubmission.findMany({ where: { subjectType, subjectId }, include: INCLUDE, orderBy: { createdAt: "desc" }, take: 50 })) as unknown as SubmissionWithRelations[];
    const byRole = rows.filter((row) => canViewApproval(actor, row));
    if (!byRole.length || (subjectType === "proposal" && await actorConflicted(this.prisma as never, actor, { subjectType, subjectId }))) return { submissions: [] };
    const readable = await this.canReadSubject(actor, subjectType, subjectId);
    const visible = byRole.filter((row) => readable || row.submittedById === actor.id);
    return { submissions: await Promise.all(visible.map(async (row) => this.toResponse(row, await resolveApprovalActions(this.prisma, actor, row)))) };
  }

  private async canReadSubject(actor: SafeUserContext, subjectType: string, subjectId: string) {
    if (subjectType === "project") {
      return new ApprovedProjectsService(this.prisma, this.auditLog).loadAuthorized(this.prisma, actor, subjectId).then(() => true, (error) => {
        if (error instanceof ForbiddenException || error instanceof NotFoundException) return false;
        throw error;
      });
    }
    const proposal = await this.prisma.researchProposal.findUnique({ where: { id: subjectId }, select: { id: true, ownerId: true, status: true, hostOrganizationUnitId: true, createdAt: true } });
    if (!proposal) return false;
    const asOf = new Date();
    const [participation, reviewAccess, officers] = await Promise.all([
      new ProposalParticipationService(this.prisma).resolveForProposals(actor.id, [proposal], asOf),
      new ProposalReviewAccessService(this.prisma).resolveForProposals(actor.id, [proposal.id], asOf),
      new ProposalManagementOfficerService(this.prisma).resolveForProposals([proposal.id], asOf)
    ]);
    return canReadProposal(actor, proposal, participation.get(proposal.id), reviewAccess.get(proposal.id), officers.get(proposal.id));
  }

  advance(actor: SafeUserContext, id: string, input: { expectedStage: ApprovalStage; note: unknown }) {
    return this.run(actor, id, (tx) => advanceApprovalSubmission(tx, actor, id, { expectedStage: input.expectedStage, note: input.note as string | null | undefined }));
  }

  returnToAuthor(actor: SafeUserContext, id: string, input: { expectedStage: ApprovalStage; note: unknown }) {
    return this.run(actor, id, (tx) => returnApprovalSubmission(tx, actor, id, input));
  }

  private async run(actor: SafeUserContext, id: string, work: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    await this.prisma.$transaction(work);
    const row = (await this.prisma.approvalSubmission.findUniqueOrThrow({ where: { id }, include: INCLUDE })) as unknown as SubmissionWithRelations;
    return this.toResponse(row, await resolveApprovalActions(this.prisma, actor, row));
  }

  private toResponse(row: SubmissionWithRelations, actions: { advance: boolean; return: boolean }) {
    return {
      id: row.id,
      kind: row.kind,
      kindLabel: APPROVAL_KIND_LABELS[row.kind] ?? row.kind,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      title: row.title,
      stage: row.stage,
      stageLabel: APPROVAL_STAGE_LABELS[row.stage] ?? row.stage,
      status: row.status,
      statusLabel: APPROVAL_STATUS_LABELS[row.status] ?? row.status,
      signerLabel: APPROVAL_SIGNER_LABELS[row.signer],
      submittedByName: row.submittedBy?.displayName ?? "",
      lastNote: row.lastNote ?? "",
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      actions,
      steps: (row.steps ?? []).map((step) => ({ stage: step.stage, action: step.action, actorName: step.actor?.displayName ?? "", note: step.note ?? "", createdAt: step.createdAt.toISOString() }))
    };
  }
}
