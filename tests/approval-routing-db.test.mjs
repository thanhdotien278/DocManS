import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { ApprovalRoutingService } from "../dist/apps/api/approvals/approval-routing.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { proposalContextVersion } from "../dist/apps/api/proposals-shared/proposal-mutation.js";
import { ProposalReviewAssignmentsService } from "../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js";
import { ProposalReviewsService } from "../dist/apps/api/proposal-evaluations/proposal-reviews.service.js";
import { ProposalEvaluationSummaryService } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js";
import { ProposalEvaluationCouncilService } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-council.service.js";
import { ProposalDecisionsService } from "../dist/apps/api/proposal-evaluations/proposal-decisions.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";
import { notifyUsers } from "../dist/apps/api/notifications/notification-events.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";
import { NotificationsController } from "../dist/apps/api/notifications/notifications.controller.js";
import { SessionAuthGuard } from "../dist/apps/api/auth/session-auth.guard.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { advanceApprovalSubmission, assertReadyForLeadership, closeApprovalSubmission, openApprovalSubmission, returnApprovalSubmission } from "../dist/apps/api/proposals-shared/approval-routing.js";

// Story 5.9 trên PostgreSQL thật (index duy nhất từng phần, cancel khi lập lại, transaction không ghi một phần).
let database;
let db;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("approval_routing");
  process.env.DATABASE_URL = database.url;
  db = new PrismaService();
});

after(async () => {
  await db?.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await database?.drop();
});

async function setup(code, { board = true } = {}) {
  // Chỉ một Trưởng ban đang hoạt động toàn hệ thống (index users_single_active_board_head).
  if (board) await db.user.updateMany({ where: { systemRole: "RESEARCH_BOARD_HEAD" }, data: { status: "disabled" } });
  const org = await db.organizationUnit.create({ data: { code, name: `Phòng ${code}` } });
  const make = async (username, systemRole, scoped = true) => {
    const user = await db.user.create({ data: { username: `${username}-${code}`, usernameKey: `${username}-${code}`.toLowerCase(), displayName: username, passwordHash: "x", status: "active", systemRole, unit: org.name, ...(scoped ? { organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } : {}) } });
    return { id: user.id, username: user.username, displayName: username, systemRole, unit: org.name, organizationScopes: scoped ? [{ id: org.id, code: org.code, name: org.name }] : [] };
  };
  const people = {
    staff: await make("chuyenvien", "RESEARCH_MANAGEMENT_STAFF"),
    staff2: await make("chuyenvien2", "RESEARCH_MANAGEMENT_STAFF"),
    board: board ? await make("truongban", "RESEARCH_BOARD_HEAD") : null,
    deputy: await make("phophong", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"),
    head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"),
    head2: await make("truongphong2", "RESEARCH_MANAGEMENT_HEAD"),
    director: await make("giamdoc", "LEADERSHIP_APPROVAL_AUTHORITY"),
    science: await make("pgdkh", "SCIENCE_DEPUTY_DIRECTOR"),
    pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER"),
    member: await make("thanhvien", "RESEARCHER_INTERNAL_USER"),
    oversight: await make("pgdtd", "RESEARCH_OVERSIGHT_AUTHORITY"),
    admin: await make("quantri", "SYSTEM_ADMIN")
  };
  const intake = await db.proposalIntakePeriod.create({ data: { code: `DOT-${code}`, title: "Đợt", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), requiredPackage: [] } });
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: people.pi.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, status: "under_review", submittedAt: new Date() } });
  const key = (kind) => ({ kind, subjectType: "proposal", subjectId: proposal.id });
  const open = (actor, kind = "EVALUATION_COUNCIL") => db.$transaction((tx) => openApprovalSubmission(tx, actor, key(kind), { title: proposal.title, hostOrganizationUnitId: org.id }));
  const stageOf = async (submission) => (await db.approvalSubmission.findUnique({ where: { id: submission.id } })).stage;
  const advance = async (actor, submission, stage) => { const expectedStage = stage ?? (await stageOf(submission)); return db.$transaction((tx) => advanceApprovalSubmission(tx, actor, submission.id, { expectedStage })); };
  const giveBack = async (actor, submission, note, stage) => { const expectedStage = stage ?? (await stageOf(submission)); return db.$transaction((tx) => returnApprovalSubmission(tx, actor, submission.id, { expectedStage, note })); };
  const ready = (actor, kind) => db.$transaction((tx) => assertReadyForLeadership(tx, actor, key(kind)));
  const close = (actor, kind, decision, note) => db.$transaction((tx) => closeApprovalSubmission(tx, actor, key(kind), decision, note));
  return { org, people, proposal, key, open, advance, giveBack, ready, close, routing: new ApprovalRoutingService(db) };
}

const code = (status) => ({ status });
// Cơ cấu hội đồng mặc định: 1 Chủ tịch, 2 Phản biện, 3 Ủy viên, 1 Thư ký (memberCount = 7).
const COUNCIL_ROLES = ["council_chair", "reviewer", "reviewer", "committee_member", "committee_member", "committee_member", "council_secretary"];

test("CV submission walks TB → TP → BGĐ in order; steps cannot be skipped or replayed with stale context", async () => {
  const { people, open, advance, ready, close, routing, proposal } = await setup("A");
  const submission = await open(people.staff);
  assert.equal(submission.stage, "BOARD_REVIEW");

  await assert.rejects(() => advance(people.head, submission), code(403), "TP không làm bước của TB");
  await assert.rejects(() => ready(people.director, "EVALUATION_COUNCIL"), /Chờ Trưởng ban QLKH/, "BGĐ không ký khi chưa tới");
  await assert.rejects(() => advance(people.board, submission, "HEAD_REVIEW"), code(409), "context cũ");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).stage, "BOARD_REVIEW", "không ghi một phần");

  await advance(people.board, submission);
  await assert.rejects(() => advance(people.board, submission, "BOARD_REVIEW"), code(409), "bấm lại bước cũ");
  await assert.rejects(() => advance(people.board, submission), code(403), "TB không duyệt bước của TP");
  await advance(people.head, submission);
  await assert.rejects(() => advance(people.head, submission), code(403), "không có bước sau LEADERSHIP");

  assert.ok(await ready(people.science, "EVALUATION_COUNCIL"), "PGĐ-KH ký được hội đồng");
  await close(people.science, "EVALUATION_COUNCIL", "APPROVED");
  const closed = await db.approvalSubmission.findUnique({ where: { id: submission.id }, include: { steps: { orderBy: { createdAt: "asc" } } } });
  assert.equal(closed.status, "APPROVED");
  assert.deepEqual(closed.steps.map((step) => step.action), ["SUBMIT", "FORWARD", "APPROVE", "APPROVE"]);

  const view = await routing.forSubject(people.staff, "proposal", proposal.id);
  assert.equal(view.submissions[0].statusLabel, "Đã phê duyệt");
  assert.deepEqual(view.submissions[0].actions, { advance: false, return: false });
  const audit = await db.auditLog.findFirst({ where: { action: "forward-approval-submission", targetEntityId: submission.id } });
  assert.deepEqual([audit.actorId, audit.beforeFacts.stage, audit.afterFacts.stage, audit.afterFacts.kind], [people.board.id, "BOARD_REVIEW", "HEAD_REVIEW", "EVALUATION_COUNCIL"]);
});

test("TB-authored goes to TP; TP-authored still goes through TB; nobody reviews their own", async () => {
  const { people, open, advance, routing, proposal } = await setup("B");
  const byBoard = await open(people.board, "IRB_COUNCIL");
  assert.equal(byBoard.stage, "HEAD_REVIEW");
  await assert.rejects(() => advance(people.board, byBoard), code(403));
  await advance(people.head, byBoard);
  await assert.rejects(() => advance(people.head, byBoard), code(403), "đã ở LEADERSHIP, TP không còn bước");

  const byHead = await open(people.head, "IRB_CERTIFICATE");
  assert.equal(byHead.stage, "BOARD_REVIEW");
  await advance(people.board, byHead);
  const forwarded = await db.approvalSubmission.findUnique({ where: { id: byHead.id }, include: { steps: { orderBy: { createdAt: "asc" } } } });
  assert.equal(forwarded.stage, "LEADERSHIP", "TP lập thì TB chuyển thẳng BGĐ, không kẹt ở HEAD_REVIEW");
  assert.deepEqual(forwarded.steps.map((step) => [step.stage, step.action]), [["BOARD_REVIEW", "SUBMIT"], ["BOARD_REVIEW", "FORWARD"]]);
  for (const actor of [people.head, people.head2]) await assert.rejects(() => advance(actor, byHead), code(403), "TP không có action trên tờ trình này");
  assert.deepEqual((await routing.forSubject(people.head, "proposal", proposal.id)).submissions.find((item) => item.id === byHead.id).actions, { advance: false, return: false });
});

