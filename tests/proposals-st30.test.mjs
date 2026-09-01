import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { createEvaluationTables } from "./helpers/evaluation-prisma.mjs";
import {
  evaluateProposalConflict,
  normalizeParticipationRole,
  resolveProposalParticipation
} from "../dist/apps/api/proposals-shared/proposal-participation.js";

const staffUser = {
  id: "user-staff",
  username: "staff",
  displayName: "Chuyên viên KHQS",
  role: "scientific-management",
  systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
  roleLabel: "Chuyên viên quản lý khoa học",
  unit: "Phòng KHQS",
  roles: ["scientific-management"],
  organizationScopes: [
    { id: "org-khqs", code: "KHQS", name: "Phòng KHQS" },
    { id: "org-khti", code: "KHTI", name: "Khoa Toán - Tin học" }
  ]
};

const adminUser = {
  ...staffUser,
  id: "user-admin",
  username: "admin",
  displayName: "Quản trị hệ thống",
  role: "system-admin",
  systemRole: "SYSTEM_ADMIN",
  roleLabel: "Quản trị hệ thống"
};

const piUser = {
  ...staffUser,
  id: "user-pi",
  username: "patuan",
  displayName: "Phạm Anh Tuấn",
  role: "principal-investigator",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Chủ nhiệm đề tài",
  roles: ["principal-investigator"],
  organizationScopes: [{ id: "org-khti", code: "KHTI", name: "Khoa Toán - Tin học" }]
};

/** Linked as a proposal member. Account role grants no proposal access on its own. */
const memberUser = {
  ...piUser,
  id: "user-member",
  username: "ntlan",
  displayName: "Nguyễn Thị Lan",
  role: "reviewer",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Người đánh giá",
  roles: ["reviewer"]
};

/** Linked as the scientific secretary of the same proposal. */
const secretaryUser = {
  ...piUser,
  id: "user-secretary",
  username: "ttminh",
  displayName: "Trần Thanh Minh",
  role: "council-member",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Thành viên hội đồng",
  roles: ["council-member"]
};

/** Holds no relationship to the proposal at all. */
const outsiderUser = {
  ...piUser,
  id: "user-outsider",
  username: "lvhung",
  displayName: "Lê Văn Hùng",
  role: "reviewer",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Người đánh giá",
  roles: ["reviewer"]
};

/** Carries the legacy PI label but owns and participates in no proposal. */
const legacyPiUser = {
  ...piUser,
  id: "user-legacy-pi",
  username: "pi.khong-quan-he"
};

const ACCOUNTS = [adminUser, staffUser, piUser, memberUser, secretaryUser, outsiderUser];

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createAuditLog() {
  return {
    records: [],
    async record(input) {
      this.records.push(input);
      return { id: `audit-${this.records.length}`, timestamp: new Date().toISOString(), ...input };
    },
    actions() {
      return this.records.map((record) => record.action);
    },
    find(action) {
      return this.records.filter((record) => record.action === action);
    }
  };
}

