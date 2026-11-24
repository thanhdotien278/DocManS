import { getApiBaseUrl } from "@/lib/session";

/**
 * Mã chống giả mạo yêu cầu (CSRF) của phiên hiện tại: API trả về ở /auth/login và /auth/me, giao diện giữ trong
 * bộ nhớ (không lưu vào storage) và gửi kèm header X-CSRF-Token ở mọi yêu cầu ghi.
 */

export const CSRF_HEADER = "X-CSRF-Token";

let csrfToken: string | null = null;

export function setCsrfToken(token: unknown) {
  csrfToken = typeof token === "string" && token ? token : null;
}

function isUnsafe(method: string | undefined) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());
}

/** Lấy lại mã từ /auth/me (sau khi tải lại trang hoặc khi API báo mã không hợp lệ). */
export async function refreshCsrfToken() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, { credentials: "include", cache: "no-store" });
    if (!response.ok) return false;
    setCsrfToken(((await response.json()) as { csrfToken?: unknown }).csrfToken);
    return Boolean(csrfToken);
  } catch {
    return false;
  }
}

/**
 * `fetch` tới API, kèm mã CSRF ở yêu cầu ghi. Mã chưa có (vừa tải lại trang) hoặc thuộc phiên cũ thì lấy lại từ
 * /auth/me rồi gửi lại đúng một lần. Thân FormData dùng lại được nên gửi lại an toàn.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!isUnsafe(init?.method)) return fetch(input, init);
  const send = () => {
    const headers = new Headers(init?.headers);
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken);
    return fetch(input, { ...init, headers });
  };
  const response = await send();
  if (response.status !== 403) return response;
  const body = (await response.clone().json().catch(() => ({}))) as { code?: unknown };
  return body.code === "CSRF_TOKEN_INVALID" && (await refreshCsrfToken()) ? send() : response;
}
