import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/components/admin/admin-users-panel.tsx", "utf8");

describe("admin users create form source behavior", () => {
  it("requires confirm password and rejects mismatched initial passwords", () => {
    assert.match(source, /name="confirmPassword"/);
    assert.match(source, /Xác nhận mật khẩu/);
    assert.match(source, /Mật khẩu xác nhận không khớp/);
  });

  it("does not reset create-user form through async event.currentTarget", () => {
    assert.equal(source.includes("event.currentTarget.reset()"), false);
  });
});
