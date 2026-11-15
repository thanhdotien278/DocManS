import type { PermissionActionV1 } from "@rtms/permissions";
import type { ResearchProposal } from "@/lib/research-proposals-api";

// Việc tiếp theo của người xem trên một hồ sơ đề xuất, suy ra từ hành động backend cho phép (allowedActions),
// không từ vai trò hệ thống. Thứ tự là thứ tự ưu tiên khi có nhiều hành động.
const NEXT_STEPS: [PermissionActionV1, string, string][] = [
  ["proposal.decision.approve", "Chờ bạn quyết định phê duyệt", "Xem và quyết định"],
  ["proposal.submit", "Hoàn thiện và nộp hồ sơ", "Mở hồ sơ"],
  ["proposal.completeness.check", "Kiểm tra tính đầy đủ của hồ sơ", "Kiểm tra hồ sơ"],
  ["proposal.review.assign", "Phân công đánh giá", "Phân công"],
  ["proposal.review.finalize", "Hoàn tất tổng hợp đánh giá", "Tổng hợp"],
  ["proposal.review.submit-package", "Trình hồ sơ đã đánh giá", "Trình hồ sơ"]
];
const CLOSED_STATUSES = ["draft", "approved", "rejected", "withdrawn"];

export function proposalNextStep(proposal: Pick<ResearchProposal, "status" | "viewerAuthorization" | "managementOfficer">) {
  const allowed = proposal.viewerAuthorization?.allowedActions ?? [];
  const step = NEXT_STEPS.find(([action]) => allowed.includes(action));
  if (step) return { waiting: step[1], action: step[2] };
  return allowed.includes("proposal.management-officer.assign") && proposal.managementOfficer?.resolved && !proposal.managementOfficer.current && !CLOSED_STATUSES.includes(proposal.status)
    ? { waiting: "Phân công chuyên viên phụ trách", action: "Phân công" }
    : null;
}
