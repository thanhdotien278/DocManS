import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ProposalDecisionsService } from "../dist/apps/api/proposal-evaluations/proposal-decisions.service.js";
import { ProposalEvaluationSummaryService } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js";
import { ProposalReviewAssignmentsService } from "../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js";
import { ProposalReviewsService } from "../dist/apps/api/proposal-evaluations/proposal-reviews.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { createEvaluationTables, createUserLookup } from "./helpers/evaluation-prisma.mjs";

const ORG_KHTI = "org-khti";

const staffUser = {
  id: "user-staff",
  username: "nmphuong",
  displayName: "TS. Nguyễn Minh Phương",
  status: "active",
  role: "scientific-management",
  systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
  roleLabel: "Trưởng phòng",
  unit: "Phòng KHQS",
  roles: ["scientific-management"],
  organizationScopes: [
    { id: "org-khqs", code: "KHQS", name: "Phòng KHQS" },
    { id: ORG_KHTI, code: "KHTI", name: "Khoa Toán - Tin học" }
  ]
};

/** Scientific management staff outside the proposal's host unit — AC-ST-3.4-03. */
const outOfScopeStaffUser = {
  ...staffUser,
  id: "user-staff-other",
  username: "hdtien2",
  displayName: "HD Tiến 2",
  organizationScopes: [{ id: "org-khqs", code: "KHQS", name: "Phòng KHQS" }]
};

const piUser = {
  ...staffUser,
  id: "user-pi",
  username: "patuan",
  displayName: "TS. Phạm Anh Tuấn",
  role: "principal-investigator",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Chủ nhiệm đề tài",
  unit: "Khoa Toán - Tin học",
  roles: ["principal-investigator"],
  organizationScopes: [{ id: ORG_KHTI, code: "KHTI", name: "Khoa Toán - Tin học" }]
};

const leadershipUser = {
  ...piUser,
  id: "user-leadership",
  username: "tvtien",
  displayName: "GS. TS. Trần Viết Tiến",
  role: "leadership",
  systemRole: "LEADERSHIP_APPROVAL_AUTHORITY",
  roleLabel: "Giám Đốc",
  unit: "Ban Giám Đốc",
  roles: ["leadership"],
  organizationScopes: [
    { id: "org-bgd", code: "BGD", name: "Ban Giám Đốc" },
    { id: ORG_KHTI, code: "KHTI", name: "Khoa Toán - Tin học" }
  ]
};

/** Leadership who is also a linked participant on the proposal — AC-ST-3.5-04. */
const conflictedLeadershipUser = {
  ...leadershipUser,
  id: "user-leadership-member",
  username: "ldthanhvien",
  displayName: "PGS. Lãnh đạo kiêm thành viên"
};

const reviewerUser = {
  ...piUser,
  id: "user-reviewer",
  username: "nmtrung",
  displayName: "TS. Đỗ Minh Trung",
  role: "reviewer",
  systemRole: "RESEARCHER_INTERNAL_USER",
  roleLabel: "Thành viên Hội đồng",
  unit: "Ban Quản lý KHQS",
  roles: ["reviewer"]
};

const secondReviewerUser = {
  ...reviewerUser,
  id: "user-reviewer-2",
  username: "lthoa",
  displayName: "TS. Lê Thị Hoa"
};

/** Holds the `reviewer` account role but no assignment on the proposal — AC-ST-3.2-02. */
const unassignedReviewerUser = {
  ...reviewerUser,
  id: "user-reviewer-outsider",
  username: "lvhung",
  displayName: "TS. Lê Văn Hùng"
};

/** A council-member account only becomes a reviewer through an explicit proposal assignment. */
const councilMemberUser = {
  ...reviewerUser,
  id: "user-council-member",
  username: "hdtien3",
  displayName: "TS. Thành viên Hội đồng",
  role: "council-member",
  roles: ["council-member"]
};

/** Linked as an ordinary participant of the proposal — a conflicted reviewer candidate. */
const memberUser = {
  ...reviewerUser,
  id: "user-member",
  username: "ntlan",
  displayName: "ThS. Nguyễn Thị Lan"
};

/** Linked as the scientific secretary of the proposal — also conflicted. */
const secretaryUser = {
  ...reviewerUser,
  id: "user-secretary",
  username: "ttminh",
  displayName: "ThS. Trần Thanh Minh"
};

const ACCOUNTS = [
  staffUser,
  outOfScopeStaffUser,
  piUser,
  leadershipUser,
  conflictedLeadershipUser,
  reviewerUser,
  secondReviewerUser,
  unassignedReviewerUser,
  councilMemberUser,
  memberUser,
  secretaryUser
];

