import { AUTH_SESSION_COOKIE } from "./auth.types.js";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

export function readSessionCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const sessionCookie = cookies.find((entry) => entry.startsWith(`${AUTH_SESSION_COOKIE}=`));

  return sessionCookie ? decodeURIComponent(sessionCookie.split("=").slice(1).join("=")) : null;
}

export function createSessionCookie(sessionId: string, isProduction: boolean) {
  const parts = [
    `${AUTH_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createExpiredSessionCookie(isProduction: boolean) {
  const parts = [
    `${AUTH_SESSION_COOKIE}=`,
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
