import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProposalReviewAssignmentsService } from '../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js';
import { ProposalEvaluationSummaryService } from '../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js';
import { proposalContextVersion } from '../dist/apps/api/proposals-shared/proposal-mutation.js';

const actor = { id: 'staff', systemRole: 'RESEARCH_MANAGEMENT_STAFF', organizationScopes: [{ id: 'unit' }] };
const proposal = { id: 'proposal', status: 'under_review', hostOrganizationUnitId: 'unit', updatedAt: new Date(), authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 1 };
const participation = { evaluateConflict: async () => ({ conflicted: false }) };
const access = { resolveForProposal: async () => ({ isAssignedReviewer: false }) };
function roster(reviewers, council) {
  return Array.from({ length: reviewers + council }, (_, i) => ({ id: String(i), reviewerUserId: String(i), assignmentRole: i < reviewers ? 'reviewer' : 'committee_member', status: 'completed' }));
}
const submitted = assignments => assignments.map(a => ({ assignmentId: a.id, status: 'submitted', totalScore: 80 }));

const COUNCIL = ['council_chair', 'reviewer', 'reviewer', 'committee_member', 'committee_member', 'committee_member', 'council_secretary'];
function council(roles = COUNCIL) {
  return roles.map((assignmentRole, i) => ({ id: String(i), reviewerUserId: String(i), assignmentRole, status: 'completed', invitationStatus: 'accepted' }));
}
const scoringSubmitted = assignments => submitted(assignments.filter(a => a.assignmentRole !== 'council_secretary'));

test('readiness needs an established council and a review from every scoring member; the secretary does not score', async () => {
  const { councilRosterBlockers } = await import('../dist/apps/api/proposal-evaluations/proposal-evaluation-support.js');
  const service = new ProposalEvaluationSummaryService();
  const full = council();
  const ready = (assignments, reviews) => service.summarizeProgress(assignments, reviews).allReviewsSubmitted;

  assert.equal(ready(full, scoringSubmitted(full)), true);
  assert.equal(service.summarizeProgress(full, scoringSubmitted(full)).scoringMemberCount, 6);
  assert.equal(ready([], []), false);
  assert.equal(ready(full, scoringSubmitted(full).slice(1)), false);
  assert.equal(ready(full.map((a, i) => i === 3 ? { ...a, councilEstablishedAt: null } : a), scoringSubmitted(full)), false);
  const secretaryOnly = council(['council_secretary']);
  assert.equal(ready(secretaryOnly, []), false);
  const duplicate = full.map((a, i) => i === 4 ? { ...a, reviewerUserId: full[3].reviewerUserId } : a);
  assert.equal(ready(duplicate, scoringSubmitted(duplicate)), false);

  // Cơ cấu 1 CT + 2 PB + (memberCount − 4) UV + 1 TK chỉ kiểm khi lập tờ trình và khi ký.
  assert.deepEqual(councilRosterBlockers(full, 7), []);
  assert.deepEqual(councilRosterBlockers(full.filter(a => a.assignmentRole !== 'council_secretary'), 7), ['Cần 1 Thư ký hội đồng (hiện 0).']);
  assert.deepEqual(councilRosterBlockers(full, 8), ['Cần 4 Ủy viên (hiện 3).']);
  assert.deepEqual(
    councilRosterBlockers(full.map((a, i) => ({ ...a, invitationStatus: i === 0 ? 'invited' : i === 1 ? 'declined' : 'accepted' })), 7),
    ['1 thành viên chưa chấp nhận lời mời.', '1 thành viên đã từ chối: thu hồi và mời người khác.']
  );
});

