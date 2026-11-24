import { logJson } from "../infrastructure/observability/log.js";

const expressModule = require("express") as {
  json(options: { type: string[]; limit: string }): (request: CspReportRequest, response: CspReportResponse, next: () => void) => void;
};

/**
 * Nhận báo cáo vi phạm chính sách bảo mật nội dung (CSP) do trình duyệt gửi (apps/web/src/lib/csp.ts, report-uri)
 * và ghi log cảnh báo `csp_violation` để rà soát trước khi bật chế độ chặn. Không cần đăng nhập; mỗi yêu cầu
 * tối đa 16 KB và 20 báo cáo; chỉ ghi các trường cần để tìm chỗ vi phạm, cắt ngắn mỗi trường.
 */

export const CSP_REPORT_PATH = "/api/v1/security/csp-report";
const CONTENT_TYPES = ["application/csp-report", "application/reports+json", "application/json"];
const MAX_REPORTS = 20;
const MAX_FIELD = 300;

export type CspViolation = {
  documentUri: string | null;
  directive: string | null;
  blockedUri: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  disposition: string | null;
};

type CspReportRequest = { body?: unknown; requestId?: string };
type CspReportResponse = { status(code: number): { end(): void } };

const text = (value: unknown) => (typeof value === "string" && value ? value.slice(0, MAX_FIELD) : null);
const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Chuẩn hoá cả định dạng cũ ({"csp-report": {...}}) lẫn Reporting API ([{type, body}]). */
export function parseCspReports(payload: unknown): CspViolation[] {
  const items: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) {
    for (const entry of payload.slice(0, MAX_REPORTS)) {
      const record = entry as { type?: unknown; body?: unknown };
      if (record?.type === "csp-violation" && record.body && typeof record.body === "object") {
        items.push(record.body as Record<string, unknown>);
      }
    }
    return items.map((body) => ({
      documentUri: text(body.documentURL),
      directive: text(body.effectiveDirective),
      blockedUri: text(body.blockedURL),
      sourceFile: text(body.sourceFile),
      lineNumber: number(body.lineNumber),
      disposition: text(body.disposition)
    }));
  }
  const report = (payload as { "csp-report"?: unknown })?.["csp-report"];
  if (!report || typeof report !== "object") return [];
  const body = report as Record<string, unknown>;
  return [{
    documentUri: text(body["document-uri"]),
    directive: text(body["effective-directive"]) ?? text(body["violated-directive"]),
    blockedUri: text(body["blocked-uri"]),
    sourceFile: text(body["source-file"]),
    lineNumber: number(body["line-number"]),
    disposition: text(body.disposition)
  }];
}

export function cspReportHandler() {
  const parse = expressModule.json({ type: CONTENT_TYPES, limit: "16kb" });
  return [
    parse,
    (request: CspReportRequest, response: CspReportResponse) => {
      for (const violation of parseCspReports(request.body)) {
        logJson("warn", "csp_violation", { requestId: request.requestId, ...violation });
      }
      response.status(204).end();
    }
  ];
}