test("only CV/TB/TP author; PP, PGĐ-KH, GĐ, PI have no action; unit scope does not restrict", async () => {
  const a = await setup("C");
  const b = await setup("D", { board: false });
  for (const actor of [a.people.deputy, a.people.science, a.people.director, a.people.pi]) {
    await assert.rejects(() => a.open(actor), code(403));
  }
  const submission = await a.open(a.people.staff);
  for (const actor of [a.people.staff, a.people.deputy, a.people.science, a.people.director, a.people.pi, b.people.head]) {
    await assert.rejects(() => a.advance(actor, submission), code(403));
    await assert.rejects(() => a.giveBack(actor, submission, "lý do"), code(403));
  }
  assert.deepEqual((await a.routing.forSubject(a.people.board, "proposal", a.proposal.id)).submissions[0].actions, { advance: true, return: true });
  await assert.rejects(() => a.routing.forSubject(a.people.pi, "proposal", a.proposal.id), code(403));
  // Đơn vị chưa có vai trò: TP đơn vị khác vẫn xem được tờ trình.
  assert.equal((await b.routing.forSubject(b.people.head, "proposal", a.proposal.id)).submissions[0].id, submission.id);
});

test("re-opening cancels the pending submission; the DB allows only one PENDING per kind and subject", async () => {
  const { people, open, key, org, proposal } = await setup("E");
  const first = await open(people.staff);
  const second = await open(people.staff);
  const cancelled = await db.approvalSubmission.findUnique({ where: { id: first.id } });
  assert.deepEqual([cancelled.status, cancelled.stage], ["CANCELLED", "CLOSED"]);
  assert.equal(second.status, "PENDING");
  assert.ok(await db.auditLog.findFirst({ where: { action: "cancel-approval-submission", targetEntityId: first.id } }));
  await assert.rejects(() => db.approvalSubmission.create({ data: { ...key("EVALUATION_COUNCIL"), title: "x", hostOrganizationUnitId: org.id, stage: "BOARD_REVIEW", signer: "DIRECTOR_OR_SCIENCE_DEPUTY", submittedById: people.staff.id, authorRole: "RESEARCH_MANAGEMENT_STAFF" } }), /Unique|unique/);
  await open(people.staff, "DECISION_PACKAGE");
  assert.equal(await db.approvalSubmission.count({ where: { subjectId: proposal.id, status: "PENDING" } }), 2, "khác loại thì song song");
});

test("return needs a reason and unwinds DECISION_PACKAGE; REJECT is for the right signer at LEADERSHIP; DIRECTOR kinds exclude PGĐ-KH", async () => {
  const { people, proposal, open, advance, giveBack, ready, close } = await setup("F");
  await db.researchProposal.update({ where: { id: proposal.id }, data: { status: "ready_for_approval" } });
  const submission = await open(people.staff, "DECISION_PACKAGE");
  assert.equal(submission.signer, "DIRECTOR");
  await assert.rejects(() => giveBack(people.board, submission, "  "), code(400));
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).status, "PENDING");
  await giveBack(people.board, submission, "Thiếu biên bản");
  const returned = await db.approvalSubmission.findUnique({ where: { id: submission.id } });
  assert.deepEqual([returned.status, returned.lastNote], ["RETURNED", "Thiếu biên bản"]);
  assert.equal((await db.researchProposal.findUnique({ where: { id: proposal.id } })).status, "under_review");
  await assert.rejects(() => ready(people.director, "DECISION_PACKAGE"), /Chưa có tờ trình đang chờ/);

  await db.researchProposal.update({ where: { id: proposal.id }, data: { status: "ready_for_approval" } });
  const again = await open(people.staff, "DECISION_PACKAGE");
  await advance(people.board, again);
  await advance(people.head, again);
  await assert.rejects(() => ready(people.science, "DECISION_PACKAGE"), /Giám đốc ký/);
  await assert.rejects(() => close(people.director, "DECISION_PACKAGE", "REJECTED", ""), code(400), "từ chối cần lý do");
  await close(people.director, "DECISION_PACKAGE", "REJECTED", "Không đủ kinh phí");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: again.id } })).status, "REJECTED");
});

test("a signer who participates in the proposal is refused", async () => {
  const { people, proposal, org, open, advance, ready } = await setup("G");
  const submission = await open(people.staff, "DECISION_PACKAGE");
  await advance(people.board, submission);
  await advance(people.head, submission);
  await db.proposalMember.create({ data: { proposalId: proposal.id, userId: people.director.id, name: "GĐ", role: "TOPIC_MEMBER", organization: org.name } });
  await assert.rejects(() => ready(people.director, "DECISION_PACKAGE"), code(403));
});

// Story 5.10: GĐ quyết định đề tài và kinh phí chỉ qua tờ trình DECISION_PACKAGE đang ở LEADERSHIP.
async function decisionFixture(code) {
  const ctx = await setup(code);
  const { people, proposal, org } = ctx;
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: { members: [], attachments: [], requiredPackage: [] } } });
  await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.staff.id, fromStatus: "submitted", toStatus: "submitted", submittedAt: new Date(Date.now() + 1000), snapshot: { kind: "completeness_check", submissionEventId: event.id, readiness: { ready: true } } } });
  const assignmentIds = [];
  const reviewIds = [];
  for (const [index, role] of COUNCIL_ROLES.entries()) {
    const user = await db.user.create({ data: { username: `rv${index}-${code}`, usernameKey: `rv${index}-${code}`.toLowerCase(), displayName: `RV${index}`, passwordHash: "x", status: "active", systemRole: "RESEARCHER_INTERNAL_USER", unit: org.name } });
    const assignment = await db.proposalReviewAssignment.create({ data: { proposalId: proposal.id, reviewerUserId: user.id, assignmentRole: role, status: "completed", invitationStatus: "accepted", councilEstablishedAt: new Date(), assignedById: people.head.id, reviewedSubmissionEventId: event.id } });
    assignmentIds.push(assignment.id);
    if (role === "council_secretary") continue; // thư ký không chấm phiếu
    const review = await db.proposalReview.create({ data: { proposalId: proposal.id, assignmentId: assignment.id, reviewerUserId: user.id, status: "submitted", totalScore: 80, submissionEventId: event.id } });
    reviewIds.push(review.id);
  }
  await db.proposalEvaluationSummary.create({ data: { proposalId: proposal.id, summary: "Tổng hợp", recommendation: "approve", status: "ready_for_approval", createdById: people.head.id, updatedById: people.head.id, revision: 1, evidenceSnapshot: { lifecycle: "finalized", submissionEventId: event.id, assignmentIds, reviewIds } } });
  await db.researchProposal.update({ where: { id: proposal.id }, data: { status: "ready_for_approval" } });
  const submission = await ctx.open(people.staff, "DECISION_PACKAGE");
  const toLeadership = async () => { await ctx.advance(people.board, submission); await ctx.advance(people.head, submission); };
  const decisions = () => {
    const audit = new AuditLogService(db);
    const participation = new ProposalParticipationService(db);
    const access = new ProposalReviewAccessService(db);
    const assignments = new ProposalReviewAssignmentsService(db, audit, participation, access);
    const reviews = new ProposalReviewsService(db, audit, access, participation);
    return new ProposalDecisionsService(db, audit, participation, access, assignments, reviews, new ProposalEvaluationSummaryService(db, audit, assignments, reviews, participation, access));
  };
  const decide = async (actor, decision, note) => decisions().decide(actor, proposal.id, decision, { contextVersion: proposalContextVersion(await db.researchProposal.findUnique({ where: { id: proposal.id } })), packageRevision: 1, note });
  const snapshot = async () => ({ proposal: (await db.researchProposal.findUnique({ where: { id: proposal.id } })).status, decisions: await db.proposalDecision.count({ where: { proposalId: proposal.id } }), submission: (await db.approvalSubmission.findUnique({ where: { id: submission.id } })).status });
  return { ...ctx, org, submission, toLeadership, decide, snapshot, decisions };
}

test("decision: only GĐ at LEADERSHIP decides; before that, PGĐ-KH, conflicted signer and reject without reason are refused without writes", async () => {
  const f = await decisionFixture("H");
  const { people } = f;
  const untouched = { proposal: "ready_for_approval", decisions: 0, submission: "PENDING" };
  await assert.rejects(() => f.decide(people.director, "approved"), (e) => e.getResponse().code === "APPROVAL_NOT_READY", "tờ trình mới ở BOARD_REVIEW");
  await assert.rejects(() => f.decisions().getDecisionPackage(people.director, f.proposal.id), (e) => e.getResponse().code === "APPROVAL_NOT_READY", "gói chưa mở cho GĐ");
  await f.toLeadership();
  for (const actor of [people.science, people.deputy, people.head, people.board, people.staff]) await assert.rejects(() => f.decide(actor, "approved"), code(403));
  await assert.rejects(() => f.decide(people.director, "rejected", "  "), code(400), "từ chối cần lý do");
  const pack = await f.decisions().getDecisionPackage(people.director, f.proposal.id);
  assert.deepEqual([pack.canDecide, pack.approval.stage], [true, "LEADERSHIP"]);
  await db.proposalMember.create({ data: { proposalId: f.proposal.id, userId: people.director.id, name: "GĐ", role: "TOPIC_MEMBER", organization: f.org.name } });
  await assert.rejects(() => f.decide(people.director, "approved"), code(403), "xung đột");
  assert.deepEqual(await f.snapshot(), untouched);
});

