import { buildDecisionHtml } from "@/lib/decision-document";
import {
  acceptanceCouncilDecisionDocument,
  approvalDecisionDocument,
  councilDecisionDocument,
  directorSignatureTitle,
  productPanelDecisionDocument,
  type AcceptanceCouncilDecisionInput,
  type ApprovalDecisionInput,
  type CouncilDecisionInput,
  type ProductPanelDecisionInput
} from "@/lib/decision-templates";

/**
 * Xuất văn bản Word (.docx)
 * Theo chuẩn thể thức Nghị định 30/2020/NĐ-CP và Thông tư 14/2022/TT-BQP.
 */

const BLANK = "…………………………";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export { directorSignatureTitle };

export interface ExportWordOptions {
  filename: string;
  title: string;
  contentHtml: string;
  /** Khổ ngang cho biểu, bảng nhiều cột (mặc định khổ dọc). */
  orientation?: "portrait" | "landscape";
}

export interface ProposalExportData {
  id?: string;
  code?: string | null;
  title: string;
  ownerDisplayName?: string | null;
  hostOrganizationUnit?: string | null;
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Bộ chuyển đổi DOCX chỉ đọc style viết trên chính thẻ: chép style của các lớp bảng vào thẻ, và cho mỗi đoạn văn
 * căn lề của khối bao ngoài gần nhất; đoạn không có căn lề thì căn đều hai bên.
 */
function prepareForDocx(contentHtml: string) {
  const doc = new DOMParser().parseFromString(`<div>${contentHtml}</div>`, "text/html");
  const prepend = (element: Element, css: string) => element.setAttribute("style", `${css}; ${element.getAttribute("style") ?? ""}`);
  doc.querySelectorAll("table").forEach((table) => prepend(table, "border-collapse: collapse; width: 100%"));
  doc.querySelectorAll("table.border-table th, table.border-table td").forEach((cell) =>
    prepend(cell, "border: 1px solid #000000; padding: 6pt 8pt; font-size: 12pt; vertical-align: middle")
  );
  doc.querySelectorAll("table.border-table th").forEach((cell) =>
    prepend(cell, "background-color: #f2f2f2; font-weight: bold; text-align: center")
  );
  doc.querySelectorAll("table.header-table, table.footer-table").forEach((table) => prepend(table, "border: none"));
  doc.querySelectorAll("table.header-table td, table.footer-table td").forEach((cell) =>
    prepend(cell, "border: none; padding: 2pt 4pt; vertical-align: top")
  );
  const alignOf = (element: Element) => /text-align:\s*(left|right|center|justify)/i.exec(element.getAttribute("style") ?? "")?.[1];
  doc.querySelectorAll("p, h1, h2, h3, h4").forEach((paragraph) => {
    if (alignOf(paragraph)) return;
    let ancestor = paragraph.parentElement;
    while (ancestor && !alignOf(ancestor)) ancestor = ancestor.parentElement;
    prepend(paragraph, `text-align: ${(ancestor && alignOf(ancestor)) || "justify"}`);
  });
  return doc.body.firstElementChild?.innerHTML ?? contentHtml;
}

/**
 * Xuất văn bản ra tệp Word thật (.docx, Office Open XML): khổ A4, lề trên/phải/dưới 20 mm, lề trái 25 mm,
 * Times New Roman 13pt. Bộ chuyển đổi chỉ được tải khi người dùng bấm xuất.
 */
export async function exportHtmlToWord({ filename, title, contentHtml, orientation = "portrait" }: ExportWordOptions) {
  const { default: htmlToDocx } = await import("@turbodocx/html-to-docx");
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>${prepareForDocx(contentHtml)}</body></html>`;
  // Đơn vị: khổ giấy và lề tính bằng twip (1/20 pt), cỡ chữ tính bằng nửa điểm.
  const result = await htmlToDocx(html, null, {
    orientation,
    pageSize: { width: 11906, height: 16838 },
    margins: { top: 1134, right: 1134, bottom: 1134, left: 1418, header: 708, footer: 708 },
    title,
    creator: "DocManS - Học viện Quân y",
    font: "Times New Roman",
    fontSize: 26,
    complexScriptFontSize: 26,
    lang: "vi-VN",
    table: { row: { cantSplit: true } }
  });
  const blob = result instanceof Blob ? result : new Blob([result as ArrayBuffer], { type: DOCX_MIME });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/\.docx?$/, "")}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const fileCode = (code?: string | null) => (code || "chua_co_ma").replace(/[^a-zA-Z0-9]/g, "_");

/** Quyết định thành lập Hội đồng tư vấn tuyển chọn, đánh giá xét duyệt thuyết minh đề tài (mẫu QĐ 1273/QĐ-HVQY). */
export function exportCouncilDecisionWord(proposal: CouncilDecisionInput) {
  return exportHtmlToWord({
    filename: `Quyet_dinh_thanh_lap_Hoi_dong_${fileCode(proposal.code)}`,
    title: `Quyết định thành lập Hội đồng - ${proposal.code || proposal.title}`,
    contentHtml: buildDecisionHtml(councilDecisionDocument(proposal))
  });
}

/** Quyết định phê duyệt đề tài và kinh phí thực hiện (mẫu QĐ 4626/QĐ-HVQY & TT 14/2022/TT-BQP). */
export function exportProposalApprovalDecisionWord(proposal: ApprovalDecisionInput) {
  return exportHtmlToWord({
    filename: `Quyet_dinh_phe_duyet_de_tai_${fileCode(proposal.code)}`,
    title: `Quyết định phê duyệt đề tài - ${proposal.code || proposal.title}`,
    contentHtml: buildDecisionHtml(approvalDecisionDocument(proposal))
  });
}

/** Quyết định thành lập Tổ thẩm định, đánh giá sản phẩm KH&CN của đề tài (mẫu QĐ 4626/QĐ-HVQY). */
export function exportProductPanelDecisionWord(input: ProductPanelDecisionInput) {
  return exportHtmlToWord({
    filename: `Quyet_dinh_thanh_lap_To_tham_dinh_${fileCode(input.project.code)}`,
    title: `Quyết định thành lập Tổ thẩm định - ${input.project.code || input.project.title}`,
    contentHtml: buildDecisionHtml(productPanelDecisionDocument(input))
  });
}

/** Quyết định thành lập Hội đồng đánh giá, nghiệm thu đề tài KH&CN (mẫu QĐ 4626/QĐ-HVQY). */
export function exportAcceptanceCouncilDecisionWord(input: AcceptanceCouncilDecisionInput) {
  return exportHtmlToWord({
    filename: `Quyet_dinh_thanh_lap_Hoi_dong_nghiem_thu_${fileCode(input.project.code)}`,
    title: `Quyết định thành lập Hội đồng nghiệm thu - ${input.project.code || input.project.title}`,
    contentHtml: buildDecisionHtml(acceptanceCouncilDecisionDocument(input))
  });
}

type MinutesMember = {
  displayName?: string | null;
  academicTitle?: string | null;
  unit?: string | null;
  organization?: string | null;
  role?: string | null;
  assignmentRole?: string | null;
  roleLabel?: string | null;
  assignmentRoleLabel?: string | null;
};

/** Biên bản họp Hội đồng xét duyệt thuyết minh đề tài NCKH (Thông tư 14/2022/TT-BQP). */
export function exportCouncilMinutesWord(proposal: {
  code?: string | null;
  title: string;
  ownerDisplayName?: string | null;
  councilMetadata?: {
    decisionNumber?: string | null;
    meetingLocation?: string | null;
    members?: MinutesMember[];
    councilMinutes?: {
      meetingConductedAt?: string | null;
      recordedByName?: string | null;
      averageScore?: number | string | null;
      summaryComments?: string | null;
      conclusion?: string | null;
      conclusionLabel?: string | null;
      modificationsRequired?: string | null;
    };
  } | null;
}) {
  const council = proposal.councilMetadata ?? {};
  const minutes = council.councilMinutes ?? {};
  const dateObj = minutes.meetingConductedAt ? new Date(minutes.meetingConductedAt) : new Date();
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  const code = proposal.code || BLANK;
  const members = Array.isArray(council.members) ? council.members : [];
  const chair = members.find((m) => ["chair", "council_chair"].includes(m.role ?? m.assignmentRole ?? ""))?.displayName || BLANK;
  const secretary =
    minutes.recordedByName ||
    members.find((m) => ["secretary", "council_secretary"].includes(m.role ?? m.assignmentRole ?? ""))?.displayName ||
    BLANK;

  const memberRows = members
    .map(
      (m, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><b>${esc(m.displayName || BLANK)}</b></td>
        <td>${esc(m.academicTitle || "—")}</td>
        <td>${esc(m.unit || m.organization || "Học viện Quân y")}</td>
        <td style="text-align: center; font-weight: bold;">${esc(m.roleLabel || m.assignmentRoleLabel || m.role || m.assignmentRole || "")}</td>
        <td style="text-align: center;">Có mặt</td>
      </tr>
    `
    )
    .join("");

