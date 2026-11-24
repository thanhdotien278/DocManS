/**
 * Xuất bảng báo cáo ra tệp Excel (.xlsx) ngay trên trình duyệt. Thư viện exceljs chỉ được tải khi người dùng
 * bấm xuất, không nằm trong gói tải trang.
 */
export type XlsxCell = string | number | null;

export type XlsxReport = {
  fileName: string;
  sheetName: string;
  /** Các dòng tiêu đề phía trên bảng (đơn vị, tên báo cáo, ngày, người lập). */
  titleLines: string[];
  headers: string[];
  rows: XlsxCell[][];
  /** Dòng tổng cộng, in đậm, cuối bảng. */
  summary?: XlsxCell[];
  /** Độ rộng cột (ký tự); thiếu thì mặc định 16. */
  widths?: number[];
  /** Chỉ số cột (bắt đầu từ 0) định dạng số tiền "#,##0". */
  moneyColumns?: number[];
};

function sanitizeCell(value: XlsxCell): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value);
  const trimmedStart = text.replace(/^[\s]+/, "");
  return trimmedStart && ["=", "+", "-", "@"].includes(trimmedStart[0]!) ? `'${text}` : text;
}

export async function downloadXlsxReport(report: XlsxReport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DocManS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(report.sheetName.slice(0, 31));
  const columnCount = report.headers.length;

  report.titleLines.forEach((line, index) => {
    const row = sheet.addRow([sanitizeCell(line)]);
    sheet.mergeCells(row.number, 1, row.number, columnCount);
    row.font = { bold: index < 2, size: index === 1 ? 14 : 11 };
    row.alignment = { horizontal: index < 2 ? "center" : "left" };
  });
  sheet.addRow([]);

  const header = sheet.addRow(report.headers.map(sanitizeCell));
  header.font = { bold: true };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFE7" } };
  });

  for (const values of report.rows) sheet.addRow(values.map(sanitizeCell));
  if (report.summary) sheet.addRow(report.summary.map(sanitizeCell)).font = { bold: true };

  const firstTableRow = header.number;
  const lastTableRow = sheet.rowCount;
  for (let rowNumber = firstTableRow; rowNumber <= lastTableRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= columnCount; column += 1) {
      const cell = row.getCell(column);
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (rowNumber > firstTableRow) cell.alignment = { vertical: "top", wrapText: true };
    }
  }
  report.headers.forEach((_, index) => {
    sheet.getColumn(index + 1).width = report.widths?.[index] ?? 16;
  });
  for (const index of report.moneyColumns ?? []) sheet.getColumn(index + 1).numFmt = "#,##0";
  sheet.views = [{ state: "frozen", ySplit: firstTableRow }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
