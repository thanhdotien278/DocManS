import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ProposalDecisionsService } from "../dist/apps/api/proposal-evaluations/proposal-decisions.service.js";
import { ProposalEvaluationSummaryService } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js";
import { ProposalReviewAssignmentsService } from "../dist/apps/api/proposal-evaluations/proposal-review-assignments.service.js";
import { ProposalReviewsService } from "../dist/apps/api/proposal-evaluations/proposal-reviews.service.js";
import { ProposalParticipationService } from "../dist/apps/api/research-proposals/proposal-participation.service.js";
import { ProposalReviewAccessService } from "../dist/apps/api/proposals-shared/proposal-review-access.service.js";
import { ProposalManagementOfficerService } from "../dist/apps/api/proposals-shared/proposal-management-officer.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { advanceApprovalSubmission } from "../dist/apps/api/proposals-shared/approval-routing.js";
import { canReadProposal } from "../dist/apps/api/proposals-shared/proposal-access.js";
import { proposalContextVersion } from "../dist/apps/api/proposals-shared/proposal-mutation.js";
import { projectProposalViewerAuthorizationV1 } from "../dist/apps/api/permissions/proposal-capability-v1.js";
import { createEvaluationTables, createUserLookup } from "./helpers/evaluation-prisma.mjs";

const ORG_KHTI = "org-khti";

