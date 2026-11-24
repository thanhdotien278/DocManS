/**
 * Quyết định của Giám đốc Học viện theo mẫu Phòng KHQS (QĐ 4626/QĐ-HVQY, QĐ 1273/QĐ-HVQY):
 * quốc hiệu, số "…/QĐ-HVQY", trích yếu nêu tên và mã số đề tài, các căn cứ, điều khoản, nơi nhận,
 * người ký (chức danh, cấp bậc họ tên) và các phụ lục trang riêng. Một HTML dùng cho cả xem / in trên
 * trình duyệt lẫn Word. Chưa có số, ngày, người ký thì để trống cho văn thư, người ký điền.
 */

export const BLANK = "…………………………";

export function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Căn cứ dùng chung của các quyết định KH&CN (theo mẫu QĐ 1273/QĐ-HVQY, QĐ 4626/QĐ-HVQY). */
export const DECISION_BASES = {
  law: "Căn cứ Luật Khoa học, công nghệ và Đổi mới sáng tạo số 93/2025/QH15 ngày 27/6/2025;",
  charter: "Căn cứ Thông tư 14/2022/TT-BQP ngày 01/02/2022 của Bộ Quốc phòng ban hành Điều lệ công tác khoa học và công nghệ Quân đội nhân dân Việt Nam;",
  selection: "Căn cứ Thông tư 05/2024/TT-BQP Quy định tuyển chọn, giao trực tiếp đơn vị, cá nhân thực hiện nhiệm vụ khoa học và công nghệ cấp Bộ Quốc phòng;",
  regulation: "Căn cứ Quy chế Quản lý hoạt động khoa học và công nghệ số 5379/QC-HVQY ngày 23/12/2023 của Học viện Quân y;",
  proposal: (title: string) => `Căn cứ Thuyết minh đề tài: “${title}”;`,
  contract: `Căn cứ Hợp đồng số ${BLANK} ngày ${BLANK} giữa Học viện Quân y với nhóm nghiên cứu;`,
  request: "Theo đề nghị của Trưởng phòng Khoa học Quân sự."
};

/** Thủ trưởng Học viện nhận quyết định (Nơi nhận "TT Tiến, TT Thuận, TT Định"); đổi Thủ trưởng thì sửa dòng này. */
export const LEADERSHIP_RECIPIENTS = "TT Tiến, TT Thuận, TT Định";

/** Nơi nhận theo mẫu: Như Điều 1; Thủ trưởng; Chủ nhiệm đề tài; (thêm); Lưu. */
export function decisionRecipients(extra: string[] = []) {
  return ["Như Điều 1;", `${LEADERSHIP_RECIPIENTS};`, "Chủ nhiệm đề tài;", ...extra, "Lưu: VT, QLKHQS/J6."];
}

const TITLE_TOKEN = /^(?:GS|PGS|TS|TSKH|ThS|BS|BSCKI{1,2}|CN|KS|DS)\.?,?$/i;

/** Học hàm, học vị viết như văn bản Học viện: "PGS. TS." → "PGS, TS". */
export function officialTitles(titles?: string | null) {
  return (titles ?? "").split(/[\s,]+/).map((token) => token.replace(/\.+$/, "")).filter(Boolean).join(", ");
}

/** "Thiếu tướng, PGS, TS Vũ Nhất Định"; thiếu cấp bậc: "PGS, TS Lê Đức Hậu"; thiếu học vị: "Trung tướng Trần Viết Tiến". */
export function officialName(input: { militaryRank?: string | null; titles?: string | null; name: string }) {
  const rank = input.militaryRank?.trim();
  const titles = officialTitles(input.titles);
  const name = input.name.trim();
  const withTitles = titles ? `${titles} ${name}` : name;
  if (!rank) return withTitles;
  const capitalized = rank.charAt(0).toLocaleUpperCase("vi") + rank.slice(1);
  return titles ? `${capitalized}, ${withTitles}` : `${capitalized} ${withTitles}`;
}

/** Tách tên hiển thị của tài khoản ("Thượng tá, PGS. TS. Đỗ Minh Trung", đồng bộ theo lý lịch) thành cấp bậc, học vị, họ tên. */
export function splitDisplayName(displayName?: string | null) {
  const value = displayName?.trim() ?? "";
  const comma = value.indexOf(",");
  const head = comma > 0 ? value.slice(0, comma).trim() : "";
  // Phần trước dấu phẩy là cấp bậc nếu không phải học hàm, học vị ("PGS, TS Lê B" không có cấp bậc).
  const hasRank = !!head && !TITLE_TOKEN.test(head);
  const rest = hasRank ? value.slice(comma + 1).trim() : value;
  const tokens = rest.split(/\s+/).filter(Boolean);
  const titleTokens: string[] = [];
  while (tokens.length > 1 && TITLE_TOKEN.test(tokens[0])) titleTokens.push(tokens.shift()!);
  return { militaryRank: hasRank ? head : "", titles: titleTokens.join(" "), name: tokens.join(" ") };
}

