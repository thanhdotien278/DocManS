"use client";

import { useState } from "react";
import type { ResearcherProfile } from "@/lib/researcher-profiles-api";
import { levels } from "./cv-research-tab";

type Lang = "VI" | "EN";

const labels = {
  VI: {
    form: "MẪU BM-06", annex: "Phụ lục II ban hành kèm theo quy định quản lý KH&CN", nation: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", motto: "Độc lập - Tự do - Hạnh phúc",
    title: "LÝ LỊCH KHOA HỌC", subtitle: "(Cá nhân thực hiện nhiệm vụ khoa học và công nghệ)",
    general: "I. THÔNG TIN CHUNG", fullName: "1. Họ và tên:", birthDate: "2. Ngày sinh:", gender: "Giới tính:", birthPlace: "Nơi sinh:", nationality: "Quốc tịch:",
    idNumber: "3. Số CCCD/Hộ chiếu:", idIssueDate: "Ngày cấp:", idIssuePlace: "Nơi cấp:", rankPosition: "4. Quân hàm / Chức vụ:", academic: "5. Học hàm, học vị:",
    organization: "6. Cơ quan công tác:", address: "7. Địa chỉ liên hệ:", phoneEmail: "8. Điện thoại / Email:", fields: "9. Lĩnh vực nghiên cứu:", keywords: "10. Từ khóa chuyên môn:",
    languages: "11. Ngoại ngữ sử dụng:", bank: "12. Tài khoản / SmartCA:", bankAccount: "Số TK", bankName: "Ngân hàng", bankBranch: "Chi nhánh", smartCa: "Serial SmartCA",
    education: "II. QUÁ TRÌNH ĐÀO TẠO", no: "TT", degree: "Bậc đào tạo", major: "Ngành đào tạo (Chuyên ngành)", institution: "Cơ sở đào tạo", years: "Thời gian", mode: "Hình thức đào tạo", noEducation: "Chưa kê khai quá trình đào tạo.",
    work: "III. QUÁ TRÌNH CÔNG TÁC VÀ KINH NGHIỆM CHUYÊN MÔN", summary: "1. Tóm tắt hoạt động chuyên môn:", workItems: "2. Quá trình công tác:", period: "Thời gian", workOrganization: "Cơ quan / Đơn vị công tác", position: "Chức vụ", workField: "Lĩnh vực công tác", noWork: "Chưa kê khai quá trình công tác.",
    research: "IV. KINH NGHIỆM VÀ THÀNH TÍCH NGHIÊN CỨU", publications: "1. Công bố khoa học", authors: "Tác giả", year: "Năm", pubTitle: "Tên công trình / Bài báo", venue: "Tạp chí / NXB", issn: "ISSN/ISBN, DOI", classification: "Phân loại", proof: "Minh chứng", noPublications: "Chưa có công bố khoa học.",
    ip: "2. Văn bằng bảo hộ quyền sở hữu trí tuệ", ipTitle: "Tên văn bằng / Sáng chế", patentNumber: "Số bằng", issueAgency: "Cơ quan cấp", noIp: "Chưa có văn bằng sở hữu trí tuệ.",
    awards: "3. Giải thưởng KH&CN, danh hiệu chuyên môn", awardName: "Tên giải thưởng / Danh hiệu", grantingAgency: "Cơ quan trao tặng", noAwards: "Chưa có giải thưởng / danh hiệu.",
    projects: "4. Chủ nhiệm / tham gia nhiệm vụ, chương trình KH&CN", projectTitle: "Tên nhiệm vụ, Chương trình", agency: "Cơ quan quản lý / Cấp", code: "Mã số", role: "Vai trò", status: "Tình trạng", noProjects: "Chưa có nhiệm vụ KH&CN.", levels, active: "Đang tham gia", inactive: "Đã kết thúc",
    note: "V. THÔNG TIN KHÁC", commitment: "VI. CAM KẾT CỦA CÁ NHÂN",
    pledge: ["- Tôi xin cam đoan những thông tin được kê khai trong bản lý lịch này là hoàn toàn trung thực, chính xác và chịu hoàn toàn trách nhiệm trước pháp luật;", "- Có đủ thời gian, năng lực và điều kiện để tham gia / chủ trì nhiệm vụ khoa học và công nghệ theo quy định hiện hành."],
    unitSign: "XÁC NHẬN CỦA ĐƠN VỊ CÔNG TÁC", unitSignNote: "(Ký, ghi rõ họ tên và đóng dấu)", date: "Ngày …… tháng …… năm 20……", selfSign: "NGƯỜI KHAI LÝ LỊCH", selfSignNote: "(Ký và ghi rõ họ tên)"
  },
  EN: {
    form: "FORM BM-06", annex: "Annex II - S&T Personnel Curriculum Vitae", nation: "SOCIALIST REPUBLIC OF VIETNAM", motto: "Independence - Freedom - Happiness",
    title: "CURRICULUM VITAE", subtitle: "(Scientific and Technological Profile)",
    general: "I. PERSONAL INFORMATION", fullName: "1. Full name:", birthDate: "2. Date of birth:", gender: "Gender:", birthPlace: "Place of birth:", nationality: "Nationality:",
    idNumber: "3. ID / Passport No.:", idIssueDate: "Issue date:", idIssuePlace: "Place of issue:", rankPosition: "4. Military rank / Position:", academic: "5. Academic title:",
    organization: "6. Affiliation:", address: "7. Contact address:", phoneEmail: "8. Phone / Email:", fields: "9. Research fields:", keywords: "10. Keywords:",
    languages: "11. Languages:", bank: "12. Bank account / SmartCA:", bankAccount: "Account No.", bankName: "Bank", bankBranch: "Branch", smartCa: "SmartCA serial",
    education: "II. EDUCATION", no: "No.", degree: "Degree", major: "Major", institution: "Institution", years: "Years", mode: "Training mode", noEducation: "No education history recorded.",
    work: "III. EMPLOYMENT AND PROFESSIONAL EXPERIENCE", summary: "1. Professional summary:", workItems: "2. Employment history:", period: "Period", workOrganization: "Organization", position: "Position", workField: "Field of work", noWork: "No employment history recorded.",
    research: "IV. RESEARCH EXPERIENCE AND ACHIEVEMENTS", publications: "1. Scientific publications", authors: "Authors", year: "Year", pubTitle: "Title", venue: "Journal / Publisher", issn: "ISSN/ISBN, DOI", classification: "Classification", proof: "Evidence", noPublications: "No publications recorded.",
    ip: "2. Intellectual property", ipTitle: "Patent / Certificate title", patentNumber: "Number", issueAgency: "Issuing agency", noIp: "No intellectual property recorded.",
    awards: "3. Awards and honours", awardName: "Award / Honour", grantingAgency: "Granting agency", noAwards: "No awards recorded.",
    projects: "4. Research projects and programmes", projectTitle: "Project / Programme title", agency: "Managing agency / Level", code: "Code", role: "Role", status: "Status", noProjects: "No research projects recorded.", levels: { ACADEMY_INSTITUTIONAL: "Academy / institutional level", MINISTRY: "Ministry level", OTHER: "Other level" }, active: "Ongoing", inactive: "Completed",
    note: "V. OTHER INFORMATION", commitment: "VI. COMMITMENT",
    pledge: ["- I hereby certify that the information declared in this curriculum vitae is true and accurate, and I take full legal responsibility for it;", "- I have adequate time, capacity and conditions to lead or take part in science and technology tasks as regulated."],
    unitSign: "CERTIFICATION OF THE EMPLOYING UNIT", unitSignNote: "(Signature, full name and stamp)", date: "Date: ………………………", selfSign: "DECLARANT", selfSignNote: "(Signature and full name)"
  }
} satisfies Record<Lang, Record<string, string | string[] | typeof levels>>;

