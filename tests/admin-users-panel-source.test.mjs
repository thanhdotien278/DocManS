import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/components/admin/admin-users-panel.tsx", "utf8");
const adminReferenceSource = readFileSync("apps/web/src/components/admin/admin-reference-panel.tsx", "utf8");
const adminCatalogsSource = readFileSync("apps/web/src/components/admin/admin-catalogs-panel.tsx", "utf8");
const adminConfigSource = readFileSync("apps/web/src/components/admin/admin-config-panel.tsx", "utf8");
const adminApiSource = readFileSync("apps/web/src/lib/admin-api.ts", "utf8");

describe("admin users create form source behavior", () => {
  it("requires confirm password and rejects mismatched initial passwords", () => {
    assert.match(source, /name="confirmPassword"/);
    assert.match(source, /Xác nhận mật khẩu/);
    assert.match(source, /Mật khẩu xác nhận không khớp/);
  });

  it("does not reset create-user form through async event.currentTarget", () => {
    assert.equal(source.includes("event.currentTarget.reset()"), false);
  });

  it("does not reset admin forms through async event.currentTarget", () => {
    assert.equal(adminReferenceSource.includes("event.currentTarget.reset()"), false);
    assert.equal(adminCatalogsSource.includes("event.currentTarget.reset()"), false);
    assert.equal(adminConfigSource.includes("event.currentTarget.reset()"), false);
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

  it("preserves backend validation messages for admin forms", () => {
    assert.match(adminApiSource, /const body = await response\.json\(\)\.catch\(\(\) => null\)/);
    assert.match(adminApiSource, /readApiErrorMessage\(body\)/);
    assert.match(adminApiSource, /message\.join\(" "\)/);
  });

  it("does not submit immutable catalog code during edit", () => {
    const editStart = adminCatalogsSource.indexOf("async function handleEdit");
    const statusStart = adminCatalogsSource.indexOf("async function handleStatus");
    const editSource = adminCatalogsSource.slice(editStart, statusStart);

    assert.match(adminCatalogsSource, /disabled=\{Boolean\(editingItem\)\}/);
    assert.doesNotMatch(editSource, /code: String\(form\.get\("code"\)/);
  });

  it("guards catalog list refreshes and treats archive as its own state", () => {
    assert.match(adminCatalogsSource, /selectedTypeRef/);
    assert.match(adminCatalogsSource, /requestType !== selectedTypeRef\.current/);
    assert.match(adminCatalogsSource, /item\.status === "archived"/);
    assert.match(adminCatalogsSource, /Khôi phục/);
    assert.match(adminCatalogsSource, /Lưu trữ/);
  });
});
