import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { resolveProposalReviewAccess, type ProposalReviewAccess, type ReviewAssignmentLike } from "./proposal-review-access.js";

type AssignmentRow = ReviewAssignmentLike & { proposalId: string };

/**
 * ST-3.2 — the single backend seam for "is this user an assigned reviewer on this proposal".
 *
 * It depends on Prisma alone so any module that has to answer that question (proposal reads, file
 * reads, the evaluation module itself) can provide it directly without importing another feature
 * module — the same shape `ProposalParticipationService` already uses.
 */
@Injectable()
export class ProposalReviewAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves one user's reviewer access to one proposal. Fails closed on any read error. */
  async resolveForProposal(userId: string | undefined, proposalId: string, asOf = new Date()): Promise<ProposalReviewAccess> {
    if (!userId || !proposalId) {
      return resolveProposalReviewAccess(null, asOf);
    }

    try {
      const assignments = (await this.prisma.proposalReviewAssignment.findMany({
        where: { proposalId, reviewerUserId: userId },
        select: { id: true, status: true, assignmentRole: true, assignedAt: true, effectiveFrom: true, effectiveUntil: true }
      })) as ReviewAssignmentLike[];

      return resolveProposalReviewAccess(assignments, asOf);
    } catch {
      return resolveProposalReviewAccess(null, asOf);
    }
  }

  /** Batch variant for list responses: one query for the whole page. */
  async resolveForProposals(userId: string | undefined, proposalIds: string[], asOf = new Date()): Promise<Map<string, ProposalReviewAccess>> {
    const resolved = new Map<string, ProposalReviewAccess>();
    if (!userId || proposalIds.length === 0) {
      return resolved;
    }

    let assignments: AssignmentRow[] = [];
    try {
      assignments = (await this.prisma.proposalReviewAssignment.findMany({
        where: { proposalId: { in: proposalIds }, reviewerUserId: userId },
        select: { id: true, proposalId: true, status: true, assignmentRole: true, assignedAt: true, effectiveFrom: true, effectiveUntil: true }
      })) as AssignmentRow[];
    } catch {
      return resolved;
    }

    const byProposal = new Map<string, ReviewAssignmentLike[]>();
    for (const assignment of assignments) {
      const bucket = byProposal.get(assignment.proposalId) ?? [];
      bucket.push(assignment);
      byProposal.set(assignment.proposalId, bucket);
    }

    for (const proposalId of proposalIds) {
      resolved.set(proposalId, resolveProposalReviewAccess(byProposal.get(proposalId) ?? [], asOf));
    }

    return resolved;
  }
}