test("decision: approve closes the tờ trình with the decision atomically; a failing close rolls the decision back; concurrent decisions leave one winner", async () => {
  const f = await decisionFixture("I");
  await f.toLeadership();
  // Story 5.7/5.8: gói có danh sách tệp (metadata), thành viên đang hiệu lực nhận thông báo, PI chỉ thấy projection công bố.
  await db.proposalMember.create({ data: { proposalId: f.proposal.id, userId: f.people.member.id, name: "Thư ký", role: "TOPIC_SECRETARY", participationRole: "TOPIC_SECRETARY", organization: f.org.name } });
  await db.proposalMember.create({ data: { proposalId: f.proposal.id, userId: f.people.staff2.id, name: "Đã rời", role: "TOPIC_MEMBER", organization: f.org.name, status: "ENDED", effectiveUntil: new Date(Date.now() - 1000) } });
  // Trigger DB khóa tệp của hồ sơ đã nộp, nên đưa tạm về nháp để gắn tệp rồi trả lại trạng thái chờ phê duyệt.
  await db.researchProposal.update({ where: { id: f.proposal.id }, data: { status: "draft" } });
  const file = await db.fileRecord.create({ data: { relatedEntityType: "research_proposal", relatedEntityId: f.proposal.id, filePurpose: "proposal-form", documentType: "proposal-form", originalFileName: "tm.pdf", mimeType: "application/pdf", sizeBytes: 10, storageBucket: "b", storageObjectKey: "secret/key", uploadedById: f.people.pi.id } });
  await db.researchProposal.update({ where: { id: f.proposal.id }, data: { status: "ready_for_approval" } });
  const pack = await f.decisions().getDecisionPackage(f.people.director, f.proposal.id);
  assert.deepEqual(pack.attachments.map((item) => [item.id, item.fileName, item.version]), [[file.id, "tm.pdf", 1]]);
  assert.ok(!JSON.stringify(pack.attachments).includes("secret/key"), "không lộ đường dẫn lưu trữ");
  const proposals = new ResearchProposalsService(db, new AuditLogService(db), new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
  assert.equal((await proposals.getProposal(f.people.pi, f.proposal.id)).publishedDecision, null, "chưa quyết định thì chưa công bố");
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_close() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'close blocked'; END $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe(`CREATE TRIGGER fail_close BEFORE UPDATE ON approval_submissions FOR EACH ROW WHEN (NEW.stage = 'CLOSED') EXECUTE FUNCTION fail_close()`);
  await assert.rejects(() => f.decide(f.people.director, "approved"));
  assert.deepEqual(await f.snapshot(), { proposal: "ready_for_approval", decisions: 0, submission: "PENDING" }, "đóng tờ trình lỗi thì quyết định cũng rollback");
  assert.equal(await db.userNotification.count({ where: { sourceId: { in: [f.proposal.id, f.submission.id] }, type: { in: ["proposal.decided", "approval.approved", "approval.rejected"] } } }), 0, "rollback không để lại thông báo ma");
  await db.$executeRawUnsafe(`DROP TRIGGER fail_close ON approval_submissions`);
  await db.$executeRawUnsafe(`DROP FUNCTION fail_close()`);

  const published = { publicSummary: "Đề tài đủ điều kiện", requiredFollowUp: "Hoàn thiện dự toán" };
  const decideWith = async (decision, note) => f.decisions().decide(f.people.director, f.proposal.id, decision, { contextVersion: proposalContextVersion(await db.researchProposal.findUnique({ where: { id: f.proposal.id } })), packageRevision: 1, note, ...published });
  const results = await Promise.allSettled([decideWith("approved", "Ghi chú nội bộ"), decideWith("rejected", "Không đủ kinh phí")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1, "đúng một quyết định thắng");
  const after = await f.snapshot();
  assert.equal(after.decisions, 1);
  assert.deepEqual([after.proposal, after.submission], after.proposal === "approved" ? ["approved", "APPROVED"] : ["rejected", "REJECTED"], "trạng thái hồ sơ khớp tờ trình");
  await assert.rejects(() => f.decide(f.people.director, "approved"), code(400), "không quyết định lần hai");
  // Story 11.1: PI nhận đúng một thông báo trạng thái chung, không lộ reviewer hay ghi chú quyết định (AD-11).
  const piRows = await db.userNotification.findMany({ where: { userId: f.people.pi.id } });
  assert.deepEqual(piRows.map((row) => [row.type, row.sourceId]), [["proposal.decided", f.proposal.id]]);
  assert.ok(!/RV\d|Không đủ kinh phí/.test(`${piRows[0].title} ${piRows[0].body}`));
  assert.equal(await db.userNotification.count({ where: { userId: f.people.member.id, type: "proposal.decided", sourceId: f.proposal.id } }), 1, "thư ký đề tài nhận thông báo");
  assert.equal(await db.userNotification.count({ where: { userId: f.people.staff2.id, type: "proposal.decided" } }), 0, "thành viên đã kết thúc không nhận");
  assert.equal(await db.userNotification.count({ where: { userId: f.people.director.id, type: "proposal.decided" } }), 0, "GĐ không tự nhận");
  const shown = (await proposals.getProposal(f.people.pi, f.proposal.id)).publishedDecision;
  assert.deepEqual(shown, { schemaVersion: "PublishedReviewSummaryV1", decision: after.proposal, decisionLabel: after.proposal === "approved" ? "Phê duyệt" : "Không phê duyệt", decidedAt: shown.decidedAt, ...published });
  assert.ok(!/Ghi chú nội bộ|Không đủ kinh phí|giamdoc/.test(JSON.stringify(shown)), "không lộ ghi chú nội bộ hay người quyết định");
});

// Story 5.11 + 5.10 (EVALUATION_COUNCIL): mời/chấp nhận/từ chối, hội đồng do BGĐ ký, hồ sơ chỉ mở sau khi ký.
async function councilFixture(code) {
  const ctx = await setup(code);
  const { people, proposal, org } = ctx;
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: { members: [], attachments: [], requiredPackage: [] } } });
  await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.staff.id, fromStatus: "submitted", toStatus: "submitted", submittedAt: new Date(Date.now() + 1000), snapshot: { kind: "completeness_check", submissionEventId: event.id, readiness: { ready: true } } } });
  await db.proposalManagementOfficer.create({ data: { proposalId: proposal.id, officerUserId: people.staff.id, assignedById: people.head.id, effectiveFrom: new Date(Date.now() - 1000) } });
  const withProfile = (user) => db.researcherProfile.create({ data: { managementOrganizationUnitId: org.id, linkedUserId: user.id, fullName: user.displayName, fullNameKey: user.displayName.toLowerCase(), createdById: people.head.id, updatedById: people.head.id } });
  let counter = 0;
  const candidate = async (name, systemRole = "RESEARCHER_INTERNAL_USER", profile = true) => {
    const username = `${name}${counter++}-${code}`;
    const user = await db.user.create({ data: { username, usernameKey: username.toLowerCase(), displayName: name, passwordHash: "x", status: "active", systemRole, unit: org.name } });
    if (profile) await withProfile(user);
    return { id: user.id, username, displayName: name, systemRole, unit: org.name, organizationScopes: [] };
  };
  const audit = new AuditLogService(db);
  const participation = new ProposalParticipationService(db);
  const access = new ProposalReviewAccessService(db);
  const assignments = new ProposalReviewAssignmentsService(db, audit, participation, access);
  const council = new ProposalEvaluationCouncilService(db, audit, participation, access);
  const reviews = new ProposalReviewsService(db, audit, access, participation);
  const contextVersion = async () => proposalContextVersion(await db.researchProposal.findUnique({ where: { id: proposal.id } }));
  const invite = async (actor, user, assignmentRole = "reviewer") => (await assignments.assignReviewer(actor, proposal.id, { reviewerUserId: user.id, assignmentRole, contextVersion: await contextVersion() })).id;
  const respond = (user, assignmentId, decision, reason) => assignments.respondToInvitation(user, proposal.id, assignmentId, { decision, reason });
  const submitCouncil = async (actor) => council.submitCouncil(actor, proposal.id, { contextVersion: await contextVersion() });
  const decideCouncil = async (actor, decision, note) => council.decideCouncil(actor, proposal.id, { decision, note, contextVersion: await contextVersion() });
  const roster = async () => {
    const members = [];
    for (const [index, role] of COUNCIL_ROLES.entries()) {
      const user = await candidate(`tv${index}`);
      members.push({ user, role, id: await invite(people.head, user, role) });
    }
    return members;
  };
  const summary = new ProposalEvaluationSummaryService(db, audit, assignments, reviews, participation, access);
  // Từ lời mời tới hội đồng đã thành lập: CV lập, TB chuyển, TP duyệt, PGĐ-KH ký.
  const establish = async () => {
    const members = await roster();
    for (const member of members) await respond(member.user, member.id, "accept");
    const submission = { id: (await submitCouncil(people.staff)).submissionId };
    await ctx.advance(people.board, submission);
    await ctx.advance(people.head, submission);
    await decideCouncil(people.science, "sign");
    return members;
  };
  return { ...ctx, candidate, withProfile, assignments, council, reviews, summary, invite, respond, submitCouncil, decideCouncil, roster, establish, contextVersion };
}

