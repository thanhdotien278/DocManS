import { getApiBaseUrl } from "@/lib/session";
import type { ContextVersionTokenV1, ViewerAuthorizationV1 } from "@rtms/permissions";

export type ResearcherCatalogItem = { id: string; code: string; name: string; type: string };
export type ResearcherOrganization = { id: string; code: string; name: string };
export type Publication = { id?: string; title: string; venue?: string | null; publicationYear?: number | null; doi?: string | null; authors?: string | null; status?: "ACTIVE" | "INACTIVE"; notes?: string | null };
export type Participation = { id?: string; projectTitle: string; participationRole: string; level: "ACADEMY_INSTITUTIONAL" | "MINISTRY" | "OTHER"; startsOn?: string | null; endsOn?: string | null; status?: "ACTIVE" | "INACTIVE" | "SUPERSEDED"; notes?: string | null; supersedesId?: string | null };
export type ResearcherProfileInput = {
  fullName: string; managementOrganizationUnitId: string; profileType?: "INTERNAL" | "EXTERNAL";
  externalAffiliation?: string | null; academicRankCatalogItemId?: string | null; academicDegreeCatalogItemId?: string | null;
  title?: string | null; position?: string | null; militaryRank?: string | null; contactEmail?: string | null; contactPhone?: string | null; contactNote?: string | null;
  researchFieldIds: string[]; expertiseKeywords?: string[]; publications?: Publication[]; participations?: Participation[]; confirmDuplicate?: boolean; provisionAccount?: boolean; username?: string | null;
};
export type ResearcherProfile = Omit<ResearcherProfileInput, "managementOrganizationUnitId" | "researchFieldIds"> & {
  id: string; managementOrganization: ResearcherOrganization; academicRank?: ResearcherCatalogItem | null; academicDegree?: ResearcherCatalogItem | null;
  researchFields: ResearcherCatalogItem[]; expertiseKeywords: string[]; publications: Publication[]; participations: Participation[];
  status: "ACTIVE" | "INACTIVE"; aggregateVersion: number; createdAt: string; updatedAt: string; viewerAuthorization: ViewerAuthorizationV1;
  account: { id: string; username: string | null; email?: string | null; displayName: string; status: string; systemRole: string; mustChangePassword: boolean } | null;
  credentialDelivery?: { id: string; status: string; recipientEmail: string; expiresAt?: string | null; createdAt?: string } | null;
};
export type ResearcherProfileSummary = Pick<ResearcherProfile, "id" | "fullName" | "profileType" | "status" | "managementOrganization" | "account" | "viewerAuthorization">;
export type ProfileHistory = { id: string; action: string; createdAt: string; reason?: string; beforeFacts?: Record<string, unknown>; afterFacts?: Record<string, unknown> };

export async function profileRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/researcher-profiles${path}`, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể xử lý hồ sơ nhà khoa học.");
  return body as T;
}
export const loadResearcherProfiles = (query: Record<string, string>) => profileRequest<{ profiles: ResearcherProfileSummary[]; organizationOptions: ResearcherOrganization[]; total: number; pageSize: number; canCreate: boolean }>(`?${new URLSearchParams(query)}`);
export const loadResearcherProfileCatalogs = () => profileRequest<{ researchFields: ResearcherCatalogItem[]; academicRanks: ResearcherCatalogItem[]; academicDegrees: ResearcherCatalogItem[] }>("/catalogs");
export const getResearcherProfile = (id: string) => profileRequest<{ profile: ResearcherProfile }>(`/${id}`);
export const createResearcherProfile = (input: ResearcherProfileInput) => profileRequest<{ profile: ResearcherProfile | null; requiresConfirmation: boolean; duplicateCandidates: Array<{ id: string; fullName: string; managementOrganization: ResearcherOrganization }> }>("", { method: "POST", body: JSON.stringify(input) });
export const updateResearcherProfile = (id: string, input: Partial<ResearcherProfileInput> & { contextVersion: ContextVersionTokenV1 }) => profileRequest<{ profile: ResearcherProfile }>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const setResearcherProfileStatus = (id: string, status: string, contextVersion: ContextVersionTokenV1) => profileRequest<{ profile: ResearcherProfile }>(`/${id}/${status === "ACTIVE" ? "activate" : "deactivate"}`, { method: "POST", body: JSON.stringify({ contextVersion }) });
