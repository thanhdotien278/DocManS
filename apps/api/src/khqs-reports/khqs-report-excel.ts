import ExcelJS from "exceljs";
import { sanitizeSpreadsheetText } from "../dashboard/dashboard-export.service.js";
import { periodLabel, type KhqsPeriod, type ManualTables, type ReportRow } from "./khqs-report.js";

/**
 * Tệp Excel các biểu phụ lục: mỗi biểu một sheet, khổ ngang, tiêu đề cột hai tầng như mẫu của Phòng KHQS
 * (nhóm "Kinh phí (Triệu đồng)" gộp ô), dòng số thứ tự cột (1), (2)… và các dòng nhóm in đậm.
 */

type Column = { header: string; group?: string; width: number; money?: boolean };
type Cell = string | number | null;
type SheetRow = { kind: "group" | "data"; values: Cell[] };

const THIN = { style: "thin" as const, color: { argb: "FF000000" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const UNIT = "HỌC VIỆN QUÂN Y";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const LABELS = {
  kq4Section: { project: "Dự án Phòng thí nghiệm", repair: "Nhiệm vụ sửa chữa, nâng cấp PTN" } as Record<string, string>,
  kq4Fund: { defense: "Ngân sách Quốc phòng", most: "Ngân sách Bộ KH&CN", other: "Ngân sách khác" } as Record<string, string>,
  kq6Section: { training: "Tài liệu huấn luyện quân sự", social: "Tài liệu xã hội và nhân văn quân sự", teaching: "Tài liệu dạy học" } as Record<string, string>,
  kq6Task: { compile: "Biên soạn mới", edit: "Chỉnh sửa", print: "In ấn" } as Record<string, string>
};

const X = (on: boolean) => (on ? "x" : "");

function safeCell(value: Cell | unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return sanitizeSpreadsheetText(String(value));
}

function addSheet(workbook: ExcelJS.Workbook, input: { name: string; code: string; title: string; columns: Column[]; rows: SheetRow[]; totals?: Cell[] }) {
  const sheet = workbook.addWorksheet(input.name, {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
    }
  });
  const width = input.columns.length;
  sheet.columns = input.columns.map((column) => ({ width: column.width }));

  const line = (row: number, value: string, options: { bold?: boolean; align?: "left" | "center" | "right"; size?: number; from?: number; to?: number } = {}) => {
    const from = options.from ?? 1;
    const to = options.to ?? width;
    sheet.mergeCells(row, from, row, to);
    const cell = sheet.getCell(row, from);
    cell.value = sanitizeSpreadsheetText(value);
    cell.font = { name: "Times New Roman", size: options.size ?? 12, bold: options.bold ?? false };
    cell.alignment = { horizontal: options.align ?? "center", vertical: "middle", wrapText: true };
  };
  const half = Math.max(2, Math.floor(width / 2));
  line(1, `ĐƠN VỊ: ${UNIT}`, { bold: true, align: "left", from: 1, to: half });
  line(1, `BIỂU ${input.code}`, { bold: true, align: "right", from: half + 1, to: width });
  line(2, input.title, { bold: true, size: 13 });

  // Tiêu đề cột: tầng 1 là nhóm (gộp ngang) hoặc tên cột (gộp dọc), tầng 2 là tên cột trong nhóm.
  const top = 4;
  input.columns.forEach((column, index) => {
    const col = index + 1;
    if (!column.group) {
      sheet.mergeCells(top, col, top + 1, col);
      sheet.getCell(top, col).value = sanitizeSpreadsheetText(column.header);
    } else {
      sheet.getCell(top + 1, col).value = sanitizeSpreadsheetText(column.header);
      const first = input.columns.findIndex((item) => item.group === column.group) + 1;
      if (first === col) {
        const last = input.columns.map((item) => item.group).lastIndexOf(column.group) + 1;
        if (last > first) sheet.mergeCells(top, first, top, last);
        sheet.getCell(top, first).value = sanitizeSpreadsheetText(column.group);
      }
    }
  });
  const numbering = sheet.getRow(top + 2);
  input.columns.forEach((_, index) => { numbering.getCell(index + 1).value = `(${index + 1})`; });
  for (let row = top; row <= top + 2; row += 1) {
    for (let col = 1; col <= width; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.font = { name: "Times New Roman", size: 11, bold: row < top + 2, italic: row === top + 2 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = BORDER;
      if (row < top + 2) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    }
  }
  sheet.views = [{ state: "frozen", ySplit: top + 2 }];

  const write = (values: Cell[], bold: boolean) => {
    const row = sheet.addRow(values.map((value) => safeCell(value)));
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > width) return;
      const column = input.columns[col - 1];
      cell.font = { name: "Times New Roman", size: 11, bold };
      cell.border = BORDER;
      cell.alignment = { vertical: "top", wrapText: true, horizontal: column.money ? "right" : col === 1 ? "center" : "left" };
      if (column.money) cell.numFmt = "#,##0.###";
    });
  };
  for (const row of input.rows) write(row.values, row.kind === "group");
  if (input.totals) write(input.totals.map((value, index) => (index === 1 ? "Cộng" : value)), true);
  return sheet;
}

