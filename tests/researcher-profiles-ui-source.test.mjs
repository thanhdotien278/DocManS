import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const loadFixture = async (path, dependencies = {}) => {
  const exports = {};
  const source = await readFile(path, "utf8");
  vm.runInNewContext(ts.transpileModule(source, { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
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

  it("uploads and crops the portrait, derives scientist type, fixes the owner username, and edits keywords as chips", async () => {
    const [workspace, general, cropper, appShell] = await Promise.all([
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-general-tab.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-portrait-cropper.tsx", "utf8"),
      readFile("apps/web/src/components/layout/app-shell.tsx", "utf8")
    ]);
    for (const label of ["Tải ảnh lên", "Xóa ảnh", "Nhà khoa học trong Học viện", "Nhà khoa học ngoài Học viện", "Do quản trị/Phòng QLKH cấp"]) assert.match(general, new RegExp(label));
    assert.doesNotMatch(general, /cv-scientist-type"|cv-avatar-url/);
    assert.match(cropper, /toDataURL\("image\/jpeg"/);
    assert.match(workspace, /usernameEditable && draft\.username/);
    assert.match(workspace, /mergeKeywords\(draft\.expertiseKeywords, draft\.keywordInput\)/);
    assert.match(workspace, /dispatchEvent\(new Event\("researcher-avatar-updated"\)\)/);
    assert.match(appShell, /researcher-profiles\/my-profile\/avatar\?v=/);
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
  it("wires four research tables to the single save and keeps profile participations read-only", async () => {
    const [workspace, research] = await Promise.all([
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx", "utf8"),
      readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-research-tab.tsx", "utf8")
    ]);
    assert.doesNotMatch(workspace, /PlaceholderTab title="4\./);
    assert.match(workspace, /<CvResearchTab draft=\{draft\} participations=\{profile.participations\} editable=\{editable && !busy\}/);
    for (const section of ["publications", "intellectualProperty", "awards", "projects"]) {
      assert.match(workspace, new RegExp(`errors\\.${section}\\s*=`));
      assert.match(research, new RegExp(`errors\\.${section}`));
      assert.match(research, new RegExp(`rows=\\{draft\\.${section}\\}`));
    }
    assert.equal((research.match(/disabled=\{!editable\}/g) ?? []).length, 4);
    assert.match(workspace, /JSON.stringify\(draft.publications\) !== JSON.stringify\(previous.publications\)/);
    assert.match(workspace, /input.publications = \[\.\.\.draft.publications.map\(compactRow\), \.\.\.profile.publications.filter/);
    assert.match(workspace, /errors.publications \|\| errors.intellectualProperty \|\| errors.awards \|\| errors.projects/);
    assert.match(workspace, /field.startsWith\("publications\."\)/);
    assert.match(workspace, /curriculumVitae.researchExperience.\$\{section\}/);
    assert.match(research, /row.status !== "SUPERSEDED"/);
    assert.match(research, /<th>Tình trạng<\/th>/);
    assert.match(research, /Các nhiệm vụ đã khai trong hồ sơ nhà khoa học\. Không nhập lại/);
    assert.match(research, /<td>\{row.participationRole\}<\/td>/);
    const { CvRowTable } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-row-table.tsx", { react, "react/jsx-runtime": jsxRuntime });
    const { CvResearchTab } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-research-tab.tsx", { "react/jsx-runtime": jsxRuntime, "./cv-row-table": { CvRowTable } });
    const markup = renderToStaticMarkup(jsxRuntime.jsx(CvResearchTab, {
      draft: { publications: [{ title: "Bài báo", classification: "Phân loại cũ" }], intellectualProperty: [{ title: "Sáng chế" }], awards: [{ name: "Giải thưởng" }], projects: [{ projectTitle: "Đề tài", role: "Vai trò cũ" }] },
      participations: [{ id: "active", projectTitle: "Nhiệm vụ đang làm", participationRole: "Thành viên", level: "MINISTRY", status: "ACTIVE" }, { id: "inactive", projectTitle: "Nhiệm vụ đã kết thúc", participationRole: "Chủ nhiệm", level: "OTHER", status: "INACTIVE" }, { id: "superseded", projectTitle: "Nhiệm vụ đã thay thế", participationRole: "Thành viên", level: "OTHER", status: "SUPERSEDED" }],
      editable: false, errors: { projects: "Cần nhập Vai trò" }, onChange: () => assert.fail("Read-only view must not edit")
    }));
    assert.match(markup, /Nhiệm vụ đang làm/);
    assert.match(markup, /Nhiệm vụ đã kết thúc/);
    assert.match(markup, /Đã kết thúc/);
    assert.doesNotMatch(markup, /Nhiệm vụ đã thay thế/);
    // Saved rows render as text with a "Sửa" action instead of inputs.
    assert.match(markup, /<td>Phân loại cũ<\/td>/);
    assert.match(markup, /<td>Vai trò cũ<\/td>/);
    assert.match(markup, /aria-label="Sửa dòng 1"/);
    assert.doesNotMatch(markup, /aria-label="Tên công trình/);
    assert.match(markup, /role="alert">Cần nhập Vai trò/);
    for (const control of markup.matchAll(/<(?:input|select|textarea|button)\b[^>]*>/g)) assert.match(control[0], /disabled=""/);
  });
});
