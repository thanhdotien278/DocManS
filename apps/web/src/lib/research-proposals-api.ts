import { getApiBaseUrl } from "@/lib/session";
import type { RequiredPackageItem } from "@/lib/proposal-intake-periods-api";
import { isViewerAuthorizationV1, type BlockedActionV1, type PermissionActionV1, type ViewerAuthorizationV1 } from "@rtms/permissions";

/** Record-scoped participation role codes returned by the API (ST-3.0). */
export type ProposalParticipationRole = "principal-investigator" | "secretary" | "member" | "none" | "unknown";

export type ProposalMember = {
  id?: string;
  name: string;
  role: string;
  organization: string;
  /** Set when the participant is linked to a system account; empty for external participants. */
  userId?: string;
  /** Write-only alternative to `userId` — the API resolves it to an account. */
  username?: string;
  isAccountLinked?: boolean;
  participationRole?: ProposalParticipationRole;
  participationRoleLabel?: string;
};

/**
 * The viewer's role on this specific proposal, computed by the backend from the record
 * relationship. Never derive this from the account-level system role (UX-DR26).
 */
export type ProposalViewerParticipation = {
  role: ProposalParticipationRole;
  label: string;
  roles: ProposalParticipationRole[];
  labels: string[];
  isOwner: boolean;
  isParticipant: boolean;
  conflict: {
    conflicted: boolean;
    reasonCode: "no-conflict" | "participation" | "unresolved";
    reason: string;
    /** Plain-language reason to show next to a blocked control (UX-DR27). */
    message: string;
  };
};

/** The persisted proposal workflow states (EP-02 intake/submission, EP-03 evaluation/approval). */
export type ProposalWorkflowStatus =
  | "draft"
  | "submitted"
  | "supplement_requested"
  | "resubmitted"
  | "under_review"
  | "ready_for_approval"
  | "approved"
  | "rejected";

/**
 * The viewer's reviewer assignment on this specific proposal (ST-3.2). Like participation, it is
 * resolved from the assignment record — the `reviewer` account role grants nothing on its own.
 */
export type ProposalViewerReviewAssignment = {
  isAssignedReviewer: boolean;
  assignmentId: string;
  assignmentRole: "reviewer" | "committee_member" | "none";
  assignmentRoleLabel: string;
};

export type ProposalCapabilityState = {
  capability: ViewerAuthorizationV1 | null;
  reloadRequired: boolean;
  reason: string;
};

export function getProposalCapabilityState(proposal: Pick<ResearchProposal, "id" | "viewerAuthorization">): ProposalCapabilityState {
  if (!isViewerAuthorizationV1(proposal.viewerAuthorization)) {
    return { capability: null, reloadRequired: true, reason: "Không thể xác minh quyền thao tác. Vui lòng tải lại hồ sơ hoặc liên hệ hỗ trợ." };
  }
  if (proposal.viewerAuthorization.contextVersion.domain !== "proposal" || proposal.viewerAuthorization.contextVersion.recordId !== proposal.id) {
    return { capability: null, reloadRequired: true, reason: "Ngữ cảnh quyền không khớp hồ sơ đang mở. Vui lòng tải lại hồ sơ hoặc liên hệ hỗ trợ." };
  }
  return { capability: proposal.viewerAuthorization, reloadRequired: false, reason: "" };
}

export function blockedProposalAction(state: ProposalCapabilityState, action: PermissionActionV1): BlockedActionV1 | null {
  return state.capability?.blockedActions.find((item) => item.action === action) ?? null;
}

export function canPerformProposalAction(state: ProposalCapabilityState, action: PermissionActionV1) {
  return !state.reloadRequired && Boolean(state.capability?.allowedActions.includes(action));
}

export type ProposalAttachment = {
  id: string;
  relatedEntityType: string;
  relatedEntityId: string;
  proposalId: string;
  filePurpose: string;
  requirementCode: string;
  fileName: string;
  description?: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploaderDisplayName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
};

export type ProposalHistoryEvent = {
  id: string;
  proposalId: string;
  actorId: string;
  actorDisplayName: string;
  fromStatus: string;
  toStatus: string;
  submittedAt: string;
  note: string;
};

export type ProposalSupplementRequest = {
  id: string;
  proposalId: string;
  actorId: string;
  actorDisplayName: string;
  reason: string;
  dueDate: string;
  requestedAt: string;
  resolvedAt: string;
  status: string;
};

