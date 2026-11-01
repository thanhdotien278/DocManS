import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { FilesService } from "../dist/apps/api/modules/files/files.service.js";

// Story 4.4: version theo loại tài liệu và fail-closed cho tệp đề xuất. Quyền upload/đọc đã có test riêng nên được stub.
function createService() {
  const rows = [];
  const fileRecord = {
    async findMany({ where }) { return rows.filter((r) => r.relatedEntityId === where.relatedEntityId && r.relatedEntityType === where.relatedEntityType); },
    async findUnique({ where }) { return rows.find((r) => r.id === where.id) ?? null; },
    async create({ data }) { const row = { status: "active", deletedAt: null, createdAt: new Date(), updatedAt: new Date(), uploadedBy: { displayName: "PI" }, ...data }; rows.push(row); return row; }
  };
  const prisma = { fileRecord, async $transaction(work) { return work(prisma); } };
  const storage = { async putObject() {}, async deleteObject() {}, async getObject() { return Buffer.from("x"); } };
  const audit = { async record() {} };
  const svc = new FilesService(prisma, storage, audit, {}, {}, { maxFileSizeBytes: 1024, allowedExtensions: [".pdf"] }, {});
  svc.transactional = true;
  svc.assertCanUpload = async () => {};
  return { svc, rows };
}

const upload = (svc, purpose) => svc.uploadFile({ id: "pi", username: "pi" }, { relatedEntityType: "research_proposal", relatedEntityId: "p1", filePurpose: purpose, fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1, content: Buffer.from("x") });

test("version tăng theo từng loại tài liệu và không dùng lại số của bản đã xóa", async () => {
  const { svc, rows } = createService();
  assert.equal((await upload(svc, "form")).version, 1);
  const second = await upload(svc, "form");
  assert.equal(second.version, 2);
  assert.equal(second.documentType, "form");
  rows.find((r) => r.id === second.id).deletedAt = new Date();
  assert.equal((await upload(svc, "form")).version, 3);
  assert.equal((await upload(svc, "budget")).version, 1);
});

test("tệp đề xuất ngoài quyền đọc trả cùng 404 như tệp không tồn tại", async () => {
  const { svc } = createService();
  const file = await upload(svc, "form");
  svc.assertCanRead = async () => { throw new ForbiddenException({ message: "Không có quyền xem hồ sơ đề xuất này." }); };
  for (const call of [() => svc.downloadFile({ id: "x" }, file.id), () => svc.updateFile({ id: "x" }, file.id, { description: null }), () => svc.deleteFile({ id: "x" }, file.id)]) {
    const hidden = await call().catch((e) => e);
    const missing = await svc.downloadFile({ id: "x" }, "none").catch((e) => e);
    assert.ok(hidden instanceof NotFoundException);
    assert.deepEqual(hidden.getResponse(), missing.getResponse());
  }
});
