import { BadRequestException } from "@nestjs/common";
import { latestFunding, readApprovedBudget } from "../approved-projects/project-funding.js";

/**
 * Báo cáo kết quả công tác khoa học quân sự (KHQS) 6 tháng đầu năm / cả năm theo mẫu Phòng KHQS:
 * văn bản báo cáo + các biểu phụ lục KQ-1…KQ-6.
 *
 * - Biểu KQ-1 (nhiệm vụ cấp Quốc gia) và KQ-2 (cấp Bộ Quốc phòng, Ngành/Cục, cơ sở) dựng tự động
 *   từ đề tài đang theo dõi; cột "Kết quả" và "Ghi chú" sửa được theo kỳ, không đổi dữ liệu đề tài.
 * - Biểu KQ-3, KQ-4, KQ-6 nhập tay trên trang báo cáo, lưu theo kỳ.
 * Kinh phí trong các biểu tính bằng triệu đồng.
 */

export const KHQS_PERIODS = ["H1", "FY"] as const;
export type KhqsPeriod = (typeof KHQS_PERIODS)[number];

export const KQ1_LEVELS = ["national-level"] as const;
export const KQ2_SECTIONS = [
  { key: "ministry", title: "Nhiệm vụ KH&CN cấp Bộ Quốc phòng", levels: ["ministry-defense", "ministry-level"] },
  { key: "branch", title: "Nhiệm vụ KH&CN cấp Ngành / Cục", levels: ["sector-level", "branch-level"] },
  { key: "grassroots", title: "Nhiệm vụ KH&CN cấp cơ sở", levels: ["academy-level", "base-level", "grassroots-level"] }
] as const;
export const REPORT_LEVELS: readonly string[] = [...KQ1_LEVELS, ...KQ2_SECTIONS.flatMap((section) => section.levels)];

const VN_OFFSET = 7 * 60 * 60 * 1000;
const MILLION = 1_000_000;

export function parsePeriod(yearRaw: unknown, periodRaw: unknown): { year: number; period: KhqsPeriod } {
  const year = typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : NaN;
  if (!(year >= 2000 && year <= 2100)) {
    throw new BadRequestException({ code: "KHQS_REPORT_PERIOD_INVALID", message: "Năm báo cáo không hợp lệ." });
  }
  if (!(KHQS_PERIODS as readonly unknown[]).includes(periodRaw)) {
    throw new BadRequestException({ code: "KHQS_REPORT_PERIOD_INVALID", message: "Kỳ báo cáo phải là H1 (6 tháng đầu năm) hoặc FY (cả năm)." });
  }
  return { year, period: periodRaw as KhqsPeriod };
}

/** Kỳ báo cáo theo ngày lịch Việt Nam: [01/01, 30/06] hoặc [01/01, 31/12]; cột DATE lưu 00:00Z của ngày. */
export function periodBounds(year: number, period: KhqsPeriod) {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, period === "H1" ? 5 : 11, period === "H1" ? 30 : 31)) };
}

export function periodLabel(year: number, period: KhqsPeriod) {
  return period === "H1" ? `6 tháng đầu năm ${year}` : `năm ${year}`;
}

/** Kỳ kế tiếp dùng cho phần "Nhiệm vụ trọng tâm". */
export function nextPeriodLabel(year: number, period: KhqsPeriod) {
  return period === "H1" ? `6 tháng cuối năm ${year}` : `năm ${year + 1}`;
}

/** Ngày lịch của một giá trị: cột DATE giữ nguyên, thời điểm (timestamp) đổi sang giờ Việt Nam. */
function calendarDay(value: Date | string | null | undefined, isDateColumn = true) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return isDateColumn ? date : new Date(date.getTime() + VN_OFFSET);
}

