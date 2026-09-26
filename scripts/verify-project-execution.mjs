import "dotenv/config";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { proposalContextVersion } from "../dist/apps/api/proposals-shared/proposal-mutation.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const schema = `gf4_verify_${process.pid}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", schema);
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();

function run(command, args) {
  const child = spawnSync(command, args, { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url.toString() }, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (child.status !== 0) throw new Error(`${command} failed (status=${child.status}, signal=${child.signal}, error=${child.error?.message ?? "none"}, stderr=${child.stderr?.length ?? 0} bytes): ${(child.stderr || child.stdout).slice(-1200)}`);
}

try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  run("npx", ["prisma", "migrate", "deploy", "--schema", "apps/api/prisma/schema.prisma"]);
  run("node", ["apps/api/prisma/seed.mjs"]);
  run("node", ["apps/api/prisma/seed.mjs"]);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), options: `-c search_path=${schema}` }, { schema }) });
  try {
    assert.equal((await db.approvedProject.findUniqueOrThrow({ where: { id: "gf4-demo-project" } })).status, "executing");
    const service = new ApprovedProjectsService(db, new AuditLogService(db));
    const objects = new Map();
    const storage = { putObject: async ({ objectKey, content }) => { objects.set(objectKey, content); }, getObject: async (objectKey) => objects.get(objectKey), deleteObject: async (objectKey) => { objects.delete(objectKey); } };
    const filesService = new FilesService(db, storage, new AuditLogService(db), new ProposalParticipationService(db), new ProposalReviewAccessService(db), { allowedExtensions: [".pdf"], maxFileSizeBytes: 1024, bucketName: "verify" });
    const actor = async (id) => {
      const user = await db.user.findUniqueOrThrow({ where: { id }, include: { organizationScopes: { include: { organizationUnit: true } } } });
      return { id: user.id, username: user.username, displayName: user.displayName, systemRole: user.systemRole, unit: user.unit, organizationScopes: user.organizationScopes.map((scope) => ({ id: scope.organizationUnit.id, code: scope.organizationUnit.code, name: scope.organizationUnit.name })) };
    };
    const staff = await actor("user-staff-hdtien1");
    const projectStaff = await actor("user-staff-hdtien2");
    const head = await actor("user-staff");
    const pi = await actor("user-pi");
    const contributor = await actor("user-researcher1");
    const unrelatedMember = await actor("user-researcher2");
    const leadership = await actor("user-leadership");
    const intake = await db.proposalIntakePeriod.create({ data: { code: `GF4-${process.pid}`, title: "GF4 verification", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-12-31"), status: "closed", requiredPackage: [] } });
    const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: pi.id, hostOrganizationUnitId: "org-khti", title: "Golden Flow 4 verification", summary: "Approved baseline", status: "approved", startDate: new Date("2026-09-01"), endDate: new Date("2027-03-01") } });
    const submission = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: { id: proposal.id, ownerId: pi.id, title: proposal.title, summary: proposal.summary, startDate: "2026-09-01", endDate: "2027-03-01", members: [{ id: "source-contributor", userId: contributor.id, name: contributor.displayName, role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER" }, { id: "source-member", userId: unrelatedMember.id, name: unrelatedMember.displayName, role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER" }] } } });
    await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: leadership.id, fromStatus: "ready_for_approval", toStatus: "approved", packageSnapshot: { submissionEventId: submission.id } } });
    await db.proposalManagementOfficer.create({ data: { proposalId: proposal.id, officerUserId: staff.id, assignedById: head.id, status: "ACTIVE", effectiveFrom: new Date("2026-01-01") } });

    const created = await service.createFromApprovedProposal(staff, proposal.id, { contextVersion: proposalContextVersion(proposal) });
    assert.equal(created.proposalId, proposal.id);
    assert.equal((await service.createFromApprovedProposal(staff, proposal.id, { contextVersion: proposalContextVersion(proposal) })).id, created.id);
    const id = created.id;
    const context = async (who) => (await service.getProject(who, id)).viewerAuthorization.contextVersion;
    await service.assignOfficer(head, id, { officerUserId: projectStaff.id, contextVersion: await context(head) });
    const responsibleMemberId = (await service.getProject(head, id)).members.find((member) => member.userId === contributor.id).id;
    await service.configureSetup(projectStaff, id, { contextVersion: await context(projectStaff), milestones: [{ title: "Mốc quan trọng", dueDate: "2026-10-15", isImportant: true, responsibleMemberId }], checkpoints: [{ title: "Báo cáo mốc", dueDate: "2026-10-15", milestonePosition: 0 }] });
    await service.confirmSetup(projectStaff, id, { contextVersion: await context(projectStaff) });
    assert((await service.getProject(contributor, id)).viewerAuthorization.allowedActions.includes("project.evidence.contribute"));
    assert(!(await service.getProject(unrelatedMember, id)).viewerAuthorization.allowedActions.includes("project.evidence.contribute"));
    await assert.rejects(service.createReportDraft(contributor, id, { contextVersion: await context(contributor), progressResults: "unauthorized", reportingPeriodStart: new Date("2026-09-01"), reportingPeriodEnd: new Date("2026-09-30") }));
    const contribution = await filesService.uploadFile(contributor, { contextVersion: await context(contributor), relatedEntityType: "approved_project", relatedEntityId: id, filePurpose: "PROJECT_CONTRIBUTION", fileName: "evidence.pdf", mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("test") });
    await assert.rejects(filesService.uploadFile(unrelatedMember, { contextVersion: await context(unrelatedMember), relatedEntityType: "approved_project", relatedEntityId: id, filePurpose: "PROJECT_CONTRIBUTION", fileName: "evidence.pdf", mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("test") }));
    assert.equal((await filesService.listFiles(contributor, { relatedEntityType: "approved_project", relatedEntityId: id })).length, 1);
    assert.equal((await filesService.listFiles(unrelatedMember, { relatedEntityType: "approved_project", relatedEntityId: id })).length, 0);
    await assert.rejects(filesService.downloadFile(unrelatedMember, contribution.id));
    const checkpoint = (await service.getProject(pi, id)).checkpoints[0];
    const report = await service.createReportDraft(pi, id, { contextVersion: await context(pi), checkpointId: checkpoint.id, progressResults: "Completed milestone", reportingPeriodStart: new Date("2026-09-01"), reportingPeriodEnd: new Date("2026-09-30") });
    await service.submitReport(pi, id, { contextVersion: await context(pi), reportId: report.id, evidenceFileIds: [contribution.id] });
    await assert.rejects(db.fileRecord.update({ where: { id: contribution.id }, data: { description: "tamper" } }));
    await assert.rejects(filesService.deleteFile(contributor, contribution.id, await context(contributor)));
    await service.reviewReport(projectStaff, id, { contextVersion: await context(projectStaff), reportId: report.id });
    await service.acceptReport(projectStaff, id, { contextVersion: await context(projectStaff), reportId: report.id });
    assert.equal((await service.getProject(pi, id)).checkpoints[0].status, "completed");

    const adjustment = await service.createAdjustment(pi, id, { contextVersion: await context(pi), proposedValues: { scope: { summary: "Staff-approved adjustment" } }, reason: "New scope" });
    await service.submitRequest(pi, id, "adjustment", { contextVersion: await context(pi), requestId: adjustment.id });
    await service.reviewAdjustment(projectStaff, id, { contextVersion: await context(projectStaff), requestId: adjustment.id });
    await assert.rejects(service.decideRequest(head, id, "adjustment", "approve", { contextVersion: await context(head), requestId: adjustment.id }));
    await assert.rejects(service.decideRequest(leadership, id, "adjustment", "approve", { contextVersion: await context(leadership), requestId: adjustment.id }));
    await service.decideRequest(projectStaff, id, "adjustment", "approve", { contextVersion: await context(projectStaff), requestId: adjustment.id });
    assert.equal((await service.getProject(pi, id)).scope.summary, "Staff-approved adjustment");

    const extension = await service.createExtension(pi, id, { contextVersion: await context(pi), proposedValues: { requestedEndDate: "2027-05-01" }, reason: "Extra time" });
    await service.submitRequest(pi, id, "extension", { contextVersion: await context(pi), requestId: extension.id });
    await service.validateExtension(projectStaff, id, { contextVersion: await context(projectStaff), requestId: extension.id });
    await service.prepareExtension(projectStaff, id, { contextVersion: await context(projectStaff), requestId: extension.id });
    await assert.rejects(service.decideRequest(projectStaff, id, "extension", "approve", { contextVersion: await context(projectStaff), requestId: extension.id }));
    await assert.rejects(service.decideRequest(leadership, id, "extension", "approve", { contextVersion: await context(leadership), requestId: extension.id }));
    await service.decideRequest(head, id, "extension", "approve", { contextVersion: await context(head), requestId: extension.id });
    assert.equal((await service.getProject(pi, id)).endDate.slice(0, 10), "2027-05-01");
    await assert.rejects(service.createAdjustment(pi, id, { contextVersion: await context(pi), proposedValues: { endDate: "2027-06-01" }, reason: "Bypass" }));
    assert.equal((await service.getProject(leadership, id)).requests[0].proposedValues, undefined);
    console.log("Golden Flow 4 runtime verification passed: source, assignment, report/evidence, Staff adjustment, Head extension, denials, oversight redaction.");
  } finally { await db.$disconnect(); }
} finally {
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
}
