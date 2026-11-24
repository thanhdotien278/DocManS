import { randomUUID } from "node:crypto";
import { logJson } from "./log.js";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  url?: string;
  requestId?: string;
  currentUser?: { id?: string };
};

type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: "finish", listener: () => void): void;
};

const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
const SLOW_REQUEST_MS = 1000;

/** Request id nhận từ nginx (X-Request-Id) hoặc tự tạo; gắn vào request và trả lại trong header response. */
export function readRequestId(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  return value && REQUEST_ID.test(value) ? value : randomUUID();
}

/**
 * Mặc định ("errors") chỉ log request lỗi 5xx hoặc chậm hơn 1 giây để giữ dung lượng log gọn.
 * LOG_REQUESTS=all để điều tra, LOG_REQUESTS=off để tắt.
 */
export function shouldLogRequest(mode: string | undefined, status: number, durationMs: number) {
  if (mode === "off") return false;
  if (mode === "all") return true;
  return status >= 500 || durationMs >= SLOW_REQUEST_MS;
}

export function requestContextMiddleware(mode = process.env.LOG_REQUESTS) {
  return (req: RequestLike, res: ResponseLike, next: () => void) => {
    const requestId = readRequestId(req.headers["x-request-id"]);
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
      if (!shouldLogRequest(mode, res.statusCode, durationMs)) return;
      const path = (req.originalUrl ?? req.url ?? "").split("?")[0];
      logJson(res.statusCode >= 500 ? "error" : "info", "request", {
        requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs,
        userId: req.currentUser?.id
      });
    });
    next();
  };
}