  const conclusionLabel =
    minutes.conclusionLabel ||
    (minutes.conclusion === "approve" || minutes.conclusion === "approved"
      ? "Đạt yêu cầu (Đề nghị phê duyệt)"
      : minutes.conclusion === "reject"
      ? "Không đạt yêu cầu"
      : minutes.conclusion
      ? "Cần chỉnh sửa bổ sung"
      : BLANK);

  const contentHtml = `
    <table class="header-table" style="width: 100%; margin-bottom: 12pt;">
      <tr>
        <td style="width: 45%; text-align: center;">
          <p style="margin: 0; font-size: 12pt;">HỌC VIỆN QUÂN Y</p>
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">HỘI ĐỒNG TƯ VẤN ĐÁNH GIÁ</p>
        </td>
        <td style="width: 55%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</p>
          <p style="margin: 0; font-size: 12pt; font-style: italic;">Hà Nội, ngày ${day} tháng ${month} năm ${year}</p>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 18pt 0 14pt 0;">
      <p style="margin: 0; font-size: 14pt; font-weight: bold;">BIÊN BẢN HỌP HỘI ĐỒNG</p>
      <p style="margin: 4pt 0 0 0; font-size: 13pt; font-weight: bold;">ĐÁNH GIÁ, XÉT DUYỆT THUYẾT MINH ĐỀ TÀI NCKH</p>
      <p style="margin: 2pt 0 0 0; font-size: 11pt; font-style: italic;">(Theo Thông tư số 14/2022/TT-BQP ngày 01/02/2022 của Bộ Quốc phòng)</p>
    </div>

    <div>
      <p><b>I. THÔNG TIN CHUNG</b></p>
      <p style="padding-left: 18pt;">- Tên đề tài: <b>${esc(proposal.title)}</b></p>
      <p style="padding-left: 18pt;">- Mã số: <b>${esc(code)}</b></p>
      <p style="padding-left: 18pt;">- Chủ nhiệm đề tài: <b>${esc(proposal.ownerDisplayName || BLANK)}</b></p>
      <p style="padding-left: 18pt;">- Thời gian họp: Ngày ${day} tháng ${month} năm ${year}</p>
      <p style="padding-left: 18pt;">- Địa điểm họp: ${esc(council.meetingLocation || BLANK)}</p>
      <p style="padding-left: 18pt;">- Quyết định thành lập Hội đồng số: <b>${esc(council.decisionNumber || BLANK)}</b></p>

      <p style="margin-top: 10pt;"><b>II. THÀNH PHẦN HỘI ĐỒNG VÀ ĐẠI BIỂU THAM DỰ</b></p>
      <table class="border-table">
        <thead>
          <tr>
            <th style="width: 6%;">TT</th>
            <th style="width: 26%;">Họ và tên</th>
            <th style="width: 20%;">Học hàm, học vị</th>
            <th style="width: 24%;">Đơn vị</th>
            <th style="width: 14%;">Trách nhiệm</th>
            <th style="width: 10%;">Tham dự</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows || `<tr><td colspan="6" style="text-align: center;">${BLANK}</td></tr>`}
        </tbody>
      </table>

      <p style="margin-top: 10pt;"><b>III. NỘI DUNG LÀM VIỆC VÀ KẾT QUẢ ĐÁNH GIÁ</b></p>
      <p style="padding-left: 18pt;">1. Đồng chí Chủ tịch Hội đồng quán triệt mục đích, yêu cầu và nội dung làm việc theo quy chế của Bộ Quốc phòng.</p>
      <p style="padding-left: 18pt;">2. Đồng chí Chủ nhiệm báo cáo tóm tắt thuyết minh đề tài nghiên cứu.</p>
      <p style="padding-left: 18pt;">3. Các đồng chí Ủy viên Phản biện trình bày bản nhận xét đánh giá chi tiết.</p>
      <p style="padding-left: 18pt;">4. Các thành viên Hội đồng thảo luận, chất vấn và cho ý kiến đóng góp hoàn thiện thuyết minh.</p>
      <p style="padding-left: 18pt;">5. Kết quả chấm điểm trung bình của Hội đồng: <b>${esc(minutes.averageScore ?? BLANK)}/100 điểm</b>.</p>

      <p style="margin-top: 10pt;"><b>IV. KẾT LUẬN CỦA HỘI ĐỒNG</b></p>
      <p style="padding-left: 18pt;">- Đánh giá chung: <i>${esc(minutes.summaryComments || BLANK)}</i></p>
      <p style="padding-left: 18pt;">- Kết luận xếp loại: <b>${esc(conclusionLabel)}</b></p>
      <p style="padding-left: 18pt;">- Nội dung yêu cầu hoàn thiện, bổ sung: <i>${esc(minutes.modificationsRequired || BLANK)}</i></p>

      <p style="margin-top: 10pt;">Phiên họp kết thúc cùng ngày. Biên bản đã được thông qua toàn thể Hội đồng nhất trí.</p>
    </div>

    <table class="footer-table" style="width: 100%; margin-top: 24pt;">
      <tr>
        <td style="width: 50%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">THƯ KÝ KHOA HỌC</p>
          <p style="margin: 4pt 0 45pt 0; font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">${esc(secretary)}</p>
        </td>
        <td style="width: 50%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">CHỦ TỊCH HỘI ĐỒNG</p>
          <p style="margin: 4pt 0 45pt 0; font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">${esc(chair)}</p>
        </td>
      </tr>
    </table>
  `;

