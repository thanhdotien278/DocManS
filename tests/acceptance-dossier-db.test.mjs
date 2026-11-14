import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { AcceptanceDossiersService } from "../dist/apps/api/approved-projects/acceptance-dossiers.service.js";
import { AcceptanceCouncilService } from "../dist/apps/api/approved-projects/acceptance-council.service.js";
import { projectReportReviewPipe } from "../dist/apps/api/approved-projects/approved-projects.dto.js";
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
  return { org, people, proposal, project, officer, openMilestone, projects, acceptance, files, ctx, create, edit, submit, upload, make };
}

async function seesNotification(actor, projectId) {
  const service = new NotificationsService(db, new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
  return (await service.list(actor, 20)).notifications.some((row) => row.link === `/projects/${projectId}/acceptance-dossier`);
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
  const deletable = async (who) => Object.fromEntries((await f.acceptance.getDossier(who, f.project.id)).dossier.files.map((file) => [file.id, file.canDelete]));
  assert.deepEqual(Object.values(await deletable(people.pi)), [true, true, true], "PI xóa được mọi tệp nháp");
  const memberView = await deletable(people.member);
  assert.deepEqual([memberView[contribution.id], memberView[evidence.id]], [true, false], "người đóng góp chỉ xóa tệp của mình");
  assert.ok(Object.values(await deletable(people.staff)).every((value) => value === false), "CV không xóa tệp");

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
  assert.ok(view.dossier.files.every((file) => file.canDelete === false), "không xóa tệp sau khi nộp");
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
  // Báo cáo còn nháp hoặc cần bổ sung cũng chặn: PI phải xử lý xong rồi mới nộp nghiệm thu.
  const draftReport = await db.projectReportRevision.create({ data: { projectId: f.project.id, revision: 3, status: "draft", progressResults: "z", authorId: f.people.pi.id } });
  const supplementReport = await db.projectReportRevision.create({ data: { projectId: f.project.id, revision: 4, status: "supplement_requested", progressResults: "w", authorId: f.people.pi.id } });
  await db.projectReportRevision.create({ data: { projectId: f.project.id, revision: 5, status: "superseded", progressResults: "v", authorId: f.people.pi.id } });
  const pending = [report.id, submittedReport.id, draftReport.id, supplementReport.id];
  const blocked = await f.submit(f.people.pi).catch((error) => error);
  assert.deepEqual([...blocked.response.pendingReports].sort(), [...pending].sort());
  await db.projectReportRevision.updateMany({ where: { id: { in: pending } }, data: { status: "accepted" } });

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

test("6.9 p3: TP/TB/CV phụ trách yêu cầu bổ sung hồ sơ đã nộp; PI sửa và nộp lại thành v2, đề tài về chờ nghiệm thu", async () => {
  const f = await fixture("A5");
  const { people } = f;
  const { dossier } = await f.create(people.pi);
  const report = await f.upload(people.pi, dossier.id, "ACCEPTANCE_FINAL_REPORT");
  await f.upload(people.pi, dossier.id, "ACCEPTANCE_PRODUCT_EVIDENCE");
  await fill(f);
  await f.submit(people.pi);

  const deadline = new Date(Date.now() + 7 * 86400000);
  const ask = async (actor, input = {}) => f.acceptance.requestSupplement(actor, f.project.id, { reason: "Thiếu minh chứng sản phẩm", responseDeadline: deadline, contextVersion: await f.ctx(), ...input });
  const director = await f.make("giamdoc", "LEADERSHIP_APPROVAL_AUTHORITY");
  const otherStaff = await f.make("cvkhac", "RESEARCH_MANAGEMENT_STAFF");
  for (const who of [people.pi, director, otherStaff]) await assert.rejects(() => ask(who), coded(403, "ACTION_NOT_GRANTED"), who.username);
  // Chỉ có một TB đang hoạt động: tạm cho TB làm thành viên đề tài.
  const boardSeat = await db.approvedProjectMember.create({ data: { projectId: f.project.id, userId: people.board.id, name: "tb", role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(Date.now() - 86400000), createdById: people.staff.id } });
  await assert.rejects(() => ask(people.board), coded(403, "ACTION_NOT_GRANTED"), "TB là thành viên đề tài");
  await db.approvedProjectMember.delete({ where: { id: boardSeat.id } });
  await assert.rejects(() => ask(people.staff, { reason: undefined }), status(400));
  await assert.rejects(() => ask(people.staff, { responseDeadline: undefined }), status(400));
  await assert.rejects(() => ask(people.staff, { responseDeadline: new Date(Date.now() - 86400000) }), coded(400, "DEADLINE_INVALID"));
  await assert.rejects(() => ask(people.staff, { responseDeadline: "khong-phai-ngay" }), coded(400, "DEADLINE_INVALID"));

  // Tờ trình đang chờ hoặc hội đồng đã thành lập thì không trả hồ sơ.
  const outsider = await f.make("ngoai", "RESEARCHER_INTERNAL_USER");
  const sheet = await db.approvalSubmission.create({ data: { kind: "ACCEPTANCE_COUNCIL", subjectType: "project", subjectId: f.project.id, title: "Tờ trình", hostOrganizationUnitId: f.org.id, stage: "BOARD_REVIEW", signer: "DIRECTOR_OR_SCIENCE_DEPUTY", submittedById: people.staff.id, authorRole: "RESEARCH_MANAGEMENT_STAFF" } });
  await assert.rejects(() => ask(people.staff), coded(400, "WORKFLOW_STATE_DENIED"));
  await db.approvalSubmission.delete({ where: { id: sheet.id } });
  const established = await db.acceptanceCouncilMember.create({ data: { projectId: f.project.id, userId: outsider.id, councilRole: "council_chair", invitationStatus: "accepted", invitedById: people.head.id, councilEstablishedAt: new Date() } });
  await assert.rejects(() => ask(people.staff), coded(400, "WORKFLOW_STATE_DENIED"));
  await db.acceptanceCouncilMember.update({ where: { id: established.id }, data: { invitationStatus: "invited", councilEstablishedAt: null } });

  const stale = await f.ctx();
  await db.approvedProject.update({ where: { id: f.project.id }, data: { aggregateVersion: { increment: 1 } } });
  await assert.rejects(() => f.acceptance.requestSupplement(people.staff, f.project.id, { reason: "x", responseDeadline: deadline, contextVersion: stale }), coded(409, "CONTEXT_VERSION_MISMATCH"));

  const returned = await ask(people.staff);
  assert.deepEqual([returned.dossier.status, returned.dossier.version, returned.dossier.readOnly, returned.projectStatus], ["supplement_requested", 2, true, "executing"]);
  assert.deepEqual(returned.dossier.supplementRequest, { reason: "Thiếu minh chứng sản phẩm", responseDeadline: deadline.toISOString(), requestedBy: { id: people.staff.id, displayName: people.staff.displayName }, requestedAt: returned.dossier.supplementRequest.requestedAt });
  const history = await db.projectHistory.findMany({ where: { projectId: f.project.id, action: { in: ["acceptance-dossier.request-supplement", "project.acceptance.request-supplement"] } }, orderBy: { action: "asc" } });
  assert.deepEqual(history.map((row) => [row.action, row.fromStatus, row.toStatus]), [["acceptance-dossier.request-supplement", "submitted", "supplement_requested"], ["project.acceptance.request-supplement", "pending_acceptance", "executing"]]);
  assert.ok(await db.auditLog.findFirst({ where: { action: "request-acceptance-dossier-supplement", targetEntityId: dossier.id } }));
  const piNotes = await db.userNotification.findMany({ where: { sourceId: dossier.id, type: "acceptance-dossier.supplement-requested" } });
  assert.deepEqual(piNotes.map((row) => row.userId), [people.pi.id]);
  assert.ok(!piNotes[0].body.includes("Thiếu minh chứng"), "thông báo không chép lý do");
  assert.equal(await seesNotification(people.pi, f.project.id), true);
  const requesterView = await f.acceptance.getDossier(people.staff, f.project.id);
  assert.deepEqual([requesterView.dossier.readOnly, requesterView.dossier.supplementRequest.reason, requesterView.dossier.submittedAt, requesterView.dossier.submittedBy], [true, "Thiếu minh chứng sản phẩm", null, null]);
  await assert.rejects(() => ask(people.staff), coded(400, "WORKFLOW_STATE_DENIED"), "không yêu cầu lần hai");

  // Lời mời hội đồng giữ nguyên nhưng không phản hồi được khi đề tài về executing.
  const council = new AcceptanceCouncilService(db, f.projects);
  await assert.rejects(() => council.respond(outsider, f.project.id, established.id, { decision: "accept" }), coded(400, "WORKFLOW_STATE_DENIED"));

  const piView = await f.acceptance.getDossier(people.pi, f.project.id);
  assert.equal(piView.dossier.readOnly, false);
  for (const action of ["acceptance-dossier.edit", "acceptance-dossier.submit"]) assert.ok(piView.allowedActions.includes(action), action);
  await f.edit(people.pi, "results", "Đạt toàn bộ mục tiêu, bổ sung minh chứng");
  await f.upload(people.member, dossier.id, "ACCEPTANCE_CONTRIBUTION");
  await f.files.deleteFile(people.pi, report.id, await f.ctx());
  const replacement = await f.upload(people.pi, dossier.id, "ACCEPTANCE_FINAL_REPORT");

  const resubmitted = await f.submit(people.pi);
  assert.deepEqual([resubmitted.dossier.status, resubmitted.projectStatus, resubmitted.dossier.supplementRequest], ["submitted", "pending_acceptance", null]);
  const [v2, v1] = (await f.acceptance.getDossier(people.staff, f.project.id)).dossier.submissions;
  assert.deepEqual([v2.version, v1.version], [2, 1]);
  assert.equal(v1.snapshot.sections.results, "Đạt toàn bộ mục tiêu", "snapshot cũ giữ nguyên");
  assert.equal(v2.snapshot.sections.results, "Đạt toàn bộ mục tiêu, bổ sung minh chứng");
  assert.ok(v1.snapshot.files.some((file) => file.id === report.id) && !v2.snapshot.files.some((file) => file.id === report.id) && v2.snapshot.files.some((file) => file.id === replacement.id));
  const submitHistory = await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "acceptance-dossier.submit" }, orderBy: { createdAt: "desc" } });
  assert.deepEqual([submitHistory.fromStatus, submitHistory.afterFacts.version], ["supplement_requested", 2]);
  assert.deepEqual((await db.userNotification.findMany({ where: { sourceId: dossier.id, idempotencyKey: `acceptance-dossier:${dossier.id}:v2` } })).map((row) => row.userId), [people.staff.id]);

  // TP và TB (không là thành viên) cũng yêu cầu được.
  const again = await ask(people.head);
  assert.deepEqual([again.dossier.status, again.dossier.version, again.dossier.supplementRequest.requestedBy.id], ["supplement_requested", 3, people.head.id]);
  await f.submit(people.pi);
  assert.equal((await ask(people.board)).dossier.version, 4);
});

test("6.9 p3: pipe yêu cầu bổ sung chặn lý do quá 2000 ký tự và hạn không hợp lệ", () => {
  const bad = (error) => error.getStatus?.() === 400;
  assert.throws(() => projectReportReviewPipe.transform({ reason: "x".repeat(2001), responseDeadline: "2030-01-01" }), bad);
  assert.throws(() => projectReportReviewPipe.transform({ reason: "Thiếu", responseDeadline: "khong-phai-ngay" }), bad);
  assert.equal(projectReportReviewPipe.transform({ reason: "x".repeat(2000), responseDeadline: "2030-01-01" }).reason.length, 2000);
});