/** Tên chủ nhiệm, thành viên trong thân quyết định: "Thượng tá, TS Phạm Anh Tuấn". */
export function officialNameFromDisplay(displayName?: string | null) {
  const parts = splitDisplayName(displayName);
  return parts.name ? officialName(parts) : "";
}

/** Dòng người ký: cấp bậc và họ tên, bỏ học hàm, học vị ("Trung tướng, GS. TS. Trần Viết Tiến" → "Trung tướng Trần Viết Tiến"). */
export function signerLine(displayName?: string | null) {
  const parts = splitDisplayName(displayName);
  return parts.name ? officialName({ militaryRank: parts.militaryRank, name: parts.name }) : "";
}

/** Đơn vị trong Học viện ghi kèm "Học viện Quân y": "Khoa Toán – Tin học, Học viện Quân y". */
export function academyUnit(unit?: string | null) {
  const value = unit?.trim();
  if (!value) return BLANK;
  return /học viện quân y/i.test(value) ? value : `${value}, Học viện Quân y`;
}

/** "Số: 4626 /QĐ-HVQY": số văn thư cấp đã có ký hiệu thì giữ nguyên, chỉ có số thì thêm ký hiệu, chưa có thì để trống. */
export function decisionNumberLine(number?: string | null) {
  const value = number?.trim();
  if (!value) return "Số:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/QĐ-HVQY";
  return `Số: ${esc(/\//.test(value) ? value : `${value} /QĐ-HVQY`)}`;
}

/** "Hà Nội, ngày 09 tháng 9 năm 2026"; chưa ký thì để trống ngày, tháng. */
export function decisionDateLine(date?: Date | string | null, place = "Hà Nội") {
  const value = date ? new Date(date) : null;
  if (!value || Number.isNaN(value.valueOf())) {
    const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(new Date());
    return `${esc(place)}, ngày&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; tháng&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; năm ${year}`;
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "numeric", year: "numeric" }).formatToParts(value).map((part) => [part.type, part.value]));
  return `${esc(place)}, ngày ${parts.day} tháng ${parts.month} năm ${parts.year}`;
}

/** Ngày dạng 01/7/2026 trong thân văn bản. */
export function shortDate(value?: string | null) {
  if (!value) return BLANK;
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(date.valueOf()) ? BLANK : new Intl.DateTimeFormat("vi-VN", { timeZone: value.length === 10 ? "UTC" : "Asia/Ho_Chi_Minh", day: "2-digit", month: "numeric", year: "numeric" }).format(date);
}

/** "“…”; Mã số: …; Chủ nhiệm đề tài: …; Đơn vị: …, Học viện Quân y" — đã escape. */
export function topicClause(input: { title: string; code?: string | null; piName?: string | null; unitName?: string | null }) {
  return `“${esc(input.title)}”; Mã số: ${esc(input.code || BLANK)}; Chủ nhiệm đề tài: ${esc(officialNameFromDisplay(input.piName) || BLANK)}; Đơn vị: ${esc(academyUnit(input.unitName))}`;
}

export type DecisionAppendix = { label: string; title: string; headers: Array<{ label: string; width?: number }>; rows: string[][]; emptyText?: string };

export type DecisionDocument = {
  number?: string | null;
  date?: Date | string | null;
  /** Trích yếu, chữ thường (đã escape bên trong): "Về việc thành lập Tổ thẩm định … của đề tài: “…”; Mã số: …". */
  subjectHtml: string;
  /** Các căn cứ, chữ thường. */
  bases: string[];
  /** Nội dung từng điều (HTML đã escape), không gồm "Điều n."; mỗi phần tử là một đoạn hoặc nhiều đoạn nối bằng `\n\n`. */
  articles: string[];
  recipients: string[];
  signer: { titleLines: string[]; displayName?: string | null };
  appendices?: DecisionAppendix[];
};

const P = (html: string, style = "") => `<p style="margin: 0 0 6pt 0; text-indent: 1cm; text-align: justify;${style}">${html}</p>`;

