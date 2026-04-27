import { CheckCircle2, Clock3, HelpCircle, PauseCircle, XCircle } from "lucide-react";

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

export const statusMeta: Record<
  string,
  { label: string; tone: StatusTone; Icon: typeof CheckCircle2 }
> = {
  approved: { label: "Đã duyệt", tone: "success", Icon: CheckCircle2 },
  completed: { label: "Hoàn thành", tone: "success", Icon: CheckCircle2 },
  "pending-approval": { label: "Chờ phê duyệt", tone: "warning", Icon: Clock3 },
  "in-review": { label: "Đang đánh giá", tone: "warning", Icon: Clock3 },
  "needs-supplement": { label: "Cần bổ sung", tone: "info", Icon: HelpCircle },
  submitted: { label: "Đã nộp", tone: "info", Icon: CheckCircle2 },
  overdue: { label: "Quá hạn", tone: "danger", Icon: XCircle },
  rejected: { label: "Từ chối", tone: "danger", Icon: XCircle },
  draft: { label: "Nháp", tone: "neutral", Icon: PauseCircle }
};
