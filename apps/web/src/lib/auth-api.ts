import { apiFetch, setCsrfToken } from "@/lib/csrf";
import { getApiBaseUrl, type CurrentUser } from "@/lib/session";
import { SYSTEM_ROLES } from "@rtms/permissions";

/** Lượt đăng nhập chờ mã xác thực gửi qua thư (apps/api/src/auth/login-otp.ts). */
export type LoginOtpChallenge = { challengeId: string; emailHint: string; expiresAt: string; resendAfterSeconds: number };

export type LoginResult =
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: true;
      otp: LoginOtpChallenge;
    }
  | {
      ok: false;
      message: string;
    };

const safeAuthError = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";
const connectionError = "Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.";

function readOtpChallenge(value: unknown): LoginOtpChallenge | null {
  const body = value as Record<string, unknown> | null;
  if (!body || body.otpRequired !== true || typeof body.challengeId !== "string" || typeof body.emailHint !== "string") return null;
  return {
    challengeId: body.challengeId,
    emailHint: body.emailHint,
    expiresAt: String(body.expiresAt ?? ""),
    resendAfterSeconds: Number(body.resendAfterSeconds ?? 60)
  };
}

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
    SYSTEM_ROLES.includes(user.systemRole as (typeof SYSTEM_ROLES)[number]) &&
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
      // Story 13.11: API chỉ trả mã này khi mật khẩu đúng, nên hiển thị nguyên thông báo chờ duyệt.
      // Sai mật khẩu (401) luôn chỉ báo chung; lỗi khác (giới hạn, chưa có thư, không gửi được mã) báo đúng nội dung.
      const error = (await response.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
      const showMessage = response.status !== 401 || error.code === "ACCOUNT_PENDING_APPROVAL";
      return { ok: false, message: showMessage && typeof error.message === "string" ? error.message : safeAuthError };
    }

    const body = (await response.json()) as { user?: unknown; csrfToken?: unknown };
    const otp = readOtpChallenge(body);
    if (otp) return { ok: true, otp };
    if (!isCurrentUser(body.user)) {
      return { ok: false, message: safeAuthError };
    }

    setCsrfToken(body.csrfToken);
    return { ok: true, user: body.user };
  } catch {
    return { ok: false, message: safeAuthError };
  }
}

/** Nhập mã xác thực; đúng thì API cấp phiên (cookie) như đăng nhập thường. */
export async function verifyLoginOtp(
  challengeId: string,
  code: string
): Promise<{ ok: true; user: CurrentUser } | { ok: false; message: string; expired: boolean }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/login/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ challengeId, code })
    });
    const body = (await response.json().catch(() => ({}))) as { user?: unknown; csrfToken?: unknown; message?: unknown; code?: unknown };
    if (!response.ok || !isCurrentUser(body.user)) {
      return {
        ok: false,
        message: typeof body.message === "string" ? body.message : "Mã xác thực không đúng.",
        expired: body.code === "LOGIN_OTP_INVALID"
      };
    }
    setCsrfToken(body.csrfToken);
    return { ok: true, user: body.user };
  } catch {
    return { ok: false, message: connectionError, expired: false };
  }
}

export async function resendLoginOtp(challengeId: string): Promise<{ ok: true; otp: LoginOtpChallenge } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/login/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ challengeId })
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const otp = response.ok ? readOtpChallenge(body) : null;
    return otp ? { ok: true, otp } : { ok: false, message: typeof body.message === "string" ? body.message : "Không gửi lại được mã." };
  } catch {
    return { ok: false, message: connectionError };
  }
}

/** Tự bật / tắt xác thực hai lớp cho tài khoản đang đăng nhập. */
export async function setLoginOtpEnabled(enabled: boolean) {
  const response = await apiFetch(`${getApiBaseUrl()}/auth/login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ enabled })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; loginOtp?: { required: boolean; enabled: boolean } };
  if (!response.ok || !body.loginOtp) throw new Error(body.message ?? "Không thể thay đổi xác thực hai lớp.");
  return body.loginOtp;
}

export async function logoutSession() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    setCsrfToken(null);
    return response.ok;
  } catch {
    return false;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await apiFetch(`${getApiBaseUrl()}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Không thể đổi mật khẩu.");
}

export async function requestPasswordReset(identifier: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? "Không thể gửi yêu cầu đặt lại mật khẩu.");
  return body.message ?? "";
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

export async function completeAccountActivation(token: string, password: string, passwordConfirmation: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/account-activation/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, passwordConfirmation })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; status?: string };
  if (!response.ok) throw new Error(body.message ?? "Không thể kích hoạt tài khoản.");
  return { status: body.status };
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

    const body = (await response.json()) as { user?: unknown; csrfToken?: unknown };
    setCsrfToken(body.csrfToken);
    return isCurrentUser(body.user) ? body.user : null;
  } catch {
    return null;
  }
}
