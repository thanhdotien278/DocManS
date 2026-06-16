import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  createProposalIntakePeriodPipe,
  updateProposalIntakePeriodPipe
} from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.dto.js";
import {
  createProposalAttachmentPipe,
  createResearchProposalDraftPipe,
  updateResearchProposalDraftPipe
} from "../dist/apps/api/research-proposals/research-proposals.dto.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";

const adminUser = {
  id: "user-admin",
  username: "admin",
  displayName: "Admin",
  role: "system-admin",
  roleLabel: "Quản trị hệ thống",
  unit: "Học viện Quân y",
  roles: ["system-admin"],
  organizationScopes: [{ id: "org-hvqy", code: "HVQY", name: "Học viện Quân y" }]
};

const staffUser = {
  ...adminUser,
  id: "user-staff",
  username: "staff",
  role: "scientific-management",
  roleLabel: "Chuyên viên",
  roles: ["scientific-management"],
  organizationScopes: [{ id: "org-khqs", code: "KHQS", name: "Phòng KHQS" }]
};

const piUser = {
  ...adminUser,
  id: "user-pi",
  username: "patuan",
  role: "principal-investigator",
  roleLabel: "Chủ nhiệm đề tài",
  roles: ["principal-investigator"],
  organizationScopes: [{ id: "org-khti", code: "KHTI", name: "Khoa Toán - Tin học" }]
};

const otherPiUser = {
  ...piUser,
  id: "user-pi-other",
  username: "other.pi"
};

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createAuditLog() {
  return {
    records: [],
    async record(input) {
      this.records.push(input);
      return {
        id: `audit-${this.records.length}`,
        timestamp: new Date().toISOString(),
        ...input
      };
    }
  };
}

function createEp02Prisma() {
  const store = {
    intakePeriods: [],
    proposals: [],
    members: [],
    attachments: [],
    submissionEvents: [],
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
        if (index < 0) {
          throw new Error("intake not found");
        }
        store.intakePeriods[index] = { ...store.intakePeriods[index], ...data, updatedAt: new Date() };
        return store.intakePeriods[index];
      },
      async findUnique({ where }) {
        return store.intakePeriods.find((item) => item.id === where.id || item.code === where.code) ?? null;
      },
      async findMany() {
        return [...store.intakePeriods].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
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
        if (index < 0) {
          throw new Error("proposal not found");
        }
        store.proposals[index] = { ...store.proposals[index], ...data, updatedAt: new Date() };
        return store.proposals[index];
      },
      async findUnique({ where }) {
        return store.proposals.find((item) => item.id === where.id) ?? null;
      },
      async findMany() {
        return [...store.proposals].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    },
    proposalMember: {
      async deleteMany({ where }) {
        const before = store.members.length;
        store.members = store.members.filter((item) => item.proposalId !== where.proposalId);
        return { count: before - store.members.length };
      },
      async createMany({ data }) {
        const records = data.map((item) => ({
          id: nextId("member", store.members),
          createdAt: new Date(),
          ...item
        }));
        store.members.push(...records);
        return { count: records.length };
      },
      async findMany({ where }) {
        return store.members.filter((item) => item.proposalId === where.proposalId);
      }
    },
    proposalAttachment: {
      async create({ data }) {
        const record = {
          id: nextId("attachment", store.attachments),
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };
        store.attachments.push(record);
        return record;
      },
      async findMany({ where }) {
        return store.attachments.filter((item) => item.proposalId === where.proposalId && item.status === "active");
      }
    },
    proposalSubmissionEvent: {
      async create({ data }) {
        const record = {
          id: nextId("event", store.submissionEvents),
          submittedAt: new Date(),
          note: null,
          ...data
        };
        store.submissionEvents.push(record);
        return record;
      },
      async findMany({ where }) {
        return store.submissionEvents.filter((item) => item.proposalId === where.proposalId);
      }
    },
    auditLog: {
      async create({ data }) {
        const record = {
          id: nextId("audit", store.auditLogs),
          timestamp: new Date(),
          ...data
        };
        store.auditLogs.push(record);
        return record;
      }
    },
    async $transaction(callback) {
      return callback(this);
    }
  };

  return prisma;
}

