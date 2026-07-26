import { CheckCircle2, Clock3, HelpCircle, PauseCircle, XCircle } from "lucide-react";

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export const statusMeta: Record<
  string,
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  approved: { label: "Đã duyệt", tone: "success", Icon: CheckCircle2 },
  active: { label: "Hoạt động", tone: "success", Icon: CheckCircle2 },
  open: { label: "Đang mở", tone: "success", Icon: CheckCircle2 },
  completed: { label: "Hoàn thành", tone: "success", Icon: CheckCircle2 },
  "pending-approval": { label: "Chờ phê duyệt", tone: "warning", Icon: Clock3 },
  "in-review": { label: "Đang đánh giá", tone: "warning", Icon: Clock3 },
  "needs-supplement": { label: "Cần bổ sung", tone: "info", Icon: HelpCircle },
  supplement_requested: { label: "Chờ bổ sung", tone: "warning", Icon: HelpCircle },
  resubmitted: { label: "Đã nộp lại", tone: "info", Icon: CheckCircle2 },
  submitted: { label: "Đã nộp", tone: "info", Icon: CheckCircle2 },
  overdue: { label: "Quá hạn", tone: "danger", Icon: XCircle },
  expired: { label: "Quá hạn", tone: "danger", Icon: XCircle },
  closed: { label: "Đã đóng", tone: "danger", Icon: XCircle },
  blocked: { label: "Bị khóa", tone: "danger", Icon: XCircle },
  locked: { label: "Bị khóa", tone: "danger", Icon: XCircle },
  disabled: { label: "Vô hiệu", tone: "danger", Icon: XCircle },
  rejected: { label: "Từ chối", tone: "danger", Icon: XCircle },
  draft: { label: "Nháp", tone: "neutral", Icon: PauseCircle }
};
