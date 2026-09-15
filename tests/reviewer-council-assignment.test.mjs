import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaService } from '../dist/apps/api/infrastructure/prisma/prisma.service.js';
import { AuditLogService } from '../dist/apps/api/auth/audit-log.service.js';
import { ProposalReviewAssignmentsService } from '../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js';
import { ProposalParticipationService } from '../dist/apps/api/research-proposals/proposal-participation.service.js';
import { ProposalReviewAccessService } from '../dist/apps/api/proposals-shared/proposal-review-access.service.js';
import { proposalContextVersion } from '../dist/apps/api/proposals-shared/proposal-mutation.js';
// Run after build:api against an empty disposable database initialized with prisma db push.
// Set REVIEWER_ASSIGNMENT_TEST_DATABASE_URL explicitly; ordinary npm test skips database writes.
const url = process.env.REVIEWER_ASSIGNMENT_TEST_DATABASE_URL;
test('reviewer/council assignment lifecycle and persistent conflict audit', { skip: !url }, async () => {
assert.match(new URL(url).pathname, /^\/docmans_assignment_test_[a-z0-9_]+$/);
process.env.DATABASE_URL = url;
const db = new PrismaService();
try {
 const org = await db.organizationUnit.create({data:{code:'ASSIGNMENT-TEST',name:'Assignment Test'}});
 const users=[];
 for(const [name,systemRole] of [['staff','SCIENTIFIC_MANAGEMENT_STAFF'],['pi','RESEARCHER_INTERNAL_USER'],['reviewer','RESEARCHER_INTERNAL_USER'],['council','EXTERNAL_RESEARCHER_USER']]) users.push(await db.user.create({data:{username:name,usernameKey:name,displayName:name,passwordHash:'test-only-disabled',status:'active',systemRole,unit:'Test',organizationScopes:{create:{organizationUnitId:org.id}}}}));
 const [staff,pi,reviewer,council]=users;
 const actor={...staff,organizationScopes:[{id:org.id,code:org.code,name:org.name}]};
 const profiles=[];
 for(const user of [pi,reviewer,council]) profiles.push(await db.researcherProfile.create({data:{fullName:user.displayName,fullNameKey:user.username,managementOrganizationUnitId:org.id,linkedUserId:user.id,createdById:staff.id,updatedById:staff.id}}));
 const intake=await db.proposalIntakePeriod.create({data:{code:'TEST',title:'Test',startsAt:new Date('2026-01-01'),endsAt:new Date('2027-01-01'),requiredPackage:[]}});
 const proposal=await db.researchProposal.create({data:{intakePeriodId:intake.id,ownerId:pi.id,hostOrganizationUnitId:org.id,title:'Test',status:'submitted',submittedAt:new Date()}});
 const service=new ProposalReviewAssignmentsService(db,new AuditLogService(db),new ProposalParticipationService(db),new ProposalReviewAccessService(db));
 const context=async()=>proposalContextVersion(await db.researchProposal.findUniqueOrThrow({where:{id:proposal.id}}));
 await assert.rejects(service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[1].id,contextVersion:await context()}), /đầy đủ/);
 await db.proposalSubmissionEvent.create({data:{proposalId:proposal.id,actorId:staff.id,fromStatus:'submitted',toStatus:'submitted',snapshot:{kind:'completeness_check'}}});
 const candidates=await service.candidates(actor,proposal.id);
 assert.deepEqual(candidates.profiles.map(x=>x.id).sort(),profiles.slice(1).map(x=>x.id).sort());
 await assert.rejects(service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[0].id,contextVersion:await context()}));
 const failures=await db.auditLog.findMany({where:{action:'assign-reviewer',result:'failure',targetEntityId:proposal.id}});
 assert.equal(failures.length,1);
 assert.equal(JSON.parse(failures[0].reason).researcherProfileId,profiles[0].id);
 assert.equal(await db.proposalReviewAssignment.count({where:{proposalId:proposal.id}}),0);
 assert.equal((await db.researchProposal.findUniqueOrThrow({where:{id:proposal.id}})).status,'submitted');
 const token=await context();
 const assignment=await service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[1].id,assignmentRole:'reviewer',contextVersion:token});
 assert.equal(assignment.researcherProfileId,profiles[1].id);
 assert.equal(assignment.reviewerUserId,reviewer.id);
 assert.equal((await db.researchProposal.findUniqueOrThrow({where:{id:proposal.id}})).status,'under_review');
 await assert.rejects(()=>service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[2].id,contextVersion:token}));
 await db.researcherProfile.update({where:{id:profiles[2].id},data:{status:'INACTIVE'}});
 await assert.rejects(service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[2].id,assignmentRole:'committee_member',contextVersion:await context()}));
 await db.researcherProfile.update({where:{id:profiles[2].id},data:{status:'ACTIVE'}});
 const councilAssignment=await service.assignReviewer(actor,proposal.id,{researcherProfileId:profiles[2].id,assignmentRole:'committee_member',contextVersion:await context()});
 assert.equal(councilAssignment.assignmentRole,'committee_member');
 const reviewerActor={...reviewer,organizationScopes:actor.organizationScopes};
 assert.equal((await service.getReviewPackage(reviewerActor,proposal.id)).assignmentId,assignment.id);
 await assert.rejects(service.getReviewPackage({...reviewerActor,id:pi.id},proposal.id));
 const other=await db.researchProposal.create({data:{intakePeriodId:intake.id,ownerId:pi.id,hostOrganizationUnitId:org.id,title:'Other',status:'under_review'}});
 await assert.rejects(service.getReviewPackage(reviewerActor,other.id));
 const access=new ProposalReviewAccessService(db);
 assert.equal((await access.resolveForProposal(reviewer.id,proposal.id)).isAssignedReviewer,true);
 await service.revokeAssignment(actor,proposal.id,assignment.id,{reason:'Test revoke',contextVersion:await context()});
 assert.equal((await access.resolveForProposal(reviewer.id,proposal.id)).isAssignedReviewer,false);
 await assert.rejects(service.getReviewPackage(reviewerActor,proposal.id));
 const stored=await db.proposalReviewAssignment.findUniqueOrThrow({where:{id:assignment.id}});
 assert.equal(stored.status,'revoked'); assert.equal(stored.researcherProfileId,profiles[1].id);
 const audits=await db.auditLog.findMany({where:{targetEntity:'proposal-review-assignment',result:'success'}});
 assert.equal(audits.length,3);
 assert.ok(audits.every(a=>JSON.parse(a.reason).researcherProfileId));
 console.log('PASS: real PostgreSQL profile discovery, both duties, current-state checks, stale token, inactive profile, audit provenance, revocation access and retained history');
} finally { await db.$disconnect(); }
});

import { revokeReviewAssignmentPipe } from '../dist/apps/api/proposal-evaluations/proposal-evaluations.dto.js';
test('revoke requires a bounded nonblank reason and current context', () => {
 const contextVersion={domain:'proposal',recordId:'p',aggregateVersion:1,relationshipVersion:1,conflictVersion:1,delegationVersion:1,policyVersion:'v1'};
 for(const note of [undefined,null,'','   ','x'.repeat(2001)]) assert.throws(()=>revokeReviewAssignmentPipe.transform({note,contextVersion}));
 assert.throws(()=>revokeReviewAssignmentPipe.transform({note:'Change reviewer'}));
 assert.equal(revokeReviewAssignmentPipe.transform({note:'Change reviewer',contextVersion}).note,'Change reviewer');
});
