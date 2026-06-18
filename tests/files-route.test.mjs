import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import filesControllerModule from "../dist/apps/api/modules/files/files.controller.js";

const { buildContentDisposition } = filesControllerModule;

describe("ST-2.3A files route registration source checks", () => {
  it("registers POST /api/v1/files through FilesModule without relying on a missing global prefix", () => {
    const mainSource = readFileSync("apps/api/src/main.ts", "utf8");
    const appModuleSource = readFileSync("apps/api/src/app.module.ts", "utf8");
    const controllerSource = readFileSync("apps/api/src/modules/files/files.controller.ts", "utf8");

    assert.equal(/setGlobalPrefix\(/.test(mainSource), false);
    assert.match(appModuleSource, /import \{ FilesModule \}/);
    assert.match(appModuleSource, /imports:\s*\[[^\]]*FilesModule/s);
    assert.match(controllerSource, /@Controller\("api\/v1\/files"\)/);
    assert.match(controllerSource, /@UseGuards\(SessionAuthGuard\)/);
    assert.match(controllerSource, /@Post\(\)/);
  });

  it("download endpoint is file-id based and frontend targets the API base URL files route", () => {
    const controllerSource = readFileSync("apps/api/src/modules/files/files.controller.ts", "utf8");
    const apiClientSource = readFileSync("apps/web/src/lib/research-proposals-api.ts", "utf8");
    const downloadMethodSource = controllerSource.slice(controllerSource.indexOf("async downloadFile"));

    assert.match(controllerSource, /@Get\(":id\/download"\)/);
    assert.match(controllerSource, /downloadFile\(@Req\(\)[\s\S]*@Param\("id"\) id: string/);
    assert.equal(/@Query\(/.test(downloadMethodSource), false);
    assert.match(apiClientSource, /fetch\(`\$\{getApiBaseUrl\(\)\}\/files`/);
    assert.match(apiClientSource, /`\$\{getApiBaseUrl\(\)\}\/files\/\$\{attachmentId\}\/download`/);
  });

  it("download content disposition uses ASCII fallback and UTF-8 filename encoding", () => {
    const header = buildContentDisposition("Chỉ số Glucose.docx");

    assert.equal(header, "attachment; filename=\"Chi so Glucose.docx\"; filename*=UTF-8''Ch%E1%BB%89%20s%E1%BB%91%20Glucose.docx");
    assert.doesNotThrow(() => {
      for (const char of header) {
        assert.equal(char.charCodeAt(0) <= 255, true);
      }
    });
  });

  it("upload sends a Unicode-safe originalFileName field instead of trusting multipart filename decoding", () => {
    const controllerSource = readFileSync("apps/api/src/modules/files/files.controller.ts", "utf8");
    const apiClientSource = readFileSync("apps/web/src/lib/research-proposals-api.ts", "utf8");

    assert.match(apiClientSource, /formData\.set\("originalFileName", input\.file\.name\)/);
    assert.match(apiClientSource, /formData\.set\("description", input\.description\)/);
    assert.match(controllerSource, /originalFileName: body\.originalFileName \?\? file\.originalname/);
  });

  it("registers file metadata edit and delete endpoints without client storage keys", () => {
    const controllerSource = readFileSync("apps/api/src/modules/files/files.controller.ts", "utf8");
    const apiClientSource = readFileSync("apps/web/src/lib/research-proposals-api.ts", "utf8");

    assert.match(controllerSource, /@Patch\(":id"\)/);
    assert.match(controllerSource, /@Delete\(":id"\)/);
    assert.match(apiClientSource, /fetch\(`\$\{getApiBaseUrl\(\)\}\/files\/\$\{attachmentId\}`/);
    assert.equal(/objectKey|bucketName|storagePath|minioKey/.test(apiClientSource), false);
  });

  it("proposal upload UI advertises the ST-2.3A allowed file extensions", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", "utf8");

    assert.match(componentSource, /ST23A_ALLOWED_FILE_TYPES = "\.doc, \.docx, \.pdf, \.xls, \.xlsx"/);
    assert.match(componentSource, /accept=\{ST23A_FILE_ACCEPT\}/);
    assert.equal(/selectedRequirement\.allowedMimeTypes\.join/.test(componentSource), false);
  });

  it("proposal file list UI supports description metadata and edit/delete actions", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", "utf8");

    assert.match(componentSource, /uploadDescription/);
    assert.match(componentSource, /description: uploadDescription/);
    assert.match(componentSource, /handleUpdateAttachmentDescription/);
    assert.match(componentSource, /handleDeleteAttachment/);
    assert.match(componentSource, /aria-label=\{`Chỉnh sửa mô tả/);
    assert.match(componentSource, /aria-label=\{`Xóa tài liệu/);
    assert.match(componentSource, /attachment\.description/);
  });

  it("proposal detail UI groups required documents and avoids raw technical actor labels", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", "utf8");

    assert.match(componentSource, /DOCUMENT_TYPE_LABELS/);
    assert.match(componentSource, /"proposal-form": "Thuyết minh đề tài"/);
    assert.match(componentSource, /"budget-form": "Dự toán kinh phí"/);
    assert.match(componentSource, /document-groups/);
    assert.match(componentSource, /uploaderDisplayName/);
    assert.match(componentSource, /function getAttachmentUploaderName/);
    assert.match(componentSource, /account\?\.id === attachment\.uploadedById/);
    assert.match(componentSource, /getAttachmentUploaderName\(attachment\)/);
    assert.match(componentSource, /Người tải lên/);
    assert.match(componentSource, /Thời gian nộp/);
    assert.equal(/người tải \{attachment\.uploadedById\}/.test(componentSource), false);
  });

  it("proposal detail UI formats VND input and translates submission timeline labels", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", "utf8");

    assert.match(componentSource, /formatVndNumber/);
    assert.match(componentSource, /parseVndNumber/);
    assert.match(componentSource, /numberToVietnameseWords/);
    assert.match(componentSource, /Bằng chữ:/);
    assert.match(componentSource, /Người nộp/);
    assert.equal(/actor \{event\.actorId\}/.test(componentSource), false);
  });

  it("proposal submission history renders as a submitter and submission-time table", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/proposal-detail-workspace.tsx", "utf8");

    assert.match(componentSource, /className="data-table timeline-table"/);
    assert.match(componentSource, /<th>\s*Người nộp\s*<\/th>/);
    assert.match(componentSource, /<th>\s*Thời gian nộp\s*<\/th>/);
    assert.match(componentSource, /function getSubmissionActorName/);
    assert.match(componentSource, /event\.actorDisplayName/);
    assert.match(componentSource, /account\?\.id === proposal\.submittedById/);
    assert.match(componentSource, /getSubmissionActorName\(event\)/);
    assert.match(componentSource, /formatDate\(event\.submittedAt\)/);
    assert.equal(/className="timeline-item"/.test(componentSource), false);
  });

  it("proposal draft creation budget field can be cleared instead of forcing zero", () => {
    const componentSource = readFileSync("apps/web/src/components/research-proposals/research-proposals-panel.tsx", "utf8");

    assert.match(componentSource, /formatVndNumber/);
    assert.match(componentSource, /parseVndNumber/);
    assert.match(componentSource, /budgetMetadata: \{ currency: "VND" \}/);
    assert.match(componentSource, /value=\{formatVndNumber\(form\.budgetMetadata\?\.amount\)\}/);
    assert.equal(/type="number"[\s\S]*value=\{form\.budgetMetadata\?\.amount \?\? 0\}/.test(componentSource), false);
  });

  it("proposal detail side cards keep content height instead of stretching", () => {
    const cssSource = readFileSync("apps/web/src/app/globals.css", "utf8");

    assert.match(cssSource, /\.detail-grid\s*\{[^}]*align-items:\s*start;/s);
  });
});
