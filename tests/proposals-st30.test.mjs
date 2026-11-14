import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileBytes } from "./helpers/file-bytes.mjs";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
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
  systemRole: "RESEARCH_MANAGEMENT_STAFF",
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
  researcherProfileId: "profile-pi",
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

const headPiUser = { ...piUser, id: "user-head-pi", username: "tphead", systemRole: "RESEARCH_MANAGEMENT_HEAD" };
const noProfilePiUser = { ...piUser, id: "user-no-profile", username: "khonghoso", researcherProfileId: undefined };
const externalPiUser = { ...piUser, id: "user-external", username: "nnb", systemRole: "EXTERNAL_RESEARCHER_USER" };
const ACCOUNTS = [adminUser, staffUser, piUser, memberUser, secretaryUser, outsiderUser, legacyPiUser, headPiUser, noProfilePiUser, externalPiUser];

const profileBase = { managementOrganizationUnit: { name: "Khoa Toán - Tin học" }, academicRankCatalogItem: null, academicDegreeCatalogItem: { name: "Tiến sĩ" }, contactEmail: "lan@hvqy.vn", contactEmailKey: "lan@hvqy.vn", contactPhone: "0900000000", externalAffiliation: null };
const RESEARCHER_PROFILES = [
  { ...profileBase, id: "profile-lan", fullName: "Nguyễn Thị Lan", fullNameKey: "nguyen thi lan", profileType: "INTERNAL", linkedUserId: "user-member", status: "ACTIVE" },
  { ...profileBase, id: "profile-ext", fullName: "Nguyễn Văn Khách", fullNameKey: "nguyen van khach", profileType: "EXTERNAL", externalAffiliation: "Đại học Y Hà Nội", linkedUserId: null, status: "ACTIVE", contactEmail: "khach@example.com", contactEmailKey: "khach@example.com" },
  { ...profileBase, id: "profile-inactive", fullName: "Nguyễn Văn Nghỉ", fullNameKey: "nguyen van nghi", profileType: "INTERNAL", linkedUserId: null, status: "INACTIVE" }
];

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createAuditLog(records) {
  return {
    records,
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
    auditLogs: [],
    researcherProfiles: RESEARCHER_PROFILES
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
          proposalNatureCode: null,
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
          participationRole: "TOPIC_MEMBER",
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
    researcherProfile: {
      // Evaluates the where clause literally so a widened filter (e.g. matching contact email) shows up in tests.
      async findMany({ where, take }) {
        const matches = (record, clause) =>
          Object.entries(clause).every(([field, condition]) => {
            if (field === "OR") return condition.some((item) => matches(record, item));
            if (condition && typeof condition === "object" && "in" in condition) return condition.in.includes(record[field]);
            if (condition && typeof condition === "object" && "contains" in condition) return (record[field] ?? "").includes(condition.contains);
            return record[field] === condition;
          });
        return store.researcherProfiles.filter((record) => matches(record, where ?? {})).slice(0, take ?? Infinity);
      }
    },
    organizationUnit: { count: async () => 0, findFirst: async ({ where }) => (where.id === "missing-unit" ? null : { id: where.id }) },
    catalogItem: { findFirst: async () => ({ id: "catalog-stub" }) },
    proposalManagementOfficer: { findMany: async () => [] },
    approvalSubmission: { findMany: async () => [] },
    user: {
      async findUnique({ where }) {
        const user = ACCOUNTS.find((item) => item.id === where.id);
        return user ? { ...user, status: "active", organizationScopes: user.organizationScopes.map((scope) => ({ organizationUnit: { ...scope, status: "active" } })), researcherProfile: user.researcherProfileId ? { id: user.researcherProfileId, status: "ACTIVE" } : null } : null;
      },
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
      async aggregate({ where }) {
        const versions = store.fileRecords.filter((row) => row.relatedEntityType === where.relatedEntityType &&
          row.relatedEntityId === where.relatedEntityId && row.documentType === where.documentType).map((row) => row.version);
        return { _max: { version: versions.length ? Math.max(...versions) : null } };
      },
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
  const auditLog = createAuditLog(prisma.store.auditLogs);
  const participationService = new ProposalParticipationService(prisma);
  const objectStorage = createObjectStorage();

  return {
    prisma,
    auditLog,
    objectStorage,
    participationService,
    intakeService: new ProposalIntakePeriodsService(prisma, auditLog),
    proposalService: new ResearchProposalsService(prisma, auditLog, participationService, new ProposalReviewAccessService(prisma), new ProposalManagementOfficerService(prisma)),
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

  return intakeService.openPeriod(staffUser, intake.id, { contextVersion: intake.updatedAt });
}

async function createProposalWithParticipants(services, members) {
  const intake = await createOpenIntake(services.intakeService);
  return services.proposalService.createDraft(piUser, {
    intakePeriodId: intake.id,
    title: "Nghiên cứu ứng dụng AI trong y học quân sự",
    hostOrganizationUnitId: "org-khti",
    researchFieldCode: "biomedical-tech",
    proposalTypeCode: "academy-level",
    proposalNatureCode: "military",
    startDate: futureDate(30),
    endDate: futureDate(210),
    objectives: "Xây dựng mô hình thử nghiệm hỗ trợ phân tích dữ liệu.",
    summary: "Đề tài nghiên cứu ứng dụng AI với phạm vi thử nghiệm nội bộ.",
    budgetMetadata: { amount: 120000000, currency: "VND" },
    members
  });
}

const LINKED_TEAM = [
  { name: "ThS. Nguyễn Thị Lan", role: "TOPIC_MEMBER", organization: "Khoa Toán - Tin học", username: "ntlan" },
  { name: "ThS. Trần Thanh Minh", role: "TOPIC_SECRETARY", organization: "Phòng KHQS", username: "ttminh" },
  { name: "GS. Đối tác ngoài viện", role: "TOPIC_MEMBER", organization: "Đại học Y Hà Nội" }
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
    assert.equal(byName.get("ThS. Trần Thanh Minh").role, "TOPIC_SECRETARY");

    // AC-ST-3.0-01: participants without a system account remain valid descriptive entries.
    assert.equal(byName.get("GS. Đối tác ngoài viện").userId, "");
    assert.equal(byName.get("GS. Đối tác ngoài viện").isAccountLinked, false);
    assert.equal(byName.get("GS. Đối tác ngoài viện").participationRole, "TOPIC_MEMBER");

    assert.equal(byName.get("ThS. Trần Thanh Minh").participationRole, "TOPIC_SECRETARY");
    assert.equal(byName.get("ThS. Trần Thanh Minh").participationRoleLabel, "Thư ký");
  });

  it("Story 5.6: thư ký đề tài nộp tài liệu họp, thư ký hội đồng nộp biên bản ẩn với người tham gia", async () => {
    const services = createServices();
    const { store } = services.prisma;
    const created = await createProposalWithParticipants(services, LINKED_TEAM);
    store.proposals[0].status = "under_review";
    // Story 5.4: phân công chỉ cấp quyền đọc khi thuộc vòng nộp hiện hành.
    store.proposals[0].submittedAt = new Date(0);
    store.submissionEvents.push({ id: "event-round", proposalId: created.id, toStatus: "submitted", submittedAt: new Date(0), snapshot: { members: [], attachments: [], requiredPackage: [] } });
    // outsiderUser là thư ký hội đồng: đã nhận lời, hội đồng đã thành lập, không tham gia hồ sơ.
    store.reviewAssignments.push({ id: "assignment-sec", proposalId: created.id, reviewerUserId: outsiderUser.id, assignmentRole: "council_secretary", status: "assigned", invitationStatus: "accepted", councilEstablishedAt: new Date(), reviewedSubmissionEventId: "event-round", assignedAt: new Date(), effectiveFrom: null, effectiveUntil: null, createdAt: new Date() });
    const token = async (user) => (await services.proposalService.getProposal(user, created.id)).viewerAuthorization.contextVersion;
    const upload = async (user, filePurpose) => services.filesService.uploadFile(user, {
      relatedEntityType: "research_proposal", relatedEntityId: created.id, contextVersion: await token(user), filePurpose,
      fileName: "tep.pdf", originalFileName: "tep.pdf", mimeType: "application/pdf", sizeBytes: 512, content: fileBytes(512)
    });

    const material = await upload(secretaryUser, "MEETING_MATERIAL");
    assert.match(services.auditLog.records.at(-1).reason, /purpose=MEETING_MATERIAL relationship=TOPIC_SECRETARY/);
    assert.equal(material.canEdit, false);
    await assert.rejects(async () => services.filesService.deleteFile(secretaryUser, material.id, await token(secretaryUser)), ForbiddenException);
    await assert.rejects(() => upload(secretaryUser, "proposal-form"), ForbiddenException);
    await assert.rejects(() => upload(secretaryUser, "COUNCIL_MINUTES"), ForbiddenException);

    const minutes = await upload(outsiderUser, "COUNCIL_MINUTES");
    assert.match(services.auditLog.records.at(-1).reason, /relationship=COUNCIL_SECRETARY/);
    await assert.rejects(() => upload(outsiderUser, "MEETING_MATERIAL"), ForbiddenException);
    // Thư ký hội đồng là người tham gia hồ sơ bị cổng xung đột chặn.
    store.reviewAssignments.push({ ...store.reviewAssignments[0], id: "assignment-member-sec", reviewerUserId: memberUser.id });
    await assert.rejects(() => upload(memberUser, "COUNCIL_MINUTES"), (error) => error instanceof ForbiddenException && error.getResponse().code === "CONFLICT_DENIED");

    // Người tham gia không thấy và không tải được biên bản; người quản lý ngoài hồ sơ thấy cả hai.
    for (const participant of [piUser, memberUser, secretaryUser]) {
      const ids = (await services.filesService.listFiles(participant, { relatedEntityType: "research_proposal", relatedEntityId: created.id })).map((file) => file.id);
      assert.deepEqual(ids, [material.id]);
      await assert.rejects(() => services.filesService.downloadFile(participant, minutes.id), NotFoundException);
    }
    assert.deepEqual((await services.proposalService.getProposal(headPiUser, created.id)).attachments.map((file) => file.id), [material.id, minutes.id]);
    assert.equal((await services.filesService.downloadFile(headPiUser, minutes.id)).fileName, "tep.pdf");
    const director = { ...staffUser, id: "user-director", username: "giamdoc", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY" };
    assert.equal((await services.filesService.downloadFile(director, minutes.id)).fileName, "tep.pdf");
    // Reviewer thường và PGĐ-KH đọc được hồ sơ nhưng không thấy, không tải được biên bản.
    const plainReviewer = { ...outsiderUser, id: "user-plain-reviewer", username: "reviewer2" };
    store.reviewAssignments.push({ ...store.reviewAssignments[0], id: "assignment-plain", reviewerUserId: plainReviewer.id, assignmentRole: "reviewer" });
    const deputy = { ...staffUser, id: "user-deputy", username: "pgdkh", systemRole: "SCIENCE_DEPUTY_DIRECTOR" };
    for (const viewer of [plainReviewer, deputy]) {
      assert.deepEqual((await services.proposalService.getProposal(viewer, created.id)).attachments.map((file) => file.id), [material.id], viewer.id);
      await assert.rejects(() => services.filesService.downloadFile(viewer, minutes.id), NotFoundException);
    }

    // Thư ký đề tài mang vai trò quản lý vẫn bị cổng xung đột chặn mọi hành động chuyên môn/quyết định.
    const managerSecretary = { ...secretaryUser, systemRole: "RESEARCH_MANAGEMENT_HEAD" };
    const { allowedActions, blockedActions } = (await services.proposalService.getProposal(managerSecretary, created.id)).viewerAuthorization;
    for (const action of ["proposal.review.assign", "proposal.review.consolidate", "proposal.review.finalize", "proposal.review.submit-package"]) {
      assert.equal(blockedActions.find((item) => item.action === action)?.code, "CONFLICT_DENIED", action);
    }
    for (const action of ["proposal.review.submit", "proposal.decision.approve", "proposal.decision.reject"]) assert.equal(allowedActions.includes(action), false, action);

    // Hết hiệu lực thì không tải được nữa, tệp đã tải vẫn giữ.
    const secretaryRow = store.members.find((member) => member.userId === secretaryUser.id);
    secretaryRow.effectiveUntil = new Date(Date.now() - 1000);
    await assert.rejects(() => upload(secretaryUser, "MEETING_MATERIAL"), ForbiddenException);
    assert.equal(store.fileRecords.find((file) => file.id === material.id).status, "active");

    // Kể cả khi hồ sơ quay lại trạng thái cho sửa, PI không sửa/xóa được tệp hành chính.
    store.proposals[0].status = "supplement_requested";
    const deleteToken = await token(piUser);
    await assert.rejects(() => services.filesService.deleteFile(piUser, material.id, deleteToken), BadRequestException);
    // Ngoài `under_review` không nộp được tệp hành chính; ảnh chụp nộp lại không chứa tệp hành chính.
    secretaryRow.effectiveUntil = null;
    for (const status of ["supplement_requested", "ready_for_approval"]) {
      store.proposals[0].status = status;
      await assert.rejects(() => upload(secretaryUser, "MEETING_MATERIAL"), ForbiddenException);
    }
    const snapshot = await services.proposalService.submissionSnapshot(store.proposals[0]);
    assert.equal(snapshot.attachments.some((file) => ["MEETING_MATERIAL", "COUNCIL_MINUTES"].includes(file.filePurpose)), false);
  });

  it("overwrites catalog members from the researcher profile and rejects inactive or duplicate profiles", async () => {
    const { participationService } = createServices();
    const [lan, ext, legacy, manual] = await participationService.resolveMemberAccounts([
      { researcherProfileId: "profile-lan", name: "sai", organization: "sai", userId: "user-outsider", role: "TOPIC_MEMBER" },
      { researcherProfileId: "profile-ext", name: "", organization: "", role: "TOPIC_SECRETARY" },
      { name: "ThS. Trần Thanh Minh", organization: "Phòng KHQS", userId: "user-secretary", role: "TOPIC_MEMBER" },
      { name: "Người ngoài", organization: "Bệnh viện X", role: "TOPIC_MEMBER" }
    ]);
    assert.deepEqual([manual.name, manual.organization, manual.userId, manual.researcherProfileId], ["Người ngoài", "Bệnh viện X", null, null]);
    assert.deepEqual([lan.name, lan.organization, lan.userId, lan.researcherProfileId], ["Nguyễn Thị Lan", "Khoa Toán - Tin học", memberUser.id, "profile-lan"]);
    assert.deepEqual([ext.organization, ext.userId], ["Đại học Y Hà Nội", null]);
    // A legacy row (account linked, no profile) keeps its userId.
    assert.deepEqual([legacy.userId, legacy.researcherProfileId], [secretaryUser.id, null]);

    for (const members of [
      [{ researcherProfileId: "profile-inactive", name: "", organization: "", role: "TOPIC_MEMBER" }],
      [{ researcherProfileId: "profile-missing", name: "", organization: "", role: "TOPIC_MEMBER" }],
      [{ researcherProfileId: "profile-ext", name: "", organization: "", role: "TOPIC_MEMBER" }, { researcherProfileId: "profile-ext", name: "", organization: "", role: "TOPIC_SECRETARY" }]
    ]) {
      await assert.rejects(() => participationService.resolveMemberAccounts(members), BadRequestException);
    }
  });

  it("member lookup matches names only, returns no contact fields, and is limited to proposal creators", async () => {
    const { proposalService } = createServices();
    const items = await proposalService.listMemberCandidates(piUser, "nguyễn");
    assert.deepEqual(items.map((item) => item.id).sort(), ["profile-ext", "profile-lan"]);
    const lan = items.find((item) => item.id === "profile-lan");
    assert.deepEqual(Object.keys(lan).sort(), ["academicDegree", "academicRank", "fullName", "hasAccount", "id", "organization"]);
    assert.equal(lan.hasAccount, true);
    assert.deepEqual(await proposalService.listMemberCandidates(piUser, "n"), []);
    assert.deepEqual(await proposalService.listMemberCandidates(piUser, "khach@example.com"), []);
    await assert.rejects(() => proposalService.listMemberCandidates(adminUser, "nguyen"), ForbiddenException);
  });

  it("Story 4.2: mọi vai trò trừ QT/NNB có hồ sơ liên kết làm được chủ nhiệm; QT, NNB, thiếu hồ sơ bị từ chối và không tạo gì", async () => {
    const services = createServices();
    const intake = await createOpenIntake(services.intakeService);
    const body = { intakePeriodId: intake.id, title: "Tạo bởi vai trò khác", hostOrganizationUnitId: "org-khti" };
    const created = await services.proposalService.createDraft(headPiUser, body);
    assert.equal(created.status, "draft");
    assert.equal(created.ownerId, headPiUser.id);
    for (const actor of [adminUser, externalPiUser, noProfilePiUser]) {
      await assert.rejects(() => services.proposalService.createDraft(actor, body), ForbiddenException);
    }
    assert.equal(services.prisma.store.proposals.length, 1);
  });

  it("rejects a participant naming an account that does not exist without persisting a draft", async () => {
    const services = createServices();

    await assert.rejects(
      () =>
        createProposalWithParticipants(services, [
          { name: "Người không tồn tại", role: "TOPIC_MEMBER", organization: "Khoa Toán - Tin học", username: "khong-ton-tai" }
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
          contextVersion: created.viewerAuthorization.contextVersion,
          members: [{ name: "Người không tồn tại", role: "TOPIC_MEMBER", organization: "K1", username: "khong-ton-tai" }]
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
      contextVersion: created.viewerAuthorization.contextVersion,
      filePurpose: "proposal-form",
      fileName: "thuyet-minh.pdf",
      originalFileName: "thuyet-minh.pdf",
      description: "Thuyết minh đề tài",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      content: fileBytes(2048)
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
    await assert.rejects(() => services.filesService.downloadFile(outsiderUser, uploaded.id), NotFoundException);
    await assert.rejects(
      () => services.filesService.listFiles(outsiderUser, { relatedEntityType: "research_proposal", relatedEntityId: created.id }),
      NotFoundException
    );
    await assert.rejects(() => services.filesService.downloadFile(adminUser, uploaded.id), NotFoundException);

    // Participation grants read only: the participant cannot upload to someone else's draft.
    await assert.rejects(
      () =>
        services.filesService.uploadFile(memberUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: created.id,
          contextVersion: memberView.viewerAuthorization.contextVersion,
          filePurpose: "proposal-form",
          fileName: "gia-mao.pdf",
          originalFileName: "gia-mao.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          content: fileBytes(1024)
        }),
      ForbiddenException
    );
  });

  it("VER-ST-3.0-03: returns the per-record participation role for owner, participant, and unrelated users", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);

    // AC-ST-3.0-02: owner sees the record role, derived from the relationship not the account role.
    const ownerView = await services.proposalService.getProposal(piUser, created.id);
    assert.equal(ownerView.viewerParticipation.role, "PROPOSAL_PI");
    assert.equal(ownerView.viewerParticipation.label, "Chủ nhiệm");
    assert.equal(ownerView.viewerParticipation.isOwner, true);

    // A linked member reads the record it participates in and is labelled as a member...
    const memberView = await services.proposalService.getProposal(memberUser, created.id);
    assert.equal(memberView.viewerParticipation.role, "TOPIC_MEMBER");
    assert.equal(memberView.viewerParticipation.label, "Thành viên");

    // ...even though the same account-level role grants nothing on an unrelated proposal.
    const secretaryView = await services.proposalService.getProposal(secretaryUser, created.id);
    assert.equal(secretaryView.viewerParticipation.role, "TOPIC_SECRETARY");

    // AC-ST-3.0-03: an unrelated user gets no participation role and no participation-derived read.
    await assert.rejects(() => services.proposalService.getProposal(outsiderUser, created.id), ForbiddenException);

    await assert.rejects(() => services.proposalService.getProposal(staffUser, created.id), ForbiddenException);
    const headView = await services.proposalService.getProposal(headPiUser, created.id);
    assert.equal(headView.viewerParticipation.role, "none");
    assert.equal(headView.viewerParticipation.isParticipant, false);
    assert.equal(headView.viewerParticipation.conflict.conflicted, false);
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
      () => services.proposalService.updateDraft(memberUser, created.id, { title: "Đổi tên trái phép", contextVersion: memberView.viewerAuthorization.contextVersion }),
      ForbiddenException
    );
    await assert.rejects(() => services.proposalService.submitProposal(memberUser, created.id, { contextVersion: memberView.viewerAuthorization.contextVersion }), ForbiddenException);

    // Participation on one proposal grants nothing on another proposal.
    const other = await services.proposalService.createDraft(piUser, {
      intakePeriodId: services.prisma.store.intakePeriods[0].id,
      title: "Hồ sơ thứ hai không có sự tham gia",
      hostOrganizationUnitId: "org-khti"
    });
    await assert.rejects(() => services.proposalService.getProposal(memberUser, other.id), ForbiddenException);
  });

  it("Story 4.3: secretary edits only the summary of a draft and cannot submit", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);
    const { proposalService } = services;
    const token = async (user) => (await proposalService.getProposal(user, created.id)).viewerAuthorization.contextVersion;

    const view = await proposalService.getProposal(secretaryUser, created.id);
    assert.equal(view.viewerAuthorization.allowedActions.includes("proposal.draft.update"), true);
    assert.equal(view.viewerAuthorization.allowedActions.includes("proposal.submit"), false);

    const updated = await proposalService.updateDraft(secretaryUser, created.id, { summary: "Tóm tắt do thư ký", contextVersion: await token(secretaryUser) });
    assert.equal(updated.summary, "Tóm tắt do thư ký");

    // Field khác kèm theo: từ chối toàn bộ, tóm tắt không đổi.
    const editToken = await token(secretaryUser);
    await assert.rejects(() => proposalService.updateDraft(secretaryUser, created.id, { summary: "Lén sửa", objectives: "Đổi mục tiêu", contextVersion: editToken }), ForbiddenException);
    assert.equal((await proposalService.getProposal(piUser, created.id)).summary, "Tóm tắt do thư ký");
    const failures = services.auditLog.find("update-proposal-draft").filter((record) => record.result === "failure");
    assert.equal(failures.length >= 1 && failures.every((record) => record.actorId === secretaryUser.id && record.reason === "ACTION_NOT_GRANTED"), true);

    const memberToken = await token(memberUser);
    await assert.rejects(() => proposalService.updateDraft(memberUser, created.id, { summary: "Thành viên sửa", contextVersion: memberToken }), ForbiddenException);
    const submitToken = await token(secretaryUser);
    await assert.rejects(() => proposalService.submitProposal(secretaryUser, created.id, { contextVersion: submitToken }), ForbiddenException);

    // Hồ sơ đã nộp: thư ký không còn quyền sửa.
    await services.prisma.researchProposal.update({ where: { id: created.id }, data: { status: "submitted" } });
    const locked = await proposalService.getProposal(secretaryUser, created.id);
    assert.equal(locked.viewerAuthorization.allowedActions.includes("proposal.draft.update"), false);
    const lockedToken = await token(secretaryUser);
    await assert.rejects(() => proposalService.updateDraft(secretaryUser, created.id, { summary: "Sau khi nộp", contextVersion: lockedToken }), BadRequestException);
  });

  it("Tính chất đề tài: lưu, từ chối mã ngoài catalog và báo thiếu khi chưa chọn", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, []);
    assert.equal(created.proposalNatureCode, "military");

    const noNature = await services.proposalService.createDraft(piUser, {
      intakePeriodId: created.intakePeriodId, title: "Chưa chọn tính chất", hostOrganizationUnitId: "org-khti"
    });
    const readiness = await services.proposalService.getReadiness(piUser, noNature.id);
    assert.equal(readiness.missingFields.some((item) => item.label === "Tính chất đề tài"), true);

    services.prisma.catalogItem.findFirst = async ({ where }) => (where.type === "proposal-nature" ? null : { id: "catalog-stub" });
    await assert.rejects(
      () => services.proposalService.createDraft(piUser, { intakePeriodId: created.intakePeriodId, title: "Sai tính chất", hostOrganizationUnitId: "org-khti", proposalNatureCode: "bogus" }),
      (error) => error instanceof BadRequestException && error.getResponse().field === "proposalNatureCode"
    );
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
      await assert.rejects(() => services.proposalService.updateDraft(actor, created.id, { title: "Chiếm quyền", contextVersion: created.viewerAuthorization.contextVersion }), ForbiddenException);
      await assert.rejects(() => services.proposalService.submitProposal(actor, created.id, { contextVersion: created.viewerAuthorization.contextVersion }), ForbiddenException);
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
    assert.equal(memberList[0].viewerParticipation.role, "TOPIC_MEMBER");

    const outsiderList = await services.proposalService.listProposals(outsiderUser);
    assert.equal(outsiderList.length, 0);

    const staffList = await services.proposalService.listProposals(staffUser);
    assert.deepEqual(staffList, []);
    const headList = await services.proposalService.listProposals(headPiUser);
    assert.equal(headList.length, 1);
    assert.equal(headList[0].viewerParticipation.role, "none");
  });

  it("Story 1.8: list and detail expose the same viewer capability without leaking other actors", async () => {
    const services = createServices();
    const created = await createProposalWithParticipants(services, LINKED_TEAM);
    const [listView] = await services.proposalService.listProposals(memberUser);
    const detailView = await services.proposalService.getProposal(memberUser, created.id);

    assert.deepEqual(listView.viewerAuthorization, detailView.viewerAuthorization);
    assert.deepEqual(detailView.viewerAuthorization.viewerRelationships.map((relationship) => relationship.type), ["TOPIC_MEMBER"]);
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
      [piUser, "PROPOSAL_PI"],
      [memberUser, "TOPIC_MEMBER"],
      [secretaryUser, "TOPIC_SECRETARY"]
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
    assert.equal(links.length, 2, "one entry per newly linked team account");
    assert.deepEqual(
      links.map((entry) => JSON.parse(entry.reason).linkedUserId).sort(),
      [memberUser.id, secretaryUser.id].sort()
    );
    for (const entry of links) {
      assert.equal(entry.actorId, piUser.id);
      assert.equal(entry.targetEntity, "proposal-participation");
      assert.equal(entry.targetEntityId, created.id);
    }

    const changes = services.auditLog.find("update-proposal-participation");
    assert.equal(changes.length, 1);
    assert.equal(JSON.parse(changes[0].reason).nextCount, 3);

    const initial = await services.proposalService.getProposal(piUser, created.id);
    await assert.rejects(
      () => services.proposalService.updateDraft(piUser, created.id, {
        members: [
          { name: "ThS. Nguyễn Thị Lan", role: "TOPIC_SECRETARY", organization: "Khoa Toán - Tin học", username: "ntlan" },
          { name: "ThS. Trần Thanh Minh", role: "TOPIC_SECRETARY", organization: "Phòng KHQS", username: "ttminh" }
        ],
        contextVersion: initial.viewerAuthorization.contextVersion
      }),
      BadRequestException
    );

    // Removing a participant is captured as an unlink, not silently dropped.
    const current = await services.proposalService.getProposal(piUser, created.id);
    await services.proposalService.updateDraft(piUser, created.id, {
      members: [{ name: "GS. Đối tác ngoài viện", role: "TOPIC_MEMBER", organization: "Đại học Y Hà Nội" }],
      contextVersion: current.viewerAuthorization.contextVersion
    });

    const latestChange = JSON.parse(services.auditLog.find("update-proposal-participation").at(-1).reason);
    assert.equal(latestChange.previousCount, 3);
    assert.equal(latestChange.nextCount, 1);
    assert.deepEqual(latestChange.unlinkedUserIds.sort(), [memberUser.id, secretaryUser.id].sort());

    // The unlinked member loses the record-scoped read that participation had granted.
    await assert.rejects(() => services.proposalService.getProposal(memberUser, created.id), ForbiddenException);
  });

  it("normalizes only canonical team roles and recognized legacy team labels", () => {
    assert.equal(normalizeParticipationRole("TOPIC_SECRETARY"), "TOPIC_SECRETARY");
    assert.equal(normalizeParticipationRole("Thư ký khoa học"), "TOPIC_SECRETARY");
    assert.equal(normalizeParticipationRole("TOPIC_MEMBER"), "TOPIC_MEMBER");
    assert.equal(normalizeParticipationRole("Thành viên"), "TOPIC_MEMBER");
    assert.equal(normalizeParticipationRole("PROPOSAL_PI"), "unknown");
    assert.equal(normalizeParticipationRole("Đồng chủ nhiệm đề tài"), "unknown");
    assert.equal(normalizeParticipationRole(undefined), "unknown");
  });

  it("derives the PI only from ownership and ignores owner team rows", () => {
    const participation = resolveProposalParticipation({
      userId: "user-pi",
      proposal: { ownerId: "user-pi" },
      members: [
        { userId: "user-pi", participationRole: "TOPIC_SECRETARY" },
        { userId: "user-pi", participationRole: "TOPIC_MEMBER" },
        { userId: "user-other", participationRole: "TOPIC_MEMBER" }
      ]
    });

    assert.equal(participation.role, "PROPOSAL_PI");
    assert.deepEqual(participation.roles, ["PROPOSAL_PI"]);
    assert.deepEqual(participation.labels, ["Chủ nhiệm"]);
    assert.equal(participation.isOwner, true);
  });

  it("does not treat an unlinked descriptive participant as a participation match", () => {
    const participation = resolveProposalParticipation({
      userId: "user-outsider",
      proposal: { ownerId: "user-pi" },
      members: [{ userId: null, participationRole: "TOPIC_MEMBER" }]
    });

    assert.equal(participation.role, "none");
    assert.equal(participation.isParticipant, false);
    assert.equal(evaluateProposalConflict(participation).conflicted, false);
  });
});
