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

  it("auto-applies user filters when dropdown values change", () => {
    assert.match(source, /async function handleFilterChange/);
    assert.match(source, /<select[\s\S]*?name="systemRole"[\s\S]*?onChange=\{\(event\) => void handleFilterChange\(event\)\}/);
    assert.match(source, /<select[\s\S]*?name="organizationId"[\s\S]*?onChange=\{\(event\) => void handleFilterChange\(event\)\}/);
    assert.match(source, /<select[\s\S]*?name="status"[\s\S]*?onChange=\{\(event\) => void handleFilterChange\(event\)\}/);
  });

  it("uses the fixed system-role payload for create and update", () => {
    assert.equal(source.includes("roleCode"), false);
    assert.match(source, /name="systemRole"/);
  });

  it("does not reuse form inputs between create and edit user modes", () => {
    assert.match(source, /<form className="admin-form" key=\{editingUser\.id\}/);
    assert.match(source, /<form className="admin-form" key="create-user"/);
  });
});
