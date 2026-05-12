export type DemoUserRole =
  | "Lãnh đạo"
  | "Chuyên viên quản lý khoa học"
  | "Chủ nhiệm đề tài"
  | "Reviewer";

export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "needs-supplement"
  | "in-review"
  | "processing"
  | "assigned"
  | "accepted"
  | "in-progress"
  | "waiting-response"
  | "pending-result-approval"
  | "pending-approval"
  | "approved"
  | "passed"
  | "not-passed"
  | "rejected"
  | "overdue"
  | "completed"
  | "paused";