async function createOpenIntake(service, actor = staffUser) {
  const intake = await service.createPeriod(actor, {
    code: "INTAKE-2026",
    title: "Đợt tiếp nhận 2026",
    description: "Đợt tiếp nhận hồ sơ cấp Học viện",
    startsAt: futureDate(-1),
    endsAt: futureDate(15),
    applicableOrganizationUnitId: "org-khti",
    requiredPackage: [
      { code: "proposal-form", label: "Thuyết minh đề tài", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 },
      { code: "budget-form", label: "Dự toán kinh phí", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 }
    ]
  });

  return service.openPeriod(actor, intake.id);
}

async function createDraft({ prisma, intakeService, proposalService }) {
  const intake = await createOpenIntake(intakeService);
  return proposalService.createDraft(piUser, {
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
    members: [{ name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học" }]
  });
}

describe("EP-02 proposal intake and submission behavior", () => {
  it("validates EP-02 request DTOs at the API boundary", () => {
    assert.doesNotThrow(() =>
      createProposalIntakePeriodPipe.transform({
        code: "INTAKE-2026",
        title: "Đợt tiếp nhận 2026",
        startsAt: futureDate(-1),
        endsAt: futureDate(15),
        requiredPackage: [{ code: "proposal-form", label: "Thuyết minh đề tài" }]
      })
    );
    assert.throws(
      () =>
        createProposalIntakePeriodPipe.transform({
          code: "INTAKE-2026",
          title: "Đợt tiếp nhận 2026",
          startsAt: futureDate(-1),
          endsAt: futureDate(15),
          requiredPackage: []
        }),
      BadRequestException
    );
    assert.doesNotThrow(() => updateProposalIntakePeriodPipe.transform({ description: "" }));

    assert.doesNotThrow(() =>
      createResearchProposalDraftPipe.transform({
        intakePeriodId: "intake-1",
        title: "Nghiên cứu ban đầu",
        hostOrganizationUnitId: "org-khti",
        budgetMetadata: { amount: "15000000" },
        members: [{ name: "TS. Phạm Anh Tuấn", role: "Chủ nhiệm", organization: "Khoa Toán - Tin học" }]
      })
    );
    assert.throws(
      () =>
        updateResearchProposalDraftPipe.transform({
          members: [{ name: "Thiếu vai trò", organization: "Khoa Toán - Tin học" }]
        }),
      BadRequestException
    );
    assert.throws(
      () =>
        createProposalAttachmentPipe.transform({
          requirementCode: "proposal-form",
          fileName: "thuyet-minh.pdf",
          mimeType: "application/pdf",
          sizeBytes: 0
        }),
      BadRequestException
    );
  });

  it("staff can create, open, and close intake periods with audit rows while PIs only see open applicable periods", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const service = new ProposalIntakePeriodsService(prisma, auditLog);

    const intake = await service.createPeriod(staffUser, {
      code: "INTAKE-2026",
      title: "Đợt tiếp nhận 2026",
      startsAt: futureDate(-1),
      endsAt: futureDate(15),
      applicableOrganizationUnitId: "org-khti",
      requiredPackage: [{ code: "proposal-form", label: "Thuyết minh đề tài" }]
    });
    const opened = await service.openPeriod(staffUser, intake.id);
    const piList = await service.listPeriods(piUser);
    const closed = await service.closePeriod(staffUser, intake.id);

    assert.equal(opened.status, "open");
    assert.equal(piList.length, 1);
    assert.equal(piList[0].id, intake.id);
    assert.equal(closed.status, "closed");
    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["create-proposal-intake-period", "open-proposal-intake-period", "close-proposal-intake-period"]
    );

    await assert.rejects(
      () => service.createPeriod(piUser, { code: "BAD", title: "Không hợp lệ" }),
      ForbiddenException
    );
    assert.deepEqual(await service.listPeriods(piUser), []);
  });

  it("PI can create and update only their editable proposal draft in an eligible intake period", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    await createOpenIntake(intakeService);

    const draft = await proposalService.createDraft(piUser, {
      intakePeriodId: "intake-1",
      title: "Nghiên cứu ban đầu",
      hostOrganizationUnitId: "org-khti"
    });
    const updated = await proposalService.updateDraft(piUser, draft.id, {
      title: "Nghiên cứu cập nhật",
      summary: "Tóm tắt mới"
    });

    assert.equal(draft.status, "draft");
    assert.equal(updated.title, "Nghiên cứu cập nhật");
    assert.equal(updated.summary, "Tóm tắt mới");
    assert.deepEqual(
      auditLog.records.map((record) => record.action).slice(-2),
      ["create-proposal-draft", "update-proposal-draft"]
    );
    await assert.rejects(() => proposalService.updateDraft(otherPiUser, draft.id, { title: "Chiếm quyền" }), ForbiddenException);

    await intakeService.closePeriod(staffUser, "intake-1");
    await assert.rejects(
      () => proposalService.createDraft(piUser, { intakePeriodId: "intake-1", title: "Đợt đã đóng", hostOrganizationUnitId: "org-khti" }),
      BadRequestException
    );
  });

  it("attachment upload validates type and size, records metadata, and readiness reports missing items", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const draft = await createDraft({ prisma, intakeService, proposalService });

    const initialReadiness = await proposalService.getReadiness(piUser, draft.id);
    assert.equal(initialReadiness.ready, false);
    assert.deepEqual(
      initialReadiness.missingFiles.map((item) => item.code),
      ["proposal-form", "budget-form"]
    );

    const attachment = await proposalService.createAttachment(piUser, draft.id, {
      requirementCode: "proposal-form",
      fileName: "thuyet-minh.pdf",
      mimeType: "application/pdf",
      sizeBytes: 256000
    });

    assert.equal(attachment.fileName, "thuyet-minh.pdf");
    assert.equal(attachment.uploadedById, piUser.id);
    assert.equal((await proposalService.listAttachments(piUser, draft.id)).length, 1);
    await assert.rejects(
      () =>
        proposalService.createAttachment(piUser, draft.id, {
          requirementCode: "budget-form",
          fileName: "du-toan.exe",
          mimeType: "application/x-msdownload",
          sizeBytes: 1000
        }),
      BadRequestException
    );
    await assert.rejects(
      () =>
        proposalService.createAttachment(piUser, draft.id, {
          requirementCode: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 6 * 1024 * 1024
        }),
      BadRequestException
    );
    await assert.rejects(() => proposalService.listAttachments(otherPiUser, draft.id), ForbiddenException);
    assert.equal(auditLog.records.at(-1).action, "upload-proposal-attachment");
  });

  it("submit proposal is an explicit readiness-gated state transition with history and edit lock", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const draft = await createDraft({ prisma, intakeService, proposalService });

    await assert.rejects(() => proposalService.submitProposal(piUser, draft.id), (error) => {
      assert.equal(error instanceof BadRequestException, true);
      assert.deepEqual(error.getResponse().missingFiles.map((item) => item.code), ["proposal-form", "budget-form"]);
      return true;
    });

    await proposalService.createAttachment(piUser, draft.id, {
      requirementCode: "proposal-form",
      fileName: "thuyet-minh.pdf",
      mimeType: "application/pdf",
      sizeBytes: 256000
    });
    await proposalService.createAttachment(piUser, draft.id, {
      requirementCode: "budget-form",
      fileName: "du-toan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128000
    });

    await assert.rejects(() => proposalService.submitProposal(otherPiUser, draft.id), ForbiddenException);

    const submitted = await proposalService.submitProposal(piUser, draft.id);
    const history = await proposalService.listHistory(piUser, draft.id);

    assert.equal(submitted.status, "submitted");
    assert.equal(submitted.submittedById, piUser.id);
    assert.ok(submitted.submittedAt);
    assert.equal(history.length, 1);
    assert.equal(history[0].fromStatus, "draft");
    assert.equal(history[0].toStatus, "submitted");
    assert.equal(prisma.store.auditLogs.at(-1).action, "submit-proposal");
    await assert.rejects(() => proposalService.updateDraft(piUser, draft.id, { title: "Sửa sau nộp" }), BadRequestException);
  });
});