function createPrisma() {
  const store = {
    intakePeriods: [],
    proposals: [],
    members: [],
    fileRecords: [],
    submissionEvents: [],
    supplementRequests: [],
    auditLogs: []
  };

  function nextId(prefix, collection) {
    return `${prefix}-${collection.length + 1}`;
  }

  const prisma = {
    store,
    proposalIntakePeriod: {
      async create({ data }) {
        const record = {
          id: nextId("intake", store.intakePeriods),
          description: null,
          applicableOrganizationUnitId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.intakePeriods.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.intakePeriods.findIndex((item) => item.id === where.id);
        store.intakePeriods[index] = { ...store.intakePeriods[index], ...data, updatedAt: new Date() };
        return store.intakePeriods[index];
      },
      async findUnique({ where }) {
        return store.intakePeriods.find((item) => item.id === where.id || item.code === where.code) ?? null;
      },
      async findMany() {
        return [...store.intakePeriods];
      }
    },
    researchProposal: {
      async create({ data }) {
        const record = {
          id: nextId("proposal", store.proposals),
          code: null,
          researchFieldCode: null,
          proposalTypeCode: null,
          objectives: null,
          summary: null,
          startDate: null,
          endDate: null,
          budgetMetadata: {},
          status: "draft",
          submittedAt: null,
          submittedById: null,
          authorizationRelationshipVersion: 0,
          authorizationConflictVersion: 0,
          authorizationDelegationVersion: 0,
          authorizationContextUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.proposals.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.proposals.findIndex((item) => item.id === where.id);
        const current = store.proposals[index];
        const values = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value && typeof value === "object" && "increment" in value ? current[key] + value.increment : value])
        );
        store.proposals[index] = { ...current, ...values, updatedAt: new Date() };
        return store.proposals[index];
      },
      async findUnique({ where }) {
        return store.proposals.find((item) => item.id === where.id) ?? null;
      },
      async findMany() {
        return [...store.proposals];
      },
      // Used by the EP-03 guarded status transitions, which update conditionally on the status
      // they validated so a concurrent writer loses instead of both winning.
      async updateMany({ where, data }) {
        let count = 0;
        store.proposals = store.proposals.map((item) => {
          if (item.id !== where.id ||
            (where.status !== undefined && item.status !== where.status) ||
            (where.authorizationRelationshipVersion !== undefined && item.authorizationRelationshipVersion !== where.authorizationRelationshipVersion) ||
            (where.authorizationConflictVersion !== undefined && item.authorizationConflictVersion !== where.authorizationConflictVersion)) {
            return item;
          }
          count += 1;
          const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value && typeof value === "object" && "increment" in value ? item[key] + value.increment : value]));
          return { ...item, ...values, updatedAt: new Date() };
        });
        return { count };
      }
    },
    proposalMember: {
      async updateMany({ where, data }) {
        let count = 0;
        store.members = store.members.map((item) => {
          if (item.id !== where.id || (where.status && item.status !== where.status)) return item;
          count += 1;
          return { ...item, ...data };
        });
        return { count };
      },
      async deleteMany({ where }) {
        const before = store.members.length;
        store.members = store.members.filter((item) => item.proposalId !== where.proposalId);
        return { count: before - store.members.length };
      },
      async createMany({ data }) {
        const records = data.map((item) => ({
          id: nextId("member", store.members),
          createdAt: new Date(),
          userId: null,
          participationRole: "member",
          status: "ACTIVE",
          effectiveFrom: new Date(),
          effectiveUntil: null,
          ...item
        }));
        store.members.push(...records);
        return { count: records.length };
      },
      async findMany({ where }) {
        const proposalIds = Array.isArray(where?.proposalId?.in) ? where.proposalId.in : [where?.proposalId];
        return store.members.filter((item) => proposalIds.includes(item.proposalId));
      }
    },
    user: {
      async findMany({ where }) {
        const ids = where?.OR?.flatMap((clause) => clause.id?.in ?? []) ?? [];
        const usernameKeys = where?.OR?.flatMap((clause) => clause.usernameKey?.in ?? []) ?? [];
        return ACCOUNTS.filter((user) => ids.includes(user.id) || usernameKeys.includes(user.username.toLowerCase())).map((user) => ({
          id: user.id,
          usernameKey: user.username.toLowerCase()
        }));
      }
    },
    fileRecord: {
      async create({ data }) {
        const record = {
          id: nextId("file", store.fileRecords),
          description: null,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          uploadedBy: { displayName: "Phạm Anh Tuấn" },
          ...data
        };
        store.fileRecords.push(record);
        return record;
      },
      async findUnique({ where }) {
        return store.fileRecords.find((item) => item.id === where.id) ?? null;
      },
      async findMany({ where }) {
        return store.fileRecords.filter((item) => {
          if (where.relatedEntityId && item.relatedEntityId !== where.relatedEntityId) return false;
          if (where.status && item.status !== where.status) return false;
          if (where.deletedAt === null && item.deletedAt !== null) return false;
          return true;
        });
      }
    },
    proposalSubmissionEvent: {
      async create({ data }) {
        const record = { id: nextId("event", store.submissionEvents), submittedAt: new Date(), note: null, ...data };
        store.submissionEvents.push(record);
        return record;
      },
      async findMany({ where }) {
        return store.submissionEvents.filter((item) => item.proposalId === where.proposalId);
      }
    },
    proposalSupplementRequest: {
      async findMany({ where }) {
        return store.supplementRequests.filter((item) => item.proposalId === where.proposalId);
      }
    },
    auditLog: {
      async create({ data }) {
        const record = { id: nextId("audit", store.auditLogs), timestamp: new Date(), ...data };
        store.auditLogs.push(record);
        return record;
      }
    },
    // EP-03 tables: the proposal and file read paths resolve reviewer assignments (ST-3.2).
    ...createEvaluationTables(store, ACCOUNTS),
    async $queryRaw() {
      return [{ asOf: new Date() }];
    },
    async $transaction(callback) {
      return callback(this);
    }
  };

  return prisma;
}

