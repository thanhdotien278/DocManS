import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import {
  DashboardAnalyticsService,
  type DrillDownProductRow,
  type DrillDownProjectRow,
  type DrillDownProposalRow
} from "./dashboard-analytics.service.js";
import type { ParsedDashboardQuery } from "./dashboard-query.js";
import { assertDashboardAccess, DashboardService, matchesProposalFilters } from "./dashboard.service.js";
import { vietnamDateParts, vietnamIsoDate } from "./vietnam-time.js";

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type XlsxColumn<Row> = {
  header: string;
  width: number;
  kind?: "text" | "integer" | "decimal";
  value: (row: Row, index: number) => string | number | null | undefined;
};

const EXCEL_MAX_CELL_CHARS = 32_767;
const THIN = { style: "thin" as const, color: { argb: "FFDDE8E1" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const BODY_FONT = { name: "Arial", size: 11, color: { argb: "FF10251B" } };
const HEADER_FONT = { ...BODY_FONT, bold: true, color: { argb: "FFFFFFFF" } };
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF145A37" } };

function cleanXmlChars(raw: string): string {
  return raw
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/g, "");
}

/** Chống formula injection khi mở bằng Excel / LibreOffice Calc. */
export function sanitizeSpreadsheetText(raw: string): string {
  const cleaned = cleanXmlChars(raw);
  const trimmedStart = cleaned.replace(/^[\s]+/, "");
  const guarded = trimmedStart && ["=", "+", "-", "@"].includes(trimmedStart[0]!) ? `'${cleaned}` : cleaned;
  return guarded.slice(0, EXCEL_MAX_CELL_CHARS);
}

export async function buildXlsxBuffer<Row>(options: {
  sheetName: string;
  columns: Array<XlsxColumn<Row>>;
  rows: Row[];
}): Promise<Buffer> {
  const { columns, rows } = options;
  const sheetName = cleanXmlChars(options.sheetName).replace(/[\\/*?:[\]]/g, " ").trim().replace(/^'+|'+$/g, "").trim().slice(0, 31);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName || "DuLieu", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((col) => ({
    header: sanitizeSpreadsheetText(col.header),
    width: col.width,
    style: col.kind === "integer" ? { numFmt: "#,##0" } : col.kind === "decimal" ? { numFmt: "0.00" } : {}
  }));
  rows.forEach((row, index) => {
    sheet.addRow(columns.map((col) => {
      const value = col.value(row, index);
      if (value === null || value === undefined || value === "") return null;
      return typeof value === "number" && Number.isFinite(value) ? value : sanitizeSpreadsheetText(String(value));
    }));
  });
  sheet.getRow(1).height = 24;
  sheet.eachRow((row, rowNumber) => row.eachCell((cell) => {
    const numeric = typeof cell.value === "number";
    cell.border = BORDER;
    cell.font = rowNumber === 1 ? HEADER_FONT : BODY_FONT;
    cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : undefined, wrapText: rowNumber > 1 && !numeric };
    if (rowNumber === 1) cell.fill = HEADER_FILL;
  }));
  if (columns.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: columns.length } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function summarizeAppliedFilters(query: ParsedDashboardQuery): Record<string, unknown> {
  const facts: Record<string, unknown> = {};
  for (const key of ["year", "unitId", "level", "field", "scope", "officerId", "status", "health", "metric", "type", "productStatus"] as const) {
    if (query[key] !== undefined) facts[key] = query[key];
  }
  return facts;
}

function formatDateCell(iso: string | null | undefined): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso.slice(0, 10) : vietnamIsoDate(date);
}

@Injectable()
export class DashboardExportService {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly analytics: DashboardAnalyticsService,
    private readonly auditLog: AuditLogService
  ) {}

  async exportProposals(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const allProposals = await this.dashboard.loadAuthorizedProposals(actor, now);
    const rows = allProposals.filter((item) => matchesProposalFilters(item, query));
    const dateStamp = vietnamDateParts(now).dateStr;

    const buffer = await buildXlsxBuffer({
      sheetName: "HoSoDeXuat",
      rows,
      columns: [
        { header: "STT", width: 7, kind: "integer", value: (_, idx) => idx + 1 },
        { header: "Mã hồ sơ", width: 18, value: (r) => r.code ?? "" },
        { header: "Tên đề xuất", width: 44, value: (r) => r.title },
        { header: "Đơn vị chủ trì", width: 28, value: (r) => r.unitName },
        { header: "Chủ nhiệm", width: 24, value: (r) => r.piName },
        { header: "Cấp quản lý", width: 22, value: (r) => r.levelLabel },
        { header: "Lĩnh vực", width: 22, value: (r) => r.fieldLabel },
        { header: "Tính chất", width: 16, value: (r) => r.scopeLabel },
        { header: "Đợt tiếp nhận", width: 26, value: (r) => r.intakeTitle ?? "" },
        { header: "CV phụ trách", width: 22, value: (r) => r.officerName },
        { header: "Năm", width: 10, kind: "integer", value: (r) => r.year },
        { header: "Trạng thái", width: 18, value: (r) => r.statusLabel },
        { header: "Ngày nộp", width: 14, value: (r) => formatDateCell(r.submittedAt) },
        {
          header: "Kinh phí đề xuất / duyệt (VNĐ)",
          width: 24,
          kind: "integer",
          value: (r) => (r.canViewRowFunding ? r.rawBudget : null)
        }
      ]
    });

    await this.auditLog.record({
      action: "export-dashboard-proposals",
      result: "success",
      actorId: actor.id,
      username: actor.username,
      targetEntity: "dashboard-export",
      targetEntityId: "proposals",
      afterFacts: {
        reportType: "proposals",
        format: "xlsx",
        rowCount: rows.length,
        filters: summarizeAppliedFilters(query)
      }
    });

    return {
      fileName: `ho-so-de-xuat-${dateStamp}.xlsx`,
      mimeType: XLSX_MIME_TYPE,
      buffer
    };
  }

  async exportDrillDown(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const { metric, rows } = await this.analytics.resolveDrillDownRows(actor, query, now);
    const dateStamp = vietnamDateParts(now).dateStr;

    let buffer: Buffer;
    if (metric === "proposals") {
      buffer = await buildXlsxBuffer<DrillDownProposalRow>({
        sheetName: "HoSoDeXuat",
        rows: rows as DrillDownProposalRow[],
        columns: [
          { header: "STT", width: 7, kind: "integer", value: (_, idx) => idx + 1 },
          { header: "Mã hồ sơ", width: 18, value: (r) => r.code ?? "" },
          { header: "Tên đề xuất", width: 44, value: (r) => r.title },
          { header: "Đơn vị chủ trì", width: 28, value: (r) => r.unitName },
          { header: "Chủ nhiệm", width: 24, value: (r) => r.piName },
          { header: "Cấp quản lý", width: 22, value: (r) => r.levelLabel },
          { header: "Lĩnh vực", width: 22, value: (r) => r.fieldLabel },
          { header: "Tính chất", width: 16, value: (r) => r.scopeLabel },
          { header: "Đợt tiếp nhận", width: 26, value: (r) => r.intakeTitle ?? "" },
          { header: "CV phụ trách", width: 22, value: (r) => r.officerName },
          { header: "Năm", width: 10, kind: "integer", value: (r) => r.year },
          { header: "Trạng thái", width: 18, value: (r) => r.statusLabel },
          { header: "Ngày nộp", width: 14, value: (r) => formatDateCell(r.submittedAt) },
          { header: "Kinh phí (VNĐ)", width: 22, kind: "integer", value: (r) => r.totalBudget }
        ]
      });
    } else if (metric === "products") {
      buffer = await buildXlsxBuffer<DrillDownProductRow>({
        sheetName: "SanPhamNghiemThu",
        rows: rows as DrillDownProductRow[],
        columns: [
          { header: "STT", width: 7, kind: "integer", value: (_, idx) => idx + 1 },
          { header: "Tên sản phẩm", width: 38, value: (r) => r.name },
          { header: "Loại sản phẩm", width: 24, value: (r) => r.typeLabel },
          { header: "Trạng thái nghiệm thu", width: 22, value: (r) => r.productStatusLabel },
          { header: "Mã đề tài", width: 18, value: (r) => r.projectCode ?? "" },
          { header: "Đề tài", width: 40, value: (r) => r.projectTitle },
          { header: "Đơn vị chủ trì", width: 28, value: (r) => r.unitName },
          { header: "Chủ nhiệm", width: 24, value: (r) => r.piName },
          { header: "Năm", width: 10, kind: "integer", value: (r) => r.year },
          { header: "Mô tả", width: 36, value: (r) => r.description }
        ]
      });
    } else {
      buffer = await buildXlsxBuffer<DrillDownProjectRow>({
        sheetName: "DeTaiKhoaHoc",
        rows: rows as DrillDownProjectRow[],
        columns: [
          { header: "STT", width: 7, kind: "integer", value: (_, idx) => idx + 1 },
          { header: "Mã đề tài", width: 18, value: (r) => r.code ?? "" },
          { header: "Tên đề tài", width: 44, value: (r) => r.title },
          { header: "Đơn vị chủ trì", width: 28, value: (r) => r.unitName },
          { header: "Chủ nhiệm", width: 24, value: (r) => r.piName },
          { header: "CV phụ trách", width: 22, value: (r) => r.officerName },
          { header: "Cấp quản lý", width: 22, value: (r) => r.levelLabel },
          { header: "Lĩnh vực", width: 22, value: (r) => r.fieldLabel },
          { header: "Tính chất", width: 16, value: (r) => r.scopeLabel },
          { header: "Năm", width: 10, kind: "integer", value: (r) => r.year },
          { header: "Trạng thái", width: 18, value: (r) => r.statusLabel },
          { header: "Sức khoẻ", width: 16, value: (r) => r.healthLabel },
          { header: "KH (%)", width: 12, kind: "decimal", value: (r) => r.plannedPercent },
          { header: "TT (%)", width: 12, kind: "decimal", value: (r) => r.actualPercent },
          { header: "SPI", width: 10, kind: "decimal", value: (r) => r.spi },
          { header: "Mốc quá hạn", width: 14, kind: "integer", value: (r) => r.overdueMilestones },
          { header: "Báo cáo trễ", width: 14, kind: "integer", value: (r) => r.lateReports },
          { header: "Ngày trễ tối đa", width: 16, kind: "integer", value: (r) => r.maxDaysOverdue },
          { header: "Bắt đầu", width: 14, value: (r) => formatDateCell(r.startDate) },
          { header: "Kết thúc", width: 14, value: (r) => formatDateCell(r.endDate) },
          { header: "Kinh phí được cấp (VNĐ)", width: 24, kind: "integer", value: (r) => r.totalBudget },
          { header: "Đã giải ngân (VNĐ)", width: 22, kind: "integer", value: (r) => r.totalDisbursed },
          { header: "Đã quyết toán (VNĐ)", width: 22, kind: "integer", value: (r) => r.totalSettled }
        ]
      });
    }

    await this.auditLog.record({
      action: "export-dashboard-drill-down",
      result: "success",
      actorId: actor.id,
      username: actor.username,
      targetEntity: "dashboard-export",
      targetEntityId: metric,
      afterFacts: {
        reportType: `drill-down:${metric}`,
        format: "xlsx",
        rowCount: rows.length,
        filters: summarizeAppliedFilters(query)
      }
    });

    return {
      fileName: `dashboard-${metric}-${dateStamp}.xlsx`,
      mimeType: XLSX_MIME_TYPE,
      buffer
    };
  }
}