const TEAM = [
  { name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học", username: "patuan" },
  { name: "ThS. Nguyễn Thị Lan", role: "Thành viên", organization: "Khoa Toán - Tin học", username: "ntlan" },
  { name: "ThS. Trần Thanh Minh", role: "Thư ký khoa học", organization: "Phòng KHQS", username: "ttminh" }
];

const FULL_SCORES = {
  "scientific-value": 26,
  feasibility: 20,
  "practical-impact": 21,
  "budget-suitability": 16
};

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
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.proposals.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.proposals.findIndex((item) => item.id === where.id);
        store.proposals[index] = { ...store.proposals[index], ...data, updatedAt: new Date() };
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
        return store.members.filter((item) => proposalIds.includes(item.proposalId) && (!where?.userId || item.userId === where.userId));
      }
    },
    user: {
      ...createUserLookup(ACCOUNTS),
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
          uploadedBy: { displayName: "TS. Phạm Anh Tuấn" },
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
      },
      async findFirst() {
        return null;
      }
    },
    auditLog: {
      async create({ data }) {
        const record = { id: nextId("audit", store.auditLogs), timestamp: new Date(), ...data };
        store.auditLogs.push(record);
        return record;
      }
    },
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
  const participation = new ProposalParticipationService(prisma);
  const reviewAccess = new ProposalReviewAccessService(prisma);
  const objectStorage = createObjectStorage();

  const assignments = new ProposalReviewAssignmentsService(prisma, auditLog, participation, reviewAccess);
  const reviews = new ProposalReviewsService(prisma, auditLog, reviewAccess, participation);
  const summaries = new ProposalEvaluationSummaryService(prisma, auditLog, assignments, reviews, participation, reviewAccess);
  const decisions = new ProposalDecisionsService(prisma, auditLog, participation, reviewAccess, assignments, reviews, summaries);

  return {
    prisma,
    auditLog,
    objectStorage,
    intakeService: new ProposalIntakePeriodsService(prisma, auditLog),
    proposalService: new ResearchProposalsService(prisma, auditLog, participation, reviewAccess),
    filesService: new FilesService(prisma, objectStorage, auditLog, participation, reviewAccess, {
      maxFileSizeBytes: 1024 * 1024,
      allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx"]
    }),
    assignments,
    reviews,
    summaries,
    decisions
  };
}

/** A proposal that has been formally submitted — the entry state for every EP-03 operation. */
async function createSubmittedProposal(services, { members = TEAM } = {}) {
  const intake = await services.intakeService.createPeriod(staffUser, {
    code: "INTAKE-2026",
    title: "Đợt tiếp nhận 2026",
    description: "Đợt tiếp nhận hồ sơ cấp Học viện",
    startsAt: futureDate(-1),
    endsAt: futureDate(15),
    applicableOrganizationUnitId: ORG_KHTI,
    requiredPackage: [{ code: "proposal-form", label: "Thuyết minh đề tài", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 }]
  });
  await services.intakeService.openPeriod(staffUser, intake.id);

  const draft = await services.proposalService.createDraft(piUser, {
    intakePeriodId: intake.id,
    title: "Nghiên cứu ứng dụng AI trong y học quân sự",
    hostOrganizationUnitId: ORG_KHTI,
    researchFieldCode: "biomedical-tech",
    proposalTypeCode: "academy-level",
    startDate: futureDate(30),
    endDate: futureDate(210),
    objectives: "Xây dựng mô hình thử nghiệm hỗ trợ phân tích dữ liệu.",
    summary: "Đề tài nghiên cứu ứng dụng AI với phạm vi thử nghiệm nội bộ.",
    budgetMetadata: { amount: 120000000, currency: "VND" },
    members
  });

  const content = Buffer.from("thuyet minh de tai");
  await services.filesService.uploadFile(piUser, {
    relatedEntityType: "research_proposal",
    relatedEntityId: draft.id,
    filePurpose: "proposal-form",
    fileName: "thuyet-minh.pdf",
    originalFileName: "thuyet-minh.pdf",
    mimeType: "application/pdf",
    sizeBytes: content.length,
    content
  });

  return services.proposalService.submitProposal(piUser, draft.id);
}

/** Submitted -> under review with one assigned reviewer. */
async function createProposalUnderReview(services, options) {
  const proposal = await createSubmittedProposal(services, options);
  const assignment = await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: reviewerUser.username });
  return { proposal, assignment };
}

/** Under review -> ready for approval with the single reviewer's score submitted and consolidated. */
async function createProposalReadyForApproval(services, options) {
  const { proposal, assignment } = await createProposalUnderReview(services, options);

  await services.reviews.submitMyReview(reviewerUser, proposal.id, {
    scoreData: FULL_SCORES,
    comment: "Đề tài có giá trị khoa học và khả thi trong phạm vi Học viện.",
    recommendation: "approve"
  });

  await services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
    summary: "Hội đồng thống nhất đề nghị phê duyệt đề tài.",
    recommendation: "approve",
    markReady: true
  });

  return { proposal, assignment };
}

