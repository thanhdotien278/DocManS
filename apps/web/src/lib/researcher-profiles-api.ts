import { getApiBaseUrl } from "@/lib/session";
import type { ContextVersionTokenV1, ViewerAuthorizationV1 } from "@rtms/permissions";

export type ResearcherCatalogItem = { id: string; code: string; name: string; type: string };
export type ResearcherOrganization = { id: string; code: string; name: string };
export type ResearcherProfile = {
  id: string;
  fullName: string;
  externalAffiliation?: string | null;
  academicRank?: ResearcherCatalogItem | null;
  academicDegree?: ResearcherCatalogItem | null;
  title?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactNote?: string | null;
  managementOrganization: ResearcherOrganization;
  researchFields: ResearcherCatalogItem[];
  expertiseKeywords: string[];
  status: string;
  aggregateVersion: number;
  createdAt: string;
  updatedAt: string;
  viewerAuthorization: ViewerAuthorizationV1;
};

export type ResearcherProfileInput = {
  fullName: string;
  managementOrganizationUnitId: string;
  externalAffiliation?: string;
  academicRankCatalogItemId?: string;
  academicDegreeCatalogItemId?: string;
  title?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNote?: string;
  researchFieldIds: string[];
  expertiseKeywords?: string[];
  confirmDuplicate?: boolean;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể xử lý hồ sơ nhà khoa học.");
  return body as T;
}

export async function loadResearcherProfiles(keyword?: string) {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return requestJson<{ profiles: ResearcherProfile[]; organizationOptions: ResearcherOrganization[]; total: number }>(`/researcher-profiles${query}`);
}

export async function loadResearcherProfileCatalogs() {
  return requestJson<{ researchFields: ResearcherCatalogItem[]; academicRanks: ResearcherCatalogItem[]; academicDegrees: ResearcherCatalogItem[] }>("/researcher-profiles/catalogs");
}

export async function createResearcherProfile(input: ResearcherProfileInput) {
  return requestJson<{
    profile: ResearcherProfile | null;
    duplicateWarning: boolean;
    requiresConfirmation: boolean;
    duplicateCandidates: Array<{ id: string; fullName: string; managementOrganization: ResearcherOrganization }>;
  }>("/researcher-profiles", { method: "POST", body: JSON.stringify(input) });
}

export async function updateResearcherProfile(id: string, input: Partial<ResearcherProfileInput> & { contextVersion: ContextVersionTokenV1 }) {
  return requestJson<{ profile: ResearcherProfile }>(`/researcher-profiles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function setResearcherProfileStatus(id: string, status: "ACTIVE" | "INACTIVE", contextVersion: ContextVersionTokenV1) {
  return requestJson<{ profile: ResearcherProfile }>(`/researcher-profiles/${id}/${status === "ACTIVE" ? "activate" : "deactivate"}`, { method: "POST", body: JSON.stringify({ contextVersion }) });
}
