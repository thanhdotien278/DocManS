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
import { ProposalDecisionsService } from "../dist/apps/api/proposal-evaluations/proposal-decisions.service.js";
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
    board: board ? await make("truongban", "RESEARCH_BOARD_HEAD") : null,
    deputy: await make("phophong", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"),
    head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"),
    head2: await make("truongphong2", "RESEARCH_MANAGEMENT_HEAD"),
    director: await make("giamdoc", "LEADERSHIP_APPROVAL_AUTHORITY"),
    science: await make("pgdkh", "SCIENCE_DEPUTY_DIRECTOR"),
    pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER")
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

test("only CV/TB/TP in scope author; PP, PGĐ-KH, GĐ, PI and out-of-scope staff have no action", async () => {
  const a = await setup("C");
  const b = await setup("D", { board: false });
  for (const actor of [a.people.deputy, a.people.science, a.people.director, a.people.pi, b.people.staff]) {
    await assert.rejects(() => a.open(actor), code(403));
  }
  const submission = await a.open(a.people.staff);
  for (const actor of [a.people.staff, a.people.deputy, a.people.science, a.people.director, a.people.pi, b.people.head]) {
    await assert.rejects(() => a.advance(actor, submission), code(403));
    await assert.rejects(() => a.giveBack(actor, submission, "lý do"), code(403));
  }
  assert.deepEqual((await a.routing.forSubject(a.people.board, "proposal", a.proposal.id)).submissions[0].actions, { advance: true, return: true });
  await assert.rejects(() => a.routing.forSubject(a.people.pi, "proposal", a.proposal.id), code(403));
  await assert.rejects(() => b.routing.forSubject(b.people.head, "proposal", a.proposal.id), code(403), "ngoài scope không xem");
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
  for (const [index, role] of ["reviewer", "reviewer", "committee_member", "committee_member", "committee_member"].entries()) {
    const user = await db.user.create({ data: { username: `rv${index}-${code}`, usernameKey: `rv${index}-${code}`.toLowerCase(), displayName: `RV${index}`, passwordHash: "x", status: "active", systemRole: "RESEARCHER_INTERNAL_USER", unit: org.name } });
    const assignment = await db.proposalReviewAssignment.create({ data: { proposalId: proposal.id, reviewerUserId: user.id, assignmentRole: role, status: "completed", assignedById: people.head.id, reviewedSubmissionEventId: event.id } });
    const review = await db.proposalReview.create({ data: { proposalId: proposal.id, assignmentId: assignment.id, reviewerUserId: user.id, status: "submitted", totalScore: 80, submissionEventId: event.id } });
    assignmentIds.push(assignment.id);
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
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_close() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'close blocked'; END $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe(`CREATE TRIGGER fail_close BEFORE UPDATE ON approval_submissions FOR EACH ROW WHEN (NEW.stage = 'CLOSED') EXECUTE FUNCTION fail_close()`);
  await assert.rejects(() => f.decide(f.people.director, "approved"));
  assert.deepEqual(await f.snapshot(), { proposal: "ready_for_approval", decisions: 0, submission: "PENDING" }, "đóng tờ trình lỗi thì quyết định cũng rollback");
  await db.$executeRawUnsafe(`DROP TRIGGER fail_close ON approval_submissions`);
  await db.$executeRawUnsafe(`DROP FUNCTION fail_close()`);

  const results = await Promise.allSettled([f.decide(f.people.director, "approved"), f.decide(f.people.director, "rejected", "Không đủ kinh phí")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1, "đúng một quyết định thắng");
  const after = await f.snapshot();
  assert.equal(after.decisions, 1);
  assert.deepEqual([after.proposal, after.submission], after.proposal === "approved" ? ["approved", "APPROVED"] : ["rejected", "REJECTED"], "trạng thái hồ sơ khớp tờ trình");
  await assert.rejects(() => f.decide(f.people.director, "approved"), code(400), "không quyết định lần hai");
});