describe("ST-3.2 reviewer assignment and assignment-scoped proposal access", () => {
  it("AC-ST-3.2-01: staff assigns a reviewer, the proposal opens the evaluation phase, and it is auditable", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    const assignment = await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUsername: reviewerUser.username,
      assignmentRole: "committee_member",
      dueDate: futureDate(10)
    });

    assert.equal(assignment.reviewerUserId, reviewerUser.id);
    assert.equal(assignment.reviewerDisplayName, reviewerUser.displayName);
    assert.equal(assignment.assignmentRole, "committee_member");
    assert.equal(assignment.assignmentRoleLabel, "Thành viên hội đồng");
    assert.equal(assignment.status, "assigned");
    assert.equal(assignment.assignedById, staffUser.id);
    assert.notEqual(assignment.dueDate, "");

    // The first assignment is what moves the proposal into the evaluation phase.
    const stored = services.prisma.store.proposals.find((item) => item.id === proposal.id);
    assert.equal(stored.status, "under_review");

    const transition = services.prisma.store.submissionEvents.at(-1);
    assert.equal(transition.fromStatus, "submitted");
    assert.equal(transition.toStatus, "under_review");
    assert.equal(transition.actorId, staffUser.id);

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "assign-reviewer");
    assert.equal(audit.length, 1);
    assert.equal(audit[0].result, "success");
    assert.equal(JSON.parse(audit[0].reason).reviewerUserId, reviewerUser.id);
  });

  it("a second assignment joins the open round without rewriting the proposal status", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);
    const eventsBefore = services.prisma.store.submissionEvents.length;

    await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: secondReviewerUser.username });

    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "under_review");
    assert.equal(services.prisma.store.submissionEvents.length, eventsBefore);
    assert.equal((await services.assignments.listAssignments(staffUser, proposal.id)).length, 2);
  });

  it("AC-ST-3.2-01/02: only the assigned reviewer reads the proposal, the package, and its files", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    // Assignment-scoped read of the proposal record itself.
    const detail = await services.proposalService.getProposal(reviewerUser, proposal.id);
    assert.equal(detail.id, proposal.id);
    assert.equal(detail.viewerReviewAssignment.isAssignedReviewer, true);
    assert.equal(detail.viewerReviewAssignment.assignmentRoleLabel, "Người phản biện");
    // Assignment grants read only — it never turns into an edit right.
    assert.equal(detail.canEdit, false);
    assert.equal(detail.canSubmit, false);

    const reviewPackage = await services.assignments.getReviewPackage(reviewerUser, proposal.id);
    assert.equal(reviewPackage.proposal.id, proposal.id);
    assert.equal(reviewPackage.attachments.length, 1);
    assert.equal(reviewPackage.members.length, TEAM.length);
    // The reviewer package must not carry participant account ids.
    assert.equal(Object.hasOwn(reviewPackage.members[0], "userId"), false);

    // The file read path agrees with the proposal read path.
    const files = await services.filesService.listFiles(reviewerUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: proposal.id
    });
    assert.equal(files.length, 1);
    const downloaded = await services.filesService.downloadFile(reviewerUser, files[0].id);
    assert.equal(downloaded.content.toString(), "thuyet minh de tai");

    // AC-ST-3.2-02: the same account role with no assignment gets nothing, and leaks no metadata.
    await assert.rejects(() => services.proposalService.getProposal(unassignedReviewerUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.assignments.getReviewPackage(unassignedReviewerUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.filesService.downloadFile(unassignedReviewerUser, files[0].id), ForbiddenException);
    assert.deepEqual(await services.proposalService.listProposals(unassignedReviewerUser), []);

    // A council-member label is also inert until an explicit committee assignment exists.
    await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUsername: councilMemberUser.username,
      assignmentRole: "committee_member"
    });
    const councilPackage = await services.assignments.getReviewPackage(councilMemberUser, proposal.id);
    assert.equal(councilPackage.assignmentRole, "committee_member");

    // The reviewer queue lists only assigned records.
    const queue = await services.assignments.listMyAssignments(reviewerUser);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].proposal.id, proposal.id);
    assert.equal(queue[0].myReviewStatus, "draft");
    assert.deepEqual(await services.assignments.listMyAssignments(unassignedReviewerUser), []);
  });

  it("AC-ST-3.2-03: revoking keeps assignment history, stops access, and allows reassignment", async () => {
    const services = createServices();
    const { proposal, assignment } = await createProposalUnderReview(services);

    const revoked = await services.assignments.revokeAssignment(staffUser, proposal.id, assignment.id, { reason: "Đổi người phản biện" });
    assert.equal(revoked.status, "revoked");
    assert.notEqual(revoked.revokedAt, "");

    // History is retained rather than deleted.
    const history = await services.assignments.listAssignments(staffUser, proposal.id);
    assert.equal(history.length, 1);
    assert.equal(history[0].id, assignment.id);
    assert.equal(history[0].status, "revoked");

    // Access stops immediately with the revoke.
    await assert.rejects(() => services.proposalService.getProposal(reviewerUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.assignments.getReviewPackage(reviewerUser, proposal.id), ForbiddenException);
    assert.deepEqual(await services.assignments.listMyAssignments(reviewerUser), []);

    // A fresh assignment for a different reviewer takes effect alongside the retained history.
    const replacement = await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUsername: secondReviewerUser.username
    });
    assert.equal(replacement.status, "assigned");
    assert.equal((await services.assignments.listAssignments(staffUser, proposal.id)).length, 2);

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "change-reviewer-assignment");
    assert.equal(audit.length, 1);
    assert.equal(JSON.parse(audit[0].reason).toStatus, "revoked");
  });

  it("AC-ST-3.2-04: PI, participant, and scientific secretary are blocked as reviewer candidates", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    for (const candidate of [piUser, memberUser, secretaryUser]) {
      await assert.rejects(
        () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: candidate.username }),
        BadRequestException,
        `${candidate.username} must be rejected as a conflicted candidate`
      );
    }

    // No assignment, no reviewer permission, no state change — only the denial trail.
    assert.equal(services.prisma.store.reviewAssignments.length, 0);
    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "submitted");
    assert.equal(services.auditLog.find("assign-reviewer").length, 3);
    assert.equal(
      services.auditLog.find("assign-reviewer").every((record) => record.result === "failure"),
      true
    );
    assert.equal(JSON.parse(services.auditLog.find("assign-reviewer")[0].reason).reasonCode, "participation");
  });

  it("Story 1.9: an active staff secretary cannot bypass the capability response to assign a reviewer", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services, {
      members: [...TEAM, { name: staffUser.displayName, role: "Thư ký khoa học", organization: "Phòng KHQS", username: staffUser.username }]
    });

    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: reviewerUser.username }),
      ForbiddenException
    );
    assert.equal(services.prisma.store.reviewAssignments.length, 0);
  });

  it("AC-ST-3.2-01: authorization and workflow state are enforced fail-closed", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    // Non-staff cannot assign.
    for (const actor of [piUser, reviewerUser, leadershipUser]) {
      await assert.rejects(
        () => services.assignments.assignReviewer(actor, proposal.id, { reviewerUsername: reviewerUser.username }),
        ForbiddenException
      );
    }

    // Staff outside the host unit scope cannot assign.
    await assert.rejects(
      () => services.assignments.assignReviewer(outOfScopeStaffUser, proposal.id, { reviewerUsername: reviewerUser.username }),
      ForbiddenException
    );

    // An unknown account is rejected before anything is written.
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: "khong-ton-tai" }),
      BadRequestException
    );

    // A draft proposal is not assignable.
    const draft = services.prisma.store.proposals.find((item) => item.id === proposal.id);
    draft.status = "draft";
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: reviewerUser.username }),
      BadRequestException
    );

    assert.equal(services.prisma.store.reviewAssignments.length, 0);
  });
});

