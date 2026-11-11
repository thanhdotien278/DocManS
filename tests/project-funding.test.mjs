import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFundingInvariant, fundingTotals, latestFunding, readApprovedBudget, readFundingAmount } from "../dist/apps/api/approved-projects/project-funding.js";

const code = (c) => (e) => e.response?.code === c;

test("readFundingAmount: làm tròn, chặn âm, quá 10^13, không phải số", () => {
  assert.equal(readFundingAmount("1000.6"), 1001);
  assert.equal(readFundingAmount(0), 0);
  for (const bad of [-1, "abc", NaN, Infinity, 10_000_000_000_001, null, undefined]) assert.throws(() => readFundingAmount(bad), code("FUNDING_INVALID"), String(bad));
});

test("readApprovedBudget: approvedAmount ưu tiên hơn amount; thiếu thì 0", () => {
  assert.equal(readApprovedBudget({ amount: 500, approvedAmount: 450 }), 450);
  assert.equal(readApprovedBudget({ amount: "500" }), 500);
  assert.equal(readApprovedBudget({ total: 1000 }), 0);
  assert.equal(readApprovedBudget(null), 0);
  assert.equal(readApprovedBudget({ amount: -5 }), 0);
});

test("latestFunding + fundingTotals: lấy bản mới nhất mỗi entry rồi cộng theo loại", () => {
  const rows = [
    { entryId: "a", version: 1, kind: "GRANT", amount: "500" },
    { entryId: "b", version: 1, kind: "DISBURSEMENT", amount: "200" },
    { entryId: "a", version: 2, kind: "GRANT", amount: "450" }
  ];
  assert.deepEqual(latestFunding(rows).map((r) => [r.entryId, r.version]), [["a", 2], ["b", 1]]);
  assert.deepEqual(fundingTotals(latestFunding(rows)), { GRANT: 450, DISBURSEMENT: 200, SETTLEMENT: 0 });
});

test("assertFundingInvariant: giải ngân ≤ cấp, quyết toán ≤ giải ngân", () => {
  assertFundingInvariant({ GRANT: 500, DISBURSEMENT: 500, SETTLEMENT: 500 });
  assert.throws(() => assertFundingInvariant({ GRANT: 400, DISBURSEMENT: 500, SETTLEMENT: 0 }), code("FUNDING_INVALID"));
  assert.throws(() => assertFundingInvariant({ GRANT: 500, DISBURSEMENT: 300, SETTLEMENT: 301 }), code("FUNDING_INVALID"));
});
