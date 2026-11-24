import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { logJson } from "../infrastructure/observability/log.js";
import { readSessionCookie } from "./session-cookie.js";

/**
 * Chống giả mạo yêu cầu (CSRF) cho mọi yêu cầu ghi tới /api/:
 *  1. Chỉ nhận thân JSON hoặc multipart (tải tệp): biểu mẫu HTML của trang khác không gửi được JSON.
 *  2. Nguồn gửi (Origin, hoặc Referer nếu thiếu) phải là một trong các nguồn web được phép (WEB_ORIGIN);
 *     trình duyệt báo Sec-Fetch-Site: cross-site thì từ chối. Thiếu cả hai header cũng từ chối.
 *  3. Yêu cầu mang cookie phiên phải gửi kèm X-CSRF-Token = HMAC(CSRF_SECRET, giá trị cookie phiên). Mã trả về ở
 *     /auth/login và /auth/me; không lưu thêm gì trong CSDL và tự đổi khi phiên đổi.
 * Các endpoint không cần phiên (đăng nhập, đăng xuất, quên/đặt lại mật khẩu, kích hoạt, tự đăng ký) chỉ kiểm tra
 * bước 1–2: người dùng có thể còn giữ cookie của phiên đã hết hạn khi dùng các trang này.
 */

export const CSRF_HEADER = "x-csrf-token";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALLOWED_CONTENT_TYPES = ["application/json", "multipart/form-data"];
const TOKEN_EXEMPT_PATHS = [
  /^\/api\/v1\/auth\/(login|login\/verify|login\/resend|logout|password-reset\/request|password-reset\/complete|account-activation\/complete)$/,
  /^\/api\/v1\/registration$/,
  /^\/api\/v1\/public\//
];

type CsrfRequest = { method: string; path: string; headers: Record<string, string | string[] | undefined>; requestId?: string };
type CsrfResponse = { status(code: number): { json(body: unknown): unknown } };

let secret: Buffer | null = null;
let configuredSecretSource: string | undefined;

function csrfSecret() {
  const configured = process.env.CSRF_SECRET?.trim();
  if (secret && configured === configuredSecretSource) return secret;
  configuredSecretSource = configured;
  if (configured && configured.length >= 32) {
    secret = Buffer.from(configured, "utf8");
  } else {
    // Nếu chưa khai báo CSRF_SECRET (hoặc < 32 ký tự): dùng khoá ngẫu nhiên theo tiến trình
    // để không làm gián đoạn khởi động khi .env.prod chưa kịp cập nhật.
    logJson("warn", "csrf_secret_ephemeral", { reason: "CSRF_SECRET chưa được cấu hình (cần ít nhất 32 ký tự); dùng khoá ngẫu nhiên theo tiến trình." });
    secret = randomBytes(32);
  }
  return secret;
}

/** Khởi tạo sớm cấu hình CSRF khi API boot. */
export function assertCsrfConfigured() {
  csrfSecret();
}

/** `sessionToken` là giá trị cookie phiên (CSDL chỉ lưu băm của nó). */
export function csrfTokenForSession(sessionToken: string) {
  return createHmac("sha256", csrfSecret()).update(`csrf:${sessionToken}`).digest("base64url");
}

export function isValidCsrfToken(sessionToken: string, token: unknown) {
  if (typeof token !== "string" || !token) return false;
  const expected = Buffer.from(csrfTokenForSession(sessionToken));
  const actual = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function header(request: CsrfRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(request: CsrfRequest) {
  const origin = header(request, "origin");
  if (origin && origin !== "null") return origin;
  const referer = header(request, "referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function hasBody(request: CsrfRequest) {
  const length = header(request, "content-length");
  return Boolean(header(request, "transfer-encoding")) || (length !== undefined && length !== "0");
}

function reject(request: CsrfRequest, response: CsrfResponse, status: number, code: string, message: string) {
  logJson("warn", "csrf_rejected", {
    requestId: request.requestId,
    code,
    method: request.method,
    path: request.path,
    origin: header(request, "origin") ?? null,
    secFetchSite: header(request, "sec-fetch-site") ?? null
  });
  response.status(status).json({ statusCode: status, code, message });
}

export function csrfProtection(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map((origin) => origin.replace(/\/+$/, "")));

  return (request: CsrfRequest, response: CsrfResponse, next: () => void) => {
    const path = request.path;
    if (!UNSAFE_METHODS.has(request.method) || !path.startsWith("/api/")) return next();

    const contentType = String(header(request, "content-type") ?? "").split(";")[0].trim().toLowerCase();
    if ((contentType || hasBody(request)) && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return reject(request, response, 415, "CONTENT_TYPE_REJECTED", "Kiểu dữ liệu gửi lên không được chấp nhận.");
    }

    const origin = requestOrigin(request);
    if (!origin || !allowed.has(origin) || header(request, "sec-fetch-site") === "cross-site") {
      return reject(request, response, 403, "CSRF_ORIGIN_REJECTED", "Yêu cầu không đến từ trang của hệ thống. Vui lòng tải lại trang và thử lại.");
    }

    if (TOKEN_EXEMPT_PATHS.some((pattern) => pattern.test(path))) return next();

    const sessionToken = readSessionCookie(header(request, "cookie"));
    if (sessionToken && !isValidCsrfToken(sessionToken, header(request, CSRF_HEADER))) {
      return reject(request, response, 403, "CSRF_TOKEN_INVALID", "Phiên làm việc đã thay đổi. Vui lòng tải lại trang và thử lại.");
    }
    return next();
  };
}
