import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { AcceptanceDossiersService } from "../dist/apps/api/approved-projects/acceptance-dossiers.service.js";
import { AcceptanceCouncilService } from "../dist/apps/api/approved-projects/acceptance-council.service.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";
import { advanceApprovalSubmission, returnApprovalSubmission } from "../dist/apps/api/proposals-shared/approval-routing.js";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";
import { acceptanceCouncilInvitePipe, acceptanceCouncilRespondPipe, acceptanceResultPipe } from "../dist/apps/api/approved-projects/approved-projects.dto.js";

// Story 6.9: hội đồng nghiệm thu và kết quả nghiệm thu trên PostgreSQL thật — ma trận I/O của spec.
let database;
let db;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("acceptance_council");
  process.env.DATABASE_URL = database.url;
  db = new PrismaService();
});

after(async () => {
  await db?.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await database?.drop();
});

const coded = (httpStatus, code) => (error) => error.getStatus?.() === httpStatus && (code === undefined || error.response?.code === code);

async function fixture(code, config = { allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD"], memberCount: 3 }) {
  await db.systemParameter.upsert({ where: { key: "council_formation.ACCEPTANCE" }, create: { key: "council_formation.ACCEPTANCE", value: JSON.stringify(config), label: "Hội đồng nghiệm thu" }, update: { value: JSON.stringify(config) } });
  await db.user.updateMany({ where: { systemRole: "RESEARCH_BOARD_HEAD" }, data: { status: "disabled" } });
  const org = await db.organizationUnit.create({ data: { code, name: `Phòng ${code}` } });
  let counter = 0;
  const make = async (name, systemRole, { scoped = true, profile = false } = {}) => {
    const username = `${name}${counter++}-${code}`;
    const user = await db.user.create({ data: { username, usernameKey: username.toLowerCase(), displayName: name, passwordHash: "x", status: "active", systemRole, unit: org.name, ...(scoped ? { organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } : {}) } });
    if (profile) await db.researcherProfile.create({ data: { managementOrganizationUnitId: org.id, linkedUserId: user.id, fullName: name, fullNameKey: `${name}-${username}`.toLowerCase(), createdById: user.id, updatedById: user.id } });
    return { id: user.id, username, displayName: name, systemRole, unit: org.name, organizationScopes: scoped ? [{ id: org.id, code: org.code, name: org.name }] : [] };
  };
  const people = {
    staff: await make("chuyenvien", "RESEARCH_MANAGEMENT_STAFF"),
    board: await make("truongban", "RESEARCH_BOARD_HEAD"),
    head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"),
    director: await make("giamdoc", "LEADERSHIP_APPROVAL_AUTHORITY"),
    science: await make("pgdkh", "SCIENCE_DEPUTY_DIRECTOR", { profile: true }),
    pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER", { profile: true }),
    member: await make("thanhvien", "RESEARCHER_INTERNAL_USER", { profile: true }),
    admin: await make("quantri", "SYSTEM_ADMIN", { profile: true }),
    noProfile: await make("chuacv", "RESEARCHER_INTERNAL_USER", { scoped: false })
  };
  // Thành viên hội đồng ở đơn vị khác: không đọc được đề tài.
  const candidate = (name) => make(name, "RESEARCHER_INTERNAL_USER", { scoped: false, profile: true });
  const intake = await db.proposalIntakePeriod.create({ data: { code: `DOT-${code}`, title: "Đợt", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), requiredPackage: [] } });
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: people.pi.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, status: "approved", submittedAt: new Date() } });
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: {} } });
  const decision = await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: people.head.id, fromStatus: "under_review", toStatus: "approved" } });
  const project = await db.approvedProject.create({ data: { proposalId: proposal.id, sourceSubmissionEventId: event.id, sourceDecisionId: decision.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, scopeSnapshot: { title: "Đề tài" }, status: "pending_acceptance", startDate: new Date("2026-01-01"), endDate: new Date("2030-01-01"), createdById: people.staff.id } });
  const since = new Date(Date.now() - 86400000);
  for (const [key, role] of [["pi", "TOPIC_PI"], ["member", "TOPIC_MEMBER"]]) await db.approvedProjectMember.create({ data: { projectId: project.id, userId: people[key].id, name: people[key].displayName, role, participationRole: role, status: "ACTIVE", effectiveFrom: since, createdById: people.staff.id } });
  await db.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: people.staff.id, assignedById: people.head.id, status: "ACTIVE", effectiveFrom: since, assignmentContextVersion: {} } });
  const dossier = await db.acceptanceDossier.create({ data: { projectId: project.id, status: "submitted", sections: { results: "Đạt", products: [{ name: "Bài báo", type: "", description: "" }], summary: "Tóm tắt", milestoneNotes: {} }, sourceContext: {}, createdById: people.pi.id, submittedById: people.pi.id, submittedAt: new Date() } });
  const audit = new AuditLogService(db);
  const projects = new ApprovedProjectsService(db, audit);
  const dossiers = new AcceptanceDossiersService(db, projects);
  const council = new AcceptanceCouncilService(db, projects);
  const storage = { objects: new Map(), async putObject({ objectKey, content }) { this.objects.set(objectKey, Buffer.from(content)); }, async getObject(key) { return this.objects.get(key); }, async deleteObject(key) { this.objects.delete(key); } };
  const files = new FilesService(db, storage, audit, new ProposalParticipationService(db), new ProposalReviewAccessService(db), { maxFileSizeBytes: 1024, allowedExtensions: [".pdf"] });
  const ctx = async () => projectContextVersion(await db.approvedProject.findUnique({ where: { id: project.id } }));
  const reload = () => db.approvedProject.findUnique({ where: { id: project.id } });
  const invite = async (actor, user, councilRole) => (await council.invite(actor, project.id, { userId: user.id, councilRole, contextVersion: await ctx() })).members.find((row) => row.userId === user.id && row.invitationStatus === "invited").id;
  const respond = (user, memberId, decision, reason) => council.respond(user, project.id, memberId, { decision, reason });
  const revoke = async (actor, memberId, reason) => council.revoke(actor, project.id, memberId, { reason, contextVersion: await ctx() });
  const submit = async (actor) => council.submit(actor, project.id, { contextVersion: await ctx() });
  const pending = (kind = "ACCEPTANCE_COUNCIL") => db.approvalSubmission.findFirst({ where: { kind, subjectType: "project", subjectId: project.id, status: "PENDING" } });
  const advance = async (actor, kind) => { const row = await pending(kind); return db.$transaction((tx) => advanceApprovalSubmission(tx, actor, row.id, { expectedStage: row.stage })); };
  const toLeadership = async (kind) => { await advance(people.board, kind); await advance(people.head, kind); };
  const decide = async (actor, decision, reason) => council.decide(actor, project.id, decision, { reason, contextVersion: await ctx() });
  const result = async (actor, outcome, comment = "Hội đồng thống nhất") => council.recordResult(actor, project.id, { outcome, comment, contextVersion: await ctx() });
  const upload = async (actor, filePurpose = "ACCEPTANCE_MINUTES") => files.uploadFile(actor, { relatedEntityType: "acceptance_dossier", relatedEntityId: dossier.id, filePurpose, fileName: "bien-ban.pdf", mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("%PDF"), contextVersion: await ctx() });
  /** Mời đủ 3 người, mọi người nhận lời; trả về {chair, secretary, committee} kèm memberId. */
  const formCouncil = async (actor, seats = {}) => {
    const roster = {};
    for (const role of ["council_chair", "council_secretary", "committee_member"]) {
      const user = seats[role] ?? await candidate(role);
      roster[role] = { user, memberId: await invite(actor, user, role) };
      await respond(user, roster[role].memberId, "accept");
    }
    return roster;
  };
  return { org, people, project, dossier, projects, dossiers, council, files, candidate, ctx, reload, invite, respond, revoke, submit, pending, advance, toLeadership, decide, result, upload, formCouncil };
}

