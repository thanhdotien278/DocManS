import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { AcceptanceDossiersService } from "../dist/apps/api/approved-projects/acceptance-dossiers.service.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";

// Story 6.8: hồ sơ nghiệm thu trên PostgreSQL thật — ma trận I/O của spec.
let database;
let db;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("acceptance_dossier");
  process.env.DATABASE_URL = database.url;
  db = new PrismaService();
});

after(async () => {
  await db?.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await database?.drop();
});

const status = (code) => (error) => error.status === code || error.getStatus?.() === code;
const coded = (httpStatus, code) => (error) => error.getStatus?.() === httpStatus && error.response?.code === code;

async function fixture(code, projectStatus = "executing") {
  await db.user.updateMany({ where: { systemRole: "RESEARCH_BOARD_HEAD" }, data: { status: "disabled" } });
  const org = await db.organizationUnit.create({ data: { code, name: `Phòng ${code}` } });
  const make = async (username, systemRole) => {
    const user = await db.user.create({ data: { username: `${username}-${code}`, usernameKey: `${username}-${code}`.toLowerCase(), displayName: username, passwordHash: "x", status: "active", systemRole, unit: org.name, organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } });
    return { id: user.id, username: user.username, displayName: username, systemRole, unit: org.name, organizationScopes: [{ id: org.id, code: org.code, name: org.name }] };
  };
  const people = {
    staff: await make("chuyenvien", "RESEARCH_MANAGEMENT_STAFF"),
    board: await make("truongban", "RESEARCH_BOARD_HEAD"),
    head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"),
    pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER"),
    secretary: await make("thuky", "RESEARCHER_INTERNAL_USER"),
    member: await make("thanhvien", "RESEARCHER_INTERNAL_USER"),
    idleMember: await make("thanhvienranh", "RESEARCHER_INTERNAL_USER")
  };
  const intake = await db.proposalIntakePeriod.create({ data: { code: `DOT-${code}`, title: "Đợt", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), requiredPackage: [] } });
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: people.pi.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, status: "approved", submittedAt: new Date() } });
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: {} } });
  const decision = await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: people.head.id, fromStatus: "under_review", toStatus: "approved" } });
  const project = await db.approvedProject.create({ data: { proposalId: proposal.id, sourceSubmissionEventId: event.id, sourceDecisionId: decision.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, scopeSnapshot: { title: "Đề tài" }, status: projectStatus, startDate: new Date("2026-01-01"), endDate: new Date("2030-01-01"), createdById: people.staff.id } });
  const since = new Date(Date.now() - 86400000);
  const members = {};
  for (const [key, role] of [["pi", "TOPIC_PI"], ["secretary", "TOPIC_SECRETARY"], ["member", "TOPIC_MEMBER"], ["idleMember", "TOPIC_MEMBER"]]) members[key] = await db.approvedProjectMember.create({ data: { projectId: project.id, userId: people[key].id, name: people[key].displayName, role, participationRole: role, status: "ACTIVE", effectiveFrom: since, createdById: people.staff.id } });
  // Thành viên phụ trách một mốc chưa xong → được đóng góp tệp; mốc đã xong không cần giải trình.
  const openMilestone = await db.projectMilestone.create({ data: { projectId: project.id, title: "Thu thập dữ liệu", dueDate: new Date("2026-06-30"), responsibleMemberId: members.member.id, createdById: people.staff.id } });
  await db.projectMilestone.create({ data: { projectId: project.id, title: "Khởi động", dueDate: new Date("2026-02-01"), status: "completed", position: 1, createdById: people.staff.id } });
  const officer = await db.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: people.staff.id, assignedById: people.head.id, status: "ACTIVE", effectiveFrom: since, assignmentContextVersion: {} } });
  const audit = new AuditLogService(db);
  const projects = new ApprovedProjectsService(db, audit);
  const acceptance = new AcceptanceDossiersService(db, projects);
  const storage = { objects: new Map(), async putObject({ objectKey, content }) { this.objects.set(objectKey, Buffer.from(content)); }, async getObject(key) { return this.objects.get(key); }, async deleteObject(key) { this.objects.delete(key); } };
  const files = new FilesService(db, storage, audit, new ProposalParticipationService(db), new ProposalReviewAccessService(db), { maxFileSizeBytes: 1024, allowedExtensions: [".pdf"] });
  const ctx = async () => projectContextVersion(await db.approvedProject.findUnique({ where: { id: project.id } }));
  const create = async (actor) => acceptance.createDossier(actor, project.id, { contextVersion: await ctx() });
  const edit = async (actor, section, value) => acceptance.updateSection(actor, project.id, { section, value, contextVersion: await ctx() });
  const submit = async (actor) => acceptance.submit(actor, project.id, { contextVersion: await ctx() });
  const upload = async (actor, dossierId, filePurpose) => files.uploadFile(actor, { relatedEntityType: "acceptance_dossier", relatedEntityId: dossierId, filePurpose, fileName: `${filePurpose}.pdf`, mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("%PDF"), contextVersion: await ctx() });
  return { org, people, proposal, project, officer, openMilestone, projects, acceptance, files, ctx, create, edit, submit, upload };
}

