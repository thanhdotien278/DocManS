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

test('Staff cannot assign reviewers or synthesize even on an under-review proposal', async () => {
  const prisma = { researchProposal: { findUnique: async () => proposal } };
  const assignments = new ProposalReviewAssignmentsService(prisma, {}, participation, access);
  assignments.transactional = true;
  await assert.rejects(() => assignments.assignReviewer(actor, proposal.id, { reviewerUserId: 'third' }), /Trưởng phòng/);
  const summary = new ProposalEvaluationSummaryService(prisma, {}, {}, {}, participation, access);
  summary.transactional = true;
  for (const method of ['saveEvaluationSummary', 'finalizeEvaluationSummary', 'submitCompletedPackage']) {
    await assert.rejects(() => summary[method](actor, proposal.id, { summary: 'Đủ điều kiện', recommendation: 'approve' }), /Trưởng phòng/);
  }
});

test('Head cannot route a draft or synthesize incomplete current reviews', async () => {
  const head = { ...actor, systemRole: 'SCIENTIFIC_MANAGEMENT_HEAD' };
  const submission = { id: 'submission', submittedAt: new Date(1), snapshot: { members: [], attachments: [], requiredPackage: [] } };
  const prisma = {
    researchProposal: { findUnique: async () => ({ ...proposal, submittedAt: new Date(1) }) },
    proposalSubmissionEvent: { findMany: async query => query.where.snapshot ? [{ snapshot: { submissionEventId: 'submission', readiness: { ready: true } } }] : [submission] },
    proposalEvaluationSummary: { findFirst: async () => ({ status: 'draft' }) }
  };
  const assignments = roster(2, 3);
  const summary = new ProposalEvaluationSummaryService(prisma, {}, {
    findCurrentRoundAssignments: async () => assignments,
    findCurrentRoundReviews: async () => submitted(assignments).slice(1)
  }, {}, participation, { resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false }) });
  summary.transactional = true;
  await assert.rejects(() => summary.saveEvaluationSummary(head, proposal.id, { summary: 'Đủ điều kiện', recommendation: 'approve' }), /đầy đủ phiếu/);
  await assert.rejects(() => summary.submitCompletedPackage(head, proposal.id), /phải được Trưởng phòng chốt/);
});

test('finalized synthesis refuses a replaced review roster without regenerating its evidence', async () => {
  const head = { ...actor, systemRole: 'SCIENTIFIC_MANAGEMENT_HEAD' };
  const assignments = roster(2, 3).map(row => ({ ...row, reviewedSubmissionEventId: 'submission', reviewer: { status: 'active' } }));
  const reviews = submitted(assignments).map((row, index) => ({ ...row, id: `review-${index}`, submissionEventId: 'submission' }));
  const frozen = { id: 'summary', status: 'finalized', revision: 2, evidenceSnapshot: { lifecycle: 'finalized', submissionEventId: 'submission', assignmentIds: assignments.map(row => row.id), reviewIds: reviews.map(row => row.id) } };
  const submission = { id: 'submission', submittedAt: new Date(1), snapshot: { members: [], attachments: [], requiredPackage: [] } };
  const db = {
    $queryRaw: async () => [{ asOf: new Date() }],
    researchProposal: { findUnique: async () => ({ ...proposal, submittedAt: new Date(1) }) },
    proposalSubmissionEvent: { findMany: async query => query.where.snapshot ? [{ snapshot: { submissionEventId: 'submission', readiness: { ready: true } } }] : [submission] },
    proposalEvaluationSummary: { findFirst: async () => frozen, findUnique: async () => frozen },
    proposalReviewAssignment: { findMany: async () => assignments.map((row, index) => index === 0 ? { ...row, id: 'replacement' } : row) },
    proposalReview: { findMany: async () => reviews }
  };
  db.$transaction = async work => work(db);
  const service = new ProposalEvaluationSummaryService(db, {}, { findCurrentRoundAssignments: async () => assignments, findCurrentRoundReviews: async () => reviews }, {}, participation, { resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false }) });
  service.transactional = true;
  await assert.rejects(() => service.submitCompletedPackage(head, proposal.id), error => error.getResponse?.().code === 'PACKAGE_CONTEXT_MISMATCH');
  assert.equal(frozen.status, 'finalized');
  assert.equal(frozen.evidenceSnapshot.assignmentIds[0], '0');
});