function appendixHtml(appendix: DecisionAppendix, doc: DecisionDocument) {
  const number = doc.number?.trim() ? esc(/\//.test(doc.number) ? doc.number : `${doc.number}/QĐ-HVQY`) : `${BLANK}/QĐ-HVQY`;
  const date = doc.date ? shortDate(typeof doc.date === "string" ? doc.date : doc.date.toISOString()) : BLANK;
  const head = appendix.headers.map((header) => `<th${header.width ? ` style="width: ${header.width}%;"` : ""}>${esc(header.label)}</th>`).join("");
  const body = appendix.rows.length
    ? appendix.rows.map((row) => `<tr>${row.map((cell, index) => `<td style="text-align: ${index === 0 ? "center" : "left"};">${cell}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${appendix.headers.length}" style="text-align: center; font-style: italic;">${esc(appendix.emptyText ?? "")}</td></tr>`;
  return `
    <div style="page-break-before: always;">
      <div style="text-align: center;">
        <p style="margin: 0; font-weight: bold;">${esc(appendix.label)}</p>
        <p style="margin: 0; font-weight: bold;">${esc(appendix.title)}</p>
        <p style="margin: 0 0 12pt 0; font-style: italic;">(Kèm theo Quyết định số ${number} ngày ${date} của Giám đốc Học viện Quân y)</p>
      </div>
      <table class="border-table" style="width: 100%;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </div>`;
}

export function buildDecisionHtml(doc: DecisionDocument) {
  const signer = signerLine(doc.signer.displayName);
  const articles = doc.articles.map((article, index) => {
    const [first, ...rest] = article.split("\n\n");
    return P(`<b>Điều ${index + 1}.</b> ${first}`) + rest.map((paragraph) => P(paragraph)).join("");
  }).join("");
  return `
    <table class="header-table" style="width: 100%; margin-bottom: 12pt;">
      <tr>
        <td style="width: 40%; text-align: center;">
          <p style="margin: 0; font-size: 13pt;">BỘ QUỐC PHÒNG</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold; text-decoration: underline;">HỌC VIỆN QUÂN Y</p>
          <p style="margin: 6pt 0 0 0; font-size: 13pt;">${decisionNumberLine(doc.number)}</p>
        </td>
        <td style="width: 60%; text-align: center;">
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-size: 14pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</p>
          <p style="margin: 6pt 0 0 0; font-size: 14pt; font-style: italic;">${decisionDateLine(doc.date)}</p>
        </td>
      </tr>
    </table>
    <div style="text-align: center;">
      <p style="margin: 12pt 0 0 0; font-size: 14pt; font-weight: bold;">QUYẾT ĐỊNH</p>
      <p style="margin: 0 0 10pt 0; font-size: 14pt; font-weight: bold;">${doc.subjectHtml}</p>
      <p style="margin: 0 0 10pt 0; font-size: 14pt; font-weight: bold;">GIÁM ĐỐC HỌC VIỆN QUÂN Y</p>
    </div>
    ${doc.bases.map((basis) => P(esc(basis), " font-style: italic;")).join("")}
    <div style="text-align: center;"><p style="margin: 10pt 0; font-size: 14pt; font-weight: bold;">QUYẾT ĐỊNH:</p></div>
    ${articles}
    <table class="footer-table" style="width: 100%; margin-top: 16pt;">
      <tr>
        <td style="width: 45%; text-align: left;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold; font-style: italic;">Nơi nhận:</p>
          ${doc.recipients.map((line) => `<p style="margin: 0; font-size: 11pt;">- ${esc(line)}</p>`).join("")}
        </td>
        <td style="width: 55%; text-align: center;">
          ${doc.signer.titleLines.map((line) => `<p style="margin: 0; font-size: 14pt; font-weight: bold;">${esc(line)}</p>`).join("")}
          <p style="margin: 0;">&nbsp;</p><p style="margin: 0;">&nbsp;</p><p style="margin: 0;">&nbsp;</p><p style="margin: 0;">&nbsp;</p>
          <p style="margin: 0; font-size: 14pt; font-weight: bold;">${signer ? esc(signer) : "&nbsp;"}</p>
        </td>
      </tr>
    </table>
    ${(doc.appendices ?? []).map((appendix) => appendixHtml(appendix, doc)).join("")}`;
}

/** Bảng thành viên dùng cho Phụ lục I. */
export function memberAppendix(label: string, title: string, members: Array<{ name: string; academicTitle?: string | null; unit?: string | null; role: string }>, roleHeader: string): DecisionAppendix {
  return {
    label,
    title,
    headers: [{ label: "TT", width: 6 }, { label: "Họ và tên", width: 30 }, { label: "Học hàm, học vị", width: 16 }, { label: "Đơn vị công tác", width: 28 }, { label: roleHeader, width: 20 }],
    rows: members.map((member, index) => [String(index + 1), `<b>${esc(member.name)}</b>`, esc(member.academicTitle || ""), esc(member.unit || "Học viện Quân y"), esc(member.role)]),
    emptyText: "Chưa có danh sách thành viên."
  };
}
