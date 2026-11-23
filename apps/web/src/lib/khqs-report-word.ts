import {
  choiceLabel,
  KQ4_FUNDS,
  KQ4_SECTIONS,
  KQ6_SECTIONS,
  KQ6_TASKS,
  type KhqsReport,
  type KhqsReportDraft,
  type KhqsReportRow,
  type ManualRow
} from "@/lib/khqs-report-api";

/**
 * Văn bản Word của báo cáo công tác KHQS theo mẫu Phòng KHQS: văn bản báo cáo (khổ dọc) và các biểu phụ lục
 * KQ-1…KQ-6 (khổ ngang, mỗi biểu một trang). Mục chưa nhập để dòng chấm cho cán bộ điền trên Word.
 */

const BLANK = "…………………………………………………………………………";
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Mỗi dòng của ô nhập thành một đoạn thụt đầu dòng; ô trống thành dòng chấm. */
function paragraphs(value: string | undefined) {
  const lines = (value ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return (lines.length ? lines : [BLANK]).map((line) => `<p style="text-indent: 1cm; margin: 0 0 6pt 0;">${esc(line)}</p>`).join("");
}

const heading = (text: string) => `<p style="margin: 8pt 0 4pt 0; text-indent: 1cm;"><b>${esc(text)}</b></p>`;

const money = (value: unknown) => (typeof value === "number" ? value.toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : "");

export function buildKhqsReportHtml(report: KhqsReport, draft: KhqsReportDraft) {
  const n = draft.narrative;
  const label = report.periodLabel;
  const next = report.nextPeriodLabel;
  const number = n.documentNumber || "/BC-HVQY";
  const dateLine = n.documentDate || `ngày&nbsp;&nbsp;&nbsp;&nbsp; tháng&nbsp;&nbsp;&nbsp;&nbsp; năm ${report.year}`;
  const signerTitle = (n.signerTitle || "GIÁM ĐỐC").split(/\n+/).map((line) => `<p style="margin: 0; font-weight: bold;">${esc(line)}</p>`).join("");
  const distribution = (n.distribution || "Như trên;\nLưu: VT, QLKHQS.").split(/\n+/).filter(Boolean).map((line) => `<p style="margin: 0; font-size: 11pt;">- ${esc(line.replace(/^-\s*/, ""))}</p>`).join("");

  return `
    <table class="header-table" style="width: 100%; margin-bottom: 12pt;">
      <tr>
        <td style="width: 42%; text-align: center;">
          <p style="margin: 0; font-size: 12pt;">BỘ QUỐC PHÒNG</p>
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">HỌC VIỆN QUÂN Y</p>
          <p style="margin: 4pt 0 0 0; font-size: 12pt;">Số: ${esc(number)}</p>
        </td>
        <td style="width: 58%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</p>
          <p style="margin: 4pt 0 0 0; font-size: 13pt; font-style: italic;">${esc(n.documentPlace || "Hà Nội")}, ${n.documentDate ? esc(dateLine) : dateLine}</p>
        </td>
      </tr>
    </table>
    <div style="text-align: center;">
      <p style="margin: 12pt 0 0 0; font-size: 14pt; font-weight: bold;">BÁO CÁO</p>
      <p style="margin: 0; font-weight: bold;">Kết quả công tác khoa học quân sự ${esc(label)};</p>
      <p style="margin: 0 0 12pt 0; font-weight: bold;">nhiệm vụ trọng tâm ${esc(next)}</p>
      <p style="margin: 0 0 12pt 0;">Kính gửi: ${esc(n.recipient || "Cục Khoa học quân sự.")}</p>
    </div>
    ${paragraphs(n.basis || `Học viện Quân y báo cáo kết quả công tác khoa học quân sự (KHQS) ${label} và nhiệm vụ trọng tâm ${next}, bao gồm các nội dung sau:`)}
    ${heading("* Đặc điểm tình hình")}
    ${paragraphs(n.situation)}
    ${heading(`I. KẾT QUẢ CÔNG TÁC KHQS ${label.toUpperCase()}`)}
    ${heading("1. Công tác nghiên cứu khoa học và công nghệ")}
    ${heading("a) Công tác chỉ đạo, điều hành, xây dựng kế hoạch và tổ chức thực hiện")}
    ${paragraphs(n.direction)}
    ${heading("b) Công tác quản lý nhiệm vụ khoa học và công nghệ")}
    ${paragraphs(n.management || report.suggestions.management)}
    ${heading("2. Công tác xây dựng và phát triển tiềm lực KHQS")}
    ${paragraphs(n.potential)}
    ${heading("3. Công tác bảo vệ môi trường")}
    ${paragraphs(n.environment)}
    ${heading("4. Công tác thông tin KHQS")}
    ${paragraphs(n.information)}
    ${heading("5. Hoạt động hợp tác về khoa học công nghệ")}
    ${paragraphs(n.cooperation)}
    ${heading("6. Các mặt công tác khác")}
    ${heading("a) Khoa học Công nghệ tuổi trẻ")}
    ${paragraphs(n.youth)}
    ${heading("b) Hội nghị, hội thảo, triển lãm")}
    ${paragraphs(n.events)}
    ${heading("7. Đánh giá chung")}
    ${heading("a) Ưu điểm")}
    ${paragraphs(n.strengths)}
    ${heading("b) Tồn tại, hạn chế")}
    ${paragraphs(n.weaknesses)}
    ${heading(`II. MỘT SỐ NHIỆM VỤ TRỌNG TÂM ${next.toUpperCase()}`)}
    ${heading("1. Công tác nghiên cứu KH&CN")}
    ${paragraphs(n.nextResearch)}
    ${heading("2. Công tác xây dựng và phát triển tiềm lực KHQS")}
    ${paragraphs(n.nextPotential)}
    ${heading("3. Tăng cường hoạt động hợp tác và ứng dụng")}
    ${paragraphs(n.nextCooperation)}
    <table class="footer-table" style="width: 100%; margin-top: 18pt;">
      <tr>
        <td style="width: 45%; text-align: left;">
          <p style="margin: 0; font-weight: bold; font-style: italic; font-size: 12pt;">Nơi nhận:</p>
          ${distribution}
        </td>
        <td style="width: 55%; text-align: center;">
          ${signerTitle}
          <p style="margin: 0;">&nbsp;</p><p style="margin: 0;">&nbsp;</p><p style="margin: 0;">&nbsp;</p>
          <p style="margin: 0; font-weight: bold;">${esc(n.signerName || "")}</p>
        </td>
      </tr>
    </table>`;
}

// ---- Biểu phụ lục --------------------------------------------------------------------------------------

type Header = { label: string; group?: string; width?: number };

function headerRows(columns: Header[]) {
  const top: string[] = [];
  const bottom: string[] = [];
  columns.forEach((column, index) => {
    if (!column.group) top.push(`<th rowspan="2"${column.width ? ` style="width: ${column.width}%"` : ""}>${esc(column.label)}</th>`);
    else {
      if (columns.findIndex((item) => item.group === column.group) === index) top.push(`<th colspan="${columns.filter((item) => item.group === column.group).length}">${esc(column.group)}</th>`);
      bottom.push(`<th>${esc(column.label)}</th>`);
    }
  });
  const numbering = columns.map((_, index) => `<td style="text-align: center; font-style: italic;">(${index + 1})</td>`).join("");
  return `<tr>${top.join("")}</tr>${bottom.length ? `<tr>${bottom.join("")}</tr>` : ""}<tr>${numbering}</tr>`;
}

const cell = (value: unknown, align: "left" | "center" | "right" = "left", bold = false) => `<td style="text-align: ${align};${bold ? " font-weight: bold;" : ""}">${esc(value)}</td>`;
const moneyCell = (value: unknown, bold = false) => cell(money(value), "right", bold);

function sum(rows: Array<Record<string, unknown>>, key: string) {
  const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function sheet(code: string, title: string, columns: Header[], body: string, first: boolean) {
  return `
    <div${first ? "" : ' style="page-break-before: always;"'}>
      <table class="header-table" style="width: 100%;"><tr>
        <td style="width: 60%; text-align: left;"><p style="margin: 0; font-weight: bold;">ĐƠN VỊ: HỌC VIỆN QUÂN Y</p></td>
        <td style="width: 40%; text-align: right;"><p style="margin: 0; font-weight: bold;">BIỂU ${esc(code)}</p></td>
      </tr></table>
      <div style="text-align: center;"><p style="margin: 6pt 0 8pt 0; font-weight: bold;">${esc(title)}</p></div>
      <table class="border-table" style="width: 100%;">${headerRows(columns)}${body}</table>
    </div>`;
}

function projectColumns(year: number): Header[] {
  return [
    { label: "TT", width: 4 }, { label: "Tên nhiệm vụ KH&CN", width: 26 }, { label: "Cơ quan chủ trì, Chủ nhiệm", width: 13 }, { label: "Thời gian thực hiện", width: 9 },
    { label: "Kết quả đã đạt được (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 22 },
    { label: "Tổng KP được duyệt", group: "Kinh phí (Triệu đồng)" }, { label: `KP cấp đến năm ${year - 1}`, group: "Kinh phí (Triệu đồng)" }, { label: `KP cấp năm ${year}`, group: "Kinh phí (Triệu đồng)" },
    { label: "Ghi chú", width: 9 }
  ];
}

const projectRow = (row: KhqsReportRow, tt: string) =>
  `<tr>${cell(tt, "center")}${cell(row.name)}${cell(row.hostAndPi)}${cell(row.period, "center")}${cell(row.result)}${moneyCell(row.totalBudget)}${moneyCell(row.allocatedBeforeYear)}${moneyCell(row.allocatedInYear)}${cell(row.note)}</tr>`;

const projectTotal = (rows: KhqsReportRow[]) =>
  `<tr>${cell("")}${cell("Cộng", "center", true)}${cell("")}${cell("")}${cell("")}${moneyCell(sum(rows, "totalBudget"), true)}${moneyCell(sum(rows, "allocatedBeforeYear"), true)}${moneyCell(sum(rows, "allocatedInYear"), true)}${cell("")}</tr>`;

const emptyRow = (count: number) => `<tr>${Array.from({ length: count }, () => cell("…")).join("")}</tr>`;

export function buildKhqsAppendixHtml(report: KhqsReport, draft: KhqsReportDraft, rows: { kq1: KhqsReportRow[]; kq2: Array<{ key: string; title: string; rows: KhqsReportRow[] }> }) {
  const label = report.periodLabel.toUpperCase();
  const year = report.year;
  const m = draft.manual;
  const parts: string[] = [];

  parts.push(
    sheet(
      "KQ-1",
      `KẾT QUẢ THỰC HIỆN CÁC NHIỆM VỤ KH&CN CẤP QUỐC GIA ${label}`,
      projectColumns(year),
      (rows.kq1.length ? rows.kq1.map((row, index) => projectRow(row, String(index + 1))).join("") : emptyRow(9)) + projectTotal(rows.kq1),
      true
    )
  );

  const kq2 = rows.kq2
    .map((section, index) => {
      const group = `<tr>${cell(ROMAN[index], "center", true)}${cell(section.title.toUpperCase(), "left", true)}${cell("")}${cell("")}${cell("")}${moneyCell(sum(section.rows, "totalBudget"), true)}${moneyCell(sum(section.rows, "allocatedBeforeYear"), true)}${moneyCell(sum(section.rows, "allocatedInYear"), true)}${cell("")}</tr>`;
      return group + section.rows.map((row, rowIndex) => projectRow(row, `${rowIndex + 1}`)).join("");
    })
    .join("");
  parts.push(sheet("KQ-2", `KẾT QUẢ THỰC HIỆN CÁC NHIỆM VỤ KH&CN CẤP BỘ, CẤP CƠ SỞ ${label}`, projectColumns(year), kq2 + projectTotal(rows.kq2.flatMap((section) => section.rows)), false));

  const kq3Columns: Header[] = [
    { label: "Số TT", width: 4 }, { label: "Tên nhiệm vụ", width: 16 }, { label: "Cơ quan chủ trì", width: 10 }, { label: "Đối tác thực hiện", width: 10 },
    { label: "Xuất xứ của yêu cầu hợp tác, mức độ xét duyệt và cam kết", width: 11 }, { label: "Thời gian thực hiện", width: 7 },
    { label: "Kết quả thực hiện (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 14 },
    { label: "Tổng KP", group: "Kinh phí (Triệu đồng)" }, { label: "Phía đối tác", group: "Kinh phí (Triệu đồng)" }, { label: "Phía cơ quan chủ trì: Tổng", group: "Kinh phí (Triệu đồng)" },
    { label: "Hỗ trợ từ NS SNKH", group: "Kinh phí (Triệu đồng)" }, { label: "Khác", group: "Kinh phí (Triệu đồng)" }, { label: "Ghi chú", width: 8 }
  ];
  const kq3 =
    m.kq3
      .map(
        (row, index) =>
          `<tr>${cell(index + 1, "center")}${cell(row.name)}${cell(row.host)}${cell(row.partner)}${cell(row.origin)}${cell(row.period, "center")}${cell(row.result)}${moneyCell(row.totalBudget)}${moneyCell(row.partnerBudget)}${moneyCell(row.hostTotal)}${moneyCell(row.hostStateSupport)}${moneyCell(row.hostOther)}${cell(row.note)}</tr>`
      )
      .join("") || emptyRow(13);
  parts.push(sheet("KQ-3", `KẾT QUẢ THỰC HIỆN NHIỆM VỤ HỢP TÁC QUỐC TẾ VÀ TRONG NƯỚC VỀ KHOA HỌC CÔNG NGHỆ ${label}`, kq3Columns, kq3, false));

  const kq4Columns: Header[] = [
    { label: "Số TT", width: 4 }, { label: "Tên hạng mục", width: 18 }, { label: "Chủ đầu tư", width: 9 }, { label: "Địa điểm đầu tư", width: 9 }, { label: "Thời gian thực hiện", width: 7 },
    { label: "Kết quả thực hiện (Ưu điểm, tồn tại hạn chế và nguyên nhân)", width: 16 }, { label: "Khối lượng hoàn thành (%)", width: 7 },
    { label: "Tổng mức đầu tư được duyệt", group: "Kinh phí (Triệu đồng)" }, { label: `KP cấp năm ${year - 1}`, group: "Kinh phí (Triệu đồng)" }, { label: `KP cấp năm ${year}`, group: "Kinh phí (Triệu đồng)" },
    { label: "Ghi chú (ghi rõ số QĐ phê duyệt dự án)", width: 10 }
  ];
  const kq4 = KQ4_SECTIONS.map(([section, title], sectionIndex) => {
    const sectionRows = m.kq4.filter((row) => row.section === section);
    const funds = KQ4_FUNDS.map(([fund, fundTitle], fundIndex) => {
      const fundRows = sectionRows.filter((row) => row.fundSource === fund);
      const lines = fundRows.length
        ? fundRows
            .map(
              (row) =>
                `<tr>${cell("")}${cell(row.name)}${cell(row.investor)}${cell(row.location)}${cell(row.period, "center")}${cell(row.result)}${cell(money(row.completionPercent), "center")}${moneyCell(row.totalInvestment)}${moneyCell(row.allocatedBeforeYear)}${moneyCell(row.allocatedInYear)}${cell(row.note)}</tr>`
            )
            .join("")
        : emptyRow(11);
      return `<tr>${cell(fundIndex + 1, "center")}${cell(fundTitle)}${Array.from({ length: 9 }, () => cell("")).join("")}</tr>${lines}`;
    }).join("");
    return `<tr>${cell(ROMAN[sectionIndex], "center", true)}${cell(title, "left", true)}${Array.from({ length: 5 }, () => cell("")).join("")}${moneyCell(sum(sectionRows, "totalInvestment"), true)}${moneyCell(sum(sectionRows, "allocatedBeforeYear"), true)}${moneyCell(sum(sectionRows, "allocatedInYear"), true)}${cell("")}</tr>${funds}`;
  }).join("");
  const kq4Total = `<tr>${cell("")}${cell("Cộng", "center", true)}${Array.from({ length: 5 }, () => cell("")).join("")}${moneyCell(sum(m.kq4, "totalInvestment"), true)}${moneyCell(sum(m.kq4, "allocatedBeforeYear"), true)}${moneyCell(sum(m.kq4, "allocatedInYear"), true)}${cell("")}</tr>`;
  parts.push(sheet("KQ-4", `KẾT QUẢ THỰC HIỆN ĐẦU TƯ, SỬA CHỮA NÂNG CẤP PHÒNG THÍ NGHIỆM ${label}`, kq4Columns, kq4 + kq4Total, false));

  const kq6Columns: Header[] = [
    { label: "Số TT", width: 5 }, { label: "Tên tài liệu", width: 24 }, { label: "Đơn vị thực hiện", width: 11 },
    { label: "Hoàn thành", group: "Kết quả biên soạn" }, { label: "Chưa hoàn thành", group: "Kết quả biên soạn" }, { label: "Đã thẩm định", group: "Kết quả biên soạn" }, { label: "Chưa thẩm định", group: "Kết quả biên soạn" },
    { label: "Đã in ấn (quyển)", group: "Kết quả in ấn" }, { label: "Chưa in ấn", group: "Kết quả in ấn" },
    { label: "Biên soạn", group: "Kinh phí (triệu đồng)" }, { label: "In ấn", group: "Kinh phí (triệu đồng)" }, { label: "Ghi chú", width: 10 }
  ];
  const x = (on: boolean) => cell(on ? "x" : "", "center");
  const kq6 = KQ6_SECTIONS.map(([section, title], sectionIndex) => {
    const sectionRows = m.kq6.filter((row) => row.section === section);
    const tasks = KQ6_TASKS.map(([task], taskIndex) => {
      const taskRows = sectionRows.filter((row) => row.task === task);
      if (!taskRows.length) return "";
      const lines = taskRows
        .map(
          (row: ManualRow, index) =>
            `<tr>${cell(`${taskIndex + 1}.${index + 1}`, "center")}${cell(row.name)}${cell(row.unit)}${x(row.compiled === "done")}${x(row.compiled === "not_done")}${x(row.appraised === "appraised")}${x(row.appraised === "not_appraised")}${cell(row.printed === "printed" ? (row.printedCopies ?? "x") : "", "center")}${x(row.printed === "not_printed")}${moneyCell(row.compileBudget)}${moneyCell(row.printBudget)}${cell(row.note)}</tr>`
        )
        .join("");
      return `<tr>${cell(taskIndex + 1, "center")}${cell(`${choiceLabel(KQ6_TASKS, task)} ${String(taskRows.length).padStart(2, "0")} tài liệu`)}${Array.from({ length: 10 }, () => cell("")).join("")}</tr>${lines}`;
    }).join("");
    return `<tr>${cell(ROMAN[sectionIndex], "center", true)}${cell(title, "left", true)}${Array.from({ length: 7 }, () => cell("")).join("")}${moneyCell(sum(sectionRows, "compileBudget"), true)}${moneyCell(sum(sectionRows, "printBudget"), true)}${cell("")}</tr>${tasks}`;
  }).join("");
  parts.push(sheet("KQ-6", `KẾT QUẢ THỰC HIỆN NHIỆM VỤ BIÊN SOẠN, IN ẤN TÀI LIỆU HUẤN LUYỆN, TÀI LIỆU DẠY HỌC ${label}`, kq6Columns, kq6, false));

  return parts.join("");
}
