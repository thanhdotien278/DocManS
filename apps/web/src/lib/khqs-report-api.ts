import { apiFetch } from "@/lib/csrf";
import { getApiBaseUrl } from "@/lib/session";

/** Báo cáo kết quả công tác KHQS theo kỳ: /api/v1/khqs-reports/:year/:period (apps/api/src/khqs-reports). */

export type KhqsPeriod = "H1" | "FY";

export type KhqsReportApiError = Error & { status?: number; code?: string };

export type KhqsReportRow = {
  projectId: string;
  level: string;
  name: string;
  code: string | null;
  hostAndPi: string;
  period: string;
  result: string;
  suggestedResult: string;
  totalBudget: number | null;
  allocatedBeforeYear: number | null;
  allocatedInYear: number | null;
  note: string;
  edited: boolean;
};

export type ManualRow = Record<string, string | number | null>;
export type ManualTables = { kq3: ManualRow[]; kq4: ManualRow[]; kq6: ManualRow[] };
export type RowOverride = { result?: string; note?: string };

export const NARRATIVE_FIELDS = [
  "documentNumber", "documentPlace", "documentDate", "recipient", "basis", "situation",
  "direction", "management", "potential", "environment", "information", "cooperation", "youth", "events",
  "strengths", "weaknesses", "nextResearch", "nextPotential", "nextCooperation",
  "signerTitle", "signerName", "distribution"
] as const;
export type NarrativeField = (typeof NARRATIVE_FIELDS)[number];
export type Narrative = Partial<Record<NarrativeField, string>>;

export type KhqsReport = {
  year: number;
  period: KhqsPeriod;
  periodLabel: string;
  nextPeriodLabel: string;
  generatedAt: string;
  canEdit: boolean;
  version: number;
  updatedAt: string | null;
  updatedByName: string | null;
  narrative: Narrative;
  manual: ManualTables;
  overrides: Record<string, RowOverride>;
  tables: { kq1: KhqsReportRow[]; kq2: Array<{ key: string; title: string; rows: KhqsReportRow[] }> };
  facts: Record<string, number>;
  suggestions: { management: string };
};

export type KhqsReportDraft = { version: number; narrative: Narrative; manual: ManualTables; overrides: Record<string, RowOverride> };

const path = (year: number, period: KhqsPeriod) => `/khqs-reports/${year}/${period}`;

