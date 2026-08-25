import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("Story 2.1 researcher profile UI source", () => {
  it("provides labelled management states, capability-driven actions, and duplicate confirmation", async () => {
    const source = await readFile("apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx", "utf8");
    assert.match(source, /Họ và tên \*/);
    assert.match(source, /Đang tải danh sách hồ sơ/);
    assert.match(source, /role="status"/);
    assert.match(source, /viewerAuthorization\.allowedActions/);
    assert.match(source, /Xác nhận vẫn lưu/);
    assert.match(source, /select multiple/);
  });

  it("registers a mobile-accessible route and scoped navigation entry", async () => {
    const [page, shell] = await Promise.all([
      readFile("apps/web/src/app/researcher-profiles/page.tsx", "utf8"),
      readFile("apps/web/src/fixtures/shell-context.ts", "utf8")
    ]);
    assert.match(page, /Hồ sơ nhà khoa học/);
    assert.match(shell, /\/researcher-profiles/);
  });
});
