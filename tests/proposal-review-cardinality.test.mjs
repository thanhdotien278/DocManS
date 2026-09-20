import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProposalReviewAssignmentsService } from '../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js';
import { ProposalEvaluationSummaryService } from '../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js';
import { proposalContextVersion } from '../dist/apps/api/proposals-shared/proposal-mutation.js';

const actor = { id: 'staff', systemRole: 'SCIENTIFIC_MANAGEMENT_STAFF', organizationScopes: [{ id: 'unit' }] };
const proposal = { id: 'proposal', status: 'under_review', hostOrganizationUnitId: 'unit', updatedAt: new Date(), authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 1 };
const participation = { evaluateConflict: async () => ({ conflicted: false }) };
const access = { resolveForProposal: async () => ({ isAssignedReviewer: false }) };
function roster(reviewers, council) {
  return Array.from({ length: reviewers + council }, (_, i) => ({ id: String(i), reviewerUserId: String(i), assignmentRole: i < reviewers ? 'reviewer' : 'committee_member', status: 'completed' }));
}
const submitted = assignments => assignments.map(a => ({ assignmentId: a.id, status: 'submitted', totalScore: 80 }));

test('readiness requires exactly two reviewers, at least three distinct council members and every review', () => {
  const service = new ProposalEvaluationSummaryService();
  for (const [r, c, ready] of [[0, 0, false], [1, 3, false], [2, 0, false], [2, 2, false], [3, 3, false], [2, 3, true], [2, 4, true]]) {
    const assignments = roster(r, c);
    assert.equal(service.summarizeProgress(assignments, submitted(assignments)).allReviewsSubmitted, ready, `${r} reviewers, ${c} council`);
  }
  const assignments = roster(2, 3);
  assert.equal(service.summarizeProgress(assignments, submitted(assignments).slice(1)).allReviewsSubmitted, false);
  for (const index of [0, 4]) {
    const revoked = assignments.map((a, i) => i === index ? { ...a, status: 'revoked' } : a);
    assert.equal(service.summarizeProgress(revoked, submitted(assignments)).allReviewsSubmitted, false);
    const replacement = [...revoked, { ...assignments[index], id: 'replacement', reviewerUserId: 'replacement' }];
    assert.equal(service.summarizeProgress(replacement, submitted(replacement)).allReviewsSubmitted, true);
  }
  const duplicate = assignments.map((a, i) => i === 4 ? { ...a, reviewerUserId: assignments[3].reviewerUserId } : a);
  assert.equal(service.summarizeProgress(duplicate, submitted(duplicate)).allReviewsSubmitted, false);
});

test('third reviewer is rejected inside the locked proposal mutation before any write', async () => {
  let locked = false;
  const tx = {
    $queryRaw: async strings => { if (strings.join('').includes('research_proposals')) locked = true; return []; },
    researchProposal: { findUnique: async () => proposal },
    user: { findUnique: async ({ where }) => where.id === actor.id
      ? { ...actor, status: 'active', organizationScopes: [{ organizationUnit: { id: 'unit', status: 'active' } }] }
      : { id: 'third', status: 'active', researcherProfile: null } },
    proposalReviewAssignment: { count: async ({ where }) => {
      assert.equal(locked, true);
      assert.equal(where.proposalId, proposal.id);
      assert.equal(where.assignmentRole, 'reviewer');
      assert.deepEqual(where.status.in, ['assigned', 'completed']);
      return 2;
    } },
    // The production conflict resolver uses these reads before the cardinality check.
    proposalMember: { findMany: async () => [] },
    proposalParticipation: { findMany: async () => [] }
  };
  const service = new ProposalReviewAssignmentsService({ $transaction: async work => work(tx) }, {}, participation, access);
  await assert.rejects(() => service.assignReviewer(actor, proposal.id, { reviewerUserId: 'third', contextVersion: proposalContextVersion(proposal) }), /2 người phản biện/);
});

test('readiness rechecks assignments after locking, rejecting a concurrent revocation before writes', async () => {
  const assignments = roster(2, 3);
  let locked = false;
  const tx = {
    $queryRaw: async () => { locked = true; return []; },
    proposalReviewAssignment: { findMany: async () => { assert.equal(locked, true); return assignments.slice(1); } },
    proposalReview: { findMany: async () => submitted(assignments) }
  };
  const prisma = {
    researchProposal: { findUnique: async () => proposal },
    proposalEvaluationSummary: { findFirst: async () => null },
    $transaction: async work => work(tx)
  };
  const service = new ProposalEvaluationSummaryService(prisma, {}, { findAssignments: async () => assignments, findReviews: async () => submitted(assignments) }, {}, participation, access);
  await assert.rejects(() => service.saveEvaluationSummary(actor, proposal.id, { summary: 'Đủ điều kiện', recommendation: 'approve', markReady: true }), /Phân công đã thay đổi/);
});