async function notificationTypes(actor) {
  const service = new NotificationsService(db, new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
  return (await service.list(actor, 50)).notifications.map((row) => row.type).filter((type) => type.startsWith("acceptance-council."));
}

test("6.9: pipe từ chối kết quả, vị trí lạ và từ chối lời mời không lý do", () => {
  assert.throws(() => acceptanceResultPipe.transform({ outcome: "closed", comment: "x" }), coded(400));
  assert.throws(() => acceptanceCouncilInvitePipe.transform({ userId: "u", councilRole: "reviewer" }), coded(400));
  assert.throws(() => acceptanceCouncilRespondPipe.transform({ decision: "decline" }), coded(400, "DECLINE_REASON_REQUIRED"));
  assert.equal(acceptanceResultPipe.transform({ outcome: "failed", comment: "x" }).outcome, "failed");
});

test("6.9: mời, nhận lời, trình TB → TP → PGĐ-KH ký, chủ tịch ghi đạt, rồi thanh lý đóng đề tài", async () => {
  const f = await fixture("N1");
  const { people } = f;

  // Người không được tick trong cấu hình mặc định (TP, TB) thì không lập được.
  await assert.rejects(async () => f.council.invite(people.staff, f.project.id, { userId: people.member.id, councilRole: "council_chair", contextVersion: await f.ctx() }), coded(403, "COUNCIL_FORMATION_DENIED"));
  for (const user of [people.pi, people.member, people.admin, people.noProfile, people.head]) await assert.rejects(() => f.invite(people.head, user, "council_chair"), coded(400, "COUNCIL_MEMBER_INELIGIBLE"), user.displayName);
  await assert.rejects(async () => f.council.invite(people.head, f.project.id, { userId: people.member.id, councilRole: "reviewer", contextVersion: await f.ctx() }), coded(400), "vị trí lạ bị từ chối ở service");

  const chair = await f.candidate("chutich");
  const secretary = await f.candidate("thuky");
  const committee = await f.candidate("uyvien");
  const chairId = await f.invite(people.head, chair, "council_chair");
  const secretaryId = await f.invite(people.board, secretary, "council_secretary");
  const committeeId = await f.invite(people.head, committee, "committee_member");
  assert.ok(await db.auditLog.findFirst({ where: { action: "invite-acceptance-council-member", targetEntityId: chairId } }));
  assert.deepEqual(await notificationTypes(chair), ["acceptance-council.invited"], "người được mời ở đơn vị khác vẫn thấy lời mời");
  await assert.rejects(async () => f.invite(people.head, await f.candidate("chutich2"), "council_chair"), coded(400, "COUNCIL_POSITION_FULL"));
  await assert.rejects(() => f.invite(people.head, chair, "committee_member"), coded(400, "COUNCIL_MEMBER_INELIGIBLE"), "một người một vị trí");

  const notReady = await f.submit(people.staff).catch((error) => error);
  assert.equal(notReady.response.code, "COUNCIL_NOT_READY");
  assert.ok(notReady.response.blockers.includes("3 thành viên chưa chấp nhận lời mời."));
  assert.equal(notReady.response.notAccepted.length, 3, "trả danh sách thiếu");

  // Người được mời chỉ thấy ghế của mình, chưa đọc được hồ sơ.
  const invitation = await f.council.getCouncil(chair, f.project.id);
  assert.deepEqual([invitation.members.length, invitation.allowedActions], [1, ["acceptance-council.respond"]]);
  await assert.rejects(() => f.dossiers.getDossier(chair, f.project.id), coded(403));
  await assert.rejects(() => f.respond(chair, secretaryId, "accept"), coded(404), "không trả lời lời mời của người khác");

  await f.respond(chair, chairId, "accept");
  await assert.rejects(() => f.respond(secretary, secretaryId, "decline"), coded(400, "DECLINE_REASON_REQUIRED"));
  await f.respond(secretary, secretaryId, "decline", "Bận công tác");
  await f.respond(committee, committeeId, "accept");
  assert.equal((await f.submit(people.staff).catch((error) => error)).response.code, "COUNCIL_NOT_READY", "có người từ chối");
  await f.revoke(people.head, secretaryId, "Đã từ chối");
  assert.deepEqual(await notificationTypes(secretary), [], "người bị thu hồi không còn thấy thông báo hội đồng");
  assert.ok(await db.userNotification.findFirst({ where: { userId: people.board.id, type: "acceptance-council.declined" } }), "báo người mời khi từ chối");
  const revoked = await db.acceptanceCouncilMember.findUnique({ where: { id: secretaryId } });
  assert.deepEqual([revoked.invitationStatus, revoked.declineReason, revoked.revokeReason], ["revoked", "Bận công tác", "Đã từ chối"], "thu hồi giữ lịch sử");
  const secretary2 = await f.candidate("thuky2");
  await f.respond(secretary2, await f.invite(people.head, secretary2, "council_secretary"), "accept");

  // CV phụ trách lập tờ trình → TB rà soát → TP duyệt → BGĐ ký. PI không được trình.
  await assert.rejects(() => f.submit(people.pi), coded(403));
  await f.submit(people.staff);
  const submission = await f.pending();
  assert.equal(submission.stage, "BOARD_REVIEW");
  await assert.rejects(async () => f.invite(people.head, await f.candidate("muon"), "committee_member"), coded(400, "WORKFLOW_STATE_DENIED"), "danh sách khóa khi đang trình");
  await assert.rejects(() => f.decide(people.director, "approve"), coded(400, "APPROVAL_NOT_READY"));
  await assert.rejects(() => f.result(chair, "accepted"), coded(400, "WORKFLOW_STATE_DENIED"), "chủ tịch ghi khi hội đồng chưa ký");
  await f.toLeadership();
  for (const who of [people.head, people.staff]) await assert.rejects(() => f.decide(who, "approve"), coded(403, "APPROVAL_SIGNER_DENIED"), who.displayName);
  const joined = await db.approvedProjectMember.create({ data: { projectId: f.project.id, userId: committee.id, name: committee.displayName, role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(Date.now() - 1000), createdById: people.staff.id } });
  await assert.rejects(() => f.decide(people.science, "approve"), coded(400, "COUNCIL_MEMBER_INELIGIBLE"), "thành viên vừa vào đề tài");
  await db.approvedProjectMember.update({ where: { id: joined.id }, data: { status: "REVOKED", effectiveUntil: new Date() } });
  await f.decide(people.science, "approve");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).status, "APPROVED");
  const seats = await db.acceptanceCouncilMember.findMany({ where: { projectId: f.project.id } });
  assert.deepEqual(seats.map((row) => [row.invitationStatus, row.councilEstablishedAt !== null]).sort(), [["accepted", true], ["accepted", true], ["accepted", true], ["revoked", false]]);
  assert.ok(await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "acceptance-council.establish" } }));

  // AC2: thành viên đã nhận lời đọc hồ sơ chỉ đọc; người bị thu hồi thì không; không mở được đề tài.
  const read = await f.dossiers.getDossier(committee, f.project.id);
  assert.deepEqual([read.dossier.readOnly, read.allowedActions], [true, ["acceptance-dossier.read"]]);
  await assert.rejects(() => f.dossiers.getDossier(secretary, f.project.id), coded(403));
  await assert.rejects(() => f.projects.getProject(committee, f.project.id), coded(403));
  await assert.rejects(async () => f.dossiers.updateSection(committee, f.project.id, { section: "results", value: "x", contextVersion: await f.ctx() }), coded(403));

  // Biên bản: chỉ chủ tịch tải; thiếu biên bản hoặc nhận xét thì không ghi được.
  for (const who of [committee, people.pi]) await assert.rejects(() => f.upload(who), coded(403), who.displayName);
  const missing = await f.result(chair, "accepted", "  ").catch((error) => error);
  assert.deepEqual([missing.response.code, missing.response.missing], ["READINESS_INCOMPLETE", ["comment", "minutes"]]);
  const draftMinutes = await f.upload(chair);
  for (const who of [people.pi, committee]) await assert.rejects(async () => f.files.deleteFile(who, draftMinutes.id, await f.ctx()), coded(403), who.displayName);
  await f.files.deleteFile(chair, draftMinutes.id, await f.ctx());
  const minutes = await f.upload(chair);
  assert.equal((await f.files.downloadFile(secretary2, minutes.id)).content.toString(), "%PDF", "thành viên đọc được tệp hồ sơ");
  for (const who of [committee, secretary2, people.staff, people.head, people.pi, people.member]) await assert.rejects(() => f.result(who, "accepted"), coded(403, "ACTION_NOT_GRANTED"), who.displayName);
  const stale = await f.ctx();
  await f.upload(chair);
  await assert.rejects(() => f.council.recordResult(chair, f.project.id, { outcome: "accepted", comment: "x", contextVersion: stale }), coded(409, "CONTEXT_VERSION_MISMATCH"));

  const before = await f.reload();
  await f.result(chair, "accepted");
  const after = await f.reload();
  assert.deepEqual([after.status, after.aggregateVersion], ["accepted", before.aggregateVersion + 1]);
  const history = await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "project.acceptance.result" } });
  assert.deepEqual([history.fromStatus, history.toStatus, history.reason], ["pending_acceptance", "accepted", "Hội đồng thống nhất"]);
  const pinned = (await db.fileRecord.findMany({ where: { relatedEntityId: f.dossier.id, filePurpose: "ACCEPTANCE_MINUTES" }, orderBy: { createdAt: "desc" } }))[0];
  assert.equal(history.afterFacts.minutesFileId, pinned.id, "kết quả ghim biên bản mới nhất");
  assert.ok(await db.auditLog.findFirst({ where: { action: "record-acceptance-result", targetEntityId: f.project.id } }));
  const notified = (await db.userNotification.findMany({ where: { type: "acceptance-council.result" } })).map((row) => row.userId).sort();
  assert.deepEqual(notified, [people.pi.id, people.staff.id, committee.id, secretary2.id].sort(), "PI, CV phụ trách, thành viên hội đồng; không gửi chủ tịch");
  assert.ok((await notificationTypes(people.pi)).includes("acceptance-council.result"));
  assert.equal((await f.council.getCouncil(people.head, f.project.id)).result.outcome, "accepted");

  await assert.rejects(() => f.result(chair, "failed"), coded(400, "WORKFLOW_STATE_DENIED"), "ghi kết quả lần hai");
  await assert.rejects(async () => f.files.deleteFile(chair, pinned.id, await f.ctx()), coded(400, "WORKFLOW_STATE_DENIED"), "biên bản đã ghim");

  // AC1: đề tài vừa nghiệm thu đi tiếp qua luồng thanh lý hiện có.
  const liquidation = await f.projects.submitLiquidation(people.staff, f.project.id, { report: "Biên bản thanh lý", recoveredAmount: 0, contextVersion: await f.ctx() });
  await f.toLeadership("LIQUIDATION");
  await f.projects.decideLiquidation(people.director, f.project.id, "approve", { liquidationId: liquidation.id, contextVersion: await f.ctx() });
  assert.equal((await f.reload()).status, "closed");
});

