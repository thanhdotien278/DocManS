import { getApiBaseUrl } from "@/lib/session";
import { isViewerAuthorizationV1, type PermissionActionV1, type ViewerAuthorizationV1 } from "@rtms/permissions";

export type ProjectRecord = {
  id: string; proposalId: string; title: string; status: string; startDate: string | null; endDate: string | null;
  scope: Record<string, unknown>; plan: Record<string, unknown> | null;
  hostOrganizationUnit?: { name: string }; officer?: { officerUserId: string } | null;
  members: Array<{ id: string; name: string; participationRole: string; status: string; userId?: string }>;
  milestones: Array<{ id: string; title: string; dueDate: string; isImportant: boolean; status: string; responsibleMemberId?: string | null }>;
  checkpoints: Array<{ id: string; title: string; dueDate: string; status: string }>;
  reports: Array<{ id: string; revision: number; status: string; checkpointId?: string; reportingPeriodStart?: string; reportingPeriodEnd?: string; progressResults?: string; issuesRecommendations?: string; reviewReason?: string; responseDeadline?: string; evidence?: Array<{ id: string; fileRecordId: string; file?: { originalFileName: string } }> }>;
  requests: Array<{ id: string; requestType: "adjustment" | "extension"; status: string; revision?: number; reason?: string; proposedValues?: Record<string, unknown>; decisionNote?: string; responseDeadline?: string; evidence?: Array<{ id: string; fileRecordId: string; file?: { originalFileName: string } }> }>;
  history: Array<{ id: string; action: string; reason?: string; createdAt: string }>;
  overdue: boolean; approaching: boolean; nearestDeadline: string | null; viewerAuthorization: ViewerAuthorizationV1;
};

export function projectCapability(project: ProjectRecord) {
  const value = project.viewerAuthorization;
  return isViewerAuthorizationV1(value) && value.contextVersion.domain === "approved-project" && value.contextVersion.recordId === project.id ? value : null;
}

export function canProject(project: ProjectRecord, action: PermissionActionV1) { return !!projectCapability(project)?.allowedActions.includes(action); }
export function projectDenial(project: ProjectRecord, action: PermissionActionV1) { return projectCapability(project)?.blockedActions.find((item) => item.action === action)?.reason ?? "Quyền thao tác chưa được xác minh. Vui lòng tải lại."; }

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể xử lý thao tác đề tài.");
  return body as T;
}

export async function listProjects(filters?: { overdue?: boolean; approaching?: boolean }) {
  const query = new URLSearchParams();
  if (filters?.overdue !== undefined) query.set("overdue", String(filters.overdue));
  if (filters?.approaching !== undefined) query.set("approaching", String(filters.approaching));
  const result = await json<{ projects: ProjectRecord[] }>(`/projects${query.size ? `?${query}` : ""}`);
  return result.projects;
}

export async function getProject(id: string) { return (await json<{ project: ProjectRecord }>(`/projects/${id}`)).project; }
export async function createProject(proposalId: string, contextVersion: unknown) { return json<{ project: { id: string } }>("/projects", { method: "POST", body: JSON.stringify({ proposalId, contextVersion }) }); }
export async function projectOfficerCandidates(id: string) { return (await json<{ users: Array<{ id: string; displayName: string; username: string }> }>(`/projects/${id}/officer-candidates`)).users; }
export async function projectAction(id: string, path: string, body: Record<string, unknown>, method = "POST") { return json<Record<string, unknown>>(`/projects/${id}/${path}`, { method, body: JSON.stringify(body) }); }

export async function uploadProjectFile(project: ProjectRecord, file: File, purpose = "PROJECT_EVIDENCE") {
  const capability = projectCapability(project);
  if (!capability) throw new Error("Ngữ cảnh quyền không hợp lệ. Vui lòng tải lại.");
  const form = new FormData();
  form.set("file", file);
  form.set("relatedEntityType", "approved_project");
  form.set("relatedEntityId", project.id);
  form.set("filePurpose", purpose);
  form.set("contextVersion", JSON.stringify(capability.contextVersion));
  const response = await fetch(`${getApiBaseUrl()}/files`, { method: "POST", credentials: "include", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.file?.id) throw new Error(typeof body.message === "string" ? body.message : "Không thể tải minh chứng.");
  return body.file as { id: string; fileName: string };
}

export function projectFileUrl(fileId: string) { return `${getApiBaseUrl()}/files/${fileId}/download`; }
export async function listProjectFiles(id: string) { return (await json<{ files: Array<{ id: string; fileName: string; uploadedById: string }> }>(`/files?relatedEntityType=approved_project&relatedEntityId=${encodeURIComponent(id)}`)).files; }