describe("ST-3.3 reviewer scoring and comments", () => {
  it("AC-ST-3.3-01/03: an assigned reviewer submits a review that staff can see as completed", async () => {
    const services = createServices();
    const { proposal, assignment } = await createProposalUnderReview(services);

    const draft = await services.reviews.saveMyReview(reviewerUser, proposal.id, {
      scoreData: { "scientific-value": 20 },
      comment: "Ghi chú tạm thời"
    });
    assert.equal(draft.status, "draft");
    assert.equal(draft.canEdit, true);
    // A draft save is deliberately not audited — only the submit is.
    assert.equal(services.prisma.store.auditLogs.filter((r) => r.action === "submit-score-and-review-comment").length, 0);

    const submitted = await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Đề tài có giá trị khoa học rõ ràng và khả thi.",
      recommendation: "approve"
    });

    assert.equal(submitted.status, "submitted");
    assert.equal(submitted.canEdit, false);
    assert.equal(submitted.totalScore, 83);
    assert.equal(submitted.recommendation, "approve");
    assert.equal(submitted.recommendationLabel, "Đề nghị phê duyệt");
    assert.notEqual(submitted.submittedAt, "");

    // The assignment closes with the review, and the timeline records the submission.
    assert.equal(services.prisma.store.reviewAssignments.find((item) => item.id === assignment.id).status, "completed");
    assert.equal(services.prisma.store.submissionEvents.at(-1).note, "Người đánh giá gửi phiếu chấm điểm và nhận xét");

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "submit-score-and-review-comment");
    assert.equal(audit.length, 1);
    assert.equal(JSON.parse(audit[0].reason).totalScore, 83);

    // AC-ST-3.3-03: staff read completion without touching the review rows.
    const progress = await services.summaries.getReviewProgress(staffUser, proposal.id);
    assert.equal(progress.submittedCount, 1);
    assert.equal(progress.pendingCount, 0);
    assert.equal(progress.allReviewsSubmitted, true);
    assert.equal(progress.reviews[0].reviewerDisplayName, reviewerUser.displayName);
    assert.equal(progress.averageTotalScore, 83);
  });

  it("AC-ST-3.3-02: incomplete or out-of-range scoring blocks the submit and saves nothing", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    // Missing every criterion, comment and recommendation.
    await assert.rejects(() => services.reviews.submitMyReview(reviewerUser, proposal.id, {}), BadRequestException);

    // Missing only the recommendation.
    await assert.rejects(
      () => services.reviews.submitMyReview(reviewerUser, proposal.id, { scoreData: FULL_SCORES, comment: "Nhận xét đầy đủ." }),
      BadRequestException
    );

    // Missing only the comment.
    await assert.rejects(
      () => services.reviews.submitMyReview(reviewerUser, proposal.id, { scoreData: FULL_SCORES, recommendation: "approve" }),
      BadRequestException
    );

    // Out of range for the criterion's max score, even on a draft save.
    await assert.rejects(
      () => services.reviews.saveMyReview(reviewerUser, proposal.id, { scoreData: { "scientific-value": 99 } }),
      BadRequestException
    );

    assert.equal(services.prisma.store.reviews.length, 0);
    assert.equal(services.prisma.store.auditLogs.filter((r) => r.action === "submit-score-and-review-comment").length, 0);

    // The field-level detail the UI needs is on the error body.
    const error = await services.reviews.submitMyReview(reviewerUser, proposal.id, {}).catch((thrown) => thrown);
    const response = error.getResponse();
    assert.equal(typeof response.fieldErrors.scoreData, "string");
    assert.equal(response.fieldErrors.comment, "Nhập nhận xét đánh giá.");
    assert.equal(response.fieldErrors.recommendation, "Chọn kết luận đề nghị.");
  });

  it("AC-ST-3.3-04: unassigned reviewers are blocked and submitted reviews are immutable", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);
    await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: secondReviewerUser.username });

    // An unassigned reviewer cannot read, draft, or submit a review.
    for (const call of [
      () => services.reviews.getMyReview(unassignedReviewerUser, proposal.id),
      () => services.reviews.saveMyReview(unassignedReviewerUser, proposal.id, { comment: "x" }),
      () => services.reviews.submitMyReview(unassignedReviewerUser, proposal.id, { scoreData: FULL_SCORES, comment: "x", recommendation: "approve" })
    ]) {
      await assert.rejects(call, ForbiddenException);
    }

    // Neither can staff, the PI, or leadership — the review belongs to the assignment.
    for (const actor of [staffUser, piUser, leadershipUser]) {
      await assert.rejects(() => services.reviews.getMyReview(actor, proposal.id), ForbiddenException);
    }

    await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Nhận xét của phản biện 1.",
      recommendation: "approve"
    });

    // The second reviewer writes their own row rather than overwriting the first.
    await services.reviews.submitMyReview(secondReviewerUser, proposal.id, {
      scoreData: { ...FULL_SCORES, feasibility: 10 },
      comment: "Nhận xét của phản biện 2.",
      recommendation: "revise"
    });

    assert.equal(services.prisma.store.reviews.length, 2);
    const [first, second] = services.prisma.store.reviews;
    assert.equal(first.reviewerUserId, reviewerUser.id);
    assert.equal(second.reviewerUserId, secondReviewerUser.id);
    assert.notEqual(first.assignmentId, second.assignmentId);
    assert.equal(first.comment, "Nhận xét của phản biện 1.");

    // A submitted review is closed to further edits.
    await assert.rejects(
      () => services.reviews.saveMyReview(reviewerUser, proposal.id, { comment: "Sửa lại sau khi gửi" }),
      BadRequestException
    );
    await assert.rejects(
      () => services.reviews.submitMyReview(reviewerUser, proposal.id, { scoreData: FULL_SCORES, comment: "y", recommendation: "reject" }),
      BadRequestException
    );
    assert.equal(services.prisma.store.reviews[0].comment, "Nhận xét của phản biện 1.");
  });

  it("Story 1.9: a reviewer who becomes a secretary cannot save or submit a review", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);
    services.prisma.store.members.push({
      id: "member-reviewer-secretary",
      proposalId: proposal.id,
      userId: reviewerUser.id,
      name: reviewerUser.displayName,
      role: "Thư ký khoa học",
      participationRole: "secretary",
      organization: "Phòng KHQS",
      status: "ACTIVE",
      effectiveFrom: new Date(Date.now() - 1000),
      effectiveUntil: null,
      createdAt: new Date()
    });

    await assert.rejects(() => services.reviews.saveMyReview(reviewerUser, proposal.id, { comment: "Không được phép" }), ForbiddenException);
    await assert.rejects(
      () => services.reviews.submitMyReview(reviewerUser, proposal.id, { scoreData: FULL_SCORES, comment: "Không được phép", recommendation: "approve" }),
      ForbiddenException
    );
  });
});

