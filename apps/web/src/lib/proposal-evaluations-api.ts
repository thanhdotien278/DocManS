import { getApiBaseUrl } from "@/lib/session";

/**
 * EP-03 (ST-3.2 .. ST-3.5) client. Kept apart from `research-proposals-api.ts` because these
 * endpoints belong to the evaluation phase and are only ever called by staff, an assigned
 * reviewer, or an approval authority.
 *
 * Every visibility decision here is a hint for rendering. The backend re-checks authority, workflow
 * state and conflict on each call, so a stale flag can never widen what actually happens.
 */

export type ReviewAssignmentRole = "reviewer" | "committee_member";
export type ReviewRecommendation = "approve" | "revise" | "reject";

export type ProposalReviewAssignment = {
  id: string;
  proposalId: string;
  reviewerUserId: string;
  reviewerDisplayName: string;
  reviewerUsername: string;
  reviewerUnit: string;
  assignmentRole: ReviewAssignmentRole;
  assignmentRoleLabel: string;
  status: "assigned" | "revoked" | "completed";
  statusLabel: string;
  assignedById: string;
  assignedByDisplayName: string;
  assignedAt: string;
  dueDate: string;
  revokedAt: string;
  completedAt: string;
  reviewStatus: string;
  reviewSubmittedAt: string;
  reviewTotalScore: number | null;
  reviewRecommendation: string;
  reviewRecommendationLabel: string;
};

export type ReviewerQueueItem = ProposalReviewAssignment & {
  proposal: {
    id: string;
    code: string;
    title: string;
    status: string;
    statusLabel: string;
    submittedAt: string;
  };
  myReviewStatus: string;
  myReviewSubmittedAt: string;
};

export type ReviewScoreCriterion = {
  code: string;
  label: string;
  maxScore: number;
};

export type ReviewRecommendationOption = {
  code: ReviewRecommendation;
  label: string;
};

export type MyProposalReview = {
  id: string;
  assignmentId: string;
  reviewerUserId: string;
  status: "draft" | "submitted";
  scoreData: Record<string, number>;
  totalScore: number | null;
  comment: string;
  recommendation: string;
  recommendationLabel: string;
  submittedAt: string;
  canEdit: boolean;
  criteria: ReviewScoreCriterion[];
  maxTotalScore: number;
  recommendations: ReviewRecommendationOption[];
};

export type SubmittedProposalReview = {
  id: string;
  proposalId: string;
  assignmentId: string;
  reviewerUserId: string;
  reviewerDisplayName: string;
  status: string;
  scoreData: Record<string, number>;
  totalScore: number | null;
  maxTotalScore: number;
  comment: string;
  recommendation: string;
  recommendationLabel: string;
  submittedAt: string;
};

export type ProposalEvaluationSummary = {
  id: string;
  proposalId: string;
  summary: string;
  recommendation: string;
  recommendationLabel: string;
  status: "draft" | "ready_for_approval";
  statusLabel: string;
  createdById: string;
  updatedById: string;
  updatedByDisplayName: string;
  markedReadyAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewProgressCounts = {
  activeAssignmentCount: number;
  submittedCount: number;
  pendingCount: number;
  pendingReviewers: Array<{ assignmentId: string; reviewerUserId: string; reviewerDisplayName: string }>;
  allReviewsSubmitted: boolean;
  averageTotalScore: number | null;
  maxTotalScore: number;
};

export type ProposalReviewProgress = ReviewProgressCounts & {
  proposalId: string;
  proposalStatus: string;
  proposalStatusLabel: string;
  assignments: ProposalReviewAssignment[];
  reviews: SubmittedProposalReview[];
  evaluationSummary: ProposalEvaluationSummary | null;
  recommendations: ReviewRecommendationOption[];
};

export type ProposalDecisionRecord = {
  id: string;
  proposalId: string;
  decision: "approved" | "rejected";
  decisionLabel: string;
  note: string;
  decidedById: string;
  decidedByDisplayName: string;
  decidedAt: string;
  fromStatus: string;
  toStatus: string;
};

export type ProposalDecisionPackage = {
  proposalId: string;
  proposalStatus: string;
  proposalStatusLabel: string;
  canDecide: boolean;
  conflict: {
    conflicted: boolean;
    reasonCode: string;
    reason: string;
    viewerMessage: string;
  };
  progress: ReviewProgressCounts;
  reviews: SubmittedProposalReview[];
  evaluationSummary: ProposalEvaluationSummary | null;
  decisions: ProposalDecisionRecord[];
  attachmentCount: number;
  history: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    submittedAt: string;
    actorDisplayName: string;
    note: string;
  }>;
};

export type ProposalReviewPackage = {
  assignmentId: string;
  assignmentRole: string;
  assignmentRoleLabel: string;
  proposal: {
    id: string;
    code: string;
    title: string;
    status: string;
    statusLabel: string;
    objectives: string;
    summary: string;
    researchFieldCode: string;
    proposalTypeCode: string;
    startDate: string;
    endDate: string;
    budgetMetadata: { amount?: number; currency?: string };
    submittedAt: string;
  };
  members: Array<{ id: string; name: string; role: string; organization: string }>;
  attachments: Array<{
    id: string;
    requirementCode: string;
    fileName: string;
    description: string | null;
    mimeType: string;
    sizeBytes: number;
    uploaderDisplayName: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    submittedAt: string;
    actorDisplayName: string;
    note: string;
  }>;
};

