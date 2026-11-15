import assert from "node:assert/strict";
import { test } from "node:test";

// Module web chỉ import kiểu nên Node nạp thẳng file .ts; Node cũ không bỏ được kiểu thì bỏ qua.
const skip = !process.features.typescript && "Node này không nạp được TypeScript";

test("việc tiếp theo trên hồ sơ chỉ suy ra từ allowedActions của backend", { skip }, async () => {
  const { proposalNextStep } = await import("../apps/web/src/lib/proposal-next-step.ts");
  const proposal = (allowedActions, extra = {}) => ({ status: "submitted", viewerAuthorization: { allowedActions }, managementOfficer: { resolved: true, current: null, history: [] }, ...extra });

  // Chỉ có quyền xem: không có việc, dù là vai trò nào.
  assert.equal(proposalNextStep(proposal(["proposal.read", "proposal.file.read"])), null);
  assert.equal(proposalNextStep({ status: "submitted" }), null);
  // Nhiều hành động: quyết định phê duyệt được ưu tiên.
  assert.equal(proposalNextStep(proposal(["proposal.completeness.check", "proposal.decision.approve"])).waiting, "Chờ bạn quyết định phê duyệt");
  assert.equal(proposalNextStep(proposal(["proposal.submit"])).waiting, "Hoàn thiện và nộp hồ sơ");
  // Phân công chuyên viên chỉ là việc khi hồ sơ đang xử lý và chưa có người phụ trách.
  const assign = ["proposal.management-officer.assign"];
  assert.equal(proposalNextStep(proposal(assign)).waiting, "Phân công chuyên viên phụ trách");
  assert.equal(proposalNextStep(proposal(assign, { managementOfficer: { resolved: true, current: { id: "a" }, history: [] } })), null);
  assert.equal(proposalNextStep(proposal(assign, { managementOfficer: { resolved: false, current: null, history: [] } })), null);
  assert.equal(proposalNextStep(proposal(assign, { status: "approved" })), null);
});
