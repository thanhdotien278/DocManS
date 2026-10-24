import type { ViewerAuthorizationV1 } from "@rtms/permissions";
import { getApiBaseUrl } from "@/lib/session";

/**
 * EP-03 (ST-3.2 .. ST-3.5) client. Kept apart from `research-proposals-api.ts` because these
 * endpoints belong to the evaluation phase and are only ever called by staff, an assigned
 * reviewer, or an approval authority.
 *
 * Every visibility decision here is a hint for rendering. The backend re-checks authority, workflow
 * state and conflict on each call, so a stale flag can never widen what actually happens.
 */

/** Vị trí trong hội đồng thẩm định (spec hội đồng §5). `reviewer` = Phản biện, `committee_member` = Ủy viên. */
export type CouncilPosition = "council_chair" | "reviewer" | "committee_member" | "council_secretary";
export type ReviewAssignmentRole = CouncilPosition;
export const COUNCIL_POSITION_LABELS: Record<CouncilPosition, string> = {
  council_chair: "Chủ tịch hội đồng",
  reviewer: "Phản biện",
  committee_member: "Ủy viên",
  council_secretary: "Thư ký hội đồng"
};
export type ReviewRecommendation = "approve" | "revise" | "reject";

export type ProposalReviewAssignment = {
  id: string;
  proposalId: string;
  reviewerUserId: string;
  researcherProfileId: string | null;
  reviewerDisplayName: string;
  reviewerUsername: string;
  reviewerUnit: string;
  assignmentRole: ReviewAssignmentRole;
  assignmentRoleLabel: string;
  status: "assigned" | "revoked" | "completed";
  statusLabel: string;
  invitationStatus: "invited" | "accepted" | "declined";
  invitationStatusLabel: string;
  respondedAt: string;
  declineReason: string;
  councilEstablishedAt: string;
  assignedById: string;
  assignedByDisplayName: string;
  assignedAt: string;
  effectiveFrom: string;
  effectiveUntil: string;
  dueDate: string;
  revokedAt: string;
  completedAt: string;
  isOverdue?: boolean;
  reviewStatus: string;
  reviewSubmittedAt: string;
  reviewTotalScore: number | null;
  reviewRecommendation: string;
  reviewRecommendationLabel: string;
  /** false cho thư ký hội đồng: không chấm phiếu. */
  scoring?: boolean;
};

/** Trước khi chấp nhận / trước khi BGĐ ký hội đồng: chỉ tên hồ sơ, vai trò, hạn và người mời (Story 5.11). */
export type ReviewInvitationPreview = Pick<ProposalReviewAssignment, "id" | "proposalId" | "assignmentRole" | "assignmentRoleLabel" | "invitationStatus" | "invitationStatusLabel" | "dueDate" | "assignedByDisplayName"> & {
  access: "preview";
  proposal: { title: string };
};

export type ReviewerQueueItem = ReviewerGrantedItem | ReviewInvitationPreview;

