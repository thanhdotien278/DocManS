"use client";

import { CvRowTable } from "./cv-row-table";
import type { ScientificCurriculumVitaeEducation, ScientificCurriculumVitaeWorkItem } from "@/lib/researcher-profiles-api";

export type CvHistoryDraft = {
  educationHistory: ScientificCurriculumVitaeEducation[];
  workSummary: string;
  workItems: ScientificCurriculumVitaeWorkItem[];
};

type CvHistoryTabProps = {
  draft: CvHistoryDraft;
  editable: boolean;
  errors: Record<string, string>;
  onChange: <K extends keyof CvHistoryDraft>(key: K, value: CvHistoryDraft[K]) => void;
};

const degreeLevels = ["Đại học", "Thạc sĩ", "Tiến sĩ", "Bác sĩ nội trú", "Bác sĩ CKII", "Bác sĩ CKI", "Sau tiến sĩ"].map((value) => ({ value, label: value }));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index)).map((value) => ({ value, label: value }));
const trainingModes = ["Chính quy", "Vừa làm vừa học", "Liên kết quốc tế", "Khác"].map((value) => ({ value, label: value }));

export function CvEducationTab({ draft, editable, errors, onChange }: CvHistoryTabProps) {
  return <section className="section-card cv-tab-panel">
    <CvRowTable name="educationHistory" title="2. Quá trình đào tạo" rows={draft.educationHistory}
      columns={[
        { key: "degreeLevel", label: "Bậc đào tạo *", required: true, options: degreeLevels },
        { key: "major", label: "Ngành đào tạo (Chuyên ngành) *", header: "Ngành", required: true, maxLength: 1000, placeholder: "Y đa khoa, Dược, v.v." },
        { key: "institution", label: "Cơ sở đào tạo *", required: true, maxLength: 1000, placeholder: "Học viện Quân y, ĐH Y Hà Nội..." },
        { key: "startYear", label: "Năm bắt đầu", type: "number", options: years, table: false },
        { key: "graduationYear", label: "Năm tốt nghiệp", header: "Thời gian", type: "number", options: years, cell: (row) => row.startYear || row.graduationYear ? `${row.startYear ?? "—"} – ${row.graduationYear ?? "—"}` : "—" },
        { key: "trainingMode", label: "Hình thức đào tạo", options: trainingModes, cell: (row) => row.trainingMode || "—" }
      ]}
      validate={(row) => row.startYear != null && row.graduationYear != null && row.startYear > row.graduationYear ? { graduationYear: "Năm tốt nghiệp không được trước Năm bắt đầu." } : {}}
      editable={editable} error={errors.educationHistory}
      onChange={(rows) => onChange("educationHistory", rows)}
      newRow={() => ({ degreeLevel: "", major: "", institution: "" })}
      addLabel="Thêm quá trình đào tạo"
      emptyMessage="Chưa có thông tin quá trình đào tạo." />
  </section>;
}

export function CvWorkTab({ draft, editable, errors, onChange }: CvHistoryTabProps) {
  return <section className="section-card cv-tab-panel">
    <h3>3. Quá trình công tác &amp; Kinh nghiệm chuyên môn</h3>
    <label className="field">Tóm tắt chuyên môn
      <textarea rows={4} value={draft.workSummary} disabled={!editable} onChange={(event) => onChange("workSummary", event.target.value)} />
      <small className="record-meta">Tóm tắt về công việc chính, lĩnh vực chuyên môn, kinh nghiệm R&amp;D, chuyển giao công nghệ, quản lý nhiệm vụ KH&amp;CN hoặc đổi mới sáng tạo.</small>
    </label>
    <CvRowTable name="workItems" title="Quá trình công tác" heading="h4" rows={draft.workItems}
      columns={[
        { key: "period", label: "Thời gian *", required: true, maxLength: 1000, placeholder: "2015 - nay" },
        { key: "organization", label: "Cơ quan / Đơn vị *", header: "Cơ quan/Đơn vị", required: true, maxLength: 1000 },
        { key: "position", label: "Chức vụ", maxLength: 1000 },
        { key: "workField", label: "Lĩnh vực công tác", maxLength: 1000, cell: (row) => row.workField || "—" }
      ]}
      editable={editable} error={errors.workItems}
      onChange={(rows) => onChange("workItems", rows)}
      newRow={() => ({ period: "", organization: "" })}
      addLabel="Thêm quá trình công tác"
      emptyMessage="Chưa có thông tin quá trình công tác." />
  </section>;
}