export type ResearchProposal = {
  id: string;
  code: string;
  intakePeriodId: string;
  ownerId: string;
  hostOrganizationUnitId: string;
  researchFieldCode: string;
  proposalTypeCode: string;
  title: string;
  objectives: string;
  summary: string;
  startDate: string;
  endDate: string;
  budgetMetadata: {
    amount?: number;
    currency?: string;
    note?: string;
  };
  status: ProposalWorkflowStatus;
  /** Vietnamese label for `status`, resolved by the backend so both apps read the same wording. */
  statusLabel?: string;
  submittedAt: string;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canSubmit: boolean;
  viewerAuthorization?: ViewerAuthorizationV1;
  viewerParticipation?: ProposalViewerParticipation;
  viewerReviewAssignment?: ProposalViewerReviewAssignment;
  members?: ProposalMember[];
  attachments?: ProposalAttachment[];
  history?: ProposalHistoryEvent[];
  supplementRequests?: ProposalSupplementRequest[];
  requiredPackage?: RequiredPackageItem[];
};

export type ReadinessItem = {
  code: string;
  label: string;
};

export type ProposalReadiness = {
  ready: boolean;
  missingFields: ReadinessItem[];
  missingFiles: ReadinessItem[];
};

export type ProposalDraftInput = {
  intakePeriodId?: string;
  hostOrganizationUnitId: string;
  title: string;
  researchFieldCode?: string;
  proposalTypeCode?: string;
  startDate?: string;
  endDate?: string;
  objectives?: string;
  summary?: string;
  budgetMetadata?: {
    amount?: number;
    currency?: string;
    note?: string;
  };
  members?: ProposalMember[];
};

export type ApiErrorWithReadiness = Error & {
  missingFields?: ReadinessItem[];
  missingFiles?: ReadinessItem[];
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    missingFields?: ReadinessItem[];
    missingFiles?: ReadinessItem[];
  };

  if (!response.ok) {
    const error = new Error(body.message ?? "Không thể xử lý yêu cầu hồ sơ.") as ApiErrorWithReadiness;
    error.missingFields = body.missingFields;
    error.missingFiles = body.missingFiles;
    throw error;
  }

  return body as T;
}

export async function loadResearchProposals() {
  const response = await requestJson<{ proposals: ResearchProposal[] }>("/research-proposals");
  return response.proposals;
}

export async function createResearchProposalDraft(input: ProposalDraftInput) {
  return requestJson<{ proposal: ResearchProposal }>("/research-proposals", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function loadResearchProposal(id: string) {
  const response = await requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}`);
  return response.proposal;
}

export async function updateResearchProposalDraft(
  id: string,
  input: Partial<ProposalDraftInput>,
  contextVersion?: ViewerAuthorizationV1["contextVersion"]
) {
  return requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, ...(input.members !== undefined ? { contextVersion } : {}) })
  });
}

export async function uploadProposalAttachment(
  proposalId: string,
  input: {
    requirementCode: string;
    description: string;
    file: File;
  }
) {
  const formData = new FormData();
  formData.set("relatedEntityType", "research_proposal");
  formData.set("relatedEntityId", proposalId);
  formData.set("filePurpose", input.requirementCode);
  formData.set("originalFileName", input.file.name);
  formData.set("description", input.description);
  formData.set("file", input.file);

  const response = await fetch(`${getApiBaseUrl()}/files`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string; file?: ProposalAttachment };
  if (!response.ok || !body.file) {
    throw new Error(body.message ?? "Không thể tải tệp.");
  }

  return { attachment: body.file };
}

export async function updateProposalAttachmentMetadata(attachmentId: string, input: { description: string | null }) {
  const response = await fetch(`${getApiBaseUrl()}/files/${attachmentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string; file?: ProposalAttachment };
  if (!response.ok || !body.file) {
    throw new Error(body.message ?? "Không thể cập nhật metadata tệp.");
  }

  return body;
}

export async function deleteProposalAttachment(attachmentId: string) {
  const response = await fetch(`${getApiBaseUrl()}/files/${attachmentId}`, {
    method: "DELETE",
    credentials: "include"
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string; file?: ProposalAttachment };
  if (!response.ok || !body.file) {
    throw new Error(body.message ?? "Không thể xóa metadata tệp.");
  }

  return body;
}

export function getProposalAttachmentDownloadUrl(attachmentId: string) {
  return `${getApiBaseUrl()}/files/${attachmentId}/download`;
}

export async function loadProposalReadiness(id: string) {
  const response = await requestJson<{ readiness: ProposalReadiness }>(`/research-proposals/${id}/readiness`);
  return response.readiness;
}

export async function submitResearchProposal(id: string) {
  return requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}/submit`, {
    method: "POST"
  });
}

export async function requestProposalSupplement(id: string, input: { reason: string; dueDate: string }) {
  return requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}/supplement-requests`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resubmitResearchProposal(id: string) {
  return requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}/resubmit`, {
    method: "POST"
  });
}