export type ReviewerGrantedItem = Pick<ProposalReviewAssignment, "id" | "proposalId" | "assignmentRole" | "assignmentRoleLabel" | "status" | "statusLabel" | "assignedAt" | "effectiveFrom" | "effectiveUntil" | "dueDate" | "completedAt"> & {
  access: "granted";
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
  scoring?: boolean;
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
  status: "draft" | "finalized" | "ready_for_approval";
  statusLabel: string;
  revision: number;
  createdById: string;
  updatedById: string;
  updatedByDisplayName: string;
  markedReadyAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewProgressCounts = {
  reviewerCount?: number;
  committeeMemberCount?: number;
  assignmentRequirementsMet?: boolean;
  scoringMemberCount?: number;
  secretaryAssigned?: boolean;
  activeAssignmentCount: number;
  submittedCount: number;
  pendingCount: number;
  overdueCount?: number;
  readinessReasons?: string[];
  pendingReviewers?: Array<{ assignmentId: string; reviewerUserId: string; reviewerDisplayName: string }>;
  allReviewsSubmitted: boolean;
  averageTotalScore?: number | null;
  maxTotalScore: number;
};

export type ProposalReviewProgress = ReviewProgressCounts & {
  proposalId: string;
  proposalStatus: string;
  proposalStatusLabel: string;
  assignments: ProposalReviewAssignment[];
  reviews: SubmittedProposalReview[];
  evaluationSummary?: ProposalEvaluationSummary | null;
  reviewDeadlines?: Array<{ role: string; status: string; dueDate: string | null }>;
  recommendations: ReviewRecommendationOption[];
  disclosure?: "FULL" | "OVERSIGHT_REDACTED";
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
  publicSummary?: string;
  requiredFollowUp?: string;
};

export type ProposalDecisionPackage = {
  proposalId: string;
  proposalStatus: string;
  proposalStatusLabel: string;
  canDecide: boolean;
  /** Tờ trình DECISION_PACKAGE gần nhất; GĐ chỉ quyết định khi stage là LEADERSHIP và status PENDING. */
  approval: { id: string; stage: string; stageLabel: string; status: string; statusLabel: string; lastNote: string } | null;
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
  packageRevision: number;
  disclosure?: { protectedReviewData: "REDACTED" | "HIDDEN_CONFLICT" | "FULL" };
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
  contextVersion?: ViewerAuthorizationV1["contextVersion"];
  submissionEvidence?: { eventId: string; submittedAt: string; submissionVersion: string };
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
  code?: string;
  fieldErrors?: Record<string, string>;
  pendingReviewers?: Array<{ reviewerDisplayName: string }>;
  blockers?: string[];
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
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
    pendingReviewers?: Array<{ reviewerDisplayName: string }>;
    blockers?: string[];
  };

  if (!response.ok) {
    const error = new Error(body.message ?? "Không thể xử lý yêu cầu đánh giá.") as EvaluationApiError;
    error.status = response.status;
    error.code = body.code;
    error.fieldErrors = body.fieldErrors;
    error.pendingReviewers = body.pendingReviewers;
    error.blockers = body.blockers;
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
  input: { reviewerUserId: string; assignmentRole: ReviewAssignmentRole; dueDate?: string; contextVersion: ViewerAuthorizationV1["contextVersion"] }
) {
  const response = await requestJson<{ assignment: ProposalReviewAssignment }>(`/research-proposals/${proposalId}/review-assignments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
  return response.assignment;
}

export async function revokeProposalReviewAssignment(proposalId: string, assignmentId: string, note: string, contextVersion: ViewerAuthorizationV1["contextVersion"]) {
  const response = await requestJson<{ assignment: ProposalReviewAssignment }>(
    `/research-proposals/${proposalId}/review-assignments/${assignmentId}/revoke`,
    { method: "POST", body: JSON.stringify({ note, contextVersion }) }
  );
  return response.assignment;
}

export async function respondToReviewInvitation(proposalId: string, assignmentId: string, decision: "accept" | "decline", reason?: string) {
  const response = await requestJson<{ invitation: { id: string; invitationStatus: string; invitationStatusLabel: string } }>(
    `/research-proposals/${proposalId}/review-assignments/${assignmentId}/respond`,
    { method: "POST", body: JSON.stringify({ decision, reason }) }
  );
  return response.invitation;
}

// Story 5.10 — hội đồng đánh giá ----------------------------------------------------------------

export type CouncilStatus = "NOT_APPLICABLE" | "FORMING" | "READY_TO_SUBMIT" | "IN_APPROVAL" | "ESTABLISHED";

/** Hợp đồng spec §8.3. Mọi cờ `viewer.*` do backend quyết định; UI không tự suy quyền từ role. */
export type EvaluationCouncil = {
  contextVersion: ViewerAuthorizationV1["contextVersion"];
  roundId: string;
  status: CouncilStatus;
  statusLabel: string;
  legacyRound: boolean;
  config: { memberCount: number; structure: Record<CouncilPosition, number> };
  slots: Array<{ position: CouncilPosition; positionLabel: string; required: number; filled: number; accepted: number }>;
  blockers: string[];
  viewer: {
    canInvite: boolean; inviteBlockedReason: string;
    canRevoke: boolean;
    canSubmit: boolean; submitBlockedReason: string;
    canSign: boolean; canReturn: boolean; signBlockedReason: string;
  };
  approval: { id: string; stage: "BOARD_REVIEW" | "HEAD_REVIEW" | "LEADERSHIP" | "CLOSED"; stageLabel: string; status: string; statusLabel: string; submittedByName: string; lastNote: string } | null;
  establishedAt: string;
  members: Array<{
    assignmentId: string; reviewerUserId: string; displayName: string; username: string; unit: string;
    assignmentRole: CouncilPosition; assignmentRoleLabel: string; scoring: boolean;
    invitationStatus: "invited" | "accepted" | "declined"; invitationStatusLabel: string;
    declineReason: string; respondedAt: string; dueDate: string; assignedByDisplayName: string;
    councilEstablishedAt: string;
  }>;
};

export async function loadEvaluationCouncil(proposalId: string) {
  return (await requestJson<{ council: EvaluationCouncil }>(`/research-proposals/${proposalId}/evaluation-council`)).council;
}

export async function submitEvaluationCouncil(proposalId: string, contextVersion: EvaluationCouncil["contextVersion"], note?: string) {
  return requestJson<{ submissionId: string; stage: string }>(`/research-proposals/${proposalId}/evaluation-council/submit`, { method: "POST", body: JSON.stringify({ contextVersion, note: note || undefined }) });
}

export async function decideEvaluationCouncil(proposalId: string, decision: "sign" | "return", note: string, contextVersion: EvaluationCouncil["contextVersion"]) {
  return requestJson<{ submissionId: string; status: "APPROVED" | "RETURNED"; establishedAt?: string }>(`/research-proposals/${proposalId}/evaluation-council/decide`, { method: "POST", body: JSON.stringify({ decision, note, contextVersion }) });
}

/** Chỉ thư ký (P7): phiếu ẩn danh "Phiếu 1..N", không có tên người chấm. */
export type CouncilAnonymousReviews = {
  reviews: Array<{ label: string; totalScore: number | null; maxTotalScore: number; scoreData: Record<string, number>; recommendation: string; recommendationLabel: string; comment: string; submittedAt: string }>;
  progress: { scoringMemberCount: number; submittedCount: number; pendingCount: number; averageTotalScore: number | null };
};

export function loadCouncilAnonymousReviews(proposalId: string) {
  return requestJson<CouncilAnonymousReviews>(`/research-proposals/${proposalId}/evaluation-council/reviews`);
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
  input: { scoreData: Record<string, number>; comment: string; recommendation: string; contextVersion: ViewerAuthorizationV1["contextVersion"] }
) {
  const response = await requestJson<{ review: MyProposalReview }>(`/research-proposals/${proposalId}/my-review`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
  return response.review;
}

export async function submitMyProposalReview(
  proposalId: string,
  input: { scoreData: Record<string, number>; comment: string; recommendation: string; contextVersion: ViewerAuthorizationV1["contextVersion"] }
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
  input: { summary: string; recommendation: string; contextVersion: ViewerAuthorizationV1["contextVersion"] }
) {
  return requestJson<{ evaluationSummary: ProposalEvaluationSummary; proposalStatus: string }>(
    `/research-proposals/${proposalId}/evaluation-summary`,
    { method: "PUT", body: JSON.stringify(input) }
  );
}

export async function finalizeProposalEvaluationSummary(proposalId: string, contextVersion: ViewerAuthorizationV1["contextVersion"]) {
  return requestJson<{ evaluationSummary: ProposalEvaluationSummary; proposalStatus: string }>(
    `/research-proposals/${proposalId}/evaluation-summary/finalize`,
    { method: "POST", body: JSON.stringify({ contextVersion }) }
  );
}

export async function submitCompletedProposalPackage(proposalId: string, contextVersion: ViewerAuthorizationV1["contextVersion"]) {
  return requestJson<{ evaluationSummary: ProposalEvaluationSummary | null; proposalStatus: string }>(
    `/research-proposals/${proposalId}/evaluation-summary/submit`,
    { method: "POST", body: JSON.stringify({ contextVersion }) }
  );
}

// ST-3.5 --------------------------------------------------------------------------------------

export async function loadProposalDecisionPackage(proposalId: string) {
  const response = await requestJson<{ decisionPackage: ProposalDecisionPackage }>(`/research-proposals/${proposalId}/decision-package`);
  return response.decisionPackage;
}

export async function decideProposal(proposalId: string, decision: "approve" | "reject", note: string, packageRevision: number, contextVersion: ViewerAuthorizationV1["contextVersion"]) {
  return requestJson<{ decision: ProposalDecisionRecord; proposalStatus: string; proposalStatusLabel: string }>(
    `/research-proposals/${proposalId}/${decision}`,
    { method: "POST", body: JSON.stringify({ note, packageRevision, contextVersion }) }
  );
}

export type ReviewerCandidates = { users: Array<{ id: string; displayName: string; username: string | null }> };
export function loadReviewerCandidates(proposalId: string, query = "", position?: CouncilPosition) {
  return requestJson<ReviewerCandidates>(`/research-proposals/${proposalId}/assignable-reviewers?q=${encodeURIComponent(query)}${position ? `&position=${position}` : ""}`);
}
