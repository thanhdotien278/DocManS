import assert from "node:assert/strict";
import test from "node:test";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";

// Story 4.5: getReadiness theo actor. Phần dữ liệu/tệp đã có test riêng nên computeReadiness được stub.
function make(overrides = {}) {
  const svc = Object.create(ResearchProposalsService.prototype);
  svc.findProposal = async () => ({ id: "p1", status: "draft", intakePeriodId: "i1" });
  svc.assertReadableProposal = async () => ({});
  svc.computeReadiness = async () => ({ ready: true, missingFields: [], missingFiles: [] });
  svc.findIntakePeriod = async () => ({ status: "open", startsAt: new Date(0), endsAt: new Date(9e12) });
  svc.assertCanMutateProposalDraft = () => {};
  return Object.assign(svc, overrides);
}

test("external researcher không nhận chi tiết thiếu sót và không nộp được", async () => {
  const r = await make({ computeReadiness: async () => { throw new Error("không được tính"); } }).getReadiness({ id: "x", systemRole: "EXTERNAL_RESEARCHER_USER" }, "p1");
  assert.equal(r.canSubmit, false);
  assert.deepEqual(r.missingFields, []);
});

test("người không phải PI xem được lỗi nhưng submit bị chặn kèm lý do backend", async () => {
  const svc = make({
    computeReadiness: async () => ({ ready: false, missingFields: [{ code: "title", label: "Tên đề tài", section: "general" }], missingFiles: [] }),
    assertCanMutateProposalDraft: () => { throw Object.assign(new Error("x"), { response: { message: "Chỉ PI được nộp." } }); }
  });
  const r = await svc.getReadiness({ id: "m" }, "p1");
  assert.equal(r.missingFields[0].section, "general");
  assert.equal(r.canSubmit, false);
  assert.equal(r.submitBlockedReason, "Chỉ PI được nộp.");
});

test("đợt đã đóng khiến hồ sơ nháp không sẵn sàng", async () => {
  const r = await make({ findIntakePeriod: async () => ({ status: "closed", startsAt: new Date(0), endsAt: new Date(1) }) }).getReadiness({ id: "pi" }, "p1");
  assert.equal(r.ready, false);
  assert.equal(r.blockers[0].code, "intake-period");
});
