import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

describe("workspace smoke checks", () => {
  it("has the expected RTMS app boundaries", () => {
    assert.equal(existsSync("apps/web/src/app/dashboard/page.tsx"), true);
    assert.equal(existsSync("apps/api/src/main.ts"), true);
    assert.equal(existsSync("packages/ui-tokens/src/index.ts"), true);
  });
});
