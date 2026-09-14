import { getApiBaseUrl } from "@/lib/session";

export type RequiredPackageItem = {
  code: string;
  label: string;
  allowedMimeTypes: string[];
  maxSizeMb: number | null;
  templateFileId?: string;
  fileName?: string;
  description?: string;
  uploadIndex?: number;
};

export type ProposalIntakePeriod = {
  contextVersion: string;
  applicableOrganizationUnitIds: string[];
  capabilities: { canEdit: boolean; canOpen: boolean; canClose: boolean; canCreateProposal: boolean };
  id: string;
  code: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: "draft" | "open" | "closed" | "expired";
  applicableOrganizationUnitId: string;
  requiredPackage: RequiredPackageItem[];
  createdAt: string;
  updatedAt: string;
};

export type IntakePeriodInput = {
  contextVersion?: string;
  applicableOrganizationUnitIds?: string[];
  code: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  applicableOrganizationUnitId?: string;
  requiredPackage: RequiredPackageItem[];
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers
    }
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? "Không thể xử lý yêu cầu đợt tiếp nhận.");
  }

  return body as T;
}

export async function loadProposalIntakePeriods(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await requestJson<{ intakePeriods: ProposalIntakePeriod[] }>(`/proposal-intake-periods${query}`);
  return response.intakePeriods;
}

function intakeBody(input: Partial<IntakePeriodInput>, files: File[]) {
  const body = new FormData();
  body.append("data", JSON.stringify(input));
  files.forEach((file) => body.append("files", file));
  return body;
}

export function intakeTemplateUrl(periodId: string, fileId: string) {
  return `${getApiBaseUrl()}/proposal-intake-periods/${periodId}/templates/${fileId}`;
}

export async function createProposalIntakePeriod(input: IntakePeriodInput, files: File[] = []) {
  return requestJson<{ intakePeriod: ProposalIntakePeriod }>("/proposal-intake-periods", {
    method: "POST",
    body: intakeBody(input, files)
  });
}

export async function updateProposalIntakePeriod(id: string, input: Partial<IntakePeriodInput>, files: File[] = []) {
  return requestJson<{ intakePeriod: ProposalIntakePeriod }>(`/proposal-intake-periods/${id}`, {
    method: "PATCH",
    body: intakeBody(input, files)
  });
}

export async function openProposalIntakePeriod(id: string, contextVersion: string) {
  return requestJson<{ intakePeriod: ProposalIntakePeriod }>(`/proposal-intake-periods/${id}/open`, {
    method: "POST", body: JSON.stringify({ contextVersion })
  });
}

export async function closeProposalIntakePeriod(id: string, contextVersion: string) {
  return requestJson<{ intakePeriod: ProposalIntakePeriod }>(`/proposal-intake-periods/${id}/close`, {
    method: "POST", body: JSON.stringify({ contextVersion })
  });
}

export type IntakeOptions = { canCreate: boolean; organizationUnits: Array<{ id: string; name: string; code: string }> };
export function loadIntakeOptions() { return requestJson<IntakeOptions>("/proposal-intake-periods/options"); }
