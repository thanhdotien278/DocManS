import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { EthicsDossiersService } from "../dist/apps/api/approved-projects/ethics-dossiers.service.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";

// Story 10.3 (phần 1): hồ sơ đạo đức trên PostgreSQL thật — ma trận I/O của spec.
let database;
let db;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("ethics_dossier");
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
  // Chỉ một Trưởng ban đang hoạt động toàn hệ thống.
  await db.user.updateMany({ where: { systemRole: "RESEARCH_BOARD_HEAD" }, data: { status: "disabled" } });
  const org = await db.organizationUnit.create({ data: { code, name: `Phòng ${code}` } });
  const make = async (username, systemRole) => {
    const user = await db.user.create({ data: { username: `${username}-${code}`, usernameKey: `${username}-${code}`.toLowerCase(), displayName: username, passwordHash: "x", status: "active", systemRole, unit: org.name, organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } });
    return { id: user.id, username: user.username, displayName: username, systemRole, unit: org.name, organizationScopes: [{ id: org.id, code: org.code, name: org.name }] };
  };
  const people = {
    staff: await make("chuyenvien", "RESEARCH_MANAGEMENT_STAFF"),
    board: await make("truongban", "RESEARCH_BOARD_HEAD"),
    deputy: await make("phophong", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"),
    head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"),
    oversight: await make("pgdtd", "RESEARCH_OVERSIGHT_AUTHORITY"),
    pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER"),
    secretary: await make("thuky", "RESEARCHER_INTERNAL_USER"),
    member: await make("thanhvien", "RESEARCHER_INTERNAL_USER")
  };
  const intake = await db.proposalIntakePeriod.create({ data: { code: `DOT-${code}`, title: "Đợt", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), requiredPackage: [] } });
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: people.pi.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, status: "approved", submittedAt: new Date() } });
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: {} } });
  const decision = await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: people.head.id, fromStatus: "under_review", toStatus: "approved" } });
  const project = await db.approvedProject.create({ data: { proposalId: proposal.id, sourceSubmissionEventId: event.id, sourceDecisionId: decision.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, scopeSnapshot: { title: "Đề tài" }, status: projectStatus, startDate: new Date("2026-01-01"), endDate: new Date("2030-01-01"), createdById: people.staff.id } });
  const since = new Date(Date.now() - 86400000);
  for (const [user, role] of [[people.pi, "TOPIC_PI"], [people.secretary, "TOPIC_SECRETARY"], [people.member, "TOPIC_MEMBER"]]) await db.approvedProjectMember.create({ data: { projectId: project.id, userId: user.id, name: user.displayName, role, participationRole: role, status: "ACTIVE", effectiveFrom: since, createdById: people.staff.id } });
  const officer = await db.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: people.staff.id, assignedById: people.head.id, status: "ACTIVE", effectiveFrom: since, assignmentContextVersion: {} } });
  const audit = new AuditLogService(db);
  const projects = new ApprovedProjectsService(db, audit);
  const ethics = new EthicsDossiersService(db, projects);
  const storage = { objects: new Map(), async putObject({ objectKey, content }) { this.objects.set(objectKey, Buffer.from(content)); }, async getObject(key) { return this.objects.get(key); }, async deleteObject(key) { this.objects.delete(key); } };
  const files = new FilesService(db, storage, audit, new ProposalParticipationService(db), new ProposalReviewAccessService(db), { maxFileSizeBytes: 1024, allowedExtensions: [".pdf"] });
  const ctx = async () => projectContextVersion(await db.approvedProject.findUnique({ where: { id: project.id } }));
  const create = async (actor) => ethics.createDossier(actor, project.id, { contextVersion: await ctx() });
  const edit = async (actor, section, value) => ethics.updateSection(actor, project.id, { section, value, contextVersion: await ctx() });
  const submit = async (actor) => ethics.submit(actor, project.id, { contextVersion: await ctx() });
  const upload = async (actor, dossierId, filePurpose) => files.uploadFile(actor, { relatedEntityType: "ethics_dossier", relatedEntityId: dossierId, filePurpose, fileName: `${filePurpose}.pdf`, mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("%PDF"), contextVersion: await ctx() });
  return { org, people, proposal, project, officer, projects, ethics, files, ctx, create, edit, submit, upload };
}

