import { CheckCircle2, Clock3, HelpCircle, PauseCircle, RotateCw, XCircle } from "lucide-react";

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export const statusMeta: Record<
  string,
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  assigned: { label: "Mới giao", tone: "info", Icon: RotateCw },
  accepted: { label: "Đã tiếp nhận", tone: "info", Icon: CheckCircle2 },
  approved: { label: "Đã duyệt", tone: "success", Icon: CheckCircle2 },
  passed: { label: "Đã thông qua", tone: "success", Icon: CheckCircle2 },
  completed: { label: "Hoàn thành", tone: "success", Icon: CheckCircle2 },
  processing: { label: "Đang xử lý", tone: "info", Icon: RotateCw },
  "in-progress": { label: "Đang thực hiện", tone: "info", Icon: RotateCw },
  "waiting-response": { label: "Chờ phản hồi", tone: "warning", Icon: Clock3 },
  "pending-result-approval": { label: "Chờ duyệt kết quả", tone: "warning", Icon: Clock3 },
  "pending-approval": { label: "Chờ phê duyệt", tone: "warning", Icon: Clock3 },
  "in-review": { label: "Đang đánh giá", tone: "warning", Icon: Clock3 },
  "needs-supplement": { label: "Cần bổ sung", tone: "info", Icon: HelpCircle },
  submitted: { label: "Đã nộp", tone: "info", Icon: CheckCircle2 },
  overdue: { label: "Quá hạn", tone: "danger", Icon: XCircle },
  "not-passed": { label: "Không thông qua", tone: "danger", Icon: XCircle },
  rejected: { label: "Từ chối", tone: "danger", Icon: XCircle },
  paused: { label: "Tạm dừng", tone: "neutral", Icon: PauseCircle },
  draft: { label: "Nháp", tone: "neutral", Icon: PauseCircle },
  "ethics-new": { label: "Mới tiếp nhận", tone: "info", Icon: RotateCw },
  "ethics-awaiting-check": { label: "Chờ kiểm tra", tone: "warning", Icon: Clock3 },
  "ethics-needs-evidence": { label: "Cần bổ sung minh chứng", tone: "warning", Icon: HelpCircle },
  "ethics-in-review": { label: "Đang thẩm định", tone: "warning", Icon: Clock3 },
  "ethics-awaiting-meeting": { label: "Chờ họp hội đồng", tone: "info", Icon: Clock3 },
  "ethics-approved": { label: "Đã thông qua", tone: "success", Icon: CheckCircle2 },
  "ethics-conditional-approved": { label: "Thông qua có điều kiện", tone: "warning", Icon: CheckCircle2 },
  "ethics-not-approved": { label: "Không thông qua", tone: "danger", Icon: XCircle },
  "ethics-paused": { label: "Tạm dừng", tone: "neutral", Icon: PauseCircle },
  "conference-draft": { label: "Dự thảo kế hoạch", tone: "neutral", Icon: PauseCircle },
  "conference-awaiting-appraisal": { label: "Chờ thẩm định", tone: "warning", Icon: Clock3 },
  "conference-pending-approval": { label: "Chờ phê duyệt", tone: "warning", Icon: Clock3 },
  "conference-approved": { label: "Đã phê duyệt", tone: "success", Icon: CheckCircle2 },
  "conference-preparing": { label: "Đang chuẩn bị", tone: "info", Icon: RotateCw },
  "conference-in-session": { label: "Đang tổ chức", tone: "info", Icon: RotateCw },
  "conference-awaiting-report": { label: "Chờ báo cáo sau hội thảo", tone: "warning", Icon: Clock3 },
  "conference-completed": { label: "Hoàn tất", tone: "success", Icon: CheckCircle2 },
  "conference-postponed": { label: "Tạm hoãn", tone: "neutral", Icon: PauseCircle }
};
