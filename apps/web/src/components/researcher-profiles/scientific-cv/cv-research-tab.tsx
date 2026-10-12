"use client";

import { CvPublicationsSection } from "./cv-publications-section";
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
const roles = ["Chủ nhiệm", "Thư ký", "Thành viên chính", "Thành viên"].map((value) => ({ value, label: value }));
const statuses = ["Đang thực hiện", "Đã nghiệm thu", "Tạm dừng"].map((value) => ({ value, label: value }));
export const levels = { ACADEMY_INSTITUTIONAL: "Cấp Học viện / cơ sở", MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" };

export function CvResearchTab({ draft, participations, editable, errors, onChange }: CvResearchTabProps) {
  const visibleParticipations = participations.filter((row) => row.status !== "SUPERSEDED");
  return <div className="grid cv-tab-panel">
    <CvPublicationsSection rows={draft.publications} editable={editable} error={errors.publications} onChange={(rows) => onChange("publications", rows)} />
    <section className="section-card">
      <CvRowTable name="intellectualProperty" title="Sở hữu trí tuệ" rows={draft.intellectualProperty} columns={[
        { key: "title", label: "Tên văn bằng / Sáng chế *", header: "Tên", required: true, maxLength: 1000 },
        { key: "authors", label: "Tác giả", maxLength: 1000, table: false },
        { key: "patentNumber", label: "Số bằng", maxLength: 1000 },
        { key: "issueYear", label: "Năm cấp", type: "number", options: years },
        { key: "issueAgency", label: "Cơ quan cấp", maxLength: 1000, table: false },
        { key: "proofUrl", label: "Minh chứng (đường dẫn)", header: "Minh chứng", type: "url", maxLength: 1000 },
        { key: "notes", label: "Ghi chú", type: "textarea", maxLength: 4000, table: false }
      ]} editable={editable} error={errors.intellectualProperty}
        onChange={(rows) => onChange("intellectualProperty", rows)}
        newRow={() => ({ title: "" })}
        addLabel="Thêm sở hữu trí tuệ" />
    </section>
    <section className="section-card">
      <CvRowTable name="awards" title="Giải thưởng / Danh hiệu" rows={draft.awards} columns={[
        { key: "name", label: "Tên giải thưởng / Danh hiệu *", header: "Tên", required: true, maxLength: 1000 },
        { key: "awardYear", label: "Năm", type: "number", options: years },
        { key: "endYear", label: "Đến năm", type: "number", options: years, table: false },
        { key: "grantingAgency", label: "Cơ quan trao tặng", maxLength: 1000 },
        { key: "proofUrl", label: "Minh chứng (đường dẫn)", header: "Minh chứng", type: "url", maxLength: 1000 },
        { key: "notes", label: "Ghi chú", type: "textarea", maxLength: 4000, table: false }
      ]} editable={editable} error={errors.awards}
        onChange={(rows) => onChange("awards", rows)}
        newRow={() => ({ name: "" })}
        addLabel="Thêm giải thưởng / danh hiệu" />
    </section>
    <section className="section-card">
      <CvRowTable name="projects" title="Nhiệm vụ / Chương trình nghiên cứu" rows={draft.projects} columns={[
        { key: "projectTitle", label: "Tên nhiệm vụ, Chương trình *", header: "Tên", required: true, maxLength: 1000 },
        { key: "managementAgency", label: "Cơ quan quản lý", maxLength: 1000, table: false },
        { key: "code", label: "Mã số", maxLength: 1000, table: false },
        { key: "role", label: "Vai trò *", required: true, options: roles },
        { key: "period", label: "Thời gian", maxLength: 1000, placeholder: "2020 - 2023" },
        { key: "status", label: "Tình trạng", options: statuses },
        { key: "notes", label: "Ghi chú", type: "textarea", maxLength: 4000, table: false }
      ]} editable={editable} error={errors.projects}
        onChange={(rows) => onChange("projects", rows)}
        newRow={() => ({ projectTitle: "", role: "" })}
        addLabel="Thêm nhiệm vụ / chương trình" />
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
