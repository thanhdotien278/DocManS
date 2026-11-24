import { AUTH_SESSION_COOKIE, SECURE_AUTH_SESSION_COOKIE } from "./auth.types.js";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

/** Production chỉ đọc cookie __Host-: cookie tên cũ do tên miền con đặt vào không được coi là phiên. */
export function sessionCookieName(isProduction = process.env.NODE_ENV === "production") {
  return isProduction ? SECURE_AUTH_SESSION_COOKIE : AUTH_SESSION_COOKIE;
}

export function readSessionCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const name = sessionCookieName();
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const sessionCookie = cookies.find((entry) => entry.startsWith(`${name}=`));

  if (!sessionCookie) {
    return null;
  }

  try {
    return decodeURIComponent(sessionCookie.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

/** `expiresAt` = hạn của phiên trong CSDL: cookie hết hạn cùng lúc với phiên. */
export function createSessionCookie(sessionId: string, isProduction: boolean, expiresAt?: Date | string) {
  const expiryMs = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === "string" ? Date.parse(expiresAt) : Number.NaN;
  const maxAge = Number.isFinite(expiryMs) ? Math.max(0, Math.floor((expiryMs - Date.now()) / 1000)) : COOKIE_MAX_AGE_SECONDS;
  const parts = [
    `${sessionCookieName(isProduction)}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createExpiredSessionCookie(isProduction: boolean, name = sessionCookieName(isProduction)) {
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Set-Cookie khi đăng nhập/đăng xuất ở production: ngoài cookie __Host- còn xoá cookie tên cũ (rtms_session)
 * mà bản trước để lại trong trình duyệt.
 */
export function sessionSetCookieHeaders(current: string, isProduction: boolean) {
  return isProduction ? [current, createExpiredSessionCookie(true, AUTH_SESSION_COOKIE)] : current;
}
