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
    for (const [index, role] of ["reviewer", "reviewer", "committee_member", "committee_member", "committee_member"].entries()) {
      const user = await candidate(`tv${index}`);
      members.push({ user, role, id: await invite(people.head, user, role) });
    }
    return members;
  };
  return { ...ctx, candidate, withProfile, assignments, council, reviews, invite, respond, submitCouncil, decideCouncil, roster, contextVersion };
}

test("5.11: only TP/TB/CV in charge invite; QT, self, accounts without a profile and participants are never candidates", async () => {
  const f = await councilFixture("J");
  const { people } = f;
  const [qt, noProfile, peer] = [await f.candidate("quantri", "SYSTEM_ADMIN"), await f.candidate("khonglyli", "RESEARCHER_INTERNAL_USER", false), await f.candidate("nguoimoi")];
  for (const user of [people.head, people.pi, people.science]) await f.withProfile(user);
  const search = async (actor) => (await f.assignments.candidates(actor, f.proposal.id, "")).users.map((user) => user.id);
  const found = await search(people.head);
  assert.ok(found.includes(peer.id) && found.includes(people.science.id), "PGĐ-KH có lý lịch được mời");
  for (const excluded of [qt, noProfile, people.head, people.pi]) assert.ok(!found.includes(excluded.id));
  assert.deepEqual(Object.keys((await f.assignments.candidates(people.head, f.proposal.id, "nguoimoi")).users[0]).sort(), ["displayName", "id", "username"]);

  await assert.rejects(() => f.invite(people.head, qt), code(400));
  await assert.rejects(() => f.invite(people.head, people.head), (e) => e.getResponse().code === "SELF_ASSIGNMENT_DENIED", "tự phân công bị chặn");
  for (const actor of [people.deputy, people.director, people.science, people.pi, people.staff2, qt]) {
    await assert.rejects(() => search(actor), code(403));
    await assert.rejects(() => f.invite(actor, peer), code(403), "PP, BGĐ, QT, PI và CV không phụ trách bị từ chối");
  }
  await f.invite(people.staff, peer);
  await f.invite(people.board, await f.candidate("nguoimoi2"), "committee_member");
  await assert.rejects(() => f.invite(people.head, peer), code(400), "đã được mời");
  assert.equal(await db.proposalReviewAssignment.count({ where: { proposalId: f.proposal.id, invitationStatus: "invited" } }), 2);
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
  assert.deepEqual(await f.assignments.listMyAssignments(declined), []);
  assert.ok(await db.auditLog.findFirst({ where: { action: "decline-review-invitation", targetEntityId: declinedId } }));
});

test("5.10 council: tờ trình refused while anyone has not accepted or has declined; PGĐ-KH signing opens the file for accepted members only", async () => {
  const f = await councilFixture("L");
  const { people, proposal } = f;
  const members = await f.roster();
  const refused = (e) => e.getResponse().code === "COUNCIL_NOT_READY";
  await assert.rejects(() => f.submitCouncil(people.head), refused, "còn thành viên chưa chấp nhận");
  for (const member of members.slice(0, 4)) await f.respond(member.user, member.id, "accept");
  const last = members[4];
  await f.respond(last.user, last.id, "decline", "Xung đột chuyên môn");
  await assert.rejects(() => f.submitCouncil(people.staff), refused, "có thành viên đã từ chối");
  assert.equal(await db.approvalSubmission.count({ where: { subjectId: proposal.id, kind: "EVALUATION_COUNCIL" } }), 0);

  await f.assignments.revokeAssignment(people.head, proposal.id, last.id, { reason: "Đã từ chối", contextVersion: await f.contextVersion() });
  const replacement = await f.candidate("thaythe");
  const replacementId = await f.invite(people.head, replacement, "committee_member");
  await f.respond(replacement, replacementId, "accept");
  const submission = { id: (await f.submitCouncil(people.staff)).submissionId };
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).stage, "BOARD_REVIEW");
  const late = await f.candidate("muon");
  await assert.rejects(() => f.invite(people.head, late), (e) => e.getResponse().code === "COUNCIL_SUBMISSION_PENDING", "đang trình thì không đổi danh sách");
  await assert.rejects(() => f.decideCouncil(people.science, "sign"), (e) => e.getResponse().code === "APPROVAL_NOT_READY", "chưa tới BGĐ");
  await f.advance(people.board, submission);
  await f.advance(people.head, submission);

  const reviewer = members[0].user;
  for (const actor of [people.staff, people.head, people.board, people.pi]) await assert.rejects(() => f.decideCouncil(actor, "sign"), code(403));
  await assert.rejects(() => f.assignments.getReviewPackage(reviewer, proposal.id), code(403), "đọc hồ sơ trước khi ký bị chặn");
  const stale = await f.contextVersion();
  await assert.rejects(() => f.reviews.saveMyReview(reviewer, proposal.id, { contextVersion: stale }), code(403), "nộp đánh giá trước khi ký bị chặn");
  const view = await f.council.getCouncil(people.science, proposal.id);
  assert.deepEqual([view.canSign, view.canReturn, view.members.length], [true, true, 5]);

  await f.decideCouncil(people.science, "sign");
  assert.equal((await db.approvalSubmission.findUnique({ where: { id: submission.id } })).status, "APPROVED");
  const established = await db.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id, status: "assigned", councilEstablishedAt: { not: null } } });
  assert.equal(established.length, 5);
  assert.equal((await f.assignments.getReviewPackage(reviewer, proposal.id)).assignmentRole, "reviewer", "đã chấp nhận và hội đồng đã ký");
  const outsider = await f.candidate("nguoingoai");
  await assert.rejects(() => f.assignments.getReviewPackage(outsider, proposal.id), code(403));
  const audit = await db.auditLog.findFirst({ where: { action: "establish-evaluation-council", targetEntityId: proposal.id } });
  assert.equal(audit.actorId, people.science.id);
  assert.equal((await f.council.getCouncil(people.science, proposal.id)).established, true);
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
