import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadCurrencyUtils() {
  const source = readFileSync("apps/web/src/lib/vietnamese-currency.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const context = { exports: {} };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

describe("Vietnamese VND formatting utilities", () => {
  it("formats, parses, and spells common VND amounts", () => {
    const { formatVndNumber, parseVndNumber, numberToVietnameseWords } = loadCurrencyUtils();

    assert.equal(formatVndNumber(15500), "15.500");
    assert.equal(formatVndNumber(1000000), "1.000.000");
    assert.equal(formatVndNumber(15000000), "15.000.000");
    assert.equal(parseVndNumber("1.000.000"), 1000000);
    assert.equal(parseVndNumber("1000000"), 1000000);
    assert.equal(parseVndNumber(""), undefined);
    assert.equal(numberToVietnameseWords(15500), "Mười lăm nghìn năm trăm đồng");
    assert.equal(numberToVietnameseWords(1000000), "Một triệu đồng");
    assert.equal(numberToVietnameseWords(15000000), "Mười lăm triệu đồng");
    assert.equal(numberToVietnameseWords(0), "");
  });
});
