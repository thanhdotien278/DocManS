import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
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
  constructor(private readonly prisma: PrismaService) {}

  /** Lịch sử và trạng thái tờ trình của một hồ sơ/đề tài, lọc theo scope người xem. */
  async forSubject(actor: SafeUserContext, subjectType: string, subjectId: string) {
    if (subjectType !== "proposal" && subjectType !== "project") throw new BadRequestException({ message: "Loại đối tượng không hợp lệ." });
    if (!subjectId) throw new BadRequestException({ message: "Thiếu mã đối tượng." });
    const rows = (await this.prisma.approvalSubmission.findMany({ where: { subjectType, subjectId }, include: INCLUDE, orderBy: { createdAt: "desc" }, take: 50 })) as unknown as SubmissionWithRelations[];
    const visible = rows.filter((row) => canViewApproval(actor, row));
    if (rows.length && !visible.length) throw new ForbiddenException({ message: "Không có quyền xem tờ trình của hồ sơ này." });
    return { submissions: await Promise.all(visible.map(async (row) => this.toResponse(row, await resolveApprovalActions(this.prisma, actor, row)))) };
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
