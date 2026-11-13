import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/components/projects/acceptance-dossier-workspace.tsx", "utf8");
const api = readFileSync("apps/web/src/lib/projects-api.ts", "utf8");

// Story 6.9 phần 3: hồ sơ cần bổ sung được sửa/nộp lại như nháp; người có quyền gửi yêu cầu bổ sung.
describe("acceptance dossier workspace supplement request", () => {
  it("treats supplement_requested like draft for editing, contributing and resubmitting", () => {
    assert.match(source, /const draft = dossier\.status === "draft" \|\| dossier\.status === "supplement_requested";/);
  });

  it("offers the request form only to holders of acceptance-dossier.request-supplement and posts reason and deadline", () => {
    assert.match(source, /ethicsCan\(view, "acceptance-dossier\.request-supplement"\)/);
    assert.match(source, /requestAcceptanceSupplement\(projectId, supplement\.reason\.trim\(\), supplement\.responseDeadline, view\.contextVersion\)/);
    assert.match(api, /`\$\{acceptancePath\(projectId\)\}\/supplement`.*JSON\.stringify\(\{ reason, responseDeadline, contextVersion \}\)/);
  });

  it("shows the open supplement request to everyone who can read the dossier", () => {
    assert.match(source, /\{request \? <SectionCard title="Yêu cầu bổ sung hồ sơ"/);
  });
});
