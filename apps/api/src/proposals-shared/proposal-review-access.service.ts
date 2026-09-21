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

  /**
   * Conflict reads have a stronger contract than ordinary reviewer access reads. A revoked or
   * expired assignment must stop granting access, but a persisted draft/submitted review remains
   * evidence of prior review activity and therefore remains a conflict. Any read failure is also
   * unresolved rather than silently becoming a no-conflict answer.
   */
  async resolveConflictForProposal(userId: string | undefined, proposalId: string, asOf = new Date()) {
    if (!userId || !proposalId) {
      return { isAssignedReviewer: false, hasPersistedReview: false, unresolved: true };
    }

    try {
      const [assignments, persistedReview] = await Promise.all([
        this.prisma.proposalReviewAssignment.findMany({
          where: { proposalId, reviewerUserId: userId },
          select: { id: true, status: true, assignmentRole: true, assignedAt: true, effectiveFrom: true, effectiveUntil: true }
        }),
        this.prisma.proposalReview.findFirst({
          where: { proposalId, reviewerUserId: userId, status: { in: ["draft", "submitted"] } },
          select: { id: true }
        })
      ]);

      return {
        isAssignedReviewer: assignments.some((assignment) => (assignment.status === "assigned" || assignment.status === "completed") && (!assignment.effectiveUntil || assignment.effectiveUntil > asOf)),
        hasPersistedReview: Boolean(persistedReview),
        unresolved: false
      };
    } catch {
      return { isAssignedReviewer: false, hasPersistedReview: false, unresolved: true };
    }
  }

  /** Resolves one user's reviewer access to one proposal. Fails closed on any read error. */
  async resolveForProposal(userId: string | undefined, proposalId: string, asOf = new Date()): Promise<ProposalReviewAccess> {
    if (!userId || !proposalId) {
      return { ...resolveProposalReviewAccess(null, asOf), conflictUnresolved: true };
    }

    try {
      const [assignments, persistedReview] = await Promise.all([
        this.prisma.proposalReviewAssignment.findMany({
          where: { proposalId, reviewerUserId: userId },
          select: { id: true, status: true, assignmentRole: true, assignedAt: true, effectiveFrom: true, effectiveUntil: true }
        }),
        this.prisma.proposalReview.findFirst({
          where: { proposalId, reviewerUserId: userId, status: { in: ["draft", "submitted"] } },
          select: { id: true }
        })
      ]);

      return { ...resolveProposalReviewAccess(assignments as ReviewAssignmentLike[], asOf), hasPersistedReview: Boolean(persistedReview), hasReviewConflict: Boolean(persistedReview) || assignments.some((assignment) => (assignment.status === "assigned" || assignment.status === "completed") && (!assignment.effectiveUntil || assignment.effectiveUntil > asOf)), conflictUnresolved: false };
    } catch {
      return { ...resolveProposalReviewAccess(null, asOf), hasPersistedReview: false, conflictUnresolved: true };
    }
  }

  /** Batch variant for list responses: one query for the whole page. */
  async resolveForProposals(userId: string | undefined, proposalIds: string[], asOf = new Date()): Promise<Map<string, ProposalReviewAccess>> {
    const resolved = new Map<string, ProposalReviewAccess>();
    if (!userId || proposalIds.length === 0) {
      return resolved;
    }

    let assignments: AssignmentRow[] = [];
    let persistedReviews: Array<{ proposalId: string }> = [];
    try {
      [assignments, persistedReviews] = await Promise.all([
        this.prisma.proposalReviewAssignment.findMany({
          where: { proposalId: { in: proposalIds }, reviewerUserId: userId },
          select: { id: true, proposalId: true, status: true, assignmentRole: true, assignedAt: true, effectiveFrom: true, effectiveUntil: true }
        }) as Promise<AssignmentRow[]>,
        this.prisma.proposalReview.findMany({
          where: { proposalId: { in: proposalIds }, reviewerUserId: userId, status: { in: ["draft", "submitted"] } },
          select: { proposalId: true }
        }) as Promise<Array<{ proposalId: string }>>
      ]);
    } catch {
      for (const proposalId of proposalIds) resolved.set(proposalId, { ...resolveProposalReviewAccess(null, asOf), hasPersistedReview: false, conflictUnresolved: true });
      return resolved;
    }

    const byProposal = new Map<string, ReviewAssignmentLike[]>();
    for (const assignment of assignments) {
      const bucket = byProposal.get(assignment.proposalId) ?? [];
      bucket.push(assignment);
      byProposal.set(assignment.proposalId, bucket);
    }

    const persisted = new Set(persistedReviews.map((review) => review.proposalId));
    for (const proposalId of proposalIds) {
      resolved.set(proposalId, { ...resolveProposalReviewAccess(byProposal.get(proposalId) ?? [], asOf), hasPersistedReview: persisted.has(proposalId), hasReviewConflict: persisted.has(proposalId) || (byProposal.get(proposalId) ?? []).some((assignment) => (assignment.status === "assigned" || assignment.status === "completed") && (!assignment.effectiveUntil || assignment.effectiveUntil > asOf)), conflictUnresolved: false });
    }

    return resolved;
  }
}