describe("EP-03 hardening found by adversarial review", () => {
  it("rejects non-numeric score values instead of coercing them", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    // Number(true) === 1 and Number([5]) === 5, so a bare coercion would store a score nobody entered.
    for (const bogus of [true, [5], { value: 5 }, "5.5", "abc", {}]) {
      await assert.rejects(
        () => services.reviews.saveMyReview(reviewerUser, proposal.id, { scoreData: { "scientific-value": bogus } }),
        BadRequestException,
        `${JSON.stringify(bogus)} must not be accepted as a score`
      );
    }

    // A decimal string from an HTML number input is still accepted when it is a whole number.
    const saved = await services.reviews.saveMyReview(reviewerUser, proposal.id, { scoreData: { "scientific-value": "26" } });
    assert.equal(saved.scoreData["scientific-value"], 26);
  });

  it("a draft save keeps fields the payload omits", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    await services.reviews.saveMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Nhận xét đã lưu.",
      recommendation: "approve"
    });

    // A payload carrying only the comment must not erase the scores or the recommendation.
    const afterPartial = await services.reviews.saveMyReview(reviewerUser, proposal.id, { comment: "Nhận xét đã sửa." });
    assert.equal(afterPartial.comment, "Nhận xét đã sửa.");
    assert.equal(afterPartial.recommendation, "approve");
    assert.equal(afterPartial.totalScore, 83);
    assert.deepEqual(afterPartial.scoreData, FULL_SCORES);
  });

  it("scopes the evaluation read surfaces to the staff member's organization", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    // AC-ST-3.4-03: the read side must be scoped as tightly as the write side, or out-of-scope
    // staff could read every reviewer's name and score for a unit they do not operate.
    await assert.rejects(() => services.summaries.getReviewProgress(outOfScopeStaffUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.assignments.listAssignments(outOfScopeStaffUser, proposal.id), ForbiddenException);

    // In-scope staff and leadership still read it.
    assert.equal((await services.summaries.getReviewProgress(staffUser, proposal.id)).activeAssignmentCount, 1);
    assert.equal((await services.assignments.listAssignments(leadershipUser, proposal.id)).length, 1);
  });

  it("refuses to assign a reviewer who has already reviewed the proposal", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);
    await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Đã gửi phiếu.",
      recommendation: "approve"
    });

    // The assignment is now `completed`. Re-assigning would count the reviewer twice in the round
    // and ask them for a second review; re-review needs an explicit later policy.
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: reviewerUser.username }),
      BadRequestException
    );
    assert.equal(services.prisma.store.reviewAssignments.length, 1);
    assert.equal((await services.summaries.getReviewProgress(staffUser, proposal.id)).activeAssignmentCount, 1);
  });

  it("blocks the staff self-review-then-self-consolidate path", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    // Staff naming themselves would let one person review and then consolidate their own review.
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: staffUser.username }),
      BadRequestException
    );
    assert.equal(services.prisma.store.reviewAssignments.length, 0);

    // Even if a second staff member assigns them, they cannot then write the consolidated outcome.
    const collaborator = { ...staffUser, id: "user-staff-2", username: "hdtien1", displayName: "HD Tiến 1" };
    ACCOUNTS.push(collaborator);
    try {
      await services.assignments.assignReviewer(collaborator, proposal.id, { reviewerUsername: staffUser.username });
      await services.reviews.submitMyReview(staffUser, proposal.id, {
        scoreData: FULL_SCORES,
        comment: "Nhận xét của chuyên viên được phân công.",
        recommendation: "approve"
      });

      await assert.rejects(
        () =>
          services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
            summary: "Tự tổng hợp phiếu của chính mình.",
            recommendation: "approve",
            markReady: true
          }),
        BadRequestException
      );
      assert.equal(services.prisma.store.evaluationSummaries.length, 0);
      assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "under_review");

      // An uninvolved staff member still consolidates normally.
      const consolidated = await services.summaries.saveEvaluationSummary(collaborator, proposal.id, {
        summary: "Tổng hợp bởi chuyên viên không tham gia đánh giá.",
        recommendation: "approve",
        markReady: true
      });
      assert.equal(consolidated.proposalStatus, "ready_for_approval");
    } finally {
      ACCOUNTS.pop();
    }
  });

  it("the evaluation read models do not report on a draft proposal", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);
    // Force the proposal back to draft: the evaluation reads must refuse it the same way the
    // proposal read does, instead of leaking its existence and attachment count.
    services.prisma.store.proposals.find((item) => item.id === proposal.id).status = "draft";

    for (const actor of [staffUser, leadershipUser]) {
      await assert.rejects(() => services.summaries.getReviewProgress(actor, proposal.id), ForbiddenException);
      await assert.rejects(() => services.assignments.listAssignments(actor, proposal.id), ForbiddenException);
    }
    await assert.rejects(() => services.decisions.getDecisionPackage(leadershipUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.proposalService.getProposal(leadershipUser, proposal.id), ForbiddenException);
  });

  it("a transition loses when the proposal status changed under it", async () => {
    const services = createServices();
    const { proposal } = await createProposalReadyForApproval(services);

    // Simulate the interleaving: the decision validated `ready_for_approval`, but another writer
    // committed first. The guarded update matches zero rows, so the second decision is refused.
    const stored = services.prisma.store.proposals.find((item) => item.id === proposal.id);
    const originalUpdateMany = services.prisma.researchProposal.updateMany;
    services.prisma.researchProposal.updateMany = async (args) => {
      stored.status = "approved";
      services.prisma.researchProposal.updateMany = originalUpdateMany;
      return originalUpdateMany.call(services.prisma.researchProposal, args);
    };

    await assert.rejects(() => services.decisions.decide(leadershipUser, proposal.id, "rejected", { note: "Từ chối" }), BadRequestException);
    assert.equal(services.prisma.store.decisions.length, 0);
    assert.equal(stored.status, "approved");
  });
});

