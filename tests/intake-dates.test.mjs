import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync("apps/web/src/lib/intake-dates.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, context);
const { formatIntakeDate, toIntakeDateInput, intakeDateToIso } = context.exports;

test("intake dates use whole Vietnamese calendar days and round-trip for editing", () => {
  const start = intakeDateToIso("2026-09-02");
  const end = intakeDateToIso("2026-09-02", true);
  assert.equal(start, "2026-09-01T17:00:00.000Z");
  assert.equal(end, "2026-09-02T16:59:59.999Z");
  assert.equal(new Date(end) - new Date(start), 86400000 - 1);
  for (const value of [start, end]) {
    assert.equal(formatIntakeDate(value), "02/09/2026");
    assert.equal(toIntakeDateInput(value), "2026-09-02");
  }
  assert.equal(toIntakeDateInput(intakeDateToIso("2028-02-29", true)), "2028-02-29");
  assert.equal(toIntakeDateInput(""), "");
});
