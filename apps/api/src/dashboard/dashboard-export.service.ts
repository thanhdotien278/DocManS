import { Injectable } from "@nestjs/common";
import { deflateRawSync } from "node:zlib";
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
import { vietnamDateParts } from "./project-health-snapshot.service.js";

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type XlsxColumn<Row> = {
  header: string;
  width: number;
  kind?: "text" | "integer" | "decimal";
  value: (row: Row, index: number) => string | number | null | undefined;
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipArchive(entries: Array<{ name: string; content: string | Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const rawBuf = typeof entry.content === "string" ? Buffer.from(entry.content, "utf8") : entry.content;
    const compressedBuf = deflateRawSync(rawBuf);
    const checksum = crc32(rawBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(8, 8); // method 8 = deflate
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressedBuf.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressedBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressedBuf.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressedBuf.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endRecord]);
}

const EXCEL_MAX_CELL_CHARS = 32_767;
const VN_OFFSET_MS = 7 * 3_600_000;

function cleanXmlChars(raw: string): string {
  return raw
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "");
}

function escapeXml(value: string): string {
  return cleanXmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Chống formula injection khi mở bằng Excel / LibreOffice Calc. */
export function sanitizeSpreadsheetText(raw: string): string {
  const cleaned = cleanXmlChars(raw);
  const trimmedStart = cleaned.replace(/^[\s]+/, "");
  const guarded = trimmedStart && ["=", "+", "-", "@"].includes(trimmedStart[0]!) ? `'${cleaned}` : cleaned;
  return guarded.slice(0, EXCEL_MAX_CELL_CHARS);
}

function colLetters(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function buildXlsxBuffer<Row>(options: {
  sheetName: string;
  columns: Array<XlsxColumn<Row>>;
  rows: Row[];
}): Buffer {
  const cleanedSheet = cleanXmlChars(options.sheetName)
    .replace(/[\\/*?:[\]]/g, " ")
    .trim()
    .replace(/^'+|'+$/g, "")
    .trim()
    .slice(0, 31);
  const safeSheetName = escapeXml(cleanedSheet || "DuLieu");
  const { columns, rows } = options;
  const lastCol = colLetters(Math.max(0, columns.length - 1));
  const lastRow = Math.max(1, rows.length + 1);

  const colsXml = columns
    .map((col, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${col.width}" customWidth="1"/>`)
    .join("");

  const headerCells = columns
    .map((col, colIdx) => {
      const ref = `${colLetters(colIdx)}1`;
      const text = escapeXml(sanitizeSpreadsheetText(col.header));
      return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
    })
    .join("");

  const bodyRowsXml = rows
    .map((row, rowIdx) => {
      const excelRow = rowIdx + 2;
      const cells = columns
        .map((col, colIdx) => {
          const ref = `${colLetters(colIdx)}${excelRow}`;
          const rawVal = col.value(row, rowIdx);
          if (rawVal === null || rawVal === undefined || rawVal === "") {
            return "";
          }
          if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
            const styleId = col.kind === "decimal" ? 3 : 2;
            return `<c r="${ref}" s="${styleId}"><v>${rawVal}</v></c>`;
          }
          const text = escapeXml(sanitizeSpreadsheetText(String(rawVal)));
          return `<c r="${ref}" s="0" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
        })
        .filter(Boolean)
        .join("");
      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join("");

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  ${colsXml ? `<cols>${colsXml}</cols>` : ""}
  <sheetData>
    <row r="1" ht="24" customHeight="1">${headerCells}</row>
    ${bodyRowsXml}
  </sheetData>
  ${columns.length ? `<autoFilter ref="A1:${lastCol}${lastRow}"/>` : ""}
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="0.00"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF10251B"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF145A37"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFDDE8E1"/></left>
      <right style="thin"><color rgb="FFDDE8E1"/></right>
      <top style="thin"><color rgb="FFDDE8E1"/></top>
      <bottom style="thin"><color rgb="FFDDE8E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  return createZipArchive([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml }
  ]);
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
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso.slice(0, 10);
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
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

    const buffer = buildXlsxBuffer({
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
      buffer = buildXlsxBuffer<DrillDownProposalRow>({
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
      buffer = buildXlsxBuffer<DrillDownProductRow>({
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
      buffer = buildXlsxBuffer<DrillDownProjectRow>({
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
