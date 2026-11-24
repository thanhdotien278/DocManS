import "dotenv/config";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";
import { PasswordService } from "../dist/apps/api/auth/password.service.js";
import { ResearcherProfilesService } from "../dist/apps/api/researcher-profiles/researcher-profiles.service.js";
import { updateMyProfilePipe, updateResearcherProfilePipe } from "../dist/apps/api/researcher-profiles/researcher-profiles.dto.js";

// Đổi quân hàm, học hàm, học vị trong lý lịch khoa học: danh sách đang dùng đổi theo; bản đã nộp, đã kết thúc giữ nguyên (CONTEXT.md, bất biến 5).

let database;
let db;
let authStore;
let profiles;
let org;
let staff;
let sequence = 0;
const originalUrl = process.env.DATABASE_URL;
const unique = (prefix) => `${prefix}-${process.pid}-${++sequence}`;
const contextVersion = (profile) => ({
  domain: "researcher-profile",
  recordId: profile.id,
  aggregateVersion: profile.aggregateVersion,
  policyVersion: "v1",
  relationshipVersion: 0,
  conflictVersion: 0,
  delegationVersion: 0
});
const mail = {
  configuration: () => ({ host: "localhost", port: 1025, from: "noreply@hvqy.test", loginUrl: "http://localhost:3000", localHost: true }),
  sendAccountActivation: async () => undefined
};

async function createUser(role, displayName) {
  const name = unique(role.toLowerCase());
  return db.user.create({
    data: {
      username: name,
      usernameKey: name,
      displayName,
      passwordHash: "not-used",
      status: "active",
      systemRole: role,
      unit: org.name,
      organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] }
    }
  });
}

