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

function isCurrentUser(value: unknown): value is CurrentUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.displayName === "string" &&
    typeof user.systemRole === "string" &&
    typeof user.unit === "string"
  );
}

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  try {
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

    const body = (await response.json()) as { user?: unknown };
    if (!isCurrentUser(body.user)) {
      return { ok: false, message: safeAuthError };
    }

    return { ok: true, user: body.user };
  } catch {
    return { ok: false, message: safeAuthError };
  }
}

export async function logoutSession() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Không thể đổi mật khẩu.");
}

export async function completePasswordReset(token: string, newPassword: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/password-reset/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Không thể đặt lại mật khẩu.");
}

export async function getCurrentUser() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { user?: unknown };
    return isCurrentUser(body.user) ? body.user : null;
  } catch {
    return null;
  }
}
