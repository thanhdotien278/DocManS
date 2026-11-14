import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/components/projects/acceptance-council-panel.tsx", "utf8");

describe("acceptance council panel keyboard focus", () => {
  it("lets success status messages take focus", () => {
    const statuses = source.match(/<p className="state-message success" role="status"[^>]*>/g) ?? [];
    assert.equal(statuses.length, 2);
    for (const tag of statuses) {
      assert.match(tag, /ref=\{statusRef\}/);
      assert.match(tag, /tabIndex=\{-1\}/);
    }
  });

  it("moves focus to the status message when the acted-on control disappears", () => {
    assert.match(source, /document\.activeElement === document\.body\) statusRef\.current\?\.focus\(\)/);
  });
});
