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
      if (name in dependencies) return dependencies[name];
      if (name === "lucide-react") return new Proxy({}, { get: () => () => null }); // Icons do not affect navigation destinations.
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
    // List sections are read-only tables edited through the shared Drawer; Enter in the Drawer never submits the outer form.
    assert.match(rowTable, /export function CvDrawer/);
    assert.match(rowTable, /export function CvDeleteDialog/);
    assert.match(rowTable, /aria-label={`Xóa dòng \$\{index \+ 1\}: \$\{summary\(row\)\}`}/);
    assert.match(rowTable, /event\.key !== "Enter"[\s\S]*event\.preventDefault\(\);\s*if \(!event\.nativeEvent\.isComposing\) onSave\(\)/);
    assert.doesNotMatch(rowTable, /<form/);
    assert.match(managerPanel, /<CvRowTable<Participation>[\s\S]*editable=\{editable && !busy\} canDelete=\{\(row\) => !row\.id\}/);
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
    // CV history lives in a Drawer opened from the header, only for viewers allowed to read history.
    assert.match(workspace, /allowed\("researcher-profile\.history\.read"\) \? <button type="button" className="button" onClick=\{\(\) => setHistoryOpen\(true\)\}>Lịch sử thay đổi<\/button>/);
    assert.match(workspace, /<CvHistoryDrawer profileId=\{profile\.id\}/);
    const { HistoryChanges } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-history.tsx", { react, "react/jsx-runtime": jsxRuntime, "lucide-react": { X: () => null }, "@/components/ui/dialog": { Dialog: () => null }, "@/lib/researcher-profiles-api": { profileRequest: () => undefined } });
    const historyMarkup = renderToStaticMarkup(jsxRuntime.jsx(HistoryChanges, {
      before: { fullName: "A", publications: [{ title: "Cũ" }] },
      after: { fullName: "A", publications: [{ title: "Mới" }], cvChanges: [{ section: "personalInfo", field: "bankAccount", changed: true }, { section: "personalInfo", field: "gender", changed: true }, { section: "workHistory", field: "workHistory", changed: true }, { section: "future", field: "x", changed: true }] }
    }));
    assert.match(historyMarkup, /<li>1\. Thông tin chung — Số tài khoản: đã thay đổi, giá trị được ẩn<\/li>/);
    assert.match(historyMarkup, /<li>1\. Thông tin chung — Giới tính<\/li>/);
    assert.match(historyMarkup, /<li>3\. Quá trình công tác &amp; Kinh nghiệm chuyên môn<\/li>/);
    assert.match(historyMarkup, /<li>4\. Kinh nghiệm &amp; Thành tích nghiên cứu — Công bố khoa học<\/li>/);
    assert.match(historyMarkup, /<li>future\.x<\/li>/);
    assert.doesNotMatch(historyMarkup, /Họ tên|personalInfo\./);
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
    assert.equal((research.match(/editable=\{editable\} error=/g) ?? []).length, 4);
    assert.match(research, /<CvPublicationsSection rows=\{draft\.publications\} editable=\{editable\}/);
    assert.match(workspace, /JSON.stringify\(draft.publications\) !== JSON.stringify\(previous.publications\)/);
    assert.match(workspace, /input.publications = \[\.\.\.draft.publications.map\(compactRow\), \.\.\.profile.publications.filter/);
    assert.match(workspace, /errors.publications \|\| errors.intellectualProperty \|\| errors.awards \|\| errors.projects/);
    assert.match(workspace, /field.startsWith\("publications\."\)/);
    assert.match(workspace, /curriculumVitae.researchExperience.\$\{section\}/);
    assert.match(research, /row.status !== "SUPERSEDED"/);
    assert.match(research, /<th>Tình trạng<\/th>/);
    assert.match(research, /Các nhiệm vụ đã khai trong hồ sơ nhà khoa học\. Không nhập lại/);
    assert.match(research, /<td>\{row.participationRole\}<\/td>/);
    const rowTable = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-row-table.tsx", { react, "react/jsx-runtime": jsxRuntime, "@/components/ui/dialog": { Dialog: () => null } });
    const { CvRowTable } = rowTable;
    const { CvPublicationsSection } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-publications-section.tsx", { react, "react/jsx-runtime": jsxRuntime, "./cv-row-table": rowTable, "lucide-react": { Pencil: () => null, Plus: () => null, Trash2: () => null } });
    const { CvResearchTab } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-research-tab.tsx", { "react/jsx-runtime": jsxRuntime, "./cv-row-table": { CvRowTable }, "./cv-publications-section": { CvPublicationsSection } });
    const publication = { title: "Bài báo", publicationType: "Báo cáo hội nghị", authors: "A. Nguyễn, B. Trần", doi: "10.1000/x", proofUrl: "https://example.test/p" };
    const markup = renderToStaticMarkup(jsxRuntime.jsx(CvResearchTab, {
      draft: { publications: [publication], intellectualProperty: [{ title: "Sáng chế" }], awards: [{ name: "Giải thưởng" }], projects: [{ projectTitle: "Đề tài", role: "Vai trò cũ" }] },
      participations: [{ id: "active", projectTitle: "Nhiệm vụ đang làm", participationRole: "Thành viên", level: "MINISTRY", status: "ACTIVE" }, { id: "inactive", projectTitle: "Nhiệm vụ đã kết thúc", participationRole: "Chủ nhiệm", level: "OTHER", status: "INACTIVE" }, { id: "superseded", projectTitle: "Nhiệm vụ đã thay thế", participationRole: "Thành viên", level: "OTHER", status: "SUPERSEDED" }],
      editable: false, errors: { projects: "Cần nhập Vai trò" }, onChange: () => assert.fail("Read-only view must not edit")
    }));
    assert.match(markup, /Nhiệm vụ đang làm/);
    assert.match(markup, /Nhiệm vụ đã kết thúc/);
    assert.match(markup, /Đã kết thúc/);
    assert.doesNotMatch(markup, /Nhiệm vụ đã thay thế/);
    // Publications render as a read-only list: author bubbles, type, evidence link, and no editing controls without permission.
    assert.match(markup, /<td>Báo cáo hội nghị<\/td>/);
    assert.match(markup, /<span class="multi-select-chip">A\. Nguyễn<\/span><span class="multi-select-chip">B\. Trần<\/span>/);
    assert.match(markup, /<a href="https:\/\/doi\.org\/10\.1000\/x" target="_blank" rel="noopener noreferrer">/);
    assert.match(markup, /<a href="https:\/\/example\.test\/p" target="_blank" rel="noopener noreferrer">Xem<\/a>/);
    assert.doesNotMatch(markup, /Thêm công bố|Sửa công bố|Xóa công bố|id="cv-pub-/);
    const editableMarkup = renderToStaticMarkup(jsxRuntime.jsx(CvPublicationsSection, { rows: [publication], editable: true, onChange: () => undefined }));
    assert.match(editableMarkup, /Thêm công bố/);
    assert.match(editableMarkup, /aria-label="Sửa công bố 1: Bài báo"/);
    assert.match(editableMarkup, /aria-label="Xóa công bố 1: Bài báo"/);
    assert.doesNotMatch(editableMarkup, /<input/);
    const unsafeMarkup = renderToStaticMarkup(jsxRuntime.jsx(CvPublicationsSection, { rows: [{ title: "Bài lạ", doi: "javascript:alert(1)", proofUrl: "ftp://x" }], editable: false, onChange: () => undefined }));
    assert.doesNotMatch(unsafeMarkup, /href=/);
    assert.match(unsafeMarkup, /javascript:alert\(1\)/);
    // Every list is a read-only table; without edit permission no Add/Edit/Delete control renders.
    assert.match(markup, /<td>Vai trò cũ<\/td>/);
    assert.match(markup, /role="alert">Cần nhập Vai trò/);
    assert.doesNotMatch(markup, /<(?:input|select|textarea|button)\b/);
    assert.doesNotMatch(markup, /<th>Thao tác<\/th>/);
    const editableResearch = renderToStaticMarkup(jsxRuntime.jsx(CvResearchTab, {
      draft: { publications: [], intellectualProperty: [{ title: "Sáng chế", proofUrl: "javascript:x" }], awards: [], projects: [{ projectTitle: "Đề tài", role: "Chủ nhiệm", status: "Đã nghiệm thu", notes: "Chỉ trong Drawer" }] },
      participations: [], editable: true, errors: {}, onChange: () => undefined
    }));
    for (const label of ["Thêm sở hữu trí tuệ", "Thêm giải thưởng / danh hiệu", "Thêm nhiệm vụ / chương trình"]) assert.match(editableResearch, new RegExp(`<button type="button" class="button primary">${label}</button>`));
    assert.match(editableResearch, /aria-label="Sửa dòng 1: Đề tài"/);
    assert.match(editableResearch, /aria-label="Xóa dòng 1: Đề tài"/);
    assert.match(editableResearch, /<th>Tên<\/th><th>Vai trò<\/th><th>Thời gian<\/th><th>Tình trạng<\/th><th>Thao tác<\/th>/);
    assert.match(editableResearch, /<td>javascript:x<\/td>/);
    assert.doesNotMatch(editableResearch, /<input|Chỉ trong Drawer/);
    // The panel rule: saved rows (with id) cannot be deleted.
    const panelMarkup = renderToStaticMarkup(jsxRuntime.jsx(CvRowTable, { name: "p", title: "Danh sách công bố", rows: [{ id: "saved", title: "Đã lưu" }, { title: "Mới" }], columns: [{ key: "title", label: "Tên công bố *", required: true }], editable: true, canDelete: (row) => !row.id, onChange: () => undefined, newRow: () => ({ title: "" }) }));
    assert.doesNotMatch(panelMarkup, /Xóa dòng 1/);
    assert.match(panelMarkup, /aria-label="Xóa dòng 2: Mới"/);
  });

  it("renders the saved CV as a BM-06 paper in Vietnamese and English and hides it without cv.read", async () => {
    const workspace = await readFile("apps/web/src/components/researcher-profiles/scientific-cv/cv-workspace.tsx", "utf8");
    assert.match(workspace, /<CvPrintTab profile=\{profile\} dirty=/);
    assert.doesNotMatch(workspace, /PlaceholderTab/);
    const { CvRowTable } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-row-table.tsx", { react, "react/jsx-runtime": jsxRuntime, "@/components/ui/dialog": { Dialog: () => null } });
    const generalTab = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-general-tab.tsx", { react, "react/jsx-runtime": jsxRuntime, "./cv-portrait-cropper": {}, "./cv-row-table": { CvRowTable } });
    const render = async (lang, profile, dirty = false) => {
      const { CvPrintTab } = await loadFixture("apps/web/src/components/researcher-profiles/scientific-cv/cv-print-tab.tsx", {
        react: { ...react, useState: (initial) => [lang ?? initial, () => {}] }, "react/jsx-runtime": jsxRuntime,
        "./cv-research-tab": { levels: { MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" } }, "./cv-general-tab": generalTab
      });
      return renderToStaticMarkup(jsxRuntime.jsx(CvPrintTab, { profile, dirty }));
    };
    const base = { fullName: "Nguyễn Văn A", researchFields: [], expertiseKeywords: [], publications: [], participations: [], managementOrganization: { id: "u", code: "U", name: "Phòng QLKH" } };
    const saved = {
      ...base, contactEmail: "a@hvqy.vn",
      publications: [{ title: "Bài báo hiện hành", doi: "10.1/x", status: "ACTIVE" }, { title: "Bài báo đã ẩn", status: "INACTIVE" }],
      participations: [{ projectTitle: "Nhiệm vụ cấp Bộ", participationRole: "Thành viên", level: "MINISTRY", startsOn: "2020-03-01", status: "ACTIVE" }, { projectTitle: "Nhiệm vụ đã xong", participationRole: "Chủ nhiệm", level: "OTHER", status: "INACTIVE" }, { projectTitle: "Nhiệm vụ đã thay thế", participationRole: "Thành viên", level: "OTHER", status: "SUPERSEDED" }],
      curriculumVitae: { cvSchemaVersion: 1, note: "Ghi chú đã lưu", personalInfo: { avatarUrl: "/portrait.jpg", englishAcademicTitle: "Prof. Dr.", gender: "Nữ", idNumber: "079080001234", idIssueDate: "2021-04-10", idIssuePlace: "Cục Cảnh sát QLHC", organization: "Khoa Nội", birthDate: "1980-05-07", shareDataAgreement: true, bankAccount: "1234567890", bankName: "Ngân hàng Quân đội", bankBranch: "Chi nhánh Hà Đông", smartCaSerial: "SCA-9" }, researchExperience: { intellectualProperty: [{ title: "Sáng chế X" }], awards: [{ name: "Giải Y", awardYear: 2020, endYear: 2021 }], projects: [{ projectTitle: "Đề tài CV", role: "Chủ nhiệm" }] } }
    };
    const vi = await render("VI", saved, true);
    for (const text of ["MẪU BM-06", "NGUYỄN VĂN A", "07/05/1980", "Khoa Nội", "Bài báo hiện hành", "Tên công trình", "Năm công bố", "Tên tạp chí", "Sáng chế X", "2020 – 2021", "Đề tài CV", "Nhiệm vụ cấp Bộ", "Cấp Bộ", "01/03/2020 – —", "Đã kết thúc", "Đang tham gia", "Ghi chú đã lưu", "Các thay đổi chưa lưu không được hiển thị"]) assert.ok(vi.includes(text), text);
    for (const text of ["Bài báo đã ẩn", "Nhiệm vụ đã thay thế", "DOI: 10.1/x", "Phân loại"]) assert.ok(!vi.includes(text), text);
    assert.ok(vi.indexOf("Đề tài CV") < vi.indexOf("Nhiệm vụ cấp Bộ"));
    assert.match(vi, /<img src="\/portrait\.jpg"/);
    assert.ok(!vi.includes("Prof. Dr."));
    // Identity, bank and SmartCA values never reach the printed paper, in either language (user decision 2026-10-12).
    for (const markup of [vi, await render("EN", saved)]) {
      for (const secret of ["079080001234", "10/04/2021", "Cục Cảnh sát QLHC", "1234567890", "Ngân hàng Quân đội", "Chi nhánh Hà Đông", "SCA-9", "CCCD", "SmartCA", "Passport"]) assert.ok(!markup.includes(secret), secret);
    }
    // External portrait URLs are not loaded, so the image host never sees who opens the CV.
    for (const avatarUrl of ["https://tracker.example/p.jpg", "//tracker.example/p.jpg"]) {
      const external = await render("VI", { ...saved, curriculumVitae: { ...saved.curriculumVitae, personalInfo: { ...saved.curriculumVitae.personalInfo, avatarUrl } } });
      assert.ok(!external.includes("<img") && !external.includes("tracker.example"), avatarUrl);
    }
    const en = await render("EN", saved);
    for (const text of ["FORM BM-06", "CURRICULUM VITAE", "2. Intellectual property", "Sáng chế X", "3. Awards and honours", "Giải Y", "V. OTHER INFORMATION", "Prof. Dr.", "Ministry level", "Ongoing", "Completed"]) assert.ok(en.includes(text), text);
    assert.ok(!en.includes("MẪU BM-06") && !en.includes("Các thay đổi chưa lưu") && !en.includes("Cấp Bộ") && !en.includes("Đang tham gia"));
    const empty = await render("VI", { ...base, curriculumVitae: { cvSchemaVersion: 1 } });
    assert.match(empty, /Giới tính:<\/b> —/);
    assert.match(empty, /Quốc tịch:<\/b> —/);
    assert.match(empty, /Phòng QLKH/);
    assert.ok(!empty.includes("<img"));
    for (const text of ["Chưa kê khai quá trình đào tạo.", "Chưa có văn bằng sở hữu trí tuệ.", "Chưa có giải thưởng / danh hiệu.", "Chưa có nhiệm vụ KH&amp;CN."]) assert.ok(empty.includes(text), text);
    for (const invented of ["Việt Nam", "Chính quy", "Cục Sở hữu trí tuệ", "Sử dụng tốt", "Đã nghiệm thu", "12. Tài khoản", "V. THÔNG TIN KHÁC"]) assert.ok(!empty.includes(invented), invented);
    const denied = await render("VI", { ...base, contactEmail: "a@hvqy.vn" });
    assert.match(denied, /Bạn không có quyền xem lý lịch khoa học/);
    assert.ok(!denied.includes("cv-paper") && !denied.includes("NGUYỄN VĂN A") && !denied.includes("a@hvqy.vn"));
  });
});