const staffUser = {
  id: "user-staff",
  username: "nmphuong",
  displayName: "TS. Nguyễn Minh Phương",
  status: "active",
  role: "scientific-management",
  systemRole: "RESEARCH_MANAGEMENT_STAFF",
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

const boardHead = { ...staffUser, id: "board-head", systemRole: "RESEARCH_BOARD_HEAD" };
const departmentHead = { ...staffUser, id: "department-head", systemRole: "RESEARCH_MANAGEMENT_HEAD" };
const ACCOUNTS = [
  boardHead, departmentHead,
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
  { name: "ThS. Nguyễn Thị Lan", role: "TOPIC_MEMBER", organization: "Khoa Toán - Tin học", username: "ntlan" },
  { name: "ThS. Trần Thanh Minh", role: "TOPIC_SECRETARY", organization: "Phòng KHQS", username: "ttminh" }
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
    auditLogs: [],
    notifications: [],
    approvals: [],
    approvalSteps: [],
    officers: []
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
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.proposals.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.proposals.findIndex((item) => item.id === where.id);
        const item = store.proposals[index];
        const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value && typeof value === "object" && "increment" in value ? item[key] + value.increment : value]));
        store.proposals[index] = { ...item, ...values, updatedAt: new Date(Math.max(Date.now(), item.updatedAt.getTime() + 1)) };
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
          return { ...item, ...values, updatedAt: new Date(Math.max(Date.now(), item.updatedAt.getTime() + 1)) };
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
        return store.members.filter((item) => proposalIds.includes(item.proposalId) && (!where?.userId || item.userId === where.userId));
      }
    },
    user: {
      ...createUserLookup(ACCOUNTS),
      // runProposalMutation reloads the actor inside the transaction.
      async findUnique({ where }) {
        const account = ACCOUNTS.find((item) => item.id === where.id);
        return account ? { ...account, status: account.status ?? "active", organizationScopes: account.organizationScopes.map((scope) => ({ organizationUnit: { ...scope, status: "active" } })), researcherProfile: { id: `profile-${account.id}`, status: "ACTIVE" } } : null;
      },
      async findMany({ where }) {
        if (where?.id?.in) return ACCOUNTS.filter((user) => where.id.in.includes(user.id) && (!where.status || (user.status ?? "active") === where.status)).map((user) => ({ id: user.id }));
        if (where?.systemRole) {
          const roles = where.systemRole.in ?? [where.systemRole];
          return ACCOUNTS.filter((user) => roles.includes(user.systemRole) && (!where.status || (user.status ?? "active") === where.status));
        }
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
      async aggregate({ where }) {
        const versions = store.fileRecords.filter((item) => item.relatedEntityId === where.relatedEntityId && item.documentType === where.documentType).map((item) => item.version ?? 0);
        return { _max: { version: versions.length ? Math.max(...versions) : null } };
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
      async findMany({ where, orderBy }) {
        const events = store.submissionEvents.filter((event) =>
          event.proposalId === where.proposalId &&
          (!where.toStatus?.in || where.toStatus.in.includes(event.toStatus)) &&
          (!where.submittedAt?.gte || event.submittedAt >= where.submittedAt.gte) &&
          (!where.snapshot || event.snapshot?.kind === where.snapshot.equals)
        );
        return orderBy?.submittedAt === "desc" ? events.sort((a, b) => b.submittedAt - a.submittedAt) : events;
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
    organizationUnit: {
      async count({ where }) {
        return where.id.in.length;
      },
      async findFirst({ where }) {
        return { id: where.id };
      }
    },
    catalogItem: { findFirst: async () => ({ id: "catalog-stub" }) },
    proposalManagementOfficer: {
      async create({ data }) {
        const record = { id: nextId("officer", store.officers), status: "ACTIVE", effectiveFrom: new Date(), effectiveUntil: null, createdAt: new Date(), ...data };
        store.officers.push(record);
        return record;
      },
      async update({ where, data }) {
        const record = store.officers.find((item) => item.id === where.id);
        Object.assign(record, data);
        return record;
      },
      async findMany({ where }) {
        const ids = where.proposalId?.in ?? [where.proposalId];
        return store.officers.filter((item) => ids.includes(item.proposalId) && (!where.status || item.status === where.status));
      },
      async findFirst({ where }) {
        const now = new Date();
        return store.officers.find((item) => item.proposalId === where.proposalId && (!where.officerUserId || item.officerUserId === where.officerUserId) && (!where.status || item.status === where.status) && item.effectiveFrom <= now && (!item.effectiveUntil || item.effectiveUntil > now)) ?? null;
      }
    },
    approvalStep: {
      async create({ data }) { store.approvalSteps.push(data); return data; },
      async findMany({ where }) {
        return store.approvalSteps.filter((step) => where.action.in.includes(step.action) &&
          store.approvals.some((row) => row.id === step.submissionId &&
            Object.entries(where.submission).every(([key, value]) => row[key] === value)));
      }
    },
    approvalSubmission: {
      async create({ data }) {
        const row = { id: nextId("approval", store.approvals), createdAt: new Date(), ...data };
        store.approvals.push(row);
        return row;
      },
      async findMany({ where }) {
        return store.approvals.filter((row) => Object.entries(where).every(([key, value]) =>
          value?.in ? value.in.includes(row[key]) : row[key] === value));
      },
      async findFirst({ where }) { return (await this.findMany({ where })).at(-1) ?? null; },
      async findUnique({ where }) { return store.approvals.find((row) => row.id === where.id) ?? null; },
      async updateMany({ where, data }) {
        const rows = await this.findMany({ where });
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      }
    },
    // The staff fixture is the officer in charge and is configured to form the evaluation council.
    systemParameter: {
      findUnique: async ({ where }) => (where?.key === "council_formation.EVALUATION" ? { value: JSON.stringify({ allowedRoles: ["RESEARCH_MANAGEMENT_STAFF"], memberCount: 7 }), updatedAt: new Date() } : null),
      findFirst: async () => null
    },
    userNotification: {
      async updateMany({ where, data }) {
        const rows = store.notifications.filter((row) => Object.entries(where).every(([key, value]) => (row[key] ?? null) === value));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      },
      async createMany({ data }) {
        store.notifications.push(...data);
        return { count: data.length };
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

/**
 * Proposal mutations require the caller's contextVersion. These scenarios exercise business rules,
 * not staleness, so a call that omits it is sent with the proposal's current token.
 */
function withCurrentContext(service, prisma, methods) {
  for (const name of methods) {
    const original = service[name].bind(service);
    service[name] = (actor, ...args) => {
      const proposalId = typeof args[0] === "string" ? args[0] : args[0]?.relatedEntityId;
      const proposal = prisma.store.proposals.find((item) => item.id === proposalId);
      const last = args.length && args.at(-1) && typeof args.at(-1) === "object" ? args.at(-1) : null;
      if (name === "decide" && last && !("packageRevision" in last)) {
        const summary = prisma.store.evaluationSummaries.find((row) => row.proposalId === proposalId);
        if (summary) args[args.length - 1] = { ...last, packageRevision: summary.revision };
      }
      if (proposal && !(last && "contextVersion" in last)) {
        const contextVersion = proposalContextVersion(proposal);
        if (last) args[args.length - 1] = { ...args.at(-1), contextVersion };
        else args.push({ contextVersion });
      }
      return original(actor, ...args);
    };
  }
  return service;
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

  withCurrentContext(assignments, prisma, ["assignReviewer", "revokeAssignment"]);
  withCurrentContext(reviews, prisma, ["saveMyReview", "submitMyReview"]);
  withCurrentContext(summaries, prisma, ["saveEvaluationSummary", "finalizeEvaluationSummary", "submitCompletedPackage"]);
  withCurrentContext(decisions, prisma, ["decide"]);

  return {
    prisma,
    auditLog,
    objectStorage,
    intakeService: new ProposalIntakePeriodsService(prisma, auditLog),
    proposalService: withCurrentContext(new ResearchProposalsService(prisma, auditLog, participation, reviewAccess, new ProposalManagementOfficerService(prisma)), prisma, ["submitProposal"]),
    filesService: withCurrentContext(new FilesService(prisma, objectStorage, auditLog, participation, reviewAccess, {
      maxFileSizeBytes: 1024 * 1024,
      allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx"]
    }), prisma, ["uploadFile"]),
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
  await services.intakeService.openPeriod(staffUser, intake.id, { contextVersion: intake.contextVersion });

  const draft = await services.proposalService.createDraft(piUser, {
    intakePeriodId: intake.id,
    title: "Nghiên cứu ứng dụng AI trong y học quân sự",
    hostOrganizationUnitId: ORG_KHTI,
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

  // The staff fixture acts as the proposal's current responsible officer (CV phụ trách).
  services.prisma.store.officers.push({ id: `officer-${draft.id}`, proposalId: draft.id, officerUserId: staffUser.id, status: "ACTIVE", effectiveFrom: new Date(Date.now() - 1000), effectiveUntil: null, createdAt: new Date(), officer: { displayName: staffUser.displayName } });
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

  const submitted = await services.proposalService.submitProposal(piUser, draft.id);
  return services.proposalService.completeCheck(staffUser, submitted.id, {
    contextVersion: submitted.viewerAuthorization.contextVersion
  });
}

/** Submitted -> under review with one assigned reviewer. */
async function createProposalUnderReview(services, options) {
  const proposal = await createSubmittedProposal(services, options);
  const assignment = await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" });
  await establishAssignment(services, proposal, assignment, reviewerUser);
  return { proposal, assignment };
}

async function establishAssignment(services, proposal, assignment, reviewer) {
  await services.assignments.respondToInvitation(reviewer, proposal.id, assignment.id, { decision: "accept" });
  // These service tests start after the council has been signed. The signing flow has its own DB test.
  await services.prisma.proposalReviewAssignment.update({ where: { id: assignment.id }, data: { councilEstablishedAt: new Date() } });
}

/** Under review -> ready for approval with the single reviewer's score submitted and consolidated. */
async function createProposalReadyForApproval(services, options) {
  const { proposal, assignment } = await createProposalUnderReview(services, options);

  await services.reviews.submitMyReview(reviewerUser, proposal.id, {
    scoreData: FULL_SCORES,
    comment: "Đề tài có giá trị khoa học và khả thi trong phạm vi Học viện.",
    recommendation: "approve"
  });

  await submitEvaluationPackage(services, proposal.id);
  return { proposal, assignment };
}

async function submitEvaluationPackage(services, proposalId, officer = staffUser) {
  await services.summaries.saveEvaluationSummary(officer, proposalId, {
    summary: "Hội đồng thống nhất đề nghị phê duyệt đề tài.", recommendation: "approve"
  });
  await services.summaries.finalizeEvaluationSummary(officer, proposalId);
  const ready = await services.summaries.submitCompletedPackage(officer, proposalId);
  const submission = services.prisma.store.approvals.find((row) => row.subjectId === proposalId && row.kind === "DECISION_PACKAGE");
  await advanceApprovalSubmission(services.prisma, boardHead, submission.id, { expectedStage: "BOARD_REVIEW" });
  await advanceApprovalSubmission(services.prisma, departmentHead, submission.id, { expectedStage: "HEAD_REVIEW" });
  return ready;
}

describe("ST-3.2 reviewer assignment and assignment-scoped proposal access", () => {
  it("AC-ST-3.2-01: staff assigns a reviewer, the proposal opens the evaluation phase, and it is auditable", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    const assignment = await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUserId: reviewerUser.id,
      assignmentRole: "committee_member",
      dueDate: futureDate(10)
    });

    assert.equal(assignment.reviewerUserId, reviewerUser.id);
    assert.equal(assignment.reviewerDisplayName, reviewerUser.displayName);
    assert.equal(assignment.assignmentRole, "committee_member");
    assert.equal(assignment.assignmentRoleLabel, "Ủy viên");
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

    await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: secondReviewerUser.id, assignmentRole: "reviewer" });

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
    assert.equal(detail.viewerReviewAssignment.assignmentRoleLabel, "Phản biện");
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
    await assert.rejects(() => services.filesService.downloadFile(unassignedReviewerUser, files[0].id), NotFoundException);
    assert.deepEqual(await services.proposalService.listProposals(unassignedReviewerUser), []);

    // A council-member label is also inert until an explicit committee assignment exists.
    const councilAssignment = await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUserId: councilMemberUser.id,
      assignmentRole: "committee_member"
    });
    await establishAssignment(services, proposal, councilAssignment, councilMemberUser);
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
    const history = await services.prisma.proposalReviewAssignment.findMany({ where: { proposalId: proposal.id } });
    assert.equal(history.length, 1);
    assert.equal(history[0].id, assignment.id);
    assert.equal(history[0].status, "revoked");

    // Access stops immediately with the revoke.
    await assert.rejects(() => services.proposalService.getProposal(reviewerUser, proposal.id), ForbiddenException);
    await assert.rejects(() => services.assignments.getReviewPackage(reviewerUser, proposal.id), ForbiddenException);
    assert.deepEqual(await services.assignments.listMyAssignments(reviewerUser), []);

    // A fresh assignment for a different reviewer takes effect alongside the retained history.
    const replacement = await services.assignments.assignReviewer(staffUser, proposal.id, {
      reviewerUserId: secondReviewerUser.id, assignmentRole: "reviewer"
    });
    assert.equal(replacement.status, "assigned");
    assert.deepEqual((await services.assignments.listAssignments(staffUser, proposal.id)).map((row) => row.id), [replacement.id]);

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "change-reviewer-assignment");
    assert.equal(audit.length, 1);
    assert.equal(JSON.parse(audit[0].reason).toStatus, "revoked");
  });

  it("AC-ST-3.2-04: PI, participant, and scientific secretary are blocked as reviewer candidates", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services);

    for (const candidate of [piUser, memberUser, secretaryUser]) {
      await assert.rejects(
        () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: candidate.id, assignmentRole: "reviewer" }),
        BadRequestException,
        `${candidate.username} must be rejected as a conflicted candidate`
      );
    }

    // No assignment, no reviewer permission, no state change — only the denial trail.
    assert.equal(services.prisma.store.reviewAssignments.length, 0);
    assert.equal(services.prisma.store.proposals.find((item) => item.id === proposal.id).status, "submitted");
    assert.equal(services.prisma.store.auditLogs.filter((row) => row.action === "assign-reviewer").length, 3);
    assert.equal(
      services.prisma.store.auditLogs.filter((row) => row.action === "assign-reviewer").every((record) => record.result === "failure"),
      true
    );
    assert.equal(JSON.parse(services.prisma.store.auditLogs.filter((row) => row.action === "assign-reviewer")[0].reason).reasonCode, "participation");
  });

  it("Story 1.9: an active staff secretary cannot bypass the capability response to assign a reviewer", async () => {
    const services = createServices();
    const proposal = await createSubmittedProposal(services, {
      members: [...TEAM.filter((member) => member.role !== "TOPIC_SECRETARY"), { name: staffUser.displayName, role: "TOPIC_SECRETARY", organization: "Phòng KHQS", username: staffUser.username }]
    });

    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" }),
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
        () => services.assignments.assignReviewer(actor, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" }),
        ForbiddenException
      );
    }

    // Staff outside the host unit scope cannot assign.
    await assert.rejects(
      () => services.assignments.assignReviewer(outOfScopeStaffUser, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" }),
      ForbiddenException
    );

    // An unknown account is rejected before anything is written.
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: "khong-ton-tai", assignmentRole: "reviewer" }),
      BadRequestException
    );

    // A draft proposal is not assignable.
    const draft = services.prisma.store.proposals.find((item) => item.id === proposal.id);
    draft.status = "draft";
    await assert.rejects(
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" }),
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
    assert.ok(services.prisma.store.submissionEvents.some((event) => event.snapshot?.kind === "review_submitted"));

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
    const secondAssignment = await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: secondReviewerUser.id, assignmentRole: "reviewer" });
    await establishAssignment(services, proposal, secondAssignment, secondReviewerUser);

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
      role: "TOPIC_SECRETARY",
      participationRole: "TOPIC_SECRETARY",
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
    await assert.rejects(() => services.assignments.listAssignments(leadershipUser, proposal.id), ForbiddenException);
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
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: reviewerUser.id, assignmentRole: "reviewer" }),
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
      () => services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: staffUser.id, assignmentRole: "reviewer" }),
      BadRequestException
    );
    assert.equal(services.prisma.store.reviewAssignments.length, 0);

    // Even if a second staff member assigns them, they cannot then write the consolidated outcome.
    const officer = services.prisma.store.officers.find((row) => row.proposalId === proposal.id);
    officer.officerUserId = outOfScopeStaffUser.id;
    const invitation = await services.assignments.assignReviewer(outOfScopeStaffUser, proposal.id, { reviewerUserId: staffUser.id, assignmentRole: "reviewer" });
    await establishAssignment(services, proposal, invitation, staffUser);
    await services.reviews.submitMyReview(staffUser, proposal.id, {
      scoreData: FULL_SCORES, comment: "Nhận xét của chuyên viên được phân công.", recommendation: "approve"
    });

    // Even when subsequently put in charge, a reviewer cannot consolidate their own review.
    officer.officerUserId = staffUser.id;
    await assert.rejects(() => services.summaries.saveEvaluationSummary(staffUser, proposal.id, {
      summary: "Tự tổng hợp phiếu của chính mình.", recommendation: "approve"
    }), BadRequestException);
    assert.equal(services.prisma.store.evaluationSummaries.length, 0);
    officer.officerUserId = outOfScopeStaffUser.id;
    const consolidated = await submitEvaluationPackage(services, proposal.id, outOfScopeStaffUser);
    assert.equal(consolidated.proposalStatus, "ready_for_approval");
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
    await services.assignments.assignReviewer(staffUser, proposal.id, { reviewerUserId: secondReviewerUser.id, assignmentRole: "reviewer" });

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
    await services.assignments.revokeAssignment(staffUser, proposal.id, openAssignment.id, { reason: "Thay đổi thành viên" });
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
    assert.equal(services.prisma.store.auditLogs.filter((r) => r.action === "draft-evaluation-summary").length, 1);

    await services.reviews.submitMyReview(reviewerUser, proposal.id, {
      scoreData: FULL_SCORES,
      comment: "Đề nghị phê duyệt.",
      recommendation: "approve"
    });

    const ready = await submitEvaluationPackage(services, proposal.id);

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

    const audit = services.prisma.store.auditLogs.filter((record) => record.action === "submit-evaluation-package");
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
    assert.deepEqual(decisionPackage.reviews, []);
    assert.equal(decisionPackage.disclosure.protectedReviewData, "REDACTED");
    assert.equal(decisionPackage.evaluationSummary.status, "ready_for_approval");
    assert.equal(decisionPackage.progress.allReviewsSubmitted, true);
    assert.equal(decisionPackage.attachmentCount, 1);
    assert.equal(decisionPackage.decisions.length, 0);
    // The submitted -> under_review -> ready_for_approval trail is all there.
    assert.deepEqual(
      decisionPackage.history.filter((event) => event.fromStatus !== event.toStatus).map((event) => event.toStatus),
      ["submitted", "under_review", "ready_for_approval"]
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

    await assert.rejects(() => services.decisions.getDecisionPackage(leadershipUser, proposal.id), ForbiddenException);

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
          role: "TOPIC_MEMBER",
          organization: "Ban Giám Đốc",
          username: conflictedLeadershipUser.username
        }
      ]
    });

    await assert.rejects(() => participating.decisions.getDecisionPackage(conflictedLeadershipUser, participantProposal.id), ForbiddenException);
    await assert.rejects(() => participating.decisions.decide(conflictedLeadershipUser, participantProposal.id, "approved", {}),
      (error) => error.getResponse().code === "APPROVAL_CONFLICT");
    assert.equal(participating.prisma.store.proposals.find((item) => item.id === participantProposal.id).status, "ready_for_approval");
    assert.equal(participating.prisma.store.decisions.length, 0);
    // Leadership who was assigned as a reviewer on the same proposal.
    const reviewing = createServices();
    const reviewedProposal = await createSubmittedProposal(reviewing);
    const reviewerAssignment = await reviewing.assignments.assignReviewer(staffUser, reviewedProposal.id, {
      reviewerUserId: conflictedLeadershipUser.id, assignmentRole: "reviewer"
    });
    await establishAssignment(reviewing, reviewedProposal, reviewerAssignment, conflictedLeadershipUser);
    await reviewing.reviews.submitMyReview(conflictedLeadershipUser, reviewedProposal.id, {
      scoreData: FULL_SCORES,
      comment: "Nhận xét của người được phân công.",
      recommendation: "approve"
    });
    await submitEvaluationPackage(reviewing, reviewedProposal.id);
    await assert.rejects(() => reviewing.decisions.decide(conflictedLeadershipUser, reviewedProposal.id, "approved", {}),
      (error) => error.getResponse().code === "APPROVAL_CONFLICT");
    assert.equal(reviewing.prisma.store.decisions.length, 0);

    // An authority with no relationship to the record still decides normally.
    const clean = await reviewing.decisions.decide(leadershipUser, reviewedProposal.id, "approved", {});
    assert.equal(clean.proposalStatus, "approved");
  });
});

