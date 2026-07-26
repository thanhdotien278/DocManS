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
  | "pending-approval"
  | "approved"
  | "rejected"
  | "overdue"
  | "completed";

/**
 * The persisted `ResearchProposal.status` values (EP-02, EP-03). Distinct from `WorkflowStatus`,
 * which is the broader presentation vocabulary the demo surfaces also use.
 */
export type ProposalWorkflowStatus =
  | "draft"
  | "submitted"
  | "supplement_requested"
  | "resubmitted"
  | "under_review"
  | "ready_for_approval"
  | "approved"
  | "rejected";
