/**
 * Chính sách bảo mật nội dung (CSP) của giao diện, dựng trong src/middleware.ts cho mỗi yêu cầu trang.
 *
 * - Script chỉ chạy khi mang nonce của chính yêu cầu đó ('strict-dynamic' cho phép script được nạp từ script
 *   có nonce). Next.js tự gắn nonce vào script và style của framework khi trang được dựng động.
 * - style-src-attr 'unsafe-inline': giao diện còn nhiều thuộc tính style={{…}}; thuộc tính style không chạy
 *   được mã nên rủi ro thấp. Thẻ <style> vẫn phải có nonce.
 * - Gọi API: chính máy chủ ('self'); khi NEXT_PUBLIC_API_BASE_URL là địa chỉ đầy đủ (môi trường phát triển
 *   chạy API ở cổng khác) thì thêm đúng nguồn đó.
 */

export const CSP_REPORT_PATH = "/api/v1/security/csp-report";

export type CspMode = "enforce" | "report-only" | "off";

export function cspMode(value = process.env.CSP_MODE): CspMode {
  const mode = value?.trim().toLowerCase();
  return mode === "report-only" || mode === "off" ? mode : "enforce";
}

export function cspHeaderName(mode: CspMode) {
  return mode === "report-only" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}

/** Nguồn của API nếu NEXT_PUBLIC_API_BASE_URL là địa chỉ đầy đủ; đường dẫn tương đối (/api/v1) thì không cần. */
export function apiOrigin(apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL) {
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) return null;
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return null;
  }
}

function serialize(directives: Record<string, string[]>) {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** CSP cho trang do Next.js dựng (có nonce). */
export function pageCsp({ nonce, isDev, apiBaseUrl }: { nonce: string; isDev: boolean; apiBaseUrl?: string }) {
  const api = apiOrigin(apiBaseUrl);
  const reportUri = api ? `${api}${CSP_REPORT_PATH}` : CSP_REPORT_PATH;
  return serialize({
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // `next dev` chèn CSS bằng thẻ <style> không có nonce (nạp lại nóng): chỉ môi trường phát triển cho style nội tuyến.
    "style-src": isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...(api ? [api] : [])],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(api ? [api] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
    "report-uri": [reportUri]
  });
}

/**
 * CSP cho các trang HTML tĩnh trong public/: không do Next.js dựng nên không có nonce.
 * Script chỉ được nạp từ tệp của chính máy chủ (không có script nội tuyến); khối <style> trong trang được phép.
 */
export function staticHtmlCsp({ isDev, apiBaseUrl }: { isDev: boolean; apiBaseUrl?: string }) {
  const api = apiOrigin(apiBaseUrl);
  return serialize({
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'none'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
    "report-uri": [api ? `${api}${CSP_REPORT_PATH}` : CSP_REPORT_PATH]
  });
}

export function isStaticHtmlPath(pathname: string) {
  return /^\/[\w.-]+\.html$/.test(pathname);
}

/** Nonce ngẫu nhiên 128 bit cho mỗi yêu cầu (base64), theo hướng dẫn CSP của Next.js. */
export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