const monthYear = (value: Date | string | null | undefined) => {
  const day = calendarDay(value);
  return day ? `${String(day.getUTCMonth() + 1).padStart(2, "0")}/${day.getUTCFullYear()}` : null;
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const millions = (value: unknown) => Math.round((toNumber(value) / MILLION) * 1000) / 1000;
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

/** Dữ liệu một đề tài đã nạp cho báo cáo (truy vấn chọn trường trong KhqsReportsService). */
export type ReportProjectSource = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  scopeSnapshot: unknown;
  hostOrganizationUnitId: string;
  hostOrganizationUnit: { name: string } | null;
  proposal: { proposalTypeCode: string | null } | null;
  members: Array<{ name: string; participationRole: string; status: string; effectiveUntil: Date | null; user: { displayName: string } | null }>;
  fundingRecords: Array<{ entryId: string; version: number; kind: string; amount: unknown; recordedOn: Date }>;
  requests: Array<{ requestType: string; status: string; currentValues: unknown; proposedValues: unknown; decidedAt: Date | null }>;
  reports: Array<{ status: string; revision: number; progressResults: string; issuesRecommendations: string | null; submittedAt: Date | null }>;
  history: Array<{ action: string; toStatus: string | null; createdAt: Date }>;
  liquidations: Array<{ status: string; decidedAt: Date | null; liquidationNumber: string | null }>;
};

export type ReportRow = {
  projectId: string;
  level: string;
  name: string;
  code: string | null;
  hostAndPi: string;
  period: string;
  result: string;
  /** Kết quả tự dựng từ dữ liệu đề tài (để khôi phục khi bỏ phần sửa tay). */
  suggestedResult: string;
  totalBudget: number | null;
  allocatedBeforeYear: number | null;
  allocatedInYear: number | null;
  note: string;
  /** Kết quả / ghi chú đã được sửa tay cho kỳ này. */
  edited: boolean;
};

export function projectLevel(project: Pick<ReportProjectSource, "scopeSnapshot" | "proposal">) {
  const scope = project.scopeSnapshot && typeof project.scopeSnapshot === "object" && !Array.isArray(project.scopeSnapshot) ? (project.scopeSnapshot as Record<string, unknown>) : {};
  return text(scope.proposalTypeCode) ?? text(project.proposal?.proposalTypeCode) ?? null;
}

function readDate(values: unknown, ...keys: string[]) {
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  for (const key of keys) {
    const raw = (values as Record<string, unknown>)[key];
    if (typeof raw === "string" || raw instanceof Date) {
      const date = new Date(raw);
      if (!Number.isNaN(date.valueOf())) return date;
    }
  }
  return null;
}

/** "03/2021 – 02/2024 (gia hạn 02/2026)": ngày kết thúc ban đầu lấy từ lần gia hạn được duyệt đầu tiên. */
export function periodText(project: Pick<ReportProjectSource, "startDate" | "endDate" | "requests">) {
  const extensions = project.requests
    .filter((request) => request.requestType === "extension" && request.status === "approved")
    .sort((left, right) => (left.decidedAt?.getTime() ?? 0) - (right.decidedAt?.getTime() ?? 0));
  const originalEnd = extensions.length ? readDate(extensions[0].currentValues, "endDate") ?? project.endDate : project.endDate;
  const extendedTo = extensions.length ? readDate(extensions[extensions.length - 1].proposedValues, "requestedEndDate", "endDate") ?? project.endDate : null;
  const start = monthYear(project.startDate) ?? "…";
  const end = monthYear(originalEnd) ?? "…";
  return extendedTo ? `${start} – ${end} (gia hạn ${monthYear(extendedTo)})` : `${start} – ${end}`;
}

const STATUS_RESULT: Record<string, string> = {
  preparing: "Đang chuẩn bị triển khai.",
  executing: "Đang thực hiện.",
  paused: "Tạm dừng thực hiện.",
  pending_acceptance: "Đã hoàn thành nội dung, đang làm thủ tục nghiệm thu.",
  accepted: "Đã nghiệm thu (Đạt).",
  failed: "Nghiệm thu không đạt.",
  closed: "Đã nghiệm thu, thanh lý và đóng đề tài."
};

