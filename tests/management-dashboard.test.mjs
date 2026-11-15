import assert from "node:assert/strict";
import { test } from "node:test";

// Module web chỉ import kiểu nên Node nạp thẳng file .ts; Node cũ không bỏ được kiểu thì bỏ qua.
const skip = !process.features.typescript && "Node này không nạp được TypeScript";
const now = new Date("2026-11-15T06:00:00.000Z");

test("dashboard CV tổng hợp đúng số backend trả, chỉ trong phạm vi", { skip }, async () => {
  const { summarizeManagement } = await import("../apps/web/src/lib/management-dashboard.ts");
  const proposal = (status, extra = {}) => ({ id: `p-${status}-${Math.random()}`, title: status, status, proposalNatureCode: "military", intakePeriodId: "open-1", ...extra });
  const summary = summarizeManagement({
    now,
    proposals: [
      proposal("draft"),
      proposal("submitted", { managementOfficer: { resolved: true, current: { officerUserId: "cv-1", officerDisplayName: "CV Một" } } }),
      proposal("supplement_requested", { proposalNatureCode: "" }),
      // 7 ghế nhưng 1 ghế không chấm: chưa nộp phải là 6 theo backend, không phải 7 - 0.
      proposal("under_review", { reviewWorkflow: { completenessChecked: true, submittedCount: 0, assignmentCount: 7, pendingCount: 6, overdueCount: 2, readyForSynthesis: false } }),
      proposal("approved", { managementOfficer: { resolved: true, current: { officerUserId: "cv-1", officerDisplayName: "CV Một" } }, intakePeriodId: "closed-1", intakePeriodTitle: "Đợt đóng", proposalNatureCode: "civil" })
    ],
    projects: [
      {
        id: "pr-1", title: "Đề tài A", overdue: true, approaching: false, nearestDeadline: "2026-11-10T00:00:00.000Z",
        requests: [
          { id: "rq-1", requestType: "extension", status: "under_staff_review", allowedActions: ["project.request.review"], responseDeadline: "2026-11-14T00:00:00.000Z" },
          { id: "rq-2", requestType: "adjustment", status: "under_staff_review", allowedActions: [] }
        ],
        reports: [{ id: "rp-1", awaitingAction: "officer", allowedActions: ["project.report.review"], responseOverdue: false }]
      }
    ],
    intakePeriods: [
      { id: "open-1", title: "Đợt mở", status: "open", startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-11-21T00:00:00.000Z", capabilities: { canOpen: false } },
      { id: "closed-1", title: "Đợt đóng", status: "closed", startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-02-01T00:00:00.000Z", capabilities: {} }
    ]
  });

  assert.equal(summary.total, 4, "hồ sơ nháp không tính");
  assert.deepEqual(summary.phases.map((phase) => phase.count), [2, 1, 0, 1, 0]);
  assert.deepEqual(summary.natures, [{ code: "military", count: 2 }, { code: "", count: 1 }, { code: "civil", count: 1 }]);
  assert.deepEqual(summary.byIntake.map((row) => [row.title, row.count]), [["Đợt không xác định", 3], ["Đợt đóng", 1]]);
  // Đang xử lý = chưa có kết quả duyệt; hồ sơ chưa có CV gom vào nhóm riêng.
  assert.deepEqual(summary.officers.map((row) => [row.name, row.inProgress, row.total]), [["Chưa có CV phụ trách", 2, 2], ["CV Một", 1, 2]]);
  assert.equal(summary.unassigned, 2);
  assert.equal(summary.pendingReviews, 6);
  assert.equal(summary.overdueReviews, 2);
  // Chỉ là việc của CV khi backend cho phép hành động.
  assert.deepEqual(summary.projectTasks.map((task) => [task.key, task.waiting, task.overdue]), [
    ["request-rq-1", "Xem xét đề nghị gia hạn", true],
    ["report-rp-1", "Xem xét báo cáo tiến độ", false]
  ]);
  assert.equal(summary.intakes.length, 1);
  assert.equal(summary.intakes[0].daysLeft, 6);
  assert.equal(summary.intakes[0].proposals, 3);
  assert.ok(Math.abs(summary.intakes[0].elapsed - 0.7125) < 1e-9);
  assert.deepEqual([summary.projects.total, summary.projects.overdue], [1, 1]);
});
