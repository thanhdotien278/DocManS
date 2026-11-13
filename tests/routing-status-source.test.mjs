import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/components/approvals/routing-status.tsx", "utf8");

describe("routing status responsive layout", () => {
  it("renders a mobile card list right after the table so the table hides on mobile", () => {
    assert.match(source, /<\/table>\s*<\/div>\s*<div className="mobile-list">/);
  });

  it("keeps note textarea ids unique between table and mobile list", () => {
    const ids = [...source.matchAll(/id=\{`([^`]+)`\}/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size);
  });
});
