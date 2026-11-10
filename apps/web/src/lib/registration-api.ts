import { getApiBaseUrl } from "@/lib/session";

export type AccountType = "INTERNAL" | "EXTERNAL";
export type RegistrationRequest = { id: string; username: string; fullName: string; email: string; accountType: AccountType; createdAt: string };
export type RegistrationUnit = { id: string; code: string; name: string };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) as { message?: unknown };
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  return body as T;
}

export async function isSelfRegistrationEnabled() {
  try { return (await requestJson<{ enabled: boolean }>("/registration/status")).enabled === true; } catch { return false; }
}

export function registerAccount(input: { email: string; username: string; fullName: string; accountType: AccountType }) {
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
