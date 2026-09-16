import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from '../dist/apps/api/infrastructure/prisma/prisma.service.js';
import { AuditLogService } from '../dist/apps/api/auth/audit-log.service.js';
import { ProposalReviewAssignmentsService } from '../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js';
import { ProposalReviewsService } from '../dist/apps/api/proposal-evaluations/proposal-reviews.service.js';
import { ProposalParticipationService } from '../dist/apps/api/research-proposals/proposal-participation.service.js';
import { ResearchProposalsService } from '../dist/apps/api/research-proposals/research-proposals.service.js';
import { ProposalReviewAccessService } from '../dist/apps/api/proposals-shared/proposal-review-access.service.js';
import { proposalContextVersion } from '../dist/apps/api/proposals-shared/proposal-mutation.js';
import { assignProposalReviewerPipe } from '../dist/apps/api/proposal-evaluations/proposal-evaluations.dto.js';

// Run after build:api against an empty disposable database initialized with prisma db push.
// Set REVIEWER_ASSIGNMENT_TEST_DATABASE_URL explicitly; ordinary npm test skips database writes.
const url = process.env.REVIEWER_ASSIGNMENT_TEST_DATABASE_URL;

function contextFor(user, organizationScopes = []) {
  return {
    id: user.id,
    username: user.username ?? '',
    displayName: user.displayName,
    status: user.status,
    systemRole: user.systemRole,
    unit: user.unit,
    organizationScopes
  };
}

