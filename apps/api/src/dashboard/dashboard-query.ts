import { BadRequestException } from "@nestjs/common";
import { PROJECT_HEALTH_VALUES, type ProjectHealth } from "../approved-projects/project-progress.js";
import { maxRangeEndUtc } from "./vietnam-time.js";

export const DASHBOARD_QUERY_INVALID = "DASHBOARD_QUERY_INVALID";

export const DASHBOARD_SUBJECTS = ["projects", "proposals"] as const;
export type DashboardSubject = (typeof DASHBOARD_SUBJECTS)[number];

export const DRILL_DOWN_METRICS = ["projects", "overdue_projects", "funding", "proposals", "products"] as const;
export type DrillDownMetric = (typeof DRILL_DOWN_METRICS)[number];

export const PRODUCT_STATUS_VALUES = ["accepted", "failed", "pending_acceptance", "supplement_requested", "draft"] as const;
export type DashboardProductStatus = (typeof PRODUCT_STATUS_VALUES)[number];

export type DashboardQueryMode =
  | "stats"
  | "distribution"
  | "trends"
  | "products"
  | "drill-down"
  | "drill-down-export"
  | "export-proposals";

export type DashboardCommonFilters = {
  year?: number;
  unitId?: string;
  level?: string;
  field?: string;
  scope?: string;
  officerId?: string;
  status?: string;
  health?: ProjectHealth;
};

export type ParsedDashboardQuery = DashboardCommonFilters & {
  subject: DashboardSubject;
  metric?: DrillDownMetric;
  from?: string;
  to?: string;
  type?: string;
  productStatus?: DashboardProductStatus;
  page: number;
  pageSize: number;
};

const COMMON_KEYS = ["year", "unitId", "level", "field", "scope", "officerId", "status", "health"] as const;

const ALLOWED_KEYS_BY_MODE: Record<DashboardQueryMode, ReadonlySet<string>> = {
  stats: new Set(COMMON_KEYS),
  distribution: new Set([...COMMON_KEYS, "subject"]),
  trends: new Set([...COMMON_KEYS, "from", "to"]),
  products: new Set([...COMMON_KEYS, "type", "productStatus"]),
  "drill-down": new Set([...COMMON_KEYS, "metric", "type", "productStatus", "page", "pageSize"]),
  "drill-down-export": new Set([...COMMON_KEYS, "metric", "type", "productStatus"]),
  "export-proposals": new Set(COMMON_KEYS)
};

const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,120}$/;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const SAFE_PRODUCT_TYPE_PATTERN = /^[\p{L}\p{N}_ ./(),:&+-]{1,200}$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function invalidQuery(field: string, message?: string): never {
  throw new BadRequestException({
    code: DASHBOARD_QUERY_INVALID,
    field,
    message: message ?? `Tham số truy vấn "${field}" không hợp lệ.`
  });
}

function parseIsoDay(raw: string, field: string): Date {
  if (!ISO_DATE_PATTERN.test(raw)) invalidQuery(field);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    invalidQuery(field);
  }
  return date;
}

function checkDuplicateKeysInUrl(rawUrl?: string) {
  if (!rawUrl) return;
  const qIndex = rawUrl.indexOf("?");
  if (qIndex < 0) return;
  const search = rawUrl.slice(qIndex + 1);
  if (!search) return;
  const params = new URLSearchParams(search);
  const seen = new Set<string>();
  for (const [key] of params.entries()) {
    if (seen.has(key)) invalidQuery(key, `Tham số "${key}" không được phép lặp lại.`);
    seen.add(key);
  }
}

function normalizeEntries(rawQuery: Record<string, unknown> | URLSearchParams | string | undefined): Array<[string, unknown]> {
  if (!rawQuery) return [];
  if (typeof rawQuery === "string") {
    const clean = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
    const params = new URLSearchParams(clean);
    const seen = new Set<string>();
    const entries: Array<[string, unknown]> = [];
    for (const [key, value] of params.entries()) {
      if (seen.has(key)) invalidQuery(key, `Tham số "${key}" không được phép lặp lại.`);
      seen.add(key);
      entries.push([key, value]);
    }
    return entries;
  }
  if (rawQuery instanceof URLSearchParams) {
    const seen = new Set<string>();
    const entries: Array<[string, unknown]> = [];
    for (const [key, value] of rawQuery.entries()) {
      if (seen.has(key)) invalidQuery(key, `Tham số "${key}" không được phép lặp lại.`);
      seen.add(key);
      entries.push([key, value]);
    }
    return entries;
  }
  if (typeof rawQuery !== "object" || Array.isArray(rawQuery)) {
    invalidQuery("query");
  }
  return Object.entries(rawQuery);
}

