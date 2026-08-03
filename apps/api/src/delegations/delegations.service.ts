import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
// @ts-ignore Runtime package is JavaScript; its TypeScript source is the contract.
import { isContextVersionTokenV1, type ContextVersionTokenV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertHasOrganizationScope, isScientificManagement } from "../proposals-shared/proposal-access.js";
import type { CreateDelegationDto } from "./delegations.dto.js";

@Injectable()
export class DelegationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  private token(proposal: { id: string; updatedAt: Date; authorizationRelationshipVersion: number; authorizationConflictVersion: number; authorizationDelegationVersion: number }): ContextVersionTokenV1 {
    return { domain: "proposal", recordId: proposal.id, aggregateVersion: proposal.updatedAt.getTime(), relationshipVersion: proposal.authorizationRelationshipVersion, conflictVersion: proposal.authorizationConflictVersion, delegationVersion: proposal.authorizationDelegationVersion, policyVersion: "v1" };
  }

  private checkToken(expected: unknown, actual: ContextVersionTokenV1, proposalId: string) {
    if (!isContextVersionTokenV1(expected) || (expected as ContextVersionTokenV1).domain !== "proposal" || (expected as ContextVersionTokenV1).recordId !== proposalId || JSON.stringify(expected) !== JSON.stringify(actual)) throw new BadRequestException({ message: "Dữ liệu phân quyền đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH" });
  }

  private async transactionNow(tx: any) {
    const rows = await tx.$queryRaw`SELECT CURRENT_TIMESTAMP AS "asOf"`;
    const value = rows?.[0]?.asOf;
    if (!(value instanceof Date)) throw new BadRequestException({ message: "Không đọc được thời gian giao dịch an toàn." });
    return value;
  }

  async create(actor: SafeUserContext, proposalId: string, input: CreateDelegationDto) {
    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.researchProposal.findUnique({ where: { id: proposalId } });
      if (!proposal) throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
      assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
      if (proposal.ownerId !== actor.id) throw new ForbiddenException({ message: "Chỉ người đang giữ quyền trên hồ sơ mới được đề nghị ủy quyền." });
      this.checkToken(input.contextVersion, this.token(proposal), proposalId);
      const delegate = await tx.user.findUnique({ where: { id: input.delegateUserId }, select: { id: true, status: true } });
      if (!delegate || delegate.status !== "active" || delegate.id === actor.id) throw new BadRequestException({ message: "Người được ủy quyền không hợp lệ." });
      const now = await this.transactionNow(tx);
      const grant = await tx.proposalDelegation.create({ data: { proposalId, grantorUserId: actor.id, delegateUserId: delegate.id, targetOrganizationUnitId: proposal.hostOrganizationUnitId, actionIds: input.actionIds, sourceAuthorityVersion: this.token(proposal), startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, reason: input.reason } });
      await tx.researchProposal.update({ where: { id: proposalId }, data: { authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await this.audit.record({ action: "delegation.create", result: "success", actorId: actor.id, targetEntity: "proposal-delegation", targetEntityId: grant.id, reason: JSON.stringify({ proposalId, actionIds: input.actionIds, status: grant.status }) }, tx);
      return grant;
    });
  }

  async approve(actor: SafeUserContext, grantId: string, contextVersion: unknown) {
    if (!isScientificManagement(actor)) throw new ForbiddenException({ message: "Chỉ chuyên viên quản lý khoa học được phê duyệt ủy quyền." });
    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.proposalDelegation.findUnique({ where: { id: grantId }, include: { proposal: true, grantor: true } });
      if (!grant) throw new NotFoundException({ message: "Không tìm thấy đề nghị ủy quyền." });
      assertHasOrganizationScope(actor, grant.proposal.hostOrganizationUnitId);
      this.checkToken(contextVersion, this.token(grant.proposal), grant.proposalId);
      if (grant.grantorUserId === actor.id || grant.grantor.status !== "active" || grant.grantorUserId !== grant.proposal.ownerId || grant.status !== "PENDING_APPROVAL") {
        await this.audit.record({ action: "delegation.approve", result: "failure", actorId: actor.id, targetEntity: "proposal-delegation", targetEntityId: grant.id, reason: "delegation_approval_denied" }, tx);
        throw new ForbiddenException({ message: "Không thể phê duyệt đề nghị ủy quyền này.", code: "DELEGATION_INVALID" });
      }
      const now = await this.transactionNow(tx);
      const updated = await tx.proposalDelegation.update({ where: { id: grant.id }, data: { status: "ACTIVE", approverUserId: actor.id, approvedAt: now } });
      await tx.researchProposal.update({ where: { id: grant.proposalId }, data: { authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await this.audit.record({ action: "delegation.approve", result: "success", actorId: actor.id, targetEntity: "proposal-delegation", targetEntityId: grant.id }, tx);
      return updated;
    });
  }

  async revoke(actor: SafeUserContext, grantId: string, contextVersion: unknown) {
    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.proposalDelegation.findUnique({ where: { id: grantId }, include: { proposal: true } });
      if (!grant) throw new NotFoundException({ message: "Không tìm thấy ủy quyền." });
      if (grant.grantorUserId !== actor.id) throw new ForbiddenException({ message: "Chỉ người tạo ủy quyền mới được thu hồi." });
      this.checkToken(contextVersion, this.token(grant.proposal), grant.proposalId);
      const now = await this.transactionNow(tx);
      const updated = await tx.proposalDelegation.update({ where: { id: grant.id }, data: { status: "REVOKED", revokedAt: now } });
      await tx.researchProposal.update({ where: { id: grant.proposalId }, data: { authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await this.audit.record({ action: "delegation.revoke", result: "success", actorId: actor.id, targetEntity: "proposal-delegation", targetEntityId: grant.id }, tx);
      return updated;
    });
  }

  async reject(actor: SafeUserContext, grantId: string, contextVersion: unknown) {
    if (!isScientificManagement(actor)) throw new ForbiddenException({ message: "Chỉ chuyên viên quản lý khoa học được từ chối ủy quyền." });
    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.proposalDelegation.findUnique({ where: { id: grantId }, include: { proposal: true } });
      if (!grant) throw new NotFoundException({ message: "Không tìm thấy đề nghị ủy quyền." });
      assertHasOrganizationScope(actor, grant.proposal.hostOrganizationUnitId);
      this.checkToken(contextVersion, this.token(grant.proposal), grant.proposalId);
      if (grant.grantorUserId === actor.id || grant.status !== "PENDING_APPROVAL") throw new ForbiddenException({ message: "Không thể từ chối đề nghị ủy quyền này." });
      const now = await this.transactionNow(tx);
      const updated = await tx.proposalDelegation.update({ where: { id: grant.id }, data: { status: "REJECTED" } });
      await tx.researchProposal.update({ where: { id: grant.proposalId }, data: { authorizationDelegationVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await this.audit.record({ action: "delegation.reject", result: "success", actorId: actor.id, targetEntity: "proposal-delegation", targetEntityId: grant.id }, tx);
      return updated;
    });
  }

  async list(actor: SafeUserContext, proposalId: string) {
    const proposal = await this.prisma.researchProposal.findUnique({ where: { id: proposalId }, select: { id: true, hostOrganizationUnitId: true, ownerId: true } });
    if (!proposal) throw new NotFoundException({ message: "Không tìm thấy hồ sơ đề xuất." });
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    if (proposal.ownerId !== actor.id && !isScientificManagement(actor)) throw new ForbiddenException({ message: "Không có quyền xem ủy quyền của hồ sơ này." });
    return this.prisma.proposalDelegation.findMany({ where: { proposalId }, orderBy: { createdAt: "desc" } });
  }
}
