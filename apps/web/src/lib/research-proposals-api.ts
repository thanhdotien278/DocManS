import { getApiBaseUrl } from "@/lib/session";
import type { RequiredPackageItem } from "@/lib/proposal-intake-periods-api";

export type ProposalMember = {
  name: string;
  role: string;
  organization: string;
};

export type ProposalAttachment = {
  id: string;
  proposalId: string;
  requirementCode: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedById: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ProposalHistoryEvent = {
  id: string;
  proposalId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  submittedAt: string;
  note: string;
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
  status: "draft" | "submitted";
  submittedAt: string;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canSubmit: boolean;
  members?: ProposalMember[];
  attachments?: ProposalAttachment[];
  history?: ProposalHistoryEvent[];
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

export async function updateResearchProposalDraft(id: string, input: Partial<ProposalDraftInput>) {
  return requestJson<{ proposal: ResearchProposal }>(`/research-proposals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function uploadProposalAttachment(
  proposalId: string,
  input: {
    requirementCode: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }
) {
  return requestJson<{ attachment: ProposalAttachment }>(`/research-proposals/${proposalId}/attachments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
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