function createObjectStorage() {
  return {
    objects: new Map(),
    async putObject({ objectKey, content }) {
      this.objects.set(objectKey, Buffer.from(content));
    },
    async getObject(objectKey) {
      const content = this.objects.get(objectKey);
      if (!content) {
        throw new Error("object not found");
      }
      return content;
    },
    async deleteObject(objectKey) {
      this.objects.delete(objectKey);
    }
  };
}

function createServices() {
  const prisma = createPrisma();
  const auditLog = createAuditLog();
  const participationService = new ProposalParticipationService(prisma);
  const objectStorage = createObjectStorage();

  return {
    prisma,
    auditLog,
    objectStorage,
    participationService,
    intakeService: new ProposalIntakePeriodsService(prisma, auditLog),
    proposalService: new ResearchProposalsService(prisma, auditLog, participationService, new ProposalReviewAccessService(prisma)),
    filesService: new FilesService(prisma, objectStorage, auditLog, participationService, new ProposalReviewAccessService(prisma), {
      maxFileSizeBytes: 1024 * 1024,
      allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx"]
    })
  };
}

async function createOpenIntake(intakeService) {
  const intake = await intakeService.createPeriod(staffUser, {
    code: "INTAKE-2026",
    title: "Đợt tiếp nhận 2026",
    description: "Đợt tiếp nhận hồ sơ cấp Học viện",
    startsAt: futureDate(-1),
    endsAt: futureDate(15),
    applicableOrganizationUnitId: "org-khti",
    requiredPackage: [{ code: "proposal-form", label: "Thuyết minh đề tài", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 }]
  });

  return intakeService.openPeriod(staffUser, intake.id);
}

async function createProposalWithParticipants(services, members) {
  const intake = await createOpenIntake(services.intakeService);
  return services.proposalService.createDraft(piUser, {
    intakePeriodId: intake.id,
    title: "Nghiên cứu ứng dụng AI trong y học quân sự",
    hostOrganizationUnitId: "org-khti",
    researchFieldCode: "biomedical-tech",
    proposalTypeCode: "academy-level",
    startDate: futureDate(30),
    endDate: futureDate(210),
    objectives: "Xây dựng mô hình thử nghiệm hỗ trợ phân tích dữ liệu.",
    summary: "Đề tài nghiên cứu ứng dụng AI với phạm vi thử nghiệm nội bộ.",
    budgetMetadata: { amount: 120000000, currency: "VND" },
    members
  });
}