/** Kết quả gợi ý: trạng thái, biên bản thanh lý nếu có, rồi kết quả và tồn tại của báo cáo tiến độ gần nhất đã nộp. */
export function suggestedResult(project: Pick<ReportProjectSource, "status" | "reports" | "liquidations">) {
  const parts: string[] = [];
  const signedLiquidation = [...project.liquidations]
    .filter((item) => item.status === "SIGNED")
    .sort((left, right) => (right.decidedAt?.getTime() ?? 0) - (left.decidedAt?.getTime() ?? 0))[0];
  if (project.status === "closed" && signedLiquidation?.liquidationNumber) {
    parts.push(`Đã nghiệm thu, thanh lý và đóng đề tài (BBTL số ${signedLiquidation.liquidationNumber}).`);
  } else {
    parts.push(STATUS_RESULT[project.status] ?? "");
  }
  const report = [...project.reports]
    .filter((item) => item.status !== "draft" && item.submittedAt)
    .sort((left, right) => right.revision - left.revision)[0];
  if (report && !["accepted", "closed", "failed"].includes(project.status)) {
    const progress = text(report.progressResults);
    const issues = text(report.issuesRecommendations);
    if (progress) parts.push(clip(progress, 400));
    if (issues) parts.push(`Tồn tại, kiến nghị: ${clip(issues, 300)}`);
  }
  return parts.filter(Boolean).join(" ");
}

function piName(project: Pick<ReportProjectSource, "members">, at: Date) {
  const pi = project.members.find((member) => member.participationRole === "TOPIC_PI" && member.status === "ACTIVE" && (!member.effectiveUntil || member.effectiveUntil > at));
  return pi ? pi.user?.displayName ?? pi.name : null;
}

/** Kinh phí được cấp và đã cấp (giải ngân) trước năm báo cáo và trong kỳ báo cáo của năm theo phiên bản mới nhất của `ProjectFundingRecord`. */
export function allocation(
  project: Pick<ReportProjectSource, "fundingRecords" | "scopeSnapshot">,
  year: number,
  period: KhqsPeriod
) {
  const { end } = periodBounds(year, period);
  const latest = latestFunding(project.fundingRecords);
  let grantTotal = 0;
  let hasGrantRecord = false;
  let before = 0;
  let inYear = 0;
  let hasDisbursement = false;

  for (const record of latest) {
    const amount = toNumber(record.amount);
    if (record.kind === "GRANT") {
      hasGrantRecord = true;
      grantTotal += amount;
    } else if (record.kind === "DISBURSEMENT") {
      hasDisbursement = true;
      const day = calendarDay(record.recordedOn);
      if (!day) continue;
      if (day.getUTCFullYear() < year) before += amount;
      else if (day.getUTCFullYear() === year && day.getTime() <= end.getTime()) inYear += amount;
    }
  }

  const scopeRecord = project.scopeSnapshot && typeof project.scopeSnapshot === "object" && !Array.isArray(project.scopeSnapshot)
    ? (project.scopeSnapshot as Record<string, unknown>)
    : null;
  const fallbackBudget = readApprovedBudget(scopeRecord?.budgetMetadata);
  const hasBudget = hasGrantRecord || fallbackBudget > 0;

  return {
    totalBudget: hasGrantRecord ? millions(grantTotal) : fallbackBudget > 0 ? millions(fallbackBudget) : null,
    before: hasBudget || hasDisbursement ? millions(before) : null,
    inYear: hasBudget || hasDisbursement ? millions(inYear) : null
  };
}

export type RowOverride = { result?: string; note?: string };

