import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from '../dist/apps/api/infrastructure/prisma/prisma.service.js';
import { AuditLogService } from '../dist/apps/api/auth/audit-log.service.js';
import { ProposalReviewAssignmentsService } from '../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js';
import { ProposalParticipationService } from '../dist/apps/api/research-proposals/proposal-participation.service.js';
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

// Story 5.3 sau delta 5.11: TP mời; ứng viên phải active và có lý lịch. Luật loại QT/tự mời/vai trò được mời
// nằm ở tests/approval-routing-db.test.mjs; ở đây chỉ giữ phần riêng của 5.3: tài khoản không hoạt động,
// context cũ, audit khi phân công thất bại và lịch sử thu hồi.
test('5.3 + 5.11: TP invites active profiled accounts; inactive, pending and participants fail with audit; stale context and revoke keep history', { skip: !url }, async () => {
  assert.match(new URL(url).pathname, /^\/docmans_assignment_test_[a-z0-9_]+$/);
  process.env.DATABASE_URL = url;
  const db = new PrismaService();

  try {
    const hostOrg = await db.organizationUnit.create({ data: { code: 'ASSIGNMENT-TEST', name: 'Assignment Test' } });
    const users = {};
    for (const [key, data] of Object.entries({
      head: { systemRole: 'RESEARCH_MANAGEMENT_HEAD', status: 'active', scoped: true },
      pi: { systemRole: 'RESEARCHER_INTERNAL_USER', status: 'active', scoped: true },
      member: { systemRole: 'RESEARCHER_INTERNAL_USER', status: 'active', scoped: true },
      peer: { systemRole: 'RESEARCHER_INTERNAL_USER', status: 'active' },
      peer2: { systemRole: 'EXTERNAL_RESEARCHER_USER', status: 'active' },
      inactive: { systemRole: 'RESEARCHER_INTERNAL_USER', status: 'inactive' },
      pending: { systemRole: 'EXTERNAL_RESEARCHER_USER', status: 'pending' }
    })) {
      users[key] = await db.user.create({
        data: {
          username: key, usernameKey: key, displayName: key, passwordHash: 'test-only-disabled',
          status: data.status, systemRole: data.systemRole, unit: key,
          ...(data.scoped ? { organizationScopes: { create: [{ organizationUnitId: hostOrg.id }] } } : {})
        }
      });
    }
    for (const user of Object.values(users)) {
      await db.researcherProfile.create({ data: {
        fullName: user.displayName, fullNameKey: user.displayName, managementOrganizationUnitId: hostOrg.id,
        linkedUserId: user.id, createdById: users.head.id, updatedById: users.head.id
      } });
    }

    const headActor = contextFor(users.head, [{ id: hostOrg.id, code: hostOrg.code, name: hostOrg.name }]);
    const intake = await db.proposalIntakePeriod.create({ data: {
      code: 'ASSIGNMENT-TEST', title: 'Assignment test', startsAt: new Date('2026-01-01'), endsAt: new Date('2027-01-01'), requiredPackage: []
    } });
    const proposal = await db.researchProposal.create({ data: {
      intakePeriodId: intake.id, ownerId: users.pi.id, hostOrganizationUnitId: hostOrg.id,
      title: 'Assignment test proposal', status: 'submitted', submittedAt: new Date(Date.now() - 2000)
    } });
    await db.proposalMember.create({ data: {
      proposalId: proposal.id, userId: users.member.id, name: users.member.displayName,
      role: 'TOPIC_MEMBER', participationRole: 'TOPIC_MEMBER', status: 'ACTIVE', organization: hostOrg.name
    } });
    const submission = await db.proposalSubmissionEvent.create({ data: {
      proposalId: proposal.id, actorId: users.pi.id, fromStatus: 'draft', toStatus: 'submitted',
      submittedAt: new Date(Date.now() - 2000), snapshot: { members: [], attachments: [], requiredPackage: [] }
    } });
    await db.proposalSubmissionEvent.create({ data: {
      proposalId: proposal.id, actorId: users.head.id, fromStatus: 'submitted', toStatus: 'submitted',
      submittedAt: new Date(Date.now() - 1000), snapshot: { kind: 'completeness_check', submissionEventId: submission.id, readiness: { ready: true } }
    } });

    const assignments = new ProposalReviewAssignmentsService(db, new AuditLogService(db), new ProposalParticipationService(db), new ProposalReviewAccessService(db));
    const currentContext = async () => proposalContextVersion(await db.researchProposal.findUniqueOrThrow({ where: { id: proposal.id } }));
    const invite = (user, contextVersion, assignmentRole = 'committee_member') =>
      assignments.assignReviewer(headActor, proposal.id, { reviewerUserId: user.id, assignmentRole, contextVersion });

    const found = (await assignments.candidates(headActor, proposal.id)).users.map((user) => user.id);
    assert.ok(found.includes(users.peer.id) && found.includes(users.peer2.id));
    for (const excluded of ['pi', 'member', 'inactive', 'pending']) assert.equal(found.includes(users[excluded].id), false, excluded);

    for (const conflicted of [users.pi, users.member]) {
      await assert.rejects(async () => invite(conflicted, await currentContext()), /Không thể phân công/);
    }
    for (const unavailable of [users.inactive, users.pending]) {
      await assert.rejects(async () => invite(unavailable, await currentContext()), /không hoạt động hoặc không tồn tại/);
    }

    const staleContext = await currentContext();
    const first = await invite(users.peer, staleContext, 'reviewer');
    assert.equal(first.reviewerUserId, users.peer.id);
    assert.equal(first.invitationStatus, 'invited');
    assert.equal((await db.researchProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status, 'under_review');
    await assert.rejects(() => invite(users.peer2, staleContext), (error) => error?.getResponse().code === 'CONTEXT_VERSION_MISMATCH');
    await invite(users.peer2, await currentContext());

    await assignments.revokeAssignment(headActor, proposal.id, first.id, { reason: 'Test revoke', contextVersion: await currentContext() });
    const history = await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id } });
    assert.deepEqual(history.map((row) => row.status).sort(), ['assigned', 'revoked']);
    assert.equal((await assignments.listMyAssignments(contextFor(users.peer))).length, 0);

    const failures = await db.auditLog.findMany({ where: { action: 'assign-reviewer', result: 'failure', targetEntityId: proposal.id } });
    assert.deepEqual(new Set(failures.map((row) => JSON.parse(row.reason).candidateUserId)), new Set([users.pi.id, users.member.id]));
    assert.equal((await db.auditLog.findMany({ where: { action: 'assign-reviewer', result: 'success' } })).length, 2);
    assert.equal((await db.auditLog.findMany({ where: { action: 'change-reviewer-assignment', result: 'success', targetEntityId: first.id } })).length, 1);
  } finally {
    await db.$disconnect();
  }
});

test('assignment DTO accepts account selector and rejects legacy selectors', () => {
  const contextVersion = { domain: 'proposal', recordId: 'proposal-1', aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: 'v1' };
  const accepted = assignProposalReviewerPipe.transform({ reviewerUserId: 'user-1', assignmentRole: 'council_secretary', contextVersion });
  assert.equal(accepted.reviewerUserId, 'user-1');
  for (const assignmentRole of [undefined, 'chair', 'legacy']) {
    assert.throws(() => assignProposalReviewerPipe.transform({ reviewerUserId: 'user-1', assignmentRole, contextVersion }));
  }
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