const LINKED_TEAM = [
  { name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học", username: "patuan" },
  { name: "ThS. Nguyễn Thị Lan", role: "Thành viên", organization: "Khoa Toán - Tin học", username: "ntlan" },
  { name: "ThS. Trần Thanh Minh", role: "Thư ký khoa học", organization: "Phòng KHQS", username: "ttminh" },
  { name: "GS. Đối tác ngoài viện", role: "Thành viên", organization: "Đại học Y Hà Nội" }
];

describe("ST-3.0 proposal participation model and conflict primitives", () => {
  it("VER-ST-3.0-01/02: links participants with accounts and keeps external participants valid", async () => {
    const services = createServices();
    const proposal = await createProposalWithParticipants(services, LINKED_TEAM);

    const byName = new Map(proposal.members.map((member) => [member.name, member]));

    // AC-ST-3.0-01: the participation record stores a resolved reference to the account.
    assert.equal(byName.get("ThS. Nguyễn Thị Lan").userId, memberUser.id);
    assert.equal(byName.get("ThS. Nguyễn Thị Lan").isAccountLinked, true);
    assert.equal(byName.get("ThS. Trần Thanh Minh").userId, secretaryUser.id);

    // The descriptive fields survive so the entry still reads as a person, not just an id.
    assert.equal(byName.get("ThS. Trần Thanh Minh").organization, "Phòng KHQS");
    assert.equal(byName.get("ThS. Trần Thanh Minh").role, "Thư ký khoa học");

    // AC-ST-3.0-01: participants without a system account remain valid descriptive entries.
    assert.equal(byName.get("GS. Đối tác ngoài viện").userId, "");
    assert.equal(byName.get("GS. Đối tác ngoài viện").isAccountLinked, false);
    assert.equal(byName.get("GS. Đối tác ngoài viện").participationRole, "member");

    // The canonical participation role is derived from the Vietnamese label when no code is sent.
    assert.equal(byName.get("TS. Phạm Anh Tuấn").participationRole, "principal-investigator");
    assert.equal(byName.get("ThS. Trần Thanh Minh").participationRole, "secretary");
    assert.equal(byName.get("ThS. Trần Thanh Minh").participationRoleLabel, "Thư ký");
  });

  it("rejects a participant naming an account that does not exist without persisting a draft", async () => {
    const services = createServices();

    await assert.rejects(
      () =>
        createProposalWithParticipants(services, [
          { name: "Người không tồn tại", role: "Thành viên", organization: "Khoa Toán - Tin học", username: "khong-ton-tai" }
        ]),
      BadRequestException
    );

    // The rejection must happen before any write, or an unauditable orphan draft is left behind.
    assert.equal(services.prisma.store.members.length, 0);
    assert.equal(services.prisma.store.proposals.length, 0);
    assert.equal(services.auditLog.find("create-proposal-draft").length, 0);

    // An update naming an unknown account leaves the existing participation untouched.
    const created = await createProposalWithParticipants(services, LINKED_TEAM);
    await assert.rejects(
      () =>
        services.proposalService.updateDraft(piUser, created.id, {
          members: [{ name: "Người không tồn tại", role: "Thành viên", organization: "K1", username: "khong-ton-tai" }]
        }),
      BadRequestException
    );
    assert.equal(services.prisma.store.members.length, LINKED_TEAM.length);
  });

  it("lets a linked participant download the attachments they can already see on the proposal", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    const uploaded = await services.filesService.uploadFile(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: created.id,
      filePurpose: "proposal-form",
      fileName: "thuyet-minh.pdf",
      originalFileName: "thuyet-minh.pdf",
      description: "Thuyết minh đề tài",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      content: Buffer.alloc(2048, "p")
    });

    // The proposal detail already lists this attachment for the participant...
    const memberView = await services.proposalService.getProposal(memberUser, created.id);
    assert.equal(memberView.attachments.length, 1);

    // ...so the file endpoints must agree, otherwise the download link is permanently dead.
    const listed = await services.filesService.listFiles(memberUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: created.id
    });
    assert.equal(listed.length, 1);

    const download = await services.filesService.downloadFile(memberUser, uploaded.id);
    assert.equal(download.fileName, "thuyet-minh.pdf");

    // A user with no relationship to the proposal is still refused.
    await assert.rejects(() => services.filesService.downloadFile(outsiderUser, uploaded.id), ForbiddenException);
    await assert.rejects(
      () => services.filesService.listFiles(outsiderUser, { relatedEntityType: "research_proposal", relatedEntityId: created.id }),
      ForbiddenException
    );
    await assert.rejects(() => services.filesService.downloadFile(adminUser, uploaded.id), ForbiddenException);

    // Participation grants read only: the participant cannot upload to someone else's draft.
    await assert.rejects(
      () =>
        services.filesService.uploadFile(memberUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: created.id,
          filePurpose: "proposal-form",
          fileName: "gia-mao.pdf",
          originalFileName: "gia-mao.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          content: Buffer.alloc(1024, "x")
        }),
      ForbiddenException
    );
  });

  it("VER-ST-3.0-03: returns the per-record participation role for owner, participant, and unrelated users", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    // AC-ST-3.0-02: owner sees the record role, derived from the relationship not the account role.
    const ownerView = await services.proposalService.getProposal(piUser, created.id);
    assert.equal(ownerView.viewerParticipation.role, "principal-investigator");
    assert.equal(ownerView.viewerParticipation.label, "Chủ nhiệm");
    assert.equal(ownerView.viewerParticipation.isOwner, true);

    // A linked member reads the record it participates in and is labelled as a member...
    const memberView = await services.proposalService.getProposal(memberUser, created.id);
    assert.equal(memberView.viewerParticipation.role, "member");
    assert.equal(memberView.viewerParticipation.label, "Thành viên");

    // ...even though the same account-level role grants nothing on an unrelated proposal.
    const secretaryView = await services.proposalService.getProposal(secretaryUser, created.id);
    assert.equal(secretaryView.viewerParticipation.role, "secretary");

    // AC-ST-3.0-03: an unrelated user gets no participation role and no participation-derived read.
    await assert.rejects(() => services.proposalService.getProposal(outsiderUser, created.id), ForbiddenException);

    // Staff read the proposal on their account-level scope, and still hold no record role.
    const staffView = await services.proposalService.getProposal(staffUser, created.id);
    assert.equal(staffView.viewerParticipation.role, "none");
    assert.equal(staffView.viewerParticipation.isParticipant, false);
    assert.equal(staffView.viewerParticipation.conflict.conflicted, false);
    await assert.rejects(() => services.proposalService.getProposal(adminUser, created.id), ForbiddenException);
    assert.deepEqual(await services.proposalService.listProposals(adminUser), []);
  });

  it("AUTH-ST-3.0-02: participation grants record-scoped read only and never widens account authority", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    const memberView = await services.proposalService.getProposal(memberUser, created.id);
    assert.equal(memberView.canEdit, false);
    assert.equal(memberView.canSubmit, false);

    // A participant cannot edit or submit the proposal they merely take part in.
    await assert.rejects(
      () => services.proposalService.updateDraft(memberUser, created.id, { title: "Đổi tên trái phép" }),
      ForbiddenException
    );
    await assert.rejects(() => services.proposalService.submitProposal(memberUser, created.id), ForbiddenException);

    // Participation on one proposal grants nothing on another proposal.
    const other = await services.proposalService.createDraft(piUser, {
      intakePeriodId: services.prisma.store.intakePeriods[0].id,
      title: "Hồ sơ thứ hai không có sự tham gia",
      hostOrganizationUnitId: "org-khti"
    });
    await assert.rejects(() => services.proposalService.getProposal(memberUser, other.id), ForbiddenException);
  });

  it("Story 1.4 Session 4: legacy PI, reviewer, and council labels grant no proposal authority without a record relationship", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    // Ownership and ProposalMember remain the only PI/member paths to this record.
    assert.equal((await services.proposalService.getProposal(piUser, created.id)).canEdit, true);
    assert.equal((await services.proposalService.getProposal(memberUser, created.id)).viewerParticipation.isParticipant, true);

    // These fields emulate legacy account data. They must not become proposal permissions.
    for (const actor of [legacyPiUser, outsiderUser]) {
      await assert.rejects(() => services.proposalService.getProposal(actor, created.id), ForbiddenException);
      await assert.rejects(() => services.proposalService.updateDraft(actor, created.id, { title: "Chiếm quyền" }), ForbiddenException);
      await assert.rejects(() => services.proposalService.submitProposal(actor, created.id), ForbiddenException);
    }

    // A council-member label is equally inert unless it is represented by a proposal relationship.
    const unlinkedCouncilMember = { ...secretaryUser, id: "user-council-unlinked", username: "hoi-dong-khong-quan-he" };
    await assert.rejects(() => services.proposalService.getProposal(unlinkedCouncilMember, created.id), ForbiddenException);
  });

  it("VER-ST-3.0-03: the proposal list states the record role per row", async () => {
    const services = createServices();
    await createProposalWithParticipants(services, LINKED_TEAM);

    const memberList = await services.proposalService.listProposals(memberUser);
    assert.equal(memberList.length, 1);
    assert.equal(memberList[0].viewerParticipation.role, "member");

    const outsiderList = await services.proposalService.listProposals(outsiderUser);
    assert.equal(outsiderList.length, 0);

    const staffList = await services.proposalService.listProposals(staffUser);
    assert.equal(staffList.length, 1);
    assert.equal(staffList[0].viewerParticipation.role, "none");
  });

  it("Story 1.8: list and detail expose the same viewer capability without leaking other actors", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);
    const [listView] = await services.proposalService.listProposals(memberUser);
    const detailView = await services.proposalService.getProposal(memberUser, created.id);

    assert.deepEqual(listView.viewerAuthorization, detailView.viewerAuthorization);
    assert.deepEqual(detailView.viewerAuthorization.viewerRelationships.map((relationship) => relationship.type), ["PROPOSAL_MEMBER"]);
    assert.equal(detailView.viewerAuthorization.blockedActions.find((action) => action.action === "proposal.draft.update").code, "ACTION_NOT_GRANTED");
    assert.doesNotMatch(JSON.stringify(detailView.viewerAuthorization), /patuan|ttminh|Phạm Anh Tuấn|Thanh Minh/);
    assert.equal(detailView.viewerAuthorization.contextVersion.relationshipVersion, 1);
    assert.equal(detailView.viewerAuthorization.contextVersion.conflictVersion, 1);
    assert.match(detailView.viewerAuthorization.viewerRelationships[0].effectiveFrom, /^\d{4}-\d{2}-\d{2}T/);

    await services.proposalService.updateDraft(piUser, created.id, {
      members: LINKED_TEAM,
      contextVersion: detailView.viewerAuthorization.contextVersion
    });
    const updated = await services.proposalService.getProposal(memberUser, created.id);
    assert.equal(updated.viewerAuthorization.contextVersion.relationshipVersion, 2);
    assert.equal(updated.viewerAuthorization.contextVersion.conflictVersion, 2);
    await assert.rejects(
      () => services.proposalService.updateDraft(piUser, created.id, {
        members: LINKED_TEAM,
        contextVersion: detailView.viewerAuthorization.contextVersion
      }),
      (error) => error instanceof ConflictException && error.getResponse().code === "CONTEXT_VERSION_MISMATCH"
    );
  });

  it("VER-ST-3.0-04: the conflict primitive reports a conflict for PI, participant, and secretary", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    for (const [user, expectedRole] of [
      [piUser, "principal-investigator"],
      [memberUser, "member"],
      [secretaryUser, "secretary"]
    ]) {
      const decision = await services.participationService.evaluateConflict(user.id, created.id);
      assert.equal(decision.conflicted, true, `${user.username} must conflict`);
      assert.equal(decision.role, expectedRole);
      assert.equal(decision.reasonCode, "participation");
      assert.ok(decision.reason.length > 0);
      assert.ok(decision.viewerMessage.length > 0);
    }

    // The external participant has no account, so nothing links back to a candidate.
    const clean = await services.participationService.evaluateConflict(outsiderUser.id, created.id);
    assert.equal(clean.conflicted, false);
    assert.equal(clean.role, "none");
    assert.equal(clean.reasonCode, "no-conflict");
  });

  it("TN-ST-3.0-03: the conflict primitive fails closed when participation cannot be resolved", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    const missingCandidate = await services.participationService.evaluateConflict(undefined, created.id);
    assert.equal(missingCandidate.conflicted, true);
    assert.equal(missingCandidate.reasonCode, "unresolved");

    const missingProposal = await services.participationService.evaluateConflict(piUser.id, "proposal-does-not-exist");
    assert.equal(missingProposal.conflicted, true);
    assert.equal(missingProposal.reasonCode, "unresolved");

    const brokenPrisma = {
      researchProposal: {
        async findUnique() {
          throw new Error("database unavailable");
        }
      }
    };
    const brokenDecision = await new ProposalParticipationService(brokenPrisma).evaluateConflict(piUser.id, created.id);
    assert.equal(brokenDecision.conflicted, true);
    assert.equal(brokenDecision.reasonCode, "unresolved");

    // The pure primitive is fail-closed on its own, independent of any caller.
    assert.equal(evaluateProposalConflict(null).conflicted, true);
    assert.equal(evaluateProposalConflict(undefined).reasonCode, "unresolved");
    assert.equal(resolveProposalParticipation({ userId: "", proposal: null, members: null }).role, "unknown");
    assert.equal(evaluateProposalConflict(resolveProposalParticipation({ userId: "user-x" })).conflicted, true);
  });

  it("VER-ST-3.0-05: records audit entries for account linking and participation changes", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    const links = services.auditLog.find("link-proposal-participant");
    assert.equal(links.length, 3, "one entry per newly linked account");
    assert.deepEqual(
      links.map((entry) => JSON.parse(entry.reason).linkedUserId).sort(),
      [memberUser.id, piUser.id, secretaryUser.id].sort()
    );
    for (const entry of links) {
      assert.equal(entry.actorId, piUser.id);
      assert.equal(entry.targetEntity, "proposal-participation");
      assert.equal(entry.targetEntityId, created.id);
    }

    const changes = services.auditLog.find("update-proposal-participation");
    assert.equal(changes.length, 1);
    assert.equal(JSON.parse(changes[0].reason).nextCount, 4);

    const initial = await services.proposalService.getProposal(piUser, created.id);
    await assert.rejects(
      () => services.proposalService.updateDraft(piUser, created.id, {
        members: [
          { name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học", username: "patuan" },
          { name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học", username: "patuan" }
        ],
        contextVersion: initial.viewerAuthorization.contextVersion
      }),
      BadRequestException
    );

    // Removing a participant is captured as an unlink, not silently dropped.
    const current = await services.proposalService.getProposal(piUser, created.id);
    await services.proposalService.updateDraft(piUser, created.id, {
      members: [{ name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học", username: "patuan" }],
      contextVersion: current.viewerAuthorization.contextVersion
    });

    const latestChange = JSON.parse(services.auditLog.find("update-proposal-participation").at(-1).reason);
    assert.equal(latestChange.previousCount, 4);
    assert.equal(latestChange.nextCount, 1);
    assert.deepEqual(latestChange.unlinkedUserIds.sort(), [memberUser.id, secretaryUser.id].sort());

    // The unlinked member loses the record-scoped read that participation had granted.
    await assert.rejects(() => services.proposalService.getProposal(memberUser, created.id), ForbiddenException);
  });

  it("normalizes participation roles from canonical codes and Vietnamese labels", () => {
    assert.equal(normalizeParticipationRole("principal-investigator"), "principal-investigator");
    assert.equal(normalizeParticipationRole("Chủ nhiệm"), "principal-investigator");
    assert.equal(normalizeParticipationRole("Đồng chủ nhiệm đề tài"), "co-investigator");
    assert.equal(normalizeParticipationRole("secretary"), "secretary");
    assert.equal(normalizeParticipationRole("Thư ký khoa học"), "secretary");
    assert.equal(normalizeParticipationRole("THƯ KÝ"), "secretary");
    assert.equal(normalizeParticipationRole("Thành viên"), "member");
    // Anything unrecognised falls back to the conflicting `member` role rather than to none.
    assert.equal(normalizeParticipationRole("Cộng tác viên"), "member");
    assert.equal(normalizeParticipationRole(undefined), "member");
    assert.equal(normalizeParticipationRole(42), "member");
  });

  it("reports the highest-precedence role and still lists the others when a user holds several", () => {
    const participation = resolveProposalParticipation({
      userId: "user-pi",
      proposal: { ownerId: "user-pi" },
      members: [
        { userId: "user-pi", participationRole: "secretary" },
        { userId: "user-pi", participationRole: "member" },
        { userId: "user-other", participationRole: "member" }
      ]
    });

    assert.equal(participation.role, "principal-investigator");
    assert.deepEqual(participation.roles, ["principal-investigator", "secretary", "member"]);
    assert.deepEqual(participation.labels, ["Chủ nhiệm", "Thư ký", "Thành viên"]);
    assert.equal(participation.isOwner, true);
  });

  it("does not treat an unlinked descriptive participant as a participation match", () => {
    const participation = resolveProposalParticipation({
      userId: "user-outsider",
      proposal: { ownerId: "user-pi" },
      members: [{ userId: null, participationRole: "member" }]
    });

    assert.equal(participation.role, "none");
    assert.equal(participation.isParticipant, false);
    assert.equal(evaluateProposalConflict(participation).conflicted, false);
  });
});
