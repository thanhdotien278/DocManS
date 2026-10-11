import { getApiBaseUrl } from "@/lib/session";
import type { ContextVersionTokenV1, ViewerAuthorizationV1 } from "@rtms/permissions";

export type ResearcherCatalogItem = { id: string; code: string; name: string; type: string };
export type ResearcherOrganization = { id: string; code: string; name: string };
export type Publication = { id?: string; title: string; venue?: string | null; publicationYear?: number | null; doi?: string | null; authors?: string | null; issnIsbn?: string | null; classification?: string | null; proofUrl?: string | null; status?: "ACTIVE" | "INACTIVE"; notes?: string | null };
export type Participation = { id?: string; projectTitle: string; participationRole: string; level: "ACADEMY_INSTITUTIONAL" | "MINISTRY" | "OTHER"; startsOn?: string | null; endsOn?: string | null; status?: "ACTIVE" | "INACTIVE" | "SUPERSEDED"; notes?: string | null; supersedesId?: string | null };
export type ScientificCurriculumVitaeLanguage = { language: string; proficiency?: string | null; certificate?: string | null };
export type ScientificCurriculumVitaePersonalInfo = {
  avatarUrl?: string | null;
  gender: "Nam" | "Nữ" | "Khác";
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  idNumber: string;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  englishAcademicTitle?: string | null;
  contactAddress?: string | null;
  organization: string;
  bankAccount?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  smartCaSerial?: string | null;
  shareDataAgreement: boolean;
  languages?: ScientificCurriculumVitaeLanguage[];
};
export type ScientificCurriculumVitaeEducation = { degreeLevel: string; major: string; institution: string; startYear?: number | null; graduationYear?: number | null; trainingMode?: string | null };
export type ScientificCurriculumVitaeWorkItem = { period: string; organization: string; position?: string | null; workField?: string | null };
export type ScientificCurriculumVitaeWorkHistory = { summary?: string | null; items?: ScientificCurriculumVitaeWorkItem[] };
export type ScientificCurriculumVitaeIntellectualProperty = { title: string; authors?: string | null; issueYear?: number | null; patentNumber?: string | null; issueAgency?: string | null; proofUrl?: string | null; notes?: string | null };
export type ScientificCurriculumVitaeAward = { name: string; awardYear?: number | null; endYear?: number | null; grantingAgency?: string | null; proofUrl?: string | null; notes?: string | null };
export type ScientificCurriculumVitaeProject = { projectTitle: string; managementAgency?: string | null; code?: string | null; role: string; period?: string | null; status?: string | null; notes?: string | null };
export type ScientificCurriculumVitaeResearchExperience = { intellectualProperty?: ScientificCurriculumVitaeIntellectualProperty[]; awards?: ScientificCurriculumVitaeAward[]; projects?: ScientificCurriculumVitaeProject[] };
export type ScientificCurriculumVitae = {
  cvSchemaVersion: 1;
  note?: string | null;
  personalInfo?: ScientificCurriculumVitaePersonalInfo;
  educationHistory?: ScientificCurriculumVitaeEducation[];
  workHistory?: ScientificCurriculumVitaeWorkHistory;
  researchExperience?: ScientificCurriculumVitaeResearchExperience;
};
export type ResearcherProfileInput = {
  fullName: string; managementOrganizationUnitId: string; profileType?: "INTERNAL" | "EXTERNAL";
  externalAffiliation?: string | null; academicRankCatalogItemId?: string | null; academicDegreeCatalogItemId?: string | null;
  title?: string | null; position?: string | null; militaryRank?: string | null; contactEmail?: string | null; contactPhone?: string | null; contactNote?: string | null;
  researchFieldIds: string[]; expertiseKeywords?: string[]; publications?: Publication[]; participations?: Participation[]; curriculumVitae?: ScientificCurriculumVitae; confirmDuplicate?: boolean; provisionAccount?: boolean; username?: string | null;
};
export type ResearcherProfile = Omit<ResearcherProfileInput, "managementOrganizationUnitId" | "researchFieldIds" | "curriculumVitae"> & {
  id: string; managementOrganization: ResearcherOrganization; academicRank?: ResearcherCatalogItem | null; academicDegree?: ResearcherCatalogItem | null;
  researchFields: ResearcherCatalogItem[]; expertiseKeywords: string[]; publications: Publication[]; participations: Participation[];
  curriculumVitae?: ScientificCurriculumVitae | null;
  status: "ACTIVE" | "INACTIVE"; aggregateVersion: number; createdAt: string; updatedAt: string; viewerAuthorization: ViewerAuthorizationV1;
  account: { id: string; username: string | null; email?: string | null; displayName: string; status: string; systemRole: string; mustChangePassword: boolean } | null;
  credentialDelivery?: { id: string; status: string; recipientEmail: string; expiresAt?: string | null; createdAt?: string } | null;
};
export type ResearcherProfileSummary = Pick<ResearcherProfile, "id" | "fullName" | "profileType" | "status" | "managementOrganization" | "account" | "viewerAuthorization">;
export type ProfileHistory = { id: string; action: string; createdAt: string; reason?: string; beforeFacts?: Record<string, unknown>; afterFacts?: Record<string, unknown> };

export type ProfileRequestFieldError = { field: string; message: string };

export class ProfileRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors: ProfileRequestFieldError[];

  constructor(message: string, status: number, code?: string, errors: ProfileRequestFieldError[] = []) {
    super(message);
    this.name = "ProfileRequestError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export async function profileRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/researcher-profiles${path}`, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) ?? {};
  if (!response.ok) {
    const errors = Array.isArray(body.errors) ? body.errors.filter((item: unknown): item is ProfileRequestFieldError => !!item && typeof item === "object" && typeof (item as ProfileRequestFieldError).field === "string" && typeof (item as ProfileRequestFieldError).message === "string") : [];
    throw new ProfileRequestError(typeof body.message === "string" ? body.message : "Không thể xử lý hồ sơ nhà khoa học.", response.status, typeof body.code === "string" ? body.code : undefined, errors);
  }
  return body as T;
}
export const loadResearcherProfiles = (query: Record<string, string>) => profileRequest<{ profiles: ResearcherProfileSummary[]; organizationOptions: ResearcherOrganization[]; total: number; pageSize: number; canCreate: boolean }>(`?${new URLSearchParams(query)}`);
export const loadResearcherProfileCatalogs = () => profileRequest<{ organizationUnits: string[]; researchFields: ResearcherCatalogItem[]; academicRanks: ResearcherCatalogItem[]; academicDegrees: ResearcherCatalogItem[] }>("/catalogs");
export const getResearcherProfile = (id: string) => profileRequest<{ profile: ResearcherProfile }>(`/${id}`);
export const createResearcherProfile = (input: ResearcherProfileInput) => profileRequest<{ profile: ResearcherProfile | null; requiresConfirmation: boolean; duplicateCandidates: Array<{ id: string; fullName: string; managementOrganization: ResearcherOrganization }> }>("", { method: "POST", body: JSON.stringify(input) });
export const updateResearcherProfile = (id: string, input: Partial<ResearcherProfileInput> & { contextVersion: ContextVersionTokenV1 }) => profileRequest<{ profile: ResearcherProfile }>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const setResearcherProfileStatus = (id: string, status: string, contextVersion: ContextVersionTokenV1) => profileRequest<{ profile: ResearcherProfile }>(`/${id}/${status === "ACTIVE" ? "activate" : "deactivate"}`, { method: "POST", body: JSON.stringify({ contextVersion }) });