describe("ST-3.4 evaluation progress and consolidation", () => {
  it("AC-ST-3.4-01: staff see per-reviewer completion and can tell whether consolidation can start", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);
    await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUsername: secondReviewerUser.username });

    const before = await services.summaries.getReviewProgress(staffUser, proposal.id);
    assert.equal(before.activeAssignmentCount, 2);
    assert.equal(before.submittedCount, 0);
    assert.equal(before.pendingCount, 2);
    assert.equal(before.allReviewsSubmitted, false);
    assert.deepEqual(
      before.pendingReviewers.map((item) => item.reviewerDisplayName).sort(),
      [reviewerUser.displayName, secondReviewerUser.displayName].sort()
    );
    assert.equal(before.evaluationSummary, null);

    await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Đồng ý đề nghị phê duyệt.",
      recommendation: "approve"
    });

    const midway = await services.summaries.getReviewProgress(staffUser, proposal.id);
    assert.equal(midway.submittedCount, 1);
    assert.equal(midway.pendingCount, 1);
    assert.equal(midway.allReviewsSubmitted, false);
    assert.equal(midway.pendingReviewers[0].reviewerDisplayName, secondReviewerUser.displayName);
    // Only submitted reviews are exposed; a colleague's unsent draft is not readable.
    assert.equal(midway.reviews.length, 1);

    // A revoked assignment must not hold the round open.
    const openAssignment = services.prisma.store.reviewAssignments.find((item) => item.reviewerUserId === secondReviewerUser.id);
    await services.assignments.revokeAssignment(staffUser, proposal.id, openAssignment.id, {});
    const afterRevoke = await services.summaries.getReviewProgress(staffUser, proposal.id);
    assert.equal(afterRevoke.pendingCount, 0);
    assert.equal(afterRevoke.allReviewsSubmitted, true);
  });

  it("AC-ST-3.4-02/04: consolidation is explicit, gated on completion, and traceable", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    // AC-ST-3.4-02: cannot mark ready while a review is still outstanding.
    await assert.rejects(
      () =>
        services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
          summary: "Tổng hợp sớm",
          recommendation: "approve",
          markReady: true
        }),
      BadRequestException
    );
    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "under_review");

    // A draft consolidation is allowed at any point in the round and does not move the proposal.
    const draft = await services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
      summary: "Bản nháp tổng hợp trong khi chờ phiếu.",
      recommendation: "revise"
    });
    assert.equal(draft.evaluationSummary.status, "draft");
    assert.equal(draft.proposalStatus, "under_review");
    assert.equal(services.auditLog.find("consolidate-evaluation").length, 0);
    assert.equal(services.prisma.store.auditLogs.filter((r) => r.action === "consolidate-evaluation").length, 1);

    await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Đề nghị phê duyệt.",
      recommendation: "approve"
    });

    const ready = await services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
      summary: "Hội đồng thống nhất đề nghị phê duyệt đề tài.",
      recommendation: "approve",
      markReady: true
    });

    assert.equal(ready.evaluationSummary.status, "ready_for_approval");
    assert.equal(ready.evaluationSummary.recommendationLabel, "Đề nghị phê duyệt");
    assert.notEqual(ready.evaluationSummary.markedReadyAt, "");
    assert.equal(ready.proposalStatus, "ready_for_approval");
    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "ready_for_approval");
    // One summary row per proposal — the draft was updated, not duplicated.
    assert.equal(services.prisma.store.evaluationSummaries.length, 1);

    // AC-ST-3.4-04: the transition is in the timeline and the audit trail.
    const transition = services.prisma.store.submissionEvents.at(-1);
    assert.equal(transition.fromStatus, "under_review");
    assert.equal(transition.toStatus, "ready_for_approval");

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "mark-ready-for-approval");
    assert.equal(audit.length, 1);
    assert.equal(JSON.parse(audit[0].reason).submittedReviews, 1);
  });

  it("AC-ST-3.4-03: reviewers, PIs, and out-of-scope staff cannot read or change the consolidation", async () => {
    const services = createServices();
    const { proposal } = await createProposalReadyForApproval(services);
    const summaryBefore = { ...services.prisma.store.evaluationSummaries[0] };

    for (const actor of [reviewerUser, piUser, unassignedReviewerUser]) {
      await assert.rejects(() => services.summaries.getReviewProgress(actor, proposal.id), ForbiddenException);
      await assert.rejects(
        () => services.summaries.saveEvaluationSummary(actor, proposal.id, { summary: "Ghi đè", recommendation: "reject" }),
        ForbiddenException
      );
    }

    // Out-of-scope staff can be blocked on scope alone.
    await assert.rejects(
      () => services.summaries.saveEvaluationSummary(outOfScopeStaffUser, proposal.id, { summary: "Ghi đè", recommendation: "reject" }),
      ForbiddenException
    );

    // Leadership reads the progress view but does not consolidate.
    const leadershipView = await services.summaries.getReviewProgress(leadershipUser, proposal.id);
    assert.equal(leadershipView.proposalStatus, "ready_for_approval");

    assert.equal(services.prisma.store.evaluationSummaries.length, 1);
    assert.equal(services.prisma.store.evaluationSummaries[0].summary, summaryBefore.summary);
    assert.equal(services.prisma.store.evaluationSummaries[0].recommendation, summaryBefore.recommendation);
  });
});

