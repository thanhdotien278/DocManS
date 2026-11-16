import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { ScientificDocumentsService } from "../dist/apps/api/scientific-documents/scientific-documents.service.js";
import { createScientificDocumentPipe, queryScientificDocumentsPipe, updateScientificDocumentPipe } from "../dist/apps/api/scientific-documents/scientific-documents.dto.js";

// Nội dung tệp thử mang đúng chữ ký đầu tệp theo đuôi (PDF hoặc ZIP của docx/xlsx).
const fileBytes = (name, size) => Buffer.concat([name.endsWith(".pdf") ? Buffer.from("%PDF") : Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(size - 4, "x")]);

describe("ScientificDocumentsService", () => {
  const researcherActor = {
    id: "user-pi",
    username: "patuan",
    displayName: "TS. Phạm Anh Tuấn",
    systemRole: "RESEARCHER_INTERNAL_USER"
  };

  const staffActor = {
    id: "user-staff",
    username: "nmphuong",
    displayName: "TS. Nguyễn Minh Phương",
    systemRole: "RESEARCH_MANAGEMENT_STAFF"
  };

  const adminActor = {
    id: "user-admin",
    username: "admin",
    displayName: "TS. Đỗ Tiến Thành",
    systemRole: "SYSTEM_ADMIN"
  };

  const sampleDoc = {
    id: "doc-1",
    documentNumber: "05/2023/TT-BKHCN",
    title: "Thông tư 05/2023/TT-BKHCN",
    category: "LEGAL_DOCUMENT",
    issuingAuthority: "Bộ KH&CN",
    issuedDate: new Date("2023-05-25"),
    effectiveDate: new Date("2023-07-09"),
    description: "Quy định quản lý nhiệm vụ KH&CN",
    status: "ACTIVE",
    fileName: "tt05.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
    storageObjectKey: "scientific-documents/doc-1/tt05.pdf",
    createdById: staffActor.id,
    deletedAt: null
  };

  it("allows all authenticated users (including researchers) to list documents", async () => {
    const prisma = {
      scientificDocument: {
        findMany: async (args) => {
          assert.equal(args.where.deletedAt, null);
          return [sampleDoc];
        }
      }
    };

    const auditLog = { record: async () => {} };
    const service = new ScientificDocumentsService(prisma, auditLog, {});

    const docs = await service.listDocuments(researcherActor, {});
    assert.equal(docs.length, 1);
    assert.equal(docs[0].documentNumber, "05/2023/TT-BKHCN");
  });

  it("filters documents by category and search keyword", async () => {
    let capturedWhere = null;
    const prisma = {
      scientificDocument: {
        findMany: async (args) => {
          capturedWhere = args.where;
          return [sampleDoc];
        }
      }
    };

    const auditLog = { record: async () => {} };
    const service = new ScientificDocumentsService(prisma, auditLog, {});

    await service.listDocuments(researcherActor, {
      category: "LEGAL_DOCUMENT",
      search: "Thông tư"
    });

    assert.equal(capturedWhere.category, "LEGAL_DOCUMENT");
    assert.ok(capturedWhere.OR);
    assert.equal(capturedWhere.OR.length, 4);
  });

  it("denies researchers from creating documents with 403 Forbidden", async () => {
    const service = new ScientificDocumentsService({}, {}, {});

    await assert.rejects(
      async () => {
        await service.createDocument(
          researcherActor,
          {
            documentNumber: "QC-01",
            title: "Quy chế mới",
            category: "LEGAL_DOCUMENT"
          },
          {
            originalname: "qc.pdf",
            mimetype: "application/pdf",
            size: 100,
            buffer: Buffer.from("test")
          }
        );
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Chỉ nhà quản lý khoa học/);
        return true;
      }
    );
  });

  it("allows management staff to create documents and stores file", async () => {
    let putObjectArgs = null;
    let createArgs = null;

    const storage = {
      putObject: async (args) => {
        putObjectArgs = args;
      }
    };

    const prisma = {
      scientificDocument: {
        create: async (args) => {
          createArgs = args;
          return { id: "new-doc-id", ...args.data };
        }
      }
    };

    let audited = false;
    const auditLog = {
      record: async () => {
        audited = true;
      }
    };

    const service = new ScientificDocumentsService(prisma, auditLog, storage);

    const result = await service.createDocument(
      staffActor,
      {
        documentNumber: "BM-01/NCKH",
        title: "Thuyết minh đề tài",
        category: "FORM_TEMPLATE",
        issuingAuthority: "Phòng KHQS"
      },
      {
        originalname: "thuyetminh.docx",
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 500,
        buffer: fileBytes("thuyetminh.docx", 500)
      }
    );

    assert.ok(result.id);
    assert.equal(createArgs.data.documentNumber, "BM-01/NCKH");
    assert.equal(createArgs.data.category, "FORM_TEMPLATE");
    assert.ok(putObjectArgs);
    assert.equal(putObjectArgs.sizeBytes, 500);
    assert.equal(audited, true);
  });

  it("allows the research board head (Trưởng ban QLKH) to create documents", async () => {
    let created = null;
    const prisma = { scientificDocument: { create: async (args) => { created = args; return { id: "board-doc", ...args.data }; } } };
    const service = new ScientificDocumentsService(prisma, { record: async () => {} }, { putObject: async () => {} });
    const boardHead = { ...staffActor, id: "user-board-head", systemRole: "RESEARCH_BOARD_HEAD" };

    const result = await service.createDocument(boardHead, { documentNumber: "BM-02/NCKH", title: "Dự toán kinh phí", category: "FORM_TEMPLATE" }, { originalname: "dutoan.pdf", mimetype: "application/pdf", size: 100, buffer: fileBytes("dutoan.pdf", 100) });

    assert.ok(result.id);
    assert.equal(created.data.documentNumber, "BM-02/NCKH");
  });

  it("allows admin to delete documents and denies researchers", async () => {
    let updatedWhere = null;
    let updatedData = null;

    const prisma = {
      scientificDocument: {
        findFirst: async (args) => {
          if (args.where.id === "doc-1") return sampleDoc;
          return null;
        },
        update: async (args) => {
          updatedWhere = args.where;
          updatedData = args.data;
          return { ...sampleDoc, ...args.data };
        }
      }
    };

    const auditLog = { record: async () => {} };
    const service = new ScientificDocumentsService(prisma, auditLog, {});

    // Denied for researcher
    await assert.rejects(
      async () => {
        await service.deleteDocument(researcherActor, "doc-1");
      },
      (err) => err.status === 403
    );

    // Allowed for admin
    const result = await service.deleteDocument(adminActor, "doc-1");
    assert.equal(result.success, true);
    assert.equal(updatedWhere.id, "doc-1");
    assert.equal(updatedData.status, "DELETED");
    assert.ok(updatedData.deletedAt instanceof Date);
  });

  it("downloads file stream and records audit log", async () => {
    const dummyBuffer = Buffer.from("pdf-content");
    const storage = {
      getObject: async (key) => {
        assert.equal(key, sampleDoc.storageObjectKey);
        return dummyBuffer;
      }
    };

    const prisma = {
      scientificDocument: {
        findFirst: async (args) => {
          if (args.where.id === sampleDoc.id) return sampleDoc;
          return null;
        }
      }
    };

    let audited = false;
    const auditLog = {
      record: async (event) => {
        assert.equal(event.action, "download-scientific-document");
        audited = true;
      }
    };

    const service = new ScientificDocumentsService(prisma, auditLog, storage);
    const download = await service.downloadDocument(researcherActor, sampleDoc.id);

    assert.equal(download.fileName, sampleDoc.fileName);
    assert.equal(download.mimeType, sampleDoc.mimeType);
    assert.equal(audited, true);
  });

  const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const upload = (name, mimetype = docx, size = 64) => ({ originalname: name, mimetype, size, buffer: fileBytes(name, size) });
  const fileConfig = { allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx"], maxFileSizeBytes: 1024 * 1024 };

  it("rejects a file whose type is not allowed or whose MIME does not match, before storing it", async () => {
    const puts = [];
    const service = new ScientificDocumentsService({ scientificDocument: { create: async () => assert.fail("no record") } }, { record: async () => {} }, { putObject: async (args) => puts.push(args) }, fileConfig);
    const dto = { documentNumber: "BM-02", title: "Biểu mẫu", category: "FORM_TEMPLATE" };
    await assert.rejects(() => service.createDocument(staffActor, dto, upload("macro.exe", "application/octet-stream")), /Định dạng tệp/);
    await assert.rejects(() => service.createDocument(staffActor, dto, upload("bieumau.docx", "application/pdf")), /MIME/);
    await assert.rejects(() => service.createDocument(staffActor, dto, { originalname: "gia.pdf", mimetype: "application/pdf", size: 64, buffer: Buffer.alloc(64, "x") }), /Nội dung tệp/);
    assert.equal(puts.length, 0);
  });

  it("replacing a file never overwrites the previous object, even with the same file name", async () => {
    const puts = [];
    const deletes = [];
    let stored = { ...sampleDoc, storageObjectKey: "scientific-documents/doc-1/old.pdf" };
    const prisma = {
      scientificDocument: {
        findFirst: async () => stored,
        update: async ({ data }) => (stored = { ...stored, ...data })
      }
    };
    const service = new ScientificDocumentsService(prisma, { record: async () => {} }, { putObject: async (args) => puts.push(args), deleteObject: async (key) => deletes.push(key) }, fileConfig);
    await service.updateDocument(staffActor, "doc-1", {}, upload("thong-tu.pdf", "application/pdf"));
    await service.updateDocument(staffActor, "doc-1", {}, upload("thong-tu.pdf", "application/pdf"));
    assert.equal(puts.length, 2);
    assert.notEqual(puts[0].objectKey, puts[1].objectKey, "same file name, different object keys");
    assert.ok(puts.every((put) => put.objectKey.startsWith("scientific-documents/doc-1/") && !put.objectKey.includes("thong-tu")));
    assert.equal(stored.fileName, "thong-tu.pdf");
    assert.equal(deletes.length, 0, "earlier versions stay in storage");
  });

  it("removes the uploaded object when the database write fails", async () => {
    const deletes = [];
    let putKey = null;
    const prisma = { scientificDocument: { create: async () => { throw new Error("db down"); } } };
    const service = new ScientificDocumentsService(prisma, { record: async () => {} }, { putObject: async ({ objectKey }) => { putKey = objectKey; }, deleteObject: async (key) => deletes.push(key) }, fileConfig);
    await assert.rejects(() => service.createDocument(staffActor, { documentNumber: "BM-03", title: "Mẫu", category: "FORM_TEMPLATE" }, upload("mau.docx")), /db down/);
    assert.deepEqual(deletes, [putKey]);
  });

  it("only managers can list documents that are no longer in force", async () => {
    const seen = [];
    const prisma = { scientificDocument: { findMany: async ({ where }) => { seen.push(where.status); return []; } } };
    const service = new ScientificDocumentsService(prisma, { record: async () => {} }, {}, fileConfig);
    await service.listDocuments(researcherActor, { status: "INACTIVE" });
    await service.listDocuments(staffActor, { status: "INACTIVE" });
    assert.deepEqual(seen, ["ACTIVE", "INACTIVE"]);
  });

  it("validates category, status, dates and lengths; an empty date clears it", () => {
    const valid = { documentNumber: "BM-04", title: "Mẫu", category: "GUIDELINE" };
    assert.throws(() => createScientificDocumentPipe.transform({ ...valid, category: "ANYTHING" }), BadRequestException);
    assert.throws(() => createScientificDocumentPipe.transform({ ...valid, issuedDate: "31/12/2026" }), BadRequestException);
    assert.throws(() => createScientificDocumentPipe.transform({ ...valid, title: "x".repeat(501) }), BadRequestException);
    assert.throws(() => updateScientificDocumentPipe.transform({ status: "DELETED" }), BadRequestException);
    assert.throws(() => queryScientificDocumentsPipe.transform({ status: "DELETED" }), BadRequestException);
    assert.deepEqual(updateScientificDocumentPipe.transform({ issuedDate: "", status: "INACTIVE" }), { issuedDate: "", status: "INACTIVE" });
    assert.equal(createScientificDocumentPipe.transform({ ...valid, issuedDate: "2026-05-01" }).issuedDate, "2026-05-01");
  });
});
