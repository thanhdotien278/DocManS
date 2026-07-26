/**
 * EP-03 — the proposal workflow states and the transitions each domain operation is allowed to
 * make. Kept as one table so a state rule is stated once instead of being re-derived by every
 * service, and so "which states allow this action" is reviewable next to the permission matrix
 * (docs/permission-matrix.md section 7.4).
 */

export const PROPOSAL_STATUS = {
  draft: "draft",
  submitted: "submitted",
  supplementRequested: "supplement_requested",
  resubmitted: "resubmitted",
  underReview: "under_review",
  readyForApproval: "ready_for_approval",
  approved: "approved",
  rejected: "rejected"
} as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  [PROPOSAL_STATUS.draft]: "Nháp",
  [PROPOSAL_STATUS.submitted]: "Đã nộp",
  [PROPOSAL_STATUS.supplementRequested]: "Chờ bổ sung",
  [PROPOSAL_STATUS.resubmitted]: "Đã nộp lại",
  [PROPOSAL_STATUS.underReview]: "Đang đánh giá",
  [PROPOSAL_STATUS.readyForApproval]: "Chờ phê duyệt",
  [PROPOSAL_STATUS.approved]: "Đã duyệt",
  [PROPOSAL_STATUS.rejected]: "Từ chối"
};

/**
 * States in which staff may request a supplement, per ST-3.1 and the permission matrix state rule
 * ("Submitted, needs supplement"). Deliberately narrow: `tests/proposals-ep02.test.mjs` asserts that
 * a resubmitted proposal cannot be sent back again, which is what stops an endless supplement loop.
 *
 * Known consequence, flagged for the product owner rather than decided here: a reviewer's
 * "đề nghị chỉnh sửa, bổ sung" outcome (ST-3.3) therefore has no return path to the PI. Adding one
 * means widening this list *and* the matrix, which changes agreed ST-3.1 behaviour.
 */
export const SUPPLEMENT_REQUESTABLE_STATUSES: ProposalStatus[] = [PROPOSAL_STATUS.submitted];

/** States in which staff may create or change a reviewer assignment (ST-3.2). */
export const REVIEWER_ASSIGNABLE_STATUSES: ProposalStatus[] = [
  PROPOSAL_STATUS.submitted,
  PROPOSAL_STATUS.resubmitted,
  PROPOSAL_STATUS.underReview
];

/** States in which an assigned reviewer may write or submit their review (ST-3.3). */
export const REVIEW_SUBMITTABLE_STATUSES: ProposalStatus[] = [PROPOSAL_STATUS.underReview];

/** States in which staff may save or update the consolidated outcome (ST-3.4). */
export const CONSOLIDATABLE_STATUSES: ProposalStatus[] = [PROPOSAL_STATUS.underReview, PROPOSAL_STATUS.readyForApproval];

/** The only state a leadership approve/reject decision may act on (ST-3.5). */
export const DECIDABLE_STATUSES: ProposalStatus[] = [PROPOSAL_STATUS.readyForApproval];

/**
 * States a proposal has to have passed through for it to be part of the formal workflow. Leadership
 * reads are scoped to these: a draft belongs to its owner alone until it is submitted.
 */
export const WORKFLOW_VISIBLE_STATUSES: ProposalStatus[] = [
  PROPOSAL_STATUS.submitted,
  PROPOSAL_STATUS.supplementRequested,
  PROPOSAL_STATUS.resubmitted,
  PROPOSAL_STATUS.underReview,
  PROPOSAL_STATUS.readyForApproval,
  PROPOSAL_STATUS.approved,
  PROPOSAL_STATUS.rejected
];

export function isWorkflowVisibleStatus(status: string) {
  return (WORKFLOW_VISIBLE_STATUSES as string[]).includes(status);
}

export function canAssignReviewersInStatus(status: string) {
  return (REVIEWER_ASSIGNABLE_STATUSES as string[]).includes(status);
}

export function canSubmitReviewInStatus(status: string) {
  return (REVIEW_SUBMITTABLE_STATUSES as string[]).includes(status);
}

export function canConsolidateInStatus(status: string) {
  return (CONSOLIDATABLE_STATUSES as string[]).includes(status);
}

export function canDecideInStatus(status: string) {
  return (DECIDABLE_STATUSES as string[]).includes(status);
}