describe("ST-3.5 approval decision", () => {
  it("AC-ST-3.5-01: the authority reads the full decision package", async () => {
    const services = createServices();
    const { proposal } = await createProposalReadyForApproval(services);

    const decisionPackage = await services.decisions.getDecisionPackage(leadershipUser, proposal.id);

    assert.equal(decisionPackage.proposalStatus, "ready_for_approval");
    assert.equal(decisionPackage.proposalStatusLabel, "Chờ phê duyệt");
    assert.equal(decisionPackage.canDecide, true);
    assert.equal(decisionPackage.conflict.conflicted, false);
    assert.equal(decisionPackage.reviews.length, 1);
    assert.equal(decisionPackage.reviews[0].totalScore, 83);
    assert.equal(decisionPackage.evaluationSummary.status, "ready_for_approval");
    assert.equal(decisionPackage.progress.allReviewsSubmitted, true);
    assert.equal(decisionPackage.attachmentCount, 1);
    assert.equal(decisionPackage.decisions.length, 0);
    // The submitted -> under_review -> ready_for_approval trail is all there.
    assert.deepEqual(
      decisionPackage.history.map((event) => event.toStatus),
      ["submitted", "under_review", "under_review", "ready_for_approval"]
    );

    // Leadership also reads the proposal record itself once it is in the formal workflow.
    const detail = await services.proposalService.getProposal(leadershipUser, proposal.id);
    assert.equal(detail.id, proposal.id);
    assert.equal(detail.canEdit, false);

    // Staff, PI, and reviewers do not get the authority read model.
    for (const actor of [staffUser, piUser, reviewerUser]) {
      await assert.rejects(() => services.decisions.getDecisionPackage(actor, proposal.id), ForbiddenException);
    }
  });

  it("AC-ST-3.5-02: approve and reject are transactional state transitions with a decision record", async () => {
    const approving = createServices();
    const { proposal: approvedProposal } = await createProposalReadyForApproval(approving);

    const approval = await approving.decisions.decide(leadershipUser, approvedProposal.id, "approved", { note: "Đồng ý triển khai." });
    assert.equal(approval.proposalStatus, "approved");
    assert.equal(approval.decision.decision, "approved");
    assert.equal(approval.decision.decisionLabel, "Phê duyệt");
    assert.equal(approval.decision.note, "Đồng ý triển khai.");
    assert.equal(approval.decision.decidedById, leadershipUser.id);
    assert.equal(approval.decision.decidedByDisplayName, leadershipUser.displayName);
    assert.equal(approval.decision.fromStatus, "ready_for_approval");
    assert.equal(approving.prisma.store.proposals.find((item) => item.id === approvedProposal.id).status, "approved");
    assert.equal(approving.prisma.store.submissionEvents.at(-1).toStatus, "approved");
    assert.equal(approving.prisma.store.auditLogs.filter((record) => record.action === "approve-proposal").length, 1);
    // The decision must not mutate the review outputs it was based on.
    assert.equal(approving.prisma.store.reviews[0].status, "submitted");
    assert.equal(approving.prisma.store.evaluationSummaries[0].status, "ready_for_approval");

    const rejecting = createServices();
    const { proposal: rejectedProposal } = await createProposalReadyForApproval(rejecting);

    // A rejection has to say why.
    await assert.rejects(() => rejecting.decisions.decide(leadershipUser, rejectedProposal.id, "rejected", {}), BadRequestException);
    assert.equal(rejecting.prisma.store.proposals.find((item) => item.id === rejectedProposal.id).status, "ready_for_approval");

    const rejection = await rejecting.decisions.decide(leadershipUser, rejectedProposal.id, "rejected", {
      note: "Kinh phí chưa phù hợp với quy mô đề tài."
    });
    assert.equal(rejection.proposalStatus, "rejected");
    assert.equal(rejection.decision.decisionLabel, "Không phê duyệt");
    assert.equal(rejecting.prisma.store.auditLogs.filter((record) => record.action === "reject-proposal").length, 1);

    // The PI can still read the outcome on their own proposal.
    const piView = await rejecting.proposalService.getProposal(piUser, rejectedProposal.id);
    assert.equal(piView.status, "rejected");
    assert.equal(piView.statusLabel, "Từ chối");
  });

  it("AC-ST-3.5-03: a proposal that is not ready for approval cannot be decided", async () => {
    const services = createServices();
    const { proposal } = await createProposalUnderReview(services);

    await assert.rejects(() => services.decisions.decide(leadershipUser, proposal.id, "approved", {}), BadRequestException);
    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "under_review");
    assert.equal(services.prisma.store.decisions.length, 0);

    const decisionPackage = await services.decisions.getDecisionPackage(leadershipUser, proposal.id);
    assert.equal(decisionPackage.canDecide, false);

    // A decided proposal cannot be decided a second time.
    const decided = createServices();
    const { proposal: target } = await createProposalReadyForApproval(decided);
    await decided.decisions.decide(leadershipUser, target.id, "approved", {});
    await assert.rejects(() => decided.decisions.decide(leadershipUser, target.id, "rejected", { note: "Đổi ý" }), BadRequestException);
    assert.equal(decided.prisma.store.decisions.length, 1);
  });

  it("AC-ST-3.5-04: self-approval is blocked for participants and for the assigned reviewer", async () => {
    // Leadership who is also a linked participant of the proposal.
    const participating = createServices();
    const { proposal: participantProposal } = await createProposalReadyForApproval(participating, {
      members: [
        ...TEAM,
        {
          name: conflictedLeadershipUser.displayName,
          role: "Thành viên",
          organization: "Ban Giám Đốc",
          username: conflictedLeadershipUser.username
        }
      ]
    });

    const conflictedPackage = await participating.decisions.getDecisionPackage(conflictedLeadershipUser, participantProposal.id);
    assert.equal(conflictedPackage.canDecide, false);
    assert.equal(conflictedPackage.conflict.conflicted, true);
    assert.equal(conflictedPackage.conflict.reasonCode, "participation");

    await assert.rejects(
      () => participating.decisions.decide(conflictedLeadershipUser, participantProposal.id, "approved", {}),
      BadRequestException
    );
    assert.equal(participating.prisma.store.proposals.find((item) => item.id === participantProposal.id).status, "ready_for_approval");
    assert.equal(participating.prisma.store.decisions.length, 0);
    // The denial is recorded outside the transaction, so it lands on the audit-log service.
    const denied = participating.auditLog.find("approve-proposal");
    assert.equal(denied.length, 1);
    assert.equal(denied[0].result, "failure");

    // Leadership who was assigned as a reviewer on the same proposal.
    const reviewing = createServices();
    const reviewedProposal = await createSubmittedProposal(reviewing);
    await reviewing.assignments.assignReviewer(staffUser, reviewedProposal.id, {
      reviewerUsername: conflictedLeadershipUser.username
    });
    await reviewing.reviews.submitMyReview(conflictedLeadershipUser, reviewedProposal.id, {
      scoreData: FULL_SCORES,
      comment: "Nhận xét của người được phân công.",
      recommendation: "approve"
    });
    await reviewing.summaries.saveEvaluationSummary(staffUser, reviewedProposal.id, {
      summary: "Tổng hợp kết quả đánh giá.",
      recommendation: "approve",
      markReady: true
    });

    await assert.rejects(
      () => reviewing.decisions.decide(conflictedLeadershipUser, reviewedProposal.id, "approved", {}),
      BadRequestException
    );
    assert.equal(reviewing.prisma.store.decisions.length, 0);

    // An authority with no relationship to the record still decides normally.
    const clean = await reviewing.decisions.decide(leadershipUser, reviewedProposal.id, "approved", {});
    assert.equal(clean.proposalStatus, "approved");
  });
});