test('any active account can be assigned reviewer/council unless it participates in the proposal', { skip: !url }, async () => {
  assert.match(new URL(url).pathname, /^\/docmans_assignment_test_[a-z0-9_]+$/);
  process.env.DATABASE_URL = url;
  const db = new PrismaService();

  try {
    const hostOrg = await db.organizationUnit.create({ data: { code: 'ASSIGNMENT-TEST', name: 'Assignment Test' } });
    const otherOrg = await db.organizationUnit.create({ data: { code: 'ASSIGNMENT-OTHER', name: 'Other Unit' } });
    const scope = (organizationUnitId) => ({ organizationUnitId });
    const users = {};
    for (const [key, data] of Object.entries({
      staff: { username: 'staff', displayName: 'Staff', systemRole: 'SCIENTIFIC_MANAGEMENT_STAFF', status: 'active', scopes: [hostOrg.id] },
      pi: { username: 'pi', displayName: 'PI', systemRole: 'RESEARCHER_INTERNAL_USER', status: 'active', scopes: [hostOrg.id] },
      member: { username: 'member', displayName: 'Member', systemRole: 'RESEARCHER_INTERNAL_USER', status: 'active', scopes: [hostOrg.id] },
      admin: { username: 'admin', displayName: 'Admin without profile', systemRole: 'SYSTEM_ADMIN', status: 'active', scopes: [otherOrg.id] },
      leadership: { username: 'leadership', displayName: 'Leadership without profile', systemRole: 'LEADERSHIP_APPROVAL_AUTHORITY', status: 'active', scopes: [otherOrg.id] },
      inactive: { username: 'inactive', displayName: 'Inactive account', systemRole: 'SYSTEM_ADMIN', status: 'inactive', scopes: [] },
      pending: { username: 'pending', displayName: 'Pending account', systemRole: 'EXTERNAL_RESEARCHER_USER', status: 'pending', scopes: [] }
    })) {
      users[key] = await db.user.create({
        data: {
          username: data.username,
          usernameKey: data.username,
          displayName: data.displayName,
          passwordHash: 'test-only-disabled',
          status: data.status,
          systemRole: data.systemRole,
          unit: data.username,
          ...(data.scopes.length ? { organizationScopes: { create: data.scopes.map(scope) } } : {})
        }
      });
    }

    const staffActor = contextFor(users.staff, [{ id: hostOrg.id, code: hostOrg.code, name: hostOrg.name }]);
    const adminActor = contextFor(users.admin, [{ id: otherOrg.id, code: otherOrg.code, name: otherOrg.name }]);
    const leadershipActor = contextFor(users.leadership, [{ id: otherOrg.id, code: otherOrg.code, name: otherOrg.name }]);
    const intake = await db.proposalIntakePeriod.create({
      data: {
        code: 'ASSIGNMENT-TEST',
        title: 'Assignment test',
        startsAt: new Date('2026-01-01'),
        endsAt: new Date('2027-01-01'),
        requiredPackage: []
      }
    });
    const submittedAt = new Date(Date.now() - 1000);
    const proposal = await db.researchProposal.create({
      data: {
        intakePeriodId: intake.id,
        ownerId: users.pi.id,
        hostOrganizationUnitId: hostOrg.id,
        title: 'Assignment test proposal',
        status: 'submitted',
        submittedAt
      }
    });
    await db.proposalMember.create({
      data: {
        proposalId: proposal.id,
        userId: users.member.id,
        name: users.member.displayName,
        role: 'TOPIC_MEMBER',
        participationRole: 'TOPIC_MEMBER',
        status: 'ACTIVE',
        organization: otherOrg.name
      }
    });
    await db.proposalSubmissionEvent.create({
      data: {
        proposalId: proposal.id,
        actorId: users.staff.id,
        fromStatus: 'submitted',
        toStatus: 'submitted',
        snapshot: { kind: 'completeness_check' }
      }
    });

    const participation = new ProposalParticipationService(db);
    const reviewAccess = new ProposalReviewAccessService(db);
    const assignments = new ProposalReviewAssignmentsService(db, new AuditLogService(db), participation, reviewAccess);
    const reviews = new ProposalReviewsService(db, new AuditLogService(db), reviewAccess, participation);
    const proposals = new ResearchProposalsService(db, new AuditLogService(db), participation, reviewAccess);
    const currentContext = async () => proposalContextVersion(await db.researchProposal.findUniqueOrThrow({ where: { id: proposal.id } }));

    const candidates = await assignments.candidates(staffActor, proposal.id);
    assert.ok(Array.isArray(candidates.users));
    assert.equal(Object.hasOwn(candidates, 'profiles'), false);
    assert.ok(candidates.users.some((candidate) => candidate.id === users.admin.id));
    assert.ok(candidates.users.some((candidate) => candidate.id === users.leadership.id));
    assert.equal(candidates.users.some((candidate) => candidate.id === users.pi.id), false);
    assert.equal(candidates.users.some((candidate) => candidate.id === users.member.id), false);
    assert.equal(candidates.users.some((candidate) => candidate.id === users.inactive.id), false);
    assert.equal(candidates.users.some((candidate) => candidate.id === users.pending.id), false);

    for (const conflicted of [users.pi, users.member]) {
      const contextVersion = await currentContext();
      await assert.rejects(() => assignments.assignReviewer(staffActor, proposal.id, {
        reviewerUserId: conflicted.id,
        contextVersion
      }), /Không thể phân công/);
    }
    for (const unavailable of [users.inactive, users.pending]) {
      const contextVersion = await currentContext();
      await assert.rejects(() => assignments.assignReviewer(staffActor, proposal.id, {
        reviewerUserId: unavailable.id,
        contextVersion
      }), /không hoạt động hoặc không tồn tại/);
    }

    const staleContext = await currentContext();
    const reviewerAssignment = await assignments.assignReviewer(staffActor, proposal.id, {
      reviewerUserId: users.admin.id,
      assignmentRole: 'reviewer',
      contextVersion: staleContext
    });
    assert.equal(reviewerAssignment.reviewerUserId, users.admin.id);
    assert.equal(reviewerAssignment.researcherProfileId, null);
    assert.equal(reviewerAssignment.assignmentRole, 'reviewer');
    await assert.rejects(() => assignments.assignReviewer(staffActor, proposal.id, {
      reviewerUserId: users.leadership.id,
      assignmentRole: 'committee_member',
      contextVersion: staleContext
    }), (error) => error?.getResponse().code === 'CONTEXT_VERSION_MISMATCH');

    const councilAssignment = await assignments.assignReviewer(staffActor, proposal.id, {
      reviewerUserId: users.leadership.id,
      assignmentRole: 'committee_member',
      contextVersion: await currentContext()
    });
    assert.equal(councilAssignment.reviewerUserId, users.leadership.id);
    assert.equal(councilAssignment.researcherProfileId, null);
    assert.equal(councilAssignment.assignmentRole, 'committee_member');

    const packageForAdmin = await assignments.getReviewPackage(adminActor, proposal.id);
    assert.equal(packageForAdmin.assignmentId, reviewerAssignment.id);
    assert.equal(packageForAdmin.assignmentRole, 'reviewer');
    assert.equal((await assignments.listMyAssignments(adminActor)).length, 1);
    assert.equal((await assignments.listMyAssignments(adminActor))[0].proposal.id, proposal.id);
    assert.equal((await assignments.getReviewPackage(leadershipActor, proposal.id)).assignmentId, councilAssignment.id);
    assert.equal((await assignments.listMyAssignments(leadershipActor)).length, 1);

    const adminProposal = await proposals.getProposal(adminActor, proposal.id);
    assert.equal(adminProposal.id, proposal.id);
    assert.equal(adminProposal.viewerReviewAssignment.isAssignedReviewer, true);
    assert.ok(adminProposal.viewerAuthorization.allowedActions.includes('proposal.review.submit'));
    assert.ok(adminProposal.viewerAuthorization.allowedActions.includes('file.read'));
    assert.equal(adminProposal.viewerAuthorization.allowedActions.includes('proposal.review.assign'), false);
    const otherProposal = await db.researchProposal.create({ data: {
      intakePeriodId: intake.id, ownerId: users.pi.id, hostOrganizationUnitId: hostOrg.id,
      title: 'Unassigned proposal', status: 'under_review'
    } });
    await assert.rejects(() => assignments.getReviewPackage(adminActor, otherProposal.id));
    await assert.rejects(() => proposals.getProposal(adminActor, otherProposal.id));

    assert.equal((await proposals.listProposals(adminActor)).some((item) => item.id === proposal.id), true);
    assert.equal((await proposals.getProposal(leadershipActor, proposal.id)).id, proposal.id);
    assert.equal((await proposals.listProposals(leadershipActor)).some((item) => item.id === proposal.id), true);

    const initialReview = await reviews.getMyReview(adminActor, proposal.id);
    assert.equal(initialReview.assignmentId, reviewerAssignment.id);
    assert.equal(initialReview.status, 'draft');
    assert.equal(initialReview.canEdit, true);
    const savedReview = await reviews.saveMyReview(adminActor, proposal.id, {
      scoreData: { 'scientific-value': 25 },
      comment: 'Draft review',
      recommendation: 'approve',
      contextVersion: await currentContext()
    });
    assert.equal(savedReview.status, 'draft');
    assert.equal(savedReview.scoreData['scientific-value'], 25);
    const submittedReview = await reviews.submitMyReview(adminActor, proposal.id, {
      scoreData: {
        'scientific-value': 25,
        feasibility: 20,
        'practical-impact': 20,
        'budget-suitability': 15
      },
      comment: 'Completed review',
      recommendation: 'approve',
      contextVersion: await currentContext()
    });
    assert.equal(submittedReview.status, 'submitted');
    assert.equal(submittedReview.totalScore, 80);

    const duplicateContext = await currentContext();
    await assert.rejects(() => assignments.assignReviewer(staffActor, proposal.id, {
      reviewerUserId: users.admin.id,
      contextVersion: duplicateContext
    }), /đã gửi phiếu đánh giá/);
    await assignments.revokeAssignment(staffActor, proposal.id, reviewerAssignment.id, {
      reason: 'Test revoke',
      contextVersion: await currentContext()
    });
    assert.equal((await db.proposalReviewAssignment.findUniqueOrThrow({ where: { id: reviewerAssignment.id } })).status, 'revoked');
    assert.equal((await assignments.listMyAssignments(adminActor)).length, 0);
    await assert.rejects(() => assignments.getReviewPackage(adminActor, proposal.id));
    await assert.rejects(() => reviews.getMyReview(adminActor, proposal.id));
    await assert.rejects(() => proposals.getProposal(adminActor, proposal.id));
    assert.equal((await proposals.listProposals(adminActor)).some((item) => item.id === proposal.id), false);
    assert.equal((await assignments.getReviewPackage(leadershipActor, proposal.id)).assignmentId, councilAssignment.id);

    const assignmentHistory = await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id }, orderBy: { assignedAt: 'asc' } });
    assert.equal(assignmentHistory.length, 2);
    assert.deepEqual(assignmentHistory.map((row) => row.status).sort(), ['assigned', 'revoked']);
    const conflictAudits = await db.auditLog.findMany({ where: { action: 'assign-reviewer', result: 'failure', targetEntityId: proposal.id } });
    assert.equal(conflictAudits.length, 2);
    assert.deepEqual(new Set(conflictAudits.map((row) => JSON.parse(row.reason).candidateUserId)), new Set([users.pi.id, users.member.id]));
    assert.equal((await db.auditLog.findMany({ where: { action: 'assign-reviewer', result: 'success' } })).length, 2);
    assert.equal((await db.auditLog.findMany({ where: { action: 'change-reviewer-assignment', result: 'success', targetEntityId: reviewerAssignment.id } })).length, 1);
    assert.equal((await db.auditLog.findMany({ where: { action: 'submit-score-and-review-comment', result: 'success' } })).length, 1);
    const linked = await db.researcherProfile.create({ data: {
      fullName: 'Staff profile', fullNameKey: 'staff profile', managementOrganizationUnitId: otherOrg.id,
      linkedUserId: users.staff.id, status: 'INACTIVE', createdById: users.staff.id, updatedById: users.staff.id
    } });
    const own = await assignments.assignReviewer(staffActor, proposal.id, {
      reviewerUserId: users.staff.id, assignmentRole: 'committee_member', contextVersion: await currentContext()
    });
    assert.equal(own.researcherProfileId, linked.id);
    const staffProposal = await proposals.getProposal(staffActor, proposal.id);
    assert.equal(staffProposal.viewerAuthorization.allowedActions.includes('proposal.review.consolidate'), false);
    const councilReview = await reviews.submitMyReview(leadershipActor, proposal.id, {
      scoreData: { 'scientific-value': 25, feasibility: 20, 'practical-impact': 20, 'budget-suitability': 15 },
      comment: 'Council review', recommendation: 'approve', contextVersion: await currentContext()
    });
    assert.equal(councilReview.status, 'submitted');
    const leaderProposal = await proposals.getProposal(leadershipActor, proposal.id);
    assert.equal(leaderProposal.viewerAuthorization.allowedActions.includes('proposal.decision.approve'), false);

  } finally {
    await db.$disconnect();
  }
});