// Thông báo được lọc lại theo quyền khi đọc; kiểm tra người nhận thực sự thấy nó.
async function seesNotification(actor, projectId) {
  const service = new NotificationsService(db, new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
  return (await service.list(actor, 20)).notifications.some((row) => row.link === `/projects/${projectId}/ethics-dossier`);
}

const FILLED = {
  subjects: { types: ["human"], sampleSize: 120, description: "Bệnh nhân điều trị nội trú" },
  methods: "Thử nghiệm lâm sàng ngẫu nhiên",
  riskBenefit: "Nguy cơ thấp",
  consent: { mode: "required", text: "Ký phiếu chấp thuận" },
  dataProtection: "Mã hóa dữ liệu"
};

test("10.3: PI creates, secretary drafts, only PI/CV submit once ready; submitted version is locked with snapshot, history, audit and notification", async () => {
  const f = await fixture("E1");
  const { people } = f;

  for (const who of [people.member, people.secretary, people.board]) await assert.rejects(() => f.create(who), coded(403, "ACTION_NOT_GRANTED"));
  const created = await f.create(people.pi);
  const dossierId = created.dossier.id;
  assert.deepEqual([created.dossier.status, created.dossier.version, created.dossier.applicant.id, created.dossier.hostOrganizationUnit.id], ["draft", 1, people.pi.id, f.org.id]);
  assert.equal(created.dossier.sourceContext.sourceSubmissionEventId, f.project.sourceSubmissionEventId);
  assert.ok(await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "ethics-dossier.create" } }));
  assert.ok(await db.auditLog.findFirst({ where: { action: "create-ethics-dossier", targetEntityId: dossierId } }));
  await assert.rejects(() => f.create(people.staff), coded(409, "ETHICS_DOSSIER_EXISTS"));

  await f.edit(people.secretary, "methods", FILLED.methods);
  await assert.rejects(() => f.edit(people.member, "methods", "x"), coded(403, "ACTION_NOT_GRANTED"), "thành viên chỉ xem");
  await assert.rejects(() => f.edit(people.staff, "commitment", true), coded(403, "ACTION_NOT_GRANTED"), "chỉ PI tích cam kết");
  await assert.rejects(() => f.edit(people.pi, "subjects", { types: ["alien"] }), status(400));

  const incomplete = await f.submit(people.pi).catch((error) => error);
  assert.equal(incomplete.response.code, "READINESS_INCOMPLETE");
  assert.ok(incomplete.response.missingSections.includes("commitment"));
  assert.ok(incomplete.response.missingFiles.includes("ETHICS_APPLICATION"));

  await assert.rejects(() => f.upload(people.pi, dossierId, "PROJECT_REPORT"), status(400), "chỉ nhận loại tệp ETHICS_*");
  await assert.rejects(() => f.upload(people.member, dossierId, "ETHICS_OTHER"), status(403));
  for (const purpose of ["ETHICS_APPLICATION", "ETHICS_PROTOCOL", "ETHICS_DATA_TOOL"]) await f.upload(people.secretary, dossierId, purpose);
  const consentFile = await f.upload(people.staff, dossierId, "ETHICS_CONSENT");
  for (const [section, value] of Object.entries(FILLED)) await f.edit(people.pi, section, value);
  await f.edit(people.pi, "commitment", true);

  const commitment = async () => (await db.ethicsDossier.findUnique({ where: { id: dossierId } })).sections.commitment;
  const stale = await f.ctx();
  await f.edit(people.secretary, "methods", FILLED.methods);
  assert.equal(await commitment(), false, "người không phải PI sửa mục thì bỏ tích cam kết");
  await assert.rejects(() => f.ethics.updateSection(people.pi, f.project.id, { section: "methods", value: "ghi đè", contextVersion: stale }), coded(409, "CONTEXT_VERSION_MISMATCH"), "client cũ không ghi đè");
  await f.edit(people.pi, "commitment", true);
  const other = await f.upload(people.staff, dossierId, "ETHICS_OTHER");
  assert.equal(await commitment(), false, "người không phải PI đổi tệp thì bỏ tích cam kết");

  assert.equal((await f.files.listFiles(people.member, { relatedEntityType: "ethics_dossier", relatedEntityId: dossierId })).length, 5, "thành viên xem tệp nháp");
  assert.equal((await f.files.updateFile(people.pi, other.id, { description: "Phụ lục", contextVersion: await f.ctx() })).description, "Phụ lục");
  await f.files.deleteFile(people.pi, other.id, await f.ctx());
  assert.equal((await f.files.listFiles(people.pi, { relatedEntityType: "ethics_dossier", relatedEntityId: dossierId })).length, 4);
  await f.edit(people.pi, "commitment", true);

  await assert.rejects(() => f.submit(people.secretary), coded(403, "ACTION_NOT_GRANTED"), "thư ký không nộp");
  await assert.rejects(() => f.submit(people.member), coded(403, "ACTION_NOT_GRANTED"));
  const submitted = await f.submit(people.pi);
  assert.equal(submitted.dossier.status, "submitted");

  const view = await f.ethics.getDossier(people.member, f.project.id);
  assert.equal(view.dossier.readOnly, true);
  assert.deepEqual(view.dossier.submissions.map((row) => row.version), [1]);
  const snapshot = view.dossier.submissions[0].snapshot;
  assert.equal(snapshot.sections.commitment, true);
  assert.equal(snapshot.files.length, 4);
  assert.equal(snapshot.projectContextVersion.aggregateVersion, (await f.ctx()).aggregateVersion - 1, "snapshot giữ context lúc nộp; nộp tăng context");
  assert.equal((await f.projects.getProject(people.member, f.project.id)).ethicsDossier.status, "submitted");
  assert.equal((await f.projects.getProject(people.oversight, f.project.id)).ethicsDossier, null);
  for (const who of [people.pi, people.staff]) {
    const actions = (await f.ethics.getDossier(who, f.project.id)).allowedActions;
    assert.ok(!actions.includes("ethics-dossier.edit") && !actions.includes("ethics-dossier.submit"));
  }
  const history = await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "ethics-dossier.submit" } });
  assert.deepEqual(history.afterFacts, { dossierId, status: "submitted", version: 1 }, "lịch sử không chứa nội dung mục");
  assert.ok(await db.auditLog.findFirst({ where: { action: "submit-ethics-dossier", targetEntityId: dossierId } }));
  const notes = await db.userNotification.findMany({ where: { sourceType: "ethics_dossier", sourceId: dossierId } });
  assert.deepEqual(notes.map((row) => row.userId), [people.staff.id], "báo CV phụ trách");
  assert.equal(await seesNotification(people.staff, f.project.id), true);

  await assert.rejects(() => f.edit(people.pi, "methods", "sửa"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => f.upload(people.pi, dossierId, "ETHICS_OTHER"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(async () => f.files.deleteFile(people.pi, consentFile.id, await f.ctx()), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => f.submit(people.pi), coded(400, "WORKFLOW_STATE_DENIED"));

  for (const who of [people.deputy, people.oversight]) {
    await assert.rejects(() => f.ethics.getDossier(who, f.project.id), status(403));
    await assert.rejects(() => f.files.downloadFile(who, consentFile.id), status(403));
  }
  assert.equal((await f.files.downloadFile(people.member, consentFile.id)).content.toString(), "%PDF");

  await db.projectManagementOfficer.update({ where: { id: f.officer.id }, data: { status: "REVOKED", effectiveUntil: new Date() } });
  assert.equal(await seesNotification(people.staff, f.project.id), false, "mất quyền xem thì thông báo biến mất");
});

test("10.3: a CV with a reviewer conflict is refused on create and file upload; a CV submit notifies the PI", async () => {
  const f = await fixture("E5");
  const { people } = f;
  await db.proposalReviewAssignment.create({ data: { proposalId: f.proposal.id, reviewerUserId: people.staff.id, assignedById: people.head.id, status: "assigned" } });
  await assert.rejects(() => f.create(people.staff), coded(403, "CONFLICT_DENIED"));
  const { dossier } = await f.create(people.pi);
  await assert.rejects(() => f.upload(people.staff, dossier.id, "ETHICS_OTHER"), coded(403, "CONFLICT_DENIED"));

  const g = await fixture("E6");
  const created = await g.create(g.people.staff);
  for (const purpose of ["ETHICS_APPLICATION", "ETHICS_PROTOCOL", "ETHICS_DATA_TOOL", "ETHICS_CONSENT"]) await g.upload(g.people.staff, created.dossier.id, purpose);
  for (const [section, value] of Object.entries(FILLED)) await g.edit(g.people.staff, section, value);
  await g.edit(g.people.pi, "commitment", true);
  await g.submit(g.people.staff);
  const notes = await db.userNotification.findMany({ where: { sourceType: "ethics_dossier", sourceId: created.dossier.id } });
  assert.deepEqual(notes.map((row) => row.userId), [g.people.pi.id], "CV tự nộp thì báo PI");
  assert.equal(await seesNotification(g.people.pi, g.project.id), true);
});

test("10.3: a revoked CV can no longer edit or submit; without a CV the TB is notified; consent waiver drops ETHICS_CONSENT", async () => {
  const f = await fixture("E2", "preparing");
  const { people } = f;
  const { dossier } = await f.create(people.staff);
  await f.edit(people.staff, "methods", FILLED.methods);

  await db.projectManagementOfficer.update({ where: { id: f.officer.id }, data: { status: "REVOKED", effectiveUntil: new Date() } });
  await assert.rejects(() => f.edit(people.staff, "methods", "x"), status(403));
  await assert.rejects(() => f.submit(people.staff), status(403));

  for (const purpose of ["ETHICS_APPLICATION", "ETHICS_PROTOCOL", "ETHICS_DATA_TOOL"]) await f.upload(people.pi, dossier.id, purpose);
  for (const [section, value] of Object.entries({ ...FILLED, consent: { mode: "waived", text: "Dữ liệu thứ cấp ẩn danh" } })) await f.edit(people.pi, section, value);
  await f.edit(people.pi, "commitment", true);
  await f.submit(people.pi);
  const notes = await db.userNotification.findMany({ where: { sourceType: "ethics_dossier", sourceId: dossier.id } });
  assert.deepEqual(notes.map((row) => row.userId), [people.board.id]);
  assert.equal(await seesNotification(people.board, f.project.id), true);
});

test("10.3: a closed project refuses create, edit and submit", async () => {
  const f = await fixture("E3", "closed");
  await assert.rejects(() => f.create(f.people.pi), coded(400, "WORKFLOW_STATE_DENIED"));

  const g = await fixture("E4");
  await g.create(g.people.pi);
  await db.approvedProject.update({ where: { id: g.project.id }, data: { status: "closed" } });
  await assert.rejects(() => g.edit(g.people.pi, "methods", "x"), coded(400, "WORKFLOW_STATE_DENIED"));
  await assert.rejects(() => g.submit(g.people.pi), coded(400, "WORKFLOW_STATE_DENIED"));
});