async function seesNotification(actor, projectId) {
  const service = new NotificationsService(db, new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
  return (await service.list(actor, 20)).notifications.some((row) => row.link === `/projects/${projectId}`);
}

const fill = async (f) => {
  await f.edit(f.people.pi, "results", "Đạt toàn bộ mục tiêu");
  await f.edit(f.people.pi, "summary", "Tóm tắt báo cáo tổng kết");
  await f.edit(f.people.pi, "products", [{ name: "Bài báo", type: "publication", description: "Tạp chí trong nước" }]);
  await f.edit(f.people.pi, "milestoneNotes", { [f.openMilestone.id]: "Đã thu đủ dữ liệu, chưa đóng mốc trên hệ thống" });
};

test("6.8: PI creates, drafts and submits; contributors only add their own files; submit moves the project to pending_acceptance with a locked snapshot", async () => {
  const f = await fixture("A1");
  const { people } = f;

  for (const who of [people.member, people.secretary, people.staff]) await assert.rejects(() => f.create(who), coded(403, "ACTION_NOT_GRANTED"));
  const created = await f.create(people.pi);
  const dossierId = created.dossier.id;
  assert.deepEqual([created.dossier.status, created.dossier.version], ["draft", 1]);
  assert.ok(await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "acceptance-dossier.create" } }));
  assert.ok(await db.auditLog.findFirst({ where: { action: "create-acceptance-dossier", targetEntityId: dossierId } }));
  await assert.rejects(() => f.create(people.pi), coded(409, "ACCEPTANCE_DOSSIER_EXISTS"));

  for (const who of [people.staff, people.secretary]) await assert.rejects(() => f.edit(who, "results", "x"), coded(403, "ACTION_NOT_GRANTED"), "chỉ PI soạn mục");
  await assert.rejects(() => f.edit(people.pi, "milestoneNotes", { "khong-phai-moc": "x" }), coded(400, "SECTION_INVALID"));
  await assert.rejects(() => f.edit(people.pi, "products", [{ name: "" }]), coded(400, "SECTION_INVALID"));

  const empty = await f.submit(people.pi).catch((error) => error);
  assert.equal(empty.response.code, "READINESS_INCOMPLETE");
  assert.deepEqual(empty.response.missingSections, ["results", "products", "summary"]);
  assert.deepEqual(empty.response.missingMilestoneNotes, [f.openMilestone.id], "mốc đã hoàn thành không cần giải trình");
  assert.deepEqual(empty.response.missingFiles, ["ACCEPTANCE_FINAL_REPORT", "ACCEPTANCE_PRODUCT_EVIDENCE"]);
  assert.equal((await db.approvedProject.findUnique({ where: { id: f.project.id } })).status, "executing", "readiness hỏng không đổi trạng thái");

  const contribution = await f.upload(people.member, dossierId, "ACCEPTANCE_CONTRIBUTION");
  assert.ok(await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "acceptance-dossier.file.upload", actorId: people.member.id } }), "đóng góp ghi lịch sử");
  await assert.rejects(() => f.upload(people.member, dossierId, "ACCEPTANCE_FINAL_REPORT"), coded(403, "ACTION_NOT_GRANTED"));
  const secretaryFile = await f.upload(people.secretary, dossierId, "ACCEPTANCE_CONTRIBUTION"); // thư ký đóng góp dù không phụ trách mốc
  await assert.rejects(() => f.upload(people.idleMember, dossierId, "ACCEPTANCE_CONTRIBUTION"), coded(403, "ACTION_NOT_GRANTED"), "thành viên không phụ trách mốc mở thì không đóng góp");
  const beforeFile = await f.ctx();
  const extra = await f.upload(people.member, dossierId, "ACCEPTANCE_CONTRIBUTION");
  await assert.rejects(() => f.acceptance.submit(people.pi, f.project.id, { contextVersion: beforeFile }), coded(409, "CONTEXT_VERSION_MISMATCH"), "đổi tệp tăng context");
  await f.files.deleteFile(people.member, extra.id, await f.ctx());
  await f.files.deleteFile(people.pi, secretaryFile.id, await f.ctx());
  await assert.rejects(() => f.upload(people.secretary, dossierId, "ACCEPTANCE_OTHER"), coded(403, "ACTION_NOT_GRANTED"));
  await assert.rejects(() => f.upload(people.pi, dossierId, "PROJECT_REPORT"), coded(400, "FILE_PURPOSE_INVALID"));
  await f.upload(people.pi, dossierId, "ACCEPTANCE_FINAL_REPORT");
  const evidence = await f.upload(people.pi, dossierId, "ACCEPTANCE_PRODUCT_EVIDENCE");
  await assert.rejects(async () => f.files.deleteFile(people.member, evidence.id, await f.ctx()), coded(403, "ACTION_NOT_GRANTED"), "người đóng góp chỉ xóa tệp của mình");
  await fill(f);

  const request = await db.projectRequest.create({ data: { projectId: f.project.id, requestType: "extension", status: "submitted", requesterId: people.pi.id, currentValues: {}, proposedValues: {}, reason: "Gia hạn" } });
  const blocked = await f.submit(people.pi).catch((error) => error);
  assert.equal(blocked.response.code, "READINESS_INCOMPLETE");
  assert.deepEqual(blocked.response.openRequests, [request.id]);
  assert.deepEqual([blocked.response.missingSections, blocked.response.missingFiles, blocked.response.missingMilestoneNotes], [[], [], []]);
  await db.projectRequest.update({ where: { id: request.id }, data: { status: "withdrawn" } });

  await assert.rejects(() => f.submit(people.secretary), coded(403, "ACTION_NOT_GRANTED"));
  const stale = await f.ctx();
  await f.edit(people.pi, "results", "Đạt toàn bộ mục tiêu đã duyệt");
  await assert.rejects(() => f.acceptance.submit(people.pi, f.project.id, { contextVersion: stale }), coded(409, "CONTEXT_VERSION_MISMATCH"));
  const submitted = await f.submit(people.pi);
  assert.equal(submitted.dossier.status, "submitted");

  const project = await db.approvedProject.findUnique({ where: { id: f.project.id } });
  assert.equal(project.status, "pending_acceptance");
  const view = await f.acceptance.getDossier(people.member, f.project.id);
  assert.equal(view.dossier.readOnly, true);
  assert.deepEqual(view.dossier.submissions.map((row) => row.version), [1]);
  const snapshot = view.dossier.submissions[0].snapshot;
  assert.equal(snapshot.files.length, 3, "tệp nháp đã xóa không vào snapshot");
  assert.deepEqual(snapshot.milestones.map((row) => [row.status, row.note !== null]), [["completed", false], ["open", true]]);
  assert.equal(snapshot.projectContextVersion.aggregateVersion, project.aggregateVersion - 1);
  for (const who of [people.pi, people.member]) {
    const actions = (await f.acceptance.getDossier(who, f.project.id)).allowedActions;
    assert.deepEqual(actions, ["acceptance-dossier.read"], "không còn edit/submit/contribute");
  }
  assert.equal((await f.projects.getProject(people.member, f.project.id)).acceptanceDossier.status, "submitted");
  const history = await db.projectHistory.findMany({ where: { projectId: f.project.id, action: { in: ["acceptance-dossier.submit", "project.acceptance.submit"] } }, orderBy: { action: "asc" } });
  assert.deepEqual(history.map((row) => [row.action, row.fromStatus, row.toStatus]), [["acceptance-dossier.submit", "draft", "submitted"], ["project.acceptance.submit", "executing", "pending_acceptance"]]);
  assert.deepEqual(history[0].afterFacts, { dossierId, status: "submitted", version: 1 }, "lịch sử không chứa nội dung mục");
  assert.ok(await db.auditLog.findFirst({ where: { action: "submit-acceptance-dossier", targetEntityId: dossierId } }));
  const notes = await db.userNotification.findMany({ where: { sourceType: "acceptance_dossier", sourceId: dossierId } });
  assert.deepEqual(notes.map((row) => row.userId), [people.staff.id], "báo CV phụ trách");
  assert.equal(await seesNotification(people.staff, f.project.id), true);

  await assert.rejects(() => f.edit(people.pi, "results", "sửa"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => f.upload(people.pi, dossierId, "ACCEPTANCE_OTHER"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(async () => f.files.deleteFile(people.member, contribution.id, await f.ctx()), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => f.submit(people.pi), coded(400, "WORKFLOW_STATE_DENIED"));
  assert.equal((await f.files.downloadFile(people.staff, evidence.id)).content.toString(), "%PDF");
  assert.ok((await f.files.listFiles(people.pi, { relatedEntityType: "acceptance_dossier", relatedEntityId: dossierId })).every((file) => file.canDelete === false), "tệp chỉ đọc sau khi nộp");

  // AC2: đề tài chờ nghiệm thu không nhận báo cáo tiến độ hay yêu cầu điều chỉnh mới.
  await assert.rejects(async () => f.projects.createReportDraft(people.pi, f.project.id, { contextVersion: await f.ctx(), reportingPeriodStart: new Date("2026-01-01"), reportingPeriodEnd: new Date("2026-06-30"), progressResults: "x" }), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(async () => f.projects.createAdjustment(people.pi, f.project.id, { contextVersion: await f.ctx(), proposedValues: {}, reason: "x" }), coded(400, "WORKFLOW_STATE_DENIED"));
});

test("6.8: a report awaiting CV review blocks submit; without a CV the TB is notified", async () => {
  const f = await fixture("A2");
  const { dossier } = await f.create(f.people.pi);
  await f.upload(f.people.pi, dossier.id, "ACCEPTANCE_FINAL_REPORT");
  await f.upload(f.people.pi, dossier.id, "ACCEPTANCE_PRODUCT_EVIDENCE");
  await fill(f);
  const report = await db.projectReportRevision.create({ data: { projectId: f.project.id, revision: 1, status: "under_review", progressResults: "x", authorId: f.people.pi.id } });
  const submittedReport = await db.projectReportRevision.create({ data: { projectId: f.project.id, revision: 2, status: "submitted", progressResults: "y", authorId: f.people.pi.id } });
  const blocked = await f.submit(f.people.pi).catch((error) => error);
  assert.deepEqual([...blocked.response.pendingReports].sort(), [report.id, submittedReport.id].sort());
  await db.projectReportRevision.updateMany({ where: { id: { in: [report.id, submittedReport.id] } }, data: { status: "accepted" } });

  await db.projectManagementOfficer.update({ where: { id: f.officer.id }, data: { status: "REVOKED", effectiveUntil: new Date() } });
  await f.submit(f.people.pi);
  const notes = await db.userNotification.findMany({ where: { sourceType: "acceptance_dossier", sourceId: dossier.id } });
  assert.deepEqual(notes.map((row) => row.userId), [f.people.board.id]);
  assert.equal(await seesNotification(f.people.board, f.project.id), true);
});

test("6.8: a paused project refuses create, edit and submit", async () => {
  const f = await fixture("A3", "paused");
  await assert.rejects(() => f.create(f.people.pi), coded(400, "WORKFLOW_STATE_DENIED"));

  const g = await fixture("A4");
  await g.create(g.people.pi);
  await db.approvedProject.update({ where: { id: g.project.id }, data: { status: "paused" } });
  await assert.rejects(() => g.edit(g.people.pi, "results", "x"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => g.submit(g.people.pi), coded(400, "WORKFLOW_STATE_DENIED"));
});
