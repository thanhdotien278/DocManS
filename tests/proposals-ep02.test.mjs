import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  createProposalIntakePeriodPipe,
  updateProposalIntakePeriodPipe
} from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.dto.js";
import { createResearchProposalDraftPipe, updateResearchProposalDraftPipe } from "../dist/apps/api/research-proposals/research-proposals.dto.js";
import { uploadFilePipe } from "../dist/apps/api/modules/files/files.dto.js";
import { ProposalIntakePeriodsService } from "../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";

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
  displayName: "Phạm Anh Tuấn",
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

function createEp02Prisma() {
  const store = {
    intakePeriods: [],
    proposals: [],
    members: [],
    attachments: [],
    fileRecords: [],
    submissionEvents: [],
    auditLogs: []
  };

  function nextId(prefix, collection) {
    return `${prefix}-${collection.length + 1}`;
  }

  function userDisplayName(userId) {
    return [adminUser, staffUser, piUser, otherPiUser].find((user) => user.id === userId)?.displayName ?? "";
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
    fileRecord: {
      async create({ data }) {
        if (store.failNextFileRecordCreate) {
          store.failNextFileRecordCreate = false;
          throw new Error("file metadata create failed");
        }
        const record = {
          id: nextId("file", store.fileRecords),
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          uploadedBy: { displayName: userDisplayName(data.uploadedById) },
          ...data
        };
        store.fileRecords.push(record);
        return record;
      },
      async findMany({ where }) {
        return store.fileRecords.filter((item) => {
          if (where.id && item.id !== where.id) return false;
          if (where.relatedEntityType && item.relatedEntityType !== where.relatedEntityType) return false;
          if (where.relatedEntityId && item.relatedEntityId !== where.relatedEntityId) return false;
          if (where.status && item.status !== where.status) return false;
          if (where.deletedAt === null && item.deletedAt !== null) return false;
          return true;
        });
      },
      async findUnique({ where }) {
        return store.fileRecords.find((item) => item.id === where.id) ?? null;
      },
      async update({ where, data }) {
        const index = store.fileRecords.findIndex((item) => item.id === where.id);
        if (index < 0) {
          throw new Error("file record not found");
        }
        store.fileRecords[index] = { ...store.fileRecords[index], ...data, updatedAt: new Date() };
        store.fileRecords[index].uploadedBy = { displayName: userDisplayName(store.fileRecords[index].uploadedById) };
        return store.fileRecords[index];
      }
    },
    proposalSubmissionEvent: {
      async create({ data }) {
        const record = {
          id: nextId("event", store.submissionEvents),
          submittedAt: new Date(),
          note: null,
          actor: { displayName: userDisplayName(data.actorId) },
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

function assertNoRawStorageFields(value) {
  for (const key of ["objectKey", "internalKey", "bucket", "bucketName", "path", "storagePath", "minioKey"]) {
    assert.equal(Object.hasOwn(value, key), false, `${key} must not be exposed`);
  }
}

function createFilesService({ prisma, auditLog, objectStorage = createObjectStorage(), maxFileSizeBytes = 1024 * 1024 } = {}) {
  return new FilesService(prisma, objectStorage, auditLog, {
    maxFileSizeBytes,
    allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx"]
  });
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
        uploadFilePipe.transform({
          relatedEntityType: "approved_project",
          relatedEntityId: "project-1",
          filePurpose: "proposal-form"
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
    const piDetail = await proposalService.getProposal(piUser, draft.id);
    const staffDetail = await proposalService.getProposal(staffUser, draft.id);
    const updated = await proposalService.updateDraft(piUser, draft.id, {
      title: "Nghiên cứu cập nhật",
      summary: "Tóm tắt mới"
    });

    assert.equal(draft.status, "draft");
    assert.equal(piDetail.canEdit, true);
    assert.equal(piDetail.canSubmit, true);
    assert.equal(staffDetail.canEdit, false);
    assert.equal(staffDetail.canSubmit, false);
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

  it("shared files module stores proposal attachments in object storage with metadata, authorization, and audit logs", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const objectStorage = createObjectStorage();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const filesService = createFilesService({ prisma, auditLog, objectStorage });
    const draft = await createDraft({ prisma, intakeService, proposalService });

    const initialReadiness = await proposalService.getReadiness(piUser, draft.id);
    assert.equal(initialReadiness.ready, false);
    assert.deepEqual(
      initialReadiness.missingFiles.map((item) => item.code),
      ["proposal-form", "budget-form"]
    );

    const attachment = await filesService.uploadFile(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: draft.id,
      filePurpose: "proposal-form",
      fileName: "Chá»‰ sá»‘ Glucose.docx",
      originalFileName: "Chỉ số Glucose.docx",
      description: "  Bản chỉ số xét nghiệm  ",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 256000,
      content: Buffer.alloc(256000, "p")
    });

    assert.equal(attachment.fileName, "Chỉ số Glucose.docx");
    assert.equal(attachment.description, "Bản chỉ số xét nghiệm");
    assert.equal(attachment.uploadedById, piUser.id);
    assert.equal(attachment.uploaderDisplayName, piUser.displayName);
    assert.equal(attachment.filePurpose, "proposal-form");
    assert.equal(attachment.canEdit, true);
    assert.equal(attachment.canDelete, true);
    assertNoRawStorageFields(attachment);
    assert.equal(prisma.store.fileRecords.length, 1);
    assert.equal(prisma.store.fileRecords[0].originalFileName, "Chỉ số Glucose.docx");
    assert.equal(objectStorage.objects.size, 1);
    const storedObjectKey = [...objectStorage.objects.keys()][0];
    assert.match(storedObjectKey, new RegExp(`^research-proposals/${draft.id}/${attachment.id}/[a-f0-9-]+\\.docx$`));
    assert.equal(storedObjectKey.includes("Glucose"), false);
    assert.equal(storedObjectKey.includes("Chỉ"), false);
    const proposalAttachments = await proposalService.listAttachments(piUser, draft.id);
    assert.equal(proposalAttachments.length, 1);
    assert.equal(proposalAttachments[0].description, "Bản chỉ số xét nghiệm");
    assert.equal(proposalAttachments[0].uploaderDisplayName, piUser.displayName);
    assert.equal(proposalAttachments[0].canEdit, true);
    assert.equal(proposalAttachments[0].canDelete, true);

    const metadata = await filesService.listFiles(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: draft.id
    });
    assert.equal(metadata.length, 1);
    assert.equal(metadata[0].fileName, "Chỉ số Glucose.docx");
    assert.equal(metadata[0].description, "Bản chỉ số xét nghiệm");
    assert.equal(metadata[0].uploaderDisplayName, piUser.displayName);
    assertNoRawStorageFields(metadata[0]);

    const download = await filesService.downloadFile(piUser, attachment.id);
    assert.equal(download.fileName, "Chỉ số Glucose.docx");
    assert.equal(download.uploaderDisplayName, piUser.displayName);
    assert.deepEqual(download.content, Buffer.alloc(256000, "p"));
    assertNoRawStorageFields(download);

    objectStorage.objects.delete(storedObjectKey);
    await assert.rejects(() => filesService.downloadFile(piUser, attachment.id), NotFoundException);
    objectStorage.objects.set(storedObjectKey, Buffer.alloc(256000, "p"));

    for (const fileName of ["Đơn đề nghị hoàn thiện.docx", "Báo cáo tổng hợp.pdf"]) {
      const mimeType = fileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const accepted = await filesService.uploadFile(piUser, {
        relatedEntityType: "research_proposal",
        relatedEntityId: draft.id,
        filePurpose: "budget-form",
        fileName: "mojibake-name.pdf",
        originalFileName: fileName,
        mimeType,
        sizeBytes: 1000,
        content: Buffer.alloc(1000, "v")
      });
      assert.equal(accepted.fileName, fileName);
      assertNoRawStorageFields(accepted);
    }

    const acceptedFiles = [
      ["word-doc.doc", "application/msword"],
      ["word-docx.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["sheet-xls.xls", "application/vnd.ms-excel"],
      ["sheet-xlsx.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    ];
    for (const [fileName, mimeType] of acceptedFiles) {
      const accepted = await filesService.uploadFile(piUser, {
        relatedEntityType: "research_proposal",
        relatedEntityId: draft.id,
        filePurpose: "budget-form",
        fileName,
        mimeType,
        sizeBytes: 1000,
        content: Buffer.alloc(1000, "a")
      });
      assert.equal(accepted.fileName, fileName);
      assertNoRawStorageFields(accepted);
    }

    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.exe",
          mimeType: "application/x-msdownload",
          sizeBytes: 1000,
          content: Buffer.from("bad")
        }),
      BadRequestException
    );
    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/x-msdownload",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "b")
        }),
      BadRequestException
    );
    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2 * 1024 * 1024,
          content: Buffer.from("too large")
        }),
      BadRequestException
    );
    assert.equal(prisma.store.fileRecords.length, 7);
    assert.equal(objectStorage.objects.size, 7);
    await assert.rejects(
      () =>
        filesService.uploadFile(otherPiUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "b")
        }),
      ForbiddenException
    );
    await assert.rejects(
      () =>
        filesService.uploadFile(staffUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "b")
        }),
      ForbiddenException
    );
    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "approved_project",
          relatedEntityId: draft.id,
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "b")
        }),
      BadRequestException
    );
    prisma.store.proposals.push({
      ...prisma.store.proposals.find((proposal) => proposal.id === draft.id),
      id: "proposal-outside-scope",
      hostOrganizationUnitId: "org-outside"
    });
    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: "proposal-outside-scope",
          filePurpose: "budget-form",
          fileName: "du-toan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "b")
        }),
      ForbiddenException
    );
    await assert.rejects(() => filesService.listFiles(otherPiUser, { relatedEntityType: "research_proposal", relatedEntityId: draft.id }), ForbiddenException);
    await assert.rejects(() => filesService.downloadFile(otherPiUser, attachment.id), ForbiddenException);
    const staffProposalAttachments = await proposalService.listAttachments(staffUser, draft.id);
    assert.equal(staffProposalAttachments[0].canEdit, false);
    assert.equal(staffProposalAttachments[0].canDelete, false);
    const staffMetadata = await filesService.listFiles(staffUser, { relatedEntityType: "research_proposal", relatedEntityId: draft.id });
    assert.equal(staffMetadata.length, 7);
    assert.equal(staffMetadata[0].canEdit, false);
    assert.equal(staffMetadata[0].canDelete, false);
    assert.equal((await filesService.downloadFile(staffUser, attachment.id)).fileName, "Chỉ số Glucose.docx");
    assert.ok(auditLog.records.some((record) => record.action === "upload-file"));
    assert.equal(auditLog.records.at(-1).action, "download-file");
  });

  it("allows PI metadata edits and soft delete only on their own editable draft files", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const objectStorage = createObjectStorage();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const filesService = createFilesService({ prisma, auditLog, objectStorage });
    const draft = await createDraft({ prisma, intakeService, proposalService });

    const attachment = await filesService.uploadFile(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: draft.id,
      filePurpose: "proposal-form",
      fileName: "Báo cáo tổng hợp.pdf",
      description: "",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      content: Buffer.alloc(1000, "p")
    });

    const updated = await filesService.updateFile(piUser, attachment.id, {
      description: "  Bản tổng hợp sau rà soát  "
    });
    assert.equal(updated.description, "Bản tổng hợp sau rà soát");
    assert.equal((await filesService.listFiles(piUser, { relatedEntityType: "research_proposal", relatedEntityId: draft.id }))[0].description, "Bản tổng hợp sau rà soát");
    assertNoRawStorageFields(updated);

    await assert.rejects(() => filesService.updateFile(piUser, attachment.id, { description: "x".repeat(501) }), BadRequestException);
    await assert.rejects(() => filesService.updateFile(otherPiUser, attachment.id, { description: "Chiếm quyền" }), ForbiddenException);
    await assert.rejects(() => filesService.updateFile(staffUser, attachment.id, { description: "Nhân viên sửa" }), ForbiddenException);
    await assert.rejects(() => filesService.deleteFile(otherPiUser, attachment.id), ForbiddenException);
    await assert.rejects(() => filesService.deleteFile(staffUser, attachment.id), ForbiddenException);

    const deleted = await filesService.deleteFile(piUser, attachment.id);
    assert.equal(deleted.id, attachment.id);
    assert.equal(deleted.status, "deleted");
    assert.equal(objectStorage.objects.size, 1);
    assert.deepEqual(await filesService.listFiles(piUser, { relatedEntityType: "research_proposal", relatedEntityId: draft.id }), []);
    assert.equal((await proposalService.getReadiness(piUser, draft.id)).missingFiles.some((item) => item.code === "proposal-form"), true);
    await assert.rejects(() => filesService.downloadFile(piUser, attachment.id), NotFoundException);
    assert.deepEqual(
      auditLog.records.map((record) => record.action).slice(-2),
      ["update-file-description", "delete-file"]
    );
  });

  it("failed file uploads do not leave usable metadata and clean up object storage when metadata creation fails", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const objectStorage = {
      ...createObjectStorage(),
      async putObject() {
        throw new Error("object storage unavailable");
      }
    };
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const filesService = createFilesService({ prisma, auditLog, objectStorage });
    const draft = await createDraft({ prisma, intakeService, proposalService });

    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "proposal-form",
          fileName: "thuyet-minh.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "p")
        }),
      /object storage unavailable/
    );
    assert.equal(prisma.store.fileRecords.length, 0);

    const workingStorage = createObjectStorage();
    const workingFilesService = createFilesService({ prisma, auditLog, objectStorage: workingStorage });
    prisma.store.failNextFileRecordCreate = true;
    await assert.rejects(
      () =>
        workingFilesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "proposal-form",
          fileName: "thuyet-minh.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "p")
        }),
      /file metadata create failed/
    );
    assert.equal(prisma.store.fileRecords.length, 0);
    assert.equal(workingStorage.objects.size, 0);
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

    const filesService = createFilesService({ prisma, auditLog });
    await filesService.uploadFile(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: draft.id,
      filePurpose: "proposal-form",
      fileName: "thuyet-minh.pdf",
      mimeType: "application/pdf",
      sizeBytes: 256000,
      content: Buffer.alloc(256000, "p")
    });
    await filesService.uploadFile(piUser, {
      relatedEntityType: "research_proposal",
      relatedEntityId: draft.id,
      filePurpose: "budget-form",
      fileName: "du-toan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128000,
      content: Buffer.alloc(128000, "b")
    });

    await assert.rejects(() => proposalService.submitProposal(otherPiUser, draft.id), ForbiddenException);

    const submitted = await proposalService.submitProposal(piUser, draft.id);
    const history = await proposalService.listHistory(piUser, draft.id);

    assert.equal(submitted.status, "submitted");
    assert.equal(submitted.submittedById, piUser.id);
    assert.ok(submitted.submittedAt);
    assert.equal(submitted.canEdit, false);
    assert.equal(submitted.canSubmit, false);
    assert.equal(submitted.history.length, 1);
    assert.equal(history.length, 1);
    assert.equal(history[0].fromStatus, "draft");
    assert.equal(history[0].toStatus, "submitted");
    assert.equal(history[0].actorDisplayName, piUser.displayName);
    assert.equal(prisma.store.auditLogs.at(-1).action, "submit-proposal");
    assert.deepEqual(JSON.parse(prisma.store.auditLogs.at(-1).reason), {
      fromStatus: "draft",
      toStatus: "submitted",
      readinessReady: true,
      missingFields: 0,
      missingFiles: 0
    });
    await assert.rejects(() => proposalService.submitProposal(piUser, draft.id), BadRequestException);
    await assert.rejects(() => proposalService.updateDraft(piUser, draft.id, { title: "Sửa sau nộp" }), BadRequestException);
    await assert.rejects(
      () =>
        filesService.uploadFile(piUser, {
          relatedEntityType: "research_proposal",
          relatedEntityId: draft.id,
          filePurpose: "proposal-form",
          fileName: "bo-sung.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          content: Buffer.alloc(1000, "s")
        }),
      ForbiddenException
    );
  });

  it("rejects submission and draft edits when structured readiness or organization scope fails closed", async () => {
    const prisma = createEp02Prisma();
    const auditLog = createAuditLog();
    const intakeService = new ProposalIntakePeriodsService(prisma, auditLog);
    const proposalService = new ResearchProposalsService(prisma, auditLog);
    const intake = await createOpenIntake(intakeService);

    const incompleteDraft = await proposalService.createDraft(piUser, {
      intakePeriodId: intake.id,
      title: "Hồ sơ thiếu dữ liệu",
      hostOrganizationUnitId: "org-khti"
    });
    await assert.rejects(() => proposalService.submitProposal(piUser, incompleteDraft.id), (error) => {
      assert.equal(error instanceof BadRequestException, true);
      const response = error.getResponse();
      assert.ok(response.missingFields.some((item) => item.code === "research-field"));
      assert.ok(response.missingFields.some((item) => item.code === "members"));
      assert.ok(response.missingFiles.some((item) => item.code === "proposal-form"));
      return true;
    });

    const readyDraft = await createDraft({ prisma, intakeService, proposalService });
    const filesService = createFilesService({ prisma, auditLog });
    for (const filePurpose of ["proposal-form", "budget-form"]) {
      await filesService.uploadFile(piUser, {
        relatedEntityType: "research_proposal",
        relatedEntityId: readyDraft.id,
        filePurpose,
        fileName: `${filePurpose}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1000,
        content: Buffer.alloc(1000, "p")
      });
    }

    const stored = prisma.store.proposals.find((proposal) => proposal.id === readyDraft.id);
    stored.hostOrganizationUnitId = "org-outside";

    const detail = await proposalService.getProposal(piUser, readyDraft.id);
    assert.equal(detail.canEdit, false);
    assert.equal(detail.canSubmit, false);
    await assert.rejects(() => proposalService.submitProposal(piUser, readyDraft.id), ForbiddenException);
    await assert.rejects(() => proposalService.updateDraft(piUser, readyDraft.id, { title: "Sửa ngoài phạm vi" }), ForbiddenException);
  });
});
