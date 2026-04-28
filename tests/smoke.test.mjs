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
    assert.equal(existsSync("packages/ui-tokens/src/index.ts"), true);
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
