"use client";

import { CvRowTable } from "./cv-row-table";
import type { Participation, Publication, ScientificCurriculumVitaeIntellectualProperty, ScientificCurriculumVitaeAward, ScientificCurriculumVitaeProject } from "@/lib/researcher-profiles-api";

export type CvResearchDraft = {
  publications: Publication[];
  intellectualProperty: ScientificCurriculumVitaeIntellectualProperty[];
  awards: ScientificCurriculumVitaeAward[];
  projects: ScientificCurriculumVitaeProject[];
};

type CvResearchTabProps = {
  draft: CvResearchDraft;
  participations: Participation[];
  editable: boolean;
  errors: Record<string, string>;
  onChange: <K extends keyof CvResearchDraft>(key: K, value: CvResearchDraft[K]) => void;
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index)).map((value) => ({ value, label: value }));
const classifications = ["ISI/Scopus", "Quốc tế khác", "Trong nước (HĐGSNN)", "Báo cáo hội nghị", "Sách/Chuyên khảo", "Khác"].map((value) => ({ value, label: value }));
const roles = ["Chủ nhiệm", "Thư ký", "Thành viên chính", "Thành viên"].map((value) => ({ value, label: value }));
const statuses = ["Đang thực hiện", "Đã nghiệm thu", "Tạm dừng"].map((value) => ({ value, label: value }));
const levels = { ACADEMY_INSTITUTIONAL: "Cấp Học viện / cơ sở", MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" };

function replaceRow<Row extends object>(rows: Row[], index: number, key: keyof Row, value: string | number | null) {
  return rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row);
}

function removeRow<Row>(rows: Row[], index: number) {
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

export function CvResearchTab({ draft, participations, editable, errors, onChange }: CvResearchTabProps) {
  const visibleParticipations = participations.filter((row) => row.status !== "SUPERSEDED");
  return <div className="grid cv-tab-panel">
    <section className="section-card">
      <h3>Công bố khoa học</h3>
      {errors.publications ? <small className="field-error" role="alert">{errors.publications}</small> : null}
      <CvRowTable name="publications" rows={draft.publications} columns={[
        { key: "authors", label: "Tác giả" },
        { key: "publicationYear", label: "Năm công bố", type: "number", options: years },
        { key: "title", label: "Tên công trình / Bài báo *" },
        { key: "venue", label: "Tạp chí / NXB" },
        { key: "issnIsbn", label: "ISSN/ISBN" },
        { key: "doi", label: "DOI" },
        { key: "classification", label: "Phân loại", options: classifications },
        { key: "proofUrl", label: "Minh chứng" },
        { key: "notes", label: "Ghi chú", type: "textarea" }
      ]} disabled={!editable}
        onChange={(index, key, value) => onChange("publications", replaceRow(draft.publications, index, key, value))}
        onAdd={() => onChange("publications", [...draft.publications, { title: "", status: "ACTIVE" }])}
        onRemove={(index) => onChange("publications", removeRow(draft.publications, index))}
        addLabel="+ Thêm công bố khoa học" />
    </section>
    <section className="section-card">
      <h3>Sở hữu trí tuệ</h3>
      {errors.intellectualProperty ? <small className="field-error" role="alert">{errors.intellectualProperty}</small> : null}
      <CvRowTable name="intellectualProperty" rows={draft.intellectualProperty} columns={[
        { key: "title", label: "Tên văn bằng / Sáng chế *" },
        { key: "authors", label: "Tác giả" },
        { key: "issueYear", label: "Năm cấp", type: "number", options: years },
        { key: "patentNumber", label: "Số bằng" },
        { key: "issueAgency", label: "Cơ quan cấp" },
        { key: "proofUrl", label: "Minh chứng" },
        { key: "notes", label: "Ghi chú", type: "textarea" }
      ]} disabled={!editable}
        onChange={(index, key, value) => onChange("intellectualProperty", replaceRow(draft.intellectualProperty, index, key, value))}
        onAdd={() => onChange("intellectualProperty", [...draft.intellectualProperty, { title: "" }])}
        onRemove={(index) => onChange("intellectualProperty", removeRow(draft.intellectualProperty, index))}
        addLabel="+ Thêm sở hữu trí tuệ" />
    </section>
    <section className="section-card">
      <h3>Giải thưởng / Danh hiệu</h3>
      {errors.awards ? <small className="field-error" role="alert">{errors.awards}</small> : null}
      <CvRowTable name="awards" rows={draft.awards} columns={[
        { key: "name", label: "Tên giải thưởng / Danh hiệu *" },
        { key: "awardYear", label: "Năm", type: "number", options: years },
        { key: "endYear", label: "Đến năm", type: "number", options: years },
        { key: "grantingAgency", label: "Cơ quan trao tặng" },
        { key: "proofUrl", label: "Minh chứng" },
        { key: "notes", label: "Ghi chú", type: "textarea" }
      ]} disabled={!editable}
        onChange={(index, key, value) => onChange("awards", replaceRow(draft.awards, index, key, value))}
        onAdd={() => onChange("awards", [...draft.awards, { name: "" }])}
        onRemove={(index) => onChange("awards", removeRow(draft.awards, index))}
        addLabel="+ Thêm giải thưởng / danh hiệu" />
    </section>
    <section className="section-card">
      <h3>Nhiệm vụ / Chương trình nghiên cứu</h3>
      {errors.projects ? <small className="field-error" role="alert">{errors.projects}</small> : null}
      <CvRowTable name="projects" rows={draft.projects} columns={[
        { key: "projectTitle", label: "Tên nhiệm vụ, Chương trình *" },
        { key: "managementAgency", label: "Cơ quan quản lý" },
        { key: "code", label: "Mã số" },
        { key: "role", label: "Vai trò *", options: roles },
        { key: "period", label: "Thời gian", placeholder: "2020 - 2023" },
        { key: "status", label: "Tình trạng", options: statuses },
        { key: "notes", label: "Ghi chú", type: "textarea" }
      ]} disabled={!editable}
        onChange={(index, key, value) => onChange("projects", replaceRow(draft.projects, index, key, value))}
        onAdd={() => onChange("projects", [...draft.projects, { projectTitle: "", role: "" }])}
        onRemove={(index) => onChange("projects", removeRow(draft.projects, index))}
        addLabel="+ Thêm nhiệm vụ / chương trình" />
      <h4>Tham gia nhiệm vụ đã khai trong hồ sơ</h4>
      <p className="record-meta">Các nhiệm vụ đã khai trong hồ sơ nhà khoa học. Không nhập lại vào bảng lý lịch khoa học.</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Tham gia nhiệm vụ trong hồ sơ">
        <table className="data-table">
          <thead><tr><th>Tên nhiệm vụ</th><th>Vai trò</th><th>Cấp</th><th>Từ ngày</th><th>Đến ngày</th><th>Tình trạng</th></tr></thead>
          <tbody>{visibleParticipations.length ? visibleParticipations.map((row, index) => <tr key={row.id ?? index}><td>{row.projectTitle}</td><td>{row.participationRole}</td><td>{levels[row.level]}</td><td>{row.startsOn ?? "—"}</td><td>{row.endsOn ?? "—"}</td><td>{row.status === "ACTIVE" ? "Đang tham gia" : row.status === "INACTIVE" ? "Đã kết thúc" : "—"}</td></tr>) : <tr><td colSpan={6}>Chưa có nhiệm vụ trong hồ sơ.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