test("5.11: with the default config only TP/TB invite; CV invites only after QT enables it and only when in charge; QT, self, accounts without a profile and participants are never candidates", async () => {
  const f = await councilFixture("J");
  const { people } = f;
  const [qt, noProfile, peer] = [await f.candidate("quantri", "SYSTEM_ADMIN"), await f.candidate("khonglyli", "RESEARCHER_INTERNAL_USER", false), await f.candidate("nguoimoi")];
  for (const user of [people.head, people.pi, people.science, people.board, people.staff]) await f.withProfile(user);
  const search = async (actor, position) => (await f.assignments.candidates(actor, f.proposal.id, "", position)).users.map((user) => user.id);
  const found = await search(people.head);
  assert.ok(found.includes(peer.id) && found.includes(people.science.id), "PGĐ-KH có lý lịch được mời");
  for (const excluded of [qt, noProfile, people.head, people.pi]) assert.ok(!found.includes(excluded.id));
  assert.ok(!found.includes(people.board.id), "TB duy nhất không xung đột không được mời (ROUTING_ACTOR_UNAVAILABLE)");
  assert.deepEqual(Object.keys((await f.assignments.candidates(people.head, f.proposal.id, "nguoimoi")).users[0]).sort(), ["displayName", "id", "username"]);

  await assert.rejects(() => f.invite(people.head, qt), code(400));
  await assert.rejects(() => f.invite(people.head, people.head), (e) => e.getResponse().code === "SELF_ASSIGNMENT_DENIED", "tự phân công bị chặn");
  await assert.rejects(() => f.invite(people.head, people.board), (e) => e.getResponse().code === "ROUTING_ACTOR_UNAVAILABLE", "TB duy nhất");
  await assert.rejects(() => f.invite(people.head, people.pi), (e) => e.getResponse().reasonCode === "participation", "chủ nhiệm");
  await assert.rejects(() => f.invite(people.head, people.staff), (e) => e.getResponse().reasonCode === "management_officer", "CV phụ trách");
  for (const actor of [people.deputy, people.director, people.science, people.pi, people.staff2, qt]) {
    await assert.rejects(() => search(actor), code(403));
    await assert.rejects(() => f.invite(actor, peer), (e) => e.getResponse().code === "COUNCIL_FORMATION_DENIED", "PP, BGĐ, QT, PI và CV bị từ chối theo cấu hình mặc định");
  }
  // CV phụ trách bị từ chối với cấu hình mặc định (D-035), được phép sau khi QT tích CV; CV không phụ trách vẫn bị từ chối.
  await assert.rejects(() => f.invite(people.staff, peer), (e) => e.getResponse().code === "COUNCIL_FORMATION_DENIED");
  const staffRole = { allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_STAFF"], memberCount: 7 };
  await db.systemParameter.create({ data: { key: "council_formation.EVALUATION", value: JSON.stringify(staffRole), label: "Hội đồng đánh giá" } });
  await assert.rejects(() => f.invite(people.staff2, peer), (e) => e.getResponse().code === "COUNCIL_FORMATION_DENIED", "CV không phụ trách");
  await f.invite(people.staff, peer, "council_chair");
  await f.invite(people.board, await f.candidate("nguoimoi2"), "committee_member");
  await assert.rejects(() => f.invite(people.head, peer, "council_chair"), (e) => e.getResponse().code === "DUPLICATE_OR_OVERLAPPING_ASSIGNMENT");
  await assert.rejects(() => f.invite(people.head, peer, "reviewer"), (e) => e.getResponse().code === "INCOMPATIBLE_COUNCIL_POSITION");
  const extraChair = await f.candidate("chutich2");
  await assert.rejects(() => f.invite(people.head, extraChair, "council_chair"), (e) => e.getResponse().code === "COUNCIL_POSITION_FULL");
  assert.equal(await db.proposalReviewAssignment.count({ where: { proposalId: f.proposal.id, invitationStatus: "invited" } }), 2);
  assert.ok(await db.auditLog.findFirst({ where: { action: "assign-reviewer", result: "failure", targetEntityId: f.proposal.id, reason: { contains: "INCOMPATIBLE_COUNCIL_POSITION" } } }), "từ chối có audit kèm reasonCode");
  await db.systemParameter.delete({ where: { key: "council_formation.EVALUATION" } });
});

test("5.11: invitee sees only title, role, due date and inviter until accepting; decline needs a reason; nobody else can answer", async () => {
  const f = await councilFixture("K");
  const { people } = f;
  const user = await f.candidate("duocmoi");
  const other = await f.candidate("nguoikhac");
  const id = await f.invite(people.head, user);
  assert.deepEqual(Object.keys((await f.assignments.listMyAssignments(user))[0]).sort(), ["access", "assignmentRole", "assignmentRoleLabel", "assignedByDisplayName", "dueDate", "id", "invitationStatus", "invitationStatusLabel", "proposal", "proposalId"].sort());
  assert.deepEqual(Object.keys((await f.assignments.listMyAssignments(user))[0].proposal), ["title"]);
  await assert.rejects(() => f.assignments.getReviewPackage(user, f.proposal.id), code(403), "chưa chấp nhận");
  await assert.rejects(() => f.respond(user, id, "decline", "  "), (e) => e.getResponse().code === "DECLINE_REASON_REQUIRED");
  await assert.rejects(() => f.respond(other, id, "accept"), code(404), "chỉ người được mời mới trả lời");
  assert.equal((await db.proposalReviewAssignment.findUnique({ where: { id } })).invitationStatus, "invited", "không ghi một phần");

  await f.respond(user, id, "accept");
  await assert.rejects(() => f.respond(user, id, "accept"), code(400), "không trả lời lần hai");
  await assert.rejects(() => f.assignments.getReviewPackage(user, f.proposal.id), code(403), "đã chấp nhận nhưng hội đồng chưa được ký");
  assert.equal((await f.assignments.listMyAssignments(user))[0].access, "preview");
  assert.ok(await db.auditLog.findFirst({ where: { action: "accept-review-invitation", targetEntityId: id, actorId: user.id } }));

  const declined = await f.candidate("tuchoi");
  const declinedId = await f.invite(people.head, declined);
  await f.respond(declined, declinedId, "decline", "Bận công tác");
  const row = await db.proposalReviewAssignment.findUnique({ where: { id: declinedId } });
  assert.deepEqual([row.invitationStatus, row.declineReason], ["declined", "Bận công tác"]);
  const declinedRows = await f.assignments.listMyAssignments(declined);
  assert.deepEqual(declinedRows.map((r) => [r.access, r.invitationStatus, r.invitationStatusLabel]), [["preview", "declined", "Đã từ chối"]]);
  await assert.rejects(() => f.assignments.getReviewPackage(declined, f.proposal.id), code(403), "lời mời đã từ chối không mở quyền đọc");
  assert.ok(await db.auditLog.findFirst({ where: { action: "decline-review-invitation", targetEntityId: declinedId } }));
});

test("5.10 council: tờ trình refused until the structure is complete and everyone accepted; PGĐ-KH signing opens the file for accepted members only", async () => {
  const f = await councilFixture("L");
  const { people, proposal } = f;
  const members = await f.roster();
  const refused = (e) => e.getResponse().code === "COUNCIL_NOT_READY";
  await assert.rejects(() => f.submitCouncil(people.head), (e) => refused(e) && e.getResponse().blockers.includes("7 thành viên chưa chấp nhận lời mời."), "còn thành viên chưa chấp nhận");
  const last = members[5];
  for (const member of members.filter((item) => item !== last)) await f.respond(member.user, member.id, "accept");
  await f.respond(last.user, last.id, "decline", "Xung đột chuyên môn");
  await assert.rejects(() => f.submitCouncil(people.staff), refused, "có thành viên đã từ chối");
  assert.equal(await db.approvalSubmission.count({ where: { subjectId: proposal.id, kind: "EVALUATION_COUNCIL" } }), 0);
  assert.equal((await f.council.getCouncil(people.head, proposal.id)).status, "FORMING");

  await f.assignments.revokeAssignment(people.head, proposal.id, last.id, { reason: "Đã từ chối", contextVersion: await f.contextVersion() });
  await assert.rejects(() => f.submitCouncil(people.staff), (e) => refused(e) && e.getResponse().blockers.includes("Cần 3 Ủy viên (hiện 2)."), "thiếu một ủy viên so với cơ cấu");
  const replacement = await f.candidate("thaythe");
  const replacementId = await f.invite(people.head, replacement, "committee_member");
  await f.respond(replacement, replacementId, "accept");
  assert.equal((await f.council.getCouncil(people.head, proposal.id)).status, "READY_TO_SUBMIT");
  const submission = { id: (await f.submitCouncil(people.staff)).submissionId };
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).stage, "BOARD_REVIEW");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).subjectRef, (await f.council.getCouncil(people.head, proposal.id)).roundId, "tờ trình gắn theo vòng");
  const late = await f.candidate("muon");
  await assert.rejects(() => f.invite(people.head, late), (e) => e.getResponse().code === "COUNCIL_SUBMISSION_PENDING", "đang trình thì không đổi danh sách");
  await assert.rejects(async () => f.assignments.revokeAssignment(people.head, proposal.id, replacementId, { reason: "Đổi ý", contextVersion: await f.contextVersion() }), (e) => e.getResponse().code === "COUNCIL_SUBMISSION_PENDING");
  assert.equal((await f.council.getCouncil(people.head, proposal.id)).status, "IN_APPROVAL");
  await assert.rejects(() => f.decideCouncil(people.science, "sign"), (e) => e.getResponse().code === "APPROVAL_NOT_READY", "chưa tới BGĐ");
  await f.advance(people.board, submission);
  await f.advance(people.head, submission);

  const reviewer = members[1].user;
  for (const actor of [people.staff, people.head, people.board, people.pi]) await assert.rejects(() => f.decideCouncil(actor, "sign"), code(403));
  await assert.rejects(() => f.assignments.getReviewPackage(reviewer, proposal.id), code(403), "đọc hồ sơ trước khi ký bị chặn");
  const stale = await f.contextVersion();
  await assert.rejects(() => f.reviews.saveMyReview(reviewer, proposal.id, { contextVersion: stale }), code(403), "nộp đánh giá trước khi ký bị chặn");
  const view = await f.council.getCouncil(people.science, proposal.id);
  assert.deepEqual([view.viewer.canSign, view.viewer.canReturn, view.members.length, view.status], [true, true, 7, "IN_APPROVAL"]);

  await f.decideCouncil(people.science, "sign");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).status, "APPROVED");
  const established = await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id, status: "assigned", councilEstablishedAt: { not: null } } });
  assert.equal(established.length, 7);
  assert.equal((await f.assignments.getReviewPackage(reviewer, proposal.id)).assignmentRole, "reviewer", "đã chấp nhận và hội đồng đã ký");
  const outsider = await f.candidate("nguoingoai");
  await assert.rejects(() => f.assignments.getReviewPackage(outsider, proposal.id), code(403));
  const audit = await db.auditLog.findFirst({ where: { action: "establish-evaluation-council", targetEntityId: proposal.id } });
  assert.equal(audit.actorId, people.science.id);
  assert.equal(JSON.parse(audit.reason).supplement, false);
  assert.equal((await f.council.getCouncil(people.science, proposal.id)).status, "ESTABLISHED");
});

