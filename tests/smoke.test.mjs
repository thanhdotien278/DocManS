import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }

    return absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx") || absolutePath.endsWith(".css")
      ? [absolutePath]
      : [];
  });
}

describe("workspace smoke checks", () => {
  it("has the expected RTMS app boundaries", () => {
    assert.equal(existsSync("apps/web/src/app/dashboard/page.tsx"), true);
    assert.equal(existsSync("apps/web/src/app/login/page.tsx"), true);
    assert.equal(existsSync("apps/web/src/middleware.ts"), true);
    assert.equal(existsSync("apps/api/src/main.ts"), true);
    assert.equal(existsSync("packages/permissions/src/index.ts"), true);
    assert.equal(existsSync("packages/ui-tokens/src/index.ts"), true);
  });

  it("keeps temporary UI data isolated from production lib paths", () => {
    assert.equal(existsSync("apps/web/src/fixtures/showcase-data.ts"), true);
    assert.equal(existsSync("apps/web/src/fixtures/shell-context.ts"), true);
    assert.equal(existsSync("apps/web/src/lib/app-data.ts"), false);
    assert.equal(existsSync("apps/web/src/lib/accounts.ts"), false);
  });

  it("keeps permissions fail closed by default", () => {
    const permissionsSource = readFileSync("packages/permissions/src/index.ts", "utf8");

    assert.equal(/demoRoleContext|visual-demo/.test(permissionsSource), false);
    assert.match(permissionsSource, /allowed:\s*false/);
    assert.match(permissionsSource, /function evaluatePermission/);
  });

  it("does not keep browser-backed auth placeholders in the app shell boundary", () => {
    const sessionSource = readFileSync("apps/web/src/lib/session.ts", "utf8");
    const middlewareSource = readFileSync("apps/web/src/middleware.ts", "utf8");

    assert.equal(/localStorage|document\.cookie|NextResponse\.redirect|rtms_session/.test(sessionSource), false);
    assert.equal(/localStorage|document\.cookie|NextResponse\.redirect|rtms_session/.test(middlewareSource), false);
  });

  it("keeps prohibited presentation labels out of frontend source", () => {
    const prohibitedPattern = /\b(demo|mock|mô phỏng|giả lập|test data)\b/i;
    const sourceFiles = collectSourceFiles("apps/web/src");

    for (const filePath of sourceFiles) {
      const contents = readFileSync(filePath, "utf8");
      assert.equal(
        prohibitedPattern.test(contents),
        false,
        `Prohibited presentation label found in ${filePath}`
      );
    }
  });
});