describe("matrix 7.1 proposal read scope", () => {
  const read = (systemRole, status, scope = ORG_KHTI) =>
    canReadProposal({ id: `u-${systemRole}`, systemRole, organizationScopes: [{ id: scope }] }, { ownerId: "pi", hostOrganizationUnitId: ORG_KHTI, status });

  it("Board Head and Deputy Head read; Director and Science Deputy only once submitted; unit scope does not restrict", () => {
    for (const role of ["RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"]) assert.equal(read(role, "submitted"), true, role);
    for (const role of ["SCIENCE_DEPUTY_DIRECTOR", "LEADERSHIP_APPROVAL_AUTHORITY"]) {
      assert.equal(read(role, "submitted"), true, role);
      assert.equal(read(role, "draft"), false, `${role} draft`);
    }
    for (const role of ["RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_DEPUTY_HEAD", "SCIENCE_DEPUTY_DIRECTOR"]) assert.equal(read(role, "submitted", "org-other"), true, `${role} scope`);
  });

  it("the current management officer reads a proposal hosted outside their unit scope; other staff do not", () => {
    const staff = (id) => ({ id, systemRole: "RESEARCH_MANAGEMENT_STAFF", organizationScopes: [{ id: "org-other" }] });
    const proposal = { ownerId: "pi", hostOrganizationUnitId: ORG_KHTI, status: "submitted" };
    const officer = { resolved: true, officer: { officerUserId: "cv-1" } };
    assert.equal(canReadProposal(staff("cv-1"), proposal, undefined, undefined, officer), true);
    assert.equal(canReadProposal(staff("cv-2"), proposal, undefined, undefined, officer), false);
  });
});