async function requestJson<T>(endpoint: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(`${getApiBaseUrl()}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } catch {
    const error = new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.") as KhqsReportApiError;
    error.status = 0;
    throw error;
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[]; code?: string };
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    const error = new Error(message ?? fallback) as KhqsReportApiError;
    error.status = response.status;
    error.code = body.code;
    throw error;
  }
  return body as T;
}

export function loadKhqsReport(year: number, period: KhqsPeriod, signal?: AbortSignal) {
  return requestJson<KhqsReport>(path(year, period), { signal }, "Không tải được báo cáo công tác KHQS.");
}

export function saveKhqsReport(year: number, period: KhqsPeriod, draft: KhqsReportDraft) {
  return requestJson<KhqsReport>(path(year, period), { method: "PUT", body: JSON.stringify(draft) }, "Không lưu được báo cáo công tác KHQS.");
}

export function khqsReportExcelPath(year: number, period: KhqsPeriod) {
  return `${path(year, period)}/export.xlsx`;
}

export function khqsReportFileStem(year: number, period: KhqsPeriod) {
  return `Bao_cao_KHQS_${period === "H1" ? "6_thang" : "nam"}_${year}`;
}

export type ManualColumn = { key: string; label: string; type: "text" | "number" | "choice" | "longtext"; choices?: Array<[string, string]>; width?: number };

export const KQ4_SECTIONS: Array<[string, string]> = [["project", "Dự án Phòng thí nghiệm"], ["repair", "Nhiệm vụ sửa chữa, nâng cấp PTN"]];
export const KQ4_FUNDS: Array<[string, string]> = [["defense", "Ngân sách Quốc phòng"], ["most", "Ngân sách Bộ KH&CN"], ["other", "Ngân sách khác"]];
export const KQ6_SECTIONS: Array<[string, string]> = [["training", "Tài liệu huấn luyện quân sự"], ["social", "Tài liệu xã hội và nhân văn quân sự"], ["teaching", "Tài liệu dạy học"]];
export const KQ6_TASKS: Array<[string, string]> = [["compile", "Biên soạn mới"], ["edit", "Chỉnh sửa"], ["print", "In ấn"]];

export const MANUAL_COLUMNS: Record<keyof ManualTables, ManualColumn[]> = {
  kq3: [
    { key: "name", label: "Tên nhiệm vụ", type: "longtext", width: 220 },
    { key: "host", label: "Cơ quan chủ trì", type: "text" },
    { key: "partner", label: "Đối tác thực hiện", type: "text" },
    { key: "origin", label: "Xuất xứ, mức độ xét duyệt và cam kết", type: "longtext" },
    { key: "period", label: "Thời gian", type: "text", width: 90 },
    { key: "result", label: "Kết quả thực hiện", type: "longtext", width: 200 },
    { key: "totalBudget", label: "Tổng KP", type: "number" },
    { key: "partnerBudget", label: "Phía đối tác", type: "number" },
    { key: "hostTotal", label: "Cơ quan chủ trì: Tổng", type: "number" },
    { key: "hostStateSupport", label: "Hỗ trợ từ NS SNKH", type: "number" },
    { key: "hostOther", label: "Khác", type: "number" },
    { key: "note", label: "Ghi chú", type: "text" }
  ],
  kq4: [
    { key: "section", label: "Mục", type: "choice", choices: KQ4_SECTIONS },
    { key: "fundSource", label: "Nguồn ngân sách", type: "choice", choices: KQ4_FUNDS },
    { key: "name", label: "Tên hạng mục", type: "longtext", width: 220 },
    { key: "investor", label: "Chủ đầu tư", type: "text" },
    { key: "location", label: "Địa điểm đầu tư", type: "text" },
    { key: "period", label: "Thời gian", type: "text", width: 90 },
    { key: "result", label: "Kết quả thực hiện", type: "longtext", width: 200 },
    { key: "completionPercent", label: "Khối lượng hoàn thành (%)", type: "number" },
    { key: "totalInvestment", label: "Tổng mức đầu tư được duyệt", type: "number" },
    { key: "allocatedBeforeYear", label: "KP cấp năm trước", type: "number" },
    { key: "allocatedInYear", label: "KP cấp năm báo cáo", type: "number" },
    { key: "note", label: "Ghi chú (số QĐ phê duyệt)", type: "text" }
  ],
  kq6: [
    { key: "section", label: "Loại tài liệu", type: "choice", choices: KQ6_SECTIONS },
    { key: "task", label: "Nhiệm vụ", type: "choice", choices: KQ6_TASKS },
    { key: "name", label: "Tên tài liệu", type: "longtext", width: 220 },
    { key: "unit", label: "Đơn vị thực hiện", type: "text" },
    { key: "compiled", label: "Biên soạn", type: "choice", choices: [["", "—"], ["done", "Hoàn thành"], ["not_done", "Chưa hoàn thành"]] },
    { key: "appraised", label: "Thẩm định", type: "choice", choices: [["", "—"], ["appraised", "Đã thẩm định"], ["not_appraised", "Chưa thẩm định"]] },
    { key: "printed", label: "In ấn", type: "choice", choices: [["", "—"], ["printed", "Đã in"], ["not_printed", "Chưa in"]] },
    { key: "printedCopies", label: "Số quyển đã in", type: "number" },
    { key: "compileBudget", label: "KP biên soạn", type: "number" },
    { key: "printBudget", label: "KP in ấn", type: "number" },
    { key: "note", label: "Ghi chú", type: "text" }
  ]
};

export function emptyManualRow(table: keyof ManualTables): ManualRow {
  return Object.fromEntries(MANUAL_COLUMNS[table].map((column) => [column.key, column.type === "number" ? null : column.type === "choice" ? column.choices![0][0] : ""]));
}

export const choiceLabel = (choices: Array<[string, string]>, value: unknown) => choices.find(([key]) => key === value)?.[1] ?? "";

export function applyOverrides(rows: KhqsReportRow[], overrides: Record<string, RowOverride>): KhqsReportRow[] {
  return rows.map((row) => {
    const o = overrides[row.projectId];
    return o ? { ...row, result: o.result ?? row.result, note: o.note ?? row.note } : row;
  });
}
