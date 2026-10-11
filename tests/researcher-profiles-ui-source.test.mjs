import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const loadFixture = async (path, dependencies = {}) => {
  const exports = {};
  const source = await readFile(path, "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: (name) => {
      if (name === "lucide-react") return {}; // Icons do not affect navigation destinations.
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return exports;
};

describe("Story 2.1 researcher profile UI source", () => {
  it("gives external researchers all researcher tabs and a personal dashboard", async () => {
    const shell = await loadFixture("apps/web/src/fixtures/shell-context.ts");
    const navigation = await loadFixture("apps/web/src/lib/navigation.ts", { "@/fixtures/shell-context": shell });
    const dashboard = await loadFixture("apps/web/src/fixtures/showcase-data.ts");
    const external = navigation.getNavigationItems("EXTERNAL_RESEARCHER_USER");
    const internal = navigation.getNavigationItems("RESEARCHER_INTERNAL_USER");
    assert.deepEqual(external.map(({ href, label }) => ({ href, label })), internal.map(({ href, label }) => ({ href, label })));
    assert.equal(external.length, 8);
    assert.equal(dashboard.getDashboardSnapshot("EXTERNAL_RESEARCHER_USER").primaryActionHref, "/my-proposals");
    assert.deepEqual(dashboard.getDashboardSnapshot("EXTERNAL_RESEARCHER_USER"), dashboard.getDashboardSnapshot("RESEARCHER_INTERNAL_USER"));
  });

  it("provides labelled management states, capability-driven actions, and duplicate confirmation", async () => {
    const source = await readFile("apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx", "utf8");
    assert.match(source, /Họ và tên \*/);
    assert.match(source, /Đang tải hồ sơ/);
    assert.match(source, /role="status"/);
    assert.match(source, /viewerAuthorization\.allowedActions/);
    assert.match(source, /Xác nhận vẫn tạo hồ sơ/);
    assert.match(source, /multi-select-chip/);
    assert.match(source, /type="search"/);
  });

  it("registers a mobile-accessible route and scoped navigation entry", async () => {
    const [page, shell] = await Promise.all([
      readFile("apps/web/src/app/researcher-profiles/page.tsx", "utf8"),
      readFile("apps/web/src/fixtures/shell-context.ts", "utf8")
    ]);
    assert.match(page, /Hồ sơ nhà khoa học/);
    assert.match(shell, /\/researcher-profiles/);
  });

  it("provides the scientific CV shell, general-tab validation, and conflict handling", async () => {
    const [workspace, general, rowTable, ownerPage, managerPanel, shell] = await Promise.all([
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-general-tab.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-row-table.tsx", "utf8"),
      readFile("apps/web/src/app/my-profile/page.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx", "utf8"),
      readFile("apps/web/src/fixtures/shell-context.ts", "utf8")
    ]);
    const source = `${workspace}\n${general}\n${rowTable}`;
    for (const label of ["1. Thông tin chung", "2. Quá trình đào tạo", "3. Quá trình công tác & Kinh nghiệm chuyên môn", "4. Kinh nghiệm & Thành tích nghiên cứu", "5. Xem & In Lý lịch khoa học"]) assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, /Lưu lý lịch khoa học/);
    for (const field of ["fullName", "gender", "idNumber", "contactEmail", "organization", "researchFieldIds"]) assert.match(source, new RegExp(field));
    for (const field of ["fullName", "gender", "idNumber", "contactEmail", "organization", "researchFieldIds"]) assert.match(workspace, new RegExp(`errors\\.${field}\\s*=`));
    assert.match(source, /researcher-profile\.cv\.update/);
    assert.match(source, /CONTEXT_VERSION_MISMATCH/);
    assert.match(source, /<th>TT<\/th>/);
    assert.match(source, /aria-label={`Xóa dòng \$\{index \+ 1\}`}/);
    assert.match(ownerPage, /ScientificCvWorkspace target="my-profile"/);
    assert.match(managerPanel, /allowed\("researcher-profile\.cv\.read"\)/);
    assert.match(managerPanel, /<ScientificCvWorkspace target=\{editing\.id\}/);
    assert.match(managerPanel, /select\(profile\); setProfileTab\("cv"\)/);
    assert.match(shell, /href: "\/my-profile", label: "Lý lịch khoa học"/);
  });

  it("edits CV education and work history with required-row validation", async () => {
    const [workspace, tabs] = await Promise.all([
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-history-tabs.tsx", "utf8")
    ]);
    for (const label of ["Bậc đào tạo *", "Ngành đào tạo (Chuyên ngành) *", "Cơ sở đào tạo *", "Thời gian *", "Cơ quan / Đơn vị *", "Tóm tắt chuyên môn"]) assert.match(tabs, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const field of ["educationHistory", "workItems"]) assert.match(workspace, new RegExp(`errors\\.${field}\\s*=`));
    assert.match(workspace, /next\.workHistory = \{/);
    assert.doesNotMatch(workspace, /PlaceholderTab title="[23]\./);
    assert.match(tabs, /Năm bắt đầu/);
    assert.doesNotMatch(tabs, /thesisTitle/);
    assert.doesNotMatch(workspace, /Lịch sử thay đổi hồ sơ/);
  });
});
