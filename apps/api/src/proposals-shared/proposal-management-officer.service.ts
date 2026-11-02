import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";

export const MANAGEMENT_OFFICER_STATUS = {
  active: "ACTIVE",
  ended: "ENDED",
  revoked: "REVOKED"
} as const;

export type ProposalManagementOfficer = {
  id: string;
  proposalId: string;
  officerUserId: string;
  assignedById: string;
  status: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  reason: string | null;
  assignmentContextVersion: unknown;
  createdAt: Date;
  updatedAt: Date;
  officer?: { id: string; username: string | null; displayName: string; status: string; systemRole: string | null; unit: string } | null;
  assignedBy?: { displayName: string } | null;
};

export type ProposalManagementOfficerResolution = {
  resolved: boolean;
  officer: ProposalManagementOfficer | null;
};

const OFFICER_INCLUDE = {
  officer: { select: { id: true, username: true, displayName: true, status: true, systemRole: true, unit: true } },
  assignedBy: { select: { displayName: true } }
};

function isEffective(row: ProposalManagementOfficer, asOf: Date) {
  return row.status === MANAGEMENT_OFFICER_STATUS.active &&
    row.effectiveFrom <= asOf &&
    (row.effectiveUntil === null || asOf < row.effectiveUntil);
}

/** Source-owned proposal officer lookup. Zero rows is a valid unassigned state; read failures fail closed. */
@Injectable()
export class ProposalManagementOfficerService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForProposal(proposalId: string, asOf = new Date()): Promise<ProposalManagementOfficerResolution> {
    if (!proposalId || Number.isNaN(asOf.valueOf())) return { resolved: false, officer: null };
    try {
      const rows = (await this.prisma.proposalManagementOfficer.findMany({
        where: { proposalId, status: MANAGEMENT_OFFICER_STATUS.active },
        include: OFFICER_INCLUDE,
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
      })) as ProposalManagementOfficer[];
      const current = rows.filter((row) => isEffective(row, asOf));
      return { resolved: current.length <= 1, officer: current.length === 1 ? current[0]! : null };
    } catch {
      return { resolved: false, officer: null };
    }
  }

  async resolveForProposals(proposalIds: string[], asOf = new Date()) {
    const resolved = new Map<string, ProposalManagementOfficerResolution>();
    if (!proposalIds.length || Number.isNaN(asOf.valueOf())) return resolved;
    try {
      const rows = (await this.prisma.proposalManagementOfficer.findMany({
        where: { proposalId: { in: proposalIds }, status: MANAGEMENT_OFFICER_STATUS.active },
        include: OFFICER_INCLUDE,
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
      })) as ProposalManagementOfficer[];
      const byProposal = new Map<string, ProposalManagementOfficer[]>();
      for (const row of rows) {
        if (!isEffective(row, asOf)) continue;
        const bucket = byProposal.get(row.proposalId) ?? [];
        bucket.push(row);
        byProposal.set(row.proposalId, bucket);
      }
      for (const proposalId of proposalIds) {
        const current = byProposal.get(proposalId) ?? [];
        resolved.set(proposalId, { resolved: current.length <= 1, officer: current.length === 1 ? current[0]! : null });
      }
    } catch {
      for (const proposalId of proposalIds) resolved.set(proposalId, { resolved: false, officer: null });
    }
    return resolved;
  }

  async isCurrentOfficer(proposalId: string, userId: string, asOf = new Date()) {
    const resolution = await this.resolveForProposal(proposalId, asOf);
    return resolution.resolved && resolution.officer?.officerUserId === userId;
  }

  async listHistory(proposalId: string) {
    return (await this.prisma.proposalManagementOfficer.findMany({
        where: { proposalId },
        include: OFFICER_INCLUDE,
        orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }]
      })) as ProposalManagementOfficer[];
  }
}

/**
 * Story 4.7 (D-038): hệ thống gán CV của đợt cho hồ sơ. Kết thúc dòng ACTIVE cũ, tạo dòng mới và tăng
 * các authorization*Version như assignManagementOfficer; không kiểm tra xung đột PI/thành viên.
 * Phải chạy trong transaction của mutation gọi nó.
 */
export async function replaceProposalManagementOfficer(prisma: PrismaService, input: { proposalId: string; officerUserId: string; assignedById: string; reason: string; now: Date }) {
  const { proposalId, officerUserId, assignedById, reason, now } = input;
  const activeRows = await prisma.proposalManagementOfficer.findMany({ where: { proposalId, status: MANAGEMENT_OFFICER_STATUS.active }, select: { id: true, effectiveUntil: true } });
  for (const row of activeRows) {
    await prisma.proposalManagementOfficer.update({ where: { id: row.id }, data: { status: MANAGEMENT_OFFICER_STATUS.ended, effectiveUntil: row.effectiveUntil && row.effectiveUntil <= now ? row.effectiveUntil : now } });
  }
  const record = await prisma.proposalManagementOfficer.create({ data: { proposalId, officerUserId, assignedById, status: MANAGEMENT_OFFICER_STATUS.active, effectiveFrom: now, effectiveUntil: null, reason } as never });
  await prisma.researchProposal.update({
    where: { id: proposalId },
    data: { authorizationRelationshipVersion: { increment: 1 }, authorizationConflictVersion: { increment: 1 }, authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } as never
  });
  return record;
}