test("5.10 council: the secretary reads anonymous reviews and drafts the summary but never scores; readiness does not wait for the secretary", async () => {
  const f = await councilFixture("N");
  const { people, proposal } = f;
  const members = await f.establish();
  const secretary = members.find((member) => member.role === "council_secretary").user;
  const scoring = members.filter((member) => member.role !== "council_secretary");
  const scores = { scoreData: { "scientific-value": 25, feasibility: 20, "practical-impact": 20, "budget-suitability": 15 }, comment: "Nhận xét", recommendation: "approve" };

  await assert.rejects(() => f.reviews.getMyReview(secretary, proposal.id), (e) => e.getResponse().code === "SECRETARY_CANNOT_SCORE");
  await assert.rejects(async () => f.reviews.submitMyReview(secretary, proposal.id, { ...scores, contextVersion: await f.contextVersion() }), (e) => e.getResponse().code === "SECRETARY_CANNOT_SCORE");
  assert.ok(await f.assignments.getReviewPackage(secretary, proposal.id), "thư ký đọc được hồ sơ sau khi ký");
  assert.equal((await f.assignments.listMyAssignments(secretary))[0].scoring, false);
  const empty = await f.council.getSecretaryReviews(secretary, proposal.id);
  assert.deepEqual([empty.reviews.length, empty.progress.scoringMemberCount, empty.progress.pendingCount], [0, 6, 6]);
  await assert.rejects(() => f.council.getSecretaryReviews(scoring[0].user, proposal.id), (e) => e.getResponse().code === "COUNCIL_SECRETARY_ONLY");

  for (const member of scoring.slice(0, 5)) await f.reviews.submitMyReview(member.user, proposal.id, { ...scores, contextVersion: await f.contextVersion() });
  await f.summary.saveEvaluationSummary(secretary, proposal.id, { summary: "Dự thảo biên bản", recommendation: "approve", contextVersion: await f.contextVersion() });
  const audit = await db.auditLog.findFirst({ where: { action: "draft-evaluation-summary", actorId: secretary.id } });
  assert.equal(JSON.parse(audit.reason).actorPosition, "council_secretary");
  // 5.6: trigger DB chỉ nhận thêm tệp hành chính đánh giá khi under_review; hồ sơ đã nộp vẫn bất biến.
  const adminFile = (filePurpose) => db.fileRecord.create({ data: { relatedEntityType: "research_proposal", relatedEntityId: proposal.id, filePurpose, documentType: filePurpose, originalFileName: "bb.pdf", mimeType: "application/pdf", sizeBytes: 10, storageBucket: "b", storageObjectKey: `k/${filePurpose}`, uploadedById: secretary.id } });
  const contextBefore = (await db.researchProposal.findUnique({ where: { id: proposal.id } })).authorizationContextUpdatedAt;
  const minutes = await adminFile("COUNCIL_MINUTES");
  await adminFile("MEETING_MATERIAL");
  assert.deepEqual((await db.researchProposal.findUnique({ where: { id: proposal.id } })).authorizationContextUpdatedAt, contextBefore, "tệp hành chính không làm form đang mở bị lệch context");
  await assert.rejects(() => adminFile("proposal-form"), /immutable/);
  await assert.rejects(() => db.fileRecord.update({ where: { id: minutes.id }, data: { description: "sửa" } }), /immutable/);
  for (const method of ["finalizeEvaluationSummary", "submitCompletedPackage"]) {
    await assert.rejects(async () => f.summary[method](secretary, proposal.id, { contextVersion: await f.contextVersion() }), (e) => e.getResponse().code === "SECRETARY_CANNOT_FINALIZE");
  }

  const partial = await f.council.getSecretaryReviews(secretary, proposal.id);
  assert.deepEqual(partial.reviews.map((review) => review.label), ["Phiếu 1", "Phiếu 2", "Phiếu 3", "Phiếu 4", "Phiếu 5"]);
  assert.deepEqual(Object.keys(partial.reviews[0]).sort(), ["comment", "label", "maxTotalScore", "recommendation", "recommendationLabel", "scoreData", "submittedAt", "totalScore"]);
  assert.deepEqual(partial.progress, { scoringMemberCount: 6, submittedCount: 5, pendingCount: 1, averageTotalScore: 80 });
  assert.equal(partial.evaluationSummary.status, "draft");
  await assert.rejects(async () => f.summary.finalizeEvaluationSummary(people.head, proposal.id, { contextVersion: await f.contextVersion() }), /Còn 1 phiếu chưa gửi/);

  await f.reviews.submitMyReview(scoring[5].user, proposal.id, { ...scores, contextVersion: await f.contextVersion() });
  await f.summary.saveEvaluationSummary(people.head, proposal.id, { summary: "Tổng hợp", recommendation: "approve", contextVersion: await f.contextVersion() });
  const finalized = await f.summary.finalizeEvaluationSummary(people.head, proposal.id, { contextVersion: await f.contextVersion() });
  assert.equal(finalized.evaluationSummary.status, "finalized", "đủ 6 phiếu chấm là chốt được, không chờ thư ký");
});

test("5.3: revoking a member who already submitted ends their access at once and keeps the submitted review", async () => {
  const f = await councilFixture("R");
  const { people, proposal } = f;
  const member = (await f.establish()).find((item) => item.role === "reviewer");
  const scores = { scoreData: { "scientific-value": 25, feasibility: 20, "practical-impact": 20, "budget-suitability": 15 }, comment: "Nhận xét", recommendation: "approve" };
  await f.reviews.submitMyReview(member.user, proposal.id, { ...scores, contextVersion: await f.contextVersion() });

  await f.assignments.revokeAssignment(people.head, proposal.id, member.id, { reason: "Thay người", contextVersion: await f.contextVersion() });
  await assert.rejects(() => f.assignments.getReviewPackage(member.user, proposal.id));
  await assert.rejects(() => f.reviews.getMyReview(member.user, proposal.id));
  assert.equal((await f.assignments.listMyAssignments(member.user)).length, 0);
  assert.equal((await db.proposalReview.count({ where: { assignmentId: member.id, status: "submitted" } })), 1, "phiếu đã gửi được giữ sau thu hồi");
});