/**
 * Story 5.4 — reviewer access and own-review submission. Self-contained fakes: each case wires only
 * the tables the path under test reads, so it does not depend on the full intake → council flow.
 */
describe("Story 5.4 reviewer access and own-review submission", () => {
  const SUBMISSION = { id: "sub-2", proposalId: "p", toStatus: "resubmitted", submittedAt: new Date(2000), snapshot: { members: [], attachments: [], requiredPackage: [] } };
  const external = { id: "ext", username: "ext", displayName: "Người phản biện ngoài", systemRole: "EXTERNAL_RESEARCHER_USER", status: "active", unit: "", organizationScopes: [] };
  const assignmentRow = (id, eventId, extra = {}) => ({ id, proposalId: "p", reviewerUserId: external.id, assignmentRole: "reviewer", status: "assigned", assignedAt: new Date(0), effectiveFrom: new Date(0), effectiveUntil: null, invitationStatus: "accepted", councilEstablishedAt: new Date(1), reviewedSubmissionEventId: eventId, reviewer: { status: "active", displayName: external.displayName }, ...extra });

  function reviewDb({ assignments = [assignmentRow("a-current", SUBMISSION.id)], officerUserId = "cv" } = {}) {
    const store = { proposal: { id: "p", code: "P-1", title: "Đề tài X", ownerId: "pi", hostOrganizationUnitId: "unit", status: "under_review", submittedAt: new Date(2000), createdAt: new Date(0), updatedAt: new Date(3000), authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 1 }, assignments, reviews: [], notifications: [], events: [
      { id: "sub-1", proposalId: "p", toStatus: "submitted", submittedAt: new Date(1000), snapshot: SUBMISSION.snapshot },
      SUBMISSION,
      { id: "check", proposalId: "p", toStatus: "resubmitted", submittedAt: new Date(2500), snapshot: { kind: "completeness_check", submissionEventId: SUBMISSION.id, readiness: { ready: true } } }
    ] };
    const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => value === undefined || (value?.in ? value.in.includes(row[key]) : row[key] === value));
    return {
      store,
      $queryRaw: async () => [{ asOf: new Date() }],
      async $transaction(work) { return work(this); },
      user: {
        findUnique: async ({ where }) => (where.id === external.id ? { ...external, researcherProfile: null } : null),
        findMany: async ({ where }) => where.id.in.filter((id) => id === officerUserId).map((id) => ({ id }))
      },
      researchProposal: {
        findUnique: async ({ where }) => (where.id === "p" ? store.proposal : null),
        async update({ data }) {
          const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value?.increment ? store.proposal[key] + value.increment : value]));
          store.proposal = { ...store.proposal, ...values, updatedAt: new Date(store.proposal.updatedAt.getTime() + 1) };
          return store.proposal;
        }
      },
      proposalMember: { findMany: async () => [] },
      fileRecord: { findMany: async () => [{ id: "file-1", filePurpose: "proposal-form", originalFileName: "tm.pdf", description: null, mimeType: "application/pdf", sizeBytes: 3, createdAt: new Date(0) }] },
      proposalSubmissionEvent: {
        findMany: async ({ where }) => where.snapshot
          ? store.events.filter((event) => event.snapshot.kind === "completeness_check")
          : store.events.filter((event) => !where.toStatus || (where.toStatus.in.includes(event.toStatus) && event.submittedAt >= where.submittedAt.gte)).sort((left, right) => right.submittedAt - left.submittedAt),
        create: async ({ data }) => (store.events.push({ id: `event-${store.events.length}`, ...data }), data)
      },
      proposalReviewAssignment: {
        findMany: async ({ where }) => store.assignments.filter((row) => matches(row, where)),
        findUnique: async ({ where }) => store.assignments.find((row) => row.id === where.id) ?? null,
        update: async ({ where, data }) => Object.assign(store.assignments.find((row) => row.id === where.id), data)
      },
      proposalReview: {
        findFirst: async ({ where }) => store.reviews.find((row) => matches(row, where)) ?? null,
        findMany: async ({ where }) => store.reviews.filter((row) => matches(row, where)),
        create: async ({ data }) => (store.reviews.push({ id: `review-${store.reviews.length + 1}`, ...data }), store.reviews.at(-1)),
        update: async ({ where, data }) => Object.assign(store.reviews.find((row) => row.id === where.id), data)
      },
      proposalManagementOfficer: {
        findFirst: async () => null,
        findMany: async () => (officerUserId ? [{ id: "officer", proposalId: "p", officerUserId, status: "ACTIVE", effectiveFrom: new Date(0), effectiveUntil: null, createdAt: new Date(0) }] : [])
      },
      userNotification: { createMany: async ({ data }) => (store.notifications.push(...data), { count: data.length }) },
      auditLog: { create: async () => ({}) }
    };
  }

  function reviewsService(prisma) {
    return new ProposalReviewsService(prisma, createAuditLog(), new ProposalReviewAccessService(prisma), new ProposalParticipationService(prisma));
  }

  it("a reviewer from an older round loses read access but stays a reviewer conflict", async () => {
    const prisma = reviewDb({ assignments: [assignmentRow("a-old", "sub-1", { status: "completed" })] });
    const access = await new ProposalReviewAccessService(prisma).resolveForProposal(external.id, "p");
    assert.equal(access.isAssignedReviewer, false);
    assert.equal(access.hasReviewConflict, true);
    assert.equal(access.conflictUnresolved, false);

    const listed = (await new ProposalReviewAccessService(prisma).resolveForProposals(external.id, ["p"])).get("p");
    assert.equal(listed.isAssignedReviewer, false);
    assert.equal(listed.hasReviewConflict, true);

    prisma.store.assignments.push(assignmentRow("a-current", SUBMISSION.id));
    assert.equal((await new ProposalReviewAccessService(prisma).resolveForProposals(external.id, ["p"])).get("p").isAssignedReviewer, true);
    assert.equal((await new ProposalReviewAccessService(prisma).resolveForProposal(external.id, "p")).assignmentId, "a-current");
  });

  it("the reviewer package and detail carry no action log, and the history endpoint refuses reviewers", async () => {
    const prisma = reviewDb();
    const assignments = new ProposalReviewAssignmentsService(prisma, createAuditLog(), new ProposalParticipationService(prisma), new ProposalReviewAccessService(prisma));
    const reviewPackage = await assignments.getReviewPackage(external, "p");
    assert.equal(reviewPackage.attachments.length, 1);
    assert.equal(Object.hasOwn(reviewPackage, "history"), false);

    const service = Object.assign(Object.create(ResearchProposalsService.prototype), {
      prisma: { systemParameter: { findUnique: async () => null }, proposalSubmissionEvent: { findMany: async () => [] } },
      reviewAccess: { resolveForProposal: async () => ({ isAssignedReviewer: true }) },
      managementOfficers: { listHistory: async () => [] },
      findProposal: async () => prisma.store.proposal,
      assertReadableProposal: async () => ({ isParticipant: false }),
      listHistoryForProposal: async () => [{ id: "event", actorId: "staff" }],
      findMembers: async () => [], findAttachments: async () => [], listSupplementRequestsForProposal: async () => [], getRequiredPackageForProposal: async () => [],
      hasCurrentCompletenessCheck: async () => true, toProposalResponse: () => ({}), findReviewReadiness: async () => null, findDecisionApprovalStage: async () => null,
      readCouncilFormationConfigForView: async () => undefined, toManagementOfficerResponse: () => null
    });
    await assert.rejects(() => service.listHistory(external, "p"), ForbiddenException);
    const detail = await service.toProposalDetailResponse({ ...prisma.store.proposal, owner: null }, external, { isParticipant: false, roles: [] }, { isAssignedReviewer: true }, { resolved: true, officer: null }, "draft");
    assert.equal(Object.hasOwn(detail, "history"), false);

    // A TP who reviewed an older round: no current-round read grant, but still redacted as a reviewer.
    const formerReviewer = { isAssignedReviewer: false, hasReviewConflict: true };
    const head = { id: "tp", username: "tp", systemRole: "RESEARCH_MANAGEMENT_HEAD", organizationScopes: [] };
    const nonParticipant = { role: "none", label: "", roles: [], labels: [], isOwner: false, isParticipant: false, relationshipEffectiveFrom: {}, relationshipEffectiveUntil: {} };
    const former = Object.assign(Object.create(ResearchProposalsService.prototype), service, { reviewAccess: { resolveForProposal: async () => formerReviewer } });
    delete former.toProposalResponse;
    await assert.rejects(() => former.listHistory(head, "p"), ForbiddenException);
    const formerDetail = await former.toProposalDetailResponse({ ...prisma.store.proposal, authorizationContextUpdatedAt: new Date(0), owner: { displayName: "PI" } }, head, nonParticipant, formerReviewer, { resolved: true, officer: null }, "draft");
    assert.equal(Object.hasOwn(formerDetail, "history"), false);
    assert.equal(Object.hasOwn(formerDetail, "ownerId"), false);
    assert.deepEqual(formerDetail.supplementRequests, []);
  });

  it("TP or leadership who reviewed the proposal cannot read its roster or review progress", async () => {
    const prisma = { researchProposal: { findUnique: async () => ({ id: "p", status: "under_review" }) }, systemParameter: { findUnique: async () => null } };
    const participation = { evaluateConflict: async () => ({ conflicted: false }) };
    const reviewAccess = { resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: true, unresolved: false }) };
    const head = { id: "tp", systemRole: "RESEARCH_MANAGEMENT_HEAD", organizationScopes: [] };
    await assert.rejects(() => new ProposalReviewAssignmentsService(prisma, {}, participation, reviewAccess).listAssignments(head, "p"), ForbiddenException);
    const summaries = new ProposalEvaluationSummaryService(prisma, {}, {}, {}, participation, reviewAccess);
    await assert.rejects(() => summaries.getReviewProgress({ ...head, id: "bgd", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY" }, "p"), ForbiddenException);
    // The capability agrees, so the detail page shows a disabled reason instead of a failed fetch.
    const capability = projectProposalViewerAuthorizationV1({
      actor: head, proposal: { id: "p", hostOrganizationUnitId: "unit", status: "under_review", updatedAt: new Date(0), authorizationContextUpdatedAt: new Date(0), authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 1 },
      participation: { role: "none", roles: [], isParticipant: false, relationshipEffectiveFrom: {} }, reviewAccess: { isAssignedReviewer: false, hasPersistedReview: true },
      managementOfficer: { resolved: true, officer: null }, canRead: true, canEdit: false, canManageFiles: false
    });
    assert.equal(capability.blockedActions.find((item) => item.action === "proposal.review.progress.read")?.code, "CONFLICT_DENIED");
  });

  it("an external reviewer saves drafts with the returned contextVersion, a stale one is 409, and submit notifies the officer", async () => {
    const prisma = reviewDb();
    const reviews = reviewsService(prisma);
    const first = await reviews.saveMyReview(external, "p", { scoreData: { feasibility: 20 }, contextVersion: proposalContextVersion(prisma.store.proposal) });
    const second = await reviews.saveMyReview(external, "p", { comment: "Nháp 2", contextVersion: first.contextVersion });
    assert.deepEqual(second.contextVersion, proposalContextVersion(prisma.store.proposal));
    await assert.rejects(() => reviews.saveMyReview(external, "p", { comment: "Cũ", contextVersion: first.contextVersion }), (error) => error.status === 409);

    const submitted = await reviews.submitMyReview(external, "p", { scoreData: FULL_SCORES, comment: "Đạt", recommendation: "revise", contextVersion: second.contextVersion });
    assert.equal(submitted.status, "submitted");
    assert.equal(prisma.store.assignments[0].status, "completed");
    assert.equal(prisma.store.proposal.status, "under_review");
    assert.deepEqual(prisma.store.notifications.map((row) => [row.userId, row.type, row.idempotencyKey]), [["cv", "review.submitted", `review-submit:${submitted.id}`]]);
    assert.equal((await reviews.getMyReview(external, "p")).id, submitted.id);

    // Không có CV phụ trách: vẫn nộp được, không có thông báo.
    const noOfficer = reviewDb({ officerUserId: null });
    await reviewsService(noOfficer).submitMyReview(external, "p", { scoreData: FULL_SCORES, comment: "Đạt", recommendation: "approve", contextVersion: proposalContextVersion(noOfficer.store.proposal) });
    assert.equal(noOfficer.store.reviews[0].status, "submitted");
    assert.equal(noOfficer.store.notifications.length, 0);

    // Hồ sơ không được phân công: bị từ chối.
    await assert.rejects(() => reviewsService(reviewDb({ assignments: [] })).getMyReview(external, "p"), ForbiddenException);
  });
});
