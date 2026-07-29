/**
 * ST-3.2 / ST-3.3 — assignment-scoped review primitives.
 *
 * Pure policy layer, in the same spirit as `proposal-participation.ts`: reviewer authority is a
 * property of an assignment record on one proposal, never of the `reviewer` account role. Every
 * caller resolves the same shape from its own query so the rule is stated once.
 */

export const REVIEW_ASSIGNMENT_STATUS = {
  assigned: "assigned",
  revoked: "revoked",
  completed: "completed"
} as const;

export type ReviewAssignmentStatus = (typeof REVIEW_ASSIGNMENT_STATUS)[keyof typeof REVIEW_ASSIGNMENT_STATUS];

export type ReviewAssignmentRole = "reviewer" | "committee_member";

export const REVIEW_ASSIGNMENT_ROLE_LABELS: Record<ReviewAssignmentRole, string> = {
  reviewer: "Người phản biện",
  committee_member: "Thành viên hội đồng"
};

export const REVIEW_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  [REVIEW_ASSIGNMENT_STATUS.assigned]: "Đang được phân công",
  [REVIEW_ASSIGNMENT_STATUS.revoked]: "Đã thu hồi",
  [REVIEW_ASSIGNMENT_STATUS.completed]: "Đã hoàn thành"
};

export const REVIEW_STATUS = {
  draft: "draft",
  submitted: "submitted"
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export type ReviewRecommendation = "approve" | "revise" | "reject";

export const REVIEW_RECOMMENDATION_LABELS: Record<ReviewRecommendation, string> = {
  approve: "Đề nghị phê duyệt",
  revise: "Đề nghị chỉnh sửa, bổ sung",
  reject: "Đề nghị không phê duyệt"
};

export const REVIEW_RECOMMENDATIONS = Object.keys(REVIEW_RECOMMENDATION_LABELS) as ReviewRecommendation[];

/**
 * A deliberately fixed rubric rather than a configurable engine (ST-3.3 explicitly rules one out).
 * Criterion codes match the `scoring-criterion` catalog type seeded in EP-01, so a later story can
 * move this table into the catalog without changing the stored `scoreData` shape.
 */
export const REVIEW_SCORE_CRITERIA = [
  { code: "scientific-value", label: "Giá trị khoa học", maxScore: 30 },
  { code: "feasibility", label: "Tính khả thi", maxScore: 25 },
  { code: "practical-impact", label: "Hiệu quả ứng dụng", maxScore: 25 },
  { code: "budget-suitability", label: "Tính hợp lý của kinh phí", maxScore: 20 }
] as const;

export const REVIEW_MAX_TOTAL_SCORE = REVIEW_SCORE_CRITERIA.reduce((total, criterion) => total + criterion.maxScore, 0);

export type ReviewScoreEntry = { code: string; score: number };

export type ReviewAssignmentLike = {
  id: string;
  status: string;
  assignmentRole?: string | null;
};

export type ProposalReviewAccess = {
  /** True only while an assignment row for this user on this proposal is still active. */
  isAssignedReviewer: boolean;
  /** The active assignment, if any. Reviews are written against this id, never against a user id. */
  assignmentId: string;
  assignmentRole: ReviewAssignmentRole | "none";
};

const NO_REVIEW_ACCESS: ProposalReviewAccess = {
  isAssignedReviewer: false,
  assignmentId: "",
  assignmentRole: "none"
};

export function normalizeAssignmentRole(value: unknown): ReviewAssignmentRole {
  if (typeof value !== "string") {
    return "reviewer";
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "committee_member" ? "committee_member" : "reviewer";
}

export function getAssignmentRoleLabel(role: string) {
  return REVIEW_ASSIGNMENT_ROLE_LABELS[normalizeAssignmentRole(role)];
}

export function getRecommendationLabel(value: string | null | undefined) {
  return value && value in REVIEW_RECOMMENDATION_LABELS ? REVIEW_RECOMMENDATION_LABELS[value as ReviewRecommendation] : "";
}

/**
 * Resolves what a user may do on one proposal from that user's assignment rows on it. Only an
 * `assigned` row grants access: a revoked assignment stays in history but stops granting anything,
 * and a completed one keeps read access to the package the review was written against.
 */
export function resolveProposalReviewAccess(assignments?: ReviewAssignmentLike[] | null): ProposalReviewAccess {
  if (!assignments?.length) {
    return NO_REVIEW_ACCESS;
  }

  const active =
    assignments.find((assignment) => assignment.status === REVIEW_ASSIGNMENT_STATUS.assigned) ??
    assignments.find((assignment) => assignment.status === REVIEW_ASSIGNMENT_STATUS.completed);

  if (!active) {
    return NO_REVIEW_ACCESS;
  }

  return {
    isAssignedReviewer: true,
    assignmentId: active.id,
    assignmentRole: normalizeAssignmentRole(active.assignmentRole)
  };
}

/**
 * Validates a submitted score set against the fixed rubric. Returns the normalized entries and the
 * total; throws nothing so the caller decides which exception type fits its transport.
 */
export function validateReviewScores(value: unknown): { entries: ReviewScoreEntry[]; totalScore: number; errors: string[] } {
  const errors: string[] = [];
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const entries: ReviewScoreEntry[] = [];
  let totalScore = 0;

  for (const criterion of REVIEW_SCORE_CRITERIA) {
    const raw = source[criterion.code];

    if (raw === undefined || raw === null || raw === "") {
      errors.push(`Chưa chấm điểm tiêu chí "${criterion.label}".`);
      continue;
    }

    const score = readScoreNumber(raw);
    if (score === null || !Number.isInteger(score) || score < 0 || score > criterion.maxScore) {
      errors.push(`Điểm tiêu chí "${criterion.label}" phải là số nguyên từ 0 đến ${criterion.maxScore}.`);
      continue;
    }

    entries.push({ code: criterion.code, score });
    totalScore += score;
  }

  return { entries, totalScore, errors };
}

/**
 * Accepts a number, or the decimal string an HTML number input produces. Everything else is
 * rejected rather than coerced: bare `Number()` would turn `true` into 1 and `[5]` into 5, which
 * would let a hand-built request store a score nobody entered.
 */
function readScoreNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
    return Number(raw.trim());
  }

  return null;
}

export function toScoreDataObject(entries: ReviewScoreEntry[]) {
  return Object.fromEntries(entries.map((entry) => [entry.code, entry.score]));
}