test("6.9: CV được tick lập hội đồng; GĐ từ chối giữ danh sách; người ký là thành viên hội đồng bị chặn; chủ tịch thuộc đề tài bị chặn; ghi không đạt", async () => {
  const f = await fixture("N2", { allowedRoles: ["RESEARCH_MANAGEMENT_STAFF"], memberCount: 3 });
  const { people } = f;
  await assert.rejects(async () => f.invite(people.head, await f.candidate("x"), "council_chair"), coded(403, "COUNCIL_FORMATION_DENIED"), "TP không được tick");

  await db.approvedProject.update({ where: { id: f.project.id }, data: { status: "executing" } });
  await assert.rejects(async () => f.invite(people.staff, await f.candidate("som"), "council_chair"), coded(400, "WORKFLOW_STATE_DENIED"));
  await db.approvedProject.update({ where: { id: f.project.id }, data: { status: "pending_acceptance" } });

  const roster = await f.formCouncil(people.staff, { committee_member: people.science });
  await f.submit(people.staff);
  await f.toLeadership();
  await assert.rejects(() => f.decide(people.science, "approve"), coded(403, "APPROVAL_CONFLICT"), "người ký là thành viên hội đồng");
  await assert.rejects(() => f.decide(people.director, "reject"), coded(400, "APPROVAL_REASON_REQUIRED"));
  const rowsBefore = await db.acceptanceCouncilMember.findMany({ where: { projectId: f.project.id }, orderBy: { id: "asc" } });
  await f.decide(people.director, "reject", "Thiếu chuyên gia");
  assert.deepEqual(await db.acceptanceCouncilMember.findMany({ where: { projectId: f.project.id }, orderBy: { id: "asc" } }), rowsBefore, "từ chối giữ danh sách");
  assert.equal((await f.reload()).status, "pending_acceptance");

  // TB trả lại: danh sách giữ nguyên, hội đồng về lại giai đoạn lập (mời/thu hồi được).
  await f.submit(people.staff);
  const returned = await f.pending();
  await db.$transaction((tx) => returnApprovalSubmission(tx, people.board, returned.id, { expectedStage: returned.stage, note: "Bổ sung chuyên gia" }));
  assert.deepEqual(await db.acceptanceCouncilMember.findMany({ where: { projectId: f.project.id }, orderBy: { id: "asc" } }), rowsBefore, "trả lại giữ danh sách");
  assert.ok((await f.council.getCouncil(people.staff, f.project.id)).allowedActions.includes("acceptance-council.invite"));

  // Người lập thu hồi rồi mời người khác, trình lại.
  await f.revoke(people.staff, roster.committee_member.memberId, "Người ký không được ngồi hội đồng");
  const replacement = await f.candidate("thaythe");
  await f.respond(replacement, await f.invite(people.staff, replacement, "committee_member"), "accept");
  await f.submit(people.staff);
  await f.toLeadership();
  await f.decide(people.director, "approve");

  const chair = roster.council_chair.user;
  await f.upload(chair);
  // Chủ tịch trở thành thành viên đề tài: kiểm tra lại trong transaction thì bị chặn.
  const membership = await db.approvedProjectMember.create({ data: { projectId: f.project.id, userId: chair.id, name: chair.displayName, role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(Date.now() - 1000), createdById: people.staff.id } });
  await assert.rejects(() => f.result(chair, "failed"), coded(403, "ACTION_NOT_GRANTED"));
  await db.approvedProjectMember.update({ where: { id: membership.id }, data: { status: "REVOKED", effectiveUntil: new Date() } });

  await f.result(chair, "failed", "Chưa đạt mục tiêu");
  assert.equal((await f.reload()).status, "failed");
  assert.equal((await f.projects.getProject(people.staff, f.project.id)).liquidation.eligible, true, "mở được thanh lý");
});