const EMPTY = "—";

function show(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? EMPTY : value;
}

// Splits the ISO string instead of using Date so the printed day never shifts with the viewer's timezone.
function formatDate(value: string | null | undefined) {
  if (!value) return EMPTY;
  const [year, month, day] = value.slice(0, 10).split("-");
  return day ? `${day}/${month}/${year}` : value;
}

function joined(values: Array<string | number | null | undefined>, separator: string) {
  return values.filter((value) => value !== null && value !== undefined && value !== "").join(separator) || EMPTY;
}

// One-sided ranges keep both sides ("— – 2010") so start and end are never confused.
function range(start: string | number | null | undefined, end: string | number | null | undefined) {
  return start || end ? `${show(start)} – ${show(end)}` : EMPTY;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="cv-paper-row"><span className="cv-paper-label">{label}</span><span>{children}</span></div>;
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="cv-paper-empty">{empty}</p>;
  return <table className="cv-paper-table">
    <thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}><td>{index + 1}</td>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}

type CvPrintTabProps = { profile: ResearcherProfile; dirty: boolean };

export function CvPrintTab({ profile, dirty }: CvPrintTabProps) {
  const [lang, setLang] = useState<Lang>("VI");
  const cv = profile.curriculumVitae;
  if (!cv) return <section className="section-card cv-tab-panel"><p className="record-meta" role="status">Bạn không có quyền xem lý lịch khoa học này.</p></section>;

  const L = labels[lang];
  const personal = cv.personalInfo;
  const research = cv.researchExperience;
  const academic = [profile.academicRank?.name, profile.academicDegree?.name, profile.title];
  const hasBank = !!(personal?.bankAccount || personal?.bankName || personal?.bankBranch || personal?.smartCaSerial);
  const participations = profile.participations.filter((row) => row.status !== "SUPERSEDED");

  return <div className="cv-print cv-tab-panel">
    <div className="cv-print-toolbar">
      <div className="button-row" role="group" aria-label="Ngôn ngữ bản in">
        <button type="button" className={`button ${lang === "VI" ? "primary" : ""}`} aria-pressed={lang === "VI"} onClick={() => setLang("VI")}>Tiếng Việt (Mẫu BM-06)</button>
        <button type="button" className={`button ${lang === "EN" ? "primary" : ""}`} aria-pressed={lang === "EN"} onClick={() => setLang("EN")}>English (Curriculum Vitae)</button>
      </div>
      <button type="button" className="button primary" onClick={() => window.print()}>In lý lịch khoa học (A4)</button>
    </div>
    <p className="record-meta">Bản xem hiển thị dữ liệu lý lịch khoa học đã lưu.{dirty ? " Các thay đổi chưa lưu không được hiển thị; hãy lưu trước khi in." : ""}</p>
    <div className="cv-print-frame" tabIndex={0} role="region" aria-label="Bản in lý lịch khoa học">
      <article className="cv-paper" lang={lang === "VI" ? "vi" : "en"} aria-label={L.title}>
        <header className="cv-paper-header">
          <div><div className="cv-paper-form">{L.form}</div><div className="cv-paper-annex">{L.annex}</div></div>
          <div className="cv-paper-nation"><strong>{L.nation}</strong><strong>{L.motto}</strong><span aria-hidden="true" /></div>
        </header>
        <h2 className="cv-paper-title">{L.title}</h2>
        <p className="cv-paper-subtitle">{L.subtitle}</p>

        <div className="cv-paper-general">
          <div>
            <h3>{L.general}</h3>
            <Row label={L.fullName}><strong>{profile.fullName.toLocaleUpperCase("vi")}</strong></Row>
            <Row label={L.birthDate}>{formatDate(personal?.birthDate)}; <b>{L.gender}</b> {show(personal?.gender)}; <b>{L.birthPlace}</b> {show(personal?.birthPlace)}; <b>{L.nationality}</b> {show(personal?.nationality)}</Row>
            <Row label={L.idNumber}>{show(personal?.idNumber)}; <b>{L.idIssueDate}</b> {formatDate(personal?.idIssueDate)}; <b>{L.idIssuePlace}</b> {show(personal?.idIssuePlace)}</Row>
            <Row label={L.rankPosition}>{show(profile.militaryRank)} / {show(profile.position)}</Row>
            <Row label={L.academic}>{joined(lang === "EN" ? [personal?.englishAcademicTitle, ...academic] : academic, ", ")}</Row>
            <Row label={L.organization}>{show(personal?.organization || profile.externalAffiliation || profile.managementOrganization?.name)}</Row>
            <Row label={L.address}>{show(personal?.contactAddress)}</Row>
            <Row label={L.phoneEmail}>{show(profile.contactPhone)} / {show(profile.contactEmail)}</Row>
            <Row label={L.fields}>{joined(profile.researchFields.map((field) => field.name), "; ")}</Row>
            <Row label={L.keywords}>{joined(profile.expertiseKeywords, "; ")}</Row>
            <Row label={L.languages}>{joined((personal?.languages ?? []).map((item) => {
              const detail = [item.proficiency, item.certificate].filter(Boolean).join(" - ");
              return detail ? `${item.language} (${detail})` : item.language;
            }), "; ")}</Row>
            {hasBank ? <Row label={L.bank}>{joined([
              personal?.bankAccount && `${L.bankAccount}: ${personal.bankAccount}`,
              personal?.bankName && `${L.bankName}: ${personal.bankName}`,
              personal?.bankBranch && `${L.bankBranch}: ${personal.bankBranch}`,
              personal?.smartCaSerial && `${L.smartCa}: ${personal.smartCaSerial}`
            ], " | ")}</Row> : null}
          </div>
          <div className="cv-paper-photo" aria-hidden={personal?.avatarUrl ? undefined : true}>{personal?.avatarUrl ? <img src={personal.avatarUrl} alt={profile.fullName} referrerPolicy="no-referrer" /> : null}</div>
        </div>

        <h3>{L.education}</h3>
        <Table head={[L.no, L.degree, L.major, L.institution, L.years, L.mode]} empty={L.noEducation}
          rows={(cv.educationHistory ?? []).map((item) => [item.degreeLevel, item.major, item.institution, range(item.startYear, item.graduationYear), show(item.trainingMode)])} />

        <h3>{L.work}</h3>
        <p><b>{L.summary}</b> {show(cv.workHistory?.summary)}</p>
        <p><b>{L.workItems}</b></p>
        <Table head={[L.no, L.period, L.workOrganization, L.position, L.workField]} empty={L.noWork}
          rows={(cv.workHistory?.items ?? []).map((item) => [item.period, item.organization, show(item.position), show(item.workField)])} />

        <h3>{L.research}</h3>
        <h4>{L.publications}</h4>
        <Table head={[L.no, L.authors, L.year, L.pubTitle, L.venue, L.issn, L.classification, L.proof]} empty={L.noPublications}
          rows={profile.publications.filter((item) => item.status !== "INACTIVE").map((item) => [show(item.authors), show(item.publicationYear), item.title, show(item.venue), joined([item.issnIsbn, item.doi && `DOI: ${item.doi}`], "; "), show(item.classification), show(item.proofUrl)])} />
        <h4>{L.ip}</h4>
        <Table head={[L.no, L.ipTitle, L.authors, L.year, L.patentNumber, L.issueAgency]} empty={L.noIp}
          rows={(research?.intellectualProperty ?? []).map((item) => [item.title, show(item.authors), show(item.issueYear), show(item.patentNumber), show(item.issueAgency)])} />
        <h4>{L.awards}</h4>
        <Table head={[L.no, L.awardName, L.year, L.grantingAgency]} empty={L.noAwards}
          rows={(research?.awards ?? []).map((item) => [item.name, range(item.awardYear, item.endYear), show(item.grantingAgency)])} />
        <h4>{L.projects}</h4>
        <Table head={[L.no, L.projectTitle, L.agency, L.code, L.role, L.period, L.status]} empty={L.noProjects}
          rows={[
            ...(research?.projects ?? []).map((item) => [item.projectTitle, show(item.managementAgency), show(item.code), item.role, show(item.period), show(item.status)]),
            ...participations.map((item) => [item.projectTitle, L.levels[item.level], EMPTY, item.participationRole, range(item.startsOn && formatDate(item.startsOn), item.endsOn && formatDate(item.endsOn)), item.status === "ACTIVE" ? L.active : item.status === "INACTIVE" ? L.inactive : EMPTY])
          ]} />

        {cv.note ? <><h3>{L.note}</h3><p className="cv-paper-note">{cv.note}</p></> : null}

        <h3>{L.commitment}</h3>
        {L.pledge.map((line) => <p key={line} className="cv-paper-pledge">{line}</p>)}

        <div className="cv-paper-signatures">
          <div><p><b>{L.unitSign}</b></p><p className="cv-paper-sign-note">{L.unitSignNote}</p></div>
          <div><p className="cv-paper-sign-note">{L.date}</p><p><b>{L.selfSign}</b></p><p className="cv-paper-sign-note">{L.selfSignNote}</p><p className="cv-paper-sign-name">{profile.fullName}</p></div>
        </div>
      </article>
    </div>
  </div>;
}
