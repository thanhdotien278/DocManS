import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("DocManS UX migration boundaries", () => {
  it("uses the current role navigation in a two-row responsive shell", async () => {
    const [shell, mobile, css] = await Promise.all([
      read("apps/web/src/components/layout/app-shell.tsx"),
      read("apps/web/src/components/layout/mobile-nav.tsx"),
      read("apps/web/src/app/globals.css")
    ]);
    assert.match(shell, /getNavigationItems\(account\.systemRole\)/);
    assert.match(shell, /topbar-row topbar-row-main/);
    assert.match(shell, /topbar-row topbar-nav/);
    assert.match(shell, /skip-link/);
    assert.match(shell, /isLoading \|\| !account/);
    assert.match(shell, /account\.mustChangePassword/);
    assert.doesNotMatch(shell, /<Search|<Bell/);
    assert.match(mobile, /key=\{pathname\}/);
    assert.match(mobile, /aria-current=\{isActive \? "page"/);
    assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.topbar-nav \{ display: none;/);
  });

  it("keeps dense data responsive and keyboard reachable", async () => {
    const [css, proposals] = await Promise.all([
      read("apps/web/src/app/globals.css"),
      read("apps/web/src/components/research-proposals/research-proposals-panel.tsx")
    ]);
    assert.match(css, /\.table-wrap:has\(\+ \.mobile-list\)/);
    assert.match(css, /\.table-wrap \{ min-width: 0; max-width: 100%; overscroll-behavior-x: contain; \}/);
    assert.match(proposals, /className="table-wrap" tabIndex=\{0\} role="region"/);
  });

  it("derives the printable researcher view without adding unsupported fields", async () => {
    const [panel, api, audit, css] = await Promise.all([
      read("apps/web/src/components/researcher-profiles/researcher-profiles-panel.tsx"),
      read("apps/web/src/lib/researcher-profiles-api.ts"),
      read("_bmad-output/implementation-artifacts/docmans-ux-field-audit.md"),
      read("apps/web/src/app/globals.css")
    ]);
    assert.match(panel, /Tóm tắt lý lịch khoa học/);
    assert.match(panel, /form\.publications/);
    assert.match(panel, /form\.participations/);
    assert.doesNotMatch(api, /curriculumVitae|bankAccount|smartCaSerial|idNumber/);
    assert.match(audit, /No Category C schema\/API work is required/);
    assert.match(css, /\.grid:has\(> \.profile-print-preview\) > :not\(\.profile-print-preview\)/);
  });

  it("uses native modal behavior with escape and focus restoration", async () => {
    const dialog = await read("apps/web/src/components/ui/dialog.tsx");
    assert.match(dialog, /dialog\.showModal\(\)/);
    assert.match(dialog, /onCancel=/);
    assert.match(dialog, /opener\?\.focus\(\)/);
  });

  it("leaves canonical UX documentation independent of temporary sources", async () => {
    const source = `${await read("docs/ux-design-guidelines.md")}\n${await read("docs/ux-ui-spec.md")}`;
    assert.doesNotMatch(source, /tuan|DocManS-review|ui-reference|\/Users\/Super|reference project|source project|teammate/i);
  });
});
