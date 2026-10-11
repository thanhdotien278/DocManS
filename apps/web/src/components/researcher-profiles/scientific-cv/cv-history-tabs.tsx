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

function replaceRow<Row extends object>(rows: Row[], index: number, key: keyof Row, value: string | number | null) {
  return rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row);
}

function removeRow<Row>(rows: Row[], index: number) {
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

export function CvEducationTab({ draft, editable, errors, onChange }: CvHistoryTabProps) {
  return <section className="section-card cv-tab-panel">
    <h3>2. Quá trình đào tạo</h3>
    {errors.educationHistory ? <small className="field-error" role="alert">{errors.educationHistory}</small> : null}
    <CvRowTable name="educationHistory" rows={draft.educationHistory}
      columns={[
        { key: "degreeLevel", label: "Bậc đào tạo *", options: degreeLevels },
        { key: "major", label: "Ngành đào tạo (Chuyên ngành) *", placeholder: "Y đa khoa, Dược, v.v." },
        { key: "institution", label: "Cơ sở đào tạo *", placeholder: "Học viện Quân y, ĐH Y Hà Nội..." },
        { key: "startYear", label: "Năm bắt đầu", type: "number", options: years },
        { key: "graduationYear", label: "Năm tốt nghiệp", type: "number", options: years },
        { key: "trainingMode", label: "Hình thức đào tạo", options: trainingModes }
      ]}
      disabled={!editable}
      onChange={(index, key, value) => onChange("educationHistory", replaceRow(draft.educationHistory, index, key, value))}
      onAdd={() => onChange("educationHistory", [...draft.educationHistory, { degreeLevel: "", major: "", institution: "" }])}
      onRemove={(index) => onChange("educationHistory", removeRow(draft.educationHistory, index))}
      addLabel="+ Thêm quá trình đào tạo"
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
    <h4>Quá trình công tác</h4>
    {errors.workItems ? <small className="field-error" role="alert">{errors.workItems}</small> : null}
    <CvRowTable name="workItems" rows={draft.workItems}
      columns={[
        { key: "period", label: "Thời gian *", placeholder: "2015 - nay" },
        { key: "organization", label: "Cơ quan / Đơn vị *" },
        { key: "position", label: "Chức vụ" },
        { key: "workField", label: "Lĩnh vực công tác" }
      ]}
      disabled={!editable}
      onChange={(index, key, value) => onChange("workItems", replaceRow(draft.workItems, index, key, value))}
      onAdd={() => onChange("workItems", [...draft.workItems, { period: "", organization: "" }])}
      onRemove={(index) => onChange("workItems", removeRow(draft.workItems, index))}
      addLabel="+ Thêm quá trình công tác"
      emptyMessage="Chưa có thông tin quá trình công tác." />
  </section>;
}