export function parseDashboardQuery(
  mode: DashboardQueryMode,
  rawQuery?: Record<string, unknown> | URLSearchParams | string,
  rawUrl?: string
): ParsedDashboardQuery {
  checkDuplicateKeysInUrl(rawUrl);
  const allowed = ALLOWED_KEYS_BY_MODE[mode];
  if (!allowed) invalidQuery("mode");

  const entries = normalizeEntries(rawQuery);
  const map = new Map<string, string>();

  for (const [key, rawVal] of entries) {
    if (!allowed.has(key)) {
      invalidQuery(key, `Tham số "${key}" không nằm trong danh sách cho phép.`);
    }
    if (Array.isArray(rawVal)) {
      invalidQuery(key, `Tham số "${key}" không được phép lặp lại.`);
    }
    if (rawVal === undefined) continue;
    if (rawVal === null || typeof rawVal === "object" || typeof rawVal === "boolean") {
      invalidQuery(key);
    }
    const str = String(rawVal).trim();
    if (!str) {
      invalidQuery(key);
    }
    map.set(key, str);
  }

  const parsed: ParsedDashboardQuery = {
    subject: "projects",
    page: 1,
    pageSize: 50
  };

  if (map.has("year")) {
    const rawYear = map.get("year")!;
    if (!/^\d{4}$/.test(rawYear)) invalidQuery("year");
    const year = Number(rawYear);
    if (!Number.isInteger(year) || year < 1990 || year > 2100) invalidQuery("year");
    parsed.year = year;
  }

  for (const idKey of ["unitId", "officerId"] as const) {
    if (map.has(idKey)) {
      const value = map.get(idKey)!;
      if (!SAFE_ID_PATTERN.test(value)) invalidQuery(idKey);
      parsed[idKey] = value;
    }
  }

  for (const codeKey of ["level", "field", "scope", "status"] as const) {
    if (map.has(codeKey)) {
      const value = map.get(codeKey)!;
      if (!SAFE_CODE_PATTERN.test(value)) invalidQuery(codeKey);
      parsed[codeKey] = value;
    }
  }

  if (map.has("health")) {
    const value = map.get("health")!;
    if (!(PROJECT_HEALTH_VALUES as readonly string[]).includes(value)) invalidQuery("health");
    parsed.health = value as ProjectHealth;
  }

  if (map.has("subject")) {
    const value = map.get("subject")!;
    if (!(DASHBOARD_SUBJECTS as readonly string[]).includes(value)) invalidQuery("subject");
    parsed.subject = value as DashboardSubject;
  }

  if (mode === "drill-down" || mode === "drill-down-export") {
    const metric = map.get("metric");
    if (!metric || !(DRILL_DOWN_METRICS as readonly string[]).includes(metric)) {
      invalidQuery("metric");
    }
    parsed.metric = metric as DrillDownMetric;
    if (parsed.metric !== "products") {
      if (map.has("type")) invalidQuery("type");
      if (map.has("productStatus")) invalidQuery("productStatus");
    }
  }

  if (map.has("type")) {
    const value = map.get("type")!;
    if (!SAFE_PRODUCT_TYPE_PATTERN.test(value)) invalidQuery("type");
    parsed.type = value;
  }

  if (map.has("productStatus")) {
    const value = map.get("productStatus")!;
    if (!(PRODUCT_STATUS_VALUES as readonly string[]).includes(value)) invalidQuery("productStatus");
    parsed.productStatus = value as DashboardProductStatus;
  }

  if (map.has("from")) {
    const fromStr = map.get("from")!;
    parseIsoDay(fromStr, "from");
    parsed.from = fromStr;
  }

  if (map.has("to")) {
    const toStr = map.get("to")!;
    parseIsoDay(toStr, "to");
    parsed.to = toStr;
  }

  if (parsed.from && parsed.to) {
    const fromDate = parseIsoDay(parsed.from, "from");
    const toDate = parseIsoDay(parsed.to, "to");
    if (fromDate.getTime() > toDate.getTime()) {
      invalidQuery("from", "Ngày bắt đầu không được lớn hơn ngày kết thúc.");
    }
    if (toDate.getTime() > maxRangeEndUtc(fromDate).getTime()) {
      invalidQuery("to", "Khoảng thời gian xu hướng tối đa 3 năm.");
    }
  }

  if (map.has("page")) {
    const rawPage = map.get("page")!;
    if (!/^\d+$/.test(rawPage)) invalidQuery("page");
    const page = Number(rawPage);
    if (!Number.isInteger(page) || page < 1 || page > 10_000) invalidQuery("page");
    parsed.page = page;
  }

  if (map.has("pageSize")) {
    const rawPageSize = map.get("pageSize")!;
    if (!/^\d+$/.test(rawPageSize)) invalidQuery("pageSize");
    const pageSize = Number(rawPageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) invalidQuery("pageSize");
    parsed.pageSize = pageSize;
  }

  return parsed;
}
