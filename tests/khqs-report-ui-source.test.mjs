import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { globSync } from "node:fs";

describe("Reports UI, official document modals & role boundaries", () => {
  it("enforces role guards on /reports page and masks per-project funding for PGĐ-TD & PP", async () => {
    const [reportsPage, budgetPanel, progressPanel, dialogComp, layoutFile] = await Promise.all([
      readFile("apps/web/src/app/reports/page.tsx", "utf8"),
      readFile("apps/web/src/components/reports/budget-report-panel.tsx", "utf8"),
      readFile("apps/web/src/components/reports/progress-report-panel.tsx", "utf8"),
      readFile("apps/web/src/components/research-proposals/official-document-dialog.tsx", "utf8"),
      readFile("apps/web/src/app/layout.tsx", "utf8")
    ]);

    assert.match(reportsPage, /ALLOWED_REPORT_ROLES/);
    assert.doesNotMatch(reportsPage, /ALLOWED_REPORT_ROLES[^;]*SYSTEM_ADMIN/);
    assert.doesNotMatch(reportsPage, /ALLOWED_REPORT_ROLES[^;]*STUDENT_USER/);
    assert.match(reportsPage, /KHQS_REPORT_ROLES/);
    assert.match(reportsPage, /"khqs"/);

    for (const panel of [budgetPanel, progressPanel]) {
      assert.match(panel, /RESEARCH_OVERSIGHT_AUTHORITY/);
      assert.match(panel, /RESEARCH_MANAGEMENT_DEPUTY_HEAD/);
    }
    assert.match(budgetPanel, /BudgetSummaryPanel/);
    assert.match(progressPanel, /fundingRestricted/);

    assert.match(dialogComp, /from "@\/components\/ui\/dialog"/);
    assert.match(dialogComp, /<Dialog\b/);
    assert.match(layoutFile, /import "\.\/reports-documents\.css";/);
  });

  it("exposes /reports navigation only for management/leadership roles and removes obsolete 57/2021 references", async () => {
    const [shellSrc, navSrc] = await Promise.all([
      readFile("apps/web/src/fixtures/shell-context.ts", "utf8"),
      readFile("apps/web/src/lib/navigation.ts", "utf8")
    ]);

    const roleBlock = (role) => {
      const m = shellSrc.match(new RegExp(`${role}:\\s*\\[(.*?)\\]`, "s"));
      assert.ok(m, `Role ${role} found in navigationByRole`);
      return m[1];
    };

    for (const allowedRole of [
      "LEADERSHIP_APPROVAL_AUTHORITY",
      "RESEARCH_MANAGEMENT_HEAD",
      "RESEARCH_MANAGEMENT_STAFF",
      "RESEARCH_OVERSIGHT_AUTHORITY",
      "RESEARCH_MANAGEMENT_DEPUTY_HEAD",
      "RESEARCH_BOARD_HEAD",
      "SCIENCE_DEPUTY_DIRECTOR"
    ]) {
      assert.match(roleBlock(allowedRole), /href:\s*"\/reports"/, `${allowedRole} should have /reports nav`);
    }

    for (const blockedRole of ["RESEARCHER_INTERNAL_USER", "SYSTEM_ADMIN", "STUDENT_USER", "EXTERNAL_RESEARCHER_USER"]) {
      assert.doesNotMatch(roleBlock(blockedRole), /href:\s*"\/reports"/, `${blockedRole} must not have /reports nav`);
    }
    assert.match(navSrc, /const REPORTS:\s*\[string,\s*string\]\s*=\s*\["\/reports"/);

    const files = globSync("apps/web/src/{lib,components}/**/*.{ts,tsx}");
    for (const file of files) {
      const content = await readFile(file, "utf8");
      assert.doesNotMatch(content, /57\/2021/, `Obsolete 57/2021 found in ${file}`);
    }
  });
});