describe("Scientist titles propagate to live lists, not to historical or issued evidence", () => {
  before(async () => {
    database = await createMigratedDatabase("titles");
    process.env.DATABASE_URL = database.url;
    db = new PrismaService();
    await db.$connect();
    authStore = new AuthStore(db);
    profiles = new ResearcherProfilesService(db, new AuditLogService(db), mail, new PasswordService());
    org = await db.organizationUnit.create({ data: { code: unique("ORG"), name: "Khoa Nội" } });
    staff = authStore.toSafeUser(await authStore.findUserById((await createUser("RESEARCH_MANAGEMENT_STAFF", "Chuyên viên")).id));
  });

  after(async () => {
    await db?.$disconnect();
    process.env.DATABASE_URL = originalUrl;
    await database?.drop();
  });

  it("updates linked User.displayName and ACTIVE members via updateProfile and updateMyProfile while preserving ENDED rows and snapshots", async () => {
    const masters = await db.catalogItem.create({ data: { type: "academic-degree", code: "master", name: "Thạc sĩ" } });
    const doctor = await db.catalogItem.create({ data: { type: "academic-degree", code: "doctor", name: "Tiến sĩ" } });
    const associate = await db.catalogItem.create({ data: { type: "academic-rank", code: "associate-professor", name: "Phó giáo sư" } });
    const professor = await db.catalogItem.create({ data: { type: "academic-rank", code: "professor", name: "Giáo sư" } });

    const scientistUser = await createUser("RESEARCHER_INTERNAL_USER", "Thiếu tá, ThS. Lê Văn An");
    const profile = await db.researcherProfile.create({
      data: {
        managementOrganizationUnitId: org.id,
        linkedUserId: scientistUser.id,
        fullName: "Lê Văn An",
        fullNameKey: "le van an",
        militaryRank: "Thiếu tá",
        academicDegreeCatalogItemId: masters.id,
        createdById: staff.id,
        updatedById: staff.id
      }
    });
    const oldDisplay = "Thiếu tá, ThS. Lê Văn An";
    const owner = await createUser("RESEARCHER_INTERNAL_USER", "Chủ nhiệm");

    const period = await db.proposalIntakePeriod.create({
      data: { code: unique("DOT"), title: "Đợt", startsAt: new Date("2030-01-01"), endsAt: new Date("2030-12-31"), status: "open", requiredPackage: {} }
    });
    const proposal = await db.researchProposal.create({
      data: { intakePeriodId: period.id, ownerId: owner.id, hostOrganizationUnitId: org.id, title: "Đề xuất A", status: "submitted" }
    });

    const activeProposalMember = await db.proposalMember.create({
      data: { proposalId: proposal.id, userId: scientistUser.id, researcherProfileId: profile.id, name: oldDisplay, role: "TOPIC_MEMBER", organization: org.name, status: "ACTIVE" }
    });
    const endedProposalMember = await db.proposalMember.create({
      data: { proposalId: proposal.id, userId: scientistUser.id, researcherProfileId: profile.id, name: oldDisplay, role: "TOPIC_MEMBER", organization: org.name, status: "ENDED", effectiveUntil: new Date() }
    });
    const submission = await db.proposalSubmissionEvent.create({
      data: { proposalId: proposal.id, actorId: owner.id, fromStatus: "draft", toStatus: "submitted", submittedAt: new Date(), snapshot: { members: [{ userId: scientistUser.id, name: oldDisplay }] } }
    });
    const decision = await db.proposalDecision.create({
      data: { proposalId: proposal.id, decision: "approved", decidedById: staff.id, decidedAt: new Date(), fromStatus: "ready_for_approval", toStatus: "approved" }
    });

    const project = await db.approvedProject.create({
      data: {
        proposalId: proposal.id,
        sourceSubmissionEventId: submission.id,
        sourceDecisionId: decision.id,
        hostOrganizationUnitId: org.id,
        title: "Đề tài A",
        scopeSnapshot: { members: [{ userId: scientistUser.id, name: oldDisplay }] },
        createdById: staff.id
      }
    });
    const activeProjectMember = await db.approvedProjectMember.create({
      data: { projectId: project.id, userId: scientistUser.id, name: oldDisplay, role: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: new Date(), createdById: staff.id }
    });
    const endedProjectMember = await db.approvedProjectMember.create({
      data: {
        projectId: project.id,
        userId: scientistUser.id,
        name: oldDisplay,
        role: "TOPIC_MEMBER",
        status: "ENDED",
        effectiveFrom: new Date(Date.now() - 60_000),
        effectiveUntil: new Date(),
        createdById: staff.id
      }
    });

    // 1. Chuyên viên cập nhật lý lịch: Thiếu tá ThS. -> Thượng tá, PGS. TS.
    const updatedByStaff = await profiles.updateProfile(
      staff,
      profile.id,
      updateResearcherProfilePipe.transform({
        contextVersion: contextVersion(profile),
        militaryRank: "Thượng tá",
        academicRankCatalogItemId: associate.id,
        academicDegreeCatalogItemId: doctor.id
      })
    );
    const nextDisplay = "Thượng tá, PGS. TS. Lê Văn An";
    assert.equal((await db.user.findUnique({ where: { id: scientistUser.id } })).displayName, nextDisplay);
    assert.equal((await db.proposalMember.findUnique({ where: { id: activeProposalMember.id } })).name, nextDisplay);
    assert.equal((await db.approvedProjectMember.findUnique({ where: { id: activeProjectMember.id } })).name, nextDisplay);

    // Dữ liệu lịch sử & snapshot phải giữ nguyên tên cũ.
    assert.equal((await db.proposalMember.findUnique({ where: { id: endedProposalMember.id } })).name, oldDisplay);
    assert.equal((await db.approvedProjectMember.findUnique({ where: { id: endedProjectMember.id } })).name, oldDisplay);
    assert.equal((await db.proposalSubmissionEvent.findUnique({ where: { id: submission.id } })).snapshot.members[0].name, oldDisplay);
    assert.equal((await db.approvedProject.findUnique({ where: { id: project.id } })).scopeSnapshot.members[0].name, oldDisplay);

    const propagationAudit = await db.auditLog.findFirst({ where: { action: "propagate-researcher-titles", targetEntityId: profile.id } });
    assert.ok(propagationAudit);

    // 2. Lưu lại mà không đổi danh xưng -> không ghi thêm audit propagate-researcher-titles.
    const beforeAuditCount = await db.auditLog.count({ where: { action: "propagate-researcher-titles", targetEntityId: profile.id } });
    const safeScientist = authStore.toSafeUser(await authStore.findUserById(scientistUser.id));
    await profiles.updateMyProfile(
      safeScientist,
      updateMyProfilePipe.transform({ contextVersion: updatedByStaff.profile.viewerAuthorization.contextVersion, contactNote: "Ghi chú mới" })
    );
    assert.equal(await db.auditLog.count({ where: { action: "propagate-researcher-titles", targetEntityId: profile.id } }), beforeAuditCount);

    // 3. Chủ hồ sơ tự cập nhật qua updateMyProfile: Thượng tá PGS. TS. -> Đại tá, GS. TS.
    const latest = await db.researcherProfile.findUnique({ where: { id: profile.id } });
    await profiles.updateMyProfile(
      safeScientist,
      updateMyProfilePipe.transform({
        contextVersion: contextVersion(latest),
        militaryRank: "Đại tá",
        academicRankCatalogItemId: professor.id
      })
    );
    const finalDisplay = "Đại tá, GS. TS. Lê Văn An";
    assert.equal((await db.user.findUnique({ where: { id: scientistUser.id } })).displayName, finalDisplay);
    assert.equal((await db.proposalMember.findUnique({ where: { id: activeProposalMember.id } })).name, finalDisplay);
    assert.equal((await db.approvedProjectMember.findUnique({ where: { id: activeProjectMember.id } })).name, finalDisplay);
    assert.equal((await db.proposalMember.findUnique({ where: { id: endedProposalMember.id } })).name, oldDisplay);
  });
});
