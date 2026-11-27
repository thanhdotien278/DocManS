import { apiFetch } from "@/lib/csrf";
import { getApiBaseUrl } from "@/lib/session";

export type AccountType = "INTERNAL" | "EXTERNAL";
export type RegistrationRequest = { id: string; username: string; fullName: string; email: string; accountType: AccountType; requestedOrganizationUnitId: string | null; createdAt: string };
export type RegistrationUnit = { id: string; code: string; name: string };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) as { message?: unknown };
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  return body as T;
}

export type RegistrationStatus = { enabled: boolean; studentEnabled: boolean };

/** enabled: nhà nghiên cứu (chờ duyệt); studentEnabled: sinh viên (tự kích hoạt). Hai công tắc độc lập. */
export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  try {
    const status = await requestJson<Partial<RegistrationStatus>>("/registration/status");
    return { enabled: status.enabled === true, studentEnabled: status.studentEnabled === true };
  } catch { return { enabled: false, studentEnabled: false }; }
}

export async function isSelfRegistrationEnabled() {
  const status = await getRegistrationStatus();
  return status.enabled || status.studentEnabled;
}

export function listRegistrationUnits(accountType: "STUDENT" | "INTERNAL") {
  return requestJson<{ organizationUnits: RegistrationUnit[] }>(`/registration/units?accountType=${accountType}`).then((body) => body.organizationUnits);
}

export function registerAccount(input: { email: string; username: string; fullName: string; accountType: AccountType | "STUDENT"; organizationUnitId?: string }) {
  return requestJson<{ message: string }>("/registration", { method: "POST", body: JSON.stringify(input) });
}

export function listRegistrationRequests() {
  return requestJson<{ requests: RegistrationRequest[]; organizationUnits: RegistrationUnit[] }>("/registration/requests");
}

export function approveRegistrationRequest(id: string, input: { organizationUnitId: string; accountType: AccountType; externalAffiliation?: string }) {
  return requestJson<{ ok: true }>(`/registration/requests/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify(input) });
}

export function rejectRegistrationRequest(id: string, reason: string) {
  return requestJson<{ ok: true }>(`/registration/requests/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}
