import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import { BadRequestException } from "@nestjs/common";
import { assertValidUpload } from "../dist/apps/api/modules/files/file-validation.js";
import { uploadInterceptorOptions } from "../dist/apps/api/modules/files/upload-limits.js";
import { sendObjectContent } from "../dist/apps/api/modules/files/send-object-content.js";

const config = {
  allowedExtensions: [".pdf", ".docx"],
  maxFileSizeBytes: 1024
};

test("assertValidUpload kiểm tra đuôi, MIME, dung lượng và chữ ký magic-byte đầu tệp", () => {
  const validPdf = Buffer.from("%PDF-1.7\ncontent");
  assert.doesNotThrow(() => {
    assertValidUpload({ fileName: "ho-so.pdf", mimeType: "application/pdf", sizeBytes: validPdf.length, content: validPdf }, config);
  });

  // Đuôi .exe bị từ chối
  assert.throws(
    () => assertValidUpload({ fileName: "script.exe", mimeType: "application/octet-stream", sizeBytes: 4, content: Buffer.from("MZ90") }, config),
    BadRequestException
  );

  // Sai MIME
  assert.throws(
    () => assertValidUpload({ fileName: "ho-so.pdf", mimeType: "text/plain", sizeBytes: validPdf.length, content: validPdf }, config),
    BadRequestException
  );

  // Giả mạo chữ ký magic-byte: khai là .pdf nhưng nội dung không phải %PDF
  const fakePdf = Buffer.from("<html><script>alert(1)</script></html>");
  assert.throws(
    () => assertValidUpload({ fileName: "gia-mao.pdf", mimeType: "application/pdf", sizeBytes: fakePdf.length, content: fakePdf }, config),
    BadRequestException
  );

  // Vượt quá dung lượng hoặc lệch content.length
  const oversized = Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(1025)]);
  assert.throws(
    () => assertValidUpload({ fileName: "lon.pdf", mimeType: "application/pdf", sizeBytes: oversized.length, content: oversized }, config),
    BadRequestException
  );
  assert.throws(
    () => assertValidUpload({ fileName: "lech.pdf", mimeType: "application/pdf", sizeBytes: validPdf.length + 1, content: validPdf }, config),
    BadRequestException
  );
});

test("uploadInterceptorOptions thiết lập đầy đủ giới hạn multipart cho multer", () => {
  const opts = uploadInterceptorOptions(5 * 1024 * 1024, 3);
  assert.deepEqual(opts.limits, {
    fileSize: 5 * 1024 * 1024,
    files: 3,
    fields: 30,
    fieldSize: 64 * 1024,
    parts: 42
  });
});

test("sendObjectContent stream trực tiếp Readable ra WritableStream không gom Buffer", async () => {
  const stream = Readable.from([Buffer.from("phan-1-"), Buffer.from("phan-2")]);
  const res = new PassThrough();
  const headers = {};
  let sendCalled = false;
  res.setHeader = (name, value) => { headers[name] = value; };
  res.send = () => { sendCalled = true; };

  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));

  await sendObjectContent(res, stream, 13);
  assert.equal(sendCalled, false);
  assert.equal(headers["Content-Length"], "13");
  assert.equal(Buffer.concat(chunks).toString("utf8"), "phan-1-phan-2");
});
