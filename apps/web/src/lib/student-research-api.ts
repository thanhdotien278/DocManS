import { apiFetch } from "@/lib/csrf";
import { getApiBaseUrl } from "@/lib/session";

export const DOCUMENT_PURPOSES = [
  ["REGISTRATION_FORM", "Đơn đăng ký đề tài"],
  ["FULL_REPORT", "Báo cáo toàn văn"],
  ["SUMMARY_REPORT", "Báo cáo tóm tắt"]
] as const;
export const AWARD_EVIDENCE = "AWARD_EVIDENCE";
export const AWARDS = [["FIRST", "Giải Nhất"], ["SECOND", "Giải Nhì"], ["THIRD", "Giải Ba"], ["ENCOURAGEMENT", "Giải Khuyến khích"]] as const;

export type DocumentPurpose = (typeof DOCUMENT_PURPOSES)[number][0];
export type StudentResearchFile = { id: string; purpose: string; fileName: string; version: number; sizeBytes: number; uploadedAt: string };
export type StudentResearchPeriod = {
  id: string; year: number; title: string; submissionDeadline: string; maxMembers: number;
  responsibleOfficer: { id: string; displayName: string }; templates: StudentResearchFile[];
  canManage: boolean; canEdit: boolean; canRegister: boolean;
};
export type StudentResearchPerson = { id: string; displayName: string; username: string | null; studentCode: string | null; className: string | null };
export type StudentResearchTopic = {
  id: string; periodId: string; year: number; title: string; summary: string | null; advisorName: string; advisorUnit: string;
  status: "pending_approval" | "approved" | "rejected" | "closed"; rejectionReason: string | null;
  deadline: string; deadlineOverride: string | null; locked: boolean; score: number | null; award: string | null; closedAt: string | null;
  leader: StudentResearchPerson;
  members: Array<{ id: string; isLeader: boolean; canLeave: boolean; invitedEmail: string | null; user: StudentResearchPerson | null }>;
  files: StudentResearchFile[];
  capabilities: Record<"canEdit" | "canManageMembers" | "canUploadRegistrationForm" | "canUploadReports" | "canUploadEvidence" | "canDecide" | "canClose" | "canChangeDeadline", boolean>;
};
export type StudentResearchOverview = { profileComplete: boolean; canCreatePeriod: boolean; canChooseOfficer: boolean; periods: StudentResearchPeriod[]; topics: StudentResearchTopic[] };
export type StudentProfile = { fullName: string; unit: string; complete: boolean; studentCode: string; className: string; phone: string; previousSemesterScore: number | null };
export type StudentProfileInput = { studentCode: string; className: string; phone: string; previousSemesterScore: number };
export type PeriodInput = { title: string; submissionDeadline: string; maxMembers: number };
export type TopicInput = { title: string; summary: string; advisorName: string; advisorUnit: string };

async function request<T>(path: string, method = "GET", body?: FormData | object): Promise<T> {
  const form = body instanceof FormData;
  const response = await apiFetch(`${getApiBaseUrl()}/student-research${path}`, {
    method, credentials: "include",
    headers: body && !form ? { "Content-Type": "application/json" } : undefined,
    body: form ? body : body && JSON.stringify(body)
  });
  const result = (await response.json().catch(() => ({}))) as { message?: unknown };
  if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  return result as T;
}

function fileBody(file: File, fields: Record<string, string>) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  body.append("file", file);
  return body;
}

export const studentResearchFileUrl = (fileId: string) => `${getApiBaseUrl()}/student-research/files/${fileId}`;
export const loadStudentResearch = () => request<StudentResearchOverview>("");
export const loadStudentResearchOfficers = () => request<{ users: Array<{ id: string; displayName: string }> }>("/officer-candidates").then((body) => body.users);
export const createStudentResearchPeriod = (input: PeriodInput & { year: number }) => request<{ id: string }>("/periods", "POST", input);
export const updateStudentResearchPeriod = (id: string, input: Partial<PeriodInput> & { responsibleOfficerUserId?: string }) => request(`/periods/${id}`, "PATCH", input);
export const uploadStudentResearchTemplate = (periodId: string, purpose: DocumentPurpose, file: File) => request(`/periods/${periodId}/templates`, "POST", fileBody(file, { purpose }));
export const createStudentResearchTopic = (periodId: string, input: TopicInput, file: File) => request("/topics", "POST", fileBody(file, { periodId, ...input }));
export const updateStudentResearchTopic = (id: string, input: TopicInput) => request(`/topics/${id}`, "PATCH", input);
export const addStudentResearchMember = (topicId: string, identifier: string) => request<{ invited: boolean }>(`/topics/${topicId}/members`, "POST", { identifier });
export const removeStudentResearchMember = (topicId: string, memberId: string) => request(`/topics/${topicId}/members/${memberId}`, "DELETE");
export const approveStudentResearchTopic = (id: string) => request(`/topics/${id}/approve`, "POST");
export const rejectStudentResearchTopic = (id: string, reason: string) => request(`/topics/${id}/reject`, "POST", { reason });
export const setStudentResearchTopicDeadline = (id: string, deadlineOverride: string | null) => request(`/topics/${id}/deadline`, "PATCH", { deadlineOverride });
export const closeStudentResearchTopic = (id: string, score: number, award: string | null) => request(`/topics/${id}/close`, "POST", { score, award });
export const uploadStudentResearchFile = (topicId: string, purpose: string, file: File) => request(`/topics/${topicId}/files`, "POST", fileBody(file, { purpose }));
export const loadStudentProfile = () => request<StudentProfile>("/profile");
export const saveStudentProfile = (input: StudentProfileInput) => request<StudentProfile>("/profile", "PUT", input);