const sum = (rows: Array<Record<string, unknown>>, key: string) => {
  const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) * 1000) / 1000 : null;
};

const PROJECT_COLUMNS: Column[] = [
  { header: "TT", width: 6 },
  { header: "Tên nhiệm vụ KH&CN", width: 46 },
  { header: "Cơ quan chủ trì, chủ nhiệm", width: 24 },
  { header: "Thời gian thực hiện", width: 16 },
  { header: "Kết quả đã đạt được (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 40 },
  { header: "Tổng KP được duyệt", group: "Kinh phí (Triệu đồng)", width: 13, money: true },
  { header: "KP cấp đến năm trước", group: "Kinh phí (Triệu đồng)", width: 13, money: true },
  { header: "KP cấp năm báo cáo", group: "Kinh phí (Triệu đồng)", width: 13, money: true },
  { header: "Ghi chú", width: 18 }
];

function projectColumns(year: number) {
  return PROJECT_COLUMNS.map((column, index) => (index === 6 ? { ...column, header: `KP cấp đến năm ${year - 1}` } : index === 7 ? { ...column, header: `KP cấp năm ${year}` } : column));
}

const projectRow = (row: ReportRow, tt: string): SheetRow => ({
  kind: "data",
  values: [tt, row.name, row.hostAndPi, row.period, row.result, row.totalBudget, row.allocatedBeforeYear, row.allocatedInYear, row.note]
});

const projectTotals = (rows: ReportRow[]): Cell[] => ["", "", "", "", "", sum(rows, "totalBudget"), sum(rows, "allocatedBeforeYear"), sum(rows, "allocatedInYear"), ""];

export type ReportTables = { kq1: ReportRow[]; kq2: Array<{ key: string; title: string; rows: ReportRow[] }> };

export async function buildKhqsWorkbook(input: { year: number; period: KhqsPeriod; tables: ReportTables; manual: ManualTables }) {
  const { year, period, tables, manual } = input;
  const label = periodLabel(year, period).toUpperCase();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DocManS - Học viện Quân y";
  workbook.created = new Date();

  addSheet(workbook, {
    name: "KQ-1",
    code: "KQ-1",
    title: `KẾT QUẢ THỰC HIỆN CÁC NHIỆM VỤ KH&CN CẤP QUỐC GIA ${label}`,
    columns: projectColumns(year),
    rows: tables.kq1.map((row, index) => projectRow(row, String(index + 1))),
    totals: projectTotals(tables.kq1)
  });

  const kq2Rows: SheetRow[] = [];
  tables.kq2.forEach((section, sectionIndex) => {
    kq2Rows.push({ kind: "group", values: [ROMAN[sectionIndex], section.title.toUpperCase(), "", "", "", sum(section.rows, "totalBudget"), sum(section.rows, "allocatedBeforeYear"), sum(section.rows, "allocatedInYear"), ""] });
    section.rows.forEach((row, index) => kq2Rows.push(projectRow(row, `${index + 1}`)));
  });
  const kq2All = tables.kq2.flatMap((section) => section.rows);
  addSheet(workbook, {
    name: "KQ-2",
    code: "KQ-2",
    title: `KẾT QUẢ THỰC HIỆN CÁC NHIỆM VỤ KH&CN CẤP BỘ, CẤP CƠ SỞ ${label}`,
    columns: projectColumns(year),
    rows: kq2Rows,
    totals: projectTotals(kq2All)
  });

  addSheet(workbook, {
    name: "KQ-3",
    code: "KQ-3",
    title: `KẾT QUẢ THỰC HIỆN NHIỆM VỤ HỢP TÁC QUỐC TẾ VÀ TRONG NƯỚC VỀ KHOA HỌC CÔNG NGHỆ ${label}`,
    columns: [
      { header: "Số TT", width: 6 }, { header: "Tên nhiệm vụ", width: 32 }, { header: "Cơ quan chủ trì", width: 20 }, { header: "Đối tác thực hiện", width: 20 },
      { header: "Xuất xứ của yêu cầu hợp tác, mức độ xét duyệt và cam kết", width: 24 }, { header: "Thời gian thực hiện", width: 12 },
      { header: "Kết quả thực hiện (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 30 },
      { header: "Tổng KP", group: "Kinh phí (Triệu đồng)", width: 11, money: true }, { header: "Phía đối tác", group: "Kinh phí (Triệu đồng)", width: 11, money: true },
      { header: "Phía cơ quan chủ trì: Tổng", group: "Kinh phí (Triệu đồng)", width: 11, money: true }, { header: "Hỗ trợ từ NS SNKH", group: "Kinh phí (Triệu đồng)", width: 11, money: true },
      { header: "Khác", group: "Kinh phí (Triệu đồng)", width: 11, money: true }, { header: "Ghi chú", width: 16 }
    ],
    rows: manual.kq3.map((row, index) => ({
      kind: "data",
      values: [index + 1, row.name, row.host, row.partner, row.origin, row.period, row.result, row.totalBudget, row.partnerBudget, row.hostTotal, row.hostStateSupport, row.hostOther, row.note]
    })),
    totals: ["", "", "", "", "", "", "", sum(manual.kq3, "totalBudget"), sum(manual.kq3, "partnerBudget"), sum(manual.kq3, "hostTotal"), sum(manual.kq3, "hostStateSupport"), sum(manual.kq3, "hostOther"), ""]
  });

  const kq4Rows: SheetRow[] = [];
  (["project", "repair"] as const).forEach((section, sectionIndex) => {
    const sectionRows = manual.kq4.filter((row) => row.section === section);
    kq4Rows.push({ kind: "group", values: [ROMAN[sectionIndex], LABELS.kq4Section[section], "", "", "", "", "", sum(sectionRows, "totalInvestment"), sum(sectionRows, "allocatedBeforeYear"), sum(sectionRows, "allocatedInYear"), ""] });
    (["defense", "most", "other"] as const).forEach((fund, fundIndex) => {
      const rows = sectionRows.filter((row) => row.fundSource === fund);
      if (!rows.length) return;
      kq4Rows.push({ kind: "group", values: [String(fundIndex + 1), LABELS.kq4Fund[fund], "", "", "", "", "", null, null, null, ""] });
      rows.forEach((row) => kq4Rows.push({ kind: "data", values: ["", row.name, row.investor, row.location, row.period, row.result, row.completionPercent, row.totalInvestment, row.allocatedBeforeYear, row.allocatedInYear, row.note] }));
    });
  });
  addSheet(workbook, {
    name: "KQ-4",
    code: "KQ-4",
    title: `KẾT QUẢ THỰC HIỆN ĐẦU TƯ, SỬA CHỮA NÂNG CẤP PHÒNG THÍ NGHIỆM ${label}`,
    columns: [
      { header: "Số TT", width: 6 }, { header: "Tên hạng mục", width: 32 }, { header: "Chủ đầu tư", width: 18 }, { header: "Địa điểm đầu tư", width: 18 },
      { header: "Thời gian thực hiện", width: 12 }, { header: "Kết quả thực hiện (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 30 },
      { header: "Khối lượng hoàn thành (%)", width: 11, money: true },
      { header: "Tổng mức đầu tư được duyệt", group: "Kinh phí (Triệu đồng)", width: 13, money: true },
      { header: `KP cấp năm ${year - 1}`, group: "Kinh phí (Triệu đồng)", width: 12, money: true }, { header: `KP cấp năm ${year}`, group: "Kinh phí (Triệu đồng)", width: 12, money: true },
      { header: "Ghi chú (ghi rõ số QĐ phê duyệt dự án)", width: 18 }
    ],
    rows: kq4Rows,
    totals: ["", "", "", "", "", "", null, sum(manual.kq4, "totalInvestment"), sum(manual.kq4, "allocatedBeforeYear"), sum(manual.kq4, "allocatedInYear"), ""]
  });

  const kq6Rows: SheetRow[] = [];
  (["training", "social", "teaching"] as const).forEach((section, sectionIndex) => {
    const sectionRows = manual.kq6.filter((row) => row.section === section);
    kq6Rows.push({ kind: "group", values: [ROMAN[sectionIndex], LABELS.kq6Section[section], "", "", "", "", "", "", "", sum(sectionRows, "compileBudget"), sum(sectionRows, "printBudget"), ""] });
    (["compile", "edit", "print"] as const).forEach((task, taskIndex) => {
      const rows = sectionRows.filter((row) => row.task === task);
      if (!rows.length) return;
      kq6Rows.push({ kind: "group", values: [String(taskIndex + 1), `${LABELS.kq6Task[task]} ${String(rows.length).padStart(2, "0")} tài liệu`, "", "", "", "", "", "", "", null, null, ""] });
      rows.forEach((row, index) => kq6Rows.push({ kind: "data", values: [`${taskIndex + 1}.${index + 1}`, row.name, row.unit, X(row.compiled === "done"), X(row.compiled === "not_done"), X(row.appraised === "appraised"), X(row.appraised === "not_appraised"), row.printed === "printed" ? (row.printedCopies ?? "x") : "", X(row.printed === "not_printed"), row.compileBudget, row.printBudget, row.note] }));
    });
  });
  addSheet(workbook, {
    name: "KQ-6",
    code: "KQ-6",
    title: `KẾT QUẢ THỰC HIỆN NHIỆM VỤ BIÊN SOẠN, IN ẤN TÀI LIỆU HUẤN LUYỆN, TÀI LIỆU DẠY HỌC ${label}`,
    columns: [
      { header: "Số TT", width: 6 }, { header: "Tên tài liệu", width: 34 }, { header: "Đơn vị thực hiện", width: 18 },
      { header: "Hoàn thành", group: "Kết quả biên soạn", width: 10 }, { header: "Chưa hoàn thành", group: "Kết quả biên soạn", width: 10 },
      { header: "Đã thẩm định", group: "Kết quả biên soạn", width: 10 }, { header: "Chưa thẩm định", group: "Kết quả biên soạn", width: 10 },
      { header: "Đã in ấn (quyển)", group: "Kết quả in ấn", width: 10 }, { header: "Chưa in ấn", group: "Kết quả in ấn", width: 10 },
      { header: "Biên soạn", group: "Kinh phí (triệu đồng)", width: 11, money: true }, { header: "In ấn", group: "Kinh phí (triệu đồng)", width: 11, money: true },
      { header: "Ghi chú", width: 18 }
    ],
    rows: kq6Rows,
    totals: ["", "", "", "", "", "", "", "", "", sum(manual.kq6, "compileBudget"), sum(manual.kq6, "printBudget"), ""]
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