test("5.10 council: return changes nothing at the source; signer who reviews the file is refused; sign re-checks acceptance", async () => {
  const f = await councilFixture("M");
  const { people, proposal } = f;
  const members = await f.roster();
  for (const member of members) await f.respond(member.user, member.id, "accept");
  const first = await f.submitCouncil(people.head);
  assert.equal(first.stage, "BOARD_REVIEW");
  await f.advance(people.board, { id: first.submissionId });
  const stage = (await db.approvalSubmission.findUnique({ where: { id: first.submissionId } })).stage;
  assert.equal(stage, "LEADERSHIP", "TP lập: TB chuyển thẳng BGĐ");

  await assert.rejects(() => f.decideCouncil(people.director, "return", " "), code(400), "trả lại cần lý do");
  const before = await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id }, orderBy: { id: "asc" } });
  await f.decideCouncil(people.director, "return", "Thiếu chuyên gia");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: first.submissionId } })).status, "RETURNED");
  assert.deepEqual(await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id }, orderBy: { id: "asc" } }), before, "trả lại không đổi danh sách");
  assert.equal((await db.researchProposal.findUnique({ where: { id: proposal.id } })).status, "under_review");

  const second = await f.submitCouncil(people.staff);
  await f.advance(people.board, { id: second.submissionId });
  await f.advance(people.head, { id: second.submissionId });
  await db.proposalReviewAssignment.update({ where: { id: members[2].id }, data: { invitationStatus: "declined", declineReason: "Rút lui" } });
  await assert.rejects(() => f.decideCouncil(people.science, "sign"), (e) => e.getResponse().code === "COUNCIL_NOT_READY", "thành viên đổi ý trước khi ký");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: second.submissionId } })).status, "PENDING");
  await db.proposalReviewAssignment.update({ where: { id: members[2].id }, data: { invitationStatus: "accepted" } });
  await db.proposalMember.create({ data: { proposalId: proposal.id, userId: people.science.id, name: "PGĐ", role: "TOPIC_MEMBER", organization: "x" } });
  await assert.rejects(() => f.decideCouncil(people.science, "sign"), code(403), "người ký tham gia hồ sơ");
  assert.equal(await db.proposalReviewAssignment.count({ where: { proposalId: proposal.id, councilEstablishedAt: { not: null } } }), 0);
});

// Story 6.11/6.12: điều chỉnh, gia hạn, kinh phí và thanh lý đề tài đi qua tờ trình, trên PostgreSQL thật.
async function projectFixture(code, status = "executing") {
  const ctx = await setup(code);
  const { people, proposal, org } = ctx;
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: {} } });
  const decision = await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: people.head.id, fromStatus: "under_review", toStatus: "approved" } });
  const project = await db.approvedProject.create({ data: { proposalId: proposal.id, sourceSubmissionEventId: event.id, sourceDecisionId: decision.id, hostOrganizationUnitId: org.id, title: "Đề tài", scopeSnapshot: { title: "Đề tài", summary: "S", budgetMetadata: { total: 1000 } }, planSnapshot: { endDate: "2030-01-01T00:00:00.000Z" }, status, startDate: new Date("2026-01-01"), endDate: new Date("2030-01-01"), createdById: people.staff.id } });
  const since = new Date(Date.now() - 86400000);
  for (const [user, role] of [[people.pi, "TOPIC_PI"], [people.member, "TOPIC_MEMBER"]]) await db.approvedProjectMember.create({ data: { projectId: project.id, userId: user.id, name: user.displayName, role, participationRole: role, status: "ACTIVE", effectiveFrom: since, createdById: people.staff.id } });
  await db.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: people.staff.id, assignedById: people.head.id, status: "ACTIVE", effectiveFrom: since, assignmentContextVersion: {} } });
  const service = new ApprovedProjectsService(db, new AuditLogService(db));
  const ctxVersion = async () => projectContextVersion(await db.approvedProject.findUnique({ where: { id: project.id } }));
  const reload = () => db.approvedProject.findUnique({ where: { id: project.id } });
  const pending = (kind) => db.approvalSubmission.findFirst({ where: { kind, subjectType: "project", subjectId: project.id }, orderBy: { createdAt: "desc" } });
  const request = async (type, proposedValues, appraise = true) => {
    const draft = await service[type === "extension" ? "createExtension" : "createAdjustment"](people.pi, project.id, { proposedValues, reason: "Lý do", contextVersion: await ctxVersion() });
    await service.submitRequest(people.pi, project.id, type, { requestId: draft.id, contextVersion: await ctxVersion() });
    if (type === "extension") await service.validateExtension(people.staff, project.id, { requestId: draft.id, contextVersion: await ctxVersion() });
    else await service.reviewAdjustment(people.staff, project.id, { requestId: draft.id, contextVersion: await ctxVersion() });
    if (appraise) await service.prepareRequest(people.staff, project.id, type, { requestId: draft.id, note: "Đủ căn cứ", contextVersion: await ctxVersion() });
    return draft.id;
  };
  const sign = async (actor, type, id, decision = "approve", reason) => service.decideRequest(actor, project.id, type, decision, { requestId: id, reason, contextVersion: await ctxVersion() });
  const toLeadership = async (kind) => { const row = await pending(kind); await ctx.advance(people.board, row); await ctx.advance(people.head, row); return row; };
  return { ...ctx, project, service, ctxVersion, reload, pending, request, sign, toLeadership, status: async (id) => (await db.projectRequest.findUnique({ where: { id } })).status };
}

test("6.11: CV appraises and opens a tờ trình that changes nothing; only GĐ/PGĐ-KH at LEADERSHIP sign, and the signature applies the change atomically", async () => {
  const f = await projectFixture("P1");
  const { people } = f;
  const id = await f.request("extension", { requestedEndDate: "2030-06-01" });
  assert.equal(await f.status(id), "ready_for_head_decision");
  assert.equal((await f.reload()).endDate.toISOString().slice(0, 10), "2030-01-01", "thẩm định không đổi đề tài");
  const submission = await f.pending("PROJECT_EXTENSION");
  assert.deepEqual([submission.stage, submission.subjectRef, submission.submittedById], ["BOARD_REVIEW", id, people.staff.id]);

  await assert.rejects(() => f.sign(people.director, "extension", id), code(400), "chưa tới BGĐ");
  for (const who of [people.staff, people.head, people.board, people.oversight, people.pi, people.member, people.admin]) await assert.rejects(() => f.sign(who, "extension", id), code(403));
  await f.toLeadership("PROJECT_EXTENSION");
  for (const who of [people.staff, people.head, people.board, people.oversight, people.admin]) await assert.rejects(() => f.sign(who, "extension", id), (error) => error.response?.code === "ACTION_NOT_GRANTED", "CV/TP/TB/PGĐ-TD/QT không ký");
  assert.equal((await f.reload()).endDate.toISOString().slice(0, 10), "2030-01-01");

  await db.approvedProjectMember.create({ data: { projectId: f.project.id, userId: people.science.id, name: "PGĐ-KH", role: "TOPIC_MEMBER", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(Date.now() - 1000), createdById: people.staff.id } });
  await assert.rejects(() => f.sign(people.science, "extension", id), code(403), "người ký có xung đột");
  await db.approvedProjectMember.deleteMany({ where: { userId: people.science.id } });

  await f.sign(people.science, "extension", id);
  const project = await f.reload();
  assert.equal(project.endDate.toISOString().slice(0, 10), "2030-06-01");
  assert.equal(project.planSnapshot.endDate, "2030-06-01T00:00:00.000Z");
  assert.equal(project.aggregateVersion, 1);
  assert.equal(await f.status(id), "approved");
  assert.deepEqual([(await f.pending("PROJECT_EXTENSION")).status, (await f.pending("PROJECT_EXTENSION")).stage], ["APPROVED", "CLOSED"]);
  const history = await db.projectHistory.findFirst({ where: { projectId: project.id, action: "project.extension.approve" } });
  assert.equal(history.actorId, people.science.id);
  assert.equal(history.beforeFacts.endDate, "2030-01-01T00:00:00.000Z");

  const adjustment = await f.request("adjustment", { scope: { summary: "Mới" } });
  await f.toLeadership("PROJECT_ADJUSTMENT");
  await f.sign(people.director, "adjustment", adjustment);
  assert.equal((await f.reload()).scopeSnapshot.summary, "Mới");
  assert.equal((await f.reload()).scopeSnapshot.budgetMetadata.total, 1000, "thay đổi chỉ chạm khóa được duyệt");
});

test("6.11: a tờ trình returned by TB/TP sends the request back to CV; PI withdrawing cancels the open tờ trình", async () => {
  const f = await projectFixture("P2");
  const { people } = f;
  const id = await f.request("adjustment", { scope: { summary: "Mới" } });
  const first = await f.pending("PROJECT_ADJUSTMENT");
  await f.advance(people.board, first);
  await f.giveBack(people.head, first, "Thiếu căn cứ");
  assert.equal(await f.status(id), "under_staff_review");
  assert.equal((await db.projectRequest.findUnique({ where: { id } })).preparedAt, null);
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: first.id } })).status, "RETURNED");
  assert.ok(await db.projectRequestHistory.findFirst({ where: { requestId: id, action: "project.adjustment.return", reason: "Thiếu căn cứ" } }));
  await assert.rejects(() => f.sign(people.director, "adjustment", id), code(400));

  await f.service.prepareRequest(people.staff, f.project.id, "adjustment", { requestId: id, note: "Đã bổ sung", contextVersion: await f.ctxVersion() });
  const second = await f.pending("PROJECT_ADJUSTMENT");
  assert.notEqual(second.id, first.id);
  assert.equal(second.status, "PENDING");
  await f.service.withdrawRequest(people.pi, f.project.id, "adjustment", { requestId: id, reason: "Không còn cần", contextVersion: await f.ctxVersion() });
  const cancelled = await db.approvalSubmission.findUnique({ where: { id: second.id }, include: { steps: true } });
  assert.deepEqual([cancelled.status, cancelled.stage], ["CANCELLED", "CLOSED"]);
  assert.ok(cancelled.steps.some((step) => step.action === "CANCEL" && step.actorId === people.pi.id));
  assert.equal(await f.status(id), "withdrawn");
  const view = await f.service.getProject(people.pi, f.project.id);
  assert.equal(view.requests[0].status, "withdrawn");
});