export function buildRow(project: ReportProjectSource, year: number, period: KhqsPeriod, override: RowOverride | undefined, now = new Date()): ReportRow {
  const pi = piName(project, now);
  const unit = project.hostOrganizationUnit?.name ?? project.hostOrganizationUnitId;
  const money = allocation(project, year, period);
  const suggested = suggestedResult(project);
  return {
    projectId: project.id,
    level: projectLevel(project) ?? "",
    name: project.code ? `${project.title}. Mã số: ${project.code}` : project.title,
    code: project.code,
    hostAndPi: pi ? `${unit}; ${pi}` : unit,
    period: periodText(project),
    result: override?.result ?? suggested,
    suggestedResult: suggested,
    totalBudget: money.totalBudget,
    allocatedBeforeYear: money.before,
    allocatedInYear: money.inYear,
    note: override?.note ?? "",
    edited: override?.result !== undefined || override?.note !== undefined
  };
}

const byCode = (left: ReportRow, right: ReportRow) => String(left.code ?? "~").localeCompare(String(right.code ?? "~")) || left.name.localeCompare(right.name);

export function buildTables(projects: ReportProjectSource[], year: number, period: KhqsPeriod, overrides: Record<string, RowOverride>, now = new Date()) {
  const rows = projects.map((project) => buildRow(project, year, period, overrides[project.id], now));
  return {
    kq1: rows.filter((row) => (KQ1_LEVELS as readonly string[]).includes(row.level)).sort(byCode),
    kq2: KQ2_SECTIONS.map((section) => ({
      key: section.key,
      title: section.title,
      rows: rows.filter((row) => (section.levels as readonly string[]).includes(row.level)).sort(byCode)
    }))
  };
}

// ---- Dữ liệu nhập tay ---------------------------------------------------------------------------------

type FieldType = "text" | "number" | "choice";
type FieldSpec = { type: FieldType; max?: number; choices?: readonly string[] };

export const MANUAL_TABLE_SPECS = {
  kq3: {
    name: { type: "text", max: 1000 }, host: { type: "text", max: 500 }, partner: { type: "text", max: 500 }, origin: { type: "text", max: 1000 },
    period: { type: "text", max: 100 }, result: { type: "text", max: 2000 }, totalBudget: { type: "number" }, partnerBudget: { type: "number" },
    hostTotal: { type: "number" }, hostStateSupport: { type: "number" }, hostOther: { type: "number" }, note: { type: "text", max: 500 }
  },
  kq4: {
    section: { type: "choice", choices: ["project", "repair"] }, fundSource: { type: "choice", choices: ["defense", "most", "other"] },
    name: { type: "text", max: 1000 }, investor: { type: "text", max: 500 }, location: { type: "text", max: 500 }, period: { type: "text", max: 100 },
    result: { type: "text", max: 2000 }, completionPercent: { type: "number" }, totalInvestment: { type: "number" }, allocatedBeforeYear: { type: "number" },
    allocatedInYear: { type: "number" }, note: { type: "text", max: 500 }
  },
  kq6: {
    section: { type: "choice", choices: ["training", "social", "teaching"] }, task: { type: "choice", choices: ["compile", "edit", "print"] },
    name: { type: "text", max: 1000 }, unit: { type: "text", max: 500 }, compiled: { type: "choice", choices: ["", "done", "not_done"] },
    appraised: { type: "choice", choices: ["", "appraised", "not_appraised"] }, printedCopies: { type: "number" }, printed: { type: "choice", choices: ["", "printed", "not_printed"] },
    compileBudget: { type: "number" }, printBudget: { type: "number" }, note: { type: "text", max: 500 }
  }
} as const satisfies Record<string, Record<string, FieldSpec>>;

export type ManualTableKey = keyof typeof MANUAL_TABLE_SPECS;
export type ManualRow = Record<string, string | number | null>;
export type ManualTables = { kq3: ManualRow[]; kq4: ManualRow[]; kq6: ManualRow[]; overrides: Record<string, RowOverride> };