  return exportHtmlToWord({
    filename: `Bien_ban_hop_Hoi_dong_${fileCode(proposal.code)}`,
    title: `Biên bản họp Hội đồng - ${code}`,
    contentHtml
  });
}

/** Biên bản họp Hội đồng đánh giá, nghiệm thu kết quả NCKH (Thông tư 14/2022/TT-BQP). */
export function exportAcceptanceMinutesWord(
  proposal: ProposalExportData,
  acceptance: {
    councilType?: "FACILITY" | "OFFICIAL";
    meetingDate?: string;
    meetingLocation?: string;
    establishmentDecisionNumber?: string | null;
    decisionNumber?: string | null;
    members: Array<{ fullName: string; academicTitle?: string; unit?: string; role: string }>;
    outcomeLabel?: string | null;
    assessmentComments?: string | null;
    evaluationResult?: {
      reportScore: number;
      scientificProductsScore: number;
      trainingProductsScore: number;
      militaryMedicalPracticalScore: number;
      totalScore: number;
      classification: "EXCELLENT" | "PASSED" | "FAILED";
      assessmentComments: string;
    };
  }
) {
  const code = proposal.code || BLANK;
  const councilTypeLabel = acceptance.councilType === "FACILITY" ? "CƠ SỞ" : "CHÍNH THỨC";
  const scores = acceptance.evaluationResult;
  const classificationText =
    scores?.classification === "EXCELLENT"
      ? "XUẤT SẮC"
      : scores?.classification === "PASSED"
      ? "ĐẠT"
      : scores?.classification === "FAILED"
      ? "KHÔNG ĐẠT"
      : acceptance.outcomeLabel || BLANK;
  const comments = scores?.assessmentComments || acceptance.assessmentComments || BLANK;

  const chair = acceptance.members.find((m) => /chủ tịch|chair/i.test(m.role))?.fullName || BLANK;
  const secretary = acceptance.members.find((m) => /thư ký|secretary/i.test(m.role))?.fullName || BLANK;

  const memberRows = acceptance.members
    .map(
      (m, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td><b>${esc(m.fullName)}</b></td>
      <td>${esc([m.academicTitle, m.unit || "Học viện Quân y"].filter(Boolean).join(" - "))}</td>
      <td style="text-align: center;">${esc(m.role)}</td>
    </tr>
  `
    )
    .join("");

  const dateSource = acceptance.meetingDate ? new Date(acceptance.meetingDate) : new Date();
  const dateObj = Number.isNaN(dateSource.valueOf()) ? new Date() : dateSource;

  const contentHtml = `
    <table class="header-table" style="width: 100%; margin-bottom: 15pt;">
      <tr>
        <td style="width: 45%; text-align: center;">
          <p style="margin: 0; font-size: 11pt;">BỘ QUỐC PHÒNG</p>
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">HỌC VIỆN QUÂN Y</p>
        </td>
        <td style="width: 55%; text-align: center;">
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</p>
          <p style="margin: 6pt 0 0 0; font-size: 11pt; font-style: italic;">Hà Nội, ngày ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1} năm ${dateObj.getFullYear()}</p>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 18pt 0 14pt 0;">
      <p style="margin: 0; font-size: 15pt; font-weight: bold;">BIÊN BẢN HỌP HỘI ĐỒNG ĐÁNH GIÁ, NGHIỆM THU KẾT QUẢ NCKH</p>
      <p style="margin: 4pt 0 0 0; font-size: 13pt; font-weight: bold;">(NGHIỆM THU ${councilTypeLabel})</p>
      <p style="margin: 3pt 0 0 0; font-size: 11pt; font-style: italic;">(Theo Thông tư số 14/2022/TT-BQP ngày 01/02/2022 của Bộ Quốc phòng)</p>
    </div>

    <div>
      <p><b>I. THÔNG TIN CHUNG</b></p>
      <p style="padding-left: 18pt;">- Tên đề tài/nhiệm vụ: <b>${esc(proposal.title)}</b></p>
      <p style="padding-left: 18pt;">- Mã số đề tài: <b>${esc(code)}</b></p>
      <p style="padding-left: 18pt;">- Chủ nhiệm đề tài: <b>${esc(proposal.ownerDisplayName || BLANK)}</b></p>
      <p style="padding-left: 18pt;">- Cơ quan chủ trì: <b>${esc(proposal.hostOrganizationUnit || "Học viện Quân y")}</b></p>
      <p style="padding-left: 18pt;">- Quyết định thành lập Hội đồng số: <b>${esc(acceptance.decisionNumber || acceptance.establishmentDecisionNumber || BLANK)}</b></p>
      <p style="padding-left: 18pt;">- Thời gian họp: <b>${esc(acceptance.meetingDate || BLANK)}</b>. Địa điểm: <b>${esc(acceptance.meetingLocation || BLANK)}</b></p>

      <p style="margin-top: 10pt;"><b>II. THÀNH PHẦN HỘI ĐỒNG</b></p>
      <table class="border-table">
        <thead>
          <tr>
            <th style="width: 8%;">TT</th>
            <th style="width: 32%;">Họ và tên</th>
            <th style="width: 40%;">Học hàm, học vị, Đơn vị</th>
            <th style="width: 20%;">Chức danh HĐ</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows || `<tr><td colspan="4" style="text-align: center;">${BLANK}</td></tr>`}
        </tbody>
      </table>

      <p style="margin-top: 10pt;"><b>III. KẾT QUẢ ĐÁNH GIÁ THEO 4 TIÊU CHÍ CHUẨN QUÂN ĐỘI</b></p>
      <table class="border-table">
        <thead>
          <tr>
            <th style="width: 8%;">TT</th>
            <th style="width: 62%;">Nội dung / Tiêu chí đánh giá</th>
            <th style="width: 15%; text-align: center;">Điểm tối đa</th>
            <th style="width: 15%; text-align: center;">Điểm đạt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td>Chất lượng Báo cáo tổng kết và Báo cáo tóm tắt</td>
            <td style="text-align: center;">30</td>
            <td style="text-align: center; font-weight: bold;">${esc(scores?.reportScore ?? BLANK)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td>Sản phẩm khoa học (Bài báo quốc tế/trong nước, sáng chế, sách chuyên khảo)</td>
            <td style="text-align: center;">30</td>
            <td style="text-align: center; font-weight: bold;">${esc(scores?.scientificProductsScore ?? BLANK)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td>Sản phẩm đào tạo (Hướng dẫn NCS, Thạc sĩ, Bác sĩ chuyên khoa II)</td>
            <td style="text-align: center;">15</td>
            <td style="text-align: center; font-weight: bold;">${esc(scores?.trainingProductsScore ?? BLANK)}</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td>Hiệu quả và khả năng ứng dụng thực tiễn y dược quân sự, điều trị thương bệnh binh</td>
            <td style="text-align: center;">25</td>
            <td style="text-align: center; font-weight: bold;">${esc(scores?.militaryMedicalPracticalScore ?? BLANK)}</td>
          </tr>
          <tr style="font-weight: bold;">
            <td colspan="2" style="text-align: right;">TỔNG ĐIỂM TRUNG BÌNH CỦA HỘI ĐỒNG:</td>
            <td style="text-align: center;">100</td>
            <td style="text-align: center;">${esc(scores?.totalScore ?? BLANK)}</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 10pt;"><b>IV. KẾT LUẬN VÀ KIẾN NGHỊ CỦA HỘI ĐỒNG</b></p>
      <p style="padding-left: 18pt;">- Kết quả nghiệm thu / xếp loại: <b>${esc(classificationText)}</b></p>
      <p style="padding-left: 18pt;">- Nhận xét chung của Hội đồng:</p>
      <p style="padding-left: 28pt; font-style: italic;">"${esc(comments)}"</p>
      <p style="padding-left: 18pt;">- Hội đồng thống nhất thông qua kết quả nghiệm thu và đề nghị Thủ trưởng Học viện xem xét công nhận kết quả nghiên cứu.</p>
    </div>

    <table class="footer-table" style="width: 100%; margin-top: 24pt;">
      <tr>
        <td style="width: 50%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">THƯ KÝ HỘI ĐỒNG</p>
          <p style="margin: 4pt 0 45pt 0; font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">${esc(secretary)}</p>
        </td>
        <td style="width: 50%; text-align: center;">
          <p style="margin: 0; font-size: 12pt; font-weight: bold;">CHỦ TỊCH HỘI ĐỒNG</p>
          <p style="margin: 4pt 0 45pt 0; font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          <p style="margin: 0; font-size: 13pt; font-weight: bold;">${esc(chair)}</p>
        </td>
      </tr>
    </table>
  `;

  return exportHtmlToWord({
    filename: `Bien_ban_nghiem_thu_${councilTypeLabel}_${fileCode(proposal.code)}`,
    title: `Biên bản nghiệm thu ${councilTypeLabel} - ${code}`,
    contentHtml
  });
}
