import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { proposalContextVersion } from "../dist/apps/api/proposals-shared/proposal-mutation.js";

// Story 4.6 trên PostgreSQL thật: chỉ PI nộp, nộp đồng thời chỉ một thắng, context cũ bị từ chối, event ghi context và version.
let database;
let db;
let service;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("submit_4_6");
  process.env.DATABASE_URL = database.url;
  db = new PrismaService();
  service = new ResearchProposalsService(db, new AuditLogService(db), new ProposalParticipationService(db), new ProposalReviewAccessService(db), new ProposalManagementOfficerService(db));
});

after(async () => {
  await db?.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await database?.drop();
});

async function setup(code) {
  const org = await db.organizationUnit.create({ data: { code, name: `Phòng ${code}` } });
  const make = async (name, systemRole) => {
    const user = await db.user.create({ data: { username: `${name}-${code}`, usernameKey: `${name}-${code}`, displayName: name, passwordHash: "x", status: "active", systemRole, unit: org.name, organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } });
    return { id: user.id, username: user.username, displayName: name, systemRole, unit: org.name, organizationScopes: [{ id: org.id, code: org.code, name: org.name }] };
  };
  const people = { pi: await make("chunhiem", "RESEARCHER_INTERNAL_USER"), other: await make("khac", "RESEARCHER_INTERNAL_USER"), head: await make("truongphong", "RESEARCH_MANAGEMENT_HEAD"), external: await make("ngoai", "EXTERNAL_RESEARCHER_USER") };
  const intake = await db.proposalIntakePeriod.create({ data: { code: `DOT-${code}`, title: "Đợt", status: "open", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-12-31"), requiredPackage: [] } });
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: people.pi.id, hostOrganizationUnitId: org.id, title: `Đề tài ${code}`, status: "draft", researchFieldCode: "f", proposalTypeCode: "t", proposalNatureCode: "n", startDate: new Date("2027-01-01"), endDate: new Date("2027-12-01"), objectives: "mục tiêu", summary: "tóm tắt", budgetMetadata: { amount: 1 } } });
  const ctx = async () => proposalContextVersion(await db.researchProposal.findUnique({ where: { id: proposal.id } }));
  return { people, proposal, ctx };
}

const status = (code) => (error) => (error?.getStatus?.() ?? error?.status) === code;

test("chỉ PI nộp: vai trò khác và EXTERNAL bị từ chối, không tạo event", async () => {
  const { people, proposal, ctx } = await setup("A");
  for (const actor of [people.other, people.head, people.external]) {
    await assert.rejects(async () => service.submitProposal(actor, proposal.id, { contextVersion: await ctx() }), status(403));
  }
  assert.equal(await db.proposalSubmissionEvent.count({ where: { proposalId: proposal.id } }), 0);
  assert.equal((await db.researchProposal.findUnique({ where: { id: proposal.id } })).status, "draft");
});

test("nộp hợp lệ ghi context token và submissionVersion; context cũ bị 409", async () => {
  const { people, proposal, ctx } = await setup("B");
  const stale = await ctx();
  await db.researchProposal.update({ where: { id: proposal.id }, data: { title: "Đã đổi" } });
  await assert.rejects(async () => service.submitProposal(people.pi, proposal.id, { contextVersion: stale }), status(409));
  assert.equal(await db.proposalSubmissionEvent.count({ where: { proposalId: proposal.id } }), 0);

  const submitted = await service.submitProposal(people.pi, proposal.id, { contextVersion: await ctx() });
  assert.equal(submitted.status, "submitted");
  const [event] = await db.proposalSubmissionEvent.findMany({ where: { proposalId: proposal.id } });
  assert.equal(event.snapshot.authorizationContext.recordId, proposal.id);
  assert.deepEqual(submitted.history.map((item) => item.submissionVersion), [1]);
});

test("hai request nộp đồng thời: đúng một thành công, không event trùng", async () => {
  const { people, proposal, ctx } = await setup("C");
  const contextVersion = await ctx();
  const results = await Promise.allSettled([service.submitProposal(people.pi, proposal.id, { contextVersion }), service.submitProposal(people.pi, proposal.id, { contextVersion })]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const e = results.find((r) => r.status === "rejected").reason; assert.ok(status(409)(e));
  assert.equal(await db.proposalSubmissionEvent.count({ where: { proposalId: proposal.id } }), 1);
});