export const NARRATIVE_FIELDS = [
  "documentNumber", "documentPlace", "documentDate", "recipient", "basis", "situation",
  "direction", "management", "potential", "environment", "information", "cooperation", "youth", "events",
  "strengths", "weaknesses", "nextResearch", "nextPotential", "nextCooperation",
  "signerTitle", "signerName", "distribution"
] as const;
export type NarrativeField = (typeof NARRATIVE_FIELDS)[number];
export type Narrative = Partial<Record<NarrativeField, string>>;

const MAX_ROWS = 300;
const MAX_NARRATIVE = 20_000;
const MAX_OVERRIDES = 2000;

function invalid(field: string, message: string): never {
  throw new BadRequestException({ code: "KHQS_REPORT_INVALID", field, message });
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const cleanText = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();

function readCell(table: string, index: number, key: string, spec: FieldSpec, raw: unknown) {
  const where = `${table}[${index}].${key}`;
  if (raw === undefined || raw === null || raw === "") return spec.type === "number" ? null : "";
  if (spec.type === "number") {
    const value = typeof raw === "number" ? raw : typeof raw === "string" && /^-?\d+(?:[.,]\d+)?$/.test(raw.trim()) ? Number(raw.trim().replace(",", ".")) : NaN;
    if (!Number.isFinite(value) || value < 0 || value > 1e12) invalid(where, "Số không hợp lệ (phải là số không âm).");
    return Math.round(value * 1000) / 1000;
  }
  if (typeof raw !== "string") invalid(where, "Giá trị phải là chữ.");
  const value = cleanText(raw);
  if (spec.type === "choice") {
    if (!spec.choices!.includes(value)) invalid(where, "Giá trị không nằm trong danh sách cho phép.");
    return value;
  }
  if (value.length > (spec.max ?? 1000)) invalid(where, `Tối đa ${spec.max ?? 1000} ký tự.`);
  return value;
}

export function readManualTables(input: unknown): ManualTables {
  if (!isObject(input)) invalid("manualTables", "Dữ liệu các biểu nhập tay không hợp lệ.");
  const result: ManualTables = { kq3: [], kq4: [], kq6: [], overrides: {} };
  for (const table of Object.keys(MANUAL_TABLE_SPECS) as ManualTableKey[]) {
    const rows = input[table] ?? [];
    if (!Array.isArray(rows)) invalid(table, "Biểu phải là danh sách dòng.");
    if (rows.length > MAX_ROWS) invalid(table, `Tối đa ${MAX_ROWS} dòng mỗi biểu.`);
    const spec = MANUAL_TABLE_SPECS[table] as Record<string, FieldSpec>;
    result[table] = rows.map((row, index) => {
      if (!isObject(row)) invalid(`${table}[${index}]`, "Dòng không hợp lệ.");
      const unknown = Object.keys(row).find((key) => !(key in spec));
      if (unknown) invalid(`${table}[${index}].${unknown.slice(0, 40)}`, "Cột không có trong biểu.");
      return Object.fromEntries(Object.entries(spec).map(([key, field]) => [key, readCell(table, index, key, field, row[key])]));
    });
  }
  const overrides = input.overrides ?? {};
  if (!isObject(overrides)) invalid("overrides", "Phần sửa kết quả không hợp lệ.");
  const entries = Object.entries(overrides);
  if (entries.length > MAX_OVERRIDES) invalid("overrides", "Quá nhiều dòng sửa.");
  for (const [projectId, value] of entries) {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(projectId) || !isObject(value)) invalid("overrides", "Phần sửa kết quả không hợp lệ.");
    const override: RowOverride = {};
    for (const key of Object.keys(value)) {
      if (key !== "result" && key !== "note") invalid(`overrides.${projectId}`, "Chỉ sửa được Kết quả và Ghi chú.");
      const raw = value[key];
      if (raw === undefined || raw === null) continue;
      if (typeof raw !== "string") invalid(`overrides.${projectId}.${key}`, "Giá trị phải là chữ.");
      const cleaned = cleanText(raw);
      if (cleaned.length > 3000) invalid(`overrides.${projectId}.${key}`, "Tối đa 3000 ký tự.");
      override[key] = cleaned;
    }
    if (override.result !== undefined || override.note !== undefined) result.overrides[projectId] = override;
  }
  return result;
}

