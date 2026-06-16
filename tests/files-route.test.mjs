import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

  it("upload sends a Unicode-safe originalFileName field instead of trusting multipart filename decoding", () => {
    const controllerSource = readFileSync("apps/api/src/modules/files/files.controller.ts", "utf8");
    const apiClientSource = readFileSync("apps/web/src/lib/research-proposals-api.ts", "utf8");

    assert.match(apiClientSource, /formData\.set\("originalFileName", input\.file\.name\)/);
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
});
