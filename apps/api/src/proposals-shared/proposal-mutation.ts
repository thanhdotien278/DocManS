import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
// @ts-ignore Runtime and TypeScript contracts share the same registry.
import { isContextVersionTokenV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { PrismaService } from "../infrastructure/prisma/prisma.service.js";

export function proposalContextVersion(proposal: { id: string; updatedAt: Date; authorizationRelationshipVersion: number; authorizationConflictVersion: number; authorizationDelegationVersion: number }) {
  return { domain: "proposal", recordId: proposal.id, aggregateVersion: proposal.updatedAt.getTime(), relationshipVersion: proposal.authorizationRelationshipVersion, conflictVersion: proposal.authorizationConflictVersion, delegationVersion: proposal.authorizationDelegationVersion, policyVersion: "v1" };
}

export function assertProposalContext(expected: unknown, proposal: Parameters<typeof proposalContextVersion>[0]) {
  const actual = proposalContextVersion(proposal);
  if (!isContextVersionTokenV1(expected) || !Object.entries(actual).every(([key, value]) => (expected as Record<string, unknown>)[key] === value)) {
    throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Hồ sơ đã thay đổi. Vui lòng tải lại và thực hiện lại thao tác." });
  }
}

// Existing domain operations compose transactions. Inside this scope they join the same
// transaction, so relationship changes, workflow evidence and audit commit together.
export function joinedTransaction(tx: Prisma.TransactionClient): PrismaService {
  return new Proxy(tx, { get(target, key) { return key === "$transaction" ? (work: (client: Prisma.TransactionClient) => unknown) => work(tx) : Reflect.get(target, key); } }) as PrismaService;
}

export async function runProposalMutation<T>(prisma: PrismaService, actor: SafeUserContext, proposalId: string | null, expected: unknown, work: (client: PrismaService, currentActor: SafeUserContext) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
      const user = await tx.user.findUnique({ where: { id: actor.id }, include: { organizationScopes: { include: { organizationUnit: true } } } });
      if (!user || user.status !== "active") throw new ForbiddenException({ code: "ACCOUNT_INACTIVE", message: "Tài khoản hiện không hoạt động." });
      const currentActor: SafeUserContext = { id: user.id, username: user.username, displayName: user.displayName, systemRole: user.systemRole as SafeUserContext["systemRole"], unit: user.unit, organizationScopes: user.organizationScopes.filter((s) => s.organizationUnit.status === "active").map((s) => ({ id: s.organizationUnit.id, code: s.organizationUnit.code, name: s.organizationUnit.name })) };
      if (proposalId) {
        await tx.$queryRaw`SELECT id FROM research_proposals WHERE id = ${proposalId} FOR UPDATE`;
        const proposal = await tx.researchProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
        assertProposalContext(expected, proposal);
      }
      return work(joinedTransaction(tx), currentActor);
    }, { isolationLevel: "Serializable", timeout: 15000 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2034") throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Hồ sơ đã thay đổi. Vui lòng tải lại và thực hiện lại thao tác." });
    throw error;
  }
}