test("6.12: funding metadata is versioned and audited; only GĐ/TP/TB/assigned CV write; PGĐ-TD sees no per-project funding anywhere", async () => {
  const f = await projectFixture("P3");
  const { people, service } = f;
  const write = (actor, extra = {}) => service.recordFunding(actor, f.project.id, { kind: "GRANT", amount: 500000000, recordedOn: "2026-03-01", note: "Đợt 1", ...extra });
  const granted = await write(people.director);
  assert.equal(granted.version, 1);
  for (const who of [people.head, people.board, people.staff]) await write(who, { kind: "DISBURSEMENT", amount: 100 });
  for (const who of [people.science, people.oversight, people.deputy, people.admin, people.pi, people.member]) await assert.rejects(() => write(who), (error) => error.response?.code === "ACTION_NOT_GRANTED", who.displayName);
  await assert.rejects(() => write(people.staff2), (error) => error.response?.code === "ACTION_NOT_GRANTED", "CV không phụ trách");

  const fixed = await write(people.head, { entryId: granted.entryId, amount: 450000000, note: "Điều chỉnh số liệu" });
  assert.equal(fixed.version, 2);
  assert.equal((await db.projectFundingRecord.count({ where: { entryId: granted.entryId } })), 2, "bản cũ được giữ");
  const audit = await db.auditLog.findFirst({ where: { action: "record-project-funding", targetEntityId: f.project.id }, orderBy: { timestamp: "desc" } });
  assert.equal(audit.actorId, people.head.id);
  assert.equal(audit.beforeFacts.version, 1);
  const history = await db.projectHistory.findFirst({ where: { projectId: f.project.id, action: "project.funding.record" }, orderBy: { createdAt: "desc" } });
  assert.equal(history.afterFacts.version, 2);

  for (const who of [people.director, people.science, people.head, people.board, people.staff, people.pi, people.member]) {
    const funding = await service.getFunding(who, f.project.id);
    assert.equal(funding.restricted, false, who.displayName);
    assert.equal(funding.records.find((row) => row.entryId === granted.entryId).amount, "450000000", "bản mới nhất");
  }
  await assert.rejects(() => service.getFunding(people.staff2, f.project.id), code(403));
  assert.deepEqual(await service.getFunding(people.oversight, f.project.id), { restricted: true, records: [], totals: null, canWrite: false });
  assert.equal((await service.fundingSummary(people.oversight)).totals.GRANT, 450000000);

  const detail = await service.getProject(people.oversight, f.project.id);
  assert.equal(detail.scope.budgetMetadata, undefined, "chi tiết đề tài không lộ kinh phí");
  assert.equal((await service.listProjects(people.oversight)).every((row) => row.scope?.budgetMetadata === undefined), true);
  assert.equal((await service.getProject(people.director, f.project.id)).scope.budgetMetadata.total, 1000);
});

test("6.13.2: giải ngân không vượt kinh phí cấp, quyết toán không vượt giải ngân, sửa phiên bản cũng bị kiểm tra", async () => {
  const f = await projectFixture("F2");
  const { people, service } = f;
  const write = (kind, amount, extra = {}) => service.recordFunding(people.head, f.project.id, { kind, amount, recordedOn: "2026-03-01", ...extra });
  const invalid = (error) => error.response?.code === "FUNDING_INVALID";
  const grant = await write("GRANT", 500);
  await assert.rejects(() => write("DISBURSEMENT", 501), invalid, "giải ngân vượt cấp");
  await write("DISBURSEMENT", 300);
  await assert.rejects(() => write("SETTLEMENT", 301), invalid, "quyết toán vượt giải ngân");
  await write("SETTLEMENT", 300);
  await assert.rejects(() => write("GRANT", 200, { entryId: grant.entryId }), invalid, "hạ kinh phí cấp xuống dưới đã giải ngân");
  await assert.rejects(() => write("GRANT", -1), invalid);
  await assert.rejects(() => write("GRANT", 10_000_000_000_001), invalid);
  assert.deepEqual((await service.getFunding(people.head, f.project.id)).totals, { GRANT: 500, DISBURSEMENT: 300, SETTLEMENT: 300 });
});

test("6.13.1: tạo đề tài từ đề xuất có kinh phí duyệt → GRANT v1 tự động; approvedAmount ưu tiên; 0 thì không tạo", async () => {
  const ctx = await setup("F1");
  const { people, proposal } = ctx;
  const service = new ApprovedProjectsService(db, new AuditLogService(db));
  const makeApproved = async (prop, budgetMetadata) => {
    await db.researchProposal.update({ where: { id: prop.id }, data: { status: "approved", budgetMetadata } });
    await db.proposalManagementOfficer.create({ data: { proposalId: prop.id, officerUserId: people.staff.id, assignedById: people.head.id, effectiveFrom: new Date(Date.now() - 1000) } });
    const event = await db.proposalSubmissionEvent.create({ data: { proposalId: prop.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: { id: prop.id, ownerId: people.pi.id, members: [], title: prop.title, budgetMetadata: { amount: budgetMetadata.amount } } } });
    await db.proposalDecision.create({ data: { proposalId: prop.id, decision: "approved", decidedById: people.director.id, fromStatus: "under_review", toStatus: "approved", packageSnapshot: { submissionEventId: event.id } } });
  };
  const create = async (prop) => service.createFromApprovedProposal(people.staff, prop.id, { contextVersion: proposalContextVersion(await db.researchProposal.findUnique({ where: { id: prop.id } })) });
  await makeApproved(proposal, { amount: 500, approvedAmount: 450 });
  const created = await create(proposal);
  const grants = await db.projectFundingRecord.findMany({ where: { projectId: created.id } });
  assert.deepEqual(grants.map((r) => [r.kind, String(r.amount), r.version, r.note]), [["GRANT", "450", 1, "Kinh phí được phê duyệt"]]);
  assert.equal((await db.approvedProject.findUnique({ where: { id: created.id } })).scopeSnapshot.budgetMetadata.approvedAmount, 450, "snapshot phạm vi ghi số đã duyệt");

  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = await db.researchProposal.findUnique({ where: { id: proposal.id } });
  const second = await db.researchProposal.create({ data: { ...rest, title: "Đề xuất không kinh phí" } });
  await makeApproved(second, { amount: 0 });
  const zero = await create(second);
  assert.equal(await db.projectFundingRecord.count({ where: { projectId: zero.id } }), 0);
});

test("6.12: CV submits LIQUIDATION only for an Accepted/Failed project; GĐ alone signs and the project closes atomically; PGĐ-KH is refused; return goes back to draft", async () => {
  const f = await projectFixture("P4", "executing");
  const { people, service } = f;
  const liquidate = async () => service.submitLiquidation(people.staff, f.project.id, { report: "Biên bản thanh lý", contextVersion: await f.ctxVersion() });
  await assert.rejects(liquidate, code(400), "đề tài đang thực hiện chưa thanh lý được");
  await assert.rejects(async () => service.submitLiquidation(people.head, f.project.id, { report: "x", contextVersion: await f.ctxVersion() }), code(403));

  await db.approvedProject.update({ where: { id: f.project.id }, data: { status: "failed" } });
  const liquidation = await liquidate();
  const row = await f.pending("LIQUIDATION");
  assert.deepEqual([row.stage, row.signer, row.subjectRef, liquidation.outcome], ["BOARD_REVIEW", "DIRECTOR", liquidation.id, "failed"]);
  assert.equal((await db.userNotification.findFirst({ where: { userId: people.board.id, sourceId: row.id } })).link, `/projects/${f.project.id}`, "tờ trình đề tài dẫn tới trang đề tài");
  await assert.rejects(liquidate, code(409), "chỉ một biên bản đang trình");

  await f.advance(people.board, row);
  await f.giveBack(people.head, row, "Thiếu biên bản quyết toán");
  assert.equal((await db.projectLiquidation.findUnique({ where: { id: liquidation.id } })).status, "DRAFT");
  await liquidate();
  const resubmitted = await f.pending("LIQUIDATION");
  assert.equal(resubmitted.status, "PENDING");
  await f.toLeadership("LIQUIDATION");

  const decide = async (actor, decision, reason) => service.decideLiquidation(actor, f.project.id, decision, { liquidationId: liquidation.id, reason, contextVersion: await f.ctxVersion() });
  for (const who of [people.science, people.head, people.board, people.staff, people.oversight, people.pi]) await assert.rejects(() => decide(who, "approve"), code(403), who.displayName);
  assert.equal((await f.reload()).status, "failed");
  await decide(people.director, "approve");
  const closed = await f.reload();
  assert.equal(closed.status, "closed", "Failed vẫn được đóng (D-034)");
  assert.equal((await db.projectLiquidation.findUnique({ where: { id: liquidation.id } })).status, "SIGNED");
  assert.equal((await f.pending("LIQUIDATION")).status, "APPROVED");
  const history = await db.projectHistory.findFirst({ where: { projectId: closed.id, action: "project.liquidation.approve" } });
  assert.deepEqual([history.fromStatus, history.toStatus, history.actorId], ["failed", "closed", people.director.id]);
});

