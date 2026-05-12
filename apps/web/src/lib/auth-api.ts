import { getApiBaseUrl, type CurrentUser } from "@/lib/session";

export type LoginResult =
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: false;
      message: string;
    };

const safeAuthError = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    return { ok: false, message: safeAuthError };
  }

  const body = (await response.json()) as { user: CurrentUser };
  return { ok: true, user: body.user };
}

export async function logoutSession() {
  await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}

export async function getCurrentUser() {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { user: CurrentUser };
  return body.user;
}