test('CV cannot invite by default, and a configured CV must still be the officer in charge', async () => {
  const configured = { findUnique: async () => ({ value: JSON.stringify({ allowedRoles: ['RESEARCH_MANAGEMENT_STAFF'], memberCount: 7 }), updatedAt: new Date() }) };
  const base = { researchProposal: { findUnique: async () => proposal }, proposalManagementOfficer: { findFirst: async () => null } };
  const invite = prisma => new ProposalReviewAssignmentsService(prisma, {}, participation, access);
  const input = { reviewerUserId: 'third', assignmentRole: 'council_chair' };

  const byDefault = invite({ ...base, systemParameter: { findUnique: async () => null } });
  byDefault.transactional = true;
  await assert.rejects(() => byDefault.assignReviewer(actor, proposal.id, input), error => error.getResponse().code === 'COUNCIL_FORMATION_DENIED');

  const notOfficer = invite({ ...base, systemParameter: configured });
  notOfficer.transactional = true;
  await assert.rejects(() => notOfficer.assignReviewer(actor, proposal.id, input), error => error.getResponse().code === 'COUNCIL_FORMATION_DENIED' && /phụ trách/.test(error.getResponse().message));

  const summary = new ProposalEvaluationSummaryService(base, {}, {}, {}, participation, access);
  summary.transactional = true;
  for (const method of ['saveEvaluationSummary', 'finalizeEvaluationSummary', 'submitCompletedPackage']) {
    await assert.rejects(() => summary[method](actor, proposal.id, { summary: 'Đủ điều kiện', recommendation: 'approve' }), /không còn là chuyên viên phụ trách/);
  }
});

test('Head cannot finalize or route while current reviews are incomplete', async () => {
  const head = { ...actor, systemRole: 'RESEARCH_MANAGEMENT_HEAD' };
  const submission = { id: 'submission', submittedAt: new Date(1), snapshot: { members: [], attachments: [], requiredPackage: [] } };
  const assignments = roster(2, 3).map(row => ({ ...row, reviewedSubmissionEventId: 'submission', reviewer: { status: 'active' } }));
  const reviews = submitted(assignments).slice(1).map((row, index) => ({ ...row, id: `review-${index}`, submissionEventId: 'submission' }));
  const draft = { id: 'summary', status: 'draft', revision: 1, evidenceSnapshot: {} };
  const prisma = {
    $queryRaw: async () => [{ asOf: new Date() }],
    researchProposal: { findUnique: async () => ({ ...proposal, submittedAt: new Date(1) }) },
    proposalSubmissionEvent: { findMany: async query => query.where.snapshot ? [{ snapshot: { submissionEventId: 'submission', readiness: { ready: true } } }] : [submission] },
    proposalEvaluationSummary: { findFirst: async () => draft, findUnique: async () => draft },
    proposalReviewAssignment: { findMany: async () => assignments },
    proposalReview: { findMany: async () => reviews }
  };
  prisma.$transaction = async work => work(prisma);
  const summary = new ProposalEvaluationSummaryService(prisma, {}, {
    findCurrentRoundAssignments: async () => assignments,
    findCurrentRoundReviews: async () => reviews
  }, {}, participation, { resolveForProposal: async () => ({ isAssignedReviewer: false }), resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false }) });
  summary.transactional = true;
  await assert.rejects(() => summary.finalizeEvaluationSummary(head, proposal.id, {}), /Còn 1 phiếu chưa gửi/);
  await assert.rejects(() => summary.submitCompletedPackage(head, proposal.id), /phải được chốt/);
});

test('finalized synthesis refuses a replaced review roster without regenerating its evidence', async () => {
  const head = { ...actor, systemRole: 'RESEARCH_MANAGEMENT_HEAD' };
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
  const service = new ProposalEvaluationSummaryService(db, {}, { findCurrentRoundAssignments: async () => assignments, findCurrentRoundReviews: async () => reviews }, {}, participation, { resolveForProposal: async () => ({ isAssignedReviewer: false }), resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false }) });
  service.transactional = true;
  await assert.rejects(() => service.submitCompletedPackage(head, proposal.id), error => error.getResponse?.().code === 'PACKAGE_CONTEXT_MISMATCH');
  assert.equal(frozen.status, 'finalized');
  assert.equal(frozen.evidenceSnapshot.assignmentIds[0], '0');
});