test("11.1: thông báo theo nơi tờ trình đến, không cho PP/PGĐ-TD/người làm/tác giả/người xung đột; idempotent; mất quyền thì biến mất", async () => {
  const f = await councilFixture("Q");
  const { people, proposal, org } = f;
  const participation = new ProposalParticipationService(db);
  const access = new ProposalReviewAccessService(db);
  const officers = new ProposalManagementOfficerService(db);
  const inbox = new NotificationsService(db, participation, access, officers);
  const got = (user, sourceId) => db.userNotification.count({ where: { userId: user.id, sourceId } });
  const visible = async (user) => (await inbox.list(user, 200)).notifications;
  const watchers = [people.deputy, people.oversight, people.admin, people.pi, people.member];
  // GĐ thứ hai là thành viên đề tài: xung đột, không nhận tờ trình.
  const conflicted = await db.user.create({ data: { username: "gd-xungdot-Q", usernameKey: "gd-xungdot-q", displayName: "GĐ xung đột", passwordHash: "x", status: "active", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY", unit: org.name } });
  await db.proposalMember.create({ data: { proposalId: proposal.id, userId: conflicted.id, name: "GĐ xung đột", role: "TOPIC_MEMBER", organization: org.name } });

  // Mời phản biện: reviewer thấy ngay khi còn "invited"; thu hồi thì biến mất. PI không thấy gì về reviewer.
  const reviewer = await f.candidate("phanbien");
  const assignmentId = await f.invite(people.head, reviewer);
  const [invite] = await visible(reviewer);
  assert.deepEqual([invite.type, invite.link], ["review.invited", "/my-reviews"]);
  assert.equal((await inbox.list(reviewer, 10)).unreadCount, 1);
  const piRows = await db.userNotification.findMany({ where: { userId: people.pi.id } });
  assert.ok(piRows.every((row) => row.sourceType !== "review_assignment" && !`${row.title} ${row.body}`.includes(reviewer.displayName)), "PI không nhận gì lộ reviewer");
  await f.assignments.revokeAssignment(people.head, proposal.id, assignmentId, { reason: "Đổi người", contextVersion: await f.contextVersion() });
  assert.deepEqual([(await visible(reviewer)).length, (await inbox.list(reviewer, 10)).unreadCount], [0, 0], "lời mời bị thu hồi không còn trong list/count");

  // TP giao CV: CV được giao nhận; thu hồi phụ trách thì thông báo biến mất.
  const proposals = new ResearchProposalsService(db, new AuditLogService(db), participation, access, officers);
  await proposals.assignManagementOfficer(people.head, proposal.id, { officerUserId: people.staff2.id, reason: "Giao lại", contextVersion: await f.contextVersion() });
  assert.deepEqual((await visible(people.staff2)).map((item) => [item.type, item.link]), [["proposal.officer-assigned", `/proposals/${proposal.id}`]]);
  await proposals.revokeManagementOfficer(people.head, proposal.id, { reason: "Thu hồi", contextVersion: await f.contextVersion() });
  assert.equal((await visible(people.staff2)).length, 0, "CV bị thu hồi phụ trách");
  assert.equal(await got(people.staff2, proposal.id), 1, "bản ghi vẫn còn, chỉ bị lọc khi đọc");

  // CV lập hội đồng (người ký GĐ hoặc PGĐ-KH): TB → hai TP → GĐ + PGĐ-KH; xong thì tác giả.
  const council = await f.open(people.staff);
  assert.equal(await got(people.board, council.id), 1);
  for (const who of [...watchers, people.staff, people.head, people.director]) assert.equal(await got(who, council.id), 0, who.displayName);
  await f.advance(people.board, council);
  for (const who of [people.head, people.head2]) assert.equal(await got(who, council.id), 1, who.displayName);
  assert.equal(await got(people.board, council.id), 1, "người làm không nhận thêm");
  await f.advance(people.head, council);
  for (const who of [people.director, people.science]) assert.equal(await got(who, council.id), 1, who.displayName);
  assert.equal(await got(people.head2, council.id), 1, "TP2 không nhận bước BGĐ");
  assert.equal(await got(conflicted, council.id), 0, "người ký xung đột bị loại");
  const stale = await db.userNotification.findFirst({ where: { userId: people.head2.id, sourceId: council.id, type: "approval.action-required" } });
  assert.ok(stale.readAt, "TP1 đã duyệt thì việc chờ của TP2 không còn chưa đọc");
  await f.close(people.science, "EVALUATION_COUNCIL", "APPROVED");
  assert.deepEqual((await db.userNotification.findMany({ where: { userId: people.staff.id, sourceId: council.id } })).map((row) => row.type), ["approval.approved"]);
  for (const who of watchers) assert.equal(await got(who, council.id), 0, who.displayName);

  // DECISION_PACKAGE chỉ GĐ ký: PGĐ-KH không nhận; từ chối về tác giả, không chép lý do.
  const pkg = await f.open(people.staff, "DECISION_PACKAGE");
  await f.advance(people.board, pkg);
  await f.advance(people.head, pkg);
  assert.deepEqual([await got(people.director, pkg.id), await got(people.science, pkg.id)], [1, 0]);
  // Người nhận trở thành người tham gia hồ sơ: thông báo tờ trình bị lọc khi đọc, count giảm theo.
  const directorBefore = await inbox.list(people.director, 200);
  assert.ok(directorBefore.notifications.some((item) => item.link === `/proposals/${proposal.id}` && !item.readAt));
  const membership = await db.proposalMember.create({ data: { proposalId: proposal.id, userId: people.director.id, name: "GĐ", role: "TOPIC_MEMBER", organization: org.name } });
  const directorAfter = await inbox.list(people.director, 200);
  assert.equal(directorAfter.notifications.filter((item) => item.link === `/proposals/${proposal.id}`).length, 0);
  assert.ok(directorAfter.unreadCount < directorBefore.unreadCount);
  await db.proposalMember.delete({ where: { id: membership.id } });
  await f.close(people.director, "DECISION_PACKAGE", "REJECTED", "Lý do mật về kinh phí");

  // Trả lại: tác giả nhận, không có lý do trong nội dung. Lập lại (CANCEL) không thông báo bước hủy.
  const irb = await f.open(people.staff, "IRB_COUNCIL");
  await f.giveBack(people.board, irb, "Thiếu biên bản nội bộ");
  assert.equal(await got(people.staff, irb.id), 1);
  const replaced = await f.open(people.staff, "IRB_CERTIFICATE");
  await f.open(people.staff, "IRB_CERTIFICATE");
  assert.equal(await db.userNotification.count({ where: { idempotencyKey: { contains: ":CANCEL:" } } }), 0);
  assert.equal(await got(people.board, replaced.id), 1, "chỉ bước SUBMIT của tờ trình bị thay");
  const staffRows = await db.userNotification.findMany({ where: { userId: people.staff.id } });
  assert.deepEqual(staffRows.map((row) => row.type).sort(), ["approval.approved", "approval.rejected", "approval.returned"]);
  assert.ok(staffRows.every((row) => !/Lý do mật|Thiếu biên bản/.test(`${row.title} ${row.body}`)), "không chép note/lý do");
  for (const who of [people.deputy, people.oversight]) assert.equal(await db.userNotification.count({ where: { userId: who.id } }), 0, who.displayName);

  // Ghi lặp cùng khóa: một bản ghi. Tài khoản không active bị bỏ qua.
  const event = { userIds: [people.head.id, people.member.id], type: "test", title: "t", body: "b", sourceType: "proposal", sourceId: proposal.id, idempotencyKey: `test:${proposal.id}` };
  await db.user.update({ where: { id: people.member.id }, data: { status: "disabled" } });
  assert.equal(await notifyUsers(db, event), 1);
  assert.equal(await notifyUsers(db, event), 0);
  assert.equal(await db.userNotification.count({ where: { idempotencyKey: event.idempotencyKey } }), 1);

  // Đánh dấu đọc: của người khác → 404; của mình thì count giảm.
  const mine = (await visible(people.board)).find((item) => !item.readAt);
  await assert.rejects(() => inbox.markRead(people.head, mine.id), code(404));
  const before = (await inbox.list(people.board, 10)).unreadCount;
  await inbox.markRead(people.board, mine.id);
  assert.equal((await inbox.list(people.board, 10)).unreadCount, before - 1);
  await inbox.markAllRead(people.board);
  assert.equal((await inbox.list(people.board, 10)).unreadCount, 0);

  // Chưa đăng nhập → 401: controller gắn SessionAuthGuard.
  assert.ok((Reflect.getMetadata("__guards__", NotificationsController) ?? []).includes(SessionAuthGuard));
});

