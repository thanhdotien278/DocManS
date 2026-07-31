import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  evaluateProposalConflict,
  normalizeParticipationRole,
  resolveProposalParticipation,
  type ProposalConflictDecision,
  type ProposalParticipation
} from "../proposals-shared/proposal-participation.js";
import type { ProposalMemberInput, ProposalMemberPersistInput } from "../proposals-shared/proposal-types.js";

type ParticipationMemberRecord = {
  proposalId: string;
  userId: string | null;
  participationRole: string | null;
  createdAt: Date;
  status: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

/** Source-owned relationship facts consumed by shared authorization projections. */
export interface ProposalRelationshipFactProvider {
  findForProposals(proposalIds: string[], userId?: string, asOf?: Date): Promise<ParticipationMemberRecord[]>;
}

type ProposalOwnerRecord = {
  id: string;
  ownerId: string;
  createdAt: Date;
};

/**
 * ST-3.0 — the single backend seam for proposal participation.
 *
 * Both authorization (`canReadProposal`) and response shaping read participation from here, so
 * the frontend never has to infer a record role from the account-level system role
 * (TN-ST-3.0-02). ST-3.2 (reviewer assignment) and ST-3.5 (approval) consume `evaluateConflict`.
 */
@Injectable()
export class ProposalParticipationService implements ProposalRelationshipFactProvider {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves one user's participation on one proposal. Pass `members` to avoid a second query. */
  async resolveForProposal(
    userId: string | undefined,
    proposal: { id: string; ownerId: string; createdAt: Date },
    members?: Array<{ userId?: string | null; participationRole?: string | null; createdAt?: Date | null; status?: string | null; effectiveFrom?: Date | null; effectiveUntil?: Date | null }>,
    asOf = new Date()
  ): Promise<ProposalParticipation> {
    const participationMembers = members ?? (await this.findForProposals([proposal.id], userId, asOf));

    return resolveProposalParticipation({
      userId,
      asOf,
      proposal,
      members: participationMembers
    });
  }

  /**
   * Batch variant for list responses: one query for the whole page, narrowed to this user's own
   * participation rows since nobody else's relationships affect what this user is on the record.
   */
  async resolveForProposals(userId: string | undefined, proposals: ProposalOwnerRecord[], asOf = new Date()): Promise<Map<string, ProposalParticipation>> {
    const resolved = new Map<string, ProposalParticipation>();
    if (proposals.length === 0) {
      return resolved;
    }

    if (!userId) {
      for (const proposal of proposals) {
        resolved.set(proposal.id, resolveProposalParticipation({ userId, asOf, proposal, members: null }));
      }
      return resolved;
    }

    const members = await this.findForProposals(
      proposals.map((proposal) => proposal.id),
      userId,
      asOf
    );
    const membersByProposal = new Map<string, ParticipationMemberRecord[]>();
    for (const member of members) {
      const bucket = membersByProposal.get(member.proposalId) ?? [];
      bucket.push(member);
      membersByProposal.set(member.proposalId, bucket);
    }

    for (const proposal of proposals) {
      resolved.set(
        proposal.id,
        resolveProposalParticipation({
          userId,
          asOf,
          proposal,
          members: membersByProposal.get(proposal.id) ?? []
        })
      );
    }

    return resolved;
  }

  /**
   * The shared conflict primitive as consumed over the database (AC-ST-3.0-04). Fails closed:
   * a missing candidate or an unreadable proposal reports a conflict rather than an approval
   * (TN-ST-3.0-03).
   */
  async evaluateConflict(candidateUserId: string | undefined | null, proposalId: string): Promise<ProposalConflictDecision> {
    if (!candidateUserId || !proposalId) {
      return evaluateProposalConflict(null);
    }

    let proposal: ProposalOwnerRecord | null = null;
    try {
      proposal = (await this.prisma.researchProposal.findUnique({
        where: { id: proposalId },
        select: { id: true, ownerId: true, createdAt: true }
      })) as ProposalOwnerRecord | null;
    } catch {
      return evaluateProposalConflict(null);
    }

    if (!proposal) {
      return evaluateProposalConflict(null);
    }

    const participation = await this.resolveForProposal(candidateUserId, proposal);
    return evaluateProposalConflict(participation);
  }

  /**
   * Turns submitted member entries into persistable rows, resolving `userId`/`username` to a real
   * account (AC-ST-3.0-01). Entries carrying neither stay valid as descriptive external
   * participants; entries naming an account that does not exist are rejected rather than silently
   * saved unlinked, because a silently-unlinked participant defeats the conflict rule.
   */
  async resolveMemberAccounts(members: ProposalMemberInput[]): Promise<ProposalMemberPersistInput[]> {
    const requestedIds = [...new Set(members.map((member) => member.userId).filter((value): value is string => Boolean(value)))];
    const requestedUsernames = [
      ...new Set(members.map((member) => member.username?.trim().toLowerCase()).filter((value): value is string => Boolean(value)))
    ];

    const accounts =
      requestedIds.length || requestedUsernames.length
        ? ((await this.prisma.user.findMany({
            where: {
              OR: [
                ...(requestedIds.length ? [{ id: { in: requestedIds } }] : []),
                ...(requestedUsernames.length ? [{ usernameKey: { in: requestedUsernames } }] : [])
              ]
            },
            select: { id: true, usernameKey: true }
          })) as Array<{ id: string; usernameKey: string }>)
        : [];

    const byId = new Map(accounts.map((account) => [account.id, account.id]));
    const byUsernameKey = new Map(accounts.map((account) => [account.usernameKey, account.id]));

    return members.map((member) => {
      const usernameKey = member.username?.trim().toLowerCase();
      let userId: string | null = null;

      if (member.userId) {
        userId = byId.get(member.userId) ?? null;
        if (!userId) {
          throw new BadRequestException({ message: `Không tìm thấy tài khoản hệ thống cho thành viên "${member.name}".` });
        }
      } else if (usernameKey) {
        userId = byUsernameKey.get(usernameKey) ?? null;
        if (!userId) {
          throw new BadRequestException({ message: `Không tìm thấy tài khoản hệ thống cho thành viên "${member.name}".` });
        }
      }

      return {
        name: member.name,
        role: member.role,
        organization: member.organization,
        userId,
        participationRole: normalizeParticipationRole(member.participationRole ?? member.role)
      };
    });
  }

  async findForProposals(proposalIds: string[], userId?: string, _asOf = new Date()): Promise<ParticipationMemberRecord[]> {
    if (proposalIds.length === 0) {
      return [];
    }

    return (await this.prisma.proposalMember.findMany({
      where: { proposalId: { in: proposalIds }, ...(userId ? { userId } : {}) },
      select: { proposalId: true, userId: true, participationRole: true, createdAt: true, status: true, effectiveFrom: true, effectiveUntil: true }
    })) as ParticipationMemberRecord[];
  }
}
