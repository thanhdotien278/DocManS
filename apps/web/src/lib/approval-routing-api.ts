import { getApiBaseUrl } from "@/lib/session";

/** Tờ trình qua Phòng KHQS; `actions` do backend quyết định, UI không suy diễn quyền. */
export type ApprovalSubmission = {
  id: string;
  kind: string;
  kindLabel: string;
  subjectType: "proposal" | "project";
  subjectId: string;
  title: string;
  stage: "BOARD_REVIEW" | "HEAD_REVIEW" | "LEADERSHIP" | "CLOSED";
  stageLabel: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" | "CANCELLED";
  statusLabel: string;
  signerLabel: string;
  submittedByName: string;
  lastNote: string;
  createdAt: string;
  updatedAt: string;
  actions: { advance: boolean; return: boolean };
  steps: Array<{ stage: string; action: string; actorName: string; note: string; createdAt: string }>;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.");
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) throw new Error((Array.isArray(body.message) ? body.message[0] : body.message) ?? "Không xử lý được tờ trình.");
  return body as T;
}

export function loadSubjectSubmissions(subjectType: "proposal" | "project", subjectId: string) {
  return requestJson<{ submissions: ApprovalSubmission[] }>(`/approval-submissions/subject?type=${subjectType}&id=${encodeURIComponent(subjectId)}`);
}

export function advanceSubmission(submission: ApprovalSubmission, note: string) {
  return requestJson<{ submission: ApprovalSubmission }>(`/approval-submissions/${submission.id}/advance`, { method: "POST", body: JSON.stringify({ expectedStage: submission.stage, note }) });
}

export function returnSubmission(submission: ApprovalSubmission, note: string) {
  return requestJson<{ submission: ApprovalSubmission }>(`/approval-submissions/${submission.id}/return`, { method: "POST", body: JSON.stringify({ expectedStage: submission.stage, note }) });
}