export function readNarrative(input: unknown): Narrative {
  if (!isObject(input)) invalid("narrative", "Nội dung báo cáo không hợp lệ.");
  const result: Narrative = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!(NARRATIVE_FIELDS as readonly string[]).includes(key)) invalid(`narrative.${key.slice(0, 40)}`, "Mục không có trong mẫu báo cáo.");
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "string") invalid(`narrative.${key}`, "Nội dung phải là chữ.");
    const value = cleanText(raw);
    if (value.length > MAX_NARRATIVE) invalid(`narrative.${key}`, `Tối đa ${MAX_NARRATIVE} ký tự.`);
    if (value) result[key as NarrativeField] = value;
  }
  return result;
}

/** Đọc lại dữ liệu đã lưu (cột JSON) mà không ném lỗi: bản ghi cũ hỏng không được làm hỏng cả báo cáo. */
export function storedManualTables(value: unknown): ManualTables {
  try {
    return readManualTables(value ?? {});
  } catch {
    return { kq3: [], kq4: [], kq6: [], overrides: {} };
  }
}

export function storedNarrative(value: unknown): Narrative {
  try {
    return readNarrative(value ?? {});
  } catch {
    return {};
  }
}

/** Số liệu tổng hợp để gợi ý đoạn "Công tác quản lý nhiệm vụ KH&CN" trong văn bản báo cáo. */
export function managementFacts(projects: ReportProjectSource[], year: number, period: KhqsPeriod) {
  const { start, end } = periodBounds(year, period);
  const inPeriod = (value: Date | null | undefined, isDateColumn = false) => {
    const day = calendarDay(value, isDateColumn);
    return !!day && day.getTime() >= start.getTime() && day.getTime() <= end.getTime() + 86_399_999;
  };
  const levelCount = (levels: readonly string[]) => projects.filter((project) => levels.includes(projectLevel(project) ?? "")).length;
  const started = projects.filter((project) => inPeriod(project.startDate, true)).length;
  const accepted = projects.filter((project) => project.history.some((event) => event.action === "project.acceptance.result" && inPeriod(event.createdAt))).length;
  const extended = projects.filter((project) => project.requests.some((request) => request.requestType === "extension" && request.status === "approved" && inPeriod(request.decidedAt))).length;
  const closed = projects.filter((project) => project.liquidations.some((liq) => liq.status === "SIGNED" && inPeriod(liq.decidedAt))).length;
  return {
    total: projects.length,
    national: levelCount(KQ1_LEVELS),
    ministry: levelCount(KQ2_SECTIONS[0].levels),
    branch: levelCount(KQ2_SECTIONS[1].levels),
    grassroots: levelCount(KQ2_SECTIONS[2].levels),
    started,
    accepted,
    extended,
    closed
  };
}

export function managementSuggestion(facts: ReturnType<typeof managementFacts>, year: number, period: KhqsPeriod) {
  const parts = [
    `Trong ${periodLabel(year, period)}, Học viện quản lý ${facts.total} nhiệm vụ KH&CN (${facts.national} cấp Quốc gia, ${facts.ministry} cấp Bộ Quốc phòng, ${facts.branch} cấp Ngành/Cục, ${facts.grassroots} cấp cơ sở).`,
    facts.started ? `Giao nhiệm vụ thực hiện ${facts.started} đề tài mới.` : "",
    facts.accepted ? `Tổ chức nghiệm thu ${facts.accepted} đề tài.` : "",
    facts.closed ? `Hoàn thành thanh lý, đóng ${facts.closed} đề tài.` : "",
    facts.extended ? `Gia hạn thời gian thực hiện ${facts.extended} đề tài.` : "",
    "(Danh sách các đề tài xem Biểu KQ-1, KQ-2 kèm theo)."
  ];
  return parts.filter(Boolean).join(" ");
}
