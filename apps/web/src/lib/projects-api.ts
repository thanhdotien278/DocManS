import { getApiBaseUrl } from "@/lib/session";
import { isViewerAuthorizationV1, type PermissionActionV1, type ViewerAuthorizationV1 } from "@rtms/permissions";

export type ProjectRecord = {
  id: string; proposalId: string; title: string; status: string; startDate: string | null; endDate: string | null;
  scope: Record<string, unknown>; plan: Record<string, unknown> | null;
  hostOrganizationUnit?: { name: string }; officer?: { officerUserId: string; displayName?: string | null } | null;
  members: Array<{ id: string; name: string; participationRole: string; status: string; userId?: string }>;
  milestones: Array<{ id: string; title: string; dueDate: string; isImportant: boolean; status: string; responsibleMemberId?: string | null }>;
  checkpoints: Array<{ id: string; title: string; dueDate: string; status: string }>;
  reports: Array<{ id: string; revision: number; status: string; checkpointId?: string; reportingPeriodStart?: string; reportingPeriodEnd?: string; progressResults?: string; issuesRecommendations?: string; reviewReason?: string; responseDeadline?: string; evidence?: Array<{ id: string; fileRecordId: string; file?: { originalFileName: string } }>; allowedActions: PermissionActionV1[] }>;
  requests: Array<{ id: string; requestType: "adjustment" | "extension"; status: string; revision?: number; requesterId?: string; reason?: string; proposedValues?: Record<string, unknown>; decisionNote?: string; responseDeadline?: string; approval?: { stage: string; stageLabel: string; withdrawNote: string } | null; evidence?: Array<{ id: string; fileRecordId: string; file?: { originalFileName: string } }>; allowedActions: PermissionActionV1[] }>;
  history: Array<{ id: string; action: string; reason?: string; createdAt: string }>;
  overdue: boolean; approaching: boolean; nearestDeadline: string | null; viewerAuthorization: ViewerAuthorizationV1;
};

const PROJECT_STATUS_LABELS: Record<string, string> = { preparing: "Chuẩn bị triển khai", executing: "Đang thực hiện", paused: "Tạm dừng", pending_acceptance: "Chờ nghiệm thu", accepted: "Đã nghiệm thu", failed: "Không đạt", closed: "Đóng/lưu trữ" };
const REPORT_STATUS_LABELS: Record<string, string> = { draft: "Bản nháp", submitted: "Đã nộp", under_review: "Đang xem xét", supplement_requested: "Yêu cầu bổ sung", accepted: "Đã chấp nhận", superseded: "Đã có bản sửa" };
const REQUEST_STATUS_LABELS: Record<string, string> = { draft: "Bản nháp", submitted: "Đã nộp", under_staff_review: "Chuyên viên đang xem xét", under_staff_validation: "Chuyên viên đang kiểm tra", ready_for_head_decision: "Đã trình tờ trình, chờ rà soát và ký", supplement_requested: "Yêu cầu bổ sung", approved: "Đã phê duyệt", rejected: "Đã từ chối", withdrawn: "Đã rút" };
const MILESTONE_STATUS_LABELS: Record<string, string> = { open: "Đang mở", completed: "Hoàn thành" };
const ROLE_LABELS: Record<string, string> = { TOPIC_PI: "Chủ nhiệm đề tài", TOPIC_MEMBER: "Thành viên", TOPIC_SECRETARY: "Thư ký" };
const MEMBER_STATUS_LABELS: Record<string, string> = { ACTIVE: "Đang tham gia", ENDED: "Đã kết thúc" };
const HISTORY_ACTION_LABELS: Record<string, string> = {
  "project.created": "Tạo đề tài", "project.officer.assign": "Phân công chuyên viên", "project.officer.revoke": "Thu hồi phân công chuyên viên",
  "project.setup.configure": "Thiết lập mốc", "project.setup.confirm": "Xác nhận bắt đầu thực hiện",
  "project.report.draft": "Tạo bản nháp báo cáo", "project.report.edit-draft": "Cập nhật báo cáo", "project.report.submit": "Nộp báo cáo",
  "project.report.review": "Bắt đầu xem xét báo cáo", "project.report.request-supplement": "Yêu cầu bổ sung báo cáo", "project.report.accept": "Chấp nhận báo cáo"
};
const REQUEST_ACTION_LABELS: Record<string, string> = { create: "Tạo yêu cầu", "edit-draft": "Cập nhật yêu cầu", submit: "Nộp yêu cầu", review: "Bắt đầu xem xét yêu cầu", validate: "Kiểm tra hành chính", prepare: "Lập tờ trình", "request-supplement": "Yêu cầu bổ sung", approve: "Phê duyệt", reject: "Từ chối", withdraw: "Rút yêu cầu" };
// Unknown codes fall back to the raw value so new states stay visible instead of blank.
export const projectStatusLabel = (value: string) => PROJECT_STATUS_LABELS[value] ?? value;
export const reportStatusLabel = (value: string) => REPORT_STATUS_LABELS[value] ?? value;
export const requestStatusLabel = (value: string) => REQUEST_STATUS_LABELS[value] ?? value;
export const milestoneStatusLabel = (value: string) => MILESTONE_STATUS_LABELS[value] ?? value;
export const participationRoleLabel = (value: string) => ROLE_LABELS[value] ?? value;
export const memberStatusLabel = (value: string) => MEMBER_STATUS_LABELS[value] ?? value;
export function historyActionLabel(value: string) {
  const request = /^project\.(adjustment|extension)\.(.+)$/.exec(value);
  if (request) return `${REQUEST_ACTION_LABELS[request[2]] ?? request[2]} ${request[1] === "extension" ? "gia hạn" : "điều chỉnh"}`;
  return HISTORY_ACTION_LABELS[value] ?? value;
}

export function projectCapability(project: ProjectRecord) {
  const value = project.viewerAuthorization;
  return isViewerAuthorizationV1(value) && value.contextVersion.domain === "approved-project" && value.contextVersion.recordId === project.id ? value : null;
}

export function canProject(project: ProjectRecord, action: PermissionActionV1) { return !!projectCapability(project)?.allowedActions.includes(action); }
// Per-item actions computed by the API for this viewer and this report/request.
export function canItem(item: { allowedActions?: PermissionActionV1[] }, action: PermissionActionV1) { return !!item.allowedActions?.includes(action); }
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