/** Field-level validation detail the reviewer form renders next to the offending input. */
export type EvaluationApiError = Error & {
  /** HTTP status, or 0 when the request never reached the API. */
  status?: number;
  fieldErrors?: Record<string, string>;
  pendingReviewers?: Array<{ reviewerDisplayName: string }>;
};

/**
 * Only 401/403 mean "this panel does not apply to you". Anything else — a network failure, a 500,
 * a 404 — is a real error the user has to be told about, so panels must not treat it as a silent
 * "not entitled" and disappear.
 */
export function isNotEntitled(error: unknown) {
  const status = (error as EvaluationApiError)?.status;
  return status === 401 || status === 403;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } catch {
    const error = new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.") as EvaluationApiError;
    error.status = 0;
    throw error;
  }

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    fieldErrors?: Record<string, string>;
    pendingReviewers?: Array<{ reviewerDisplayName: string }>;
  };

  if (!response.ok) {
    const error = new Error(body.message ?? "Không thể xử lý yêu cầu đánh giá.") as EvaluationApiError;
    error.status = response.status;
    error.fieldErrors = body.fieldErrors;
    error.pendingReviewers = body.pendingReviewers;
    throw error;
  }

  return body as T;
}

// ST-3.2 --------------------------------------------------------------------------------------

export async function loadProposalReviewAssignments(proposalId: string) {
  const response = await requestJson<{ assignments: ProposalReviewAssignment[] }>(`/research-proposals/${proposalId}/review-assignments`);
  return response.assignments;
}

export async function assignProposalReviewer(
  proposalId: string,
  input: { reviewerUsername: string; assignmentRole: ReviewAssignmentRole; dueDate?: string }
) {
  const response = await requestJson<{ assignment: ProposalReviewAssignment }>(`/research-proposals/${proposalId}/review-assignments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  return response.assignment;
}

export async function revokeProposalReviewAssignment(proposalId: string, assignmentId: string, note: string) {
  const response = await requestJson<{ assignment: ProposalReviewAssignment }>(
    `/research-proposals/${proposalId}/review-assignments/${assignmentId}/revoke`,
    { method: "POST", body: JSON.stringify({ note }) }
  );
  return response.assignment;
}

export async function loadMyReviewAssignments() {
  const response = await requestJson<{ assignments: ReviewerQueueItem[] }>("/research-proposals/review-assignments/mine");
  return response.assignments;
}

export async function loadProposalReviewPackage(proposalId: string) {
  const response = await requestJson<{ reviewPackage: ProposalReviewPackage }>(`/research-proposals/${proposalId}/review-package`);
  return response.reviewPackage;
}

// ST-3.3 --------------------------------------------------------------------------------------

export async function loadMyProposalReview(proposalId: string) {
  const response = await requestJson<{ review: MyProposalReview }>(`/research-proposals/${proposalId}/my-review`);
  return response.review;
}

export async function saveMyProposalReview(
  proposalId: string,
  input: { scoreData: Record<string, number>; comment: string; recommendation: string }
) {
  const response = await requestJson<{ review: MyProposalReview }>(`/research-proposals/${proposalId}/my-review`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
  return response.review;
}

export async function submitMyProposalReview(
  proposalId: string,
  input: { scoreData: Record<string, number>; comment: string; recommendation: string }
) {
  const response = await requestJson<{ review: MyProposalReview }>(`/research-proposals/${proposalId}/my-review/submit`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  return response.review;
}

// ST-3.4 --------------------------------------------------------------------------------------

export async function loadProposalReviewProgress(proposalId: string) {
  const response = await requestJson<{ progress: ProposalReviewProgress }>(`/research-proposals/${proposalId}/review-progress`);
  return response.progress;
}

export async function saveProposalEvaluationSummary(
  proposalId: string,
  input: { summary: string; recommendation: string; markReady: boolean }
) {
  return requestJson<{ evaluationSummary: ProposalEvaluationSummary; proposalStatus: string }>(
    `/research-proposals/${proposalId}/evaluation-summary`,
    { method: "PUT", body: JSON.stringify(input) }
  );
}

// ST-3.5 --------------------------------------------------------------------------------------

export async function loadProposalDecisionPackage(proposalId: string) {
  const response = await requestJson<{ decisionPackage: ProposalDecisionPackage }>(`/research-proposals/${proposalId}/decision-package`);
  return response.decisionPackage;
}

export async function decideProposal(proposalId: string, decision: "approve" | "reject", note: string) {
  return requestJson<{ decision: ProposalDecisionRecord; proposalStatus: string; proposalStatusLabel: string }>(
    `/research-proposals/${proposalId}/${decision}`,
    { method: "POST", body: JSON.stringify({ note }) }
  );
}