test('assignment DTO accepts account selector and rejects legacy selectors', () => {
  const contextVersion = { domain: 'proposal', recordId: 'proposal-1', aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: 'v1' };
  const accepted = assignProposalReviewerPipe.transform({ reviewerUserId: 'user-1', contextVersion });
  assert.equal(accepted.reviewerUserId, 'user-1');
  for (const legacy of [
    { researcherProfileId: 'profile-1', contextVersion },
    { reviewerUsername: 'legacy-user', contextVersion },
    { reviewerUserId: 'user-1', researcherProfileId: 'profile-1', contextVersion }
  ]) {
    assert.throws(() => assignProposalReviewerPipe.transform(legacy));
  }
});

import { revokeReviewAssignmentPipe } from '../dist/apps/api/proposal-evaluations/proposal-evaluations.dto.js';
test('revoke requires a bounded nonblank reason and current context', () => {
 const contextVersion={domain:'proposal',recordId:'p',aggregateVersion:1,relationshipVersion:1,conflictVersion:1,delegationVersion:1,policyVersion:'v1'};
 for(const note of [undefined,null,'','   ','x'.repeat(2001)]) assert.throws(()=>revokeReviewAssignmentPipe.transform({note,contextVersion}));
 assert.throws(()=>revokeReviewAssignmentPipe.transform({note:'Change reviewer'}));
 assert.equal(revokeReviewAssignmentPipe.transform({note:'Change reviewer',contextVersion}).note,'Change reviewer');
});
