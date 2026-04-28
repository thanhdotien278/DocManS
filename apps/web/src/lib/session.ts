import { getAccountById } from "@/lib/accounts";

export const SESSION_COOKIE_NAME = "rtms_session";
export const SESSION_STORAGE_KEY = "rtms_session_account";
const SESSION_MAX_AGE = 60 * 60 * 12;

function isValidAccountId(accountId?: string | null) {
  return Boolean(accountId && getAccountById(accountId));
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
}

export function persistBrowserSession(accountId: string) {
  if (typeof window === "undefined" || !isValidAccountId(accountId)) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, accountId);
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    accountId
  )}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax`;
}

export function clearBrowserSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export function getBrowserSessionAccountId() {
  if (typeof window === "undefined") {
    return null;
  }

  const localValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (isValidAccountId(localValue)) {
    return localValue;
  }

  const cookieValue = readCookie(SESSION_COOKIE_NAME);
  if (isValidAccountId(cookieValue)) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, cookieValue!);
    return cookieValue;
  }

  return null;
}

