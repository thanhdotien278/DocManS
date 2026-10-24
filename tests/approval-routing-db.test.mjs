import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { ApprovalRoutingService } from "../dist/apps/api/approvals/approval-routing.service.js";
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
